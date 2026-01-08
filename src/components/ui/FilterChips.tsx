import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { TOUCH_TARGETS } from '@/constants';

export interface FilterChip {
  key: string;
  label: string;
  color?: string;
}

interface FilterChipsProps {
  chips: FilterChip[];
  selected: string;
  onSelect: (key: string) => void;
  /** Base testID for E2E testing - chips get suffixes like -all, -open, etc. */
  testID?: string;
}

/**
 * Horizontal scrolling filter chips
 * For filtering lists by status, category, etc.
 */
export function FilterChips({
  chips,
  selected,
  onSelect,
  testID,
}: FilterChipsProps): React.ReactElement {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      accessibilityRole="tablist"
    >
      {chips.map(chip => {
        const isSelected = chip.key === selected;
        return (
          <TouchableOpacity
            key={chip.key}
            style={[
              styles.chip,
              isSelected && styles.chipSelected,
              isSelected && chip.color && { backgroundColor: chip.color },
            ]}
            onPress={() => onSelect(chip.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Filter by ${chip.label}`}
            testID={testID ? `${testID}-${chip.key.replace('_', '-')}` : undefined}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: TOUCH_TARGETS.MINIMUM,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
});

export default FilterChips;
