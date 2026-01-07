import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAssets } from '@/hooks';
import { StatusBadge } from './StatusBadge';
import { TOUCH_TARGETS } from '@/constants';
import type Asset from '@/database/models/Asset';

interface AssetPickerProps {
  value: string | null;
  onChange: (assetId: string) => void;
  placeholder?: string;
}

/**
 * Asset selection modal component
 * Allows searching and selecting an asset for work orders
 */
export function AssetPicker({
  value,
  onChange,
  placeholder = 'Select asset...',
}: AssetPickerProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const { assets, searchQuery, setSearchQuery, getAssetById } = useAssets();

  // Load the selected asset when value changes
  useEffect(() => {
    if (value) {
      getAssetById(value).then(asset => {
        setSelectedAsset(asset);
      });
    } else {
      setSelectedAsset(null);
    }
  }, [value, getAssetById]);

  const handleSelect = useCallback((asset: Asset) => {
    onChange(asset.id);
    setSelectedAsset(asset);
    setIsOpen(false);
    setSearchQuery('');
  }, [onChange, setSearchQuery]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setSearchQuery('');
  }, [setSearchQuery]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, [setSearchQuery]);

  const renderAssetItem = useCallback(({ item }: { item: Asset }) => (
    <TouchableOpacity
      style={styles.assetItem}
      onPress={() => handleSelect(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.assetNumber}, ${item.name}`}
    >
      <View style={styles.assetItemContent}>
        <Text style={styles.assetNumber}>{item.assetNumber}</Text>
        <Text style={styles.assetName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.assetCategory}>{item.category}</Text>
      </View>
      <StatusBadge status={item.status} size="small" />
    </TouchableOpacity>
  ), [handleSelect]);

  return (
    <View>
      <TouchableOpacity
        style={styles.picker}
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel={selectedAsset ? `Selected: ${selectedAsset.assetNumber}` : placeholder}
      >
        {selectedAsset ? (
          <View style={styles.selectedValue}>
            <Text style={styles.selectedNumber}>{selectedAsset.assetNumber}</Text>
            <Text style={styles.selectedName} numberOfLines={1}>
              {selectedAsset.name}
            </Text>
          </View>
        ) : (
          <Text style={styles.placeholder}>{placeholder}</Text>
        )}
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Asset</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search assets..."
              placeholderTextColor="#999999"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <FlatList
            data={assets}
            renderItem={renderAssetItem}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No assets found</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    minHeight: TOUCH_TARGETS.COLD_WEATHER,
  },
  selectedValue: {
    flex: 1,
    paddingVertical: 12,
  },
  selectedNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  selectedName: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  placeholder: {
    fontSize: 16,
    color: '#999999',
    paddingVertical: 16,
  },
  chevron: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 8,
  },
  modal: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#1976D2',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1A1A',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  assetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    minHeight: TOUCH_TARGETS.MINIMUM,
  },
  assetItemContent: {
    flex: 1,
    marginRight: 12,
  },
  assetNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  assetName: {
    fontSize: 16,
    color: '#1A1A1A',
    marginVertical: 2,
  },
  assetCategory: {
    fontSize: 12,
    color: '#666666',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
  },
});

export default AssetPicker;
