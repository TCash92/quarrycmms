/**
 * Photo file synchronization service
 * Orchestrates upload/download of photo files separate from metadata sync
 *
 * @module services/sync/photo-sync
 */

import { Q } from '@nozbe/watermelondb';
import { database } from '@/database';
import WorkOrderPhoto from '@/database/models/WorkOrderPhoto';
import WorkOrder from '@/database/models/WorkOrder';
import { uploadPhotoFile, generateStoragePath } from '@/services/photos/photo-storage-service';
import { photoExistsInCache, downloadToCache } from '@/services/photos/photo-cache-service';
import {
  trackUpload,
  updateUploadState,
  markUploadCompleted,
  markUploadFailed,
  getPendingUploads,
  recoverStaleUploads,
  canRetry,
} from '@/services/photos/upload-tracker';
import { logger, measurePhotoUpload, createTimer } from '@/services/monitoring';

/**
 * Result of a photo sync operation
 */
export interface PhotoSyncResult {
  uploaded: number;
  downloaded: number;
  failed: number;
  skipped: number;
}

/**
 * Create an empty result
 */
function emptyResult(): PhotoSyncResult {
  return { uploaded: 0, downloaded: 0, failed: 0, skipped: 0 };
}

/**
 * Upload all pending photos to Supabase Storage
 * Only uploads when file exists locally and has no remoteUrl
 */
export async function uploadPendingPhotos(): Promise<PhotoSyncResult> {
  const result = emptyResult();

  try {
    // Query photos that need upload:
    // - localSyncStatus is pending
    // - No remoteUrl (not yet uploaded to storage)
    const photoCollection = database.get<WorkOrderPhoto>('work_order_photos');
    const pendingPhotos = await photoCollection
      .query(Q.where('local_sync_status', 'pending'), Q.where('remote_url', Q.eq(null)))
      .fetch();

    logger.info('Found photos pending upload', {
      category: 'photo-sync',
      count: pendingPhotos.length,
    });

    for (const photo of pendingPhotos) {
      try {
        // Get the work order's server ID for storage path
        const woCollection = database.get<WorkOrder>('work_orders');
        const workOrders = await woCollection.query(Q.where('id', photo.workOrderId)).fetch();
        const workOrder = workOrders[0];

        if (!workOrder?.serverId) {
          logger.debug('Skipping photo - work order not synced yet', {
            category: 'photo-sync',
            photoId: photo.id,
          });
          result.skipped++;
          continue;
        }

        // Check if local file exists
        const exists = await photoExistsInCache(photo.id);
        if (!exists) {
          logger.warn('Skipping photo - local file not found', {
            category: 'photo-sync',
            photoId: photo.id,
          });
          result.skipped++;
          continue;
        }

        // Track upload for resume capability
        await trackUpload(photo.id, photo.workOrderId, photo.localUri);
        await updateUploadState(photo.id, 'uploading');

        // Generate storage path and upload with timing
        const timer = createTimer();
        const storagePath = generateStoragePath(workOrder.serverId, photo.id);
        const uploadResult = await uploadPhotoFile(photo.id, storagePath);
        const durationMs = timer.elapsed();

        if (uploadResult.success && uploadResult.remoteUrl) {
          // Update database record
          await photo.markAsSynced(uploadResult.remoteUrl);
          await markUploadCompleted(photo.id);
          result.uploaded++;
          measurePhotoUpload(durationMs, 0, true);
          logger.info('Uploaded photo', { category: 'photo-sync', photoId: photo.id, durationMs });
        } else {
          await markUploadFailed(photo.id, uploadResult.error || 'Unknown error');
          result.failed++;
          measurePhotoUpload(durationMs, 0, false);
          logger.error('Failed to upload photo', new Error(uploadResult.error || 'Unknown error'), {
            category: 'photo-sync',
            photoId: photo.id,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await markUploadFailed(photo.id, message);
        result.failed++;
        logger.error('Error uploading photo', error as Error, {
          category: 'photo-sync',
          photoId: photo.id,
        });
      }
    }
  } catch (error) {
    logger.error('uploadPendingPhotos failed', error as Error, { category: 'photo-sync' });
  }

  return result;
}

/**
 * Download photos that have remoteUrl but no local file
 * Used to hydrate device with photos from other devices
 */
export async function downloadMissingPhotos(): Promise<PhotoSyncResult> {
  const result = emptyResult();

  try {
    // Query photos that have remoteUrl
    const photoCollection = database.get<WorkOrderPhoto>('work_order_photos');
    const photosWithRemote = await photoCollection
      .query(Q.where('remote_url', Q.notEq(null)))
      .fetch();

    logger.debug('Checking photos with remote URLs', {
      category: 'photo-sync',
      count: photosWithRemote.length,
    });

    for (const photo of photosWithRemote) {
      try {
        // Check if local file exists
        const exists = await photoExistsInCache(photo.id);
        if (exists) {
          result.skipped++;
          continue;
        }

        if (!photo.remoteUrl) {
          result.skipped++;
          continue;
        }

        logger.debug('Downloading photo', { category: 'photo-sync', photoId: photo.id });

        // Download the file
        const localUri = await downloadToCache(photo.remoteUrl, photo.id);

        if (localUri) {
          // Update localUri in database if different
          if (photo.localUri !== localUri) {
            await database.write(async () => {
              await photo.update(record => {
                record.localUri = localUri;
              });
            });
          }
          result.downloaded++;
          logger.info('Downloaded photo', { category: 'photo-sync', photoId: photo.id });
        } else {
          result.failed++;
          logger.error('Failed to download photo', new Error('Download returned null'), {
            category: 'photo-sync',
            photoId: photo.id,
          });
        }
      } catch (error) {
        result.failed++;
        logger.error('Error downloading photo', error as Error, {
          category: 'photo-sync',
          photoId: photo.id,
        });
      }
    }
  } catch (error) {
    logger.error('downloadMissingPhotos failed', error as Error, { category: 'photo-sync' });
  }

  return result;
}

/**
 * Retry failed uploads from tracker
 */
export async function retryFailedUploads(): Promise<PhotoSyncResult> {
  const result = emptyResult();

  try {
    // Recover any stale "uploading" entries first
    await recoverStaleUploads();

    // Get pending uploads from tracker
    const pendingUploads = await getPendingUploads();

    logger.info('Found uploads to retry', { category: 'photo-sync', count: pendingUploads.length });

    for (const entry of pendingUploads) {
      // Check if enough time has passed for retry
      if (!canRetry(entry)) {
        logger.debug('Skipping photo - retry cooldown', {
          category: 'photo-sync',
          photoId: entry.photoId,
        });
        result.skipped++;
        continue;
      }

      try {
        // Get the photo record from database
        const photoCollection = database.get<WorkOrderPhoto>('work_order_photos');
        const photos = await photoCollection.query(Q.where('id', entry.photoId)).fetch();
        const photo = photos[0];

        if (!photo) {
          logger.warn('Photo not found in database, removing from tracker', {
            category: 'photo-sync',
            photoId: entry.photoId,
          });
          await markUploadCompleted(entry.photoId);
          result.skipped++;
          continue;
        }

        // Check if already uploaded
        if (photo.remoteUrl) {
          logger.debug('Photo already has remoteUrl, marking complete', {
            category: 'photo-sync',
            photoId: entry.photoId,
          });
          await markUploadCompleted(entry.photoId);
          result.skipped++;
          continue;
        }

        // Get work order for storage path
        const woCollection = database.get<WorkOrder>('work_orders');
        const workOrders = await woCollection.query(Q.where('id', photo.workOrderId)).fetch();
        const workOrder = workOrders[0];

        if (!workOrder?.serverId) {
          logger.debug('Work order not synced yet', {
            category: 'photo-sync',
            photoId: entry.photoId,
          });
          result.skipped++;
          continue;
        }

        // Check if local file exists
        const exists = await photoExistsInCache(entry.photoId);
        if (!exists) {
          logger.warn('Local file for photo not found', {
            category: 'photo-sync',
            photoId: entry.photoId,
          });
          await markUploadFailed(entry.photoId, 'Local file not found');
          result.failed++;
          continue;
        }

        // Attempt upload with timing
        const timer = createTimer();
        await updateUploadState(entry.photoId, 'uploading');
        const storagePath = generateStoragePath(workOrder.serverId, entry.photoId);
        const uploadResult = await uploadPhotoFile(entry.photoId, storagePath);
        const durationMs = timer.elapsed();

        if (uploadResult.success && uploadResult.remoteUrl) {
          await photo.markAsSynced(uploadResult.remoteUrl);
          await markUploadCompleted(entry.photoId);
          result.uploaded++;
          measurePhotoUpload(durationMs, 0, true);
          logger.info('Retry succeeded for photo', {
            category: 'photo-sync',
            photoId: entry.photoId,
            durationMs,
          });
        } else {
          await markUploadFailed(entry.photoId, uploadResult.error || 'Unknown error');
          result.failed++;
          measurePhotoUpload(durationMs, 0, false);
          logger.error('Retry failed for photo', new Error(uploadResult.error || 'Unknown error'), {
            category: 'photo-sync',
            photoId: entry.photoId,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await markUploadFailed(entry.photoId, message);
        result.failed++;
        logger.error('Error retrying photo', error as Error, {
          category: 'photo-sync',
          photoId: entry.photoId,
        });
      }
    }
  } catch (error) {
    logger.error('retryFailedUploads failed', error as Error, { category: 'photo-sync' });
  }

  return result;
}

/**
 * Full photo sync (upload + download)
 */
export async function syncPhotos(): Promise<PhotoSyncResult> {
  logger.info('Starting full photo sync', { category: 'photo-sync' });

  const result = emptyResult();

  // First, retry any failed uploads
  const retryResult = await retryFailedUploads();
  result.uploaded += retryResult.uploaded;
  result.failed += retryResult.failed;
  result.skipped += retryResult.skipped;

  // Then upload new pending photos
  const uploadResult = await uploadPendingPhotos();
  result.uploaded += uploadResult.uploaded;
  result.failed += uploadResult.failed;
  result.skipped += uploadResult.skipped;

  // Finally, download any missing photos
  const downloadResult = await downloadMissingPhotos();
  result.downloaded += downloadResult.downloaded;
  result.failed += downloadResult.failed;
  result.skipped += downloadResult.skipped;

  logger.info('Photo sync complete', {
    category: 'photo-sync',
    uploaded: result.uploaded,
    downloaded: result.downloaded,
    failed: result.failed,
    skipped: result.skipped,
  });

  return result;
}

/**
 * Get photos pending upload count
 */
export async function getPendingPhotoUploadCount(): Promise<number> {
  const photoCollection = database.get<WorkOrderPhoto>('work_order_photos');
  const count = await photoCollection
    .query(Q.where('local_sync_status', 'pending'), Q.where('remote_url', Q.eq(null)))
    .fetchCount();

  return count;
}

/**
 * Get photos pending download count
 * (photos with remoteUrl but no local file)
 */
export async function getPendingPhotoDownloadCount(): Promise<number> {
  const photoCollection = database.get<WorkOrderPhoto>('work_order_photos');
  const photosWithRemote = await photoCollection
    .query(Q.where('remote_url', Q.notEq(null)))
    .fetch();

  let count = 0;
  for (const photo of photosWithRemote) {
    const exists = await photoExistsInCache(photo.id);
    if (!exists) {
      count++;
    }
  }

  return count;
}
