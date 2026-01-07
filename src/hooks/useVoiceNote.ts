/**
 * Voice Note Hook
 *
 * React hook for voice note recording and playback functionality.
 * Provides state management and actions for the VoiceNoteService.
 *
 * @module hooks/useVoiceNote
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  VoiceNoteService,
  VoiceNoteResult,
  PlaybackStatus,
} from '@/services/voice-notes/voice-note-service';

/**
 * Return type for useVoiceNote hook
 */
export interface UseVoiceNoteReturn {
  // Recording state
  /** Whether recording is currently active */
  isRecording: boolean;
  /** Recording duration in milliseconds */
  recordingDuration: number;
  /** Audio level for waveform visualization (-160 to 0) */
  recordingLevel: number;

  // Recording actions
  /** Start recording a new voice note */
  startRecording: () => Promise<void>;
  /** Stop recording and save the voice note */
  stopRecording: () => Promise<VoiceNoteResult | null>;
  /** Cancel recording without saving */
  cancelRecording: () => Promise<void>;

  // Playback state
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Current playback position in milliseconds */
  playbackPosition: number;
  /** Total playback duration in milliseconds */
  playbackDuration: number;
  /** Current playback rate (0.5, 1, 1.5, 2) */
  playbackRate: number;

  // Playback actions
  /** Load and start playing a voice note */
  loadAndPlay: (uri: string) => Promise<void>;
  /** Pause playback */
  pause: () => Promise<void>;
  /** Resume playback */
  resume: () => Promise<void>;
  /** Stop playback */
  stop: () => Promise<void>;
  /** Set playback rate */
  setRate: (rate: number) => Promise<void>;
  /** Seek to position */
  seekTo: (position: number) => Promise<void>;

  // Permissions
  /** Whether microphone permission is granted */
  hasPermission: boolean;
  /** Request microphone permission */
  requestPermission: () => Promise<boolean>;

  // Error state
  /** Error message if any operation failed */
  error: string | null;
  /** Clear error state */
  clearError: () => void;
}

/** Recording status update interval in milliseconds */
const RECORDING_UPDATE_INTERVAL = 100;

/** Maximum recording duration in milliseconds */
const MAX_DURATION_MS = 120000;

/**
 * Hook for voice note recording and playback
 *
 * Usage:
 * ```tsx
 * const {
 *   isRecording,
 *   recordingDuration,
 *   startRecording,
 *   stopRecording,
 *   // ... other state and actions
 * } = useVoiceNote();
 * ```
 */
export function useVoiceNote(): UseVoiceNoteReturn {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingLevel, setRecordingLevel] = useState(-160);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);

  // Permission state
  const [hasPermission, setHasPermission] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Timer ref for recording updates
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check permission on mount
  useEffect(() => {
    VoiceNoteService.hasPermission().then(setHasPermission);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      VoiceNoteService.cleanup();
    };
  }, []);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await VoiceNoteService.requestPermission();
      setHasPermission(granted);
      return granted;
    } catch (err) {
      console.error('[useVoiceNote] Permission request failed:', err);
      setError('Failed to request microphone permission');
      return false;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          setError('Microphone permission required');
          return;
        }
      }

      await VoiceNoteService.startRecording();
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordingLevel(-160);

      // Start polling for recording status
      recordingTimerRef.current = setInterval(async () => {
        try {
          const status = await VoiceNoteService.getRecordingStatus();
          setRecordingDuration(status.durationMillis);
          setRecordingLevel(status.metering ?? -160);

          // Auto-stop at max duration
          if (status.durationMillis >= MAX_DURATION_MS) {
            if (recordingTimerRef.current) {
              clearInterval(recordingTimerRef.current);
              recordingTimerRef.current = null;
            }
          }
        } catch {
          // Ignore status update errors
        }
      }, RECORDING_UPDATE_INTERVAL);
    } catch (err) {
      console.error('[useVoiceNote] Start recording failed:', err);
      setError('Failed to start recording');
      setIsRecording(false);
    }
  }, [hasPermission, requestPermission]);

  // Stop recording
  const stopRecording = useCallback(async (): Promise<VoiceNoteResult | null> => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    try {
      setError(null);
      const result = await VoiceNoteService.stopRecording();
      setIsRecording(false);
      setRecordingDuration(0);
      setRecordingLevel(-160);
      return result;
    } catch (err) {
      console.error('[useVoiceNote] Stop recording failed:', err);
      setError('Failed to save recording');
      setIsRecording(false);
      return null;
    }
  }, []);

  // Cancel recording
  const cancelRecording = useCallback(async (): Promise<void> => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    try {
      await VoiceNoteService.cancelRecording();
    } catch (err) {
      console.error('[useVoiceNote] Cancel recording failed:', err);
    }

    setIsRecording(false);
    setRecordingDuration(0);
    setRecordingLevel(-160);
  }, []);

  // Playback status callback
  const handlePlaybackStatus = useCallback((status: PlaybackStatus) => {
    setIsPlaying(status.isPlaying);
    setPlaybackPosition(status.positionMillis);
    setPlaybackDuration(status.durationMillis);
    setPlaybackRateState(status.rate);
  }, []);

  // Load and play audio
  const loadAndPlay = useCallback(async (uri: string): Promise<void> => {
    try {
      setError(null);
      await VoiceNoteService.loadAudio(uri);
      VoiceNoteService.setPlaybackStatusCallback(handlePlaybackStatus);
      await VoiceNoteService.play();
    } catch (err) {
      console.error('[useVoiceNote] Load and play failed:', err);
      setError('Failed to play voice note');
    }
  }, [handlePlaybackStatus]);

  // Pause playback
  const pause = useCallback(async (): Promise<void> => {
    try {
      await VoiceNoteService.pause();
    } catch (err) {
      console.error('[useVoiceNote] Pause failed:', err);
    }
  }, []);

  // Resume playback
  const resume = useCallback(async (): Promise<void> => {
    try {
      await VoiceNoteService.play();
    } catch (err) {
      console.error('[useVoiceNote] Resume failed:', err);
    }
  }, []);

  // Stop playback
  const stop = useCallback(async (): Promise<void> => {
    try {
      await VoiceNoteService.stop();
      setPlaybackPosition(0);
    } catch (err) {
      console.error('[useVoiceNote] Stop failed:', err);
    }
  }, []);

  // Set playback rate
  const setRate = useCallback(async (rate: number): Promise<void> => {
    try {
      await VoiceNoteService.setPlaybackRate(rate);
      setPlaybackRateState(rate);
    } catch (err) {
      console.error('[useVoiceNote] Set rate failed:', err);
    }
  }, []);

  // Seek to position
  const seekTo = useCallback(async (position: number): Promise<void> => {
    try {
      await VoiceNoteService.seekTo(position);
    } catch (err) {
      console.error('[useVoiceNote] Seek failed:', err);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Recording state
    isRecording,
    recordingDuration,
    recordingLevel,

    // Recording actions
    startRecording,
    stopRecording,
    cancelRecording,

    // Playback state
    isPlaying,
    playbackPosition,
    playbackDuration,
    playbackRate,

    // Playback actions
    loadAndPlay,
    pause,
    resume,
    stop,
    setRate,
    seekTo,

    // Permissions
    hasPermission,
    requestPermission,

    // Error state
    error,
    clearError,
  };
}

export default useVoiceNote;
