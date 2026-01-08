/**
 * Cross-Platform Alert Utility
 *
 * React Native's Alert.alert is NOT implemented on web (it's a no-op).
 * This utility provides a cross-platform implementation that:
 * - Uses native Alert.alert on iOS/Android
 * - Falls back to window.confirm() on web
 *
 * @module utils/alert
 */

import { Alert as RNAlert, Platform } from 'react-native';

interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

/**
 * Show a cross-platform alert dialog
 *
 * On native platforms, uses React Native's Alert.alert
 * On web, uses window.confirm() for two-button dialogs or window.alert() for single-button
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  // On native, use the standard Alert.alert
  if (Platform.OS !== 'web') {
    RNAlert.alert(title, message, buttons);
    return;
  }

  // On web, fall back to browser dialogs
  const buttonCount = buttons?.length ?? 0;

  if (buttonCount === 0 || buttonCount === 1) {
    // Simple alert with OK button
    window.alert(message ? `${title}\n\n${message}` : title);
    buttons?.[0]?.onPress?.();
    return;
  }

  // Two buttons: use confirm dialog
  // Find the "action" button (non-cancel) and the cancel button
  const cancelButton = buttons?.find(b => b.style === 'cancel');
  const actionButton = buttons?.find(b => b.style !== 'cancel') ?? buttons?.[1];

  const result = window.confirm(message ? `${title}\n\n${message}` : title);

  if (result) {
    // User clicked OK (confirm)
    actionButton?.onPress?.();
  } else {
    // User clicked Cancel
    cancelButton?.onPress?.();
  }
}

/**
 * Confirmation dialog helper
 *
 * Shorthand for showing a confirm/cancel dialog
 */
export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  options?: {
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
  }
): void {
  showAlert(title, message, [
    { text: options?.cancelText ?? 'Cancel', style: 'cancel' },
    {
      text: options?.confirmText ?? 'OK',
      style: options?.destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}

export default { showAlert, showConfirm };
