/**
 * WatermelonDB Schema migrations web stub
 *
 * Provides no-op migration utilities for web platform E2E testing.
 */

// Mock schemaMigrations - just returns the config as-is
function schemaMigrations(config) {
  return config;
}

// Mock addColumns - returns the column definition
function addColumns(config) {
  return config;
}

// Mock createTable
function createTable(config) {
  return config;
}

// Mock addColumn (singular)
function addColumn(config) {
  return config;
}

// Mock unsafeExecuteSql
function unsafeExecuteSql(sql) {
  return sql;
}

module.exports = {
  schemaMigrations,
  addColumns,
  addColumn,
  createTable,
  unsafeExecuteSql,
};
