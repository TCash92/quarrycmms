import { FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright E2E tests
 * This runs once before all tests
 */
async function globalSetup(config: FullConfig): Promise<void> {
  console.log('Starting E2E test setup...');
  console.log(`Base URL: ${config.projects[0]?.use?.baseURL}`);

  // Add any global setup logic here:
  // - Seed test data
  // - Clear previous test artifacts
  // - Set up authentication tokens

  console.log('E2E test setup complete');
}

export default globalSetup;
