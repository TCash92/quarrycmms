/**
 * Failure Type Picker Component
 *
 * Chip-based selection for work order failure types.
 * Used during work order completion.
 *
 * @module components/ui/FailureTypePicker
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { FAILURE_TYPES, TOUCH_TARGETS } from '@/constants';
import type { FailureType } from '@/database/models/WorkOrder';

interface FailureTypePickerProps {
  value: FailureType;
  onChange: (failureType: FailureType) => void;
  /** testID for E2E testing - chips get suffixed with failure type key */
  testID?: string;
}

const FAILURE_TYPE_OPTIONS: FailureType[] = ['none', 'wore_out', 'broke', 'unknown'];

/**
 * Failure type selection component for work order completion
 * Displays failure type options as tappable chips
 */
export function FailureTypePicker({
  value,
  onChange,
  testID,
}: FailureTypePickerProps): React.ReactElement {
  return (
    <View style={styles.container}>
      {FAILURE_TYPE_OPTIONS.map(failureType => {
        const isSelected = failureType === value;
        const config = FAILURE_TYPES[failureType];

        return (
          <TouchableOpacity
            key={failureType}
            style={[styles.chip, isSelected && { backgroundColor: config.color }]}
            onPress={() => onChange(failureType)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Failure type: ${config.label}`}
            testID={testID ? `${testID}-${failureType.replace('_', '-')}` : undefined}
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

export default FailureTypePicker;
