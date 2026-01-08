/**
 * WatermelonDB React hooks web stub
 *
 * Provides mock React hooks for web platform E2E testing.
 */

// Helper to handle RxJS-style subscribe that accepts either a function or {next, error} object
function createSubscription(callback, value) {
  setTimeout(() => {
    if (typeof callback === 'function') {
      callback(value);
    } else if (callback && typeof callback.next === 'function') {
      callback.next(value);
    }
  }, 0);
  return { unsubscribe: () => {} };
}

// Mock useDatabase hook - returns a mock database
function useDatabase() {
  return {
    get: (tableName) => ({
      query: (..._conditions) => ({
        fetch: async () => [],
        fetchCount: async () => 0,
        observe: () => ({
          subscribe: (callback) => createSubscription(callback, []),
        }),
        observeCount: () => ({
          subscribe: (callback) => createSubscription(callback, 0),
        }),
      }),
      find: async () => null,
      create: async (creator) => {
        const record = { id: '', _raw: {} };
        creator(record);
        return record;
      },
    }),
    write: async (callback) => await callback(),
    batch: async () => {},
    action: async (callback) => await callback(),
  };
}

// DatabaseProvider component - just renders children
function DatabaseProvider({ children }) {
  return children;
}

// withDatabase HOC - just returns the component
function withDatabase(Component) {
  return Component;
}

module.exports = {
  useDatabase,
  DatabaseProvider,
  withDatabase,
};
