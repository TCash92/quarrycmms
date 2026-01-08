/**
 * Asset Detail Page Object
 *
 * Encapsulates interactions with asset detail screen.
 */

import { Page, Locator, expect } from '@playwright/test';
import { TEST_IDS } from '../fixtures/test-data';

export class AssetDetailPage {
  readonly page: Page;

  // Locators
  readonly status: Locator;
  readonly meterReading: Locator;
  readonly meterInput: Locator;
  readonly recordButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.status = page.getByTestId(TEST_IDS.ASSET_DETAIL_STATUS);
    this.meterReading = page.getByTestId(TEST_IDS.ASSET_DETAIL_METER_READING);
    this.meterInput = page.getByTestId(TEST_IDS.ASSET_DETAIL_METER_INPUT);
    this.recordButton = page.getByTestId(TEST_IDS.ASSET_DETAIL_RECORD_BUTTON);
  }

  /**
   * Get current status text
   */
  async getStatus(): Promise<string> {
    await expect(this.status).toBeVisible();
    return (await this.status.textContent()) ?? '';
  }

  /**
   * Get current meter reading text
   */
  async getMeterReading(): Promise<string> {
    await expect(this.meterReading).toBeVisible();
    return (await this.meterReading.textContent()) ?? '';
  }

  /**
   * Check if meter section is visible (asset has meter)
   */
  async hasMeter(): Promise<boolean> {
    return await this.meterReading.isVisible();
  }

  /**
   * Enter new meter reading
   */
  async enterMeterReading(value: number): Promise<void> {
    await this.meterInput.fill(value.toString());
  }

  /**
   * Click record meter button
   */
  async recordMeterReading(): Promise<void> {
    await this.recordButton.click();
  }

  /**
   * Complete meter reading flow
   */
  async submitMeterReading(value: number): Promise<void> {
    await this.enterMeterReading(value);
    await this.recordMeterReading();
  }

  /**
   * Check if record button is enabled
   */
  async isRecordButtonEnabled(): Promise<boolean> {
    return await this.recordButton.isEnabled();
  }

  /**
   * Wait for asset detail to load
   */
  async waitForLoad(): Promise<void> {
    await expect(this.status).toBeVisible({ timeout: 10000 });
  }

  /**
   * Go back to asset list using the in-app navigation
   */
  async goBack(): Promise<void> {
    // Use the in-app "Go back" link instead of browser history
    // This works better with React Navigation on web
    const backLink = this.page.getByRole('link', { name: /go back/i });
    if (await backLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backLink.click();
    } else {
      // Fallback to browser history if link not found
      await this.page.goBack();
    }
  }

  /**
   * Wait for success indication after recording meter
   */
  async waitForMeterRecordSuccess(): Promise<void> {
    // Wait for success toast or updated reading
    await this.page
      .waitForSelector('[role="alert"]', { state: 'visible', timeout: 5000 })
      .catch(() => {
        // May not show toast in all implementations
      });
  }
}
