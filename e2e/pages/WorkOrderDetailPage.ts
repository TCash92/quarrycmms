/**
 * Work Order Detail Page Object
 *
 * Encapsulates interactions with work order detail and completion screens.
 */

import { Page, Locator, expect } from '@playwright/test';
import { TEST_IDS } from '../fixtures/test-data';

export class WorkOrderDetailPage {
  readonly page: Page;

  // Locators
  readonly status: Locator;
  readonly priority: Locator;
  readonly startButton: Locator;
  readonly completeButton: Locator;
  readonly timer: Locator;
  readonly failureTypePicker: Locator;
  readonly completionNotesInput: Locator;
  readonly signatureButton: Locator;
  readonly signatureCaptured: Locator;
  readonly submitCompletionButton: Locator;
  readonly verificationCode: Locator;

  constructor(page: Page) {
    this.page = page;
    this.status = page.getByTestId(TEST_IDS.WO_DETAIL_STATUS);
    this.priority = page.getByTestId(TEST_IDS.WO_DETAIL_PRIORITY);
    this.startButton = page.getByTestId(TEST_IDS.WO_DETAIL_START_BUTTON);
    this.completeButton = page.getByTestId(TEST_IDS.WO_DETAIL_COMPLETE_BUTTON);
    this.timer = page.getByTestId(TEST_IDS.WO_DETAIL_TIMER);
    this.failureTypePicker = page.getByTestId(TEST_IDS.WO_DETAIL_FAILURE_TYPE);
    this.completionNotesInput = page.getByTestId(TEST_IDS.WO_DETAIL_COMPLETION_NOTES);
    this.signatureButton = page.getByTestId(TEST_IDS.WO_DETAIL_SIGNATURE_BUTTON);
    this.signatureCaptured = page.getByTestId(TEST_IDS.WO_DETAIL_SIGNATURE_CAPTURED);
    this.submitCompletionButton = page.getByTestId(TEST_IDS.WO_DETAIL_SUBMIT_COMPLETION);
    this.verificationCode = page.getByTestId(TEST_IDS.WO_DETAIL_VERIFICATION_CODE);
  }

  /**
   * Get the current status text
   */
  async getStatus(): Promise<string> {
    await expect(this.status).toBeVisible();
    return (await this.status.textContent()) ?? '';
  }

  /**
   * Get the priority text
   */
  async getPriority(): Promise<string> {
    await expect(this.priority).toBeVisible();
    return (await this.priority.textContent()) ?? '';
  }

  /**
   * Start the work order
   */
  async startWorkOrder(): Promise<void> {
    await this.startButton.click();
  }

  /**
   * Click complete button to show completion form
   */
  async clickComplete(): Promise<void> {
    await this.completeButton.click();
  }

  /**
   * Get timer text
   */
  async getTimerText(): Promise<string> {
    await expect(this.timer).toBeVisible();
    return (await this.timer.textContent()) ?? '';
  }

  /**
   * Check if timer is visible (indicates work in progress)
   */
  async isTimerVisible(): Promise<boolean> {
    return await this.timer.isVisible();
  }

  /**
   * Select failure type
   * Note: FailureTypePicker is a chip-based selector (all options visible),
   * not a dropdown. Each chip has testID `{baseTestID}-{type}` with underscores replaced by dashes.
   */
  async selectFailureType(type: 'none' | 'wore_out' | 'broke' | 'unknown'): Promise<void> {
    // Click the failure type chip directly - chips have testID like "wo-detail-failure-type-none"
    const chipType = type.replace('_', '-'); // Convert wore_out -> wore-out
    const failureTypeChip = this.page.getByTestId(`${TEST_IDS.WO_DETAIL_FAILURE_TYPE}-${chipType}`);
    await failureTypeChip.click();
  }

  /**
   * Enter completion notes
   */
  async enterCompletionNotes(notes: string): Promise<void> {
    await this.completionNotesInput.fill(notes);
  }

  /**
   * Capture signature
   * Note: The SignaturePad uses PanResponder on a View, not an HTML canvas.
   * React Native Web's PanResponder responds to both mouse and touch events,
   * but we need to dispatch proper synthetic events that React can capture.
   */
  async captureSignature(): Promise<void> {
    await this.signatureButton.click();

    // Wait for signature modal to appear - look for the modal title (exact match)
    await expect(this.page.getByText('Sign Here', { exact: true })).toBeVisible({ timeout: 5000 });

    // Find the signature pad container by testID
    const signaturePad = this.page.getByTestId('signature-pad');
    await expect(signaturePad).toBeVisible({ timeout: 3000 });

    // Get the bounding box of the signature pad
    const box = await signaturePad.boundingBox();

    if (box) {
      // React Native Web's PanResponder uses pointer events (not touch events)
      // We need to dispatch pointer events that the responder system can handle
      await this.page.evaluate(
        ({ startX, startY, endX, endY }) => {
          const element = document.querySelector('[data-testid="signature-pad"]');
          if (!element) return;

          // Helper to create and dispatch pointer events
          const dispatchPointerEvent = (type: string, x: number, y: number) => {
            const event = new PointerEvent(type, {
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: y,
              screenX: x,
              screenY: y,
              pointerId: 1,
              pointerType: 'touch',
              isPrimary: true,
              pressure: type === 'pointerup' ? 0 : 0.5,
              width: 1,
              height: 1,
            });
            element.dispatchEvent(event);
          };

          // Simulate a signature stroke: pointerdown -> pointermove (several) -> pointerup
          dispatchPointerEvent('pointerdown', startX, startY);

          // Draw several intermediate points to form a stroke
          const steps = 10;
          for (let i = 1; i <= steps; i++) {
            const progress = i / steps;
            const x = startX + (endX - startX) * progress;
            const y = startY + Math.sin(progress * Math.PI * 2) * 20;
            dispatchPointerEvent('pointermove', x, y);
          }

          dispatchPointerEvent('pointerup', endX, endY);
        },
        {
          startX: box.x + 30,
          startY: box.y + box.height / 2,
          endX: box.x + box.width - 30,
          endY: box.y + box.height / 2,
        }
      );
    }

    // Wait for React state to update
    await this.page.waitForTimeout(300);

    // Click the Confirm button to save the signature
    const confirmButton = this.page.getByRole('button', { name: /confirm/i });
    await expect(confirmButton).toBeEnabled({ timeout: 5000 });
    await confirmButton.click();
  }

  /**
   * Check if signature has been captured
   */
  async isSignatureCaptured(): Promise<boolean> {
    return await this.signatureCaptured.isVisible();
  }

  /**
   * Submit the completion form
   */
  async submitCompletion(): Promise<void> {
    await this.submitCompletionButton.click();
  }

  /**
   * Get verification code text
   */
  async getVerificationCode(): Promise<string> {
    await expect(this.verificationCode).toBeVisible();
    return (await this.verificationCode.textContent()) ?? '';
  }

  /**
   * Check if verification code is visible (completion successful)
   */
  async isVerificationCodeVisible(): Promise<boolean> {
    return await this.verificationCode.isVisible();
  }

  /**
   * Complete the full work order completion flow
   */
  async completeWorkOrder(
    options: {
      failureType?: 'none' | 'wore_out' | 'broke' | 'unknown';
      notes?: string;
      captureSignature?: boolean;
    } = {}
  ): Promise<void> {
    // Show completion form
    await this.clickComplete();

    // Fill completion details
    if (options.failureType) {
      await this.selectFailureType(options.failureType);
    }

    if (options.notes) {
      await this.enterCompletionNotes(options.notes);
    }

    if (options.captureSignature !== false) {
      await this.captureSignature();
    }

    // Submit
    await this.submitCompletion();
  }

  /**
   * Check if start button is visible
   */
  async isStartButtonVisible(): Promise<boolean> {
    return await this.startButton.isVisible();
  }

  /**
   * Check if complete button is visible
   */
  async isCompleteButtonVisible(): Promise<boolean> {
    return await this.completeButton.isVisible();
  }

  /**
   * Check if submit completion button is enabled
   */
  async isSubmitCompletionEnabled(): Promise<boolean> {
    return await this.submitCompletionButton.isEnabled();
  }

  /**
   * Wait for work order detail to load
   */
  async waitForLoad(): Promise<void> {
    await expect(this.status).toBeVisible({ timeout: 10000 });
  }

  /**
   * Go back to work order list
   */
  async goBack(): Promise<void> {
    await this.page.goBack();
  }
}
