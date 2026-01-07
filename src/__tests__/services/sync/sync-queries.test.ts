/**
 * Tests for sync-queries.ts
 *
 * Tests Supabase query helpers for sync operations including:
 * - fetchWorkOrdersSince, fetchAssetsSince, fetchMeterReadingsSince
 * - upsertWorkOrder, upsertAsset, upsertMeterReading
 * - fetchWorkOrderPhotosSince, fetchAllWorkOrderPhotosSince, upsertWorkOrderPhoto
 */

// Mock auth-storage before importing the module
jest.mock('@/services/auth/auth-storage', () => ({
  getStoredAuthData: jest.fn().mockResolvedValue({
    siteId: 'site-123',
    userId: 'user-123',
  }),
}));

import {
  fetchWorkOrdersSince,
  fetchAssetsSince,
  fetchMeterReadingsSince,
  upsertWorkOrder,
  upsertAsset,
  upsertMeterReading,
  fetchWorkOrderPhotosSince,
  fetchAllWorkOrderPhotosSince,
  upsertWorkOrderPhoto,
} from '@/services/sync/sync-queries';

import { getSupabaseClient } from '@/services/auth/supabase-client';
import { getStoredAuthData } from '@/services/auth/auth-storage';

// Get the mocked supabase client
const mockSupabase = getSupabaseClient();

describe('sync-queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset auth data mock
    (getStoredAuthData as jest.Mock).mockResolvedValue({
      siteId: 'site-123',
      userId: 'user-123',
    });
  });

  describe('fetchWorkOrdersSince', () => {
    it('fetches work orders for the current site', async () => {
      const mockData = [
        { id: 'wo-1', title: 'Work Order 1', updated_at: '2024-01-01T00:00:00Z' },
        { id: 'wo-2', title: 'Work Order 2', updated_at: '2024-01-02T00:00:00Z' },
      ];

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation(resolve => resolve({ data: mockData, error: null })),
      });

      const result = await fetchWorkOrdersSince(null);

      expect(mockSupabase.from).toHaveBeenCalledWith('work_orders');
      expect(result).toEqual(mockData);
    });

    it('filters by updated_at when lastSyncAt is provided', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation(resolve => resolve({ data: [], error: null })),
      };
      mockFrom.mockReturnValue(mockChain);

      await fetchWorkOrdersSince(1704067200000);

      expect(mockChain.gt).toHaveBeenCalledWith('updated_at', expect.any(String));
    });

    it('returns empty array when data is null', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation(resolve => resolve({ data: null, error: null })),
      });

      const result = await fetchWorkOrdersSince(null);

      expect(result).toEqual([]);
    });

    it('throws error on query failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest
          .fn()
          .mockImplementation(resolve =>
            resolve({ data: null, error: { message: 'Query failed' } })
          ),
      });

      await expect(fetchWorkOrdersSince(null)).rejects.toThrow('Failed to fetch work orders');
      consoleSpy.mockRestore();
    });

    it('throws error when no site ID is found', async () => {
      (getStoredAuthData as jest.Mock).mockResolvedValue(null);

      await expect(fetchWorkOrdersSince(null)).rejects.toThrow('No site ID found');
    });
  });

  describe('fetchAssetsSince', () => {
    it('fetches assets for the current site', async () => {
      const mockData = [{ id: 'asset-1', name: 'Excavator' }];

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation(resolve => resolve({ data: mockData, error: null })),
      });

      const result = await fetchAssetsSince(null);

      expect(mockSupabase.from).toHaveBeenCalledWith('assets');
      expect(result).toEqual(mockData);
    });

    it('returns empty array when data is null', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation(resolve => resolve({ data: null, error: null })),
      });

      const result = await fetchAssetsSince(null);

      expect(result).toEqual([]);
    });

    it('throws error on query failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest
          .fn()
          .mockImplementation(resolve =>
            resolve({ data: null, error: { message: 'Query failed' } })
          ),
      });

      await expect(fetchAssetsSince(null)).rejects.toThrow('Failed to fetch assets');
      consoleSpy.mockRestore();
    });
  });

  describe('fetchMeterReadingsSince', () => {
    it('fetches meter readings for assets in the current site', async () => {
      const mockAssets = [{ id: 'asset-1' }, { id: 'asset-2' }];
      const mockReadings = [{ id: 'reading-1', asset_id: 'asset-1', reading_value: 100 }];

      let callCount = 0;
      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        callCount++;
        if (table === 'assets' || callCount === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: jest
              .fn()
              .mockImplementation(resolve => resolve({ data: mockAssets, error: null })),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          then: jest
            .fn()
            .mockImplementation(resolve => resolve({ data: mockReadings, error: null })),
        };
      });

      const result = await fetchMeterReadingsSince(null);

      expect(result).toEqual(mockReadings);
    });

    it('returns empty array when no assets exist', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation(resolve => resolve({ data: [], error: null })),
      });

      const result = await fetchMeterReadingsSince(null);

      expect(result).toEqual([]);
    });

    it('throws error when assets query fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest
          .fn()
          .mockImplementation(resolve =>
            resolve({ data: null, error: { message: 'Assets query failed' } })
          ),
      });

      await expect(fetchMeterReadingsSince(null)).rejects.toThrow(
        'Failed to fetch assets for meter readings'
      );
      consoleSpy.mockRestore();
    });
  });

  describe('upsertWorkOrder', () => {
    it('upserts a work order and returns id and updated_at', async () => {
      const mockResult = { id: 'wo-1', updated_at: '2024-01-01T00:00:00Z' };

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockResult, error: null }),
      });

      const payload = {
        wo_number: 'WO-001',
        site_id: 'site-123',
        asset_id: 'asset-1',
        title: 'Test Work Order',
        priority: 'medium',
        status: 'open',
        created_by: 'user-123',
        needs_enrichment: false,
        is_quick_log: false,
      };

      const result = await upsertWorkOrder(payload);

      expect(mockSupabase.from).toHaveBeenCalledWith('work_orders');
      expect(result).toEqual(mockResult);
    });

    it('throws error on upsert failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Upsert failed' } }),
      });

      const payload = {
        wo_number: 'WO-001',
        site_id: 'site-123',
        asset_id: 'asset-1',
        title: 'Test',
        priority: 'medium',
        status: 'open',
        created_by: 'user-123',
        needs_enrichment: false,
        is_quick_log: false,
      };

      await expect(upsertWorkOrder(payload)).rejects.toThrow('Failed to upsert work order');
      consoleSpy.mockRestore();
    });
  });

  describe('upsertAsset', () => {
    it('upserts an asset and returns id and updated_at', async () => {
      const mockResult = { id: 'asset-1', updated_at: '2024-01-01T00:00:00Z' };

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockResult, error: null }),
      });

      const payload = {
        site_id: 'site-123',
        asset_number: 'EXC-001',
        name: 'Excavator',
        category: 'heavy_equipment',
        status: 'operational',
      };

      const result = await upsertAsset(payload);

      expect(mockSupabase.from).toHaveBeenCalledWith('assets');
      expect(result).toEqual(mockResult);
    });

    it('throws error on upsert failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Upsert failed' } }),
      });

      const payload = {
        site_id: 'site-123',
        asset_number: 'EXC-001',
        name: 'Excavator',
        category: 'heavy_equipment',
        status: 'operational',
      };

      await expect(upsertAsset(payload)).rejects.toThrow('Failed to upsert asset');
      consoleSpy.mockRestore();
    });
  });

  describe('upsertMeterReading', () => {
    it('upserts a meter reading and returns id and updated_at', async () => {
      const mockResult = { id: 'reading-1', updated_at: '2024-01-01T00:00:00Z' };

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockResult, error: null }),
      });

      const payload = {
        asset_id: 'asset-1',
        reading_value: 1234,
        reading_date: '2024-01-01T00:00:00Z',
        recorded_by: 'user-123',
      };

      const result = await upsertMeterReading(payload);

      expect(mockSupabase.from).toHaveBeenCalledWith('meter_readings');
      expect(result).toEqual(mockResult);
    });

    it('throws error on upsert failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Upsert failed' } }),
      });

      const payload = {
        asset_id: 'asset-1',
        reading_value: 1234,
        reading_date: '2024-01-01T00:00:00Z',
        recorded_by: 'user-123',
      };

      await expect(upsertMeterReading(payload)).rejects.toThrow('Failed to upsert meter reading');
      consoleSpy.mockRestore();
    });
  });

  describe('fetchWorkOrderPhotosSince', () => {
    it('fetches photos for a specific work order', async () => {
      const mockPhotos = [{ id: 'photo-1', work_order_id: 'wo-1', remote_url: 'https://...' }];

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation(resolve => resolve({ data: mockPhotos, error: null })),
      });

      const result = await fetchWorkOrderPhotosSince('wo-1', null);

      expect(mockSupabase.from).toHaveBeenCalledWith('work_order_photos');
      expect(result).toEqual(mockPhotos);
    });

    it('returns empty array when data is null', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation(resolve => resolve({ data: null, error: null })),
      });

      const result = await fetchWorkOrderPhotosSince('wo-1', null);

      expect(result).toEqual([]);
    });

    it('throws error on query failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest
          .fn()
          .mockImplementation(resolve =>
            resolve({ data: null, error: { message: 'Query failed' } })
          ),
      });

      await expect(fetchWorkOrderPhotosSince('wo-1', null)).rejects.toThrow(
        'Failed to fetch work order photos'
      );
      consoleSpy.mockRestore();
    });
  });

  describe('fetchAllWorkOrderPhotosSince', () => {
    it('fetches all photos for work orders in the current site', async () => {
      const mockWorkOrders = [{ id: 'wo-1' }, { id: 'wo-2' }];
      const mockPhotos = [{ id: 'photo-1', work_order_id: 'wo-1' }];

      let callCount = 0;
      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        callCount++;
        if (table === 'work_orders' || callCount === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: jest
              .fn()
              .mockImplementation(resolve => resolve({ data: mockWorkOrders, error: null })),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          then: jest.fn().mockImplementation(resolve => resolve({ data: mockPhotos, error: null })),
        };
      });

      const result = await fetchAllWorkOrderPhotosSince(null);

      expect(result).toEqual(mockPhotos);
    });

    it('returns empty array when no work orders exist', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation(resolve => resolve({ data: [], error: null })),
      });

      const result = await fetchAllWorkOrderPhotosSince(null);

      expect(result).toEqual([]);
    });

    it('throws error when work orders query fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest
          .fn()
          .mockImplementation(resolve =>
            resolve({ data: null, error: { message: 'Work orders query failed' } })
          ),
      });

      await expect(fetchAllWorkOrderPhotosSince(null)).rejects.toThrow(
        'Failed to fetch work orders for photos'
      );
      consoleSpy.mockRestore();
    });
  });

  describe('upsertWorkOrderPhoto', () => {
    it('upserts a work order photo and returns id and updated_at', async () => {
      const mockResult = { id: 'photo-1', updated_at: '2024-01-01T00:00:00Z' };

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockResult, error: null }),
      });

      const payload = {
        work_order_id: 'wo-1',
        remote_url: 'https://storage.example.com/photo.jpg',
        taken_at: '2024-01-01T00:00:00Z',
      };

      const result = await upsertWorkOrderPhoto(payload);

      expect(mockSupabase.from).toHaveBeenCalledWith('work_order_photos');
      expect(result).toEqual(mockResult);
    });

    it('throws error on upsert failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Upsert failed' } }),
      });

      const payload = {
        work_order_id: 'wo-1',
        taken_at: '2024-01-01T00:00:00Z',
      };

      await expect(upsertWorkOrderPhoto(payload)).rejects.toThrow(
        'Failed to upsert work order photo'
      );
      consoleSpy.mockRestore();
    });
  });
});
