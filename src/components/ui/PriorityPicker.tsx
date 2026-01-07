import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { PRIORITY_LEVELS, TOUCH_TARGETS } from '@/constants';
import type { WorkOrderPriority } from '@/database/models/WorkOrder';

interface PriorityPickerProps {
  value: WorkOrderPriority;
  onChange: (priority: WorkOrderPriority) => void;
}

const PRIORITIES: WorkOrderPriority[] = ['low', 'medium', 'high', 'emergency'];

/**
 * Priority selection component for forms
 * Displays priority options as tappable chips
 */
export function PriorityPicker({ value, onChange }: PriorityPickerProps): React.ReactElement {
  return (
    <View style={styles.container}>
      {PRIORITIES.map((priority) => {
        const isSelected = priority === value;
        const config = PRIORITY_LEVELS[priority];

        return (
          <TouchableOpacity
            key={priority}
            style={[
              styles.chip,
              isSelected && { backgroundColor: config.color },
            ]}
            onPress={() => onChange(priority)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${config.label} priority`}
          >
            <Text
              style={[
                styles.chipText,
                isSelected && styles.chipTextSelected,
                !isSelected && { color: config.color },
              ]}
            >
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: TOUCH_TARGETS.MINIMUM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
});

export default PriorityPicker;
