/**
 * Timer Component
 *
 * Work order timer display with start/pause/resume controls.
 * Shows elapsed time and handles auto-pause notifications.
 *
 * @module components/ui/Timer
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { TOUCH_TARGETS } from '@/constants';
import type { PauseReason } from '@/hooks/useTimer';

interface TimerProps {
  /** Formatted time string (HH:MM:SS or MM:SS) */
  formattedTime: string;
  /** Elapsed seconds (for calculations) */
  elapsedSeconds: number;
  /** Whether timer is running */
  isRunning: boolean;
  /** Whether timer is paused */
  isPaused: boolean;
  /** Reason for pause, if any */
  pauseReason: PauseReason;
  /** Called to start timer */
  onStart: () => void;
  /** Called to pause timer */
  onPause: () => void;
  /** Called to resume timer */
  onResume: () => void;
  /** Called to set time manually (in minutes) */
  onManualSet: (minutes: number) => void;
}

/**
 * Get message for pause reason
 */
function getPauseMessage(reason: PauseReason): string {
  switch (reason) {
    case 'backgrounded':
      return 'Timer was paused because the app was in the background for too long.';
    case 'no_interaction':
      return 'Timer was paused due to no activity.';
    case 'manual':
      return 'Timer is paused.';
    default:
      return 'Timer is paused.';
  }
}

/**
 * Timer display component with controls
 */
export function Timer({
  formattedTime,
  elapsedSeconds,
  isRunning,
  isPaused,
  pauseReason,
  onStart,
  onPause,
  onResume,
  onManualSet,
}: TimerProps): React.ReactElement {
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');

  const handleManualSubmit = () => {
    const minutes = parseFloat(manualMinutes);
    if (isNaN(minutes) || minutes < 0) {
      Alert.alert('Invalid Time', 'Please enter a valid number of minutes.');
      return;
    }
    onManualSet(minutes);
    setShowManualInput(false);
    setManualMinutes('');
  };

  const handleOpenManualInput = () => {
    // Pre-fill with current elapsed minutes
    const currentMinutes = Math.round(elapsedSeconds / 60);
    setManualMinutes(currentMinutes.toString());
    setShowManualInput(true);
  };

  return (
    <View style={styles.container}>
      {/* Timer Display */}
      <View style={styles.timerDisplay}>
        <Text style={styles.timerText}>{formattedTime}</Text>
        {isPaused && <Text style={styles.pausedIndicator}>PAUSED</Text>}
      </View>

      {/* Pause Message */}
      {isPaused && pauseReason && (
        <View style={styles.pauseMessageContainer}>
          <Text style={styles.pauseMessage}>{getPauseMessage(pauseReason)}</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {!isRunning && !isPaused && (
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={onStart}
            accessibilityRole="button"
            accessibilityLabel="Start timer"
          >
            <Text style={styles.buttonText}>Start Timer</Text>
          </TouchableOpacity>
        )}

        {isRunning && !isPaused && (
          <TouchableOpacity
            style={[styles.button, styles.pauseButton]}
            onPress={onPause}
            accessibilityRole="button"
            accessibilityLabel="Pause timer"
          >
            <Text style={styles.buttonText}>Pause</Text>
          </TouchableOpacity>
        )}

        {isPaused && (
          <TouchableOpacity
            style={[styles.button, styles.resumeButton]}
            onPress={onResume}
            accessibilityRole="button"
            accessibilityLabel="Resume timer"
          >
            <Text style={styles.buttonText}>Resume</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.manualButton]}
          onPress={handleOpenManualInput}
          accessibilityRole="button"
          accessibilityLabel="Set time manually"
        >
          <Text style={styles.manualButtonText}>Set Manually</Text>
        </TouchableOpacity>
      </View>

      {/* Manual Input Modal */}
      <Modal
        visible={showManualInput}
        transparent
        animationType="fade"
        onRequestClose={() => setShowManualInput(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Time Manually</Text>
            <Text style={styles.modalSubtitle}>Enter the total time spent (in minutes):</Text>

            <TextInput
              style={styles.input}
              value={manualMinutes}
              onChangeText={setManualMinutes}
              keyboardType="numeric"
              placeholder="Minutes"
              autoFocus
              accessibilityLabel="Minutes input"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowManualInput(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleManualSubmit}
              >
                <Text style={styles.confirmButtonText}>Set Time</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
  },
  timerDisplay: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: '#1A1A1A',
  },
  pausedIndicator: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginTop: 4,
  },
  pauseMessageContainer: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  pauseMessage: {
    fontSize: 14,
    color: '#E65100',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    minHeight: TOUCH_TARGETS.MINIMUM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  pauseButton: {
    backgroundColor: '#FF9800',
  },
  resumeButton: {
    backgroundColor: '#4CAF50',
  },
  manualButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: TOUCH_TARGETS.MINIMUM,
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  confirmButton: {
    backgroundColor: '#1976D2',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default Timer;
