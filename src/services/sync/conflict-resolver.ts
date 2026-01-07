/**
 * Conflict detection and resolution for sync operations
 *
 * Implements field-level conflict resolution per CMMS_MVP_Design_Guide_v6.md Part 3.
 * This module handles Week 5 basic conflict detection with "latest wins" default
 * and business rule overrides for specific fields.
 *
 * @module sync/conflict-resolver
 */

import type { ConflictResolution } from '@/types';
import type WorkOrder from '@/database/models/WorkOrder';
import type Asset from '@/database/models/Asset';
import type MeterReading from '@/database/models/MeterReading';
import type { WorkOrderRow, AssetRow, MeterReadingRow, WorkOrderPhotoRow } from './sync-queries';

/**
 * Result of conflict resolution for a single record
 */
export interface ConflictResult<T> {
  /** Merged field values to apply */
  merged: Partial<T>;
  /** Whether any conflicts were detected */
  hasConflict: boolean;
  /** Details of each field resolution */
  resolutions: ConflictResolution[];
  /** Escalation triggers that require supervisor review */
  escalations: string[];
}

/**
 * Priority order for work orders (higher index = higher priority)
 */
const PRIORITY_ORDER = ['low', 'medium', 'high', 'emergency'] as const;

/**
 * Status order for work orders (higher index = more advanced state)
 */
const WO_STATUS_ORDER = ['open', 'in_progress', 'completed'] as const;

/**
 * Status order for assets (down wins for safety)
 */
const ASSET_STATUS_ORDER = ['operational', 'limited', 'down'] as const;

/**
 * Check if there's a conflict between local and remote records
 */
export function hasConflict<T extends { serverUpdatedAt: number | null; localSyncStatus: string }>(
  local: T,
  remoteUpdatedAt: string
): boolean {
  // Conflict exists when local has pending changes AND server version is newer
  if (local.localSyncStatus !== 'pending') {
    return false;
  }

  const remoteTimestamp = new Date(remoteUpdatedAt).getTime();
  const localServerTimestamp = local.serverUpdatedAt || 0;

  return remoteTimestamp > localServerTimestamp;
}

/**
 * Resolve conflicting priority values - higher priority wins
 */
function resolvePriority(local: string, remote: string): string {
  const localIdx = PRIORITY_ORDER.indexOf(local as (typeof PRIORITY_ORDER)[number]);
  const remoteIdx = PRIORITY_ORDER.indexOf(remote as (typeof PRIORITY_ORDER)[number]);
  return localIdx > remoteIdx ? local : remote;
}

/**
 * Resolve conflicting work order status values - completion wins
 */
function resolveWorkOrderStatus(local: string, remote: string): string {
  const localIdx = WO_STATUS_ORDER.indexOf(local as (typeof WO_STATUS_ORDER)[number]);
  const remoteIdx = WO_STATUS_ORDER.indexOf(remote as (typeof WO_STATUS_ORDER)[number]);
  return localIdx > remoteIdx ? local : remote;
}

/**
 * Resolve conflicting asset status values - down wins (safety first)
 */
function resolveAssetStatus(local: string, remote: string): string {
  const localIdx = ASSET_STATUS_ORDER.indexOf(local as (typeof ASSET_STATUS_ORDER)[number]);
  const remoteIdx = ASSET_STATUS_ORDER.indexOf(remote as (typeof ASSET_STATUS_ORDER)[number]);
  return localIdx > remoteIdx ? local : remote;
}

/**
 * Append conflicting text values with separator
 */
function appendText(
  local: string | null,
  remote: string | null,
  localMeta?: string,
  remoteMeta?: string
): string | null {
  if (!local && !remote) return null;
  if (!local) return remote;
  if (!remote) return local;
  if (local === remote) return local;

  const localHeader = localMeta ? `[${localMeta}]\n` : '';
  const remoteHeader = remoteMeta ? `[${remoteMeta}]\n` : '';

  return `${remoteHeader}${remote}\n---\n${localHeader}${local}`;
}

/**
 * Resolve conflicting timestamps - earlier wins
 */
function resolveEarlierTimestamp(local: number | null, remote: number | null): number | null {
  if (local === null) return remote;
  if (remote === null) return local;
  return Math.min(local, remote);
}

/**
 * Resolve conflicting meter readings - higher wins (meters don't go backwards)
 */
function resolveHigherNumber(local: number | null, remote: number | null): number | null {
  if (local === null) return remote;
  if (remote === null) return local;
  return Math.max(local, remote);
}

/**
 * Detect escalation conditions for work orders
 */
function detectWorkOrderEscalations(
  local: WorkOrder,
  remote: WorkOrderRow,
  syncTimestamp: number
): string[] {
  const escalations: string[] = [];

  // Both completed by different users
  if (
    local.status === 'completed' &&
    remote.status === 'completed' &&
    local.completedBy &&
    remote.completed_by &&
    local.completedBy !== remote.completed_by
  ) {
    escalations.push('completion_conflict');
  }

  // Backdated completion (>24 hours before sync)
  if (remote.completed_at) {
    const completedTime = new Date(remote.completed_at).getTime();
    const hoursBeforeSync = (syncTimestamp - completedTime) / (1000 * 60 * 60);
    if (hoursBeforeSync > 24) {
      escalations.push('backdated_completion');
    }
  }

  // Quick completion fraud (<5 min, no notes)
  if (
    remote.status === 'completed' &&
    remote.time_spent_minutes !== null &&
    remote.time_spent_minutes < 5 &&
    !remote.completion_notes
  ) {
    escalations.push('quick_completion_no_notes');
  }

  return escalations;
}

/**
 * Resolve work order conflicts
 */
export function resolveWorkOrderConflict(
  local: WorkOrder,
  remote: WorkOrderRow,
  syncTimestamp: number = Date.now()
): ConflictResult<WorkOrderRow> {
  const merged: Partial<WorkOrderRow> = {};
  const resolutions: ConflictResolution[] = [];
  let conflictDetected = false;

  // Check if actual conflict exists
  if (!hasConflict(local, remote.updated_at)) {
    return {
      merged: {},
      hasConflict: false,
      resolutions: [],
      escalations: [],
    };
  }

  conflictDetected = true;

  // Detect escalations first
  const escalations = detectWorkOrderEscalations(local, remote, syncTimestamp);

  // Status resolution - completion wins
  // Edge case: when both are in_progress, later started_at wins (most recent start is canonical)
  if (local.status !== remote.status) {
    const resolvedStatus = resolveWorkOrderStatus(local.status, remote.status);
    merged.status = resolvedStatus;
    resolutions.push({
      fieldName: 'status',
      localValue: local.status,
      remoteValue: remote.status,
      resolvedValue: resolvedStatus,
      rule: 'completion_wins',
      requiresReview: false,
    });
  } else if (local.status === 'in_progress' && remote.status === 'in_progress') {
    // Both in_progress - compare started_at to determine which is the "real" in_progress state
    // Later started_at wins (the most recent start is the canonical state)
    const remoteStartedAt = remote.started_at ? new Date(remote.started_at).getTime() : 0;
    const localStartedAt = local.startedAt || 0;

    if (localStartedAt !== remoteStartedAt) {
      // The later start time wins
      const laterStartIsLocal = localStartedAt > remoteStartedAt;
      const resolvedStartedAt = Math.max(localStartedAt, remoteStartedAt);
      merged.started_at = resolvedStartedAt ? new Date(resolvedStartedAt).toISOString() : null;

      resolutions.push({
        fieldName: 'started_at_in_progress',
        localValue: localStartedAt,
        remoteValue: remoteStartedAt,
        resolvedValue: resolvedStartedAt,
        rule: 'later_start_wins',
        requiresReview: false,
      });

      // If local started later, prefer local's assigned_to as well (they took over)
      if (laterStartIsLocal && local.assignedTo !== remote.assigned_to) {
        merged.assigned_to = local.assignedTo;
      }
    }
  }

  // Priority resolution - higher priority wins
  if (local.priority !== remote.priority) {
    const resolvedPriority = resolvePriority(local.priority, remote.priority);
    merged.priority = resolvedPriority;
    resolutions.push({
      fieldName: 'priority',
      localValue: local.priority,
      remoteValue: remote.priority,
      resolvedValue: resolvedPriority,
      rule: 'higher_priority_wins',
      requiresReview: false,
    });
  }

  // Description - append both
  if (local.description !== remote.description) {
    const resolvedDescription = appendText(local.description, remote.description);
    merged.description = resolvedDescription;
    resolutions.push({
      fieldName: 'description',
      localValue: local.description,
      remoteValue: remote.description,
      resolvedValue: resolvedDescription,
      rule: 'append_both',
      requiresReview: false,
    });
  }

  // Completion notes - append both with metadata
  if (local.completionNotes !== remote.completion_notes) {
    const localMeta = `Local - ${local.completedBy || 'unknown'}`;
    const remoteMeta = `Remote - ${remote.completed_by || 'unknown'}`;
    const resolvedNotes = appendText(
      local.completionNotes,
      remote.completion_notes,
      localMeta,
      remoteMeta
    );
    merged.completion_notes = resolvedNotes;
    resolutions.push({
      fieldName: 'completion_notes',
      localValue: local.completionNotes,
      remoteValue: remote.completion_notes,
      resolvedValue: resolvedNotes,
      rule: 'append_both',
      requiresReview: false,
    });
  }

  // Due date - earlier wins
  const remoteDueDate = remote.due_date ? new Date(remote.due_date).getTime() : null;
  if (local.dueDate !== remoteDueDate) {
    const resolvedDueDate = resolveEarlierTimestamp(local.dueDate, remoteDueDate);
    merged.due_date = resolvedDueDate ? new Date(resolvedDueDate).toISOString() : null;
    resolutions.push({
      fieldName: 'due_date',
      localValue: local.dueDate,
      remoteValue: remoteDueDate,
      resolvedValue: resolvedDueDate,
      rule: 'earlier_wins',
      requiresReview: false,
    });
  }

  // Started at - earlier wins
  const remoteStartedAt = remote.started_at ? new Date(remote.started_at).getTime() : null;
  if (local.startedAt !== remoteStartedAt) {
    const resolvedStartedAt = resolveEarlierTimestamp(local.startedAt, remoteStartedAt);
    merged.started_at = resolvedStartedAt ? new Date(resolvedStartedAt).toISOString() : null;
    resolutions.push({
      fieldName: 'started_at',
      localValue: local.startedAt,
      remoteValue: remoteStartedAt,
      resolvedValue: resolvedStartedAt,
      rule: 'earlier_wins',
      requiresReview: false,
    });
  }

  // Completed at - earlier wins
  const remoteCompletedAt = remote.completed_at ? new Date(remote.completed_at).getTime() : null;
  if (local.completedAt !== remoteCompletedAt) {
    const resolvedCompletedAt = resolveEarlierTimestamp(local.completedAt, remoteCompletedAt);
    merged.completed_at = resolvedCompletedAt ? new Date(resolvedCompletedAt).toISOString() : null;

    // Completed by should follow completed at
    if (resolvedCompletedAt === local.completedAt) {
      merged.completed_by = local.completedBy;
    } else {
      merged.completed_by = remote.completed_by;
    }

    resolutions.push({
      fieldName: 'completed_at',
      localValue: local.completedAt,
      remoteValue: remoteCompletedAt,
      resolvedValue: resolvedCompletedAt,
      rule: 'earlier_wins',
      requiresReview: escalations.includes('completion_conflict'),
    });
  }

  // Time spent - max wins (could be sum if both worked, but using max for now)
  if (local.timeSpentMinutes !== remote.time_spent_minutes) {
    const resolvedTime = resolveHigherNumber(local.timeSpentMinutes, remote.time_spent_minutes);
    merged.time_spent_minutes = resolvedTime;
    resolutions.push({
      fieldName: 'time_spent_minutes',
      localValue: local.timeSpentMinutes,
      remoteValue: remote.time_spent_minutes,
      resolvedValue: resolvedTime,
      rule: 'max_wins',
      requiresReview: false,
    });
  }

  // Assigned to - later wins
  if (local.assignedTo !== remote.assigned_to) {
    // Use local if local was updated more recently
    const localUpdatedAt = local.localUpdatedAt;
    const remoteUpdatedAt = new Date(remote.updated_at).getTime();
    const resolvedAssignedTo =
      localUpdatedAt > remoteUpdatedAt ? local.assignedTo : remote.assigned_to;
    merged.assigned_to = resolvedAssignedTo;
    resolutions.push({
      fieldName: 'assigned_to',
      localValue: local.assignedTo,
      remoteValue: remote.assigned_to,
      resolvedValue: resolvedAssignedTo,
      rule: 'latest_wins',
      requiresReview: false,
    });
  }

  // Needs enrichment - false wins (enriched beats unenriched)
  if (local.needsEnrichment !== remote.needs_enrichment) {
    const resolvedEnrichment = local.needsEnrichment && remote.needs_enrichment;
    merged.needs_enrichment = resolvedEnrichment;
    resolutions.push({
      fieldName: 'needs_enrichment',
      localValue: local.needsEnrichment,
      remoteValue: remote.needs_enrichment,
      resolvedValue: resolvedEnrichment,
      rule: 'false_wins',
      requiresReview: false,
    });
  }

  // Title - latest wins
  if (local.title !== remote.title) {
    const localUpdatedAt = local.localUpdatedAt;
    const remoteUpdatedAt = new Date(remote.updated_at).getTime();
    const resolvedTitle = localUpdatedAt > remoteUpdatedAt ? local.title : remote.title;
    merged.title = resolvedTitle;
    resolutions.push({
      fieldName: 'title',
      localValue: local.title,
      remoteValue: remote.title,
      resolvedValue: resolvedTitle,
      rule: 'latest_wins',
      requiresReview: false,
    });
  }

  // Failure type - latest wins
  if (local.failureType !== remote.failure_type) {
    const localUpdatedAt = local.localUpdatedAt;
    const remoteUpdatedAt = new Date(remote.updated_at).getTime();
    const resolvedFailureType =
      localUpdatedAt > remoteUpdatedAt ? local.failureType : remote.failure_type;
    merged.failure_type = resolvedFailureType;
    resolutions.push({
      fieldName: 'failure_type',
      localValue: local.failureType,
      remoteValue: remote.failure_type,
      resolvedValue: resolvedFailureType,
      rule: 'latest_wins',
      requiresReview: false,
    });
  }

  // Signature resolution - signed wins, earlier signature wins if both signed
  const localSigned = !!local.signatureImageUrl;
  const remoteSigned = !!remote.signature_image_url;

  if (localSigned !== remoteSigned || local.signatureImageUrl !== remote.signature_image_url) {
    let resolvedSignatureUrl: string | null;
    let resolvedSignatureTimestamp: string | null;
    let resolvedSignatureHash: string | null;
    let rule: string;

    if (localSigned && !remoteSigned) {
      // Local signed, remote unsigned - local wins
      resolvedSignatureUrl = local.signatureImageUrl;
      resolvedSignatureTimestamp = local.signatureTimestamp
        ? new Date(local.signatureTimestamp).toISOString()
        : null;
      resolvedSignatureHash = local.signatureHash;
      rule = 'signed_wins';
    } else if (!localSigned && remoteSigned) {
      // Remote signed, local unsigned - remote wins
      resolvedSignatureUrl = remote.signature_image_url;
      resolvedSignatureTimestamp = remote.signature_timestamp;
      resolvedSignatureHash = remote.signature_hash;
      rule = 'signed_wins';
    } else {
      // Both signed - earlier signature wins
      const localSigTime = local.signatureTimestamp || Infinity;
      const remoteSigTime = remote.signature_timestamp
        ? new Date(remote.signature_timestamp).getTime()
        : Infinity;

      if (localSigTime <= remoteSigTime) {
        resolvedSignatureUrl = local.signatureImageUrl;
        resolvedSignatureTimestamp = local.signatureTimestamp
          ? new Date(local.signatureTimestamp).toISOString()
          : null;
        resolvedSignatureHash = local.signatureHash;
      } else {
        resolvedSignatureUrl = remote.signature_image_url;
        resolvedSignatureTimestamp = remote.signature_timestamp;
        resolvedSignatureHash = remote.signature_hash;
      }
      rule = 'earlier_signature_wins';
    }

    merged.signature_image_url = resolvedSignatureUrl;
    merged.signature_timestamp = resolvedSignatureTimestamp;
    merged.signature_hash = resolvedSignatureHash;

    resolutions.push({
      fieldName: 'signature',
      localValue: { url: local.signatureImageUrl, timestamp: local.signatureTimestamp },
      remoteValue: { url: remote.signature_image_url, timestamp: remote.signature_timestamp },
      resolvedValue: { url: resolvedSignatureUrl, timestamp: resolvedSignatureTimestamp },
      rule,
      requiresReview: false,
    });
  }

  // Detect signature mismatch escalation (signature user ≠ completed_by)
  // This checks if the signature seems to belong to a different user than who completed the WO
  // We detect this by checking if both local and remote are signed by different completedBy users
  if (localSigned && remoteSigned && local.completedBy && remote.completed_by) {
    if (local.completedBy !== remote.completed_by) {
      // Both versions completed and signed by different users - needs review
      if (!escalations.includes('signature_mismatch')) {
        escalations.push('signature_mismatch');
      }
    }
  }

  // Voice note resolution - keep both by appending with separator
  if (local.voiceNoteUrl !== remote.voice_note_url) {
    let resolvedVoiceNoteUrl: string | null;
    let resolvedVoiceNoteConfidence: string | null;

    if (!local.voiceNoteUrl) {
      resolvedVoiceNoteUrl = remote.voice_note_url;
      resolvedVoiceNoteConfidence = remote.voice_note_confidence;
    } else if (!remote.voice_note_url) {
      resolvedVoiceNoteUrl = local.voiceNoteUrl;
      resolvedVoiceNoteConfidence = local.voiceNoteConfidence;
    } else {
      // Both have voice notes - keep both URLs with separator
      // Format: url1|url2 (can be parsed as array later)
      resolvedVoiceNoteUrl = `${remote.voice_note_url}|${local.voiceNoteUrl}`;
      // For confidence, keep both as well
      resolvedVoiceNoteConfidence =
        remote.voice_note_confidence && local.voiceNoteConfidence
          ? `${remote.voice_note_confidence}|${local.voiceNoteConfidence}`
          : remote.voice_note_confidence || local.voiceNoteConfidence;
    }

    merged.voice_note_url = resolvedVoiceNoteUrl;
    merged.voice_note_confidence = resolvedVoiceNoteConfidence;

    resolutions.push({
      fieldName: 'voice_note_url',
      localValue: local.voiceNoteUrl,
      remoteValue: remote.voice_note_url,
      resolvedValue: resolvedVoiceNoteUrl,
      rule: 'keep_both',
      requiresReview: false,
    });
  }

  return {
    merged,
    hasConflict: conflictDetected,
    resolutions,
    escalations,
  };
}

/**
 * Resolve asset conflicts
 */
export function resolveAssetConflict(local: Asset, remote: AssetRow): ConflictResult<AssetRow> {
  const merged: Partial<AssetRow> = {};
  const resolutions: ConflictResolution[] = [];
  let conflictDetected = false;

  // Check if actual conflict exists
  if (!hasConflict(local, remote.updated_at)) {
    return {
      merged: {},
      hasConflict: false,
      resolutions: [],
      escalations: [],
    };
  }

  conflictDetected = true;

  // Status resolution - down wins (safety first)
  if (local.status !== remote.status) {
    const resolvedStatus = resolveAssetStatus(local.status, remote.status);
    merged.status = resolvedStatus;
    resolutions.push({
      fieldName: 'status',
      localValue: local.status,
      remoteValue: remote.status,
      resolvedValue: resolvedStatus,
      rule: 'down_wins_safety',
      requiresReview: false,
    });
  }

  // Meter reading - higher wins (meters don't go backwards)
  if (local.meterCurrentReading !== remote.meter_current_reading) {
    const resolvedReading = resolveHigherNumber(
      local.meterCurrentReading,
      remote.meter_current_reading
    );
    merged.meter_current_reading = resolvedReading;
    resolutions.push({
      fieldName: 'meter_current_reading',
      localValue: local.meterCurrentReading,
      remoteValue: remote.meter_current_reading,
      resolvedValue: resolvedReading,
      rule: 'higher_wins',
      requiresReview: false,
    });
  }

  // Description - append both
  if (local.description !== remote.description) {
    const resolvedDescription = appendText(local.description, remote.description);
    merged.description = resolvedDescription;
    resolutions.push({
      fieldName: 'description',
      localValue: local.description,
      remoteValue: remote.description,
      resolvedValue: resolvedDescription,
      rule: 'append_both',
      requiresReview: false,
    });
  }

  // Name - latest wins
  if (local.name !== remote.name) {
    const localUpdatedAt = local.localUpdatedAt;
    const remoteUpdatedAt = new Date(remote.updated_at).getTime();
    const resolvedName = localUpdatedAt > remoteUpdatedAt ? local.name : remote.name;
    merged.name = resolvedName;
    resolutions.push({
      fieldName: 'name',
      localValue: local.name,
      remoteValue: remote.name,
      resolvedValue: resolvedName,
      rule: 'latest_wins',
      requiresReview: false,
    });
  }

  // Location description - latest wins
  if (local.locationDescription !== remote.location_description) {
    const localUpdatedAt = local.localUpdatedAt;
    const remoteUpdatedAt = new Date(remote.updated_at).getTime();
    const resolvedLocation =
      localUpdatedAt > remoteUpdatedAt ? local.locationDescription : remote.location_description;
    merged.location_description = resolvedLocation;
    resolutions.push({
      fieldName: 'location_description',
      localValue: local.locationDescription,
      remoteValue: remote.location_description,
      resolvedValue: resolvedLocation,
      rule: 'latest_wins',
      requiresReview: false,
    });
  }

  // Photo URL - latest wins
  if (local.photoUrl !== remote.photo_url) {
    const localUpdatedAt = local.localUpdatedAt;
    const remoteUpdatedAt = new Date(remote.updated_at).getTime();
    const resolvedPhotoUrl = localUpdatedAt > remoteUpdatedAt ? local.photoUrl : remote.photo_url;
    merged.photo_url = resolvedPhotoUrl;
    resolutions.push({
      fieldName: 'photo_url',
      localValue: local.photoUrl,
      remoteValue: remote.photo_url,
      resolvedValue: resolvedPhotoUrl,
      rule: 'latest_wins',
      requiresReview: false,
    });
  }

  return {
    merged,
    hasConflict: conflictDetected,
    resolutions,
    escalations: [], // No escalations for assets currently
  };
}

/**
 * Check if meter reading has a conflict
 * MeterReading doesn't have serverUpdatedAt, so we use a simpler check
 */
export function hasMeterReadingConflict(local: MeterReading, remoteUpdatedAt: string): boolean {
  // Conflict exists when local has pending changes AND we're receiving server updates
  if (local.localSyncStatus !== 'pending') {
    return false;
  }

  // If local has pending changes and server is sending an update, there's a conflict
  const remoteTimestamp = new Date(remoteUpdatedAt).getTime();
  const localTimestamp = local.localUpdatedAt || 0;

  return remoteTimestamp > localTimestamp;
}

/**
 * Tolerance for "same time" detection (5 minutes in milliseconds)
 */
const SAME_TIME_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Resolve meter reading conflicts
 * Per CMMS_MVP_Design_Guide_v6.md Part 3 edge cases:
 * - Same asset, same time, different values → Flag for review (keep both)
 * - Out-of-order readings → Flag for review
 */
export function resolveMeterReadingConflict(
  local: MeterReading,
  remote: MeterReadingRow
): ConflictResult<MeterReadingRow> {
  const merged: Partial<MeterReadingRow> = {};
  const resolutions: ConflictResolution[] = [];
  const escalations: string[] = [];
  let conflictDetected = false;

  // Check if actual conflict exists
  if (!hasMeterReadingConflict(local, remote.updated_at)) {
    return {
      merged: {},
      hasConflict: false,
      resolutions: [],
      escalations: [],
    };
  }

  conflictDetected = true;

  // Check for same-time edge case
  const remoteReadingTime = new Date(remote.reading_date).getTime();
  const localReadingTime = local.readingDate;
  const timeDiff = Math.abs(localReadingTime - remoteReadingTime);

  // Same asset, same time (within tolerance), different values → keep both, escalate
  if (timeDiff <= SAME_TIME_TOLERANCE_MS && local.readingValue !== remote.reading_value) {
    escalations.push('same_time_different_values');

    resolutions.push({
      fieldName: 'reading_value',
      localValue: local.readingValue,
      remoteValue: remote.reading_value,
      resolvedValue: null, // Both should be kept as separate records
      rule: 'keep_both_records',
      requiresReview: true,
    });

    // Don't merge - flag that both records should be kept
    // The sync engine will need to handle this specially
    return {
      merged: {},
      hasConflict: conflictDetected,
      resolutions,
      escalations,
    };
  }

  // Reading value - higher wins (meters don't go backwards)
  if (local.readingValue !== remote.reading_value) {
    const resolvedValue = resolveHigherNumber(local.readingValue, remote.reading_value);
    merged.reading_value = resolvedValue!;

    // Detect extreme jump (>10x difference suggests error)
    const minVal = Math.min(local.readingValue, remote.reading_value);
    const maxVal = Math.max(local.readingValue, remote.reading_value);
    const ratio = minVal > 0 ? maxVal / minVal : maxVal > 0 ? Infinity : 1;

    if (ratio > 10) {
      escalations.push('extreme_reading_jump');
    }

    // Detect out-of-order reading (later time but lower value)
    // This suggests data entry error or meter reset
    const localIsNewer = localReadingTime > remoteReadingTime;
    const localIsLower = local.readingValue < remote.reading_value;

    if ((localIsNewer && localIsLower) || (!localIsNewer && !localIsLower && timeDiff > 0)) {
      // Newer reading has lower value - suspicious
      if (localIsNewer && localIsLower) {
        escalations.push('out_of_order_reading');
      }
    }

    resolutions.push({
      fieldName: 'reading_value',
      localValue: local.readingValue,
      remoteValue: remote.reading_value,
      resolvedValue: resolvedValue,
      rule: 'higher_wins',
      requiresReview: ratio > 10 || escalations.includes('out_of_order_reading'),
    });
  }

  // Notes - append both
  if (local.notes !== remote.notes) {
    const resolvedNotes = appendText(local.notes, remote.notes);
    merged.notes = resolvedNotes;
    resolutions.push({
      fieldName: 'notes',
      localValue: local.notes,
      remoteValue: remote.notes,
      resolvedValue: resolvedNotes,
      rule: 'append_both',
      requiresReview: false,
    });
  }

  // Reading date - earlier wins (first reading is canonical)
  const remoteReadingDate = new Date(remote.reading_date).getTime();
  if (local.readingDate !== remoteReadingDate) {
    const resolvedDate = resolveEarlierTimestamp(local.readingDate, remoteReadingDate);
    merged.reading_date = new Date(resolvedDate!).toISOString();
    resolutions.push({
      fieldName: 'reading_date',
      localValue: local.readingDate,
      remoteValue: remoteReadingDate,
      resolvedValue: resolvedDate,
      rule: 'earlier_wins',
      requiresReview: false,
    });
  }

  return {
    merged,
    hasConflict: conflictDetected,
    resolutions,
    escalations,
  };
}

/**
 * Result of photo conflict resolution
 */
export interface PhotoConflictResult {
  /** All photos to keep (union of local and remote) */
  photos: Array<{
    serverId: string | null;
    localUri: string | null;
    remoteUrl: string | null;
    caption: string | null;
    takenAt: number;
    source: 'local' | 'remote' | 'merged';
  }>;
  /** Whether any conflicts were detected */
  hasConflict: boolean;
  /** Number of photos that had caption merges */
  captionMergeCount: number;
  /** Details of merged captions */
  mergedCaptions: Array<{
    photoId: string;
    localCaption: string | null;
    remoteCaption: string | null;
    mergedCaption: string;
  }>;
}

/**
 * Resolve work order photo conflicts
 * Strategy: Union all photos (never delete), merge captions if same photo exists on both sides
 *
 * Per CMMS_MVP_Design_Guide_v6.md Part 3:
 * - Multiple devices add photos → Union all (keep every photo)
 * - Same photo, different captions → Append both captions
 */
export function resolveWorkOrderPhotoConflict(
  localPhotos: Array<{
    id: string;
    serverId: string | null;
    localUri: string | null;
    remoteUrl: string | null;
    caption: string | null;
    takenAt: number;
  }>,
  remotePhotos: WorkOrderPhotoRow[]
): PhotoConflictResult {
  const result: PhotoConflictResult = {
    photos: [],
    hasConflict: false,
    captionMergeCount: 0,
    mergedCaptions: [],
  };

  // Build map of remote photos by server ID for quick lookup
  const remoteByServerId = new Map<string, WorkOrderPhotoRow>();
  for (const rp of remotePhotos) {
    remoteByServerId.set(rp.id, rp);
  }

  // Build map of remote photos by remote_url for matching uploaded photos
  const remoteByUrl = new Map<string, WorkOrderPhotoRow>();
  for (const rp of remotePhotos) {
    if (rp.remote_url) {
      remoteByUrl.set(rp.remote_url, rp);
    }
  }

  // Track which remote photos we've matched
  const matchedRemoteIds = new Set<string>();

  // Process local photos first
  for (const local of localPhotos) {
    let matchedRemote: WorkOrderPhotoRow | undefined;

    // Try to match by serverId first
    if (local.serverId) {
      matchedRemote = remoteByServerId.get(local.serverId);
    }

    // If no match and local has remoteUrl, try matching by URL
    if (!matchedRemote && local.remoteUrl) {
      matchedRemote = remoteByUrl.get(local.remoteUrl);
    }

    if (matchedRemote) {
      // Found matching photo - check for caption conflict
      matchedRemoteIds.add(matchedRemote.id);

      if (local.caption !== matchedRemote.caption) {
        // Caption conflict - merge both
        result.hasConflict = true;
        result.captionMergeCount++;

        const mergedCaption = appendText(local.caption, matchedRemote.caption);

        result.mergedCaptions.push({
          photoId: matchedRemote.id,
          localCaption: local.caption,
          remoteCaption: matchedRemote.caption,
          mergedCaption: mergedCaption || '',
        });

        result.photos.push({
          serverId: matchedRemote.id,
          localUri: local.localUri,
          remoteUrl: matchedRemote.remote_url,
          caption: mergedCaption,
          takenAt: new Date(matchedRemote.taken_at).getTime(),
          source: 'merged',
        });
      } else {
        // No caption conflict - keep as-is
        result.photos.push({
          serverId: matchedRemote.id,
          localUri: local.localUri,
          remoteUrl: matchedRemote.remote_url,
          caption: local.caption,
          takenAt: local.takenAt,
          source: 'local',
        });
      }
    } else {
      // No matching remote photo - this is a local-only photo
      result.photos.push({
        serverId: local.serverId,
        localUri: local.localUri,
        remoteUrl: local.remoteUrl,
        caption: local.caption,
        takenAt: local.takenAt,
        source: 'local',
      });
    }
  }

  // Add any remote photos that weren't matched (new photos from server)
  for (const remote of remotePhotos) {
    if (!matchedRemoteIds.has(remote.id)) {
      result.hasConflict = true; // New photo from remote indicates conflict scenario
      result.photos.push({
        serverId: remote.id,
        localUri: null,
        remoteUrl: remote.remote_url,
        caption: remote.caption,
        takenAt: new Date(remote.taken_at).getTime(),
        source: 'remote',
      });
    }
  }

  return result;
}
