/**
 * Tests for retry-queue.ts
 *
 * Tests the unified retry queue for sync operations including:
 * - Priority calculation
 * - Enqueue/dequeue operations
 * - State transitions (pending, in_progress, completed, failed, abandoned)
 * - Stale item recovery
 * - Queue statistics
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  calculateWorkOrderPriority,
  getDefaultPriority,
  enqueue,
  getRetryableItems,
  getPendingItems,
  getInProgressItems,
  markInProgress,
  markCompleted,
  markFailed,
  markAbandoned,
  recoverStaleItems,
  findQueueItem,
  removeFromQueue,
  pruneQueue,
  getQueueStats,
  clearQueue,
  getRetryCount,
  getBlockingIssues,
  RetryQueueItem,
} from '@/services/sync/retry-queue';
import { ClassifiedError } from '@/services/sync/error-classifier';

// Fixed timestamp from setup.ts
const FIXED_TIMESTAMP = 1704067200000;

const RETRY_QUEUE_KEY = 'cmms_sync_retry_queue';

// Helper to set queue state for testing
async function setQueueState(items: RetryQueueItem[]): Promise<void> {
  await AsyncStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(items));
}

// Helper to get current queue state
async function getQueueState(): Promise<RetryQueueItem[]> {
  const json = await AsyncStorage.getItem(RETRY_QUEUE_KEY);
  return json ? JSON.parse(json) : [];
}

// Create mock queue item
function createMockQueueItem(overrides: Partial<RetryQueueItem> = {}): RetryQueueItem {
  return {
    id: `rq_${FIXED_TIMESTAMP}_test123`,
    recordId: 'record-1',
    tableName: 'work_orders',
    operation: 'push',
    state: 'pending',
    priority: 4,
    attempts: 0,
    maxAttempts: 10,
    lastAttemptAt: null,
    nextRetryAt: null,
    createdAt: FIXED_TIMESTAMP - 60000, // 1 minute ago
    ...overrides,
  };
}

describe('retry-queue', () => {
  beforeEach(async () => {
    // Clear queue before each test
    await AsyncStorage.clear();
  });

  describe('calculateWorkOrderPriority', () => {
    it('returns 1 for emergency priority work orders', () => {
      expect(calculateWorkOrderPriority({ priority: 'emergency' })).toBe(1);
      expect(calculateWorkOrderPriority({ priority: 'emergency', status: 'open' })).toBe(1);
    });

    it('returns 2 for completed work orders', () => {
      expect(calculateWorkOrderPriority({ status: 'completed' })).toBe(2);
      expect(calculateWorkOrderPriority({ priority: 'high', status: 'completed' })).toBe(2);
    });

    it('returns 3 for in_progress or high priority work orders', () => {
      expect(calculateWorkOrderPriority({ status: 'in_progress' })).toBe(3);
      expect(calculateWorkOrderPriority({ priority: 'high' })).toBe(3);
      expect(calculateWorkOrderPriority({ priority: 'high', status: 'open' })).toBe(3);
    });

    it('returns 4 for default priority', () => {
      expect(calculateWorkOrderPriority({})).toBe(4);
      expect(calculateWorkOrderPriority({ priority: 'low' })).toBe(4);
      expect(calculateWorkOrderPriority({ status: 'open' })).toBe(4);
      expect(calculateWorkOrderPriority({ priority: 'medium', status: 'open' })).toBe(4);
    });

    it('emergency takes precedence over completed', () => {
      // This is the actual behavior - emergency is checked first
      expect(calculateWorkOrderPriority({ priority: 'emergency', status: 'completed' })).toBe(1);
    });
  });

  describe('getDefaultPriority', () => {
    it('returns 4 for work_orders', () => {
      expect(getDefaultPriority('work_orders')).toBe(4);
    });

    it('returns 4 for assets', () => {
      expect(getDefaultPriority('assets')).toBe(4);
    });

    it('returns 5 for meter_readings', () => {
      expect(getDefaultPriority('meter_readings')).toBe(5);
    });

    it('returns 5 for work_order_photos', () => {
      expect(getDefaultPriority('work_order_photos')).toBe(5);
    });
  });

  describe('enqueue', () => {
    it('creates a new queue item with correct defaults', async () => {
      const itemId = await enqueue({
        recordId: 'wo-123',
        tableName: 'work_orders',
        operation: 'push',
      });

      expect(itemId).toMatch(/^rq_\d+_[a-z0-9]+$/);

      const queue = await getQueueState();
      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        recordId: 'wo-123',
        tableName: 'work_orders',
        operation: 'push',
        state: 'pending',
        priority: 4, // default for work_orders
        attempts: 0,
        maxAttempts: 10,
        lastAttemptAt: null,
        nextRetryAt: null,
      });
    });

    it('uses custom priority and maxAttempts', async () => {
      await enqueue({
        recordId: 'wo-456',
        tableName: 'work_orders',
        operation: 'push',
        priority: 1,
        maxAttempts: 5,
      });

      const queue = await getQueueState();
      expect(queue[0]?.priority).toBe(1);
      expect(queue[0]?.maxAttempts).toBe(5);
    });

    it('returns existing item ID if already queued', async () => {
      const existingItem = createMockQueueItem({
        id: 'existing-id',
        recordId: 'wo-789',
        state: 'pending',
      });
      await setQueueState([existingItem]);

      const itemId = await enqueue({
        recordId: 'wo-789',
        tableName: 'work_orders',
        operation: 'push',
      });

      expect(itemId).toBe('existing-id');

      const queue = await getQueueState();
      expect(queue).toHaveLength(1); // No duplicate
    });

    it('allows re-queue if existing item is completed', async () => {
      const completedItem = createMockQueueItem({
        id: 'completed-id',
        recordId: 'wo-101',
        state: 'completed',
      });
      await setQueueState([completedItem]);

      const itemId = await enqueue({
        recordId: 'wo-101',
        tableName: 'work_orders',
        operation: 'push',
      });

      expect(itemId).not.toBe('completed-id');

      const queue = await getQueueState();
      expect(queue).toHaveLength(2); // New item added
    });

    it('allows re-queue if existing item is abandoned', async () => {
      const abandonedItem = createMockQueueItem({
        id: 'abandoned-id',
        recordId: 'wo-102',
        state: 'abandoned',
      });
      await setQueueState([abandonedItem]);

      const itemId = await enqueue({
        recordId: 'wo-102',
        tableName: 'work_orders',
        operation: 'push',
      });

      expect(itemId).not.toBe('abandoned-id');
    });

    it('does not duplicate if same record is queued for different operation', async () => {
      const pushItem = createMockQueueItem({
        id: 'push-id',
        recordId: 'wo-103',
        operation: 'push',
      });
      await setQueueState([pushItem]);

      await enqueue({
        recordId: 'wo-103',
        tableName: 'work_orders',
        operation: 'pull', // Different operation
      });

      const queue = await getQueueState();
      expect(queue).toHaveLength(2);
    });
  });

  describe('getRetryableItems', () => {
    it('returns empty array for empty queue', async () => {
      const items = await getRetryableItems();
      expect(items).toEqual([]);
    });

    it('returns pending items that are ready for retry', async () => {
      const item = createMockQueueItem({
        state: 'pending',
        attempts: 0,
        lastAttemptAt: null,
      });
      await setQueueState([item]);

      const items = await getRetryableItems();
      expect(items).toHaveLength(1);
    });

    it('returns failed items that are ready for retry', async () => {
      const item = createMockQueueItem({
        state: 'failed',
        attempts: 1,
        lastAttemptAt: FIXED_TIMESTAMP - 60000, // 1 minute ago, backoff passed
      });
      await setQueueState([item]);

      const items = await getRetryableItems();
      expect(items).toHaveLength(1);
    });

    it('excludes items still in backoff period', async () => {
      const item = createMockQueueItem({
        state: 'failed',
        attempts: 1,
        lastAttemptAt: FIXED_TIMESTAMP - 500, // 0.5 seconds ago, still in backoff
      });
      await setQueueState([item]);

      const items = await getRetryableItems();
      expect(items).toHaveLength(0);
    });

    it('excludes in_progress items', async () => {
      const item = createMockQueueItem({ state: 'in_progress' });
      await setQueueState([item]);

      const items = await getRetryableItems();
      expect(items).toHaveLength(0);
    });

    it('excludes completed items', async () => {
      const item = createMockQueueItem({ state: 'completed' });
      await setQueueState([item]);

      const items = await getRetryableItems();
      expect(items).toHaveLength(0);
    });

    it('excludes abandoned items', async () => {
      const item = createMockQueueItem({ state: 'abandoned' });
      await setQueueState([item]);

      const items = await getRetryableItems();
      expect(items).toHaveLength(0);
    });

    it('respects nextRetryAt timestamp', async () => {
      const item = createMockQueueItem({
        state: 'failed',
        nextRetryAt: FIXED_TIMESTAMP + 60000, // 1 minute in future
      });
      await setQueueState([item]);

      const items = await getRetryableItems();
      expect(items).toHaveLength(0);
    });

    it('sorts by priority (ascending)', async () => {
      const items = [
        createMockQueueItem({ id: 'low', priority: 5 }),
        createMockQueueItem({ id: 'high', priority: 1 }),
        createMockQueueItem({ id: 'medium', priority: 3 }),
      ];
      await setQueueState(items);

      const result = await getRetryableItems();
      expect(result.map(i => i.id)).toEqual(['high', 'medium', 'low']);
    });

    it('sorts by createdAt (oldest first) for same priority', async () => {
      const items = [
        createMockQueueItem({ id: 'newest', priority: 3, createdAt: FIXED_TIMESTAMP }),
        createMockQueueItem({ id: 'oldest', priority: 3, createdAt: FIXED_TIMESTAMP - 120000 }),
        createMockQueueItem({ id: 'middle', priority: 3, createdAt: FIXED_TIMESTAMP - 60000 }),
      ];
      await setQueueState(items);

      const result = await getRetryableItems();
      expect(result.map(i => i.id)).toEqual(['oldest', 'middle', 'newest']);
    });
  });

  describe('getPendingItems', () => {
    it('returns pending and failed items', async () => {
      const items = [
        createMockQueueItem({ id: 'pending', state: 'pending' }),
        createMockQueueItem({ id: 'failed', state: 'failed' }),
        createMockQueueItem({ id: 'in_progress', state: 'in_progress' }),
        createMockQueueItem({ id: 'completed', state: 'completed' }),
      ];
      await setQueueState(items);

      const result = await getPendingItems();
      expect(result.map(i => i.id)).toEqual(['pending', 'failed']);
    });
  });

  describe('getInProgressItems', () => {
    it('returns only in_progress items', async () => {
      const items = [
        createMockQueueItem({ id: 'pending', state: 'pending' }),
        createMockQueueItem({ id: 'in_progress', state: 'in_progress' }),
      ];
      await setQueueState(items);

      const result = await getInProgressItems();
      expect(result.map(i => i.id)).toEqual(['in_progress']);
    });
  });

  describe('markInProgress', () => {
    it('updates item state and increments attempts', async () => {
      const item = createMockQueueItem({ id: 'test-1', attempts: 0 });
      await setQueueState([item]);

      await markInProgress('test-1');

      const queue = await getQueueState();
      expect(queue[0]).toMatchObject({
        state: 'in_progress',
        attempts: 1,
        lastAttemptAt: FIXED_TIMESTAMP,
      });
    });

    it('does nothing if item not found', async () => {
      await setQueueState([]);

      // Should not throw
      await markInProgress('non-existent');
    });
  });

  describe('markCompleted', () => {
    it('removes item from queue', async () => {
      const items = [
        createMockQueueItem({ id: 'to-complete' }),
        createMockQueueItem({ id: 'other' }),
      ];
      await setQueueState(items);

      await markCompleted('to-complete');

      const queue = await getQueueState();
      expect(queue).toHaveLength(1);
      expect(queue[0]?.id).toBe('other');
    });

    it('does nothing if item not found', async () => {
      const item = createMockQueueItem({ id: 'existing' });
      await setQueueState([item]);

      await markCompleted('non-existent');

      const queue = await getQueueState();
      expect(queue).toHaveLength(1);
    });
  });

  describe('markFailed', () => {
    const transientError: ClassifiedError = {
      category: 'transient',
      originalError: new Error('network error'),
      shouldRetry: true,
      maxRetries: 10,
      requiresUserAction: false,
      userMessage: 'Network error',
      technicalMessage: 'network error',
    };

    const authError: ClassifiedError = {
      category: 'auth',
      originalError: new Error('unauthorized'),
      httpStatus: 401,
      shouldRetry: false,
      maxRetries: 0,
      requiresUserAction: true,
      userMessage: 'Please sign in',
      technicalMessage: 'unauthorized',
    };

    it('sets failed state with error info and schedules retry', async () => {
      const item = createMockQueueItem({ id: 'test-fail', attempts: 1 });
      await setQueueState([item]);

      await markFailed('test-fail', transientError);

      const queue = await getQueueState();
      expect(queue[0]).toMatchObject({
        state: 'failed',
        lastError: 'Network error',
        errorCategory: 'transient',
      });
      expect(queue[0]?.nextRetryAt).toBeGreaterThan(FIXED_TIMESTAMP);
    });

    it('abandons item when max attempts reached', async () => {
      const item = createMockQueueItem({ id: 'test-max', attempts: 10, maxAttempts: 10 });
      await setQueueState([item]);

      await markFailed('test-max', transientError);

      const queue = await getQueueState();
      expect(queue[0]?.state).toBe('abandoned');
    });

    it('abandons item when error is not retryable', async () => {
      const item = createMockQueueItem({ id: 'test-auth', attempts: 1 });
      await setQueueState([item]);

      await markFailed('test-auth', authError);

      const queue = await getQueueState();
      expect(queue[0]).toMatchObject({
        state: 'abandoned',
        errorCategory: 'auth',
      });
    });
  });

  describe('markAbandoned', () => {
    it('sets abandoned state with reason', async () => {
      const item = createMockQueueItem({ id: 'test-abandon' });
      await setQueueState([item]);

      await markAbandoned('test-abandon', 'User cancelled');

      const queue = await getQueueState();
      expect(queue[0]).toMatchObject({
        state: 'abandoned',
        lastError: 'User cancelled',
      });
    });
  });

  describe('recoverStaleItems', () => {
    it('recovers items stuck in in_progress for too long', async () => {
      const staleItem = createMockQueueItem({
        id: 'stale',
        state: 'in_progress',
        lastAttemptAt: FIXED_TIMESTAMP - 35 * 60 * 1000, // 35 minutes ago
        attempts: 2,
      });
      await setQueueState([staleItem]);

      const recovered = await recoverStaleItems();

      expect(recovered).toBe(1);

      const queue = await getQueueState();
      expect(queue[0]).toMatchObject({
        state: 'failed',
      });
      expect(queue[0]?.nextRetryAt).toBeGreaterThan(FIXED_TIMESTAMP);
    });

    it('does not recover items within threshold', async () => {
      const recentItem = createMockQueueItem({
        state: 'in_progress',
        lastAttemptAt: FIXED_TIMESTAMP - 5 * 60 * 1000, // 5 minutes ago
      });
      await setQueueState([recentItem]);

      const recovered = await recoverStaleItems();

      expect(recovered).toBe(0);
    });

    it('uses custom threshold', async () => {
      const item = createMockQueueItem({
        state: 'in_progress',
        lastAttemptAt: FIXED_TIMESTAMP - 2 * 60 * 1000, // 2 minutes ago
      });
      await setQueueState([item]);

      const recovered = await recoverStaleItems(60 * 1000); // 1 minute threshold

      expect(recovered).toBe(1);
    });

    it('does not recover pending/failed items', async () => {
      const items = [
        createMockQueueItem({ id: 'pending', state: 'pending' }),
        createMockQueueItem({
          id: 'failed',
          state: 'failed',
          lastAttemptAt: FIXED_TIMESTAMP - 60 * 60 * 1000,
        }),
      ];
      await setQueueState(items);

      const recovered = await recoverStaleItems();

      expect(recovered).toBe(0);
    });
  });

  describe('findQueueItem', () => {
    it('finds matching item', async () => {
      const item = createMockQueueItem({
        recordId: 'wo-find',
        tableName: 'work_orders',
        operation: 'push',
        state: 'pending',
      });
      await setQueueState([item]);

      const found = await findQueueItem('wo-find', 'work_orders', 'push');

      expect(found).toMatchObject({ recordId: 'wo-find' });
    });

    it('returns null for no match', async () => {
      await setQueueState([]);

      const found = await findQueueItem('wo-missing', 'work_orders', 'push');

      expect(found).toBeNull();
    });

    it('excludes completed items', async () => {
      const item = createMockQueueItem({
        recordId: 'wo-done',
        state: 'completed',
      });
      await setQueueState([item]);

      const found = await findQueueItem('wo-done', 'work_orders', 'push');

      expect(found).toBeNull();
    });

    it('excludes abandoned items', async () => {
      const item = createMockQueueItem({
        recordId: 'wo-abandoned',
        state: 'abandoned',
      });
      await setQueueState([item]);

      const found = await findQueueItem('wo-abandoned', 'work_orders', 'push');

      expect(found).toBeNull();
    });
  });

  describe('removeFromQueue', () => {
    it('removes specified item', async () => {
      const items = [
        createMockQueueItem({ id: 'to-remove' }),
        createMockQueueItem({ id: 'to-keep' }),
      ];
      await setQueueState(items);

      await removeFromQueue('to-remove');

      const queue = await getQueueState();
      expect(queue).toHaveLength(1);
      expect(queue[0]?.id).toBe('to-keep');
    });

    it('does nothing if item not found', async () => {
      const item = createMockQueueItem({ id: 'existing' });
      await setQueueState([item]);

      await removeFromQueue('non-existent');

      const queue = await getQueueState();
      expect(queue).toHaveLength(1);
    });
  });

  describe('pruneQueue', () => {
    it('removes old completed items', async () => {
      const items = [
        createMockQueueItem({
          id: 'old-completed',
          state: 'completed',
          createdAt: FIXED_TIMESTAMP - 48 * 60 * 60 * 1000, // 48 hours ago
        }),
        createMockQueueItem({
          id: 'recent-pending',
          state: 'pending',
          createdAt: FIXED_TIMESTAMP - 1 * 60 * 60 * 1000, // 1 hour ago
        }),
      ];
      await setQueueState(items);

      const removed = await pruneQueue();

      expect(removed).toBe(1);

      const queue = await getQueueState();
      expect(queue.map(i => i.id)).toEqual(['recent-pending']);
    });

    it('removes old abandoned items', async () => {
      const items = [
        createMockQueueItem({
          id: 'old-abandoned',
          state: 'abandoned',
          createdAt: FIXED_TIMESTAMP - 48 * 60 * 60 * 1000,
        }),
      ];
      await setQueueState(items);

      const removed = await pruneQueue();

      expect(removed).toBe(1);
    });

    it('keeps pending items regardless of age', async () => {
      const item = createMockQueueItem({
        state: 'pending',
        createdAt: FIXED_TIMESTAMP - 100 * 60 * 60 * 1000, // Very old
      });
      await setQueueState([item]);

      const removed = await pruneQueue();

      expect(removed).toBe(0);
    });

    it('keeps failed items regardless of age', async () => {
      const item = createMockQueueItem({
        state: 'failed',
        createdAt: FIXED_TIMESTAMP - 100 * 60 * 60 * 1000,
      });
      await setQueueState([item]);

      const removed = await pruneQueue();

      expect(removed).toBe(0);
    });

    it('uses custom age threshold', async () => {
      const item = createMockQueueItem({
        state: 'completed',
        createdAt: FIXED_TIMESTAMP - 2 * 60 * 60 * 1000, // 2 hours ago
      });
      await setQueueState([item]);

      const removed = await pruneQueue(1 * 60 * 60 * 1000); // 1 hour threshold

      expect(removed).toBe(1);
    });
  });

  describe('getQueueStats', () => {
    it('returns correct statistics', async () => {
      const items = [
        createMockQueueItem({
          id: '1',
          state: 'pending',
          tableName: 'work_orders',
          priority: 1,
          createdAt: FIXED_TIMESTAMP - 60000,
        }),
        createMockQueueItem({
          id: '2',
          state: 'pending',
          tableName: 'work_orders',
          priority: 3,
          createdAt: FIXED_TIMESTAMP - 120000,
        }),
        createMockQueueItem({
          id: '3',
          state: 'in_progress',
          tableName: 'assets',
          priority: 4,
        }),
        createMockQueueItem({
          id: '4',
          state: 'failed',
          tableName: 'meter_readings',
          priority: 5,
        }),
        createMockQueueItem({
          id: '5',
          state: 'abandoned',
          tableName: 'work_order_photos',
          priority: 5,
        }),
      ];
      await setQueueState(items);

      const stats = await getQueueStats();

      expect(stats.total).toBe(5);
      expect(stats.pending).toBe(2);
      expect(stats.inProgress).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.abandoned).toBe(1);

      expect(stats.byTable.work_orders).toBe(2);
      expect(stats.byTable.assets).toBe(1);
      expect(stats.byTable.meter_readings).toBe(1);
      expect(stats.byTable.work_order_photos).toBe(1);

      expect(stats.byPriority[1]).toBe(1);
      expect(stats.byPriority[3]).toBe(1);
      expect(stats.byPriority[4]).toBe(1);
      expect(stats.byPriority[5]).toBe(2);
    });

    it('calculates oldestItemAge for active items', async () => {
      const items = [
        createMockQueueItem({
          state: 'pending',
          createdAt: FIXED_TIMESTAMP - 120000, // oldest active
        }),
        createMockQueueItem({
          state: 'failed',
          createdAt: FIXED_TIMESTAMP - 60000,
        }),
        createMockQueueItem({
          state: 'abandoned',
          createdAt: FIXED_TIMESTAMP - 180000, // older but abandoned
        }),
      ];
      await setQueueState(items);

      const stats = await getQueueStats();

      expect(stats.oldestItemAge).toBe(120000);
    });

    it('returns null oldestItemAge for empty queue', async () => {
      const stats = await getQueueStats();

      expect(stats.oldestItemAge).toBeNull();
    });
  });

  describe('clearQueue', () => {
    it('removes all items from queue', async () => {
      await setQueueState([createMockQueueItem({ id: '1' }), createMockQueueItem({ id: '2' })]);

      await clearQueue();

      const queue = await getQueueState();
      expect(queue).toEqual([]);
    });
  });

  describe('getRetryCount', () => {
    it('returns count of retryable items', async () => {
      const items = [
        createMockQueueItem({ state: 'pending' }),
        createMockQueueItem({ state: 'pending' }),
        createMockQueueItem({ state: 'in_progress' }),
      ];
      await setQueueState(items);

      const count = await getRetryCount();

      expect(count).toBe(2);
    });
  });

  describe('getBlockingIssues', () => {
    it('returns items with auth errors', async () => {
      const items = [
        createMockQueueItem({
          id: 'auth-issue',
          state: 'failed',
          errorCategory: 'auth',
        }),
        createMockQueueItem({
          id: 'transient',
          state: 'failed',
          errorCategory: 'transient',
        }),
      ];
      await setQueueState(items);

      const blocking = await getBlockingIssues();

      expect(blocking.map(i => i.id)).toEqual(['auth-issue']);
    });

    it('returns items with validation errors', async () => {
      const item = createMockQueueItem({
        state: 'abandoned',
        errorCategory: 'validation',
      });
      await setQueueState([item]);

      const blocking = await getBlockingIssues();

      expect(blocking).toHaveLength(1);
    });

    it('returns items with permanent errors', async () => {
      const item = createMockQueueItem({
        state: 'failed',
        errorCategory: 'permanent',
      });
      await setQueueState([item]);

      const blocking = await getBlockingIssues();

      expect(blocking).toHaveLength(1);
    });

    it('excludes transient and unknown errors', async () => {
      const items = [
        createMockQueueItem({ state: 'failed', errorCategory: 'transient' }),
        createMockQueueItem({ state: 'failed', errorCategory: 'unknown' }),
      ];
      await setQueueState(items);

      const blocking = await getBlockingIssues();

      expect(blocking).toHaveLength(0);
    });

    it('excludes pending items without errors', async () => {
      const item = createMockQueueItem({ state: 'pending' });
      await setQueueState([item]);

      const blocking = await getBlockingIssues();

      expect(blocking).toHaveLength(0);
    });
  });
});
