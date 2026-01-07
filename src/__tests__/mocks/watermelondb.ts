/**
 * WatermelonDB mock for unit testing
 *
 * Mocks the database, collections, queries, and model operations
 * without requiring actual SQLite.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

type SyncRecordType = 'work_orders' | 'assets' | 'meter_readings' | 'work_order_photos';

type MockRecord = Record<string, unknown> & {
  id: string;
  _raw: { id: string };
  localSyncStatus: string;
  serverUpdatedAt: number | null;
  localUpdatedAt: number;
  update: jest.Mock;
};

type MockQuery = {
  fetch: jest.Mock;
  fetchCount: jest.Mock;
};

type MockCollection = {
  query: jest.Mock;
  create: jest.Mock;
  find: jest.Mock;
};

// In-memory storage for mock data
const mockDatabaseStore: Map<SyncRecordType, MockRecord[]> = new Map();

/**
 * Create a mock WatermelonDB record
 */
export function createMockRecord(
  tableName: SyncRecordType,
  data: Partial<MockRecord> = {}
): MockRecord {
  const id = data.id || `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const record: MockRecord = {
    id,
    _raw: { id },
    localSyncStatus: 'synced',
    serverUpdatedAt: null,
    localUpdatedAt: Date.now(),
    ...data,
    update: jest.fn().mockImplementation(async (updater: (r: MockRecord) => void) => {
      updater(record);
      return record;
    }),
  };

  // Store in mock database
  const collection = mockDatabaseStore.get(tableName) || [];
  collection.push(record);
  mockDatabaseStore.set(tableName, collection);

  return record;
}

/**
 * Create a mock query result
 */
export function createMockQuery(records: MockRecord[]): MockQuery {
  return {
    fetch: jest.fn().mockResolvedValue(records),
    fetchCount: jest.fn().mockResolvedValue(records.length),
  };
}

/**
 * Create a mock collection
 */
export function createMockCollection(tableName: SyncRecordType): MockCollection {
  return {
    query: jest.fn().mockImplementation((..._conditions: any[]) => {
      const records = mockDatabaseStore.get(tableName) || [];
      return createMockQuery(records);
    }),
    create: jest.fn().mockImplementation(async (creator: (r: MockRecord) => void) => {
      const record = createMockRecord(tableName, {});
      creator(record);
      return record;
    }),
    find: jest.fn().mockImplementation(async (id: string) => {
      const records = mockDatabaseStore.get(tableName) || [];
      const found = records.find(r => r.id === id);
      if (!found) throw new Error(`Record ${id} not found`);
      return found;
    }),
  };
}

/**
 * Create the mock database
 */
export function createMockDatabase(): {
  get: jest.Mock;
  write: jest.Mock;
} {
  const collections: Map<string, MockCollection> = new Map();

  return {
    get: jest.fn().mockImplementation((tableName: SyncRecordType) => {
      if (!collections.has(tableName)) {
        collections.set(tableName, createMockCollection(tableName));
      }
      return collections.get(tableName);
    }),
    write: jest.fn().mockImplementation(async <T>(callback: () => Promise<T>) => {
      return await callback();
    }),
  };
}

/**
 * Clear all mock data between tests
 */
export function clearMockDatabase(): void {
  mockDatabaseStore.clear();
}

/**
 * Get mock database contents for assertions
 */
export function getMockDatabaseContents(tableName: SyncRecordType): MockRecord[] {
  return mockDatabaseStore.get(tableName) || [];
}

/**
 * Set mock database contents for test setup
 */
export function setMockDatabaseContents(tableName: SyncRecordType, records: MockRecord[]): void {
  mockDatabaseStore.set(tableName, records);
}

// Export mock database instance
export const mockDatabase = createMockDatabase();

// Mock the Q query builder
export const Q = {
  where: jest.fn().mockImplementation((field: string, value: unknown) => ({ field, value })),
  on: jest.fn(),
  and: jest.fn(),
  or: jest.fn(),
  eq: jest.fn(),
  gt: jest.fn(),
  gte: jest.fn(),
  lt: jest.fn(),
  lte: jest.fn(),
  notEq: jest.fn(),
  oneOf: jest.fn(),
  notIn: jest.fn(),
  between: jest.fn(),
  like: jest.fn(),
  notLike: jest.fn(),
  sanitizeLikeString: jest.fn((str: string) => str),
};
