/**
 * Sync metadata storage for QuarryCMMS
 * Persists sync timestamps and error state using AsyncStorage
 *
 * @module sync/sync-storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage keys for sync metadata
 */
const SYNC_STORAGE_KEYS = {
  LAST_SYNC_AT: 'cmms_last_sync_at',
  SYNC_ERROR: 'cmms_sync_error',
} as const;

/**
 * Get the timestamp of the last successful sync
 * @returns Unix timestamp in milliseconds, or null if never synced
 */
export async function getLastSyncAt(): Promise<number | null> {
  try {
    const value = await AsyncStorage.getItem(SYNC_STORAGE_KEYS.LAST_SYNC_AT);
    if (value === null) {
      return null;
    }
    const timestamp = parseInt(value, 10);
    return isNaN(timestamp) ? null : timestamp;
  } catch (error) {
    console.error('[SyncStorage] Failed to get lastSyncAt:', error);
    return null;
  }
}

/**
 * Set the timestamp of the last successful sync
 * @param timestamp - Unix timestamp in milliseconds
 */
export async function setLastSyncAt(timestamp: number): Promise<void> {
  try {
    await AsyncStorage.setItem(SYNC_STORAGE_KEYS.LAST_SYNC_AT, timestamp.toString());
  } catch (error) {
    console.error('[SyncStorage] Failed to set lastSyncAt:', error);
    throw error;
  }
}

/**
 * Get the last sync error message
 * @returns Error message string, or null if no error
 */
export async function getSyncError(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SYNC_STORAGE_KEYS.SYNC_ERROR);
  } catch (error) {
    console.error('[SyncStorage] Failed to get syncError:', error);
    return null;
  }
}

/**
 * Set or clear the sync error message
 * @param error - Error message string, or null to clear
 */
export async function setSyncError(error: string | null): Promise<void> {
  try {
    if (error === null) {
      await AsyncStorage.removeItem(SYNC_STORAGE_KEYS.SYNC_ERROR);
    } else {
      await AsyncStorage.setItem(SYNC_STORAGE_KEYS.SYNC_ERROR, error);
    }
  } catch (e) {
    console.error('[SyncStorage] Failed to set syncError:', e);
    throw e;
  }
}

/**
 * Clear all sync metadata (used during logout or reset)
 */
export async function clearSyncMetadata(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([SYNC_STORAGE_KEYS.LAST_SYNC_AT, SYNC_STORAGE_KEYS.SYNC_ERROR]);
  } catch (error) {
    console.error('[SyncStorage] Failed to clear sync metadata:', error);
    throw error;
  }
}
