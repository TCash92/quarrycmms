/**
 * SyncQueueSummary Component
 *
 * Displays a summary of items ready to sync, organized by type.
 * Part of the "What's Blocking" view in SyncDetailsScreen.
 *
 * @module components/sync/SyncQueueSummary
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TOUCH_TARGETS } from '@/constants';

/**
 * Props for SyncQueueSummary
 */
export interface SyncQueueSummaryProps {
  /** Number of work orders pending sync */
  workOrders: number;
  /** Number of photos pending sync */
  photos: number;
  /** Number of meter readings pending sync */
  meterReadings: number;
  /** Number of assets pending sync */
  assets: number;
  /** Whether photos are WiFi-only */
  isWiFiOnly: boolean;
  /** Handler for Sync Now button */
  onSyncNow: () => void;
  /** Handler for Export Logs button */
  onExportLogs: () => void;
  /** Whether sync is currently in progress */
  isSyncing?: boolean;
  /** Test ID for e2e testing */
  testID?: string;
}

/**
 * Component showing pending sync items by type
 *
 * @example
 * ```tsx
 * <SyncQueueSummary
 *   workOrders={12}
 *   photos={35}
 *   meterReadings={5}
 *   assets={0}
 *   isWiFiOnly={true}
 *   onSyncNow={handleSync}
 *   onExportLogs={handleExport}
 * />
 * ```
 */
export function SyncQueueSummary({
  workOrders,
  photos,
  meterReadings,
  assets,
  isWiFiOnly,
  onSyncNow,
  onExportLogs,
  isSyncing = false,
  testID,
}: SyncQueueSummaryProps): React.ReactElement {
  const totalItems = workOrders + photos + meterReadings + assets;
  const hasItems = totalItems > 0;

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.checkIcon}>✅</Text>
        <Text style={styles.headerText}>READY TO SYNC</Text>
      </View>

      {hasItems ? (
        <View style={styles.itemsList}>
          {workOrders > 0 && (
            <Text style={styles.itemRow}>
              • {workOrders} work order{workOrders !== 1 ? 's' : ''}
            </Text>
          )}
          {photos > 0 && (
            <Text style={styles.itemRow}>
              • {photos} photo{photos !== 1 ? 's' : ''}
              {isWiFiOnly && (
                <Text style={styles.wifiNote}> (WiFi only - will skip on cellular)</Text>
              )}
            </Text>
          )}
          {meterReadings > 0 && (
            <Text style={styles.itemRow}>
              • {meterReadings} meter reading{meterReadings !== 1 ? 's' : ''}
            </Text>
          )}
          {assets > 0 && (
            <Text style={styles.itemRow}>
              • {assets} asset{assets !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      ) : (
        <Text style={styles.emptyMessage}>All items are synced</Text>
      )}

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.syncButton, (!hasItems || isSyncing) && styles.disabledButton]}
          onPress={onSyncNow}
          disabled={!hasItems || isSyncing}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={isSyncing ? 'Syncing' : 'Sync Now'}
          accessibilityState={{ disabled: !hasItems || isSyncing }}
        >
          <Text
            style={[styles.syncButtonText, (!hasItems || isSyncing) && styles.disabledButtonText]}
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.exportButton}
          onPress={onExportLogs}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Export for IT Support"
        >
          <Text style={styles.exportButtonText}>Export for IT Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#388E3C', // Green for ready to sync
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#388E3C',
    letterSpacing: 0.5,
  },
  itemsList: {
    marginBottom: 16,
  },
  itemRow: {
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 24,
  },
  wifiNote: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  syncButton: {
    flex: 1,
    minHeight: TOUCH_TARGETS.MINIMUM,
    backgroundColor: '#1976D2',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  disabledButtonText: {
    color: '#999999',
  },
  exportButton: {
    flex: 1,
    minHeight: TOUCH_TARGETS.MINIMUM,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
});

export default SyncQueueSummary;
