import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from '@/app';
import { validateConfig, ConfigurationError, config } from '@/config';
import { DatabaseProvider } from '@/database';
import { AuthProvider } from '@/services/auth/AuthProvider';
import {
  initMonitoring,
  logger,
  schedulePeriodicTelemetry,
  stopPeriodicTelemetry,
} from '@/services/monitoring';
import { checkDatabaseHealth } from '@/services/recovery';
import { showAlert } from '@/utils/alert';

// E2E Test Mode Detection
const IS_E2E_TEST = process.env.EXPO_PUBLIC_E2E_TEST === 'true';

/**
 * Application entry point
 * Validates configuration on startup and renders the navigation tree
 */
export default function App(): React.ReactElement {
  const [configError, setConfigError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeApp = async (): Promise<void> => {
      try {
        // Initialize MSW for E2E testing (web only)
        if (IS_E2E_TEST && Platform.OS === 'web') {
          try {
            const { startMockServiceWorker } = await import('./e2e/mocks/browser');
            await startMockServiceWorker();
            console.log('[E2E] Mock Service Worker initialized');
          } catch (mswError) {
            console.error('[E2E] Failed to start MSW:', mswError);
          }
        }

        // Initialize monitoring first (before config validation can fail)
        // Skip monitoring in E2E test mode
        if (!IS_E2E_TEST) {
          initMonitoring({
            sentryDsn: config.sentryDsn,
            environment: config.environment,
            enablePerformance: true,
            enableAnalytics: config.enableAnalytics,
            sampleRate: 0.1, // 10% of transactions
          });
        }

        // Skip config validation in E2E mode (using mocked services)
        if (!IS_E2E_TEST) {
          validateConfig();
        }

        // Run database health check (skip in E2E mode)
        if (!IS_E2E_TEST) {
          try {
            const healthReport = await checkDatabaseHealth();

            if (!healthReport.healthy) {
              logger.warn('Database health issues detected', {
                category: 'app',
                integrityErrors: healthReport.integrityErrors.length,
                recommendations: healthReport.recommendations,
              });

              // Show alert to user about database issues
              showAlert(
                'Database Issue Detected',
                'Some database issues were detected. You can continue using the app, but consider going to Settings > Reset Local Database if you experience problems.',
                [{ text: 'OK', style: 'default' }]
              );
            }
          } catch (healthError) {
            logger.error('Database health check failed', healthError as Error, { category: 'app' });
            // Continue app initialization even if health check fails
          }

          // Start periodic telemetry collection (every 4 hours)
          schedulePeriodicTelemetry(4 * 60 * 60 * 1000);

          logger.info('App initialized successfully', { category: 'app' });
        } else {
          console.log('[E2E] App initialized in test mode');
        }
        setIsReady(true);
      } catch (error) {
        if (error instanceof ConfigurationError) {
          logger.error('Configuration error', error, { category: 'app' });
          setConfigError(error.message);
        } else {
          logger.error('Initialization error', error as Error, { category: 'app' });
          setConfigError('An unexpected error occurred during initialization');
        }
      }
    };

    void initializeApp();

    // Cleanup on unmount
    return () => {
      stopPeriodicTelemetry();
    };
  }, []);

  // Show configuration error screen if validation fails
  if (configError) {
    return (
      <SafeAreaProvider>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Configuration Error</Text>
          <Text style={styles.errorMessage}>{configError}</Text>
          <Text style={styles.errorHint}>Check your .env files and restart the app.</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  // Show loading while initializing
  if (!isReady) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <DatabaseProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </DatabaseProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF3F3',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  errorHint: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
});
