import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TOUCH_TARGETS } from '@/constants';

/**
 * Placeholder screen shown during initial app development
 * Will be replaced with actual home screen in later PRs
 */
export function PlaceholderScreen(): React.ReactElement {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <Text style={styles.title}>QuarryCMMS</Text>
        <Text style={styles.subtitle}>Mobile Maintenance Management</Text>
        <View style={styles.divider} />
        <Text style={styles.status}>Project Skeleton Ready</Text>
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Touch target (normal):</Text>
          <Text style={styles.infoValue}>{TOUCH_TARGETS.MINIMUM}dp</Text>
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Touch target (cold weather):</Text>
          <Text style={styles.infoValue}>{TOUCH_TARGETS.COLD_WEATHER}dp</Text>
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Button spacing:</Text>
          <Text style={styles.infoValue}>{TOUCH_TARGETS.BUTTON_SPACING}dp</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>PR #1 Complete - Skeleton Ready</Text>
        <Text style={styles.footerSubtext}>Next: PR #2 - Supabase Client</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 24,
  },
  divider: {
    width: 60,
    height: 4,
    backgroundColor: '#2196F3',
    borderRadius: 2,
    marginBottom: 24,
  },
  status: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 24,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 280,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
  },
});

export default PlaceholderScreen;
