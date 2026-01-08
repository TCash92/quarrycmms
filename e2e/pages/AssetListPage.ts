/**
 * Asset List Page Object
 *
 * Encapsulates interactions with the assets list screen.
 */

import { Page, Locator, expect } from '@playwright/test';
import { TEST_IDS } from '../fixtures/test-data';

export class AssetListPage {
  readonly page: Page;

  // Locators
  readonly assetList: Locator;
  readonly searchInput: Locator;
  readonly filterAll: Locator;
  readonly filterOperational: Locator;
  readonly filterLimited: Locator;
  readonly filterDown: Locator;

  // Tab
  readonly assetsTab: Locator;

  constructor(page: Page) {
    this.page = page;
    this.assetList = page.getByTestId(TEST_IDS.ASSET_LIST);
    this.searchInput = page.getByTestId(TEST_IDS.ASSET_SEARCH);
    this.filterAll = page.getByTestId(TEST_IDS.ASSET_FILTER_ALL);
    this.filterOperational = page.getByTestId(TEST_IDS.ASSET_FILTER_OPERATIONAL);
    this.filterLimited = page.getByTestId(TEST_IDS.ASSET_FILTER_LIMITED);
    this.filterDown = page.getByTestId(TEST_IDS.ASSET_FILTER_DOWN);

    this.assetsTab = page.getByTestId(TEST_IDS.TAB_ASSETS);
  }

  /**
   * Navigate to Assets tab
   */
  async goto(): Promise<void> {
    await this.assetsTab.click();
  }

  /**
   * Search for assets
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  /**
   * Clear search input
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
  }

  /**
   * Filter by status
   */
  async filterByStatus(status: 'all' | 'operational' | 'limited' | 'down'): Promise<void> {
    switch (status) {
      case 'all':
        await this.filterAll.click();
        break;
      case 'operational':
        await this.filterOperational.click();
        break;
      case 'limited':
        await this.filterLimited.click();
        break;
      case 'down':
        await this.filterDown.click();
        break;
    }
  }

  /**
   * Get all visible asset cards
   */
  getAssetCards(): Locator {
    return this.page.getByTestId(TEST_IDS.ASSET_CARD);
  }

  /**
   * Get count of visible assets
   */
  async getAssetCount(): Promise<number> {
    return await this.getAssetCards().count();
  }

  /**
   * Open an asset by index
   */
  async openAssetByIndex(index: number): Promise<void> {
    const card = this.getAssetCards().nth(index);
    await card.waitFor({ state: 'visible', timeout: 10000 });
    // Use dispatchEvent for React Native Web TouchableOpacity compatibility
    await card.dispatchEvent('click');
  }

  /**
   * Open an asset by name
   */
  async openAsset(name: string): Promise<void> {
    // Find asset card containing this name and click it
    // More specific than getByText to avoid clicking work order references
    const assetCard = this.page.getByTestId(TEST_IDS.ASSET_CARD).filter({ hasText: name }).first();
    await assetCard.waitFor({ state: 'visible', timeout: 10000 });
    // Use dispatchEvent for React Native Web TouchableOpacity compatibility
    await assetCard.dispatchEvent('click');
  }

  /**
   * Open asset by asset number
   */
  async openAssetByNumber(assetNumber: string): Promise<void> {
    await this.page.getByText(assetNumber).click();
  }

  /**
   * Check if an asset with given name exists in list
   */
  async hasAsset(name: string): Promise<boolean> {
    const card = this.page.getByText(name, { exact: false });
    return await card.isVisible();
  }

  /**
   * Assert that we're on the assets list page
   */
  async assertOnAssetListPage(): Promise<void> {
    await expect(this.assetsTab).toHaveAttribute('aria-selected', 'true');
  }

  /**
   * Wait for list to load
   */
  async waitForLoad(): Promise<void> {
    await expect(this.assetList).toBeVisible({ timeout: 10000 });
  }
}
