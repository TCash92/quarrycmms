/**
 * Test Data Fixtures for E2E Tests
 *
 * Constants and factories for creating test data.
 * Keep in sync with e2e/mocks/handlers.ts
 */

// ============================================================================
// Test Users
// ============================================================================

export const TEST_USERS = {
  technician: {
    id: 'user-001',
    email: 'tech@quarrysite.com',
    password: 'TestPassword123!',
    name: 'Dave Technician',
    role: 'Technician' as const, // Capitalized as displayed in UI
    siteId: 'site-001',
  },
  supervisor: {
    id: 'user-002',
    email: 'supervisor@quarrysite.com',
    password: 'SuperPassword123!',
    name: 'Sandra Supervisor',
    role: 'Supervisor' as const, // Capitalized as displayed in UI
    siteId: 'site-001',
  },
};

// Default user for most tests
export const DEFAULT_USER = TEST_USERS.technician;

// ============================================================================
// Test Assets
// ============================================================================

export const TEST_ASSETS = {
  excavator: {
    id: 'asset-001',
    assetNumber: 'EXC-001',
    name: 'CAT 320 Excavator',
    description: 'Main excavation unit for primary pit',
    category: 'Heavy Equipment',
    status: 'operational' as const,
    locationDescription: 'Primary Pit - North Section',
    meterType: 'hours',
    meterUnit: 'Operating Hours',
    meterCurrentReading: 5432,
  },
  loader: {
    id: 'asset-002',
    assetNumber: 'LDR-002',
    name: 'Komatsu WA380 Loader',
    description: 'Front-end loader for material handling',
    category: 'Heavy Equipment',
    status: 'limited' as const,
    locationDescription: 'Stockpile Area',
    meterType: 'hours',
    meterUnit: 'Operating Hours',
    meterCurrentReading: 3200,
  },
  crusher: {
    id: 'asset-003',
    assetNumber: 'CRU-003',
    name: 'Primary Jaw Crusher',
    description: 'Main crushing unit',
    category: 'Processing Equipment',
    status: 'down' as const,
    locationDescription: 'Processing Plant',
    meterType: null,
    meterUnit: null,
    meterCurrentReading: null,
  },
};

// ============================================================================
// Test Work Orders
// ============================================================================

export const TEST_WORK_ORDERS = {
  openHighPriority: {
    id: 'wo-001',
    woNumber: 'WO-20240115-0001',
    title: 'Replace hydraulic hose',
    description: 'Hydraulic hose leaking on boom cylinder',
    priority: 'high' as const,
    status: 'open' as const,
    assetId: 'asset-001',
    assetName: 'CAT 320 Excavator',
    assignedTo: 'user-001',
    createdBy: 'user-002',
    dueDate: new Date(Date.now() + 86400000), // Tomorrow
    isOverdue: false,
  },
  inProgress: {
    id: 'wo-002',
    woNumber: 'WO-20240115-0002',
    title: 'PM Service - 500 hours',
    description: 'Scheduled preventive maintenance',
    priority: 'medium' as const,
    status: 'in_progress' as const,
    assetId: 'asset-002',
    assetName: 'Komatsu WA380 Loader',
    assignedTo: 'user-001',
    createdBy: 'user-002',
    dueDate: new Date(Date.now() + 172800000), // 2 days
    startedAt: new Date(Date.now() - 3600000), // 1 hour ago
    isOverdue: false,
  },
  completed: {
    id: 'wo-003',
    woNumber: 'WO-20240114-0003',
    title: 'Inspect bucket teeth',
    description: 'Regular inspection of bucket teeth wear',
    priority: 'low' as const,
    status: 'completed' as const,
    assetId: 'asset-001',
    assetName: 'CAT 320 Excavator',
    assignedTo: 'user-001',
    createdBy: 'user-002',
    completedAt: new Date(Date.now() - 86400000),
    completedBy: 'user-001',
    completionNotes: 'Teeth showing normal wear, no replacement needed',
    failureType: 'none' as const,
    timeSpentMinutes: 45,
    verificationCode: 'VERIFY-ABC123',
    isOverdue: false,
  },
};

// ============================================================================
// Quick Log Action Types
// ============================================================================

export const QUICK_LOG_ACTIONS = {
  emergency: {
    type: 'emergency_repair',
    label: 'Emergency / Repair',
    color: '#D32F2F',
  },
  maintenance: {
    type: 'maintenance_pm',
    label: 'Maintenance / PM',
    color: '#1976D2',
  },
  inspection: {
    type: 'inspection',
    label: 'Inspection',
    color: '#757575',
  },
};

// ============================================================================
// Status Filters
// ============================================================================

export const WORK_ORDER_STATUSES = {
  all: { label: 'All', value: '' },
  open: { label: 'Open', value: 'open' },
  inProgress: { label: 'In Progress', value: 'in_progress' },
  completed: { label: 'Done', value: 'completed' },
};

export const ASSET_STATUSES = {
  all: { label: 'All', value: '' },
  operational: { label: 'Operational', value: 'operational' },
  limited: { label: 'Limited', value: 'limited' },
  down: { label: 'Down', value: 'down' },
};

// ============================================================================
// Priority Levels
// ============================================================================

export const PRIORITIES = {
  emergency: { label: 'Emergency', value: 'emergency', color: '#D32F2F' },
  high: { label: 'High', value: 'high', color: '#F57C00' },
  medium: { label: 'Medium', value: 'medium', color: '#FBC02D' },
  low: { label: 'Low', value: 'low', color: '#4CAF50' },
};

// ============================================================================
// Failure Types
// ============================================================================

export const FAILURE_TYPES = {
  none: { label: 'None', value: 'none' },
  woreOut: { label: 'Wore Out', value: 'wore_out' },
  broke: { label: 'Broke', value: 'broke' },
  unknown: { label: 'Unknown', value: 'unknown' },
};

// ============================================================================
// Test IDs (for consistent selectors)
// ============================================================================

export const TEST_IDS = {
  // Login Screen
  LOGIN_EMAIL_INPUT: 'login-email-input',
  LOGIN_PASSWORD_INPUT: 'login-password-input',
  LOGIN_SUBMIT_BUTTON: 'login-submit-button',
  LOGIN_ERROR_MESSAGE: 'login-error-message',
  LOGIN_OFFLINE_BANNER: 'login-offline-banner',

  // Navigation
  TAB_HOME: 'tab-home',
  TAB_ASSETS: 'tab-assets',
  TAB_WORK_ORDERS: 'tab-work-orders',
  TAB_QUICK_LOG: 'tab-quick-log',

  // Home Screen
  HOME_SYNC_CARD: 'home-sync-card',
  HOME_SYNC_STATUS: 'home-sync-status',
  HOME_PENDING_COUNT: 'home-pending-count',
  HOME_QUICK_STATS: 'home-quick-stats',
  HOME_GREETING: 'home-greeting',

  // Quick Log Screen
  QUICK_LOG_RECENT_ASSETS: 'quick-log-recent-assets',
  QUICK_LOG_ASSET_PICKER: 'quick-log-asset-picker',
  QUICK_LOG_ACTION_EMERGENCY: 'quick-log-action-emergency',
  QUICK_LOG_ACTION_MAINTENANCE: 'quick-log-action-maintenance',
  QUICK_LOG_ACTION_INSPECTION: 'quick-log-action-inspection',
  QUICK_LOG_NOTE_INPUT: 'quick-log-note-input',
  QUICK_LOG_SUBMIT_BUTTON: 'quick-log-submit-button',
  QUICK_LOG_UNENRICHED_BADGE: 'quick-log-unenriched-badge',

  // Work Order List Screen
  WORK_ORDER_LIST: 'work-order-list',
  WORK_ORDER_SEARCH: 'work-order-search',
  WORK_ORDER_FILTER_ALL: 'work-order-filter-all',
  WORK_ORDER_FILTER_OPEN: 'work-order-filter-open',
  WORK_ORDER_FILTER_IN_PROGRESS: 'work-order-filter-in-progress',
  WORK_ORDER_FILTER_COMPLETED: 'work-order-filter-completed',
  WORK_ORDER_CREATE_BUTTON: 'work-order-create-button',
  WORK_ORDER_CARD: 'work-order-card',

  // Create Work Order Screen
  CREATE_WO_TITLE_INPUT: 'create-wo-title-input',
  CREATE_WO_ASSET_PICKER: 'create-wo-asset-picker',
  CREATE_WO_PRIORITY_PICKER: 'create-wo-priority-picker',
  CREATE_WO_DESCRIPTION_INPUT: 'create-wo-description-input',
  CREATE_WO_SUBMIT_BUTTON: 'create-wo-submit-button',

  // Work Order Detail Screen
  WO_DETAIL_STATUS: 'wo-detail-status',
  WO_DETAIL_PRIORITY: 'wo-detail-priority',
  WO_DETAIL_START_BUTTON: 'wo-detail-start-button',
  WO_DETAIL_COMPLETE_BUTTON: 'wo-detail-complete-button',
  WO_DETAIL_TIMER: 'wo-detail-timer',
  WO_DETAIL_FAILURE_TYPE: 'wo-detail-failure-type',
  WO_DETAIL_COMPLETION_NOTES: 'wo-detail-completion-notes',
  WO_DETAIL_SIGNATURE_BUTTON: 'wo-detail-signature-button',
  WO_DETAIL_SIGNATURE_CAPTURED: 'wo-detail-signature-captured',
  WO_DETAIL_SUBMIT_COMPLETION: 'wo-detail-submit-completion',
  WO_DETAIL_VERIFICATION_CODE: 'wo-detail-verification-code',

  // Asset List Screen
  ASSET_LIST: 'asset-list',
  ASSET_SEARCH: 'asset-search',
  ASSET_FILTER_ALL: 'asset-filter-all',
  ASSET_FILTER_OPERATIONAL: 'asset-filter-operational',
  ASSET_FILTER_LIMITED: 'asset-filter-limited',
  ASSET_FILTER_DOWN: 'asset-filter-down',
  ASSET_CARD: 'asset-card',

  // Asset Detail Screen
  ASSET_DETAIL_STATUS: 'asset-detail-status',
  ASSET_DETAIL_METER_READING: 'asset-detail-meter-reading',
  ASSET_DETAIL_METER_INPUT: 'asset-detail-meter-input',
  ASSET_DETAIL_RECORD_BUTTON: 'asset-detail-record-button',

  // Settings Screen
  SETTINGS_USER_NAME: 'settings-user-name',
  SETTINGS_USER_EMAIL: 'settings-user-email',
  SETTINGS_USER_ROLE: 'settings-user-role',
  SETTINGS_SYNC_STATUS: 'settings-sync-status',
  SETTINGS_SYNC_DETAILS: 'settings-sync-details',
  SETTINGS_LOGOUT_BUTTON: 'settings-logout-button',
  SETTINGS_LOGOUT_CONFIRM: 'settings-logout-confirm',
};

// ============================================================================
// Factory Functions
// ============================================================================

let idCounter = 0;

/** Generate a unique ID */
export function generateId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

/** Reset ID counter (call in beforeEach) */
export function resetIdCounter(): void {
  idCounter = 0;
}

/** Create a test work order with overrides */
export function createTestWorkOrder(
  overrides: Partial<typeof TEST_WORK_ORDERS.openHighPriority> = {}
) {
  return {
    id: generateId('wo'),
    woNumber: `WO-TEST-${Date.now()}`,
    title: 'Test Work Order',
    description: 'Test description',
    priority: 'medium' as const,
    status: 'open' as const,
    assetId: 'asset-001',
    assetName: 'CAT 320 Excavator',
    assignedTo: 'user-001',
    createdBy: 'user-001',
    dueDate: new Date(Date.now() + 86400000),
    isOverdue: false,
    ...overrides,
  };
}

/** Create a test asset with overrides */
export function createTestAsset(overrides: Partial<typeof TEST_ASSETS.excavator> = {}) {
  return {
    id: generateId('asset'),
    assetNumber: `TEST-${Date.now()}`,
    name: 'Test Asset',
    description: 'Test asset description',
    category: 'Test Category',
    status: 'operational' as const,
    locationDescription: 'Test Location',
    meterType: null,
    meterUnit: null,
    meterCurrentReading: null,
    ...overrides,
  };
}
