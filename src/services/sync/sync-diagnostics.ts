/**
 * Sync Diagnostics Service
 *
 * Collects device and network diagnostic information for troubleshooting
 * sync issues. Used by the SyncDetailsScreen and log export feature.
 *
 * @module services/sync/sync-diagnostics
 */

import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';
import { cacheDirectory, documentDirectory } from 'expo-file-system/legacy';
import * as Application from 'expo-application';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getQueueStats, QueueStats } from './retry-queue';
import { getUploadStats, UploadStats } from '../photos/upload-tracker';
import { getLastSyncAt } from './sync-storage';
import { getEscalatedConflicts } from './conflict-log';

/** Storage key for sync error log */
const SYNC_ERROR_LOG_KEY = 'cmms_sync_error_log';

/** Maximum number of errors to keep in log */
const MAX_ERROR_LOG_SIZE = 100;

/**
 * Device and sync diagnostic information
 */
export interface DeviceDiagnostics {
  // Device info
  deviceModel: string;
  deviceName: string | null;
  osName: string;
  osVersion: string;
  appVersion: string;
  buildNumber: string | null;

  // Storage info
  storageUsed: number;
  storageAvailable: number;
  cacheSize: number;
  documentSize: number;

  // Network info
  connectionType: string;
  isConnected: boolean;
  isInternetReachable: boolean | null;
  cellularGeneration: string | null;

  // Sync state
  lastSuccessfulSync: number | null;
  queueStats: QueueStats;
  uploadStats: UploadStats;

  // Errors
  recentErrors: SyncErrorEntry[];
  escalatedConflicts: number;

  // Timestamps
  collectedAt: number;
}

/**
 * A single sync error log entry
 */
export interface SyncErrorEntry {
  timestamp: number;
  message: string;
  category: string;
  tableName?: string;
  recordId?: string;
}

/**
 * Storage size information
 */
export interface StorageInfo {
  used: number;
  available: number;
  cacheSize: number;
  documentSize: number;
}

/**
 * Get directory size in bytes
 */
async function getDirectorySize(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return 0;

    if (info.isDirectory) {
      const files = await FileSystem.readDirectoryAsync(uri);
      let total = 0;
      for (const file of files) {
        total += await getDirectorySize(`${uri}/${file}`);
      }
      return total;
    } else {
      return info.size ?? 0;
    }
  } catch (error) {
    console.warn('[SyncDiagnostics] Error getting directory size:', error);
    return 0;
  }
}

/**
 * Get storage information
 *
 * Note: On iOS/Android, we can only accurately measure our app's storage.
 * Total device storage requires native modules not included by default.
 */
export async function getStorageInfo(): Promise<StorageInfo> {
  try {
    const cacheDir = cacheDirectory;
    const documentDir = documentDirectory;

    const [cacheSize, documentSize] = await Promise.all([
      cacheDir ? getDirectorySize(cacheDir) : 0,
      documentDir ? getDirectorySize(documentDir) : 0,
    ]);

    // Note: expo-file-system doesn't provide total/free storage
    // These would need expo-storage or native modules
    // For now, we report app-specific storage
    return {
      used: cacheSize + documentSize,
      available: 0, // Would need native module
      cacheSize,
      documentSize,
    };
  } catch (error) {
    console.error('[SyncDiagnostics] Error getting storage info:', error);
    return {
      used: 0,
      available: 0,
      cacheSize: 0,
      documentSize: 0,
    };
  }
}

/**
 * Log a sync error for diagnostic purposes
 *
 * @param error - Error details to log
 */
export async function logSyncError(error: Omit<SyncErrorEntry, 'timestamp'>): Promise<void> {
  try {
    const entry: SyncErrorEntry = {
      ...error,
      timestamp: Date.now(),
    };

    const json = await AsyncStorage.getItem(SYNC_ERROR_LOG_KEY);
    const log: SyncErrorEntry[] = json ? JSON.parse(json) : [];

    // Add new entry at the beginning
    log.unshift(entry);

    // Trim to max size
    if (log.length > MAX_ERROR_LOG_SIZE) {
      log.length = MAX_ERROR_LOG_SIZE;
    }

    await AsyncStorage.setItem(SYNC_ERROR_LOG_KEY, JSON.stringify(log));
  } catch (err) {
    console.error('[SyncDiagnostics] Error logging sync error:', err);
  }
}

/**
 * Get recent sync errors from the log
 *
 * @param limit - Maximum number of errors to return (default: 20)
 * @returns Array of recent sync errors
 */
export async function getRecentSyncErrors(limit: number = 20): Promise<SyncErrorEntry[]> {
  try {
    const json = await AsyncStorage.getItem(SYNC_ERROR_LOG_KEY);
    if (!json) return [];

    const log: SyncErrorEntry[] = JSON.parse(json);
    return log.slice(0, limit);
  } catch (error) {
    console.error('[SyncDiagnostics] Error getting sync errors:', error);
    return [];
  }
}

/**
 * Clear the sync error log
 */
export async function clearSyncErrorLog(): Promise<void> {
  await AsyncStorage.removeItem(SYNC_ERROR_LOG_KEY);
}

/**
 * Collect comprehensive device diagnostics
 *
 * Gathers device info, storage, network, sync state, and recent errors.
 *
 * @returns Complete diagnostic information
 *
 * @example
 * ```typescript
 * const diagnostics = await collectDiagnostics();
 * console.log('Device:', diagnostics.deviceModel);
 * console.log('Storage used:', diagnostics.storageUsed);
 * console.log('Last sync:', diagnostics.lastSuccessfulSync);
 * ```
 */
export async function collectDiagnostics(): Promise<DeviceDiagnostics> {
  // Collect all data in parallel where possible
  const [
    networkState,
    storageInfo,
    queueStats,
    uploadStats,
    lastSync,
    recentErrors,
    escalatedConflicts,
  ] = await Promise.all([
    NetInfo.fetch(),
    getStorageInfo(),
    getQueueStats(),
    getUploadStats(),
    getLastSyncAt(),
    getRecentSyncErrors(),
    getEscalatedConflicts().then(conflicts => conflicts.length),
  ]);

  return {
    // Device info
    deviceModel: Device.modelName ?? 'Unknown',
    deviceName: Device.deviceName,
    osName: Device.osName ?? 'Unknown',
    osVersion: Device.osVersion ?? 'Unknown',
    appVersion: Application.nativeApplicationVersion ?? 'Unknown',
    buildNumber: Application.nativeBuildVersion,

    // Storage
    storageUsed: storageInfo.used,
    storageAvailable: storageInfo.available,
    cacheSize: storageInfo.cacheSize,
    documentSize: storageInfo.documentSize,

    // Network
    connectionType: networkState.type,
    isConnected: networkState.isConnected ?? false,
    isInternetReachable: networkState.isInternetReachable,
    cellularGeneration:
      networkState.type === 'cellular'
        ? (networkState.details as { cellularGeneration?: string })?.cellularGeneration ?? null
        : null,

    // Sync state
    lastSuccessfulSync: lastSync,
    queueStats,
    uploadStats,

    // Errors
    recentErrors,
    escalatedConflicts,

    // Meta
    collectedAt: Date.now(),
  };
}

/**
 * Check if storage is low (warning threshold)
 *
 * @param thresholdPercent - Percentage threshold (default: 90)
 * @returns Whether storage usage is above threshold
 */
export function isStorageLow(
  _diagnostics: DeviceDiagnostics,
  _thresholdPercent: number = 90
): boolean {
  // Without total storage info, we can't calculate percentage
  // For now, return false - would need native module for accurate check
  // In production, use expo-storage or react-native-device-info
  return false;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * Format timestamp to relative time string
 */
export function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return 'Never';

  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  return new Date(timestamp).toLocaleDateString();
}
