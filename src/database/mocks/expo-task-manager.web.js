/**
 * Expo TaskManager web stub
 *
 * Provides no-op implementations for web platform E2E testing.
 * TaskManager is native-only and not available on web.
 */

async function defineTask(taskName, taskExecutor) {
  // No-op on web
}

async function isTaskRegisteredAsync(taskName) {
  return false;
}

async function isTaskDefined(taskName) {
  return false;
}

async function getTaskOptionsAsync(taskName) {
  return null;
}

async function getRegisteredTasksAsync() {
  return [];
}

async function unregisterTaskAsync(taskName) {
  // No-op on web
}

async function unregisterAllTasksAsync() {
  // No-op on web
}

module.exports = {
  defineTask,
  isTaskRegisteredAsync,
  isTaskDefined,
  getTaskOptionsAsync,
  getRegisteredTasksAsync,
  unregisterTaskAsync,
  unregisterAllTasksAsync,
};
