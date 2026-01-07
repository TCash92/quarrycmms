/**
 * Recent Assets List Component
 *
 * Horizontal scrolling list of recently worked assets for quick selection.
 * Uses 56dp touch targets for cold weather / gloved operation.
 *
 * @module components/ui/RecentAssetsList
 */

import React from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { TOUCH_TARGETS } from '@/constants';
import type Asset from '@/database/models/Asset';

interface RecentAssetsListProps {
  /** List of recent assets */
  assets: Asset[];
  /** Currently selected asset ID */
  selectedId: string | null;
  /** Callback when an asset is selected */
  onSelect: (assetId: string) => void;
  /** Whether assets are loading */
  isLoading: boolean;
}

/**
 * Horizontal scrolling list of recently worked assets
 *
 * Shows asset number and name in a compact card format.
 * Highlights the selected asset with a border.
 */
export function RecentAssetsList({
  assets,
  selectedId,
  onSelect,
  isLoading,
}: RecentAssetsListProps): React.ReactElement {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#1976D2" />
        <Text style={styles.loadingText}>Loading recent assets...</Text>
      </View>
    );
  }

  if (assets.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No recent assets</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Asset }) => {
    const isSelected = item.id === selectedId;

    return (
      <TouchableOpacity
        style={[
          styles.assetCard,
          isSelected && styles.assetCardSelected,
        ]}
        onPress={() => onSelect(item.id)}
        activeOpacity={0.8}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`Select ${item.assetNumber} ${item.name}`}
      >
        <Text style={[styles.assetNumber, isSelected && styles.textSelected]}>
          {item.assetNumber}
        </Text>
        <Text
          style={[styles.assetName, isSelected && styles.textSelected]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={assets}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
  },
  emptyContainer: {
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9E9E9E',
    fontStyle: 'italic',
  },
  listContent: {
    paddingVertical: 4,
  },
  separator: {
    width: 12,
  },
  assetCard: {
    minHeight: TOUCH_TARGETS.COLD_WEATHER,
    minWidth: 120,
    maxWidth: 160,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  assetCardSelected: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  assetNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  assetName: {
    fontSize: 13,
    color: '#666666',
  },
  textSelected: {
    color: '#FFFFFF',
  },
});

export default RecentAssetsList;
