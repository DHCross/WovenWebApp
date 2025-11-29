# Mandate 2 Architecture Diagram & Quick Reference

**Status:** Plan Complete | Ready for Implementation  
**Design Decisions:** Locked (see main plan)  
**Estimated Effort:** 7 Phases, ~2-3 weeks  

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND: User Interaction                                      │
├─────────────────────────────────────────────────────────────────┤
│ SnapshotDisplay.tsx or BalanceMeterSummary.tsx                 │
│   │                                                             │
│   ├─ Display Magnitude: 4.2      [CLICKABLE - Trigger Button] │
│   ├─ Display Bias: −3            [CLICKABLE - Trigger Button] │
│   │   ↓ (click)                                                │
│   └─→ BalanceMeterPopover opens                                │
│       ├─ Title: "Aggregate Field Pressure"                     │
│       ├─ Coordinates: 4.2 | −3                                 │
│       ├─ Aspects Table                                         │
│       │  ├─ Opposition (Moon ↔ Saturn)  | Bias: −3 | Score: −2.7
│       │  ├─ Square (Mars ↔ Neptune)    | Bias: −2.5| Score: −2.1
│       │  └─ Trine (Venus ↔ Jupiter)    | Bias: +3 | Score: +1.8
│       ├─ Formula Display                                       │
│       │  ├─ Magnitude: (0.9 + 0.8 + 0.6) / 3 = 0.77 → 4.2/5  │
│       │  └─ Bias: [weighted average] = −3                      │
│       ├─ Houses Legend (reference)                             │
│       └─ Reflection Prompt: "Where do you notice this?"        │
│           └─ Text field for user observation                  │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
              ↑ (render via React state)
              │
┌─────────────────────────────────────────────────────────────────┐
│ RAVEN ROUTE: Prepare Tooltip Context                            │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/raven                                                 │
│   ↓                                                             │
│ Call: buildBalanceMeterTooltipContext(                          │
│   seismographOutput,                                            │
│   scoredAspects                                                 │
│ )                                                               │
│   ↓                                                             │
│ Returns:                                                        │
│   {                                                             │
│     magnitude: 4.2,                                             │
│     directional_bias: −3,                                       │
│     aspects: [{name, definition, planets, score, orb}, ...],   │
│     aspectsTable: "[markdown table from legends]",             │
│     housesTable: "[markdown table from legends]",              │
│     calculation: {magnitude_formula, bias_formula, ...},       │
│     reflection: {question, examples}                           │
│   }                                                             │
│   ↓                                                             │
│ Attach to response: balance_meter_tooltip: {...}               │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
              ↑ (called with Math Brain response)
              │
┌─────────────────────────────────────────────────────────────────┐
│ MATH BRAIN API: Expose Aspects (Opt-In)                        │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/astrology-mathbrain                                   │
│ Request body:                                                   │
│   {                                                             │
│     ...payload,                                                 │
│     include_balance_tooltips: true  ← FLAG                     │
│   }                                                             │
│   ↓                                                             │
│ Response (when flag=true):                                      │
│   {                                                             │
│     balance_meter: {magnitude: 4.2, directional_bias: −3},     │
│     scored_aspects: [                                           │
│       {                                                         │
│         aspect_name: "opposition",                              │
│         angle: 180,                                             │
│         orb_deg: 2.5,                                           │
│         force: "restrictive",                                   │
│         directional_bias: −3,                                   │
│         weight: 0.9,                                            │
│         score: −2.7,                                            │
│         transit_planet: "moon",                                 │
│         natal_planet: "saturn"                                  │
│       },                                                        │
│       ... more aspects ...                                      │
│     ]                                                           │
│   }                                                             │
│   ↓ (flag=false → no scored_aspects, backwards compatible)    │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
              ↑ (calls seismograph)
              │
┌─────────────────────────────────────────────────────────────────┐
│ SEISMOGRAPH: Calculate & Expose Aspects                         │
├─────────────────────────────────────────────────────────────────┤
│ function aggregate(aspectArray, ...)                            │
│   for each aspect:                                              │
│     1. Normalize via normalizeAspect()                          │
│     2. Score via scoreAspect() → S value                        │
│     3. PRESERVE in scored[] array                               │
│        (currently discarded)                                    │
│   ↓                                                             │
│   Calculate magnitude = average of weights                      │
│   Calculate directional_bias = weighted average of biases      │
│   Calculate volatility = ...                                    │
│   ↓                                                             │
│   RETURN {                                                      │
│     magnitude: 4.2,                                             │
│     directional_bias: −3,                                       │
│     volatility: 2.1,                                            │
│     scored: [  ← NOW RETURNED (was discarded before)          │
│       {name, angle, orb, force, bias, weight, S, planets}      │
│     ],                                                          │
│     axes: {...},                                               │
│     transform_trace: {...}                                     │
│   }                                                             │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
            ↑ (input: raw aspects from chart)
            │
        GEOMETRY
     (birth chart +
      current field)
```

---

## Component Hierarchy

```
<SnapshotDisplay>
  │
  ├─ <Magnitude Trigger>
  │  ├─ onClick: setTooltipOpen(true)
  │  └─ label: "Click for math"
  │
  ├─ <DirectionalBias Trigger>
  │  ├─ onClick: setTooltipOpen(true)
  │  └─ label: "Click for math"
  │
  └─ {tooltipOpen && (
       <Popover.Root>
         <Popover.Content>
           <BalanceMeterPopover
             context={balance_meter_tooltip}
             open={tooltipOpen}
             onOpenChange={setTooltipOpen}
           />
         </Popover.Content>
       </Popover.Root>
     )}

<BalanceMeterPopover>
  │
  ├─ <Header>
  │  └─ "Aggregate Field Pressure"
  │
  ├─ <MetricsGrid>
  │  ├─ Magnitude: 4.2/5
  │  └─ Directional Bias: −3
  │
  ├─ <AspectsTable>
  │  └─ Renders: aspects with definitions from lib/raven/aspects-legend
  │
  ├─ <CalculationFormulas>
  │  ├─ Magnitude formula (transparent math)
  │  ├─ Bias formula (transparent math)
  │  └─ Orb dampening explanation
  │
  ├─ <HousesReference>
  │  └─ Renders: houses legend from lib/raven/houses-legend (for context)
  │
  ├─ <ReflectionPrompt>
  │  ├─ Question: "Where do you notice this?"
  │  ├─ Examples dropdown
  │  └─ Textarea for user observation
  │
  └─ <CloseButton>
     └─ "Close (ESC)"
```

---

## Phase Execution Timeline

```
┌────────────────────────────────────────────────────────────┐
│ Phase 1: Modify Seismograph                               │
│ File: src/seismograph.js                                  │
│ Time: ~2 hours                                            │
│ Dependency: None                                          │
│ Blocker: No                                               │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ Phase 2: Math Brain API                                   │
│ File: app/api/astrology-mathbrain/route.ts               │
│ Time: ~1.5 hours                                          │
│ Dependency: Phase 1 ✓                                     │
│ Blocker: No (backwards compatible)                        │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ Phase 3: Tooltip Context Builder                          │
│ File: lib/raven/tooltip-context.ts (NEW)                 │
│ Time: ~2 hours                                            │
│ Dependency: Phase 2 ✓                                     │
│ Blocker: No (pure utility function)                       │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ Phase 4: Raven Route Integration                          │
│ File: app/api/raven/route.ts                             │
│ Time: ~1 hour                                             │
│ Dependency: Phase 3 ✓                                     │
│ Blocker: No (optional context field)                      │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ Phase 5: Popover Component                                │
│ File: components/BalanceMeterPopover.tsx (NEW)           │
│ Time: ~2.5 hours                                          │
│ Dependency: Phase 4 ✓ (needs tooltip context)            │
│ Blocker: No (independent component)                       │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ Phase 6: Wire Into Existing Components                    │
│ Files: SnapshotDisplay.tsx, BalanceMeterSummary.tsx      │
│ Time: ~1.5 hours                                          │
│ Dependency: Phase 5 ✓                                     │
│ Blocker: No (additive changes)                            │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ Phase 7: Testing & Validation                             │
│ File: __tests__/mandate-2.test.ts (NEW)                  │
│ Time: ~2 hours                                            │
│ Dependency: All phases ✓                                  │
│ Blocker: Yes (must verify all phases work together)       │
└────────────────────────────────────────────────────────────┘

Total: ~12.5 hours (~1.5-2 days intensive)
```

---

## Key Imports to Add

### Phase 3 (Tooltip Context)
```typescript
import { getAspectDefinition, generateAspectsMarkdownTable } from '@/lib/raven/aspects-legend';
import { generateHousesMarkdownTable } from '@/lib/raven/houses-legend';
```

### Phase 4 (Raven Route)
```typescript
import { buildBalanceMeterTooltipContext } from '@/lib/raven/tooltip-context';
```

### Phase 5 (Popover Component)
```typescript
import * as Popover from '@radix-ui/react-popover';
import { BalanceMeterTooltipContext } from '@/lib/raven/tooltip-context';
import ReactMarkdown from 'react-markdown';
```

### Phase 6 (Existing Components)
```typescript
import { BalanceMeterPopover } from '@/components/BalanceMeterPopover';
import { useState } from 'react';
```

---

## Testing Checklist

### Functional Tests
- [ ] Seismograph returns `scored` array
- [ ] Math Brain includes `scored_aspects` when flag=true
- [ ] Math Brain omits `scored_aspects` when flag=false (default)
- [ ] Tooltip context builds without errors
- [ ] All context fields present (aspects, formulas, legends, reflection)
- [ ] Raven response includes `balance_meter_tooltip`
- [ ] Popover opens on click
- [ ] Popover closes on ESC
- [ ] Popover displays correct data

### Accessibility Tests
- [ ] Tab key navigates through popover
- [ ] Shift+Tab navigates backward
- [ ] Enter/Space opens trigger
- [ ] ESC closes popover
- [ ] Screen reader announces title
- [ ] Focus trap works (Tab within popover doesn't escape)
- [ ] Focus returns to trigger after close

### Mobile/Responsive Tests
- [ ] Click/tap opens popover (no hover required)
- [ ] Popover displays readable on small screens
- [ ] All text/buttons are tappable (44px minimum)
- [ ] Textarea is usable on mobile keyboard

### Integration Tests
- [ ] Full chain: geometry → seismograph → aspects → tooltip → user sees it
- [ ] User can verify claim matches experience
- [ ] Falsifiability preserved end-to-end

---

## Quick Decision Reference

| Decision | Value | Why |
|----------|-------|-----|
| **House Scope** | Global/aggregate | Seismograph doesn't track per-house; avoid false precision |
| **API Flag** | `include_balance_tooltips: boolean` | Opt-in keeps default payloads light |
| **Tooltip Trigger** | Click/focus (primary) + hover (optional) | Works on desktop, mobile, keyboard |
| **A11y Library** | Radix `<Popover>` | Built-in keyboard + screen reader support |
| **Calculation Display** | Formula strings (transparent) | Users can verify math |
| **User Reflection** | Text area in popover | Enables falsifiability testing |

---

## Files to Create/Modify

### New Files
```
lib/raven/tooltip-context.ts
components/BalanceMeterPopover.tsx
__tests__/mandate-2.test.ts
```

### Modified Files
```
src/seismograph.js
app/api/astrology-mathbrain/route.ts
app/api/raven/route.ts
components/SnapshotDisplay.tsx
components/BalanceMeterSummary.tsx
```

### No Changes Needed
```
lib/raven/aspects-legend.ts (already done)
lib/raven/houses-legend.ts (already done)
package.json (add @radix-ui/react-popover only)
```

---

## Success Indicators

✅ **When Mandate 2 is Complete:**
1. Click Balance Meter metric → tooltip appears
2. Tooltip shows aspects with individual bias weights
3. Formula displayed showing how aspects combine
4. User can read calculation and verify it's correct
5. Houses legend available as reference (not per-house)
6. ESC closes tooltip
7. Full keyboard navigation works
8. Screen reader reads content
9. Works on mobile (no hover required)
10. Falsifiability chain verified end-to-end

---

**Ready to Begin: Phase 1 (Seismograph Modifications)**

Next: Mark Phase 1 as in-progress in todo list + begin implementation
