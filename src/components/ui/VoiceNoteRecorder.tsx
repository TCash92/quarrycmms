/**
 * Voice Note Recorder Component
 *
 * Modal component for recording voice notes with visual feedback.
 * Shows recording duration and waveform visualization.
 *
 * @module components/ui/VoiceNoteRecorder
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVoiceNote } from '@/hooks';
import { TOUCH_TARGETS } from '@/constants';
import type { VoiceNoteResult } from '@/services/voice-notes/voice-note-service';

interface VoiceNoteRecorderProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when recording is saved */
  onSave: (result: VoiceNoteResult) => void;
  /** Maximum recording duration in milliseconds (default 120000 = 2 min) */
  maxDuration?: number;
}

/** Default max duration: 2 minutes */
const DEFAULT_MAX_DURATION = 120000;

/**
 * Format milliseconds to MM:SS display
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Waveform visualization component
 */
function Waveform({ level, isRecording }: { level: number; isRecording: boolean }): React.ReactElement {
  // Normalize level from -160..0 dB to 0..1
  const normalizedLevel = Math.max(0, Math.min(1, (level + 160) / 160));

  // Generate bar heights based on current level
  const bars = Array.from({ length: 10 }, (_, i) => {
    const baseHeight = 8;
    const maxHeight = 40;

    if (!isRecording) {
      return baseHeight;
    }

    // Create a wave pattern with some variation
    const variation = Math.sin((i / 10) * Math.PI) * 0.5 + 0.5;
    const height = baseHeight + (maxHeight - baseHeight) * normalizedLevel * variation;
    return Math.max(baseHeight, height);
  });

  return (
    <View style={styles.waveformContainer}>
      {bars.map((height, index) => (
        <View
          key={index}
          style={[
            styles.waveformBar,
            { height },
            isRecording && styles.waveformBarActive,
          ]}
        />
      ))}
    </View>
  );
}

/**
 * Voice Note Recorder modal component
 *
 * Provides a recording interface with:
 * - Start/Stop recording controls
 * - Duration display with max limit
 * - Waveform visualization
 * - Cancel and Save actions
 */
export function VoiceNoteRecorder({
  visible,
  onClose,
  onSave,
  maxDuration = DEFAULT_MAX_DURATION,
}: VoiceNoteRecorderProps): React.ReactElement {
  const {
    isRecording,
    recordingDuration,
    recordingLevel,
    startRecording,
    stopRecording,
    cancelRecording,
    hasPermission,
    requestPermission,
    error,
    clearError,
  } = useVoiceNote();

  // Check permission when modal opens
  useEffect(() => {
    if (visible && !hasPermission) {
      requestPermission();
    }
  }, [visible, hasPermission, requestPermission]);

  // Auto-stop at max duration
  useEffect(() => {
    if (recordingDuration >= maxDuration && isRecording) {
      handleStopRecording();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingDuration, maxDuration, isRecording]);

  // Show error alert
  useEffect(() => {
    if (error) {
      Alert.alert('Recording Error', error, [
        { text: 'OK', onPress: clearError },
      ]);
    }
  }, [error, clearError]);

  // Handle start recording
  const handleStartRecording = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Microphone permission is required to record voice notes.'
        );
        return;
      }
    }
    await startRecording();
  }, [hasPermission, requestPermission, startRecording]);

  // Handle stop recording
  const handleStopRecording = useCallback(async () => {
    const result = await stopRecording();
    if (result) {
      onSave(result);
      onClose();
    }
  }, [stopRecording, onSave, onClose]);

  // Handle cancel
  const handleCancel = useCallback(async () => {
    await cancelRecording();
    onClose();
  }, [cancelRecording, onClose]);

  const remainingTime = maxDuration - recordingDuration;
  const isNearLimit = remainingTime < 10000; // Less than 10 seconds

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleCancel}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>Record Voice Note</Text>
          <Text style={styles.subtitle}>Max 2 minutes</Text>

          {/* Waveform Visualization */}
          <View style={styles.waveformSection}>
            <Waveform level={recordingLevel} isRecording={isRecording} />
          </View>

          {/* Duration Counter */}
          <View style={styles.durationContainer}>
            <Text
              style={[
                styles.duration,
                isNearLimit && styles.durationWarning,
              ]}
            >
              {formatDuration(recordingDuration)}
            </Text>
            <Text style={styles.maxDuration}>
              / {formatDuration(maxDuration)}
            </Text>
          </View>

          {/* Record/Stop Button */}
          <View style={styles.recordButtonContainer}>
            {isRecording ? (
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStopRecording}
                accessibilityRole="button"
                accessibilityLabel="Stop recording"
              >
                <View style={styles.stopIcon} />
                <Text style={styles.stopButtonText}>Stop</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.recordButton}
                onPress={handleStartRecording}
                accessibilityRole="button"
                accessibilityLabel="Start recording"
              >
                <View style={styles.recordIcon} />
                <Text style={styles.recordButtonText}>Start Recording</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel recording"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          {isRecording && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleStopRecording}
              accessibilityRole="button"
              accessibilityLabel="Save recording"
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
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
    marginBottom: 48,
  },
  waveformSection: {
    marginBottom: 32,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    gap: 6,
  },
  waveformBar: {
    width: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  waveformBarActive: {
    backgroundColor: '#1976D2',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 48,
  },
  duration: {
    fontSize: 48,
    fontWeight: '300',
    color: '#1A1A1A',
    fontVariant: ['tabular-nums'],
  },
  durationWarning: {
    color: '#D32F2F',
  },
  maxDuration: {
    fontSize: 24,
    color: '#9E9E9E',
    marginLeft: 8,
    fontVariant: ['tabular-nums'],
  },
  recordButtonContainer: {
    alignItems: 'center',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    borderRadius: 32,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: TOUCH_TARGETS.COLD_WEATHER,
    gap: 12,
  },
  recordIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  recordButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    borderRadius: 32,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: TOUCH_TARGETS.COLD_WEATHER,
    gap: 12,
  },
  stopIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  stopButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: TOUCH_TARGETS.MINIMUM,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: TOUCH_TARGETS.MINIMUM,
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default VoiceNoteRecorder;
