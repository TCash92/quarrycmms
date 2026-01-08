/**
 * PDF Generator Service
 *
 * Core service for generating and sharing PDFs using expo-print.
 * Works fully offline with no network dependencies.
 *
 * @module services/pdf/pdf-generator
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { documentDirectory } from 'expo-file-system/legacy';
import type WorkOrder from '@/database/models/WorkOrder';
import type Asset from '@/database/models/Asset';
import type MeterReading from '@/database/models/MeterReading';
import { generateWorkOrderHtml, SignatureData } from './templates/work-order-template';
import { generateAssetHistoryHtml } from './templates/asset-history-template';
import {
  generateCompliancePackageHtml,
  CompliancePackageData,
} from './templates/compliance-package-template';
import { signatureToBase64, generateSignatureHash } from './utils/image-utils';
import { logger, measurePdfGeneration, createTimer, trackPdfExported } from '@/services/monitoring';

// Re-export for external use
export type { CompliancePackageData };

/**
 * Result from PDF generation
 */
export interface PdfResult {
  /** Local file URI of the generated PDF */
  uri: string;
  /** Suggested filename for the PDF */
  fileName: string;
}

/**
 * Generate a work order PDF
 *
 * @param workOrder - Work order to generate PDF for
 * @param asset - Associated asset (optional, will be fetched if not provided)
 * @returns PDF result with URI and filename
 */
export async function generateWorkOrderPdf(
  workOrder: WorkOrder,
  asset: Asset | null = null
): Promise<PdfResult> {
  logger.info('Generating work order PDF', { category: 'pdf', woNumber: workOrder.woNumber });
  const timer = createTimer();

  try {
    // Prepare signature data if available
    let signatureData: SignatureData | null = null;

    if (workOrder.signatureImageUrl) {
      const imageBase64 = await signatureToBase64(workOrder.signatureImageUrl);
      const timestamp = workOrder.signatureTimestamp || workOrder.completedAt || Date.now();

      // Generate hash if not already stored (now uses real SHA-256)
      const hash =
        workOrder.signatureHash ||
        (await generateSignatureHash(imageBase64, timestamp, workOrder.id));

      signatureData = {
        imageBase64,
        timestamp,
        hash,
        signedBy: workOrder.completedBy || 'Unknown',
        verificationCode: workOrder.verificationCode || undefined,
      };
    }

    // Generate HTML
    const html = generateWorkOrderHtml(workOrder, asset, signatureData);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Move to a better location with proper filename
    const fileName = `WO-${workOrder.woNumber}-${Date.now()}.pdf`;
    const newUri = `${documentDirectory}${fileName}`;

    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });

    const durationMs = timer.elapsed();
    measurePdfGeneration(durationMs, 1);
    trackPdfExported('work_order', 1);

    logger.info('Work order PDF generated', { category: 'pdf', fileName, durationMs });

    return {
      uri: newUri,
      fileName,
    };
  } catch (error) {
    logger.error('Failed to generate work order PDF', error as Error, { category: 'pdf' });
    throw new Error('Failed to generate PDF');
  }
}

/**
 * Generate an asset history PDF
 *
 * @param asset - Asset to generate history for
 * @param workOrders - Work orders for this asset
 * @param meterReadings - Meter readings for this asset
 * @returns PDF result with URI and filename
 */
export async function generateAssetHistoryPdf(
  asset: Asset,
  workOrders: WorkOrder[],
  meterReadings: MeterReading[]
): Promise<PdfResult> {
  logger.info('Generating asset history PDF', { category: 'pdf', assetNumber: asset.assetNumber });
  const timer = createTimer();

  try {
    // Generate HTML
    const html = generateAssetHistoryHtml(asset, workOrders, meterReadings);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Move to a better location with proper filename
    const fileName = `Asset-${asset.assetNumber}-History-${Date.now()}.pdf`;
    const newUri = `${documentDirectory}${fileName}`;

    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });

    const durationMs = timer.elapsed();
    measurePdfGeneration(durationMs, workOrders.length + meterReadings.length);
    trackPdfExported('asset_history', workOrders.length + meterReadings.length);

    logger.info('Asset history PDF generated', { category: 'pdf', fileName, durationMs });

    return {
      uri: newUri,
      fileName,
    };
  } catch (error) {
    logger.error('Failed to generate asset history PDF', error as Error, { category: 'pdf' });
    throw new Error('Failed to generate PDF');
  }
}

/**
 * Share a PDF file
 *
 * Opens the system share dialog to share the PDF via email, messaging, etc.
 *
 * @param uri - Local file URI of the PDF
 */
export async function sharePdf(uri: string): Promise<void> {
  logger.info('Sharing PDF', { category: 'pdf', uri });

  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share PDF',
    });

    logger.info('PDF shared successfully', { category: 'pdf' });
  } catch (error) {
    logger.error('Failed to share PDF', error as Error, { category: 'pdf' });
    throw new Error('Failed to share PDF');
  }
}

/**
 * Generate a compliance package PDF
 *
 * Creates a comprehensive PDF with all 7 sections for audit compliance.
 *
 * @param data - Compliance package data including assets, work orders, and meter readings
 * @returns PDF result with URI and filename
 */
export async function generateCompliancePackagePdf(
  data: CompliancePackageData
): Promise<PdfResult> {
  logger.info('Generating compliance package PDF', {
    category: 'pdf',
    siteName: data.siteName,
    assetCount: data.assets.length,
    workOrderCount: data.workOrders.length,
  });
  const timer = createTimer();

  try {
    // Generate HTML (now async due to SHA-256 hash calculation)
    const html = await generateCompliancePackageHtml(data);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Format date range for filename
    const startDate = data.dateRange.start.toISOString().split('T')[0];
    const endDate = data.dateRange.end.toISOString().split('T')[0];

    // Move to a better location with proper filename
    const fileName = `Compliance-${data.siteName.replace(/\s+/g, '-')}-${startDate}-to-${endDate}.pdf`;
    const newUri = `${documentDirectory}${fileName}`;

    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });

    const durationMs = timer.elapsed();
    // Compliance packages include multiple sections, estimate page count
    const estimatedSections = 7; // As per the 7-section compliance package
    measurePdfGeneration(durationMs, estimatedSections);
    trackPdfExported('compliance_package', data.workOrders.length);

    logger.info('Compliance package PDF generated', { category: 'pdf', fileName, durationMs });

    return {
      uri: newUri,
      fileName,
    };
  } catch (error) {
    logger.error('Failed to generate compliance package PDF', error as Error, { category: 'pdf' });
    throw new Error('Failed to generate compliance package PDF');
  }
}

/**
 * Clean up old PDF files
 *
 * Removes PDF files older than the specified age.
 *
 * @param maxAgeMs - Maximum age in milliseconds (default: 7 days)
 */
export async function cleanupOldPdfs(maxAgeMs = 7 * 24 * 60 * 60 * 1000): Promise<void> {
  logger.debug('Cleaning up old PDFs', {
    category: 'pdf',
    maxAgeDays: maxAgeMs / (24 * 60 * 60 * 1000),
  });

  try {
    const docDir = documentDirectory;
    if (!docDir) return;

    const files = await FileSystem.readDirectoryAsync(docDir);
    const pdfFiles = files.filter(f => f.endsWith('.pdf'));

    const now = Date.now();
    let deletedCount = 0;

    for (const file of pdfFiles) {
      const fileUri = `${docDir}${file}`;
      const info = await FileSystem.getInfoAsync(fileUri);

      if (info.exists && info.modificationTime) {
        const age = now - info.modificationTime * 1000;
        if (age > maxAgeMs) {
          await FileSystem.deleteAsync(fileUri);
          deletedCount++;
        }
      }
    }

    if (deletedCount > 0) {
      logger.info('Cleaned up old PDF files', { category: 'pdf', deletedCount });
    }
  } catch (error) {
    logger.warn('Failed to cleanup old PDFs', { category: 'pdf', error: (error as Error).message });
    // Don't throw - cleanup is not critical
  }
}

export default {
  generateWorkOrderPdf,
  generateAssetHistoryPdf,
  generateCompliancePackagePdf,
  sharePdf,
  cleanupOldPdfs,
};
