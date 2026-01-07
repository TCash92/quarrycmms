# Go/No-Go Criteria Checklist

> **Purpose**: Structured decision framework for evaluating pilot success at Day 30, Day 45, and Day 60 milestones. Provides clear thresholds and actions for each outcome.

---

## Overview

The pilot runs for 60 days with checkpoints at Day 30 and Day 45. At each checkpoint:

1. **Measure** against defined criteria
2. **Decide** Go/Conditional/No-Go
3. **Act** based on the decision

---

## DAY 30 CHECKPOINT

### Criteria

| Metric | Target | Actual | Pass? |
|--------|--------|--------|-------|
| **Adoption Rate** | >60% of technicians using app daily | ___% | [ ] |
| **Sync Reliability** | <5% sync failures | ___% | [ ] |
| **Data Entry Compliance** | >50% of WOs created in app | ___% | [ ] |
| **Critical Bugs** | 0 data loss incidents | ___ incidents | [ ] |

### How to Measure

**Adoption Rate**:
```
Technicians with >1 app action per day (avg over week 4)
────────────────────────────────────────────────────────  x 100
Total pilot technicians
```

**Sync Reliability**:
```
Failed sync attempts (week 4)
────────────────────────────────  x 100
Total sync attempts (week 4)
```

**Data Entry Compliance**:
```
WOs created in app (week 4)
───────────────────────────────  x 100
Total WOs created (app + paper)
```

**Critical Bugs**:
Count of incidents where:
- Data was lost
- Work order disappeared
- Sync corrupted records
- App prevented essential work

### Day 30 Decision Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DAY 30 DECISION MATRIX                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ALL criteria met?                                                          │
│       │                                                                     │
│       ├── YES ──► GO: Continue pilot, proceed to Day 45                     │
│       │                                                                     │
│       └── NO ───► Check which failed:                                       │
│                     │                                                       │
│                     ├── Adoption <60% ──► CONDITIONAL                       │
│                     │     Action: Retrain, identify barriers                │
│                     │     Extend checkpoint by 1 week                       │
│                     │                                                       │
│                     ├── Sync >5% failures ──► CONDITIONAL                   │
│                     │     Action: IT investigation required                 │
│                     │     May need infrastructure changes                   │
│                     │                                                       │
│                     ├── Data entry <50% ──► CONDITIONAL                     │
│                     │     Action: Reinforce training, simplify workflow     │
│                     │     Supervisor intervention needed                    │
│                     │                                                       │
│                     └── Any critical bug ──► NO-GO                          │
│                           Action: STOP PILOT                                │
│                           Escalate to development                           │
│                           Do not proceed until resolved                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Day 30 Actions

| Decision | Actions |
|----------|---------|
| **GO** | Continue as planned, schedule Day 45 review |
| **CONDITIONAL** | Implement remediation, extend checkpoint 1 week, re-evaluate |
| **NO-GO** | Stop pilot, escalate issues, do not proceed |

---

## DAY 45 CHECKPOINT

### Criteria

| Metric | Target | Actual | Pass? |
|--------|--------|--------|-------|
| **Adoption Rate** | >70% of technicians using app daily | ___% | [ ] |
| **Data Quality** | <10% WOs requiring supervisor correction | ___% | [ ] |
| **Offline Reliability** | >95% successful offline-to-sync | ___% | [ ] |
| **User Satisfaction** | >3.0/5.0 average rating | ___/5.0 | [ ] |

### How to Measure

**Adoption Rate**:
```
Same formula as Day 30, measured week 6-7
Target increased from 60% to 70%
```

**Data Quality**:
```
WOs edited by supervisor for corrections (weeks 5-6)
─────────────────────────────────────────────────────  x 100
Total WOs created (weeks 5-6)
```

**Offline Reliability**:
```
Successful syncs after offline period (weeks 5-6)
──────────────────────────────────────────────────────  x 100
Total offline sessions that later synced
```

**User Satisfaction**:
Quick survey (1-5 scale):
1. "The app helps me do my job" - ___
2. "The app is easy to use" - ___
3. "I would recommend the app" - ___

Average: ___/5.0

### Day 45 Decision Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DAY 45 DECISION MATRIX                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ALL criteria met?                                                          │
│       │                                                                     │
│       ├── YES ──► GO: Continue to Day 60, plan expansion                    │
│       │                                                                     │
│       └── NO ───► Check which failed:                                       │
│                     │                                                       │
│                     ├── Adoption <70% ──► CONDITIONAL                       │
│                     │     Action: Individual coaching                       │
│                     │     Identify specific resistors                       │
│                     │     Consider workflow adjustments                     │
│                     │                                                       │
│                     ├── Data quality >10% ──► CONDITIONAL                   │
│                     │     Action: Additional training on forms              │
│                     │     Review common errors, update guidance             │
│                     │                                                       │
│                     ├── Offline <95% ──► CONDITIONAL                        │
│                     │     Action: IT network investigation                  │
│                     │     Check device configurations                       │
│                     │                                                       │
│                     └── Satisfaction <3.0 ──► PAUSE                         │
│                           Action: User feedback sessions                    │
│                           Identify pain points                              │
│                           May need feature adjustments                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Day 45 Actions

| Decision | Actions |
|----------|---------|
| **GO** | Continue, begin planning multi-site rollout |
| **CONDITIONAL** | Implement remediation, extend checkpoint 1 week |
| **PAUSE** | Continue pilot but delay expansion planning |

---

## DAY 60 CHECKPOINT (Final)

### Criteria

| Metric | Target | Actual | Pass? |
|--------|--------|--------|-------|
| **Adoption Rate** | >=80% of technicians using app daily | ___% | [ ] |
| **Downtime Capture** | >=90% of downtime logged in app | ___% | [ ] |
| **Positive ROI** | Net savings > costs | $____ | [ ] |
| **Compliance Ready** | PDF reports pass audit sample | [ ] Pass / [ ] Fail | [ ] |

### How to Measure

**Adoption Rate**:
```
Same formula, week 8
Target increased to 80%
```

**Downtime Capture**:
```
Downtime events logged in app (week 8)
─────────────────────────────────────────  x 100
Total known downtime events (from supervisors)
```

**Positive ROI**:
Complete ROI Calculation Template (docs/baseline/roi-calculation-template.md)
```
Net Annual Savings > $0 = PASS
```

**Compliance Ready**:
Generate 3 sample compliance PDF packages
Have supervisor verify:
- [ ] All required fields present
- [ ] Signatures display correctly
- [ ] Timeline is accurate
- [ ] Would pass external audit

### Day 60 Decision Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DAY 60 DECISION MATRIX                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ALL criteria met?                                                          │
│       │                                                                     │
│       ├── YES ──► FULL GO: Approve multi-site expansion                     │
│       │           Action: Begin rollout planning                            │
│       │           Budget for additional sites                               │
│       │           Celebrate success!                                        │
│       │                                                                     │
│       └── NO ───► Check which failed:                                       │
│                     │                                                       │
│                     ├── Adoption <80% ──► PARTIAL GO                        │
│                     │     Continue at pilot site                            │
│                     │     Delay expansion until 80% reached                 │
│                     │                                                       │
│                     ├── Downtime <90% ──► PARTIAL GO                        │
│                     │     Continue at pilot site                            │
│                     │     Investigate missed events                         │
│                     │                                                       │
│                     ├── Negative ROI ──► CONDITIONAL                        │
│                     │     Review cost assumptions                           │
│                     │     Identify value gaps                               │
│                     │     May need longer pilot                             │
│                     │                                                       │
│                     └── Compliance fail ──► NO-GO FOR EXPANSION             │
│                           Critical blocker                                  │
│                           Must fix before any expansion                     │
│                           App must meet compliance requirements             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Day 60 Actions

| Decision | Actions |
|----------|---------|
| **FULL GO** | Approve expansion, allocate budget, begin rollout |
| **PARTIAL GO** | Continue pilot, extend timeline, address gaps |
| **CONDITIONAL** | Deep dive into issues, set new targets, re-evaluate in 30 days |
| **NO-GO** | Critical issue must be resolved, expansion blocked |

---

## CHECKPOINT MEETING TEMPLATE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CHECKPOINT MEETING NOTES                               │
│                                                                             │
│  Checkpoint: [ ] Day 30    [ ] Day 45    [ ] Day 60                         │
│                                                                             │
│  Date: ____/____/________                                                   │
│                                                                             │
│  Attendees: ________________________________________________________        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  METRICS REVIEW                                                             │
│                                                                             │
│  Metric 1: ________________  Target: _______  Actual: _______  [ ] Pass     │
│  Metric 2: ________________  Target: _______  Actual: _______  [ ] Pass     │
│  Metric 3: ________________  Target: _______  Actual: _______  [ ] Pass     │
│  Metric 4: ________________  Target: _______  Actual: _______  [ ] Pass     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ISSUES IDENTIFIED                                                          │
│                                                                             │
│  1. _________________________________________________________________       │
│  2. _________________________________________________________________       │
│  3. _________________________________________________________________       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DECISION                                                                   │
│                                                                             │
│  [ ] GO        [ ] CONDITIONAL        [ ] PAUSE        [ ] NO-GO            │
│                                                                             │
│  Rationale: ____________________________________________________________    │
│  ________________________________________________________________________   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ACTION ITEMS                                                               │
│                                                                             │
│  Action                              Owner              Due Date            │
│  ─────────────────────────────────────────────────────────────────────────  │
│  1. ____________________________    ______________    ____/____/____        │
│  2. ____________________________    ______________    ____/____/____        │
│  3. ____________________________    ______________    ____/____/____        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  NEXT CHECKPOINT                                                            │
│                                                                             │
│  Date: ____/____/________                                                   │
│                                                                             │
│  Signatures:                                                                │
│                                                                             │
│  Site Manager: _________________________  Date: ____/____/____              │
│  IT Lead: _______________________________  Date: ____/____/____             │
│  Project Sponsor: _______________________  Date: ____/____/____             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference

### Critical Thresholds

| Checkpoint | Adoption | Other Key Metric |
|------------|----------|------------------|
| Day 30 | >60% | <5% sync failures |
| Day 45 | >70% | <10% corrections |
| Day 60 | >=80% | >=90% downtime capture |

### Escalation Contacts

| Issue Type | Contact |
|------------|---------|
| Technical (sync, bugs) | IT Support |
| Adoption (training) | Site Champion |
| Business (ROI, scope) | Project Sponsor |

### Decision Authority

| Decision | Who Decides |
|----------|-------------|
| GO | Site Manager + Project Sponsor |
| CONDITIONAL | Site Manager (with IT input) |
| NO-GO | Project Sponsor (mandatory) |

---

*QuarryCMMS Baseline Measurement - Week 23*
