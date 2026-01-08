/**
 * Work Order List Page Object
 *
 * Encapsulates interactions with the work orders list screen.
 */

import { Page, Locator, expect } from '@playwright/test';
import { TEST_IDS } from '../fixtures/test-data';

export class WorkOrderListPage {
  readonly page: Page;

  // Locators
  readonly workOrderList: Locator;
  readonly searchInput: Locator;
  readonly filterAll: Locator;
  readonly filterOpen: Locator;
  readonly filterInProgress: Locator;
  readonly filterCompleted: Locator;
  readonly createButton: Locator;

  // Tab
  readonly workOrdersTab: Locator;

  constructor(page: Page) {
    this.page = page;
    this.workOrderList = page.getByTestId(TEST_IDS.WORK_ORDER_LIST);
    this.searchInput = page.getByTestId(TEST_IDS.WORK_ORDER_SEARCH);
    this.filterAll = page.getByTestId(TEST_IDS.WORK_ORDER_FILTER_ALL);
    this.filterOpen = page.getByTestId(TEST_IDS.WORK_ORDER_FILTER_OPEN);
    this.filterInProgress = page.getByTestId(TEST_IDS.WORK_ORDER_FILTER_IN_PROGRESS);
    this.filterCompleted = page.getByTestId(TEST_IDS.WORK_ORDER_FILTER_COMPLETED);
    this.createButton = page.getByTestId(TEST_IDS.WORK_ORDER_CREATE_BUTTON);

    this.workOrdersTab = page.getByTestId(TEST_IDS.TAB_WORK_ORDERS);
  }

  /**
   * Navigate to Work Orders tab
   */
  async goto(): Promise<void> {
    await this.workOrdersTab.click();
  }

  /**
   * Search for work orders
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
  async filterByStatus(status: 'all' | 'open' | 'in_progress' | 'completed'): Promise<void> {
    switch (status) {
      case 'all':
        await this.filterAll.click();
        break;
      case 'open':
        await this.filterOpen.click();
        break;
      case 'in_progress':
        await this.filterInProgress.click();
        break;
      case 'completed':
        await this.filterCompleted.click();
        break;
    }
  }

  /**
   * Get all visible work order cards
   */
  getWorkOrderCards(): Locator {
    return this.page.getByTestId(TEST_IDS.WORK_ORDER_CARD);
  }

  /**
   * Get count of visible work orders
   */
  async getWorkOrderCount(): Promise<number> {
    return await this.getWorkOrderCards().count();
  }

  /**
   * Open a work order by index
   */
  async openWorkOrderByIndex(index: number): Promise<void> {
    await this.getWorkOrderCards().nth(index).click();
  }

  /**
   * Open a work order by title
   */
  async openWorkOrder(title: string): Promise<void> {
    await this.page.getByText(title, { exact: false }).click();
  }

  /**
   * Open work order by WO number
   */
  async openWorkOrderByNumber(woNumber: string): Promise<void> {
    await this.page.getByText(woNumber).click();
  }

  /**
   * Click create new work order button
   */
  async clickCreate(): Promise<void> {
    await this.createButton.click();
  }

  /**
   * Check if a work order with given title exists in list
   */
  async hasWorkOrder(title: string): Promise<boolean> {
    const card = this.page.getByText(title, { exact: false });
    return await card.isVisible();
  }

  /**
   * Assert that we're on the work orders list page
   */
  async assertOnWorkOrderListPage(): Promise<void> {
    await expect(this.workOrdersTab).toHaveAttribute('aria-selected', 'true');
  }

  /**
   * Wait for list to load
   */
  async waitForLoad(): Promise<void> {
    await expect(this.workOrderList).toBeVisible({ timeout: 10000 });
  }
}
