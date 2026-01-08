/**
 * Recovery Services
 *
 * Self-service recovery features for field technicians.
 * Includes database health checks, reset functionality, and device migration.
 *
 * @module services/recovery
 */

// Database health
export {
  checkDatabaseHealth,
  findOrphanedRecords,
  attemptRepair,
  needsMigration,
} from './database-health';

export type {
  DatabaseHealthReport,
  TableStatus,
  RepairResult,
  OrphanedRecordsReport,
} from './database-health';

// Database reset
export {
  canSafelyReset,
  exportPendingDataBeforeReset,
  resetLocalDatabase,
  getLocalStorageUsage,
} from './database-reset';

export type { ResetOptions, ResetResult, ResetSafetyCheck } from './database-reset';

// Device migration
export {
  generateMigrationQR,
  validateMigrationQR,
  completeMigration,
  formatTimeRemaining,
  isQRExpired,
} from './device-migration';

export type {
  MigrationPayload,
  QRGenerationResult,
  QRValidationResult,
  MigrationResult,
} from './device-migration';
