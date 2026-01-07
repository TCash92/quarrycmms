/**
 * Settings Section Component
 *
 * A reusable section container for grouping related settings rows.
 * Provides consistent styling with title and optional content.
 *
 * @module components/settings/SettingsSection
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SettingsSectionProps {
  /** Section title displayed above the content */
  title: string;
  /** Child components (typically SettingsRow components) */
  children: ReactNode;
}

/**
 * Settings section container with title
 */
export function SettingsSection({ title, children }: SettingsSectionProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
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

export default SettingsSection;
