import React, { useCallback } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCurrentUser, useSync, useQuickStats } from '@/hooks';
import { TOUCH_TARGETS } from '@/constants';
import type { SyncStatusType } from '@/services/sync';
import type { HomeStackParamList } from '@/navigation/types';

/**
 * Stat card component for dashboard
 */
function StatCard({ title, value }: { title: string; value: string }): React.ReactElement {
  return (
    <View style={styles.statCardWrapper}>
      <TouchableOpacity
        style={styles.statCard}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${value}`}
      >
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </TouchableOpacity>
    </View>
  );
}

function getSyncStatusColor(status: SyncStatusType, isOnline: boolean): string {
  if (!isOnline) return '#F57C00'; // Orange for offline
  switch (status) {
    case 'syncing':
      return '#1976D2'; // Blue
    case 'error':
      return '#D32F2F'; // Red
    case 'idle':
      return '#388E3C'; // Green
    default:
      return '#9E9E9E'; // Grey
  }
}

function getSyncStatusLabel(status: SyncStatusType): string {
  switch (status) {
    case 'syncing':
      return 'Syncing...';
    case 'error':
      return 'Sync Error';
    case 'idle':
      return 'Synced';
    case 'offline':
      return 'Offline';
    default:
      return 'Unknown';
  }
}

function formatLastSync(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Home screen - main dashboard for authenticated users
 * Shows user greeting, sync status, and quick stats
 */
type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>;

export function HomeScreen(): React.ReactElement {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const user = useCurrentUser();
  const { syncStatus, isOnline, performSync, isSyncing, queueStats, refreshStatus } = useSync();
  const quickStats = useQuickStats();

  // Refresh sync status when screen comes into focus
  // This ensures pending count updates after creating quick logs or other changes
  useFocusEffect(
    useCallback(() => {
      refreshStatus();
    }, [refreshStatus])
  );

  const capitalizedRole = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" />

      {/* Header with greeting */}
      <View style={styles.header}>
        <Text style={styles.greeting} testID="home-greeting">
          Hello, {user.name}
        </Text>
        <Text style={styles.role}>{capitalizedRole}</Text>
      </View>

      {/* Sync Status Card */}
      <TouchableOpacity
        style={styles.statusCard}
        activeOpacity={0.7}
        onPress={isOnline && !isSyncing ? performSync : undefined}
        disabled={!isOnline || isSyncing}
        accessibilityRole="button"
        accessibilityLabel={`Sync status: ${isSyncing ? 'Syncing' : syncStatus.status}. Tap to sync.`}
        testID="home-sync-card"
      >
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: getSyncStatusColor(
                  isSyncing ? 'syncing' : syncStatus.status,
                  isOnline
                ),
              },
            ]}
          />
          <Text style={styles.statusText} testID="home-sync-status">
            {!isOnline
              ? 'Offline Mode'
              : isSyncing
                ? 'Syncing...'
                : getSyncStatusLabel(syncStatus.status)}
          </Text>
          {isOnline && !isSyncing && <Text style={styles.syncHint}>Tap to sync</Text>}
        </View>
        {syncStatus.pendingChanges > 0 && (
          <Text style={styles.pendingText} testID="home-pending-count">
            {syncStatus.pendingChanges} pending change
            {syncStatus.pendingChanges !== 1 ? 's' : ''}
          </Text>
        )}
        {syncStatus.lastSyncAt && (
          <Text style={styles.lastSyncText}>
            Last sync: {formatLastSync(syncStatus.lastSyncAt)}
          </Text>
        )}
        {/* View Details link - shown when there are issues or failed items */}
        {(syncStatus.status === 'error' || (queueStats && queueStats.failed > 0)) && (
          <TouchableOpacity
            style={styles.viewDetailsLink}
            onPress={() => navigation.navigate('SyncDetails')}
            accessibilityRole="button"
            accessibilityLabel="View sync details"
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Quick Stats */}
      <View style={styles.statsContainer} testID="home-quick-stats">
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Open Work Orders"
            value={quickStats.isLoading ? '--' : String(quickStats.openWorkOrders)}
          />
          <StatCard
            title="My Assigned"
            value={quickStats.isLoading ? '--' : String(quickStats.myAssigned)}
          />
          <StatCard
            title="Assets"
            value={quickStats.isLoading ? '--' : String(quickStats.totalAssets)}
          />
          <StatCard
            title="Due Today"
            value={quickStats.isLoading ? '--' : String(quickStats.dueToday)}
          />
        </View>
      </View>

      {/* Reports Section */}
      <View style={styles.reportsSection}>
        <Text style={styles.sectionTitle}>Reports</Text>
        <TouchableOpacity
          style={styles.reportCard}
          onPress={() => navigation.navigate('ComplianceReport')}
          accessibilityRole="button"
          accessibilityLabel="Generate compliance report"
        >
          <Text style={styles.reportTitle}>Compliance Package</Text>
          <Text style={styles.reportDescription}>Generate PDF report for audits</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  role: {
    fontSize: 16,
    color: '#666666',
    marginTop: 4,
  },
  statusCard: {
    marginHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  syncHint: {
    fontSize: 12,
    color: '#1976D2',
    marginLeft: 'auto',
  },
  pendingText: {
    fontSize: 14,
    color: '#F57C00',
    marginTop: 8,
  },
  lastSyncText: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
  },
  viewDetailsLink: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
  },
  statsContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statCardWrapper: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    minHeight: TOUCH_TARGETS.MINIMUM * 2,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1976D2',
    textAlign: 'center',
  },
  statTitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 4,
  },
  reportsSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    minHeight: TOUCH_TARGETS.MINIMUM * 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: 14,
    color: '#666666',
  },
});

export default HomeScreen;
