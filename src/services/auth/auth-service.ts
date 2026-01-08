import { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase-client';
import {
  storeAuthData,
  getStoredAuthData,
  clearAuthData,
  isTokenValid,
  isRefreshTokenValid,
} from './auth-storage';
import { AuthUser, LoginCredentials, StoredAuthData } from '@/types/auth';
import { UserRole } from '@/types';
import { logger } from '@/services/monitoring';

/**
 * Attempt login with email and password
 */
export async function signIn(
  credentials: LoginCredentials
): Promise<{ user: AuthUser; session: Session } | { error: string }> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session || !data.user) {
    return { error: 'No session returned from login' };
  }

  // Fetch user profile from profiles table for siteId and role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('name, site_id, role')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    // If profile doesn't exist yet, use defaults for development
    logger.warn('Profile not found, using defaults', {
      category: 'auth',
      error: profileError?.message,
    });
    const defaultProfile = {
      name: data.user.email?.split('@')[0] ?? 'User',
      site_id: 'default-site',
      role: 'technician' as UserRole,
    };

    const authUser: AuthUser = {
      id: data.user.id,
      email: data.user.email ?? '',
      name: defaultProfile.name,
      siteId: defaultProfile.site_id,
      role: defaultProfile.role,
    };

    // Store auth data in SecureStore
    const expiryTimestamp = Date.now() + data.session.expires_in * 1000;
    await storeAuthData({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      userId: data.user.id,
      siteId: defaultProfile.site_id,
      tokenExpiry: expiryTimestamp,
    });

    return { user: authUser, session: data.session };
  }

  const authUser: AuthUser = {
    id: data.user.id,
    email: data.user.email ?? '',
    name: profile.name,
    siteId: profile.site_id,
    role: profile.role as UserRole,
  };

  // Store auth data in SecureStore
  const expiryTimestamp = Date.now() + data.session.expires_in * 1000;
  await storeAuthData({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    userId: data.user.id,
    siteId: profile.site_id,
    tokenExpiry: expiryTimestamp,
  });

  return { user: authUser, session: data.session };
}

/**
 * Sign out and clear stored credentials
 */
export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();

  // Attempt server-side logout (may fail offline - that's OK)
  try {
    await supabase.auth.signOut();
  } catch {
    logger.debug('Server logout failed (offline?), clearing local data', { category: 'auth' });
  }

  await clearAuthData();
}

/**
 * Ensure we have a valid access token
 * - If token valid for >5 minutes, return it
 * - Try to refresh online
 * - If offline and refresh token valid, return existing token
 * - If all fails, return null (user must re-login)
 */
export async function ensureValidToken(): Promise<string | null> {
  const storedData = await getStoredAuthData();

  if (!storedData) {
    return null;
  }

  // Token still valid (not expiring within 5 minutes)
  if (isTokenValid(storedData.tokenExpiry)) {
    return storedData.accessToken;
  }

  // Try to refresh
  try {
    const refreshedToken = await refreshAccessToken(storedData.refreshToken);
    if (refreshedToken) {
      return refreshedToken;
    }
  } catch {
    logger.debug('Token refresh failed (offline?), checking offline validity', {
      category: 'auth',
    });
  }

  // Offline fallback: use existing token if refresh token still valid (7-day window)
  if (isRefreshTokenValid(storedData.tokenExpiry)) {
    logger.debug('Using potentially expired token for offline operations', { category: 'auth' });
    return storedData.accessToken;
  }

  // Token completely expired, user must re-login
  return null;
}

/**
 * Refresh the access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    return null;
  }

  // Update stored data with new tokens
  const storedData = await getStoredAuthData();
  if (storedData) {
    await storeAuthData({
      ...storedData,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      tokenExpiry: Date.now() + data.session.expires_in * 1000,
    });
  }

  return data.session.access_token;
}

/**
 * Restore session from stored credentials on app startup
 */
export async function restoreSession(): Promise<{ user: AuthUser; session: Session } | null> {
  const storedData = await getStoredAuthData();

  if (!storedData) {
    return null;
  }

  // Check if we can still use the stored credentials
  const validToken = await ensureValidToken();
  if (!validToken) {
    await clearAuthData();
    return null;
  }

  // Set the session on the Supabase client for authenticated queries
  const supabase = getSupabaseClient();
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: validToken,
    refresh_token: storedData.refreshToken,
  });

  if (sessionError) {
    logger.warn('Failed to set session on Supabase client', {
      category: 'auth',
      error: sessionError.message,
    });
    // Continue anyway - try the query, fallback will handle failure
  }

  // Try to fetch fresh user profile if online
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('name, site_id, role')
      .eq('id', storedData.userId)
      .single();

    if (!error && profile) {
      return {
        user: {
          id: storedData.userId,
          email: '', // Will be populated on next online access
          name: profile.name,
          siteId: profile.site_id,
          role: profile.role as UserRole,
        },
        session: createSessionFromStoredData(storedData),
      };
    }
  } catch {
    logger.debug('Profile fetch failed (offline?), using stored data', { category: 'auth' });
  }

  // Offline fallback: construct user from stored data
  return {
    user: {
      id: storedData.userId,
      email: '',
      name: 'Offline User',
      siteId: storedData.siteId,
      role: 'technician',
    },
    session: createSessionFromStoredData(storedData),
  };
}

/**
 * Create a Session object from stored data
 */
function createSessionFromStoredData(storedData: StoredAuthData): Session {
  return {
    access_token: storedData.accessToken,
    refresh_token: storedData.refreshToken,
    expires_in: Math.floor((storedData.tokenExpiry - Date.now()) / 1000),
    expires_at: Math.floor(storedData.tokenExpiry / 1000),
    token_type: 'bearer',
    user: {
      id: storedData.userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: '',
      app_metadata: {},
      user_metadata: {},
      created_at: '',
    },
  };
}
