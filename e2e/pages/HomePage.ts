/**
 * Home Page Object
 *
 * Encapsulates interactions with the home/dashboard screen.
 */

import { Page, Locator, expect } from '@playwright/test';
import { TEST_IDS } from '../fixtures/test-data';

export class HomePage {
  readonly page: Page;

  // Locators
  readonly syncCard: Locator;
  readonly syncStatus: Locator;
  readonly pendingCount: Locator;
  readonly quickStats: Locator;
  readonly greeting: Locator;

  // Tab navigation
  readonly homeTab: Locator;
  readonly assetsTab: Locator;
  readonly workOrdersTab: Locator;
  readonly quickLogTab: Locator;

  constructor(page: Page) {
    this.page = page;
    this.syncCard = page.getByTestId(TEST_IDS.HOME_SYNC_CARD);
    this.syncStatus = page.getByTestId(TEST_IDS.HOME_SYNC_STATUS);
    this.pendingCount = page.getByTestId(TEST_IDS.HOME_PENDING_COUNT);
    this.quickStats = page.getByTestId(TEST_IDS.HOME_QUICK_STATS);
    this.greeting = page.getByTestId(TEST_IDS.HOME_GREETING);

    this.homeTab = page.getByTestId(TEST_IDS.TAB_HOME);
    this.assetsTab = page.getByTestId(TEST_IDS.TAB_ASSETS);
    this.workOrdersTab = page.getByTestId(TEST_IDS.TAB_WORK_ORDERS);
    this.quickLogTab = page.getByTestId(TEST_IDS.TAB_QUICK_LOG);
  }

  /**
   * Navigate to home tab
   */
  async goto(): Promise<void> {
    await this.homeTab.click();
  }

  /**
   * Get the current sync status text
   */
  async getSyncStatus(): Promise<string> {
    await expect(this.syncStatus).toBeVisible();
    return (await this.syncStatus.textContent()) ?? '';
  }

  /**
   * Get the pending changes count
   * Returns 0 if the pending count element is not visible (no pending changes)
   */
  async getPendingCount(): Promise<number> {
    // The pending count element only renders when pendingChanges > 0
    const isVisible = await this.pendingCount.isVisible();
    if (!isVisible) {
      return 0;
    }
    const text = await this.pendingCount.textContent({ timeout: 5000 });
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * Click on the sync card to trigger sync
   */
  async triggerSync(): Promise<void> {
    await this.syncCard.click();
  }

  /**
   * Get the greeting text (includes user name)
   */
  async getGreeting(): Promise<string> {
    await expect(this.greeting).toBeVisible();
    return (await this.greeting.textContent()) ?? '';
  }

  /**
   * Navigate to Assets tab
   */
  async goToAssets(): Promise<void> {
    await this.assetsTab.click();
  }

  /**
   * Navigate to Work Orders tab
   */
  async goToWorkOrders(): Promise<void> {
    await this.workOrdersTab.click();
  }

  /**
   * Navigate to Quick Log tab
   */
  async goToQuickLog(): Promise<void> {
    await this.quickLogTab.click();
  }

  /**
   * Assert that we're on the home page
   */
  async assertOnHomePage(): Promise<void> {
    await expect(this.homeTab).toHaveAttribute('aria-selected', 'true');
  }

  /**
   * Wait for home page to load
   */
  async waitForLoad(): Promise<void> {
    await expect(this.greeting).toBeVisible({ timeout: 10000 });
  }
}
