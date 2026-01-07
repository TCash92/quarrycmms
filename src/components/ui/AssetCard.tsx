import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type Asset from '@/database/models/Asset';
import { StatusBadge } from './StatusBadge';
import { TOUCH_TARGETS } from '@/constants';

interface AssetCardProps {
  asset: Asset;
  onPress: () => void;
}

/**
 * Card component for displaying an asset in a list
 * Shows asset number, name, category, and status badge
 */
export function AssetCard({ asset, onPress }: AssetCardProps): React.ReactElement {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${asset.assetNumber}, ${asset.name}, ${asset.status}`}
      accessibilityHint="Double tap to view asset details"
    >
      <View style={styles.header}>
        <Text style={styles.assetNumber}>{asset.assetNumber}</Text>
        <StatusBadge status={asset.status} size="small" />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {asset.name}
      </Text>
      <View style={styles.footer}>
        <Text style={styles.category}>{asset.category}</Text>
        {asset.locationDescription && (
          <Text style={styles.location} numberOfLines={1}>
            {asset.locationDescription}
          </Text>
        )}
      </View>
      {asset.hasMeter && asset.meterCurrentReading !== null && (
        <View style={styles.meterRow}>
          <Text style={styles.meterLabel}>{asset.meterType}:</Text>
          <Text style={styles.meterValue}>
            {asset.meterCurrentReading.toLocaleString()} {asset.meterUnit}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    minHeight: TOUCH_TARGETS.MINIMUM * 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  assetNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    fontSize: 14,
    color: '#666666',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  location: {
    fontSize: 14,
    color: '#999999',
    marginLeft: 8,
    flex: 1,
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  meterLabel: {
    fontSize: 12,
    color: '#666666',
    marginRight: 4,
  },
  meterValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});

export default AssetCard;
