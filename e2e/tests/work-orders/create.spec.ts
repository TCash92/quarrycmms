/**
 * Work Orders - Create Tests
 *
 * Tests: WO-03
 */

import { test, expect } from '@playwright/test';
import { WorkOrderListPage, CreateWorkOrderPage } from '../../pages';
import { TEST_ASSETS } from '../../fixtures/test-data';
import { loginAsDefaultUser } from '../../helpers';

test.describe('Create Work Order', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDefaultUser(page);
  });

  test('WO-03: should create a new work order', async ({ page }) => {
    // Arrange
    const workOrderListPage = new WorkOrderListPage(page);
    const createPage = new CreateWorkOrderPage(page);
    const testTitle = `Test WO - ${Date.now()}`;

    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();

    // Act - navigate to create screen
    await workOrderListPage.clickCreate();
    await createPage.waitForLoad();

    // Fill in work order details
    await createPage.createWorkOrder({
      title: testTitle,
      assetName: TEST_ASSETS.excavator.name,
      priority: 'high',
      description: 'E2E test work order',
    });

    // Assert - should return to list with new work order
    await createPage.waitForCreateSuccess();

    // Navigate back to list if not already there
    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();

    // Verify new work order appears
    const hasNewWO = await workOrderListPage.hasWorkOrder(testTitle);
    expect(hasNewWO).toBeTruthy();
  });

  test('should validate required fields', async ({ page }) => {
    // Arrange
    const workOrderListPage = new WorkOrderListPage(page);
    const createPage = new CreateWorkOrderPage(page);

    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();
    await workOrderListPage.clickCreate();
    await createPage.waitForLoad();

    // Act - try to submit without filling required fields
    // Assert - submit should be disabled
    const isEnabled = await createPage.isSubmitEnabled();
    expect(isEnabled).toBeFalsy();
  });

  test('should enable submit when required fields are filled', async ({ page }) => {
    // Arrange
    const workOrderListPage = new WorkOrderListPage(page);
    const createPage = new CreateWorkOrderPage(page);

    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();
    await workOrderListPage.clickCreate();
    await createPage.waitForLoad();

    // Act - fill required fields
    await createPage.fillTitle('Test Work Order');
    await createPage.selectAsset(TEST_ASSETS.excavator.name);
    await createPage.selectPriority('medium');

    // Assert - submit should be enabled
    const isEnabled = await createPage.isSubmitEnabled();
    expect(isEnabled).toBeTruthy();
  });

  test('should allow creating work order without description', async ({ page }) => {
    // Arrange
    const workOrderListPage = new WorkOrderListPage(page);
    const createPage = new CreateWorkOrderPage(page);
    const testTitle = `No Desc WO - ${Date.now()}`;

    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();
    await workOrderListPage.clickCreate();
    await createPage.waitForLoad();

    // Act - create without description
    await createPage.fillTitle(testTitle);
    await createPage.selectAsset(TEST_ASSETS.loader.name);
    await createPage.selectPriority('low');
    await createPage.submit();

    // Assert
    await createPage.waitForCreateSuccess();
  });

  test('should create emergency priority work order', async ({ page }) => {
    // Arrange
    const workOrderListPage = new WorkOrderListPage(page);
    const createPage = new CreateWorkOrderPage(page);
    const testTitle = `Emergency WO - ${Date.now()}`;

    await workOrderListPage.goto();
    await workOrderListPage.waitForLoad();
    await workOrderListPage.clickCreate();
    await createPage.waitForLoad();

    // Act
    await createPage.createWorkOrder({
      title: testTitle,
      assetName: TEST_ASSETS.crusher.name,
      priority: 'emergency',
      description: 'Critical failure - needs immediate attention',
    });

    // Assert
    await createPage.waitForCreateSuccess();
  });
});
