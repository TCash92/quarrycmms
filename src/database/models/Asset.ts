import { Model, Query } from '@nozbe/watermelondb';
import { field, text, children, writer } from '@nozbe/watermelondb/decorators';
import type WorkOrder from './WorkOrder';
import type MeterReading from './MeterReading';

export type AssetStatus = 'operational' | 'down' | 'limited';
export type LocalSyncStatus = 'pending' | 'synced' | 'conflict';

export default class Asset extends Model {
  static table = 'assets' as const;

  static associations = {
    work_orders: { type: 'has_many' as const, foreignKey: 'asset_id' },
    meter_readings: { type: 'has_many' as const, foreignKey: 'asset_id' },
  };

  @text('server_id') serverId!: string | null;
  @text('site_id') siteId!: string;
  @text('asset_number') assetNumber!: string;
  @text('name') name!: string;
  @text('description') description!: string | null;
  @text('category') category!: string;
  @text('status') status!: AssetStatus;
  @text('location_description') locationDescription!: string | null;
  @text('photo_url') photoUrl!: string | null;
  @text('meter_type') meterType!: string | null;
  @text('meter_unit') meterUnit!: string | null;
  @field('meter_current_reading') meterCurrentReading!: number | null;
  @text('local_sync_status') localSyncStatus!: LocalSyncStatus;
  @field('local_updated_at') localUpdatedAt!: number;
  @field('server_updated_at') serverUpdatedAt!: number | null;

  @children('work_orders') workOrders!: Query<WorkOrder>;
  @children('meter_readings') meterReadings!: Query<MeterReading>;

  get hasMeter(): boolean {
    return this.meterType !== null && this.meterType !== '';
  }

  get displayName(): string {
    return `${this.assetNumber} - ${this.name}`;
  }

  get isOperational(): boolean {
    return this.status === 'operational';
  }

  get isDown(): boolean {
    return this.status === 'down';
  }

  @writer async updateStatus(newStatus: AssetStatus): Promise<void> {
    await this.update(record => {
      record.status = newStatus;
      record.localSyncStatus = 'pending';
      record.localUpdatedAt = Date.now();
    });
  }

  @writer async updateMeterReading(reading: number): Promise<void> {
    await this.update(record => {
      record.meterCurrentReading = reading;
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
