/**
 * Compliance Utilities for PDF Generation
 *
 * Provides calculation functions for compliance package generation
 * including downtime analysis, audit summaries, and hash generation.
 *
 * @module services/pdf/utils/compliance-utils
 */

import type WorkOrder from '@/database/models/WorkOrder';
import type MeterReading from '@/database/models/MeterReading';
import type Asset from '@/database/models/Asset';
import { sha256 } from '@/services/signature';

/**
 * Asset downtime statistics
 */
export interface AssetDowntimeStats {
  /** Asset ID */
  assetId: string;
  /** Total downtime in hours */
  totalHours: number;
  /** Number of downtime events */
  eventCount: number;
  /** Longest single event in hours */
  longestEventHours: number;
}

/**
 * Audit summary for compliance package
 */
export interface AuditSummary {
  /** Total work orders created in period */
  workOrdersCreated: number;
  /** Work orders marked completed */
  workOrdersCompleted: number;
  /** Work orders modified after completion (for review) */
  workOrdersModifiedAfterCompletion: number;
  /** Total meter readings recorded */
  meterReadingsRecorded: number;
  /** Signatures captured on work orders */
  signaturesCaptured: number;
  /** Sync conflicts auto-resolved */
  syncConflictsResolved: number;
  /** Sync conflicts escalated to supervisor */
  syncConflictsEscalated: number;
}

/**
 * Compliance package data interface
 */
export interface CompliancePackageData {
  /** Company name */
  companyName: string;
  /** Site name */
  siteName: string;
  /** Date range for the report */
  dateRange: { start: Date; end: Date };
  /** Assets included in the package */
  assets: Asset[];
  /** Work orders in the date range */
  workOrders: WorkOrder[];
  /** Meter readings in the date range */
  meterReadings: MeterReading[];
  /** User who generated the package */
  generatedBy: string;
  /** Generation timestamp */
  generatedAt: Date;
}

/**
 * Calculate downtime statistics for an asset
 *
 * Calculates total downtime hours, event count, and longest event
 * based on completed work orders.
 *
 * @param assetId - Asset ID to calculate for
 * @param workOrders - All work orders to analyze
 * @returns Downtime statistics for the asset
 */
export function calculateAssetDowntime(
  assetId: string,
  workOrders: WorkOrder[]
): AssetDowntimeStats {
  // Filter work orders for this asset that have both started and completed times
  const assetWOs = workOrders.filter(
    wo =>
      wo.assetId === assetId &&
      wo.status === 'completed' &&
      wo.startedAt != null &&
      wo.completedAt != null
  );

  if (assetWOs.length === 0) {
    return {
      assetId,
      totalHours: 0,
      eventCount: 0,
      longestEventHours: 0,
    };
  }

  let totalMinutes = 0;
  let longestMinutes = 0;

  for (const wo of assetWOs) {
    const startedAt = wo.startedAt!;
    const completedAt = wo.completedAt!;
    const durationMinutes = (completedAt - startedAt) / (1000 * 60);

    if (durationMinutes > 0) {
      totalMinutes += durationMinutes;
      if (durationMinutes > longestMinutes) {
        longestMinutes = durationMinutes;
      }
    }
  }

  return {
    assetId,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10, // Round to 1 decimal
    eventCount: assetWOs.length,
    longestEventHours: Math.round((longestMinutes / 60) * 10) / 10,
  };
}

/**
 * Calculate all asset downtime statistics
 *
 * @param assets - All assets to calculate for
 * @param workOrders - All work orders to analyze
 * @returns Array of downtime stats, sorted by total hours descending
 */
export function calculateAllAssetDowntime(
  assets: Asset[],
  workOrders: WorkOrder[]
): AssetDowntimeStats[] {
  const stats: AssetDowntimeStats[] = [];

  for (const asset of assets) {
    const assetStats = calculateAssetDowntime(asset.id, workOrders);
    if (assetStats.eventCount > 0) {
      stats.push(assetStats);
    }
  }

  // Sort by total hours descending
  return stats.sort((a, b) => b.totalHours - a.totalHours);
}

/**
 * Calculate audit summary for compliance package
 *
 * @param workOrders - Work orders in the date range
 * @param meterReadings - Meter readings in the date range
 * @returns Audit summary statistics
 */
export function calculateAuditSummary(
  workOrders: WorkOrder[],
  meterReadings: MeterReading[]
): AuditSummary {
  const completed = workOrders.filter(wo => wo.status === 'completed');
  const withSignatures = completed.filter(wo => wo.signatureImageUrl != null);

  // Count work orders modified after completion
  // (where localUpdatedAt is significantly after completedAt)
  const modifiedAfter = completed.filter(wo => {
    if (!wo.completedAt || !wo.localUpdatedAt) return false;
    const diff = wo.localUpdatedAt - wo.completedAt;
    // Consider modified if updated more than 5 minutes after completion
    return diff > 5 * 60 * 1000;
  });

  // Count sync conflicts (based on sync_status field)
  const conflictsResolved = workOrders.filter(
    wo => wo.syncStatus === 'synced' && wo.serverUpdatedAt != null
  ).length;

  // Escalated conflicts would be tracked separately in production
  // For now, estimate based on completion fraud indicators
  const escalated = workOrders.filter(wo => {
    if (wo.status !== 'completed') return false;
    // Quick completion without notes
    const duration =
      wo.completedAt && wo.startedAt ? wo.completedAt - wo.startedAt : null;
    const quickCompletion = duration != null && duration < 5 * 60 * 1000;
    const noNotes = !wo.completionNotes || wo.completionNotes.trim() === '';
    return quickCompletion && noNotes;
  }).length;

  return {
    workOrdersCreated: workOrders.length,
    workOrdersCompleted: completed.length,
    workOrdersModifiedAfterCompletion: modifiedAfter.length,
    meterReadingsRecorded: meterReadings.length,
    signaturesCaptured: withSignatures.length,
    syncConflictsResolved: Math.max(0, conflictsResolved - workOrders.length),
    syncConflictsEscalated: escalated,
  };
}

/**
 * Generate package integrity hash
 *
 * Creates a deterministic SHA-256 hash from all package data for
 * verification that the package hasn't been modified.
 *
 * Uses expo-crypto for proper cryptographic hashing.
 *
 * @param data - Compliance package data
 * @returns Promise resolving to 64-character SHA-256 hash string
 */
export async function calculatePackageHash(data: CompliancePackageData): Promise<string> {
  // Build canonical string from sorted IDs and values
  const workOrderIds = data.workOrders
    .map(wo => wo.id)
    .sort()
    .join(',');

  const signatureHashes = data.workOrders
    .filter(wo => wo.signatureHash)
    .map(wo => wo.signatureHash!)
    .sort()
    .join(',');

  const meterValues = data.meterReadings
    .sort((a, b) => (a.readingDate || 0) - (b.readingDate || 0))
    .map(mr => `${mr.assetId}:${mr.readingValue}:${mr.readingDate}`)
    .join(',');

  const assetIds = data.assets
    .map(a => a.id)
    .sort()
    .join(',');

  const canonicalString = [
    `company:${data.companyName}`,
    `site:${data.siteName}`,
    `start:${data.dateRange.start.toISOString()}`,
    `end:${data.dateRange.end.toISOString()}`,
    `generated:${data.generatedAt.toISOString()}`,
    `by:${data.generatedBy}`,
    `assets:${assetIds}`,
    `workorders:${workOrderIds}`,
    `signatures:${signatureHashes}`,
    `meters:${meterValues}`,
  ].join('|');

  // Generate proper SHA-256 hash using expo-crypto
  const hash = await sha256(canonicalString);

  return hash;
}

/**
 * Get truncated package hash for display
 *
 * @param fullHash - Full hash string
 * @param length - Number of characters to show (default 16)
 * @returns Truncated hash with ellipsis
 */
export function getTruncatedPackageHash(fullHash: string, length = 16): string {
  if (!fullHash) return '';
  const hashPart = fullHash.replace('SHA-256:', '');
  if (hashPart.length <= length) return fullHash;
  return `SHA-256:${hashPart.slice(0, length)}...`;
}

/**
 * Count work orders per asset
 *
 * @param assetId - Asset ID to count for
 * @param workOrders - All work orders
 * @returns Number of work orders for the asset
 */
export function countAssetWorkOrders(
  assetId: string,
  workOrders: WorkOrder[]
): number {
  return workOrders.filter(wo => wo.assetId === assetId).length;
}

/**
 * Get latest meter reading for an asset
 *
 * @param assetId - Asset ID
 * @param meterReadings - All meter readings
 * @returns Latest reading value or null
 */
export function getLatestMeterReading(
  assetId: string,
  meterReadings: MeterReading[]
): number | null {
  const assetReadings = meterReadings
    .filter(mr => mr.assetId === assetId)
    .sort((a, b) => (b.readingDate || 0) - (a.readingDate || 0));

  return assetReadings.length > 0 ? assetReadings[0].readingValue : null;
}

/**
 * Format date range for display
 *
 * @param dateRange - Start and end dates
 * @returns Formatted date range string
 */
export function formatDateRange(dateRange: { start: Date; end: Date }): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  const start = dateRange.start.toLocaleDateString('en-CA', options);
  const end = dateRange.end.toLocaleDateString('en-CA', options);
  return `${start} - ${end}`;
}

/**
 * Format hours for display
 *
 * @param hours - Hours value
 * @returns Formatted string with hrs suffix
 */
export function formatHours(hours: number): string {
  if (hours === 0) return '0 hrs';
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins} min`;
  }
  return `${hours.toFixed(1)} hrs`;
}

export default {
  calculateAssetDowntime,
  calculateAllAssetDowntime,
  calculateAuditSummary,
  calculatePackageHash,
  getTruncatedPackageHash,
  countAssetWorkOrders,
  getLatestMeterReading,
  formatDateRange,
  formatHours,
};
