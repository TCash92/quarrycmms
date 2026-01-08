/**
 * Create Work Order Screen
 *
 * Form to create a new work order with asset selection,
 * priority, description, and optional assignment.
 *
 * @module screens/CreateWorkOrderScreen
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useWorkOrders } from '@/hooks';
import { Button, TextInput, AssetPicker, PriorityPicker } from '@/components/ui';
import type { WorkOrderPriority } from '@/database/models/WorkOrder';
import type { WorkOrdersStackParamList } from '@/navigation/types';

type CreateWorkOrderRouteProp = RouteProp<WorkOrdersStackParamList, 'CreateWorkOrder'>;

/**
 * Form field label component
 */
function FieldLabel({
  label,
  required = false,
}: {
  label: string;
  required?: boolean;
}): React.ReactElement {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
  );
}

/**
 * Create work order form screen
 */
export function CreateWorkOrderScreen(): React.ReactElement {
  const navigation = useNavigation();
  const route = useRoute<CreateWorkOrderRouteProp>();
  const { createWorkOrder } = useWorkOrders();

  // Form state
  const [assetId, setAssetId] = useState<string | null>(route.params?.assetId ?? null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<WorkOrderPriority>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation
  const isValid = assetId !== null && title.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (!isValid || !assetId) {
      Alert.alert('Missing Information', 'Please select an asset and enter a title.');
      return;
    }

    setIsSubmitting(true);

    try {
      const trimmedDescription = description.trim();
      await createWorkOrder({
        assetId,
        title: title.trim(),
        ...(trimmedDescription ? { description: trimmedDescription } : {}),
        priority,
      });

      // Navigate back to list
      navigation.goBack();
    } catch (error) {
      console.error('[CreateWorkOrderScreen] Failed to create:', error);
      Alert.alert('Error', 'Failed to create work order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [isValid, assetId, title, description, priority, createWorkOrder, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Asset Selection */}
          <View style={styles.field}>
            <FieldLabel label="Asset" required />
            <AssetPicker
              value={assetId}
              onChange={setAssetId}
              placeholder="Select asset..."
              testID="create-wo-asset-picker"
            />
          </View>

          {/* Title */}
          <View style={styles.field}>
            <FieldLabel label="Title" required />
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Enter work order title"
              maxLength={100}
              testID="create-wo-title-input"
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <FieldLabel label="Description" />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Enter description (optional)"
              multiline
              numberOfLines={4}
              inputStyle={styles.textArea}
              testID="create-wo-description-input"
            />
          </View>

          {/* Priority */}
          <View style={styles.field}>
            <FieldLabel label="Priority" required />
            <PriorityPicker
              value={priority}
              onChange={setPriority}
              testID="create-wo-priority-picker"
            />
          </View>

          {/* Info Text */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              The work order will be created with "Open" status and assigned to you. You can change
              the assignment later.
            </Text>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <Button
            title={isSubmitting ? 'Creating...' : 'Create Work Order'}
            onPress={handleSubmit}
            disabled={!isValid || isSubmitting}
            testID="create-wo-submit-button"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  field: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  required: {
    color: '#D32F2F',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  infoContainer: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
});

export default CreateWorkOrderScreen;
