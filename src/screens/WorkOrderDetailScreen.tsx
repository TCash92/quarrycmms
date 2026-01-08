/**
 * Work Order Detail Screen
 *
 * Displays work order details and handles the completion flow
 * with timer, failure type selection, and signature capture.
 *
 * @module screens/WorkOrderDetailScreen
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useWorkOrders, useTimer, useCurrentUser, usePdf } from '@/hooks';
import {
  PriorityBadge,
  WorkOrderStatusBadge,
  FailureTypePicker,
  Timer,
  SignaturePad,
  TextInput,
  VoiceNoteRecorder,
  VoiceNotePlayer,
} from '@/components/ui';
import type { VoiceNoteResult } from '@/services/voice-notes/voice-note-service';
import { signWorkOrder } from '@/services/signature';
import { TOUCH_TARGETS, PRIORITY_LEVELS } from '@/constants';
import type WorkOrder from '@/database/models/WorkOrder';
import type { FailureType } from '@/database/models/WorkOrder';
import type { WorkOrdersStackParamList } from '@/navigation/types';

type WorkOrderDetailRouteProp = RouteProp<WorkOrdersStackParamList, 'WorkOrderDetail'>;

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
 * Format timestamp to readable date/time
 */
function formatDateTime(timestamp: number | null): string {
  if (!timestamp) return '--';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format minutes to readable duration
 */
function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '--';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

/**
 * Work order detail screen with completion flow
 */
export function WorkOrderDetailScreen(): React.ReactElement {
  const route = useRoute<WorkOrderDetailRouteProp>();
  const navigation = useNavigation();
  const { getWorkOrderById } = useWorkOrders();
  const user = useCurrentUser();
  const { isGenerating, exportWorkOrderPdf } = usePdf();

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [assetName, setAssetName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Completion form state
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [failureType, setFailureType] = useState<FailureType>('none');
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Voice note state
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [voiceNoteUri, setVoiceNoteUri] = useState<string | null>(null);
  const [voiceNoteDuration, setVoiceNoteDuration] = useState<number>(0);

  // Timer hook
  const timer = useTimer(0);

  const { workOrderId } = route.params;

  // Load work order on mount
  useEffect(() => {
    async function loadWorkOrder() {
      try {
        setIsLoading(true);
        const loadedWO = await getWorkOrderById(workOrderId);
        if (loadedWO) {
          setWorkOrder(loadedWO);
          // Update header title with WO number
          navigation.setOptions({ title: loadedWO.woNumber });

          // Load asset name
          try {
            const asset = await loadedWO.asset.fetch();
            if (asset) {
              setAssetName(`${asset.assetNumber} - ${asset.name}`);
            }
          } catch {
            setAssetName('Unknown Asset');
          }

          // If already in progress, show elapsed time from startedAt
          if (loadedWO.status === 'in_progress' && loadedWO.startedAt) {
            const elapsedMs = Date.now() - loadedWO.startedAt;
            const elapsedSeconds = Math.floor(elapsedMs / 1000);
            timer.setManualMinutes(elapsedSeconds / 60);
            timer.start();
          }
        } else {
          setError('Work order not found');
        }
      } catch (err) {
        console.error('[WorkOrderDetailScreen] Failed to load:', err);
        setError('Failed to load work order');
      } finally {
        setIsLoading(false);
      }
    }

    loadWorkOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId, getWorkOrderById, navigation]);

  // Record interaction for timer auto-pause
  const handleInteraction = useCallback(() => {
    timer.recordInteraction();
  }, [timer]);

  // Handle start work order
  const handleStartWorkOrder = useCallback(async () => {
    if (!workOrder) return;

    try {
      await workOrder.markAsStarted();
      // Refresh the work order data
      const refreshed = await getWorkOrderById(workOrderId);
      if (refreshed) {
        setWorkOrder(refreshed);
        timer.start();
      }
    } catch (err) {
      console.error('[WorkOrderDetailScreen] Failed to start:', err);
      Alert.alert('Error', 'Failed to start work order. Please try again.');
    }
  }, [workOrder, getWorkOrderById, workOrderId, timer]);

  // Handle complete work order
  const handleCompleteWorkOrder = useCallback(async () => {
    if (!workOrder || !user) return;

    // Pause timer
    timer.pause();

    // Show completion form
    setShowCompletionForm(true);
  }, [workOrder, user, timer]);

  // Handle signature capture
  const handleSignatureCapture = useCallback((data: string) => {
    setSignatureData(data);
    setShowSignaturePad(false);
  }, []);

  // Handle voice note save
  const handleVoiceNoteSave = useCallback((result: VoiceNoteResult) => {
    setVoiceNoteUri(result.uri);
    setVoiceNoteDuration(result.duration);
    setShowVoiceRecorder(false);
  }, []);

  // Handle voice note delete
  const handleVoiceNoteDelete = useCallback(() => {
    setVoiceNoteUri(null);
    setVoiceNoteDuration(0);
  }, []);

  // Submit completion
  const handleSubmitCompletion = useCallback(async () => {
    if (!workOrder || !user) return;

    if (!signatureData) {
      Alert.alert('Signature Required', 'Please add your signature to complete the work order.');
      return;
    }

    setIsSubmitting(true);

    try {
      const timeSpentMinutes = Math.ceil(timer.elapsedSeconds / 60);

      await workOrder.markAsCompleted(
        user.id,
        completionNotes.trim() || undefined,
        failureType,
        timeSpentMinutes
      );

      // Generate cryptographic signature with proper SHA-256 hash
      // This creates the canonical form, hash, and verification code
      const signatureResult = await signWorkOrder(
        workOrder,
        signatureData,
        null // meter reading - could be added later
      );

      console.log('[WorkOrderDetailScreen] Signature generated:', {
        hash: signatureResult.hash.slice(0, 16) + '...',
        verificationCode: signatureResult.verificationCode,
      });

      // Update signature and voice note data
      await workOrder.update((record: WorkOrder) => {
        record.signatureImageUrl = signatureData;
        record.signatureTimestamp = Date.now();
        // Use proper cryptographic hash from signature service
        record.signatureHash = signatureResult.hash;
        record.verificationCode = signatureResult.verificationCode;
        // Voice note
        if (voiceNoteUri) {
          record.voiceNoteUrl = voiceNoteUri;
        }
      });

      // Navigate back
      navigation.goBack();
    } catch (err) {
      console.error('[WorkOrderDetailScreen] Failed to complete:', err);
      Alert.alert('Error', 'Failed to complete work order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [workOrder, user, signatureData, completionNotes, failureType, timer, navigation, voiceNoteUri]);

  // Handle export PDF
  const handleExportPdf = useCallback(async () => {
    if (!workOrder) return;
    await exportWorkOrderPdf(workOrder);
  }, [workOrder, exportWorkOrderPdf]);

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading work order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error || !workOrder) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorTitle}>{error || 'Work order not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Completion Form Modal
  if (showCompletionForm) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flex1}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            onTouchStart={handleInteraction}
          >
            <Text style={styles.completionTitle}>Complete Work Order</Text>
            <Text style={styles.completionSubtitle}>{workOrder.woNumber}</Text>

            {/* Timer Display */}
            <Section title="Time Spent">
              <Timer
                formattedTime={timer.formattedTime}
                elapsedSeconds={timer.elapsedSeconds}
                isRunning={timer.isRunning}
                isPaused={timer.isPaused}
                pauseReason={timer.pauseReason}
                onStart={timer.start}
                onPause={timer.pause}
                onResume={timer.resume}
                onManualSet={timer.setManualMinutes}
              />
            </Section>

            {/* Failure Type */}
            <Section title="Failure Type">
              <FailureTypePicker
                value={failureType}
                onChange={setFailureType}
              />
            </Section>

            {/* Completion Notes */}
            <Section title="Completion Notes">
              <TextInput
                value={completionNotes}
                onChangeText={setCompletionNotes}
                placeholder="Describe what was done..."
                multiline
                numberOfLines={4}
                inputStyle={styles.textArea}
              />
            </Section>

            {/* Voice Note */}
            <Section title="Voice Note (optional)">
              {voiceNoteUri ? (
                <VoiceNotePlayer
                  uri={voiceNoteUri}
                  duration={voiceNoteDuration}
                  onDelete={handleVoiceNoteDelete}
                />
              ) : (
                <TouchableOpacity
                  style={styles.voiceNoteButton}
                  onPress={() => setShowVoiceRecorder(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Add voice note"
                >
                  <Text style={styles.voiceNoteButtonText}>Add Voice Note</Text>
                  <Text style={styles.voiceNoteHint}>Tap to record (max 2 min)</Text>
                </TouchableOpacity>
              )}
            </Section>

            {/* Signature */}
            <Section title="Signature">
              {signatureData ? (
                <View style={styles.signaturePreview}>
                  <Text style={styles.signatureCaptured}>Signature Captured</Text>
                  <TouchableOpacity
                    style={styles.resignButton}
                    onPress={() => {
                      setSignatureData(null);
                      setShowSignaturePad(true);
                    }}
                  >
                    <Text style={styles.resignButtonText}>Re-sign</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.signatureButton}
                  onPress={() => setShowSignaturePad(true)}
                >
                  <Text style={styles.signatureButtonText}>Tap to Sign</Text>
                </TouchableOpacity>
              )}
            </Section>
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                timer.resume();
                setShowCompletionForm(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!signatureData || isSubmitting) && styles.buttonDisabled,
              ]}
              onPress={handleSubmitCompletion}
              disabled={!signatureData || isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Submitting...' : 'Complete & Sign Off'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Signature Pad Modal */}
        <Modal
          visible={showSignaturePad}
          animationType="slide"
          onRequestClose={() => setShowSignaturePad(false)}
        >
          <SafeAreaView style={styles.signatureModal}>
            <Text style={styles.signatureModalTitle}>Sign Here</Text>
            <SignaturePad
              onCapture={handleSignatureCapture}
              onCancel={() => setShowSignaturePad(false)}
            />
          </SafeAreaView>
        </Modal>

        {/* Voice Note Recorder Modal */}
        <VoiceNoteRecorder
          visible={showVoiceRecorder}
          onClose={() => setShowVoiceRecorder(false)}
          onSave={handleVoiceNoteSave}
        />
      </SafeAreaView>
    );
  }

  // Main Detail View
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onTouchStart={handleInteraction}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <WorkOrderStatusBadge status={workOrder.status} size="medium" />
            <PriorityBadge priority={workOrder.priority} size="medium" />
          </View>
          <Text style={styles.woTitle}>{workOrder.title}</Text>
          {workOrder.isOverdue && (
            <View style={styles.overdueTag}>
              <Text style={styles.overdueText}>OVERDUE</Text>
            </View>
          )}
        </View>

        {/* Timer (when in progress) */}
        {workOrder.status === 'in_progress' && (
          <Section title="Timer">
            <Timer
              formattedTime={timer.formattedTime}
              elapsedSeconds={timer.elapsedSeconds}
              isRunning={timer.isRunning}
              isPaused={timer.isPaused}
              pauseReason={timer.pauseReason}
              onStart={timer.start}
              onPause={timer.pause}
              onResume={timer.resume}
              onManualSet={timer.setManualMinutes}
            />
          </Section>
        )}

        {/* Details */}
        <Section title="Details">
          <InfoRow label="WO Number" value={workOrder.woNumber} />
          <InfoRow label="Asset" value={assetName} />
          <InfoRow label="Priority" value={PRIORITY_LEVELS[workOrder.priority].label} />
          {workOrder.description && (
            <View style={styles.descriptionRow}>
              <Text style={styles.infoLabel}>Description</Text>
              <Text style={styles.descriptionText}>{workOrder.description}</Text>
            </View>
          )}
        </Section>

        {/* Dates */}
        <Section title="Dates">
          <InfoRow label="Created" value={formatDateTime(workOrder.createdAt ?? workOrder.localUpdatedAt)} />
          <InfoRow label="Due" value={formatDateTime(workOrder.dueDate)} />
          {workOrder.startedAt && (
            <InfoRow label="Started" value={formatDateTime(workOrder.startedAt)} />
          )}
          {workOrder.completedAt && (
            <InfoRow label="Completed" value={formatDateTime(workOrder.completedAt)} />
          )}
        </Section>

        {/* Completion Info (if completed) */}
        {workOrder.status === 'completed' && (
          <Section title="Completion">
            <InfoRow label="Completed By" value={workOrder.completedBy || '--'} />
            <InfoRow label="Time Spent" value={formatDuration(workOrder.timeSpentMinutes)} />
            <InfoRow label="Failure Type" value={workOrder.failureType || 'None'} />
            {workOrder.completionNotes && (
              <View style={styles.descriptionRow}>
                <Text style={styles.infoLabel}>Notes</Text>
                <Text style={styles.descriptionText}>{workOrder.completionNotes}</Text>
              </View>
            )}
            {workOrder.signatureTimestamp && (
              <InfoRow
                label="Signed"
                value={formatDateTime(workOrder.signatureTimestamp)}
              />
            )}
            {workOrder.verificationCode && (
              <View style={styles.verificationRow}>
                <Text style={styles.infoLabel}>Verification Code</Text>
                <Text style={styles.verificationCode}>{workOrder.verificationCode}</Text>
              </View>
            )}
          </Section>
        )}
      </ScrollView>

      {/* Action Button */}
      {workOrder.status !== 'completed' && (
        <View style={styles.buttonContainer}>
          {workOrder.status === 'open' && (
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartWorkOrder}
            >
              <Text style={styles.startButtonText}>Start Work Order</Text>
            </TouchableOpacity>
          )}
          {workOrder.status === 'in_progress' && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleCompleteWorkOrder}
            >
              <Text style={styles.completeButtonText}>Complete Work Order</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Export PDF Button (for completed work orders) */}
      {workOrder.status === 'completed' && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.exportButton, isGenerating && styles.buttonDisabled]}
            onPress={handleExportPdf}
            disabled={isGenerating}
            accessibilityRole="button"
            accessibilityLabel="Export work order as PDF"
          >
            <Text style={styles.exportButtonText}>
              {isGenerating ? 'Generating PDF...' : 'Export PDF'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  flex1: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
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
  headerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  woTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  overdueTag: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  overdueText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D32F2F',
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
  descriptionRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  descriptionText: {
    fontSize: 14,
    color: '#1A1A1A',
    marginTop: 8,
    lineHeight: 20,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    flexDirection: 'row',
    gap: 12,
  },
  startButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: TOUCH_TARGETS.COLD_WEATHER,
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#1976D2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: TOUCH_TARGETS.COLD_WEATHER,
    justifyContent: 'center',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Completion form styles
  completionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  completionSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  signaturePreview: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  signatureCaptured: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 12,
  },
  resignButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resignButtonText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  signatureButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  signatureButtonText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: TOUCH_TARGETS.MINIMUM,
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: TOUCH_TARGETS.COLD_WEATHER,
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  signatureModal: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  signatureModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 20,
  },
  voiceNoteButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  voiceNoteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4,
  },
  voiceNoteHint: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  exportButton: {
    flex: 1,
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
  verificationRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  verificationCode: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#1976D2',
    letterSpacing: 2,
    marginTop: 4,
  },
});

export default WorkOrderDetailScreen;
