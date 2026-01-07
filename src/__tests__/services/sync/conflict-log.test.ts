/**
 * Tests for conflict-log.ts
 *
 * Tests conflict audit logging including:
 * - logConflict for recording conflict events
 * - getRecentConflicts, getConflictsForRecord, getEscalatedConflicts
 * - getConflictsByTimeRange for time-based queries
 * - getConflictStats for statistics
 * - pruneConflictLogs for 30-day retention
 * - clearConflictLogs and markConflictReviewed
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  logConflict,
  getRecentConflicts,
  getConflictsForRecord,
  getEscalatedConflicts,
  getConflictsByTimeRange,
  getConflictStats,
  pruneConflictLogs,
  clearConflictLogs,
  markConflictReviewed,
  type ConflictLogEntry,
} from '@/services/sync/conflict-log';

const CONFLICT_LOG_KEY = '@quarrycmms:conflict_log';

// Fixed timestamp from setup.ts: 2024-01-01T00:00:00.000Z
const FIXED_TIMESTAMP = 1704067200000;

// Helper to create a mock conflict entry
function createMockEntry(overrides: Partial<ConflictLogEntry> = {}): ConflictLogEntry {
  return {
    id: `conflict_${Date.now()}_abc123`,
    timestamp: FIXED_TIMESTAMP,
    tableName: 'work_orders',
    recordId: 'local-wo-1',
    serverId: 'server-wo-1',
    resolutions: [
      {
        field: 'status',
        rule: 'completion_wins',
        localValue: 'in_progress',
        serverValue: 'completed',
        finalValue: 'completed',
        source: 'server',
      },
    ],
    escalations: [],
    autoResolved: true,
    ...overrides,
  };
}

describe('conflict-log', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  describe('logConflict', () => {
    it('creates a new log entry with auto-generated id and timestamp', async () => {
      const entry = {
        tableName: 'work_orders',
        recordId: 'wo-1',
        serverId: 'server-wo-1',
        resolutions: [],
        escalations: [],
        autoResolved: true,
      };

      const logId = await logConflict(entry);

      expect(logId).toMatch(/^conflict_/);

      const stored = await AsyncStorage.getItem(CONFLICT_LOG_KEY);
      const log = JSON.parse(stored!);
      expect(log).toHaveLength(1);
      expect(log[0].id).toBe(logId);
      expect(log[0].timestamp).toBe(FIXED_TIMESTAMP);
    });

    it('uses provided id and timestamp when given', async () => {
      const entry = {
        id: 'custom-id',
        timestamp: 1000000000000,
        tableName: 'assets',
        recordId: 'asset-1',
        serverId: 'server-asset-1',
        resolutions: [],
        escalations: [],
        autoResolved: false,
      };

      const logId = await logConflict(entry);

      expect(logId).toBe('custom-id');

      const stored = await AsyncStorage.getItem(CONFLICT_LOG_KEY);
      const log = JSON.parse(stored!);
      expect(log[0].timestamp).toBe(1000000000000);
    });

    it('adds entries at the beginning of the log', async () => {
      await logConflict({ ...createMockEntry(), id: 'first' });
      await logConflict({ ...createMockEntry(), id: 'second' });
      await logConflict({ ...createMockEntry(), id: 'third' });

      const stored = await AsyncStorage.getItem(CONFLICT_LOG_KEY);
      const log = JSON.parse(stored!);

      expect(log[0].id).toBe('third');
      expect(log[1].id).toBe('second');
      expect(log[2].id).toBe('first');
    });

    it('trims log to MAX_ENTRIES (500)', async () => {
      // Pre-populate with 500 entries
      const existingLog = Array.from({ length: 500 }, (_, i) =>
        createMockEntry({ id: `old-${i}`, timestamp: FIXED_TIMESTAMP - i })
      );
      await AsyncStorage.setItem(CONFLICT_LOG_KEY, JSON.stringify(existingLog));

      // Add one more
      await logConflict(createMockEntry({ id: 'new-entry' }));

      const stored = await AsyncStorage.getItem(CONFLICT_LOG_KEY);
      const log = JSON.parse(stored!);

      expect(log).toHaveLength(500);
      expect(log[0].id).toBe('new-entry');
      expect(log[499].id).toBe('old-498'); // Old entry at position 499 was removed
    });

    it('stores escalated conflict with escalation triggers', async () => {
      const entry = {
        tableName: 'work_orders',
        recordId: 'wo-1',
        serverId: 'server-wo-1',
        resolutions: [],
        escalations: ['completion_conflict', 'backdated_completion'],
        autoResolved: false,
        syncUserId: 'user-123',
      };

      await logConflict(entry);

      const stored = await AsyncStorage.getItem(CONFLICT_LOG_KEY);
      const log = JSON.parse(stored!);
      expect(log[0].escalations).toEqual(['completion_conflict', 'backdated_completion']);
      expect(log[0].autoResolved).toBe(false);
      expect(log[0].syncUserId).toBe('user-123');
    });

    it('stores error message when resolution failed', async () => {
      const entry = {
        tableName: 'meter_readings',
        recordId: 'mr-1',
        serverId: null,
        resolutions: [],
        escalations: [],
        autoResolved: false,
        error: 'Failed to apply merged values',
      };

      await logConflict(entry);

      const stored = await AsyncStorage.getItem(CONFLICT_LOG_KEY);
      const log = JSON.parse(stored!);
      expect(log[0].error).toBe('Failed to apply merged values');
    });
  });

  describe('getRecentConflicts', () => {
    it('returns empty array when no conflicts exist', async () => {
      const conflicts = await getRecentConflicts();
      expect(conflicts).toEqual([]);
    });

    it('returns all conflicts when less than limit', async () => {
      await logConflict(createMockEntry({ id: 'c1' }));
      await logConflict(createMockEntry({ id: 'c2' }));
      await logConflict(createMockEntry({ id: 'c3' }));

      const conflicts = await getRecentConflicts();

      expect(conflicts).toHaveLength(3);
    });

    it('respects the limit parameter', async () => {
      for (let i = 0; i < 10; i++) {
        await logConflict(createMockEntry({ id: `c${i}` }));
      }

      const conflicts = await getRecentConflicts(5);

      expect(conflicts).toHaveLength(5);
    });

    it('returns most recent conflicts first', async () => {
      await logConflict(createMockEntry({ id: 'oldest', timestamp: FIXED_TIMESTAMP - 2000 }));
      await logConflict(createMockEntry({ id: 'middle', timestamp: FIXED_TIMESTAMP - 1000 }));
      await logConflict(createMockEntry({ id: 'newest', timestamp: FIXED_TIMESTAMP }));

      const conflicts = await getRecentConflicts();

      // Newest was added last, so it's first in the log
      expect(conflicts[0].id).toBe('newest');
    });

    it('uses default limit of 50', async () => {
      for (let i = 0; i < 60; i++) {
        await logConflict(createMockEntry({ id: `c${i}` }));
      }

      const conflicts = await getRecentConflicts();

      expect(conflicts).toHaveLength(50);
    });
  });

  describe('getConflictsForRecord', () => {
    beforeEach(async () => {
      await logConflict(createMockEntry({ tableName: 'work_orders', recordId: 'wo-1' }));
      await logConflict(createMockEntry({ tableName: 'work_orders', recordId: 'wo-2' }));
      await logConflict(createMockEntry({ tableName: 'assets', recordId: 'asset-1' }));
      await logConflict(createMockEntry({ tableName: 'work_orders', recordId: 'wo-1' }));
    });

    it('returns conflicts matching table and record', async () => {
      const conflicts = await getConflictsForRecord('work_orders', 'wo-1');

      expect(conflicts).toHaveLength(2);
      conflicts.forEach(c => {
        expect(c.tableName).toBe('work_orders');
        expect(c.recordId).toBe('wo-1');
      });
    });

    it('returns empty array when no matches', async () => {
      const conflicts = await getConflictsForRecord('work_orders', 'nonexistent');

      expect(conflicts).toEqual([]);
    });

    it('filters by both table and record', async () => {
      const conflicts = await getConflictsForRecord('assets', 'wo-1');

      expect(conflicts).toEqual([]);
    });
  });

  describe('getEscalatedConflicts', () => {
    it('returns only non-auto-resolved conflicts', async () => {
      await logConflict(createMockEntry({ id: 'auto', autoResolved: true }));
      await logConflict(createMockEntry({ id: 'escalated', autoResolved: false }));
      await logConflict(createMockEntry({ id: 'auto2', autoResolved: true }));

      const escalated = await getEscalatedConflicts();

      expect(escalated).toHaveLength(1);
      expect(escalated[0].id).toBe('escalated');
    });

    it('returns empty array when all conflicts are auto-resolved', async () => {
      await logConflict(createMockEntry({ autoResolved: true }));
      await logConflict(createMockEntry({ autoResolved: true }));

      const escalated = await getEscalatedConflicts();

      expect(escalated).toEqual([]);
    });
  });

  describe('getConflictsByTimeRange', () => {
    const baseTime = FIXED_TIMESTAMP;

    beforeEach(async () => {
      await logConflict(createMockEntry({ id: 'old', timestamp: baseTime - 10000 }));
      await logConflict(createMockEntry({ id: 'middle', timestamp: baseTime - 5000 }));
      await logConflict(createMockEntry({ id: 'recent', timestamp: baseTime - 1000 }));
    });

    it('returns conflicts within time range', async () => {
      const conflicts = await getConflictsByTimeRange(baseTime - 6000, baseTime - 4000);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].id).toBe('middle');
    });

    it('includes boundaries (inclusive range)', async () => {
      const conflicts = await getConflictsByTimeRange(baseTime - 5000, baseTime - 1000);

      expect(conflicts).toHaveLength(2);
    });

    it('returns empty array for range with no conflicts', async () => {
      const conflicts = await getConflictsByTimeRange(baseTime + 1000, baseTime + 2000);

      expect(conflicts).toEqual([]);
    });
  });

  describe('getConflictStats', () => {
    it('returns zeros for empty log', async () => {
      const stats = await getConflictStats();

      expect(stats).toEqual({
        total: 0,
        autoResolved: 0,
        escalated: 0,
        byTable: {},
        last24Hours: 0,
        last7Days: 0,
      });
    });

    it('calculates correct totals', async () => {
      await logConflict(createMockEntry({ tableName: 'work_orders', autoResolved: true }));
      await logConflict(createMockEntry({ tableName: 'work_orders', autoResolved: false }));
      await logConflict(createMockEntry({ tableName: 'assets', autoResolved: true }));
      await logConflict(createMockEntry({ tableName: 'meter_readings', autoResolved: false }));

      const stats = await getConflictStats();

      expect(stats.total).toBe(4);
      expect(stats.autoResolved).toBe(2);
      expect(stats.escalated).toBe(2);
      expect(stats.byTable).toEqual({
        work_orders: 2,
        assets: 1,
        meter_readings: 1,
      });
    });

    it('calculates time-based counts correctly', async () => {
      const now = FIXED_TIMESTAMP;
      const oneDayMs = 24 * 60 * 60 * 1000;
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

      // Within 24 hours
      await logConflict(createMockEntry({ timestamp: now - 1000 }));
      await logConflict(createMockEntry({ timestamp: now - oneDayMs + 1000 }));

      // Within 7 days but not 24 hours
      await logConflict(createMockEntry({ timestamp: now - oneDayMs - 1000 }));
      await logConflict(createMockEntry({ timestamp: now - oneWeekMs + 1000 }));

      // Older than 7 days
      await logConflict(createMockEntry({ timestamp: now - oneWeekMs - 1000 }));

      const stats = await getConflictStats();

      expect(stats.last24Hours).toBe(2);
      expect(stats.last7Days).toBe(4);
    });
  });

  describe('pruneConflictLogs', () => {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    it('removes entries older than 30 days', async () => {
      const cutoff = FIXED_TIMESTAMP - THIRTY_DAYS_MS;

      await logConflict(createMockEntry({ id: 'recent', timestamp: FIXED_TIMESTAMP }));
      await logConflict(createMockEntry({ id: 'old', timestamp: cutoff - 1000 }));
      await logConflict(createMockEntry({ id: 'very-old', timestamp: cutoff - 100000 }));

      const removed = await pruneConflictLogs();

      expect(removed).toBe(2);

      const stored = await AsyncStorage.getItem(CONFLICT_LOG_KEY);
      const log = JSON.parse(stored!);
      expect(log).toHaveLength(1);
      expect(log[0].id).toBe('recent');
    });

    it('keeps entries exactly at cutoff', async () => {
      const cutoff = FIXED_TIMESTAMP - THIRTY_DAYS_MS;

      await logConflict(createMockEntry({ id: 'at-cutoff', timestamp: cutoff }));

      const removed = await pruneConflictLogs();

      expect(removed).toBe(0);

      const stored = await AsyncStorage.getItem(CONFLICT_LOG_KEY);
      const log = JSON.parse(stored!);
      expect(log).toHaveLength(1);
    });

    it('returns 0 when nothing to prune', async () => {
      await logConflict(createMockEntry({ timestamp: FIXED_TIMESTAMP }));

      const removed = await pruneConflictLogs();

      expect(removed).toBe(0);
    });

    it('returns 0 for empty log', async () => {
      const removed = await pruneConflictLogs();

      expect(removed).toBe(0);
    });
  });

  describe('clearConflictLogs', () => {
    it('removes all conflict logs', async () => {
      await logConflict(createMockEntry({ id: 'c1' }));
      await logConflict(createMockEntry({ id: 'c2' }));

      await clearConflictLogs();

      const stored = await AsyncStorage.getItem(CONFLICT_LOG_KEY);
      expect(stored).toBeNull();
    });

    it('succeeds even when no logs exist', async () => {
      await expect(clearConflictLogs()).resolves.toBeUndefined();
    });
  });

  describe('markConflictReviewed', () => {
    it('adds review metadata to conflict entry', async () => {
      const logId = await logConflict(createMockEntry({ autoResolved: false }));

      const result = await markConflictReviewed(logId, 'supervisor-1', 'Reviewed and approved');

      expect(result).toBe(true);

      const stored = await AsyncStorage.getItem(CONFLICT_LOG_KEY);
      const log = JSON.parse(stored!);
      expect(log[0].reviewedAt).toBe(FIXED_TIMESTAMP);
      expect(log[0].reviewedBy).toBe('supervisor-1');
      expect(log[0].reviewNotes).toBe('Reviewed and approved');
    });

    it('works without notes', async () => {
      const logId = await logConflict(createMockEntry({ autoResolved: false }));

      const result = await markConflictReviewed(logId, 'supervisor-1');

      expect(result).toBe(true);

      const stored = await AsyncStorage.getItem(CONFLICT_LOG_KEY);
      const log = JSON.parse(stored!);
      expect(log[0].reviewedBy).toBe('supervisor-1');
      expect(log[0].reviewNotes).toBeUndefined();
    });

    it('returns false for nonexistent conflict', async () => {
      const result = await markConflictReviewed('nonexistent-id', 'supervisor-1');

      expect(result).toBe(false);
    });

    it('handles empty log gracefully', async () => {
      const result = await markConflictReviewed('some-id', 'supervisor-1');

      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('loadLog returns empty array on parse error', async () => {
      await AsyncStorage.setItem(CONFLICT_LOG_KEY, 'invalid json{{{');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const conflicts = await getRecentConflicts();

      expect(conflicts).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('loadLog returns empty array on storage error', async () => {
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('Storage error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const conflicts = await getRecentConflicts();

      expect(conflicts).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('saveLog logs error but does not throw', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('Save error'));

      // logConflict should not throw even if save fails
      await expect(logConflict(createMockEntry())).resolves.toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[conflict-log] Failed to save log:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });
});
