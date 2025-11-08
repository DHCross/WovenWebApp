# Blueprint vs. Weather: Semantic Firewall

**Date:** 2025-11-08  
**Status:** Critical Falsifiability Boundary  
**Enforced:** Across all formatters, linters, and audits

---

## The Boundary (Non-Negotiable)

### Blueprint / Baseline / Natal Geometry
**Inner structure—the permanent skeleton, the vessel**

**Always:**
- Present in every chart
- Stable across time (until death)
- Describes enduring patterns of tension/ease
- The foundation through which weather moves

**Linguistic Markers:**
- "Blueprint," "baseline," "natal geometry"
- "Enduring field," "inner architecture"
- "Native pattern," "structural tension"
- "Skeleton," "vessel," "framework"

**Example (Correct):**
> "Your Venus-Saturn conjunction tends to compress relational ease. This baseline geometry means you often approach connection with caution."

**Example (Incorrect):**
> "Your Venus-Saturn conjunction brings stormy weather to relationships." ❌ (Weather language on permanent structure)

---

### Symbolic Weather
**External activation—the sky in motion, the tide**

**Always:**
- Transiting, progressed, or directed geometry only
- Temporal and ephemeral (changes with calendar)
- Describes activation pressing against blueprint
- The wind through the structure

**Linguistic Markers:**
- "Symbolic weather," "atmospheric," "in transit"
- "Sky pressing," "activating," "current climate"
- "Passing pattern," "temporary activation"
- "Tide in motion," "transiting geometry"

**Example (Correct):**
> "With Saturn transiting your Venus, relational friction tends to intensify. This weather will shift once the transit separates."

**Example (Incorrect):**
> "Your Venus aspects tend to be stormy right now." ❌ (No distinction between blueprint and weather)

---

## Data Checks (Pre-Enforcement)

### Required Field Presence

In formatter input:

```javascript
{
  // ALWAYS present
  natal: {
    planets: [...],
    aspects: [...],
    placements: [...]
  },
  
  // CONDITIONALLY present (weather only if true)
  transits: {
    planets: [...],
    aspects: [...]
  } || undefined
}
```

**Rule:** If `data.transits` is null/undefined/empty → **No weather language allowed.**

### Test Data Validation

All test fixtures must declare weather availability:

```json
{
  "type": "reading",
  "chart_type": "natal",
  "has_transits": false,  // ← KEY
  "data": { ... }
}
```

If `"has_transits": false` and formatter uses weather language → **Test fails.**

---

## Enforcement Points

### 1. Formatter Logic (`src/formatter/create_markdown_reading_enhanced.js`)

**Before any weather language:**

```javascript
// Check: Are transits active?
const hasActiveTransits = data.transits && 
  Array.isArray(data.transits.aspects) && 
  data.transits.aspects.length > 0;

// Section header example:
if (hasActiveTransits) {
  output += `### Current Symbolic Weather\n`;  // ✅
  // Use weather language here
} else {
  output += `### Your Baseline Architecture\n`;  // ✅
  // Use blueprint language here
}
```

**Allowed weather words (only if `hasActiveTransits`):**
- weather, atmospheric, pressing, activating, current, tide, transiting, sky-in-motion

**Allowed blueprint words (always safe):**
- blueprint, baseline, natal, enduring, structural, skeleton, vessel, framework

---

### 2. Linter Extension (`scripts/raven-lexicon-lint.js`)

**New rule: Weather-without-transits**

```javascript
// Pseudo-code
const WEATHER_KEYWORDS = [
  'weather', 'atmospheric', 'pressing', 'activating',
  'current climate', 'tide', 'in transit', 'sky'
];

function checkWeatherBoundary(text, hasTransits) {
  if (!hasTransits) {
    const violations = WEATHER_KEYWORDS.filter(kw => text.includes(kw));
    if (violations.length > 0) {
      return {
        severity: 'high',
        message: `Weather language ("${violations[0]}") found without active transits`,
        code: 'WEATHER_WITHOUT_TRANSITS'
      };
    }
  }
}
```

**Severity levels:**
- **critical** — Using "weather" on natal blueprint alone
- **high** — Weather metaphors with no transiting data present
- **medium** — Blurred distinction (weather + blueprint mixed without clarity)

---

### 3. Test Coverage (`tests/e2e/poetic-brain.temporal-integrity.spec.ts`)

**Existing Test 4 (Enhanced):**

"Symbolic weather semantic sanity check"

```typescript
test('should not use weather language without active transits', async () => {
  // Test data: NATAL ONLY (no transits)
  const reading = await generateReading({
    natal: { /* full natal */ },
    transits: undefined  // ← KEY
  });
  
  // Check: No weather language present
  const hasWeatherLanguage = /symbolic weather|atmospheric|pressing|current climate/i
    .test(reading.appendix.reader_markdown);
  
  expect(hasWeatherLanguage).toBe(false);
  
  // Check: Blueprint language present
  const hasBlueprintLanguage = /baseline|enduring|natal|skeleton/i
    .test(reading.appendix.reader_markdown);
  
  expect(hasBlueprintLanguage).toBe(true);
});

test('should use weather language WITH active transits', async () => {
  // Test data: NATAL + TRANSITS
  const reading = await generateReading({
    natal: { /* full natal */ },
    transits: { aspects: [/* real transit aspects */] }
  });
  
  // Check: Weather language present when appropriate
  const relevantSection = reading.appendix.reader_markdown
    .split(/### Symbolic Weather|### Current Climate/)[1];
  
  if (relevantSection) {
    const hasWeatherLanguage = /weather|atmospheric|pressing/i
      .test(relevantSection);
    
    expect(hasWeatherLanguage).toBe(true);
  }
});
```

---

### 4. Audit Question (Human Review)

**Question 4 (Expanded from previous "4 Questions")**

"Is the distinction between natal structure and transiting activation clear?"

Checklist during manual audit:

- [ ] Natal geometry uses blueprint/baseline language
- [ ] Transits (if present) use weather/atmospheric language
- [ ] No weather language appears without transits in data
- [ ] If both discussed together, distinction is explicit
- [ ] Reader can distinguish vessel from tide

---

## Common Violations

### Violation Type 1: Weather on Blueprint
```
❌ "Your Sun-Pluto conjunction brings intense psychological weather."
✅ "Your Sun-Pluto conjunction tends to produce psychological intensity."
```

### Violation Type 2: Blueprint Language Avoiding Reality
```
❌ "Saturn transiting your 7th house is part of your relationship baseline."
✅ "Saturn is transiting your 7th house, activating relational friction right now."
```

### Violation Type 3: Blurred Boundaries
```
❌ "Your Mars tends to weather storms, and right now more pressure arrives."
✅ "Your Mars tends to meet intensity with directness (your baseline). 
    Currently, transiting Saturn is adding additional pressure to test this capacity."
```

### Violation Type 4: Weather Without Data
```
❌ Reading says "Current weather patterns suggest..." but input has no transits.
✅ Reading says "Your baseline architecture tends to..." when transits absent.
```

---

## Decision Tree for Formatter

```
START: Generating section about aspect/placement

  ├─ Is this about NATAL geometry (sun, moon, planets, natal aspects)?
  │  └─→ Use blueprint language
  │      • "Your [planet] tends to..."
  │      • "This baseline geometry..."
  │      • "Your native pattern..."
  │      ✅ NEVER use "weather"
  │
  ├─ Is this about TRANSITS (Saturn, Jupiter, other planets in transit)?
  │  └─→ Check: Does data.transits exist AND has aspects?
  │      ├─ YES → Use weather language
  │      │         • "This symbolic weather..."
  │      │         • "Transiting [planet] presses..."
  │      │         • "Current atmospheric activation..."
  │      │         ✅ Weather language appropriate
  │      │
  │      └─ NO → Use blueprint language (describe transit's native character)
  │             • "Transiting Saturn tends to..."
  │             • "This activation pattern tends to..."
  │             ✅ Still no weather (since no data)
  │
  └─ Is this about INTERACTION (blueprint + current weather)?
     └─→ Make it EXPLICIT
         • First: Blueprint language for native pattern
         • Then: Clear marker ("Right now," "Currently," "With X transiting")
         • Then: Weather language for activation
         ✅ Reader sees both, clearly separated
```

---

## Implementation Checklist

- [ ] Formatter checks `data.transits` before using weather language
- [ ] Linter rule for "weather without transits" created
- [ ] Test cases: natal-only and natal+transits scenarios
- [ ] Audit criterion 4 (Blueprint vs. Weather) added
- [ ] Documentation complete (this file)
- [ ] All current formatter output reviewed for violations
- [ ] All test data has `has_transits` flag set appropriately
- [ ] CI pipeline runs enhanced linter

---

## Why This Matters

**Falsifiability collapses if we confuse vessel and tide.**

If a reader can't tell whether you're describing their:
- Permanent structure (always present, testable over lifetime)
- Temporary activation (present now, testable until it passes)

...then they can't actually test your claims. Everything becomes unfalsifiable mysticism.

The distinction between blueprint and weather is **the linguistic foundation** for Raven's entire ethical frame: "Observe the pattern, name the activation, preserve the reader's agency to disagree."

---

## Future Enhancement: Provenance Tracking

Once `appendix.provenance_a` and `appendix.provenance_b` are implemented, Blueprint vs. Weather can extend into source tracking:

```json
{
  "appendix": {
    "reader_markdown": "...",
    "provenance_a": {
      "source": "natal",
      "geometry": "Venus-Saturn",
      "confidence": "high"
    },
    "provenance_b": {
      "source": "transits",
      "geometry": "Saturn-Venus transit",
      "confidence": "medium"
    }
  }
}
```

This makes the vessel/tide distinction **trackable and auditable**.
