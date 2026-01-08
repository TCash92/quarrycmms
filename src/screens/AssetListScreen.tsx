/**
 * Asset List Screen
 *
 * Main asset list with search and filtering capabilities.
 * Displays assets for the current site with status indicators.
 *
 * @module screens/AssetListScreen
 */

import React, { useCallback } from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAssets } from '@/hooks';
import { SearchBar, FilterChips, AssetCard } from '@/components/ui';
import type { FilterChip } from '@/components/ui';
import { ASSET_STATUS } from '@/constants';
import type Asset from '@/database/models/Asset';
import type { AssetsStackParamList } from '@/navigation/types';

type AssetListNavigationProp = NativeStackNavigationProp<AssetsStackParamList, 'AssetList'>;

// Status filter chips
const STATUS_CHIPS: FilterChip[] = [
  { key: 'all', label: 'All' },
  { key: 'operational', label: 'Operational', color: ASSET_STATUS.operational.color },
  { key: 'limited', label: 'Limited', color: ASSET_STATUS.limited.color },
  { key: 'down', label: 'Down', color: ASSET_STATUS.down.color },
];

/**
 * Empty state component when no assets match filters
 */
function EmptyState({ hasFilters }: { hasFilters: boolean }): React.ReactElement {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔧</Text>
      <Text style={styles.emptyTitle}>{hasFilters ? 'No Assets Found' : 'No Assets'}</Text>
      <Text style={styles.emptySubtitle}>
        {hasFilters
          ? 'Try adjusting your search or filters'
          : 'Assets will appear here once synced'}
      </Text>
    </View>
  );
}

/**
 * Asset list screen with search and filtering
 */
export function AssetListScreen(): React.ReactElement {
  const navigation = useNavigation<AssetListNavigationProp>();
  const {
    assets,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    refreshAssets,
    totalCount,
  } = useAssets();

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const hasFilters = searchQuery.trim() !== '' || statusFilter !== 'all';

  const handleAssetPress = useCallback(
    (asset: Asset) => {
      navigation.navigate('AssetDetail', { assetId: asset.id });
    },
    [navigation]
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    refreshAssets();
    // Give time for the subscription to update
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refreshAssets]);

  const handleStatusFilter = useCallback(
    (key: string) => {
      setStatusFilter(key as typeof statusFilter);
    },
    [setStatusFilter]
  );

  const renderItem = useCallback(
    ({ item }: { item: Asset }) => (
      <AssetCard asset={item} onPress={() => handleAssetPress(item)} />
    ),
    [handleAssetPress]
  );

  const keyExtractor = useCallback((item: Asset) => item.id, []);

  // Show loading state
  if (isLoading && assets.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading assets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error && assets.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Failed to Load Assets</Text>
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
          placeholder="Search assets..."
        />
      </View>

      {/* Status Filter Chips */}
      <FilterChips chips={STATUS_CHIPS} selected={statusFilter} onSelect={handleStatusFilter} />

      {/* Results count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {assets.length} of {totalCount} asset{totalCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Asset List */}
      <FlatList
        data={assets}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState hasFilters={hasFilters} />}
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
  resultsHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsCount: {
    fontSize: 12,
    color: '#666666',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
});

export default AssetListScreen;
