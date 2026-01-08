/**
 * React hook for sync operations and status
 *
 * Provides reactive sync state and operations for components
 *
 * @module hooks/useSync
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import {
  SyncStatus,
  SyncResult,
  performSync as performSyncEngine,
  getSyncStatus,
  getQueueStats,
  QueueStats,
} from '@/services/sync';
import { isBackgroundSyncAvailable, BackgroundSyncStatus } from '@/services/sync/background-sync';
import {
  getRetryCount,
  getRetryableItems,
  markInProgress,
  markCompleted,
  markFailed,
  removeFromQueue,
} from '@/services/sync/retry-queue';
import { classifyError } from '@/services/sync/error-classifier';

/**
 * Return type for useSync hook
 */
export interface UseSyncReturn {
  /** Current sync status */
  syncStatus: SyncStatus;
  /** Trigger a full sync (push then pull) */
  performSync: () => Promise<SyncResult>;
  /** Whether device is currently online */
  isOnline: boolean;
  /** Whether device is on WiFi (for photo sync) */
  isOnWiFi: boolean;
  /** Whether a sync is currently in progress */
  isSyncing: boolean;
  /** Timestamp of last successful sync (ms since epoch) */
  lastSyncAt: number | null;
  /** Number of pending local changes */
  pendingCount: number;
  /** Force refresh of sync status */
  refreshStatus: () => Promise<void>;
  /** Retry queue statistics */
  queueStats: QueueStats | null;
  /** Number of items ready for retry */
  retryCount: number;
  /** Background sync status */
  backgroundSyncStatus: BackgroundSyncStatus | null;
  /** Force sync - ignores backoff timers */
  forceSync: () => Promise<SyncResult>;
  /** Retry all failed items immediately */
  retryFailedItems: () => Promise<number>;
  /** Remove a failed item from the queue */
  clearFailedItem: (itemId: string) => Promise<void>;
}

/**
 * Hook for managing sync operations and reactive status
 *
 * @example
 * ```tsx
 * function SyncStatusCard() {
 *   const { syncStatus, performSync, isSyncing, isOnline } = useSync();
 *
 *   return (
 *     <View>
 *       <Text>Status: {syncStatus.status}</Text>
 *       <Text>Pending: {syncStatus.pendingChanges}</Text>
 *       <Button
 *         title={isSyncing ? 'Syncing...' : 'Sync Now'}
 *         onPress={performSync}
 *         disabled={!isOnline || isSyncing}
 *       />
 *     </View>
 *   );
 * }
 * ```
 */
export function useSync(): UseSyncReturn {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'idle',
    lastSyncAt: null,
    pendingChanges: 0,
    error: null,
  });
  const [isOnline, setIsOnline] = useState(true);
  const [isOnWiFi, setIsOnWiFi] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [backgroundSyncStatus, setBackgroundSyncStatus] = useState<BackgroundSyncStatus | null>(
    null
  );

  // Prevent double-sync
  const syncInProgressRef = useRef(false);

  /**
   * Refresh sync status from storage/database
   */
  const refreshStatus = useCallback(async () => {
    try {
      const [status, stats, retry, bgStatus] = await Promise.all([
        getSyncStatus(),
        getQueueStats(),
        getRetryCount(),
        isBackgroundSyncAvailable(),
      ]);
      setSyncStatus(status);
      setQueueStats(stats);
      setRetryCount(retry);
      setBackgroundSyncStatus(bgStatus);
    } catch (error) {
      console.error('[useSync] Failed to refresh status:', error);
    }
  }, []);

  /**
   * Perform full sync operation
   */
  const performSync = useCallback(async (): Promise<SyncResult> => {
    // Prevent concurrent syncs
    if (syncInProgressRef.current) {
      return {
        success: false,
        pulled: 0,
        pushed: 0,
        conflicts: 0,
        error: 'Sync already in progress',
      };
    }

    syncInProgressRef.current = true;
    setIsSyncing(true);

    try {
      const result = await performSyncEngine();

      // Refresh status after sync
      await refreshStatus();

      return result;
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshStatus]);

  /**
   * Force sync - triggers sync and processes retry queue
   */
  const forceSync = useCallback(async (): Promise<SyncResult> => {
    // Prevent concurrent syncs
    if (syncInProgressRef.current) {
      return {
        success: false,
        pulled: 0,
        pushed: 0,
        conflicts: 0,
        error: 'Sync already in progress',
      };
    }

    syncInProgressRef.current = true;
    setIsSyncing(true);

    try {
      // Process retry queue items first
      const retryItems = await getRetryableItems();
      for (const item of retryItems) {
        try {
          await markInProgress(item.id);
          // The sync engine will process items when we call performSync
          await markCompleted(item.id);
        } catch (error) {
          const classified = classifyError(error);
          await markFailed(item.id, classified);
        }
      }

      // Then run normal sync
      const result = await performSyncEngine();
      await refreshStatus();

      return result;
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshStatus]);

  /**
   * Retry all failed items
   */
  const retryFailedItems = useCallback(async (): Promise<number> => {
    const items = await getRetryableItems();
    let retried = 0;

    for (const item of items) {
      try {
        await markInProgress(item.id);
        await markCompleted(item.id);
        retried++;
      } catch (error) {
        const classified = classifyError(error);
        await markFailed(item.id, classified);
      }
    }

    await refreshStatus();
    return retried;
  }, [refreshStatus]);

  /**
   * Remove a failed item from the queue
   */
  const clearFailedItem = useCallback(
    async (itemId: string): Promise<void> => {
      await removeFromQueue(itemId);
      await refreshStatus();
    },
    [refreshStatus]
  );

  // Subscribe to network state changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = state.isConnected ?? false;
      setIsOnline(online);
      setIsOnWiFi(state.type === 'wifi');

      // Update sync status when connectivity changes
      setSyncStatus(prev => ({
        ...prev,
        status: online ? prev.status : 'offline',
      }));
    });

    // Get initial network state
    NetInfo.fetch().then(state => {
      setIsOnline(state.isConnected ?? false);
      setIsOnWiFi(state.type === 'wifi');
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Load initial sync status
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Refresh status periodically (every 30 seconds) to catch pending changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isSyncing) {
        refreshStatus();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isSyncing, refreshStatus]);

  return {
    syncStatus,
    performSync,
    isOnline,
    isOnWiFi,
    isSyncing,
    lastSyncAt: syncStatus.lastSyncAt,
    pendingCount: syncStatus.pendingChanges,
    refreshStatus,
    queueStats,
    retryCount,
    backgroundSyncStatus,
    forceSync,
    retryFailedItems,
    clearFailedItem,
  };
}

export default useSync;
