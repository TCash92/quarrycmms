/**
 * MSW Browser Worker Setup
 *
 * This file sets up the MSW service worker for browser-based E2E tests.
 * It's imported conditionally in App.tsx when running E2E tests.
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

/**
 * Start the MSW worker
 * Call this before rendering the app in E2E test mode
 */
export async function startMockServiceWorker(): Promise<void> {
  await worker.start({
    onUnhandledRequest: 'bypass', // Don't warn on unhandled requests (e.g., static assets)
    quiet: false, // Log handled requests for debugging
  });

  console.log('[MSW] Mock Service Worker started');
}

/**
 * Stop the MSW worker
 */
export function stopMockServiceWorker(): void {
  worker.stop();
  console.log('[MSW] Mock Service Worker stopped');
}
