import { test, expect } from '@playwright/test';

test.describe('Login Flow Trace', () => {
  test('trace login process', async ({ page }) => {
    const logs: string[] = [];

    // Capture all console messages
    page.on('console', msg => {
      const text = msg.text();
      logs.push(`[${msg.type()}] ${text}`);
    });

    // Capture network requests
    page.on('request', request => {
      const url = request.url();
      if (url.includes('auth') || url.includes('token')) {
        logs.push(`[REQUEST] ${request.method()} ${url}`);
      }
    });

    page.on('response', async response => {
      const url = response.url();
      if (url.includes('auth') || url.includes('token')) {
        const status = response.status();
        let body = '';
        try {
          body = await response.text();
          if (body.length > 500) body = body.substring(0, 500) + '...';
        } catch {
          body = 'Could not read body';
        }
        logs.push(`[RESPONSE] ${status} ${url}`);
        logs.push(`[BODY] ${body}`);
      }
    });

    // Navigate to the app
    await page.goto('/');

    // Wait for login screen
    await page.waitForSelector('[data-testid="login-email-input"]', { timeout: 15000 });
    logs.push('[TEST] Login screen loaded');

    // Fill email
    const emailInput = page.getByTestId('login-email-input');
    await emailInput.fill('tech@quarrysite.com');
    logs.push('[TEST] Email filled');

    // Fill password
    const passwordInput = page.getByTestId('login-password-input');
    await passwordInput.fill('TestPassword123!');
    logs.push('[TEST] Password filled');

    // Click login
    const loginButton = page.getByTestId('login-submit-button');
    await loginButton.click();
    logs.push('[TEST] Login button clicked');

    // Wait and observe what happens
    await page.waitForTimeout(5000);

    // Take a screenshot of current state
    await page.screenshot({ path: 'e2e/test-results/login-trace-screenshot.png' });

    // Check what's visible
    const homeTab = page.getByTestId('tab-home');
    const errorText = page.getByTestId('login-error');
    const loginScreen = page.getByTestId('login-email-input');

    const homeVisible = await homeTab.isVisible().catch(() => false);
    const errorVisible = await errorText.isVisible().catch(() => false);
    const loginVisible = await loginScreen.isVisible().catch(() => false);

    logs.push(`[STATE] Home tab visible: ${homeVisible}`);
    logs.push(`[STATE] Error visible: ${errorVisible}`);
    logs.push(`[STATE] Login still visible: ${loginVisible}`);

    if (errorVisible) {
      const errorMessage = await errorText.textContent();
      logs.push(`[ERROR] ${errorMessage}`);
    }

    // Print all logs
    console.log('\n=== LOGIN TRACE ===');
    for (const log of logs) {
      console.log(log);
    }
    console.log('===================\n');

    // The test passes if we got this far - it's just for debugging
    expect(true).toBe(true);
  });
});
