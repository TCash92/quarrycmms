/**
 * Voice Note Service
 *
 * Core service for voice note recording and playback using expo-av.
 * Implements AAC format at 22,050 Hz, 64 kbps mono as per specification.
 *
 * @module services/voice-notes/voice-note-service
 */

import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { documentDirectory } from 'expo-file-system/legacy';

/**
 * Result of a completed voice note recording
 */
export interface VoiceNoteResult {
  /** Local file URI */
  uri: string;
  /** Duration in milliseconds */
  duration: number;
  /** File size in bytes */
  fileSize: number;
}

/**
 * Recording status information
 */
export interface RecordingStatus {
  /** Whether recording is active */
  isRecording: boolean;
  /** Duration in milliseconds */
  durationMillis: number;
  /** Audio level for visualization (-160 to 0 dB) */
  metering?: number | undefined;
}

/**
 * Playback status information
 */
export interface PlaybackStatus {
  /** Whether audio is playing */
  isPlaying: boolean;
  /** Current position in milliseconds */
  positionMillis: number;
  /** Total duration in milliseconds */
  durationMillis: number;
  /** Playback rate (0.5, 1.0, 1.5, 2.0) */
  rate: number;
}

/** Maximum recording duration in milliseconds (2 minutes) */
const MAX_RECORDING_DURATION_MS = 120000;

/** Voice notes directory in app documents */
const VOICE_NOTES_DIR = `${documentDirectory}voice_notes/`;

/**
 * Recording options per specification:
 * - AAC format (.m4a)
 * - 22,050 Hz sample rate
 * - 64 kbps bitrate
 * - Mono channel
 */
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 22050,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 22050,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 64000,
  },
};

/**
 * Voice Note Service class
 *
 * Handles recording and playback of voice notes with support for:
 * - Recording with metering for waveform visualization
 * - Playback with variable speed control
 * - Automatic cleanup and file management
 */
class VoiceNoteServiceClass {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private isInitialized = false;

  /**
   * Initialize audio mode for recording
   */
  private async initializeAudioMode(): Promise<void> {
    if (this.isInitialized) return;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      playsInSilentModeIOS: true,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });

    this.isInitialized = true;
  }

  /**
   * Request microphone permission
   * @returns true if permission granted
   */
  async requestPermission(): Promise<boolean> {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Check if microphone permission is granted
   */
  async hasPermission(): Promise<boolean> {
    const { status } = await Audio.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Ensure voice notes directory exists
   */
  private async ensureDirectory(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(VOICE_NOTES_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(VOICE_NOTES_DIR, { intermediates: true });
    }
  }

  /**
   * Start recording a new voice note
   */
  async startRecording(): Promise<void> {
    // Clean up any existing recording
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch {
        // Ignore cleanup errors
      }
      this.recording = null;
    }

    await this.initializeAudioMode();
    await this.ensureDirectory();

    const { recording } = await Audio.Recording.createAsync(
      RECORDING_OPTIONS,
      undefined,
      100 // Update interval for metering (100ms)
    );

    this.recording = recording;
  }

  /**
   * Stop recording and save the voice note
   * @returns VoiceNoteResult with file info
   */
  async stopRecording(): Promise<VoiceNoteResult> {
    if (!this.recording) {
      throw new Error('No active recording');
    }

    await this.recording.stopAndUnloadAsync();
    const uri = this.recording.getURI();

    if (!uri) {
      throw new Error('Failed to get recording URI');
    }

    // Move to permanent storage with unique filename
    const filename = `voice_note_${Date.now()}.m4a`;
    const permanentUri = `${VOICE_NOTES_DIR}${filename}`;

    await FileSystem.moveAsync({
      from: uri,
      to: permanentUri,
    });

    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(permanentUri);
    const status = await this.recording.getStatusAsync();

    this.recording = null;

    return {
      uri: permanentUri,
      duration: status.durationMillis,
      fileSize: fileInfo.exists ? (fileInfo as { size: number }).size : 0,
    };
  }

  /**
   * Cancel the current recording without saving
   */
  async cancelRecording(): Promise<void> {
    if (!this.recording) return;

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      if (uri) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch {
      // Ignore cleanup errors
    }

    this.recording = null;
  }

  /**
   * Get current recording status
   */
  async getRecordingStatus(): Promise<RecordingStatus> {
    if (!this.recording) {
      return {
        isRecording: false,
        durationMillis: 0,
        metering: undefined,
      };
    }

    const status = await this.recording.getStatusAsync();
    return {
      isRecording: status.isRecording,
      durationMillis: status.durationMillis,
      metering: status.metering,
    };
  }

  /**
   * Check if max recording duration reached
   */
  isMaxDurationReached(durationMillis: number): boolean {
    return durationMillis >= MAX_RECORDING_DURATION_MS;
  }

  /**
   * Load audio file for playback
   */
  async loadAudio(uri: string): Promise<void> {
    // Unload existing sound
    if (this.sound) {
      try {
        await this.sound.unloadAsync();
      } catch {
        // Ignore cleanup errors
      }
      this.sound = null;
    }

    // Set audio mode for playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      playsInSilentModeIOS: true,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false }
    );

    this.sound = sound;
  }

  /**
   * Start or resume playback
   */
  async play(): Promise<void> {
    if (!this.sound) {
      throw new Error('No audio loaded');
    }
    await this.sound.playAsync();
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    if (!this.sound) return;
    await this.sound.pauseAsync();
  }

  /**
   * Stop playback and reset position
   */
  async stop(): Promise<void> {
    if (!this.sound) return;
    await this.sound.stopAsync();
    await this.sound.setPositionAsync(0);
  }

  /**
   * Set playback rate
   * @param rate - 0.5, 1.0, 1.5, or 2.0
   */
  async setPlaybackRate(rate: number): Promise<void> {
    if (!this.sound) return;
    await this.sound.setRateAsync(rate, true);
  }

  /**
   * Seek to position
   * @param positionMillis - Position in milliseconds
   */
  async seekTo(positionMillis: number): Promise<void> {
    if (!this.sound) return;
    await this.sound.setPositionAsync(positionMillis);
  }

  /**
   * Get current playback status
   */
  async getPlaybackStatus(): Promise<PlaybackStatus> {
    if (!this.sound) {
      return {
        isPlaying: false,
        positionMillis: 0,
        durationMillis: 0,
        rate: 1.0,
      };
    }

    const status = await this.sound.getStatusAsync();
    if (!status.isLoaded) {
      return {
        isPlaying: false,
        positionMillis: 0,
        durationMillis: 0,
        rate: 1.0,
      };
    }

    return {
      isPlaying: status.isPlaying,
      positionMillis: status.positionMillis,
      durationMillis: status.durationMillis || 0,
      rate: status.rate,
    };
  }

  /**
   * Set playback status update callback
   */
  setPlaybackStatusCallback(
    callback: (status: PlaybackStatus) => void
  ): void {
    if (!this.sound) return;

    this.sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) {
        callback({
          isPlaying: false,
          positionMillis: 0,
          durationMillis: 0,
          rate: 1.0,
        });
        return;
      }

      callback({
        isPlaying: status.isPlaying,
        positionMillis: status.positionMillis,
        durationMillis: status.durationMillis || 0,
        rate: status.rate,
      });
    });
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch {
        // Ignore
      }
      this.recording = null;
    }

    if (this.sound) {
      try {
        await this.sound.unloadAsync();
      } catch {
        // Ignore
      }
      this.sound = null;
    }

    this.isInitialized = false;
  }

  /**
   * Delete a voice note file
   */
  async deleteVoiceNote(uri: string): Promise<void> {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}

// Export singleton instance
export const VoiceNoteService = new VoiceNoteServiceClass();
export default VoiceNoteService;
