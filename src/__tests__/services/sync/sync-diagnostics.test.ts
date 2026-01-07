/**
 * Tests for sync-diagnostics.ts
 *
 * Tests diagnostic collection including:
 * - Storage info (getStorageInfo)
 * - Sync error logging (logSyncError, getRecentSyncErrors, clearSyncErrorLog)
 * - Full diagnostics collection (collectDiagnostics)
 * - Utility functions (isStorageLow, formatBytes, formatRelativeTime)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Mock expo modules before importing the module under test
jest.mock('expo-device', () => ({
  modelName: 'Test Phone',
  deviceName: 'Test Device',
  osName: 'iOS',
  osVersion: '17.0',
}));

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '100',
}));

jest.mock('expo-file-system', () => ({
  cacheDirectory: '/cache/',
  documentDirectory: '/documents/',
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  readDirectoryAsync: jest.fn().mockResolvedValue([]),
}));

// Mock other sync modules
jest.mock('@/services/sync/retry-queue', () => ({
  getQueueStats: jest.fn().mockResolvedValue({
    pending: 0,
    inProgress: 0,
    failed: 0,
    completed: 0,
  }),
}));

jest.mock('@/services/photos/upload-tracker', () => ({
  getUploadStats: jest.fn().mockResolvedValue({
    pending: 0,
    uploading: 0,
    completed: 0,
    failed: 0,
  }),
}));

jest.mock('@/services/sync/sync-storage', () => ({
  getLastSyncAt: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/services/sync/conflict-log', () => ({
  getEscalatedConflicts: jest.fn().mockResolvedValue([]),
}));

import {
  getStorageInfo,
  logSyncError,
  getRecentSyncErrors,
  clearSyncErrorLog,
  collectDiagnostics,
  isStorageLow,
  formatBytes,
  formatRelativeTime,
  type DeviceDiagnostics,
} from '@/services/sync/sync-diagnostics';

import * as FileSystem from 'expo-file-system';
import { getQueueStats } from '@/services/sync/retry-queue';
import { getUploadStats } from '@/services/photos/upload-tracker';
import { getLastSyncAt } from '@/services/sync/sync-storage';
import { getEscalatedConflicts } from '@/services/sync/conflict-log';

// Storage key matching the module
const SYNC_ERROR_LOG_KEY = 'cmms_sync_error_log';

// Fixed timestamp from setup.ts
const FIXED_TIMESTAMP = 1704067200000;

describe('sync-diagnostics', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  describe('getStorageInfo', () => {
    it('returns zero values when directories do not exist', async () => {
      const info = await getStorageInfo();

      expect(info).toEqual({
        used: 0,
        available: 0,
        cacheSize: 0,
        documentSize: 0,
      });
    });

    it('calculates sizes from file system', async () => {
      // Mock file info
      (FileSystem.getInfoAsync as jest.Mock)
        .mockResolvedValueOnce({ exists: true, isDirectory: false, size: 1000 }) // cache file
        .mockResolvedValueOnce({ exists: true, isDirectory: false, size: 2000 }); // doc file

      const info = await getStorageInfo();

      expect(info.cacheSize).toBe(1000);
      expect(info.documentSize).toBe(2000);
      expect(info.used).toBe(3000);
    });

    it('handles recursive directory traversal', async () => {
      // Mock a simpler case: cache dir with one file
      (FileSystem.getInfoAsync as jest.Mock).mockImplementation((uri: string) => {
        if (uri === '/cache/') {
          return Promise.resolve({ exists: true, isDirectory: true });
        }
        if (uri === '/cache//file1.txt') {
          return Promise.resolve({ exists: true, isDirectory: false, size: 800 });
        }
        if (uri === '/documents/') {
          return Promise.resolve({ exists: true, isDirectory: true });
        }
        if (uri === '/documents//doc.txt') {
          return Promise.resolve({ exists: true, isDirectory: false, size: 200 });
        }
        return Promise.resolve({ exists: false });
      });

      (FileSystem.readDirectoryAsync as jest.Mock).mockImplementation((uri: string) => {
        if (uri === '/cache/') {
          return Promise.resolve(['file1.txt']);
        }
        if (uri === '/documents/') {
          return Promise.resolve(['doc.txt']);
        }
        return Promise.resolve([]);
      });

      const info = await getStorageInfo();

      expect(info.cacheSize).toBe(800);
      expect(info.documentSize).toBe(200);
      expect(info.used).toBe(1000);
    });

    it('returns zeros on error', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(new Error('FS error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const info = await getStorageInfo();

      expect(info).toEqual({
        used: 0,
        available: 0,
        cacheSize: 0,
        documentSize: 0,
      });
      consoleSpy.mockRestore();
    });
  });

  describe('logSyncError', () => {
    it('logs error with auto-generated timestamp', async () => {
      await logSyncError({
        message: 'Network timeout',
        category: 'transient',
        tableName: 'work_orders',
        recordId: 'wo-1',
      });

      const stored = await AsyncStorage.getItem(SYNC_ERROR_LOG_KEY);
      const log = JSON.parse(stored!);

      expect(log).toHaveLength(1);
      expect(log[0].message).toBe('Network timeout');
      expect(log[0].category).toBe('transient');
      expect(log[0].tableName).toBe('work_orders');
      expect(log[0].recordId).toBe('wo-1');
      expect(log[0].timestamp).toBe(FIXED_TIMESTAMP);
    });

    it('adds new errors at the beginning', async () => {
      await logSyncError({ message: 'Error 1', category: 'transient' });
      await logSyncError({ message: 'Error 2', category: 'auth' });
      await logSyncError({ message: 'Error 3', category: 'validation' });

      const stored = await AsyncStorage.getItem(SYNC_ERROR_LOG_KEY);
      const log = JSON.parse(stored!);

      expect(log[0].message).toBe('Error 3');
      expect(log[1].message).toBe('Error 2');
      expect(log[2].message).toBe('Error 1');
    });

    it('trims log to MAX_ERROR_LOG_SIZE (100)', async () => {
      // Pre-populate with 100 entries
      const existingLog = Array.from({ length: 100 }, (_, i) => ({
        timestamp: FIXED_TIMESTAMP - i,
        message: `Old error ${i}`,
        category: 'transient',
      }));
      await AsyncStorage.setItem(SYNC_ERROR_LOG_KEY, JSON.stringify(existingLog));

      await logSyncError({ message: 'New error', category: 'auth' });

      const stored = await AsyncStorage.getItem(SYNC_ERROR_LOG_KEY);
      const log = JSON.parse(stored!);

      expect(log).toHaveLength(100);
      expect(log[0].message).toBe('New error');
      expect(log[99].message).toBe('Old error 98');
    });

    it('handles storage errors gracefully', async () => {
      jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('Storage full'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        logSyncError({ message: 'Test', category: 'transient' })
      ).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getRecentSyncErrors', () => {
    it('returns empty array when no errors exist', async () => {
      const errors = await getRecentSyncErrors();
      expect(errors).toEqual([]);
    });

    it('returns errors up to limit', async () => {
      for (let i = 0; i < 30; i++) {
        await logSyncError({ message: `Error ${i}`, category: 'transient' });
      }

      const errors = await getRecentSyncErrors(10);

      expect(errors).toHaveLength(10);
    });

    it('uses default limit of 20', async () => {
      for (let i = 0; i < 30; i++) {
        await logSyncError({ message: `Error ${i}`, category: 'transient' });
      }

      const errors = await getRecentSyncErrors();

      expect(errors).toHaveLength(20);
    });

    it('returns all errors when fewer than limit', async () => {
      await logSyncError({ message: 'Error 1', category: 'transient' });
      await logSyncError({ message: 'Error 2', category: 'auth' });

      const errors = await getRecentSyncErrors(10);

      expect(errors).toHaveLength(2);
    });

    it('handles parse errors gracefully', async () => {
      await AsyncStorage.setItem(SYNC_ERROR_LOG_KEY, 'invalid json');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const errors = await getRecentSyncErrors();

      expect(errors).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('clearSyncErrorLog', () => {
    it('removes the error log', async () => {
      await logSyncError({ message: 'Test error', category: 'transient' });

      await clearSyncErrorLog();

      const stored = await AsyncStorage.getItem(SYNC_ERROR_LOG_KEY);
      expect(stored).toBeNull();
    });

    it('succeeds when log does not exist', async () => {
      await expect(clearSyncErrorLog()).resolves.toBeUndefined();
    });
  });

  describe('collectDiagnostics', () => {
    it('collects comprehensive device diagnostics', async () => {
      const diagnostics = await collectDiagnostics();

      // Device info
      expect(diagnostics.deviceModel).toBe('Test Phone');
      expect(diagnostics.deviceName).toBe('Test Device');
      expect(diagnostics.osName).toBe('iOS');
      expect(diagnostics.osVersion).toBe('17.0');
      expect(diagnostics.appVersion).toBe('1.0.0');
      expect(diagnostics.buildNumber).toBe('100');

      // Storage
      expect(diagnostics.storageUsed).toBe(0);
      expect(diagnostics.storageAvailable).toBe(0);

      // Network
      expect(diagnostics.isConnected).toBe(true);

      // Sync state
      expect(diagnostics.queueStats).toBeDefined();
      expect(diagnostics.uploadStats).toBeDefined();

      // Meta
      expect(diagnostics.collectedAt).toBe(FIXED_TIMESTAMP);
    });

    it('includes recent errors', async () => {
      await logSyncError({ message: 'Test error', category: 'transient' });

      const diagnostics = await collectDiagnostics();

      expect(diagnostics.recentErrors).toHaveLength(1);
      expect(diagnostics.recentErrors[0].message).toBe('Test error');
    });

    it('includes escalated conflicts count', async () => {
      (getEscalatedConflicts as jest.Mock).mockResolvedValue([
        { id: '1' },
        { id: '2' },
        { id: '3' },
      ]);

      const diagnostics = await collectDiagnostics();

      expect(diagnostics.escalatedConflicts).toBe(3);
    });

    it('includes last sync time', async () => {
      (getLastSyncAt as jest.Mock).mockResolvedValue(FIXED_TIMESTAMP - 60000);

      const diagnostics = await collectDiagnostics();

      expect(diagnostics.lastSuccessfulSync).toBe(FIXED_TIMESTAMP - 60000);
    });

    it('includes queue stats', async () => {
      (getQueueStats as jest.Mock).mockResolvedValue({
        pending: 5,
        inProgress: 2,
        failed: 1,
        completed: 10,
      });

      const diagnostics = await collectDiagnostics();

      expect(diagnostics.queueStats.pending).toBe(5);
      expect(diagnostics.queueStats.inProgress).toBe(2);
      expect(diagnostics.queueStats.failed).toBe(1);
    });

    it('includes upload stats', async () => {
      (getUploadStats as jest.Mock).mockResolvedValue({
        pending: 3,
        uploading: 1,
        completed: 5,
        failed: 0,
      });

      const diagnostics = await collectDiagnostics();

      expect(diagnostics.uploadStats.pending).toBe(3);
      expect(diagnostics.uploadStats.uploading).toBe(1);
    });

    it('reports cellular generation when on cellular', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        type: 'cellular',
        isConnected: true,
        isInternetReachable: true,
        details: { cellularGeneration: '4g' },
      });

      const diagnostics = await collectDiagnostics();

      expect(diagnostics.connectionType).toBe('cellular');
      expect(diagnostics.cellularGeneration).toBe('4g');
    });

    it('returns null cellular generation when on WiFi', async () => {
      // Reset to WiFi after cellular test
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
        details: { isConnectionExpensive: false },
      });

      const diagnostics = await collectDiagnostics();

      expect(diagnostics.connectionType).toBe('wifi');
      expect(diagnostics.cellularGeneration).toBeNull();
    });
  });

  describe('isStorageLow', () => {
    it('returns false (stub implementation)', () => {
      const diagnostics = { storageUsed: 9000, storageAvailable: 1000 } as DeviceDiagnostics;

      // Current implementation always returns false
      expect(isStorageLow(diagnostics, 90)).toBe(false);
    });

    it('returns false with default threshold', () => {
      const diagnostics = { storageUsed: 9500, storageAvailable: 500 } as DeviceDiagnostics;

      expect(isStorageLow(diagnostics)).toBe(false);
    });
  });

  describe('formatBytes', () => {
    it('formats zero bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('formats bytes', () => {
      expect(formatBytes(500)).toBe('500 B');
    });

    it('formats kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('formats megabytes', () => {
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });

    it('formats gigabytes', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatBytes(1.5 * 1024 * 1024 * 1024)).toBe('1.5 GB');
    });
  });

  describe('formatRelativeTime', () => {
    it('returns "Never" for null timestamp', () => {
      expect(formatRelativeTime(null)).toBe('Never');
    });

    it('returns "Just now" for less than 1 minute ago', () => {
      expect(formatRelativeTime(FIXED_TIMESTAMP - 30000)).toBe('Just now');
    });

    it('returns minutes ago for less than 1 hour', () => {
      expect(formatRelativeTime(FIXED_TIMESTAMP - 60000)).toBe('1m ago');
      expect(formatRelativeTime(FIXED_TIMESTAMP - 5 * 60000)).toBe('5m ago');
      expect(formatRelativeTime(FIXED_TIMESTAMP - 59 * 60000)).toBe('59m ago');
    });

    it('returns hours ago for less than 24 hours', () => {
      expect(formatRelativeTime(FIXED_TIMESTAMP - 60 * 60000)).toBe('1h ago');
      expect(formatRelativeTime(FIXED_TIMESTAMP - 5 * 60 * 60000)).toBe('5h ago');
      expect(formatRelativeTime(FIXED_TIMESTAMP - 23 * 60 * 60000)).toBe('23h ago');
    });

    it('returns "Yesterday" for 24-48 hours ago', () => {
      expect(formatRelativeTime(FIXED_TIMESTAMP - 24 * 60 * 60000)).toBe('Yesterday');
      expect(formatRelativeTime(FIXED_TIMESTAMP - 36 * 60 * 60000)).toBe('Yesterday');
    });

    it('returns days ago for 2-6 days', () => {
      expect(formatRelativeTime(FIXED_TIMESTAMP - 2 * 24 * 60 * 60000)).toBe('2 days ago');
      expect(formatRelativeTime(FIXED_TIMESTAMP - 6 * 24 * 60 * 60000)).toBe('6 days ago');
    });

    it('returns formatted date for 7+ days', () => {
      const sevenDaysAgo = FIXED_TIMESTAMP - 7 * 24 * 60 * 60000;
      const result = formatRelativeTime(sevenDaysAgo);

      // Should be a formatted date string, not relative time
      expect(result).not.toContain('ago');
      expect(result).not.toBe('Yesterday');
    });
  });
});
