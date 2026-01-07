/**
 * Work Orders Stack Navigator
 *
 * Stack navigator for the Work Orders tab, containing list, create, and detail screens.
 * Enables navigation from work order list to create and detail views.
 *
 * @module navigation/WorkOrdersStackNavigator
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WorkOrderListScreen } from '@/screens/WorkOrderListScreen';
import { CreateWorkOrderScreen } from '@/screens/CreateWorkOrderScreen';
import { WorkOrderDetailScreen } from '@/screens/WorkOrderDetailScreen';
import type { WorkOrdersStackParamList } from './types';

const Stack = createNativeStackNavigator<WorkOrdersStackParamList>();

/**
 * Stack navigator for Work Orders tab
 *
 * Screens:
 * - WorkOrderList: Main list with status tabs and search
 * - CreateWorkOrder: Form to create new work order
 * - WorkOrderDetail: Individual work order details (future PR)
 */
export function WorkOrdersStackNavigator(): React.ReactElement {
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
        name="WorkOrderList"
        component={WorkOrderListScreen}
        options={{
          title: 'Work Orders',
        }}
      />
      <Stack.Screen
        name="CreateWorkOrder"
        component={CreateWorkOrderScreen}
        options={{
          title: 'Create Work Order',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="WorkOrderDetail"
        component={WorkOrderDetailScreen}
        options={{
          title: 'Work Order',
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

export default WorkOrdersStackNavigator;
