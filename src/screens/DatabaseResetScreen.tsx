/**
 * Database Reset Screen
 *
 * Three-step confirmation flow for resetting the local database:
 * 1. Show pending data warning with counts
 * 2. Offer optional export before reset
 * 3. Require typing "RESET" to confirm
 *
 * @module screens/DatabaseResetScreen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import { Button } from '@/components/ui';
import {
  canSafelyReset,
  exportPendingDataBeforeReset,
  resetLocalDatabase,
  ResetSafetyCheck,
} from '@/services/recovery/database-reset';
import { logger } from '@/services/monitoring';
import { TOUCH_TARGETS } from '@/constants';

type ResetStep = 'checking' | 'warning' | 'confirm' | 'resetting' | 'complete';

/**
 * Database reset screen component
 */
export function DatabaseResetScreen(): React.ReactElement {
  const navigation = useNavigation();

  const [step, setStep] = useState<ResetStep>('checking');
  const [safetyCheck, setSafetyCheck] = useState<ResetSafetyCheck | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [preserveAuth, setPreserveAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Run safety check on mount
  useEffect(() => {
    const checkSafety = async () => {
      try {
        const result = await canSafelyReset();
        setSafetyCheck(result);
        setStep('warning');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setStep('warning');
      }
    };
    checkSafety();
  }, []);

  const handleExportData = useCallback(async () => {
    setIsExporting(true);
    try {
      logger.info('Exporting pending data before reset', { category: 'recovery' });
      const path = await exportPendingDataBeforeReset();
      if (path) {
        setExportPath(path);
        // Share the exported file
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(path, {
            mimeType: 'application/json',
            dialogTitle: 'Save Backup Data',
          });
        }
        Alert.alert(
          'Export Complete',
          'Your pending data has been exported. You can now proceed with the reset.'
        );
      } else {
        Alert.alert('Export Failed', 'Unable to export pending data. Proceed with caution.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Export Failed', message);
      logger.error('Export before reset failed', err as Error, { category: 'recovery' });
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleProceedToConfirm = useCallback(() => {
    setStep('confirm');
  }, []);

  const handleReset = useCallback(async () => {
    if (confirmText !== 'RESET') {
      Alert.alert('Invalid Confirmation', 'Please type "RESET" exactly to confirm.');
      return;
    }

    setStep('resetting');

    try {
      logger.warn('User initiated database reset', { category: 'recovery' });
      const result = await resetLocalDatabase({
        preserveAuth,
        confirmPhrase: confirmText,
      });

      if (result.success) {
        setStep('complete');
        Alert.alert(
          'Reset Complete',
          `Database has been reset. ${result.pendingItemsLost} pending items were removed.\n\nThe app will now reload.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back and trigger app reload
                // In production, you might want to use Updates.reloadAsync()
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        setError(result.error || 'Reset failed');
        setStep('warning');
        Alert.alert('Reset Failed', result.error || 'An error occurred during reset.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setStep('warning');
      Alert.alert('Reset Failed', message);
      logger.error('Database reset failed', err as Error, { category: 'recovery' });
    }
  }, [confirmText, preserveAuth, navigation]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Loading state
  if (step === 'checking') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Checking database status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Resetting state
  if (step === 'resetting') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D32F2F" />
          <Text style={styles.loadingText}>Resetting database...</Text>
          <Text style={styles.loadingSubtext}>Please do not close the app</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Warning Header */}
        <View style={styles.warningHeader}>
          <Text style={styles.warningIcon}>!</Text>
          <Text style={styles.warningTitle}>Reset Local Database</Text>
          <Text style={styles.warningDescription}>
            This will permanently delete all local data on this device. Data that has been synced to
            the server will be downloaded again.
          </Text>
        </View>

        {/* Pending Data Warning */}
        {safetyCheck && safetyCheck.totalPending > 0 && step === 'warning' && (
          <View style={styles.pendingSection}>
            <Text style={styles.pendingSectionTitle}>Unsynced Data</Text>
            <View style={styles.pendingCard}>
              {safetyCheck.pendingWorkOrders > 0 && (
                <View style={styles.pendingRow}>
                  <Text style={styles.pendingLabel}>Work Orders</Text>
                  <Text style={styles.pendingValue}>{safetyCheck.pendingWorkOrders}</Text>
                </View>
              )}
              {safetyCheck.pendingPhotos > 0 && (
                <View style={styles.pendingRow}>
                  <Text style={styles.pendingLabel}>Photos</Text>
                  <Text style={styles.pendingValue}>{safetyCheck.pendingPhotos}</Text>
                </View>
              )}
              {safetyCheck.pendingMeterReadings > 0 && (
                <View style={styles.pendingRow}>
                  <Text style={styles.pendingLabel}>Meter Readings</Text>
                  <Text style={styles.pendingValue}>{safetyCheck.pendingMeterReadings}</Text>
                </View>
              )}
              <View style={[styles.pendingRow, styles.pendingRowTotal]}>
                <Text style={styles.pendingLabelTotal}>Total Items at Risk</Text>
                <Text style={styles.pendingValueTotal}>{safetyCheck.totalPending}</Text>
              </View>
            </View>

            <Text style={styles.warningNote}>
              These items have not been synced to the server and will be permanently lost.
            </Text>

            {/* Export Button */}
            <Button
              title={isExporting ? 'Exporting...' : 'Export Data First'}
              variant="secondary"
              onPress={handleExportData}
              disabled={isExporting}
              style={styles.exportButton}
            />
            {exportPath && <Text style={styles.exportedNote}>Data exported successfully</Text>}
          </View>
        )}

        {/* Safe to Reset Message */}
        {safetyCheck && safetyCheck.totalPending === 0 && step === 'warning' && (
          <View style={styles.safeSection}>
            <Text style={styles.safeTitle}>All Data Synced</Text>
            <Text style={styles.safeDescription}>
              All your data has been synced to the server. You can safely reset the local database.
            </Text>
          </View>
        )}

        {/* Confirmation Step */}
        {step === 'confirm' && (
          <View style={styles.confirmSection}>
            <Text style={styles.confirmTitle}>Confirm Reset</Text>
            <Text style={styles.confirmDescription}>
              Type <Text style={styles.confirmKeyword}>RESET</Text> below to confirm you want to
              delete all local data:
            </Text>
            <TextInput
              style={styles.confirmInput}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="Type RESET here"
              placeholderTextColor="#999999"
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              accessibilityLabel="Type RESET to confirm"
            />

            {/* Preserve Auth Option */}
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Keep me signed in after reset</Text>
              <Text
                style={[styles.optionValue, preserveAuth && styles.optionValueActive]}
                onPress={() => setPreserveAuth(!preserveAuth)}
              >
                {preserveAuth ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorSection}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        {step === 'warning' && (
          <>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={handleCancel}
              style={styles.footerButton}
            />
            <Button
              title="Continue"
              variant="danger"
              onPress={handleProceedToConfirm}
              style={styles.footerButton}
            />
          </>
        )}
        {step === 'confirm' && (
          <>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={handleCancel}
              style={styles.footerButton}
            />
            <Button
              title="Reset Database"
              variant="danger"
              onPress={handleReset}
              disabled={confirmText !== 'RESET'}
              style={styles.footerButton}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  warningHeader: {
    backgroundColor: '#FFF3E0',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  warningIcon: {
    fontSize: 48,
    color: '#E65100',
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 8,
    textAlign: 'center',
  },
  warningDescription: {
    fontSize: 14,
    color: '#BF360C',
    textAlign: 'center',
    lineHeight: 20,
  },
  pendingSection: {
    padding: 24,
  },
  pendingSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D32F2F',
    marginBottom: 12,
  },
  pendingCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  pendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  pendingRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#FFCDD2',
    marginTop: 8,
    paddingTop: 12,
  },
  pendingLabel: {
    fontSize: 14,
    color: '#666666',
  },
  pendingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D32F2F',
  },
  pendingLabelTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  pendingValueTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D32F2F',
  },
  warningNote: {
    fontSize: 13,
    color: '#D32F2F',
    marginTop: 12,
    fontStyle: 'italic',
  },
  exportButton: {
    marginTop: 16,
  },
  exportedNote: {
    fontSize: 13,
    color: '#388E3C',
    marginTop: 8,
    textAlign: 'center',
  },
  safeSection: {
    padding: 24,
    alignItems: 'center',
  },
  safeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#388E3C',
    marginBottom: 8,
  },
  safeDescription: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmSection: {
    padding: 24,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  confirmDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 20,
  },
  confirmKeyword: {
    fontWeight: '700',
    color: '#D32F2F',
    fontFamily: 'monospace',
  },
  confirmInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    fontFamily: 'monospace',
    textAlign: 'center',
    minHeight: TOUCH_TARGETS.MINIMUM,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  optionLabel: {
    fontSize: 14,
    color: '#666666',
  },
  optionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999999',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  optionValueActive: {
    color: '#388E3C',
  },
  errorSection: {
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#D32F2F',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerButton: {
    flex: 1,
  },
});

export default DatabaseResetScreen;
