import { Model, Relation } from '@nozbe/watermelondb';
import { field, text, relation, writer } from '@nozbe/watermelondb/decorators';
import type Asset from './Asset';

export type LocalSyncStatus = 'pending' | 'synced' | 'conflict';

export default class MeterReading extends Model {
  static table = 'meter_readings' as const;

  static associations = {
    assets: { type: 'belongs_to' as const, key: 'asset_id' },
  };

  @text('server_id') serverId!: string | null;
  @text('asset_id') assetId!: string;
  @field('reading_value') readingValue!: number;
  @field('reading_date') readingDate!: number;
  @text('recorded_by') recordedBy!: string;
  @text('notes') notes!: string | null;
  @text('local_sync_status') localSyncStatus!: LocalSyncStatus;
  @field('local_updated_at') localUpdatedAt!: number;

  @relation('assets', 'asset_id') asset!: Relation<Asset>;

  get formattedDate(): string {
    return new Date(this.readingDate).toLocaleDateString();
  }

  @writer async updateLocalSyncStatus(status: LocalSyncStatus): Promise<void> {
    await this.update(record => {
      record.localSyncStatus = status;
    });
  }
}
