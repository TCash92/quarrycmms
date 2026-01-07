// Sync engine services
export {
  pullChanges,
  pushChanges,
  getSyncStatus,
  performSync,
  getPendingChangesCount,
  isOnWiFi,
  getQueueStats,
} from './sync-engine';

export type { SyncStatus, SyncStatusType, SyncResult, QueueStats } from './sync-engine';

// Photo sync (PR #9)
export {
  syncPhotos,
  uploadPendingPhotos,
  downloadMissingPhotos,
  retryFailedUploads,
  getPendingPhotoUploadCount,
  getPendingPhotoDownloadCount,
} from './photo-sync';

export type { PhotoSyncResult } from './photo-sync';

// Sync storage persistence
export {
  getLastSyncAt,
  setLastSyncAt,
  getSyncError,
  setSyncError,
  clearSyncMetadata,
} from './sync-storage';

// Sync query helpers
export {
  fetchWorkOrdersSince,
  fetchAssetsSince,
  fetchMeterReadingsSince,
  fetchWorkOrderPhotosSince,
  fetchAllWorkOrderPhotosSince,
  upsertWorkOrder,
  upsertAsset,
  upsertMeterReading,
  upsertWorkOrderPhoto,
} from './sync-queries';

export type {
  WorkOrderRow,
  AssetRow,
  MeterReadingRow,
  WorkOrderPhotoRow,
  WorkOrderPayload,
  AssetPayload,
  MeterReadingPayload,
  WorkOrderPhotoPayload,
} from './sync-queries';

// Conflict resolution
export {
  hasConflict,
  hasMeterReadingConflict,
  resolveWorkOrderConflict,
  resolveAssetConflict,
  resolveMeterReadingConflict,
  resolveWorkOrderPhotoConflict,
} from './conflict-resolver';

export type { ConflictResult, PhotoConflictResult } from './conflict-resolver';

// Conflict logging
export {
  logConflict,
  getRecentConflicts,
  getConflictsForRecord,
  getEscalatedConflicts,
  getConflictsByTimeRange,
  getConflictStats,
  pruneConflictLogs,
  clearConflictLogs,
  markConflictReviewed,
} from './conflict-log';

export type { ConflictLogEntry } from './conflict-log';

// Exponential backoff (PR #10)
export {
  calculateBackoff,
  getNextRetryTime,
  isReadyForRetry,
  getTimeUntilRetry,
  formatBackoffDelay,
  DEFAULT_BACKOFF_CONFIG,
} from './backoff';

export type { BackoffConfig } from './backoff';

// Error classification (PR #10)
export {
  classifyError,
  extractHttpStatus,
  isNetworkError,
  isRateLimitError,
  isAuthError,
  isValidationError,
  isTimeoutError,
  isRetryableError,
  getMaxRetries,
} from './error-classifier';

export type { ErrorCategory, ClassifiedError } from './error-classifier';

// Retry queue (PR #10)
export {
  enqueue,
  getRetryableItems,
  getPendingItems,
  getInProgressItems,
  markInProgress,
  markCompleted,
  markFailed,
  markAbandoned,
  recoverStaleItems,
  findQueueItem,
  removeFromQueue,
  pruneQueue,
  clearQueue,
  getRetryCount,
  calculateWorkOrderPriority,
  getDefaultPriority,
  getBlockingIssues,
} from './retry-queue';

export type {
  SyncOperation,
  SyncRecordType,
  QueueItemState,
  SyncPriority,
  RetryQueueItem,
  EnqueueParams,
} from './retry-queue';

// Background sync (PR #10)
export {
  registerBackgroundSync,
  unregisterBackgroundSync,
  isBackgroundSyncAvailable,
  getBackgroundSyncConfig,
  triggerBackgroundSync,
} from './background-sync';

export type { BackgroundSyncConfig, BackgroundSyncStatus } from './background-sync';

// Sync diagnostics (PR #11)
export {
  collectDiagnostics,
  getStorageInfo,
  getRecentSyncErrors,
  logSyncError,
  clearSyncErrorLog,
  formatBytes,
  formatRelativeTime,
} from './sync-diagnostics';

export type { DeviceDiagnostics, SyncErrorEntry, StorageInfo } from './sync-diagnostics';

// Sync export (PR #11)
export {
  exportLogsForSupport,
  shareExportedLogs,
  getExportFiles,
  deleteExport,
  clearAllExports,
} from './sync-export';

export type { ExportResult, ShareMethod } from './sync-export';

// Photo sync is now integrated into sync-engine.ts (PR #8)
