/**
 * React hook for Quick Log creation and management
 *
 * Provides functionality to create Quick Log work orders and
 * track unenriched logs that need additional detail.
 *
 * @module hooks/useQuickLog
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@/database';
import WorkOrder from '@/database/models/WorkOrder';
import Asset from '@/database/models/Asset';
import { useCurrentUser } from './useAuth';
import { QUICK_LOG_ACTIONS, QuickLogActionType } from '@/constants';

/**
 * Data required to create a Quick Log
 */
export interface CreateQuickLogData {
  /** Asset ID to log against */
  assetId: string;
  /** Type of action performed */
  actionType: QuickLogActionType;
  /** Optional quick notes (max 100 chars) */
  notes?: string | undefined;
}

/**
 * Return type for useQuickLog hook
 */
export interface UseQuickLogReturn {
  /** Create a Quick Log work order */
  createQuickLog: (data: CreateQuickLogData) => Promise<WorkOrder>;
  /** Quick Logs that need enrichment */
  unenrichedLogs: WorkOrder[];
  /** Count of logs needing enrichment */
  unenrichedCount: number;
  /** Whether currently submitting a Quick Log */
  isSubmitting: boolean;
  /** Mark a Quick Log as enriched */
  markEnriched: (workOrderId: string) => Promise<void>;
}

/**
 * Generate a unique work order number
 */
function generateWoNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `WO-${year}${month}${day}-${random}`;
}

/**
 * Hook for Quick Log creation and management
 *
 * Creates work orders with is_quick_log=true and needs_enrichment=true.
 * Tracks unenriched logs for reminder functionality.
 */
export function useQuickLog(): UseQuickLogReturn {
  const database = useDatabase();
  const user = useCurrentUser();

  const [unenrichedLogs, setUnenrichedLogs] = useState<WorkOrder[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subscribe to unenriched Quick Logs
  useEffect(() => {
    const workOrdersCollection = database.get<WorkOrder>('work_orders');

    const query = workOrdersCollection.query(
      Q.where('site_id', user.siteId),
      Q.where('is_quick_log', true),
      Q.where('needs_enrichment', true),
      Q.or(
        Q.where('created_by', user.id),
        Q.where('assigned_to', user.id)
      ),
      Q.sortBy('local_updated_at', Q.desc)
    );

    const subscription = query.observe().subscribe({
      next: (workOrders) => {
        setUnenrichedLogs(workOrders);
      },
      error: (err) => {
        console.error('[useQuickLog] Query error:', err);
        setUnenrichedLogs([]);
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [database, user.siteId, user.id]);

  // Count of unenriched logs
  const unenrichedCount = useMemo(() => unenrichedLogs.length, [unenrichedLogs]);

  // Create Quick Log
  const createQuickLog = useCallback(
    async (data: CreateQuickLogData): Promise<WorkOrder> => {
      setIsSubmitting(true);

      try {
        const actionConfig = QUICK_LOG_ACTIONS[data.actionType];

        // Fetch asset to get its number for the title
        const assetsCollection = database.get<Asset>('assets');
        const asset = await assetsCollection.find(data.assetId);

        const workOrder = await database.write(async () => {
          return await database.get<WorkOrder>('work_orders').create((wo) => {
            wo.woNumber = generateWoNumber();
            wo.siteId = user.siteId;
            wo.assetId = data.assetId;
            wo.title = `${actionConfig.titlePrefix} ${asset.assetNumber}`;
            wo.description = data.notes?.trim() || null;
            wo.priority = actionConfig.priority;
            wo.status = 'open';
            wo.assignedTo = user.id; // Self-assign Quick Logs
            wo.createdBy = user.id;
            wo.dueDate = null;
            wo.needsEnrichment = true;
            wo.isQuickLog = true;
            wo.localSyncStatus = 'pending';
            wo.localUpdatedAt = Date.now();
          });
        });

        return workOrder;
      } finally {
        setIsSubmitting(false);
      }
    },
    [database, user.siteId, user.id]
  );

  // Mark a Quick Log as enriched
  const markEnriched = useCallback(
    async (workOrderId: string): Promise<void> => {
      try {
        const workOrder = await database.get<WorkOrder>('work_orders').find(workOrderId);
        await database.write(async () => {
          await workOrder.update((wo) => {
            wo.needsEnrichment = false;
            wo.localSyncStatus = 'pending';
            wo.localUpdatedAt = Date.now();
          });
        });
      } catch (err) {
        console.error('[useQuickLog] Failed to mark as enriched:', workOrderId, err);
        throw err;
      }
    },
    [database]
  );

  return {
    createQuickLog,
    unenrichedLogs,
    unenrichedCount,
    isSubmitting,
    markEnriched,
  };
}

export default useQuickLog;
