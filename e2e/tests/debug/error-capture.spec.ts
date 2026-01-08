import { test, expect } from '@playwright/test';

test.describe('Error Capture', () => {
  test('capture actual error after login', async ({ page }) => {
    const logs: string[] = [];
    const errors: string[] = [];

    // Capture all console messages with more detail
    page.on('console', msg => {
      const text = msg.text();
      logs.push(`[${msg.type()}] ${text}`);

      // Capture error details
      if (msg.type() === 'error') {
        errors.push(text);
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      errors.push(`[PAGE ERROR] ${error.message}\n${error.stack}`);
    });

    // Navigate to the app
    await page.goto('/');

    // Wait for login screen
    await page.waitForSelector('[data-testid="login-email-input"]', { timeout: 15000 });

    // Fill email
    await page.getByTestId('login-email-input').fill('tech@quarrysite.com');

    // Fill password
    await page.getByTestId('login-password-input').fill('TestPassword123!');

    // Click login
    await page.getByTestId('login-submit-button').click();

    // Wait for navigation attempt and errors
    await page.waitForTimeout(8000);

    // Try to capture rendered content
    let bodyContent = '';
    try {
      bodyContent = await page.locator('body').innerText();
    } catch {
      bodyContent = 'Could not capture body text';
    }

    console.log('\n=== CAPTURED ERRORS ===');
    for (const err of errors) {
      console.log(err);
    }
    console.log('\n=== RELEVANT LOGS ===');
    for (const log of logs) {
      if (
        log.includes('error') ||
        log.includes('Error') ||
        log.includes('warn') ||
        log.includes('[auth]') ||
        log.includes('[RootNavigator]') ||
        log.includes('HomeScreen')
      ) {
        console.log(log);
      }
    }
    console.log('\n=== BODY TEXT ===');
    console.log(bodyContent.substring(0, 1000));
    console.log('========================\n');

    // Take screenshot
    await page.screenshot({ path: 'e2e/test-results/error-capture.png' });

    expect(true).toBe(true);
  });
});
