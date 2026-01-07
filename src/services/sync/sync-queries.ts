/**
 * Supabase query helpers for sync operations
 * Handles pull (fetch) and push (upsert) operations for each table
 *
 * @module sync/sync-queries
 */

import { getSupabaseClient } from '@/services/auth/supabase-client';
import { getStoredAuthData } from '@/services/auth/auth-storage';

/**
 * Row types for Supabase responses (snake_case from database)
 */
export interface WorkOrderRow {
  id: string;
  wo_number: string;
  site_id: string;
  asset_id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  completion_notes: string | null;
  failure_type: string | null;
  time_spent_minutes: number | null;
  signature_image_url: string | null;
  signature_timestamp: string | null;
  signature_hash: string | null;
  voice_note_url: string | null;
  voice_note_confidence: string | null;
  needs_enrichment: boolean;
  is_quick_log: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetRow {
  id: string;
  site_id: string;
  asset_number: string;
  name: string;
  description: string | null;
  category: string;
  status: string;
  location_description: string | null;
  photo_url: string | null;
  meter_type: string | null;
  meter_unit: string | null;
  meter_current_reading: number | null;
  created_at: string;
  updated_at: string;
}

export interface MeterReadingRow {
  id: string;
  asset_id: string;
  reading_value: number;
  reading_date: string;
  recorded_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Payload types for push operations (what we send to Supabase)
 */
export interface WorkOrderPayload {
  id?: string;
  wo_number: string;
  site_id: string;
  asset_id: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  assigned_to?: string | null;
  created_by: string;
  due_date?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  completion_notes?: string | null;
  failure_type?: string | null;
  time_spent_minutes?: number | null;
  signature_image_url?: string | null;
  signature_timestamp?: string | null;
  signature_hash?: string | null;
  voice_note_url?: string | null;
  voice_note_confidence?: string | null;
  needs_enrichment: boolean;
  is_quick_log: boolean;
}

export interface AssetPayload {
  id?: string;
  site_id: string;
  asset_number: string;
  name: string;
  description?: string | null;
  category: string;
  status: string;
  location_description?: string | null;
  photo_url?: string | null;
  meter_type?: string | null;
  meter_unit?: string | null;
  meter_current_reading?: number | null;
}

export interface MeterReadingPayload {
  id?: string;
  asset_id: string;
  reading_value: number;
  reading_date: string;
  recorded_by: string;
  notes?: string | null;
}

/**
 * Work order photo row type (from Supabase)
 */
export interface WorkOrderPhotoRow {
  id: string;
  work_order_id: string;
  local_uri: string | null;
  remote_url: string | null;
  caption: string | null;
  taken_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Work order photo payload for push operations
 */
export interface WorkOrderPhotoPayload {
  id?: string;
  work_order_id: string;
  local_uri?: string | null;
  remote_url?: string | null;
  caption?: string | null;
  taken_at: string;
}

/**
 * Get the current user's site ID from auth storage
 */
async function getSiteId(): Promise<string> {
  const authData = await getStoredAuthData();
  if (!authData?.siteId) {
    throw new Error('No site ID found - user may not be authenticated');
  }
  return authData.siteId;
}

/**
 * Fetch work orders modified since the given timestamp
 */
export async function fetchWorkOrdersSince(lastSyncAt: number | null): Promise<WorkOrderRow[]> {
  const supabase = getSupabaseClient();
  const siteId = await getSiteId();

  let query = supabase
    .from('work_orders')
    .select('*')
    .eq('site_id', siteId)
    .order('updated_at', { ascending: true });

  if (lastSyncAt !== null) {
    query = query.gt('updated_at', new Date(lastSyncAt).toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('[SyncQueries] fetchWorkOrdersSince error:', error);
    throw new Error(`Failed to fetch work orders: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch assets modified since the given timestamp
 */
export async function fetchAssetsSince(lastSyncAt: number | null): Promise<AssetRow[]> {
  const supabase = getSupabaseClient();
  const siteId = await getSiteId();

  let query = supabase
    .from('assets')
    .select('*')
    .eq('site_id', siteId)
    .order('updated_at', { ascending: true });

  if (lastSyncAt !== null) {
    query = query.gt('updated_at', new Date(lastSyncAt).toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('[SyncQueries] fetchAssetsSince error:', error);
    throw new Error(`Failed to fetch assets: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch meter readings modified since the given timestamp
 * Note: Filtered by assets in the current site
 */
export async function fetchMeterReadingsSince(
  lastSyncAt: number | null
): Promise<MeterReadingRow[]> {
  const supabase = getSupabaseClient();
  const siteId = await getSiteId();

  // First get asset IDs for this site
  const { data: assets, error: assetsError } = await supabase
    .from('assets')
    .select('id')
    .eq('site_id', siteId);

  if (assetsError) {
    console.error('[SyncQueries] fetchMeterReadingsSince assets error:', assetsError);
    throw new Error(`Failed to fetch assets for meter readings: ${assetsError.message}`);
  }

  if (!assets || assets.length === 0) {
    return [];
  }

  const assetIds = assets.map(a => a.id);

  let query = supabase
    .from('meter_readings')
    .select('*')
    .in('asset_id', assetIds)
    .order('updated_at', { ascending: true });

  if (lastSyncAt !== null) {
    query = query.gt('updated_at', new Date(lastSyncAt).toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('[SyncQueries] fetchMeterReadingsSince error:', error);
    throw new Error(`Failed to fetch meter readings: ${error.message}`);
  }

  return data || [];
}

/**
 * Upsert a work order to Supabase
 * Returns the server-assigned ID
 */
export async function upsertWorkOrder(
  payload: WorkOrderPayload
): Promise<{ id: string; updated_at: string }> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('work_orders')
    .upsert(payload, { onConflict: 'id' })
    .select('id, updated_at')
    .single();

  if (error) {
    console.error('[SyncQueries] upsertWorkOrder error:', error);
    throw new Error(`Failed to upsert work order: ${error.message}`);
  }

  return data;
}

/**
 * Upsert an asset to Supabase
 * Returns the server-assigned ID
 */
export async function upsertAsset(
  payload: AssetPayload
): Promise<{ id: string; updated_at: string }> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('assets')
    .upsert(payload, { onConflict: 'id' })
    .select('id, updated_at')
    .single();

  if (error) {
    console.error('[SyncQueries] upsertAsset error:', error);
    throw new Error(`Failed to upsert asset: ${error.message}`);
  }

  return data;
}

/**
 * Upsert a meter reading to Supabase
 * Returns the server-assigned ID
 */
export async function upsertMeterReading(
  payload: MeterReadingPayload
): Promise<{ id: string; updated_at: string }> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('meter_readings')
    .upsert(payload, { onConflict: 'id' })
    .select('id, updated_at')
    .single();

  if (error) {
    console.error('[SyncQueries] upsertMeterReading error:', error);
    throw new Error(`Failed to upsert meter reading: ${error.message}`);
  }

  return data;
}

/**
 * Fetch work order photos for a specific work order since the given timestamp
 */
export async function fetchWorkOrderPhotosSince(
  workOrderServerId: string,
  lastSyncAt: number | null
): Promise<WorkOrderPhotoRow[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('work_order_photos')
    .select('*')
    .eq('work_order_id', workOrderServerId)
    .order('updated_at', { ascending: true });

  if (lastSyncAt !== null) {
    query = query.gt('updated_at', new Date(lastSyncAt).toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('[SyncQueries] fetchWorkOrderPhotosSince error:', error);
    throw new Error(`Failed to fetch work order photos: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch all work order photos for the current site since the given timestamp
 * This fetches photos for all work orders in the site
 */
export async function fetchAllWorkOrderPhotosSince(
  lastSyncAt: number | null
): Promise<WorkOrderPhotoRow[]> {
  const supabase = getSupabaseClient();
  const siteId = await getSiteId();

  // First get work order IDs for this site
  const { data: workOrders, error: woError } = await supabase
    .from('work_orders')
    .select('id')
    .eq('site_id', siteId);

  if (woError) {
    console.error('[SyncQueries] fetchAllWorkOrderPhotosSince work orders error:', woError);
    throw new Error(`Failed to fetch work orders for photos: ${woError.message}`);
  }

  if (!workOrders || workOrders.length === 0) {
    return [];
  }

  const workOrderIds = workOrders.map(wo => wo.id);

  let query = supabase
    .from('work_order_photos')
    .select('*')
    .in('work_order_id', workOrderIds)
    .order('updated_at', { ascending: true });

  if (lastSyncAt !== null) {
    query = query.gt('updated_at', new Date(lastSyncAt).toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('[SyncQueries] fetchAllWorkOrderPhotosSince error:', error);
    throw new Error(`Failed to fetch work order photos: ${error.message}`);
  }

  return data || [];
}

/**
 * Upsert a work order photo to Supabase
 * Returns the server-assigned ID
 */
export async function upsertWorkOrderPhoto(
  payload: WorkOrderPhotoPayload
): Promise<{ id: string; updated_at: string }> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('work_order_photos')
    .upsert(payload, { onConflict: 'id' })
    .select('id, updated_at')
    .single();

  if (error) {
    console.error('[SyncQueries] upsertWorkOrderPhoto error:', error);
    throw new Error(`Failed to upsert work order photo: ${error.message}`);
  }

  return data;
}
