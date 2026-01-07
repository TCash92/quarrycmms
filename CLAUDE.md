# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuarryCMMS is a React Native (Expo) maintenance management app for Canadian aggregate operations. It prioritizes **offline-first operation** and **glove-friendly UI** for technicians working in harsh quarry conditions (-25°C winters, no cell signal, dusty environments).

**Core philosophy:** Capture imperfect data instantly (Quick Log) over perfect data never. Supervisors enrich messy field data later.

## Development Commands

```bash
# Start development server
npm start                    # Expo start (opens Metro)
npx expo start --android     # Direct Android
npx expo start --ios         # Direct iOS

# Code quality
npm run lint                 # ESLint check
npm run lint:fix             # ESLint autofix
npm run typecheck            # TypeScript check (strict mode enabled)
npm run format               # Prettier format
npm run format:check         # Prettier check

# Build (requires EAS CLI: npm install -g eas-cli)
npm run build:dev            # Development build (internal distribution)
npm run build:staging        # Staging build
npm run build:prod           # Production build
```

## Architecture

### Tech Stack
- **React Native 0.81** via Expo SDK 54
- **WatermelonDB** for offline-first local database (SQLite with JSI)
- **Supabase** for backend (auth, database sync, storage)
- **React Navigation** (native-stack + bottom-tabs)

### Source Structure
```
src/
├── app/              # Entry point exports (RootNavigator)
├── components/       # Reusable UI components
│   ├── ui/           # Base UI primitives
│   ├── forms/        # Form components
│   ├── sync/         # Sync status indicators
│   └── settings/     # Settings-related components
├── config/           # Environment configuration (reads from @env)
├── constants/        # App-wide constants
├── database/         # WatermelonDB setup
│   ├── models/       # WatermelonDB model classes (Asset, WorkOrder, etc.)
│   ├── schema.ts     # Database schema definition
│   └── migrations.ts # Schema migrations
├── hooks/            # Custom React hooks
├── navigation/       # Navigation stacks
│   ├── RootNavigator.tsx      # Auth-gated root
│   ├── MainNavigator.tsx      # Bottom tabs
│   └── *StackNavigator.tsx    # Feature stacks
├── screens/          # Screen components
├── services/         # Business logic
│   ├── auth/         # Authentication (Supabase)
│   ├── sync/         # Sync engine, conflict resolution, retry queue
│   ├── photos/       # Photo capture/storage
│   ├── voice-notes/  # Voice recording
│   ├── signature/    # Cryptographic signatures for compliance
│   ├── pdf/          # Offline PDF generation
│   ├── recovery/     # Database health checks and reset
│   └── monitoring/   # Sentry, logging, telemetry
├── types/            # TypeScript interfaces
└── utils/            # Utility functions
```

### Key Patterns

**Path alias:** Use `@/` for `src/` imports (configured in tsconfig.json and babel.config.js):
```typescript
import { useAuth } from '@/hooks';
import { WorkOrder } from '@/database';
```

**WatermelonDB models:** Use decorators and extend `Model`:
```typescript
import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class WorkOrder extends Model {
  static table = 'work_orders';
  @field('title') title!: string;
  @field('status') status!: string;
}
```

**Sync status tracking:** All syncable records have `local_sync_status` field ('pending' | 'synced' | 'conflict').

**Context providers hierarchy:** App.tsx wraps in order:
1. `GestureHandlerRootView`
2. `SafeAreaProvider`
3. `DatabaseProvider` (WatermelonDB)
4. `AuthProvider` (Supabase auth state)

### Database Models

| Table | Purpose |
|-------|---------|
| `work_orders` | Maintenance tasks, Quick Logs |
| `assets` | Equipment being maintained |
| `meter_readings` | Equipment meter readings |
| `work_order_photos` | Photos attached to work orders |

### Sync Architecture

The sync engine (`src/services/sync/`) implements:
- **Push/Pull sync** with Supabase
- **Conflict resolution** (last-write-wins with audit trail)
- **Exponential backoff** for retries
- **Photo sync** (separate upload queue)
- **Background sync** via Expo BackgroundFetch

Conflict resolution prioritizes:
1. `completed_at`, `signature_*` fields: Local wins (work completion is authoritative)
2. `status` transitions: `completed > in_progress > open`
3. Timestamps: Most recent wins
4. Supervisor edits (enrichment): Server wins

## Environment Configuration

Copy `.env.example` to `.env.development` and configure:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET=quarry-cmms
```

Environment files: `.env.development`, `.env.staging`, `.env.production`
Active env is symlinked: `.env -> .env.development`

## TypeScript Configuration

Strict mode is enabled with all strictness flags. Key settings:
- `experimentalDecorators: true` (required for WatermelonDB)
- `noUncheckedIndexedAccess: true` (array access returns `T | undefined`)
- `exactOptionalPropertyTypes: true` (stricter optional handling)

## UI/UX Requirements

Per the design guide for quarry conditions:
- **Large touch targets** (minimum 48x48pt, prefer 56pt)
- **Glove-friendly**: No swipe gestures enabled (`gestureEnabled: false` in navigation)
- **Voice-first input**: Voice notes as alternative to typing
- **Quick Log**: Capture maintenance events in <30 seconds
- **Offline indicators**: Always show sync status

## Feature Flags

Configured via environment variables:
- `EXPO_PUBLIC_ENABLE_VOICE_NOTES` - Voice recording feature
- `EXPO_PUBLIC_ENABLE_OFFLINE_PDF` - Offline PDF generation
- `EXPO_PUBLIC_ENABLE_ANALYTICS` - Analytics collection
- `EXPO_PUBLIC_SHOW_SYNC_DEBUG` - Debug sync UI

## User Roles

- `technician`: Field workers, create Quick Logs, complete work orders
- `supervisor`: Enrich Quick Logs, assign work, generate reports
- `admin`: Full system access
