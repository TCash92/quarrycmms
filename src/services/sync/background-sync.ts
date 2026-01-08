/**
 * Background sync service
 * Handles syncing data when the app is in the background
 *
 * Uses expo-background-fetch and expo-task-manager for background execution.
 * Background sync is push-only (no pull) to minimize data usage and battery.
 *
 * @module services/sync/background-sync
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import NetInfo, { NetInfoStateType } from '@react-native-community/netinfo';
import { pushChanges } from './sync-engine';
import { syncPhotos } from './photo-sync';
import { getRetryableItems, getQueueStats } from './retry-queue';

/** Background task name */
const BACKGROUND_SYNC_TASK = 'quarrycmms-background-sync';

/**
 * Background sync configuration
 */
export interface BackgroundSyncConfig {
  /** Minimum interval between background syncs (in seconds, min 15 minutes) */
  minimumIntervalSeconds: number;
  /** Whether to sync photos in background (only on WiFi) */
  syncPhotosOnWiFi: boolean;
  /** Whether to stop on low battery */
  stopOnLowBattery: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: BackgroundSyncConfig = {
  minimumIntervalSeconds: 15 * 60, // 15 minutes (iOS minimum)
  syncPhotosOnWiFi: true,
  stopOnLowBattery: true,
};

/**
 * Result of background sync status check
 */
export interface BackgroundSyncStatus {
  /** Whether the task is registered */
  registered: boolean;
  /** Background fetch status from the OS */
  status: BackgroundFetch.BackgroundFetchStatus;
  /** Human-readable status description */
  statusDescription: string;
}

let syncConfig: BackgroundSyncConfig = { ...DEFAULT_CONFIG };

/**
 * Define the background task
 * This must be called at module load time (top level)
 */
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  console.log('[BackgroundSync] Task started');

  try {
    // Check if we have data to sync
    const stats = await getQueueStats();
    const retryableItems = await getRetryableItems();

    if (stats.pending === 0 && stats.failed === 0 && retryableItems.length === 0) {
      console.log('[BackgroundSync] No pending data, skipping sync');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Check network connectivity
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      console.log('[BackgroundSync] No network connection, skipping');
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    // Push changes (metadata only)
    console.log('[BackgroundSync] Pushing pending changes');
    const pushResult = await pushChanges();
    console.log(`[BackgroundSync] Push complete: ${pushResult.pushed} records`);

    // Sync photos only on WiFi
    if (syncConfig.syncPhotosOnWiFi && netState.type === NetInfoStateType.wifi) {
      console.log('[BackgroundSync] On WiFi - syncing photos');
      const photoResult = await syncPhotos();
      console.log(
        `[BackgroundSync] Photo sync complete: ${photoResult.uploaded} uploaded, ${photoResult.downloaded} downloaded`
      );
    }

    console.log('[BackgroundSync] Task completed successfully');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[BackgroundSync] Task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the background sync task
 *
 * @param config - Optional configuration overrides
 *
 * @example
 * ```typescript
 * // Register with defaults (15 minute interval)
 * await registerBackgroundSync();
 *
 * // Register with custom interval
 * await registerBackgroundSync({ minimumIntervalSeconds: 30 * 60 });
 * ```
 */
export async function registerBackgroundSync(
  config?: Partial<BackgroundSyncConfig>
): Promise<void> {
  syncConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    // Check current status
    const status = await BackgroundFetch.getStatusAsync();

    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) {
      console.warn('[BackgroundSync] Background fetch is restricted by the system');
      return;
    }

    if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      console.warn('[BackgroundSync] Background fetch is denied by user');
      return;
    }

    // Register the task
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: syncConfig.minimumIntervalSeconds,
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log(`[BackgroundSync] Registered with ${syncConfig.minimumIntervalSeconds}s interval`);
  } catch (error) {
    console.error('[BackgroundSync] Failed to register:', error);
    throw error;
  }
}

/**
 * Unregister the background sync task
 */
export async function unregisterBackgroundSync(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);

    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      console.log('[BackgroundSync] Unregistered background sync');
    }
  } catch (error) {
    console.error('[BackgroundSync] Failed to unregister:', error);
    throw error;
  }
}

/**
 * Check if background sync is available and get status
 *
 * @returns Current background sync status
 */
export async function isBackgroundSyncAvailable(): Promise<BackgroundSyncStatus> {
  try {
    const [rawStatus, registered] = await Promise.all([
      BackgroundFetch.getStatusAsync(),
      TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK),
    ]);

    // Fallback to Denied if status is null
    const status = rawStatus ?? BackgroundFetch.BackgroundFetchStatus.Denied;

    let statusDescription: string;
    switch (status) {
      case BackgroundFetch.BackgroundFetchStatus.Available:
        statusDescription = 'Available';
        break;
      case BackgroundFetch.BackgroundFetchStatus.Restricted:
        statusDescription = 'Restricted by system (Low Power Mode or other restrictions)';
        break;
      case BackgroundFetch.BackgroundFetchStatus.Denied:
        statusDescription = 'Denied by user in Settings';
        break;
      default:
        statusDescription = 'Unknown status';
    }

    return {
      registered,
      status,
      statusDescription,
    };
  } catch (error) {
    console.error('[BackgroundSync] Failed to check status:', error);
    return {
      registered: false,
      status: BackgroundFetch.BackgroundFetchStatus.Denied,
      statusDescription: 'Error checking status',
    };
  }
}

/**
 * Get current background sync configuration
 */
export function getBackgroundSyncConfig(): BackgroundSyncConfig {
  return { ...syncConfig };
}

/**
 * Manually trigger a background sync (for testing)
 * Note: This is only for development/testing purposes
 */
export async function triggerBackgroundSync(): Promise<void> {
  console.log('[BackgroundSync] Manually triggering background sync');

  try {
    const stats = await getQueueStats();
    console.log(`[BackgroundSync] Queue stats: ${JSON.stringify(stats)}`);

    const pushResult = await pushChanges();
    console.log(`[BackgroundSync] Manual sync pushed ${pushResult.pushed} records`);
  } catch (error) {
    console.error('[BackgroundSync] Manual trigger failed:', error);
    throw error;
  }
}
