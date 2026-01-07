import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type WorkOrder from '@/database/models/WorkOrder';
import { PriorityBadge } from './PriorityBadge';
import { TOUCH_TARGETS } from '@/constants';

interface WorkOrderCardProps {
  workOrder: WorkOrder;
  onPress: () => void;
}

/**
 * Format a timestamp as relative date (Today, Tomorrow, etc.)
 */
function formatDueDate(timestamp: number | null): string | null {
  if (!timestamp) return null;

  const now = new Date();
  const due = new Date(timestamp);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.floor((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `${diffDays}d`;
  return due.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

/**
 * Card component for displaying a work order in a list
 * Shows priority badge, WO number, title, asset, and due date
 */
export function WorkOrderCard({ workOrder, onPress }: WorkOrderCardProps): React.ReactElement {
  const [assetName, setAssetName] = useState<string>('');

  // Fetch the related asset name
  useEffect(() => {
    let mounted = true;
    workOrder.asset.fetch().then(asset => {
      if (mounted && asset) {
        setAssetName(asset.assetNumber);
      }
    }).catch(() => {
      // Asset might not exist
    });
    return () => { mounted = false; };
  }, [workOrder]);

  const dueDateText = formatDueDate(workOrder.dueDate);
  const isOverdue = workOrder.isOverdue;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${workOrder.woNumber}, ${workOrder.title}, ${workOrder.priority} priority`}
      accessibilityHint="Double tap to view work order details"
    >
      <View style={styles.header}>
        <PriorityBadge priority={workOrder.priority} size="small" />
        <Text style={styles.status}>
          {workOrder.status === 'open' ? 'Open' :
           workOrder.status === 'in_progress' ? 'In Progress' : 'Completed'}
        </Text>
      </View>
      <Text style={styles.woNumber}>{workOrder.woNumber}</Text>
      <Text style={styles.title} numberOfLines={2}>
        {workOrder.title}
      </Text>
      <View style={styles.footer}>
        {assetName ? (
          <Text style={styles.assetName}>{assetName}</Text>
        ) : null}
        {dueDateText && (
          <Text style={[styles.dueDate, isOverdue && styles.overdue]}>
            {isOverdue ? '⚠️ ' : ''}Due: {dueDateText}
          </Text>
        )}
      </View>
      {workOrder.assignedTo && (
        <Text style={styles.assignedTo} numberOfLines={1}>
          Assigned
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    minHeight: TOUCH_TARGETS.MINIMUM * 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  status: {
    fontSize: 12,
    color: '#666666',
    textTransform: 'uppercase',
  },
  woNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assetName: {
    fontSize: 14,
    color: '#666666',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dueDate: {
    fontSize: 12,
    color: '#666666',
  },
  overdue: {
    color: '#D32F2F',
    fontWeight: '600',
  },
  assignedTo: {
    fontSize: 12,
    color: '#999999',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default WorkOrderCard;
