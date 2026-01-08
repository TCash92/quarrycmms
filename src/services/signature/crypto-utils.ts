/**
 * Cryptographic Utilities
 *
 * Provides SHA-256 hashing using expo-crypto for proper cryptographic
 * signature generation in compliance with Part 4 of the design guide.
 *
 * @module services/signature/crypto-utils
 */

import * as Crypto from 'expo-crypto';

/**
 * Generate SHA-256 hash of a string
 *
 * @param data - The string data to hash
 * @returns Promise resolving to 64-character lowercase hex string
 */
export async function sha256(data: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data
  );
  return hash.toLowerCase();
}

/**
 * Generate SHA-256 hash of binary data (Uint8Array)
 *
 * Note: expo-crypto digestStringAsync handles strings, so for binary
 * data we convert to base64 first and hash that representation.
 *
 * @param data - The binary data to hash
 * @returns Promise resolving to 64-character lowercase hex string
 */
export async function sha256Binary(data: Uint8Array): Promise<string> {
  // Convert Uint8Array to base64 string for hashing
  const base64 = bytesToBase64(data);
  return sha256(base64);
}

/**
 * Convert hex string to Uint8Array
 *
 * @param hex - Hexadecimal string (with or without 0x prefix)
 * @returns Uint8Array of bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  // Remove 0x prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;

  if (cleanHex.length % 2 !== 0) {
    throw new Error('Hex string must have even length');
  }

  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }

  return bytes;
}

/**
 * Convert Uint8Array to hex string
 *
 * @param bytes - Uint8Array of bytes
 * @returns Lowercase hexadecimal string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert Uint8Array to base64 string
 *
 * @param bytes - Uint8Array of bytes
 * @returns Base64 encoded string
 */
export function bytesToBase64(bytes: Uint8Array): string {
  // Create binary string from bytes
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }
  // Use btoa for base64 encoding
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 *
 * @param base64 - Base64 encoded string
 * @returns Uint8Array of bytes
 */
export function base64ToBytes(base64: string): Uint8Array {
  // Remove any data URL prefix if present
  const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '');

  // Decode base64
  const binary = atob(cleanBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

/**
 * Generate a random hex string
 *
 * @param length - Number of random bytes (output will be 2x length in hex)
 * @returns Promise resolving to random hex string
 */
export async function randomHex(length: number): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(length);
  return bytesToHex(bytes);
}
