/**
 * Debug test to capture browser console errors
 */
import { test, expect } from '@playwright/test';

test('capture browser console', async ({ page }) => {
  // Collect all console messages
  const consoleMessages: string[] = [];
  const errors: string[] = [];

  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleMessages.push(text);
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    errors.push(`Page Error: ${err.message}`);
  });

  // Navigate to the app
  await page.goto('/');

  // Wait for potential errors to appear
  await page.waitForTimeout(5000);

  // Log all messages
  console.log('\n=== CONSOLE MESSAGES ===');
  consoleMessages.forEach(msg => console.log(msg));

  console.log('\n=== ERRORS ===');
  errors.forEach(err => console.log(err));

  // Take a screenshot
  await page.screenshot({ path: 'e2e/test-results/debug-screenshot.png', fullPage: true });

  // Check what's in the DOM
  const bodyContent = await page.evaluate(() => document.body.innerHTML);
  console.log('\n=== BODY HTML ===');
  console.log(bodyContent.substring(0, 2000));

  // This test should fail if there are errors, so we can see them
  expect(errors.length, `Found ${errors.length} errors: ${errors.join(', ')}`).toBe(0);
});
