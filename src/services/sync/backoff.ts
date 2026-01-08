/**
 * Exponential backoff calculator with jitter
 *
 * Provides retry timing calculations using exponential backoff
 * with configurable jitter to prevent thundering herd.
 *
 * @module services/sync/backoff
 */

/**
 * Configuration for exponential backoff
 */
export interface BackoffConfig {
  /** Base delay in milliseconds (default: 1000ms = 1s) */
  baseDelayMs: number;
  /** Maximum delay in milliseconds (default: 300000ms = 5min) */
  maxDelayMs: number;
  /** Exponential multiplier (default: 2) */
  multiplier: number;
  /** Jitter factor as percentage (default: 0.1 = 10%) */
  jitterFactor: number;
}

/**
 * Default backoff configuration
 */
export const DEFAULT_BACKOFF_CONFIG: BackoffConfig = {
  baseDelayMs: 1000,
  maxDelayMs: 300000,
  multiplier: 2,
  jitterFactor: 0.1,
};

/**
 * Calculate the backoff delay for a given attempt number
 *
 * Uses the formula: min(maxDelay, baseDelay * multiplier^attempt) * (1 + random * jitter)
 *
 * @param attempt - The attempt number (0-indexed, first retry is attempt 1)
 * @param config - Optional partial config to override defaults
 * @returns Delay in milliseconds
 *
 * @example
 * ```typescript
 * // First retry: ~1 second
 * const delay1 = calculateBackoff(1);
 *
 * // Second retry: ~2 seconds
 * const delay2 = calculateBackoff(2);
 *
 * // With custom config
 * const delay = calculateBackoff(3, { baseDelayMs: 500 });
 * ```
 */
export function calculateBackoff(attempt: number, config?: Partial<BackoffConfig>): number {
  const cfg = { ...DEFAULT_BACKOFF_CONFIG, ...config };

  // Calculate exponential delay
  const exponentialDelay = cfg.baseDelayMs * Math.pow(cfg.multiplier, attempt);

  // Cap at maximum delay
  const cappedDelay = Math.min(cfg.maxDelayMs, exponentialDelay);

  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * cfg.jitterFactor * Math.random();

  return Math.floor(cappedDelay + jitter);
}

/**
 * Get the timestamp when the next retry should occur
 *
 * @param attempt - The attempt number (0-indexed)
 * @param config - Optional partial config to override defaults
 * @returns Unix timestamp in milliseconds for next retry
 *
 * @example
 * ```typescript
 * const nextRetryAt = getNextRetryTime(2);
 * console.log(`Retry at ${new Date(nextRetryAt)}`);
 * ```
 */
export function getNextRetryTime(attempt: number, config?: Partial<BackoffConfig>): number {
  return Date.now() + calculateBackoff(attempt, config);
}

/**
 * Check if enough time has passed to attempt a retry
 *
 * @param lastAttemptTime - Unix timestamp (ms) of the last attempt
 * @param attempt - The current attempt number
 * @param config - Optional partial config to override defaults
 * @returns true if ready for retry, false if still in cooldown
 *
 * @example
 * ```typescript
 * const entry = { lastAttemptAt: 1704067200000, attempts: 2 };
 * if (isReadyForRetry(entry.lastAttemptAt, entry.attempts)) {
 *   await attemptSync();
 * }
 * ```
 */
export function isReadyForRetry(
  lastAttemptTime: number | null,
  attempt: number,
  config?: Partial<BackoffConfig>
): boolean {
  // First attempt or no previous attempt recorded
  if (!lastAttemptTime || attempt === 0) {
    return true;
  }

  // Calculate delay without jitter for consistent threshold checking
  const cfg = { ...DEFAULT_BACKOFF_CONFIG, ...config };
  const delay = Math.min(cfg.maxDelayMs, cfg.baseDelayMs * Math.pow(cfg.multiplier, attempt - 1));

  return Date.now() >= lastAttemptTime + delay;
}

/**
 * Calculate the minimum wait time until retry is allowed
 *
 * @param lastAttemptTime - Unix timestamp (ms) of the last attempt
 * @param attempt - The current attempt number
 * @param config - Optional partial config to override defaults
 * @returns Milliseconds until retry is allowed (0 if ready now)
 */
export function getTimeUntilRetry(
  lastAttemptTime: number | null,
  attempt: number,
  config?: Partial<BackoffConfig>
): number {
  if (!lastAttemptTime || attempt === 0) {
    return 0;
  }

  const cfg = { ...DEFAULT_BACKOFF_CONFIG, ...config };
  const delay = Math.min(cfg.maxDelayMs, cfg.baseDelayMs * Math.pow(cfg.multiplier, attempt - 1));

  const nextRetryAt = lastAttemptTime + delay;
  const remaining = nextRetryAt - Date.now();

  return Math.max(0, remaining);
}

/**
 * Get a human-readable string for the backoff delay
 *
 * @param delayMs - Delay in milliseconds
 * @returns Human-readable string (e.g., "30 seconds", "2 minutes")
 */
export function formatBackoffDelay(delayMs: number): string {
  if (delayMs < 1000) {
    return `${delayMs}ms`;
  } else if (delayMs < 60000) {
    const seconds = Math.round(delayMs / 1000);
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  } else {
    const minutes = Math.round(delayMs / 60000);
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
}
