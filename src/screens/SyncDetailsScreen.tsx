/**
 * SyncDetailsScreen
 *
 * "What's blocking" troubleshooting view for sync issues.
 * Shows blocking issues, warnings, and items ready to sync.
 *
 * Per design guide Section 6.4:
 * - BLOCKING ISSUES: Errors that prevent sync
 * - WARNINGS: Non-blocking issues
 * - READY TO SYNC: Pending items by type
 *
 * @module screens/SyncDetailsScreen
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSync, useAuth } from '@/hooks';
import { Button } from '@/components/ui';
import { BlockingIssueCard, WarningCard, SyncQueueSummary } from '@/components/sync';
import type { IssueAction } from '@/components/sync';
import { getBlockingIssues, RetryQueueItem, removeFromQueue } from '@/services/sync/retry-queue';
import {
  collectDiagnostics,
  formatRelativeTime,
  formatBytes,
  DeviceDiagnostics,
} from '@/services/sync/sync-diagnostics';
import { exportLogsForSupport, shareExportedLogs } from '@/services/sync/sync-export';
import type { HomeStackScreenProps } from '@/navigation/types';

type Props = HomeStackScreenProps<'SyncDetails'>;

/**
 * Map error category to user-friendly display
 */
function getErrorDisplay(item: RetryQueueItem): {
  icon: string;
  title: string;
  message: string;
  actions: IssueAction[];
} {
  const category = item.errorCategory ?? 'unknown';
  const baseMessage = item.lastError ?? 'An error occurred';

  switch (category) {
    case 'transient':
      // Network or temporary errors
      if (baseMessage.includes('503') || baseMessage.includes('unavailable')) {
        return {
          icon: '🌐',
          title: 'Network Error',
          message: 'Server is temporarily unavailable. Try again in a few minutes.',
          actions: [], // Actions handled by parent
        };
      }
      if (baseMessage.includes('timeout')) {
        return {
          icon: '🌐',
          title: 'Connection Timeout',
          message: 'Connection timed out. Check your internet connection.',
          actions: [],
        };
      }
      if (baseMessage.includes('429') || baseMessage.includes('rate')) {
        return {
          icon: '⏱️',
          title: 'Rate Limited',
          message: 'Too many sync attempts. Please wait a few minutes.',
          actions: [],
        };
      }
      return {
        icon: '🔄',
        title: 'Temporary Error',
        message: baseMessage,
        actions: [],
      };

    case 'auth':
      return {
        icon: '🔐',
        title: 'Session Expired',
        message: 'Your login session has expired.',
        actions: [], // Login action handled by parent
      };

    case 'validation':
      if (baseMessage.includes('photo') || baseMessage.includes('large')) {
        return {
          icon: '📷',
          title: 'Photo Too Large',
          message: baseMessage,
          actions: [], // Photo actions handled by parent
        };
      }
      return {
        icon: '⚠️',
        title: 'Validation Error',
        message: baseMessage,
        actions: [],
      };

    case 'permanent':
      if (baseMessage.includes('storage')) {
        return {
          icon: '📱',
          title: 'Storage Full',
          message: 'Device storage is full. Free up space to continue.',
          actions: [],
        };
      }
      return {
        icon: '❌',
        title: 'Sync Error',
        message: baseMessage,
        actions: [],
      };

    default:
      return {
        icon: '❓',
        title: 'Unknown Error',
        message: baseMessage,
        actions: [],
      };
  }
}

/**
 * Sync Details / What's Blocking screen
 */
export function SyncDetailsScreen(_props: Props): React.ReactElement {
  const { logout } = useAuth();
  const { syncStatus, performSync, isSyncing, isOnline, isOnWiFi, queueStats, refreshStatus } =
    useSync();

  const [refreshing, setRefreshing] = useState(false);
  const [blockingIssues, setBlockingIssues] = useState<RetryQueueItem[]>([]);
  const [diagnostics, setDiagnostics] = useState<DeviceDiagnostics | null>(null);
  const [exporting, setExporting] = useState(false);

  /**
   * Load blocking issues and diagnostics
   */
  const loadData = useCallback(async () => {
    try {
      const [issues, diag] = await Promise.all([getBlockingIssues(), collectDiagnostics()]);
      setBlockingIssues(issues);
      setDiagnostics(diag);
    } catch (error) {
      console.error('[SyncDetails] Error loading data:', error);
    }
  }, []);

  /**
   * Refresh data
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(), refreshStatus()]);
    setRefreshing(false);
  }, [loadData, refreshStatus]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Handle retry action for a blocking issue
   */
  const handleRetry = useCallback(
    async (itemId: string) => {
      // Remove from queue and trigger sync
      await removeFromQueue(itemId);
      await loadData();
      performSync();
    },
    [loadData, performSync]
  );

  /**
   * Handle skip/remove action for a blocking issue
   */
  const handleSkip = useCallback(
    async (itemId: string) => {
      Alert.alert(
        'Skip This Item?',
        'This will remove the item from the sync queue. You may need to re-create the record.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Skip',
            style: 'destructive',
            onPress: async () => {
              await removeFromQueue(itemId);
              await loadData();
            },
          },
        ]
      );
    },
    [loadData]
  );

  /**
   * Handle re-login for auth errors
   */
  const handleReLogin = useCallback(async () => {
    Alert.alert('Log Out and Re-Login?', 'You will need to log in again to continue syncing.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        onPress: async () => {
          await logout();
          // Navigation will automatically redirect to login
        },
      },
    ]);
  }, [logout]);

  /**
   * Handle export logs
   */
  const handleExportLogs = useCallback(async () => {
    setExporting(true);
    try {
      const result = await exportLogsForSupport();
      if (result.success && result.filePath) {
        Alert.alert(
          'Logs Exported',
          `File created: ${result.fileName}\nSize: ${formatBytes(result.fileSizeBytes ?? 0)}`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Share',
              onPress: () => shareExportedLogs(result.filePath!, 'share'),
            },
          ]
        );
      } else {
        Alert.alert('Export Failed', result.error ?? 'Unknown error');
      }
    } catch {
      Alert.alert('Export Failed', 'Could not export logs. Please try again.');
    } finally {
      setExporting(false);
    }
  }, []);

  /**
   * Handle force sync
   */
  const handleForceSync = useCallback(() => {
    Alert.alert('Force Sync', 'This will attempt to sync all pending items immediately.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Force Sync',
        onPress: () => performSync(),
      },
    ]);
  }, [performSync]);

  /**
   * Handle manage storage
   */
  const handleManageStorage = useCallback(() => {
    Linking.openSettings();
  }, []);

  /**
   * Build actions for a blocking issue based on its type
   */
  const buildActions = useCallback(
    (item: RetryQueueItem): IssueAction[] => {
      const category = item.errorCategory ?? 'unknown';

      switch (category) {
        case 'transient':
          return [{ label: 'Retry Now', onPress: () => handleRetry(item.id), variant: 'primary' }];

        case 'auth':
          return [{ label: 'Log In Again', onPress: handleReLogin, variant: 'primary' }];

        case 'validation':
          return [
            { label: 'Skip This Item', onPress: () => handleSkip(item.id), variant: 'destructive' },
          ];

        case 'permanent':
          if (item.lastError?.includes('storage')) {
            return [
              { label: 'Manage Storage', onPress: handleManageStorage, variant: 'secondary' },
            ];
          }
          return [{ label: 'Skip', onPress: () => handleSkip(item.id), variant: 'destructive' }];

        default:
          return [
            { label: 'Retry', onPress: () => handleRetry(item.id), variant: 'primary' },
            { label: 'Skip', onPress: () => handleSkip(item.id), variant: 'secondary' },
          ];
      }
    },
    [handleRetry, handleSkip, handleReLogin, handleManageStorage]
  );

  // Calculate pending items by type
  const pendingWorkOrders = queueStats?.byTable.work_orders ?? 0;
  const pendingPhotos = queueStats?.byTable.work_order_photos ?? 0;
  const pendingMeterReadings = queueStats?.byTable.meter_readings ?? 0;
  const pendingAssets = queueStats?.byTable.assets ?? 0;

  // Check for warnings
  const warnings: Array<{
    icon: string;
    title: string;
    message: string;
    actions?: Array<{ label: string; onPress: () => void }>;
  }> = [];

  // Low storage warning
  if (diagnostics && diagnostics.storageUsed > 500 * 1024 * 1024) {
    // > 500MB used
    warnings.push({
      icon: '📱',
      title: 'Storage Usage',
      message: `App is using ${formatBytes(diagnostics.storageUsed)} of storage.`,
      actions: [{ label: 'Manage Storage', onPress: handleManageStorage }],
    });
  }

  // WiFi-only photo sync warning
  if (pendingPhotos > 0 && !isOnWiFi && isOnline) {
    warnings.push({
      icon: '📶',
      title: 'Photos Waiting for WiFi',
      message: `${pendingPhotos} photo${pendingPhotos !== 1 ? 's' : ''} will sync when connected to WiFi.`,
    });
  }

  // Offline warning
  if (!isOnline) {
    warnings.push({
      icon: '📡',
      title: 'Offline Mode',
      message: 'Sync will resume when you reconnect to the internet.',
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Status Summary */}
        <View style={styles.statusSummary} testID="sync-details-status">
          <Text style={styles.statusLabel}>
            Last sync: {formatRelativeTime(syncStatus.lastSyncAt)}
          </Text>
          <Text style={styles.statusLabel}>
            Pending: {syncStatus.pendingChanges} item{syncStatus.pendingChanges !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Force Sync Button */}
        <View style={styles.forceSyncContainer}>
          <Button
            title={isSyncing ? 'Syncing...' : 'Force Sync'}
            onPress={handleForceSync}
            disabled={!isOnline || isSyncing}
          />
        </View>

        {/* Blocking Issues Section */}
        {blockingIssues.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>❌</Text>
              <Text style={[styles.sectionTitle, styles.blockingTitle]}>
                BLOCKING ISSUES ({blockingIssues.length})
              </Text>
            </View>

            {blockingIssues.map(item => {
              const display = getErrorDisplay(item);
              return (
                <BlockingIssueCard
                  key={item.id}
                  icon={display.icon}
                  title={display.title}
                  message={display.message}
                  technicalDetails={item.lastError}
                  actions={buildActions(item)}
                />
              );
            })}
          </View>
        )}

        {/* Warnings Section */}
        {warnings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>⚠️</Text>
              <Text style={[styles.sectionTitle, styles.warningTitle]}>
                WARNINGS ({warnings.length})
              </Text>
            </View>

            {warnings.map((warning, index) => (
              <WarningCard
                key={index}
                icon={warning.icon}
                title={warning.title}
                message={warning.message}
                actions={warning.actions}
              />
            ))}
          </View>
        )}

        {/* Ready to Sync Section */}
        <View style={styles.section}>
          <SyncQueueSummary
            workOrders={pendingWorkOrders}
            photos={pendingPhotos}
            meterReadings={pendingMeterReadings}
            assets={pendingAssets}
            isWiFiOnly={!isOnWiFi}
            onSyncNow={performSync}
            onExportLogs={handleExportLogs}
            isSyncing={isSyncing || exporting}
          />
        </View>

        {/* Debug Info (collapsible in production) */}
        {diagnostics && (
          <View style={styles.debugSection}>
            <Text style={styles.debugTitle}>Diagnostics</Text>
            <Text style={styles.debugText}>Device: {diagnostics.deviceModel}</Text>
            <Text style={styles.debugText}>
              OS: {diagnostics.osName} {diagnostics.osVersion}
            </Text>
            <Text style={styles.debugText}>App: {diagnostics.appVersion}</Text>
            <Text style={styles.debugText}>
              Network: {diagnostics.connectionType} (
              {diagnostics.isConnected ? 'connected' : 'disconnected'})
            </Text>
            <Text style={styles.debugText}>Cache: {formatBytes(diagnostics.cacheSize)}</Text>
            <Text style={styles.debugText}>Errors: {diagnostics.recentErrors.length} recent</Text>
          </View>
        )}
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
    padding: 16,
  },
  statusSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  forceSyncContainer: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  blockingTitle: {
    color: '#D32F2F',
  },
  warningTitle: {
    color: '#F57C00',
  },
  debugSection: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999999',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 11,
    color: '#666666',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});

export default SyncDetailsScreen;
