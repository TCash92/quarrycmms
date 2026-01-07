import { useAuthContext } from '@/services/auth/AuthProvider';
import { AuthUser, AuthContextValue } from '@/types/auth';

/**
 * Main auth hook - provides full auth context
 */
export function useAuth(): AuthContextValue {
  return useAuthContext();
}

/**
 * Convenience hook to get current user
 * @throws Error if not authenticated
 */
export function useCurrentUser(): AuthUser {
  const { authState } = useAuthContext();
  if (authState.status !== 'authenticated') {
    throw new Error('useCurrentUser called when not authenticated');
  }
  return authState.user;
}

/**
 * Convenience hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { authState } = useAuthContext();
  return authState.status === 'authenticated';
}

/**
 * Convenience hook to check if auth is still loading
 */
export function useAuthLoading(): boolean {
  const { authState } = useAuthContext();
  return authState.status === 'loading';
}
