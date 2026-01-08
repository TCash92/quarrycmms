/**
 * Settings - Display Tests
 *
 * Tests: SET-01, SET-02
 */

import { test, expect } from '@playwright/test';
import { SettingsPage } from '../../pages';
import { TEST_USERS } from '../../fixtures/test-data';
import { loginAsDefaultUser, loginAsSupervisor } from '../../helpers';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDefaultUser(page);
  });

  test('SET-01: should display account info', async ({ page }) => {
    // Arrange
    const settingsPage = new SettingsPage(page);

    // Act
    await settingsPage.goto();
    await settingsPage.waitForLoad();

    // Assert - user info should be displayed
    await settingsPage.assertUserInfo({
      name: TEST_USERS.technician.name,
      email: TEST_USERS.technician.email,
      role: TEST_USERS.technician.role,
    });
  });

  test('SET-02: should navigate to sync details', async ({ page }) => {
    // Arrange
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await settingsPage.waitForLoad();

    // Act
    await settingsPage.openSyncDetails();

    // Assert - sync details screen should be visible
    // Look for the sync details status section which has a unique testID
    await expect(page.getByTestId('sync-details-status')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should display sync status', async ({ page }) => {
    // Arrange
    const settingsPage = new SettingsPage(page);

    // Act
    await settingsPage.goto();
    await settingsPage.waitForLoad();

    // Assert
    const syncStatus = await settingsPage.getSyncStatus();
    expect(syncStatus).toBeTruthy();
  });
});

test.describe('Settings - Supervisor View', () => {
  test('should display supervisor role info', async ({ page }) => {
    // Arrange - login as supervisor
    await loginAsSupervisor(page);
    const settingsPage = new SettingsPage(page);

    // Act
    await settingsPage.goto();
    await settingsPage.waitForLoad();

    // Assert
    await settingsPage.assertUserInfo({
      name: TEST_USERS.supervisor.name,
      email: TEST_USERS.supervisor.email,
      role: TEST_USERS.supervisor.role,
    });
  });
});
