/**
 * Supabase client mock for unit testing
 *
 * Mocks authentication, database queries, and storage operations.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

type SupabaseResponse<T> = {
  data: T | null;
  error: { message: string; code?: string; status?: number } | null;
};

// Store mock responses for each table
const mockResponses: Map<string, unknown[]> = new Map();

// Store mock errors for each table
const mockErrors: Map<string, { message: string; code?: string; status?: number }> = new Map();

/**
 * Set mock data for a table (used in test setup)
 */
export function setMockSupabaseData(table: string, data: unknown[]): void {
  mockResponses.set(table, data);
}

/**
 * Set mock error for a table (used in test setup)
 */
export function setMockSupabaseError(
  table: string,
  error: { message: string; code?: string; status?: number }
): void {
  mockErrors.set(table, error);
}

/**
 * Clear all mock Supabase data
 */
export function clearMockSupabaseData(): void {
  mockResponses.clear();
  mockErrors.clear();
}

/**
 * Create a chainable query mock
 */
function createQueryChain(tableName: string): any {
  const chain: any = {};

  const chainMethod = (): any => chain;

  // Query methods
  chain.select = jest.fn().mockReturnValue(chainMethod());
  chain.insert = jest.fn().mockReturnValue(chainMethod());
  chain.upsert = jest.fn().mockReturnValue(chainMethod());
  chain.update = jest.fn().mockReturnValue(chainMethod());
  chain.delete = jest.fn().mockReturnValue(chainMethod());

  // Filter methods
  chain.eq = jest.fn().mockReturnValue(chainMethod());
  chain.neq = jest.fn().mockReturnValue(chainMethod());
  chain.gt = jest.fn().mockReturnValue(chainMethod());
  chain.gte = jest.fn().mockReturnValue(chainMethod());
  chain.lt = jest.fn().mockReturnValue(chainMethod());
  chain.lte = jest.fn().mockReturnValue(chainMethod());
  chain.in = jest.fn().mockReturnValue(chainMethod());
  chain.is = jest.fn().mockReturnValue(chainMethod());
  chain.or = jest.fn().mockReturnValue(chainMethod());
  chain.not = jest.fn().mockReturnValue(chainMethod());

  // Modifier methods
  chain.order = jest.fn().mockReturnValue(chainMethod());
  chain.limit = jest.fn().mockReturnValue(chainMethod());
  chain.range = jest.fn().mockReturnValue(chainMethod());

  // Terminal methods
  chain.single = jest.fn().mockImplementation(async (): Promise<SupabaseResponse<unknown>> => {
    const error = mockErrors.get(tableName);
    if (error) {
      return { data: null, error };
    }
    const data = mockResponses.get(tableName);
    return { data: data?.[0] ?? null, error: null };
  });

  chain.maybeSingle = jest.fn().mockImplementation(async (): Promise<SupabaseResponse<unknown>> => {
    const error = mockErrors.get(tableName);
    if (error) {
      return { data: null, error };
    }
    const data = mockResponses.get(tableName);
    return { data: data?.[0] ?? null, error: null };
  });

  // Make chain itself thenable for array results
  chain.then = (
    resolve: (value: SupabaseResponse<unknown[]>) => void,
    reject?: (error: unknown) => void
  ) => {
    const error = mockErrors.get(tableName);
    if (error) {
      if (reject) reject(error);
      else resolve({ data: null, error });
      return;
    }
    resolve({ data: mockResponses.get(tableName) || [], error: null });
  };

  return chain;
}

/**
 * Create mock Supabase client
 */
export function createMockSupabaseClient(): {
  from: jest.Mock;
  auth: {
    getSession: jest.Mock;
    getUser: jest.Mock;
    signInWithPassword: jest.Mock;
    signOut: jest.Mock;
    onAuthStateChange: jest.Mock;
    refreshSession: jest.Mock;
  };
  storage: {
    from: jest.Mock;
  };
} {
  return {
    from: jest.fn().mockImplementation((table: string) => {
      return createQueryChain(table);
    }),
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: 'mock-user-id', email: 'test@example.com' },
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
          },
        },
        error: null,
      }),
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'mock-user-id', email: 'test@example.com' } },
        error: null,
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: {
          user: { id: 'mock-user-id', email: 'test@example.com' },
          session: { access_token: 'mock-token' },
        },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      refreshSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'new-mock-token',
            refresh_token: 'new-refresh-token',
          },
        },
        error: null,
      }),
    },
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: { path: 'mock/path' }, error: null }),
        download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
        getPublicUrl: jest
          .fn()
          .mockReturnValue({ data: { publicUrl: 'https://mock.url/photo.jpg' } }),
        remove: jest.fn().mockResolvedValue({ data: [], error: null }),
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
  };
}

// Export singleton mock
export const mockSupabaseClient = createMockSupabaseClient();
