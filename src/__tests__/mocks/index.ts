/**
 * Centralized mock module registration
 * Import this file to enable all mocks
 *
 * Note: jest.mock() is hoisted to the top of the file, so we must
 * define mocks inline rather than referencing imported variables.
 */

// Mock expo modules first
jest.mock('expo', () => ({}));

jest.mock('expo/src/winter/runtime.native', () => ({}));

jest.mock('expo/src/winter/installGlobal', () => ({
  install: jest.fn(),
}));

// Mock WatermelonDB - Q query builder and Database must be defined inline
jest.mock('@nozbe/watermelondb', () => {
  const mockQ = {
    where: jest.fn(() => mockQ),
    eq: jest.fn((value: unknown) => ['eq', value]),
    notEq: jest.fn((value: unknown) => ['notEq', value]),
    gt: jest.fn((value: unknown) => ['gt', value]),
    gte: jest.fn((value: unknown) => ['gte', value]),
    lt: jest.fn((value: unknown) => ['lt', value]),
    lte: jest.fn((value: unknown) => ['lte', value]),
    oneOf: jest.fn((values: unknown[]) => ['oneOf', values]),
    notIn: jest.fn((values: unknown[]) => ['notIn', values]),
    between: jest.fn((a: unknown, b: unknown) => ['between', a, b]),
    like: jest.fn((value: string) => ['like', value]),
    notLike: jest.fn((value: string) => ['notLike', value]),
    sanitizeLikeString: jest.fn((s: string) => s),
    and: jest.fn((...clauses: unknown[]) => ['and', ...clauses]),
    or: jest.fn((...clauses: unknown[]) => ['or', ...clauses]),
    sortBy: jest.fn((column: string, order?: string) => ['sortBy', column, order]),
    take: jest.fn((count: number) => ['take', count]),
    skip: jest.fn((count: number) => ['skip', count]),
    experimentalJoinTables: jest.fn((tables: string[]) => ['join', tables]),
    experimentalNestedJoin: jest.fn((from: string, to: string) => ['nestedJoin', from, to]),
    on: jest.fn((table: string, column: string, value: unknown) => ['on', table, column, value]),
  };

  return {
    Database: jest.fn().mockImplementation(() => ({
      get: jest.fn().mockReturnValue({
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue([]),
          fetchCount: jest.fn().mockResolvedValue(0),
          observe: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
        }),
        find: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'new-id' }),
      }),
      write: jest.fn().mockImplementation((fn: () => Promise<unknown>) => fn()),
      batch: jest.fn().mockResolvedValue(undefined),
      action: jest.fn().mockImplementation((fn: () => Promise<unknown>) => fn()),
    })),
    Q: mockQ,
    Model: class MockModel {
      id = 'mock-id';
      _raw = { id: 'mock-id' };
    },
  };
});

jest.mock('@nozbe/watermelondb/decorators', () => ({
  field: () => () => {},
  text: () => () => {},
  children: () => () => {},
  relation: () => () => {},
  writer: () => () => {},
  reader: () => () => {},
  lazy: () => () => {},
  date: () => () => {},
  readonly: () => () => {},
  nochange: () => () => {},
  immutableRelation: () => () => {},
}));

// Mock database module
jest.mock('@/database', () => ({
  database: {
    get: jest.fn().mockReturnValue({
      query: jest.fn().mockReturnValue({
        fetch: jest.fn().mockResolvedValue([]),
        fetchCount: jest.fn().mockResolvedValue(0),
        observe: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
      }),
      find: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'new-id' }),
    }),
    write: jest.fn().mockImplementation((fn: () => Promise<unknown>) => fn()),
    batch: jest.fn().mockResolvedValue(undefined),
    action: jest.fn().mockImplementation((fn: () => Promise<unknown>) => fn()),
  },
}));

// Mock Supabase client
jest.mock('@/services/auth/supabase-client', () => {
  const mockSupabase = {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      refreshSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn().mockImplementation(resolve => resolve({ data: [], error: null, count: 0 })),
    }),
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
        getPublicUrl: jest
          .fn()
          .mockReturnValue({ data: { publicUrl: 'https://example.com/image.jpg' } }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    getSupabaseClient: () => mockSupabase,
    supabase: mockSupabase,
  };
});

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    details: { isConnectionExpensive: false },
  }),
  addEventListener: jest.fn().mockReturnValue(jest.fn()),
  useNetInfo: jest.fn().mockReturnValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
  NetInfoStateType: {
    unknown: 'unknown',
    none: 'none',
    cellular: 'cellular',
    wifi: 'wifi',
    bluetooth: 'bluetooth',
    ethernet: 'ethernet',
    wimax: 'wimax',
    vpn: 'vpn',
    other: 'other',
  },
}));

// Mock AsyncStorage - use a module-level storage map that persists
// and methods that don't get cleared by jest.clearAllMocks()
const mockAsyncStorageData = new Map<string, string>();

const mockAsyncStorageImpl = {
  getItem: (key: string) => Promise.resolve(mockAsyncStorageData.get(key) ?? null),
  setItem: (key: string, value: string) => {
    mockAsyncStorageData.set(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    mockAsyncStorageData.delete(key);
    return Promise.resolve();
  },
  clear: () => {
    mockAsyncStorageData.clear();
    return Promise.resolve();
  },
  getAllKeys: () => Promise.resolve(Array.from(mockAsyncStorageData.keys())),
  multiGet: (keys: string[]) =>
    Promise.resolve(keys.map(k => [k, mockAsyncStorageData.get(k) ?? null])),
  multiSet: (pairs: [string, string][]) => {
    pairs.forEach(([k, v]) => mockAsyncStorageData.set(k, v));
    return Promise.resolve();
  },
  multiRemove: (keys: string[]) => {
    keys.forEach(k => mockAsyncStorageData.delete(k));
    return Promise.resolve();
  },
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: mockAsyncStorageImpl,
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-background-fetch
jest.mock('expo-background-fetch', () => ({
  BackgroundFetchStatus: {
    Available: 1,
    Restricted: 2,
    Denied: 3,
  },
  BackgroundFetchResult: {
    NewData: 1,
    NoData: 2,
    Failed: 3,
  },
  getStatusAsync: jest.fn().mockResolvedValue(1), // Available
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-task-manager
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
  isTaskDefined: jest.fn().mockReturnValue(true),
  getTaskOptionsAsync: jest.fn().mockResolvedValue(null),
  getRegisteredTasksAsync: jest.fn().mockResolvedValue([]),
}));

// Mock expo-file-system
// Note: paths must match what tests expect (e.g., sync-diagnostics.test.ts uses /cache/ and /documents/)
jest.mock('expo-file-system', () => ({
  documentDirectory: '/documents/',
  cacheDirectory: '/cache/',
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 1024, isDirectory: false }),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  readDirectoryAsync: jest.fn().mockResolvedValue([]),
  copyAsync: jest.fn().mockResolvedValue(undefined),
  moveAsync: jest.fn().mockResolvedValue(undefined),
  downloadAsync: jest.fn().mockResolvedValue({ uri: 'file:///mock/download' }),
}));

// Mock expo-file-system/legacy (used by sync-diagnostics)
// Uses same paths as expo-file-system for consistency
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/cache/',
  documentDirectory: '/documents/',
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  isDevice: true,
  brand: 'MockBrand',
  manufacturer: 'MockManufacturer',
  modelName: 'MockModel',
  modelId: 'mock-model-id',
  designName: 'mock-design',
  productName: 'MockProduct',
  deviceYearClass: 2024,
  totalMemory: 8 * 1024 * 1024 * 1024, // 8GB
  supportedCpuArchitectures: ['arm64'],
  osName: 'Android',
  osVersion: '14',
  osBuildId: 'mock-build-id',
  osInternalBuildId: 'mock-internal-build-id',
  osBuildFingerprint: 'mock-fingerprint',
  platformApiLevel: 34,
  deviceName: 'Mock Device',
  DeviceType: {
    UNKNOWN: 0,
    PHONE: 1,
    TABLET: 2,
    DESKTOP: 3,
    TV: 4,
  },
  getDeviceTypeAsync: jest.fn().mockResolvedValue(1), // PHONE
  getUptimeAsync: jest.fn().mockResolvedValue(86400000), // 1 day
  getMaxMemoryAsync: jest.fn().mockResolvedValue(8 * 1024 * 1024 * 1024),
  isRootedExperimentalAsync: jest.fn().mockResolvedValue(false),
  isSideLoadingEnabledAsync: jest.fn().mockResolvedValue(false),
  getPlatformFeaturesAsync: jest.fn().mockResolvedValue([]),
}));

// Mock expo-application
jest.mock('expo-application', () => ({
  applicationName: 'QuarryCMMS',
  applicationId: 'com.quarry.cmms',
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '1',
  androidId: 'mock-android-id',
  getIosIdForVendorAsync: jest.fn().mockResolvedValue('mock-ios-vendor-id'),
  getInstallReferrerAsync: jest.fn().mockResolvedValue(null),
  getLastUpdateTimeAsync: jest.fn().mockResolvedValue(Date.now()),
  getInstallationTimeAsync: jest.fn().mockResolvedValue(Date.now() - 86400000),
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setContext: jest.fn(),
  addBreadcrumb: jest.fn(),
  startSpan: jest.fn((_options: unknown, callback: (span: { setStatus: jest.Mock }) => unknown) =>
    callback({ setStatus: jest.fn() })
  ),
  startInactiveSpan: jest.fn(() => ({ end: jest.fn() })),
  withScope: jest.fn((callback: (scope: { setLevel: jest.Mock; setExtra: jest.Mock }) => unknown) =>
    callback({ setLevel: jest.fn(), setExtra: jest.fn() })
  ),
  Severity: { Info: 'info', Warning: 'warning', Error: 'error' },
}));

// Export helper functions for tests that need to manipulate mocks
export const getMockSupabase = (): {
  auth: {
    getSession: jest.Mock;
    signInWithPassword: jest.Mock;
    signOut: jest.Mock;
  };
  from: jest.Mock;
  storage: { from: jest.Mock };
} => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const supabaseModule = require('@/services/auth/supabase-client');
  return supabaseModule.supabase;
};

export const getMockDatabase = (): {
  get: jest.Mock;
  write: jest.Mock;
  batch: jest.Mock;
} => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dbModule = require('@/database');
  return dbModule.database;
};

export const getMockNetInfo = (): {
  fetch: jest.Mock;
  addEventListener: jest.Mock;
} => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-community/netinfo');
};

export const getMockAsyncStorage = (): {
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
  clear: jest.Mock;
} => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-async-storage/async-storage').default;
};
