/**
 * Assets - List Tests
 *
 * Tests: ASSET-01
 */

import { test, expect } from '@playwright/test';
import { AssetListPage, HomePage } from '../../pages';
import { TEST_ASSETS } from '../../fixtures/test-data';
import { loginAsDefaultUser } from '../../helpers';

test.describe('Asset List', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDefaultUser(page);
  });

  test('ASSET-01: should filter assets by status', async ({ page }) => {
    // Arrange
    const assetListPage = new AssetListPage(page);
    await assetListPage.goto();
    await assetListPage.waitForLoad();

    // Assert - filters should be visible
    await expect(assetListPage.filterAll).toBeVisible();
    await expect(assetListPage.filterOperational).toBeVisible();
    await expect(assetListPage.filterLimited).toBeVisible();
    await expect(assetListPage.filterDown).toBeVisible();

    // Act & Assert - Filter to Operational
    await assetListPage.filterByStatus('operational');
    const hasOperational = await assetListPage.hasAsset(TEST_ASSETS.excavator.name);
    expect(hasOperational).toBeTruthy();

    // Act & Assert - Filter to Limited
    await assetListPage.filterByStatus('limited');
    const hasLimited = await assetListPage.hasAsset(TEST_ASSETS.loader.name);
    expect(hasLimited).toBeTruthy();

    // Act & Assert - Filter to Down
    await assetListPage.filterByStatus('down');
    const hasDown = await assetListPage.hasAsset(TEST_ASSETS.crusher.name);
    expect(hasDown).toBeTruthy();
  });

  test('should display all assets by default', async ({ page }) => {
    // Arrange
    const assetListPage = new AssetListPage(page);
    await assetListPage.goto();
    await assetListPage.waitForLoad();

    // Assert - should show all test assets
    const count = await assetListPage.getAssetCount();
    expect(count).toBeGreaterThanOrEqual(3); // At least our 3 test assets
  });

  test('should search assets by name', async ({ page }) => {
    // Arrange
    const assetListPage = new AssetListPage(page);
    await assetListPage.goto();
    await assetListPage.waitForLoad();

    // Act
    await assetListPage.search('CAT');

    // Assert
    const hasMatch = await assetListPage.hasAsset(TEST_ASSETS.excavator.name);
    expect(hasMatch).toBeTruthy();
  });

  test('should search assets by asset number', async ({ page }) => {
    // Arrange
    const assetListPage = new AssetListPage(page);
    await assetListPage.goto();
    await assetListPage.waitForLoad();

    // Act
    await assetListPage.search(TEST_ASSETS.excavator.assetNumber);

    // Assert
    const hasMatch = await assetListPage.hasAsset(TEST_ASSETS.excavator.name);
    expect(hasMatch).toBeTruthy();
  });

  test('should clear search and show all assets', async ({ page }) => {
    // Arrange
    const assetListPage = new AssetListPage(page);
    await assetListPage.goto();
    await assetListPage.waitForLoad();

    const initialCount = await assetListPage.getAssetCount();

    // Act
    await assetListPage.search('CAT');
    await assetListPage.clearSearch();

    // Assert
    const countAfterClear = await assetListPage.getAssetCount();
    expect(countAfterClear).toBe(initialCount);
  });

  test('should navigate to assets from home', async ({ page }) => {
    // Arrange
    const homePage = new HomePage(page);

    // Act
    await homePage.goToAssets();

    // Assert
    const assetListPage = new AssetListPage(page);
    await assetListPage.assertOnAssetListPage();
  });

  test('should open asset detail on click', async ({ page }) => {
    // Arrange
    const assetListPage = new AssetListPage(page);
    await assetListPage.goto();
    await assetListPage.waitForLoad();

    // Act
    await assetListPage.openAsset(TEST_ASSETS.excavator.name);

    // Assert - should navigate to detail page
    await expect(page.getByText(TEST_ASSETS.excavator.description!, { exact: false })).toBeVisible({
      timeout: 5000,
    });
  });
});
