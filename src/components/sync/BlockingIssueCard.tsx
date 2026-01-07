/**
 * BlockingIssueCard Component
 *
 * Displays a blocking sync error with actionable buttons.
 * Used in the SyncDetailsScreen "What's Blocking" view.
 *
 * @module components/sync/BlockingIssueCard
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TOUCH_TARGETS } from '@/constants';

/**
 * Action button configuration
 */
export interface IssueAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
}

/**
 * Props for BlockingIssueCard
 */
export interface BlockingIssueCardProps {
  /** Emoji icon for the issue type */
  icon: string;
  /** Short title (e.g., "Network Error") */
  title: string;
  /** User-friendly message explaining the issue */
  message: string;
  /** Technical details for debugging (optional) */
  technicalDetails?: string;
  /** Action buttons to resolve the issue */
  actions: IssueAction[];
  /** Test ID for e2e testing */
  testID?: string;
}

/**
 * Get button style based on variant
 */
function getButtonStyle(variant: IssueAction['variant'] = 'primary') {
  switch (variant) {
    case 'primary':
      return styles.primaryButton;
    case 'secondary':
      return styles.secondaryButton;
    case 'destructive':
      return styles.destructiveButton;
    default:
      return styles.primaryButton;
  }
}

/**
 * Get button text style based on variant
 */
function getButtonTextStyle(variant: IssueAction['variant'] = 'primary') {
  switch (variant) {
    case 'primary':
      return styles.primaryButtonText;
    case 'secondary':
      return styles.secondaryButtonText;
    case 'destructive':
      return styles.destructiveButtonText;
    default:
      return styles.primaryButtonText;
  }
}

/**
 * Card component for displaying blocking sync errors with action buttons
 *
 * @example
 * ```tsx
 * <BlockingIssueCard
 *   icon="🌐"
 *   title="Network Error"
 *   message="Server returned 503 - Service Unavailable"
 *   actions={[{ label: 'Retry Now', onPress: handleRetry }]}
 * />
 * ```
 */
export function BlockingIssueCard({
  icon,
  title,
  message,
  technicalDetails,
  actions,
  testID,
}: BlockingIssueCardProps): React.ReactElement {
  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>

      <Text style={styles.message}>{message}</Text>

      {technicalDetails && (
        <Text style={styles.technicalDetails}>{technicalDetails}</Text>
      )}

      {actions.length > 0 && (
        <View style={styles.actionsContainer}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.actionButton, getButtonStyle(action.variant)]}
              onPress={action.onPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <Text style={getButtonTextStyle(action.variant)}>{action.label}</Text>
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
    borderLeftColor: '#D32F2F', // Red for blocking issues
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
    marginBottom: 8,
  },
  technicalDetails: {
    fontSize: 12,
    color: '#999999',
    fontFamily: 'monospace',
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    minHeight: TOUCH_TARGETS.MINIMUM,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#1976D2',
  },
  secondaryButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  destructiveButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  destructiveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D32F2F',
  },
});

export default BlockingIssueCard;
