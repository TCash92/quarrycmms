/**
 * Quick Log Screen
 *
 * Streamlined 3-step flow to capture maintenance events in seconds.
 * "Capture now, enrich later" - accepts imperfect data instantly.
 *
 * Flow:
 * 1. Select equipment (recent list or asset picker)
 * 2. Tap action type (Emergency/Repair, Maintenance/PM, Inspection)
 * 3. Add optional quick note
 * 4. Tap "Log It"
 *
 * @module screens/QuickLogScreen
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
import { useQuickLog, useRecentAssets } from '@/hooks';
import {
  Button,
  TextInput,
  AssetPicker,
  ActionTypePicker,
  RecentAssetsList,
} from '@/components/ui';
import { QuickLogActionType } from '@/constants';

/**
 * Section header component
 */
function SectionHeader({ title }: { title: string }): React.ReactElement {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

/**
 * Quick Log screen for rapid maintenance event capture
 */
export function QuickLogScreen(): React.ReactElement {
  const { createQuickLog, isSubmitting, unenrichedCount } = useQuickLog();
  const { recentAssets, isLoading: isLoadingRecent, refresh: refreshRecent } = useRecentAssets();

  // Form state
  const [assetId, setAssetId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<QuickLogActionType | null>(null);
  const [notes, setNotes] = useState('');

  // Validation
  const isValid = assetId !== null && actionType !== null;

  const handleAssetSelect = useCallback((id: string) => {
    setAssetId(id);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isValid || !assetId || !actionType) {
      Alert.alert('Missing Information', 'Please select an asset and action type.');
      return;
    }

    try {
      await createQuickLog({
        assetId,
        actionType,
        notes: notes.trim() || undefined,
      });

      // Reset form for rapid entry
      setAssetId(null);
      setActionType(null);
      setNotes('');

      // Refresh recent assets to include the new work order's asset
      refreshRecent();

      // Show success feedback
      Alert.alert('Logged!', 'Your Quick Log has been saved. You can add more details later.', [
        { text: 'OK' },
      ]);
    } catch (error) {
      console.error('[QuickLogScreen] Failed to create:', error);
      Alert.alert('Error', 'Failed to save Quick Log. Please try again.');
    }
  }, [isValid, assetId, actionType, notes, createQuickLog, refreshRecent]);

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
          {/* Unenriched count badge */}
          {unenrichedCount > 0 && (
            <View style={styles.unenrichedBadge} testID="quick-log-unenriched-badge">
              <Text style={styles.unenrichedText}>
                {unenrichedCount} Quick Log{unenrichedCount !== 1 ? 's' : ''} need
                {unenrichedCount === 1 ? 's' : ''} more detail
              </Text>
            </View>
          )}

          {/* Recently Worked On */}
          <View style={styles.section}>
            <SectionHeader title="Recently Worked On" />
            <RecentAssetsList
              assets={recentAssets}
              selectedId={assetId}
              onSelect={handleAssetSelect}
              isLoading={isLoadingRecent}
              testID="quick-log-recent-assets"
            />
          </View>

          {/* Or Select Asset */}
          <View style={styles.section}>
            <SectionHeader title="Or Select Asset" />
            <AssetPicker
              value={assetId}
              onChange={setAssetId}
              placeholder="Search all assets..."
              testID="quick-log-asset-picker"
            />
          </View>

          {/* What did you do? */}
          <View style={styles.section}>
            <SectionHeader title="What did you do?" />
            <ActionTypePicker
              value={actionType}
              onChange={setActionType}
              testID="quick-log-action"
            />
          </View>

          {/* Quick Note */}
          <View style={styles.section}>
            <SectionHeader title="Quick Note (optional)" />
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="What happened? (100 chars max)"
              maxLength={100}
              testID="quick-log-note-input"
            />
            <Text style={styles.charCount}>{notes.length}/100</Text>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <Button
            title={isSubmitting ? 'Saving...' : 'Log It'}
            onPress={handleSubmit}
            disabled={!isValid || isSubmitting}
            testID="quick-log-submit-button"
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
  unenrichedBadge: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  unenrichedText: {
    fontSize: 14,
    color: '#E65100',
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  charCount: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'right',
    marginTop: 4,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
});

export default QuickLogScreen;
