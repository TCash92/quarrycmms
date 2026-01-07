/**
 * React hook for PDF generation
 *
 * Provides PDF generation and sharing capabilities for work orders and assets.
 * Works fully offline with no network dependencies.
 *
 * @module hooks/usePdf
 */

import { useState, useCallback } from 'react';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@/database';
import type WorkOrder from '@/database/models/WorkOrder';
import type Asset from '@/database/models/Asset';
import type MeterReading from '@/database/models/MeterReading';
import {
  generateWorkOrderPdf,
  generateAssetHistoryPdf,
  generateCompliancePackagePdf,
  sharePdf,
  PdfResult,
  CompliancePackageData,
} from '@/services/pdf/pdf-generator';
import { useAuth } from './useAuth';

/**
 * Date range for compliance package
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Return type for usePdf hook
 */
export interface UsePdfReturn {
  /** Whether a PDF is currently being generated */
  isGenerating: boolean;
  /** Error message if generation failed */
  error: string | null;
  /** Last generated PDF result */
  lastResult: PdfResult | null;
  /** Progress percentage for long operations (0-100) */
  progress: number;
  /** Generate and share a work order PDF */
  exportWorkOrderPdf: (workOrder: WorkOrder) => Promise<void>;
  /** Generate and share an asset history PDF */
  exportAssetHistoryPdf: (asset: Asset) => Promise<void>;
  /** Generate and share a compliance package PDF */
  exportCompliancePackage: (dateRange: DateRange) => Promise<void>;
  /** Clear the error state */
  clearError: () => void;
}

/**
 * Hook for generating and sharing PDFs
 *
 * @example
 * ```tsx
 * function WorkOrderActions({ workOrder }) {
 *   const { isGenerating, error, exportWorkOrderPdf } = usePdf();
 *
 *   const handleExport = async () => {
 *     await exportWorkOrderPdf(workOrder);
 *   };
 *
 *   return (
 *     <Button
 *       title={isGenerating ? 'Generating...' : 'Export PDF'}
 *       onPress={handleExport}
 *       disabled={isGenerating}
 *     />
 *   );
 * }
 * ```
 */
export function usePdf(): UsePdfReturn {
  const database = useDatabase();
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<PdfResult | null>(null);
  const [progress, setProgress] = useState(0);

  /**
   * Clear the error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setProgress(0);
  }, []);

  /**
   * Generate and share a work order PDF
   */
  const exportWorkOrderPdf = useCallback(
    async (workOrder: WorkOrder): Promise<void> => {
      console.log('[usePdf] Exporting work order PDF:', workOrder.woNumber);
      setIsGenerating(true);
      setError(null);

      try {
        // Try to fetch the associated asset
        let asset: Asset | null = null;
        try {
          asset = await database.get<Asset>('assets').find(workOrder.assetId);
        } catch (err) {
          console.warn('[usePdf] Could not find asset:', workOrder.assetId);
        }

        // Generate PDF
        const result = await generateWorkOrderPdf(workOrder, asset);
        setLastResult(result);

        // Share PDF
        await sharePdf(result.uri);

        console.log('[usePdf] Work order PDF exported successfully');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to generate PDF';
        console.error('[usePdf] Export failed:', errorMessage);
        setError(errorMessage);
      } finally {
        setIsGenerating(false);
      }
    },
    [database]
  );

  /**
   * Generate and share an asset history PDF
   */
  const exportAssetHistoryPdf = useCallback(
    async (asset: Asset): Promise<void> => {
      console.log('[usePdf] Exporting asset history PDF:', asset.assetNumber);
      setIsGenerating(true);
      setError(null);

      try {
        // Fetch work orders for this asset
        const workOrders = await database
          .get<WorkOrder>('work_orders')
          .query(Q.where('asset_id', asset.id), Q.sortBy('completed_at', Q.desc))
          .fetch();

        // Fetch meter readings for this asset
        const meterReadings = await database
          .get<MeterReading>('meter_readings')
          .query(Q.where('asset_id', asset.id), Q.sortBy('reading_date', Q.desc))
          .fetch();

        // Generate PDF
        const result = await generateAssetHistoryPdf(asset, workOrders, meterReadings);
        setLastResult(result);

        // Share PDF
        await sharePdf(result.uri);

        console.log('[usePdf] Asset history PDF exported successfully');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to generate PDF';
        console.error('[usePdf] Export failed:', errorMessage);
        setError(errorMessage);
      } finally {
        setIsGenerating(false);
      }
    },
    [database]
  );

  /**
   * Generate and share a compliance package PDF
   */
  const exportCompliancePackage = useCallback(
    async (dateRange: DateRange): Promise<void> => {
      console.log('[usePdf] Exporting compliance package PDF');
      setIsGenerating(true);
      setError(null);
      setProgress(0);

      try {
        // Fetch all assets
        setProgress(10);
        const assets = await database
          .get<Asset>('assets')
          .query()
          .fetch();

        // Fetch work orders in date range
        setProgress(30);
        const workOrders = await database
          .get<WorkOrder>('work_orders')
          .query(
            Q.or(
              Q.where('completed_at', Q.gte(dateRange.start.getTime())),
              Q.where('local_updated_at', Q.gte(dateRange.start.getTime()))
            ),
            Q.or(
              Q.where('completed_at', Q.lte(dateRange.end.getTime())),
              Q.where('local_updated_at', Q.lte(dateRange.end.getTime()))
            )
          )
          .fetch();

        // Fetch meter readings in date range
        setProgress(50);
        const meterReadings = await database
          .get<MeterReading>('meter_readings')
          .query(
            Q.where('reading_date', Q.gte(dateRange.start.getTime())),
            Q.where('reading_date', Q.lte(dateRange.end.getTime()))
          )
          .fetch();

        // Build compliance package data
        setProgress(70);
        const packageData: CompliancePackageData = {
          companyName: 'QuarryCMMS', // TODO: Get from app config
          siteName: 'Main Site', // TODO: Get from user's site
          dateRange,
          assets,
          workOrders,
          meterReadings,
          generatedBy: user?.email || 'Unknown User',
          generatedAt: new Date(),
        };

        // Generate PDF
        setProgress(85);
        const result = await generateCompliancePackagePdf(packageData);
        setLastResult(result);

        // Share PDF
        setProgress(95);
        await sharePdf(result.uri);

        setProgress(100);
        console.log('[usePdf] Compliance package PDF exported successfully');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to generate compliance package';
        console.error('[usePdf] Export failed:', errorMessage);
        setError(errorMessage);
      } finally {
        setIsGenerating(false);
      }
    },
    [database, user]
  );

  return {
    isGenerating,
    error,
    lastResult,
    progress,
    exportWorkOrderPdf,
    exportAssetHistoryPdf,
    exportCompliancePackage,
    clearError,
  };
}

export default usePdf;
