/**
 * Database Reset Service
 *
 * Provides safe database reset functionality with pre-reset checks,
 * optional data export, and auth preservation options.
 *
 * @module services/recovery/database-reset
 */

import { Q } from '@nozbe/watermelondb';
import * as FileSystem from 'expo-file-system';
import { documentDirectory, cacheDirectory, EncodingType } from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '@/database';
import { clearAuthData, getStoredAuthData, storeAuthData } from '@/services/auth/auth-storage';
import { logger } from '@/services/monitoring';

/**
 * Reset options
 */
export interface ResetOptions {
  /** Keep user logged in after reset */
  preserveAuth: boolean;
  /** Confirmation phrase - must be "RESET" to proceed */
  confirmPhrase: string;
}

/**
 * Reset result
 */
export interface ResetResult {
  /** Whether reset was successful */
  success: boolean;
  /** Number of pending items that were lost */
  pendingItemsLost: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Pre-reset safety check result
 */
export interface ResetSafetyCheck {
  /** Whether it's safe to reset (no critical unsynced data) */
  safe: boolean;
  /** Number of pending work orders */
  pendingWorkOrders: number;
  /** Number of pending photos */
  pendingPhotos: number;
  /** Number of pending meter readings */
  pendingMeterReadings: number;
  /** Total pending items */
  totalPending: number;
  /** Warning messages */
  warnings: string[];
}

/**
 * Table names to clear during reset
 */
const TABLES_TO_CLEAR = ['work_orders', 'assets', 'meter_readings', 'work_order_photos'];

/**
 * AsyncStorage keys to preserve during reset
 */
const PRESERVED_ASYNC_KEYS: string[] = [
  // Auth-related keys are preserved via SecureStore
];

/**
 * Check if reset is safe
 *
 * Examines the database for unsynced data that would be lost.
 * Returns counts and warnings to help user make informed decision.
 */
export async function canSafelyReset(): Promise<ResetSafetyCheck> {
  const result: ResetSafetyCheck = {
    safe: true,
    pendingWorkOrders: 0,
    pendingPhotos: 0,
    pendingMeterReadings: 0,
    totalPending: 0,
    warnings: [],
  };

  try {
    // Count pending work orders
    const woCollection = database.get('work_orders');
    result.pendingWorkOrders = await woCollection
      .query(Q.where('local_sync_status', 'pending'))
      .fetchCount();

    // Count pending photos
    const photoCollection = database.get('work_order_photos');
    result.pendingPhotos = await photoCollection
      .query(Q.where('local_sync_status', 'pending'))
      .fetchCount();

    // Count pending meter readings
    const meterCollection = database.get('meter_readings');
    result.pendingMeterReadings = await meterCollection
      .query(Q.where('local_sync_status', 'pending'))
      .fetchCount();

    // Calculate total
    result.totalPending =
      result.pendingWorkOrders + result.pendingPhotos + result.pendingMeterReadings;

    // Generate warnings
    if (result.pendingWorkOrders > 0) {
      result.warnings.push(
        `${result.pendingWorkOrders} work order(s) have not been synced to the server`
      );
      result.safe = false;
    }

    if (result.pendingPhotos > 0) {
      result.warnings.push(`${result.pendingPhotos} photo(s) have not been uploaded`);
      result.safe = false;
    }

    if (result.pendingMeterReadings > 0) {
      result.warnings.push(
        `${result.pendingMeterReadings} meter reading(s) have not been synced`
      );
      result.safe = false;
    }

    logger.info('Reset safety check complete', {
      category: 'recovery',
      safe: result.safe,
      totalPending: result.totalPending,
    });
  } catch (error) {
    logger.error('Reset safety check failed', error as Error, { category: 'recovery' });
    result.warnings.push('Unable to determine pending data - proceed with caution');
  }

  return result;
}

/**
 * Export pending data before reset
 *
 * Creates a JSON file with all pending (unsynced) data.
 * This is a last-resort backup before clearing the database.
 *
 * @returns File path of the export, or null if export failed
 */
export async function exportPendingDataBeforeReset(): Promise<string | null> {
  try {
    logger.info('Exporting pending data before reset', { category: 'recovery' });

    const pendingData: {
      exportedAt: string;
      reason: string;
      workOrders: unknown[];
      photos: unknown[];
      meterReadings: unknown[];
    } = {
      exportedAt: new Date().toISOString(),
      reason: 'Pre-reset backup',
      workOrders: [],
      photos: [],
      meterReadings: [],
    };

    // Export pending work orders
    const woCollection = database.get('work_orders');
    const pendingWos = await woCollection
      .query(Q.where('local_sync_status', 'pending'))
      .fetch();
    pendingData.workOrders = pendingWos.map(wo => ({
      id: wo.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      woNumber: (wo as any).woNumber,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      title: (wo as any).title,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: (wo as any).status,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      priority: (wo as any).priority,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      completionNotes: (wo as any).completionNotes,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      completedAt: (wo as any).completedAt,
    }));

    // Export pending photos (metadata only, not files)
    const photoCollection = database.get('work_order_photos');
    const pendingPhotos = await photoCollection
      .query(Q.where('local_sync_status', 'pending'))
      .fetch();
    pendingData.photos = pendingPhotos.map(photo => ({
      id: photo.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      workOrderId: (photo as any).workOrderId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      localUri: (photo as any).localUri,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      caption: (photo as any).caption,
    }));

    // Export pending meter readings
    const meterCollection = database.get('meter_readings');
    const pendingReadings = await meterCollection
      .query(Q.where('local_sync_status', 'pending'))
      .fetch();
    pendingData.meterReadings = pendingReadings.map(reading => ({
      id: reading.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assetId: (reading as any).assetId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      readingValue: (reading as any).readingValue,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      readingDate: (reading as any).readingDate,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      notes: (reading as any).notes,
    }));

    // Write to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    const fileName = `pending_data_backup_${timestamp}.json`;
    const filePath = `${documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(pendingData, null, 2), {
      encoding: EncodingType.UTF8,
    });

    logger.info('Pending data exported', {
      category: 'recovery',
      filePath,
      workOrders: pendingData.workOrders.length,
      photos: pendingData.photos.length,
      meterReadings: pendingData.meterReadings.length,
    });

    return filePath;
  } catch (error) {
    logger.error('Failed to export pending data', error as Error, { category: 'recovery' });
    return null;
  }
}

/**
 * Reset the local database
 *
 * Clears all WatermelonDB tables, AsyncStorage, and photo cache.
 * Optionally preserves authentication state.
 *
 * CAUTION: This is destructive and cannot be undone!
 *
 * @param options - Reset options including auth preservation and confirmation
 * @returns Reset result
 */
export async function resetLocalDatabase(options: ResetOptions): Promise<ResetResult> {
  // Validate confirmation phrase
  if (options.confirmPhrase !== 'RESET') {
    return {
      success: false,
      pendingItemsLost: 0,
      error: 'Invalid confirmation phrase. Type "RESET" to confirm.',
    };
  }

  try {
    logger.warn('Starting database reset', {
      category: 'recovery',
      preserveAuth: options.preserveAuth,
    });

    // Get count of pending items before reset
    const safetyCheck = await canSafelyReset();
    const pendingItemsLost = safetyCheck.totalPending;

    // Preserve auth data if requested
    let authData = null;
    if (options.preserveAuth) {
      authData = await getStoredAuthData();
      logger.debug('Auth data preserved for restoration', { category: 'recovery' });
    }

    // Clear WatermelonDB tables
    await database.write(async () => {
      for (const tableName of TABLES_TO_CLEAR) {
        try {
          const collection = database.get(tableName);
          const allRecords = await collection.query().fetch();
          for (const record of allRecords) {
            await record.destroyPermanently();
          }
          logger.debug(`Cleared table: ${tableName}`, {
            category: 'recovery',
            recordCount: allRecords.length,
          });
        } catch (error) {
          logger.error(`Failed to clear table: ${tableName}`, error as Error, {
            category: 'recovery',
          });
        }
      }
    });

    // Clear AsyncStorage (except preserved keys)
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter(key => !PRESERVED_ASYNC_KEYS.includes(key));
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        logger.debug('Cleared AsyncStorage', {
          category: 'recovery',
          keysRemoved: keysToRemove.length,
        });
      }
    } catch (error) {
      logger.warn('Failed to clear AsyncStorage', {
        category: 'recovery',
        error: (error as Error).message,
      });
    }

    // Clear photo cache directory
    try {
      const cacheDir = `${cacheDirectory}photos/`;
      const cacheInfo = await FileSystem.getInfoAsync(cacheDir);
      if (cacheInfo.exists) {
        await FileSystem.deleteAsync(cacheDir, { idempotent: true });
        logger.debug('Cleared photo cache', { category: 'recovery' });
      }
    } catch (error) {
      logger.warn('Failed to clear photo cache', {
        category: 'recovery',
        error: (error as Error).message,
      });
    }

    // Clear voice notes directory
    try {
      const voiceDir = `${documentDirectory}voice_notes/`;
      const voiceInfo = await FileSystem.getInfoAsync(voiceDir);
      if (voiceInfo.exists) {
        await FileSystem.deleteAsync(voiceDir, { idempotent: true });
        logger.debug('Cleared voice notes', { category: 'recovery' });
      }
    } catch (error) {
      logger.warn('Failed to clear voice notes', {
        category: 'recovery',
        error: (error as Error).message,
      });
    }

    // Restore auth data if it was preserved
    if (options.preserveAuth && authData) {
      await storeAuthData(authData);
      logger.debug('Auth data restored', { category: 'recovery' });
    } else if (!options.preserveAuth) {
      await clearAuthData();
      logger.debug('Auth data cleared', { category: 'recovery' });
    }

    logger.warn('Database reset complete', {
      category: 'recovery',
      pendingItemsLost,
    });

    return {
      success: true,
      pendingItemsLost,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Database reset failed', error as Error, { category: 'recovery' });
    return {
      success: false,
      pendingItemsLost: 0,
      error: message,
    };
  }
}

/**
 * Get estimated storage used by local data
 */
export async function getLocalStorageUsage(): Promise<{
  databaseMb: number;
  photosMb: number;
  voiceNotesMb: number;
  totalMb: number;
}> {
  let databaseMb = 0;
  let photosMb = 0;
  let voiceNotesMb = 0;

  try {
    // Estimate database size from record counts
    // This is a rough estimate - actual SQLite file size may vary
    const woCount = await database.get('work_orders').query().fetchCount();
    const assetCount = await database.get('assets').query().fetchCount();
    const photoCount = await database.get('work_order_photos').query().fetchCount();
    const meterCount = await database.get('meter_readings').query().fetchCount();

    // Rough estimates: WO ~2KB, Asset ~1KB, Photo record ~0.5KB, Meter ~0.3KB
    databaseMb =
      (woCount * 2 + assetCount * 1 + photoCount * 0.5 + meterCount * 0.3) / 1024;

    // Check photo cache size
    const photoCacheDir = `${cacheDirectory}photos/`;
    const cacheInfo = await FileSystem.getInfoAsync(photoCacheDir);
    if (cacheInfo.exists) {
      const files = await FileSystem.readDirectoryAsync(photoCacheDir);
      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${photoCacheDir}${file}`);
        if (fileInfo.exists && fileInfo.size) {
          photosMb += fileInfo.size / (1024 * 1024);
        }
      }
    }

    // Check voice notes size
    const voiceDir = `${documentDirectory}voice_notes/`;
    const voiceInfo = await FileSystem.getInfoAsync(voiceDir);
    if (voiceInfo.exists) {
      const files = await FileSystem.readDirectoryAsync(voiceDir);
      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${voiceDir}${file}`);
        if (fileInfo.exists && fileInfo.size) {
          voiceNotesMb += fileInfo.size / (1024 * 1024);
        }
      }
    }
  } catch (error) {
    logger.warn('Failed to calculate storage usage', {
      category: 'recovery',
      error: (error as Error).message,
    });
  }

  return {
    databaseMb: Math.round(databaseMb * 100) / 100,
    photosMb: Math.round(photosMb * 100) / 100,
    voiceNotesMb: Math.round(voiceNotesMb * 100) / 100,
    totalMb: Math.round((databaseMb + photosMb + voiceNotesMb) * 100) / 100,
  };
}

export default {
  canSafelyReset,
  exportPendingDataBeforeReset,
  resetLocalDatabase,
  getLocalStorageUsage,
};
