/**
 * Login Page Object
 *
 * Encapsulates interactions with the login screen.
 */

import { Page, Locator, expect } from '@playwright/test';
import { TEST_IDS } from '../fixtures/test-data';

export class LoginPage {
  readonly page: Page;

  // Locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly offlineBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId(TEST_IDS.LOGIN_EMAIL_INPUT);
    this.passwordInput = page.getByTestId(TEST_IDS.LOGIN_PASSWORD_INPUT);
    this.submitButton = page.getByTestId(TEST_IDS.LOGIN_SUBMIT_BUTTON);
    this.errorMessage = page.getByTestId(TEST_IDS.LOGIN_ERROR_MESSAGE);
    this.offlineBanner = page.getByTestId(TEST_IDS.LOGIN_OFFLINE_BANNER);
  }

  /**
   * Navigate to the login page
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  /**
   * Fill in the email field
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /**
   * Fill in the password field
   */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /**
   * Click the submit button
   */
  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Perform a complete login flow
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  /**
   * Get the error message text
   */
  async getErrorText(): Promise<string> {
    await expect(this.errorMessage).toBeVisible();
    return (await this.errorMessage.textContent()) ?? '';
  }

  /**
   * Check if error message is visible
   */
  async isErrorVisible(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Check if offline banner is displayed
   */
  async isOfflineBannerVisible(): Promise<boolean> {
    return await this.offlineBanner.isVisible();
  }

  /**
   * Wait for login to complete (navigates away from login page)
   */
  async waitForLoginComplete(): Promise<void> {
    // Wait for navigation away from login - home tab should be visible
    await this.page.getByTestId(TEST_IDS.TAB_HOME).waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Assert that we're on the login page
   */
  async assertOnLoginPage(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }
}
