/**
 * Performance Monitoring Service
 *
 * Tracks operation durations, identifies slow operations,
 * and reports performance metrics to Sentry.
 *
 * @module services/monitoring/performance
 */

import * as Sentry from '@sentry/react-native';
import { logger } from './logger';

/**
 * Performance thresholds (in milliseconds)
 */
export const THRESHOLDS = {
  /** Sync operation warning threshold */
  SYNC_SLOW: 30000, // 30 seconds
  /** PDF generation warning threshold */
  PDF_SLOW: 60000, // 60 seconds
  /** Photo upload warning threshold */
  PHOTO_UPLOAD_SLOW: 30000, // 30 seconds
  /** Database query warning threshold */
  DB_QUERY_SLOW: 1000, // 1 second
  /** Auth operation warning threshold */
  AUTH_SLOW: 5000, // 5 seconds
};

/**
 * Simple span interface for tracking operations
 */
export interface PerformanceSpan {
  name: string;
  op: string;
  startTime: number;
  data: Record<string, unknown>;
  finish: (status?: 'ok' | 'error') => number;
}

/**
 * Start a performance span for tracking an operation
 *
 * @param name - Span name
 * @param op - Operation type (e.g., 'sync', 'db', 'http')
 * @param data - Additional data to attach
 * @returns Performance span with finish method
 */
export function startSpan(
  name: string,
  op: string,
  data: Record<string, unknown> = {}
): PerformanceSpan {
  const startTime = Date.now();

  return {
    name,
    op,
    startTime,
    data,
    finish(status: 'ok' | 'error' = 'ok'): number {
      const duration = Date.now() - startTime;

      // Add breadcrumb
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `${op}: ${name}`,
        level: status === 'ok' ? 'info' : 'error',
        data: {
          ...data,
          duration_ms: duration,
          status,
        },
      });

      return duration;
    },
  };
}

/**
 * Track a sync operation's performance
 *
 * @param durationMs - Sync duration in milliseconds
 * @param itemCount - Number of items synced
 * @param success - Whether sync was successful
 */
export function measureSync(durationMs: number, itemCount: number, success: boolean): void {
  const context = {
    category: 'performance',
    operation: 'sync',
    durationMs,
    itemCount,
    success,
    itemsPerSecond: durationMs > 0 ? Math.round((itemCount / durationMs) * 1000) : 0,
  };

  if (durationMs > THRESHOLDS.SYNC_SLOW) {
    logger.warn('Slow sync detected', context);
    Sentry.captureMessage('Slow sync operation', {
      level: 'warning',
      extra: context,
      tags: { slow_operation: 'sync' },
    });
  } else {
    logger.debug('Sync completed', context);
  }

  // Add metric breadcrumb
  Sentry.addBreadcrumb({
    category: 'sync',
    message: `Synced ${itemCount} items in ${durationMs}ms`,
    level: success ? 'info' : 'error',
    data: context,
  });
}

/**
 * Track a photo upload operation's performance
 *
 * @param durationMs - Upload duration in milliseconds
 * @param sizeBytes - Photo size in bytes
 * @param success - Whether upload was successful
 */
export function measurePhotoUpload(durationMs: number, sizeBytes: number, success: boolean): void {
  const sizeMb = sizeBytes / (1024 * 1024);
  const speedMbps = durationMs > 0 ? (sizeMb / durationMs) * 1000 : 0;

  const context = {
    category: 'performance',
    operation: 'photo_upload',
    durationMs,
    sizeBytes,
    sizeMb: Math.round(sizeMb * 100) / 100,
    speedMbps: Math.round(speedMbps * 100) / 100,
    success,
  };

  if (durationMs > THRESHOLDS.PHOTO_UPLOAD_SLOW) {
    logger.warn('Slow photo upload', context);
  } else {
    logger.debug('Photo uploaded', context);
  }

  Sentry.addBreadcrumb({
    category: 'photo',
    message: `Uploaded ${sizeMb.toFixed(2)}MB in ${durationMs}ms`,
    level: success ? 'info' : 'error',
    data: context,
  });
}

/**
 * Track PDF generation performance
 *
 * @param durationMs - Generation duration in milliseconds
 * @param pageCount - Number of pages (estimated)
 */
export function measurePdfGeneration(durationMs: number, pageCount: number): void {
  const context = {
    category: 'performance',
    operation: 'pdf_generation',
    durationMs,
    pageCount,
    msPerPage: pageCount > 0 ? Math.round(durationMs / pageCount) : 0,
  };

  if (durationMs > THRESHOLDS.PDF_SLOW) {
    logger.warn('Slow PDF generation', context);
    Sentry.captureMessage('Slow PDF generation', {
      level: 'warning',
      extra: context,
      tags: { slow_operation: 'pdf' },
    });
  } else {
    logger.debug('PDF generated', context);
  }

  Sentry.addBreadcrumb({
    category: 'pdf',
    message: `Generated ${pageCount} page PDF in ${durationMs}ms`,
    level: 'info',
    data: context,
  });
}

/**
 * Track a potentially slow operation
 *
 * @param name - Operation name
 * @param durationMs - Duration in milliseconds
 * @param threshold - Custom threshold (or use default)
 */
export function trackSlowOperation(
  name: string,
  durationMs: number,
  threshold: number = 5000
): void {
  const context = {
    category: 'performance',
    operation: name,
    durationMs,
    threshold,
  };

  if (durationMs > threshold) {
    logger.warn(`Slow operation: ${name}`, context);
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `Slow: ${name} took ${durationMs}ms (threshold: ${threshold}ms)`,
      level: 'warning',
      data: context,
    });
  }
}

/**
 * Track database query performance
 *
 * @param queryName - Query description
 * @param durationMs - Query duration in milliseconds
 * @param recordCount - Number of records returned
 */
export function measureDbQuery(queryName: string, durationMs: number, recordCount: number): void {
  const context = {
    category: 'database',
    queryName,
    durationMs,
    recordCount,
  };

  if (durationMs > THRESHOLDS.DB_QUERY_SLOW) {
    logger.warn('Slow database query', context);
  }

  Sentry.addBreadcrumb({
    category: 'db',
    message: `Query: ${queryName} returned ${recordCount} records in ${durationMs}ms`,
    level: durationMs > THRESHOLDS.DB_QUERY_SLOW ? 'warning' : 'info',
    data: context,
  });
}

/**
 * Track auth operation performance
 *
 * @param operation - Auth operation type
 * @param durationMs - Duration in milliseconds
 * @param success - Whether operation succeeded
 */
export function measureAuth(operation: string, durationMs: number, success: boolean): void {
  const context = {
    category: 'auth',
    operation,
    durationMs,
    success,
  };

  if (durationMs > THRESHOLDS.AUTH_SLOW) {
    logger.warn('Slow auth operation', context);
  }

  Sentry.addBreadcrumb({
    category: 'auth',
    message: `Auth ${operation}: ${success ? 'success' : 'failed'} in ${durationMs}ms`,
    level: success ? 'info' : 'error',
    data: context,
  });
}

/**
 * Create a timer utility for measuring operations
 */
export function createTimer(): { elapsed: () => number; reset: () => void } {
  let startTime = Date.now();

  return {
    elapsed: () => Date.now() - startTime,
    reset: () => {
      startTime = Date.now();
    },
  };
}

/**
 * Wrap an async function with performance tracking
 *
 * @param name - Operation name
 * @param op - Operation type
 * @param fn - Async function to wrap
 * @returns Wrapped function
 */
export function withPerformanceTracking<T>(
  name: string,
  op: string,
  fn: () => Promise<T>
): () => Promise<T> {
  return async () => {
    const span = startSpan(name, op);
    try {
      const result = await fn();
      span.finish('ok');
      return result;
    } catch (error) {
      span.finish('error');
      throw error;
    }
  };
}

export default {
  THRESHOLDS,
  startSpan,
  measureSync,
  measurePhotoUpload,
  measurePdfGeneration,
  trackSlowOperation,
  measureDbQuery,
  measureAuth,
  createTimer,
  withPerformanceTracking,
};
