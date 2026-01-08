/**
 * MSW Request Handlers for E2E Testing
 *
 * Mocks all Supabase API endpoints to enable fully offline E2E testing.
 */

import { http, HttpResponse, delay } from 'msw';

// ============================================================================
// Test Data Store
// ============================================================================

interface TestUser {
  id: string;
  email: string;
  name: string;
  role: 'technician' | 'supervisor' | 'admin';
  siteId: string;
}

interface TestSession {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: SupabaseUser;
}

interface SupabaseUser {
  id: string;
  aud: string;
  role: string;
  email: string;
  email_confirmed_at: string;
  phone: string;
  confirmed_at: string;
  last_sign_in_at: string;
  app_metadata: { provider: string; providers: string[] };
  user_metadata: { name: string };
  identities: unknown[];
  created_at: string;
  updated_at: string;
}

interface TestWorkOrder {
  id: string;
  server_id: string;
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
  verification_code: string | null;
  voice_note_url: string | null;
  voice_note_confidence: string | null;
  needs_enrichment: boolean;
  is_quick_log: boolean;
  created_at: string;
  updated_at: string;
}

interface TestAsset {
  id: string;
  server_id: string;
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

// In-memory store for E2E tests
class MockDataStore {
  currentUser: TestUser | null = null;
  currentSession: TestSession | null = null;
  workOrders: TestWorkOrder[] = [];
  assets: TestAsset[] = [];
  isOnline: boolean = true;

  reset(): void {
    this.currentUser = null;
    this.currentSession = null;
    this.workOrders = [...DEFAULT_WORK_ORDERS];
    this.assets = [...DEFAULT_ASSETS];
    this.isOnline = true;
  }

  login(email: string, password: string): TestSession | null {
    const user = VALID_USERS[email];
    if (!user) {
      return null;
    }

    // Validate password
    if (user.password !== password) {
      return null;
    }

    this.currentUser = user;

    // Create Supabase-compatible user object
    const now = new Date().toISOString();
    const supabaseUser: SupabaseUser = {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: now,
      phone: '',
      confirmed_at: now,
      last_sign_in_at: now,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { name: user.name },
      identities: [],
      created_at: now,
      updated_at: now,
    };

    this.currentSession = {
      access_token: `mock_access_token_${Date.now()}`,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: `mock_refresh_token_${Date.now()}`,
      user: supabaseUser,
    };

    return this.currentSession;
  }

  logout(): void {
    this.currentUser = null;
    this.currentSession = null;
  }
}

export const mockDataStore = new MockDataStore();

// Expose globally for E2E manipulation
if (typeof window !== 'undefined') {
  (window as unknown as { __E2E_MOCK_STORE__: MockDataStore }).__E2E_MOCK_STORE__ = mockDataStore;
}

// ============================================================================
// Valid Test Users
// ============================================================================

interface ValidUser extends TestUser {
  password: string;
}

const VALID_USERS: Record<string, ValidUser> = {
  'tech@quarrysite.com': {
    id: 'user-001',
    email: 'tech@quarrysite.com',
    name: 'Dave Technician',
    role: 'technician',
    siteId: 'site-001',
    password: 'TestPassword123!',
  },
  'supervisor@quarrysite.com': {
    id: 'user-002',
    email: 'supervisor@quarrysite.com',
    name: 'Sandra Supervisor',
    role: 'supervisor',
    siteId: 'site-001',
    password: 'SuperPassword123!',
  },
};

// ============================================================================
// Default Test Data
// ============================================================================

const DEFAULT_ASSETS: TestAsset[] = [
  {
    id: 'asset-001',
    server_id: 'server-asset-001',
    site_id: 'site-001',
    asset_number: 'EXC-001',
    name: 'CAT 320 Excavator',
    description: 'Main excavation unit for primary pit',
    category: 'Heavy Equipment',
    status: 'operational',
    location_description: 'Primary Pit - North Section',
    photo_url: null,
    meter_type: 'hours',
    meter_unit: 'Operating Hours',
    meter_current_reading: 5432,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'asset-002',
    server_id: 'server-asset-002',
    site_id: 'site-001',
    asset_number: 'LDR-002',
    name: 'Komatsu WA380 Loader',
    description: 'Front-end loader for material handling',
    category: 'Heavy Equipment',
    status: 'limited',
    location_description: 'Stockpile Area',
    photo_url: null,
    meter_type: 'hours',
    meter_unit: 'Operating Hours',
    meter_current_reading: 3200,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'asset-003',
    server_id: 'server-asset-003',
    site_id: 'site-001',
    asset_number: 'CRU-003',
    name: 'Primary Jaw Crusher',
    description: 'Main crushing unit',
    category: 'Processing Equipment',
    status: 'down',
    location_description: 'Processing Plant',
    photo_url: null,
    meter_type: null,
    meter_unit: null,
    meter_current_reading: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
];

const DEFAULT_WORK_ORDERS: TestWorkOrder[] = [
  {
    id: 'wo-001',
    server_id: 'server-wo-001',
    wo_number: 'WO-20240115-0001',
    site_id: 'site-001',
    asset_id: 'asset-001',
    title: 'Replace hydraulic hose',
    description: 'Hydraulic hose leaking on boom cylinder',
    priority: 'high',
    status: 'open',
    assigned_to: 'user-001',
    created_by: 'user-002',
    due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    started_at: null,
    completed_at: null,
    completed_by: null,
    completion_notes: null,
    failure_type: null,
    time_spent_minutes: null,
    signature_image_url: null,
    signature_timestamp: null,
    signature_hash: null,
    verification_code: null,
    voice_note_url: null,
    voice_note_confidence: null,
    needs_enrichment: false,
    is_quick_log: false,
    created_at: '2024-01-15T08:00:00Z',
    updated_at: '2024-01-15T08:00:00Z',
  },
  {
    id: 'wo-002',
    server_id: 'server-wo-002',
    wo_number: 'WO-20240115-0002',
    site_id: 'site-001',
    asset_id: 'asset-002',
    title: 'PM Service - 500 hours',
    description: 'Scheduled preventive maintenance',
    priority: 'medium',
    status: 'in_progress',
    assigned_to: 'user-001',
    created_by: 'user-002',
    due_date: new Date(Date.now() + 172800000).toISOString(), // 2 days
    started_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    completed_at: null,
    completed_by: null,
    completion_notes: null,
    failure_type: null,
    time_spent_minutes: null,
    signature_image_url: null,
    signature_timestamp: null,
    signature_hash: null,
    verification_code: null,
    voice_note_url: null,
    voice_note_confidence: null,
    needs_enrichment: false,
    is_quick_log: false,
    created_at: '2024-01-14T08:00:00Z',
    updated_at: '2024-01-15T07:00:00Z',
  },
  {
    id: 'wo-003',
    server_id: 'server-wo-003',
    wo_number: 'WO-20240114-0003',
    site_id: 'site-001',
    asset_id: 'asset-001',
    title: 'Inspect bucket teeth',
    description: 'Regular inspection of bucket teeth wear',
    priority: 'low',
    status: 'completed',
    assigned_to: 'user-001',
    created_by: 'user-002',
    due_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    started_at: new Date(Date.now() - 90000000).toISOString(),
    completed_at: new Date(Date.now() - 86400000).toISOString(),
    completed_by: 'user-001',
    completion_notes: 'Teeth showing normal wear, no replacement needed',
    failure_type: 'none',
    time_spent_minutes: 45,
    signature_image_url: 'https://example.com/signatures/sig-001.png',
    signature_timestamp: new Date(Date.now() - 86400000).toISOString(),
    signature_hash: 'abc123def456',
    verification_code: 'VERIFY-ABC123',
    voice_note_url: null,
    voice_note_confidence: null,
    needs_enrichment: false,
    is_quick_log: false,
    created_at: '2024-01-14T06:00:00Z',
    updated_at: '2024-01-14T07:00:00Z',
  },
];

// Initialize with default data
mockDataStore.reset();

// ============================================================================
// MSW Request Handlers
// ============================================================================

export const handlers = [
  // ==================== AUTH HANDLERS ====================

  // Login (POST /auth/v1/token)
  http.post('*/auth/v1/token', async ({ request }) => {
    await delay(100); // Simulate network delay

    if (!mockDataStore.isOnline) {
      return HttpResponse.json(
        { error: 'network_error', message: 'Network unavailable' },
        { status: 503 }
      );
    }

    const body = (await request.json()) as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || !password) {
      return HttpResponse.json(
        { error: 'invalid_request', error_description: 'Email and password required' },
        { status: 400 }
      );
    }

    const session = mockDataStore.login(email, password);

    if (!session) {
      return HttpResponse.json(
        { error: 'invalid_grant', error_description: 'Invalid login credentials' },
        { status: 400 }
      );
    }

    return HttpResponse.json(session);
  }),

  // Logout (POST /auth/v1/logout)
  http.post('*/auth/v1/logout', async () => {
    await delay(50);
    mockDataStore.logout();
    return HttpResponse.json({ success: true });
  }),

  // Get current user (GET /auth/v1/user)
  http.get('*/auth/v1/user', async () => {
    await delay(50);

    if (!mockDataStore.currentSession) {
      return HttpResponse.json(
        { error: 'not_authenticated', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    return HttpResponse.json(mockDataStore.currentUser);
  }),

  // Refresh token (POST /auth/v1/token?grant_type=refresh_token)
  http.post('*/auth/v1/token*', async ({ request }) => {
    await delay(50);

    const url = new URL(request.url);
    if (url.searchParams.get('grant_type') === 'refresh_token') {
      if (mockDataStore.currentSession) {
        // Extend session
        mockDataStore.currentSession.expires_at = Date.now() + 3600000;
        return HttpResponse.json(mockDataStore.currentSession);
      }
      return HttpResponse.json(
        { error: 'invalid_grant', error_description: 'Invalid refresh token' },
        { status: 400 }
      );
    }

    // Fall through to login handler
    return HttpResponse.json({ error: 'invalid_request' }, { status: 400 });
  }),

  // ==================== PROFILE HANDLERS ====================

  // Get user profile (GET /rest/v1/profiles)
  // Supports both .single() and regular queries
  http.get('*/rest/v1/profiles', async ({ request }) => {
    await delay(50);

    const url = new URL(request.url);
    const userId = url.searchParams.get('id');
    const acceptHeader = request.headers.get('Accept') ?? '';

    // Find the user by ID (extracting from eq.user-xxx filter)
    const idMatch = userId?.match(/eq\.(.+)/);
    const extractedId = idMatch?.[1];

    if (!extractedId || !mockDataStore.currentUser) {
      // For .single() requests, return proper empty response with headers
      if (acceptHeader.includes('vnd.pgrst.object+json')) {
        return HttpResponse.json(null, {
          status: 406,
          headers: { 'Content-Range': '*/0' },
        });
      }
      return HttpResponse.json([], { status: 200 });
    }

    // Return profile data matching the VALID_USERS format
    const user = mockDataStore.currentUser;
    const profile = {
      id: user.id,
      name: user.name,
      site_id: user.siteId,
      role: user.role,
      email: user.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Check if this is a .single() request (Supabase SDK sets this header)
    if (acceptHeader.includes('vnd.pgrst.object+json')) {
      // Return as single object, not array, for .single() calls
      return HttpResponse.json(profile, {
        headers: { 'Content-Range': '0-0/1' },
      });
    }

    // Regular query - return as array
    return HttpResponse.json([profile]);
  }),

  // ==================== WORK ORDER HANDLERS ====================

  // List work orders (GET /rest/v1/work_orders)
  http.get('*/rest/v1/work_orders', async ({ request }) => {
    await delay(100);

    if (!mockDataStore.isOnline) {
      return HttpResponse.json({ error: 'Network unavailable' }, { status: 503 });
    }

    const url = new URL(request.url);
    let results = [...mockDataStore.workOrders];

    // Filter by status if provided
    const status = url.searchParams.get('status');
    if (status) {
      results = results.filter(wo => wo.status === status.replace('eq.', ''));
    }

    // Filter by site_id if provided
    const siteId = url.searchParams.get('site_id');
    if (siteId) {
      results = results.filter(wo => wo.site_id === siteId.replace('eq.', ''));
    }

    return HttpResponse.json(results);
  }),

  // Get single work order (GET /rest/v1/work_orders?id=eq.xxx)
  http.get('*/rest/v1/work_orders*', async ({ request }) => {
    await delay(50);

    const url = new URL(request.url);
    const idFilter = url.searchParams.get('id');

    if (idFilter) {
      const id = idFilter.replace('eq.', '');
      const workOrder = mockDataStore.workOrders.find(wo => wo.id === id);

      if (workOrder) {
        return HttpResponse.json([workOrder]);
      }
      return HttpResponse.json([]);
    }

    return HttpResponse.json(mockDataStore.workOrders);
  }),

  // Create work order (POST /rest/v1/work_orders)
  http.post('*/rest/v1/work_orders', async ({ request }) => {
    await delay(100);

    if (!mockDataStore.isOnline) {
      return HttpResponse.json({ error: 'Network unavailable' }, { status: 503 });
    }

    const body = (await request.json()) as Partial<TestWorkOrder>;
    const newWorkOrder: TestWorkOrder = {
      id: `wo-${Date.now()}`,
      server_id: `server-wo-${Date.now()}`,
      wo_number: `WO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(mockDataStore.workOrders.length + 1).padStart(4, '0')}`,
      site_id: body.site_id ?? 'site-001',
      asset_id: body.asset_id ?? '',
      title: body.title ?? 'Untitled',
      description: body.description ?? null,
      priority: body.priority ?? 'medium',
      status: body.status ?? 'open',
      assigned_to: body.assigned_to ?? null,
      created_by: body.created_by ?? mockDataStore.currentUser?.id ?? '',
      due_date: body.due_date ?? null,
      started_at: null,
      completed_at: null,
      completed_by: null,
      completion_notes: null,
      failure_type: null,
      time_spent_minutes: null,
      signature_image_url: null,
      signature_timestamp: null,
      signature_hash: null,
      verification_code: null,
      voice_note_url: null,
      voice_note_confidence: null,
      needs_enrichment: body.needs_enrichment ?? false,
      is_quick_log: body.is_quick_log ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockDataStore.workOrders.push(newWorkOrder);
    return HttpResponse.json(newWorkOrder, { status: 201 });
  }),

  // Update work order (PATCH /rest/v1/work_orders?id=eq.xxx)
  http.patch('*/rest/v1/work_orders*', async ({ request }) => {
    await delay(100);

    if (!mockDataStore.isOnline) {
      return HttpResponse.json({ error: 'Network unavailable' }, { status: 503 });
    }

    const url = new URL(request.url);
    const idFilter = url.searchParams.get('id');

    if (!idFilter) {
      return HttpResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const id = idFilter.replace('eq.', '');
    const index = mockDataStore.workOrders.findIndex(wo => wo.id === id);

    if (index === -1) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updates = (await request.json()) as Partial<TestWorkOrder>;
    const existingWorkOrder = mockDataStore.workOrders[index];
    if (!existingWorkOrder) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updatedWorkOrder: TestWorkOrder = {
      ...existingWorkOrder,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    mockDataStore.workOrders[index] = updatedWorkOrder;

    return HttpResponse.json(updatedWorkOrder);
  }),

  // ==================== ASSET HANDLERS ====================

  // List assets (GET /rest/v1/assets)
  http.get('*/rest/v1/assets', async ({ request }) => {
    await delay(100);

    if (!mockDataStore.isOnline) {
      return HttpResponse.json({ error: 'Network unavailable' }, { status: 503 });
    }

    const url = new URL(request.url);
    let results = [...mockDataStore.assets];

    // Filter by status if provided
    const status = url.searchParams.get('status');
    if (status) {
      results = results.filter(a => a.status === status.replace('eq.', ''));
    }

    // Filter by site_id if provided
    const siteId = url.searchParams.get('site_id');
    if (siteId) {
      results = results.filter(a => a.site_id === siteId.replace('eq.', ''));
    }

    return HttpResponse.json(results);
  }),

  // Get single asset (GET /rest/v1/assets?id=eq.xxx)
  http.get('*/rest/v1/assets*', async ({ request }) => {
    await delay(50);

    const url = new URL(request.url);
    const idFilter = url.searchParams.get('id');

    if (idFilter) {
      const id = idFilter.replace('eq.', '');
      const asset = mockDataStore.assets.find(a => a.id === id);

      if (asset) {
        return HttpResponse.json([asset]);
      }
      return HttpResponse.json([]);
    }

    return HttpResponse.json(mockDataStore.assets);
  }),

  // ==================== METER READINGS HANDLERS ====================

  // List meter readings (GET /rest/v1/meter_readings)
  http.get('*/rest/v1/meter_readings', async ({ request }) => {
    await delay(50);

    const url = new URL(request.url);
    const assetId = url.searchParams.get('asset_id');

    // Return empty array for now - meter readings are created locally
    if (assetId) {
      return HttpResponse.json([]);
    }

    return HttpResponse.json([]);
  }),

  // Create meter reading (POST /rest/v1/meter_readings)
  http.post('*/rest/v1/meter_readings', async ({ request }) => {
    await delay(100);

    if (!mockDataStore.isOnline) {
      return HttpResponse.json({ error: 'Network unavailable' }, { status: 503 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        id: `mr-${Date.now()}`,
        server_id: `server-mr-${Date.now()}`,
        ...body,
        created_at: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // ==================== STORAGE HANDLERS ====================

  // File upload (POST /storage/v1/object/*)
  http.post('*/storage/v1/object/*', async () => {
    await delay(200);

    return HttpResponse.json({
      Key: `uploads/${Date.now()}/file.png`,
      url: `https://example.supabase.co/storage/v1/object/public/uploads/${Date.now()}/file.png`,
    });
  }),

  // Get public URL (GET /storage/v1/object/public/*)
  http.get('*/storage/v1/object/public/*', async () => {
    return HttpResponse.json({
      publicUrl: 'https://example.supabase.co/storage/v1/object/public/mock-file.png',
    });
  }),

  // ==================== SYNC HANDLERS ====================

  // Sync endpoint (for pull/push operations)
  http.post('*/rest/v1/rpc/*', async () => {
    await delay(100);

    if (!mockDataStore.isOnline) {
      return HttpResponse.json({ error: 'Network unavailable' }, { status: 503 });
    }

    // Return empty changes for now
    return HttpResponse.json({ changes: [], timestamp: Date.now() });
  }),
];

// ============================================================================
// Helper Functions for E2E Tests
// ============================================================================

/** Reset all mock data to defaults */
export function resetMockData(): void {
  mockDataStore.reset();
}

/** Set online/offline state */
export function setOnlineState(isOnline: boolean): void {
  mockDataStore.isOnline = isOnline;
}

/** Add a test work order */
export function addTestWorkOrder(workOrder: Partial<TestWorkOrder>): TestWorkOrder {
  const newWo: TestWorkOrder = {
    id: `wo-${Date.now()}`,
    server_id: `server-wo-${Date.now()}`,
    wo_number: `WO-TEST-${Date.now()}`,
    site_id: 'site-001',
    asset_id: 'asset-001',
    title: 'Test Work Order',
    description: null,
    priority: 'medium',
    status: 'open',
    assigned_to: null,
    created_by: 'user-001',
    due_date: null,
    started_at: null,
    completed_at: null,
    completed_by: null,
    completion_notes: null,
    failure_type: null,
    time_spent_minutes: null,
    signature_image_url: null,
    signature_timestamp: null,
    signature_hash: null,
    verification_code: null,
    voice_note_url: null,
    voice_note_confidence: null,
    needs_enrichment: false,
    is_quick_log: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...workOrder,
  };

  mockDataStore.workOrders.push(newWo);
  return newWo;
}

/** Add a test asset */
export function addTestAsset(asset: Partial<TestAsset>): TestAsset {
  const newAsset: TestAsset = {
    id: `asset-${Date.now()}`,
    server_id: `server-asset-${Date.now()}`,
    site_id: 'site-001',
    asset_number: `TEST-${Date.now()}`,
    name: 'Test Asset',
    description: null,
    category: 'Test Category',
    status: 'operational',
    location_description: null,
    photo_url: null,
    meter_type: null,
    meter_unit: null,
    meter_current_reading: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...asset,
  };

  mockDataStore.assets.push(newAsset);
  return newAsset;
}
