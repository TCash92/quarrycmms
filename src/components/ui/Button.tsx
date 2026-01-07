import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { TOUCH_TARGETS } from '@/constants';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const COLORS = {
  primary: {
    background: '#1976D2',
    backgroundPressed: '#1565C0',
    text: '#FFFFFF',
    disabledBackground: '#BDBDBD',
    disabledText: '#757575',
  },
  secondary: {
    background: 'transparent',
    backgroundPressed: 'rgba(25, 118, 210, 0.1)',
    text: '#1976D2',
    border: '#1976D2',
    disabledBackground: 'transparent',
    disabledText: '#BDBDBD',
    disabledBorder: '#BDBDBD',
  },
  danger: {
    background: '#D32F2F',
    backgroundPressed: '#C62828',
    text: '#FFFFFF',
    disabledBackground: '#BDBDBD',
    disabledText: '#757575',
  },
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  onPress,
  ...props
}: ButtonProps): React.ReactElement {
  const isDisabled = disabled || loading;
  const colorScheme = COLORS[variant];

  const buttonStyles: ViewStyle[] = [styles.button];
  const textStyles: TextStyle[] = [styles.text];

  // Apply variant styles
  if (variant === 'secondary') {
    const secondaryColors = COLORS.secondary;
    buttonStyles.push(styles.secondaryButton);
    buttonStyles.push({
      borderColor: isDisabled ? secondaryColors.disabledBorder : secondaryColors.border,
    });
  } else {
    buttonStyles.push({
      backgroundColor: isDisabled ? colorScheme.disabledBackground : colorScheme.background,
    });
  }

  // Apply text color
  textStyles.push({
    color: isDisabled ? colorScheme.disabledText : colorScheme.text,
  });

  // Apply custom styles
  if (style) {
    buttonStyles.push(style);
  }
  if (textStyle) {
    textStyles.push(textStyle);
  }

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      accessibilityLabel={title}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={isDisabled ? colorScheme.disabledText : colorScheme.text}
          size="small"
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: TOUCH_TARGETS.MINIMUM,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
