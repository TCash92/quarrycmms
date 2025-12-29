/**
 * Shared TypeScript interfaces for QuarryCMMS
 * These types mirror the database schema defined in CLAUDE.md
 */

/** Work order priority levels */
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'emergency';

/** Work order status */
export type WorkOrderStatus = 'open' | 'in_progress' | 'completed';

/** Asset operational status */
export type AssetStatus = 'operational' | 'down' | 'limited';

/** Failure type classification */
export type FailureType = 'none' | 'wore_out' | 'broke' | 'unknown';

/** Sync status for offline-first records */
export type SyncStatus = 'pending' | 'synced' | 'conflict';

/** Voice note quality confidence */
export type VoiceNoteConfidence = 'high' | 'medium' | 'low' | 'unintelligible';

/** User role types */
export type UserRole = 'technician' | 'supervisor' | 'admin';

/**
 * Base interface for all syncable records
 */
export interface SyncableRecord {
  id: string;
  serverId?: string;
  syncStatus: SyncStatus;
  localUpdatedAt: number;
  serverUpdatedAt?: number;
}

/**
 * Work order interface
 * Matches WatermelonDB schema from CLAUDE.md
 */
export interface WorkOrder extends SyncableRecord {
  woNumber: string;
  siteId: string;
  assetId: string;
  title: string;
  description?: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assignedTo?: string;
  createdBy: string;
  dueDate?: number;
  startedAt?: number;
  completedAt?: number;
  completedBy?: string;
  completionNotes?: string;
  failureType?: FailureType;
  timeSpentMinutes?: number;
  signatureImageUrl?: string;
  signatureTimestamp?: number;
  signatureHash?: string;
  voiceNoteUrl?: string;
  voiceNoteConfidence?: VoiceNoteConfidence;
  needsEnrichment: boolean;
  isQuickLog: boolean;
}

/**
 * Asset interface
 * Matches WatermelonDB schema from CLAUDE.md
 */
export interface Asset extends SyncableRecord {
  siteId: string;
  assetNumber: string;
  name: string;
  description?: string;
  category: string;
  status: AssetStatus;
  locationDescription?: string;
  photoUrl?: string;
  meterType?: string;
  meterUnit?: string;
  meterCurrentReading?: number;
}

/**
 * Meter reading interface
 * Matches WatermelonDB schema from CLAUDE.md
 */
export interface MeterReading extends SyncableRecord {
  assetId: string;
  readingValue: number;
  readingDate: number;
  recordedBy: string;
  notes?: string;
}

/**
 * Work order photo interface
 * Matches WatermelonDB schema from CLAUDE.md
 */
export interface WorkOrderPhoto {
  id: string;
  serverId?: string;
  workOrderId: string;
  localUri: string;
  remoteUrl?: string;
  caption?: string;
  takenAt: number;
  syncStatus: SyncStatus;
}

/**
 * User interface for authentication
 */
export interface User {
  id: string;
  email: string;
  name: string;
  siteId: string;
  role: UserRole;
}

/**
 * Site interface
 */
export interface Site {
  id: string;
  name: string;
  organizationId: string;
  province: string;
}

/**
 * Signature payload for cryptographic signing
 * Per CMMS_MVP_Design_Guide_v6.md Part 4
 */
export interface SignaturePayload {
  woNumber: string;
  assetId: string;
  completedAt: string; // ISO 8601 UTC
  completedBy: string; // user UUID
  completionNotes: string; // '' if null
  failureType: FailureType;
  timeSpentMinutes: number;
  meterReadingAtCompletion: number; // 0 if null
  signatureImageHash: string; // SHA-256 of base64 image
  signatureTimestamp: string; // ISO 8601 UTC
}

/**
 * Voice note quality assessment
 * Per CMMS_MVP_Design_Guide_v6.md Part 2.8
 */
export interface VoiceNoteQuality {
  avgNoiseDb: number;
  speechDetected: boolean;
  confidenceScore: VoiceNoteConfidence;
  recommendation: string;
}

/**
 * Conflict resolution result
 * Per CMMS_MVP_Design_Guide_v6.md Part 3
 */
export interface ConflictResolution {
  fieldName: string;
  localValue: unknown;
  remoteValue: unknown;
  resolvedValue: unknown;
  rule: string;
  requiresReview: boolean;
}
