/**
 * React hook for asset queries and management
 *
 * Provides reactive asset data with search and filtering capabilities
 *
 * @module hooks/useAssets
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@/database';
import Asset, { AssetStatus } from '@/database/models/Asset';
import { useCurrentUser } from './useAuth';

/**
 * Return type for useAssets hook
 */
export interface UseAssetsReturn {
  /** List of assets matching current filters */
  assets: Asset[];
  /** Whether assets are currently loading */
  isLoading: boolean;
  /** Error message if query failed */
  error: string | null;
  /** Current search query */
  searchQuery: string;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Current status filter */
  statusFilter: AssetStatus | 'all';
  /** Set status filter */
  setStatusFilter: (status: AssetStatus | 'all') => void;
  /** Current category filter */
  categoryFilter: string | 'all';
  /** Set category filter */
  setCategoryFilter: (category: string | 'all') => void;
  /** Get a single asset by ID */
  getAssetById: (id: string) => Promise<Asset | null>;
  /** Force refresh assets */
  refreshAssets: () => void;
  /** Distinct categories from current assets */
  categories: string[];
  /** Total count of all assets (unfiltered) */
  totalCount: number;
}

/**
 * Hook for querying and filtering assets from WatermelonDB
 *
 * @example
 * ```tsx
 * function AssetList() {
 *   const {
 *     assets,
 *     isLoading,
 *     searchQuery,
 *     setSearchQuery,
 *     statusFilter,
 *     setStatusFilter,
 *   } = useAssets();
 *
 *   return (
 *     <FlatList
 *       data={assets}
 *       renderItem={({ item }) => <AssetCard asset={item} />}
 *       ListEmptyComponent={<Text>No assets found</Text>}
 *     />
 *   );
 * }
 * ```
 */
export function useAssets(): UseAssetsReturn {
  const database = useDatabase();
  const user = useCurrentUser();

  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Subscribe to assets for current site
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const assetsCollection = database.get<Asset>('assets');

    // Build query for current site
    const query = assetsCollection.query(
      Q.where('site_id', user.siteId),
      Q.sortBy('asset_number', Q.asc)
    );

    // Subscribe to reactive updates
    const subscription = query.observe().subscribe({
      next: assets => {
        setAllAssets(assets);
        setIsLoading(false);
      },
      error: err => {
        console.error('[useAssets] Query error:', err);
        setError(err.message || 'Failed to load assets');
        setIsLoading(false);
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [database, user.siteId, refreshKey]);

  // Filter assets client-side based on search and filters
  const assets = useMemo(() => {
    let filtered = allAssets;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(asset => asset.status === statusFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(asset => asset.category === categoryFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        asset =>
          asset.assetNumber.toLowerCase().includes(query) ||
          asset.name.toLowerCase().includes(query) ||
          (asset.description?.toLowerCase().includes(query) ?? false)
      );
    }

    return filtered;
  }, [allAssets, statusFilter, categoryFilter, searchQuery]);

  // Extract distinct categories
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(allAssets.map(a => a.category))];
    return uniqueCategories.sort();
  }, [allAssets]);

  // Get asset by ID
  const getAssetById = useCallback(
    async (id: string): Promise<Asset | null> => {
      try {
        const asset = await database.get<Asset>('assets').find(id);
        return asset;
      } catch (err) {
        console.error('[useAssets] Failed to find asset:', id, err);
        return null;
      }
    },
    [database]
  );

  // Force refresh
  const refreshAssets = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return {
    assets,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    getAssetById,
    refreshAssets,
    categories,
    totalCount: allAssets.length,
  };
}

export default useAssets;
