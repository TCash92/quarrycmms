/**
 * Voice Note Service - Web Platform Implementation
 *
 * Uses Web Audio API and MediaRecorder for browser-based recording.
 * This file is automatically loaded by Metro for web builds instead of voice-note-service.ts.
 *
 * @module services/voice-notes/voice-note-service.web
 */

import { logger } from '@/services/monitoring';

/**
 * Result of a completed voice note recording
 */
export interface VoiceNoteResult {
  /** Local file URI (blob URL on web) */
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
  /** Audio level for visualization (-160 to 0 dB) - not available on web */
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

/**
 * Voice Note Service for Web Platform
 *
 * Uses MediaRecorder API for recording and HTMLAudioElement for playback.
 * Audio is stored as blob URLs instead of file system.
 */
class VoiceNoteServiceWeb {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioElement: HTMLAudioElement | null = null;
  private recordingStartTime: number = 0;
  private playbackStatusCallback: ((status: PlaybackStatus) => void) | null = null;

  /**
   * Request microphone permission
   * @returns true if permission granted
   */
  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just needed to request permission
      stream.getTracks().forEach(track => track.stop());
      logger.debug('Microphone permission granted', { category: 'voice' });
      return true;
    } catch (error) {
      logger.warn('Microphone permission denied', {
        category: 'voice',
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Check if microphone permission is granted
   */
  async hasPermission(): Promise<boolean> {
    try {
      const result = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      });
      return result.state === 'granted';
    } catch {
      // Permissions API not supported, try getUserMedia
      return false;
    }
  }

  /**
   * Start recording a new voice note
   */
  async startRecording(): Promise<void> {
    // Clean up any existing recording
    if (this.mediaRecorder) {
      await this.cancelRecording();
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Try to use audio/webm, fall back to default if not supported
    const mimeType = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : undefined;

    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
    this.mediaRecorder = new MediaRecorder(stream, options);
    this.audioChunks = [];
    this.recordingStartTime = Date.now();

    this.mediaRecorder.ondataavailable = (event: BlobEvent): void => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100); // Collect data every 100ms for smoother recording
    logger.debug('Web recording started', { category: 'voice', mimeType });
  }

  /**
   * Stop recording and save the voice note
   * @returns VoiceNoteResult with blob URL
   */
  async stopRecording(): Promise<VoiceNoteResult> {
    if (!this.mediaRecorder) {
      throw new Error('No active recording');
    }

    return new Promise((resolve, reject) => {
      const recorder = this.mediaRecorder!;

      recorder.onstop = (): void => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const duration = Date.now() - this.recordingStartTime;

        // Stop all media tracks
        recorder.stream.getTracks().forEach(track => track.stop());
        this.mediaRecorder = null;
        this.audioChunks = [];

        logger.debug('Web recording stopped', {
          category: 'voice',
          duration,
          fileSize: blob.size,
        });

        resolve({
          uri: url,
          duration,
          fileSize: blob.size,
        });
      };

      recorder.onerror = (): void => {
        reject(new Error('Recording failed'));
      };

      recorder.stop();
    });
  }

  /**
   * Cancel the current recording without saving
   */
  async cancelRecording(): Promise<void> {
    if (!this.mediaRecorder) return;

    try {
      // Stop media tracks first
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());

      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    } catch {
      // Ignore cleanup errors
    }

    this.mediaRecorder = null;
    this.audioChunks = [];
    logger.debug('Web recording cancelled', { category: 'voice' });
  }

  /**
   * Get current recording status
   */
  async getRecordingStatus(): Promise<RecordingStatus> {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
      return {
        isRecording: false,
        durationMillis: 0,
        metering: undefined,
      };
    }

    return {
      isRecording: true,
      durationMillis: Date.now() - this.recordingStartTime,
      metering: undefined, // Web Audio API metering would require additional setup
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
    // Unload existing audio
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }

    this.audioElement = new Audio(uri);

    // Wait for audio to be loadable
    await new Promise<void>((resolve, reject) => {
      const audio = this.audioElement!;

      audio.onloadedmetadata = (): void => resolve();
      audio.onerror = (): void => reject(new Error('Failed to load audio'));

      // Trigger load
      audio.load();
    });

    // Set up playback status updates
    this.setupPlaybackListeners();
    logger.debug('Web audio loaded', { category: 'voice', uri });
  }

  /**
   * Set up event listeners for playback status updates
   */
  private setupPlaybackListeners(): void {
    if (!this.audioElement) return;

    const updateStatus = (): void => {
      if (this.playbackStatusCallback && this.audioElement) {
        this.playbackStatusCallback({
          isPlaying: !this.audioElement.paused,
          positionMillis: Math.floor(this.audioElement.currentTime * 1000),
          durationMillis: Math.floor((this.audioElement.duration || 0) * 1000),
          rate: this.audioElement.playbackRate,
        });
      }
    };

    this.audioElement.addEventListener('timeupdate', updateStatus);
    this.audioElement.addEventListener('play', updateStatus);
    this.audioElement.addEventListener('pause', updateStatus);
    this.audioElement.addEventListener('ended', updateStatus);
    this.audioElement.addEventListener('ratechange', updateStatus);
  }

  /**
   * Start or resume playback
   */
  async play(): Promise<void> {
    if (!this.audioElement) {
      throw new Error('No audio loaded');
    }
    await this.audioElement.play();
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    if (!this.audioElement) return;
    this.audioElement.pause();
  }

  /**
   * Stop playback and reset position
   */
  async stop(): Promise<void> {
    if (!this.audioElement) return;
    this.audioElement.pause();
    this.audioElement.currentTime = 0;
  }

  /**
   * Set playback rate
   * @param rate - 0.5, 1.0, 1.5, or 2.0
   */
  async setPlaybackRate(rate: number): Promise<void> {
    if (!this.audioElement) return;
    this.audioElement.playbackRate = rate;
  }

  /**
   * Seek to position
   * @param positionMillis - Position in milliseconds
   */
  async seekTo(positionMillis: number): Promise<void> {
    if (!this.audioElement) return;
    this.audioElement.currentTime = positionMillis / 1000;
  }

  /**
   * Get current playback status
   */
  async getPlaybackStatus(): Promise<PlaybackStatus> {
    if (!this.audioElement) {
      return {
        isPlaying: false,
        positionMillis: 0,
        durationMillis: 0,
        rate: 1.0,
      };
    }

    return {
      isPlaying: !this.audioElement.paused,
      positionMillis: Math.floor(this.audioElement.currentTime * 1000),
      durationMillis: Math.floor((this.audioElement.duration || 0) * 1000),
      rate: this.audioElement.playbackRate,
    };
  }

  /**
   * Set playback status update callback
   */
  setPlaybackStatusCallback(callback: (status: PlaybackStatus) => void): void {
    this.playbackStatusCallback = callback;
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    await this.cancelRecording();

    if (this.audioElement) {
      this.audioElement.pause();
      // Revoke blob URL if it's a blob
      if (this.audioElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.audioElement.src);
      }
      this.audioElement.src = '';
      this.audioElement = null;
    }

    this.playbackStatusCallback = null;
    logger.debug('Web voice service cleaned up', { category: 'voice' });
  }

  /**
   * Delete a voice note (revoke blob URL)
   */
  async deleteVoiceNote(uri: string): Promise<void> {
    if (uri.startsWith('blob:')) {
      URL.revokeObjectURL(uri);
      logger.debug('Blob URL revoked', { category: 'voice', uri });
    }
  }
}

// Export singleton instance
export const VoiceNoteService = new VoiceNoteServiceWeb();
export default VoiceNoteService;
