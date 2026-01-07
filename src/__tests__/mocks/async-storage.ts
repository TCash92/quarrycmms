/**
 * AsyncStorage mock for unit testing
 *
 * Provides in-memory storage for retry queue and auth token tests.
 */

const mockStorage: Map<string, string> = new Map();

export const mockAsyncStorage = {
  getItem: jest.fn().mockImplementation(async (key: string): Promise<string | null> => {
    return mockStorage.get(key) ?? null;
  }),

  setItem: jest.fn().mockImplementation(async (key: string, value: string): Promise<void> => {
    mockStorage.set(key, value);
  }),

  removeItem: jest.fn().mockImplementation(async (key: string): Promise<void> => {
    mockStorage.delete(key);
  }),

  clear: jest.fn().mockImplementation(async (): Promise<void> => {
    mockStorage.clear();
  }),

  getAllKeys: jest.fn().mockImplementation(async (): Promise<readonly string[]> => {
    return Array.from(mockStorage.keys());
  }),

  multiGet: jest
    .fn()
    .mockImplementation(
      async (keys: readonly string[]): Promise<readonly [string, string | null][]> => {
        return keys.map(key => [key, mockStorage.get(key) ?? null] as [string, string | null]);
      }
    ),

  multiSet: jest
    .fn()
    .mockImplementation(async (keyValuePairs: readonly [string, string][]): Promise<void> => {
      keyValuePairs.forEach(([key, value]) => mockStorage.set(key, value));
    }),

  multiRemove: jest.fn().mockImplementation(async (keys: readonly string[]): Promise<void> => {
    keys.forEach(key => mockStorage.delete(key));
  }),

  multiMerge: jest
    .fn()
    .mockImplementation(async (keyValuePairs: readonly [string, string][]): Promise<void> => {
      keyValuePairs.forEach(([key, value]) => {
        const existing = mockStorage.get(key);
        if (existing) {
          try {
            const merged = { ...JSON.parse(existing), ...JSON.parse(value) };
            mockStorage.set(key, JSON.stringify(merged));
          } catch {
            mockStorage.set(key, value);
          }
        } else {
          mockStorage.set(key, value);
        }
      });
    }),
};

/**
 * Clear storage between tests
 */
export function clearMockAsyncStorage(): void {
  mockStorage.clear();
  jest.clearAllMocks();
}

/**
 * Pre-populate storage for test setup (stores as JSON)
 */
export function setMockStorageData(key: string, value: unknown): void {
  mockStorage.set(key, JSON.stringify(value));
}

/**
 * Pre-populate storage with raw string value
 */
export function setMockStorageRaw(key: string, value: string): void {
  mockStorage.set(key, value);
}

/**
 * Get parsed storage contents for assertions
 */
export function getMockStorageData<T = unknown>(key: string): T | null {
  const value = mockStorage.get(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

/**
 * Get raw storage contents for assertions
 */
export function getMockStorageRaw(key: string): string | null {
  return mockStorage.get(key) ?? null;
}

/**
 * Get all storage keys for debugging
 */
export function getMockStorageKeys(): string[] {
  return Array.from(mockStorage.keys());
}
