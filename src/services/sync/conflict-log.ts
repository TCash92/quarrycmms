/**
 * Conflict audit logging using AsyncStorage
 *
 * Stores conflict events for debugging, compliance, and supervisor review.
 * Implements 30-day retention with automatic pruning.
 *
 * @module sync/conflict-log
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ConflictResolution } from '@/types';

/**
 * Storage key for conflict log
 */
const CONFLICT_LOG_KEY = '@quarrycmms:conflict_log';

/**
 * Retention period in milliseconds (30 days)
 */
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Maximum number of entries to keep
 */
const MAX_ENTRIES = 500;

/**
 * A single conflict log entry
 */
export interface ConflictLogEntry {
  /** Unique identifier for this log entry */
  id: string;
  /** Timestamp when conflict was detected (ms since epoch) */
  timestamp: number;
  /** Table name (work_orders, assets, meter_readings) */
  tableName: string;
  /** Local WatermelonDB record ID */
  recordId: string;
  /** Server UUID (null if record never synced) */
  serverId: string | null;
  /** Details of each field resolution */
  resolutions: ConflictResolution[];
  /** Escalation triggers that require supervisor review */
  escalations: string[];
  /** Whether conflict was auto-resolved (false if escalated) */
  autoResolved: boolean;
  /** User ID who triggered the sync */
  syncUserId?: string | undefined;
  /** Any error message if resolution failed */
  error?: string | undefined;
}

/**
 * Generate unique ID for log entry
 */
function generateLogId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `conflict_${timestamp}_${random}`;
}

/**
 * Load conflict log from storage
 */
async function loadLog(): Promise<ConflictLogEntry[]> {
  try {
    const stored = await AsyncStorage.getItem(CONFLICT_LOG_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as ConflictLogEntry[];
  } catch (error) {
    console.error('[conflict-log] Failed to load log:', error);
    return [];
  }
}

/**
 * Save conflict log to storage
 */
async function saveLog(entries: ConflictLogEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CONFLICT_LOG_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('[conflict-log] Failed to save log:', error);
  }
}

/**
 * Log a conflict event
 *
 * @param entry - Conflict details (id and timestamp will be auto-generated if not provided)
 */
export async function logConflict(
  entry: Omit<ConflictLogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: number }
): Promise<string> {
  const logEntry: ConflictLogEntry = {
    id: entry.id || generateLogId(),
    timestamp: entry.timestamp || Date.now(),
    tableName: entry.tableName,
    recordId: entry.recordId,
    serverId: entry.serverId,
    resolutions: entry.resolutions,
    escalations: entry.escalations,
    autoResolved: entry.autoResolved,
    syncUserId: entry.syncUserId,
    error: entry.error,
  };

  const log = await loadLog();

  // Add new entry at the beginning
  log.unshift(logEntry);

  // Trim to max entries
  const trimmed = log.slice(0, MAX_ENTRIES);

  await saveLog(trimmed);

  // Log to console for debugging
  console.log(`[conflict-log] ${logEntry.autoResolved ? 'Auto-resolved' : 'Escalated'} conflict:`, {
    table: logEntry.tableName,
    record: logEntry.recordId,
    resolutions: logEntry.resolutions.length,
    escalations: logEntry.escalations,
  });

  return logEntry.id;
}

/**
 * Get recent conflict entries
 *
 * @param limit - Maximum number of entries to return (default: 50)
 */
export async function getRecentConflicts(limit: number = 50): Promise<ConflictLogEntry[]> {
  const log = await loadLog();
  return log.slice(0, limit);
}

/**
 * Get conflicts for a specific record
 *
 * @param tableName - Table name to filter by
 * @param recordId - Record ID to filter by
 */
export async function getConflictsForRecord(
  tableName: string,
  recordId: string
): Promise<ConflictLogEntry[]> {
  const log = await loadLog();
  return log.filter(entry => entry.tableName === tableName && entry.recordId === recordId);
}

/**
 * Get unresolved (escalated) conflicts
 */
export async function getEscalatedConflicts(): Promise<ConflictLogEntry[]> {
  const log = await loadLog();
  return log.filter(entry => !entry.autoResolved);
}

/**
 * Get conflicts within a time range
 *
 * @param startTime - Start timestamp (ms since epoch)
 * @param endTime - End timestamp (ms since epoch)
 */
export async function getConflictsByTimeRange(
  startTime: number,
  endTime: number
): Promise<ConflictLogEntry[]> {
  const log = await loadLog();
  return log.filter(entry => entry.timestamp >= startTime && entry.timestamp <= endTime);
}

/**
 * Get conflict statistics
 */
export async function getConflictStats(): Promise<{
  total: number;
  autoResolved: number;
  escalated: number;
  byTable: Record<string, number>;
  last24Hours: number;
  last7Days: number;
}> {
  const log = await loadLog();
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const byTable: Record<string, number> = {};
  let autoResolved = 0;
  let escalated = 0;
  let last24Hours = 0;
  let last7Days = 0;

  for (const entry of log) {
    // Count by table
    byTable[entry.tableName] = (byTable[entry.tableName] || 0) + 1;

    // Count by resolution type
    if (entry.autoResolved) {
      autoResolved++;
    } else {
      escalated++;
    }

    // Count by time
    if (entry.timestamp >= oneDayAgo) {
      last24Hours++;
    }
    if (entry.timestamp >= oneWeekAgo) {
      last7Days++;
    }
  }

  return {
    total: log.length,
    autoResolved,
    escalated,
    byTable,
    last24Hours,
    last7Days,
  };
}

/**
 * Prune old conflict log entries (older than 30 days)
 *
 * @returns Number of entries removed
 */
export async function pruneConflictLogs(): Promise<number> {
  const log = await loadLog();
  const cutoff = Date.now() - RETENTION_MS;

  const before = log.length;
  const pruned = log.filter(entry => entry.timestamp >= cutoff);
  const removed = before - pruned.length;

  if (removed > 0) {
    await saveLog(pruned);
    console.log(`[conflict-log] Pruned ${removed} old entries`);
  }

  return removed;
}

/**
 * Clear all conflict logs (use with caution)
 */
export async function clearConflictLogs(): Promise<void> {
  await AsyncStorage.removeItem(CONFLICT_LOG_KEY);
  console.log('[conflict-log] Cleared all conflict logs');
}

/**
 * Mark an escalated conflict as reviewed
 *
 * @param conflictId - The conflict log entry ID
 * @param reviewedBy - User ID of reviewer
 * @param notes - Optional review notes
 */
export async function markConflictReviewed(
  conflictId: string,
  reviewedBy: string,
  notes?: string
): Promise<boolean> {
  const log = await loadLog();
  const index = log.findIndex(entry => entry.id === conflictId);

  if (index === -1) {
    console.warn(`[conflict-log] Conflict ${conflictId} not found`);
    return false;
  }

  // Add review metadata (extending the entry)
  const entry = log[index] as ConflictLogEntry & {
    reviewedAt?: number;
    reviewedBy?: string;
    reviewNotes?: string;
  };

  entry.reviewedAt = Date.now();
  entry.reviewedBy = reviewedBy;
  if (notes) {
    entry.reviewNotes = notes;
  }

  await saveLog(log);
  console.log(`[conflict-log] Conflict ${conflictId} marked as reviewed`);
  return true;
}
