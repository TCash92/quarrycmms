/**
 * Device Migration Service
 *
 * QR code-based device transfer functionality.
 * Allows users to transfer their account to a new device securely.
 *
 * @module services/recovery/device-migration
 */

import * as Crypto from 'expo-crypto';
import { getStoredAuthData } from '@/services/auth/auth-storage';
import { logger } from '@/services/monitoring';

/**
 * Migration payload structure embedded in QR code
 */
export interface MigrationPayload {
  /** User ID */
  userId: string;
  /** Site ID */
  siteId: string;
  /** Creation timestamp */
  timestamp: number;
  /** Original device ID (optional) */
  deviceId?: string;
  /** HMAC signature for verification */
  signature: string;
  /** Version for future compatibility */
  version: number;
}

/**
 * QR code generation result
 */
export interface QRGenerationResult {
  /** Encoded QR data string */
  qrData: string;
  /** Expiration timestamp */
  expiresAt: number;
}

/**
 * QR validation result
 */
export interface QRValidationResult {
  /** Whether the QR is valid */
  valid: boolean;
  /** Decoded payload if valid */
  payload?: MigrationPayload;
  /** Error message if invalid */
  error?: string;
}

/**
 * Migration completion result
 */
export interface MigrationResult {
  /** Whether migration was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/** QR code expiration time (5 minutes) */
const QR_EXPIRY_MS = 5 * 60 * 1000;

/** Migration payload version */
const PAYLOAD_VERSION = 1;

/** Secret key for HMAC (in production, this should be derived from device keychain) */
const MIGRATION_SECRET = 'quarry-cmms-migration-v1';

/**
 * Generate HMAC signature for migration payload
 */
async function generateSignature(
  userId: string,
  siteId: string,
  timestamp: number
): Promise<string> {
  const message = `${userId}:${siteId}:${timestamp}:${MIGRATION_SECRET}`;
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, message);
  // Return first 16 characters for shorter QR code
  return hash.substring(0, 16);
}

/**
 * Verify HMAC signature
 */
async function verifySignature(payload: MigrationPayload): Promise<boolean> {
  const expectedSignature = await generateSignature(
    payload.userId,
    payload.siteId,
    payload.timestamp
  );
  return payload.signature === expectedSignature;
}

/**
 * Generate migration QR code data
 *
 * Creates a signed payload that can be scanned by a new device
 * to initiate the migration process.
 *
 * @returns QR data and expiration timestamp
 */
export async function generateMigrationQR(): Promise<QRGenerationResult> {
  try {
    logger.info('Generating migration QR code', { category: 'recovery' });

    // Get current auth data
    const authData = await getStoredAuthData();
    if (!authData) {
      throw new Error('Not logged in - cannot generate migration QR');
    }

    const timestamp = Date.now();
    const expiresAt = timestamp + QR_EXPIRY_MS;

    // Generate signature
    const signature = await generateSignature(authData.userId, authData.siteId, timestamp);

    // Create payload
    const payload: MigrationPayload = {
      userId: authData.userId,
      siteId: authData.siteId,
      timestamp,
      signature,
      version: PAYLOAD_VERSION,
    };

    // Encode as base64 JSON for QR code
    const jsonPayload = JSON.stringify(payload);
    const qrData = `quarry-migrate:${btoa(jsonPayload)}`;

    logger.info('Migration QR code generated', {
      category: 'recovery',
      expiresIn: QR_EXPIRY_MS / 1000,
    });

    return {
      qrData,
      expiresAt,
    };
  } catch (error) {
    logger.error('Failed to generate migration QR', error as Error, { category: 'recovery' });
    throw error;
  }
}

/**
 * Validate incoming migration QR code
 *
 * Decodes and verifies the QR payload from another device.
 *
 * @param qrData - Raw QR code data
 * @returns Validation result with decoded payload
 */
export async function validateMigrationQR(qrData: string): Promise<QRValidationResult> {
  try {
    logger.debug('Validating migration QR code', { category: 'recovery' });

    // Check prefix
    if (!qrData.startsWith('quarry-migrate:')) {
      return {
        valid: false,
        error: 'Invalid QR code format - not a migration code',
      };
    }

    // Extract and decode payload
    const base64Payload = qrData.substring('quarry-migrate:'.length);
    let payload: MigrationPayload;

    try {
      const jsonPayload = atob(base64Payload);
      payload = JSON.parse(jsonPayload) as MigrationPayload;
    } catch {
      return {
        valid: false,
        error: 'Invalid QR code - unable to decode',
      };
    }

    // Validate required fields
    if (!payload.userId || !payload.siteId || !payload.timestamp || !payload.signature) {
      return {
        valid: false,
        error: 'Invalid QR code - missing required fields',
      };
    }

    // Check version
    if (payload.version !== PAYLOAD_VERSION) {
      return {
        valid: false,
        error: `Unsupported migration version: ${payload.version}`,
      };
    }

    // Check expiration
    const now = Date.now();
    if (now - payload.timestamp > QR_EXPIRY_MS) {
      return {
        valid: false,
        error: 'QR code has expired - please generate a new one',
      };
    }

    // Verify signature
    const isValidSignature = await verifySignature(payload);
    if (!isValidSignature) {
      return {
        valid: false,
        error: 'Invalid QR code - signature verification failed',
      };
    }

    logger.info('Migration QR code validated', { category: 'recovery' });

    return {
      valid: true,
      payload,
    };
  } catch (error) {
    logger.error('Failed to validate migration QR', error as Error, { category: 'recovery' });
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}

/**
 * Complete migration on new device
 *
 * After scanning and validating a QR code, the user must log in
 * with their credentials. This function records the migration.
 *
 * @param payload - Validated migration payload
 * @returns Migration result
 */
export async function completeMigration(payload: MigrationPayload): Promise<MigrationResult> {
  try {
    logger.info('Completing device migration', { category: 'recovery' });

    // The actual login is handled separately by the auth system
    // This function could be extended to:
    // - Record migration event on server
    // - Transfer device-specific settings
    // - Notify old device of migration

    logger.info('Device migration complete', {
      category: 'recovery',
      userId: payload.userId.slice(0, 8),
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to complete migration', error as Error, { category: 'recovery' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format remaining time for display
 */
export function formatTimeRemaining(expiresAt: number): string {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return 'Expired';

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Check if QR is expired
 */
export function isQRExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt;
}

export default {
  generateMigrationQR,
  validateMigrationQR,
  completeMigration,
  formatTimeRemaining,
  isQRExpired,
};
