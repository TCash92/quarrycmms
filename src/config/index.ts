import {
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET,
  EXPO_PUBLIC_ENABLE_VOICE_NOTES,
  EXPO_PUBLIC_ENABLE_OFFLINE_PDF,
  EXPO_PUBLIC_ENABLE_ANALYTICS,
  EXPO_PUBLIC_LOG_LEVEL,
  EXPO_PUBLIC_SHOW_SYNC_DEBUG,
  EXPO_PUBLIC_SENTRY_DSN,
  EXPO_PUBLIC_ENVIRONMENT,
} from '@env';

export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  storageBucket: string;
  enableVoiceNotes: boolean;
  enableOfflinePdf: boolean;
  enableAnalytics: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  showSyncDebug: boolean;
  /** Sentry DSN for crash reporting (null to disable) */
  sentryDsn: string | null;
  /** Environment name */
  environment: 'development' | 'staging' | 'production';
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') return defaultValue;
  return value.toLowerCase() === 'true';
}

function parseLogLevel(value: string | undefined): AppConfig['logLevel'] {
  const validLevels: AppConfig['logLevel'][] = ['debug', 'info', 'warn', 'error'];
  if (value && validLevels.includes(value as AppConfig['logLevel'])) {
    return value as AppConfig['logLevel'];
  }
  return 'debug';
}

function parseEnvironment(value: string | undefined): AppConfig['environment'] {
  const validEnvs: AppConfig['environment'][] = ['development', 'staging', 'production'];
  if (value && validEnvs.includes(value as AppConfig['environment'])) {
    return value as AppConfig['environment'];
  }
  // Default to development, unless we're in a non-dev build
  return __DEV__ ? 'development' : 'production';
}

export const config: AppConfig = {
  supabaseUrl: EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  storageBucket: EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET ?? '',
  enableVoiceNotes: parseBoolean(EXPO_PUBLIC_ENABLE_VOICE_NOTES, true),
  enableOfflinePdf: parseBoolean(EXPO_PUBLIC_ENABLE_OFFLINE_PDF, true),
  enableAnalytics: parseBoolean(EXPO_PUBLIC_ENABLE_ANALYTICS, false),
  logLevel: parseLogLevel(EXPO_PUBLIC_LOG_LEVEL),
  showSyncDebug: parseBoolean(EXPO_PUBLIC_SHOW_SYNC_DEBUG, false),
  sentryDsn: EXPO_PUBLIC_SENTRY_DSN || null,
  environment: parseEnvironment(EXPO_PUBLIC_ENVIRONMENT),
};

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Validates that all required configuration values are present.
 * Call this on app startup.
 * @throws ConfigurationError if any required config is missing
 */
export function validateConfig(): void {
  const required: Array<keyof AppConfig> = ['supabaseUrl', 'supabaseAnonKey', 'storageBucket'];
  const missing: string[] = [];

  for (const key of required) {
    const value = config[key];
    if (value === undefined || value === '' || value === null) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new ConfigurationError(
      `Missing required configuration: ${missing.join(', ')}. ` +
        'Please check your .env file and ensure all required variables are set.'
    );
  }

  // Validate URL format
  try {
    new URL(config.supabaseUrl);
  } catch {
    throw new ConfigurationError(
      `Invalid EXPO_PUBLIC_SUPABASE_URL: "${config.supabaseUrl}" is not a valid URL`
    );
  }

  if (__DEV__) {
    console.log('[Config] Configuration validated successfully');
    if (config.showSyncDebug) {
      console.log('[Config] Current config:', {
        supabaseUrl: config.supabaseUrl.substring(0, 30) + '...',
        storageBucket: config.storageBucket,
        enableVoiceNotes: config.enableVoiceNotes,
        enableOfflinePdf: config.enableOfflinePdf,
        enableAnalytics: config.enableAnalytics,
        logLevel: config.logLevel,
      });
    }
  }
}

export default config;
