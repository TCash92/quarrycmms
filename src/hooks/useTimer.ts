/**
 * Timer Hook with Auto-Pause
 *
 * Custom hook for work order timer with auto-pause functionality.
 * Pauses automatically when:
 * - App is backgrounded (after 10 minutes)
 * - No touch interaction (after 15 minutes)
 *
 * Per CMMS_MVP_Design_Guide_v6.md Part 12
 *
 * @module hooks/useTimer
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { TIMER_THRESHOLDS } from '@/constants';

export type PauseReason = 'backgrounded' | 'no_interaction' | 'manual' | null;

export interface UseTimerReturn {
  /** Elapsed time in seconds */
  elapsedSeconds: number;
  /** Whether timer is currently running */
  isRunning: boolean;
  /** Whether timer is paused (but not stopped) */
  isPaused: boolean;
  /** Reason for auto-pause, if any */
  pauseReason: PauseReason;
  /** Start the timer */
  start: () => void;
  /** Pause the timer manually */
  pause: () => void;
  /** Resume the timer after pause */
  resume: () => void;
  /** Stop and reset the timer */
  reset: () => void;
  /** Set elapsed time manually (in minutes) */
  setManualMinutes: (minutes: number) => void;
  /** Record user interaction (call on touch events) */
  recordInteraction: () => void;
  /** Get elapsed time formatted as HH:MM:SS */
  formattedTime: string;
}

/**
 * Format seconds as HH:MM:SS or MM:SS
 */
function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
}

/**
 * Timer hook with auto-pause functionality
 *
 * Auto-pauses when:
 * - App backgrounded for 10+ minutes
 * - No touch interaction for 15+ minutes
 */
export function useTimer(initialSeconds: number = 0): UseTimerReturn {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState<PauseReason>(null);

  // Refs for tracking
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastInteractionRef = useRef<number>(Date.now());
  const backgroundTimeRef = useRef<number | null>(null);
  const noInteractionCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Record user interaction - call this on touch events
   */
  const recordInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now();
  }, []);

  /**
   * Start the timer
   */
  const start = useCallback(() => {
    if (isRunning) return;

    setIsRunning(true);
    setIsPaused(false);
    setPauseReason(null);
    lastInteractionRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, [isRunning]);

  /**
   * Pause the timer manually
   */
  const pause = useCallback(() => {
    if (!isRunning || isPaused) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsPaused(true);
    setPauseReason('manual');
  }, [isRunning, isPaused]);

  /**
   * Auto-pause with reason
   */
  const autoPause = useCallback((reason: PauseReason) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsPaused(true);
    setPauseReason(reason);
  }, []);

  /**
   * Resume the timer after pause
   */
  const resume = useCallback(() => {
    if (!isPaused) return;

    setIsPaused(false);
    setPauseReason(null);
    lastInteractionRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, [isPaused]);

  /**
   * Stop and reset the timer
   */
  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setElapsedSeconds(0);
    setIsRunning(false);
    setIsPaused(false);
    setPauseReason(null);
  }, []);

  /**
   * Set elapsed time manually (in minutes)
   */
  const setManualMinutes = useCallback((minutes: number) => {
    setElapsedSeconds(Math.max(0, Math.floor(minutes * 60)));
  }, []);

  /**
   * Handle app state changes (foreground/background)
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App going to background - record time
        backgroundTimeRef.current = Date.now();
      } else if (nextAppState === 'active') {
        // App coming to foreground - check if we need to auto-pause
        if (
          isRunning &&
          !isPaused &&
          backgroundTimeRef.current
        ) {
          const backgroundDuration = Date.now() - backgroundTimeRef.current;
          if (backgroundDuration >= TIMER_THRESHOLDS.APP_BACKGROUND_MS) {
            autoPause('backgrounded');
          }
        }
        backgroundTimeRef.current = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isRunning, isPaused, autoPause]);

  /**
   * Check for no-interaction pause
   */
  useEffect(() => {
    if (!isRunning || isPaused) {
      if (noInteractionCheckRef.current) {
        clearInterval(noInteractionCheckRef.current);
        noInteractionCheckRef.current = null;
      }
      return;
    }

    // Check every 30 seconds for no-interaction
    noInteractionCheckRef.current = setInterval(() => {
      const timeSinceInteraction = Date.now() - lastInteractionRef.current;
      if (timeSinceInteraction >= TIMER_THRESHOLDS.NO_INTERACTION_MS) {
        autoPause('no_interaction');
      }
    }, 30000);

    return () => {
      if (noInteractionCheckRef.current) {
        clearInterval(noInteractionCheckRef.current);
        noInteractionCheckRef.current = null;
      }
    };
  }, [isRunning, isPaused, autoPause]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (noInteractionCheckRef.current) {
        clearInterval(noInteractionCheckRef.current);
      }
    };
  }, []);

  return {
    elapsedSeconds,
    isRunning,
    isPaused,
    pauseReason,
    start,
    pause,
    resume,
    reset,
    setManualMinutes,
    recordInteraction,
    formattedTime: formatTime(elapsedSeconds),
  };
}

export default useTimer;
