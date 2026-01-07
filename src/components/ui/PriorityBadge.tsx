import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PRIORITY_LEVELS } from '@/constants';

export type WorkOrderPriority = keyof typeof PRIORITY_LEVELS;

interface PriorityBadgeProps {
  priority: WorkOrderPriority;
  size?: 'small' | 'medium' | 'large';
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
 * Priority indicator badge for work orders
 * Shows colored dot and priority label
 */
export function PriorityBadge({ priority, size = 'medium' }: PriorityBadgeProps): React.ReactElement {
  const priorityConfig = PRIORITY_LEVELS[priority];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: `${priorityConfig.color}20`, // 20% opacity
          paddingHorizontal: sizeConfig.paddingHorizontal,
          paddingVertical: sizeConfig.paddingVertical,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Priority: ${priorityConfig.label}`}
    >
      <View
        style={[
          styles.dot,
          {
            width: sizeConfig.dotSize,
            height: sizeConfig.dotSize,
            borderRadius: sizeConfig.dotSize / 2,
            backgroundColor: priorityConfig.color,
          },
        ]}
      />
      <Text
        style={[
          styles.label,
          {
            color: priorityConfig.color,
            fontSize: sizeConfig.fontSize,
          },
        ]}
      >
        {priorityConfig.label}
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

export default PriorityBadge;
