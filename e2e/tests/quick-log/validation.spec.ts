/**
 * Quick Log - Validation Tests
 *
 * Tests: QL-03
 */

import { test, expect } from '@playwright/test';
import { QuickLogPage } from '../../pages';
import { TEST_ASSETS } from '../../fixtures/test-data';
import { loginAsDefaultUser } from '../../helpers';

test.describe('Quick Log Validation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDefaultUser(page);
  });

  test('QL-03: should require asset selection before submit', async ({ page }) => {
    // Arrange
    const quickLogPage = new QuickLogPage(page);
    await quickLogPage.goto();

    // Act - select action without asset
    await quickLogPage.selectMaintenanceAction();

    // Assert - submit should be disabled or validation should prevent
    const isEnabled = await quickLogPage.isSubmitEnabled();
    expect(isEnabled).toBeFalsy();
  });

  test('QL-03b: should require action type before submit', async ({ page }) => {
    // Arrange
    const quickLogPage = new QuickLogPage(page);
    await quickLogPage.goto();

    // Act - select asset without action type
    await quickLogPage.selectAsset(TEST_ASSETS.excavator.name);

    // Assert - submit should be disabled
    const isEnabled = await quickLogPage.isSubmitEnabled();
    expect(isEnabled).toBeFalsy();
  });

  test('should enable submit when both asset and action selected', async ({ page }) => {
    // Arrange
    const quickLogPage = new QuickLogPage(page);
    await quickLogPage.goto();

    // Act - select both asset and action
    await quickLogPage.selectAsset(TEST_ASSETS.excavator.name);
    await quickLogPage.selectMaintenanceAction();

    // Assert - submit should now be enabled
    const isEnabled = await quickLogPage.isSubmitEnabled();
    expect(isEnabled).toBeTruthy();
  });

  test('should allow submission without notes (optional field)', async ({ page }) => {
    // Arrange
    const quickLogPage = new QuickLogPage(page);
    await quickLogPage.goto();

    // Act - complete without notes
    await quickLogPage.selectAsset(TEST_ASSETS.excavator.name);
    await quickLogPage.selectInspectionAction();
    // Don't enter any notes

    // Assert - submit should be enabled
    const isEnabled = await quickLogPage.isSubmitEnabled();
    expect(isEnabled).toBeTruthy();

    // And submission should work
    await quickLogPage.submitLog();
    await quickLogPage.waitForSubmitSuccess();
  });
});
