/**
 * Settings Page Object
 *
 * Encapsulates interactions with the settings screen.
 */

import { Page, Locator, expect } from '@playwright/test';
import { TEST_IDS } from '../fixtures/test-data';

export class SettingsPage {
  readonly page: Page;

  // Locators
  readonly userName: Locator;
  readonly userEmail: Locator;
  readonly userRole: Locator;
  readonly syncStatus: Locator;
  readonly syncDetails: Locator;
  readonly logoutButton: Locator;
  readonly logoutConfirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.userName = page.getByTestId(TEST_IDS.SETTINGS_USER_NAME);
    this.userEmail = page.getByTestId(TEST_IDS.SETTINGS_USER_EMAIL);
    this.userRole = page.getByTestId(TEST_IDS.SETTINGS_USER_ROLE);
    this.syncStatus = page.getByTestId(TEST_IDS.SETTINGS_SYNC_STATUS);
    this.syncDetails = page.getByTestId(TEST_IDS.SETTINGS_SYNC_DETAILS);
    this.logoutButton = page.getByTestId(TEST_IDS.SETTINGS_LOGOUT_BUTTON);
    // On web, Alert.alert renders as alertdialog with buttons - use role-based selector
    this.logoutConfirmButton = page.getByRole('button', { name: /sign out/i }).locator('nth=-1');
  }

  /**
   * Navigate to settings (usually via profile icon or menu)
   */
  async goto(): Promise<void> {
    // Settings is typically accessed via a header button or menu
    // Look for common patterns
    const settingsButton = this.page.getByRole('button', { name: /settings|profile|account/i });
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
    } else {
      // Try gear icon or similar
      const gearIcon = this.page
        .locator('[data-testid*="settings"], [aria-label*="Settings"]')
        .first();
      await gearIcon.click();
    }
  }

  /**
   * Get user name
   */
  async getUserName(): Promise<string> {
    await expect(this.userName).toBeVisible();
    return (await this.userName.textContent()) ?? '';
  }

  /**
   * Get user email
   */
  async getUserEmail(): Promise<string> {
    await expect(this.userEmail).toBeVisible();
    return (await this.userEmail.textContent()) ?? '';
  }

  /**
   * Get user role
   */
  async getUserRole(): Promise<string> {
    await expect(this.userRole).toBeVisible();
    return (await this.userRole.textContent()) ?? '';
  }

  /**
   * Get sync status text
   */
  async getSyncStatus(): Promise<string> {
    await expect(this.syncStatus).toBeVisible();
    return (await this.syncStatus.textContent()) ?? '';
  }

  /**
   * Open sync details
   */
  async openSyncDetails(): Promise<void> {
    await this.syncDetails.click();
  }

  /**
   * Click logout button
   */
  async clickLogout(): Promise<void> {
    await this.logoutButton.click();
  }

  /**
   * Confirm logout in confirmation dialog
   * On web, Alert.alert shows a native browser dialog
   */
  async confirmLogout(): Promise<void> {
    // Try custom modal button first (in case app uses custom dialog)
    const confirmButton = this.page
      .getByRole('alertdialog')
      .getByRole('button', { name: /sign out/i });
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    } else {
      // Handle browser native dialog through Playwright's dialog API
      // The dialog was already accepted by the event listener
    }
  }

  /**
   * Complete logout flow
   */
  async logout(): Promise<void> {
    // Set up dialog handler for browser native confirm
    this.page.once('dialog', dialog => dialog.accept());
    await this.clickLogout();
    // If it's a custom modal, confirm it
    await this.confirmLogout().catch(() => {});
  }

  /**
   * Cancel logout (dismiss confirmation)
   */
  async cancelLogout(): Promise<void> {
    // Set up dialog handler to dismiss
    this.page.once('dialog', dialog => dialog.dismiss());
    await this.clickLogout();
    // If it's a custom modal, click cancel
    const cancelButton = this.page
      .getByRole('alertdialog')
      .getByRole('button', { name: /cancel/i });
    if (await cancelButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cancelButton.click();
    }
  }

  /**
   * Assert user info is displayed correctly
   */
  async assertUserInfo(expected: { name?: string; email?: string; role?: string }): Promise<void> {
    if (expected.name) {
      await expect(this.userName).toContainText(expected.name);
    }
    if (expected.email) {
      await expect(this.userEmail).toContainText(expected.email);
    }
    if (expected.role) {
      await expect(this.userRole).toContainText(expected.role);
    }
  }

  /**
   * Wait for settings page to load
   */
  async waitForLoad(): Promise<void> {
    await expect(this.userName).toBeVisible({ timeout: 10000 });
  }
}
