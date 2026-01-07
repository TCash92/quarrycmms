/**
 * Assets Stack Navigator
 *
 * Stack navigator for the Assets tab, containing AssetListScreen and AssetDetailScreen.
 * Enables navigation from asset list to individual asset details.
 *
 * @module navigation/AssetsStackNavigator
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AssetListScreen } from '@/screens/AssetListScreen';
import { AssetDetailScreen } from '@/screens/AssetDetailScreen';
import type { AssetsStackParamList } from './types';

const Stack = createNativeStackNavigator<AssetsStackParamList>();

/**
 * Stack navigator for Assets tab
 *
 * Screens:
 * - AssetList: Main list with search and filtering
 * - AssetDetail: Individual asset details with meter readings
 */
export function AssetsStackNavigator(): React.ReactElement {
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
        name="AssetList"
        component={AssetListScreen}
        options={{
          title: 'Assets',
        }}
      />
      <Stack.Screen
        name="AssetDetail"
        component={AssetDetailScreen}
        options={{
          title: 'Asset Details',
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
});

export default AssetsStackNavigator;
