# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuarryCMMS is an offline-first maintenance management system for Canadian aggregate/quarry operations. The design philosophy prioritizes capturing *imperfect* data instantly over capturing *perfect* data never—built for no cell signal, -25°C winters, gloved hands, and technicians who need to log work in 30 seconds.

## Commands

```bash
# Development
npm start                 # Expo development server
npm run android           # Run on Android
npm run ios               # Run on iOS

# Code quality (run before committing)
npm run lint              # ESLint check
npm run lint:fix          # Auto-fix linting issues
npm run typecheck         # TypeScript type check
npm run format            # Prettier format
npm run format:check      # Check formatting

# Builds (EAS)
npm run build:dev         # Development build
npm run build:staging     # Staging build
npm run build:prod        # Production build
```

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Test Structure
- Tests live in `src/__tests__/` mirroring source structure
- Mocks in `src/__tests__/mocks/` (WatermelonDB, Supabase, NetInfo)
- Helpers in `src/__tests__/helpers/`

### Coverage Targets

| Module | Target | Rationale |
|--------|--------|-----------|
| `services/sync/` | 60%+ (enforced) | Safety-critical offline sync |
| `services/auth/` | 80%+ | Security-critical |
| `hooks/` | 70%+ | Shared logic |

### TDD Approach
1. Write failing tests FIRST
2. Implement code to pass tests
3. NEVER modify tests to match buggy implementation

## Git Workflow

### Branch Naming
- `feat/xxx` — New features
- `fix/xxx` — Bug fixes
- `docs/xxx` — Documentation only

### Commit Messages
Use conventional commits format:
- `feat: add voice note transcription`
- `fix: resolve sync conflict in offline mode`
- `docs: update CLAUDE.md with testing section`

### Pre-commit Checks
Husky runs automatically on commit:
1. TypeScript type check (`npm run typecheck`)
2. ESLint + Prettier on staged files
3. Jest tests for related files

## Architecture

### Tech Stack
- **React Native 0.81** via Expo SDK 54
- **WatermelonDB** (SQLite with JSI) for offline-first local database
- **Supabase** for backend (auth, database sync, storage)
- **React Navigation** (native-stack + bottom-tabs)

### Directory Structure

```
src/
├── screens/          # Screen components (LoginScreen, HomeScreen, etc.)
├── navigation/       # React Navigation setup (RootNavigator → MainNavigator → stacks)
├── database/         # WatermelonDB schema, migrations, and models
├── services/
│   ├── auth/         # Supabase authentication, session management
│   ├── sync/         # Offline-first sync engine (pull/push, conflicts, retry queue)
│   ├── photos/       # Photo upload/download with caching
│   ├── voice-notes/  # Voice input for Quick Log
│   ├── monitoring/   # Sentry, logging, telemetry
│   └── recovery/     # Database health, reset, device migration
├── hooks/            # Custom React hooks (useAuth, useSync, useWorkOrders, etc.)
├── components/       # Reusable UI components
├── config/           # Environment configuration and validation
└── types/            # TypeScript interfaces
```

### Key Architectural Patterns

**Offline-First Sync**: All data operations happen locally first via WatermelonDB. The sync engine (`src/services/sync/`) handles:
- Pull/push synchronization with Supabase
- Field-level conflict resolution (last-write-wins with audit trail)
- Retry queue with exponential backoff for failed operations
- Photo sync handled separately from metadata

**Quick Log + Enrichment**: Two-phase data capture:
1. Technicians create "Quick Logs" with minimal data (voice notes, photos, 2-word descriptions)
2. Supervisors "enrich" Quick Logs later with structured data via batch UI

**Sync Status Tracking**: Every model has `local_sync_status` ('pending' | 'synced' | 'conflict'), `local_updated_at`, and `server_updated_at` fields for tracking synchronization state.

### Database Schema (WatermelonDB)

Four main tables in `src/database/schema.ts`:
- **work_orders**: Maintenance requests with Quick Log support, voice notes, signatures
- **assets**: Equipment inventory with meter tracking
- **meter_readings**: Equipment telemetry
- **work_order_photos**: Photo attachments with separate upload tracking

### Navigation Structure

```
RootNavigator
├── LoginScreen (unauthenticated)
└── MainNavigator (authenticated)
    └── Bottom Tab Navigator
        ├── Home → HomeStackNavigator
        ├── Assets → AssetsStackNavigator
        ├── QuickLog → QuickLogScreen
        └── Settings → SettingsStackNavigator
```

## TypeScript Configuration

Strict mode is fully enabled with additional checks:
- `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- Path alias: `@/*` → `src/*`
- Decorators enabled for WatermelonDB models

## Environment Configuration

Copy `.env.example` to `.env.development` and configure:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET=quarry-cmms
```

Configuration is validated on app startup in `App.tsx`. See `src/config/index.ts` for all options.

## Design Constraints

These are intentional design decisions, not bugs:

1. **Large touch targets (48dp+)**: Users wear gloves in -25°C
2. **No swipe gestures**: Unreliable with gloves
3. **Voice-first input**: Typing is difficult in cold/dirty conditions
4. **Offline PDF export**: Ministry inspectors need paper records without connectivity
5. **Self-service recovery tools**: IT support is hours away from remote pits

## DO NOT

These rules prevent common mistakes:

- **NEVER** use `any` type in TypeScript (strict mode enforced)
- **NEVER** commit without running `npm run lint && npm run typecheck`
- **NEVER** make swipe gestures (unreliable with gloves)
- **NEVER** hardcode Supabase credentials in code
- **NEVER** remove `local_sync_status` tracking fields from models
- **NEVER** delete or modify existing tests to make them pass
- **NEVER** ignore WatermelonDB sync conflicts silently
- **NEVER** skip the Red Team persona review for UX changes

## Red Team Personas

Before making design changes, review `docs/PERSONAS.md`. These 8 personas stress-test decisions:
- Dave (skeptical technician)
- Sandra (risk-averse operations manager)
- Robert (ministry inspector)
- Michelle (burnt-out IT manager)
- Gerald (cost-cutting CFO)
- Alex (senior developer)
- Ray (skeptical foreman)
- Tanya (training coordinator)

## Key Files for Common Tasks

| Task | Key Files |
|------|-----------|
| Add new database table | `src/database/schema.ts`, `src/database/migrations.ts`, create model in `src/database/models/` |
| Modify sync behavior | `src/services/sync/sync-engine.ts`, `src/services/sync/conflict-resolver.ts` |
| Add new screen | Create in `src/screens/`, add to appropriate navigator in `src/navigation/` |
| Add new hook | `src/hooks/`, export from `src/hooks/index.ts` |
| Modify auth flow | `src/services/auth/AuthProvider.tsx`, `src/services/auth/auth-service.ts` |
