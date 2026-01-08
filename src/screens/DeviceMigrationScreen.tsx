/**
 * Device Migration Screen
 *
 * Two-mode screen for device transfer:
 * - Send mode: Displays QR code for transfer FROM this device
 * - Receive mode: Placeholder for QR scanner to transfer TO this device
 *
 * @module screens/DeviceMigrationScreen
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Button } from '@/components/ui';
import { QRCode } from '@/components/ui/QRCode';
import {
  generateMigrationQR,
  formatTimeRemaining,
  isQRExpired,
  QRGenerationResult,
} from '@/services/recovery/device-migration';
import { logger } from '@/services/monitoring';
import { useAuth } from '@/hooks';
import type { HomeStackParamList } from '@/navigation/types';

type DeviceMigrationRouteProp = RouteProp<HomeStackParamList, 'DeviceMigration'>;

/**
 * Device migration screen component
 */
export function DeviceMigrationScreen(): React.ReactElement {
  const navigation = useNavigation();
  const route = useRoute<DeviceMigrationRouteProp>();
  const { logout } = useAuth();

  const mode = route.params?.mode ?? 'send';

  const [qrResult, setQrResult] = useState<QRGenerationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Generate QR code for send mode
  useEffect(() => {
    if (mode === 'send') {
      generateQR();
    } else {
      setIsLoading(false);
    }
  }, [mode]);

  // Update time remaining every second
  useEffect(() => {
    if (!qrResult || mode !== 'send') return;

    const interval = setInterval(() => {
      if (isQRExpired(qrResult.expiresAt)) {
        setTimeRemaining('Expired');
        clearInterval(interval);
      } else {
        setTimeRemaining(formatTimeRemaining(qrResult.expiresAt));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [qrResult, mode]);

  const generateQR = async () => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info('Generating migration QR code', { category: 'recovery' });
      const result = await generateMigrationQR();
      setQrResult(result);
      setTimeRemaining(formatTimeRemaining(result.expiresAt));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      logger.error('Failed to generate migration QR', err as Error, { category: 'recovery' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshQR = useCallback(() => {
    generateQR();
  }, []);

  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Sign Out',
      'After the new device is set up, would you like to sign out of this device?',
      [
        { text: 'Stay Signed In', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.goBack();
          },
        },
      ]
    );
  }, [logout, navigation]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Render send mode (QR generation)
  if (mode === 'send') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Transfer to New Device</Text>
            <Text style={styles.description}>
              Show this QR code to your new device to transfer your account.
            </Text>
          </View>

          {/* QR Code Display */}
          {isLoading ? (
            <View style={styles.qrContainer}>
              <ActivityIndicator size="large" color="#1976D2" />
              <Text style={styles.loadingText}>Generating QR code...</Text>
            </View>
          ) : error ? (
            <View style={styles.qrContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <Button
                title="Try Again"
                variant="secondary"
                onPress={handleRefreshQR}
                style={styles.retryButton}
              />
            </View>
          ) : qrResult ? (
            <View style={styles.qrSection}>
              <View style={styles.qrWrapper}>
                <QRCode value={qrResult.qrData} size={200} />
              </View>

              {/* Timer */}
              <View style={styles.timerContainer}>
                <Text style={styles.timerLabel}>Expires in:</Text>
                <Text
                  style={[styles.timerValue, timeRemaining === 'Expired' && styles.timerExpired]}
                >
                  {timeRemaining}
                </Text>
              </View>

              {/* Refresh Button */}
              {timeRemaining === 'Expired' && (
                <Button
                  title="Generate New Code"
                  variant="secondary"
                  onPress={handleRefreshQR}
                  style={styles.refreshButton}
                />
              )}
            </View>
          ) : null}

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>How to transfer:</Text>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>On your new device, download and open QuarryCMMS</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                Tap "Transfer from Another Device" on the login screen
              </Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>Scan this QR code with the new device</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>4</Text>
              <Text style={styles.stepText}>Log in with your credentials on the new device</Text>
            </View>
          </View>

          {/* Sign Out Prompt */}
          {qrResult && timeRemaining !== 'Expired' && (
            <View style={styles.signOutSection}>
              <Text style={styles.signOutText}>
                After setting up your new device, you can sign out of this one.
              </Text>
              <Button
                title="Sign Out of This Device"
                variant="secondary"
                onPress={handleLogout}
                style={styles.signOutButton}
              />
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            title="Cancel"
            variant="secondary"
            onPress={handleCancel}
            style={styles.footerButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Render receive mode (placeholder for QR scanner)
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Transfer from Another Device</Text>
          <Text style={styles.description}>Scan the QR code displayed on your old device.</Text>
        </View>

        {/* Placeholder for camera/scanner */}
        <View style={styles.scannerPlaceholder}>
          <View style={styles.scannerFrame}>
            <Text style={styles.scannerPlaceholderText}>Camera permission required</Text>
            <Text style={styles.scannerPlaceholderSubtext}>QR scanner will appear here</Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Instructions:</Text>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>Open Settings on your old device</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>Tap "Transfer to New Device"</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>Point this camera at the QR code</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>4</Text>
            <Text style={styles.stepText}>Log in with your credentials</Text>
          </View>
        </View>

        {/* Alternative login */}
        <View style={styles.alternativeSection}>
          <Text style={styles.alternativeText}>Don&apos;t have your old device?</Text>
          <Button
            title="Log in Manually"
            variant="secondary"
            onPress={handleCancel}
            style={styles.alternativeButton}
          />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title="Cancel"
          variant="secondary"
          onPress={handleCancel}
          style={styles.footerButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 24,
  },
  qrSection: {
    alignItems: 'center',
    padding: 24,
  },
  qrWrapper: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 8,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  timerLabel: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
  },
  timerValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1976D2',
    fontFamily: 'monospace',
  },
  timerExpired: {
    color: '#D32F2F',
  },
  refreshButton: {
    marginTop: 16,
  },
  instructions: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1976D2',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  signOutSection: {
    padding: 24,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 12,
  },
  signOutButton: {
    minWidth: 200,
  },
  scannerPlaceholder: {
    alignItems: 'center',
    padding: 24,
  },
  scannerFrame: {
    width: 250,
    height: 250,
    backgroundColor: '#E0E0E0',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#BDBDBD',
    borderStyle: 'dashed',
  },
  scannerPlaceholderText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  scannerPlaceholderSubtext: {
    fontSize: 14,
    color: '#999999',
  },
  alternativeSection: {
    padding: 24,
    alignItems: 'center',
  },
  alternativeText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  alternativeButton: {
    minWidth: 200,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerButton: {
    flex: 1,
  },
});

export default DeviceMigrationScreen;
