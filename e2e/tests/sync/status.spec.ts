/**
 * Sync - Status Tests
 *
 * Tests: SYNC-01
 */

import { test, expect } from '@playwright/test';
import { HomePage, QuickLogPage } from '../../pages';
import { TEST_ASSETS } from '../../fixtures/test-data';
import { loginAsDefaultUser } from '../../helpers';

test.describe('Sync Status', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDefaultUser(page);
  });

  test('SYNC-01: should show sync status on home screen', async ({ page }) => {
    // Arrange
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();

    // Assert - sync card should be visible
    await expect(homePage.syncCard).toBeVisible();

    // Assert - sync status text should be present
    const syncStatus = await homePage.getSyncStatus();
    expect(syncStatus).toBeTruthy();
  });

  test('should show pending count when there are pending changes', async ({ page, context }) => {
    // Arrange - first create a pending change by going offline and submitting a quick log
    const homePage = new HomePage(page);
    const quickLogPage = new QuickLogPage(page);

    await homePage.waitForLoad();

    // Go offline to ensure changes are pending (not immediately synced)
    await context.setOffline(true);

    // Create a quick log which will be queued
    await quickLogPage.goto();
    await quickLogPage.completeQuickLog({
      assetName: TEST_ASSETS.excavator.name,
      actionType: 'inspection',
      note: 'Test pending change',
    });
    await quickLogPage.waitForSubmitSuccess();

    // Navigate to home
    await homePage.goto();
    await homePage.waitForLoad();

    // Assert - pending count should show at least 1
    await expect(homePage.pendingCount).toBeVisible({ timeout: 10000 });
    const pendingCount = await homePage.getPendingCount();
    expect(pendingCount).toBeGreaterThan(0);

    // Cleanup
    await context.setOffline(false);
  });

  test('should allow triggering sync from home', async ({ page }) => {
    // Arrange
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();

    // Act - trigger sync
    await homePage.triggerSync();

    // Assert - sync should initiate (status may change)
    // Wait for any sync indication
    await page.waitForTimeout(1000); // Allow time for sync to process

    // Sync status should still be visible
    await expect(homePage.syncStatus).toBeVisible();
  });

  test('should display quick stats on home', async ({ page }) => {
    // Arrange
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();

    // Assert
    await expect(homePage.quickStats).toBeVisible();
  });

  test('should display personalized greeting', async ({ page }) => {
    // Arrange
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();

    // Assert
    const greeting = await homePage.getGreeting();
    expect(greeting).toBeTruthy();
    // Should contain user's name or time-based greeting
    expect(greeting.length).toBeGreaterThan(0);
  });
});
