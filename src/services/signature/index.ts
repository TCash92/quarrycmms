/**
 * Signature Services
 *
 * Cryptographic signature generation and verification for work orders.
 * Implements Part 4 of the CMMS MVP Design Guide.
 *
 * @module services/signature
 */

// Crypto utilities
export {
  sha256,
  sha256Binary,
  hexToBytes,
  bytesToHex,
  bytesToBase64,
  base64ToBytes,
  randomHex,
} from './crypto-utils';

// Signature service
export {
  signWorkOrder,
  generateSignatureHash,
  generateVerificationCode,
  createCanonicalString,
  verifySignature,
  formatCanonicalFieldsForDisplay,
  getVerificationUrl,
} from './signature-service';

// Types
export type { SignaturePayload, SignatureResult, CanonicalFields } from './signature-service';
