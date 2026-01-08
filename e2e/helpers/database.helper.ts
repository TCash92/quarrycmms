/**
 * Database Seeding Helper for E2E Tests
 *
 * Seeds the mock WatermelonDB InMemoryStore with test data.
 */

import { Page } from '@playwright/test';

// Test data in snake_case format (matching database schema)
const TEST_WORK_ORDERS = [
  {
    id: 'wo-001',
    server_id: 'server-wo-001',
    wo_number: 'WO-20240115-0001',
    site_id: 'site-001',
    asset_id: 'asset-001',
    title: 'Replace hydraulic hose',
    description: 'Hydraulic hose leaking on boom cylinder',
    priority: 'high',
    status: 'open',
    assigned_to: 'user-001',
    created_by: 'user-002',
    due_date: Date.now() + 86400000,
    started_at: null,
    completed_at: null,
    completed_by: null,
    completion_notes: null,
    failure_type: null,
    time_spent_minutes: null,
    signature_image_url: null,
    signature_timestamp: null,
    signature_hash: null,
    verification_code: null,
    voice_note_url: null,
    voice_note_confidence: null,
    needs_enrichment: false,
    is_quick_log: false,
    local_sync_status: 'synced',
    local_updated_at: Date.now(),
    server_updated_at: Date.now(),
    created_at: Date.now() - 86400000,
  },
  {
    id: 'wo-002',
    server_id: 'server-wo-002',
    wo_number: 'WO-20240115-0002',
    site_id: 'site-001',
    asset_id: 'asset-002',
    title: 'PM Service - 500 hours',
    description: 'Scheduled preventive maintenance',
    priority: 'medium',
    status: 'in_progress',
    assigned_to: 'user-001',
    created_by: 'user-002',
    due_date: Date.now() + 172800000,
    started_at: Date.now() - 3600000,
    completed_at: null,
    completed_by: null,
    completion_notes: null,
    failure_type: null,
    time_spent_minutes: null,
    signature_image_url: null,
    signature_timestamp: null,
    signature_hash: null,
    verification_code: null,
    voice_note_url: null,
    voice_note_confidence: null,
    needs_enrichment: false,
    is_quick_log: false,
    local_sync_status: 'synced',
    local_updated_at: Date.now(),
    server_updated_at: Date.now(),
    created_at: Date.now() - 172800000,
  },
  {
    id: 'wo-003',
    server_id: 'server-wo-003',
    wo_number: 'WO-20240114-0003',
    site_id: 'site-001',
    asset_id: 'asset-001',
    title: 'Inspect bucket teeth',
    description: 'Regular inspection of bucket teeth wear',
    priority: 'low',
    status: 'completed',
    assigned_to: 'user-001',
    created_by: 'user-002',
    due_date: Date.now() - 86400000,
    started_at: Date.now() - 90000000,
    completed_at: Date.now() - 86400000,
    completed_by: 'user-001',
    completion_notes: 'Teeth showing normal wear, no replacement needed',
    failure_type: 'none',
    time_spent_minutes: 45,
    signature_image_url: 'https://example.com/signatures/sig-001.png',
    signature_timestamp: Date.now() - 86400000,
    signature_hash: 'abc123def456',
    verification_code: 'VERIFY-ABC123',
    voice_note_url: null,
    voice_note_confidence: null,
    needs_enrichment: false,
    is_quick_log: false,
    local_sync_status: 'synced',
    local_updated_at: Date.now(),
    server_updated_at: Date.now(),
    created_at: Date.now() - 259200000,
  },
];

const TEST_ASSETS = [
  {
    id: 'asset-001',
    server_id: 'server-asset-001',
    site_id: 'site-001',
    asset_number: 'EXC-001',
    name: 'CAT 320 Excavator',
    description: 'Main excavation unit for primary pit',
    category: 'Heavy Equipment',
    status: 'operational',
    location_description: 'Primary Pit - North Section',
    photo_url: null,
    meter_type: 'hours',
    meter_unit: 'Operating Hours',
    meter_current_reading: 5432,
    local_sync_status: 'synced',
    local_updated_at: Date.now(),
    server_updated_at: Date.now(),
  },
  {
    id: 'asset-002',
    server_id: 'server-asset-002',
    site_id: 'site-001',
    asset_number: 'LDR-002',
    name: 'Komatsu WA380 Loader',
    description: 'Front-end loader for material handling',
    category: 'Heavy Equipment',
    status: 'limited',
    location_description: 'Stockpile Area',
    photo_url: null,
    meter_type: 'hours',
    meter_unit: 'Operating Hours',
    meter_current_reading: 3200,
    local_sync_status: 'synced',
    local_updated_at: Date.now(),
    server_updated_at: Date.now(),
  },
  {
    id: 'asset-003',
    server_id: 'server-asset-003',
    site_id: 'site-001',
    asset_number: 'CRU-003',
    name: 'Primary Jaw Crusher',
    description: 'Main crushing unit',
    category: 'Processing Equipment',
    status: 'down',
    location_description: 'Processing Plant',
    photo_url: null,
    meter_type: null,
    meter_unit: null,
    meter_current_reading: null,
    local_sync_status: 'synced',
    local_updated_at: Date.now(),
    server_updated_at: Date.now(),
  },
];

interface E2EStore {
  seed: (table: string, records: Record<string, unknown>[]) => void;
  reset: () => void;
}

/**
 * Seed the mock database with test work orders
 */
export async function seedWorkOrders(page: Page): Promise<void> {
  await page.evaluate(workOrders => {
    const store = (window as unknown as { __E2E_DB_STORE__: E2EStore }).__E2E_DB_STORE__;
    if (store) {
      store.seed('work_orders', workOrders);
    }
  }, TEST_WORK_ORDERS);
}

/**
 * Seed the mock database with test assets
 */
export async function seedAssets(page: Page): Promise<void> {
  await page.evaluate(assets => {
    const store = (window as unknown as { __E2E_DB_STORE__: E2EStore }).__E2E_DB_STORE__;
    if (store) {
      store.seed('assets', assets);
    }
  }, TEST_ASSETS);
}

/**
 * Seed all test data (work orders and assets)
 */
export async function seedTestData(page: Page): Promise<void> {
  await seedAssets(page);
  await seedWorkOrders(page);
}

/**
 * Reset the mock database (clear all data)
 */
export async function resetDatabase(page: Page): Promise<void> {
  await page.evaluate(() => {
    const store = (window as unknown as { __E2E_DB_STORE__: E2EStore }).__E2E_DB_STORE__;
    if (store) {
      store.reset();
    }
  });
}

/**
 * Add a single work order to the mock database
 */
export async function addWorkOrder(page: Page, workOrder: Record<string, unknown>): Promise<void> {
  await page.evaluate(wo => {
    const store = (window as unknown as { __E2E_DB_STORE__: E2EStore }).__E2E_DB_STORE__;
    if (store) {
      store.seed('work_orders', [wo]);
    }
  }, workOrder);
}

/**
 * Add a single asset to the mock database
 */
export async function addAsset(page: Page, asset: Record<string, unknown>): Promise<void> {
  await page.evaluate(a => {
    const store = (window as unknown as { __E2E_DB_STORE__: E2EStore }).__E2E_DB_STORE__;
    if (store) {
      store.seed('assets', [a]);
    }
  }, asset);
}
