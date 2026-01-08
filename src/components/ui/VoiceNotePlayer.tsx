/**
 * Voice Note Player Component
 *
 * Playback component for voice notes with speed control.
 * Supports 0.5x, 1x, 1.5x, and 2x playback speeds.
 *
 * @module components/ui/VoiceNotePlayer
 */

import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useVoiceNote } from '@/hooks';
import { TOUCH_TARGETS } from '@/constants';

interface VoiceNotePlayerProps {
  /** URI of the voice note file */
  uri: string;
  /** Duration of the voice note in milliseconds */
  duration: number;
  /** Callback when delete is pressed (optional) */
  onDelete?: () => void;
}

/** Available playback rates */
const PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const;

/**
 * Format milliseconds to MM:SS display
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Voice Note Player component
 *
 * Provides playback controls for voice notes:
 * - Play/Pause button
 * - Progress bar with seek
 * - Speed control (0.5x, 1x, 1.5x, 2x)
 * - Optional delete button
 */
export function VoiceNotePlayer({
  uri,
  duration,
  onDelete,
}: VoiceNotePlayerProps): React.ReactElement {
  const {
    isPlaying,
    playbackPosition,
    playbackDuration,
    playbackRate,
    loadAndPlay,
    pause,
    resume,
    stop,
    setRate,
    error,
    clearError,
  } = useVoiceNote();

  // Load audio when component mounts or URI changes
  useEffect(() => {
    return () => {
      // Stop playback when unmounting
      stop();
    };
  }, [stop]);

  // Show error alert
  useEffect(() => {
    if (error) {
      Alert.alert('Playback Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error, clearError]);

  // Handle play/pause toggle
  const handlePlayPause = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else {
      if (playbackPosition === 0 || playbackPosition >= playbackDuration) {
        await loadAndPlay(uri);
      } else {
        await resume();
      }
    }
  }, [isPlaying, playbackPosition, playbackDuration, uri, pause, resume, loadAndPlay]);

  // Handle rate change
  const handleRateChange = useCallback(
    async (rate: number) => {
      await setRate(rate);
    },
    [setRate]
  );

  // Handle delete
  const handleDelete = useCallback(() => {
    Alert.alert('Delete Voice Note', 'Are you sure you want to delete this voice note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          stop();
          onDelete?.();
        },
      },
    ]);
  }, [stop, onDelete]);

  // Calculate progress percentage
  const actualDuration = playbackDuration || duration;
  const progress = actualDuration > 0 ? (playbackPosition / actualDuration) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Main Player Row */}
      <View style={styles.playerRow}>
        {/* Play/Pause Button */}
        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <View style={styles.pauseIcon}>
              <View style={styles.pauseBar} />
              <View style={styles.pauseBar} />
            </View>
          ) : (
            <View style={styles.playIcon} />
          )}
        </TouchableOpacity>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
          </View>

          {/* Time Display */}
          <View style={styles.timeDisplay}>
            <Text style={styles.currentTime}>{formatTime(playbackPosition)}</Text>
            <Text style={styles.totalTime}>/ {formatTime(actualDuration)}</Text>
          </View>
        </View>
      </View>

      {/* Speed Control Row */}
      <View style={styles.speedRow}>
        <Text style={styles.speedLabel}>Speed:</Text>
        <View style={styles.speedButtons}>
          {PLAYBACK_RATES.map(rate => (
            <TouchableOpacity
              key={rate}
              style={[styles.speedButton, playbackRate === rate && styles.speedButtonActive]}
              onPress={() => handleRateChange(rate)}
              accessibilityRole="button"
              accessibilityLabel={`${rate}x speed`}
              accessibilityState={{ selected: playbackRate === rate }}
            >
              <Text
                style={[
                  styles.speedButtonText,
                  playbackRate === rate && styles.speedButtonTextActive,
                ]}
              >
                {rate}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Delete Button */}
        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel="Delete voice note"
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  playButton: {
    width: TOUCH_TARGETS.MINIMUM,
    height: TOUCH_TARGETS.MINIMUM,
    borderRadius: TOUCH_TARGETS.MINIMUM / 2,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  playIcon: {
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 16,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
    marginLeft: 4,
  },
  pauseIcon: {
    flexDirection: 'row',
    gap: 4,
  },
  pauseBar: {
    width: 6,
    height: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  progressSection: {
    flex: 1,
  },
  progressBarContainer: {
    marginBottom: 4,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1976D2',
    borderRadius: 3,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    fontVariant: ['tabular-nums'],
  },
  totalTime: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
    fontVariant: ['tabular-nums'],
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedLabel: {
    fontSize: 12,
    color: '#666666',
    marginRight: 8,
  },
  speedButtons: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  speedButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
    minWidth: 44,
    alignItems: 'center',
  },
  speedButtonActive: {
    backgroundColor: '#1976D2',
  },
  speedButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  speedButtonTextActive: {
    color: '#FFFFFF',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: '500',
  },
});

export default VoiceNotePlayer;
