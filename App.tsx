import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from '@/app';
import { validateConfig, ConfigurationError } from '@/config';

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
        validateConfig();
        setIsReady(true);
      } catch (error) {
        if (error instanceof ConfigurationError) {
          setConfigError(error.message);
        } else {
          setConfigError('An unexpected error occurred during initialization');
        }
      }
    };

    void initializeApp();
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
        <RootNavigator />
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
