# WovenWebApp Architecture Refactoring – Document Index
**Nov 6, 2025**

---

## Quick Navigation

### 📋 Start Here
- **`SESSION_SUMMARY_NOV6.md`** – What we did today, why it matters, next steps (5 min)

### 🔐 Phase 0: Security & UX Hardening ✅ COMPLETE
- **`SECURITY_UX_HARDENING_NOV6.md`** – Technical summary of 3 hardening improvements (10 min)

### 📐 Phase 1: File Splitting (NEXT – 3–4 days)
1. **`PHASE1_REFACTORING_ARCHITECTURE.md`** – Full design, module boundaries, extraction order (20 min)
2. **`PHASE1_EXECUTION_TASKS.md`** – 7 tasks with checklists, risk assessment, test recommendations (20 min)
3. **`PHASE1_QUICK_START.md`** – Quick reference for starting Task 1 right now (5 min)

### 🗺️ Full Roadmap: Phase 0 → Phase 3
- **`ROADMAP_PHASE0_TO_PHASE3.md`** – Three-phase strategic plan, timeline, success criteria (15 min)

---

## Document Purpose Reference

| Document | Audience | Purpose | When to Read |
|----------|----------|---------|--------------|
| SESSION_SUMMARY | Owner/Team lead | What happened today, decision points | Now (5 min) |
| SECURITY_UX_HARDENING | Developers/Reviewers | Phase 0 details, testing guide | Before merging Phase 0 |
| PHASE1_ARCHITECTURE | Architects/Tech leads | Design decisions, module boundaries | Before Phase 1 |
| PHASE1_EXECUTION | Developers | Task-by-task breakdown, checklists | Start each task |
| PHASE1_QUICK_START | Developers | Hands-on guide for Task 1 | When starting Phase 1 |
| ROADMAP_PHASE0_TO_PHASE3 | Full team | Strategic context, long-term plan | Team alignment |

---

## What's Been Done

### ✅ Phase 0: Security & UX Hardening (COMPLETE)
All changes merged into `components/ChatClient.tsx`

**1. HTML Sanitization Hardening**
- Disabled blanket `data-*` attributes
- Only `data-action` whitelisted
- **Impact:** Closes XSS vector

**2. File Upload Size Guards**
- 50 MB limit for PDFs
- 10 MB limit for text files
- User-friendly error messages
- **Impact:** Prevents memory bloat

**3. Network Resilience (Retry/Backoff)**
- Exponential backoff: 100ms × 2^attempt (±50% jitter)
- 3 max retries, 30-second timeout per attempt
- Applied to all `/api/raven` requests
- **Impact:** Gracefully recovers from transient failures

---

## What's Planned

### 📝 Phase 1: File Splitting (READY TO START)
**Goal:** 3,042 lines → 6 modules + 800-line root

**Extraction order (low → high risk):**
1. `lib/raven-narrative.ts` (~250 lines saved)
2. `lib/raven-formatting.ts` (~150 lines saved)
3. `lib/report-parsing.ts` (~200 lines saved)
4. `hooks/useValidation.ts` (~100 lines saved)
5. `components/ChatClient/useFileUpload.ts` (~150 lines saved)
6. `hooks/useRavenRequest.ts` (~120 lines saved)
7. ChatClient.tsx cleanup (~1,500+ lines removed)

**Timeline:** 3–4 days (7 PRs)

### 🔒 Phase 2: File Ingestion Hardening (AFTER PHASE 1)
- Extension allowlist (JSON, PDF, TXT, CSV only)
- MIME type verification
- File signature validation (magic bytes)
- PDF.js worker offload (don't block main thread)
- **Unblocks:** New report types (Relational Mirror, Composite transit, Graphs)

### 🚀 Phase 3: Dedicated Raven Transport Service (AFTER PHASES 1 & 2)
- Extract RavenClient class (`lib/services/RavenClient.ts`)
- Add telemetry hooks (onStart, onSuccess, onError, onRetry)
- Add circuit breaker pattern
- Prepare for streaming support
- **Unblocks:** Auth, advanced resilience, telemetry, streaming

---

## Current File Status

### ✅ Completed This Session
- `components/ChatClient.tsx` – Security & UX hardening applied
- `SECURITY_UX_HARDENING_NOV6.md` – Phase 0 documentation
- `PHASE1_REFACTORING_ARCHITECTURE.md` – Phase 1 design
- `PHASE1_EXECUTION_TASKS.md` – Phase 1 task breakdown
- `PHASE1_QUICK_START.md` – Phase 1 quick reference
- `ROADMAP_PHASE0_TO_PHASE3.md` – Full strategic roadmap
- `SESSION_SUMMARY_NOV6.md` – Today's summary
- This index document

### ⏳ To Be Created (Phase 1)
- `lib/raven-narrative.ts`
- `lib/raven-formatting.ts`
- `lib/report-parsing.ts`
- `hooks/useValidation.ts`
- `components/ChatClient/useFileUpload.ts`
- `hooks/useRavenRequest.ts`

---

## How to Use This Documentation

### 🎯 For Immediate Action (Next 30 min)
1. Read `SESSION_SUMMARY_NOV6.md` (5 min)
2. Skim `PHASE1_QUICK_START.md` (5 min)
3. Decide: green light to start Phase 1?

### 🏗️ For Phase 1 Planning (1–2 hours)
1. Read `PHASE1_REFACTORING_ARCHITECTURE.md` (20 min)
2. Read `PHASE1_EXECUTION_TASKS.md` (20 min)
3. Identify any blockers or concerns
4. Assign ownership of tasks 1–7

### 📊 For Strategic Alignment (1–2 hours)
1. Read `ROADMAP_PHASE0_TO_PHASE3.md` (15 min)
2. Review timeline and dependencies
3. Discuss with team: are Phases 2 & 3 in scope?

### 🧑‍💻 For Execution (Per task)
1. Use `PHASE1_QUICK_START.md` as quick reference
2. Follow checklists in `PHASE1_EXECUTION_TASKS.md`
3. Land incremental PRs on `main`

---

## Key Files Changed

### This Session
```
✅ components/ChatClient.tsx
   - Added DOMPurify hardening
   - Added file size guards
   - Added retry/backoff logic
   - Integrated metadata stripping
   → Ready for Phase 1 splitting

📝 Documentation (all NEW)
   - SECURITY_UX_HARDENING_NOV6.md
   - PHASE1_REFACTORING_ARCHITECTURE.md
   - PHASE1_EXECUTION_TASKS.md
   - PHASE1_QUICK_START.md
   - ROADMAP_PHASE0_TO_PHASE3.md
   - SESSION_SUMMARY_NOV6.md
   - (This index)
```

---

## Decision Points

### ✅ Decision: Start Phase 1?
**Recommended:** YES – Phase 1 is the force multiplier

**Reasoning:**
- Phase 0 (hardening) is done and low-risk
- Phase 1 (splitting) enables safe Phase 2 & 3 work
- Team velocity will improve significantly once Phase 1 lands
- No blockers identified

**Next:** Follow `PHASE1_QUICK_START.md` to start Task 1

### ❓ Decision: Phases 2 & 3 Timeline?
**Phases 2 & 3 are currently planned** but not started

**Phase 2 (File Ingestion):**
- Should happen after Phase 1 lands
- Needed before adding new report types
- Estimate: 1–2 days

**Phase 3 (Transport Service):**
- Should happen after Phases 1 & 2 land
- Enables auth, telemetry, streaming
- Estimate: 1–2 days

---

## Rollback & Recovery

All changes in Phase 0 are in `components/ChatClient.tsx` only.

**If needed to rollback Phase 0:**
```bash
git revert <Phase0 commit>
npm run dev  # Verify
```

Phase 1 tasks land incrementally, so rollback is per-PR (low risk).

---

## Questions & Support

**For architecture questions:**
- Refer to `PHASE1_REFACTORING_ARCHITECTURE.md`

**For task details:**
- Refer to `PHASE1_EXECUTION_TASKS.md`

**For quick reference:**
- Refer to `PHASE1_QUICK_START.md`

**For strategic context:**
- Refer to `ROADMAP_PHASE0_TO_PHASE3.md`

---

## Next Action

### 👉 Recommended: Start Phase 1 Task 1 TODAY

```bash
cd /Users/dancross/Documents/GitHub/WovenWebApp
git checkout -b phase1/split-narrative
# Follow PHASE1_QUICK_START.md checklist
# Land PR
```

**Estimated time:** 2–3 hours

**Result:** Phase 1 Task 1 complete; ChatClient -250 lines saved

---

## Timeline

```
Today (Nov 6)       Week of Nov 10        Week of Nov 17
─────────────────────────────────────────────────────
Phase 0 ✅          Phase 1 (Tasks 1–7)   Phase 2
DONE                ~3–4 days              File hardening
                    Tasks per PR           1–2 days
                    Land incrementally
                                         Phase 3
                                         Transport svc
                                         1–2 days
```

---

## Contact & Attribution

**Session:** Nov 6, 2025
**Participants:** Jules (Owner), AI Architecture Review
**Outcomes:** Phase 0 complete, Phases 1–3 architected
**Status:** Ready for Phase 1 execution
