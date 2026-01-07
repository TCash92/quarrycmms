# Go-Live Checklist

> **Purpose**: Day-of-launch checklist for QuarryCMMS pilot deployment. Complete all items in sequence on go-live day.

---

## Overview

This checklist guides the pilot launch from final go/no-go decision through first-day verification. Execute items in order, checking off as completed.

**Go-Live Date**: ___/___/______

**Go-Live Time**: ___:___ (recommend shift start)

---

## Phase 1: Pre-Launch (Morning of Go-Live)

### 1.1 Final Go/No-Go Meeting

**Time**: 1 hour before go-live

| Item | Status | Notes |
|------|--------|-------|
| All stakeholders present | [ ] | |
| Pre-launch checklist 100% complete | [ ] | |
| No blocking issues identified | [ ] | |
| Weather/conditions acceptable | [ ] | |
| Support team confirmed available | [ ] | |

**Decision**:
```
[ ] GO - Proceed with pilot launch
[ ] NO-GO - Postpone (document reason below)

If NO-GO, reason: ________________________________
Rescheduled date: ___/___/______
```

**Approval Signatures**:
```
Project Sponsor: _________________ Time: ___:___
Site Manager: ____________________ Time: ___:___
IT Lead: _________________________ Time: ___:___
```

### 1.2 Infrastructure Final Check

| System | Status | Checked By |
|--------|--------|------------|
| Supabase responding | [ ] | |
| Production API accessible | [ ] | |
| Storage buckets accessible | [ ] | |
| Sentry receiving events | [ ] | |

**Quick Test Command**:
```bash
# Verify API is responding
curl -s https://YOUR_PROJECT.supabase.co/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY" | head -1
```

### 1.3 Build Verification

| Platform | Build Version | In TestFlight/Play | Verified |
|----------|---------------|-------------------|----------|
| iOS | v_______ | [ ] | [ ] |
| Android | v_______ | [ ] | [ ] |

---

## Phase 2: Device Deployment

### 2.1 Device Distribution

| Device ID | User | Distributed | App Installed | Logged In |
|-----------|------|-------------|---------------|-----------|
| | | [ ] | [ ] | [ ] |
| | | [ ] | [ ] | [ ] |
| | | [ ] | [ ] | [ ] |
| | | [ ] | [ ] | [ ] |
| | | [ ] | [ ] | [ ] |

### 2.2 Initial Sync Verification

For each device, verify initial sync completes:

| Device ID | Sync Started | Sync Complete | Assets Loaded | WOs Loaded |
|-----------|--------------|---------------|---------------|------------|
| | [ ] | [ ] | [ ] | [ ] |
| | [ ] | [ ] | [ ] | [ ] |
| | [ ] | [ ] | [ ] | [ ] |
| | [ ] | [ ] | [ ] | [ ] |
| | [ ] | [ ] | [ ] | [ ] |

### 2.3 Quick Functionality Test

Each user performs one test action:

| User | Test Action | Completed | Synced |
|------|-------------|-----------|--------|
| | Create Quick Log | [ ] | [ ] |
| | View Asset | [ ] | [ ] |
| | Take Photo | [ ] | [ ] |
| | Record Voice Note | [ ] | [ ] |
| | Start Timer | [ ] | [ ] |

---

## Phase 3: Launch Announcement

### 3.1 Communication

| Communication | Sent | Time |
|---------------|------|------|
| All-hands announcement (if applicable) | [ ] | ___:___ |
| Pilot team briefing complete | [ ] | ___:___ |
| Support contacts shared | [ ] | ___:___ |
| Quick reference cards distributed | [ ] | ___:___ |

### 3.2 Kickoff Message

```
TO: All pilot participants
SUBJECT: QuarryCMMS Pilot - GO LIVE

Team,

The QuarryCMMS pilot is now LIVE!

Starting today, please use the app for:
- Logging downtime events
- Recording work orders
- Capturing meter readings

Quick reference:
- For help: Settings > Help & Support
- For issues: Contact [Site Champion Name]
- Emergency: Continue with paper process

Good luck!
```

---

## Phase 4: First Hour Monitoring

### 4.1 Dashboard Monitoring

| Check | Time | Status | Notes |
|-------|------|--------|-------|
| Supabase API traffic | ___:___ | [ ] OK | |
| Sentry error count | ___:___ | [ ] OK | |
| Sync queue depth | ___:___ | [ ] OK | |
| New records appearing | ___:___ | [ ] OK | |

### 4.2 User Check-Ins

| User | 15min Check | Issue Reported | Resolved |
|------|-------------|----------------|----------|
| | [ ] | | |
| | [ ] | | |
| | [ ] | | |
| | [ ] | | |
| | [ ] | | |

### 4.3 First Work Orders

| WO Number | Created By | Created In App | Synced | Time |
|-----------|------------|----------------|--------|------|
| | | [ ] | [ ] | ___:___ |
| | | [ ] | [ ] | ___:___ |
| | | [ ] | [ ] | ___:___ |

---

## Phase 5: First Day Summary

### 5.1 End of Day Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Users active | 100% of pilot | ___/___% |
| Work orders created | >1 per user | ___ |
| Sync errors | 0 | ___ |
| App crashes | 0 | ___ |
| Support tickets | <3 | ___ |

### 5.2 Issues Log

| Issue | User | Time | Status | Resolution |
|-------|------|------|--------|------------|
| | | ___:___ | [ ] Open / [ ] Resolved | |
| | | ___:___ | [ ] Open / [ ] Resolved | |
| | | ___:___ | [ ] Open / [ ] Resolved | |

### 5.3 User Feedback (Quick Pulse)

Ask each user at end of day:

| User | "App worked?" | "Any problems?" | Confidence (1-5) |
|------|---------------|-----------------|------------------|
| | [ ] Yes / [ ] No | | ___ |
| | [ ] Yes / [ ] No | | ___ |
| | [ ] Yes / [ ] No | | ___ |
| | [ ] Yes / [ ] No | | ___ |
| | [ ] Yes / [ ] No | | ___ |

**Average Confidence**: ___/5

---

## Phase 6: Day 1 Close-Out

### 6.1 End-of-Day Sync Verification

| Device ID | All Data Synced | Pending Changes | Notes |
|-----------|-----------------|-----------------|-------|
| | [ ] | ___ | |
| | [ ] | ___ | |
| | [ ] | ___ | |
| | [ ] | ___ | |
| | [ ] | ___ | |

### 6.2 Debrief Meeting

**Time**: End of shift or next morning

| Topic | Discussion Notes |
|-------|------------------|
| What went well | |
| What needs improvement | |
| Immediate action items | |
| Concerns for tomorrow | |

### 6.3 Day 1 Status

```
DAY 1 STATUS

[ ] GREEN - All systems go, no issues
[ ] YELLOW - Minor issues, monitoring closely
[ ] RED - Significant issues, may need intervention

Summary:
________________________________________
________________________________________
________________________________________

Next check-in: ___/___/___ at ___:___

Submitted by: _________________ Time: ___:___
```

---

## Emergency Procedures

### If Critical Issue During Launch

1. **Assess scope**: How many users affected?
2. **Communicate**: Tell users to pause and continue with paper
3. **Escalate**: Contact IT Support and Development
4. **Document**: Log all details of the issue
5. **Decide**: Continue pilot or pause for fix

### Rollback Trigger Conditions

| Condition | Action |
|-----------|--------|
| >50% users can't sync for >30 min | Pause pilot |
| Data loss reported | Stop, escalate immediately |
| App crashes on launch for any user | IT investigation required |
| Authentication failures site-wide | Check Supabase, may need rollback |

### Rollback Steps (If Needed)

1. Announce: "Pausing pilot while we resolve an issue"
2. Collect all devices if needed
3. Document current state in Supabase
4. Push previous stable build via TestFlight/Play Store
5. Schedule follow-up meeting within 24 hours
6. Create incident report

---

## Day 2+ Cadence

### Daily Standup (First Week)

**Time**: Start of each shift

**Attendees**: Site Champion, IT Support (optional remote)

**Agenda** (10 minutes):
1. Yesterday's metrics (2 min)
2. Issues to address (3 min)
3. Today's focus (2 min)
4. Questions/concerns (3 min)

### Weekly Review (Ongoing)

**Time**: End of week

**Topics**:
- Adoption rate trend
- Sync reliability
- Feature usage
- User feedback themes
- Adjustments needed

---

## Success Criteria (Day 1)

| Criterion | Target | Actual | Pass? |
|-----------|--------|--------|-------|
| All pilot devices deployed | 100% | ___% | [ ] |
| All users logged in successfully | 100% | ___% | [ ] |
| At least 1 WO created per user | 100% | ___% | [ ] |
| Zero data loss incidents | 0 | ___ | [ ] |
| Sync working for all users | 100% | ___% | [ ] |
| User confidence score | >3.0 | ___ | [ ] |

**Day 1 Result**: [ ] Success [ ] Partial [ ] Needs Work

---

## Sign-Off

```
GO-LIVE DAY COMPLETE

Date: ___/___/______

Overall Status: [ ] GREEN  [ ] YELLOW  [ ] RED

Day 1 Success: [ ] Yes  [ ] Partial  [ ] No

Key Accomplishments:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

Outstanding Issues:
1. _______________________________________________
2. _______________________________________________

Next Steps:
1. _______________________________________________
2. _______________________________________________

Signed:
Site Champion: __________________ Date: ___/___/___
IT Lead: ________________________ Date: ___/___/___
```

---

*QuarryCMMS Go-Live Checklist - Week 24*
