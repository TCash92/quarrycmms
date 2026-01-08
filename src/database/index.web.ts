/**
 * Web-only database mock for E2E testing
 *
 * Metro bundler automatically resolves this file for web platform.
 * Provides an in-memory implementation of WatermelonDB without SQLite.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

type TableName = 'work_orders' | 'assets' | 'meter_readings' | 'work_order_photos';

interface RawRecord {
  id: string;
  [key: string]: unknown;
}

type Subscriber<T> = (records: T[]) => void;

// ============================================================================
// In-Memory Data Store
// ============================================================================

class InMemoryStore {
  private data: Map<TableName, Map<string, RawRecord>> = new Map();
  private subscribers: Map<TableName, Set<Subscriber<RawRecord>>> = new Map();

  constructor() {
    this.reset();
  }

  reset(): void {
    this.data = new Map([
      ['work_orders', new Map()],
      ['assets', new Map()],
      ['meter_readings', new Map()],
      ['work_order_photos', new Map()],
    ]);
  }

  getAll(table: TableName): RawRecord[] {
    return Array.from(this.data.get(table)?.values() ?? []);
  }

  get(table: TableName, id: string): RawRecord | undefined {
    return this.data.get(table)?.get(id);
  }

  set(table: TableName, record: RawRecord): void {
    this.data.get(table)?.set(record.id, record);
    this.notify(table);
  }

  delete(table: TableName, id: string): void {
    this.data.get(table)?.delete(id);
    this.notify(table);
  }

  subscribe(table: TableName, callback: Subscriber<RawRecord>): () => void {
    if (!this.subscribers.has(table)) {
      this.subscribers.set(table, new Set());
    }
    this.subscribers.get(table)!.add(callback);

    // Immediately call with current data
    callback(this.getAll(table));

    // Return unsubscribe function
    return () => {
      this.subscribers.get(table)?.delete(callback);
    };
  }

  private notify(table: TableName): void {
    const records = this.getAll(table);
    this.subscribers.get(table)?.forEach(callback => callback(records));
  }

  // Seed data for E2E tests
  seed(table: TableName, records: RawRecord[]): void {
    records.forEach(record => this.set(table, record));
  }
}

// Global store instance
const store = new InMemoryStore();

// Expose for E2E test manipulation
if (typeof window !== 'undefined') {
  (window as unknown as { __E2E_DB_STORE__: InMemoryStore }).__E2E_DB_STORE__ = store;
}

// ============================================================================
// Mock Relation Class (mimics WatermelonDB's Relation)
// ============================================================================

class MockRelation<T extends MockModel> {
  private tableName: TableName;
  private foreignKey: string;
  private parentRaw: RawRecord;
  private ModelClass: new (raw: RawRecord) => T;

  constructor(
    tableName: TableName,
    foreignKey: string,
    parentRaw: RawRecord,
    ModelClass: new (raw: RawRecord) => T
  ) {
    this.tableName = tableName;
    this.foreignKey = foreignKey;
    this.parentRaw = parentRaw;
    this.ModelClass = ModelClass;
  }

  get id(): string | null {
    return (this.parentRaw[this.foreignKey] as string) ?? null;
  }

  async fetch(): Promise<T | null> {
    const id = this.parentRaw[this.foreignKey] as string | null;
    if (!id) return null;

    const raw = store.get(this.tableName, id);
    if (!raw) return null;

    return new this.ModelClass(raw);
  }

  observe(): {
    subscribe: (
      callback:
        | ((record: T | null) => void)
        | { next?: (record: T | null) => void; error?: (err: Error) => void }
    ) => { unsubscribe: () => void };
  } {
    return {
      subscribe: callback => {
        const handler = (): void => {
          const id = this.parentRaw[this.foreignKey] as string | null;
          let result: T | null = null;

          if (id) {
            const raw = store.get(this.tableName, id);
            if (raw) {
              result = new this.ModelClass(raw);
            }
          }

          if (typeof callback === 'function') {
            callback(result);
          } else if (callback && typeof callback.next === 'function') {
            callback.next(result);
          }
        };

        // Call immediately
        handler();

        // Subscribe to changes on the related table
        const unsubscribe = store.subscribe(this.tableName, handler);
        return { unsubscribe };
      },
    };
  }
}

// ============================================================================
// Mock Model Base Class
// ============================================================================

class MockModel {
  id: string;
  _raw: RawRecord;
  protected _tableName: TableName;

  constructor(raw: RawRecord, tableName: TableName) {
    this.id = raw.id;
    this._raw = raw;
    this._tableName = tableName;

    // Proxy all raw fields to this object
    Object.keys(raw).forEach(key => {
      if (key !== 'id') {
        Object.defineProperty(this, this.snakeToCamel(key), {
          get: () => this._raw[key],
          set: value => {
            this._raw[key] = value;
          },
          enumerable: true,
        });
      }
    });
  }

  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  async update(updater: (record: this) => void): Promise<this> {
    updater(this);
    store.set(this._tableName, this._raw);
    return this;
  }

  async destroyPermanently(): Promise<void> {
    store.delete(this._tableName, this.id);
  }
}

// ============================================================================
// Mock WorkOrder Model
// ============================================================================

class MockWorkOrder extends MockModel {
  // Type declarations for properties set by MockModel constructor proxy
  serverId!: string | null;
  woNumber!: string;
  siteId!: string;
  assetId!: string;
  title!: string;
  description!: string | null;
  priority!: 'low' | 'medium' | 'high' | 'emergency';
  status!: 'open' | 'in_progress' | 'completed';
  assignedTo!: string | null;
  createdBy!: string;
  dueDate!: number | null;
  startedAt!: number | null;
  completedAt!: number | null;
  completedBy!: string | null;
  completionNotes!: string | null;
  failureType!: 'none' | 'wore_out' | 'broke' | 'unknown' | null;
  timeSpentMinutes!: number | null;
  signatureImageUrl!: string | null;
  signatureTimestamp!: number | null;
  signatureHash!: string | null;
  verificationCode!: string | null;
  voiceNoteUrl!: string | null;
  voiceNoteConfidence!: string | null;
  needsEnrichment!: boolean;
  isQuickLog!: boolean;
  localSyncStatus!: 'pending' | 'synced' | 'conflict';
  localUpdatedAt!: number;
  serverUpdatedAt!: number | null;
  createdAt!: number | null;

  static table = 'work_orders' as const;

  constructor(raw: RawRecord) {
    super(raw, 'work_orders');
  }

  get isOverdue(): boolean {
    const dueDate = this._raw.due_date as number | null;
    const status = this._raw.status as string;
    if (!dueDate || status === 'completed') {
      return false;
    }
    return Date.now() > dueDate;
  }

  get isPending(): boolean {
    return this._raw.status === 'open';
  }

  get isInProgress(): boolean {
    return this._raw.status === 'in_progress';
  }

  get isCompleted(): boolean {
    return this._raw.status === 'completed';
  }

  get isEmergency(): boolean {
    return this._raw.priority === 'emergency';
  }

  // Relation to Asset - mimics @relation('assets', 'asset_id')
  get asset(): MockRelation<MockAsset> {
    return new MockRelation('assets', 'asset_id', this._raw, MockAsset);
  }

  async markAsStarted(): Promise<void> {
    await this.update(() => {
      this._raw.status = 'in_progress';
      this._raw.started_at = Date.now();
      this._raw.local_sync_status = 'pending';
      this._raw.local_updated_at = Date.now();
    });
  }

  async markAsCompleted(
    completedBy: string,
    notes?: string,
    failureType?: string,
    timeSpentMinutes?: number
  ): Promise<void> {
    await this.update(() => {
      this._raw.status = 'completed';
      this._raw.completed_at = Date.now();
      this._raw.completed_by = completedBy;
      if (notes !== undefined) {
        this._raw.completion_notes = notes;
      }
      if (failureType !== undefined) {
        this._raw.failure_type = failureType;
      }
      if (timeSpentMinutes !== undefined) {
        this._raw.time_spent_minutes = timeSpentMinutes;
      }
      this._raw.local_sync_status = 'pending';
      this._raw.local_updated_at = Date.now();
    });
  }

  async updateLocalSyncStatus(status: string): Promise<void> {
    await this.update(() => {
      this._raw.local_sync_status = status;
      if (status === 'synced') {
        this._raw.server_updated_at = Date.now();
      }
    });
  }
}

// ============================================================================
// Mock Asset Model
// ============================================================================

class MockAsset extends MockModel {
  serverId!: string | null;
  siteId!: string;
  assetNumber!: string;
  name!: string;
  description!: string | null;
  category!: string;
  status!: 'operational' | 'down' | 'limited';
  locationDescription!: string | null;
  photoUrl!: string | null;
  meterType!: string | null;
  meterUnit!: string | null;
  meterCurrentReading!: number | null;
  localSyncStatus!: 'pending' | 'synced' | 'conflict';
  localUpdatedAt!: number;
  serverUpdatedAt!: number | null;

  static table = 'assets' as const;

  constructor(raw: RawRecord) {
    super(raw, 'assets');
  }

  get hasMeter(): boolean {
    return this._raw.meter_type !== null && this._raw.meter_type !== undefined;
  }
}

// ============================================================================
// Mock MeterReading Model
// ============================================================================

class MockMeterReading extends MockModel {
  serverId!: string | null;
  assetId!: string;
  readingValue!: number;
  readingDate!: number;
  recordedBy!: string;
  notes!: string | null;
  localSyncStatus!: 'pending' | 'synced' | 'conflict';
  localUpdatedAt!: number;

  static table = 'meter_readings' as const;

  constructor(raw: RawRecord) {
    super(raw, 'meter_readings');
  }
}

// ============================================================================
// Mock WorkOrderPhoto Model
// ============================================================================

class MockWorkOrderPhoto extends MockModel {
  serverId!: string | null;
  workOrderId!: string;
  localUri!: string;
  remoteUrl!: string | null;
  caption!: string | null;
  takenAt!: number;
  localSyncStatus!: 'pending' | 'synced' | 'conflict';

  static table = 'work_order_photos' as const;

  constructor(raw: RawRecord) {
    super(raw, 'work_order_photos');
  }
}

// ============================================================================
// Model Class Map
// ============================================================================

const MODEL_CLASSES: Record<TableName, new (raw: RawRecord) => MockModel> = {
  work_orders: MockWorkOrder,
  assets: MockAsset,
  meter_readings: MockMeterReading,
  work_order_photos: MockWorkOrderPhoto,
};

// ============================================================================
// Mock Q (Query Builder) - Compatible with @nozbe/watermelondb Q
// ============================================================================

type QueryCondition = (record: RawRecord) => boolean;

interface QCondition {
  type: 'where' | 'and' | 'or' | 'sortBy' | 'take' | 'skip';
  column?: string;
  value?: unknown;
  comparison?: string;
  conditions?: QCondition[];
}

/**
 * Mock Q object that mimics @nozbe/watermelondb's Q query builder
 *
 * Usage patterns:
 * - Q.where('status', 'open')  → simple equality
 * - Q.where('status', Q.notEq('completed'))  → with comparison operator
 * - Q.and(Q.where(...), Q.where(...))  → logical AND
 */
export const Q = {
  // Sort order constants (matching WatermelonDB)
  asc: 'asc' as const,
  desc: 'desc' as const,

  where(column: string, valueOrComparison: unknown): QCondition {
    // Check if valueOrComparison is a comparison object from Q.eq(), Q.notEq(), etc.
    if (
      valueOrComparison &&
      typeof valueOrComparison === 'object' &&
      'op' in (valueOrComparison as Record<string, unknown>)
    ) {
      const comp = valueOrComparison as { op: string; value: unknown };
      return { type: 'where', column, comparison: comp.op, value: comp.value };
    }
    // Simple equality: Q.where('status', 'open')
    return { type: 'where', column, value: valueOrComparison };
  },
  and(...conditions: QCondition[]): QCondition {
    return { type: 'and', conditions };
  },
  or(...conditions: QCondition[]): QCondition {
    return { type: 'or', conditions };
  },
  sortBy(column: string, order: 'asc' | 'desc' = 'asc'): QCondition {
    return { type: 'sortBy', column, value: order };
  },
  take(count: number): QCondition {
    return { type: 'take', value: count };
  },
  skip(count: number): QCondition {
    return { type: 'skip', value: count };
  },
  // Comparison operators - return { op, value } objects consumed by Q.where()
  eq: (value: unknown) => ({ op: 'eq', value }),
  notEq: (value: unknown) => ({ op: 'notEq', value }),
  gt: (value: unknown) => ({ op: 'gt', value }),
  gte: (value: unknown) => ({ op: 'gte', value }),
  lt: (value: unknown) => ({ op: 'lt', value }),
  lte: (value: unknown) => ({ op: 'lte', value }),
  like: (value: unknown) => ({ op: 'like', value }),
  notLike: (value: unknown) => ({ op: 'notLike', value }),
  oneOf: (values: unknown[]) => ({ op: 'oneOf', value: values }),
  notIn: (values: unknown[]) => ({ op: 'notIn', value: values }),
};

/**
 * Convert a QCondition to a filter function
 */
function conditionToFilter(condition: QCondition): QueryCondition {
  if (condition.type === 'where' && condition.column) {
    const col = condition.column;
    const val = condition.value;
    const comparison = condition.comparison;

    if (comparison) {
      switch (comparison) {
        case 'eq':
          return record => record[col] === val;
        case 'notEq':
          return record => record[col] !== val;
        case 'gt':
          return record => (record[col] as number) > (val as number);
        case 'gte':
          return record => (record[col] as number) >= (val as number);
        case 'lt':
          return record => (record[col] as number) < (val as number);
        case 'lte':
          return record => (record[col] as number) <= (val as number);
        case 'like':
          return record => {
            const strVal = String(record[col] ?? '').toLowerCase();
            const pattern = String(val ?? '')
              .toLowerCase()
              .replace(/%/g, '.*');
            return new RegExp(pattern).test(strVal);
          };
        case 'oneOf':
          return record => (val as unknown[]).includes(record[col]);
        case 'notIn':
          return record => !(val as unknown[]).includes(record[col]);
        default:
          return record => record[col] === val;
      }
    }
    // Simple equality
    return record => record[col] === val;
  }

  if (condition.type === 'and' && condition.conditions) {
    const filters = condition.conditions.map(conditionToFilter);
    return record => filters.every(f => f(record));
  }

  if (condition.type === 'or' && condition.conditions) {
    const filters = condition.conditions.map(conditionToFilter);
    return record => filters.some(f => f(record));
  }

  // Default: pass through
  return () => true;
}

// ============================================================================
// Mock Query Class
// ============================================================================

class MockQuery<T extends MockModel> {
  private tableName: TableName;
  private ModelClass: new (raw: RawRecord) => T;
  private conditions: QueryCondition[] = [];
  private sortColumn: string | null = null;
  private sortOrder: 'asc' | 'desc' = 'asc';
  private takeCount: number | null = null;
  private skipCount: number = 0;

  constructor(
    tableName: TableName,
    ModelClass: new (raw: RawRecord) => T,
    qConditions: QCondition[] = []
  ) {
    this.tableName = tableName;
    this.ModelClass = ModelClass;
    // Convert Q conditions to filter functions and extract sort/limit options
    qConditions.forEach(qc => {
      if (qc.type === 'where' || qc.type === 'and' || qc.type === 'or') {
        this.conditions.push(conditionToFilter(qc));
      } else if (qc.type === 'sortBy' && qc.column) {
        this.sortColumn = qc.column;
        this.sortOrder = (qc.value as 'asc' | 'desc') ?? 'asc';
      } else if (qc.type === 'take') {
        this.takeCount = qc.value as number;
      } else if (qc.type === 'skip') {
        this.skipCount = qc.value as number;
      }
    });
  }

  extend(...conditions: QueryCondition[]): MockQuery<T> {
    this.conditions.push(...conditions);
    return this;
  }

  /**
   * Apply sorting, skip, and take to records
   */
  private applyPostProcessing(records: RawRecord[]): RawRecord[] {
    let result = [...records];

    // Apply sorting
    if (this.sortColumn) {
      const col = this.sortColumn;
      const order = this.sortOrder;
      result.sort((a, b) => {
        const aVal = a[col];
        const bVal = b[col];
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        const comparison = aVal < bVal ? -1 : 1;
        return order === 'desc' ? -comparison : comparison;
      });
    }

    // Apply skip
    if (this.skipCount > 0) {
      result = result.slice(this.skipCount);
    }

    // Apply take (limit)
    if (this.takeCount !== null) {
      result = result.slice(0, this.takeCount);
    }

    return result;
  }

  async fetch(): Promise<T[]> {
    let records = store.getAll(this.tableName);

    // Apply filter conditions
    this.conditions.forEach(condition => {
      records = records.filter(condition);
    });

    // Apply sorting, skip, and take
    records = this.applyPostProcessing(records);

    return records.map(raw => new this.ModelClass(raw) as T);
  }

  async fetchCount(): Promise<number> {
    const records = await this.fetch();
    return records.length;
  }

  observe(): {
    subscribe: (
      callback:
        | ((records: T[]) => void)
        | { next?: (records: T[]) => void; error?: (err: Error) => void }
    ) => { unsubscribe: () => void };
  } {
    return {
      subscribe: callback => {
        const handler = (rawRecords: RawRecord[]): void => {
          let filtered = rawRecords;
          this.conditions.forEach(condition => {
            filtered = filtered.filter(condition);
          });

          // Apply sorting, skip, and take
          filtered = this.applyPostProcessing(filtered);

          const result = filtered.map(raw => new this.ModelClass(raw) as T);

          // Handle both function and {next, error} style callbacks
          if (typeof callback === 'function') {
            callback(result);
          } else if (callback && typeof callback.next === 'function') {
            callback.next(result);
          }
        };

        const unsubscribe = store.subscribe(this.tableName, handler);
        return { unsubscribe };
      },
    };
  }

  observeCount(): {
    subscribe: (
      callback:
        | ((count: number) => void)
        | { next?: (count: number) => void; error?: (err: Error) => void }
    ) => { unsubscribe: () => void };
  } {
    return {
      subscribe: callback => {
        const handler = (rawRecords: RawRecord[]): void => {
          let filtered = rawRecords;
          this.conditions.forEach(condition => {
            filtered = filtered.filter(condition);
          });

          // Apply sorting, skip, and take for consistency
          filtered = this.applyPostProcessing(filtered);

          const count = filtered.length;

          // Handle both function and {next, error} style callbacks
          if (typeof callback === 'function') {
            callback(count);
          } else if (callback && typeof callback.next === 'function') {
            callback.next(count);
          }
        };

        const unsubscribe = store.subscribe(this.tableName, handler);
        return { unsubscribe };
      },
    };
  }
}

// ============================================================================
// Mock Collection Class
// ============================================================================

/**
 * Convert camelCase to snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

class MockCollection<T extends MockModel> {
  private tableName: TableName;
  private ModelClass: new (raw: RawRecord) => T;

  constructor(tableName: TableName, ModelClass: new (raw: RawRecord) => T) {
    this.tableName = tableName;
    this.ModelClass = ModelClass;
  }

  query(...conditions: unknown[]): MockQuery<T> {
    // Filter to only QCondition objects (ignore non-object conditions)
    const qConditions = conditions.filter(
      (c): c is QCondition => typeof c === 'object' && c !== null && 'type' in c
    );
    return new MockQuery(this.tableName, this.ModelClass, qConditions);
  }

  async find(id: string): Promise<T> {
    const raw = store.get(this.tableName, id);
    if (!raw) {
      throw new Error(`Record ${id} not found in ${this.tableName}`);
    }
    return new this.ModelClass(raw) as T;
  }

  async create(creator: (record: RawRecord) => void): Promise<T> {
    const raw: RawRecord = {
      id: `${this.tableName}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    };

    // Create a proxy that converts camelCase property assignments to snake_case
    // This mimics WatermelonDB's decorator behavior where model.siteId maps to raw.site_id
    const proxy = new Proxy(raw, {
      set(target, prop, value) {
        if (typeof prop === 'string') {
          // Convert camelCase to snake_case for storage
          const snakeKey = camelToSnake(prop);
          target[snakeKey] = value;
        }
        return true;
      },
      get(target, prop) {
        if (typeof prop === 'string') {
          // Also support reading (for chained assignments)
          const snakeKey = camelToSnake(prop);
          return target[snakeKey];
        }
        return undefined;
      },
    });

    creator(proxy as RawRecord);
    store.set(this.tableName, raw);
    return new this.ModelClass(raw) as T;
  }
}

// ============================================================================
// Mock Database Class
// ============================================================================

class MockDatabase {
  private collections: Map<TableName, MockCollection<MockModel>> = new Map();

  get<T extends MockModel>(tableName: TableName): MockCollection<T> {
    if (!this.collections.has(tableName)) {
      const ModelClass = MODEL_CLASSES[tableName] as new (raw: RawRecord) => T;
      this.collections.set(
        tableName,
        new MockCollection(tableName, ModelClass) as MockCollection<MockModel>
      );
    }
    return this.collections.get(tableName) as unknown as MockCollection<T>;
  }

  async write<T>(callback: () => Promise<T>): Promise<T> {
    return await callback();
  }

  async batch(...operations: unknown[]): Promise<void> {
    // In mock, operations are already applied
    await Promise.resolve(operations);
  }

  async action<T>(callback: () => Promise<T>): Promise<T> {
    return await callback();
  }
}

// ============================================================================
// Database Instance & Context
// ============================================================================

export const database = new MockDatabase();

// Expose database for E2E test manipulation
if (typeof window !== 'undefined') {
  (window as unknown as { __E2E_DATABASE__: MockDatabase }).__E2E_DATABASE__ = database;
}

interface DatabaseContextValue {
  database: MockDatabase;
  isReady: boolean;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

interface DatabaseProviderProps {
  children: ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps): React.ReactElement {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Mock database is immediately ready
    setIsReady(true);
  }, []);

  const value: DatabaseContextValue = {
    database,
    isReady,
  };

  return React.createElement(DatabaseContext.Provider, { value }, children);
}

export function useDatabase(): MockDatabase {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context.database;
}

export function useDatabaseReady(): boolean {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabaseReady must be used within a DatabaseProvider');
  }
  return context.isReady;
}

// ============================================================================
// Re-exports for compatibility
// ============================================================================

export { schema } from './schema';
export { migrations } from './migrations';

// Export mock model classes as the real ones
export { MockWorkOrder as WorkOrder };
export { MockAsset as Asset };
export { MockMeterReading as MeterReading };
export { MockWorkOrderPhoto as WorkOrderPhoto };

// Export model classes array for database initialization
export const modelClasses = [MockWorkOrder, MockAsset, MockMeterReading, MockWorkOrderPhoto];

// ============================================================================
// E2E Test Utilities
// ============================================================================

/** Reset all data - call between tests */
export function resetMockDatabase(): void {
  store.reset();
}

/** Seed test data */
export function seedMockDatabase(table: TableName, records: RawRecord[]): void {
  store.seed(table, records);
}

/** Get all records from a table */
export function getMockRecords(table: TableName): RawRecord[] {
  return store.getAll(table);
}
