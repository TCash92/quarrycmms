import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AuthState, AuthContextValue, LoginCredentials } from '@/types/auth';
import { signIn, signOut, restoreSession, ensureValidToken } from './auth-service';
import {
  setUserContext,
  clearUserContext,
  logger,
  resetTelemetryState,
} from '@/services/monitoring';
import { performSync } from '@/services/sync';

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });
  const [isOnline, setIsOnline] = useState(true);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
    });
    return (): void => unsubscribe();
  }, []);

  // Restore session on app startup
  useEffect(() => {
    const initialize = async (): Promise<void> => {
      logger.debug('AuthProvider: Starting session restore', { category: 'auth' });
      try {
        const restored = await restoreSession();
        logger.debug('AuthProvider: restoreSession returned', {
          category: 'auth',
          hasSession: !!restored,
        });
        if (restored) {
          setAuthState({
            status: 'authenticated',
            user: restored.user,
            session: restored.session,
          });
          // Set monitoring user context
          setUserContext(restored.user.id, restored.user.siteId);
          logger.info('Session restored', { category: 'auth', userId: restored.user.id });

          // Trigger sync after session restore (non-blocking)
          performSync().catch(err => {
            logger.warn('Sync after session restore failed', {
              category: 'sync',
              error: err instanceof Error ? err.message : String(err),
            });
          });
        } else {
          logger.info('No session found, setting unauthenticated', { category: 'auth' });
          setAuthState({ status: 'unauthenticated' });
        }
      } catch (error) {
        logger.error('Session restore failed', error as Error, { category: 'auth' });
        setAuthState({ status: 'unauthenticated' });
      }
    };

    void initialize();
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
      try {
        const result = await signIn(credentials);
        if ('error' in result) {
          logger.warn('Login failed', { category: 'auth', error: result.error });
          return { success: false, error: result.error };
        }
        setAuthState({
          status: 'authenticated',
          user: result.user,
          session: result.session,
        });
        // Set monitoring user context
        setUserContext(result.user.id, result.user.siteId);
        logger.info('Login successful', { category: 'auth', userId: result.user.id });

        // Trigger initial sync after login (non-blocking)
        performSync().catch(err => {
          logger.warn('Initial sync after login failed', {
            category: 'sync',
            error: err instanceof Error ? err.message : String(err),
          });
        });

        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Login failed';
        logger.error('Login error', error as Error, { category: 'auth' });
        return { success: false, error: message };
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    logger.info('Logging out', { category: 'auth' });
    await signOut();
    // Clear monitoring user context and reset telemetry state
    clearUserContext();
    resetTelemetryState();
    setAuthState({ status: 'unauthenticated' });
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const token = await ensureValidToken();
    return token !== null;
  }, []);

  const value: AuthContextValue = {
    authState,
    login,
    logout,
    refreshSession,
    isOnline,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

/**
 * Hook to access auth context
 * @throws Error if used outside AuthProvider
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
