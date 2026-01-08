/**
 * Asset Detail Screen
 *
 * Displays detailed information about a single asset including
 * status, meter readings, and related work orders.
 *
 * @module screens/AssetDetailScreen
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useAssets, usePdf } from '@/hooks';
import { StatusBadge, MeterReadingInput } from '@/components/ui';
import { TOUCH_TARGETS } from '@/constants';
import type Asset from '@/database/models/Asset';
import type { AssetsStackParamList } from '@/navigation/types';

type AssetDetailRouteProp = RouteProp<AssetsStackParamList, 'AssetDetail'>;

/**
 * Section component for grouping related information
 */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

/**
 * Info row component for displaying label/value pairs
 */
function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}): React.ReactElement | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
    </View>
  );
}

/**
 * Asset detail screen showing all asset information
 */
export function AssetDetailScreen(): React.ReactElement {
  const route = useRoute<AssetDetailRouteProp>();
  const navigation = useNavigation();
  const { getAssetById } = useAssets();
  const { isGenerating, exportAssetHistoryPdf } = usePdf();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { assetId } = route.params;

  // Handle export asset history
  const handleExportHistory = useCallback(async () => {
    if (!asset) return;
    await exportAssetHistoryPdf(asset);
  }, [asset, exportAssetHistoryPdf]);

  // Load asset on mount
  useEffect(() => {
    async function loadAsset() {
      try {
        setIsLoading(true);
        const loadedAsset = await getAssetById(assetId);
        if (loadedAsset) {
          setAsset(loadedAsset);
          // Update header title with asset number
          navigation.setOptions({ title: loadedAsset.assetNumber });
        } else {
          setError('Asset not found');
        }
      } catch (err) {
        console.error('[AssetDetailScreen] Failed to load asset:', err);
        setError('Failed to load asset');
      } finally {
        setIsLoading(false);
      }
    }

    loadAsset();
  }, [assetId, getAssetById, navigation]);

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading asset...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error || !asset) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>{error || 'Asset not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Asset Header */}
        <View style={styles.header}>
          <Text style={styles.assetName}>{asset.name}</Text>
          <View style={styles.statusRow}>
            <StatusBadge status={asset.status} size="medium" testID="asset-detail-status" />
          </View>
        </View>

        {/* Basic Information */}
        <Section title="Information">
          <InfoRow label="Asset Number" value={asset.assetNumber} />
          <InfoRow label="Category" value={asset.category} />
          <InfoRow label="Location" value={asset.locationDescription} />
        </Section>

        {/* Meter Readings (if asset has meter) */}
        {asset.hasMeter && (
          <Section title="Meter Reading">
            <View style={styles.meterCard} testID="asset-detail-meter-reading">
              <View style={styles.meterHeader}>
                <Text style={styles.meterType}>{asset.meterType}</Text>
                <Text style={styles.meterUnit}>{asset.meterUnit}</Text>
              </View>
              <Text style={styles.meterValue}>
                {asset.meterCurrentReading !== null
                  ? asset.meterCurrentReading.toLocaleString()
                  : '--'}
              </Text>
              <Text style={styles.meterLabel}>Current Reading</Text>
            </View>
            {/* Record New Reading */}
            <View style={styles.meterInputSection}>
              <MeterReadingInput
                assetId={asset.id}
                meterType={asset.meterType || 'Hours'}
                meterUnit={asset.meterUnit || undefined}
                testIDInput="asset-detail-meter-input"
                testIDButton="asset-detail-record-button"
              />
            </View>
          </Section>
        )}

        {/* Description */}
        {asset.description && (
          <Section title="Description">
            <Text style={styles.description}>{asset.description}</Text>
          </Section>
        )}

        {/* Recent Work Orders - Placeholder */}
        <Section title="Recent Work Orders">
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Work orders will appear here in a future update
            </Text>
          </View>
        </Section>
      </ScrollView>

      {/* Export History Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.exportButton, isGenerating && styles.buttonDisabled]}
          onPress={handleExportHistory}
          disabled={isGenerating}
          accessibilityRole="button"
          accessibilityLabel="Export asset history as PDF"
        >
          <Text style={styles.exportButtonText}>
            {isGenerating ? 'Generating PDF...' : 'Export History'}
          </Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  assetName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  meterCard: {
    alignItems: 'center',
  },
  meterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  meterType: {
    fontSize: 14,
    color: '#666666',
  },
  meterUnit: {
    fontSize: 14,
    color: '#999999',
    marginLeft: 8,
  },
  meterValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 4,
  },
  meterLabel: {
    fontSize: 12,
    color: '#666666',
  },
  meterInputSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  description: {
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 22,
  },
  placeholder: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  exportButton: {
    backgroundColor: '#1976D2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: TOUCH_TARGETS.COLD_WEATHER,
    justifyContent: 'center',
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#BDBDBD',
  },
});

export default AssetDetailScreen;
