import {
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET,
  EXPO_PUBLIC_ENABLE_VOICE_NOTES,
  EXPO_PUBLIC_ENABLE_OFFLINE_PDF,
  EXPO_PUBLIC_ENABLE_ANALYTICS,
  EXPO_PUBLIC_LOG_LEVEL,
  EXPO_PUBLIC_SHOW_SYNC_DEBUG,
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

export const config: AppConfig = {
  supabaseUrl: EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  storageBucket: EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET ?? '',
  enableVoiceNotes: parseBoolean(EXPO_PUBLIC_ENABLE_VOICE_NOTES, true),
  enableOfflinePdf: parseBoolean(EXPO_PUBLIC_ENABLE_OFFLINE_PDF, true),
  enableAnalytics: parseBoolean(EXPO_PUBLIC_ENABLE_ANALYTICS, false),
  logLevel: parseLogLevel(EXPO_PUBLIC_LOG_LEVEL),
  showSyncDebug: parseBoolean(EXPO_PUBLIC_SHOW_SYNC_DEBUG, false),
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
