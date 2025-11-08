# Sync Complete - Next Actions

**Date:** 2025-01-21  
**Status:** ✅ Ground truth synchronized  
**Action:** Choose next track

---

## What Just Happened

You synced the ground truth inventory with the repo's actual state and the wiring you shipped. I've now:

1. ✅ **Updated GROUND_TRUTH_INVENTORY_2025_01_21.md**
   - Correct response shapes (synastry_aspects[], composite_midpoints[], symbolic_climate objects)
   - Relational context echo in appendix
   - Environment toggle: `RAVEN_RENDER_INTEGRATION`
   - Known gaps documented
   - Terminology rule enforced

2. ✅ **Created Architecture.md** (authoritative reference)
   - Complete system diagram (8-level flow)
   - All verified file anchors with line numbers
   - Exact response shape (TypeScript)
   - Terminology rules
   - **Warning section for external AIs** about fictitious files

3. ✅ **Cleaned up false claims**
   - Removed Clear Mirror fiction from narrative
   - Flagged non-existent files
   - Single source of truth established

---

## You Now Have

### Documentation
- **GROUND_TRUTH_INVENTORY_2025_01_21.md** — Detailed inventory with all findings
- **Architecture.md** — Authoritative system diagram and API contract
- **NEXT_STEPS.md** — Clarification questions (from earlier)

### Ready-to-implement
- **4 Priority Safe Steps** (all additive, non-breaking):
  1. Dual provenance (`appendix.provenance_a/_b`)
  2. Real synastry/composite in relationalAdapter.ts
  3. Extend formatter for Dialogue Voice / Dual Polarity
  4. Stricter Zod for relational_context validation

---

## Choose Your Next Track

### Option A: Implement Safe Next Steps (Recommended)

**Work with real, verified files:**
- `app/api/poetic-brain/route.ts` — Add relational_context Zod
- `lib/pipeline/relationalAdapter.ts` — Real synastry/composite math
- `src/formatter/create_markdown_reading_enhanced.js` — Rich Dialogue Voice/Dual Polarity
- Response shape already documented

**Effort:** Medium  
**Risk:** Low (all additive)  
**Timeline:** 1-2 weeks for all 4 priorities  
**Outcome:** Real relational rendering pipeline ready

### Option B: Phase 1 Refactoring (Conditional)

**Need clarification:**
- Where are target functions? (buildNarrativeDraft, formatShareableDraft, etc.)
- Are they in index.html? To be created? Specs outdated?
- Extraction strategy? (move/copy/wrap?)
- Testing approach?

**Note:** Phase 1 targets ChatClient.tsx (doesn't exist), so refactoring target unclear.

**Effort:** Medium-High  
**Risk:** Medium (behavioral changes)  
**Timeline:** 2-3 weeks depending on scope clarification  
**Outcome:** ChatClient or equivalent reduced from ~3000 to ~800 lines

### Option C: Both (Ambitious)

**Parallelize:**
- Safe Steps (Quick wins, unblocked)
- Phase 1 (After you clarify specs)

**Timeline:** 3-4 weeks  
**Outcome:** Richer relational rendering + cleaner component architecture

---

## Recommended Action

1. **Pick A, B, or C above** — Let me know which track
2. **If A:** Ready to start immediately on Priority 1 (dual provenance)
3. **If B:** Provide answers to Phase 1 clarification questions in NEXT_STEPS.md
4. **If C:** Start A while you prep B answers

---

## Files You Can Trust

These are verified to exist on disk:
- ✅ `app/api/poetic-brain/route.ts`
- ✅ `lib/pipeline/mirrorRenderer.ts`
- ✅ `lib/raven/render.ts`
- ✅ `lib/pipeline/relationalAdapter.ts`
- ✅ `src/formatter/create_markdown_reading_enhanced.js`
- ✅ `netlify/functions/poetic-brain.js` (legacy)
- ✅ `index.html` (12K+ lines)
- ✅ `app/page.tsx`

These do NOT exist (don't try to edit them):
- ❌ All "clear-mirror-*" files
- ❌ `/app/api/raven/route.ts`
- ❌ `/components/ChatClient.tsx`

---

**What's your preference: A, B, or C?**
