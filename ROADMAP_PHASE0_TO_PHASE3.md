# WovenWebApp Roadmap: Hardening → Modularity → Extensibility
**Nov 6, 2025 – Strategic Architecture Plan**

---

## Overview: Three Phases

We've just completed **security & UX hardening** (Phase 0). Now we're planning the **architectural refactor** that enables Phase 2 and Phase 3 work without risk.

```
Phase 0 ✅ DONE        Phase 1 (Next)      Phase 2              Phase 3
─────────────────────────────────────────────────────────────────────────
Security & UX      File Splitting    File Ingestion     Transport Service
- Sanitization     - Extract 6 modules - Extension check    - Dedicated client
- File sizes       - 3K → 800 lines    - MIME validation    - Auth hooks
- Retry/backoff    - Pure functions    - Worker offload     - Telemetry
                   - Medium risk       - Magic bytes        - Streaming
                                       - Medium risk        - Medium risk
```

---

## Phase 0: Security & UX Hardening ✅ COMPLETED

**Status:** All changes landed in `components/ChatClient.tsx`

**What was done:**
1. ✅ DOMPurify: Disabled blanket `data-*` attributes; only `data-action` whitelisted
2. ✅ File uploads: Added 50 MB (PDF) and 10 MB (text) size guards with user feedback
3. ✅ Network resilience: Added `fetchWithRetry()` with exponential backoff + jitter (3 retries, 30s timeout)
4. ✅ Metadata stripping: Integrated `stripPersonaMetadata()` into response pipeline

**Impact:**
- Security: Tighter XSS surface
- UX: Clear error messages, no silent failures
- Resilience: Graceful recovery from transient network failures

**Deliverables:**
- `SECURITY_UX_HARDENING_NOV6.md` – Technical summary
- Updated `components/ChatClient.tsx` – Ready for Phase 1

---

## Phase 1: File Splitting (HIGH PRIORITY – NEXT)

**Goal:** Break 3,042-line monolith into 6 focused modules + 800-line root component

**Why:** Enables safe Phase 2 & 3 work; foundation for team velocity

**Duration:** 3–4 days (7 PRs, 1 per extraction)

### Extraction Order (Low → High Risk)

| # | Module | Lines Saved | Risk | Time |
|---|--------|------------|------|------|
| 1 | `lib/raven-narrative.ts` | ~250 | LOW | 2–3h |
| 2 | `lib/raven-formatting.ts` | ~150 | LOW | 2–3h |
| 3 | `lib/report-parsing.ts` | ~200 | LOW | 3–4h |
| 4 | `hooks/useValidation.ts` | ~100 | LOW | 2h |
| 5 | `useFileUpload.ts` | ~150 | MED | 4–5h |
| 6 | `useRavenRequest.ts` | ~120 | MED | 4–5h |
| 7 | ChatClient cleanup | ~1,500+ | LOW | 2–3h |

**Result:** ChatClient.tsx ~800 lines (composition only)

### Phase 1 Documentation
- 📄 `PHASE1_REFACTORING_ARCHITECTURE.md` – Full design
- 📄 `PHASE1_EXECUTION_TASKS.md` – Task breakdown with checklists

---

## Phase 2: Harden File Ingestion

**Goal:** Rock-solid file upload before adding relational/graph report types

**Depends on:** Phase 1 (report-parsing.ts extracted)

**What's needed:**
1. Extension allowlist (JSON, PDF, TXT, CSV only)
2. MIME type verification (not just extension)
3. File signature validation (magic bytes: PDF `25 50 44`, JSON `7B`, text ASCII)
4. PDF.js worker offload (don't block main thread)
5. Error recovery (graceful degradation)

**Where it goes:**
- `lib/report-parsing.ts` – Extend with validation functions
- `components/ChatClient/useFileUpload.ts` – Add worker integration

**Impact:**
- Prevents malformed files from poisoning session
- Unblocks new report types (Relational Mirror, Composite transit, Graph)
- Better error messages

**Estimate:** 1–2 days

---

## Phase 3: Dedicated Raven Transport Service

**Goal:** Extract request logic into testable service; enable auth, telemetry, streaming

**Depends on:** Phase 1 (useRavenRequest.ts exists) + Phase 2 (file ingestion solid)

**What's needed:**
1. Create `lib/services/RavenClient.ts` – Dedicated transport class
2. Move `fetchWithRetry()` and `runRavenRequest()` logic
3. Add telemetry hooks (onStart, onSuccess, onError, onRetry)
4. Add circuit breaker pattern (fail fast if service down)
5. Add request caching (optional; same payload = cached response)
6. Prepare for streaming (structure for SSE or chunked responses)

**Why it matters:**
- **Auth:** Can add API key management, token refresh without touching UI
- **Telemetry:** Collect latency, error rates, model usage
- **Resilience:** Circuit breaker prevents cascading failures
- **Streaming:** Ready to accept streaming responses from future Raven API

**Where it goes:**
- `lib/services/RavenClient.ts` – New service class
- `hooks/useRavenRequest.ts` – Updated to use RavenClient

**Interface sketch:**
```typescript
export class RavenClient {
  static getInstance(): RavenClient;
  
  async request(
    payload: Record<string, any>,
    opts?: { timeoutMs?: number; maxRetries?: number; cache?: boolean },
  ): Promise<RavenDraftResponse>;
  
  onTelemetry(listener: (event: TelemetryEvent) => void): void;
  setAuthToken(token: string): void;
  setCircuitBreakerThreshold(failureCount: number): void;
}
```

**Impact:**
- Ready for auth layer
- Ready for streaming responses
- Better observability
- Can test independently of React

**Estimate:** 1–2 days

---

## Current Status

### Completed ✅
- Phase 0: Security & UX hardening
  - DOMPurify hardening
  - File size guards
  - Retry/backoff logic
  - Metadata stripping

### Ready to Start ⏳
- Phase 1: File splitting (all 7 tasks scoped, checklists ready)
- Phase 1 will unblock Phase 2 & 3

### Future Work 🔮
- Phase 2: File ingestion hardening (depends on Phase 1)
- Phase 3: Transport service (depends on Phase 1 & 2)

---

## Risk & Mitigation

| Phase | Risk | Mitigation |
|-------|------|-----------|
| 1 | Circular imports | Use dependency graph; land pure libs first |
| 1 | Missed refactoring | grep scan for all usages; create PR checklist |
| 1 | Test gaps | Unit tests for each extracted module |
| 2 | Worker failures | Error boundary + fallback to main thread |
| 2 | Validation too strict | Start with allowlist (safest), relax if needed |
| 3 | Breaking change | Shadow-run new RavenClient alongside old, compare results |

---

## Success Criteria

### Phase 1 ✅ Complete when:
- [ ] ChatClient.tsx reduced to ~800 lines
- [ ] 6 new modules created and tested
- [ ] All existing features preserved (no regressions)
- [ ] Team can merge Phase 1 → Phase 2 work independently
- [ ] Code review velocity: 2–3 days per PR

### Phase 2 ✅ Complete when:
- [ ] File validation rocks (no bad files in session)
- [ ] Worker offload prevents main thread blocking
- [ ] Error messages clear (what's wrong, what to do)
- [ ] Ready to add Relational Mirror, Composite transit, Graph types

### Phase 3 ✅ Complete when:
- [ ] RavenClient is testable independently
- [ ] Telemetry hooks in place
- [ ] Circuit breaker prevents cascading failures
- [ ] Ready for streaming API support

---

## Immediate Next Steps

1. **Start Phase 1 Task 1:** Extract `lib/raven-narrative.ts`
   - Use `PHASE1_EXECUTION_TASKS.md` checklist
   - Create PR when done
   - Land on `main` before moving to Task 2

2. **Parallel:** Prepare `lib/report-parsing.ts` unit tests
   - Get test fixtures ready (sample reports: AstroSeek, Mirror, relocation)
   - Draft test cases for parsing, metadata detection

3. **Monitor:** Watch for issues during Phase 1
   - Any circular imports → flag immediately
   - Any unexpected dependencies → document for future work

---

## Deliverables Created

- ✅ `SECURITY_UX_HARDENING_NOV6.md` – Phase 0 summary
- ✅ `PHASE1_REFACTORING_ARCHITECTURE.md` – Phase 1 design
- ✅ `PHASE1_EXECUTION_TASKS.md` – Phase 1 task breakdown
- ✅ This roadmap document

---

## Questions & Next Actions

**For Jules/team:**
1. Agree on Phase 1 priority and timeline?
2. Any concerns about extraction order or module boundaries?
3. Should Phase 2 include PDF.js worker offload or keep it simple?
4. For Phase 3: Do we have auth requirements in scope?

**For this session:**
- [ ] Review architecture docs
- [ ] Get feedback on Phase 1 split plan
- [ ] Start Task 1 if approval given
- [ ] Or shift to different priority if needed

---

## References

- Code: `components/ChatClient.tsx` (3,042 lines)
- Architecture: `PHASE1_REFACTORING_ARCHITECTURE.md`
- Tasks: `PHASE1_EXECUTION_TASKS.md`
- Current hardening: `SECURITY_UX_HARDENING_NOV6.md`

