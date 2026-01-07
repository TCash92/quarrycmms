import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeStackNavigator } from './HomeStackNavigator';
import { AssetsStackNavigator } from './AssetsStackNavigator';
import { WorkOrdersStackNavigator } from './WorkOrdersStackNavigator';
import { QuickLogScreen } from '@/screens/QuickLogScreen';
import { TOUCH_TARGETS } from '@/constants';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Placeholder screen for tabs not yet implemented
 */
function PlaceholderTab({ name }: { name: string }): React.ReactElement {
  return (
    <View style={placeholderStyles.container}>
      <Text style={placeholderStyles.title}>{name}</Text>
      <Text style={placeholderStyles.subtitle}>Coming in future PR</Text>
    </View>
  );
}


/**
 * Main tab navigator for authenticated users
 *
 * Configuration notes:
 * - All tabs use 48dp+ touch targets for glove-friendly operation
 * - No swipe gestures between tabs (per CMMS_MVP_Design_Guide_v6.md)
 * - Uses text labels for clarity in field conditions
 */
export function MainNavigator(): React.ReactElement {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#1976D2',
        tabBarInactiveTintColor: '#666666',
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          title: 'Home',
          headerShown: false, // HomeStackNavigator has its own header
          tabBarLabel: 'Home',
          tabBarAccessibilityLabel: 'Home tab',
        }}
      />
      <Tab.Screen
        name="Assets"
        component={AssetsStackNavigator}
        options={{
          headerShown: false,
          tabBarLabel: 'Assets',
          tabBarAccessibilityLabel: 'Assets tab',
        }}
      />
      <Tab.Screen
        name="WorkOrders"
        component={WorkOrdersStackNavigator}
        options={{
          headerShown: false,
          tabBarLabel: 'Work',
          tabBarAccessibilityLabel: 'Work Orders tab',
        }}
      />
      <Tab.Screen
        name="QuickLog"
        component={QuickLogScreen}
        options={{
          title: 'Quick Log',
          tabBarLabel: 'Quick Log',
          tabBarAccessibilityLabel: 'Quick Log tab',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  tabBar: {
    height: TOUCH_TARGETS.MINIMUM + 20, // 68dp for comfortable glove tapping
    paddingBottom: 8,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});

const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
});

export default MainNavigator;
