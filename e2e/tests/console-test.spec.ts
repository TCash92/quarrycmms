import { test } from '@playwright/test';
import { seedTestData } from '../helpers/database.helper';

test('capture console errors with database seeding', async ({ page }) => {
  // Collect all console messages
  const logs: string[] = [];
  page.on('console', msg => {
    logs.push('[' + msg.type() + '] ' + msg.text());
  });

  // Collect page errors
  page.on('pageerror', err => {
    logs.push('[PAGE ERROR] ' + err.message);
  });

  // Navigate to login
  await page.goto('http://localhost:8081');
  await page.waitForTimeout(2000);

  // Login
  await page.getByTestId('login-email-input').fill('tech@quarrysite.com');
  await page.getByTestId('login-password-input').fill('TestPassword123!');
  await page.getByTestId('login-submit-button').click();

  // Wait for home screen
  await page.getByTestId('tab-home').waitFor({ state: 'visible', timeout: 15000 });
  console.log('>>> Home screen loaded');

  // Seed database
  console.log('>>> Seeding database...');
  await seedTestData(page);
  console.log('>>> Database seeded');

  // Wait a bit for data to be applied
  await page.waitForTimeout(1000);

  // Try to navigate to work orders
  await page.getByTestId('tab-work-orders').click();
  console.log('>>> Clicked work orders tab');

  // Wait a bit for any errors
  await page.waitForTimeout(3000);

  // Print all logs
  console.log('\n=== BROWSER CONSOLE ===\n');
  logs.forEach(log => console.log(log));
  console.log('\n======================\n');

  // Take screenshot
  await page.screenshot({ path: '/tmp/after-seeding.png' });
});
