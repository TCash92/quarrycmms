/**
 * Help Screen
 *
 * In-app help and support screen providing quick reference guides,
 * sync status explanations, and troubleshooting links.
 *
 * @module screens/HelpScreen
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HelpSection, HelpCard } from '@/components/help';
import { SettingsRow } from '@/components/settings';
import type { HomeStackParamList } from '@/navigation/types';

// Support email address
const SUPPORT_EMAIL = 'support@example.com';

type HelpNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Help'>;

/**
 * Quick Log workflow steps
 */
const QUICK_LOG_STEPS = [
  { text: 'Tap the Quick Log button on Home screen' },
  { text: 'Select the equipment you worked on' },
  { text: 'Tap what you did (Replaced, Adjusted, etc.)' },
  { text: 'Add voice note (optional) - tap and hold mic' },
  { text: 'Tap Submit - Done!' },
];

/**
 * Work Order workflow steps
 */
const WORK_ORDER_STEPS = [
  { text: 'Tap Work Orders in bottom navigation' },
  { text: 'Find your assigned work order' },
  { text: 'Tap Start to begin the timer' },
  { text: 'Complete the work' },
  { text: 'Tap Complete when finished' },
  { text: 'Add notes and sign to confirm' },
];

/**
 * Sync status explanations
 */
const SYNC_STATUS_INFO = [
  { icon: '', text: 'Green - All synced, you\'re good!' },
  { icon: '', text: 'Yellow - Syncing in progress or pending changes' },
  { icon: '', text: 'Orange - Offline mode, data saved locally' },
  { icon: '', text: 'Red - Error, tap for details and solutions' },
];

/**
 * Help screen component
 */
export function HelpScreen(): React.ReactElement {
  const navigation = useNavigation<HelpNavigationProp>();

  const handleSyncDetails = useCallback(() => {
    navigation.navigate('SyncDetails');
  }, [navigation]);

  const handleDatabaseReset = useCallback(() => {
    navigation.navigate('DatabaseReset');
  }, [navigation]);

  const handleDeviceMigration = useCallback(() => {
    navigation.navigate('DeviceMigration', { mode: 'send' });
  }, [navigation]);

  const handleContactSupport = useCallback(async () => {
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=QuarryCMMS Support Request`;

    try {
      const supported = await Linking.canOpenURL(mailtoUrl);
      if (supported) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(
          'Contact Support',
          `Email us at ${SUPPORT_EMAIL} for assistance.`,
          [{ text: 'OK' }]
        );
      }
    } catch {
      Alert.alert(
        'Contact Support',
        `Email us at ${SUPPORT_EMAIL} for assistance.`,
        [{ text: 'OK' }]
      );
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Quick Reference Section */}
        <HelpSection title="Quick Reference" subtitle="How to use the app">
          <HelpCard
            title="Quick Log"
            steps={QUICK_LOG_STEPS}
            accessibilityLabel="Quick Log workflow steps"
          />
          <HelpCard
            title="Work Orders"
            steps={WORK_ORDER_STEPS}
            accessibilityLabel="Work Order workflow steps"
          />
        </HelpSection>

        {/* Sync Status Section */}
        <HelpSection title="Sync Status" subtitle="What the colors mean">
          <View style={styles.syncStatusContainer}>
            {SYNC_STATUS_INFO.map((item, index) => (
              <View key={index} style={styles.syncStatusRow}>
                <View style={[styles.syncDot, getSyncDotStyle(index)]} />
                <Text style={styles.syncStatusText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </HelpSection>

        {/* Not Syncing Tips Section */}
        <HelpSection title="Not Syncing?" subtitle="Try these steps">
          <HelpCard
            title="Troubleshooting Steps"
            steps={[
              { text: 'Pull down on the screen to refresh' },
              { text: 'Check your WiFi or cellular connection' },
              { text: 'Close and reopen the app completely' },
              { text: 'Tap "View Sync Details" below to see what\'s blocking' },
            ]}
            accessibilityLabel="Sync troubleshooting steps"
          />
        </HelpSection>

        {/* Self-Service Tools Section */}
        <HelpSection title="Self-Service Tools">
          <SettingsRow
            icon=""
            label="View Sync Details"
            value="See what's pending or blocking"
            onPress={handleSyncDetails}
            accessibilityLabel="View sync status details"
          />
          <SettingsRow
            icon=""
            label="Transfer to New Device"
            value="Move your account via QR code"
            onPress={handleDeviceMigration}
            accessibilityLabel="Transfer account to a new device"
          />
          <SettingsRow
            icon=""
            label="Reset Local Database"
            value="Last resort if app is stuck"
            variant="danger"
            onPress={handleDatabaseReset}
            accessibilityLabel="Reset local database"
          />
        </HelpSection>

        {/* Voice Notes Tips */}
        <HelpSection title="Voice Notes Tips">
          <HelpCard
            title="Recording Tips"
            steps={[
              { text: 'Hold phone 6-12 inches from your mouth' },
              { text: 'Speak clearly at a normal pace' },
              { text: 'Describe what you did, not just what you saw' },
              { text: 'Keep recordings under 2 minutes' },
            ]}
            accessibilityLabel="Voice notes recording tips"
          />
        </HelpSection>

        {/* Photo Tips */}
        <HelpSection title="Photo Tips">
          <HelpCard
            title="Taking Good Photos"
            steps={[
              { text: 'Include part numbers in the frame when possible' },
              { text: 'Take before AND after photos' },
              { text: 'Good lighting helps - avoid shadows' },
              { text: 'Photos sync faster on WiFi' },
            ]}
            accessibilityLabel="Photo tips"
          />
        </HelpSection>

        {/* Contact Support Section */}
        <HelpSection title="Need More Help?">
          <View style={styles.contactContainer}>
            <Text style={styles.contactText}>
              Contact your Site Champion first, or reach IT Support:
            </Text>
            <Text
              style={styles.contactEmail}
              onPress={handleContactSupport}
              accessibilityRole="link"
              accessibilityLabel={`Email support at ${SUPPORT_EMAIL}`}
            >
              {SUPPORT_EMAIL}
            </Text>
            <Text style={styles.contactHint}>
              For faster support, export your diagnostic logs from Settings and include them in your email.
            </Text>
          </View>
        </HelpSection>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Get sync dot style based on index (0=green, 1=yellow, 2=orange, 3=red)
 */
function getSyncDotStyle(index: number): object {
  const colors = ['#388E3C', '#FFA000', '#F57C00', '#D32F2F'];
  return { backgroundColor: colors[index] || '#9E9E9E' };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 32,
  },
  syncStatusContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  syncDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
  },
  syncStatusText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 20,
  },
  contactContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  contactText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 8,
  },
  contactEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 12,
  },
  contactHint: {
    fontSize: 13,
    color: '#999999',
    lineHeight: 18,
  },
});

export default HelpScreen;
