# Pre-Launch Checklist

> **Purpose**: Technical verification checklist to complete before pilot go-live. All items must be verified before scheduling the go-live date.

---

## Overview

This checklist ensures all infrastructure, configuration, and operational elements are in place before launching the QuarryCMMS pilot. Complete all sections before proceeding to go-live.

**Target Completion**: 3-5 days before planned go-live date

---

## 1. Supabase Production Environment

### 1.1 Project Configuration

| Item | Status | Verified By | Date |
|------|--------|-------------|------|
| Production project created | [ ] | | |
| Project region matches user base (e.g., ca-central-1) | [ ] | | |
| Database password is strong and documented | [ ] | | |
| Database connection pooling enabled | [ ] | | |

### 1.2 Authentication

| Item | Status | Verified By | Date |
|------|--------|-------------|------|
| Email provider configured | [ ] | | |
| Email templates customized | [ ] | | |
| Password policy configured (8+ chars) | [ ] | | |
| Session duration set (7 days for offline) | [ ] | | |
| JWT secret is unique to production | [ ] | | |

### 1.3 Row Level Security (RLS)

| Table | RLS Enabled | Policies Tested | Verified By |
|-------|-------------|-----------------|-------------|
| profiles | [ ] | [ ] | |
| work_orders | [ ] | [ ] | |
| assets | [ ] | [ ] | |
| meter_readings | [ ] | [ ] | |
| work_order_photos | [ ] | [ ] | |

### 1.4 Storage Buckets

| Bucket | Created | RLS Policies | Max Size |
|--------|---------|--------------|----------|
| work-order-photos | [ ] | [ ] | 10MB |
| voice-notes | [ ] | [ ] | 5MB |
| signatures | [ ] | [ ] | 1MB |

### 1.5 Database Content

| Item | Status | Notes |
|------|--------|-------|
| Pilot site created in sites table | [ ] | |
| Assets imported for pilot site | [ ] | |
| User accounts created for all pilot users | [ ] | |
| Supervisor accounts created with correct role | [ ] | |

---

## 2. App Configuration

### 2.1 Environment Variables

| Variable | Set in .env.production | Verified Working |
|----------|------------------------|------------------|
| EXPO_PUBLIC_SUPABASE_URL | [ ] | [ ] |
| EXPO_PUBLIC_SUPABASE_ANON_KEY | [ ] | [ ] |
| EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET | [ ] | [ ] |
| EXPO_PUBLIC_APP_ENV=production | [ ] | [ ] |
| EXPO_PUBLIC_SENTRY_DSN | [ ] | [ ] |

### 2.2 App Identifiers

| Platform | Bundle/Package ID | Correct |
|----------|-------------------|---------|
| iOS | com.quarrycmms.app | [ ] |
| Android | com.quarrycmms.app | [ ] |

### 2.3 Version Numbers

| Location | Version | Matches |
|----------|---------|---------|
| app.json (expo.version) | _______ | [ ] |
| app.json (ios.buildNumber) | _______ | [ ] |
| app.json (android.versionCode) | _______ | [ ] |
| SettingsScreen.tsx (APP_VERSION) | _______ | [ ] |

---

## 3. Monitoring & Observability

### 3.1 Sentry Configuration

| Item | Status | Verified By | Date |
|------|--------|-------------|------|
| Sentry project created | [ ] | | |
| Production DSN configured | [ ] | | |
| Source maps uploading works | [ ] | | |
| Test error appears in Sentry | [ ] | | |
| Alert rules configured | [ ] | | |

### 3.2 Supabase Monitoring

| Item | Status | Notes |
|------|--------|-------|
| Database metrics accessible | [ ] | |
| API logs enabled | [ ] | |
| Storage logs enabled | [ ] | |
| Email for alerts configured | [ ] | |

### 3.3 Alert Thresholds

| Alert | Threshold | Configured |
|-------|-----------|------------|
| Error rate spike | >10 errors/hour | [ ] |
| Database CPU | >80% sustained | [ ] |
| API latency | >5s p95 | [ ] |
| Auth failures | >20/hour | [ ] |

---

## 4. App Store Accounts

### 4.1 Apple Developer Account

| Item | Status | Account |
|------|--------|---------|
| Organization account active | [ ] | |
| App Store Connect access | [ ] | |
| App created in ASC | [ ] | |
| Bundle ID registered | [ ] | |
| Provisioning profiles valid | [ ] | |

### 4.2 Google Play Console

| Item | Status | Account |
|------|--------|---------|
| Developer account active | [ ] | |
| App created in console | [ ] | |
| Internal testing track enabled | [ ] | |
| Service account JSON created | [ ] | |

---

## 5. Build & Deployment

### 5.1 EAS Configuration

| Item | Status | Notes |
|------|--------|-------|
| eas.json has production profile | [ ] | |
| Production channel configured | [ ] | |
| Submit configuration complete | [ ] | |
| EAS CLI authenticated | [ ] | |

### 5.2 Production Build Test

| Platform | Build Successful | Tested On Device |
|----------|------------------|------------------|
| iOS | [ ] | [ ] |
| Android | [ ] | [ ] |

### 5.3 TestFlight / Internal Track

| Platform | Build Uploaded | Testers Added | Test Install Works |
|----------|----------------|---------------|-------------------|
| iOS (TestFlight) | [ ] | [ ] | [ ] |
| Android (Internal) | [ ] | [ ] | [ ] |

---

## 6. Pilot Devices

### 6.1 Device Inventory

| Device ID | User | Platform | Version | Registered |
|-----------|------|----------|---------|------------|
| | | | | [ ] |
| | | | | [ ] |
| | | | | [ ] |
| | | | | [ ] |
| | | | | [ ] |

### 6.2 Device Readiness

| Item | All Devices |
|------|-------------|
| Meets minimum specs | [ ] |
| Rugged case installed | [ ] |
| Screen protector applied | [ ] |
| TestFlight/Play Store registered | [ ] |
| Charged and ready | [ ] |

---

## 7. Training & Documentation

### 7.1 Training Completion

| Audience | Training Material | Completed By |
|----------|-------------------|--------------|
| Field Technicians | Quick Start Guide | [ ] ___/___/___ |
| Supervisors | Supervisor Guide | [ ] ___/___/___ |
| Site Champion | Champion Runbook | [ ] ___/___/___ |
| IT Support | IT Support Runbook | [ ] ___/___/___ |

### 7.2 Documentation Available

| Document | Location | Accessible |
|----------|----------|------------|
| Quick Reference Card | Printed/Posted | [ ] |
| Troubleshooting Guide | In-app Help | [ ] |
| IT Support Runbook | docs/runbooks/ | [ ] |
| Deployment Runbook | docs/runbooks/ | [ ] |

---

## 8. Baseline Measurement

### 8.1 Pre-Pilot Metrics Captured

| Metric | Baseline Value | Date Captured |
|--------|---------------|---------------|
| Daily work orders (paper) | _______ | ___/___/___ |
| Avg WO completion time | _______ | ___/___/___ |
| Downtime reporting delay | _______ | ___/___/___ |
| Data entry errors (weekly) | _______ | ___/___/___ |

### 8.2 Measurement Tools Ready

| Tool | Configured | Tested |
|------|------------|--------|
| Adoption tracking query | [ ] | [ ] |
| Sync reliability query | [ ] | [ ] |
| Data quality query | [ ] | [ ] |
| User satisfaction survey | [ ] | [ ] |

---

## 9. Support Readiness

### 9.1 Support Team

| Role | Name | Contact | Backup |
|------|------|---------|--------|
| Site Champion | | | |
| IT Support Primary | | | |
| IT Support Backup | | | |
| Project Sponsor | | | |

### 9.2 Escalation Path Documented

| Level | Response Time | Contact Method |
|-------|---------------|----------------|
| Site Champion | <30 min | In-person/Phone |
| IT Support | <2 hours | Email/Phone |
| Development | <4 hours | Slack/Email |

### 9.3 Support Tools Access

| Tool | IT Has Access | Tested |
|------|---------------|--------|
| Supabase Dashboard | [ ] | [ ] |
| Sentry Dashboard | [ ] | [ ] |
| EAS Dashboard | [ ] | [ ] |
| Log export from device | [ ] | [ ] |

---

## 10. Rollback Plan

### 10.1 Rollback Triggers

| Condition | Decision Maker |
|-----------|----------------|
| >50% of users can't sync | IT Support |
| Data loss incident | Project Sponsor |
| Critical bug blocking work | Site Champion + IT |
| App crashes on launch | IT Support |

### 10.2 Rollback Procedure Documented

| Item | Documented | Tested |
|------|------------|--------|
| How to push previous build | [ ] | [ ] |
| How to notify users | [ ] | [ ] |
| Fallback to paper process | [ ] | [ ] |
| Data recovery procedure | [ ] | [ ] |

---

## 11. Go/No-Go Meeting Prep

### 11.1 Meeting Scheduled

| Item | Details |
|------|---------|
| Date | ___/___/___ |
| Time | ___:___ |
| Attendees | |
| Location/Link | |

### 11.2 Agenda Items

| Item | Presenter |
|------|-----------|
| Infrastructure readiness | IT Lead |
| Training completion | Site Champion |
| Baseline metrics | Project Sponsor |
| Risk assessment | All |
| Go/No-Go decision | Project Sponsor |

### 11.3 Decision Criteria (from go-no-go-checklist.md)

| Criterion | Status |
|-----------|--------|
| All critical infrastructure ready | [ ] |
| 100% pilot users trained | [ ] |
| Baseline metrics captured | [ ] |
| Support team ready | [ ] |
| Rollback plan tested | [ ] |

---

## Sign-Off

All items above must be verified before proceeding to go-live.

```
PRE-LAUNCH VERIFICATION COMPLETE

All checklist items verified: [ ] Yes  [ ] No

If No, blocking items:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

Verified By: _______________________  Date: ___/___/___
IT Lead: ___________________________  Date: ___/___/___
Project Sponsor: ___________________  Date: ___/___/___

Proceed to Go-Live: [ ] Approved  [ ] Blocked
```

---

*QuarryCMMS Pre-Launch Checklist - Week 24*
