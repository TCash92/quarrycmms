/**
 * Help Card Component
 *
 * A card component for displaying help content with numbered steps
 * or general information. Supports different display styles.
 *
 * @module components/help/HelpCard
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TOUCH_TARGETS } from '@/constants';

interface HelpStep {
  /** Step number (optional, for numbered lists) */
  number?: number;
  /** Step text content */
  text: string;
}

interface HelpCardProps {
  /** Card title */
  title: string;
  /** Steps or content items */
  steps?: HelpStep[];
  /** Simple text content (alternative to steps) */
  content?: string;
  /** Press handler for interactive cards */
  onPress?: () => void;
  /** Icon or indicator (emoji or text) */
  icon?: string;
  /** Accessibility label */
  accessibilityLabel?: string;
}

/**
 * Help card with optional numbered steps
 */
export function HelpCard({
  title,
  steps,
  content,
  onPress,
  icon,
  accessibilityLabel,
}: HelpCardProps): React.ReactElement {
  const cardContent = (
    <View style={styles.container}>
      <View style={styles.header}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={styles.title}>{title}</Text>
        {onPress && <Text style={styles.chevron}>{'>'}</Text>}
      </View>

      {content && <Text style={styles.content}>{content}</Text>}

      {steps && steps.length > 0 && (
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepNumberContainer}>
                <Text style={styles.stepNumber}>{step.number ?? index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.touchable}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return <View style={styles.touchable}>{cardContent}</View>;
}

const styles = StyleSheet.create({
  touchable: {
    minHeight: TOUCH_TARGETS.MINIMUM,
  },
  container: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  chevron: {
    fontSize: 18,
    color: '#BDBDBD',
    marginLeft: 8,
  },
  content: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginTop: 8,
  },
  stepsContainer: {
    marginTop: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stepNumberContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    paddingTop: 2,
  },
});

export default HelpCard;
