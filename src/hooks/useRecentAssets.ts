/**
 * React hook for fetching recently worked assets
 *
 * Returns assets the current user has recently interacted with
 * based on their work order history.
 *
 * @module hooks/useRecentAssets
 */

import { useState, useEffect, useCallback } from 'react';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@/database';
import Asset from '@/database/models/Asset';
import WorkOrder from '@/database/models/WorkOrder';
import { useCurrentUser } from './useAuth';

/**
 * Return type for useRecentAssets hook
 */
export interface UseRecentAssetsReturn {
  /** Assets recently worked on by current user */
  recentAssets: Asset[];
  /** Whether assets are loading */
  isLoading: boolean;
  /** Refresh the recent assets list */
  refresh: () => void;
}

/** Maximum number of work orders to query for recent assets */
const MAX_WORK_ORDERS = 20;

/** Maximum number of recent assets to return */
const MAX_RECENT_ASSETS = 5;

/**
 * Hook for fetching recently worked assets from WatermelonDB
 *
 * Queries the user's recent work orders and returns unique assets
 * they have created or been assigned to.
 */
export function useRecentAssets(): UseRecentAssetsReturn {
  const database = useDatabase();
  const user = useCurrentUser();

  const [recentAssets, setRecentAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchRecentAssets = async () => {
      setIsLoading(true);

      try {
        const workOrdersCollection = database.get<WorkOrder>('work_orders');
        const assetsCollection = database.get<Asset>('assets');

        // Get recent work orders for this user (created by or assigned to)
        const recentWorkOrders = await workOrdersCollection
          .query(
            Q.where('site_id', user.siteId),
            Q.or(Q.where('created_by', user.id), Q.where('assigned_to', user.id)),
            Q.sortBy('local_updated_at', Q.desc),
            Q.take(MAX_WORK_ORDERS)
          )
          .fetch();

        // Extract unique asset IDs, preserving order (most recent first)
        const seenAssetIds = new Set<string>();
        const uniqueAssetIds: string[] = [];

        for (const wo of recentWorkOrders) {
          if (!seenAssetIds.has(wo.assetId)) {
            seenAssetIds.add(wo.assetId);
            uniqueAssetIds.push(wo.assetId);
          }
          if (uniqueAssetIds.length >= MAX_RECENT_ASSETS) break;
        }

        // Fetch the assets
        const assets: Asset[] = [];
        for (const assetId of uniqueAssetIds) {
          try {
            const asset = await assetsCollection.find(assetId);
            assets.push(asset);
          } catch {
            // Asset may have been deleted, skip it
            console.warn('[useRecentAssets] Asset not found:', assetId);
          }
        }

        if (isMounted) {
          setRecentAssets(assets);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[useRecentAssets] Failed to fetch recent assets:', err);
        if (isMounted) {
          setRecentAssets([]);
          setIsLoading(false);
        }
      }
    };

    fetchRecentAssets();

    return () => {
      isMounted = false;
    };
  }, [database, user.siteId, user.id, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return {
    recentAssets,
    isLoading,
    refresh,
  };
}

export default useRecentAssets;
