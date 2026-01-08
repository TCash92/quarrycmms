/**
 * Asset History PDF Template
 *
 * HTML template for generating asset history PDFs.
 * Includes meter readings and work order history.
 *
 * @module services/pdf/templates/asset-history-template
 */

import type Asset from '@/database/models/Asset';
import type WorkOrder from '@/database/models/WorkOrder';
import type MeterReading from '@/database/models/MeterReading';
import { pdfStyles } from './styles';
import { formatDate, formatTime, formatDuration } from '../utils/image-utils';

/**
 * Status display configuration
 */
const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  operational: { label: 'Operational', class: 'badge-operational' },
  down: { label: 'Down', class: 'badge-down' },
  limited: { label: 'Limited', class: 'badge-limited' },
};

/**
 * Work order status configuration
 */
const WO_STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  completed: { label: 'Completed', class: 'badge-completed' },
  in_progress: { label: 'In Progress', class: 'badge-in-progress' },
  open: { label: 'Open', class: 'badge-open' },
};

/**
 * Priority labels
 */
const PRIORITY_LABELS: Record<string, string> = {
  emergency: 'Emergency',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/**
 * Generate HTML for the asset header section
 */
function generateHeader(asset: Asset): string {
  const statusConfig = STATUS_CONFIG[asset.status] ?? { label: 'Operational', class: 'badge-operational' };

  return `
    <div class="header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div class="header-title">${asset.assetNumber}</div>
          <div class="header-subtitle">${asset.name}</div>
        </div>
        <div>
          <span class="badge ${statusConfig.class}">${statusConfig.label}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate HTML for the asset information section
 */
function generateAssetInfoSection(asset: Asset): string {
  return `
    <div class="section">
      <div class="section-title">Asset Information</div>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">Asset Number</span>
          <span class="info-value">${asset.assetNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Category</span>
          <span class="info-value">${asset.category}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Location</span>
          <span class="info-value">${asset.locationDescription || '--'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Current Status</span>
          <span class="info-value">${STATUS_CONFIG[asset.status]?.label || asset.status}</span>
        </div>
        ${asset.description ? `
          <div class="info-row full-width">
            <span class="info-label">Description</span>
            <span class="info-value">${asset.description}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Generate HTML for the meter reading section
 */
function generateMeterReadingsSection(
  asset: Asset,
  meterReadings: MeterReading[]
): string {
  if (!asset.meterType || meterReadings.length === 0) {
    return '';
  }

  // Sort readings by date (newest first)
  const sortedReadings = [...meterReadings].sort(
    (a, b) => b.readingDate - a.readingDate
  );

  // Calculate statistics (guaranteed to exist since we check length above)
  const latestReading = sortedReadings[0];
  const oldestReading = sortedReadings[sortedReadings.length - 1];
  if (!latestReading || !oldestReading) {
    return '';
  }
  const totalUsage = latestReading.readingValue - oldestReading.readingValue;
  const daysSpan = Math.ceil(
    (latestReading.readingDate - oldestReading.readingDate) / (1000 * 60 * 60 * 24)
  );
  const avgPerDay = daysSpan > 0 ? (totalUsage / daysSpan).toFixed(1) : 0;

  return `
    <div class="section">
      <div class="section-title">Meter Readings - ${asset.meterType}</div>

      <div class="summary-box">
        <div class="summary-item">
          <div class="summary-value">${latestReading.readingValue.toLocaleString()}</div>
          <div class="summary-label">Current ${asset.meterUnit || ''}</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${totalUsage.toLocaleString()}</div>
          <div class="summary-label">Total Usage</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${avgPerDay}</div>
          <div class="summary-label">Avg/Day</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${sortedReadings.length}</div>
          <div class="summary-label">Readings</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Reading</th>
            <th>Change</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${sortedReadings.slice(0, 20).map((reading, index) => {
            const prevReading = sortedReadings[index + 1];
            const change = prevReading
              ? reading.readingValue - prevReading.readingValue
              : 0;
            return `
              <tr>
                <td>${formatDate(reading.readingDate)}</td>
                <td><strong>${reading.readingValue.toLocaleString()}</strong> ${asset.meterUnit || ''}</td>
                <td>${prevReading ? `+${change.toLocaleString()}` : '--'}</td>
                <td>${reading.notes || '--'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      ${sortedReadings.length > 20 ? `
        <div style="text-align: center; padding: 12px; color: #666; font-style: italic;">
          Showing 20 of ${sortedReadings.length} readings
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Generate HTML for the work order history section
 */
function generateWorkOrderHistorySection(workOrders: WorkOrder[]): string {
  if (workOrders.length === 0) {
    return `
      <div class="section">
        <div class="section-title">Work Order History</div>
        <div class="description-text" style="text-align: center; color: #999;">
          No work orders recorded
        </div>
      </div>
    `;
  }

  // Sort by completion date (newest first) or creation date
  const sortedOrders = [...workOrders].sort((a, b) => {
    const dateA = a.completedAt || a.localUpdatedAt;
    const dateB = b.completedAt || b.localUpdatedAt;
    return dateB - dateA;
  });

  // Calculate statistics
  const completedOrders = workOrders.filter(wo => wo.status === 'completed');
  const totalTimeMinutes = completedOrders.reduce(
    (sum, wo) => sum + (wo.timeSpentMinutes || 0),
    0
  );
  const emergencyCount = workOrders.filter(wo => wo.priority === 'emergency').length;

  return `
    <div class="section">
      <div class="section-title">Work Order History</div>

      <div class="summary-box">
        <div class="summary-item">
          <div class="summary-value">${workOrders.length}</div>
          <div class="summary-label">Total WOs</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${completedOrders.length}</div>
          <div class="summary-label">Completed</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${formatDuration(totalTimeMinutes)}</div>
          <div class="summary-label">Total Time</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${emergencyCount}</div>
          <div class="summary-label">Emergencies</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>WO #</th>
            <th>Title</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Completed</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${sortedOrders.slice(0, 25).map(wo => {
            const statusConfig = WO_STATUS_CONFIG[wo.status] ?? { label: 'Open', class: 'badge-open' };
            return `
              <tr>
                <td><strong>${wo.woNumber}</strong></td>
                <td>${wo.title}</td>
                <td>${PRIORITY_LABELS[wo.priority] || wo.priority}</td>
                <td><span class="badge ${statusConfig.class}" style="font-size: 10px;">${statusConfig.label}</span></td>
                <td>${wo.completedAt ? formatDate(wo.completedAt) : '--'}</td>
                <td>${formatDuration(wo.timeSpentMinutes)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      ${sortedOrders.length > 25 ? `
        <div style="text-align: center; padding: 12px; color: #666; font-style: italic;">
          Showing 25 of ${sortedOrders.length} work orders
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Generate HTML for downtime analysis section
 */
function generateDowntimeSection(workOrders: WorkOrder[]): string {
  const downOrders = workOrders.filter(wo => wo.failureType === 'broke');
  const woreOutOrders = workOrders.filter(wo => wo.failureType === 'wore_out');

  if (downOrders.length === 0 && woreOutOrders.length === 0) {
    return '';
  }

  return `
    <div class="section">
      <div class="section-title">Downtime Analysis</div>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">Breakdowns</span>
          <span class="info-value">${downOrders.length}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Wear-Related Failures</span>
          <span class="info-value">${woreOutOrders.length}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate HTML for the footer
 */
function generateFooter(): string {
  return `
    <div class="footer">
      <div>Generated: ${formatDate(Date.now())} ${formatTime(Date.now())}</div>
      <div>QuarryCMMS - Asset History Report</div>
    </div>
  `;
}

/**
 * Generate complete HTML for an asset history PDF
 *
 * @param asset - Asset model
 * @param workOrders - Array of work order models
 * @param meterReadings - Array of meter reading models
 * @returns Complete HTML string for PDF generation
 */
export function generateAssetHistoryHtml(
  asset: Asset,
  workOrders: WorkOrder[],
  meterReadings: MeterReading[]
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Asset History - ${asset.assetNumber}</title>
      <style>${pdfStyles}</style>
    </head>
    <body>
      ${generateHeader(asset)}
      ${generateAssetInfoSection(asset)}
      ${generateMeterReadingsSection(asset, meterReadings)}
      ${generateWorkOrderHistorySection(workOrders)}
      ${generateDowntimeSection(workOrders)}
      ${generateFooter()}
    </body>
    </html>
  `;
}

export default generateAssetHistoryHtml;
