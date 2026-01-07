/**
 * Monitoring Services
 *
 * Central export for all monitoring functionality including:
 * - Sentry crash reporting and error tracking
 * - Structured logging
 * - Performance monitoring
 * - Analytics and feature usage tracking
 * - Device telemetry
 *
 * @module services/monitoring
 */

// Logger
export { logger, setLogLevel, getLogLevel } from './logger';
export type { LogLevel, LogEntry } from './logger';

// Monitoring Service (Sentry)
export {
  initMonitoring,
  setUserContext,
  clearUserContext,
  getUserContext,
  isMonitoringInitialized,
  setTag,
  setContext,
  flush,
} from './monitoring-service';
export type { MonitoringConfig } from './monitoring-service';

// Performance
export {
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
} from './performance';
export type { PerformanceSpan } from './performance';

// Analytics
export {
  trackEvent,
  trackScreen,
  trackFeatureUsage,
  trackWorkOrderCompletion,
  trackSyncEvent,
  trackQuickLogCreated,
  trackVoiceNoteRecorded,
  trackPhotoCaptured,
  trackPdfExported,
  trackMeterReadingRecorded,
  trackError,
  getAnalyticsEnabled,
} from './analytics';
export type { AnalyticsEventType } from './analytics';

// Telemetry
export {
  ALERT_THRESHOLDS,
  collectTelemetry,
  reportTelemetry,
  schedulePeriodicTelemetry,
  stopPeriodicTelemetry,
  recordSyncSuccess,
  recordSyncFailure,
  updateSyncQueueState,
  updatePhotosPending,
  recordVoiceNoteQuality,
  resetTelemetryState,
} from './telemetry';
export type { DeviceTelemetry } from './telemetry';
