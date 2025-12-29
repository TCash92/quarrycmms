# QuarryCMMS MVP Development Context

> **For Claude Code**: This file contains the authoritative technical context for building the QuarryCMMS mobile application. Read `CMMS_MVP_Design_Guide_v6.md` in this directory for full specifications.

---

## Project Overview

**What we're building**: A mobile CMMS (Computerized Maintenance Management System) for Canadian aggregate producers (quarries, gravel pits). The app must work offline for 3+ days, sync reliably, and generate compliance-ready PDFs.

**Philosophy**: "Ship the Honda, not the Maximo." Emergency-first design, minimal features, bulletproof execution.

**Timeline**: 24 weeks to pilot-ready MVP.

---

## Tech Stack (Non-Negotiable)

| Layer | Technology | Version |
|-------|------------|---------|
| **Framework** | React Native (Expo) | SDK 50+ |
| **Language** | TypeScript | Strict mode |
| **Navigation** | React Navigation | v6 |
| **Local Database** | WatermelonDB | Latest |
| **Backend** | Supabase | - |
| **Auth** | Supabase Auth | Email/password |
| **Storage** | Supabase Storage | For photos, voice notes |
| **State** | React Context + WatermelonDB | No Redux |
| **Secure Storage** | expo-secure-store | For tokens |
| **Audio** | expo-av | For voice notes |
| **PDF** | react-native-html-to-pdf | Offline generation |

---

## Folder Structure

```
src/
├── app/                    # Expo Router or navigation entry
├── components/
│   ├── ui/                 # Reusable UI components (Button, Card, etc.)
│   ├── forms/              # Form components
│   └── screens/            # Screen-specific components
├── config/
│   └── index.ts            # Environment config with validation
├── database/
│   ├── schema.ts           # WatermelonDB schema
│   ├── models/             # WatermelonDB model classes
│   │   ├── WorkOrder.ts
│   │   ├── Asset.ts
│   │   ├── MeterReading.ts
│   │   └── WorkOrderPhoto.ts
│   └── migrations.ts       # Schema migrations
├── services/
│   ├── auth/
│   │   ├── auth-service.ts
│   │   └── auth-storage.ts # SecureStore token management
│   ├── sync/
│   │   ├── sync-engine.ts
│   │   ├── conflict-resolver.ts
│   │   └── photo-sync.ts
│   ├── voice-notes/
│   │   └── voice-note-service.ts
│   ├── pdf/
│   │   └── pdf-generator.ts
│   └── signature/
│       └── signature-service.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useSync.ts
│   ├── useWorkOrders.ts
│   └── useAssets.ts
├── utils/
│   ├── crypto.ts           # SHA-256 hashing
│   ├── date.ts
│   └── validation.ts
└── types/
    └── index.ts            # Shared TypeScript interfaces
```

---

## Environment Configuration

Create `.env.development`, `.env.staging`, `.env.production`:

```bash
# Required
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET=quarry-cmms-dev

# Feature flags
EXPO_PUBLIC_ENABLE_VOICE_NOTES=true
EXPO_PUBLIC_ENABLE_OFFLINE_PDF=true
EXPO_PUBLIC_ENABLE_ANALYTICS=false

# Debug
EXPO_PUBLIC_LOG_LEVEL=debug
EXPO_PUBLIC_SHOW_SYNC_DEBUG=true
```

**Config validation (run on app start):**

```typescript
// config/index.ts
export function validateConfig() {
  const required = ['supabaseUrl', 'supabaseAnonKey', 'storageBucket'];
  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Missing required config: ${key}`);
    }
  }
}
```

---

## Database Schema (WatermelonDB)

```typescript
// database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'work_orders',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'wo_number', type: 'string' },
        { name: 'site_id', type: 'string' },
        { name: 'asset_id', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'priority', type: 'string' }, // 'low' | 'medium' | 'high' | 'emergency'
        { name: 'status', type: 'string' },   // 'open' | 'in_progress' | 'completed'
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
        { name: 'voice_note_url', type: 'string', isOptional: true },
        { name: 'voice_note_confidence', type: 'string', isOptional: true },
        { name: 'needs_enrichment', type: 'boolean' },
        { name: 'is_quick_log', type: 'boolean' },
        { name: 'sync_status', type: 'string' }, // 'pending' | 'synced' | 'conflict'
        { name: 'local_updated_at', type: 'number' },
        { name: 'server_updated_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'assets',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'site_id', type: 'string' },
        { name: 'asset_number', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'category', type: 'string' },
        { name: 'status', type: 'string' }, // 'operational' | 'down' | 'limited'
        { name: 'location_description', type: 'string', isOptional: true },
        { name: 'photo_url', type: 'string', isOptional: true },
        { name: 'meter_type', type: 'string', isOptional: true },
        { name: 'meter_unit', type: 'string', isOptional: true },
        { name: 'meter_current_reading', type: 'number', isOptional: true },
        { name: 'sync_status', type: 'string' },
        { name: 'local_updated_at', type: 'number' },
        { name: 'server_updated_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'meter_readings',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'asset_id', type: 'string' },
        { name: 'reading_value', type: 'number' },
        { name: 'reading_date', type: 'number' },
        { name: 'recorded_by', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string' },
        { name: 'local_updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'work_order_photos',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'work_order_id', type: 'string' },
        { name: 'local_uri', type: 'string' },
        { name: 'remote_url', type: 'string', isOptional: true },
        { name: 'caption', type: 'string', isOptional: true },
        { name: 'taken_at', type: 'number' },
        { name: 'sync_status', type: 'string' },
      ],
    }),
  ],
});
```

---

## API Contract (Supabase REST)

**Base URL**: `https://{project_ref}.supabase.co/rest/v1`

### Authentication

```typescript
// POST /auth/v1/token?grant_type=password
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'dave@quarry.ca',
  password: '...'
});

// Response includes:
// - access_token (expires in 1 hour)
// - refresh_token (valid 7 days offline)
```

### Work Orders

```typescript
// List (RLS auto-filters by site)
GET /work_orders?site_id=eq.{uuid}&status=eq.open&order=created_at.desc&limit=50

// Create
POST /work_orders
{
  site_id: 'uuid',
  asset_id: 'uuid',
  wo_number: 'WO-20250115-0001',
  priority: 'high',
  title: 'Bearing replacement',
  assigned_to: 'uuid',
  created_by: 'uuid',
  due_date: '2025-01-16T17:00:00Z'
}

// Update
PATCH /work_orders?id=eq.{uuid}
{ status: 'in_progress', started_at: '2025-01-15T14:30:00Z' }
```

### Error Response Format

```typescript
interface ApiError {
  code: string;    // e.g., 'PGRST301', '23503'
  details: string;
  hint: string;
  message: string;
}
```

### Rate Limits

| Endpoint | Limit |
|----------|-------|
| Reads | 1000/min per user |
| Writes | 100/min per user |
| File uploads | 50/min per user |
| Auth attempts | 10/min per IP |

---

## Conflict Resolution Rules

**Core Principle**: Data is never lost. Auto-resolve with clear rules.

### Work Orders

| Field | Rule |
|-------|------|
| `status` | Completion wins. `completed` > `in_progress` > `open` |
| `priority` | Higher priority wins. `emergency` > `high` > `medium` > `low` |
| `description` | **Append both** with separator: `\n---\n` |
| `completion_notes` | **Append both** with device/time identifier |
| `assigned_to` | Latest timestamp wins + notify both |
| `due_date` | **Earlier date wins** |
| `started_at` | **Earlier time wins** |
| `completed_at` | **Earlier time wins** |
| `time_spent_minutes` | Max value if timer conflict |

### Assets

| Field | Rule |
|-------|------|
| `status` | `down` wins over `operational` (safety first) |
| `meter_current_reading` | **Higher value wins** (meters don't go backwards) |

### Photos

| Rule | Always union (keep all photos from all devices) |

### Escalate to Supervisor (don't auto-resolve)

- WO completed in <5 minutes with no notes
- Both assignees claim completion
- `completed_at` >24 hours before sync
- Meter reading jump >10x average

```typescript
// conflict-resolver.ts
export function resolveWorkOrderConflict(
  local: WorkOrder, 
  remote: WorkOrder
): { merged: WorkOrder; escalations: string[] } {
  const merged = { ...remote };
  const escalations: string[] = [];
  
  // Completion always wins
  if (local.status === 'completed' || remote.status === 'completed') {
    merged.status = 'completed';
    merged.completed_at = Math.min(
      local.completed_at || Infinity,
      remote.completed_at || Infinity
    ) || local.completed_at || remote.completed_at;
    
    if (local.completed_by !== remote.completed_by) {
      escalations.push('completion_conflict');
    }
  }
  
  // Higher priority wins
  const priorityOrder = ['low', 'medium', 'high', 'emergency'];
  merged.priority = priorityOrder.indexOf(local.priority) > priorityOrder.indexOf(remote.priority)
    ? local.priority : remote.priority;
  
  // Notes always append
  if (local.completion_notes && remote.completion_notes && 
      local.completion_notes !== remote.completion_notes) {
    merged.completion_notes = `${remote.completion_notes}\n---\n${local.completion_notes}`;
  }
  
  // Earlier due date wins
  if (local.due_date && remote.due_date) {
    merged.due_date = Math.min(local.due_date, remote.due_date);
  }
  
  return { merged, escalations };
}
```

---

## Voice Notes Specification

| Property | Value |
|----------|-------|
| Format | AAC (.m4a) |
| Sample Rate | 22,050 Hz |
| Bit Rate | 64 kbps VBR |
| Channels | Mono |
| Max Duration | 2 minutes |
| Max File Size | ~1 MB |

```typescript
// voice-note-service.ts
const recordingOptions = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 22050,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 22050,
    numberOfChannels: 1,
    bitRate: 64000,
  },
};
```

**Storage locations:**
- Recording: App temp directory
- Saved (offline): `Documents/voice_notes/{uuid}.m4a`
- Synced: Supabase Storage `voice-notes/` bucket
- Delete local after confirmed upload

---

## Cryptographic Signatures

**What gets signed (at signing moment only):**

```typescript
interface SignaturePayload {
  wo_number: string;
  asset_id: string;
  completed_at: string;      // ISO 8601 UTC
  completed_by: string;      // user UUID
  completion_notes: string;  // '' if null
  failure_type: string;
  time_spent_minutes: number;
  meter_reading_at_completion: number; // 0 if null
  signature_image_hash: string;        // SHA-256 of base64 image
  signature_timestamp: string;         // ISO 8601 UTC
}

function createCanonicalString(payload: SignaturePayload): string {
  // Sorted keys, no spaces, nulls become empty/0
  const canonical = {
    asset_id: payload.asset_id,
    completed_at: payload.completed_at,
    completed_by: payload.completed_by,
    completion_notes: payload.completion_notes ?? '',
    failure_type: payload.failure_type,
    meter_reading_at_completion: payload.meter_reading_at_completion ?? 0,
    signature_image_hash: payload.signature_image_hash,
    signature_timestamp: payload.signature_timestamp,
    time_spent_minutes: payload.time_spent_minutes,
    wo_number: payload.wo_number,
  };
  return JSON.stringify(canonical, Object.keys(canonical).sort());
}

function generateSignatureHash(payload: SignaturePayload): string {
  return sha256(createCanonicalString(payload));
}
```

**Post-signature allowed changes**: Photos, voice notes, description appends, supervisor comments
**Post-signature NOT allowed**: completed_at, completed_by, completion_notes (modification), failure_type, time_spent_minutes

---

## Authentication Flow

```typescript
// auth-storage.ts
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'cmms_access_token',
  REFRESH_TOKEN: 'cmms_refresh_token',
  USER_ID: 'cmms_user_id',
  SITE_ID: 'cmms_site_id',
  TOKEN_EXPIRY: 'cmms_token_expiry'
};

export async function storeAuthData(session: Session) {
  await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, session.access_token);
  await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, session.refresh_token);
  await SecureStore.setItemAsync(KEYS.USER_ID, session.user.id);
  await SecureStore.setItemAsync(KEYS.TOKEN_EXPIRY, 
    String(Date.now() + session.expires_in * 1000));
}

// Offline token handling: refresh tokens valid 7 days offline
async function ensureValidToken(): Promise<string> {
  const expiry = await SecureStore.getItemAsync(KEYS.TOKEN_EXPIRY);
  const accessToken = await SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
  
  // If token expires in >5 minutes, use it
  if (Number(expiry) > Date.now() + 5 * 60 * 1000) {
    return accessToken!;
  }
  
  // Try to refresh (will fail offline - that's OK)
  try {
    const refreshToken = await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
    const { data } = await supabase.auth.refreshSession({ refresh_token: refreshToken! });
    if (data.session) {
      await storeAuthData(data.session);
      return data.session.access_token;
    }
  } catch (e) {
    // Offline: use existing token, local operations continue
    console.log('Offline: using potentially expired token');
  }
  
  return accessToken!;
}
```

---

## Timer Auto-Pause Rules

| Condition | Detection | Action |
|-----------|-----------|--------|
| Screen off | System event | Pause timer after **5 minutes** |
| App backgrounded | Lifecycle event | Pause timer after **10 minutes** |
| No touch interaction | Touch event monitor | Pause timer after **15 minutes** |
| GPS stationary | NOT used | Privacy/battery concerns |

**On resume**: Show "Timer was paused. Resume?" with Yes/No option.

---

## UI Requirements

### Touch Targets (Critical for Gloved Use)

| Context | Minimum Size |
|---------|--------------|
| Normal | 48x48dp |
| Cold weather | 56x56dp |
| Button spacing | 16dp minimum gap |

### Gestures

- **Avoid swipes** - use tap-only navigation
- Enable haptic + audio feedback (gloves block visual)

---

## Testing Requirements (Non-Negotiable)

### Week 18 Cold Weather Testing

| Test | Environment | Pass Criteria |
|------|-------------|---------------|
| Cold soak | -25°C, 2 hours | Device boots, app launches |
| Recording in cold | -15°C, 2 min | Voice note saves |
| Glove interaction | Full workflow | Complete WO without removing gloves |
| Battery drain | -15°C, 4 hours | >20% remaining |

### Conflict Scenario Tests

Test all 40 scenarios in Part 3 of CMMS_MVP_Design_Guide_v6.md

---

## PR Structure (First Week)

### PR #1: Project Skeleton (Day 1-2)
- Expo project init with TypeScript
- ESLint/Prettier config
- Folder structure per above
- React Navigation shell

### PR #2: Environment & Config (Day 2-3)
- Environment variables setup
- Config loading with validation
- Supabase client (not connected yet)

### PR #3: Database Layer (Day 3-5)
- WatermelonDB schema (all tables)
- Model classes with TypeScript
- Basic CRUD operations
- Test harness for offline ops

### PR #4: Authentication (Week 2)
- Supabase Auth integration
- SecureStore token persistence
- Offline token handling
- Login screen + protected routes

---

## Common Mistakes to Avoid

1. **Don't hardcode Supabase credentials** - always use env vars
2. **Don't use Redux** - WatermelonDB + Context is sufficient
3. **Don't skip sync_status tracking** - every record needs it
4. **Don't assume network** - test everything in airplane mode
5. **Don't use swipe gestures** - they fail with gloves
6. **Don't forget token refresh** - 7-day offline window is critical
7. **Don't surface conflicts to users** - auto-resolve per matrix
8. **Don't use large touch targets < 48dp** - fingers + gloves
9. **Don't skip the canonical form for signatures** - must be deterministic
10. **Don't forget photo aging checks** - compliance requirement

---

## Quick Reference Commands

```bash
# Start development
npx expo start

# Run on device
npx expo start --dev-client

# Build for testing
eas build --profile development --platform ios
eas build --profile development --platform android

# Lint
npm run lint

# Type check
npm run typecheck

# Test
npm run test
```

---

## Key Files to Reference

- `CMMS_MVP_Design_Guide_v6.md` - Full specification (read Part 3 for conflicts, Part 9 for API, Part 10 for auth)
- This file (`CLAUDE.md`) - Technical context for Claude Code

---

*Last updated: Generated for Alex, Week 1 build start*
