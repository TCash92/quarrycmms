/**
 * Photo services barrel export
 *
 * @module services/photos
 */

// Photo cache service - local file management
export {
  PHOTOS_DIRECTORY,
  PHOTO_RETENTION_MS,
  ensurePhotosDirectory,
  getPhotoPath,
  savePhotoToCache,
  photoExistsInCache,
  deletePhotoFromCache,
  getPhotoInfo,
  readPhotoAsBase64,
  getCacheSize,
  listCachedPhotos,
  clearPhotoCache,
  downloadToCache,
} from './photo-cache-service';

// Photo storage service - Supabase Storage operations
export {
  uploadPhotoFile,
  uploadPhotoFromUri,
  generateStoragePath,
  getPublicUrl,
  deletePhotoFile,
  photoExistsInStorage,
  getSignedUrl,
} from './photo-storage-service';

export type { UploadResult, DownloadResult } from './photo-storage-service';

// Upload tracker - resume capability
export {
  MAX_RETRY_ATTEMPTS,
  MIN_RETRY_INTERVAL_MS,
  getTrackedUploads,
  getPendingUploads,
  getUploadingUploads,
  getFailedUploads,
  trackUpload,
  updateUploadState,
  markUploadCompleted,
  markUploadFailed,
  recoverStaleUploads,
  canRetry,
  getRetryWaitTime,
  pruneTrackedUploads,
  getUploadStats,
  clearTrackedUploads,
  getUploadEntry,
  removeUpload,
} from './upload-tracker';

export type { UploadState, UploadEntry, UploadStats } from './upload-tracker';
