/**
 * Database Health Service
 *
 * WatermelonDB corruption detection and recovery utilities.
 * Runs health checks on startup to detect and handle database issues.
 *
 * @module services/recovery/database-health
 */

import { Q } from '@nozbe/watermelondb';
import { database } from '@/database';
import { schema } from '@/database/schema';
import { logger } from '@/services/monitoring';

/**
 * Table health status
 */
export type TableStatus = 'ok' | 'corrupted' | 'missing' | 'empty';

/**
 * Database health report
 */
export interface DatabaseHealthReport {
  /** Overall health status */
  healthy: boolean;
  /** Schema version from database */
  schemaVersion: number;
  /** Expected schema version */
  expectedSchemaVersion: number;
  /** Individual table status */
  tableStatus: Record<string, TableStatus>;
  /** Record counts per table */
  recordCounts: Record<string, number>;
  /** Any integrity errors found */
  integrityErrors: string[];
  /** Recommendations for user */
  recommendations: string[];
  /** Timestamp of check */
  checkedAt: number;
}

/**
 * Repair attempt result
 */
export interface RepairResult {
  /** Whether repair was successful */
  success: boolean;
  /** Tables that were repaired */
  repaired: string[];
  /** Tables that failed to repair */
  failed: string[];
  /** Error messages */
  errors: string[];
}

/**
 * Orphaned records report
 */
export interface OrphanedRecordsReport {
  /** Photos without matching work orders */
  orphanedPhotos: number;
  /** Meter readings without matching assets */
  orphanedMeterReadings: number;
}

/** Table names in our schema */
const TABLE_NAMES = ['work_orders', 'assets', 'meter_readings', 'work_order_photos'];

/**
 * Check database health
 *
 * Runs a comprehensive health check on the WatermelonDB instance.
 * Should be called on app startup.
 *
 * @returns Database health report
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthReport> {
  const report: DatabaseHealthReport = {
    healthy: true,
    schemaVersion: 0,
    expectedSchemaVersion: schema.version,
    tableStatus: {},
    recordCounts: {},
    integrityErrors: [],
    recommendations: [],
    checkedAt: Date.now(),
  };

  try {
    logger.debug('Running database health check', { category: 'recovery' });

    // Check each table
    for (const tableName of TABLE_NAMES) {
      try {
        const collection = database.get(tableName);
        const count = await collection.query().fetchCount();
        report.recordCounts[tableName] = count;
        report.tableStatus[tableName] = count >= 0 ? 'ok' : 'corrupted';

        if (count === 0) {
          report.tableStatus[tableName] = 'empty';
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        report.tableStatus[tableName] = 'corrupted';
        report.integrityErrors.push(`Table ${tableName}: ${message}`);
        report.healthy = false;
        logger.error(`Table health check failed: ${tableName}`, error as Error, {
          category: 'recovery',
        });
      }
    }

    // Check for orphaned records
    const orphanCheck = await findOrphanedRecords();
    if (orphanCheck.orphanedPhotos > 0 || orphanCheck.orphanedMeterReadings > 0) {
      if (orphanCheck.orphanedPhotos > 0) {
        report.integrityErrors.push(
          `${orphanCheck.orphanedPhotos} photos without matching work orders`
        );
      }
      if (orphanCheck.orphanedMeterReadings > 0) {
        report.integrityErrors.push(
          `${orphanCheck.orphanedMeterReadings} meter readings without matching assets`
        );
      }
    }

    // Generate recommendations
    if (report.integrityErrors.length > 0) {
      report.recommendations.push('Consider running database repair or reset');
    }

    const corruptedTables = Object.entries(report.tableStatus).filter(
      ([, status]) => status === 'corrupted'
    );
    if (corruptedTables.length > 0) {
      report.healthy = false;
      report.recommendations.push(
        `${corruptedTables.length} table(s) may be corrupted - database reset recommended`
      );
    }

    logger.info('Database health check complete', {
      category: 'recovery',
      healthy: report.healthy,
      integrityErrors: report.integrityErrors.length,
    });
  } catch (error) {
    report.healthy = false;
    report.integrityErrors.push(
      `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    report.recommendations.push('Database reset may be required');
    logger.error('Database health check failed', error as Error, { category: 'recovery' });
  }

  return report;
}

/**
 * Find orphaned records
 *
 * Identifies photos and meter readings that reference non-existent parent records.
 */
export async function findOrphanedRecords(): Promise<OrphanedRecordsReport> {
  let orphanedPhotos = 0;
  let orphanedMeterReadings = 0;

  try {
    // Check for photos without matching work orders
    const photosCollection = database.get('work_order_photos');
    const woCollection = database.get('work_orders');

    const allPhotos = await photosCollection.query().fetch();
    const allWoIds = new Set(
      (await woCollection.query().fetch()).map((wo: { id: string }) => wo.id)
    );

    for (const photo of allPhotos) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const workOrderId = (photo as any).workOrderId;
      if (workOrderId && !allWoIds.has(workOrderId)) {
        orphanedPhotos++;
      }
    }

    // Check for meter readings without matching assets
    const meterCollection = database.get('meter_readings');
    const assetCollection = database.get('assets');

    const allReadings = await meterCollection.query().fetch();
    const allAssetIds = new Set(
      (await assetCollection.query().fetch()).map((asset: { id: string }) => asset.id)
    );

    for (const reading of allReadings) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const assetId = (reading as any).assetId;
      if (assetId && !allAssetIds.has(assetId)) {
        orphanedMeterReadings++;
      }
    }
  } catch (error) {
    logger.warn('Failed to check for orphaned records', {
      category: 'recovery',
      error: (error as Error).message,
    });
  }

  return { orphanedPhotos, orphanedMeterReadings };
}

/**
 * Attempt to repair database issues
 *
 * Tries to fix minor issues like orphaned records.
 * For major corruption, database reset is recommended.
 */
export async function attemptRepair(): Promise<RepairResult> {
  const result: RepairResult = {
    success: true,
    repaired: [],
    failed: [],
    errors: [],
  };

  try {
    logger.info('Attempting database repair', { category: 'recovery' });

    // Clean up orphaned photos
    try {
      const photosCollection = database.get('work_order_photos');
      const woCollection = database.get('work_orders');

      const allPhotos = await photosCollection.query().fetch();
      const allWoIds = new Set(
        (await woCollection.query().fetch()).map((wo: { id: string }) => wo.id)
      );

      let deletedPhotos = 0;
      await database.write(async () => {
        for (const photo of allPhotos) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const workOrderId = (photo as any).workOrderId;
          if (workOrderId && !allWoIds.has(workOrderId)) {
            await photo.destroyPermanently();
            deletedPhotos++;
          }
        }
      });

      if (deletedPhotos > 0) {
        result.repaired.push(`work_order_photos: removed ${deletedPhotos} orphaned records`);
      }
    } catch (error) {
      result.failed.push('work_order_photos');
      result.errors.push(`Photos cleanup failed: ${(error as Error).message}`);
      result.success = false;
    }

    // Clean up orphaned meter readings
    try {
      const meterCollection = database.get('meter_readings');
      const assetCollection = database.get('assets');

      const allReadings = await meterCollection.query().fetch();
      const allAssetIds = new Set(
        (await assetCollection.query().fetch()).map((asset: { id: string }) => asset.id)
      );

      let deletedReadings = 0;
      await database.write(async () => {
        for (const reading of allReadings) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const assetId = (reading as any).assetId;
          if (assetId && !allAssetIds.has(assetId)) {
            await reading.destroyPermanently();
            deletedReadings++;
          }
        }
      });

      if (deletedReadings > 0) {
        result.repaired.push(`meter_readings: removed ${deletedReadings} orphaned records`);
      }
    } catch (error) {
      result.failed.push('meter_readings');
      result.errors.push(`Meter readings cleanup failed: ${(error as Error).message}`);
      result.success = false;
    }

    logger.info('Database repair complete', {
      category: 'recovery',
      success: result.success,
      repaired: result.repaired.length,
      failed: result.failed.length,
    });
  } catch (error) {
    result.success = false;
    result.errors.push(`Repair failed: ${(error as Error).message}`);
    logger.error('Database repair failed', error as Error, { category: 'recovery' });
  }

  return result;
}

/**
 * Check if database needs migration
 */
export async function needsMigration(): Promise<boolean> {
  // WatermelonDB handles migrations automatically through the adapter
  // This function is a placeholder for custom migration checks if needed
  return false;
}

export default {
  checkDatabaseHealth,
  findOrphanedRecords,
  attemptRepair,
  needsMigration,
};
