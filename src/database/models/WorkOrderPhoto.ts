import { Model, Relation } from '@nozbe/watermelondb';
import { field, text, relation, writer } from '@nozbe/watermelondb/decorators';
import type WorkOrder from './WorkOrder';

export type LocalSyncStatus = 'pending' | 'synced' | 'conflict';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export default class WorkOrderPhoto extends Model {
  static table = 'work_order_photos' as const;

  static associations = {
    work_orders: { type: 'belongs_to' as const, key: 'work_order_id' },
  };

  @text('server_id') serverId!: string | null;
  @text('work_order_id') workOrderId!: string;
  @text('local_uri') localUri!: string;
  @text('remote_url') remoteUrl!: string | null;
  @text('caption') caption!: string | null;
  @field('taken_at') takenAt!: number;
  @text('local_sync_status') localSyncStatus!: LocalSyncStatus;

  @relation('work_orders', 'work_order_id') workOrder!: Relation<WorkOrder>;

  get ageInDays(): number {
    return Math.floor((Date.now() - this.takenAt) / MILLISECONDS_PER_DAY);
  }

  get needsSync(): boolean {
    return this.localSyncStatus === 'pending';
  }

  get isSynced(): boolean {
    return this.localSyncStatus === 'synced';
  }

  get hasRemoteUrl(): boolean {
    return this.remoteUrl !== null && this.remoteUrl !== '';
  }

  @writer async markAsSynced(remoteUrl: string): Promise<void> {
    await this.update(record => {
      record.remoteUrl = remoteUrl;
      record.localSyncStatus = 'synced';
    });
  }

  @writer async updateLocalSyncStatus(status: LocalSyncStatus): Promise<void> {
    await this.update(record => {
      record.localSyncStatus = status;
    });
  }
}
