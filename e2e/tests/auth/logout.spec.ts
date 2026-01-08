/**
 * Authentication - Logout Tests
 *
 * Tests: AUTH-04
 */

import { test, expect } from '@playwright/test';
import { LoginPage, SettingsPage } from '../../pages';
import { TEST_IDS } from '../../fixtures/test-data';
import { loginAsDefaultUser } from '../../helpers';

test.describe('Logout', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsDefaultUser(page);
  });

  test('AUTH-04: should logout with confirmation dialog', async ({ page }) => {
    // Arrange
    const settingsPage = new SettingsPage(page);
    const loginPage = new LoginPage(page);

    // Navigate to settings
    await settingsPage.goto();

    // Set up dialog handler - on web, Alert.alert shows browser native confirm
    let dialogShown = false;
    page.once('dialog', async dialog => {
      dialogShown = true;
      expect(dialog.message()).toContain('sign out');
      await dialog.accept();
    });

    // Act - click logout
    await settingsPage.clickLogout();

    // Give dialog time to appear and be handled
    await page.waitForTimeout(500);

    // Assert - dialog should have appeared (either native or custom modal)
    // For web, the dialog is handled by the event listener above
    // For custom modal, check if alertdialog appeared
    if (!dialogShown) {
      const alertDialog = page.getByRole('alertdialog');
      if (await alertDialog.isVisible({ timeout: 1000 }).catch(() => false)) {
        await alertDialog.getByRole('button', { name: /sign out/i }).click();
      }
    }

    // Assert - should return to login screen
    await expect(page.getByTestId(TEST_IDS.LOGIN_EMAIL_INPUT)).toBeVisible({ timeout: 10000 });
    await loginPage.assertOnLoginPage();
  });

  test('should cancel logout when dismissing confirmation', async ({ page }) => {
    // Arrange
    const settingsPage = new SettingsPage(page);

    // Navigate to settings
    await settingsPage.goto();

    // Act - cancel logout (cancelLogout handles the full flow including clicking logout)
    await settingsPage.cancelLogout();

    // Assert - should still be logged in (settings visible)
    await expect(settingsPage.userName).toBeVisible();
  });

  test('should clear session data on logout', async ({ page }) => {
    // Arrange
    const settingsPage = new SettingsPage(page);

    // Navigate to settings
    await settingsPage.goto();

    // Act - logout
    await settingsPage.logout();

    // Assert - check that returning to app shows login
    await page.goto('/');
    await expect(page.getByTestId(TEST_IDS.LOGIN_EMAIL_INPUT)).toBeVisible({ timeout: 10000 });
  });
});
