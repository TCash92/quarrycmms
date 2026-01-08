/**
 * Action Type Picker Component
 *
 * Large, glove-friendly buttons for selecting Quick Log action types.
 * Uses 56dp touch targets for cold weather operation.
 *
 * @module components/ui/ActionTypePicker
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { QUICK_LOG_ACTIONS, TOUCH_TARGETS, QuickLogActionType } from '@/constants';

interface ActionTypePickerProps {
  /** Currently selected action type */
  value: QuickLogActionType | null;
  /** Callback when action type is selected */
  onChange: (type: QuickLogActionType) => void;
  /** Base testID for E2E testing - buttons get suffixes like -emergency, -maintenance, -inspection */
  testID?: string;
}

const ACTION_TYPES: QuickLogActionType[] = ['emergency_repair', 'maintenance_pm', 'inspection'];

/**
 * Action type selection component for Quick Log
 *
 * Displays three large buttons for selecting what type of work was done:
 * - Emergency / Repair (red)
 * - Maintenance / PM (blue)
 * - Inspection (green)
 */
const ACTION_TYPE_TEST_ID_MAP: Record<QuickLogActionType, string> = {
  emergency_repair: 'emergency',
  maintenance_pm: 'maintenance',
  inspection: 'inspection',
};

export function ActionTypePicker({
  value,
  onChange,
  testID,
}: ActionTypePickerProps): React.ReactElement {
  return (
    <View style={styles.container}>
      {ACTION_TYPES.map(actionType => {
        const isSelected = actionType === value;
        const config = QUICK_LOG_ACTIONS[actionType];

        return (
          <TouchableOpacity
            key={actionType}
            style={[
              styles.button,
              { borderColor: config.color },
              isSelected && { backgroundColor: config.color },
            ]}
            onPress={() => onChange(actionType)}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${config.label} action type`}
            testID={testID ? `${testID}-${ACTION_TYPE_TEST_ID_MAP[actionType]}` : undefined}
          >
            <Text style={[styles.buttonText, { color: isSelected ? '#FFFFFF' : config.color }]}>
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
    gap: TOUCH_TARGETS.BUTTON_SPACING,
  },
  button: {
    minHeight: TOUCH_TARGETS.COLD_WEATHER,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ActionTypePicker;
