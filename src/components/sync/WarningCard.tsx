/**
 * WarningCard Component
 *
 * Displays a non-blocking warning in the sync troubleshooting view.
 * Warnings don't stop sync but inform the user of potential issues.
 *
 * @module components/sync/WarningCard
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TOUCH_TARGETS } from '@/constants';

/**
 * Action button configuration
 */
export interface WarningAction {
  label: string;
  onPress: () => void;
}

/**
 * Props for WarningCard
 */
export interface WarningCardProps {
  /** Emoji icon for the warning type */
  icon: string;
  /** Short title (e.g., "Low Storage") */
  title: string;
  /** User-friendly message explaining the warning */
  message: string;
  /** Optional action buttons */
  actions?: WarningAction[] | undefined;
  /** Test ID for e2e testing */
  testID?: string | undefined;
}

/**
 * Card component for displaying non-blocking sync warnings
 *
 * @example
 * ```tsx
 * <WarningCard
 *   icon="📱"
 *   title="Low Storage"
 *   message="Device storage is 92% full. Some photos may not download."
 *   actions={[
 *     { label: 'Clear Cache', onPress: handleClearCache },
 *     { label: 'Manage Storage', onPress: handleManageStorage },
 *   ]}
 * />
 * ```
 */
export function WarningCard({
  icon,
  title,
  message,
  actions,
  testID,
}: WarningCardProps): React.ReactElement {
  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>

      <Text style={styles.message}>{message}</Text>

      {actions && actions.length > 0 && (
        <View style={styles.actionsContainer}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionButton}
              onPress={action.onPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <Text style={styles.actionButtonText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F57C00', // Orange for warnings
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  message: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    minHeight: TOUCH_TARGETS.MINIMUM,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
  },
});

export default WarningCard;
