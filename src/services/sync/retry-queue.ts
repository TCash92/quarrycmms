/**
 * Unified retry queue for sync operations
 *
 * Manages a persistent queue of failed sync operations with
 * priority ordering and backoff-aware retry scheduling.
 *
 * @module services/sync/retry-queue
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isReadyForRetry, getNextRetryTime } from './backoff';
import { ClassifiedError, ErrorCategory } from './error-classifier';

/** Storage key for the retry queue */
const RETRY_QUEUE_KEY = 'cmms_sync_retry_queue';

/** Default stale threshold: 30 minutes */
const DEFAULT_STALE_THRESHOLD_MS = 30 * 60 * 1000;

/** Maximum queue size */
const MAX_QUEUE_SIZE = 1000;

/**
 * Sync operation type
 */
export type SyncOperation = 'push' | 'pull';

/**
 * Record types that can be synced
 */
export type SyncRecordType =
  | 'work_orders'
  | 'assets'
  | 'meter_readings'
  | 'work_order_photos';

/**
 * Queue item state
 */
export type QueueItemState =
  | 'pending' // Waiting for retry
  | 'in_progress' // Currently being processed
  | 'completed' // Successfully synced
  | 'failed' // Failed, awaiting retry
  | 'abandoned'; // Exceeded max retries

/**
 * Sync priority levels (lower = higher priority)
 * 1: Emergency work orders
 * 2: Completed work orders (compliance)
 * 3: In-progress / High priority WOs
 * 4: Assets with status changes
 * 5: Meter readings, photos
 */
export type SyncPriority = 1 | 2 | 3 | 4 | 5;

/**
 * A single item in the retry queue
 */
export interface RetryQueueItem {
  /** Unique queue item ID */
  id: string;
  /** ID of the record being synced */
  recordId: string;
  /** Table name / record type */
  tableName: SyncRecordType;
  /** Push or pull operation */
  operation: SyncOperation;
  /** Current state */
  state: QueueItemState;
  /** Sync priority (1 = highest) */
  priority: SyncPriority;
  /** Number of sync attempts */
  attempts: number;
  /** Maximum allowed attempts */
  maxAttempts: number;
  /** Timestamp of last attempt (ms since epoch) */
  lastAttemptAt: number | null;
  /** Timestamp when next retry is allowed (ms since epoch) */
  nextRetryAt: number | null;
  /** Timestamp when item was enqueued (ms since epoch) */
  createdAt: number;
  /** Last error message */
  lastError?: string;
  /** Error category from classifier */
  errorCategory?: ErrorCategory;
}

/**
 * Parameters for enqueueing a new item
 */
export interface EnqueueParams {
  recordId: string;
  tableName: SyncRecordType;
  operation: SyncOperation;
  priority?: SyncPriority;
  maxAttempts?: number;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  total: number;
  pending: number;
  inProgress: number;
  failed: number;
  abandoned: number;
  oldestItemAge: number | null;
  byTable: Record<SyncRecordType, number>;
  byPriority: Record<SyncPriority, number>;
}

/**
 * Generate a unique ID for a queue item
 */
function generateQueueId(): string {
  return `rq_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Load the retry queue from storage
 */
async function loadQueue(): Promise<RetryQueueItem[]> {
  try {
    const json = await AsyncStorage.getItem(RETRY_QUEUE_KEY);
    if (!json) return [];
    return JSON.parse(json) as RetryQueueItem[];
  } catch (error) {
    console.error('[RetryQueue] Failed to load queue:', error);
    return [];
  }
}

/**
 * Save the retry queue to storage
 */
async function saveQueue(queue: RetryQueueItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[RetryQueue] Failed to save queue:', error);
  }
}

/**
 * Calculate sync priority for a work order
 *
 * Priority levels:
 * 1: Emergency work orders
 * 2: Completed work orders (compliance)
 * 3: In-progress / High priority WOs
 * 4: Default
 *
 * @param wo - Work order with priority and status fields
 * @returns Priority level 1-5
 */
export function calculateWorkOrderPriority(wo: {
  priority?: string;
  status?: string;
}): SyncPriority {
  // Emergency WOs are highest priority
  if (wo.priority === 'emergency') return 1;

  // Completed WOs need to sync for compliance
  if (wo.status === 'completed') return 2;

  // In-progress or high priority
  if (wo.status === 'in_progress' || wo.priority === 'high') return 3;

  // Default priority
  return 4;
}

/**
 * Get default priority for a record type
 */
export function getDefaultPriority(tableName: SyncRecordType): SyncPriority {
  switch (tableName) {
    case 'work_orders':
      return 4;
    case 'assets':
      return 4;
    case 'meter_readings':
      return 5;
    case 'work_order_photos':
      return 5;
    default:
      return 5;
  }
}

/**
 * Enqueue a record for retry
 *
 * @param params - Enqueue parameters
 * @returns The queue item ID
 *
 * @example
 * ```typescript
 * const itemId = await enqueue({
 *   recordId: wo.id,
 *   tableName: 'work_orders',
 *   operation: 'push',
 *   priority: calculateWorkOrderPriority(wo),
 *   maxAttempts: 10,
 * });
 * ```
 */
export async function enqueue(params: EnqueueParams): Promise<string> {
  const queue = await loadQueue();

  // Check if already queued
  const existing = queue.find(
    (item) =>
      item.recordId === params.recordId &&
      item.tableName === params.tableName &&
      item.operation === params.operation &&
      (item.state === 'pending' || item.state === 'failed' || item.state === 'in_progress')
  );

  if (existing) {
    console.log(
      `[RetryQueue] Record ${params.recordId} already queued (${existing.state})`
    );
    return existing.id;
  }

  const item: RetryQueueItem = {
    id: generateQueueId(),
    recordId: params.recordId,
    tableName: params.tableName,
    operation: params.operation,
    state: 'pending',
    priority: params.priority ?? getDefaultPriority(params.tableName),
    attempts: 0,
    maxAttempts: params.maxAttempts ?? 10,
    lastAttemptAt: null,
    nextRetryAt: null,
    createdAt: Date.now(),
  };

  // Add to queue, maintaining size limit
  queue.push(item);
  if (queue.length > MAX_QUEUE_SIZE) {
    // Remove oldest completed/abandoned items first
    const pruned = queue
      .filter((i) => i.state !== 'completed' && i.state !== 'abandoned')
      .slice(-MAX_QUEUE_SIZE);
    await saveQueue(pruned);
    console.log(`[RetryQueue] Pruned queue to ${pruned.length} items`);
  } else {
    await saveQueue(queue);
  }

  console.log(
    `[RetryQueue] Enqueued ${params.tableName}/${params.recordId} with priority ${item.priority}`
  );

  return item.id;
}

/**
 * Get items that are ready for retry
 *
 * Returns items sorted by priority (1 first) then by age (oldest first)
 *
 * @returns Array of retryable queue items
 */
export async function getRetryableItems(): Promise<RetryQueueItem[]> {
  const queue = await loadQueue();
  const now = Date.now();

  const retryable = queue.filter((item) => {
    // Only pending or failed items
    if (item.state !== 'pending' && item.state !== 'failed') {
      return false;
    }

    // Check backoff timing
    if (!isReadyForRetry(item.lastAttemptAt, item.attempts)) {
      return false;
    }

    // Check nextRetryAt if set
    if (item.nextRetryAt && now < item.nextRetryAt) {
      return false;
    }

    return true;
  });

  // Sort by priority (ascending), then by createdAt (ascending = oldest first)
  return retryable.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.createdAt - b.createdAt;
  });
}

/**
 * Get all pending items (not yet processed or waiting for retry)
 */
export async function getPendingItems(): Promise<RetryQueueItem[]> {
  const queue = await loadQueue();
  return queue.filter(
    (item) => item.state === 'pending' || item.state === 'failed'
  );
}

/**
 * Get items currently in progress
 */
export async function getInProgressItems(): Promise<RetryQueueItem[]> {
  const queue = await loadQueue();
  return queue.filter((item) => item.state === 'in_progress');
}

/**
 * Mark an item as in progress
 *
 * @param itemId - Queue item ID
 */
export async function markInProgress(itemId: string): Promise<void> {
  const queue = await loadQueue();
  const item = queue.find((i) => i.id === itemId);

  if (!item) {
    console.warn(`[RetryQueue] Item ${itemId} not found`);
    return;
  }

  item.state = 'in_progress';
  item.attempts++;
  item.lastAttemptAt = Date.now();

  await saveQueue(queue);
}

/**
 * Mark an item as completed (successfully synced)
 *
 * @param itemId - Queue item ID
 */
export async function markCompleted(itemId: string): Promise<void> {
  const queue = await loadQueue();
  const index = queue.findIndex((i) => i.id === itemId);

  if (index === -1) {
    console.warn(`[RetryQueue] Item ${itemId} not found`);
    return;
  }

  // Remove completed items to keep queue clean
  queue.splice(index, 1);
  await saveQueue(queue);

  console.log(`[RetryQueue] Completed and removed item ${itemId}`);
}

/**
 * Mark an item as failed
 *
 * Updates the item with error info and schedules next retry.
 *
 * @param itemId - Queue item ID
 * @param error - Classified error information
 */
export async function markFailed(
  itemId: string,
  error: ClassifiedError
): Promise<void> {
  const queue = await loadQueue();
  const item = queue.find((i) => i.id === itemId);

  if (!item) {
    console.warn(`[RetryQueue] Item ${itemId} not found`);
    return;
  }

  item.lastError = error.userMessage;
  item.errorCategory = error.category;

  if (item.attempts >= item.maxAttempts || !error.shouldRetry) {
    item.state = 'abandoned';
    console.log(
      `[RetryQueue] Abandoned item ${itemId} after ${item.attempts} attempts`
    );
  } else {
    item.state = 'failed';
    item.nextRetryAt = getNextRetryTime(item.attempts);
    console.log(
      `[RetryQueue] Failed item ${itemId}, retry at ${new Date(item.nextRetryAt).toISOString()}`
    );
  }

  await saveQueue(queue);
}

/**
 * Mark an item as abandoned (exceeded max retries or unrecoverable)
 *
 * @param itemId - Queue item ID
 * @param reason - Reason for abandonment
 */
export async function markAbandoned(
  itemId: string,
  reason: string
): Promise<void> {
  const queue = await loadQueue();
  const item = queue.find((i) => i.id === itemId);

  if (!item) {
    console.warn(`[RetryQueue] Item ${itemId} not found`);
    return;
  }

  item.state = 'abandoned';
  item.lastError = reason;

  await saveQueue(queue);
  console.log(`[RetryQueue] Abandoned item ${itemId}: ${reason}`);
}

/**
 * Recover stale in-progress items
 *
 * Items stuck in 'in_progress' state (e.g., app crashed) are reset to 'failed'.
 *
 * @param staleThresholdMs - Time after which an item is considered stale (default: 30min)
 * @returns Number of items recovered
 */
export async function recoverStaleItems(
  staleThresholdMs: number = DEFAULT_STALE_THRESHOLD_MS
): Promise<number> {
  const queue = await loadQueue();
  const now = Date.now();
  let recovered = 0;

  for (const item of queue) {
    if (item.state === 'in_progress' && item.lastAttemptAt) {
      const age = now - item.lastAttemptAt;
      if (age > staleThresholdMs) {
        item.state = 'failed';
        item.nextRetryAt = getNextRetryTime(item.attempts);
        recovered++;
        console.log(
          `[RetryQueue] Recovered stale item ${item.id} (age: ${Math.round(age / 1000)}s)`
        );
      }
    }
  }

  if (recovered > 0) {
    await saveQueue(queue);
  }

  return recovered;
}

/**
 * Find a queue item by record details
 */
export async function findQueueItem(
  recordId: string,
  tableName: SyncRecordType,
  operation: SyncOperation
): Promise<RetryQueueItem | null> {
  const queue = await loadQueue();
  return (
    queue.find(
      (item) =>
        item.recordId === recordId &&
        item.tableName === tableName &&
        item.operation === operation &&
        item.state !== 'completed' &&
        item.state !== 'abandoned'
    ) ?? null
  );
}

/**
 * Remove a specific item from the queue
 */
export async function removeFromQueue(itemId: string): Promise<void> {
  const queue = await loadQueue();
  const filtered = queue.filter((item) => item.id !== itemId);
  await saveQueue(filtered);
}

/**
 * Remove completed and abandoned items older than a threshold
 *
 * @param olderThanMs - Remove items older than this (default: 24 hours)
 * @returns Number of items removed
 */
export async function pruneQueue(
  olderThanMs: number = 24 * 60 * 60 * 1000
): Promise<number> {
  const queue = await loadQueue();
  const cutoff = Date.now() - olderThanMs;
  const before = queue.length;

  const filtered = queue.filter((item) => {
    // Keep pending and in-progress items
    if (item.state === 'pending' || item.state === 'in_progress') {
      return true;
    }
    // Keep failed items (they'll be retried)
    if (item.state === 'failed') {
      return true;
    }
    // Remove old completed/abandoned items
    return item.createdAt > cutoff;
  });

  await saveQueue(filtered);
  const removed = before - filtered.length;

  if (removed > 0) {
    console.log(`[RetryQueue] Pruned ${removed} old items`);
  }

  return removed;
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<QueueStats> {
  const queue = await loadQueue();
  const now = Date.now();

  const stats: QueueStats = {
    total: queue.length,
    pending: 0,
    inProgress: 0,
    failed: 0,
    abandoned: 0,
    oldestItemAge: null,
    byTable: {
      work_orders: 0,
      assets: 0,
      meter_readings: 0,
      work_order_photos: 0,
    },
    byPriority: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    },
  };

  let oldestCreatedAt: number | null = null;

  for (const item of queue) {
    // Count by state
    switch (item.state) {
      case 'pending':
        stats.pending++;
        break;
      case 'in_progress':
        stats.inProgress++;
        break;
      case 'failed':
        stats.failed++;
        break;
      case 'abandoned':
        stats.abandoned++;
        break;
    }

    // Count by table
    stats.byTable[item.tableName]++;

    // Count by priority
    stats.byPriority[item.priority]++;

    // Track oldest
    if (
      item.state !== 'completed' &&
      item.state !== 'abandoned' &&
      (oldestCreatedAt === null || item.createdAt < oldestCreatedAt)
    ) {
      oldestCreatedAt = item.createdAt;
    }
  }

  stats.oldestItemAge = oldestCreatedAt ? now - oldestCreatedAt : null;

  return stats;
}

/**
 * Clear the entire retry queue
 */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(RETRY_QUEUE_KEY);
  console.log('[RetryQueue] Queue cleared');
}

/**
 * Get the count of items needing retry
 */
export async function getRetryCount(): Promise<number> {
  const items = await getRetryableItems();
  return items.length;
}

/**
 * Get blocking issues (failed items that cannot auto-retry)
 *
 * Returns items with auth, validation, or permanent errors
 * that require user intervention to resolve.
 *
 * @returns Array of blocking queue items
 */
export async function getBlockingIssues(): Promise<RetryQueueItem[]> {
  const queue = await loadQueue();
  return queue.filter(
    (item) =>
      (item.state === 'failed' || item.state === 'abandoned') &&
      (item.errorCategory === 'auth' ||
        item.errorCategory === 'validation' ||
        item.errorCategory === 'permanent')
  );
}
