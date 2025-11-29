# Aspects Legend to Balance Meter: Integration Pattern

**Status:** Mandate 1 Complete ✅ | Preparing for Mandate 2  
**Created:** November 28, 2025

---

## Overview

The **Aspects Legend** (`lib/raven/aspects-legend.ts`) now provides programmatic access to all aspect definitions with explicit directional bias weights. This document outlines how to integrate those weights into Balance Meter tooltips for **Mandate 2**.

---

## Mandate 2: Embed Houses in Balance Meter Tooltips

### The Challenge
Users see a Balance Meter visualization (Magnitude + Directional Bias) but don't know:
1. **Where** the pressure lands (which house/domain)
2. **Why** it lands there (which aspects create the valence)
3. **How to interpret it** in lived experience ("pain with coordinates")

### The Solution
Add interactive tooltips that unpack the calculation:

```
Tooltip on "Magnitude 4.2, Valence −3":

📊 PRESSURE COORDINATES
   House: 2nd (Security & Assets)
   Intensity: 4.2/5 (Moderate-High)
   Valence: −3 (Restrictive/Challenging)

🔍 SOURCES (Aspects Creating This Signal)
   • Opposition (180°) — Polarity awareness
     Bias: −3 | Weight: 0.9 | Your experience: [user enters]
   
   • Square (90°) — Productive friction  
     Bias: −2.5 | Weight: 0.8 | Your experience: [user enters]
   
   • Trine (120°) — Harmonic support
     Bias: +3 | Weight: 0.6 | Your experience: [user enters]

📐 CALCULATION
   Magnitude: (0.9 + 0.8 + 0.6) / 3 = 0.77 → 4.2 on 0-10 scale
   Valence: ((−3 × 0.75) + (−2.5 × 0.70) + (3 × 0.65)) / 3 = −0.6 → −3 on −5 to +5 scale

✍️ WHAT TO WATCH
   Tension between financial caution and expansion impulses
   Action: Notice where you apply restrictive thinking vs where you open up
```

---

## Technical Integration Points

### 1. Aspects Legend Functions (Already Available)

```typescript
// Get aspect definition with all metadata
getAspectDefinition(aspectName: string) → AspectDefinition
  Properties: name, angle, orb, force, directionalBias, weight, theme, keywords

// Check aspect force type
isRestrictiveAspect(aspectName) → boolean
isHarmonicAspect(aspectName) → boolean

// Calculate combined bias from multiple aspects
calculateAspectBias(aspects: Array<{name: string, orb: number}>) → number
  Returns: -5 to +5 scalar

// Generate UI table for tooltip
generateAspectsMarkdownTable() → string
generateAspectsTextLegend() → string
```

### 2. Houses Legend Functions (Already Available)

```typescript
// Get house description (1-12)
getHouseDescription(houseNumber: 1-12) → string
  Example: "1st House: Self & Appearance"

// Get context for specific planet in house
getHouseContext(planet: string, houseNumber: number) → string
  Example: "Mars in 7th: Direct relational assertiveness"

// Generate UI reference
generateHousesMarkdownTable() → string
```

### 3. Where to Add Tooltip Logic

**Option A: Math Brain Response Layer** (Recommended)
- Location: `app/api/astrology-mathbrain/route.ts` or Math Brain adapter
- When: After seismograph calculations complete
- Payload addition: Include aspect list + house mapping for each pressure coordinate

```typescript
// In Math Brain response envelope:
{
  balance_meter: {
    magnitude: 4.2,
    valence: -3,
    house: 2,
    aspects: [
      { name: 'opposition', orb: 2.5, weight: 0.9, bias: -3 },
      { name: 'square', orb: 1.8, weight: 0.8, bias: -2.5 },
      { name: 'trine', orb: 3.2, weight: 0.6, bias: +3 }
    ]
  }
}
```

**Option B: Raven Enhancement**
- Location: `app/api/raven/route.ts` in the report generation
- When: Building conversational context
- Call: `generateAspectsMarkdownTable()` + house context for embedding in response

### 4. UI Component Structure

```tsx
// Pseudo-code for tooltip component
<BalanceMeterTooltip 
  magnitude={4.2}
  valence={-3}
  house={2}
  aspects={[...]}
  onAspectClick={(aspect) => showAspectDetail(aspect)}
>
  {/* Render using:
      - getHouseDescription(house) for title
      - generateAspectsMarkdownTable() for table
      - getHouseContext() for narrative
  */}
</BalanceMeterTooltip>
```

---

## Example: 2nd House Pressure Tooltip

**Input Data:**
- Magnitude: 4.2
- Valence: −3
- House: 2nd
- Aspects: Opposition (orb 2.5°), Square (orb 1.8°), Trine (orb 3.2°)

**Generated Tooltip Content:**

```
📊 2ND HOUSE: SECURITY & ASSETS
Magnitude 4.2/5 (Moderate-High Pressure)
Valence −3 (Restrictive/Challenging Flow)

ASPECT SOURCES:
☍ Opposition (180°)
  Theme: Polarity, awareness through reflection
  Bias: −3 (strong restrictive)
  Your experience: [field for user reflection]

□ Square (90°)
  Theme: Friction, productive tension
  Bias: −2.5 (restrictive force)
  Your experience: [field for user reflection]

△ Trine (120°)
  Theme: Flow, harmony, natural grace
  Bias: +3 (strong harmonic)
  Your experience: [field for user reflection]

📐 YOUR CALCULATION:
  - Overall Magnitude: (0.9 + 0.8 + 0.6) ÷ 3 = 0.77 → 4.2/10
  - Overall Valence: Average bias weighted by orb-dampening = −3

💡 WHAT THIS MEANS IN 2ND HOUSE (Security & Assets):
  You navigate material security with both challenge and flow.
  Notice where restriction arises (fear/caution) vs where ease appears.
  Integration task: Can the harmonic trine lift the restrictive pressure?

✍️ NEXT STEP:
  Observe: Do these aspects show up in your actual financial decisions?
  Experiment: Where can you apply the trine's grace to soften the square's friction?
```

---

## Data Flow for Mandate 2

```
Math Brain Calculation
    ↓
[Seismograph: Magnitude + Valence + House Domain]
    ↓
Raven Report Generation
    ↓
[Embed Aspect Legend Markdown Table]
    ↓
Poetic Brain UI Rendering
    ↓
[Tooltip on Balance Meter Visualization]
    ├─ Show house description
    ├─ Show aspect table with bias weights
    ├─ Show calculation transparency
    └─ Invite user reflection
```

---

## Falsifiability & Transparency Goals

### Before (Black Box)
- User sees: "Magnitude 4.2, Valence −3"
- User thinks: "What does that mean?"
- System fails at: Transparency + Auditability

### After (Transparent)
- User sees: Tooltip unpacks the exact geometry
  - Which aspects contributed
  - Directional bias of each
  - How they combine
  - What house domain they affect
- User can test: "Do these aspects match my experience?"
- System enables: Falsifiability + User Agency

---

## Files & Functions Reference

### Aspects Legend Module
- **File:** `lib/raven/aspects-legend.ts`
- **Key Functions:**
  - `getAspectDefinition(name)` → AspectDefinition
  - `calculateAspectBias(aspects)` → number (-5 to +5)
  - `generateAspectsMarkdownTable()` → string (UI-ready)
  - `getAspectsByForce(force)` → AspectDefinition[]

### Houses Legend Module
- **File:** `lib/raven/houses-legend.ts`
- **Key Functions:**
  - `getHouseDescription(number)` → string
  - `getHouseContext(planet, house)` → string
  - `generateHousesMarkdownTable()` → string

### Integration Point
- **File:** `app/api/raven/route.ts`
- **Currently Imports:** Both legends (ready to use)
- **Next Step:** Pass aspect + house context to tooltip layer

---

## Development Checklist for Mandate 2

- [ ] Decide: Is tooltip in Math Brain response envelope OR Raven report layer?
- [ ] If Math Brain: Add aspects array to balance_meter object in response
- [ ] If Raven: Create tooltip context builder using both legend modules
- [ ] Build tooltip component (React/Vue) that displays:
  - [ ] House name + description (via getHouseDescription)
  - [ ] Magnitude + Valence coordinates
  - [ ] Aspect table with bias weights (via generateAspectsMarkdownTable)
  - [ ] House context narrative (via getHouseContext)
  - [ ] User reflection fields
- [ ] Test: Verify tooltip shows correct aspect combination
- [ ] Test: Verify tooltip calculation matches seismograph math
- [ ] Document: Add tooltip component to component library

---

## Success Criteria (Mandate 2)

✅ User clicks on Balance Meter visualization  
✅ Tooltip appears showing house + aspect breakdown  
✅ Tooltip displays calculation transparency (aspect weights + bias + orb)  
✅ User can see how abstract geometry becomes directional bias  
✅ System is now auditable: user can test claim against experience  

---

## Next Steps After Mandate 2

**Mandate 3:** Expand getHouseContext() with 20+ planet-house combinations  
**Mandate 4:** Add houses reference + provenance to PDF exports  
**Mandate 5:** Build interactive house wheel with Placidus/Whole Sign toggle
