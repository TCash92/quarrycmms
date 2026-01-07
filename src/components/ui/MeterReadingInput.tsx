/**
 * Meter Reading Input Component
 *
 * Numeric input with validation feedback for meter readings.
 * Shows previous reading context and validation warnings/errors.
 *
 * @module components/ui/MeterReadingInput
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useMeterReadings } from '@/hooks';
import { TOUCH_TARGETS } from '@/constants';
import type { MeterValidationResult } from '@/hooks/useMeterReadings';

interface MeterReadingInputProps {
  /** Asset ID to get readings for */
  assetId: string;
  /** Meter type label (e.g., "Hours", "Miles") */
  meterType: string;
  /** Meter unit label (e.g., "hrs", "mi") */
  meterUnit?: string;
  /** Callback when a new reading is saved */
  onSave?: (value: number) => void;
  /** Callback with validation result on value change */
  onValidation?: (result: MeterValidationResult) => void;
}

/**
 * Format relative time (e.g., "3d ago", "2h ago")
 */
function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

/**
 * Meter Reading Input component
 *
 * Provides:
 * - Numeric input with validation
 * - Previous reading context
 * - Warning/error messages
 * - Save button
 */
export function MeterReadingInput({
  assetId,
  meterType,
  meterUnit,
  onSave,
  onValidation,
}: MeterReadingInputProps): React.ReactElement {
  const {
    latestReading,
    isLoading,
    isSubmitting,
    validateReading,
    createReading,
    error,
  } = useMeterReadings(assetId);

  const [value, setValue] = useState('');
  const [validation, setValidation] = useState<MeterValidationResult | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Validate on value change
  useEffect(() => {
    if (value.trim() === '') {
      setValidation(null);
      onValidation?.({ isValid: true, warnings: [], errors: [] });
      return;
    }

    const numValue = parseFloat(value.replace(/,/g, ''));
    if (isNaN(numValue)) {
      const result: MeterValidationResult = {
        isValid: false,
        warnings: [],
        errors: [{ type: 'invalid_value', message: 'Please enter a valid number' }],
      };
      setValidation(result);
      onValidation?.(result);
      return;
    }

    const result = validateReading(numValue);
    setValidation(result);
    onValidation?.(result);
  }, [value, validateReading, onValidation]);

  // Handle text change
  const handleChangeText = useCallback((text: string) => {
    // Allow only numbers and commas
    const cleaned = text.replace(/[^0-9,]/g, '');
    setValue(cleaned);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    const numValue = parseFloat(value.replace(/,/g, ''));
    if (isNaN(numValue)) return;

    const result = validateReading(numValue);
    if (!result.isValid) return;

    try {
      await createReading({
        assetId,
        value: numValue,
      });
      setValue('');
      onSave?.(numValue);
    } catch (err) {
      // Error is handled by the hook
    }
  }, [value, assetId, validateReading, createReading, onSave]);

  const numValue = parseFloat(value.replace(/,/g, ''));
  const canSave =
    value.trim() !== '' &&
    !isNaN(numValue) &&
    validation?.isValid &&
    !isSubmitting;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.meterType}>{meterType}</Text>
        {meterUnit && <Text style={styles.meterUnit}>{meterUnit}</Text>}
      </View>

      {/* Input Row */}
      <View style={styles.inputRow}>
        <View
          style={[
            styles.inputContainer,
            isFocused && styles.inputContainerFocused,
            validation && !validation.isValid && styles.inputContainerError,
            validation && validation.warnings.length > 0 && styles.inputContainerWarning,
          ]}
        >
          <RNTextInput
            style={styles.input}
            value={value}
            onChangeText={handleChangeText}
            placeholder={
              isLoading
                ? 'Loading...'
                : latestReading
                  ? `Current: ${latestReading.readingValue.toLocaleString()}`
                  : 'Enter reading'
            }
            placeholderTextColor="#9E9E9E"
            keyboardType="numeric"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            editable={!isLoading && !isSubmitting}
            accessibilityLabel={`Enter ${meterType} reading`}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel="Save meter reading"
          accessibilityState={{ disabled: !canSave }}
        >
          <Text
            style={[
              styles.saveButtonText,
              !canSave && styles.saveButtonTextDisabled,
            ]}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Previous Reading Info */}
      {latestReading && (
        <View style={styles.previousReading}>
          <Text style={styles.previousLabel}>Previous:</Text>
          <Text style={styles.previousValue}>
            {latestReading.readingValue.toLocaleString()}
          </Text>
          <Text style={styles.previousTime}>
            ({formatRelativeTime(latestReading.readingDate)})
          </Text>
        </View>
      )}

      {/* Validation Messages */}
      {validation && validation.errors.length > 0 && (
        <View style={styles.messageContainer}>
          {validation.errors.map((err, index) => (
            <View key={index} style={styles.errorMessage}>
              <Text style={styles.errorIcon}>!</Text>
              <Text style={styles.errorText}>{err.message}</Text>
            </View>
          ))}
        </View>
      )}

      {validation && validation.warnings.length > 0 && validation.isValid && (
        <View style={styles.messageContainer}>
          {validation.warnings.map((warn, index) => (
            <View key={index} style={styles.warningMessage}>
              <Text style={styles.warningIcon}>!</Text>
              <Text style={styles.warningText}>{warn.message}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Hook Error */}
      {error && (
        <View style={styles.errorMessage}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  meterType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  meterUnit: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputContainerFocused: {
    borderColor: '#1976D2',
  },
  inputContainerError: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFEBEE',
  },
  inputContainerWarning: {
    borderColor: '#F57C00',
    backgroundColor: '#FFF3E0',
  },
  input: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: TOUCH_TARGETS.MINIMUM,
  },
  saveButton: {
    backgroundColor: '#1976D2',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
    minHeight: TOUCH_TARGETS.MINIMUM,
  },
  saveButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButtonTextDisabled: {
    color: '#FFFFFF',
  },
  previousReading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  previousLabel: {
    fontSize: 12,
    color: '#666666',
  },
  previousValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 4,
  },
  previousTime: {
    fontSize: 12,
    color: '#9E9E9E',
    marginLeft: 4,
  },
  messageContainer: {
    marginTop: 8,
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  errorIcon: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginRight: 8,
    width: 20,
    height: 20,
    textAlign: 'center',
    lineHeight: 20,
    backgroundColor: '#FFCDD2',
    borderRadius: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#C62828',
    flex: 1,
  },
  warningMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  warningIcon: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F57C00',
    marginRight: 8,
    width: 20,
    height: 20,
    textAlign: 'center',
    lineHeight: 20,
    backgroundColor: '#FFE0B2',
    borderRadius: 10,
  },
  warningText: {
    fontSize: 13,
    color: '#E65100',
    flex: 1,
  },
});

export default MeterReadingInput;
