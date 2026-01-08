/**
 * Work Order PDF Template
 *
 * HTML template for generating work order PDFs.
 * Includes signature verification section for compliance.
 *
 * @module services/pdf/templates/work-order-template
 */

import type WorkOrder from '@/database/models/WorkOrder';
import type Asset from '@/database/models/Asset';
import { pdfStyles } from './styles';
import { formatDate, formatTime, formatDuration } from '../utils/image-utils';

/**
 * Priority display configuration
 */
const PRIORITY_CONFIG: Record<string, { label: string; class: string }> = {
  emergency: { label: 'Emergency', class: 'badge-emergency' },
  high: { label: 'High', class: 'badge-high' },
  medium: { label: 'Medium', class: 'badge-medium' },
  low: { label: 'Low', class: 'badge-low' },
};

/**
 * Status display configuration
 */
const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  completed: { label: 'Completed', class: 'badge-completed' },
  in_progress: { label: 'In Progress', class: 'badge-in-progress' },
  open: { label: 'Open', class: 'badge-open' },
};

/**
 * Failure type labels
 */
const FAILURE_TYPE_LABELS: Record<string, string> = {
  none: 'None',
  wore_out: 'Wore Out',
  broke: 'Broke',
  unknown: 'Unknown',
};

/**
 * Interface for signature data with enhanced verification
 */
export interface SignatureData {
  /** Base64-encoded signature image */
  imageBase64: string;
  /** Signature timestamp (Unix ms) */
  timestamp: number;
  /** SHA-256 hash of signed fields */
  hash: string;
  /** Name of person who signed */
  signedBy: string;
  /** Verification code (XXXX-XXXX-XXXX format) */
  verificationCode?: string | undefined;
  /** Base64-encoded QR code image for verification URL */
  qrCodeBase64?: string | undefined;
  /** Canonical fields used in hash calculation */
  canonicalFields?: {
    wo_number: string;
    asset_id: string;
    completed_at: string;
    completed_by: string;
    completion_notes: string;
    failure_type: string;
    time_spent_minutes: number;
    meter_reading_at_completion: number;
  };
}

/**
 * Generate HTML for the work order header section
 */
function generateHeader(workOrder: WorkOrder): string {
  const priorityConfig = PRIORITY_CONFIG[workOrder.priority] ?? {
    label: 'Medium',
    class: 'badge-medium',
  };
  const statusConfig = STATUS_CONFIG[workOrder.status] ?? { label: 'Open', class: 'badge-open' };

  return `
    <div class="header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div class="header-title">${workOrder.woNumber}</div>
          <div class="header-subtitle">${workOrder.title}</div>
        </div>
        <div style="text-align: right;">
          <span class="badge ${priorityConfig.class}">${priorityConfig.label}</span>
          <span class="badge ${statusConfig.class}" style="margin-left: 8px;">${statusConfig.label}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate HTML for the asset information section
 */
function generateAssetSection(asset: Asset | null): string {
  if (!asset) {
    return `
      <div class="section">
        <div class="section-title">Asset Information</div>
        <div class="description-text">Asset information not available</div>
      </div>
    `;
  }

  return `
    <div class="section">
      <div class="section-title">Asset Information</div>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">Asset Number</span>
          <span class="info-value">${asset.assetNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Name</span>
          <span class="info-value">${asset.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Category</span>
          <span class="info-value">${asset.category}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Location</span>
          <span class="info-value">${asset.locationDescription || '--'}</span>
        </div>
        ${
          asset.meterType
            ? `
          <div class="info-row">
            <span class="info-label">${asset.meterType} Reading</span>
            <span class="info-value">${asset.meterCurrentReading?.toLocaleString() || '--'} ${asset.meterUnit || ''}</span>
          </div>
        `
            : ''
        }
      </div>
    </div>
  `;
}

/**
 * Generate HTML for the work order details section
 */
function generateDetailsSection(workOrder: WorkOrder): string {
  return `
    <div class="section">
      <div class="section-title">Work Order Details</div>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">Created</span>
          <span class="info-value">${formatDate(workOrder.localUpdatedAt)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Due Date</span>
          <span class="info-value">${workOrder.dueDate ? formatDate(workOrder.dueDate) : '--'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Started</span>
          <span class="info-value">${workOrder.startedAt ? `${formatDate(workOrder.startedAt)} ${formatTime(workOrder.startedAt)}` : '--'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Completed</span>
          <span class="info-value">${workOrder.completedAt ? `${formatDate(workOrder.completedAt)} ${formatTime(workOrder.completedAt)}` : '--'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Time Spent</span>
          <span class="info-value">${formatDuration(workOrder.timeSpentMinutes)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Failure Type</span>
          <span class="info-value">${FAILURE_TYPE_LABELS[workOrder.failureType || 'none'] || '--'}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate HTML for the description section
 */
function generateDescriptionSection(workOrder: WorkOrder): string {
  if (!workOrder.description && !workOrder.completionNotes) {
    return '';
  }

  return `
    ${
      workOrder.description
        ? `
      <div class="section">
        <div class="section-title">Problem Description</div>
        <div class="description-text">${escapeHtml(workOrder.description)}</div>
      </div>
    `
        : ''
    }
    ${
      workOrder.completionNotes
        ? `
      <div class="section">
        <div class="section-title">Work Performed</div>
        <div class="description-text">${escapeHtml(workOrder.completionNotes)}</div>
      </div>
    `
        : ''
    }
  `;
}

/**
 * Generate HTML for the signature section
 */
function generateSignatureSection(workOrder: WorkOrder, signature: SignatureData | null): string {
  if (!workOrder.isCompleted) {
    return '';
  }

  const hasSignature = signature && signature.imageBase64;

  return `
    <div class="signature-section">
      <div class="section-title" style="border: none; margin-bottom: 16px;">Signature</div>

      ${
        hasSignature
          ? `
        <img
          src="${signature.imageBase64}"
          alt="Signature"
          class="signature-image"
        />
      `
          : `
        <div class="description-text" style="text-align: center; color: #999;">
          No signature captured
        </div>
      `
      }

      <div class="signature-info">
        <div><strong>Signed by:</strong> ${signature?.signedBy || workOrder.completedBy || 'Unknown'}</div>
        <div><strong>Date:</strong> ${formatDate(signature?.timestamp || workOrder.signatureTimestamp || workOrder.completedAt)}</div>
        <div><strong>Time:</strong> ${formatTime(signature?.timestamp || workOrder.signatureTimestamp || workOrder.completedAt)}</div>
      </div>

      ${hasSignature && signature.hash ? generateVerificationSection(signature) : ''}
    </div>
  `;
}

/**
 * Generate HTML for the enhanced verification section
 * Includes verification code, full hash, signed fields, and QR code
 */
function generateVerificationSection(signature: SignatureData): string {
  const fields = signature.canonicalFields;

  return `
    <div class="verification-section" style="margin-top: 20px; padding: 16px; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div class="verification-title" style="font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">
        Signature Verification
      </div>

      ${
        signature.verificationCode
          ? `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
          <div style="flex: 1;">
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Verification Code</div>
            <div style="font-size: 20px; font-weight: 700; font-family: monospace; letter-spacing: 2px; color: #1976D2;">
              ${signature.verificationCode}
            </div>
          </div>
          ${
            signature.qrCodeBase64
              ? `
            <div style="margin-left: 16px;">
              <img src="${signature.qrCodeBase64}" alt="Verification QR Code" style="width: 80px; height: 80px;" />
              <div style="font-size: 9px; color: #999; text-align: center; margin-top: 4px;">Scan to verify</div>
            </div>
          `
              : ''
          }
        </div>
      `
          : ''
      }

      <div style="margin-bottom: 16px;">
        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">SHA-256 Hash</div>
        <div class="verification-hash" style="font-family: monospace; font-size: 10px; word-break: break-all; background: #fff; padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
          ${signature.hash}
        </div>
      </div>

      ${
        fields
          ? `
        <div style="margin-bottom: 16px;">
          <div style="font-size: 12px; font-weight: 600; color: #666; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
            Signed Fields at Time of Signing
          </div>
          <div style="font-size: 11px; display: grid; grid-template-columns: 140px 1fr; gap: 4px 12px;">
            <div style="color: #666;">WO Number:</div>
            <div style="font-family: monospace;">${escapeHtml(fields.wo_number)}</div>

            <div style="color: #666;">Asset ID:</div>
            <div style="font-family: monospace; font-size: 9px;">${escapeHtml(fields.asset_id)}</div>

            <div style="color: #666;">Completed At:</div>
            <div style="font-family: monospace;">${escapeHtml(fields.completed_at)}</div>

            <div style="color: #666;">Completed By:</div>
            <div>${escapeHtml(fields.completed_by)}</div>

            <div style="color: #666;">Completion Notes:</div>
            <div>${fields.completion_notes ? `"${escapeHtml(fields.completion_notes.slice(0, 80))}${fields.completion_notes.length > 80 ? '...' : ''}"` : '(none)'}</div>

            <div style="color: #666;">Failure Type:</div>
            <div>${escapeHtml(fields.failure_type)}</div>

            <div style="color: #666;">Time Spent:</div>
            <div>${fields.time_spent_minutes} minutes</div>

            <div style="color: #666;">Meter Reading:</div>
            <div>${fields.meter_reading_at_completion > 0 ? fields.meter_reading_at_completion.toLocaleString() : '(none)'}</div>
          </div>
        </div>
      `
          : ''
      }

      <div style="font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 12px;">
        <div style="font-weight: 600; margin-bottom: 4px;">Offline Verification Instructions:</div>
        <ol style="margin: 0; padding-left: 16px; line-height: 1.5;">
          <li>Construct canonical JSON from signed fields above (sorted keys, no spaces)</li>
          <li>Calculate SHA-256 hash of the canonical string</li>
          <li>Compare computed hash to the hash shown above</li>
          <li>If hashes match, the document is authentic and unmodified</li>
        </ol>
      </div>

      ${
        signature.verificationCode
          ? `
        <div style="font-size: 10px; color: #666; margin-top: 12px; text-align: center;">
          Online verification: <span style="font-family: monospace; color: #1976D2;">verify.example.com/${signature.verificationCode}</span>
        </div>
      `
          : ''
      }
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
      <div>QuarryCMMS - Work Order Report</div>
    </div>
  `;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

/**
 * Generate complete HTML for a work order PDF
 *
 * @param workOrder - Work order model
 * @param asset - Associated asset model (optional)
 * @param signature - Signature data (optional)
 * @returns Complete HTML string for PDF generation
 */
export function generateWorkOrderHtml(
  workOrder: WorkOrder,
  asset: Asset | null = null,
  signature: SignatureData | null = null
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Work Order ${workOrder.woNumber}</title>
      <style>${pdfStyles}</style>
    </head>
    <body>
      ${generateHeader(workOrder)}
      ${generateAssetSection(asset)}
      ${generateDetailsSection(workOrder)}
      ${generateDescriptionSection(workOrder)}
      ${generateSignatureSection(workOrder, signature)}
      ${generateFooter()}
    </body>
    </html>
  `;
}

export default generateWorkOrderHtml;
