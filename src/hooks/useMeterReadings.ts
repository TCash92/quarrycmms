/**
 * Meter Readings Hook
 *
 * React hook for meter reading management with validation.
 * Implements validation rules:
 * - No backwards readings (new >= previous)
 * - Jump warning if >10x previous reading
 *
 * @module hooks/useMeterReadings
 */

import { useState, useCallback, useEffect } from 'react';
import { useDatabase, Q } from '@/database';
import MeterReading from '@/database/models/MeterReading';
import Asset from '@/database/models/Asset';
import { useCurrentUser } from './useAuth';

/**
 * Meter reading validation warning
 */
export interface MeterWarning {
  type: 'large_jump' | 'unusual_value';
  message: string;
}

/**
 * Meter reading validation error
 */
export interface MeterError {
  type: 'backwards_reading' | 'invalid_value';
  message: string;
}

/**
 * Result of meter reading validation
 */
export interface MeterValidationResult {
  /** Whether the reading is valid (no errors) */
  isValid: boolean;
  /** Warnings that don't prevent submission */
  warnings: MeterWarning[];
  /** Errors that prevent submission */
  errors: MeterError[];
}

/**
 * Data for creating a new meter reading
 */
export interface CreateMeterReadingData {
  assetId: string;
  value: number;
  notes?: string;
}

/**
 * Return type for useMeterReadings hook
 */
export interface UseMeterReadingsReturn {
  /** Latest meter reading for the asset */
  latestReading: MeterReading | null;
  /** History of meter readings */
  readingHistory: MeterReading[];
  /** Whether readings are loading */
  isLoading: boolean;
  /** Whether a reading is being created */
  isSubmitting: boolean;
  /** Validate a new reading value */
  validateReading: (value: number) => MeterValidationResult;
  /** Create a new meter reading */
  createReading: (data: CreateMeterReadingData) => Promise<MeterReading>;
  /** Refresh readings from database */
  refresh: () => Promise<void>;
  /** Error message if any */
  error: string | null;
}

/** Threshold for large jump warning (10x) */
const LARGE_JUMP_THRESHOLD = 10;

/**
 * Hook for managing meter readings for a specific asset
 *
 * @param assetId - The asset ID to get readings for
 *
 * Usage:
 * ```tsx
 * const {
 *   latestReading,
 *   validateReading,
 *   createReading,
 * } = useMeterReadings(assetId);
 * ```
 */
export function useMeterReadings(assetId: string | null): UseMeterReadingsReturn {
  const database = useDatabase();
  const user = useCurrentUser();

  const [latestReading, setLatestReading] = useState<MeterReading | null>(null);
  const [readingHistory, setReadingHistory] = useState<MeterReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load readings for the asset
  const loadReadings = useCallback(async () => {
    if (!assetId) {
      setLatestReading(null);
      setReadingHistory([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const readings = await database
        .get<MeterReading>('meter_readings')
        .query(
          Q.where('asset_id', assetId),
          Q.sortBy('reading_date', Q.desc),
          Q.take(20) // Last 20 readings
        )
        .fetch();

      setReadingHistory(readings);
      setLatestReading(readings.length > 0 ? (readings[0] ?? null) : null);
    } catch (err) {
      console.error('[useMeterReadings] Failed to load readings:', err);
      setError('Failed to load meter readings');
    } finally {
      setIsLoading(false);
    }
  }, [database, assetId]);

  // Load readings on mount and when assetId changes
  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  // Validate a new reading value
  const validateReading = useCallback(
    (value: number): MeterValidationResult => {
      const warnings: MeterWarning[] = [];
      const errors: MeterError[] = [];

      // Check for invalid value
      if (isNaN(value) || value < 0) {
        errors.push({
          type: 'invalid_value',
          message: 'Reading must be a positive number',
        });
        return { isValid: false, warnings, errors };
      }

      // Check for backwards reading
      if (latestReading && value < latestReading.readingValue) {
        errors.push({
          type: 'backwards_reading',
          message: `Reading cannot be less than previous (${latestReading.readingValue.toLocaleString()})`,
        });
      }

      // Check for large jump (>10x previous)
      if (latestReading && latestReading.readingValue > 0) {
        const ratio = value / latestReading.readingValue;
        if (ratio > LARGE_JUMP_THRESHOLD) {
          warnings.push({
            type: 'large_jump',
            message: `Large jump detected (${ratio.toFixed(1)}x previous reading)`,
          });
        }
      }

      return {
        isValid: errors.length === 0,
        warnings,
        errors,
      };
    },
    [latestReading]
  );

  // Create a new meter reading
  const createReading = useCallback(
    async (data: CreateMeterReadingData): Promise<MeterReading> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!data.assetId) {
        throw new Error('Asset ID is required');
      }

      // Validate before creating
      const validation = validateReading(data.value);
      if (!validation.isValid) {
        const firstError = validation.errors[0];
        throw new Error(firstError?.message ?? 'Validation failed');
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const newReading = await database.write(async () => {
          // Create the meter reading
          const reading = await database
            .get<MeterReading>('meter_readings')
            .create((record: MeterReading) => {
              record.assetId = data.assetId;
              record.readingValue = data.value;
              record.readingDate = Date.now();
              record.recordedBy = user.id;
              record.notes = data.notes || null;
              record.localSyncStatus = 'pending';
              record.localUpdatedAt = Date.now();
            });

          // Update asset's current meter reading
          const asset = await database.get<Asset>('assets').find(data.assetId);
          await asset.update((a: Asset) => {
            a.meterCurrentReading = data.value;
            a.localSyncStatus = 'pending';
            a.localUpdatedAt = Date.now();
          });

          return reading;
        });

        // Refresh readings
        await loadReadings();

        return newReading;
      } catch (err) {
        console.error('[useMeterReadings] Failed to create reading:', err);
        setError('Failed to save meter reading');
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [database, user, validateReading, loadReadings]
  );

  // Refresh readings
  const refresh = useCallback(async () => {
    await loadReadings();
  }, [loadReadings]);

  return {
    latestReading,
    readingHistory,
    isLoading,
    isSubmitting,
    validateReading,
    createReading,
    refresh,
    error,
  };
}

export default useMeterReadings;
