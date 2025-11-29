# MANDATE 2 PLANNING: COMPLETE ✅

**Date:** November 28, 2025  
**Status:** All planning documents created | Ready for implementation  
**Total Documentation:** 68.2 KB across 5 comprehensive files

---

## Executive Summary

**Mandate 2** transforms the Balance Meter from a black box into a transparent, falsifiable system. When users click on magnitude or directional bias metrics, they see:

1. **Exact aspects** that created that value (Opposition, Square, Trine, etc.)
2. **Individual bias weights** for each aspect (−3, −2.5, +3, etc.)
3. **Transparent calculation formulas** showing how aspects combine
4. **Houses legend** as reference context
5. **User reflection prompt** enabling falsifiability testing

**Key Design:** Seismograph's `scored_aspects` array is exposed via Math Brain API through an opt-in flag (`include_balance_tooltips: boolean`), keeping default payloads lightweight while enabling full transparency when requested.

**Scope:** Global/aggregate field pressure (not per-house yet; future mandate)

**Effort:** ~12.5 hours across 7 sequential phases

---

## 📚 Documentation Deliverables

### 1. **MANDATE_2_INDEX.md** (7.3 KB) — Quick Navigation
**Purpose:** Entry point for all documentation  
**Contains:**
- Quick overview of what's being built
- File navigation guide
- Locked design decisions table
- Getting started checklist
- FAQ section

**Read time:** 5-10 minutes  
**Audience:** New developers, quick reference

---

### 2. **MANDATE_2_PLAN_SUMMARY.md** (7.5 KB) — Executive Summary
**Purpose:** Complete overview with all decisions locked  
**Contains:**
- High-level summary
- 4 locked design decisions with full rationale
- 7 implementation phases (timeline table)
- Success criteria
- Ready-to-begin checklist

**Read time:** 3-5 minutes  
**Audience:** Decision makers, project managers

---

### 3. **MANDATE_2_IMPLEMENTATION_PLAN.md** (25 KB) — Technical Specification
**Purpose:** Detailed phase-by-phase implementation guide  
**Contains:**
- Design decisions locked (full explanations)
- All 7 phases with:
  - Specific files to modify/create
  - Pseudo-code for each change
  - What to test after each phase
  - Integration points
- Complete checklist
- Comprehensive test strategy
- Dependencies and file summary

**Read time:** 30-40 minutes (reference document)  
**Audience:** Engineers implementing the feature

---

### 4. **MANDATE_2_ARCHITECTURE.md** (20 KB) — Visual Reference
**Purpose:** System architecture with diagrams and tables  
**Contains:**
- Complete data flow diagram (backend → frontend)
- Component hierarchy tree
- Phase execution timeline with dependencies
- Key imports needed for each phase
- Comprehensive testing checklist
- Quick decision reference table
- Success indicators

**Read time:** 20-30 minutes (visual reference)  
**Audience:** Architects, engineers, technical leads

---

### 5. **MANDATE_2_INTEGRATION_PATTERN.md** (8.4 KB) — Context from Research
**Purpose:** Research findings and integration patterns  
**Contains:**
- Math Brain response structure
- Seismograph calculations explained
- Current UI components identified
- Existing tooltip patterns (if any)
- Data flow analysis
- Integration points identified
- Technical constraints

**Read time:** 15-20 minutes (reference)  
**Audience:** Engineers who want deep background

---

## 🎯 Locked Design Decisions

### 1. House Data Scope: GLOBAL/AGGREGATE
- **Decision:** Balance Meter treated as global field pressure, not per-house specific
- **Rationale:** Seismograph doesn't track house placement for individual aspects
- **Implementation:** UI labels clearly state "Aggregate Field Pressure"
- **Houses Legend:** Embedded as reference guide (helps user interpret)
- **Future:** Per-house tracking can be added when seismograph supports it

### 2. API Payload Size: OPT-IN FLAG
- **Decision:** Add `include_balance_tooltips: boolean` to Math Brain requests
- **Default:** False (no scored_aspects in response, lightweight)
- **When True:** Full scored_aspects array with all objects
- **Rationale:** Keeps default API lightweight; transparency optional
- **Backwards Compatible:** Old clients unaffected (flag not required)

### 3. Tooltip Trigger: CLICK/FOCUS PRIMARY
- **Decision:** Primary trigger is click or keyboard focus (Enter/Space)
- **Secondary:** Hover optional enhancement on desktop
- **Mobile:** No hover required (click/tap works)
- **Close:** ESC key or click outside
- **UX:** Small inline hint "Click for math" (no complex logic)
- **Rationale:** Works consistently across desktop, mobile, keyboard

### 4. Accessibility: RADIX POPOVER
- **Decision:** Use @radix-ui/react-popover for built-in a11y
- **Keyboard:** Tab/Shift+Tab navigate, ESC closes, Enter opens
- **Focus:** Trap inside while open, return to trigger on close
- **Screen Reader:** Automatic ARIA labels and role announcements
- **Rationale:** Production-ready, no custom accessibility needed

---

## 🔨 Implementation Phases Overview

| Phase | Duration | Focus | Key Output |
|-------|----------|-------|-----------|
| **1** | 2h | Expose scored aspects | Seismograph returns `scored` array |
| **2** | 1.5h | API opt-in | Math Brain adds `scored_aspects` when flag=true |
| **3** | 2h | Context builder | `lib/raven/tooltip-context.ts` with legends integration |
| **4** | 1h | Route integration | Raven attaches `balance_meter_tooltip` to response |
| **5** | 2.5h | React component | `BalanceMeterPopover.tsx` with full a11y |
| **6** | 1.5h | Wire into UI | Tooltips integrated into SnapshotDisplay + BalanceMeterSummary |
| **7** | 2h | Testing | Comprehensive test suite + falsifiability verification |

**Total Effort:** ~12.5 hours  
**Sequential:** Phase N depends on Phase N-1 (cannot parallelize)

---

## 📊 What Gets Built

### New Files (3)
```
lib/raven/tooltip-context.ts                    → Context builder
components/BalanceMeterPopover.tsx              → React popover component
__tests__/mandate-2.test.ts                     → Test suite
```

### Modified Files (5)
```
src/seismograph.js                              → Preserve scored aspects
app/api/astrology-mathbrain/route.ts            → Add include_balance_tooltips flag
app/api/raven/route.ts                          → Build + attach tooltip context
components/SnapshotDisplay.tsx                  → Wire in popover
components/BalanceMeterSummary.tsx              → Wire in popover
```

### No Changes (Reused)
```
lib/raven/aspects-legend.ts                     → Already complete from Mandate 1
lib/raven/houses-legend.ts                      → Already complete from Mandate 1
```

---

## ✅ Success Criteria (All Measurable)

**Calculation Transparency:**
- ✅ Click metric → tooltip shows aspects creating that value
- ✅ Formula visible showing calculation math
- ✅ User can verify: "Do these aspects match my chart?"

**Falsifiability:**
- ✅ Claim is testable: "These aspects = this magnitude/bias"
- ✅ User can observe and say "yes" or "no"
- ✅ Full chain traceable: geometry → aspects → weights → formula

**Accessibility:**
- ✅ Keyboard-only navigation works (Tab, Enter, ESC)
- ✅ Screen readers announce content
- ✅ Mobile users can access (no hover required)
- ✅ Focus management correct (trap + return)

**Backwards Compatibility:**
- ✅ Default API unchanged (flag=false)
- ✅ Existing clients unaffected
- ✅ Opt-in design keeps payloads light

---

## 🚀 How to Proceed

### Before Implementation
1. Read **MANDATE_2_PLAN_SUMMARY.md** (overview)
2. Skim **MANDATE_2_ARCHITECTURE.md** (visual reference)
3. Have **MANDATE_2_IMPLEMENTATION_PLAN.md** open (technical guide)
4. Run: `npm install @radix-ui/react-popover`

### Implementation Workflow
1. **Phase 1:** Modify seismograph.js, build + verify
2. **Phase 2:** Modify Math Brain route, build + verify
3. **Phase 3:** Create tooltip context builder, build + verify
4. **Phase 4:** Integrate into Raven route, build + verify
5. **Phase 5:** Create Popover component, build + verify
6. **Phase 6:** Wire into existing components, build + verify
7. **Phase 7:** Write tests, run full test suite

### After Each Phase
- Run `npm run build` to verify no errors
- Run relevant tests (if any)
- Commit with clear message ("M2 Phase X: ...")

### Final Validation
- Run `npm run test:mandate-2` (Phase 7 test suite)
- Manual smoke test: click tooltip, ESC closes, Tab navigates
- Verify falsifiability chain end-to-end

---

## 📁 Documentation File Guide

| File | Size | Purpose | Read Time |
|------|------|---------|-----------|
| MANDATE_2_INDEX.md | 7.3K | Navigation guide | 5-10 min |
| MANDATE_2_PLAN_SUMMARY.md | 7.5K | Executive summary | 3-5 min |
| MANDATE_2_IMPLEMENTATION_PLAN.md | 25K | Technical spec (reference) | 30-40 min |
| MANDATE_2_ARCHITECTURE.md | 20K | Diagrams + architecture | 20-30 min |
| MANDATE_2_INTEGRATION_PATTERN.md | 8.4K | Research context | 15-20 min |
| **Total** | **68.2K** | **Complete specification** | **~100 min** |

---

## 🎓 Learning Path (New Developers)

If new to this codebase:

1. **MANDATE_1_COMPLETION_REPORT.md** (understand Aspects Legend system)
2. **RELATIONAL_METADATA_QUICK_REF.md** (understand data flow patterns)
3. **MANDATE_2_PLAN_SUMMARY.md** (understand this mandate)
4. **MANDATE_2_ARCHITECTURE.md** (visual system reference)
5. **MANDATE_2_IMPLEMENTATION_PLAN.md** (dive into technical details)

---

## ❓ Frequently Asked Questions

**Q: Why is house scope global, not per-house?**  
A: Seismograph doesn't currently track which house each aspect lands in. Adding per-house tracking is a separate math enhancement. V1 treats Balance Meter as global field pressure.

**Q: Why make the API flag opt-in?**  
A: Default API stays lightweight. Tooltip data only transmitted when requested. Backwards compatible with existing clients.

**Q: Can I do multiple phases in parallel?**  
A: No. Each phase depends on previous phase output. Must be sequential.

**Q: What if I get stuck on a phase?**  
A: Check MANDATE_2_IMPLEMENTATION_PLAN.md pseudo-code. Check MANDATE_2_ARCHITECTURE.md for data flow context. All edge cases documented.

**Q: How do I know when a phase is complete?**  
A: Build should pass without errors. Relevant tests should pass (if any). Check checklist in MANDATE_2_IMPLEMENTATION_PLAN.md.

---

## 🔗 Related Documentation (Already Exists)

These are ready to use during Mandate 2 implementation:

- **lib/raven/aspects-legend.ts** — 7 aspects with bias weights + 11 export functions
- **lib/raven/houses-legend.ts** — 12 houses with context + 6 export functions
- **MANDATE_1_COMPLETION_REPORT.md** — Verify Aspects Legend system is complete
- **ASPECTS_LEGEND_QUICK_REF.md** — Quick reference for aspect functions
- **RELATIONAL_METADATA_QUICK_REF.md** — Data flow patterns and metadata structure

---

## 💡 Key Insights

### Why Mandate 2 Matters
- **Transparency:** Users can see exactly why the system gave a particular reading
- **Falsifiability:** Claims are testable against user experience
- **Auditability:** Full calculation chain traceable
- **User Agency:** People can judge if the math matches their reality

### The Falsifiability Test
```
System claims: "Opposition (−3 bias) + Square (−2.5 bias) = −3 overall"

User observes: "I do feel strong tension in my relationships"

Result: VERIFIED ✅ (system is trustworthy)

OR

User observes: "I don't feel that tension at all"

Result: FALSIFIED ❌ (system needs adjustment or user needs reframing)

Either way → KNOWLEDGE gained
```

This is Mandate 2's core value.

---

## 📋 Pre-Implementation Checklist

Before starting Phase 1, verify:

- [ ] All 5 Mandate 2 documentation files exist
- [ ] Read MANDATE_2_PLAN_SUMMARY.md
- [ ] Understand 4 locked design decisions
- [ ] Have MANDATE_2_IMPLEMENTATION_PLAN.md open for reference
- [ ] Have MANDATE_2_ARCHITECTURE.md open for data flow diagrams
- [ ] `npm install @radix-ui/react-popover` executed
- [ ] Run `npm run build` to verify baseline
- [ ] Todo list updated (Phase 1 marked in-progress)

---

## 🎯 Success Definition

### After 7 Phases Complete:

✅ User clicks Magnitude metric → Popover opens  
✅ Popover shows 3-5 aspects that created that value  
✅ Each aspect displays its individual directional bias weight  
✅ Formula shows how they combine (transparent math)  
✅ Houses legend visible as reference (not per-house specific)  
✅ User reflection prompt invites observation  
✅ ESC closes popover (or click outside)  
✅ Tab navigates through all fields  
✅ Screen reader announces all content  
✅ Mobile users can access (no hover required)  
✅ Build passes, all tests pass  
✅ Falsifiability chain verified end-to-end  

**Result:** Balance Meter is now transparent, auditable, and falsifiable.

---

## 🚀 Next Action

**→ Begin Phase 1 implementation** (Modify src/seismograph.js)

All planning complete. All decisions locked. No ambiguity remains.

Documentation is comprehensive and ready for implementation.

---

**MANDATE 2 PLANNING: COMPLETE ✅**

68.2 KB of documentation  
7 phases fully specified  
4 design decisions locked  
Ready to build
