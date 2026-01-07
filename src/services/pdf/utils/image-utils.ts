/**
 * Image Utilities for PDF Generation
 *
 * Handles signature image processing and hash generation
 * for compliance verification.
 *
 * @module services/pdf/utils/image-utils
 */

import * as FileSystem from 'expo-file-system';
import { sha256 } from '@/services/signature';

/**
 * Convert a local file URI to base64 data URI
 *
 * @param uri - Local file URI
 * @returns Base64 data URI string
 */
export async function fileToBase64(uri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    // Detect image type from extension or default to png
    const extension = uri.toLowerCase().split('.').pop() || 'png';
    const mimeType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 'image/png';
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('[image-utils] Failed to convert file to base64:', error);
    throw new Error('Failed to read image file');
  }
}

/**
 * Convert signature image URI to base64 for PDF embedding
 *
 * @param uri - Signature image URI
 * @returns Base64 data URI or empty string if not available
 */
export async function signatureToBase64(uri: string | null | undefined): Promise<string> {
  if (!uri) {
    return '';
  }

  try {
    return await fileToBase64(uri);
  } catch (error) {
    console.error('[image-utils] Failed to convert signature to base64:', error);
    return '';
  }
}

/**
 * Create a canonical string from signature data for hashing
 * This ensures deterministic hash generation
 *
 * @param data - Object containing signature data
 * @returns Canonical JSON string
 */
function createCanonicalString(data: Record<string, unknown>): string {
  const sortedKeys = Object.keys(data).sort();
  const canonical: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    canonical[key] = data[key] ?? '';
  }
  return JSON.stringify(canonical);
}

/**
 * Generate a verification hash for signature compliance
 *
 * Creates a deterministic SHA-256 hash from:
 * - Signature image data (base64)
 * - Completion timestamp
 * - Work order ID
 *
 * Uses expo-crypto for proper cryptographic hashing.
 *
 * @param signatureData - Base64 signature data
 * @param timestamp - Signature timestamp
 * @param workOrderId - Work order ID
 * @returns Promise resolving to 64-character SHA-256 hash string
 */
export async function generateSignatureHash(
  signatureData: string,
  timestamp: number,
  workOrderId: string
): Promise<string> {
  // Create canonical payload for hashing
  const payload = createCanonicalString({
    signature_data: signatureData,
    timestamp: timestamp.toString(),
    work_order_id: workOrderId,
  });

  // Generate proper SHA-256 hash using expo-crypto
  const hash = await sha256(payload);

  return hash;
}

/**
 * Get truncated hash for display
 *
 * @param fullHash - Full hash string
 * @param length - Number of characters to show (default 16)
 * @returns Truncated hash with ellipsis
 */
export function getTruncatedHash(fullHash: string, length = 16): string {
  if (!fullHash) return '';
  const hashPart = fullHash.replace('SHA-256:', '');
  if (hashPart.length <= length) return fullHash;
  return `SHA-256:${hashPart.slice(0, length)}...`;
}

/**
 * Format timestamp for display in PDF
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns ISO 8601 formatted string
 */
export function formatTimestamp(timestamp: number | null | undefined): string {
  if (!timestamp) return '--';
  return new Date(timestamp).toISOString();
}

/**
 * Format date for display in PDF
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string
 */
export function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) return '--';
  return new Date(timestamp).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time for display in PDF
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted time string
 */
export function formatTime(timestamp: number | null | undefined): string {
  if (!timestamp) return '--';
  return new Date(timestamp).toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format duration in minutes to human-readable string
 *
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '--';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export default {
  fileToBase64,
  signatureToBase64,
  generateSignatureHash,
  getTruncatedHash,
  formatTimestamp,
  formatDate,
  formatTime,
  formatDuration,
};
