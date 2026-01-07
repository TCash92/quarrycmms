/**
 * Upload tracker for resumable photo uploads
 * Persists upload state to AsyncStorage for recovery after app restart/crash
 *
 * @module services/photos/upload-tracker
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isReadyForRetry, getTimeUntilRetry, formatBackoffDelay } from '@/services/sync/backoff';

const UPLOAD_TRACKER_KEY = '@quarrycmms:photo_upload_tracker';

/** Maximum retry attempts before marking as permanently failed (increased for exponential backoff) */
export const MAX_RETRY_ATTEMPTS = 10;

/** @deprecated Use the backoff module for retry timing instead */
export const MIN_RETRY_INTERVAL_MS = 5000;

/**
 * States an upload can be in
 */
export type UploadState = 'pending' | 'uploading' | 'completed' | 'failed';

/**
 * Entry tracking a single photo upload
 */
export interface UploadEntry {
  photoId: string;
  workOrderId: string;
  localUri: string;
  state: UploadState;
  attempts: number;
  lastAttempt: number | null;
  error?: string;
  createdAt: number;
}

/**
 * Stats about tracked uploads
 */
export interface UploadStats {
  pending: number;
  uploading: number;
  completed: number;
  failed: number;
  total: number;
}

/**
 * Load all tracked uploads from storage
 */
async function loadTrackedUploads(): Promise<UploadEntry[]> {
  try {
    const data = await AsyncStorage.getItem(UPLOAD_TRACKER_KEY);
    if (!data) return [];
    return JSON.parse(data) as UploadEntry[];
  } catch (error) {
    console.error('[UploadTracker] Failed to load uploads:', error);
    return [];
  }
}

/**
 * Save tracked uploads to storage
 */
async function saveTrackedUploads(uploads: UploadEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(UPLOAD_TRACKER_KEY, JSON.stringify(uploads));
  } catch (error) {
    console.error('[UploadTracker] Failed to save uploads:', error);
    throw error;
  }
}

/**
 * Get all tracked uploads
 */
export async function getTrackedUploads(): Promise<UploadEntry[]> {
  return loadTrackedUploads();
}

/**
 * Get pending/failed uploads eligible for retry
 * Excludes uploads that have exceeded max retry attempts
 */
export async function getPendingUploads(): Promise<UploadEntry[]> {
  const uploads = await loadTrackedUploads();
  return uploads.filter(
    u =>
      (u.state === 'pending' || u.state === 'failed') &&
      u.attempts < MAX_RETRY_ATTEMPTS
  );
}

/**
 * Get uploads currently marked as uploading
 * These may be stale if app crashed during upload
 */
export async function getUploadingUploads(): Promise<UploadEntry[]> {
  const uploads = await loadTrackedUploads();
  return uploads.filter(u => u.state === 'uploading');
}

/**
 * Get permanently failed uploads (exceeded max retries)
 */
export async function getFailedUploads(): Promise<UploadEntry[]> {
  const uploads = await loadTrackedUploads();
  return uploads.filter(u => u.state === 'failed' && u.attempts >= MAX_RETRY_ATTEMPTS);
}

/**
 * Track a new upload
 */
export async function trackUpload(
  photoId: string,
  workOrderId: string,
  localUri: string
): Promise<void> {
  const uploads = await loadTrackedUploads();

  // Check if already tracked
  const existing = uploads.find(u => u.photoId === photoId);
  if (existing) {
    console.log(`[UploadTracker] Photo ${photoId} already tracked`);
    return;
  }

  const entry: UploadEntry = {
    photoId,
    workOrderId,
    localUri,
    state: 'pending',
    attempts: 0,
    lastAttempt: null,
    createdAt: Date.now(),
  };

  uploads.push(entry);
  await saveTrackedUploads(uploads);

  console.log(`[UploadTracker] Tracking upload for photo ${photoId}`);
}

/**
 * Update upload state
 */
export async function updateUploadState(
  photoId: string,
  state: UploadState,
  error?: string
): Promise<void> {
  const uploads = await loadTrackedUploads();
  const entry = uploads.find(u => u.photoId === photoId);

  if (!entry) {
    console.warn(`[UploadTracker] Photo ${photoId} not found in tracker`);
    return;
  }

  entry.state = state;
  if (error !== undefined) {
    entry.error = error;
  }

  if (state === 'uploading') {
    entry.attempts++;
    entry.lastAttempt = Date.now();
  }

  await saveTrackedUploads(uploads);
  console.log(`[UploadTracker] Updated photo ${photoId} state to ${state}`);
}

/**
 * Mark upload as completed and remove from tracker
 */
export async function markUploadCompleted(photoId: string): Promise<void> {
  const uploads = await loadTrackedUploads();
  const index = uploads.findIndex(u => u.photoId === photoId);

  if (index === -1) {
    console.warn(`[UploadTracker] Photo ${photoId} not found in tracker`);
    return;
  }

  // Remove completed upload from tracker
  uploads.splice(index, 1);
  await saveTrackedUploads(uploads);

  console.log(`[UploadTracker] Marked photo ${photoId} as completed and removed`);
}

/**
 * Mark upload as failed (increment retry count)
 */
export async function markUploadFailed(photoId: string, error: string): Promise<void> {
  const uploads = await loadTrackedUploads();
  const entry = uploads.find(u => u.photoId === photoId);

  if (!entry) {
    console.warn(`[UploadTracker] Photo ${photoId} not found in tracker`);
    return;
  }

  entry.state = entry.attempts >= MAX_RETRY_ATTEMPTS ? 'failed' : 'pending';
  entry.error = error;
  entry.lastAttempt = Date.now();

  await saveTrackedUploads(uploads);

  if (entry.attempts >= MAX_RETRY_ATTEMPTS) {
    console.error(
      `[UploadTracker] Photo ${photoId} permanently failed after ${entry.attempts} attempts`
    );
  } else {
    console.log(
      `[UploadTracker] Photo ${photoId} failed (attempt ${entry.attempts}/${MAX_RETRY_ATTEMPTS})`
    );
  }
}

/**
 * Reset stale "uploading" entries back to pending
 * Call this on app start to recover from crashes
 */
export async function recoverStaleUploads(): Promise<number> {
  const uploads = await loadTrackedUploads();
  let recovered = 0;

  for (const entry of uploads) {
    // If marked as uploading but last attempt was > 5 minutes ago, it's stale
    if (
      entry.state === 'uploading' &&
      entry.lastAttempt &&
      Date.now() - entry.lastAttempt > 5 * 60 * 1000
    ) {
      entry.state = 'pending';
      recovered++;
    }
  }

  if (recovered > 0) {
    await saveTrackedUploads(uploads);
    console.log(`[UploadTracker] Recovered ${recovered} stale uploads`);
  }

  return recovered;
}

/**
 * Check if enough time has passed for a retry
 * Uses exponential backoff with jitter from the unified backoff module
 */
export function canRetry(entry: UploadEntry): boolean {
  if (!entry.lastAttempt) return true;
  return isReadyForRetry(entry.lastAttempt, entry.attempts);
}

/**
 * Get human-readable time until next retry is allowed
 */
export function getRetryWaitTime(entry: UploadEntry): string {
  if (!entry.lastAttempt) return 'Ready now';
  const waitMs = getTimeUntilRetry(entry.lastAttempt, entry.attempts);
  if (waitMs === 0) return 'Ready now';
  return formatBackoffDelay(waitMs);
}

/**
 * Remove completed/old uploads from tracker
 * @returns Number of entries removed
 */
export async function pruneTrackedUploads(): Promise<number> {
  const uploads = await loadTrackedUploads();
  const initialCount = uploads.length;

  // Keep only pending, uploading, or recently failed entries
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const filtered = uploads.filter(u => {
    // Always keep pending and uploading
    if (u.state === 'pending' || u.state === 'uploading') return true;
    // Keep failed entries for 7 days for debugging
    if (u.state === 'failed' && u.createdAt > sevenDaysAgo) return true;
    return false;
  });

  const removed = initialCount - filtered.length;

  if (removed > 0) {
    await saveTrackedUploads(filtered);
    console.log(`[UploadTracker] Pruned ${removed} old entries`);
  }

  return removed;
}

/**
 * Get upload stats
 */
export async function getUploadStats(): Promise<UploadStats> {
  const uploads = await loadTrackedUploads();

  return {
    pending: uploads.filter(u => u.state === 'pending').length,
    uploading: uploads.filter(u => u.state === 'uploading').length,
    completed: 0, // Completed uploads are removed from tracker
    failed: uploads.filter(u => u.state === 'failed').length,
    total: uploads.length,
  };
}

/**
 * Clear all tracked uploads (use with caution)
 */
export async function clearTrackedUploads(): Promise<void> {
  await AsyncStorage.removeItem(UPLOAD_TRACKER_KEY);
  console.log('[UploadTracker] Cleared all tracked uploads');
}

/**
 * Get a single upload entry by photo ID
 */
export async function getUploadEntry(photoId: string): Promise<UploadEntry | null> {
  const uploads = await loadTrackedUploads();
  return uploads.find(u => u.photoId === photoId) || null;
}

/**
 * Remove a specific upload from tracker
 */
export async function removeUpload(photoId: string): Promise<boolean> {
  const uploads = await loadTrackedUploads();
  const index = uploads.findIndex(u => u.photoId === photoId);

  if (index === -1) {
    return false;
  }

  uploads.splice(index, 1);
  await saveTrackedUploads(uploads);
  console.log(`[UploadTracker] Removed photo ${photoId} from tracker`);
  return true;
}
