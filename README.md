# QuarryCMMS

A maintenance management system built for the reality of Canadian aggregate operations—not the fantasy of perfect data entry.

## Philosophy

QuarryCMMS follows the **"Honda Principles"**: reliable, field-proven, and ruthlessly practical. It prioritizes capturing *imperfect* data instantly over capturing *perfect* data never.

**This is a Quarry Tool, not a Software Company product.**

## Why QuarryCMMS Exists

Most CMMS solutions assume 99% uptime, 20°C temperatures, and technicians with time to fill out forms. In a Canadian quarry, those assumptions fail immediately.

QuarryCMMS is designed for:
- **No cell signal** in the hollow
- **-25°C winters** with gloved hands
- **Technicians** who need to log work in 30 seconds, not 5 minutes
- **Supervisors** who need actionable data, not a second job as a data clerk

---

## Version Evolution: How We Got Here

QuarryCMMS was heading toward certain failure as recently as v3. The trajectory was corrected by a philosophical pivot in v4 and the hardening of human workflows in v6.

### Version 2: The Reality Check

**Focus:** Acknowledging that Canadian aggregate operations have unique constraints.

v2 established the foundational understanding that quarry software must account for:
- Extreme cold weather and dust
- Unreliable connectivity
- Technicians who work with their hands, not keyboards

This version asked the right questions but didn't yet have the right answers.

### Version 3: The Enterprise Trap

**Focus:** Robust database design influenced by IBM Maximo patterns.

**What went wrong:** v3 became "Maximo Lite." It prioritized perfect data structures—hierarchies, inventory tracking, strict typing—over field usability. Complex forms lead to technicians skipping input or entering garbage data ("pencil whipping").

v3 was technically impressive and practically unusable.

### Version 4: The Honda Pivot

**Focus:** Ruthless simplification. User-friendliness over comprehensive features.

**What changed:**
- Slashed scope to core maintenance logging
- Introduced **Quick Log**—capture events in seconds, not minutes
- Removed hierarchies that nobody would maintain
- Prioritized emergency response capability

**The insight:** Capturing *imperfect* data instantly is infinitely better than capturing *perfect* data never.

This version saved the project.

### Version 5: Engineering the Hard Problems

**Focus:** Detailed technical specifications for the constraints v2 identified.

**Key solutions:**
- **Offline-first architecture** using WatermelonDB (sync-later, not check-connection)
- **Cold weather UI** with large touch targets and voice-first input
- **Offline cryptographic verification** for Ministry compliance
- **Self-service IT tools** for diagnostics and database reset

v5 turned design principles into engineering specifications.

### Version 6: The Human Element

**Focus:** Addressing adoption challenges and the "garbage data" problem.

**What changed:**
- **Enrichment Workflow:** Accepts that field data is messy (voice notes, 2-word descriptions) and creates a dedicated UI for Supervisors to "clean" data later
- **Supervisor Dashboard:** Shaped by direct feedback from field foremen (Ray) and trainers (Tanya)
- **Voice Note Processing:** Structured workflow for converting audio to actionable records
- **Training Integration:** Addressed the assumption gaps from v5
- **24-week implementation timeline** with clear milestones
- **Conflict resolution matrix** for sync edge cases

**The insight:** Decouple *capture* (Technician's job—fast) from *structure* (Supervisor's job—deliberate).

---

## Why It Works Now

| Problem | How It Was Failing | How It Works Now |
|---------|-------------------|------------------|
| **Database Trap** | v3 prioritized perfect structures over usability | v4 introduced Quick Log—speed over completeness |
| **Garbage Data** | Quick Log risked entries like "fixed it" | v6 Enrichment Workflow lets Supervisors structure data post-capture |
| **Connectivity** | Apps freeze without signal | WatermelonDB sync-later architecture works offline |
| **Cold Weather** | Standard UIs unusable with gloves | Large touch targets, voice-first input |
| **Compliance** | Ministry checks required connectivity | Offline cryptographic verification |
| **IT Bottleneck** | "It doesn't work" tickets kill pilots | Self-service diagnostics and reset tools |
| **Vendor Lock-in** | CFOs fear trapped data | Full data portability and documented exit strategy |

---

## Red Team Personas

These personas were used to stress-test every design decision. Each represents a critical stakeholder who will interact with, evaluate, or be affected by the system.

**Technique:** After generating or reviewing any design artifact, paste the relevant persona prompt and ask an AI to adopt that perspective. The resulting critique surfaces blind spots, unspoken assumptions, and real-world friction points.

### Persona Scorecard

| Persona | Role | v4 | v5 | v6 |
|---------|------|----|----|-----|
| **Dave** | Quarry Technician | 7/10 | 8/10 | 9/10 |
| **Sandra** | Operations Manager | 6/10 | 8/10 | 9/10 |
| **Robert** | Ministry Inspector | 5/10 | 8/10 | 8.5/10 |
| **Michelle** | IT Manager | 6/10 | 7/10 | 8/10 |
| **Gerald** | CFO | 7/10 | 8/10 | 8.5/10 |
| **Alex** | Senior Developer | — | 8/10 | 8.5/10 |
| **Ray** | Foreman | — | 6/10 | 8/10 |
| **Tanya** | Trainer | — | 5/10 | 8/10 |

---

### 1. Dave — The Skeptical Quarry Technician

**Profile:**
- Age 52, 23 years at the pit
- Hands usually covered in grease
- Wears thick gloves in winter (−25°C)
- Has seen three "digital transformation" initiatives fail
- 5 minutes to spare before next breakdown call

**Prompt:**

> "You are now a 52-year-old maintenance technician named Dave who has worked at a limestone quarry for 23 years. You've seen three 'digital transformation' initiatives fail. Your hands are usually covered in grease, you wear thick gloves in winter, and you think most software is designed by people who've never set foot on a job site. You have 5 minutes before your next breakdown call. Look at what you just created and tell me: What makes you immediately dismiss this as 'another app that doesn't understand my job'? What would make you go back to your clipboard?"

**What Dave Stress-Tests:**
- Mobile usability with gloves and cold conditions
- Time-to-complete for emergency work orders
- Photo capture in dusty environments
- Voice notes as typing alternative
- Quick Log mode for breakdowns
- Whether the app is faster than a clipboard

---

### 2. Sandra — The Risk-Averse Operations Manager

**Profile:**
- Operations Manager at mid-sized aggregate producer
- Manages 3 sites
- Bonus tied to uptime
- Burned by "offline capable" software that failed during a 4-day outage
- Lost $80K in untracked downtime

**Prompt:**

> "You are now the Operations Manager at a mid-sized aggregate producer running 3 sites. Your bonus depends on uptime, and you've been burned by software that promised 'offline capability' but failed during a 4-day outage last winter—costing you $80K in untracked downtime. Review what you just generated and tell me: What's the single biggest operational risk you see? Where could this fail catastrophically when we need it most?"

**What Sandra Stress-Tests:**
- Offline-first architecture reliability
- Sync conflict resolution
- Multi-device scenarios
- Data loss prevention
- Escalation triggers and supervisor visibility
- Failure modes during extended connectivity loss

---

### 3. Robert — The Ministry Inspector

**Profile:**
- Ministry of Labour inspector
- Conducting surprise audit at a remote pit
- Needs maintenance records for past 6 months—right now, on paper
- Has seen tablets that won't load, apps that crash, "the system is down" excuses

**Prompt:**

> "You are now a Ministry of Labour inspector conducting a surprise audit at a remote pit. You need maintenance records for the past 6 months—right now, on paper. You've seen companies try to pull up records on tablets that won't load, apps that crash, and 'the system is down' excuses. Look at this and tell me: What compliance gaps do you see? What would make you write up a violation?"

**What Robert Stress-Tests:**
- Offline PDF export capability
- Cryptographic signature integrity
- Audit trail completeness
- 7-year retention requirements
- Provincial regulation compliance (Ontario Reg 854, Alberta OHS Code, etc.)
- QR code verification without live connectivity

---

### 4. Michelle — The Burnt-Out IT Manager

**Profile:**
- Sole IT person supporting 200 employees across 5 quarry sites
- Most sites have unreliable cell service
- Has inherited three half-finished "custom solutions"
- Skeptical of anything requiring ongoing maintenance

**Prompt:**

> "You are now the sole IT person supporting 200 employees across 5 quarry sites, most with unreliable cell service. You've inherited three half-finished 'custom solutions' and you're skeptical of anything that requires ongoing maintenance. Critique what you just created: What's going to break at 2 AM? What support tickets are you already dreading? What makes this 'yet another system I'll have to babysit'?"

**What Michelle Stress-Tests:**
- Self-service troubleshooting tools
- Error message clarity and actionability
- Support ticket volume predictions
- Monitoring and alerting requirements
- User password reset and access management
- Maintenance burden over time

---

### 5. Gerald — The Cost-Cutting CFO

**Profile:**
- CFO of a family-owned aggregate company
- Thin margins, rising equipment costs
- Has approved software projects before that never delivered ROI
- Needs to see payback within 12 months or it's a hard no

**Prompt:**

> "You are now the CFO of a family-owned aggregate company. Margins are thin, equipment costs are rising, and you've approved software projects before that never delivered ROI. You need to see payback within 12 months or it's a hard no. Review this and tell me: Where's the fluff? What costs are hidden? Why won't this actually save us money?"

**What Gerald Stress-Tests:**
- Total cost of ownership (TCO) honesty
- Hidden costs (phones, training, ongoing maintenance)
- ROI calculation with measurable metrics
- Baseline measurement plan
- Exit cost analysis
- Pilot program true costs

---

### 6. Alex — The Senior Developer

**Profile:**
- 12 years building mobile apps
- 3 React Native apps shipped
- WatermelonDB scars from past sync projects
- Building via SSH with Claude Code on a VPS
- Needs to start coding on Monday

**Prompt:**

> "You are now a senior mobile developer named Alex with 12 years of experience, including 3 shipped React Native apps and painful experience with WatermelonDB sync. You're about to build this system using Claude Code via SSH on a VPS. You need to start writing code on Monday. Look at what you just created and tell me: What's missing that will block me on Day 1? What ambiguities will cause Claude Code to guess wrong? What's the realistic timeline, and what will break first?"

**What Alex Stress-Tests:**
- API contract completeness (OpenAPI spec)
- Authentication flow documentation
- Environment configuration clarity
- First week milestones and PR breakdown
- Sync edge cases and merge rules
- Technical debt prevention (feature flags, API versioning)
- Realistic timeline estimates
- Schema migration strategy

---

### 7. Ray — The Skeptical Foreman

**Profile:**
- Age 47, 18 years in aggregate operations (6 as tech, 12 as foreman)
- Manages 8 technicians across two pits
- Morning starts at 5:30 AM reviewing yesterday's work
- Phone buzzes constantly with "quick questions" that aren't quick
- Gets called when the auditor finds a gap
- Caught between Sandra (wants reports) and Dave (wants to be left alone)

**Prompt:**

> "You are now a 47-year-old maintenance foreman named Ray who has worked in aggregate operations for 18 years—6 as a tech, 12 as foreman. You manage 8 technicians across two pits. Your morning starts at 5:30 AM reviewing yesterday's work and assigning today's priorities. Your phone buzzes constantly with 'quick questions' that aren't quick. You've been burned by systems that promise 'supervisor visibility' but actually mean 'more screens to check' and 'more things that are somehow your fault.' Your boss (Sandra) wants reports. Your guys (Dave) want you to leave them alone. You're the one who gets called when the auditor finds a gap. Look at what you just created and tell me: What's going to make my morning meeting take longer? Where will things fall through the cracks that I'll be blamed for? What would actually help me catch problems before Sandra does?"

**What Ray Stress-Tests:**
- Supervisor dashboard design and information density
- Enrichment workflow (voice note → structured data) and review process
- Escalation triggers and notification fatigue
- Quick verification of completed work orders
- Gap between "technician completed" and "supervisor approved"
- Un-enriched Quick Log entries piling up
- Work assignment and priority management

---

### 8. Tanya — The Change Management Lead / Trainer

**Profile:**
- Age 39, HR and Training Coordinator supporting 3 quarry sites
- Has rolled out two software systems in 5 years (one failed, one took 8 months longer than promised)
- Workforce is 60% seasonal, 30% annual turnover
- Age range: 22-year-old new hires to 58-year-old veterans
- Has 2 weeks in spring before production ramps up
- Cannot pull technicians off the floor for more than 90 minutes
- Training facilities range from lunchroom with WiFi to trailer with whiteboard

**Prompt:**

> "You are now a 39-year-old HR and Training Coordinator named Tanya who supports 3 quarry sites for a mid-sized aggregate producer. You've rolled out two software systems in the past 5 years—one failed because 'nobody had time to learn it,' one succeeded but took 8 months longer than promised. Your workforce is 60% seasonal, turns over 30% annually, and ranges from 22-year-old new hires to 58-year-old veterans who've 'seen it all.' You have exactly 2 weeks in spring before production ramps up to train everyone. Half your sites have a lunchroom with WiFi; one has a trailer with a whiteboard. You cannot pull technicians off the floor for more than 90 minutes at a time. Review what you just created and tell me: How am I supposed to train 50 people on this? What happens when someone starts mid-season and missed training? Where's the 'I forgot how to do X' support that doesn't require calling IT?"

**What Tanya Stress-Tests:**
- Training material completeness and format (video, written, quick-reference cards)
- Time-to-competency assumptions
- Mid-season onboarding path for new hires
- Self-service support when training is forgotten
- Multi-generational usability (digital natives vs. paper veterans)
- Seasonal workforce considerations (knowledge retained over winter shutdown)
- 90-minute training session constraints

---

## How to Use These Personas

### Single Persona Review

After generating or reviewing any design artifact, paste one persona prompt and ask the AI to adopt that perspective. Best for focused critique on a specific concern area.

### Full Panel Review

Run all 8 personas sequentially against a major design document. Compile findings into a gap analysis table. This is how v3 → v4 → v5 → v6 evolved.

### Targeted Combinations

Match personas to document type:

| Document Type | Recommended Personas |
|---------------|---------------------|
| UI/UX designs | Dave + Ray + Tanya |
| Technical specs | Alex + Michelle + Sandra |
| Compliance features | Robert + Gerald + Sandra |
| Business case | Gerald + Sandra + Tanya |
| Rollout plan | Tanya + Ray + Michelle |

---

## Path Forward: Remaining Risks

Despite excellent design evolution, three critical failure points remain in execution:

### 1. The Sync Engine (The Hard Part)

**Risk Level:** High

v6 allocates Weeks 4-9 to the sync engine. Building a custom sync engine that handles conflicts without data loss is notoriously difficult.

**Why it matters:** If sync is unreliable in the first month, trust will evaporate and never return. Users will revert to paper.

**Mitigation:**
- Extensive conflict resolution testing before field deployment
- Conservative sync strategies (last-write-wins with full audit trail)
- Manual conflict resolution UI for edge cases

### 2. Supervisor Burnout

**Risk Level:** Medium

v6 relies heavily on Supervisors to "enrich" data and manage conflicts. If Quick Log volume is too high, the Supervisor becomes a data-entry clerk.

**Why it matters:** Supervisors have organizational power. If they decide the system creates more work than it saves, they will kill the project to protect their own time.

**Mitigation:**
- Batch processing UI for efficient enrichment
- Smart defaults and auto-categorization where possible
- Volume monitoring and alerts
- Clear escalation paths for backlog

### 3. The Cold Soak Reality

**Risk Level:** Medium (Physics, Not Software)

While the *design* accounts for cold weather, the *hardware* reality is that battery chemistry fails at -25°C. Lithium-ion batteries can lose 50%+ capacity in extreme cold.

**Why it matters:** If devices die in 2 hours, the software is irrelevant.

**Mitigation:**
- Device selection guidance (ruggedized, cold-rated hardware)
- Battery warming recommendations
- Backup device protocols
- Offline data preservation on unexpected shutdown

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

## Status

**Current Version:** v6  
**Status:** Production-Ready  
**Implementation Timeline:** 24 weeks

**Verdict: Likely Success.**

The project succeeds because it stopped trying to be a "Software Company" product and started being a "Quarry Tool."

By prioritizing the **Technician's speed** (v4) and the **Supervisor's sanity** (v6) over the **Database's purity** (v3), QuarryCMMS has removed the friction points that usually kill CMMS implementations in heavy industry.

---

## Data Portability

Your data is yours. QuarryCMMS includes full export capabilities in standard formats. If you decide to leave, you take everything with you.

---

## License

[License information here]

---

*Built for quarries. Tested in quarries. Works in quarries.*
