/**
 * Compliance Report Screen
 *
 * Allows users to generate comprehensive compliance package PDFs
 * for audits and regulatory reporting.
 *
 * @module screens/ComplianceReportScreen
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePdf } from '@/hooks';
import { Button } from '@/components/ui';
import { TOUCH_TARGETS } from '@/constants';

/**
 * Date range preset options
 */
type DatePreset = '7days' | '30days' | '90days' | '6months' | '1year' | 'custom';

/**
 * Get date range from preset
 */
function getDateRangeFromPreset(preset: DatePreset): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (preset) {
    case '7days':
      start.setDate(start.getDate() - 7);
      break;
    case '30days':
      start.setDate(start.getDate() - 30);
      break;
    case '90days':
      start.setDate(start.getDate() - 90);
      break;
    case '6months':
      start.setMonth(start.getMonth() - 6);
      break;
    case '1year':
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'custom':
      // Default to last 30 days for custom
      start.setDate(start.getDate() - 30);
      break;
  }

  return { start, end };
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Date preset button component
 */
function PresetButton({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string;
  value: DatePreset;
  selected: boolean;
  onSelect: (preset: DatePreset) => void;
}): React.ReactElement {
  return (
    <TouchableOpacity
      style={[styles.presetButton, selected && styles.presetButtonSelected]}
      onPress={() => onSelect(value)}
      accessibilityRole="button"
      accessibilityLabel={`Select ${label} date range`}
      accessibilityState={{ selected }}
    >
      <Text
        style={[styles.presetButtonText, selected && styles.presetButtonTextSelected]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Compliance Report Screen
 */
export function ComplianceReportScreen(): React.ReactElement {
  const { isGenerating, error, progress, exportCompliancePackage, clearError } =
    usePdf();

  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('30days');
  const dateRange = getDateRangeFromPreset(selectedPreset);

  /**
   * Handle preset selection
   */
  const handlePresetSelect = useCallback((preset: DatePreset) => {
    setSelectedPreset(preset);
    clearError();
  }, [clearError]);

  /**
   * Handle generate button press
   */
  const handleGenerate = useCallback(async () => {
    await exportCompliancePackage(dateRange);
  }, [exportCompliancePackage, dateRange]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Compliance Package</Text>
          <Text style={styles.subtitle}>
            Generate a comprehensive PDF report for audits and regulatory compliance.
          </Text>
        </View>

        {/* Date Range Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Period</Text>
          <View style={styles.presetGrid}>
            <PresetButton
              label="Last 7 Days"
              value="7days"
              selected={selectedPreset === '7days'}
              onSelect={handlePresetSelect}
            />
            <PresetButton
              label="Last 30 Days"
              value="30days"
              selected={selectedPreset === '30days'}
              onSelect={handlePresetSelect}
            />
            <PresetButton
              label="Last 90 Days"
              value="90days"
              selected={selectedPreset === '90days'}
              onSelect={handlePresetSelect}
            />
            <PresetButton
              label="Last 6 Months"
              value="6months"
              selected={selectedPreset === '6months'}
              onSelect={handlePresetSelect}
            />
            <PresetButton
              label="Last Year"
              value="1year"
              selected={selectedPreset === '1year'}
              onSelect={handlePresetSelect}
            />
          </View>
        </View>

        {/* Selected Date Range Display */}
        <View style={styles.dateRangeCard}>
          <View style={styles.dateRangeRow}>
            <Text style={styles.dateRangeLabel}>From</Text>
            <Text style={styles.dateRangeValue}>{formatDate(dateRange.start)}</Text>
          </View>
          <View style={styles.dateRangeDivider} />
          <View style={styles.dateRangeRow}>
            <Text style={styles.dateRangeLabel}>To</Text>
            <Text style={styles.dateRangeValue}>{formatDate(dateRange.end)}</Text>
          </View>
        </View>

        {/* Package Contents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Package Contents</Text>
          <View style={styles.contentsCard}>
            <View style={styles.contentItem}>
              <Text style={styles.contentNumber}>1</Text>
              <Text style={styles.contentText}>Cover Page & Table of Contents</Text>
            </View>
            <View style={styles.contentItem}>
              <Text style={styles.contentNumber}>2</Text>
              <Text style={styles.contentText}>Equipment Summary</Text>
            </View>
            <View style={styles.contentItem}>
              <Text style={styles.contentNumber}>3</Text>
              <Text style={styles.contentText}>Work Order Details with Signatures</Text>
            </View>
            <View style={styles.contentItem}>
              <Text style={styles.contentNumber}>4</Text>
              <Text style={styles.contentText}>Meter Reading History</Text>
            </View>
            <View style={styles.contentItem}>
              <Text style={styles.contentNumber}>5</Text>
              <Text style={styles.contentText}>Downtime Summary</Text>
            </View>
            <View style={styles.contentItem}>
              <Text style={styles.contentNumber}>6</Text>
              <Text style={styles.contentText}>Audit Trail Summary</Text>
            </View>
            <View style={styles.contentItem}>
              <Text style={styles.contentNumber}>7</Text>
              <Text style={styles.contentText}>Certification & Package Hash</Text>
            </View>
          </View>
        </View>

        {/* Generation Progress */}
        {isGenerating && (
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              Generating package... {progress}%
            </Text>
          </View>
        )}

        {/* Error Display */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Text style={styles.errorDismiss}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Generate Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.generateButton, isGenerating && styles.buttonDisabled]}
          onPress={handleGenerate}
          disabled={isGenerating}
          accessibilityRole="button"
          accessibilityLabel="Generate compliance package PDF"
        >
          {isGenerating ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.generateButtonText}>Generating...</Text>
            </View>
          ) : (
            <Text style={styles.generateButtonText}>Generate Package</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  presetButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    margin: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: TOUCH_TARGETS.MINIMUM,
    justifyContent: 'center',
  },
  presetButtonSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2',
  },
  presetButtonText: {
    fontSize: 14,
    color: '#666666',
  },
  presetButtonTextSelected: {
    color: '#1976D2',
    fontWeight: '600',
  },
  dateRangeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateRangeRow: {
    flex: 1,
    alignItems: 'center',
  },
  dateRangeLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  dateRangeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  dateRangeDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  contentsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contentNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  contentText: {
    fontSize: 14,
    color: '#1A1A1A',
    flex: 1,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1976D2',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#C62828',
    flex: 1,
  },
  errorDismiss: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
    marginLeft: 12,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  generateButton: {
    backgroundColor: '#1976D2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: TOUCH_TARGETS.COLD_WEATHER,
    justifyContent: 'center',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default ComplianceReportScreen;
