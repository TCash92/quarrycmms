import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@/screens/LoginScreen';
import { MainNavigator } from './MainNavigator';
import { useAuth } from '@/hooks';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Loading screen shown while auth state is being determined
 */
function LoadingScreen(): React.ReactElement {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#1976D2" />
    </View>
  );
}

/**
 * Root navigator component
 * Shows login screen when unauthenticated, main tab navigator when authenticated
 *
 * Key configuration:
 * - gestureEnabled: false - Disables swipe gestures for glove-friendly operation
 * - animation: 'fade' - Uses fade transition instead of slide
 */
export function RootNavigator(): React.ReactElement {
  const { authState } = useAuth();

  console.log('[RootNavigator] Auth state:', authState.status);

  // Show loading spinner while determining auth state
  if (authState.status === 'loading') {
    console.log('[RootNavigator] Showing LoadingScreen');
    return <LoadingScreen />;
  }

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
        {authState.status === 'unauthenticated' ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              title: 'Login',
            }}
          />
        ) : (
          <Stack.Screen
            name="Main"
            component={MainNavigator}
            options={{
              title: 'QuarryCMMS',
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
});

export default RootNavigator;
