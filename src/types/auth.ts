import { Session } from '@supabase/supabase-js';
import { UserRole } from './index';

/**
 * Secure storage key constants
 * Per CLAUDE.md Authentication Flow section
 */
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'cmms_access_token',
  REFRESH_TOKEN: 'cmms_refresh_token',
  USER_ID: 'cmms_user_id',
  SITE_ID: 'cmms_site_id',
  TOKEN_EXPIRY: 'cmms_token_expiry',
} as const;

/**
 * Authentication state for the app
 */
export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: AuthUser; session: Session };

/**
 * Extended user type combining Supabase user with app-specific fields
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  siteId: string;
  role: UserRole;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Auth context value exposed to consumers
 */
export interface AuthContextValue {
  authState: AuthState;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  isOnline: boolean;
}

/**
 * Stored auth data structure for SecureStore
 */
export interface StoredAuthData {
  accessToken: string;
  refreshToken: string;
  userId: string;
  siteId: string;
  tokenExpiry: number; // Unix timestamp in milliseconds
}
