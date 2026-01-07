import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'work_orders',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'wo_number', type: 'string', isIndexed: true },
        { name: 'site_id', type: 'string', isIndexed: true },
        { name: 'asset_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'priority', type: 'string', isIndexed: true }, // 'low' | 'medium' | 'high' | 'emergency'
        { name: 'status', type: 'string', isIndexed: true }, // 'open' | 'in_progress' | 'completed'
        { name: 'assigned_to', type: 'string', isOptional: true },
        { name: 'created_by', type: 'string' },
        { name: 'due_date', type: 'number', isOptional: true },
        { name: 'started_at', type: 'number', isOptional: true },
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'completed_by', type: 'string', isOptional: true },
        { name: 'completion_notes', type: 'string', isOptional: true },
        { name: 'failure_type', type: 'string', isOptional: true }, // 'none' | 'wore_out' | 'broke' | 'unknown'
        { name: 'time_spent_minutes', type: 'number', isOptional: true },
        { name: 'signature_image_url', type: 'string', isOptional: true },
        { name: 'signature_timestamp', type: 'number', isOptional: true },
        { name: 'signature_hash', type: 'string', isOptional: true },
        { name: 'verification_code', type: 'string', isOptional: true },
        { name: 'voice_note_url', type: 'string', isOptional: true },
        { name: 'voice_note_confidence', type: 'string', isOptional: true },
        { name: 'needs_enrichment', type: 'boolean' },
        { name: 'is_quick_log', type: 'boolean' },
        { name: 'local_sync_status', type: 'string', isIndexed: true }, // 'pending' | 'synced' | 'conflict'
        { name: 'local_updated_at', type: 'number' },
        { name: 'server_updated_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'assets',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'site_id', type: 'string', isIndexed: true },
        { name: 'asset_number', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'category', type: 'string', isIndexed: true },
        { name: 'status', type: 'string', isIndexed: true }, // 'operational' | 'down' | 'limited'
        { name: 'location_description', type: 'string', isOptional: true },
        { name: 'photo_url', type: 'string', isOptional: true },
        { name: 'meter_type', type: 'string', isOptional: true },
        { name: 'meter_unit', type: 'string', isOptional: true },
        { name: 'meter_current_reading', type: 'number', isOptional: true },
        { name: 'local_sync_status', type: 'string', isIndexed: true },
        { name: 'local_updated_at', type: 'number' },
        { name: 'server_updated_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'meter_readings',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'asset_id', type: 'string', isIndexed: true },
        { name: 'reading_value', type: 'number' },
        { name: 'reading_date', type: 'number' },
        { name: 'recorded_by', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'local_sync_status', type: 'string', isIndexed: true },
        { name: 'local_updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'work_order_photos',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'work_order_id', type: 'string', isIndexed: true },
        { name: 'local_uri', type: 'string' },
        { name: 'remote_url', type: 'string', isOptional: true },
        { name: 'caption', type: 'string', isOptional: true },
        { name: 'taken_at', type: 'number' },
        { name: 'local_sync_status', type: 'string', isIndexed: true },
      ],
    }),
  ],
});
