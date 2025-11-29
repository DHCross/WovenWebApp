# MANDATE 2 PLAN: COMPLETE ✅

**Created:** November 28, 2025  
**Status:** Ready for Implementation  
**Effort Estimate:** ~12.5 hours (~1.5-2 days intensive)  
**Phases:** 7 sequential + parallel testing

---

## Summary

Mandate 2 implements a **tooltip system that makes Balance Meter calculations transparent and falsifiable**. When users click on magnitude or directional bias metrics, they see:

1. **Aggregate Field Pressure** (labeled explicitly as global, not per-house)
2. **Aspects breakdown** — which aspects created that value with individual bias weights
3. **Calculation formulas** — transparent math showing how aspects combine
4. **Houses legend** — reference guide (not per-house tracking yet)
5. **User reflection prompt** — enables falsifiability testing

**Key Architectural Decision:** Seismograph's `scored_aspects` array is exposed via Math Brain API with an opt-in flag (`include_balance_tooltips: boolean`), keeping default payloads lightweight while enabling full transparency when requested.

---

## Design Decisions (Locked)

### 1. House Data Scope: Global/Aggregate
- Balance Meter is global field pressure, not per-house specific
- Seismograph doesn't track house placement → no per-house data available
- Houses Legend embedded as reference (helps user interpret)
- UI labels clearly: "Aggregate Field Pressure" not "2nd House Pressure"
- **Future Mandate:** Per-house tracking can be added once math supports it

### 2. API Payload Optimization: Opt-In Flag
- Add `include_balance_tooltips: boolean` to Math Brain request
- **False (default):** No `scored_aspects` in response (lightweight)
- **True:** Full `scored_aspects` array with all objects
- Backwards compatible; old clients unaffected

### 3. Tooltip Trigger: Click/Focus Primary
- **Primary:** Click or keyboard focus (Enter/Space)
- **Secondary:** Hover on desktop (optional enhancement)
- **Mobile:** No hover required (click/tap works)
- **Close:** ESC key or click outside
- **Hint:** Small inline text "Click for math" (no complex logic)

### 4. Accessibility: Radix Popover
- Use `@radix-ui/react-popover` for built-in a11y
- ✅ Keyboard navigation (Tab, Shift+Tab, Enter, ESC)
- ✅ Focus trap inside popover
- ✅ Focus returned to trigger on close
- ✅ Screen reader support (ARIA roles/labels)

---

## Implementation Phases (7)

| Phase | Duration | File(s) | Outcome |
|-------|----------|---------|---------|
| 1 | 2h | `src/seismograph.js` | Expose `scored` aspects array |
| 2 | 1.5h | `app/api/astrology-mathbrain/route.ts` | Add opt-in flag to API response |
| 3 | 2h | `lib/raven/tooltip-context.ts` (NEW) | Build context with legends |
| 4 | 1h | `app/api/raven/route.ts` | Integrate tooltip context |
| 5 | 2.5h | `components/BalanceMeterPopover.tsx` (NEW) | React component with a11y |
| 6 | 1.5h | UI components | Wire tooltips into existing displays |
| 7 | 2h | `__tests__/mandate-2.test.ts` (NEW) | Comprehensive test suite |
| **Total** | **~12.5h** | **6 files** | **Full system operational** |

---

## Documentation Deliverables

### Main Documents Created
1. **`docs/MANDATE_2_IMPLEMENTATION_PLAN.md`** (5.2 KB)
   - Detailed phase-by-phase breakdown
   - Design decisions explained
   - Pseudo-code for each phase
   - Testing strategy

2. **`docs/MANDATE_2_ARCHITECTURE.md`** (this file)
   - Visual data flow diagram
   - Component hierarchy
   - Timeline + dependencies
   - Quick reference tables

### Existing Supporting Docs
- `docs/ASPECTS_LEGEND.md` — Aspect definitions with bias weights
- `docs/MANDATE_2_INTEGRATION_PATTERN.md` — Initial integration guide
- `MANDATE_1_COMPLETION_REPORT.md` — Aspects Legend completeness

---

## Key Technical Details

### Data Flow
```
Geometry → Seismograph → Aspects Array (now exposed)
         ↓
         Math Brain API (include_balance_tooltips: true)
         ↓
         Scored Aspects + Magnitude/Bias
         ↓
         Raven Route (builds tooltip context)
         ↓
         buildBalanceMeterTooltipContext()
         ↓
         BalanceMeterTooltipContext object
         ↓
         Frontend: BalanceMeterPopover renders
         ↓
         User sees aspects + formulas + houses legend
         ↓
         User can verify: "Does this match my experience?"
```

### API Flag Behavior
```typescript
// Request with flag OFF (default)
POST /api/astrology-mathbrain
{ include_balance_tooltips: false }
↓
Response (lightweight)
{ balance_meter: {...}, magnitude: 4.2, directional_bias: -3 }
// No scored_aspects

// Request with flag ON
POST /api/astrology-mathbrain
{ include_balance_tooltips: true }
↓
Response (with tooltips data)
{ 
  balance_meter: {...},
  scored_aspects: [
    { aspect_name, angle, orb_deg, force, directional_bias, weight, score, planets }
  ]
}
```

### Tooltip Context Structure
```typescript
interface BalanceMeterTooltipContext {
  magnitude: number;                    // 4.2
  directional_bias: number;             // -3
  label: string;                        // "Aggregate Field Pressure"
  
  aspects: [{                           // Aspects with definitions
    name: string;
    definition: AspectDefinition;       // From aspects-legend
    planets: { transit, natal };
    score: number;
    orb: number;
  }];
  
  aspectsTable: string;                 // Markdown from aspects-legend
  housesTable: string;                  // Markdown from houses-legend
  
  calculation: {                        // Transparent formulas
    magnitude_formula: string;
    bias_formula: string;
    orb_dampening_notes: string;
  };
  
  reflection: {                         // User engagement
    question: string;
    examples: string[];
  };
}
```

---

## Success Criteria

✅ **Calculation Transparency**
- User clicks metric → tooltip shows aspects creating that value
- Formula visible showing how they combine to magnitude/bias
- User can verify: "Does this match what I know about my chart?"

✅ **Falsifiability**
- Claim is testable: "These aspects = this magnitude/bias"
- User can say "yes" or "no" based on their experience
- Full chain traceable: geometry → aspects → weights → formula → user test

✅ **Accessibility**
- Keyboard-only navigation works (Tab, Enter, ESC)
- Screen readers announce content
- Mobile users can access (click, no hover required)
- Focus management correct (trap + return)

✅ **Backwards Compatibility**
- Default API calls unchanged (flag=false)
- Existing clients unaffected
- Opt-in design keeps payloads light by default

✅ **Integration**
- Popover wired into SnapshotDisplay + BalanceMeterSummary
- Tooltip context attached to Raven response
- Test suite verifies end-to-end chain

---

## Ready to Begin

### Next Steps:
1. ✅ Review `MANDATE_2_IMPLEMENTATION_PLAN.md` for detailed specs
2. ✅ Review `MANDATE_2_ARCHITECTURE.md` for visual reference
3. ⏳ Update todo list: Mark Phase 1 as in-progress
4. ⏳ Begin Phase 1: Modify seismograph.js to preserve `scored` array
5. ⏳ Verify build after each phase
6. ⏳ Test after Phase 7 complete

### Files to Reference:
- `lib/raven/aspects-legend.ts` — Aspect definitions (use in Phase 3)
- `lib/raven/houses-legend.ts` — Houses reference (use in Phase 3)
- `app/api/raven/route.ts` — Integration point (Phase 4)
- `src/seismograph.js` — Calculation source (Phase 1)
- `app/api/astrology-mathbrain/route.ts` — API response (Phase 2)

### Installation Required:
```bash
npm install @radix-ui/react-popover
```

---

## Open Questions (None - All Locked)

All design decisions have been made and locked. No ambiguity remains for implementation.

---

**MANDATE 2 PLAN: COMPLETE AND READY**

Proceed to Phase 1 implementation when ready.
