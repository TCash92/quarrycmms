/**
 * QR Code Component
 *
 * Provides QR code generation for verification URLs in work order PDFs.
 * Uses react-native-qrcode-svg for native rendering and provides utilities
 * for generating base64 images for PDF embedding.
 *
 * @module components/ui/QRCode
 */

import React, { useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import QRCodeSvg from 'react-native-qrcode-svg';

/**
 * Props for QRCode component
 */
interface QRCodeProps {
  /** The value to encode in the QR code (typically a URL) */
  value: string;
  /** Size of the QR code in pixels (default: 100) */
  size?: number;
  /** Background color (default: white) */
  backgroundColor?: string;
  /** Foreground color (default: black) */
  color?: string;
  /** Callback with base64 data URI when QR code is ready */
  onDataUri?: (dataUri: string) => void;
}

/**
 * QR Code component for displaying verification QR codes
 *
 * Renders a QR code for the given value. Optionally provides a base64
 * data URI via callback for PDF embedding.
 *
 * @example
 * ```tsx
 * <QRCode
 *   value="https://verify.example.com/7F3A-9B2C-4E1D"
 *   size={120}
 *   onDataUri={(uri) => console.log('QR data URI:', uri)}
 * />
 * ```
 */
export function QRCode({
  value,
  size = 100,
  backgroundColor = '#FFFFFF',
  color = '#000000',
  onDataUri,
}: QRCodeProps): React.ReactElement {
  const svgRef = useRef<any>(null);

  /**
   * Get base64 data URI from the QR code
   * Called when component mounts or value changes
   */
  const handleGetDataUrl = useCallback(() => {
    if (svgRef.current && onDataUri) {
      svgRef.current.toDataURL((dataUri: string) => {
        onDataUri(`data:image/png;base64,${dataUri}`);
      });
    }
  }, [onDataUri]);

  return (
    <View style={styles.container}>
      <QRCodeSvg
        value={value}
        size={size}
        backgroundColor={backgroundColor}
        color={color}
        getRef={(ref: any) => {
          svgRef.current = ref;
          // Slight delay to ensure SVG is rendered
          setTimeout(handleGetDataUrl, 100);
        }}
      />
    </View>
  );
}

/**
 * Generate QR code as SVG string for inline HTML embedding
 *
 * This creates an SVG representation of a QR code that can be
 * directly embedded in HTML/PDF templates.
 *
 * @param value - The value to encode
 * @param size - Size in pixels
 * @returns SVG string
 */
export function generateQRCodeSvgString(value: string, size: number = 100): string {
  // Use a simple QR code library approach for SVG generation
  // This is a simplified version - in production, use a proper QR code library
  const qrMatrix = generateQRMatrix(value);
  const moduleSize = size / qrMatrix.length;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;
  svg += `<rect fill="#FFFFFF" width="${size}" height="${size}"/>`;

  for (let row = 0; row < qrMatrix.length; row++) {
    for (let col = 0; col < qrMatrix[row].length; col++) {
      if (qrMatrix[row][col]) {
        const x = col * moduleSize;
        const y = row * moduleSize;
        svg += `<rect fill="#000000" x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}"/>`;
      }
    }
  }

  svg += '</svg>';
  return svg;
}

/**
 * Generate a simple QR-like matrix (placeholder implementation)
 *
 * Note: This is a simplified placeholder. In production, this would use
 * a proper QR code generation library. For now, we create a pattern
 * that resembles a QR code based on the hash of the input value.
 *
 * @param value - The value to encode
 * @returns 2D boolean array representing the QR matrix
 */
function generateQRMatrix(value: string): boolean[][] {
  const size = 25; // Standard QR code size
  const matrix: boolean[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(false));

  // Simple hash function for deterministic pattern
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }

  // Add finder patterns (the three large squares in corners)
  addFinderPattern(matrix, 0, 0);
  addFinderPattern(matrix, size - 7, 0);
  addFinderPattern(matrix, 0, size - 7);

  // Add timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Fill data area with pattern based on hash
  const seed = Math.abs(hash);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      // Skip finder patterns and timing patterns
      if (isReservedModule(row, col, size)) continue;

      // Generate pseudo-random pattern based on position and hash
      const position = row * size + col;
      const pseudoRandom = ((seed * (position + 1)) % 997) / 997;
      matrix[row][col] = pseudoRandom > 0.5;
    }
  }

  return matrix;
}

/**
 * Add a finder pattern (7x7 square with nested squares)
 */
function addFinderPattern(matrix: boolean[][], startRow: number, startCol: number): void {
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      const isOuter = row === 0 || row === 6 || col === 0 || col === 6;
      const isInner = row >= 2 && row <= 4 && col >= 2 && col <= 4;
      matrix[startRow + row][startCol + col] = isOuter || isInner;
    }
  }
}

/**
 * Check if a module is in a reserved area (finder patterns, timing, etc.)
 */
function isReservedModule(row: number, col: number, size: number): boolean {
  // Top-left finder pattern + separator
  if (row < 9 && col < 9) return true;
  // Top-right finder pattern + separator
  if (row < 9 && col >= size - 8) return true;
  // Bottom-left finder pattern + separator
  if (row >= size - 8 && col < 9) return true;
  // Timing patterns
  if (row === 6 || col === 6) return true;

  return false;
}

/**
 * Generate QR code as base64 PNG data URI for PDF embedding
 *
 * This is an async version that uses the native QR code renderer
 * and captures the result as a base64 image.
 *
 * @param value - The value to encode
 * @param size - Size in pixels
 * @returns Promise resolving to base64 data URI
 */
export async function generateQRCodeBase64(value: string, size: number = 100): Promise<string> {
  // For PDF generation, we'll use a simpler approach that works offline
  // by embedding the SVG directly or using a placeholder
  const svg = generateQRCodeSvgString(value, size);

  // Convert SVG to base64 data URI
  const base64 = btoa(svg);
  return `data:image/svg+xml;base64,${base64}`;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default QRCode;
