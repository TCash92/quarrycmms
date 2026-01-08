/**
 * Work Order List Screen
 *
 * Main work order list with status tabs, search, and priority indicators.
 * Displays work orders for the current site sorted by priority.
 *
 * @module screens/WorkOrderListScreen
 */

import React, { useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useWorkOrders } from '@/hooks';
import { SearchBar, FilterChips, WorkOrderCard } from '@/components/ui';
import type { FilterChip } from '@/components/ui';
import { TOUCH_TARGETS } from '@/constants';
import type WorkOrder from '@/database/models/WorkOrder';
import type { WorkOrdersStackParamList } from '@/navigation/types';

type WorkOrderListNavigationProp = NativeStackNavigationProp<
  WorkOrdersStackParamList,
  'WorkOrderList'
>;

/**
 * Empty state component when no work orders match filters
 */
function EmptyState({ hasFilters }: { hasFilters: boolean }): React.ReactElement {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>
        {hasFilters ? 'No Work Orders Found' : 'No Work Orders'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {hasFilters ? 'Try adjusting your search or filters' : 'Create a work order to get started'}
      </Text>
    </View>
  );
}

/**
 * Work order list screen with status tabs and search
 */
export function WorkOrderListScreen(): React.ReactElement {
  const navigation = useNavigation<WorkOrderListNavigationProp>();
  const {
    workOrders,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    refreshWorkOrders,
    counts,
  } = useWorkOrders();

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const hasFilters = searchQuery.trim() !== '' || statusFilter !== 'all';

  // Status filter chips with counts
  const statusChips: FilterChip[] = [
    { key: 'all', label: `All (${counts.total})` },
    { key: 'open', label: `Open (${counts.open})` },
    { key: 'in_progress', label: `In Progress (${counts.inProgress})` },
    { key: 'completed', label: `Done (${counts.completed})` },
  ];

  const handleWorkOrderPress = useCallback(
    (workOrder: WorkOrder) => {
      navigation.navigate('WorkOrderDetail', { workOrderId: workOrder.id });
    },
    [navigation]
  );

  const handleCreatePress = useCallback(() => {
    navigation.navigate('CreateWorkOrder', {});
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    refreshWorkOrders();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refreshWorkOrders]);

  const handleStatusFilter = useCallback(
    (key: string) => {
      setStatusFilter(key as typeof statusFilter);
    },
    [setStatusFilter]
  );

  const renderItem = useCallback(
    ({ item }: { item: WorkOrder }) => (
      <WorkOrderCard
        workOrder={item}
        onPress={() => handleWorkOrderPress(item)}
        testID="work-order-card"
      />
    ),
    [handleWorkOrderPress]
  );

  const keyExtractor = useCallback((item: WorkOrder) => item.id, []);

  // Show loading state
  if (isLoading && workOrders.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading work orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error && workOrders.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Failed to Load Work Orders</Text>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search work orders..."
          testID="work-order-search"
        />
      </View>

      {/* Status Filter Chips */}
      <FilterChips
        chips={statusChips}
        selected={statusFilter}
        onSelect={handleStatusFilter}
        testID="work-order-filter"
      />

      {/* Work Order List */}
      <FlatList
        data={workOrders}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState hasFilters={hasFilters} />}
        testID="work-order-list"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#1976D2']}
            tintColor="#1976D2"
          />
        }
        showsVerticalScrollIndicator={false}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
      />

      {/* Create Work Order Button */}
      <View style={styles.createButtonContainer}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreatePress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Create new work order"
          testID="work-order-create-button"
        >
          <Text style={styles.createButtonText}>+ Create Work Order</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Space for create button
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  createButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  createButton: {
    backgroundColor: '#1976D2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: TOUCH_TARGETS.COLD_WEATHER,
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WorkOrderListScreen;
