/**
 * Home Stack Navigator
 *
 * Stack navigator for the Home tab, containing HomeScreen and SyncDetailsScreen.
 * This enables navigation from the home screen to sync troubleshooting.
 *
 * @module navigation/HomeStackNavigator
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '@/screens/HomeScreen';
import { SyncDetailsScreen } from '@/screens/SyncDetailsScreen';
import { ComplianceReportScreen } from '@/screens/ComplianceReportScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { DatabaseResetScreen } from '@/screens/DatabaseResetScreen';
import { DeviceMigrationScreen } from '@/screens/DeviceMigrationScreen';
import { HelpScreen } from '@/screens/HelpScreen';
import type { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

/**
 * Stack navigator for Home tab
 *
 * Screens:
 * - HomeMain: Main dashboard with sync status card
 * - SyncDetails: Detailed sync troubleshooting view
 */
export function HomeStackNavigator(): React.ReactElement {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        // Disable swipe gestures per requirements (glove-friendly)
        gestureEnabled: false,
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={({ navigation }) => ({
          title: 'QuarryCMMS',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Text style={styles.headerButtonText}>Settings</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="SyncDetails"
        component={SyncDetailsScreen}
        options={{
          title: 'Sync Status',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="ComplianceReport"
        component={ComplianceReportScreen}
        options={{
          title: 'Compliance Report',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="DatabaseReset"
        component={DatabaseResetScreen}
        options={{
          title: 'Reset Database',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="DeviceMigration"
        component={DeviceMigrationScreen}
        options={{
          title: 'Device Transfer',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="Help"
        component={HelpScreen}
        options={{
          title: 'Help & Support',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#1976D2',
    fontWeight: '500',
  },
});

export default HomeStackNavigator;
