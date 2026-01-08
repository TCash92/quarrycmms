/**
 * Web-only schema stub for E2E testing
 *
 * Metro bundler automatically resolves this file for web platform.
 * Provides a minimal stub to prevent loading actual WatermelonDB.
 */

// Mock schema that doesn't import WatermelonDB
export const schema = {
  version: 2,
  tables: [
    { name: 'work_orders', columns: [] },
    { name: 'assets', columns: [] },
    { name: 'meter_readings', columns: [] },
    { name: 'work_order_photos', columns: [] },
  ],
};
