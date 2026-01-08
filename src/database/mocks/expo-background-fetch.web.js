/**
 * Expo BackgroundFetch web stub
 *
 * Provides no-op implementations for web platform E2E testing.
 * BackgroundFetch is native-only and not available on web.
 */

// Status constants
const BackgroundFetchStatus = {
  Denied: 1,
  Restricted: 2,
  Available: 3,
};

// Result constants
const BackgroundFetchResult = {
  NoData: 1,
  NewData: 2,
  Failed: 3,
};

async function getStatusAsync() {
  return BackgroundFetchStatus.Denied;
}

async function registerTaskAsync(taskName, options) {
  // No-op on web
}

async function unregisterTaskAsync(taskName) {
  // No-op on web
}

async function setMinimumIntervalAsync(minimumInterval) {
  // No-op on web
}

module.exports = {
  BackgroundFetchStatus,
  BackgroundFetchResult,
  getStatusAsync,
  registerTaskAsync,
  unregisterTaskAsync,
  setMinimumIntervalAsync,
};
