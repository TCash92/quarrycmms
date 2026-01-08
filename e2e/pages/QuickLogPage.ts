/**
 * Quick Log Page Object
 *
 * Encapsulates interactions with the quick log screen.
 * Quick Log is the core 30-second maintenance entry flow.
 */

import { Page, Locator, expect } from '@playwright/test';
import { TEST_IDS } from '../fixtures/test-data';

export class QuickLogPage {
  readonly page: Page;

  // Locators
  readonly recentAssets: Locator;
  readonly assetPicker: Locator;
  readonly emergencyAction: Locator;
  readonly maintenanceAction: Locator;
  readonly inspectionAction: Locator;
  readonly noteInput: Locator;
  readonly submitButton: Locator;
  readonly unenrichedBadge: Locator;

  // Tab
  readonly quickLogTab: Locator;

  constructor(page: Page) {
    this.page = page;
    this.recentAssets = page.getByTestId(TEST_IDS.QUICK_LOG_RECENT_ASSETS);
    this.assetPicker = page.getByTestId(TEST_IDS.QUICK_LOG_ASSET_PICKER);
    this.emergencyAction = page.getByTestId(TEST_IDS.QUICK_LOG_ACTION_EMERGENCY);
    this.maintenanceAction = page.getByTestId(TEST_IDS.QUICK_LOG_ACTION_MAINTENANCE);
    this.inspectionAction = page.getByTestId(TEST_IDS.QUICK_LOG_ACTION_INSPECTION);
    this.noteInput = page.getByTestId(TEST_IDS.QUICK_LOG_NOTE_INPUT);
    this.submitButton = page.getByTestId(TEST_IDS.QUICK_LOG_SUBMIT_BUTTON);
    this.unenrichedBadge = page.getByTestId(TEST_IDS.QUICK_LOG_UNENRICHED_BADGE);

    this.quickLogTab = page.getByTestId(TEST_IDS.TAB_QUICK_LOG);
  }

  /**
   * Navigate to Quick Log tab
   */
  async goto(): Promise<void> {
    await this.quickLogTab.click();
  }

  /**
   * Open the asset picker modal
   */
  async openAssetPicker(): Promise<void> {
    await this.assetPicker.click();
  }

  /**
   * Select an asset from recent assets list (radio buttons in "Recently Worked On" section)
   */
  async selectRecentAsset(index: number = 0): Promise<void> {
    // Recent assets are displayed as radio buttons with "Select <assetNumber> <assetName>" labels
    const radios = this.page.getByRole('radio', { name: /^Select/ });
    await radios.nth(index).click();
  }

  /**
   * Select an asset by searching in the picker
   */
  async selectAssetBySearch(searchText: string): Promise<void> {
    await this.openAssetPicker();
    const dialog = this.page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible' });
    // Search input in modal
    await dialog.getByPlaceholder(/search/i).fill(searchText);
    // Wait for search to filter results
    await this.page.waitForTimeout(300);
    // Click first button result (excluding Cancel button)
    const assetButtons = dialog.getByRole('button').filter({ hasNotText: /cancel/i });
    await assetButtons.first().click();
    // Wait for dialog to close
    await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  /**
   * Select an asset by name (clicks matching asset in picker modal)
   */
  async selectAsset(assetName: string): Promise<void> {
    await this.openAssetPicker();
    // Wait for the dialog to be visible
    const dialog = this.page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible' });
    // Click the button in the modal that contains the asset name
    // Modal uses buttons (not radio buttons) for asset selection
    await dialog.getByRole('button', { name: new RegExp(assetName, 'i') }).click();
    // Wait for dialog to close
    await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {
      // Dialog may already be closed
    });
  }

  /**
   * Select the Emergency/Repair action type
   */
  async selectEmergencyAction(): Promise<void> {
    await this.emergencyAction.click();
  }

  /**
   * Select the Maintenance/PM action type
   */
  async selectMaintenanceAction(): Promise<void> {
    await this.maintenanceAction.click();
  }

  /**
   * Select the Inspection action type
   */
  async selectInspectionAction(): Promise<void> {
    await this.inspectionAction.click();
  }

  /**
   * Select an action type by type string
   */
  async selectActionType(type: 'emergency' | 'maintenance' | 'inspection'): Promise<void> {
    switch (type) {
      case 'emergency':
        await this.selectEmergencyAction();
        break;
      case 'maintenance':
        await this.selectMaintenanceAction();
        break;
      case 'inspection':
        await this.selectInspectionAction();
        break;
    }
  }

  /**
   * Enter a note
   */
  async enterNote(note: string): Promise<void> {
    await this.noteInput.fill(note);
  }

  /**
   * Submit the quick log
   */
  async submitLog(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Complete full quick log flow
   */
  async completeQuickLog(options: {
    assetName?: string;
    actionType: 'emergency' | 'maintenance' | 'inspection';
    note?: string;
  }): Promise<void> {
    if (options.assetName) {
      await this.selectAsset(options.assetName);
    }
    await this.selectActionType(options.actionType);
    if (options.note) {
      await this.enterNote(options.note);
    }
    await this.submitLog();
  }

  /**
   * Check if submit button is enabled
   */
  async isSubmitEnabled(): Promise<boolean> {
    return await this.submitButton.isEnabled();
  }

  /**
   * Check if unenriched badge is visible
   */
  async isUnenrichedBadgeVisible(): Promise<boolean> {
    return await this.unenrichedBadge.isVisible();
  }

  /**
   * Assert that we're on the quick log page
   */
  async assertOnQuickLogPage(): Promise<void> {
    await expect(this.quickLogTab).toHaveAttribute('aria-selected', 'true');
  }

  /**
   * Wait for success indication after submit
   */
  async waitForSubmitSuccess(): Promise<void> {
    // Wait for success toast or navigation
    await this.page
      .waitForSelector('[role="alert"]', { state: 'visible', timeout: 5000 })
      .catch(() => {
        // Some implementations may navigate instead of showing toast
      });
  }
}
