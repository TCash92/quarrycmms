/**
 * Structured Logging Service
 *
 * Provides consistent, structured logging throughout the application.
 * Integrates with Sentry for error reporting and adds breadcrumbs.
 *
 * @module services/monitoring/logger
 */

import * as Sentry from '@sentry/react-native';
import { config } from '@/config';

/**
 * Log levels ordered by severity
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured log entry interface
 */
export interface LogEntry {
  /** Log level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Additional context data */
  context?: Record<string, unknown>;
  /** ISO timestamp */
  timestamp: string;
  /** Category for grouping logs */
  category?: string;
}

/**
 * Log level numeric values for comparison
 */
const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Sentry severity mapping
 */
const SENTRY_SEVERITY: Record<LogLevel, Sentry.SeverityLevel> = {
  debug: 'debug',
  info: 'info',
  warn: 'warning',
  error: 'error',
};

/**
 * Current minimum log level
 */
let currentLogLevel: LogLevel = config.logLevel;

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[currentLogLevel];
}

/**
 * Format a log entry for console output
 */
function formatLogEntry(entry: LogEntry): string {
  const prefix = entry.category ? `[${entry.category}]` : '';
  const contextStr =
    entry.context && Object.keys(entry.context).length > 0
      ? ` ${JSON.stringify(entry.context)}`
      : '';
  return `${prefix} ${entry.message}${contextStr}`;
}

/**
 * Add a Sentry breadcrumb for the log entry
 */
function addBreadcrumb(entry: LogEntry): void {
  Sentry.addBreadcrumb({
    category: entry.category || 'log',
    message: entry.message,
    level: SENTRY_SEVERITY[entry.level],
    data: entry.context,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Create a log entry and process it
 */
function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  error?: Error
): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
    category: context?.category as string | undefined,
  };

  // Console output
  const formatted = formatLogEntry(entry);
  switch (level) {
    case 'debug':
      console.debug(formatted);
      break;
    case 'info':
      console.log(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      console.error(formatted, error || '');
      break;
  }

  // Add Sentry breadcrumb for info and above
  if (LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES.info) {
    addBreadcrumb(entry);
  }

  // Report errors to Sentry
  if (level === 'error' && error) {
    Sentry.captureException(error, {
      extra: context,
      tags: {
        category: entry.category || 'unknown',
      },
    });
  }
}

/**
 * Logger object with methods for each log level
 */
export const logger = {
  /**
   * Debug level - detailed information for development
   */
  debug(message: string, context?: Record<string, unknown>): void {
    log('debug', message, context);
  },

  /**
   * Info level - general operational information
   */
  info(message: string, context?: Record<string, unknown>): void {
    log('info', message, context);
  },

  /**
   * Warn level - potentially harmful situations
   */
  warn(message: string, context?: Record<string, unknown>): void {
    log('warn', message, context);
  },

  /**
   * Error level - error events, includes optional Error object
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    log('error', message, context, error);
  },

  /**
   * Capture an exception to Sentry with optional context
   */
  captureException(error: Error, context?: Record<string, unknown>): void {
    Sentry.captureException(error, { extra: context });
  },

  /**
   * Capture a message to Sentry (for non-error events that need tracking)
   */
  captureMessage(message: string, level: LogLevel = 'info'): void {
    Sentry.captureMessage(message, SENTRY_SEVERITY[level]);
  },
};

/**
 * Set the minimum log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
  logger.debug('Log level changed', { category: 'logger', newLevel: level });
}

/**
 * Get the current log level
 */
export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

export default logger;
