/**
 * Navigation Helpers
 *
 * Utilities for navigating between screens in E2E tests.
 */

import { Page, expect } from '@playwright/test';
import { TEST_IDS } from '../fixtures/test-data';

export type TabName = 'home' | 'assets' | 'work-orders' | 'quick-log';

/**
 * Navigate to a specific tab
 */
export async function navigateToTab(page: Page, tab: TabName): Promise<void> {
  const testIds: Record<TabName, string> = {
    home: TEST_IDS.TAB_HOME,
    assets: TEST_IDS.TAB_ASSETS,
    'work-orders': TEST_IDS.TAB_WORK_ORDERS,
    'quick-log': TEST_IDS.TAB_QUICK_LOG,
  };

  const tabElement = page.getByTestId(testIds[tab]);
  await tabElement.click();
}

/**
 * Assert current tab is selected
 */
export async function assertActiveTab(page: Page, tab: TabName): Promise<void> {
  const testIds: Record<TabName, string> = {
    home: TEST_IDS.TAB_HOME,
    assets: TEST_IDS.TAB_ASSETS,
    'work-orders': TEST_IDS.TAB_WORK_ORDERS,
    'quick-log': TEST_IDS.TAB_QUICK_LOG,
  };

  const tabElement = page.getByTestId(testIds[tab]);
  await expect(tabElement).toHaveAttribute('aria-selected', 'true');
}

/**
 * Wait for tab navigation to complete
 */
export async function waitForTabContent(page: Page, tab: TabName): Promise<void> {
  const contentTestIds: Record<TabName, string> = {
    home: TEST_IDS.HOME_GREETING,
    assets: TEST_IDS.ASSET_LIST,
    'work-orders': TEST_IDS.WORK_ORDER_LIST,
    'quick-log': TEST_IDS.QUICK_LOG_ASSET_PICKER,
  };

  await page.getByTestId(contentTestIds[tab]).waitFor({ state: 'visible', timeout: 10000 });
}

/**
 * Navigate to tab and wait for content
 */
export async function goToTab(page: Page, tab: TabName): Promise<void> {
  await navigateToTab(page, tab);
  await waitForTabContent(page, tab);
}

/**
 * Go back to previous screen
 */
export async function goBack(page: Page): Promise<void> {
  await page.goBack();
}

/**
 * Check if bottom tab navigation is visible (indicates authenticated state)
 */
export async function isBottomNavVisible(page: Page): Promise<boolean> {
  return await page
    .getByTestId(TEST_IDS.TAB_HOME)
    .isVisible()
    .catch(() => false);
}

/**
 * Wait for any loading states to complete
 */
export async function waitForLoadingComplete(page: Page): Promise<void> {
  // Wait for common loading indicators to disappear
  const loadingIndicators = page.locator('[data-testid*="loading"], [role="progressbar"]');

  try {
    await loadingIndicators.first().waitFor({ state: 'hidden', timeout: 5000 });
  } catch {
    // No loading indicator found or already hidden
  }
}

/**
 * Scroll to bottom of a list
 */
export async function scrollToBottom(page: Page, listTestId: string): Promise<void> {
  const list = page.getByTestId(listTestId);
  await list.evaluate(el => {
    el.scrollTop = el.scrollHeight;
  });
}

/**
 * Scroll to top of a list
 */
export async function scrollToTop(page: Page, listTestId: string): Promise<void> {
  const list = page.getByTestId(listTestId);
  await list.evaluate(el => {
    el.scrollTop = 0;
  });
}

/**
 * Pull to refresh (simulated)
 */
export async function pullToRefresh(page: Page, listTestId: string): Promise<void> {
  const list = page.getByTestId(listTestId);
  const box = await list.boundingBox();

  if (box) {
    // Simulate pull down gesture
    await page.mouse.move(box.x + box.width / 2, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + 200, { steps: 10 });
    await page.mouse.up();
  }
}
