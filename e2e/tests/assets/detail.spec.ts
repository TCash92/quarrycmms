/**
 * Assets - Detail Tests
 *
 * Tests: ASSET-02
 */

import { test, expect } from '@playwright/test';
import { AssetListPage, AssetDetailPage } from '../../pages';
import { TEST_ASSETS } from '../../fixtures/test-data';
import { loginAsDefaultUser } from '../../helpers';

test.describe('Asset Detail', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDefaultUser(page);
  });

  test('ASSET-02: should view detail and record meter reading', async ({ page }) => {
    // Arrange
    const assetListPage = new AssetListPage(page);
    const detailPage = new AssetDetailPage(page);

    await assetListPage.goto();
    await assetListPage.waitForLoad();

    // Open asset with meter (excavator has meter)
    await assetListPage.openAsset(TEST_ASSETS.excavator.name);
    await detailPage.waitForLoad();

    // Assert - meter section should be visible
    const hasMeter = await detailPage.hasMeter();
    expect(hasMeter).toBeTruthy();

    // Get current reading
    const currentReading = await detailPage.getMeterReading();
    expect(currentReading).toBeTruthy();

    // Act - record new meter reading
    const newReading = TEST_ASSETS.excavator.meterCurrentReading! + 10;
    await detailPage.submitMeterReading(newReading);

    // Assert - success indication
    await detailPage.waitForMeterRecordSuccess();
  });

  test('should display asset status correctly', async ({ page }) => {
    // Arrange
    const assetListPage = new AssetListPage(page);
    const detailPage = new AssetDetailPage(page);

    await assetListPage.goto();
    await assetListPage.waitForLoad();

    // Open operational asset
    await assetListPage.openAsset(TEST_ASSETS.excavator.name);
    await detailPage.waitForLoad();

    // Assert
    const status = await detailPage.getStatus();
    expect(status.toLowerCase()).toContain('operational');
  });

  test('should display limited status for limited asset', async ({ page }) => {
    // Arrange
    const assetListPage = new AssetListPage(page);
    const detailPage = new AssetDetailPage(page);

    await assetListPage.goto();
    await assetListPage.waitForLoad();

    // Open limited asset (loader)
    await assetListPage.openAsset(TEST_ASSETS.loader.name);
    await detailPage.waitForLoad();

    // Assert
    const status = await detailPage.getStatus();
    expect(status.toLowerCase()).toContain('limited');
  });

  test('should display down status for down asset', async ({ page }) => {
    // Arrange
    const assetListPage = new AssetListPage(page);
    const detailPage = new AssetDetailPage(page);

    await assetListPage.goto();
    await assetListPage.waitForLoad();

    // Open down asset (crusher)
    await assetListPage.openAsset(TEST_ASSETS.crusher.name);
    await detailPage.waitForLoad();

    // Assert
    const status = await detailPage.getStatus();
    expect(status.toLowerCase()).toContain('down');
  });

  test('should not show meter section for asset without meter', async ({ page }) => {
    // Arrange
    const assetListPage = new AssetListPage(page);
    const detailPage = new AssetDetailPage(page);

    await assetListPage.goto();
    await assetListPage.waitForLoad();

    // Open asset without meter (crusher has no meter)
    await assetListPage.openAsset(TEST_ASSETS.crusher.name);
    await detailPage.waitForLoad();

    // Assert - meter input should not be visible
    const hasMeter = await detailPage.hasMeter();
    expect(hasMeter).toBeFalsy();
  });

  test('should go back to asset list', async ({ page }) => {
    // Arrange
    const assetListPage = new AssetListPage(page);
    const detailPage = new AssetDetailPage(page);

    await assetListPage.goto();
    await assetListPage.waitForLoad();
    await assetListPage.openAssetByIndex(0);
    await detailPage.waitForLoad();

    // Act
    await detailPage.goBack();

    // Assert
    await assetListPage.assertOnAssetListPage();
  });
});
