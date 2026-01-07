# QuarryCMMS IT Support Runbook

> **Version**: 0.12.0
> **Last Updated**: Week 22
> **Audience**: IT Support Staff, Help Desk, System Administrators

---

## Table of Contents

1. [Overview](#1-overview)
2. [Common Issues](#2-common-issues)
3. [Diagnostic Procedures](#3-diagnostic-procedures)
4. [Device Management](#4-device-management)
5. [Data Recovery](#5-data-recovery)
6. [Escalation Paths](#6-escalation-paths)
7. [Reference Tables](#7-reference-tables)

---

## 1. Overview

### 1.1 App Architecture

QuarryCMMS is a React Native mobile app for iOS and Android with:

| Component | Technology | Purpose |
|-----------|------------|---------|
| Local Database | WatermelonDB (SQLite) | Offline-first data storage |
| Backend | Supabase | Cloud database, auth, file storage |
| Auth | Supabase Auth | JWT tokens, 7-day offline validity |
| File Storage | Supabase Storage | Photos, voice notes |
| Monitoring | Sentry | Error tracking, performance |

### 1.2 Key Concepts

- **Offline-First**: All data is saved locally first, then synced. Users never lose work.
- **Sync Status**: Green (synced), Yellow (syncing), Orange (offline), Red (error)
- **Conflict Resolution**: Automatic. Completed work orders take priority. Notes are merged.
- **Signed Records**: Completion signatures create tamper-evident records.

### 1.3 Support Tiers

| Tier | Handled By | Scope |
|------|------------|-------|
| Tier 0 | User self-service | In-app help, restart, pull-to-refresh |
| Tier 1 | Site Champion | Basic troubleshooting, password resets |
| Tier 2 | IT Help Desk | Log analysis, database reset, device migration |
| Tier 3 | Development | Bug fixes, backend issues, data recovery |

---

## 2. Common Issues

### 2.1 Sync Problems

#### "Not Syncing" - Stuck in Pending

**Symptoms**: Yellow or orange status, "pending changes" count not decreasing

**Troubleshooting Flow**:

```
1. Check connectivity
   └─ Can user browse web?
      ├─ No → Network issue (not app)
      └─ Yes → Continue

2. Pull down to force refresh
   └─ Status changes?
      ├─ Yes → Resolved (temp glitch)
      └─ No → Continue

3. Check Sync Details (Settings > Help > View Sync Details)
   └─ What's blocking?
      ├─ "Photo upload failed" → Large file, try WiFi
      ├─ "Server unreachable" → Backend down, escalate
      ├─ "Auth expired" → Re-login needed
      └─ Other → Check error code table

4. Force close and reopen app
   └─ Status changes?
      ├─ Yes → Resolved
      └─ No → Request diagnostic logs
```

**Resolution Actions**:
- Have user connect to WiFi for large photo uploads
- Check Supabase status page if backend suspected
- Request user export diagnostic logs and email to IT

#### "Sync Error" - Red Status

**Symptoms**: Red sync indicator, error message displayed

**Common Causes & Fixes**:

| Error Message | Cause | Fix |
|---------------|-------|-----|
| "Authentication failed" | Token expired, session invalid | Log out, log back in |
| "Network timeout" | Poor connection during sync | Move to better signal, retry |
| "Conflict detected" | Same record modified on two devices | Usually auto-resolves; check Sync Details |
| "Storage quota exceeded" | Supabase storage full | Escalate to Tier 3 |
| "Rate limit exceeded" | Too many requests | Wait 1 minute, retry |

#### Large Photo Backlog

**Symptoms**: Many photos pending, draining battery

**Solution**:
1. Connect to WiFi
2. Plug in device (photos sync faster when charging)
3. Keep app open in foreground for 5-10 minutes
4. Check Sync Details to monitor progress

### 2.2 Login Issues

#### Forgot Password

**Current State**: No self-service password reset

**Process**:
1. User contacts IT or Site Champion
2. IT resets password in Supabase Auth dashboard
3. Provide new temporary password to user
4. User logs in and is prompted to change password (if implemented)

**Supabase Dashboard Steps**:
```
1. Go to Authentication > Users
2. Find user by email
3. Click Actions > Reset Password
4. Copy generated link or set new password manually
```

#### "Session Expired" / Token Issues

**Symptoms**: Logged out unexpectedly, "refresh token expired"

**Cause**: User was offline for more than 7 days

**Solution**:
1. Reconnect to internet
2. Log in again with credentials
3. Data will re-sync from server

**Note**: Local unsynced changes are preserved. After re-login, pending changes will upload.

#### Account Locked

**Cause**: Too many failed login attempts (10 per IP per minute)

**Solution**:
1. Wait 5 minutes
2. If persistent, check for IP block in Supabase logs
3. User may need to try different network

### 2.3 Performance Issues

#### App Slow or Freezing

**Diagnostic Steps**:
1. How much storage is used? (Settings > App Info or device settings)
2. How many work orders are loaded? (Check with user)
3. Is device low on memory?

**Solutions**:

| Cause | Solution |
|-------|----------|
| Low storage (<500MB free) | Clear photos cache, delete old apps |
| Large database (>100MB) | Consider database reset after sync |
| Old device (<2GB RAM) | Limit photos, close other apps |
| Many photos pending | Wait for sync to complete |

#### Battery Drain

**Normal Usage**: 5-10% per hour during active use

**Excessive Drain Causes**:
1. Location services (app doesn't use GPS, check if enabled)
2. Continuous sync retries (check for sync errors)
3. Background refresh (normal, not controllable)

**Solutions**:
- Disable location for app (not needed)
- Resolve sync errors to stop retry loops
- Ensure good network when syncing

### 2.4 Data Issues

#### Missing Work Orders

**User reports**: "I don't see work order X"

**Diagnostic**:
1. Is user on correct site? (Check Settings > Account)
2. Is work order assigned to this user?
3. Has work order been completed/closed?
4. Pull down to refresh

**Backend Check** (if needed):
```sql
-- Check work order exists and assignment
SELECT id, wo_number, status, assigned_to, site_id
FROM work_orders
WHERE wo_number = 'WO-XXXX';
```

#### Photos Not Uploading

**Symptoms**: Camera roll photos showing, but not syncing

**Troubleshooting**:
1. Check pending count in Sync Details
2. Photo size? (Very large photos >10MB may timeout)
3. Storage permission granted?

**iOS Specific**: Check Settings > Privacy > Photos > QuarryCMMS

**Android Specific**: Check Settings > Apps > QuarryCMMS > Permissions > Storage

#### Voice Notes Not Playing

**Symptoms**: Play button doesn't work, no audio

**Causes**:
1. Not yet synced (check if pending)
2. Audio file corrupted during recording
3. Device volume muted

**Solution**:
- Sync to complete upload
- If still failing after sync, note may be corrupted (rare)

---

## 3. Diagnostic Procedures

### 3.1 Reading Diagnostic Logs

**How to Export Logs**:
1. User goes to Settings > Help & Support
2. Tap "Export Diagnostic Logs"
3. Share via email to IT

**Log File Format**: JSON with structured entries

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "error",
  "message": "Sync failed",
  "category": "sync",
  "details": {
    "errorCode": "NETWORK_TIMEOUT",
    "retryCount": 3,
    "pendingItems": 5
  },
  "device": {
    "platform": "ios",
    "version": "17.2",
    "appVersion": "0.12.0"
  }
}
```

**Key Fields to Check**:

| Field | What to Look For |
|-------|------------------|
| level | `error` entries are problems |
| category | `sync`, `auth`, `database` for specific areas |
| errorCode | Match against error code table |
| retryCount | High numbers indicate persistent issues |
| pendingItems | How much data is stuck |

### 3.2 Error Code Reference

| Code | Category | Meaning | Resolution |
|------|----------|---------|------------|
| AUTH_EXPIRED | auth | Token no longer valid | Re-login |
| AUTH_INVALID | auth | Credentials wrong | Check password |
| NETWORK_TIMEOUT | sync | Connection lost during sync | Better connection |
| NETWORK_OFFLINE | sync | No network available | Expected behavior offline |
| SYNC_CONFLICT | sync | Same record modified twice | Auto-resolves usually |
| SYNC_REJECTED | sync | Server rejected change | Check server logs |
| STORAGE_FULL | device | Local storage exhausted | Clear space |
| DB_CORRUPTED | database | Database integrity failed | Database reset needed |
| DB_MIGRATION | database | Schema update needed | Update app version |

### 3.3 Database Health Check

**In-App Health Report** (Settings > App Info):
- Tables exist: Yes/No
- Schema version: Should match app version
- Integrity check: Pass/Fail
- Orphaned records: Count

**Interpreting Health Report**:

| Finding | Meaning | Action |
|---------|---------|--------|
| Tables missing | Database corrupted | Reset required |
| Schema mismatch | Old database, new app | App update usually fixes |
| Integrity failed | Data corruption | Attempt repair, then reset |
| Orphaned records >0 | Photos without work orders | Cleanup available |

---

## 4. Device Management

### 4.1 Device Migration (Transfer to New Device)

**Use Case**: User getting new phone, needs to transfer account

**Process**:

```
OLD DEVICE                           NEW DEVICE
──────────                           ──────────
1. Go to Settings                    1. Download app
2. Tap "Transfer to New Device"      2. Open app
3. QR code appears                   3. Tap "Transfer from Device"
   (valid 5 minutes)                 4. Scan QR code
                                     5. Log in with credentials
                                     6. Sync completes

4. (Optional) Sign out of
   old device
```

**Troubleshooting QR Transfer**:

| Issue | Cause | Fix |
|-------|-------|-----|
| QR expired | Took too long | Generate new QR |
| "Invalid QR" | Wrong QR type | Ensure it's the app's QR |
| "Signature failed" | Time/date wrong | Check device clock |
| Camera won't open | Permission denied | Grant camera access |

**Post-Migration Checklist**:
- New device syncs fully
- Old device signs out
- Work orders appear correctly
- Photos accessible

### 4.2 Database Reset

**When to Recommend**:
- Database health check failing
- App consistently crashing
- Sync permanently stuck (after other attempts)
- User requests fresh start

**Pre-Reset Checklist**:
1. Is user connected to internet? (Data synced first)
2. Any pending changes? (Will show warning count)
3. User understands this clears local data?

**Reset Process**:
```
1. Settings > Help > Reset Local Database
2. Warning screen shows pending count
3. (Optional) "Export First" to save pending as JSON
4. Type "RESET" to confirm
5. App clears and restarts
6. User logs in again
7. Data syncs from server
```

**What's Preserved**:
- Server data (re-downloads)
- Authentication tokens (optional)
- User preferences (some)

**What's Lost**:
- Unsynced changes (unless exported)
- Cached photos (re-download)
- Local app state

### 4.3 App Updates

**Update Notification**: App will prompt when update available

**Enterprise Deployment**:
- iOS: MDM push or App Store
- Android: MDM push or Play Store

**Version Compatibility**:
- Backend maintains compatibility with current and previous 2 versions
- Force update if version is too old

---

## 5. Data Recovery

### 5.1 Recovering Unsynced Data

**Scenario**: User's phone broke/lost before syncing

**Options**:
1. **If phone accessible**: Export diagnostic logs (includes pending items list)
2. **If data exported before reset**: JSON file contains pending changes
3. **If phone lost**: Data not recoverable unless previously synced

**Prevention**:
- Encourage users to sync daily when on WiFi
- Monitor for devices with high pending counts

### 5.2 Recovering from Database Corruption

**Symptoms**:
- App crashes on launch
- "Database error" messages
- Health check shows corruption

**Repair Attempt**:
1. Settings > Help > View Sync Details
2. If repair option available, try it
3. Check health again

**If Repair Fails**:
1. Export pending data if possible
2. Perform database reset
3. Re-login and sync

### 5.3 Server-Side Data Recovery

**Scenario**: Data deleted or modified incorrectly on server

**Available Tools**:
- Supabase dashboard: View and edit records
- Database backups: Daily automated backups
- Audit logs: Track who changed what

**Escalate to Tier 3** for:
- Bulk data restoration
- Point-in-time recovery
- Investigating data integrity issues

---

## 6. Escalation Paths

### 6.1 Tier 1 → Tier 2

**Escalate When**:
- Basic troubleshooting (restart, refresh, re-login) didn't work
- User needs password reset
- Diagnostic log analysis required
- Device migration assistance needed

**Provide**:
- User name and email
- Device type (iOS/Android, model)
- App version
- Description of issue
- Steps already tried

### 6.2 Tier 2 → Tier 3 (Development)

**Escalate When**:
- Error codes not in reference table
- Backend appears down
- Multiple users affected simultaneously
- Data corruption suspected
- Bug reproduction steps identified

**Provide**:
- Diagnostic logs from affected users
- Timestamps of issues
- Any patterns observed
- Supabase error logs (if accessible)

### 6.3 Emergency Contacts

| Situation | Contact | Method |
|-----------|---------|--------|
| Backend down | DevOps on-call | PagerDuty/Slack |
| Security incident | Security team | Immediate escalation |
| Data breach suspected | Privacy officer | Immediate escalation |
| Multiple sites affected | IT Manager | Phone call |

---

## 7. Reference Tables

### 7.1 Sync Status Meanings

| Color | Status | User Action | IT Action |
|-------|--------|-------------|-----------|
| Green | Synced | None needed | None needed |
| Yellow | Syncing | Wait | None needed |
| Orange | Offline | Get connection | None needed |
| Red | Error | Tap for details | Check if widespread |

### 7.2 Work Order Priorities

| Priority | Color | SLA (if applicable) |
|----------|-------|---------------------|
| Emergency | Red | Immediate |
| High | Orange | Same day |
| Medium | Yellow | Within 3 days |
| Low | Gray | Within 7 days |

### 7.3 Failure Types

| Type | Meaning | Supervisor Alert |
|------|---------|------------------|
| Wore Out | Normal wear and tear | No |
| Broke | Unexpected failure | Yes |
| Unknown | Can't determine | Yes |
| None | Routine/Inspection | No |

### 7.4 Minimum Device Requirements

| Platform | Minimum Version | Recommended |
|----------|-----------------|-------------|
| iOS | 14.0 | 16.0+ |
| Android | 8.0 (API 26) | 12.0+ |
| RAM | 2GB | 4GB+ |
| Storage | 500MB free | 2GB free |

### 7.5 Useful Supabase Queries

```sql
-- Find user's recent sync activity
SELECT * FROM sync_logs
WHERE user_id = 'uuid'
ORDER BY created_at DESC
LIMIT 20;

-- Check pending items for a device
SELECT * FROM work_orders
WHERE device_id = 'uuid'
AND sync_status = 'pending';

-- Find conflict history
SELECT * FROM conflict_log
WHERE user_id = 'uuid'
ORDER BY resolved_at DESC;
```

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| Quick Log | Fast entry for unplanned repairs |
| Work Order | Assigned maintenance task |
| Sync | Process of uploading local data to server |
| Pending | Data saved locally, not yet synced |
| Conflict | Same record modified on multiple devices |
| Signature | User's electronic signature on completed work |

---

*QuarryCMMS v0.12.0 - IT Support Runbook*
