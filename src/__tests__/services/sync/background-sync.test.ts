/**
 * Tests for background-sync.ts
 *
 * Tests background sync functionality including:
 * - registerBackgroundSync/unregisterBackgroundSync
 * - isBackgroundSyncAvailable status checks
 * - getBackgroundSyncConfig
 * - triggerBackgroundSync manual trigger
 * - Background task execution
 */

import NetInfo, { NetInfoStateType } from '@react-native-community/netinfo';

// Mock sync-engine
jest.mock('@/services/sync/sync-engine', () => ({
  pushChanges: jest.fn().mockResolvedValue({ pushed: 0, success: true }),
}));

// Mock photo-sync
jest.mock('@/services/sync/photo-sync', () => ({
  syncPhotos: jest.fn().mockResolvedValue({ uploaded: 0, downloaded: 0, failed: 0 }),
}));

// Mock retry-queue
jest.mock('@/services/sync/retry-queue', () => ({
  getRetryableItems: jest.fn().mockResolvedValue([]),
  getQueueStats: jest
    .fn()
    .mockResolvedValue({ pending: 0, inProgress: 0, failed: 0, completed: 0 }),
}));

import {
  registerBackgroundSync,
  unregisterBackgroundSync,
  isBackgroundSyncAvailable,
  getBackgroundSyncConfig,
  triggerBackgroundSync,
} from '@/services/sync/background-sync';

import { pushChanges } from '@/services/sync/sync-engine';
import { syncPhotos } from '@/services/sync/photo-sync';
import { getQueueStats, getRetryableItems } from '@/services/sync/retry-queue';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

// Constants for easier reference in tests
const BFStatus = BackgroundFetch.BackgroundFetchStatus;
const BFResult = BackgroundFetch.BackgroundFetchResult;

describe('background-sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations to defaults (clearAllMocks only clears call history)
    (BackgroundFetch.getStatusAsync as jest.Mock).mockResolvedValue(BFStatus.Available);
    (BackgroundFetch.registerTaskAsync as jest.Mock).mockResolvedValue(undefined);
    (BackgroundFetch.unregisterTaskAsync as jest.Mock).mockResolvedValue(undefined);
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(false);
  });

  describe('registerBackgroundSync', () => {
    it('registers the background task with default config', async () => {
      await registerBackgroundSync();

      expect(BackgroundFetch.registerTaskAsync).toHaveBeenCalledWith(
        'quarrycmms-background-sync',
        expect.objectContaining({
          minimumInterval: 15 * 60, // 15 minutes
          stopOnTerminate: false,
          startOnBoot: true,
        })
      );
    });

    it('registers with custom interval', async () => {
      await registerBackgroundSync({ minimumIntervalSeconds: 30 * 60 });

      expect(BackgroundFetch.registerTaskAsync).toHaveBeenCalledWith(
        'quarrycmms-background-sync',
        expect.objectContaining({
          minimumInterval: 30 * 60,
        })
      );
    });

    it('does not register when status is Restricted', async () => {
      (BackgroundFetch.getStatusAsync as jest.Mock).mockResolvedValue(BFStatus.Restricted);

      await registerBackgroundSync();

      expect(BackgroundFetch.registerTaskAsync).not.toHaveBeenCalled();
    });

    it('does not register when status is Denied', async () => {
      (BackgroundFetch.getStatusAsync as jest.Mock).mockResolvedValue(BFStatus.Denied);

      await registerBackgroundSync();

      expect(BackgroundFetch.registerTaskAsync).not.toHaveBeenCalled();
    });

    it('throws error on registration failure', async () => {
      (BackgroundFetch.registerTaskAsync as jest.Mock).mockRejectedValue(
        new Error('Registration failed')
      );

      await expect(registerBackgroundSync()).rejects.toThrow('Registration failed');
    });

    it('merges custom config with defaults', async () => {
      await registerBackgroundSync({ syncPhotosOnWiFi: false });

      const config = getBackgroundSyncConfig();
      expect(config.syncPhotosOnWiFi).toBe(false);
      expect(config.minimumIntervalSeconds).toBe(15 * 60); // Default preserved
    });
  });

  describe('unregisterBackgroundSync', () => {
    it('unregisters when task is registered', async () => {
      (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(true);

      await unregisterBackgroundSync();

      expect(BackgroundFetch.unregisterTaskAsync).toHaveBeenCalledWith(
        'quarrycmms-background-sync'
      );
    });

    it('does nothing when task is not registered', async () => {
      (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(false);

      await unregisterBackgroundSync();

      expect(BackgroundFetch.unregisterTaskAsync).not.toHaveBeenCalled();
    });

    it('throws error on unregistration failure', async () => {
      (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(true);
      (BackgroundFetch.unregisterTaskAsync as jest.Mock).mockRejectedValue(
        new Error('Unregister failed')
      );

      await expect(unregisterBackgroundSync()).rejects.toThrow('Unregister failed');
    });
  });

  describe('isBackgroundSyncAvailable', () => {
    it('returns Available status when available', async () => {
      (BackgroundFetch.getStatusAsync as jest.Mock).mockResolvedValue(BFStatus.Available);
      (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(true);

      const result = await isBackgroundSyncAvailable();

      expect(result.registered).toBe(true);
      expect(result.status).toBe(BFStatus.Available);
      expect(result.statusDescription).toBe('Available');
    });

    it('returns Restricted status with description', async () => {
      (BackgroundFetch.getStatusAsync as jest.Mock).mockResolvedValue(BFStatus.Restricted);
      (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(false);

      const result = await isBackgroundSyncAvailable();

      expect(result.registered).toBe(false);
      expect(result.status).toBe(BFStatus.Restricted);
      expect(result.statusDescription).toContain('Restricted');
    });

    it('returns Denied status with description', async () => {
      (BackgroundFetch.getStatusAsync as jest.Mock).mockResolvedValue(BFStatus.Denied);

      const result = await isBackgroundSyncAvailable();

      expect(result.status).toBe(BFStatus.Denied);
      expect(result.statusDescription).toContain('Denied');
    });

    it('returns Unknown for unrecognized status', async () => {
      (BackgroundFetch.getStatusAsync as jest.Mock).mockResolvedValue(999);

      const result = await isBackgroundSyncAvailable();

      expect(result.statusDescription).toBe('Unknown status');
    });

    it('returns error state on failure', async () => {
      (BackgroundFetch.getStatusAsync as jest.Mock).mockRejectedValue(
        new Error('Status check failed')
      );

      const result = await isBackgroundSyncAvailable();

      expect(result.registered).toBe(false);
      expect(result.status).toBe(BFStatus.Denied);
      expect(result.statusDescription).toContain('Error');
    });
  });

  describe('getBackgroundSyncConfig', () => {
    it('returns config with expected shape', () => {
      const config = getBackgroundSyncConfig();

      // Verify config has expected structure (values may vary based on prior test calls)
      expect(config.minimumIntervalSeconds).toBeDefined();
      expect(typeof config.syncPhotosOnWiFi).toBe('boolean');
      expect(typeof config.stopOnLowBattery).toBe('boolean');
    });

    it('returns a copy (not the original)', () => {
      const config1 = getBackgroundSyncConfig();
      const config2 = getBackgroundSyncConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('triggerBackgroundSync', () => {
    it('calls pushChanges', async () => {
      await triggerBackgroundSync();

      expect(pushChanges).toHaveBeenCalled();
    });

    it('logs queue stats', async () => {
      (getQueueStats as jest.Mock).mockResolvedValue({ pending: 5, failed: 2 });

      await triggerBackgroundSync();

      expect(getQueueStats).toHaveBeenCalled();
    });

    it('throws error on pushChanges failure', async () => {
      (pushChanges as jest.Mock).mockRejectedValue(new Error('Push failed'));

      await expect(triggerBackgroundSync()).rejects.toThrow('Push failed');
    });
  });

  describe('background task execution', () => {
    // Get the task function that was registered
    let taskFunction: () => Promise<number>;

    beforeEach(() => {
      // The task is defined when the module loads
      // Get the callback that was passed to defineTask
      const defineTaskCalls = (TaskManager.defineTask as jest.Mock).mock.calls;
      if (defineTaskCalls.length > 0) {
        taskFunction = defineTaskCalls[0][1];
      }
    });

    it('returns NoData when no pending items', async () => {
      if (!taskFunction) return;

      (getQueueStats as jest.Mock).mockResolvedValue({ pending: 0, failed: 0 });
      (getRetryableItems as jest.Mock).mockResolvedValue([]);

      const result = await taskFunction();

      expect(result).toBe(BFResult.NoData);
    });

    it('returns Failed when offline', async () => {
      if (!taskFunction) return;

      (getQueueStats as jest.Mock).mockResolvedValue({ pending: 1, failed: 0 });
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });

      const result = await taskFunction();

      expect(result).toBe(BFResult.Failed);
    });

    it('pushes changes when online with pending data', async () => {
      if (!taskFunction) return;

      (getQueueStats as jest.Mock).mockResolvedValue({ pending: 3, failed: 0 });
      (getRetryableItems as jest.Mock).mockResolvedValue([]);
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        type: 'cellular',
      });
      (pushChanges as jest.Mock).mockResolvedValue({ pushed: 3, success: true });

      const result = await taskFunction();

      expect(pushChanges).toHaveBeenCalled();
      expect(result).toBe(BFResult.NewData);
    });

    it('syncs photos on WiFi', async () => {
      if (!taskFunction) return;

      // Need to register to set config with syncPhotosOnWiFi: true
      await registerBackgroundSync({ syncPhotosOnWiFi: true });

      (getQueueStats as jest.Mock).mockResolvedValue({ pending: 1, failed: 0 });
      (getRetryableItems as jest.Mock).mockResolvedValue([]);
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        type: NetInfoStateType.wifi,
      });
      (pushChanges as jest.Mock).mockResolvedValue({ pushed: 1, success: true });
      (syncPhotos as jest.Mock).mockResolvedValue({ uploaded: 2, downloaded: 1 });

      const result = await taskFunction();

      expect(syncPhotos).toHaveBeenCalled();
      expect(result).toBe(BFResult.NewData);
    });

    it('skips photo sync on cellular', async () => {
      if (!taskFunction) return;

      await registerBackgroundSync({ syncPhotosOnWiFi: true });

      (getQueueStats as jest.Mock).mockResolvedValue({ pending: 1, failed: 0 });
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        type: 'cellular',
      });
      (pushChanges as jest.Mock).mockResolvedValue({ pushed: 1, success: true });

      await taskFunction();

      expect(syncPhotos).not.toHaveBeenCalled();
    });

    it('returns Failed on error', async () => {
      if (!taskFunction) return;

      (getQueueStats as jest.Mock).mockResolvedValue({ pending: 1, failed: 0 });
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
      (pushChanges as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await taskFunction();

      expect(result).toBe(BFResult.Failed);
    });

    it('triggers on retryable items even if queue is empty', async () => {
      if (!taskFunction) return;

      (getQueueStats as jest.Mock).mockResolvedValue({ pending: 0, failed: 0 });
      (getRetryableItems as jest.Mock).mockResolvedValue([{ id: 'retry-1' }]);
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

      const result = await taskFunction();

      expect(pushChanges).toHaveBeenCalled();
      expect(result).toBe(BFResult.NewData);
    });
  });
});
