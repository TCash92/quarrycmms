/**
 * Sync engine for QuarryCMMS
 * Handles bidirectional sync between local WatermelonDB and Supabase
 *
 * @module sync/sync-engine
 */

import { Q } from '@nozbe/watermelondb';
import NetInfo, { NetInfoStateType } from '@react-native-community/netinfo';
import { database } from '@/database';
import WorkOrder from '@/database/models/WorkOrder';
import Asset from '@/database/models/Asset';
import MeterReading from '@/database/models/MeterReading';
import { getLastSyncAt, setLastSyncAt, getSyncError, setSyncError } from './sync-storage';
import {
  fetchWorkOrdersSince,
  fetchAssetsSince,
  fetchMeterReadingsSince,
  fetchAllWorkOrderPhotosSince,
  upsertWorkOrder,
  upsertAsset,
  upsertMeterReading,
  upsertWorkOrderPhoto,
  WorkOrderRow,
  AssetRow,
  MeterReadingRow,
  WorkOrderPhotoRow,
} from './sync-queries';
import {
  hasConflict,
  hasMeterReadingConflict,
  resolveWorkOrderConflict,
  resolveAssetConflict,
  resolveMeterReadingConflict,
  resolveWorkOrderPhotoConflict,
} from './conflict-resolver';
import { logConflict, pruneConflictLogs } from './conflict-log';
import WorkOrderPhoto from '@/database/models/WorkOrderPhoto';
import {
  syncPhotos,
  getPendingPhotoUploadCount,
  PhotoSyncResult,
} from './photo-sync';
import { classifyError } from './error-classifier';
import {
  enqueue,
  getRetryableItems,
  markInProgress,
  markCompleted,
  markFailed,
  recoverStaleItems,
  calculateWorkOrderPriority,
  getDefaultPriority,
  getQueueStats,
  QueueStats,
  RetryQueueItem,
} from './retry-queue';
import {
  logger,
  measureSync,
  createTimer,
  recordSyncSuccess,
  recordSyncFailure,
  updateSyncQueueState,
  trackSyncEvent,
} from '@/services/monitoring';

/**
 * Sync status type
 */
export type SyncStatusType = 'idle' | 'syncing' | 'error' | 'offline';

/**
 * Detailed sync status for UI display
 */
export interface SyncStatus {
  status: SyncStatusType;
  lastSyncAt: number | null;
  pendingChanges: number;
  error: string | null;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  success: boolean;
  pulled: number;
  pushed: number;
  conflicts: number;
  photosUploaded?: number | undefined;
  photosDownloaded?: number | undefined;
  photosFailed?: number | undefined;
  /** Number of queued items successfully retried */
  retried?: number | undefined;
  /** Number of queued items that failed retry */
  retriedFailed?: number | undefined;
  /** Number of new items queued for retry */
  queuedForRetry?: number | undefined;
  error?: string | undefined;
}

// Track current sync status
let currentSyncStatus: SyncStatusType = 'idle';

/**
 * Threshold for Quick Log backlog escalation
 * Per design: escalate if user has >10 unenriched Quick Logs
 */
const QUICK_LOG_BACKLOG_THRESHOLD = 10;

/**
 * Check if device is online
 */
async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected ?? false;
}

/**
 * Check if device is on WiFi
 * Used for photo sync (WiFi-only for large files)
 */
async function isOnWiFi(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.type === NetInfoStateType.wifi;
}

/**
 * Export for use by other modules
 */
export { isOnWiFi };

/**
 * Check for Quick Log backlog escalation (>10 unenriched Quick Logs)
 * Per CMMS_MVP_Design_Guide_v6.md Part 3: quick_log_backlog escalation
 */
async function checkQuickLogBacklog(userId?: string): Promise<void> {
  try {
    const woCollection = database.get<WorkOrder>('work_orders');

    // Query for unenriched Quick Logs
    let query = woCollection.query(
      Q.where('is_quick_log', true),
      Q.where('needs_enrichment', true)
    );

    // If userId provided, filter by created_by (would need that field to be indexed)
    // For now, we count all unenriched Quick Logs in the site
    const unenrichedCount = await query.fetchCount();

    if (unenrichedCount > QUICK_LOG_BACKLOG_THRESHOLD) {
      console.warn(
        `[Sync] Quick Log backlog detected: ${unenrichedCount} unenriched Quick Logs (threshold: ${QUICK_LOG_BACKLOG_THRESHOLD})`
      );

      // Log the escalation
      await logConflict({
        tableName: 'work_orders',
        recordId: 'quick_log_backlog',
        serverId: null,
        resolutions: [],
        escalations: ['quick_log_backlog'],
        autoResolved: false,
        syncUserId: userId,
      });
    }
  } catch (error) {
    console.warn('[Sync] Failed to check Quick Log backlog:', error);
  }
}

/**
 * Result of applying changes for a single table
 */
interface ApplyResult {
  applied: number;
  conflicts: number;
}

/**
 * Pull changes from server to local database
 */
export async function pullChanges(): Promise<SyncResult> {
  console.log('[Sync] pullChanges() started');

  const lastSyncAt = await getLastSyncAt();
  let pulled = 0;
  let conflicts = 0;
  const syncTimestamp = Date.now();

  try {
    // Fetch all changed records from server
    const [workOrders, assets, meterReadings, workOrderPhotos] = await Promise.all([
      fetchWorkOrdersSince(lastSyncAt),
      fetchAssetsSince(lastSyncAt),
      fetchMeterReadingsSince(lastSyncAt),
      fetchAllWorkOrderPhotosSince(lastSyncAt),
    ]);

    console.log(
      `[Sync] Fetched ${workOrders.length} WOs, ${assets.length} assets, ${meterReadings.length} readings, ${workOrderPhotos.length} photos`
    );

    // Apply changes in a single database write transaction
    await database.write(async () => {
      // Process assets first (work orders depend on them)
      const assetResult = await applyAssetChanges(assets, syncTimestamp);
      pulled += assetResult.applied;
      conflicts += assetResult.conflicts;

      // Process work orders
      const woResult = await applyWorkOrderChanges(workOrders, syncTimestamp);
      pulled += woResult.applied;
      conflicts += woResult.conflicts;

      // Process meter readings
      const mrResult = await applyMeterReadingChanges(meterReadings, syncTimestamp);
      pulled += mrResult.applied;
      conflicts += mrResult.conflicts;

      // Process work order photos (PR #8 addition)
      const photoResult = await applyWorkOrderPhotoChanges(workOrderPhotos, syncTimestamp);
      pulled += photoResult.applied;
      conflicts += photoResult.conflicts;
    });

    // Prune old conflict logs periodically (fire and forget)
    pruneConflictLogs().catch(err => console.warn('[Sync] Failed to prune conflict logs:', err));

    // Check for Quick Log backlog escalation (PR #8 addition)
    checkQuickLogBacklog().catch(err =>
      console.warn('[Sync] Failed to check Quick Log backlog:', err)
    );

    console.log(`[Sync] pullChanges() completed: ${pulled} records pulled, ${conflicts} conflicts`);

    return {
      success: true,
      pulled,
      pushed: 0,
      conflicts,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown pull error';
    console.error('[Sync] pullChanges() failed:', errorMessage);
    throw error;
  }
}

/**
 * Apply asset changes from server with conflict resolution
 */
async function applyAssetChanges(assets: AssetRow[], _syncTimestamp: number): Promise<ApplyResult> {
  const assetsCollection = database.get<Asset>('assets');
  let applied = 0;
  let conflicts = 0;

  for (const remote of assets) {
    const existing = await assetsCollection.query(Q.where('server_id', remote.id)).fetch();

    const local = existing[0];
    if (local) {
      // Check for conflict: local has pending changes AND server version is newer
      if (hasConflict(local, remote.updated_at)) {
        // Resolve conflict using resolution rules
        const result = resolveAssetConflict(local, remote);

        if (result.escalations.length > 0) {
          // Escalated conflict - mark for supervisor review
          await local.update(record => {
            record.localSyncStatus = 'conflict';
          });

          // Log the escalated conflict
          await logConflict({
            tableName: 'assets',
            recordId: local.id,
            serverId: remote.id,
            resolutions: result.resolutions,
            escalations: result.escalations,
            autoResolved: false,
          });

          conflicts++;
        } else if (result.hasConflict) {
          // Auto-resolved conflict - apply merged values
          await local.update(record => {
            // Apply merged values
            if (result.merged.status !== undefined)
              record.status = result.merged.status as Asset['status'];
            if (result.merged.meter_current_reading !== undefined)
              record.meterCurrentReading = result.merged.meter_current_reading;
            if (result.merged.description !== undefined)
              record.description = result.merged.description;
            if (result.merged.name !== undefined) record.name = result.merged.name;
            if (result.merged.location_description !== undefined)
              record.locationDescription = result.merged.location_description;
            if (result.merged.photo_url !== undefined) record.photoUrl = result.merged.photo_url;

            // Update server timestamp and mark as synced
            record.serverUpdatedAt = new Date(remote.updated_at).getTime();
            record.localSyncStatus = 'synced';
          });

          // Log the auto-resolved conflict
          await logConflict({
            tableName: 'assets',
            recordId: local.id,
            serverId: remote.id,
            resolutions: result.resolutions,
            escalations: [],
            autoResolved: true,
          });

          applied++;
          conflicts++;
        }
      } else if (local.localSyncStatus === 'synced') {
        // No conflict - safe to overwrite
        await local.update(record => {
          record.assetNumber = remote.asset_number;
          record.name = remote.name;
          record.description = remote.description;
          record.category = remote.category;
          record.status = remote.status as Asset['status'];
          record.locationDescription = remote.location_description;
          record.photoUrl = remote.photo_url;
          record.meterType = remote.meter_type;
          record.meterUnit = remote.meter_unit;
          record.meterCurrentReading = remote.meter_current_reading;
          record.serverUpdatedAt = new Date(remote.updated_at).getTime();
          record.localSyncStatus = 'synced';
        });
        applied++;
      }
      // else: local has pending changes but no conflict (server hasn't changed) - skip, will push later
    } else {
      // Create new local record
      await assetsCollection.create(record => {
        record._raw.id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        record.serverId = remote.id;
        record.siteId = remote.site_id;
        record.assetNumber = remote.asset_number;
        record.name = remote.name;
        record.description = remote.description;
        record.category = remote.category;
        record.status = remote.status as Asset['status'];
        record.locationDescription = remote.location_description;
        record.photoUrl = remote.photo_url;
        record.meterType = remote.meter_type;
        record.meterUnit = remote.meter_unit;
        record.meterCurrentReading = remote.meter_current_reading;
        record.localSyncStatus = 'synced';
        record.localUpdatedAt = new Date(remote.updated_at).getTime();
        record.serverUpdatedAt = new Date(remote.updated_at).getTime();
      });
      applied++;
    }
  }

  return { applied, conflicts };
}

/**
 * Apply work order changes from server with conflict resolution
 */
async function applyWorkOrderChanges(
  workOrders: WorkOrderRow[],
  syncTimestamp: number
): Promise<ApplyResult> {
  const woCollection = database.get<WorkOrder>('work_orders');
  let applied = 0;
  let conflicts = 0;

  for (const remote of workOrders) {
    const existing = await woCollection.query(Q.where('server_id', remote.id)).fetch();

    const local = existing[0];
    if (local) {
      // Check for conflict: local has pending changes AND server version is newer
      if (hasConflict(local, remote.updated_at)) {
        // Resolve conflict using resolution rules
        const result = resolveWorkOrderConflict(local, remote, syncTimestamp);

        if (result.escalations.length > 0) {
          // Escalated conflict - mark for supervisor review
          await local.update(record => {
            record.localSyncStatus = 'conflict';
          });

          // Log the escalated conflict
          await logConflict({
            tableName: 'work_orders',
            recordId: local.id,
            serverId: remote.id,
            resolutions: result.resolutions,
            escalations: result.escalations,
            autoResolved: false,
          });

          conflicts++;
        } else if (result.hasConflict) {
          // Auto-resolved conflict - apply merged values
          await local.update(record => {
            // Apply merged values from conflict resolution
            if (result.merged.status !== undefined)
              record.status = result.merged.status as WorkOrder['status'];
            if (result.merged.priority !== undefined)
              record.priority = result.merged.priority as WorkOrder['priority'];
            if (result.merged.description !== undefined)
              record.description = result.merged.description;
            if (result.merged.completion_notes !== undefined)
              record.completionNotes = result.merged.completion_notes;
            if (result.merged.due_date !== undefined)
              record.dueDate = result.merged.due_date
                ? new Date(result.merged.due_date).getTime()
                : null;
            if (result.merged.started_at !== undefined)
              record.startedAt = result.merged.started_at
                ? new Date(result.merged.started_at).getTime()
                : null;
            if (result.merged.completed_at !== undefined)
              record.completedAt = result.merged.completed_at
                ? new Date(result.merged.completed_at).getTime()
                : null;
            if (result.merged.completed_by !== undefined)
              record.completedBy = result.merged.completed_by;
            if (result.merged.time_spent_minutes !== undefined)
              record.timeSpentMinutes = result.merged.time_spent_minutes;
            if (result.merged.assigned_to !== undefined)
              record.assignedTo = result.merged.assigned_to;
            if (result.merged.needs_enrichment !== undefined)
              record.needsEnrichment = result.merged.needs_enrichment;
            if (result.merged.title !== undefined) record.title = result.merged.title;
            if (result.merged.failure_type !== undefined)
              record.failureType = result.merged.failure_type as WorkOrder['failureType'];

            // Apply signature merged values (PR #8 additions)
            if (result.merged.signature_image_url !== undefined)
              record.signatureImageUrl = result.merged.signature_image_url;
            if (result.merged.signature_timestamp !== undefined)
              record.signatureTimestamp = result.merged.signature_timestamp
                ? new Date(result.merged.signature_timestamp).getTime()
                : null;
            if (result.merged.signature_hash !== undefined)
              record.signatureHash = result.merged.signature_hash;

            // Apply voice note merged values (PR #8 additions)
            if (result.merged.voice_note_url !== undefined)
              record.voiceNoteUrl = result.merged.voice_note_url;
            if (result.merged.voice_note_confidence !== undefined)
              record.voiceNoteConfidence = result.merged.voice_note_confidence;

            // Update server timestamp and mark as synced
            record.serverUpdatedAt = new Date(remote.updated_at).getTime();
            record.localSyncStatus = 'synced';
          });

          // Log the auto-resolved conflict
          await logConflict({
            tableName: 'work_orders',
            recordId: local.id,
            serverId: remote.id,
            resolutions: result.resolutions,
            escalations: [],
            autoResolved: true,
          });

          applied++;
          conflicts++;
        }
      } else if (local.localSyncStatus === 'synced') {
        // No conflict - safe to overwrite
        await local.update(record => {
          record.woNumber = remote.wo_number;
          record.title = remote.title;
          record.description = remote.description;
          record.priority = remote.priority as WorkOrder['priority'];
          record.status = remote.status as WorkOrder['status'];
          record.assignedTo = remote.assigned_to;
          record.createdBy = remote.created_by;
          record.dueDate = remote.due_date ? new Date(remote.due_date).getTime() : null;
          record.startedAt = remote.started_at ? new Date(remote.started_at).getTime() : null;
          record.completedAt = remote.completed_at ? new Date(remote.completed_at).getTime() : null;
          record.completedBy = remote.completed_by;
          record.completionNotes = remote.completion_notes;
          record.failureType = remote.failure_type as WorkOrder['failureType'];
          record.timeSpentMinutes = remote.time_spent_minutes;
          record.signatureImageUrl = remote.signature_image_url;
          record.signatureTimestamp = remote.signature_timestamp
            ? new Date(remote.signature_timestamp).getTime()
            : null;
          record.signatureHash = remote.signature_hash;
          record.voiceNoteUrl = remote.voice_note_url;
          record.voiceNoteConfidence = remote.voice_note_confidence;
          record.needsEnrichment = remote.needs_enrichment;
          record.isQuickLog = remote.is_quick_log;
          record.serverUpdatedAt = new Date(remote.updated_at).getTime();
          record.localSyncStatus = 'synced';
        });
        applied++;
      }
      // else: local has pending changes but no conflict (server hasn't changed) - skip, will push later
    } else {
      // Create new local record
      await woCollection.create(record => {
        record._raw.id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        record.serverId = remote.id;
        record.siteId = remote.site_id;
        record.assetId = remote.asset_id;
        record.woNumber = remote.wo_number;
        record.title = remote.title;
        record.description = remote.description;
        record.priority = remote.priority as WorkOrder['priority'];
        record.status = remote.status as WorkOrder['status'];
        record.assignedTo = remote.assigned_to;
        record.createdBy = remote.created_by;
        record.dueDate = remote.due_date ? new Date(remote.due_date).getTime() : null;
        record.startedAt = remote.started_at ? new Date(remote.started_at).getTime() : null;
        record.completedAt = remote.completed_at ? new Date(remote.completed_at).getTime() : null;
        record.completedBy = remote.completed_by;
        record.completionNotes = remote.completion_notes;
        record.failureType = remote.failure_type as WorkOrder['failureType'];
        record.timeSpentMinutes = remote.time_spent_minutes;
        record.signatureImageUrl = remote.signature_image_url;
        record.signatureTimestamp = remote.signature_timestamp
          ? new Date(remote.signature_timestamp).getTime()
          : null;
        record.signatureHash = remote.signature_hash;
        record.voiceNoteUrl = remote.voice_note_url;
        record.voiceNoteConfidence = remote.voice_note_confidence;
        record.needsEnrichment = remote.needs_enrichment;
        record.isQuickLog = remote.is_quick_log;
        record.localSyncStatus = 'synced';
        record.localUpdatedAt = new Date(remote.updated_at).getTime();
        record.serverUpdatedAt = new Date(remote.updated_at).getTime();
      });
      applied++;
    }
  }

  return { applied, conflicts };
}

/**
 * Apply meter reading changes from server with conflict resolution
 */
async function applyMeterReadingChanges(
  meterReadings: MeterReadingRow[],
  _syncTimestamp: number
): Promise<ApplyResult> {
  const mrCollection = database.get<MeterReading>('meter_readings');
  let applied = 0;
  let conflicts = 0;

  for (const remote of meterReadings) {
    const existing = await mrCollection.query(Q.where('server_id', remote.id)).fetch();

    const local = existing[0];
    if (local) {
      // Check for conflict: local has pending changes AND server version is newer
      if (hasMeterReadingConflict(local, remote.updated_at)) {
        // Resolve conflict using resolution rules
        const result = resolveMeterReadingConflict(local, remote);

        // Special handling: same_time_different_values - keep both records
        if (result.escalations.includes('same_time_different_values')) {
          // Keep local as-is and create a new record for remote
          await mrCollection.create(record => {
            record._raw.id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            record.serverId = remote.id;
            record.assetId = remote.asset_id;
            record.readingValue = remote.reading_value;
            record.readingDate = new Date(remote.reading_date).getTime();
            record.recordedBy = remote.recorded_by;
            record.notes = remote.notes
              ? `${remote.notes}\n[Conflict: kept both values]`
              : '[Conflict: kept both values]';
            record.localSyncStatus = 'conflict'; // Mark for review
            record.localUpdatedAt = new Date(remote.updated_at).getTime();
          });

          // Mark local as conflict too
          await local.update(record => {
            record.localSyncStatus = 'conflict';
            record.notes = record.notes
              ? `${record.notes}\n[Conflict: kept both values]`
              : '[Conflict: kept both values]';
          });

          // Log the escalated conflict
          await logConflict({
            tableName: 'meter_readings',
            recordId: local.id,
            serverId: remote.id,
            resolutions: result.resolutions,
            escalations: result.escalations,
            autoResolved: false,
          });

          applied++; // We created a new record
          conflicts++;
        } else if (result.escalations.length > 0) {
          // Other escalated conflicts - mark for supervisor review
          await local.update(record => {
            record.localSyncStatus = 'conflict';
          });

          // Log the escalated conflict
          await logConflict({
            tableName: 'meter_readings',
            recordId: local.id,
            serverId: remote.id,
            resolutions: result.resolutions,
            escalations: result.escalations,
            autoResolved: false,
          });

          conflicts++;
        } else if (result.hasConflict) {
          // Auto-resolved conflict - apply merged values
          await local.update(record => {
            // Apply merged values
            if (result.merged.reading_value !== undefined)
              record.readingValue = result.merged.reading_value;
            if (result.merged.reading_date !== undefined)
              record.readingDate = new Date(result.merged.reading_date).getTime();
            if (result.merged.notes !== undefined) record.notes = result.merged.notes;

            record.localSyncStatus = 'synced';
          });

          // Log the auto-resolved conflict
          await logConflict({
            tableName: 'meter_readings',
            recordId: local.id,
            serverId: remote.id,
            resolutions: result.resolutions,
            escalations: [],
            autoResolved: true,
          });

          applied++;
          conflicts++;
        }
      } else if (local.localSyncStatus === 'synced') {
        // No conflict - safe to overwrite
        await local.update(record => {
          record.readingValue = remote.reading_value;
          record.readingDate = new Date(remote.reading_date).getTime();
          record.recordedBy = remote.recorded_by;
          record.notes = remote.notes;
          record.localSyncStatus = 'synced';
        });
        applied++;
      }
      // else: local has pending changes but no conflict (server hasn't changed) - skip, will push later
    } else {
      // Create new local record
      await mrCollection.create(record => {
        record._raw.id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        record.serverId = remote.id;
        record.assetId = remote.asset_id;
        record.readingValue = remote.reading_value;
        record.readingDate = new Date(remote.reading_date).getTime();
        record.recordedBy = remote.recorded_by;
        record.notes = remote.notes;
        record.localSyncStatus = 'synced';
        record.localUpdatedAt = new Date(remote.updated_at).getTime();
      });
      applied++;
    }
  }

  return { applied, conflicts };
}

/**
 * Apply work order photo changes from server with union-based conflict resolution
 * Per design: multiple devices add photos → union all (keep every photo)
 */
async function applyWorkOrderPhotoChanges(
  remotePhotos: WorkOrderPhotoRow[],
  _syncTimestamp: number
): Promise<ApplyResult> {
  const photoCollection = database.get<WorkOrderPhoto>('work_order_photos');
  let applied = 0;
  let conflicts = 0;

  // Group remote photos by work order
  const photosByWorkOrder = new Map<string, WorkOrderPhotoRow[]>();
  for (const photo of remotePhotos) {
    const existing = photosByWorkOrder.get(photo.work_order_id) || [];
    existing.push(photo);
    photosByWorkOrder.set(photo.work_order_id, existing);
  }

  // Process photos for each work order
  for (const [workOrderServerId, remoteWoPhotos] of photosByWorkOrder) {
    // Get local photos for this work order
    const localPhotos = await photoCollection
      .query(Q.where('work_order_id', workOrderServerId))
      .fetch();

    // Prepare local photos for conflict resolution
    const localPhotoData = localPhotos.map(p => ({
      id: p.id,
      serverId: p.serverId,
      localUri: p.localUri,
      remoteUrl: p.remoteUrl,
      caption: p.caption,
      takenAt: p.takenAt,
    }));

    // Resolve photo conflicts using union strategy
    const result = resolveWorkOrderPhotoConflict(localPhotoData, remoteWoPhotos);

    if (result.hasConflict) {
      conflicts++;

      // Apply merged/new photos
      for (const photo of result.photos) {
        if (photo.source === 'remote') {
          // New photo from server - create locally
          await photoCollection.create(record => {
            record._raw.id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            record.serverId = photo.serverId;
            record.workOrderId = workOrderServerId;
            record.localUri = photo.localUri || '';
            record.remoteUrl = photo.remoteUrl;
            record.caption = photo.caption;
            record.takenAt = photo.takenAt;
            record.localSyncStatus = 'synced';
          });
          applied++;
        } else if (photo.source === 'merged') {
          // Caption was merged - update existing photo
          const existingPhoto = localPhotos.find(
            lp => lp.serverId === photo.serverId || lp.remoteUrl === photo.remoteUrl
          );
          if (existingPhoto) {
            await existingPhoto.update(record => {
              record.caption = photo.caption;
              record.localSyncStatus = 'synced';
            });
            applied++;
          }
        }
      }

      // Log the photo conflict
      if (result.captionMergeCount > 0 || result.photos.some(p => p.source === 'remote')) {
        await logConflict({
          tableName: 'work_order_photos',
          recordId: workOrderServerId, // Use work order ID as record reference
          serverId: workOrderServerId,
          resolutions: result.mergedCaptions.map(mc => ({
            fieldName: 'caption',
            localValue: mc.localCaption,
            remoteValue: mc.remoteCaption,
            resolvedValue: mc.mergedCaption,
            rule: 'append_both',
            requiresReview: false,
          })),
          escalations: [],
          autoResolved: true,
        });
      }
    } else {
      // No conflicts - just sync new photos from server
      for (const remotePhoto of remoteWoPhotos) {
        const existing = await photoCollection
          .query(Q.where('server_id', remotePhoto.id))
          .fetch();

        if (existing.length === 0) {
          // Create new local record
          await photoCollection.create(record => {
            record._raw.id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            record.serverId = remotePhoto.id;
            record.workOrderId = remotePhoto.work_order_id;
            record.localUri = remotePhoto.local_uri || '';
            record.remoteUrl = remotePhoto.remote_url;
            record.caption = remotePhoto.caption;
            record.takenAt = new Date(remotePhoto.taken_at).getTime();
            record.localSyncStatus = 'synced';
          });
          applied++;
        } else if (existing[0]?.localSyncStatus === 'synced') {
          // Update existing synced record
          await existing[0]?.update(record => {
            record.remoteUrl = remotePhoto.remote_url;
            record.caption = remotePhoto.caption;
            record.localSyncStatus = 'synced';
          });
          applied++;
        }
      }
    }
  }

  return { applied, conflicts };
}

/**
 * Push local changes to server
 */
export async function pushChanges(): Promise<SyncResult> {
  console.log('[Sync] pushChanges() started');

  let pushed = 0;
  let conflicts = 0;
  let queuedForRetry = 0;

  try {
    // Query all pending records
    const [pendingWorkOrders, pendingAssets, pendingMeterReadings] = await Promise.all([
      database.get<WorkOrder>('work_orders').query(Q.where('local_sync_status', 'pending')).fetch(),
      database.get<Asset>('assets').query(Q.where('local_sync_status', 'pending')).fetch(),
      database
        .get<MeterReading>('meter_readings')
        .query(Q.where('local_sync_status', 'pending'))
        .fetch(),
    ]);

    console.log(
      `[Sync] Found ${pendingWorkOrders.length} WOs, ${pendingAssets.length} assets, ${pendingMeterReadings.length} readings pending`
    );

    // Sort work orders by priority (emergency first, then completed, then in-progress/high)
    const sortedWorkOrders = [...pendingWorkOrders].sort((a, b) => {
      const priorityA = calculateWorkOrderPriority({ priority: a.priority, status: a.status });
      const priorityB = calculateWorkOrderPriority({ priority: b.priority, status: b.status });
      return priorityA - priorityB;
    });

    // Push assets first
    for (const asset of pendingAssets) {
      try {
        const result = await upsertAsset({
          ...(asset.serverId ? { id: asset.serverId } : {}),
          site_id: asset.siteId,
          asset_number: asset.assetNumber,
          name: asset.name,
          description: asset.description,
          category: asset.category,
          status: asset.status,
          location_description: asset.locationDescription,
          photo_url: asset.photoUrl,
          meter_type: asset.meterType,
          meter_unit: asset.meterUnit,
          meter_current_reading: asset.meterCurrentReading,
        });

        await database.write(async () => {
          await asset.update(record => {
            record.serverId = result.id;
            record.serverUpdatedAt = new Date(result.updated_at).getTime();
            record.localSyncStatus = 'synced';
          });
        });
        pushed++;
      } catch (error) {
        console.error(`[Sync] Failed to push asset ${asset.id}:`, error);
        const classified = classifyError(error);
        if (classified.shouldRetry) {
          await enqueue({
            recordId: asset.id,
            tableName: 'assets',
            operation: 'push',
            priority: getDefaultPriority('assets'),
            maxAttempts: classified.maxRetries,
          });
          queuedForRetry++;
        }
      }
    }

    // Push work orders (sorted by priority)
    for (const wo of sortedWorkOrders) {
      try {
        const result = await upsertWorkOrder({
          ...(wo.serverId ? { id: wo.serverId } : {}),
          wo_number: wo.woNumber,
          site_id: wo.siteId,
          asset_id: wo.assetId,
          title: wo.title,
          description: wo.description,
          priority: wo.priority,
          status: wo.status,
          assigned_to: wo.assignedTo,
          created_by: wo.createdBy,
          due_date: wo.dueDate ? new Date(wo.dueDate).toISOString() : null,
          started_at: wo.startedAt ? new Date(wo.startedAt).toISOString() : null,
          completed_at: wo.completedAt ? new Date(wo.completedAt).toISOString() : null,
          completed_by: wo.completedBy,
          completion_notes: wo.completionNotes,
          failure_type: wo.failureType,
          time_spent_minutes: wo.timeSpentMinutes,
          signature_image_url: wo.signatureImageUrl,
          signature_timestamp: wo.signatureTimestamp
            ? new Date(wo.signatureTimestamp).toISOString()
            : null,
          signature_hash: wo.signatureHash,
          voice_note_url: wo.voiceNoteUrl,
          voice_note_confidence: wo.voiceNoteConfidence,
          needs_enrichment: wo.needsEnrichment,
          is_quick_log: wo.isQuickLog,
        });

        await database.write(async () => {
          await wo.update(record => {
            record.serverId = result.id;
            record.serverUpdatedAt = new Date(result.updated_at).getTime();
            record.localSyncStatus = 'synced';
          });
        });
        pushed++;
      } catch (error) {
        console.error(`[Sync] Failed to push work order ${wo.id}:`, error);
        const classified = classifyError(error);
        if (classified.shouldRetry) {
          await enqueue({
            recordId: wo.id,
            tableName: 'work_orders',
            operation: 'push',
            priority: calculateWorkOrderPriority({ priority: wo.priority, status: wo.status }),
            maxAttempts: classified.maxRetries,
          });
          queuedForRetry++;
        }
      }
    }

    // Push meter readings
    for (const mr of pendingMeterReadings) {
      try {
        const result = await upsertMeterReading({
          ...(mr.serverId ? { id: mr.serverId } : {}),
          asset_id: mr.assetId,
          reading_value: mr.readingValue,
          reading_date: new Date(mr.readingDate).toISOString(),
          recorded_by: mr.recordedBy,
          notes: mr.notes,
        });

        await database.write(async () => {
          await mr.update(record => {
            record.serverId = result.id;
            record.localSyncStatus = 'synced';
          });
        });
        pushed++;
      } catch (error) {
        console.error(`[Sync] Failed to push meter reading ${mr.id}:`, error);
        const classified = classifyError(error);
        if (classified.shouldRetry) {
          await enqueue({
            recordId: mr.id,
            tableName: 'meter_readings',
            operation: 'push',
            priority: getDefaultPriority('meter_readings'),
            maxAttempts: classified.maxRetries,
          });
          queuedForRetry++;
        }
      }
    }

    // Push work order photos (PR #8 addition)
    const pendingPhotos = await database
      .get<WorkOrderPhoto>('work_order_photos')
      .query(Q.where('local_sync_status', 'pending'))
      .fetch();

    console.log(`[Sync] Found ${pendingPhotos.length} photos pending`);

    for (const photo of pendingPhotos) {
      try {
        // Get the work order's server ID
        const woCollection = database.get<WorkOrder>('work_orders');
        const workOrders = await woCollection.query(Q.where('id', photo.workOrderId)).fetch();
        const workOrder = workOrders[0];

        if (!workOrder?.serverId) {
          console.warn(`[Sync] Skipping photo ${photo.id} - work order not synced yet`);
          continue;
        }

        const result = await upsertWorkOrderPhoto({
          ...(photo.serverId ? { id: photo.serverId } : {}),
          work_order_id: workOrder.serverId,
          local_uri: photo.localUri,
          remote_url: photo.remoteUrl,
          caption: photo.caption,
          taken_at: new Date(photo.takenAt).toISOString(),
        });

        await database.write(async () => {
          await photo.update(record => {
            record.serverId = result.id;
            record.localSyncStatus = 'synced';
          });
        });
        pushed++;
      } catch (error) {
        console.error(`[Sync] Failed to push photo ${photo.id}:`, error);
        const classified = classifyError(error);
        if (classified.shouldRetry) {
          await enqueue({
            recordId: photo.id,
            tableName: 'work_order_photos',
            operation: 'push',
            priority: getDefaultPriority('work_order_photos'),
            maxAttempts: classified.maxRetries,
          });
          queuedForRetry++;
        }
      }
    }

    console.log(`[Sync] pushChanges() completed: ${pushed} pushed, ${queuedForRetry} queued for retry`);

    return {
      success: true,
      pulled: 0,
      pushed,
      conflicts,
      queuedForRetry,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown push error';
    console.error('[Sync] pushChanges() failed:', errorMessage);
    throw error;
  }
}

/**
 * Get pending changes count (includes pending photo uploads)
 */
export async function getPendingChangesCount(): Promise<number> {
  const [woCount, assetCount, mrCount, photoCount] = await Promise.all([
    database
      .get<WorkOrder>('work_orders')
      .query(Q.where('local_sync_status', 'pending'))
      .fetchCount(),
    database.get<Asset>('assets').query(Q.where('local_sync_status', 'pending')).fetchCount(),
    database
      .get<MeterReading>('meter_readings')
      .query(Q.where('local_sync_status', 'pending'))
      .fetchCount(),
    getPendingPhotoUploadCount(),
  ]);

  return woCount + assetCount + mrCount + photoCount;
}

/**
 * Get current sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  const [online, lastSyncAt, pendingChanges, error] = await Promise.all([
    isOnline(),
    getLastSyncAt(),
    getPendingChangesCount(),
    getSyncError(),
  ]);

  let status: SyncStatusType;
  if (!online) {
    status = 'offline';
  } else if (error) {
    status = 'error';
  } else {
    status = currentSyncStatus;
  }

  return {
    status,
    lastSyncAt,
    pendingChanges,
    error,
  };
}

/**
 * Process items in the retry queue
 * Attempts to sync queued items with backoff-aware timing
 */
async function processRetryQueue(): Promise<{ retried: number; retriedFailed: number }> {
  console.log('[Sync] Processing retry queue');

  let retried = 0;
  let retriedFailed = 0;

  // Recover any stale in-progress items first
  const recovered = await recoverStaleItems();
  if (recovered > 0) {
    console.log(`[Sync] Recovered ${recovered} stale queue items`);
  }

  // Get items ready for retry (sorted by priority)
  const items = await getRetryableItems();
  console.log(`[Sync] Found ${items.length} items ready for retry`);

  for (const item of items) {
    try {
      await markInProgress(item.id);
      await syncQueuedRecord(item);
      await markCompleted(item.id);
      retried++;
      console.log(`[Sync] Retry succeeded for ${item.tableName}/${item.recordId}`);
    } catch (error) {
      const classified = classifyError(error);
      await markFailed(item.id, classified);
      retriedFailed++;
      console.error(`[Sync] Retry failed for ${item.tableName}/${item.recordId}:`, classified.userMessage);
    }
  }

  return { retried, retriedFailed };
}

/**
 * Sync a single queued record
 */
async function syncQueuedRecord(item: RetryQueueItem): Promise<void> {
  switch (item.tableName) {
    case 'work_orders': {
      const wo = await database.get<WorkOrder>('work_orders').find(item.recordId);
      if (wo.localSyncStatus !== 'pending') {
        // Already synced by another process
        return;
      }
      const result = await upsertWorkOrder({
        ...(wo.serverId ? { id: wo.serverId } : {}),
        wo_number: wo.woNumber,
        site_id: wo.siteId,
        asset_id: wo.assetId,
        title: wo.title,
        description: wo.description,
        priority: wo.priority,
        status: wo.status,
        assigned_to: wo.assignedTo,
        created_by: wo.createdBy,
        due_date: wo.dueDate ? new Date(wo.dueDate).toISOString() : null,
        started_at: wo.startedAt ? new Date(wo.startedAt).toISOString() : null,
        completed_at: wo.completedAt ? new Date(wo.completedAt).toISOString() : null,
        completed_by: wo.completedBy,
        completion_notes: wo.completionNotes,
        failure_type: wo.failureType,
        time_spent_minutes: wo.timeSpentMinutes,
        signature_image_url: wo.signatureImageUrl,
        signature_timestamp: wo.signatureTimestamp
          ? new Date(wo.signatureTimestamp).toISOString()
          : null,
        signature_hash: wo.signatureHash,
        voice_note_url: wo.voiceNoteUrl,
        voice_note_confidence: wo.voiceNoteConfidence,
        needs_enrichment: wo.needsEnrichment,
        is_quick_log: wo.isQuickLog,
      });
      await database.write(async () => {
        await wo.update(record => {
          record.serverId = result.id;
          record.serverUpdatedAt = new Date(result.updated_at).getTime();
          record.localSyncStatus = 'synced';
        });
      });
      break;
    }
    case 'assets': {
      const asset = await database.get<Asset>('assets').find(item.recordId);
      if (asset.localSyncStatus !== 'pending') {
        return;
      }
      const result = await upsertAsset({
        ...(asset.serverId ? { id: asset.serverId } : {}),
        site_id: asset.siteId,
        asset_number: asset.assetNumber,
        name: asset.name,
        description: asset.description,
        category: asset.category,
        status: asset.status,
        location_description: asset.locationDescription,
        photo_url: asset.photoUrl,
        meter_type: asset.meterType,
        meter_unit: asset.meterUnit,
        meter_current_reading: asset.meterCurrentReading,
      });
      await database.write(async () => {
        await asset.update(record => {
          record.serverId = result.id;
          record.serverUpdatedAt = new Date(result.updated_at).getTime();
          record.localSyncStatus = 'synced';
        });
      });
      break;
    }
    case 'meter_readings': {
      const mr = await database.get<MeterReading>('meter_readings').find(item.recordId);
      if (mr.localSyncStatus !== 'pending') {
        return;
      }
      const result = await upsertMeterReading({
        ...(mr.serverId ? { id: mr.serverId } : {}),
        asset_id: mr.assetId,
        reading_value: mr.readingValue,
        reading_date: new Date(mr.readingDate).toISOString(),
        recorded_by: mr.recordedBy,
        notes: mr.notes,
      });
      await database.write(async () => {
        await mr.update(record => {
          record.serverId = result.id;
          record.localSyncStatus = 'synced';
        });
      });
      break;
    }
    case 'work_order_photos': {
      const photo = await database.get<WorkOrderPhoto>('work_order_photos').find(item.recordId);
      if (photo.localSyncStatus !== 'pending') {
        return;
      }
      // Get the work order's server ID
      const woCollection = database.get<WorkOrder>('work_orders');
      const workOrders = await woCollection.query(Q.where('id', photo.workOrderId)).fetch();
      const workOrder = workOrders[0];
      if (!workOrder?.serverId) {
        throw new Error('Work order not synced yet');
      }
      const result = await upsertWorkOrderPhoto({
        ...(photo.serverId ? { id: photo.serverId } : {}),
        work_order_id: workOrder.serverId,
        local_uri: photo.localUri,
        remote_url: photo.remoteUrl,
        caption: photo.caption,
        taken_at: new Date(photo.takenAt).toISOString(),
      });
      await database.write(async () => {
        await photo.update(record => {
          record.serverId = result.id;
          record.localSyncStatus = 'synced';
        });
      });
      break;
    }
  }
}

/**
 * Export getQueueStats for external use
 */
export { getQueueStats };
export type { QueueStats };

/**
 * Perform full bidirectional sync
 */
export async function performSync(): Promise<SyncResult> {
  logger.info('Starting sync', { category: 'sync' });
  const timer = createTimer();

  // Track sync start event for analytics
  trackSyncEvent('start');

  // Check connectivity
  const online = await isOnline();
  if (!online) {
    logger.info('Offline - skipping sync', { category: 'sync' });
    trackSyncEvent('failure', 0);
    return {
      success: false,
      pulled: 0,
      pushed: 0,
      conflicts: 0,
      error: 'Device is offline',
    };
  }

  currentSyncStatus = 'syncing';

  try {
    // Process retry queue first (items that failed in previous syncs)
    const retryResult = await processRetryQueue();

    // Push first, then pull (push-then-pull pattern)
    const pushResult = await pushChanges();
    const pullResult = await pullChanges();

    // Photo file sync - only on WiFi (large files)
    let photoResult: PhotoSyncResult = { uploaded: 0, downloaded: 0, failed: 0, skipped: 0 };
    const wifi = await isOnWiFi();

    if (wifi) {
      logger.debug('On WiFi - syncing photo files', { category: 'sync' });
      photoResult = await syncPhotos();
    } else {
      logger.debug('On cellular - skipping photo file sync', { category: 'sync' });
    }

    // Update last sync timestamp
    await setLastSyncAt(Date.now());
    await setSyncError(null);

    currentSyncStatus = 'idle';

    const result: SyncResult = {
      success: pushResult.success && pullResult.success,
      pulled: pullResult.pulled,
      pushed: pushResult.pushed,
      conflicts: pushResult.conflicts + pullResult.conflicts,
      photosUploaded: photoResult.uploaded,
      photosDownloaded: photoResult.downloaded,
      photosFailed: photoResult.failed,
      retried: retryResult.retried,
      retriedFailed: retryResult.retriedFailed,
      queuedForRetry: pushResult.queuedForRetry,
    };

    // Record performance metrics
    const totalItems = result.pulled + result.pushed;
    const durationMs = timer.elapsed();
    measureSync(durationMs, totalItems, true);
    recordSyncSuccess();
    trackSyncEvent('success', totalItems, durationMs);

    // Update telemetry with queue state
    const pendingCount = await getPendingChangesCount();
    updateSyncQueueState(pendingCount, null);

    logger.info('Sync completed', {
      category: 'sync',
      pulled: result.pulled,
      pushed: result.pushed,
      conflicts: result.conflicts,
      durationMs,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
    const durationMs = timer.elapsed();

    logger.error('Sync failed', error as Error, { category: 'sync', durationMs });
    measureSync(durationMs, 0, false);
    recordSyncFailure();
    trackSyncEvent('failure', 0, durationMs);

    await setSyncError(errorMessage);
    currentSyncStatus = 'error';

    return {
      success: false,
      pulled: 0,
      pushed: 0,
      conflicts: 0,
      error: errorMessage,
    };
  }
}
