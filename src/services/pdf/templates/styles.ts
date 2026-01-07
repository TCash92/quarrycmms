/**
 * PDF Template Styles
 *
 * Shared CSS styles for PDF generation.
 * Optimized for print and offline rendering.
 *
 * @module services/pdf/templates/styles
 */

/**
 * Base styles for all PDF templates
 */
export const pdfStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 12px;
    line-height: 1.5;
    color: #1A1A1A;
    padding: 20px;
    background: #FFFFFF;
  }

  .header {
    border-bottom: 2px solid #1976D2;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }

  .header-title {
    font-size: 24px;
    font-weight: bold;
    color: #1976D2;
    margin-bottom: 4px;
  }

  .header-subtitle {
    font-size: 14px;
    color: #666666;
  }

  .section {
    margin-bottom: 20px;
  }

  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: #1976D2;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
    padding-bottom: 4px;
    border-bottom: 1px solid #E0E0E0;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 24px;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid #F0F0F0;
  }

  .info-label {
    font-weight: 500;
    color: #666666;
  }

  .info-value {
    font-weight: 600;
    color: #1A1A1A;
    text-align: right;
  }

  .full-width {
    grid-column: 1 / -1;
  }

  .description-text {
    padding: 12px;
    background: #F5F5F5;
    border-radius: 8px;
    white-space: pre-wrap;
  }

  .badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .badge-emergency {
    background: #FFEBEE;
    color: #C62828;
  }

  .badge-high {
    background: #FFF3E0;
    color: #E65100;
  }

  .badge-medium {
    background: #FFF8E1;
    color: #F57F17;
  }

  .badge-low {
    background: #E3F2FD;
    color: #1565C0;
  }

  .badge-operational {
    background: #E8F5E9;
    color: #2E7D32;
  }

  .badge-down {
    background: #FFEBEE;
    color: #C62828;
  }

  .badge-limited {
    background: #FFF3E0;
    color: #E65100;
  }

  .badge-completed {
    background: #E8F5E9;
    color: #2E7D32;
  }

  .badge-in-progress {
    background: #E3F2FD;
    color: #1565C0;
  }

  .badge-open {
    background: #F5F5F5;
    color: #666666;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
  }

  th, td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid #E0E0E0;
  }

  th {
    font-weight: 600;
    color: #666666;
    background: #F5F5F5;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  td {
    font-size: 12px;
  }

  tr:last-child td {
    border-bottom: none;
  }

  .signature-section {
    margin-top: 32px;
    padding: 20px;
    border: 2px solid #E0E0E0;
    border-radius: 8px;
    page-break-inside: avoid;
  }

  .signature-image {
    max-width: 200px;
    max-height: 80px;
    margin-bottom: 12px;
  }

  .signature-info {
    color: #666666;
    font-size: 11px;
  }

  .verification-section {
    margin-top: 16px;
    padding: 12px;
    background: #F5F5F5;
    border-radius: 8px;
    font-size: 10px;
    color: #666666;
  }

  .verification-title {
    font-weight: 600;
    color: #1A1A1A;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .verification-hash {
    font-family: monospace;
    font-size: 9px;
    word-break: break-all;
    background: #FFFFFF;
    padding: 4px 8px;
    border-radius: 4px;
    margin-top: 4px;
  }

  .summary-box {
    display: flex;
    gap: 24px;
    padding: 16px;
    background: #F5F5F5;
    border-radius: 8px;
    margin-top: 8px;
  }

  .summary-item {
    text-align: center;
  }

  .summary-value {
    font-size: 24px;
    font-weight: bold;
    color: #1976D2;
  }

  .summary-label {
    font-size: 11px;
    color: #666666;
    text-transform: uppercase;
  }

  .footer {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid #E0E0E0;
    font-size: 10px;
    color: #999999;
    text-align: center;
  }

  .page-break {
    page-break-before: always;
  }

  /* Compliance Package Specific Styles */

  .cover-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 40px;
  }

  .cover-title {
    font-size: 36px;
    font-weight: bold;
    color: #1976D2;
    margin-bottom: 8px;
  }

  .cover-subtitle {
    font-size: 20px;
    color: #666666;
    margin-bottom: 32px;
  }

  .cover-info {
    font-size: 14px;
    color: #1A1A1A;
    margin-bottom: 8px;
  }

  .cover-date-range {
    font-size: 18px;
    font-weight: 600;
    color: #1A1A1A;
    margin: 24px 0;
    padding: 16px 32px;
    background: #E3F2FD;
    border-radius: 8px;
  }

  .cover-generated {
    margin-top: 48px;
    font-size: 12px;
    color: #999999;
  }

  .cover-hash {
    margin-top: 24px;
    font-family: monospace;
    font-size: 10px;
    color: #666666;
    background: #F5F5F5;
    padding: 8px 16px;
    border-radius: 4px;
  }

  .toc {
    margin-top: 48px;
  }

  .toc-title {
    font-size: 16px;
    font-weight: 600;
    color: #1A1A1A;
    margin-bottom: 16px;
  }

  .toc-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px dotted #CCCCCC;
    font-size: 12px;
  }

  .toc-section {
    color: #1A1A1A;
  }

  .toc-page {
    color: #666666;
  }

  .section-header {
    background: #1976D2;
    color: #FFFFFF;
    padding: 12px 16px;
    margin: 24px 0 16px 0;
    font-size: 16px;
    font-weight: 600;
  }

  .equipment-card {
    border: 1px solid #E0E0E0;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    page-break-inside: avoid;
  }

  .equipment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .equipment-name {
    font-size: 16px;
    font-weight: 600;
    color: #1A1A1A;
  }

  .equipment-number {
    font-size: 12px;
    color: #666666;
  }

  .equipment-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #F0F0F0;
  }

  .equipment-stat {
    text-align: center;
  }

  .equipment-stat-value {
    font-size: 18px;
    font-weight: 600;
    color: #1976D2;
  }

  .equipment-stat-label {
    font-size: 10px;
    color: #666666;
    text-transform: uppercase;
  }

  .wo-card {
    border: 1px solid #E0E0E0;
    border-radius: 8px;
    margin-bottom: 16px;
    page-break-inside: avoid;
    overflow: hidden;
  }

  .wo-card-header {
    background: #F5F5F5;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .wo-card-number {
    font-size: 14px;
    font-weight: 600;
    color: #1A1A1A;
  }

  .wo-card-body {
    padding: 16px;
  }

  .wo-card-title {
    font-size: 14px;
    font-weight: 500;
    color: #1A1A1A;
    margin-bottom: 12px;
  }

  .wo-card-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    font-size: 12px;
  }

  .wo-card-notes {
    margin-top: 12px;
    padding: 12px;
    background: #F9F9F9;
    border-radius: 4px;
    font-size: 12px;
    white-space: pre-wrap;
  }

  .wo-signature-section {
    margin-top: 12px;
    padding: 12px;
    border: 1px dashed #E0E0E0;
    border-radius: 4px;
  }

  .wo-signature-image {
    max-width: 150px;
    max-height: 60px;
    margin-bottom: 8px;
  }

  .downtime-table {
    width: 100%;
    margin-top: 8px;
  }

  .downtime-table th,
  .downtime-table td {
    text-align: right;
  }

  .downtime-table th:first-child,
  .downtime-table td:first-child {
    text-align: left;
  }

  .downtime-highlight {
    background: #FFF3E0;
    font-weight: 600;
  }

  .audit-summary-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-top: 16px;
  }

  .audit-summary-item {
    text-align: center;
    padding: 20px;
    background: #F5F5F5;
    border-radius: 8px;
  }

  .audit-summary-value {
    font-size: 32px;
    font-weight: bold;
    color: #1976D2;
  }

  .audit-summary-label {
    font-size: 11px;
    color: #666666;
    text-transform: uppercase;
    margin-top: 4px;
  }

  .audit-warning {
    color: #E65100;
  }

  .certification-section {
    margin-top: 32px;
    padding: 24px;
    border: 2px solid #1976D2;
    border-radius: 8px;
    background: #E3F2FD;
    page-break-inside: avoid;
  }

  .certification-title {
    font-size: 16px;
    font-weight: 600;
    color: #1976D2;
    text-transform: uppercase;
    margin-bottom: 16px;
    text-align: center;
  }

  .certification-text {
    font-size: 12px;
    line-height: 1.8;
    color: #1A1A1A;
    text-align: justify;
  }

  .certification-hash {
    margin-top: 16px;
    padding: 12px;
    background: #FFFFFF;
    border-radius: 4px;
    font-family: monospace;
    font-size: 10px;
    text-align: center;
    word-break: break-all;
  }

  .certification-footer {
    margin-top: 16px;
    font-size: 10px;
    color: #666666;
    text-align: center;
  }

  .meter-flag {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 500;
  }

  .meter-flag-high {
    background: #FFF3E0;
    color: #E65100;
  }

  .meter-flag-normal {
    background: #E8F5E9;
    color: #2E7D32;
  }

  .page-break-before {
    page-break-before: always;
  }

  .page-break-after {
    page-break-after: always;
  }

  .no-break {
    page-break-inside: avoid;
  }

  @media print {
    body {
      padding: 0;
    }

    .signature-section {
      page-break-inside: avoid;
    }

    .cover-page {
      page-break-after: always;
    }

    .section-header {
      page-break-after: avoid;
    }

    .wo-card,
    .equipment-card {
      page-break-inside: avoid;
    }
  }
`;

export default pdfStyles;
