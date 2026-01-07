import React, { useState } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps as RNTextInputProps,
} from 'react-native';
import { TOUCH_TARGETS } from '@/constants';

interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
}

const COLORS = {
  border: '#E0E0E0',
  borderFocused: '#1976D2',
  borderError: '#D32F2F',
  label: '#424242',
  error: '#D32F2F',
  placeholder: '#9E9E9E',
  text: '#212121',
  background: '#FFFFFF',
};

export function TextInput({
  label,
  error,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  onFocus,
  onBlur,
  ...props
}: TextInputProps): React.ReactElement {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: Parameters<NonNullable<RNTextInputProps['onFocus']>>[0]): void => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: Parameters<NonNullable<RNTextInputProps['onBlur']>>[0]): void => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const getBorderColor = (): string => {
    if (error) return COLORS.borderError;
    if (isFocused) return COLORS.borderFocused;
    return COLORS.border;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
      <RNTextInput
        style={[
          styles.input,
          { borderColor: getBorderColor() },
          isFocused && styles.inputFocused,
          inputStyle,
        ]}
        placeholderTextColor={COLORS.placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
        accessibilityLabel={label}
        {...props}
      />
      {error && <Text style={[styles.error, errorStyle]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.label,
    marginBottom: 6,
  },
  input: {
    minHeight: TOUCH_TARGETS.MINIMUM,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderRadius: 8,
  },
  inputFocused: {
    borderWidth: 2,
  },
  error: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
});
