/**
 * Work Orders - Completion Tests
 *
 * Tests: WO-04, WO-05
 */

import { test, expect } from '@playwright/test';
import { WorkOrderListPage, WorkOrderDetailPage } from '../../pages';
import { TEST_WORK_ORDERS } from '../../fixtures/test-data';
import { loginAsDefaultUser } from '../../helpers';

test.describe('Work Order Completion', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDefaultUser(page);
  });

  test('WO-04: should start and complete work order with timer and signature', async ({ page }) => {
    // Arrange
    const workOrderListPage = new WorkOrderListPage(page);
    const detailPage = new WorkOrderDetailPage(page);

    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();

    // Open an open work order
    await workOrderListPage.filterByStatus('open');
    await workOrderListPage.openWorkOrder(TEST_WORK_ORDERS.openHighPriority.title);
    await detailPage.waitForLoad();

    // Act - Start the work order
    await detailPage.startWorkOrder();

    // Assert - timer should be visible
    await expect(detailPage.timer).toBeVisible({ timeout: 5000 });
    const isTimerVisible = await detailPage.isTimerVisible();
    expect(isTimerVisible).toBeTruthy();

    // Act - Complete the work order (this will navigate back to the list)
    await detailPage.completeWorkOrder({
      failureType: 'none',
      notes: 'Completed successfully in E2E test',
      captureSignature: true,
    });

    // After completion, the app navigates back to the list
    // We need to re-open the work order to see the verification code
    await workOrderListPage.waitForLoad();
    await workOrderListPage.filterByStatus('completed');
    // Wait for the filter to apply and list to update
    await page.waitForTimeout(500);
    await workOrderListPage.openWorkOrder(TEST_WORK_ORDERS.openHighPriority.title);
    await detailPage.waitForLoad();

    // Assert - verification code should appear on the completed work order
    await expect(detailPage.verificationCode).toBeVisible({ timeout: 10000 });
  });

  test('WO-05: should require signature to complete work order', async ({ page }) => {
    // Arrange
    const workOrderListPage = new WorkOrderListPage(page);
    const detailPage = new WorkOrderDetailPage(page);

    // Start fresh by filtering to in-progress work orders
    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();
    await workOrderListPage.filterByStatus('in_progress');
    await workOrderListPage.openWorkOrder(TEST_WORK_ORDERS.inProgress.title);
    await detailPage.waitForLoad();

    // Act - try to complete without signature
    await detailPage.clickComplete();

    // Fill notes but don't capture signature
    await detailPage.enterCompletionNotes('Test notes');
    await detailPage.selectFailureType('none');

    // Assert - submit should be disabled without signature
    const isEnabled = await detailPage.isSubmitCompletionEnabled();
    expect(isEnabled).toBeFalsy();
  });

  test('should enable completion after capturing signature', async ({ page }) => {
    // Arrange
    const workOrderListPage = new WorkOrderListPage(page);
    const detailPage = new WorkOrderDetailPage(page);

    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();
    await workOrderListPage.filterByStatus('in_progress');
    await workOrderListPage.openWorkOrder(TEST_WORK_ORDERS.inProgress.title);
    await detailPage.waitForLoad();

    // Act - open completion form and capture signature
    await detailPage.clickComplete();
    await detailPage.captureSignature();

    // Assert - signature captured indicator should be visible
    const isCaptured = await detailPage.isSignatureCaptured();
    expect(isCaptured).toBeTruthy();

    // Submit should now be enabled
    const isEnabled = await detailPage.isSubmitCompletionEnabled();
    expect(isEnabled).toBeTruthy();
  });

  test('should display status correctly on detail page', async ({ page }) => {
    // Arrange
    const workOrderListPage = new WorkOrderListPage(page);
    const detailPage = new WorkOrderDetailPage(page);

    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();

    // Open an open work order
    await workOrderListPage.filterByStatus('open');
    await workOrderListPage.openWorkOrderByIndex(0);
    await detailPage.waitForLoad();

    // Assert
    const status = await detailPage.getStatus();
    expect(status.toLowerCase()).toContain('open');
  });

  test('should display priority on detail page', async ({ page }) => {
    // Arrange
    const workOrderListPage = new WorkOrderListPage(page);
    const detailPage = new WorkOrderDetailPage(page);

    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();
    await workOrderListPage.openWorkOrder(TEST_WORK_ORDERS.openHighPriority.title);
    await detailPage.waitForLoad();

    // Assert
    const priority = await detailPage.getPriority();
    expect(priority.toLowerCase()).toContain('high');
  });

  test('should show start button for open work orders', async ({ page }) => {
    // Arrange
    const workOrderListPage = new WorkOrderListPage(page);
    const detailPage = new WorkOrderDetailPage(page);

    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();
    await workOrderListPage.filterByStatus('open');
    await workOrderListPage.openWorkOrderByIndex(0);
    await detailPage.waitForLoad();

    // Assert
    const isStartVisible = await detailPage.isStartButtonVisible();
    expect(isStartVisible).toBeTruthy();
  });

  test('should show complete button for in-progress work orders', async ({ page }) => {
    // Arrange
    const workOrderListPage = new WorkOrderListPage(page);
    const detailPage = new WorkOrderDetailPage(page);

    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();
    await workOrderListPage.filterByStatus('in_progress');
    await workOrderListPage.openWorkOrderByIndex(0);
    await detailPage.waitForLoad();

    // Assert
    const isCompleteVisible = await detailPage.isCompleteButtonVisible();
    expect(isCompleteVisible).toBeTruthy();
  });
});
