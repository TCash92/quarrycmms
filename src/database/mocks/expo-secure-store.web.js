/**
 * Expo SecureStore web stub
 *
 * Provides localStorage-based fallback for web platform E2E testing.
 * Uses localStorage as the storage backend since there's no secure storage on web.
 */

const STORAGE_PREFIX = '__secure_store__';

async function getItemAsync(key) {
  try {
    const value = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return value;
  } catch {
    return null;
  }
}

async function setItemAsync(key, value) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, value);
  } catch {
    // Ignore errors in test environment
  }
}

async function deleteItemAsync(key) {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch {
    // Ignore errors in test environment
  }
}

function isAvailableAsync() {
  return Promise.resolve(true);
}

// Constants
const AFTER_FIRST_UNLOCK = 0;
const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 1;
const ALWAYS = 2;
const ALWAYS_THIS_DEVICE_ONLY = 3;
const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = 4;
const WHEN_UNLOCKED = 5;
const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 6;

module.exports = {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  isAvailableAsync,
  // Constants
  AFTER_FIRST_UNLOCK,
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  ALWAYS,
  ALWAYS_THIS_DEVICE_ONLY,
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  WHEN_UNLOCKED,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
