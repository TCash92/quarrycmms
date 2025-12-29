import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlaceholderScreen } from '@/screens/PlaceholderScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root navigator component
 * Currently shows only the placeholder screen
 * Will be expanded with auth flow and main tabs in later PRs
 *
 * Key configuration:
 * - gestureEnabled: false - Disables swipe gestures for glove-friendly operation
 * - animation: 'fade' - Uses fade transition instead of slide
 */
export function RootNavigator(): React.ReactElement {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          // Disable swipe gestures per requirements (glove-friendly)
          // Per CMMS_MVP_Design_Guide_v6.md Section 2.9.2
          gestureEnabled: false,
          // Use fade instead of slide (no swipe implied)
          animation: 'fade',
        }}
      >
        <Stack.Screen
          name="Main"
          component={PlaceholderScreen}
          options={{
            title: 'QuarryCMMS',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default RootNavigator;
