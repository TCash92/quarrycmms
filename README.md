# QuarryCMMS

A maintenance management system built for the reality of Canadian aggregate operations—not the fantasy of perfect data entry.

## Philosophy

QuarryCMMS follows the **"Honda Principles"**: reliable, field-proven, and ruthlessly practical. It prioritizes capturing *imperfect* data instantly over capturing *perfect* data never.

**This is a Quarry Tool, not a Software Company product.**

## Why QuarryCMMS Exists

Most CMMS solutions assume 99% uptime, 20C temperatures, and technicians with time to fill out forms. In a Canadian quarry, those assumptions fail immediately.

QuarryCMMS is designed for:
- **No cell signal** in the hollow
- **-25C winters** with gloved hands
- **Technicians** who need to log work in 30 seconds, not 5 minutes
- **Supervisors** who need actionable data, not a second job as a data clerk

---

## Tech Stack

- **React Native 0.81** via Expo SDK 54
- **WatermelonDB** for offline-first local database (SQLite with JSI)
- **Supabase** for backend (auth, database sync, storage)
- **React Navigation** (native-stack + bottom-tabs)

---

## How It Solves These Problems

| Problem | How It Was Failing | How It Works Now |
|---------|-------------------|------------------|
| **Database Trap** | Complex systems prioritized perfect structures over usability | Quick Log—speed over completeness |
| **Garbage Data** | Quick entries risked entries like "fixed it" | Enrichment Workflow lets Supervisors structure data post-capture |
| **Connectivity** | Apps freeze without signal | WatermelonDB sync-later architecture works offline |
| **Cold Weather** | Standard UIs unusable with gloves | Large touch targets, voice-first input |
| **Compliance** | Ministry checks required connectivity | Offline cryptographic verification |
| **IT Bottleneck** | "It doesn't work" tickets kill pilots | Self-service diagnostics and reset tools |
| **Vendor Lock-in** | CFOs fear trapped data | Full data portability and documented exit strategy |

---

## Core Features

### Quick Log
Capture maintenance events in seconds. Voice notes, 2-word descriptions, photo attachments—whatever gets the information recorded.

### Enrichment Workflow
Supervisors have a dedicated interface to structure and clean Quick Log entries in batches. Fast capture, deliberate structure.

### Offline-First Architecture
Built on WatermelonDB. Works in the hollow, in the pit, wherever. Syncs when connectivity returns.

### Cold Weather UI
Large touch targets, voice-first input, minimal required fields. Works with gloves and numb fingers.

### Offline Compliance Verification
Ministry checks use offline cryptographic verification. Regulatory requirements don't wait for cell signal.

### Self-Service IT
Built-in diagnostics and database reset. Fix problems without waiting for support.

---

## Design Principles

| Principle | Implementation |
|-----------|----------------|
| Speed over completeness | Quick Log accepts partial data |
| Offline over connected | Sync-later, not check-connection |
| Field reality over database purity | Enrichment workflow cleans data post-capture |
| Self-service over support tickets | Built-in diagnostics and recovery |
| Trust through transparency | Full data export and portability |

---

## Target Users

| Role | Primary Benefit |
|------|-----------------|
| **Technician** | Log work in 30 seconds, move on |
| **Supervisor** | Clean data in batches, see real trends |
| **Operations Manager** | Compliance confidence, maintenance visibility |
| **CFO** | No vendor lock-in, clear exit strategy |

---

## Remaining Risks

Despite strong design, three critical execution risks remain:

### 1. The Sync Engine (The Hard Part)

**Risk Level:** High

Building a custom sync engine that handles conflicts without data loss is notoriously difficult.

**Why it matters:** If sync is unreliable in the first month, trust will evaporate and never return. Users will revert to paper.

**Mitigation:**
- Extensive conflict resolution testing before field deployment
- Conservative sync strategies (last-write-wins with full audit trail)
- Manual conflict resolution UI for edge cases

### 2. Supervisor Burnout

**Risk Level:** Medium

The system relies on Supervisors to "enrich" data and manage conflicts. If Quick Log volume is too high, the Supervisor becomes a data-entry clerk.

**Why it matters:** Supervisors have organizational power. If they decide the system creates more work than it saves, they will kill the project to protect their own time.

**Mitigation:**
- Batch processing UI for efficient enrichment
- Smart defaults and auto-categorization where possible
- Volume monitoring and alerts
- Clear escalation paths for backlog

### 3. The Cold Soak Reality

**Risk Level:** Medium (Physics, Not Software)

While the *design* accounts for cold weather, the *hardware* reality is that battery chemistry fails at -25C. Lithium-ion batteries can lose 50%+ capacity in extreme cold.

**Why it matters:** If devices die in 2 hours, the software is irrelevant.

**Mitigation:**
- Device selection guidance (ruggedized, cold-rated hardware)
- Battery warming recommendations
- Backup device protocols
- Offline data preservation on unexpected shutdown

---

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI for builds (`npm install -g eas-cli`)

### Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on specific platform
npx expo start --android
npx expo start --ios
```

### Code Quality

```bash
npm run lint          # ESLint check
npm run typecheck     # TypeScript check
npm run format        # Prettier format
```

### Environment Setup

Copy `.env.example` to `.env.development` and configure your Supabase credentials.

---

## Data Portability

Your data is yours. QuarryCMMS includes full export capabilities in standard formats. If you decide to leave, you take everything with you.

---

## Contributing

Before making design changes, review the [Red Team Personas](docs/PERSONAS.md). These personas stress-test every design decision against real stakeholder perspectives—from skeptical technicians to cost-cutting CFOs.

---

## License

[License information here]

---

*Built for quarries. Tested in quarries. Works in quarries.*
