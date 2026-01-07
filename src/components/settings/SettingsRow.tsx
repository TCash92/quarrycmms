/**
 * Settings Row Component
 *
 * A reusable row component for settings screens with icon, label,
 * optional value, and navigation chevron.
 *
 * @module components/settings/SettingsRow
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TOUCH_TARGETS } from '@/constants';

type SettingsRowVariant = 'default' | 'danger';

interface SettingsRowProps {
  /** Icon to display (emoji or text) */
  icon?: string;
  /** Main label text */
  label: string;
  /** Optional value/subtitle text */
  value?: string;
  /** Whether to show navigation chevron */
  showChevron?: boolean;
  /** Style variant */
  variant?: SettingsRowVariant;
  /** Press handler */
  onPress?: () => void;
  /** Whether the row is disabled */
  disabled?: boolean;
  /** Accessibility label override */
  accessibilityLabel?: string;
}

/**
 * Settings row with icon, label, value, and optional chevron
 */
export function SettingsRow({
  icon,
  label,
  value,
  showChevron = true,
  variant = 'default',
  onPress,
  disabled = false,
  accessibilityLabel,
}: SettingsRowProps): React.ReactElement {
  const isDanger = variant === 'danger';
  const isInteractive = !!onPress && !disabled;

  const content = (
    <View style={styles.container}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.label,
            isDanger && styles.labelDanger,
            disabled && styles.labelDisabled,
          ]}
        >
          {label}
        </Text>
        {value && (
          <Text style={[styles.value, disabled && styles.valueDisabled]}>
            {value}
          </Text>
        )}
      </View>
      {showChevron && isInteractive && (
        <Text style={[styles.chevron, disabled && styles.chevronDisabled]}>
          {'>'}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.touchable}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
        accessibilityState={{ disabled }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.touchable}>{content}</View>;
}

const styles = StyleSheet.create({
  touchable: {
    minHeight: TOUCH_TARGETS.MINIMUM,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
    textAlign: 'center',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  labelDanger: {
    color: '#D32F2F',
  },
  labelDisabled: {
    color: '#9E9E9E',
  },
  value: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  valueDisabled: {
    color: '#BDBDBD',
  },
  chevron: {
    fontSize: 18,
    color: '#BDBDBD',
    marginLeft: 8,
  },
  chevronDisabled: {
    color: '#E0E0E0',
  },
});

export default SettingsRow;
