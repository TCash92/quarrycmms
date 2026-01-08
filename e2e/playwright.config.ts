import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for QuarryCMMS E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',

  /* Only match .spec.ts files in the tests directory */
  testMatch: '**/*.spec.ts',

  /* Ignore any files outside e2e/tests */
  testIgnore: ['**/node_modules/**', '**/src/**'],

  /* Maximum time one test can run for */
  timeout: 30000,

  /* Expect timeout for assertions */
  expect: {
    timeout: 10000,
  },

  /* Run tests sequentially since some depend on shared state */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Use single worker for ordered test execution */
  workers: 1,

  /* Reporter configuration */
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL for page.goto() */
    baseURL: 'http://localhost:8081',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Take screenshot only on failure */
    screenshot: 'only-on-failure',

    /* Record video only on failure */
    video: 'retain-on-failure',

    /* Navigation timeout */
    navigationTimeout: 30000,

    /* Action timeout */
    actionTimeout: 15000,
  },

  /* Configure projects for browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    /* Mobile viewport for responsive testing */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run web:e2e',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  /* Output directory for test artifacts */
  outputDir: 'test-results',
});
