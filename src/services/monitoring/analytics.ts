/**
 * Analytics Service
 *
 * Tracks feature usage and user behavior when analytics is enabled.
 * Respects user privacy - only collects when enableAnalytics is true.
 *
 * @module services/monitoring/analytics
 */

import * as Sentry from '@sentry/react-native';
import { config } from '@/config';
import { logger } from './logger';

/**
 * Analytics event types
 */
export type AnalyticsEventType =
  | 'feature_used'
  | 'screen_view'
  | 'work_order_completed'
  | 'sync_event'
  | 'quick_log_created'
  | 'voice_note_recorded'
  | 'photo_captured'
  | 'pdf_exported'
  | 'meter_reading_recorded';

/**
 * Check if analytics is enabled
 */
function isEnabled(): boolean {
  return config.enableAnalytics;
}

/**
 * Track a generic analytics event
 *
 * @param name - Event name
 * @param properties - Event properties
 */
export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  if (!isEnabled()) return;

  const eventData = {
    event: name,
    timestamp: Date.now(),
    ...properties,
  };

  // Log to debug output
  logger.debug('Analytics event', { category: 'analytics', ...eventData });

  // Add as Sentry breadcrumb for correlation
  Sentry.addBreadcrumb({
    category: 'analytics',
    message: name,
    level: 'info',
    data: properties,
  });
}

/**
 * Track a screen view
 *
 * @param screenName - Name of the screen
 */
export function trackScreen(screenName: string): void {
  if (!isEnabled()) return;

  trackEvent('screen_view', {
    screen_name: screenName,
  });
}

/**
 * Track feature usage
 *
 * @param feature - Feature name
 */
export function trackFeatureUsage(feature: string): void {
  if (!isEnabled()) return;

  trackEvent('feature_used', {
    feature,
  });
}

/**
 * Track work order completion
 *
 * @param durationMinutes - Time to complete work order
 * @param hasSignature - Whether signature was captured
 * @param hasPhotos - Whether photos were attached
 * @param hasVoiceNote - Whether voice note was recorded
 */
export function trackWorkOrderCompletion(
  durationMinutes: number,
  hasSignature: boolean,
  hasPhotos: boolean = false,
  hasVoiceNote: boolean = false
): void {
  if (!isEnabled()) return;

  trackEvent('work_order_completed', {
    duration_minutes: durationMinutes,
    has_signature: hasSignature,
    has_photos: hasPhotos,
    has_voice_note: hasVoiceNote,
    completion_quality: hasSignature && (hasPhotos || hasVoiceNote) ? 'high' : 'standard',
  });
}

/**
 * Track sync events
 *
 * @param type - Sync event type
 * @param itemCount - Number of items synced (optional)
 * @param durationMs - Sync duration in ms (optional)
 */
export function trackSyncEvent(
  type: 'start' | 'success' | 'failure',
  itemCount?: number,
  durationMs?: number
): void {
  if (!isEnabled()) return;

  trackEvent('sync_event', {
    type,
    item_count: itemCount,
    duration_ms: durationMs,
  });
}

/**
 * Track Quick Log creation
 *
 * @param actionType - Type of quick action
 */
export function trackQuickLogCreated(actionType: string): void {
  if (!isEnabled()) return;

  trackEvent('quick_log_created', {
    action_type: actionType,
  });
}

/**
 * Track voice note recording
 *
 * @param durationSeconds - Recording duration
 * @param qualityScore - Quality assessment (high/medium/low/unintelligible)
 */
export function trackVoiceNoteRecorded(
  durationSeconds: number,
  qualityScore: 'high' | 'medium' | 'low' | 'unintelligible'
): void {
  if (!isEnabled()) return;

  trackEvent('voice_note_recorded', {
    duration_seconds: durationSeconds,
    quality_score: qualityScore,
  });
}

/**
 * Track photo capture
 *
 * @param context - Where photo was taken (work_order, asset, etc.)
 */
export function trackPhotoCaptured(context: string): void {
  if (!isEnabled()) return;

  trackEvent('photo_captured', {
    context,
  });
}

/**
 * Track PDF export
 *
 * @param type - PDF type (work_order, asset_history, compliance_package)
 * @param pageCount - Number of pages (estimated)
 */
export function trackPdfExported(type: string, pageCount: number): void {
  if (!isEnabled()) return;

  trackEvent('pdf_exported', {
    pdf_type: type,
    page_count: pageCount,
  });
}

/**
 * Track meter reading
 *
 * @param meterType - Type of meter (hours, km, etc.)
 */
export function trackMeterReadingRecorded(meterType: string): void {
  if (!isEnabled()) return;

  trackEvent('meter_reading_recorded', {
    meter_type: meterType,
  });
}

/**
 * Track error occurrence (always tracked, regardless of analytics flag)
 *
 * @param errorType - Type/category of error
 * @param context - Error context
 */
export function trackError(errorType: string, context?: Record<string, unknown>): void {
  // Always track errors for debugging, even if analytics disabled
  logger.debug('Error tracked', { category: 'analytics', errorType, ...context });

  Sentry.addBreadcrumb({
    category: 'error',
    message: errorType,
    level: 'error',
    data: context,
  });
}

/**
 * Get analytics enabled status
 */
export function getAnalyticsEnabled(): boolean {
  return isEnabled();
}

export default {
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
};
