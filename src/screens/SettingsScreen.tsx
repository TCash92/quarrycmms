/**
 * Settings Screen
 *
 * Main settings screen with self-service options for field technicians.
 * Provides access to account info, sync status, troubleshooting tools,
 * and app information.
 *
 * @module screens/SettingsScreen
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth, useCurrentUser, useSync } from '@/hooks';
import { Button } from '@/components/ui';
import { SettingsSection, SettingsRow } from '@/components/settings';
import { exportLogsForSupport, shareExportedLogs } from '@/services/sync/sync-export';
import { logger } from '@/services/monitoring';
import { showAlert } from '@/utils/alert';
import type { HomeStackParamList } from '@/navigation/types';

// App version from package.json
const APP_VERSION = '0.14.0';
const BUILD_NUMBER = '1';

type SettingsNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Settings'>;

/**
 * Get device ID (truncated for display)
 */
function getDisplayDeviceId(): string {
  // In a real app, this would come from expo-device or similar
  // For now, use a placeholder that would be replaced with actual device ID
  const deviceId = 'device-placeholder';
  return deviceId.slice(0, 8).toUpperCase();
}

/**
 * Format sync status for display
 */
function formatSyncStatus(
  status: string,
  pendingChanges: number,
  isOnline: boolean
): { text: string; icon: string } {
  if (!isOnline) {
    return { text: 'Offline', icon: '!' };
  }
  if (pendingChanges > 0) {
    return { text: `${pendingChanges} pending`, icon: '!' };
  }
  if (status === 'error') {
    return { text: 'Sync error', icon: '!' };
  }
  return { text: 'All synced', icon: '' };
}

/**
 * Settings screen component
 */
export function SettingsScreen(): React.ReactElement {
  const navigation = useNavigation<SettingsNavigationProp>();
  const user = useCurrentUser();
  const { logout } = useAuth();
  const { syncStatus, isOnline } = useSync();

  const [isExporting, setIsExporting] = useState(false);

  const syncStatusDisplay = formatSyncStatus(
    syncStatus.status,
    syncStatus.pendingChanges,
    isOnline
  );

  const handleExportLogs = useCallback(async () => {
    setIsExporting(true);
    try {
      logger.info('Exporting diagnostic logs', { category: 'settings' });
      const result = await exportLogsForSupport();

      if (result.success && result.filePath) {
        await shareExportedLogs(result.filePath);
        logger.info('Diagnostic logs exported successfully', { category: 'settings' });
      } else {
        showAlert('Export Failed', result.error || 'Unable to export logs');
        logger.error('Log export failed', new Error(result.error || 'Unknown error'), {
          category: 'settings',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      showAlert('Export Failed', message);
      logger.error('Log export error', error as Error, { category: 'settings' });
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleDeviceMigration = useCallback(() => {
    navigation.navigate('DeviceMigration', { mode: 'send' });
  }, [navigation]);

  const handleDatabaseReset = useCallback(() => {
    navigation.navigate('DatabaseReset');
  }, [navigation]);

  const handleHelp = useCallback(() => {
    navigation.navigate('Help');
  }, [navigation]);

  const handleSyncDetails = useCallback(() => {
    navigation.navigate('SyncDetails');
  }, [navigation]);

  const handleLogout = useCallback(async () => {
    showAlert(
      'Sign Out',
      'Are you sure you want to sign out? Any unsynced data will remain on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            logger.info('User signing out', { category: 'auth' });
            await logout();
          },
        },
      ]
    );
  }, [logout]);

  const capitalizedRole = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Account Section */}
        <SettingsSection title="Account">
          <View style={styles.accountCard}>
            <Text style={styles.accountName} testID="settings-user-name">
              {user.name}
            </Text>
            <Text style={styles.accountEmail} testID="settings-user-email">
              {user.email || 'Email not available'}
            </Text>
            <View style={styles.accountMeta}>
              <Text style={styles.accountMetaText} testID="settings-user-role">
                {capitalizedRole}
              </Text>
              <Text style={styles.accountMetaDot}> </Text>
              <Text style={styles.accountMetaText}>Site: {user.siteId.slice(0, 8)}</Text>
            </View>
          </View>
        </SettingsSection>

        {/* Sync Status Section */}
        <SettingsSection title="Sync Status">
          <SettingsRow
            icon={syncStatusDisplay.icon === '!' ? '!' : ''}
            label={syncStatusDisplay.text}
            value={isOnline ? 'Tap for details' : 'Device is offline'}
            onPress={handleSyncDetails}
            accessibilityLabel="View sync status details"
            testID="settings-sync-details"
            labelTestID="settings-sync-status"
          />
        </SettingsSection>

        {/* Troubleshooting Section */}
        <SettingsSection title="Troubleshooting">
          <SettingsRow
            icon=""
            label="Help & Support"
            value="Quick guides and troubleshooting"
            onPress={handleHelp}
            accessibilityLabel="Open help and support"
          />
          <SettingsRow
            icon=""
            label="Export Diagnostic Logs"
            value="Share with IT support"
            onPress={handleExportLogs}
            disabled={isExporting}
            accessibilityLabel="Export diagnostic logs for IT support"
          />
          {isExporting && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color="#1976D2" />
              <Text style={styles.loadingText}>Exporting...</Text>
            </View>
          )}
          <SettingsRow
            icon=""
            label="Transfer to New Device"
            value="Move your account via QR code"
            onPress={handleDeviceMigration}
            accessibilityLabel="Transfer account to a new device"
          />
          <SettingsRow
            icon=""
            label="Reset Local Database"
            value="Clear all local data"
            variant="danger"
            onPress={handleDatabaseReset}
            accessibilityLabel="Reset local database"
          />
        </SettingsSection>

        {/* App Info Section */}
        <SettingsSection title="App Info">
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>
                {APP_VERSION} (build {BUILD_NUMBER})
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Device ID</Text>
              <Text style={styles.infoValue}>{getDisplayDeviceId()}</Text>
            </View>
          </View>
        </SettingsSection>

        {/* Sign Out Button */}
        <View style={styles.signOutContainer}>
          <Button
            title="Sign Out"
            variant="secondary"
            onPress={handleLogout}
            testID="settings-logout-button"
          />
        </View>
      </ScrollView>
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
    paddingTop: 24,
    paddingBottom: 32,
  },
  accountCard: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  accountEmail: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  accountMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  accountMetaText: {
    fontSize: 13,
    color: '#999999',
  },
  accountMetaDot: {
    fontSize: 13,
    color: '#999999',
    marginHorizontal: 6,
  },
  loadingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  loadingText: {
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 8,
  },
  infoCard: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666666',
  },
  infoValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontFamily: 'monospace',
  },
  signOutContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
});

export default SettingsScreen;
