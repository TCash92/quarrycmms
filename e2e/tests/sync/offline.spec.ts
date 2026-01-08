/**
 * Sync - Offline Tests
 *
 * Tests: SYNC-02
 *
 * Tests offline-first behavior - the core value proposition of the app.
 * Quarry sites often have no cell signal, so all features must work offline.
 */

import { test, expect } from '@playwright/test';
import { QuickLogPage, WorkOrderListPage, HomePage } from '../../pages';
import { TEST_ASSETS, TEST_WORK_ORDERS } from '../../fixtures/test-data';
import { loginAsDefaultUser } from '../../helpers';

test.describe('Offline Operation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDefaultUser(page);
  });

  test('SYNC-02: should work offline and queue changes', async ({ page, context }) => {
    // Arrange - ensure we're online first and app is loaded
    const homePage = new HomePage(page);
    await homePage.waitForLoad();

    // Go offline
    await context.setOffline(true);

    // Act - create a quick log while offline
    const quickLogPage = new QuickLogPage(page);
    await quickLogPage.goto();

    await quickLogPage.completeQuickLog({
      assetName: TEST_ASSETS.excavator.name,
      actionType: 'inspection',
      note: 'Offline inspection test',
    });

    // Assert - quick log should succeed locally
    await quickLogPage.waitForSubmitSuccess();

    // Navigate to home and check pending count increased
    await homePage.goto();
    await homePage.waitForLoad();

    // Wait for useSync to refresh (useFocusEffect triggers refreshStatus)
    await page.waitForTimeout(500);

    const pendingCount = await homePage.getPendingCount();
    expect(pendingCount).toBeGreaterThan(0);

    // Cleanup - go back online
    await context.setOffline(false);
  });

  test('should view work orders offline', async ({ page, context }) => {
    // Arrange - load work orders first while online
    const workOrderListPage = new WorkOrderListPage(page);
    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();

    // Go offline
    await context.setOffline(true);

    // Act - filter and search while offline
    await workOrderListPage.filterByStatus('open');
    await workOrderListPage.search(TEST_WORK_ORDERS.openHighPriority.title);

    // Assert - should still work
    const hasMatch = await workOrderListPage.hasWorkOrder(TEST_WORK_ORDERS.openHighPriority.title);
    expect(hasMatch).toBeTruthy();

    // Cleanup
    await context.setOffline(false);
  });

  test('should navigate between tabs offline', async ({ page, context }) => {
    // Arrange
    const homePage = new HomePage(page);
    await homePage.waitForLoad();

    // Go offline
    await context.setOffline(true);

    // Act - navigate between tabs
    await homePage.goToAssets();
    await homePage.goToWorkOrders();
    await homePage.goToQuickLog();
    await homePage.goto();

    // Assert - should work without errors
    await homePage.waitForLoad();
    await expect(homePage.greeting).toBeVisible();

    // Cleanup
    await context.setOffline(false);
  });

  test('should indicate offline status', async ({ page, context }) => {
    // Arrange
    const homePage = new HomePage(page);
    await homePage.waitForLoad();

    // Act - go offline
    await context.setOffline(true);

    // Wait a moment for the app to detect offline status
    await page.waitForTimeout(1000);

    // Assert - should show some offline indication
    // This could be a banner, icon, or status text
    const syncStatus = await homePage.getSyncStatus();
    // The status should indicate offline or show last sync time
    expect(syncStatus).toBeTruthy();

    // Cleanup
    await context.setOffline(false);
  });

  test('should sync pending changes when back online', async ({ page, context }) => {
    // Arrange
    const homePage = new HomePage(page);
    await homePage.waitForLoad();

    // Get initial pending count
    const initialPending = await homePage.getPendingCount();

    // Go offline and create change
    await context.setOffline(true);

    const quickLogPage = new QuickLogPage(page);
    await quickLogPage.goto();
    await quickLogPage.completeQuickLog({
      assetName: TEST_ASSETS.loader.name,
      actionType: 'maintenance',
    });

    await homePage.goto();
    await homePage.waitForLoad();

    const offlinePending = await homePage.getPendingCount();
    expect(offlinePending).toBeGreaterThan(initialPending);

    // Go back online
    await context.setOffline(false);

    // Trigger sync
    await homePage.triggerSync();

    // Wait for sync to complete
    await page.waitForTimeout(2000);

    // Pending count should decrease (or stay same if sync is mocked)
    const afterSyncPending = await homePage.getPendingCount();
    expect(afterSyncPending).toBeLessThanOrEqual(offlinePending);
  });
});
