/**
 * Jest test setup file
 * Configures global mocks and test environment
 */

// Import mocks to register them
import './mocks';

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging test failures
  error: originalConsole.error,
};

// Fixed timestamp for deterministic tests: 2024-01-01T00:00:00.000Z
const FIXED_TIMESTAMP = 1704067200000;

// Reset mocks and re-apply Date.now mock between tests
beforeEach(() => {
  jest.clearAllMocks();
  // Re-apply Date.now mock after clearing
  jest.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP);
});
