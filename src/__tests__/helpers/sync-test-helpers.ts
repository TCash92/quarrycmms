/**
 * Test helpers for sync service tests
 *
 * Provides factory functions for creating test data matching
 * the exact types used in the sync services.
 */

import type { WorkOrderRow, AssetRow, MeterReadingRow } from '@/services/sync/sync-queries';

// Base timestamp for deterministic tests (2024-01-01T00:00:00.000Z)
export const BASE_TIMESTAMP = 1704067200000;
export const BASE_ISO = '2024-01-01T00:00:00.000Z';

// Time constants for testing
export const ONE_MINUTE = 60 * 1000;
export const FIVE_MINUTES = 5 * 60 * 1000;
export const ONE_HOUR = 60 * 60 * 1000;
export const ONE_DAY = 24 * 60 * 60 * 1000;

/**
 * Generate a unique ID for test records
 */
let idCounter = 0;
export function generateId(prefix: string = 'test'): string {
  return `${prefix}_${++idCounter}_${Date.now()}`;
}

/**
 * Reset the ID counter between tests
 */
export function resetIdCounter(): void {
  idCounter = 0;
}

// ============================================================================
// Local Model Factories (WatermelonDB format - camelCase)
// ============================================================================

export interface MockWorkOrder {
  id: string;
  serverId: string | null;
  woNumber: string;
  siteId: string;
  assetId: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'open' | 'in_progress' | 'completed';
  assignedTo: string | null;
  createdBy: string;
  dueDate: number | null;
  startedAt: number | null;
  completedAt: number | null;
  completedBy: string | null;
  completionNotes: string | null;
  failureType: 'none' | 'wore_out' | 'broke' | 'unknown' | null;
  timeSpentMinutes: number | null;
  signatureImageUrl: string | null;
  signatureTimestamp: number | null;
  signatureHash: string | null;
  voiceNoteUrl: string | null;
  voiceNoteConfidence: string | null;
  needsEnrichment: boolean;
  isQuickLog: boolean;
  localSyncStatus: 'pending' | 'synced' | 'conflict';
  localUpdatedAt: number;
  serverUpdatedAt: number | null;
  update: jest.Mock;
}

/**
 * Create a mock WorkOrder model (local WatermelonDB format)
 */
export function createMockWorkOrder(overrides: Partial<MockWorkOrder> = {}): MockWorkOrder {
  const record: MockWorkOrder = {
    id: generateId('wo_local'),
    serverId: null,
    woNumber: 'WO-001',
    siteId: 'site-001',
    assetId: 'asset-001',
    title: 'Test Work Order',
    description: 'Test description',
    priority: 'medium',
    status: 'open',
    assignedTo: 'user-001',
    createdBy: 'user-002',
    dueDate: null,
    startedAt: null,
    completedAt: null,
    completedBy: null,
    completionNotes: null,
    failureType: null,
    timeSpentMinutes: null,
    signatureImageUrl: null,
    signatureTimestamp: null,
    signatureHash: null,
    voiceNoteUrl: null,
    voiceNoteConfidence: null,
    needsEnrichment: false,
    isQuickLog: false,
    localSyncStatus: 'synced',
    localUpdatedAt: BASE_TIMESTAMP,
    serverUpdatedAt: BASE_TIMESTAMP,
    update: jest.fn().mockImplementation(async function (
      this: MockWorkOrder,
      updater: (r: MockWorkOrder) => void
    ) {
      updater(this);
      return this;
    }),
    ...overrides,
  };

  // Bind the update function to the record
  record.update = record.update.bind(record);

  return record;
}

export interface MockAsset {
  id: string;
  serverId: string | null;
  siteId: string;
  assetNumber: string;
  name: string;
  description: string | null;
  category: string;
  status: 'operational' | 'limited' | 'down';
  locationDescription: string | null;
  photoUrl: string | null;
  meterType: string | null;
  meterUnit: string | null;
  meterCurrentReading: number | null;
  localSyncStatus: 'pending' | 'synced' | 'conflict';
  localUpdatedAt: number;
  serverUpdatedAt: number | null;
  update: jest.Mock;
}

/**
 * Create a mock Asset model (local WatermelonDB format)
 */
export function createMockAsset(overrides: Partial<MockAsset> = {}): MockAsset {
  const record: MockAsset = {
    id: generateId('asset_local'),
    serverId: null,
    siteId: 'site-001',
    assetNumber: 'AST-001',
    name: 'Test Asset',
    description: 'Test asset description',
    category: 'equipment',
    status: 'operational',
    locationDescription: 'Pit 1',
    photoUrl: null,
    meterType: 'hours',
    meterUnit: 'hrs',
    meterCurrentReading: 1000,
    localSyncStatus: 'synced',
    localUpdatedAt: BASE_TIMESTAMP,
    serverUpdatedAt: BASE_TIMESTAMP,
    update: jest.fn().mockImplementation(async function (
      this: MockAsset,
      updater: (r: MockAsset) => void
    ) {
      updater(this);
      return this;
    }),
    ...overrides,
  };

  record.update = record.update.bind(record);
  return record;
}

export interface MockMeterReading {
  id: string;
  serverId: string | null;
  assetId: string;
  readingValue: number;
  readingDate: number;
  recordedBy: string;
  notes: string | null;
  localSyncStatus: 'pending' | 'synced' | 'conflict';
  localUpdatedAt: number;
  serverUpdatedAt: number | null;
  update: jest.Mock;
}

/**
 * Create a mock MeterReading model (local WatermelonDB format)
 */
export function createMockMeterReading(
  overrides: Partial<MockMeterReading> = {}
): MockMeterReading {
  const record: MockMeterReading = {
    id: generateId('mr_local'),
    serverId: null,
    assetId: 'asset-001',
    readingValue: 1000,
    readingDate: BASE_TIMESTAMP,
    recordedBy: 'user-001',
    notes: null,
    localSyncStatus: 'synced',
    localUpdatedAt: BASE_TIMESTAMP,
    serverUpdatedAt: BASE_TIMESTAMP,
    update: jest.fn().mockImplementation(async function (
      this: MockMeterReading,
      updater: (r: MockMeterReading) => void
    ) {
      updater(this);
      return this;
    }),
    ...overrides,
  };

  record.update = record.update.bind(record);
  return record;
}

export interface MockWorkOrderPhoto {
  id: string;
  serverId: string | null;
  workOrderId: string;
  localUri: string | null;
  remoteUrl: string | null;
  caption: string | null;
  takenAt: number | null;
  localSyncStatus: 'pending' | 'synced' | 'conflict';
  localUpdatedAt: number;
  serverUpdatedAt: number | null;
  update: jest.Mock;
}

/**
 * Create a mock WorkOrderPhoto model (local WatermelonDB format)
 */
export function createMockWorkOrderPhoto(
  overrides: Partial<MockWorkOrderPhoto> = {}
): MockWorkOrderPhoto {
  const record: MockWorkOrderPhoto = {
    id: generateId('photo_local'),
    serverId: null,
    workOrderId: 'wo-001',
    localUri: '/local/path/photo.jpg',
    remoteUrl: null,
    caption: 'Test photo',
    takenAt: BASE_TIMESTAMP,
    localSyncStatus: 'synced',
    localUpdatedAt: BASE_TIMESTAMP,
    serverUpdatedAt: BASE_TIMESTAMP,
    update: jest.fn().mockImplementation(async function (
      this: MockWorkOrderPhoto,
      updater: (r: MockWorkOrderPhoto) => void
    ) {
      updater(this);
      return this;
    }),
    ...overrides,
  };

  record.update = record.update.bind(record);
  return record;
}

// ============================================================================
// Server Row Factories (Supabase format - snake_case)
// ============================================================================

/**
 * Create a mock WorkOrderRow (server/Supabase format)
 */
export function createMockWorkOrderRow(overrides: Partial<WorkOrderRow> = {}): WorkOrderRow {
  return {
    id: generateId('wo_server'),
    wo_number: 'WO-001',
    site_id: 'site-001',
    asset_id: 'asset-001',
    title: 'Test Work Order',
    description: 'Test description',
    priority: 'medium',
    status: 'open',
    assigned_to: 'user-001',
    created_by: 'user-002',
    due_date: null,
    started_at: null,
    completed_at: null,
    completed_by: null,
    completion_notes: null,
    failure_type: null,
    time_spent_minutes: null,
    signature_image_url: null,
    signature_timestamp: null,
    signature_hash: null,
    voice_note_url: null,
    voice_note_confidence: null,
    needs_enrichment: false,
    is_quick_log: false,
    created_at: BASE_ISO,
    updated_at: BASE_ISO,
    ...overrides,
  };
}

/**
 * Create a mock AssetRow (server/Supabase format)
 */
export function createMockAssetRow(overrides: Partial<AssetRow> = {}): AssetRow {
  return {
    id: generateId('asset_server'),
    site_id: 'site-001',
    asset_number: 'AST-001',
    name: 'Test Asset',
    description: 'Test asset description',
    category: 'equipment',
    status: 'operational',
    location_description: 'Pit 1',
    photo_url: null,
    meter_type: 'hours',
    meter_unit: 'hrs',
    meter_current_reading: 1000,
    created_at: BASE_ISO,
    updated_at: BASE_ISO,
    ...overrides,
  };
}

/**
 * Create a mock MeterReadingRow (server/Supabase format)
 */
export function createMockMeterReadingRow(
  overrides: Partial<MeterReadingRow> = {}
): MeterReadingRow {
  return {
    id: generateId('mr_server'),
    asset_id: 'asset-001',
    reading_value: 1000,
    reading_date: BASE_ISO,
    recorded_by: 'user-001',
    notes: null,
    created_at: BASE_ISO,
    updated_at: BASE_ISO,
    ...overrides,
  };
}

export interface WorkOrderPhotoRow {
  id: string;
  work_order_id: string;
  local_uri: string | null;
  remote_url: string | null;
  caption: string | null;
  taken_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Create a mock WorkOrderPhotoRow (server/Supabase format)
 */
export function createMockWorkOrderPhotoRow(
  overrides: Partial<WorkOrderPhotoRow> = {}
): WorkOrderPhotoRow {
  return {
    id: generateId('photo_server'),
    work_order_id: 'wo-001',
    local_uri: null,
    remote_url: 'https://storage.example.com/photo.jpg',
    caption: 'Test photo',
    taken_at: BASE_ISO,
    created_at: BASE_ISO,
    updated_at: BASE_ISO,
    ...overrides,
  };
}

// ============================================================================
// Time Manipulation Helpers
// ============================================================================

/**
 * Advance mock time by milliseconds
 */
export function advanceTime(ms: number): number {
  const newTime = Date.now() + ms;
  jest.spyOn(Date, 'now').mockReturnValue(newTime);
  return newTime;
}

/**
 * Set mock time to specific timestamp
 */
export function setTime(timestamp: number): void {
  jest.spyOn(Date, 'now').mockReturnValue(timestamp);
}

/**
 * Reset mock time to base timestamp
 */
export function resetTime(): void {
  jest.spyOn(Date, 'now').mockReturnValue(BASE_TIMESTAMP);
}

/**
 * Convert timestamp to ISO string
 */
export function toISOString(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Convert ISO string to timestamp
 */
export function toTimestamp(iso: string): number {
  return new Date(iso).getTime();
}

// ============================================================================
// Conflict Scenario Builders
// ============================================================================

/**
 * Create a conflict scenario with local pending changes and newer server version
 */
export function createConflictScenario<Local, Remote>(
  createLocal: (overrides?: Partial<Local>) => Local,
  createRemote: (overrides?: Partial<Remote>) => Remote,
  localOverrides: Partial<Local> = {},
  remoteOverrides: Partial<Remote> = {}
): { local: Local; remote: Remote } {
  const local = createLocal({
    localSyncStatus: 'pending',
    serverUpdatedAt: BASE_TIMESTAMP,
    localUpdatedAt: BASE_TIMESTAMP + ONE_HOUR,
    ...localOverrides,
  } as Partial<Local>);

  const remote = createRemote({
    updated_at: toISOString(BASE_TIMESTAMP + 2 * ONE_HOUR), // Server is newer
    ...remoteOverrides,
  } as Partial<Remote>);

  return { local, remote };
}

/**
 * Create a work order conflict scenario
 */
export function createWorkOrderConflict(
  localOverrides: Partial<MockWorkOrder> = {},
  remoteOverrides: Partial<WorkOrderRow> = {}
): { local: MockWorkOrder; remote: WorkOrderRow } {
  return createConflictScenario(
    createMockWorkOrder,
    createMockWorkOrderRow,
    localOverrides,
    remoteOverrides
  );
}

/**
 * Create an asset conflict scenario
 */
export function createAssetConflict(
  localOverrides: Partial<MockAsset> = {},
  remoteOverrides: Partial<AssetRow> = {}
): { local: MockAsset; remote: AssetRow } {
  return createConflictScenario(
    createMockAsset,
    createMockAssetRow,
    localOverrides,
    remoteOverrides
  );
}

/**
 * Create a meter reading conflict scenario
 */
export function createMeterReadingConflict(
  localOverrides: Partial<MockMeterReading> = {},
  remoteOverrides: Partial<MeterReadingRow> = {}
): { local: MockMeterReading; remote: MeterReadingRow } {
  return createConflictScenario(
    createMockMeterReading,
    createMockMeterReadingRow,
    localOverrides,
    remoteOverrides
  );
}

// ============================================================================
// Error Factories
// ============================================================================

/**
 * Create a mock network error
 */
export function createNetworkError(message: string = 'Network request failed'): Error {
  const error = new Error(message);
  error.name = 'NetworkError';
  return error;
}

/**
 * Create a mock HTTP error
 */
export function createHttpError(
  status: number,
  message: string = 'HTTP Error'
): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

/**
 * Create a mock Supabase error
 */
export function createSupabaseError(
  code: string,
  message: string,
  status?: number
): { code: string; message: string; status?: number } {
  return { code, message, status };
}

/**
 * Create a mock timeout error
 */
export function createTimeoutError(message: string = 'Request timeout'): Error {
  const error = new Error(message);
  error.name = 'TimeoutError';
  return error;
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that a conflict result has expected escalations
 */
export function expectEscalations(escalations: string[], expected: string[]): void {
  expect(escalations.sort()).toEqual(expected.sort());
}

/**
 * Assert that a conflict result has no escalations
 */
export function expectNoEscalations(escalations: string[]): void {
  expect(escalations).toHaveLength(0);
}
