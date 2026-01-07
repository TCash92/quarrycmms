/**
 * Sync Export Service
 *
 * Exports sync logs and diagnostics for IT support troubleshooting.
 * Creates a zip file with device info, sync history, and error logs.
 *
 * Per design guide Section 6.5:
 * - Includes: App logs, sync history, error reports, device info, network diagnostics
 * - Excludes: Work order content, photos, personal data
 *
 * @module services/sync/sync-export
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { collectDiagnostics, getRecentSyncErrors, DeviceDiagnostics } from './sync-diagnostics';
import { getRecentConflicts, ConflictLogEntry } from './conflict-log';
import { getQueueStats } from './retry-queue';
import { getTrackedUploads } from '../photos/upload-tracker';

/** Directory for export files */
const EXPORT_DIRECTORY = `${FileSystem.documentDirectory}exports/`;

/** Auto-delete exports after this time (24 hours) */
const EXPORT_RETENTION_MS = 24 * 60 * 60 * 1000;

/**
 * Result of an export operation
 */
export interface ExportResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSizeBytes?: number;
  error?: string;
}

/**
 * Share method for exported logs
 */
export type ShareMethod = 'email' | 'share';

/**
 * Exported log data structure
 */
interface ExportData {
  exportedAt: string;
  exportVersion: string;
  deviceDiagnostics: DeviceDiagnostics;
  syncErrors: Array<{
    timestamp: string;
    message: string;
    category: string;
    tableName?: string;
    recordId?: string;
  }>;
  conflicts: Array<{
    timestamp: string;
    tableName: string;
    recordId: string;
    resolution: string;
    escalated: boolean;
  }>;
  queueStatus: {
    pending: number;
    failed: number;
    abandoned: number;
    byTable: Record<string, number>;
  };
  uploadQueue: Array<{
    photoId: string;
    state: string;
    attempts: number;
    error?: string;
  }>;
  // Explicit exclusions
  _excludedData: string[];
}

/**
 * Ensure export directory exists
 */
async function ensureExportDirectory(): Promise<void> {
  const info = await FileSystem.getInfoAsync(EXPORT_DIRECTORY);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(EXPORT_DIRECTORY, { intermediates: true });
  }
}

/**
 * Generate export filename with timestamp
 */
function generateExportFileName(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '').slice(0, 15);
  return `quarry_logs_${timestamp}.json`;
}

/**
 * Clean up old export files
 */
async function cleanupOldExports(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(EXPORT_DIRECTORY);
    if (!info.exists) return;

    const files = await FileSystem.readDirectoryAsync(EXPORT_DIRECTORY);
    const now = Date.now();

    for (const file of files) {
      const filePath = `${EXPORT_DIRECTORY}${file}`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (fileInfo.exists && fileInfo.modificationTime) {
        const age = now - fileInfo.modificationTime * 1000;
        if (age > EXPORT_RETENTION_MS) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          console.log(`[SyncExport] Deleted old export: ${file}`);
        }
      }
    }
  } catch (error) {
    console.warn('[SyncExport] Error cleaning up exports:', error);
  }
}

/**
 * Format sync error for export (sanitize any sensitive data)
 */
function formatSyncError(error: { timestamp: number; message: string; category: string; tableName?: string; recordId?: string }) {
  return {
    timestamp: new Date(error.timestamp).toISOString(),
    message: error.message,
    category: error.category,
    tableName: error.tableName,
    // Only include record ID prefix for correlation, not full ID
    recordId: error.recordId ? `${error.recordId.slice(0, 8)}...` : undefined,
  };
}

/**
 * Format conflict for export
 */
function formatConflict(conflict: ConflictLogEntry) {
  return {
    timestamp: new Date(conflict.occurredAt).toISOString(),
    tableName: conflict.tableName,
    // Only include record ID prefix
    recordId: `${conflict.recordId.slice(0, 8)}...`,
    resolution: conflict.resolution,
    escalated: conflict.escalated,
  };
}

/**
 * Export logs for IT support
 *
 * Creates a JSON file containing diagnostic information for troubleshooting.
 * Explicitly excludes work order content, photos, and personal data.
 *
 * @returns Export result with file path and size
 *
 * @example
 * ```typescript
 * const result = await exportLogsForSupport();
 * if (result.success) {
 *   console.log(`Export saved to: ${result.filePath}`);
 *   await shareExportedLogs(result.filePath!, 'email');
 * }
 * ```
 */
export async function exportLogsForSupport(): Promise<ExportResult> {
  try {
    // Ensure directory exists and clean up old exports
    await ensureExportDirectory();
    await cleanupOldExports();

    // Collect all diagnostic data
    const [diagnostics, syncErrors, conflicts, queueStats, uploadQueue] = await Promise.all([
      collectDiagnostics(),
      getRecentSyncErrors(50), // Last 50 errors
      getRecentConflicts(50), // Last 50 conflicts
      getQueueStats(),
      getTrackedUploads(),
    ]);

    // Build export data structure
    const exportData: ExportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      deviceDiagnostics: diagnostics,
      syncErrors: syncErrors.map(formatSyncError),
      conflicts: conflicts.map(formatConflict),
      queueStatus: {
        pending: queueStats.pending,
        failed: queueStats.failed,
        abandoned: queueStats.abandoned,
        byTable: queueStats.byTable,
      },
      uploadQueue: uploadQueue.map(u => ({
        photoId: `${u.photoId.slice(0, 8)}...`,
        state: u.state,
        attempts: u.attempts,
        error: u.error,
      })),
      // Document what we explicitly exclude
      _excludedData: [
        'Work order content and descriptions',
        'Photos and attachments',
        'User personal information',
        'Authentication tokens',
        'Full record IDs (truncated for privacy)',
      ],
    };

    // Write to file
    const fileName = generateExportFileName();
    const filePath = `${EXPORT_DIRECTORY}${fileName}`;
    const content = JSON.stringify(exportData, null, 2);

    await FileSystem.writeAsStringAsync(filePath, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Get file size
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    const fileSizeBytes = fileInfo.exists ? (fileInfo.size ?? content.length) : content.length;

    console.log(`[SyncExport] Created export: ${fileName} (${fileSizeBytes} bytes)`);

    return {
      success: true,
      filePath,
      fileName,
      fileSizeBytes,
    };
  } catch (error) {
    console.error('[SyncExport] Export failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Share exported logs via email or system share sheet
 *
 * @param filePath - Path to the export file
 * @param method - Share method ('email' or 'share')
 */
export async function shareExportedLogs(
  filePath: string,
  method: ShareMethod = 'share'
): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    throw new Error('Sharing is not available on this device');
  }

  // Check file exists
  const fileInfo = await FileSystem.getInfoAsync(filePath);
  if (!fileInfo.exists) {
    throw new Error('Export file not found');
  }

  await Sharing.shareAsync(filePath, {
    mimeType: 'application/json',
    dialogTitle: 'Share QuarryCMMS Logs',
    UTI: 'public.json', // iOS
  });

  console.log(`[SyncExport] Shared export via ${method}`);
}

/**
 * Get list of available export files
 */
export async function getExportFiles(): Promise<Array<{ fileName: string; filePath: string; size: number; createdAt: number }>> {
  try {
    const info = await FileSystem.getInfoAsync(EXPORT_DIRECTORY);
    if (!info.exists) return [];

    const files = await FileSystem.readDirectoryAsync(EXPORT_DIRECTORY);
    const exports: Array<{ fileName: string; filePath: string; size: number; createdAt: number }> = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = `${EXPORT_DIRECTORY}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          exports.push({
            fileName: file,
            filePath,
            size: fileInfo.size ?? 0,
            createdAt: fileInfo.modificationTime ? fileInfo.modificationTime * 1000 : 0,
          });
        }
      }
    }

    // Sort by creation time, newest first
    return exports.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('[SyncExport] Error listing exports:', error);
    return [];
  }
}

/**
 * Delete an export file
 */
export async function deleteExport(filePath: string): Promise<void> {
  await FileSystem.deleteAsync(filePath, { idempotent: true });
  console.log(`[SyncExport] Deleted export: ${filePath}`);
}

/**
 * Delete all export files
 */
export async function clearAllExports(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(EXPORT_DIRECTORY);
    if (info.exists) {
      await FileSystem.deleteAsync(EXPORT_DIRECTORY, { idempotent: true });
      console.log('[SyncExport] Cleared all exports');
    }
  } catch (error) {
    console.error('[SyncExport] Error clearing exports:', error);
  }
}
