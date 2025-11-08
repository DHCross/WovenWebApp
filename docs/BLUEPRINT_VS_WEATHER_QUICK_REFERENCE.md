# Blueprint vs. Weather: Quick Reference Card

**Quick Lookup for Raven Voice Maintenance**

---

## The Boundary in One Sentence

**Blueprint** = permanent vessel | **Weather** = temporary tide  
Never confuse them or falsifiability collapses.

---

## When to Use Each

### 🏗️ Blueprint Language
**When describing:** Natal chart, sun/moon, placements, aspects, permanent patterns

**Use these words:**
- blueprint, baseline, natal geometry
- enduring field, inner architecture, skeleton
- foundation, structural, native pattern

**Example:**
> "Your Venus-Saturn conjunction tends to produce cautious relating."

**Rule:** Always safe. Use when in doubt about transits.

---

### 🌪️ Symbolic Weather Language
**When describing:** Transits, progressions, external movements, current activations

**Use these words:**
- symbolic weather, atmospheric, pressing
- activating, in transit, sky in motion
- current climate, temporary pattern

**Never use:**
- "weather check" (imprecise)
- Unpaired weather terms

**Correct terminology:**
- "symbolic meaning check"
- "symbolic weather semantic check"
- "does this symbolic meaning resonate"

**Example:**
> "Saturn transiting your Venus intensifies this caution right now."

**Rule:** Only if `data.transits` exists AND has aspects. Stop when transit separates.

---

## Decision Tree

```
START: About to write something

├─ NATAL CHART, PLACEMENTS, ASPECTS?
│  └─→ USE BLUEPRINT LANGUAGE
│      ("baseline," "enduring," "natal," etc.)
│
├─ TRANSITS, PROGRESSIONS, ACTIVATED GEOMETRY?
│  ├─ Data has active transits?
│  │  ├─ YES → USE WEATHER LANGUAGE
│  │  └─ NO → USE BLUEPRINT LANGUAGE
│  │
│
└─ BOTH NATAL + TRANSITS?
   └─→ MAKE DISTINCTION EXPLICIT
       • First: Blueprint language (the native pattern)
       • Then: Weather language (the current activation)
       • Result: Reader sees both, clearly separated
```

---

## Common Violations → Fixes

| Violation | Wrong | Right |
|-----------|-------|-------|
| **Weather on natal** | "Your Venus is stormy" | "Your Venus tends to compress ease" |
| **Blueprint avoiding transits** | "Saturn is part of your baseline" (about current transit) | "Saturn transits your Venus, activating friction" |
| **Blurred boundary** | "Your Mars weathers storms and more arrives now" | "Your Mars handles intensity (baseline). Currently transiting Saturn adds pressure." |
| **Weather without data** | "Current weather suggests..." (no transits) | "Your baseline architecture suggests..." |

---

## Linter Check

```bash
npm run raven:lint
```

**Looks for:** Weather words without transits in data  
**Severity:** High  
**Category:** "Weather without transits"  
**Current status:** ✅ Zero violations (as of 2025-11-08)

---

## Human Audit Question

**Criterion #4: Blueprint vs. Weather (Semantic Boundary)**

- [ ] Natal geometry uses blueprint/baseline language
- [ ] Transits (if present) use weather/atmospheric language
- [ ] No weather language appears without transits in data
- [ ] If both discussed, distinction explicit
- [ ] Reader can distinguish vessel from tide

---

## Data Check

**If `data.transits` is null/undefined/empty:**
- ✅ Use blueprint language only
- ❌ No weather language allowed

**If `data.transits.aspects` has items:**
- ✅ Use weather language for transit sections
- ✅ Use blueprint language for comparison
- ✅ Make distinction explicit

---

## Why This Matters

**Without this boundary:** "Could be permanent or temporary? Who knows? Can't test it."  
**With this boundary:** "I can test whether this is true for me, now or later."

Falsifiability requires readers to distinguish between:
- What endures (I can test over my whole life)
- What changes (I can test until it passes)

---

## Examples in Context

### ✅ Natal Only (Correct)
> "Your Venus-Saturn conjunction tends to compress relational ease. This baseline geometry means you often approach connection with caution."

### ❌ Natal Only (Wrong)
> "Your Venus-Saturn conjunction brings intense relational weather right now." ← No transits, but using weather language

### ✅ With Transits (Correct)
> "Your native Venus-Saturn creates caution (your baseline).  
> Saturn is transiting your 7th house, adding current pressure to this pattern.  
> This weather will shift once the transit separates, but your baseline endures."

### ❌ With Transits (Wrong)
> "Your relational weather is currently stormy, and underneath you're cautious too." ← Blurred, reader confused

---

## Reference Documents

| Need | Document |
|------|----------|
| **Complete rules** | `docs/BLUEPRINT_VS_WEATHER_FIREWALL.md` |
| **Implementation guide** | `docs/BLUEPRINT_VS_WEATHER_IMPLEMENTATION.md` |
| **System design** | `Architecture.md` (Semantic Boundary section) |
| **Voice integration** | `docs/RAVEN_CALDER_VOICE.md` |
| **Audit checklist** | `docs/RAVEN_RESONANCE_AUDIT_GUIDE.md` (Criterion #4) |

---

## The Metaphor

```
┌─────────────────┐
│  VESSEL (CHART) │  ← Blueprint (permanent)
│  Sun, Moon, etc │     Endures
└────────┬────────┘
         │
      ═══╪═══  ← Tide (transits temporary)
    ╱╱╱╱ │ ╲╲╲╲ Weather (moves through)
         ▼      Changes over time
      OCEAN
```

The vessel doesn't become the tide.  
The tide doesn't become the vessel.  
They move together, but they're not the same thing.

---

## Checklist for Every Output

Before shipping any reading:

- [ ] Natal/blueprint language used for permanent structure
- [ ] Weather language only used when transits active
- [ ] No weather without supporting transit data
- [ ] Distinction clear (reader can tell vessel from tide)
- [ ] Reader can test each claim (falsifiable)

---

**Last Updated:** 2025-11-08  
**Status:** ✅ Enforced  
**Linter:** Category #9  
**Audit:** Criterion #4  
**Tests:** Test 4 validates boundary
