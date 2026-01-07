/**
 * Help Section Component
 *
 * A reusable section container for grouping help content.
 * Similar to SettingsSection but optimized for help/documentation display.
 *
 * @module components/help/HelpSection
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface HelpSectionProps {
  /** Section title displayed above the content */
  title: string;
  /** Child components (typically HelpCard components) */
  children: ReactNode;
  /** Optional subtitle or description */
  subtitle?: string;
}

/**
 * Help section container with title and optional subtitle
 */
export function HelpSection({ title, children, subtitle }: HelpSectionProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 13,
    color: '#999999',
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
});

export default HelpSection;
