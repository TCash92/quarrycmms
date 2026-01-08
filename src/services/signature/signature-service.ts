/**
 * Signature Service
 *
 * Implements cryptographic signing for work order completions as specified
 * in Part 4 of the CMMS MVP Design Guide. Provides:
 * - Canonical form construction with all 10 required fields
 * - SHA-256 hash generation
 * - Verification code generation (XXXX-XXXX-XXXX format)
 *
 * @module services/signature/signature-service
 */

import { sha256 } from './crypto-utils';
import type WorkOrder from '@/database/models/WorkOrder';
import type { FailureType } from '@/database/models/WorkOrder';

/**
 * Payload for signature generation containing all 10 required fields
 */
export interface SignaturePayload {
  wo_number: string;
  asset_id: string;
  completed_at: string; // ISO 8601 UTC
  completed_by: string; // User UUID
  completion_notes: string | null;
  failure_type: FailureType;
  time_spent_minutes: number;
  meter_reading_at_completion: number | null;
  signature_image_base64: string;
  signature_timestamp: string; // ISO 8601 UTC
}

/**
 * Result of signing a work order
 */
export interface SignatureResult {
  /** Full SHA-256 hash (64 hex characters) */
  hash: string;
  /** Verification code in XXXX-XXXX-XXXX format */
  verificationCode: string;
  /** Canonical form fields used for hashing (for audit/verification) */
  canonicalFields: CanonicalFields;
  /** ISO 8601 timestamp when signature was created */
  signatureTimestamp: string;
}

/**
 * Canonical fields used in hash calculation
 * Keys are alphabetically sorted for deterministic hashing
 */
export interface CanonicalFields {
  asset_id: string;
  completed_at: string;
  completed_by: string;
  completion_notes: string;
  failure_type: string;
  meter_reading_at_completion: number;
  signature_image_hash: string;
  signature_timestamp: string;
  time_spent_minutes: number;
  wo_number: string;
}

/**
 * Verification code character set
 * Excludes easily confused characters: I, O, 0, 1
 */
const VERIFICATION_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Create canonical string for hashing
 *
 * The canonical form follows these rules from Part 4.2:
 * - All 10 required fields included
 * - Keys sorted alphabetically
 * - Null values replaced with empty string or 0
 * - No spaces in JSON output
 * - Signature image is first hashed, then that hash is included
 *
 * @param payload - Signature payload with all fields
 * @param signatureImageHash - Pre-computed SHA-256 hash of signature image
 * @returns JSON string in canonical form
 */
export function createCanonicalString(
  payload: SignaturePayload,
  signatureImageHash: string
): string {
  // Build canonical object with normalized values
  const canonical: CanonicalFields = {
    asset_id: payload.asset_id,
    completed_at: payload.completed_at,
    completed_by: payload.completed_by,
    completion_notes: payload.completion_notes ?? '',
    failure_type: payload.failure_type,
    meter_reading_at_completion: payload.meter_reading_at_completion ?? 0,
    signature_image_hash: signatureImageHash,
    signature_timestamp: payload.signature_timestamp,
    time_spent_minutes: payload.time_spent_minutes,
    wo_number: payload.wo_number,
  };

  // Sort keys alphabetically (Object.keys on a literal already gives insertion order,
  // but we explicitly sort to be safe)
  const sortedKeys = Object.keys(canonical).sort() as (keyof CanonicalFields)[];

  // Build sorted object
  const sortedCanonical: Record<string, string | number> = {};
  for (const key of sortedKeys) {
    sortedCanonical[key] = canonical[key];
  }

  // Return JSON with no spaces (deterministic)
  return JSON.stringify(sortedCanonical);
}

/**
 * Generate verification code from hash
 *
 * Converts first 48 bits (6 bytes) of hash to 12-character code
 * in XXXX-XXXX-XXXX format using the safe character set.
 *
 * @param hash - SHA-256 hash (64 hex characters)
 * @returns Verification code in XXXX-XXXX-XXXX format
 */
export function generateVerificationCode(hash: string): string {
  // Take first 12 hex characters (48 bits / 6 bytes)
  const hashPrefix = hash.slice(0, 12).toUpperCase();

  // Convert to base-32 representation using our charset
  let value = BigInt('0x' + hashPrefix);
  const chars: string[] = [];

  // Generate 12 characters
  for (let i = 0; i < 12; i++) {
    const index = Number(value % BigInt(VERIFICATION_CHARSET.length));
    const char = VERIFICATION_CHARSET[index];
    if (char !== undefined) {
      chars.unshift(char);
    }
    value = value / BigInt(VERIFICATION_CHARSET.length);
  }

  // Format as XXXX-XXXX-XXXX
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`;
}

/**
 * Generate signature hash from payload
 *
 * @param payload - Complete signature payload
 * @returns Promise resolving to SHA-256 hash (64 hex characters)
 */
export async function generateSignatureHash(payload: SignaturePayload): Promise<string> {
  // First, hash the signature image
  const signatureImageHash = await sha256(payload.signature_image_base64);

  // Create canonical string with the image hash
  const canonicalString = createCanonicalString(payload, signatureImageHash);

  // Hash the canonical string
  return sha256(canonicalString);
}

/**
 * Sign a work order at completion time
 *
 * This is the main entry point for signature generation. Call this
 * when a work order is being completed with a signature.
 *
 * @param workOrder - The work order being completed
 * @param signatureBase64 - Base64-encoded signature image
 * @param meterReading - Optional meter reading at completion
 * @returns Promise resolving to SignatureResult
 */
export async function signWorkOrder(
  workOrder: WorkOrder,
  signatureBase64: string,
  meterReading?: number | null
): Promise<SignatureResult> {
  const signatureTimestamp = new Date().toISOString();

  // Build the signature payload from work order fields
  const payload: SignaturePayload = {
    wo_number: workOrder.woNumber,
    asset_id: workOrder.assetId,
    completed_at: workOrder.completedAt
      ? new Date(workOrder.completedAt).toISOString()
      : signatureTimestamp,
    completed_by: workOrder.completedBy ?? '',
    completion_notes: workOrder.completionNotes,
    failure_type: workOrder.failureType ?? 'none',
    time_spent_minutes: workOrder.timeSpentMinutes ?? 0,
    meter_reading_at_completion: meterReading ?? null,
    signature_image_base64: signatureBase64,
    signature_timestamp: signatureTimestamp,
  };

  // Generate the hash
  const hash = await generateSignatureHash(payload);

  // Generate verification code
  const verificationCode = generateVerificationCode(hash);

  // Get the signature image hash for the canonical fields
  const signatureImageHash = await sha256(signatureBase64);

  // Build canonical fields for audit purposes
  const canonicalFields: CanonicalFields = {
    asset_id: payload.asset_id,
    completed_at: payload.completed_at,
    completed_by: payload.completed_by,
    completion_notes: payload.completion_notes ?? '',
    failure_type: payload.failure_type,
    meter_reading_at_completion: payload.meter_reading_at_completion ?? 0,
    signature_image_hash: signatureImageHash,
    signature_timestamp: payload.signature_timestamp,
    time_spent_minutes: payload.time_spent_minutes,
    wo_number: payload.wo_number,
  };

  return {
    hash,
    verificationCode,
    canonicalFields,
    signatureTimestamp,
  };
}

/**
 * Verify a signature hash matches the stored values
 *
 * Use this for offline verification by reconstructing the canonical
 * form and comparing hashes.
 *
 * @param canonicalFields - The stored canonical fields
 * @param expectedHash - The expected SHA-256 hash
 * @returns Promise resolving to true if hash matches
 */
export async function verifySignature(
  canonicalFields: CanonicalFields,
  expectedHash: string
): Promise<boolean> {
  // Create canonical string from fields
  const sortedKeys = Object.keys(canonicalFields).sort() as (keyof CanonicalFields)[];
  const sortedCanonical: Record<string, string | number> = {};
  for (const key of sortedKeys) {
    sortedCanonical[key] = canonicalFields[key];
  }
  const canonicalString = JSON.stringify(sortedCanonical);

  // Hash and compare
  const computedHash = await sha256(canonicalString);
  return computedHash.toLowerCase() === expectedHash.toLowerCase();
}

/**
 * Format canonical fields for display in PDFs
 *
 * Returns a formatted array of label-value pairs for the verification
 * section in PDF templates.
 *
 * @param fields - The canonical fields
 * @param completedByName - Human-readable name of completer (for display)
 * @returns Array of display items
 */
export function formatCanonicalFieldsForDisplay(
  fields: CanonicalFields,
  completedByName: string
): Array<{ label: string; value: string }> {
  return [
    { label: 'WO Number', value: fields.wo_number },
    { label: 'Asset ID', value: fields.asset_id },
    { label: 'Completed At', value: fields.completed_at },
    { label: 'Completed By', value: completedByName },
    {
      label: 'Completion Notes',
      value: fields.completion_notes
        ? `"${fields.completion_notes.slice(0, 100)}${fields.completion_notes.length > 100 ? '...' : ''}"`
        : '(none)',
    },
    { label: 'Failure Type', value: fields.failure_type },
    { label: 'Time Spent', value: `${fields.time_spent_minutes} minutes` },
    {
      label: 'Meter Reading',
      value:
        fields.meter_reading_at_completion > 0
          ? fields.meter_reading_at_completion.toLocaleString()
          : '(none)',
    },
  ];
}

/**
 * Generate verification URL for QR code
 *
 * @param verificationCode - The verification code (XXXX-XXXX-XXXX)
 * @returns Full verification URL
 */
export function getVerificationUrl(verificationCode: string): string {
  return `https://verify.example.com/${verificationCode}`;
}
