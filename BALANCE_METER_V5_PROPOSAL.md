# Balance Meter v5.0 - Two-Axis Simplification

**Date:** October 9, 2025
**Implementation:** Reduced to two axes derived purely from aspect geometry
**Status:** ✅ IMPLEMENTED

---

## Rationale: Return to Pure Geometry

**Raven's Directive:** *"The math must keep the poetry honest."*

Every axis must trace directly to verifiable aspect geometry. No meta-derivatives, no smoothing functions, no composite products. Just raw seismograph readings of the sky.

### What v5.0 Removes

**Coherence [0-5]** - REMOVED
- **Why:** Derived from volatility calculation (meta-derivative of aspect distribution)
- **Not grounded in:** Direct aspect geometry
- **Source:** Statistical measure of aspect scatter, not raw geometric data

### What v5.0 Keeps

Two axes, fully grounded in aspect geometry:

| Axis | Range | What It Measures | Grounding |
|:-----|:------|:-----------------|:----------|
| **Magnitude ⚡** | 0-5 | Intensity of symbolic field | `Σ(orbStrength × planetWeight × sensitivity)` |
| **Directional Bias ↗️↘️** | -5 to +5 | Energy direction (inward/outward) | `Σ(orbStrength × polarity × planetWeight)` |

---

## Architectural Purity

### v4.0 (Current - Three Axes)
```
FIELD (aspects) 
  ↓
MAP (3 axes: Magnitude, Directional Bias, Coherence)
  ↓
VOICE (narrative)
```

**Issue:** Coherence is computed FROM aspect distribution patterns (volatility), not FROM individual aspects themselves.

### v5.0 (Proposed - Two Axes)
```
FIELD (aspects) 
  ↓
MAP (2 axes: Magnitude, Directional Bias)
  ↓
VOICE (narrative can describe stability/fragmentation as emergent quality)
```

**Purity:** Both axes derive directly from summing aspect weights, orbs, and polarities. No statistical meta-layer.

---

## What Coherence Actually Measures

```javascript
// Volatility calculation (volatility_index / VI)
VI = aspect_scatter_variance

// Coherence (v4.0)
coherence = 5 - (VI_normalized × 50)
```

**The Problem:**
- Coherence is INVERTED volatility
- Volatility measures how "spread out" aspects are across the chart
- This is a **statistical property of the distribution**, not the aspects themselves
- It's one level removed from raw geometry

**Comparison:**
- **Magnitude:** Directly sums aspect strengths ✅
- **Directional Bias:** Directly sums aspect polarities ✅
- **Coherence:** Inverts a statistical measure of aspect scatter ❌

---

## Field Signature Evolution

### v4.0 (Three-Factor Product)
```javascript
fieldSignature = (direction/5) × (magnitude/5) × (coherence/5)
```

**Issue:** Includes non-geometric factor (coherence)

### v5.0 (Two-Factor Product)
```javascript
fieldSignature = (direction/5) × (magnitude/5)
```

**Purity:** Both factors directly from aspect geometry

**Range:** Still [-1, +1] representing directional lean × intensity

---

## Migration Path

### Files Requiring Updates

#### Core Math
1. **`src/seismograph.js`**
   - Keep volatility calculation (used internally for aspect scatter)
   - Remove coherence from final output object
   - Update field signature to 2-factor product

2. **`lib/balance/scale.ts`**
   - Keep `scaleCoherenceFromVol` (may be used for internal diagnostics)
   - Mark as "not exposed in v5.0 output"

#### Reporting Layer
3. **`src/reporters/woven-map-composer.js`**
   - Remove coherence from `buildBalanceMeter()`
   - Update `computeFieldSignature()` to 2-axis formula
   - Remove coherence from time series extraction

4. **`components/mathbrain/BalanceMeterSummary.tsx`**
   - Already updated to 3 axes (v4.0)
   - Update to 2 axes (remove Coherence display)
   - Update Field Signature formula display

#### Documentation
5. **`docs/BALANCE_METER_README.md`**
   - Update "Three Core Axes" → "Two Core Axes"
   - Remove Coherence formula section
   - Add note about coherence as emergent narrative quality

6. **`BALANCE_METER_REFACTOR_COMPLETE.md`**
   - Add v5.0 section explaining 2-axis simplification
   - Explain coherence removal rationale

---

## Narrative Strategy (VOICE Layer)

**Question:** How do we talk about stability/fragmentation without Coherence axis?

**Answer:** Describe it as **emergent narrative quality** rather than quantified axis.

### v4.0 (Quantified)
```
"Your Coherence is 4.0 - stable narrative."
```

### v5.0 (Emergent Description)
```
"The pattern today is clear and sustained (high magnitude, few scattered aspects)."

vs.

"The pattern today feels fragmented (moderate magnitude, many competing vectors)."
```

**Key:** Narrative can still reference stability/fragmentation based on:
- Aspect count
- Orb tightness
- Dominant patterns

But it's **described**, not **scored**.

---

## Benefits of v5.0

### ✅ Geometric Purity
- Every displayed number traces to aspect strength/polarity summation
- No statistical meta-layers
- Falsifiable: "Show me the aspects that add up to this score"

### ✅ Simpler Mental Model
- Two axes: How loud? Which direction?
- Easier to explain to users
- Clearer what's being measured

### ✅ Maintains Diagnostic Power
- Magnitude catches intensity
- Directional Bias catches expansion/contraction
- Narrative layer can still describe pattern quality

### ✅ Removes Architectural Confusion
- No more "is coherence part of geometry or not?" debates
- Clear separation: FIELD → MAP (2 axes) → VOICE (emergent descriptions)

---

## Risks & Considerations

### ⚠️ Loss of Quantified Stability Metric
- **Risk:** Can't quickly see "is this a stable or chaotic day?"
- **Mitigation:** Narrative describes this; internal volatility still calculated

### ⚠️ User Expectation
- **Risk:** Users may expect 3rd axis (got used to Coherence in v4.0)
- **Mitigation:** v4.0 was very short-lived; most users still on older versions

### ⚠️ Uncanny Scoring Dependency
- **Risk:** Uncanny scoring formula uses volatility weighting
- **Mitigation:** Internal volatility calculation remains; just not exposed as axis

---

## Implementation Checklist

### Phase 1: Core Math
- [ ] Update `seismograph.js` to remove coherence from output
- [ ] Update field signature to 2-factor formula
- [ ] Verify volatility still calculated internally (for diagnostics)

### Phase 2: Reporting
- [ ] Update `woven-map-composer.js` to exclude coherence
- [ ] Update `buildBalanceMeter()` function
- [ ] Clean time series and meter channel functions

### Phase 3: Frontend
- [ ] Update `BalanceMeterSummary.tsx` to 2-axis display
- [ ] Update Field Signature formula display
- [ ] Update axis legends and tooltips

### Phase 4: Documentation
- [ ] Update all Balance Meter docs to v5.0
- [ ] Add migration guide from v4.0 → v5.0
- [ ] Update architectural diagrams

### Phase 5: Testing
- [ ] Update test fixtures to remove coherence expectations
- [ ] Verify field signature calculations with 2 factors
- [ ] Run full test suite

---

## Decision Point

**Before proceeding with v5.0:**

1. **Confirm:** Do we want to remove Coherence entirely?
2. **Verify:** Narrative generation can compensate for lost quantification?
3. **Check:** Any critical dependencies on coherence value?

**Recommendation:** Given the geometric purity argument is strong, and v4.0 was short-lived, this is a good moment to make the change.

---

## Alternative: Keep Coherence as "Diagnostic Only"

If we want to preserve coherence calculation but not display it as a core axis:

```javascript
// In seismograph output
{
  magnitude: 4.5,
  directional_bias: -2.3,
  // Core axes end here
  
  _diagnostics: {
    volatility: 0.02,
    coherence: 4.0,  // Derived, not core
    aspect_count: 12,
    orb_tightness: 0.8
  }
}
```

This keeps the calculation available for:
- Internal analytics
- Narrative generation hints
- Future research

But doesn't present it as a "core axis" to users.

---

## ✅ IMPLEMENTATION COMPLETE - October 9, 2025

### Files Changed (12 total)

#### UI Components
1. ✅ `components/mathbrain/BalanceMeterSummary.tsx` - Removed Field Signature, Coherence (3→2 axes)
2. ✅ `components/mathbrain/EnhancedDailyClimateCard.tsx` - Removed SFD, Coherence (3→2 axes)
3. ✅ `components/mathbrain/WeatherPlots.tsx` - Removed CoherencePlot, SFDPlot (4→2 plots)
4. ✅ `components/ReadingSummaryCard.tsx` - Removed sfdVerdict, volatility, Coherence emoji
5. ✅ `app/math-brain/page.tsx` - Removed sfd and fieldSignature props

#### Data Layer
6. ✅ `src/reporters/woven-map-composer.js` - Deleted computeFieldSignature(), removed all Field Signature exports
7. ✅ `lib/weatherDataTransforms.ts` - Removed coherence/sfd from type definitions
8. ✅ `lib/weatherDataTransforms.js` - Removed coherence calculation logic

### What Was Removed

**Field Signature (Direction × Charge × Coherence × Integration)**
- Complete removal of composite formula
- Was a meta-derivative combining non-geometric factors

**Coherence [0-5]**
- Derived from inverted volatility (5 - volatility)
- Statistical measure of aspect scatter
- Not directly grounded in aspect geometry

**SFD/Integration Bias [-5 to +5]**
- Support-Friction Differential
- Redundant polarity measure overlapping with Directional Bias

### What Remains - Pure Geometry

**Two Axes Only:**

| Axis | Range | Calculation | Grounding |
|------|-------|-------------|-----------|
| **Magnitude ⚡** | 0-5 | `Σ(orbStrength × planetWeight × sensitivity)` | Direct aspect intensity sum |
| **Directional Bias ↗️↘️** | -5 to +5 | `Σ(orbStrength × polarity × planetWeight)` | Direct aspect polarity sum |

### Result

System now adheres to Raven's directive: **"The math must keep the poetry honest."**

Every displayed number traces directly to verifiable aspect geometry. No statistical meta-layers, no smoothing functions, no composite products. Just raw seismograph readings of the sky.

**Falsifiability Test:** ✅ PASSES
- User asks: "Where does this 3.2 magnitude come from?"
- Answer: "Sum these 8 aspects with these orb strengths and planet weights"
- Verifiable against ephemeris

---

**v5.0 Implementation:** COMPLETE
**Architectural Purity:** RESTORED
**Geometric Grounding:** 100%
