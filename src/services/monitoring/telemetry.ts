/**
 * Device Telemetry Service
 *
 * Collects and reports device health metrics for proactive monitoring.
 * Helps identify issues before they become critical.
 *
 * @module services/monitoring/telemetry
 */

import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';
import { documentDirectory } from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';
import { logger } from './logger';
import { getUserContext } from './monitoring-service';

/**
 * Device telemetry data structure
 */
export interface DeviceTelemetry {
  /** Unique device identifier */
  deviceId: string;
  /** Collection timestamp */
  timestamp: number;
  /** App version */
  appVersion: string;
  /** OS version */
  osVersion: string;
  /** Battery level (0-1, null if unavailable) */
  batteryLevel: number | null;
  /** Storage used in MB */
  storageUsedMb: number;
  /** Available storage in MB */
  storageAvailableMb: number;
  /** Number of items in sync queue */
  syncQueueDepth: number;
  /** Average age of sync queue items in hours */
  syncQueueAgeHours: number;
  /** Last successful sync timestamp */
  lastSuccessfulSync: number | null;
  /** Number of consecutive sync failures */
  consecutiveSyncFailures: number;
  /** Number of photos pending upload */
  photosPendingUpload: number;
  /** Voice note quality rate (0-1) */
  voiceNoteQualityRate: number;
  /** Network type */
  networkType: string | null;
  /** Is device online */
  isOnline: boolean;
}

/**
 * Alert thresholds from Part 13.5 of design guide
 */
export const ALERT_THRESHOLDS = {
  /** Sync queue items pending >24h triggers alert */
  SYNC_QUEUE_AGE_HOURS: 24,
  /** Sync queue depth that triggers concern */
  SYNC_QUEUE_DEPTH: 50,
  /** Photo storage limit per device (MB) */
  PHOTO_STORAGE_MB: 2048, // 2GB
  /** Consecutive sync failures that trigger escalation */
  CONSECUTIVE_SYNC_FAILURES: 5,
  /** Voice note quality rate below this triggers training flag */
  VOICE_NOTE_QUALITY_RATE: 0.7,
  /** Photos pending >14 days triggers critical alert */
  PHOTO_PENDING_DAYS: 14,
};

/**
 * Local storage for tracking telemetry state
 */
interface TelemetryState {
  lastSuccessfulSync: number | null;
  consecutiveSyncFailures: number;
  syncQueueDepth: number;
  syncQueueOldestItem: number | null;
  photosPendingUpload: number;
  voiceNoteHighQualityCount: number;
  voiceNoteTotalCount: number;
}

let telemetryState: TelemetryState = {
  lastSuccessfulSync: null,
  consecutiveSyncFailures: 0,
  syncQueueDepth: 0,
  syncQueueOldestItem: null,
  photosPendingUpload: 0,
  voiceNoteHighQualityCount: 0,
  voiceNoteTotalCount: 0,
};

/**
 * Periodic telemetry interval reference
 */
let telemetryIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Get device ID (using expo-device)
 */
function getDeviceId(): string {
  // Use a combination of device info as identifier
  // Note: For production, consider using expo-application's getAndroidId/getIosIdForVendorAsync
  return `${Device.brand}-${Device.modelName}-${Device.osVersion}`.replace(/\s/g, '_');
}

/**
 * Get app version
 */
function getAppVersion(): string {
  return Constants.expoConfig?.version || '0.0.0';
}

/**
 * Get storage usage information
 */
async function getStorageInfo(): Promise<{ usedMb: number; availableMb: number }> {
  try {
    const docDir = documentDirectory;
    if (!docDir) {
      return { usedMb: 0, availableMb: 0 };
    }

    // Get free disk space
    const info = await FileSystem.getFreeDiskStorageAsync();
    const availableMb = Math.round(info / (1024 * 1024));

    // Estimate used by getting directory sizes
    // Note: This is an approximation
    let usedBytes = 0;
    try {
      const files = await FileSystem.readDirectoryAsync(docDir);
      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${docDir}${file}`);
        if (fileInfo.exists && 'size' in fileInfo) {
          usedBytes += fileInfo.size || 0;
        }
      }
    } catch {
      // Directory read failed, use 0
    }

    return {
      usedMb: Math.round(usedBytes / (1024 * 1024)),
      availableMb,
    };
  } catch (error) {
    logger.debug('Failed to get storage info', { category: 'telemetry', error: String(error) });
    return { usedMb: 0, availableMb: 0 };
  }
}

/**
 * Calculate sync queue age in hours
 */
function getSyncQueueAgeHours(): number {
  if (!telemetryState.syncQueueOldestItem) return 0;
  const ageMs = Date.now() - telemetryState.syncQueueOldestItem;
  return Math.round((ageMs / (1000 * 60 * 60)) * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate voice note quality rate
 */
function getVoiceNoteQualityRate(): number {
  if (telemetryState.voiceNoteTotalCount === 0) return 1;
  return telemetryState.voiceNoteHighQualityCount / telemetryState.voiceNoteTotalCount;
}

/**
 * Collect current device telemetry
 */
export async function collectTelemetry(): Promise<DeviceTelemetry> {
  const storage = await getStorageInfo();

  return {
    deviceId: getDeviceId(),
    timestamp: Date.now(),
    appVersion: getAppVersion(),
    osVersion: Device.osVersion || 'unknown',
    batteryLevel: null, // Battery API requires additional setup
    storageUsedMb: storage.usedMb,
    storageAvailableMb: storage.availableMb,
    syncQueueDepth: telemetryState.syncQueueDepth,
    syncQueueAgeHours: getSyncQueueAgeHours(),
    lastSuccessfulSync: telemetryState.lastSuccessfulSync,
    consecutiveSyncFailures: telemetryState.consecutiveSyncFailures,
    photosPendingUpload: telemetryState.photosPendingUpload,
    voiceNoteQualityRate: getVoiceNoteQualityRate(),
    networkType: null, // Would need NetInfo integration
    isOnline: true, // Simplified - would need NetInfo
  };
}

/**
 * Check telemetry against thresholds and create alerts
 */
function checkAlerts(telemetry: DeviceTelemetry): string[] {
  const alerts: string[] = [];

  if (
    telemetry.syncQueueDepth > ALERT_THRESHOLDS.SYNC_QUEUE_DEPTH &&
    telemetry.syncQueueAgeHours > ALERT_THRESHOLDS.SYNC_QUEUE_AGE_HOURS
  ) {
    alerts.push(
      `Sync queue alert: ${telemetry.syncQueueDepth} items pending >${telemetry.syncQueueAgeHours}h`
    );
  }

  if (telemetry.storageUsedMb > ALERT_THRESHOLDS.PHOTO_STORAGE_MB) {
    alerts.push(`Storage alert: ${telemetry.storageUsedMb}MB used (limit: 2GB)`);
  }

  if (telemetry.consecutiveSyncFailures >= ALERT_THRESHOLDS.CONSECUTIVE_SYNC_FAILURES) {
    alerts.push(`Sync failure alert: ${telemetry.consecutiveSyncFailures} consecutive failures`);
  }

  if (telemetry.voiceNoteQualityRate < ALERT_THRESHOLDS.VOICE_NOTE_QUALITY_RATE) {
    const pct = Math.round(telemetry.voiceNoteQualityRate * 100);
    alerts.push(`Voice note quality alert: only ${pct}% high/medium quality`);
  }

  return alerts;
}

/**
 * Report telemetry to backend and Sentry
 */
export async function reportTelemetry(): Promise<void> {
  try {
    const telemetry = await collectTelemetry();
    const alerts = checkAlerts(telemetry);
    const userContext = getUserContext();

    // Add telemetry as Sentry context
    Sentry.setContext('device_telemetry', {
      sync_queue_depth: telemetry.syncQueueDepth,
      sync_queue_age_hours: telemetry.syncQueueAgeHours,
      consecutive_sync_failures: telemetry.consecutiveSyncFailures,
      photos_pending: telemetry.photosPendingUpload,
      storage_used_mb: telemetry.storageUsedMb,
      voice_note_quality_rate: telemetry.voiceNoteQualityRate,
    });

    // Log alerts
    if (alerts.length > 0) {
      logger.warn('Telemetry alerts detected', {
        category: 'telemetry',
        alerts,
        deviceId: telemetry.deviceId,
      });

      // Report critical alerts to Sentry
      if (telemetry.consecutiveSyncFailures >= ALERT_THRESHOLDS.CONSECUTIVE_SYNC_FAILURES) {
        Sentry.captureMessage('Device sync failures threshold exceeded', {
          level: 'warning',
          extra: {
            telemetry,
            userContext,
          },
          tags: {
            alert_type: 'sync_failures',
          },
        });
      }
    }

    logger.debug('Telemetry reported', {
      category: 'telemetry',
      deviceId: telemetry.deviceId,
      alertCount: alerts.length,
    });
  } catch (error) {
    logger.error('Failed to report telemetry', error as Error, { category: 'telemetry' });
  }
}

/**
 * Schedule periodic telemetry reporting
 *
 * @param intervalMs - Interval in milliseconds (default: 4 hours)
 */
export function schedulePeriodicTelemetry(intervalMs = 4 * 60 * 60 * 1000): void {
  if (telemetryIntervalId) {
    clearInterval(telemetryIntervalId);
  }

  // Report immediately on start
  void reportTelemetry();

  // Then schedule periodic reports
  telemetryIntervalId = setInterval(() => {
    void reportTelemetry();
  }, intervalMs);

  logger.info('Periodic telemetry scheduled', {
    category: 'telemetry',
    intervalMs,
  });
}

/**
 * Stop periodic telemetry reporting
 */
export function stopPeriodicTelemetry(): void {
  if (telemetryIntervalId) {
    clearInterval(telemetryIntervalId);
    telemetryIntervalId = null;
    logger.info('Periodic telemetry stopped', { category: 'telemetry' });
  }
}

// ============================================
// State update functions (called by other services)
// ============================================

/**
 * Update sync success state
 */
export function recordSyncSuccess(): void {
  telemetryState.lastSuccessfulSync = Date.now();
  telemetryState.consecutiveSyncFailures = 0;
}

/**
 * Update sync failure state
 */
export function recordSyncFailure(): void {
  telemetryState.consecutiveSyncFailures++;
}

/**
 * Update sync queue state
 */
export function updateSyncQueueState(depth: number, oldestItemTimestamp: number | null): void {
  telemetryState.syncQueueDepth = depth;
  telemetryState.syncQueueOldestItem = oldestItemTimestamp;
}

/**
 * Update pending photos count
 */
export function updatePhotosPending(count: number): void {
  telemetryState.photosPendingUpload = count;
}

/**
 * Record voice note quality
 */
export function recordVoiceNoteQuality(isHighQuality: boolean): void {
  telemetryState.voiceNoteTotalCount++;
  if (isHighQuality) {
    telemetryState.voiceNoteHighQualityCount++;
  }
}

/**
 * Reset telemetry state (e.g., on logout)
 */
export function resetTelemetryState(): void {
  telemetryState = {
    lastSuccessfulSync: null,
    consecutiveSyncFailures: 0,
    syncQueueDepth: 0,
    syncQueueOldestItem: null,
    photosPendingUpload: 0,
    voiceNoteHighQualityCount: 0,
    voiceNoteTotalCount: 0,
  };
}

export default {
  ALERT_THRESHOLDS,
  collectTelemetry,
  reportTelemetry,
  schedulePeriodicTelemetry,
  stopPeriodicTelemetry,
  recordSyncSuccess,
  recordSyncFailure,
  updateSyncQueueState,
  updatePhotosPending,
  recordVoiceNoteQuality,
  resetTelemetryState,
};
