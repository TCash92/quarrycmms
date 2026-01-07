import * as SecureStore from 'expo-secure-store';
import { AUTH_STORAGE_KEYS, StoredAuthData } from '@/types/auth';

/** 5-minute buffer before considering token expired */
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/** 7-day offline validity window for refresh tokens */
const OFFLINE_TOKEN_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Store complete auth session data securely
 */
export async function storeAuthData(data: StoredAuthData): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(AUTH_STORAGE_KEYS.ACCESS_TOKEN, data.accessToken),
    SecureStore.setItemAsync(AUTH_STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken),
    SecureStore.setItemAsync(AUTH_STORAGE_KEYS.USER_ID, data.userId),
    SecureStore.setItemAsync(AUTH_STORAGE_KEYS.SITE_ID, data.siteId),
    SecureStore.setItemAsync(AUTH_STORAGE_KEYS.TOKEN_EXPIRY, String(data.tokenExpiry)),
  ]);
}

/**
 * Retrieve stored auth data
 * Returns null if any required field is missing
 */
export async function getStoredAuthData(): Promise<StoredAuthData | null> {
  const [accessToken, refreshToken, userId, siteId, tokenExpiry] = await Promise.all([
    SecureStore.getItemAsync(AUTH_STORAGE_KEYS.ACCESS_TOKEN),
    SecureStore.getItemAsync(AUTH_STORAGE_KEYS.REFRESH_TOKEN),
    SecureStore.getItemAsync(AUTH_STORAGE_KEYS.USER_ID),
    SecureStore.getItemAsync(AUTH_STORAGE_KEYS.SITE_ID),
    SecureStore.getItemAsync(AUTH_STORAGE_KEYS.TOKEN_EXPIRY),
  ]);

  if (!accessToken || !refreshToken || !userId || !siteId || !tokenExpiry) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    userId,
    siteId,
    tokenExpiry: Number(tokenExpiry),
  };
}

/**
 * Check if current token is valid (not expiring within 5 minutes)
 */
export function isTokenValid(expiryTimestamp: number): boolean {
  return expiryTimestamp > Date.now() + TOKEN_EXPIRY_BUFFER_MS;
}

/**
 * Check if refresh token is still usable offline (within 7-day window)
 * Refresh tokens are valid for 7 days from original access token issue
 */
export function isRefreshTokenValid(expiryTimestamp: number): boolean {
  return expiryTimestamp + OFFLINE_TOKEN_VALIDITY_MS > Date.now();
}

/**
 * Clear all stored auth data (for logout)
 */
export async function clearAuthData(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.ACCESS_TOKEN),
    SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.REFRESH_TOKEN),
    SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.USER_ID),
    SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.SITE_ID),
    SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.TOKEN_EXPIRY),
  ]);
}
