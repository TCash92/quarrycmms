/**
 * Authentication Helpers
 *
 * Utilities for login/logout operations in E2E tests.
 */

import { Page } from '@playwright/test';
import { LoginPage, HomePage } from '../pages';
import { DEFAULT_USER, TEST_USERS } from '../fixtures/test-data';
import { seedTestData } from './database.helper';

export interface TestUser {
  email: string;
  password: string;
  name: string;
  role: string;
}

/**
 * Login with default test user and seed database with test data
 */
export async function loginAsDefaultUser(page: Page): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(DEFAULT_USER.email, DEFAULT_USER.password);
  await loginPage.waitForLoginComplete();
  // Seed the database with test data after login
  await seedTestData(page);
}

/**
 * Login with technician user and seed database
 */
export async function loginAsTechnician(page: Page): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(TEST_USERS.technician.email, TEST_USERS.technician.password);
  await loginPage.waitForLoginComplete();
  await seedTestData(page);
}

/**
 * Login with supervisor user and seed database
 */
export async function loginAsSupervisor(page: Page): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(TEST_USERS.supervisor.email, TEST_USERS.supervisor.password);
  await loginPage.waitForLoginComplete();
  await seedTestData(page);
}

/**
 * Login with custom credentials
 */
export async function loginWithCredentials(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(email, password);
}

/**
 * Logout current user
 */
export async function logout(page: Page): Promise<void> {
  // Navigate to settings and logout
  const homePage = new HomePage(page);
  // First go to home
  await homePage.goto();

  // Find and click settings/profile
  const settingsButton = page
    .getByRole('button', { name: /settings|profile|account/i })
    .or(page.locator('[data-testid*="settings"]'));

  if (await settingsButton.first().isVisible()) {
    await settingsButton.first().click();
  }

  // Click logout
  await page.getByTestId('settings-logout-button').click();
  // Confirm
  await page.getByTestId('settings-logout-confirm').click();

  // Wait for redirect to login
  await page.getByTestId('login-email-input').waitFor({ state: 'visible', timeout: 10000 });
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  // Check for presence of main navigation tabs
  return await page
    .getByTestId('tab-home')
    .isVisible()
    .catch(() => false);
}

/**
 * Ensure user is logged out (call at start of auth tests)
 */
export async function ensureLoggedOut(page: Page): Promise<void> {
  await page.goto('/');

  // If we see the login form, we're logged out
  const loginInput = page.getByTestId('login-email-input');
  if (await loginInput.isVisible().catch(() => false)) {
    return;
  }

  // Otherwise, try to logout
  try {
    await logout(page);
  } catch {
    // If logout fails, clear storage and reload
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  }
}
