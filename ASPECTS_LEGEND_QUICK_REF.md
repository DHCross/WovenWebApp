# Aspects Legend Quick Reference

**Module:** `lib/raven/aspects-legend.ts`  
**Status:** ✅ Production Ready  
**Build:** ✅ Passing

---

## The 7 Aspects at a Glance

```
RESTRICTIVE FORCE (Challenge)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
☍ Opposition   180°  Bias: −3  Weight: 0.9  "Polarity awareness"
□ Square        90°  Bias: −2.5 Weight: 0.8 "Productive friction"
⚻ Quincunx     150°  Bias: −1   Weight: 0.5 "Adjustment needed"
∠ Semi-Square   45°  Bias: −1.5 Weight: 0.3 "Minor irritation"

HARMONIC FORCE (Flow)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
△ Trine        120°  Bias: +3   Weight: 0.6 "Natural grace"
⌛ Sextile      60°   Bias: +2   Weight: 0.4 "Opportunity"

NEUTRAL (Context-Dependent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
☌ Conjunction   0°    Bias: 0    Weight: 0.7 "Unified focus"
```

---

## Core Functions

### Get Aspect Info
```typescript
getAspectDefinition('opposition')
// Returns: Full AspectDefinition with all metadata

getAspectByAngle(90)
// Returns: Square (automatically detected)

getAspectContext('opposition', 'moon', 'saturn')
// Returns: "Opposition: Polarity, awareness through reflection..."
```

### Check Aspect Type
```typescript
isRestrictiveAspect('square')      // true
isHarmonicAspect('trine')          // true
isHarmonicAspect('square')         // false
```

### Calculate Valence
```typescript
calculateAspectBias([
  { name: 'opposition', orb: 2 },
  { name: 'trine', orb: 1.5 }
])
// Returns: Weighted average on -5 to +5 scale
```

### Generate UI/Export Content
```typescript
generateAspectsMarkdownTable()     // Full table for tooltips
generateAspectsTextLegend()        // Plain text reference
getAspectsQuickList()              // Dropdown array
```

---

## Integration Points

### Math Brain (Seismograph)
Directional bias weights feed into valence calculation

### Raven Reports (Conversation)
Aspect definitions inform narrative context generation

### Balance Meter Tooltips (Mandate 2)
Markdown table + context functions display calculation transparency

### PDF Exports (Mandate 4)
Text legend embeds full reference in shareable reports

---

## Key Properties

| Property | Range | Example | Meaning |
|----------|-------|---------|---------|
| **directionalBias** | −5 to +5 | −3 | Restrictive push to negative valence |
| **weight** | 0.3–0.9 | 0.9 | How present in chart (0.9 = maximum) |
| **orb** | ±4° to ±8° | ±8° | Allowable aspect distance |
| **force** | restrictive / harmonic / neutral | restrictive | Fundamental aspect character |

---

## The Calculation

For any coordinate in the Balance Meter:

```
Magnitude = (aspect1_weight + aspect2_weight + ...) / count
           × [scale to 0-10]

Directional_Bias = (aspect1_bias × orb_weight1 
                  + aspect2_bias × orb_weight2 
                  + ...) / count
                  × [scale to -5 to +5]

Where: orb_weight = 1 − (actual_orb / allowed_orb)
       tighter orbs carry stronger weight
```

---

## Poetic Translations (No Jargon)

| Aspect | Don't Say | Do Say |
|--------|-----------|--------|
| Opposition | "Challenging" | "Where you meet your mirror; both perspectives must be heard" |
| Square | "Stressful" | "Friction that calls you to adapt and integrate" |
| Trine | "Easy" | "Where things flow naturally; barely need thinking about" |
| Sextile | "Helpful" | "Gentle support; a door that opens if you push" |
| Quincunx | "Awkward" | "Where small adjustments yield big results" |

---

## Related Modules

**Houses Legend** (`lib/raven/houses-legend.ts`)
- Use together for complete chart interpretation
- `getHouseDescription(1-12)` pairs with aspect context

**Seismograph** (`src/seismograph.js`)
- Consumes directional bias weights
- Produces Balance Meter coordinates

**Raven Protocol** (`lib/raven/protocol.ts`)
- Uses aspect context for narrative generation

---

## Next Steps

### Mandate 2: Balance Meter Tooltips
```typescript
// Component will call:
generateAspectsMarkdownTable()    // For display
getHouseDescription(house)        // For title
getAspectContext(aspect, p1, p2)  // For narrative
```

### Mandate 3: Planet-Aspect Combinations
```typescript
// Expand getAspectContext() with 20+ planet pairs:
mars+saturn  // "Relational friction"
venus+pluto  // "Deep transformation"
// etc.
```

### Mandate 4: PDF Exports
```typescript
// Embed reference:
generateAspectsTextLegend()  // Full legend text
```

---

## Files to Review

- `lib/raven/aspects-legend.ts` — Core module
- `docs/ASPECTS_LEGEND.md` — Full documentation
- `docs/MANDATE_1_COMPLETION_REPORT.md` — Detailed spec
- `docs/MANDATE_2_INTEGRATION_PATTERN.md` — Next steps
- `app/api/raven/route.ts` — Integration point

---

**Version:** 1.0 | **Status:** ✅ Production Ready | **Build:** ✅ Passing
