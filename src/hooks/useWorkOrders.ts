/**
 * React hook for work order queries and management
 *
 * Provides reactive work order data with search, filtering, and creation
 *
 * @module hooks/useWorkOrders
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@/database';
import WorkOrder, { WorkOrderStatus, WorkOrderPriority } from '@/database/models/WorkOrder';
import { useCurrentUser } from './useAuth';

/**
 * Data required to create a new work order
 */
export interface CreateWorkOrderData {
  assetId: string;
  title: string;
  description?: string;
  priority: WorkOrderPriority;
  assignedTo?: string;
  dueDate?: number;
}

/**
 * Return type for useWorkOrders hook
 */
export interface UseWorkOrdersReturn {
  /** List of work orders matching current filters */
  workOrders: WorkOrder[];
  /** Whether work orders are currently loading */
  isLoading: boolean;
  /** Error message if query failed */
  error: string | null;
  /** Current search query */
  searchQuery: string;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Current status filter */
  statusFilter: WorkOrderStatus | 'all';
  /** Set status filter */
  setStatusFilter: (status: WorkOrderStatus | 'all') => void;
  /** Current priority filter */
  priorityFilter: WorkOrderPriority | 'all';
  /** Set priority filter */
  setPriorityFilter: (priority: WorkOrderPriority | 'all') => void;
  /** Get a single work order by ID */
  getWorkOrderById: (id: string) => Promise<WorkOrder | null>;
  /** Force refresh work orders */
  refreshWorkOrders: () => void;
  /** Create a new work order */
  createWorkOrder: (data: CreateWorkOrderData) => Promise<WorkOrder>;
  /** Counts by status */
  counts: { open: number; inProgress: number; completed: number; total: number };
}

/**
 * Generate a unique work order number
 */
function generateWoNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `WO-${year}${month}${day}-${random}`;
}

/**
 * Priority order for sorting (higher = more urgent)
 */
const PRIORITY_ORDER: Record<WorkOrderPriority, number> = {
  emergency: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Hook for querying and managing work orders from WatermelonDB
 */
export function useWorkOrders(): UseWorkOrdersReturn {
  const database = useDatabase();
  const user = useCurrentUser();

  const [allWorkOrders, setAllWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<WorkOrderPriority | 'all'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Subscribe to work orders for current site
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const workOrdersCollection = database.get<WorkOrder>('work_orders');

    // Query work orders for current site
    const query = workOrdersCollection.query(Q.where('site_id', user.siteId));

    // Subscribe to reactive updates
    const subscription = query.observe().subscribe({
      next: workOrders => {
        // Sort by priority (emergency first) then due date
        const sorted = [...workOrders].sort((a, b) => {
          // First by priority (descending)
          const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
          if (priorityDiff !== 0) return priorityDiff;

          // Then by due date (ascending, nulls last)
          if (a.dueDate === null && b.dueDate === null) return 0;
          if (a.dueDate === null) return 1;
          if (b.dueDate === null) return -1;
          return a.dueDate - b.dueDate;
        });
        setAllWorkOrders(sorted);
        setIsLoading(false);
      },
      error: err => {
        console.error('[useWorkOrders] Query error:', err);
        setError(err.message || 'Failed to load work orders');
        setIsLoading(false);
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [database, user.siteId, refreshKey]);

  // Calculate counts
  const counts = useMemo(() => {
    const open = allWorkOrders.filter(wo => wo.status === 'open').length;
    const inProgress = allWorkOrders.filter(wo => wo.status === 'in_progress').length;
    const completed = allWorkOrders.filter(wo => wo.status === 'completed').length;
    return { open, inProgress, completed, total: allWorkOrders.length };
  }, [allWorkOrders]);

  // Filter work orders client-side based on search and filters
  const workOrders = useMemo(() => {
    let filtered = allWorkOrders;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(wo => wo.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(wo => wo.priority === priorityFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        wo =>
          wo.woNumber.toLowerCase().includes(query) ||
          wo.title.toLowerCase().includes(query) ||
          (wo.description?.toLowerCase().includes(query) ?? false)
      );
    }

    return filtered;
  }, [allWorkOrders, statusFilter, priorityFilter, searchQuery]);

  // Get work order by ID
  const getWorkOrderById = useCallback(
    async (id: string): Promise<WorkOrder | null> => {
      try {
        const workOrder = await database.get<WorkOrder>('work_orders').find(id);
        return workOrder;
      } catch (err) {
        console.error('[useWorkOrders] Failed to find work order:', id, err);
        return null;
      }
    },
    [database]
  );

  // Create new work order
  const createWorkOrder = useCallback(
    async (data: CreateWorkOrderData): Promise<WorkOrder> => {
      const workOrder = await database.write(async () => {
        return await database.get<WorkOrder>('work_orders').create(wo => {
          wo.woNumber = generateWoNumber();
          wo.siteId = user.siteId;
          wo.assetId = data.assetId;
          wo.title = data.title;
          wo.description = data.description ?? null;
          wo.priority = data.priority;
          wo.status = 'open';
          wo.assignedTo = data.assignedTo ?? null;
          wo.createdBy = user.id;
          wo.dueDate = data.dueDate ?? null;
          wo.needsEnrichment = false;
          wo.isQuickLog = false;
          wo.localSyncStatus = 'pending';
          wo.localUpdatedAt = Date.now();
        });
      });
      return workOrder;
    },
    [database, user.siteId, user.id]
  );

  // Force refresh
  const refreshWorkOrders = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return {
    workOrders,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    getWorkOrderById,
    refreshWorkOrders,
    createWorkOrder,
    counts,
  };
}

export default useWorkOrders;
