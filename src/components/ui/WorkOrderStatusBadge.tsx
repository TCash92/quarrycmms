/**
 * Work Order Status Badge Component
 *
 * Status indicator badge for work orders.
 * Shows colored dot and status label.
 *
 * @module components/ui/WorkOrderStatusBadge
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WORK_ORDER_STATUS } from '@/constants';

export type WorkOrderStatusType = keyof typeof WORK_ORDER_STATUS;

interface WorkOrderStatusBadgeProps {
  status: WorkOrderStatusType;
  size?: 'small' | 'medium' | 'large';
  /** testID for E2E testing */
  testID?: string;
}

const SIZE_CONFIG = {
  small: {
    dotSize: 8,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  medium: {
    dotSize: 10,
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  large: {
    dotSize: 12,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
};

/**
 * Status indicator badge for work orders
 * Shows colored dot and status label
 */
export function WorkOrderStatusBadge({
  status,
  size = 'medium',
  testID,
}: WorkOrderStatusBadgeProps): React.ReactElement {
  const statusConfig = WORK_ORDER_STATUS[status];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: `${statusConfig.color}20`, // 20% opacity
          paddingHorizontal: sizeConfig.paddingHorizontal,
          paddingVertical: sizeConfig.paddingVertical,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${statusConfig.label}`}
      testID={testID}
    >
      <View
        style={[
          styles.dot,
          {
            width: sizeConfig.dotSize,
            height: sizeConfig.dotSize,
            borderRadius: sizeConfig.dotSize / 2,
            backgroundColor: statusConfig.color,
          },
        ]}
      />
      <Text
        style={[
          styles.label,
          {
            color: statusConfig.color,
            fontSize: sizeConfig.fontSize,
          },
        ]}
      >
        {statusConfig.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  dot: {
    marginRight: 6,
  },
  label: {
    fontWeight: '600',
  },
});

export default WorkOrderStatusBadge;
