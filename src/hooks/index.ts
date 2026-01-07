// Custom React hooks
export { useAuth, useCurrentUser, useIsAuthenticated, useAuthLoading } from './useAuth';
export { useSync } from './useSync';
export type { UseSyncReturn } from './useSync';
export { useAssets } from './useAssets';
export type { UseAssetsReturn } from './useAssets';
export { useWorkOrders } from './useWorkOrders';
export type { UseWorkOrdersReturn, CreateWorkOrderData } from './useWorkOrders';
export { useTimer } from './useTimer';
export type { UseTimerReturn, PauseReason } from './useTimer';
export { useRecentAssets } from './useRecentAssets';
export type { UseRecentAssetsReturn } from './useRecentAssets';
export { useQuickLog } from './useQuickLog';
export type { UseQuickLogReturn, CreateQuickLogData } from './useQuickLog';
export { useVoiceNote } from './useVoiceNote';
export type { UseVoiceNoteReturn } from './useVoiceNote';
export { useMeterReadings } from './useMeterReadings';
export type {
  UseMeterReadingsReturn,
  MeterValidationResult,
  MeterWarning,
  MeterError,
  CreateMeterReadingData,
} from './useMeterReadings';
export { usePdf } from './usePdf';
export type { UsePdfReturn, DateRange } from './usePdf';
export { useQuickStats } from './useQuickStats';
export type { UseQuickStatsReturn, QuickStats } from './useQuickStats';
