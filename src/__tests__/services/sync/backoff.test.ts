/**
 * Tests for backoff.ts
 *
 * Tests exponential backoff calculator including:
 * - calculateBackoff with exponential growth and cap
 * - isReadyForRetry timing checks
 * - getTimeUntilRetry remaining time calculation
 * - formatBackoffDelay formatting
 */

import {
  calculateBackoff,
  getNextRetryTime,
  isReadyForRetry,
  getTimeUntilRetry,
  formatBackoffDelay,
  DEFAULT_BACKOFF_CONFIG,
} from '@/services/sync/backoff';

// Fixed timestamp from setup.ts: 2024-01-01T00:00:00.000Z
const FIXED_TIMESTAMP = 1704067200000;

describe('backoff', () => {
  describe('DEFAULT_BACKOFF_CONFIG', () => {
    it('has expected default values', () => {
      expect(DEFAULT_BACKOFF_CONFIG.baseDelayMs).toBe(1000);
      expect(DEFAULT_BACKOFF_CONFIG.maxDelayMs).toBe(300000);
      expect(DEFAULT_BACKOFF_CONFIG.multiplier).toBe(2);
      expect(DEFAULT_BACKOFF_CONFIG.jitterFactor).toBe(0.1);
    });
  });

  describe('calculateBackoff', () => {
    beforeEach(() => {
      // Mock Math.random to return 0.5 for predictable jitter
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    afterEach(() => {
      jest.spyOn(Math, 'random').mockRestore();
    });

    it('calculates delay for attempt 0', () => {
      // baseDelay * 2^0 = 1000 * 1 = 1000
      // jitter = 1000 * 0.1 * 0.5 = 50
      // total = 1050
      const delay = calculateBackoff(0);
      expect(delay).toBe(1050);
    });

    it('calculates delay for attempt 1', () => {
      // baseDelay * 2^1 = 1000 * 2 = 2000
      // jitter = 2000 * 0.1 * 0.5 = 100
      // total = 2100
      const delay = calculateBackoff(1);
      expect(delay).toBe(2100);
    });

    it('calculates delay for attempt 2', () => {
      // baseDelay * 2^2 = 1000 * 4 = 4000
      // jitter = 4000 * 0.1 * 0.5 = 200
      // total = 4200
      const delay = calculateBackoff(2);
      expect(delay).toBe(4200);
    });

    it('calculates delay for attempt 3', () => {
      // baseDelay * 2^3 = 1000 * 8 = 8000
      // jitter = 8000 * 0.1 * 0.5 = 400
      // total = 8400
      const delay = calculateBackoff(3);
      expect(delay).toBe(8400);
    });

    it('caps delay at maxDelayMs', () => {
      // For attempt 10: 1000 * 2^10 = 1,024,000 > 300,000
      // Should cap at 300,000
      // jitter = 300000 * 0.1 * 0.5 = 15000
      // total = 315000
      const delay = calculateBackoff(10);
      expect(delay).toBe(315000);
    });

    it('caps delay for very high attempts', () => {
      const delay = calculateBackoff(100);
      // Should not exceed maxDelayMs + jitter
      expect(delay).toBeLessThanOrEqual(330000); // 300000 * 1.1
    });

    describe('with custom config', () => {
      it('uses custom baseDelayMs', () => {
        // 500 * 2^1 = 1000
        // jitter = 1000 * 0.1 * 0.5 = 50
        const delay = calculateBackoff(1, { baseDelayMs: 500 });
        expect(delay).toBe(1050);
      });

      it('uses custom maxDelayMs', () => {
        // 1000 * 2^10 = 1,024,000 > 60000
        // caps at 60000
        // jitter = 60000 * 0.1 * 0.5 = 3000
        const delay = calculateBackoff(10, { maxDelayMs: 60000 });
        expect(delay).toBe(63000);
      });

      it('uses custom multiplier', () => {
        // 1000 * 3^2 = 9000
        // jitter = 9000 * 0.1 * 0.5 = 450
        const delay = calculateBackoff(2, { multiplier: 3 });
        expect(delay).toBe(9450);
      });

      it('uses custom jitterFactor', () => {
        // 1000 * 2^1 = 2000
        // jitter = 2000 * 0.2 * 0.5 = 200
        const delay = calculateBackoff(1, { jitterFactor: 0.2 });
        expect(delay).toBe(2200);
      });

      it('handles zero jitter', () => {
        // 1000 * 2^1 = 2000
        // jitter = 0
        const delay = calculateBackoff(1, { jitterFactor: 0 });
        expect(delay).toBe(2000);
      });
    });

    describe('jitter variance', () => {
      it('produces different values with different random values', () => {
        const randomMock = jest.spyOn(Math, 'random');

        randomMock.mockReturnValue(0);
        const delayMin = calculateBackoff(1);

        randomMock.mockReturnValue(1);
        const delayMax = calculateBackoff(1);

        // With 10% jitter: 2000 to 2200
        expect(delayMin).toBe(2000);
        expect(delayMax).toBe(2200);
      });
    });

    it('returns floored integer', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.333);
      const delay = calculateBackoff(1);
      expect(Number.isInteger(delay)).toBe(true);
    });
  });

  describe('getNextRetryTime', () => {
    beforeEach(() => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    afterEach(() => {
      jest.spyOn(Math, 'random').mockRestore();
    });

    it('returns current time plus backoff delay', () => {
      const nextTime = getNextRetryTime(1);
      // FIXED_TIMESTAMP + 2100 (from calculateBackoff(1))
      expect(nextTime).toBe(FIXED_TIMESTAMP + 2100);
    });

    it('passes config to calculateBackoff', () => {
      const nextTime = getNextRetryTime(1, { baseDelayMs: 500 });
      // FIXED_TIMESTAMP + 1050 (500 * 2 + jitter)
      expect(nextTime).toBe(FIXED_TIMESTAMP + 1050);
    });
  });

  describe('isReadyForRetry', () => {
    it('returns true for null lastAttemptTime', () => {
      expect(isReadyForRetry(null, 3)).toBe(true);
    });

    it('returns true for attempt 0', () => {
      expect(isReadyForRetry(FIXED_TIMESTAMP, 0)).toBe(true);
    });

    it('returns true when enough time has passed', () => {
      // For attempt 1: delay = 1000 * 2^0 = 1000ms
      // Last attempt was 2 seconds ago
      const lastAttemptTime = FIXED_TIMESTAMP - 2000;
      expect(isReadyForRetry(lastAttemptTime, 1)).toBe(true);
    });

    it('returns false when not enough time has passed', () => {
      // For attempt 1: delay = 1000 * 2^0 = 1000ms
      // Last attempt was 0.5 seconds ago
      const lastAttemptTime = FIXED_TIMESTAMP - 500;
      expect(isReadyForRetry(lastAttemptTime, 1)).toBe(false);
    });

    it('returns true at exact boundary', () => {
      // For attempt 1: delay = 1000 * 2^0 = 1000ms
      // Last attempt was exactly 1 second ago
      const lastAttemptTime = FIXED_TIMESTAMP - 1000;
      expect(isReadyForRetry(lastAttemptTime, 1)).toBe(true);
    });

    it('calculates correct delay for higher attempts', () => {
      // For attempt 3: delay = 1000 * 2^2 = 4000ms
      const lastAttemptTime = FIXED_TIMESTAMP - 3999;
      expect(isReadyForRetry(lastAttemptTime, 3)).toBe(false);

      const lastAttemptTime2 = FIXED_TIMESTAMP - 4000;
      expect(isReadyForRetry(lastAttemptTime2, 3)).toBe(true);
    });

    it('respects maxDelayMs cap', () => {
      // For attempt 100: would be huge, but capped at 300000ms
      const lastAttemptTime = FIXED_TIMESTAMP - 300000;
      expect(isReadyForRetry(lastAttemptTime, 100)).toBe(true);

      const lastAttemptTime2 = FIXED_TIMESTAMP - 299999;
      expect(isReadyForRetry(lastAttemptTime2, 100)).toBe(false);
    });

    it('uses custom config', () => {
      // For attempt 1 with baseDelayMs=500: delay = 500 * 2^0 = 500ms
      const lastAttemptTime = FIXED_TIMESTAMP - 499;
      expect(isReadyForRetry(lastAttemptTime, 1, { baseDelayMs: 500 })).toBe(false);

      const lastAttemptTime2 = FIXED_TIMESTAMP - 500;
      expect(isReadyForRetry(lastAttemptTime2, 1, { baseDelayMs: 500 })).toBe(true);
    });
  });

  describe('getTimeUntilRetry', () => {
    it('returns 0 for null lastAttemptTime', () => {
      expect(getTimeUntilRetry(null, 3)).toBe(0);
    });

    it('returns 0 for attempt 0', () => {
      expect(getTimeUntilRetry(FIXED_TIMESTAMP, 0)).toBe(0);
    });

    it('returns remaining time when in cooldown', () => {
      // For attempt 1: delay = 1000ms
      // Last attempt was 400ms ago
      const lastAttemptTime = FIXED_TIMESTAMP - 400;
      expect(getTimeUntilRetry(lastAttemptTime, 1)).toBe(600);
    });

    it('returns 0 when cooldown has passed', () => {
      // For attempt 1: delay = 1000ms
      // Last attempt was 2 seconds ago
      const lastAttemptTime = FIXED_TIMESTAMP - 2000;
      expect(getTimeUntilRetry(lastAttemptTime, 1)).toBe(0);
    });

    it('calculates correct remaining time for higher attempts', () => {
      // For attempt 3: delay = 4000ms
      // Last attempt was 1 second ago
      const lastAttemptTime = FIXED_TIMESTAMP - 1000;
      expect(getTimeUntilRetry(lastAttemptTime, 3)).toBe(3000);
    });

    it('respects maxDelayMs cap', () => {
      // For attempt 100: capped at 300000ms
      // Last attempt was 100 seconds ago
      const lastAttemptTime = FIXED_TIMESTAMP - 100000;
      expect(getTimeUntilRetry(lastAttemptTime, 100)).toBe(200000);
    });

    it('uses custom config', () => {
      // For attempt 1 with baseDelayMs=2000: delay = 2000ms
      // Last attempt was 500ms ago
      const lastAttemptTime = FIXED_TIMESTAMP - 500;
      expect(getTimeUntilRetry(lastAttemptTime, 1, { baseDelayMs: 2000 })).toBe(1500);
    });
  });

  describe('formatBackoffDelay', () => {
    describe('milliseconds formatting', () => {
      it('formats delays under 1 second as milliseconds', () => {
        expect(formatBackoffDelay(500)).toBe('500ms');
        expect(formatBackoffDelay(999)).toBe('999ms');
        expect(formatBackoffDelay(1)).toBe('1ms');
        expect(formatBackoffDelay(0)).toBe('0ms');
      });
    });

    describe('seconds formatting', () => {
      it('formats delays from 1-59 seconds', () => {
        expect(formatBackoffDelay(1000)).toBe('1 second');
        expect(formatBackoffDelay(2000)).toBe('2 seconds');
        expect(formatBackoffDelay(30000)).toBe('30 seconds');
        expect(formatBackoffDelay(59000)).toBe('59 seconds');
      });

      it('rounds to nearest second', () => {
        expect(formatBackoffDelay(1500)).toBe('2 seconds');
        expect(formatBackoffDelay(1400)).toBe('1 second');
      });

      it('uses singular for 1 second', () => {
        expect(formatBackoffDelay(1000)).toBe('1 second');
        expect(formatBackoffDelay(1499)).toBe('1 second');
      });
    });

    describe('minutes formatting', () => {
      it('formats delays of 1 minute or more', () => {
        expect(formatBackoffDelay(60000)).toBe('1 minute');
        expect(formatBackoffDelay(120000)).toBe('2 minutes');
        expect(formatBackoffDelay(300000)).toBe('5 minutes');
      });

      it('rounds to nearest minute', () => {
        expect(formatBackoffDelay(90000)).toBe('2 minutes');
        expect(formatBackoffDelay(89999)).toBe('1 minute');
      });

      it('uses singular for 1 minute', () => {
        expect(formatBackoffDelay(60000)).toBe('1 minute');
        expect(formatBackoffDelay(89999)).toBe('1 minute');
      });

      it('handles large values', () => {
        expect(formatBackoffDelay(600000)).toBe('10 minutes');
        expect(formatBackoffDelay(3600000)).toBe('60 minutes');
      });
    });
  });
});
