/**
 * Work Orders - List Tests
 *
 * Tests: WO-01, WO-02
 */

import { test, expect } from '@playwright/test';
import { WorkOrderListPage, HomePage } from '../../pages';
import { TEST_WORK_ORDERS } from '../../fixtures/test-data';
import { loginAsDefaultUser } from '../../helpers';

test.describe('Work Order List', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDefaultUser(page);
  });

  test('WO-01: should display work orders with status filters', async ({ page }) => {
    // Arrange
    const workOrderListPage = new WorkOrderListPage(page);
    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();

    // Assert - filters should be visible
    await expect(workOrderListPage.filterAll).toBeVisible();
    await expect(workOrderListPage.filterOpen).toBeVisible();
    await expect(workOrderListPage.filterInProgress).toBeVisible();
    await expect(workOrderListPage.filterCompleted).toBeVisible();

    // Assert - work orders should be displayed
    const count = await workOrderListPage.getWorkOrderCount();
    expect(count).toBeGreaterThan(0);
  });

  test('WO-01b: should filter by Open status', async ({ page }) => {
    // Arrange
    const workOrderListPage = new WorkOrderListPage(page);
    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();

    // Act
    await workOrderListPage.filterByStatus('open');

    // Assert - should show open work orders
    const hasOpenWO = await workOrderListPage.hasWorkOrder(TEST_WORK_ORDERS.openHighPriority.title);
    expect(hasOpenWO).toBeTruthy();
  });

  test('WO-01c: should filter by In Progress status', async ({ page }) => {
    // Arrange
    const workOrderListPage = new WorkOrderListPage(page);
    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();

    // Act
    await workOrderListPage.filterByStatus('in_progress');

    // Assert - should show in-progress work orders
    const hasInProgressWO = await workOrderListPage.hasWorkOrder(TEST_WORK_ORDERS.inProgress.title);
    expect(hasInProgressWO).toBeTruthy();
  });

  test('WO-01d: should filter by Completed status', async ({ page }) => {
    // Arrange
    const workOrderListPage = new WorkOrderListPage(page);
    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();

    // Act
    await workOrderListPage.filterByStatus('completed');

    // Assert - should show completed work orders
    const hasCompletedWO = await workOrderListPage.hasWorkOrder(TEST_WORK_ORDERS.completed.title);
    expect(hasCompletedWO).toBeTruthy();
  });

  test('WO-02: should search work orders by title', async ({ page }) => {
    // Arrange
    const workOrderListPage = new WorkOrderListPage(page);
    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();

    // Act - search for specific work order
    await workOrderListPage.search('hydraulic');

    // Assert - should filter to matching work orders
    const hasMatch = await workOrderListPage.hasWorkOrder(TEST_WORK_ORDERS.openHighPriority.title);
    expect(hasMatch).toBeTruthy();
  });

  test('WO-02b: should search work orders by WO number', async ({ page }) => {
    // Arrange
    const workOrderListPage = new WorkOrderListPage(page);
    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();

    // Act
    await workOrderListPage.search(TEST_WORK_ORDERS.openHighPriority.woNumber);

    // Assert
    const hasMatch = await workOrderListPage.hasWorkOrder(TEST_WORK_ORDERS.openHighPriority.title);
    expect(hasMatch).toBeTruthy();
  });

  test('should clear search and show all work orders', async ({ page }) => {
    // Arrange
    const workOrderListPage = new WorkOrderListPage(page);
    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();

    const initialCount = await workOrderListPage.getWorkOrderCount();

    // Act - search then clear
    await workOrderListPage.search('hydraulic');
    await workOrderListPage.clearSearch();

    // Assert - should show all work orders again
    const countAfterClear = await workOrderListPage.getWorkOrderCount();
    expect(countAfterClear).toBe(initialCount);
  });

  test('should navigate to work orders from home', async ({ page }) => {
    // Arrange
    const homePage = new HomePage(page);

    // Act
    await homePage.goToWorkOrders();

    // Assert
    const workOrderListPage = new WorkOrderListPage(page);
    await workOrderListPage.assertOnWorkOrderListPage();
  });
});
