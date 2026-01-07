/**
 * Tests for sync-storage.ts
 *
 * Tests the AsyncStorage-based sync metadata storage including:
 * - getLastSyncAt / setLastSyncAt for sync timestamps
 * - getSyncError / setSyncError for error state
 * - clearSyncMetadata for reset functionality
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getLastSyncAt,
  setLastSyncAt,
  getSyncError,
  setSyncError,
  clearSyncMetadata,
} from '@/services/sync/sync-storage';

// Storage keys matching the module
const STORAGE_KEYS = {
  LAST_SYNC_AT: 'cmms_last_sync_at',
  SYNC_ERROR: 'cmms_sync_error',
};

describe('sync-storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the mock storage between tests
    AsyncStorage.clear();
  });

  describe('getLastSyncAt', () => {
    it('returns null when no value is stored', async () => {
      const result = await getLastSyncAt();
      expect(result).toBeNull();
    });

    it('returns stored timestamp as number', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_AT, '1704067200000');

      const result = await getLastSyncAt();

      expect(result).toBe(1704067200000);
    });

    it('returns null for invalid (NaN) stored value', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_AT, 'not-a-number');

      const result = await getLastSyncAt();

      expect(result).toBeNull();
    });

    it('returns null and logs error on AsyncStorage failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('Storage error'));

      const result = await getLastSyncAt();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SyncStorage] Failed to get lastSyncAt:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('setLastSyncAt', () => {
    it('stores timestamp as string', async () => {
      await setLastSyncAt(1704067200000);

      const stored = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_AT);
      expect(stored).toBe('1704067200000');
    });

    it('overwrites existing timestamp', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_AT, '1000000000000');

      await setLastSyncAt(1704067200000);

      const stored = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_AT);
      expect(stored).toBe('1704067200000');
    });

    it('throws and logs error on AsyncStorage failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('Storage error'));

      await expect(setLastSyncAt(1704067200000)).rejects.toThrow('Storage error');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SyncStorage] Failed to set lastSyncAt:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('getSyncError', () => {
    it('returns null when no error is stored', async () => {
      const result = await getSyncError();
      expect(result).toBeNull();
    });

    it('returns stored error message', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_ERROR, 'Network timeout');

      const result = await getSyncError();

      expect(result).toBe('Network timeout');
    });

    it('returns null and logs error on AsyncStorage failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('Storage error'));

      const result = await getSyncError();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SyncStorage] Failed to get syncError:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('setSyncError', () => {
    it('stores error message', async () => {
      await setSyncError('Connection failed');

      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_ERROR);
      expect(stored).toBe('Connection failed');
    });

    it('removes error when passed null', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_ERROR, 'Previous error');

      await setSyncError(null);

      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_ERROR);
      expect(stored).toBeNull();
    });

    it('overwrites existing error', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_ERROR, 'Old error');

      await setSyncError('New error');

      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_ERROR);
      expect(stored).toBe('New error');
    });

    it('throws and logs error on AsyncStorage failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('Storage error'));

      await expect(setSyncError('Some error')).rejects.toThrow('Storage error');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SyncStorage] Failed to set syncError:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('throws and logs error on removeItem failure when clearing', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValue(new Error('Remove failed'));

      await expect(setSyncError(null)).rejects.toThrow('Remove failed');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SyncStorage] Failed to set syncError:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('clearSyncMetadata', () => {
    it('removes all sync-related keys', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_AT, '1704067200000');
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_ERROR, 'Some error');

      await clearSyncMetadata();

      const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_AT);
      const syncError = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_ERROR);
      expect(lastSync).toBeNull();
      expect(syncError).toBeNull();
    });

    it('succeeds even when keys do not exist', async () => {
      // Should not throw when keys don't exist
      await expect(clearSyncMetadata()).resolves.toBeUndefined();
    });

    it('throws and logs error on AsyncStorage failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(AsyncStorage, 'multiRemove').mockRejectedValue(new Error('Clear failed'));

      await expect(clearSyncMetadata()).rejects.toThrow('Clear failed');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SyncStorage] Failed to clear sync metadata:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('integration scenarios', () => {
    it('can store and retrieve sync state after successful sync', async () => {
      const syncTimestamp = 1704067200000;

      // Simulate successful sync
      await setLastSyncAt(syncTimestamp);
      await setSyncError(null);

      // Verify state
      const lastSync = await getLastSyncAt();
      const error = await getSyncError();

      expect(lastSync).toBe(syncTimestamp);
      expect(error).toBeNull();
    });

    it('can store and retrieve sync state after failed sync', async () => {
      const errorMessage = 'Network connection lost';

      // Simulate failed sync
      await setSyncError(errorMessage);

      // Verify state
      const error = await getSyncError();

      expect(error).toBe(errorMessage);
    });

    it('clearSyncMetadata resets to initial state', async () => {
      // Set up some state
      await setLastSyncAt(1704067200000);
      await setSyncError('Some error');

      // Clear all
      await clearSyncMetadata();

      // Verify initial state
      const lastSync = await getLastSyncAt();
      const error = await getSyncError();

      expect(lastSync).toBeNull();
      expect(error).toBeNull();
    });
  });
});
