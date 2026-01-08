/**
 * Quick Log - Flow Tests
 *
 * Tests: QL-01, QL-02
 *
 * Quick Log is the core 30-second maintenance entry flow designed for
 * technicians in harsh field conditions (gloves, cold, no time).
 */

import { test, expect } from '@playwright/test';
import { QuickLogPage, HomePage } from '../../pages';
import { TEST_ASSETS } from '../../fixtures/test-data';
import { loginAsDefaultUser } from '../../helpers';

test.describe('Quick Log Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDefaultUser(page);
  });

  test('QL-01: should complete full quick log flow', async ({ page }) => {
    // Arrange
    const quickLogPage = new QuickLogPage(page);
    await quickLogPage.goto();

    // Act - complete the quick log
    await quickLogPage.completeQuickLog({
      assetName: TEST_ASSETS.excavator.name,
      actionType: 'maintenance',
      note: 'Routine PM check completed',
    });

    // Assert - should show success or navigate away
    await quickLogPage.waitForSubmitSuccess();
  });

  test('QL-01b: should complete emergency quick log', async ({ page }) => {
    // Arrange
    const quickLogPage = new QuickLogPage(page);
    await quickLogPage.goto();

    // Act - log emergency
    await quickLogPage.completeQuickLog({
      assetName: TEST_ASSETS.loader.name,
      actionType: 'emergency',
      note: 'Hydraulic leak detected',
    });

    // Assert
    await quickLogPage.waitForSubmitSuccess();
  });

  test('QL-01c: should complete inspection quick log', async ({ page }) => {
    // Arrange
    const quickLogPage = new QuickLogPage(page);
    await quickLogPage.goto();

    // Act - log inspection
    await quickLogPage.completeQuickLog({
      assetName: TEST_ASSETS.crusher.name,
      actionType: 'inspection',
    });

    // Assert
    await quickLogPage.waitForSubmitSuccess();
  });

  test('QL-02: should search and select asset from picker', async ({ page }) => {
    // Arrange
    const quickLogPage = new QuickLogPage(page);
    await quickLogPage.goto();

    // Act - search for asset
    await quickLogPage.selectAssetBySearch('CAT');

    // Assert - asset should be selected
    // The asset picker button should show the selected asset number
    await expect(page.getByRole('button', { name: /Selected:.*EXC/i })).toBeVisible();
  });

  test('should display recent assets for quick selection', async ({ page }) => {
    // Arrange
    const quickLogPage = new QuickLogPage(page);
    await quickLogPage.goto();

    // Assert - recent assets section should be visible
    await expect(quickLogPage.recentAssets).toBeVisible();
  });

  test('should select asset from recent assets list', async ({ page }) => {
    // Arrange
    const quickLogPage = new QuickLogPage(page);
    await quickLogPage.goto();

    // Act - select first recent asset
    await quickLogPage.selectRecentAsset(0);

    // Complete the log
    await quickLogPage.selectMaintenanceAction();
    await quickLogPage.submitLog();

    // Assert
    await quickLogPage.waitForSubmitSuccess();
  });

  test('should navigate to quick log from home', async ({ page }) => {
    // Arrange
    const homePage = new HomePage(page);

    // Act
    await homePage.goToQuickLog();

    // Assert
    const quickLogPage = new QuickLogPage(page);
    await quickLogPage.assertOnQuickLogPage();
  });
});
