/**
 * Create Work Order Page Object
 *
 * Encapsulates interactions with the create work order screen.
 */

import { Page, Locator, expect } from '@playwright/test';
import { TEST_IDS } from '../fixtures/test-data';

export class CreateWorkOrderPage {
  readonly page: Page;

  // Locators
  readonly titleInput: Locator;
  readonly assetPicker: Locator;
  readonly priorityPicker: Locator;
  readonly descriptionInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.getByTestId(TEST_IDS.CREATE_WO_TITLE_INPUT);
    this.assetPicker = page.getByTestId(TEST_IDS.CREATE_WO_ASSET_PICKER);
    this.priorityPicker = page.getByTestId(TEST_IDS.CREATE_WO_PRIORITY_PICKER);
    this.descriptionInput = page.getByTestId(TEST_IDS.CREATE_WO_DESCRIPTION_INPUT);
    this.submitButton = page.getByTestId(TEST_IDS.CREATE_WO_SUBMIT_BUTTON);
  }

  /**
   * Fill in the title field
   */
  async fillTitle(title: string): Promise<void> {
    await this.titleInput.fill(title);
  }

  /**
   * Open the asset picker
   */
  async openAssetPicker(): Promise<void> {
    await this.assetPicker.click();
  }

  /**
   * Select an asset
   */
  async selectAsset(assetName: string): Promise<void> {
    await this.openAssetPicker();
    await this.page.getByText(assetName, { exact: false }).click();
  }

  /**
   * Select a priority
   * Note: PriorityPicker is a chip-based selector (all options visible),
   * not a dropdown. Each chip has testID `{baseTestID}-{priority}`.
   */
  async selectPriority(priority: 'low' | 'medium' | 'high' | 'emergency'): Promise<void> {
    // Click the priority chip directly - chips have testID like "create-wo-priority-picker-high"
    const priorityChip = this.page.getByTestId(`${TEST_IDS.CREATE_WO_PRIORITY_PICKER}-${priority}`);
    await priorityChip.click();
  }

  /**
   * Fill in the description field
   */
  async fillDescription(description: string): Promise<void> {
    await this.descriptionInput.fill(description);
  }

  /**
   * Click the submit button
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Check if submit button is enabled
   */
  async isSubmitEnabled(): Promise<boolean> {
    return await this.submitButton.isEnabled();
  }

  /**
   * Create a complete work order
   */
  async createWorkOrder(options: {
    title: string;
    assetName: string;
    priority: 'low' | 'medium' | 'high' | 'emergency';
    description?: string;
  }): Promise<void> {
    await this.fillTitle(options.title);
    await this.selectAsset(options.assetName);
    await this.selectPriority(options.priority);
    if (options.description) {
      await this.fillDescription(options.description);
    }
    await this.submit();
  }

  /**
   * Wait for page to load
   */
  async waitForLoad(): Promise<void> {
    await expect(this.titleInput).toBeVisible({ timeout: 10000 });
  }

  /**
   * Wait for success after creation
   */
  async waitForCreateSuccess(): Promise<void> {
    // Wait for navigation back to list or success indicator
    await this.page
      .waitForSelector('[role="alert"]', { state: 'visible', timeout: 5000 })
      .catch(() => {
        // May navigate instead of showing toast
      });
  }
}
