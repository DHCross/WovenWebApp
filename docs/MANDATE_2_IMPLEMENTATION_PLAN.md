# MANDATE 2 IMPLEMENTATION PLAN
## Balance Meter Tooltip System with Falsifiability

**Version:** 1.0  
**Status:** Ready for Implementation  
**Decisions Locked:** Yes (see Design Decisions section)  
**Build Status:** Will verify after each phase

---

## Executive Summary

Mandate 2 creates an interactive tooltip system that makes Balance Meter calculations transparent. When users click/focus on magnitude or directional bias metrics, they see:
- House context + pressure coordinates
- Exact aspects that created that value
- Directional bias breakdown showing restrictive vs harmonic force
- Calculation transparency for falsifiability testing

**Key Architectural Change:** Expose seismograph's `scored_aspects` array through the Math Brain API as an opt-in flag to keep default payloads light.

---

## Design Decisions (Locked)

### 1. House Data Scope
**Decision:** Treat Balance Meter as global/aggregate, not per-house.

**Rationale:**
- Seismograph currently does not track which house each aspect lands in
- Guessing or user-selection introduces false precision
- Houses Legend serves as reference guide for user reflection

**Implementation:**
- Tooltip explicitly labels as "aggregate field pressure"
- House Legend table embedded in tooltip for reference context
- Future Mandate can add per-house tracking when math supports it

**Label in UI:** "Overall Field Pressure (Aggregate)" not "2nd House Pressure"

---

### 2. API Payload Size
**Decision:** Add `include_balance_tooltips: boolean` flag to Math Brain request (opt-in).

**Rationale:**
- Scored aspects array increases payload significantly
- Default API should remain lightweight
- Transparency is optional, not mandatory

**Implementation:**
- `include_balance_tooltips: false` (default) → no scored_aspects in response
- `include_balance_tooltips: true` → scored_aspects array included with full objects
- Backwards compatible; old clients unaffected

**Math Brain Response Schema:**
```typescript
// When include_balance_tooltips: true
{
  balance_meter: {
    magnitude: 4.2,
    directional_bias: -3,
    // ... existing fields ...
  },
  scored_aspects: [
    {
      aspect_name: "opposition",
      angle: 180,
      orb_deg: 2.5,
      force: "restrictive",
      directional_bias: -3,
      weight: 0.9,
      score: -2.7,
      transit_planet: "moon",
      natal_planet: "saturn"
    },
    // ... more aspects ...
  ]
}
```

---

### 3. Tooltip Trigger Behavior
**Decision:** Primary trigger is click/focus with hover as optional enhancement.

**Rationale:**
- Must work consistently on desktop, mobile, and keyboard
- Click/focus provides reliable interaction model
- Hover alone is inaccessible for mobile/keyboard users

**Implementation:**
- **Click/Focus:** Opens popover
- **ESC:** Closes popover
- **Tab/Shift+Tab:** Navigate within popover
- **Hover (optional sugar on desktop):** Also opens, but not required
- **Hint text:** Small inline label "Click for calculation" (no first-time-only logic in v1)

**HTML Structure:**
```tsx
<button 
  aria-label="Balance Meter calculation breakdown"
  className="balance-metric"
  onClick={() => setTooltipOpen(!tooltipOpen)}
>
  {magnitude}
  <span className="hint-text" aria-hidden="true">
    Click for math
  </span>
</button>

{tooltipOpen && (
  <BalanceMeterPopover
    onClose={() => setTooltipOpen(false)}
    aspects={scoredAspects}
    // ...
  />
)}
```

---

### 4. Accessibility Requirements
**Decision:** Implement via Radix `<Popover>` for full accessibility.

**Rationale:**
- Built-in keyboard navigation (Tab, Enter, ESC)
- Automatic ARIA labels and focus management
- Screen reader support out of the box
- Better than custom solution for production quality

**Requirements Met:**
- ✅ Keyboard navigation (Tab/Shift+Tab through fields, ESC to close)
- ✅ Focus trap inside popover while open
- ✅ Focus returned to trigger on close
- ✅ Screen readers announce title + content
- ✅ Proper ARIA roles (`role="dialog"` on popover)
- ✅ Label for trigger button (`aria-label="..."`)

**Installation:**
```bash
npm install @radix-ui/react-popover
```

---

## Implementation Phases

### Phase 1: Modify Seismograph to Preserve Aspects
**Deliverable:** `scored_aspects` array available in seismograph output  
**File:** `src/seismograph.js`

**What to change:**
1. In `aggregate()` function, preserve the `scored` array (currently calculated but discarded)
2. Return it as part of output alongside magnitude/bias/volatility
3. Each scored aspect should have: `{ name, angle, orb, force, bias, weight, score, transit_planet, natal_planet }`

**Pseudo-code:**
```javascript
function aggregate(aspectArray, /* ... */) {
  const scored = [];  // Preserve this
  
  for (const aspect of aspectArray) {
    const norm = normalizeAspect(aspect);
    const S = scoreAspect(norm, /* ... */);
    scored.push({
      ...norm,
      S,
      // Add planet names for context
      transit_planet: aspect.transit.name,
      natal_planet: aspect.natal.name
    });
  }
  
  // Aggregate magnitude, bias, volatility as before
  const magnitude = /* ... */;
  const directional_bias = /* ... */;
  const volatility = /* ... */;
  
  return {
    magnitude,
    directional_bias,
    volatility,
    scored,  // ← NOW RETURNED
    axes: { /* ... */ },
    transform_trace: { /* ... */ }
  };
}
```

**Testing:** Verify seismograph output includes `scored` array with 7+ aspects before/after aggregate returns to caller.

---

### Phase 2: Extend Math Brain API Response
**Deliverable:** Math Brain response includes `scored_aspects` when requested  
**File:** `app/api/astrology-mathbrain/route.ts`

**What to change:**
1. Add `include_balance_tooltips` parameter to request parsing
2. Extract `scored_aspects` from seismograph result
3. Include in response only if flag is `true`
4. Document new response field in API schema

**Pseudo-code:**
```typescript
export async function POST(req: NextRequest) {
  const body = await req.json();
  const include_balance_tooltips = body.include_balance_tooltips ?? false;  // Default: false
  
  // Run Math Brain calculation
  const result = await calculateAstrology(body);
  const seismographOutput = result.seismograph;
  
  const response = {
    balance_meter: {
      magnitude: seismographOutput.magnitude,
      directional_bias: seismographOutput.directional_bias,
      // ... existing fields ...
    },
  };
  
  // Conditionally include scored aspects
  if (include_balance_tooltips && seismographOutput.scored) {
    response.scored_aspects = seismographOutput.scored.map(asp => ({
      aspect_name: asp.name,
      angle: asp.angle,
      orb_deg: asp.orbDeg,
      force: asp.force,
      directional_bias: getAspectDefinition(asp.name)?.directionalBias,
      weight: asp.S / magnitude,  // Normalize score to weight
      score: asp.S,
      transit_planet: asp.transit_planet,
      natal_planet: asp.natal_planet
    }));
  }
  
  return NextResponse.json(response);
}
```

**Testing:** 
- POST with `include_balance_tooltips: false` → no `scored_aspects` in response
- POST with `include_balance_tooltips: true` → `scored_aspects` array present with full objects

---

### Phase 3: Build Tooltip Context Builder
**Deliverable:** `lib/raven/tooltip-context.ts` with full context assembly  
**File:** `lib/raven/tooltip-context.ts` (NEW)

**What to create:**
1. Function `buildBalanceMeterTooltipContext()`
2. Takes: seismograph output + scored aspects array
3. Returns: UI-ready object with all legends + calculations

**Implementation:**
```typescript
import { getAspectDefinition, generateAspectsMarkdownTable } from '@/lib/raven/aspects-legend';
import { generateHousesMarkdownTable } from '@/lib/raven/houses-legend';

export interface BalanceMeterTooltipContext {
  // Display data
  magnitude: number;
  directional_bias: number;
  label: string;  // "Aggregate Field Pressure"
  
  // Aspects breakdown
  aspects: Array<{
    name: string;
    definition: AspectDefinition;
    planets: { transit: string; natal: string };
    score: number;
    orb: number;
  }>;
  
  // Legends for reference
  aspectsTable: string;      // Markdown table from generateAspectsMarkdownTable()
  housesTable: string;       // Markdown table from generateHousesMarkdownTable()
  
  // Calculation transparency
  calculation: {
    magnitude_formula: string;  // e.g., "(0.9 + 0.8 + 0.6) / 3 = 0.77 → 4.2/10"
    bias_formula: string;       // e.g., "(−3×0.75 + −2.5×0.70 + 3×0.65) / 3 = −0.6 → −3"
    orb_dampening_notes: string; // "Tighter orbs carry more weight"
  };
  
  // User reflection prompt
  reflection: {
    question: string;  // "Where do you notice this aggregate pressure in your life?"
    examples: string[]; // ["Decision-making patterns", "Energy fluctuations", ...]
  };
}

export function buildBalanceMeterTooltipContext(
  seismographOutput: any,
  scoredAspects: any[]
): BalanceMeterTooltipContext {
  const { magnitude, directional_bias } = seismographOutput;
  
  // Map aspects with full definitions
  const aspects = scoredAspects.map(asp => ({
    name: asp.aspect_name,
    definition: getAspectDefinition(asp.aspect_name),
    planets: {
      transit: asp.transit_planet,
      natal: asp.natal_planet
    },
    score: asp.score,
    orb: asp.orb_deg
  }));
  
  // Calculate transparent formulas
  const magnitudeWeights = aspects.map(a => a.definition?.weight || 0);
  const magnitudeFormula = `(${magnitudeWeights.join(' + ')}) / ${aspects.length} = ${(magnitudeWeights.reduce((a, b) => a + b, 0) / aspects.length).toFixed(2)} → ${magnitude}/5`;
  
  const biasFormula = `[weighted directional bias averaging] → ${directional_bias}/-5 to +5`;
  
  return {
    magnitude,
    directional_bias,
    label: 'Aggregate Field Pressure',
    aspects,
    aspectsTable: generateAspectsMarkdownTable(),
    housesTable: generateHousesMarkdownTable(),
    calculation: {
      magnitude_formula: magnitudeFormula,
      bias_formula: biasFormula,
      orb_dampening_notes: 'Tighter aspects (closer to exact) carry stronger weight in this calculation. This prevents edge-of-orb aspects from dominating the signal.'
    },
    reflection: {
      question: 'Where do you notice this aggregate pressure in your life?',
      examples: [
        'Decision-making patterns and speed',
        'Energy fluctuations or sustained intensity',
        'Relationship dynamics or solo flow state',
        'Work/creative output or resistance'
      ]
    }
  };
}
```

**Testing:** Verify context object has all required fields; renders without errors.

---

### Phase 4: Integrate into Raven Route
**Deliverable:** Tooltip context passed to frontend via Raven response  
**File:** `app/api/raven/route.ts`

**What to change:**
1. After Math Brain response, check for `scored_aspects`
2. Call `buildBalanceMeterTooltipContext()` if aspects present
3. Attach to report payload or separate field
4. Pass through to frontend

**Integration point (around line 527-555):**
```typescript
// After Math Brain response
const relationalResponse = await runMathBrain({
  ...payload,
  include_balance_tooltips: true  // Request aspects data
});

let tooltipContext = null;
if (relationalResponse.data?.scored_aspects) {
  tooltipContext = buildBalanceMeterTooltipContext(
    relationalResponse.data.balance_meter,
    relationalResponse.data.scored_aspects
  );
}

// Attach to response payload
const response = {
  // ... existing fields ...
  balance_meter_tooltip: tooltipContext
};
```

**Testing:** Verify tooltip context appears in Raven response when Math Brain request includes flag.

---

### Phase 5: Build Tooltip React Component
**Deliverable:** `components/BalanceMeterPopover.tsx` (NEW)  
**File:** `components/BalanceMeterPopover.tsx`

**What to create:**
1. React component using Radix Popover
2. Accepts `tooltipContext` prop
3. Renders: title + magnitude/bias coordinates + aspect table + houses legend + reflection prompt
4. Full keyboard + a11y support built-in via Radix

**Implementation:**
```tsx
import * as Popover from '@radix-ui/react-popover';
import { BalanceMeterTooltipContext } from '@/lib/raven/tooltip-context';
import ReactMarkdown from 'react-markdown';

export interface BalanceMeterPopoverProps {
  context: BalanceMeterTooltipContext;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BalanceMeterPopover({
  context,
  open,
  onOpenChange
}: BalanceMeterPopoverProps) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Content
        className="popover-content"
        sideOffset={4}
        role="dialog"
        aria-label="Balance Meter Calculation Breakdown"
      >
        <div className="space-y-4">
          {/* Title */}
          <h3 className="text-lg font-semibold">
            {context.label}
          </h3>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-slate-900 rounded">
            <div>
              <p className="text-xs text-slate-400">Magnitude</p>
              <p className="text-2xl font-bold text-white">
                {context.magnitude}/5
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Directional Bias</p>
              <p className="text-2xl font-bold text-white">
                {context.directional_bias > 0 ? '+' : ''}{context.directional_bias}/5
              </p>
            </div>
          </div>

          {/* Aspects Breakdown */}
          <div>
            <h4 className="font-semibold text-sm mb-2">Aspects Creating This Signal</h4>
            <div className="space-y-2 text-sm">
              {context.aspects.map((asp, i) => (
                <div key={i} className="flex justify-between p-2 bg-slate-800 rounded">
                  <span>
                    {asp.definition?.shorthand} {asp.name} 
                    ({asp.planets.transit} ↔ {asp.planets.natal})
                  </span>
                  <span className={asp.definition?.force === 'restrictive' ? 'text-red-400' : 'text-green-400'}>
                    {asp.definition?.directionalBias > 0 ? '+' : ''}{asp.definition?.directionalBias}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Calculation Transparency */}
          <div className="p-3 bg-slate-900 rounded text-xs text-slate-300">
            <p className="font-mono">{context.calculation.magnitude_formula}</p>
            <p className="font-mono">{context.calculation.bias_formula}</p>
            <p className="mt-2 text-slate-400">{context.calculation.orb_dampening_notes}</p>
          </div>

          {/* Houses Legend Reference */}
          <div className="border-t pt-3">
            <h4 className="font-semibold text-sm mb-2">Houses Reference</h4>
            <ReactMarkdown className="text-xs markdown-table">
              {context.housesTable}
            </ReactMarkdown>
          </div>

          {/* User Reflection */}
          <div className="bg-indigo-900/30 p-3 rounded">
            <p className="font-semibold text-sm mb-2">{context.reflection.question}</p>
            <textarea
              placeholder="Your observation..."
              className="w-full p-2 bg-slate-800 text-white text-xs rounded placeholder-slate-500"
              rows={3}
            />
            <details className="mt-2 text-xs text-slate-400">
              <summary className="cursor-pointer">Examples to consider</summary>
              <ul className="mt-2 list-disc list-inside space-y-1">
                {context.reflection.examples.map((ex, i) => (
                  <li key={i}>{ex}</li>
                ))}
              </ul>
            </details>
          </div>

          {/* Close button */}
          <Popover.Close asChild>
            <button 
              className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
              aria-label="Close"
            >
              Close (ESC)
            </button>
          </Popover.Close>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
```

**Testing:** 
- Click trigger opens popover
- ESC closes popover
- Tab navigates through fields
- Screen reader announces content
- Mobile touch works (no hover required)

---

### Phase 6: Wire Into Existing Components
**Deliverable:** BalanceMeterPopover integrated into SnapshotDisplay + BalanceMeterSummary  
**Files:** 
- `components/SnapshotDisplay.tsx`
- `components/BalanceMeterSummary.tsx`

**What to change:**
1. Import `BalanceMeterPopover`
2. Add state for popover open/close
3. Wrap magnitude + directional bias in clickable trigger
4. Pass tooltip context prop

**Example wrapper:**
```tsx
// In SnapshotDisplay.tsx
import { BalanceMeterPopover } from '@/components/BalanceMeterPopover';
import { useState } from 'react';

export function SnapshotDisplay({ data }) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        {/* Magnitude */}
        <Popover.Root open={tooltipOpen} onOpenChange={setTooltipOpen}>
          <Popover.Trigger asChild>
            <button 
              className="metric magnitude-metric"
              aria-label="Magnitude: Click for calculation"
            >
              <div className="text-3xl font-bold">
                {data.balance_meter.magnitude}
              </div>
              <div className="text-xs text-slate-400">Magnitude</div>
              <span className="inline-block text-xs mt-1 px-2 py-1 bg-slate-700 rounded">
                Click for math
              </span>
            </button>
          </Popover.Trigger>
          
          <BalanceMeterPopover 
            context={data.balance_meter_tooltip}
            open={tooltipOpen}
            onOpenChange={setTooltipOpen}
          />
        </Popover.Root>

        {/* Directional Bias */}
        {/* Same pattern for bias coordinate */}
      </div>
    </div>
  );
}
```

**Testing:** 
- Tooltip appears when clicking metric
- Correct data displayed for that metric
- Multiple metrics can have separate tooltips

---

### Phase 7: End-to-End Testing & Falsifiability
**Deliverable:** Full test suite verifying calculation chain  
**Files:** `__tests__/mandate-2.test.ts` (NEW)

**Tests to write:**
1. **Seismograph exposes aspects:** Verify `scored` array in output
2. **Math Brain transmits aspects:** With flag, check `scored_aspects` in response
3. **Tooltip context builds correctly:** Aspects + formulas + legends present
4. **Raven route passes context:** Response includes `balance_meter_tooltip`
5. **Component renders without errors:** BalanceMeterPopover mounts + displays
6. **Calculation transparency:** User can trace magnitude/bias back to individual aspects
7. **Falsifiability chain:** Geometry → aspects → weights → seismograph → tooltip → user experience

**Example test:**
```typescript
describe('Mandate 2: Balance Meter Tooltips', () => {
  it('should expose scored aspects from seismograph', () => {
    const input = [ /* aspect array */ ];
    const output = seismographAggregate(input);
    
    expect(output.scored).toBeDefined();
    expect(output.scored.length).toBeGreaterThan(0);
    expect(output.scored[0]).toHaveProperty('name');
    expect(output.scored[0]).toHaveProperty('S');  // Score
  });

  it('should include scored_aspects in Math Brain response when flag is true', async () => {
    const response = await POST(createRequest({
      include_balance_tooltips: true
    }));
    
    expect(response.scored_aspects).toBeDefined();
    expect(response.scored_aspects.length).toBeGreaterThan(0);
  });

  it('should build tooltip context with all required fields', () => {
    const context = buildBalanceMeterTooltipContext(
      seismographOutput,
      scoredAspects
    );
    
    expect(context).toHaveProperty('magnitude');
    expect(context).toHaveProperty('directional_bias');
    expect(context).toHaveProperty('aspects');
    expect(context).toHaveProperty('calculation');
    expect(context).toHaveProperty('reflection');
    expect(context.calculation).toHaveProperty('magnitude_formula');
  });

  it('should allow user to verify calculation matches seismograph', () => {
    // User sees in tooltip:
    // - Aspects listed with individual scores
    // - Formula showing how they combine
    // - Matches final magnitude/bias shown in Balance Meter
    
    expect(tooltipContext.calculation.magnitude_formula).toContain('→');
  });
});
```

**Testing:** All tests pass; falsifiability chain verified end-to-end.

---

## Integration Checklist

### Before Implementation
- [ ] Create todo list with all 7 phases
- [ ] Review seismograph.js to understand current flow
- [ ] Confirm Math Brain response schema
- [ ] Check existing tooltip/popover patterns (if any)

### Phase 1: Seismograph
- [ ] Modify `aggregate()` to preserve `scored` array
- [ ] Add planet names to each scored aspect
- [ ] Test: verify scored array in output
- [ ] Commit: "Seismograph: Expose scored aspects array"

### Phase 2: Math Brain API
- [ ] Add `include_balance_tooltips` parameter parsing
- [ ] Extract scored aspects from seismograph
- [ ] Add to response conditionally
- [ ] Test: flag on/off behavior
- [ ] Commit: "Math Brain: Add scored_aspects to response (opt-in)"

### Phase 3: Tooltip Context Builder
- [ ] Create `lib/raven/tooltip-context.ts`
- [ ] Implement `buildBalanceMeterTooltipContext()`
- [ ] Import legends modules
- [ ] Generate calculation formulas
- [ ] Test: all fields present
- [ ] Commit: "Tooltip: Create context builder with legends integration"

### Phase 4: Raven Route Integration
- [ ] Import context builder
- [ ] Call after Math Brain response
- [ ] Attach to response payload
- [ ] Test: context in Raven response
- [ ] Commit: "Raven: Integrate tooltip context into response"

### Phase 5: React Component
- [ ] Install @radix-ui/react-popover
- [ ] Create `components/BalanceMeterPopover.tsx`
- [ ] Implement with full a11y
- [ ] Test: keyboard + screen reader
- [ ] Commit: "Components: Add BalanceMeterPopover with full accessibility"

### Phase 6: Wire Into Existing Components
- [ ] Update SnapshotDisplay.tsx
- [ ] Update BalanceMeterSummary.tsx
- [ ] Add trigger buttons with hint text
- [ ] Test: click opens/closes
- [ ] Commit: "UI: Integrate tooltips into balance meter displays"

### Phase 7: Testing & Validation
- [ ] Write comprehensive test suite
- [ ] Test falsifiability chain
- [ ] Verify calculation transparency
- [ ] Test cross-browser (desktop/mobile)
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility
- [ ] Commit: "Tests: Add comprehensive mandate 2 test suite"

### Post-Implementation
- [ ] Verify build passes
- [ ] Update documentation (API reference, component library)
- [ ] Mark Mandate 2 complete in todo list
- [ ] Prepare for Mandate 3

---

## Success Criteria

✅ **Calculation Transparency**
- User can click any Balance Meter metric
- Tooltip shows exact aspects creating that value
- Formula displayed for how aspects combine
- User can verify claim against own experience

✅ **Accessibility**
- Tab navigates through popover
- ESC closes popover
- Screen reader announces content
- Works on mobile (no hover required)

✅ **Backwards Compatibility**
- Old clients (without flag) unaffected
- API payload small by default
- Build passes, no breaking changes

✅ **Falsifiability**
- Geometry → aspects → weights → seismograph → tooltip → user test
- Full chain traceable
- User can say "yes, this matches" or "no, this doesn't match my experience"

---

## Dependencies

**New npm packages:**
- `@radix-ui/react-popover` — For accessible popover component

**Existing modules to use:**
- `lib/raven/aspects-legend.ts` — For `generateAspectsMarkdownTable()`, `getAspectDefinition()`
- `lib/raven/houses-legend.ts` — For `generateHousesMarkdownTable()`
- `src/seismograph.js` — Modify to expose aspects

---

## Files Summary

| Phase | File | Status | Purpose |
|-------|------|--------|---------|
| 1 | `src/seismograph.js` | Modify | Preserve scored aspects |
| 2 | `app/api/astrology-mathbrain/route.ts` | Modify | Add include_balance_tooltips flag |
| 3 | `lib/raven/tooltip-context.ts` | New | Build tooltip context |
| 4 | `app/api/raven/route.ts` | Modify | Integrate tooltip context |
| 5 | `components/BalanceMeterPopover.tsx` | New | Render popover |
| 6 | `components/SnapshotDisplay.tsx` | Modify | Wire in popover |
| 6 | `components/BalanceMeterSummary.tsx` | Modify | Wire in popover |
| 7 | `__tests__/mandate-2.test.ts` | New | Test suite |

---

## Notes

- **Mandate 2 can proceed in parallel with Mandate 3** (expanding getHouseContext) since they don't block each other
- **Mandate 4 (PDF exports) builds on this** by using the same tooltip context builder
- **Mandate 5 (interactive wheel) complements this** with visual house wheel to pair with tooltip reference
- **No per-house tracking in v1** — Future Mandate can add once seismograph tracks house placement

---

**Status: READY FOR IMPLEMENTATION**

Next action: Create todo list with 7 phases, begin Phase 1 (Seismograph modifications).
