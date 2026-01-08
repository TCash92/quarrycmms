/**
 * WatermelonDB SQLite adapter web stub
 *
 * Provides a no-op SQLiteAdapter for web platform E2E testing.
 */

// Mock SQLiteAdapter that does nothing
class SQLiteAdapter {
  constructor(_options) {
    // No-op - web doesn't have SQLite
  }

  async setUp() {}

  async find(_table, _id) {
    return null;
  }

  async query(_query) {
    return [];
  }

  async count(_query) {
    return 0;
  }

  async batch(_operations) {}

  async getDeletedRecords(_table) {
    return [];
  }

  async destroyDeletedRecords(_table, _recordIds) {}

  async unsafeResetDatabase() {}

  async getLocal(_key) {
    return null;
  }

  async setLocal(_key, _value) {}

  async removeLocal(_key) {}

  async unsafeExecute(_operations) {}
}

// Export as default (how it's imported in the codebase)
module.exports = SQLiteAdapter;
module.exports.default = SQLiteAdapter;
