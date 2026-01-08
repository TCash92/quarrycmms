/**
 * Authentication - Login Tests
 *
 * Tests: AUTH-01, AUTH-02, AUTH-03
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages';
import { TEST_USERS, TEST_IDS } from '../../fixtures/test-data';
import { ensureLoggedOut } from '../../helpers';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure logged out state
    await ensureLoggedOut(page);
  });

  test('AUTH-01: should login with valid credentials', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act
    await loginPage.login(TEST_USERS.technician.email, TEST_USERS.technician.password);

    // Assert - should navigate to home screen
    await loginPage.waitForLoginComplete();
    await expect(page.getByTestId(TEST_IDS.TAB_HOME)).toBeVisible();
  });

  test('AUTH-02: should show error for invalid credentials', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Act - login with wrong password
    await loginPage.login(TEST_USERS.technician.email, 'WrongPassword123!');

    // Assert - should show error message
    const errorText = await loginPage.getErrorText();
    expect(errorText.toLowerCase()).toContain('invalid');
  });

  test('AUTH-02b: should show error for non-existent user', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Act - login with non-existent email
    await loginPage.login('nobody@quarrysite.com', 'TestPassword123!');

    // Assert - should show error message
    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('AUTH-03: should show error when server is unavailable', async ({ page }) => {
    // Arrange - load page while online
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Set mock store to simulate offline/server unavailable
    await page.evaluate(() => {
      const mockStore = (window as unknown as { __E2E_MOCK_STORE__: { isOnline: boolean } })
        .__E2E_MOCK_STORE__;
      if (mockStore) {
        mockStore.isOnline = false;
      }
    });

    // Act - try to login while "offline" (mock returns 503)
    await loginPage.fillEmail(TEST_USERS.technician.email);
    await loginPage.fillPassword(TEST_USERS.technician.password);
    await loginPage.clickSubmit();

    // Assert - should show error message (network unavailable)
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });

    // Cleanup - restore online state
    await page.evaluate(() => {
      const mockStore = (window as unknown as { __E2E_MOCK_STORE__: { isOnline: boolean } })
        .__E2E_MOCK_STORE__;
      if (mockStore) {
        mockStore.isOnline = true;
      }
    });
  });

  test('should require email and password fields', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Act - try to submit without filling fields
    await loginPage.clickSubmit();

    // Assert - should not navigate away or show validation
    await expect(loginPage.emailInput).toBeVisible();
    // Form should still be on login page
    await loginPage.assertOnLoginPage();
  });

  test('should preserve email on failed login attempt', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    const testEmail = TEST_USERS.technician.email;
    await loginPage.goto();

    // Act
    await loginPage.fillEmail(testEmail);
    await loginPage.fillPassword('WrongPassword');
    await loginPage.clickSubmit();

    // Assert - email should still be filled
    await expect(loginPage.emailInput).toHaveValue(testEmail);
  });
});
