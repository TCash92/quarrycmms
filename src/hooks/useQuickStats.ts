/**
 * React hook for dashboard quick stats
 *
 * Provides reactive counts for work orders and assets displayed on the home screen.
 *
 * @module hooks/useQuickStats
 */

import { useState, useEffect, useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@/database';
import WorkOrder from '@/database/models/WorkOrder';
import Asset from '@/database/models/Asset';
import { useCurrentUser } from './useAuth';

/**
 * Quick stats displayed on the dashboard
 */
export interface QuickStats {
  /** Total open work orders (not completed) */
  openWorkOrders: number;
  /** Work orders assigned to current user (not completed) */
  myAssigned: number;
  /** Total assets at site */
  totalAssets: number;
  /** Work orders due today (not completed) */
  dueToday: number;
  /** Whether stats are currently loading */
  isLoading: boolean;
}

/**
 * Return type for useQuickStats hook
 */
export interface UseQuickStatsReturn extends QuickStats {
  /** Force refresh stats */
  refreshStats: () => void;
}

/**
 * Get start of day timestamp (midnight local time)
 */
function getStartOfDay(date: Date = new Date()): number {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

/**
 * Get end of day timestamp (23:59:59.999 local time)
 */
function getEndOfDay(date: Date = new Date()): number {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

/**
 * Hook for querying dashboard quick stats from WatermelonDB
 *
 * Stats include:
 * - Open work orders: All WOs not completed
 * - My assigned: WOs assigned to current user, not completed
 * - Total assets: All assets at the site
 * - Due today: WOs with due date of today, not completed
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { openWorkOrders, myAssigned, totalAssets, dueToday, isLoading } = useQuickStats();
 *
 *   if (isLoading) return <ActivityIndicator />;
 *
 *   return (
 *     <View>
 *       <StatCard title="Open WOs" value={openWorkOrders} />
 *       <StatCard title="My Assigned" value={myAssigned} />
 *       <StatCard title="Assets" value={totalAssets} />
 *       <StatCard title="Due Today" value={dueToday} />
 *     </View>
 *   );
 * }
 * ```
 */
export function useQuickStats(): UseQuickStatsReturn {
  const database = useDatabase();
  const user = useCurrentUser();

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [assetCount, setAssetCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Subscribe to work orders for current site
  useEffect(() => {
    setIsLoading(true);

    const workOrdersCollection = database.get<WorkOrder>('work_orders');
    const assetsCollection = database.get<Asset>('assets');

    // Query all non-completed work orders for current site
    const woQuery = workOrdersCollection.query(
      Q.where('site_id', user.siteId),
      Q.where('status', Q.notEq('completed'))
    );

    // Query all assets for current site
    const assetQuery = assetsCollection.query(Q.where('site_id', user.siteId));

    // Subscribe to work orders
    const woSubscription = woQuery.observe().subscribe({
      next: (wos) => {
        setWorkOrders(wos);
        setIsLoading(false);
      },
      error: (err) => {
        console.error('[useQuickStats] Work order query error:', err);
        setIsLoading(false);
      },
    });

    // Subscribe to asset count
    const assetSubscription = assetQuery.observeCount().subscribe({
      next: (count) => {
        setAssetCount(count);
      },
      error: (err) => {
        console.error('[useQuickStats] Asset count error:', err);
      },
    });

    return () => {
      woSubscription.unsubscribe();
      assetSubscription.unsubscribe();
    };
  }, [database, user.siteId, refreshKey]);

  // Calculate stats from work orders
  const stats = useMemo(() => {
    const todayStart = getStartOfDay();
    const todayEnd = getEndOfDay();

    // Open work orders = all non-completed (already filtered in query)
    const openWorkOrders = workOrders.length;

    // My assigned = assigned to current user
    const myAssigned = workOrders.filter((wo) => wo.assignedTo === user.id).length;

    // Due today = due date falls within today
    const dueToday = workOrders.filter((wo) => {
      if (!wo.dueDate) return false;
      return wo.dueDate >= todayStart && wo.dueDate <= todayEnd;
    }).length;

    return {
      openWorkOrders,
      myAssigned,
      totalAssets: assetCount,
      dueToday,
    };
  }, [workOrders, assetCount, user.id]);

  // Force refresh
  const refreshStats = () => {
    setRefreshKey((k) => k + 1);
  };

  return {
    ...stats,
    isLoading,
    refreshStats,
  };
}

export default useQuickStats;
