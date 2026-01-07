import { Model, Query, Relation } from '@nozbe/watermelondb';
import { field, text, children, relation, writer } from '@nozbe/watermelondb/decorators';
import type Asset from './Asset';
import type WorkOrderPhoto from './WorkOrderPhoto';

export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'emergency';
export type WorkOrderStatus = 'open' | 'in_progress' | 'completed';
export type FailureType = 'none' | 'wore_out' | 'broke' | 'unknown';
export type LocalSyncStatus = 'pending' | 'synced' | 'conflict';

export default class WorkOrder extends Model {
  static table = 'work_orders' as const;

  static associations = {
    assets: { type: 'belongs_to' as const, key: 'asset_id' },
    work_order_photos: { type: 'has_many' as const, foreignKey: 'work_order_id' },
  };

  @text('server_id') serverId!: string | null;
  @text('wo_number') woNumber!: string;
  @text('site_id') siteId!: string;
  @text('asset_id') assetId!: string;
  @text('title') title!: string;
  @text('description') description!: string | null;
  @text('priority') priority!: WorkOrderPriority;
  @text('status') status!: WorkOrderStatus;
  @text('assigned_to') assignedTo!: string | null;
  @text('created_by') createdBy!: string;
  @field('due_date') dueDate!: number | null;
  @field('started_at') startedAt!: number | null;
  @field('completed_at') completedAt!: number | null;
  @text('completed_by') completedBy!: string | null;
  @text('completion_notes') completionNotes!: string | null;
  @text('failure_type') failureType!: FailureType | null;
  @field('time_spent_minutes') timeSpentMinutes!: number | null;
  @text('signature_image_url') signatureImageUrl!: string | null;
  @field('signature_timestamp') signatureTimestamp!: number | null;
  @text('signature_hash') signatureHash!: string | null;
  @text('verification_code') verificationCode!: string | null;
  @text('voice_note_url') voiceNoteUrl!: string | null;
  @text('voice_note_confidence') voiceNoteConfidence!: string | null;
  @field('needs_enrichment') needsEnrichment!: boolean;
  @field('is_quick_log') isQuickLog!: boolean;
  @text('local_sync_status') localSyncStatus!: LocalSyncStatus;
  @field('local_updated_at') localUpdatedAt!: number;
  @field('server_updated_at') serverUpdatedAt!: number | null;

  @relation('assets', 'asset_id') asset!: Relation<Asset>;
  @children('work_order_photos') photos!: Query<WorkOrderPhoto>;

  get isOverdue(): boolean {
    if (!this.dueDate || this.status === 'completed') {
      return false;
    }
    return Date.now() > this.dueDate;
  }

  get isPending(): boolean {
    return this.status === 'open';
  }

  get isInProgress(): boolean {
    return this.status === 'in_progress';
  }

  get isCompleted(): boolean {
    return this.status === 'completed';
  }

  get isEmergency(): boolean {
    return this.priority === 'emergency';
  }

  @writer async markAsStarted(): Promise<void> {
    await this.update(record => {
      record.status = 'in_progress';
      record.startedAt = Date.now();
      record.localSyncStatus = 'pending';
      record.localUpdatedAt = Date.now();
    });
  }

  @writer async markAsCompleted(
    completedBy: string,
    notes?: string,
    failureType?: FailureType,
    timeSpentMinutes?: number
  ): Promise<void> {
    await this.update(record => {
      record.status = 'completed';
      record.completedAt = Date.now();
      record.completedBy = completedBy;
      if (notes !== undefined) {
        record.completionNotes = notes;
      }
      if (failureType !== undefined) {
        record.failureType = failureType;
      }
      if (timeSpentMinutes !== undefined) {
        record.timeSpentMinutes = timeSpentMinutes;
      }
      record.localSyncStatus = 'pending';
      record.localUpdatedAt = Date.now();
    });
  }

  @writer async updateLocalSyncStatus(status: LocalSyncStatus): Promise<void> {
    await this.update(record => {
      record.localSyncStatus = status;
      if (status === 'synced') {
        record.serverUpdatedAt = Date.now();
      }
    });
  }
}
