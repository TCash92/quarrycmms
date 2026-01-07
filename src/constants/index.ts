/**
 * Touch target constants for gloved use
 * Per CMMS_MVP_Design_Guide_v6.md Section 2.9.2
 */
export const TOUCH_TARGETS = {
  /** Minimum touch target for normal conditions (dp) */
  MINIMUM: 48,
  /** Minimum touch target for cold weather / gloved use (dp) */
  COLD_WEATHER: 56,
  /** Minimum gap between buttons (dp) */
  BUTTON_SPACING: 16,
} as const;

/**
 * Timer auto-pause thresholds
 * Per CMMS_MVP_Design_Guide_v6.md Part 12
 */
export const TIMER_THRESHOLDS = {
  /** Pause timer after screen off (milliseconds) */
  SCREEN_OFF_MS: 5 * 60 * 1000, // 5 minutes
  /** Pause timer after app backgrounded (milliseconds) */
  APP_BACKGROUND_MS: 10 * 60 * 1000, // 10 minutes
  /** Pause timer after no touch interaction (milliseconds) */
  NO_INTERACTION_MS: 15 * 60 * 1000, // 15 minutes
} as const;

/**
 * Voice note constraints
 * Per CMMS_MVP_Design_Guide_v6.md Part 2.2
 */
export const VOICE_NOTE = {
  /** Maximum recording duration (milliseconds) */
  MAX_DURATION_MS: 2 * 60 * 1000, // 2 minutes
  /** Audio sample rate (Hz) */
  SAMPLE_RATE: 22050,
  /** Audio bit rate (bps) */
  BIT_RATE: 64000,
  /** Number of audio channels */
  CHANNELS: 1,
  /** File format extension */
  FORMAT: '.m4a',
} as const;

/**
 * Sync-related constants
 */
export const SYNC = {
  /** Offline token validity period (days) */
  OFFLINE_TOKEN_DAYS: 7,
  /** Photo aging warning threshold (days) */
  PHOTO_WARNING_DAYS: 4,
  /** Photo aging alert threshold (days) */
  PHOTO_ALERT_DAYS: 8,
  /** Photo aging critical threshold (days) */
  PHOTO_CRITICAL_DAYS: 14,
} as const;

/**
 * Display settings
 */
export const DISPLAY = {
  /** Default brightness in cold weather (percentage) */
  COLD_WEATHER_BRIGHTNESS: 80,
} as const;

/**
 * Work order priority levels with display info
 */
export const PRIORITY_LEVELS = {
  emergency: { label: 'Emergency', color: '#D32F2F', order: 4 },
  high: { label: 'High', color: '#F57C00', order: 3 },
  medium: { label: 'Medium', color: '#FBC02D', order: 2 },
  low: { label: 'Low', color: '#388E3C', order: 1 },
} as const;

/**
 * Asset status with display info
 */
export const ASSET_STATUS = {
  operational: { label: 'Operational', color: '#388E3C' },
  limited: { label: 'Limited', color: '#FBC02D' },
  down: { label: 'Down', color: '#D32F2F' },
} as const;

/**
 * Work order status with display info
 */
export const WORK_ORDER_STATUS = {
  open: { label: 'Open', color: '#2196F3' },
  in_progress: { label: 'In Progress', color: '#FF9800' },
  completed: { label: 'Completed', color: '#4CAF50' },
} as const;

/**
 * Failure types for work order completion
 */
export const FAILURE_TYPES = {
  none: { label: 'None', color: '#388E3C' },
  wore_out: { label: 'Wore Out', color: '#FBC02D' },
  broke: { label: 'Broke', color: '#D32F2F' },
  unknown: { label: 'Unknown', color: '#9E9E9E' },
} as const;

/**
 * Quick Log action types with display info and priority mapping
 * Per CMMS_MVP_Design_Guide_v6.md Week 13 requirements
 */
export const QUICK_LOG_ACTIONS = {
  emergency_repair: {
    label: 'Emergency / Repair',
    color: '#D32F2F',
    priority: 'high' as const,
    titlePrefix: 'Emergency Repair:',
  },
  maintenance_pm: {
    label: 'Maintenance / PM',
    color: '#1976D2',
    priority: 'medium' as const,
    titlePrefix: 'PM:',
  },
  inspection: {
    label: 'Inspection',
    color: '#388E3C',
    priority: 'low' as const,
    titlePrefix: 'Inspection:',
  },
} as const;

export type QuickLogActionType = keyof typeof QUICK_LOG_ACTIONS;
