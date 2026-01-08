/**
 * WatermelonDB web stub - main module
 *
 * Provides no-op implementations for web platform E2E testing.
 */

// Mock Model base class
class Model {
  static table = '';
  static associations = {};

  constructor() {
    this.id = '';
    this._raw = {};
  }

  async update(updater) {
    updater(this);
    return this;
  }

  async destroyPermanently() {}
}

// Helper to handle RxJS-style subscribe that accepts either a function or {next, error} object
function createSubscription(callback, value) {
  // Schedule callback to next tick to mimic async behavior
  setTimeout(() => {
    if (typeof callback === 'function') {
      callback(value);
    } else if (callback && typeof callback.next === 'function') {
      callback.next(value);
    }
  }, 0);
  return { unsubscribe: () => {} };
}

// Mock Database class
class Database {
  constructor() {
    this.collections = new Map();
  }

  get(tableName) {
    return {
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
        const record = new Model();
        creator(record);
        return record;
      },
    };
  }

  async write(callback) {
    return await callback();
  }

  async batch() {}

  async action(callback) {
    return await callback();
  }
}

// Mock Query class
class Query {
  constructor() {
    this.conditions = [];
  }

  extend() {
    return this;
  }

  async fetch() {
    return [];
  }

  async fetchCount() {
    return 0;
  }

  observe() {
    return {
      subscribe: (callbacks) => {
        if (callbacks.next) callbacks.next([]);
        return { unsubscribe: () => {} };
      },
    };
  }
}

// Mock Relation placeholder
class Relation {
  constructor() {
    this.id = '';
  }

  async fetch() {
    return null;
  }
}

// Mock Q (query builder) - Returns QCondition objects compatible with index.web.ts
const Q = {
  // Sort order constants (matching WatermelonDB)
  asc: 'asc',
  desc: 'desc',
  // Q.where(column, value) or Q.where(column, comparisonObj)
  // When comparisonObj is from Q.eq/Q.notEq/etc, it has { op, value }
  where: (column, valueOrComparison) => {
    // Check if it's a comparison object from Q.eq(), Q.notEq(), etc.
    if (valueOrComparison && typeof valueOrComparison === 'object' && 'op' in valueOrComparison) {
      return { type: 'where', column, comparison: valueOrComparison.op, value: valueOrComparison.value };
    }
    // Simple equality: Q.where('status', 'pending')
    return { type: 'where', column, value: valueOrComparison };
  },
  // Comparison operators - functions that return { op, value } objects
  eq: (value) => ({ op: 'eq', value }),
  notEq: (value) => ({ op: 'notEq', value }),
  gt: (value) => ({ op: 'gt', value }),
  gte: (value) => ({ op: 'gte', value }),
  lt: (value) => ({ op: 'lt', value }),
  lte: (value) => ({ op: 'lte', value }),
  like: (value) => ({ op: 'like', value }),
  notLike: (value) => ({ op: 'notLike', value }),
  oneOf: (values) => ({ op: 'oneOf', value: values }),
  notIn: (values) => ({ op: 'notIn', value: values }),
  between: (min, max) => ({ op: 'between', value: { min, max } }),
  // Logical operators
  and: (...conditions) => ({ type: 'and', conditions }),
  or: (...conditions) => ({ type: 'or', conditions }),
  // Other query modifiers
  on: (table, column, value) => ({ type: 'on', table, column, value }),
  sortBy: (column, order = 'asc') => ({ type: 'sortBy', column, value: order }),
  take: (count) => ({ type: 'take', value: count }),
  skip: (count) => ({ type: 'skip', value: count }),
  experimentalJoinTables: (...tables) => ({ type: 'join', tables }),
  unsafeSqlQuery: (sql) => ({ type: 'sql', sql }),
};

// Mock schema builders
function appSchema(schema) {
  return schema;
}

function tableSchema(table) {
  return table;
}

module.exports = {
  Model,
  Database,
  Query,
  Relation,
  Q,
  appSchema,
  tableSchema,
};
