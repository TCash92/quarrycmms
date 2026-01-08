/**
 * Monitoring Service
 *
 * Core service for initializing Sentry and managing monitoring context.
 * Handles crash reporting, performance monitoring, and user context.
 *
 * @module services/monitoring/monitoring-service
 */

import * as Sentry from '@sentry/react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

/**
 * Monitoring configuration interface
 */
export interface MonitoringConfig {
  /** Sentry DSN (null to disable) */
  sentryDsn: string | null;
  /** Environment name */
  environment: 'development' | 'staging' | 'production';
  /** Enable performance monitoring */
  enablePerformance: boolean;
  /** Enable analytics */
  enableAnalytics: boolean;
  /** Traces sample rate (0.0 - 1.0) */
  sampleRate: number;
}

/**
 * User context for Sentry
 */
interface UserContext {
  id: string;
  siteId: string;
  deviceId?: string | undefined;
}

/**
 * Flag to track if monitoring has been initialized
 */
let isInitialized = false;

/**
 * Current user context
 */
let currentUserContext: UserContext | null = null;

/**
 * Get app version from Constants
 */
function getAppVersion(): string {
  return Constants.expoConfig?.version || '0.0.0';
}

/**
 * Get device context for Sentry
 */
function getDeviceContext(): Record<string, string | boolean | null> {
  return {
    brand: Device.brand,
    modelName: Device.modelName,
    osName: Device.osName,
    osVersion: Device.osVersion,
    deviceYearClass: Device.deviceYearClass?.toString() || null,
    isDevice: Device.isDevice,
  };
}

/**
 * Initialize monitoring services
 *
 * @param config - Monitoring configuration
 */
export function initMonitoring(config: MonitoringConfig): void {
  if (isInitialized) {
    console.warn('[Monitoring] Already initialized');
    return;
  }

  // Skip Sentry in development without DSN
  if (!config.sentryDsn) {
    console.log('[Monitoring] Sentry DSN not configured, running without crash reporting');
    isInitialized = true;
    return;
  }

  try {
    Sentry.init({
      dsn: config.sentryDsn,
      environment: config.environment,
      release: `quarrycmms@${getAppVersion()}`,

      // Performance monitoring
      tracesSampleRate: config.enablePerformance ? config.sampleRate : 0,

      // Enable native crash reporting
      enableNative: true,

      // Enable auto session tracking
      enableAutoSessionTracking: true,

      // Attach stack trace to all events
      attachStacktrace: true,

      // Before send hook - scrub PII
      beforeSend(event) {
        // Remove email and IP address
        if (event.user) {
          delete event.user.email;
          delete event.user.ip_address;
          delete event.user.username;
        }

        // Remove any sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['Cookie'];
        }

        return event;
      },

      // Before breadcrumb hook - filter sensitive data
      beforeBreadcrumb(breadcrumb) {
        // Filter out auth-related breadcrumbs that might contain tokens
        if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
          const url = breadcrumb.data?.url as string | undefined;
          if (url && (url.includes('/auth/') || url.includes('token'))) {
            return null;
          }
        }
        return breadcrumb;
      },

      // Debug mode in development
      debug: config.environment === 'development',
    });

    // Set initial device context
    Sentry.setContext('device_info', getDeviceContext());

    // Set app context
    Sentry.setContext('app', {
      version: getAppVersion(),
      build: Constants.expoConfig?.extra?.buildNumber || 'unknown',
      environment: config.environment,
    });

    isInitialized = true;
    console.log('[Monitoring] Sentry initialized successfully');
  } catch (error) {
    console.error('[Monitoring] Failed to initialize Sentry:', error);
  }
}

/**
 * Set user context for Sentry
 *
 * @param userId - User ID
 * @param siteId - Site ID
 * @param deviceId - Optional device ID
 */
export function setUserContext(userId: string, siteId: string, deviceId?: string): void {
  if (!isInitialized) {
    console.warn('[Monitoring] Not initialized');
    return;
  }

  currentUserContext = { id: userId, siteId, deviceId };

  Sentry.setUser({
    id: userId,
  });

  Sentry.setTag('site_id', siteId);

  if (deviceId) {
    Sentry.setTag('device_id', deviceId);
  }

  console.log('[Monitoring] User context set');
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext(): void {
  if (!isInitialized) return;

  currentUserContext = null;
  Sentry.setUser(null);
  Sentry.setTag('site_id', undefined);
  Sentry.setTag('device_id', undefined);

  console.log('[Monitoring] User context cleared');
}

/**
 * Get current user context
 */
export function getUserContext(): UserContext | null {
  return currentUserContext;
}

/**
 * Check if monitoring is initialized
 */
export function isMonitoringInitialized(): boolean {
  return isInitialized;
}

/**
 * Set a custom tag on all future events
 */
export function setTag(key: string, value: string | undefined): void {
  if (!isInitialized) return;
  Sentry.setTag(key, value);
}

/**
 * Set custom context for all future events
 */
export function setContext(name: string, context: Record<string, unknown>): void {
  if (!isInitialized) return;
  Sentry.setContext(name, context);
}

/**
 * Force flush pending events (useful before app termination)
 */
export async function flush(_timeout = 2000): Promise<boolean> {
  if (!isInitialized) return true;
  return Sentry.flush();
}

export default {
  initMonitoring,
  setUserContext,
  clearUserContext,
  getUserContext,
  isMonitoringInitialized,
  setTag,
  setContext,
  flush,
};
