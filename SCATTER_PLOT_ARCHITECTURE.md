# Scatter Plot Architecture - Two Visualization Types
## Analysis & Architectural Intent

**Date:** October 18, 2025
**Status:** ✅ WORKING AS DESIGNED
**Analysis By:** User
**Architectural Review:** Confirmed

---

## 🎯 EXECUTIVE SUMMARY

The codebase contains **TWO DIFFERENT scatter plot implementations by design**, each serving a distinct purpose in the Woven Map visualization hierarchy:

1. **AccelerometerScatter.tsx** - "FIELD Only" (True Accelerometer v5.0) ✅
2. **UnifiedSymbolicDashboard.tsx** - "MAP + FIELD" (Hybrid Visualization) ✅

**Both are working as intended.** The deviation from spec in UnifiedSymbolicDashboard is **intentional architectural design**, not a bug.

---

## 📊 VISUALIZATION ARCHITECTURE

### Woven Map Philosophy: MAP vs. FIELD

```
MAP (Internal, Structural)
  └─ Where planets are (houses, degrees, aspects)
  └─ Geometry, coordinates, architecture
  └─ What the astrologer measures

FIELD (External, Energetic)
  └─ How that geometry translates into pressure
  └─ Magnitude + Directional Bias
  └─ What the person experiences
```

---

## 1️⃣ AccelerometerScatter.tsx - "True Accelerometer v5.0"

### Purpose
**FIELD-only visualization.** Pure accelerometer reading of symbolic pressure.

### Philosophy
> "The math must keep the poetry honest"

- Each dot is a measurable tremor
- No astrological structure visible
- No houses, no planets, no MAP layer
- Just the raw FIELD readings

### Technical Implementation

**Y-Axis:** Magnitude (0-5)
**X-Axis:** Time (date index)
**Color:** Directional Bias (-5 to +5)
**Point Size:** Fixed (8px)

**Code Location:** `components/mathbrain/AccelerometerScatter.tsx`

**Key Lines:**
```typescript
// Line 50: Y-axis is Magnitude
y: d.weather.axes.magnitude.value,

// Line 51: Color is Directional Bias
valence: d.weather.axes.directional_bias.value,
```

**Compliance:** ✅ FULLY SPEC-COMPLIANT

---

## 2️⃣ UnifiedSymbolicDashboard.tsx - "MAP + FIELD Hybrid"

### Purpose
**Dual-layer diagnostic visualization.** Shows both astrological structure (MAP) and energetic pressure (FIELD) on the same chart.

### Philosophy
> "Lines tell where the sky moves (structure). Bubbles tell how that motion feels (weather). When both spike together = diagnostic handshake between MAP and FIELD."

- MAP layer: Planetary lines through houses
- FIELD layer: Pressure bubbles overlaid
- Enables visual correlation between geometry and experience

### Technical Implementation

**Y-Axis:** Houses (1-12) for MAP layer
**X-Axis:** Time (date index)
**Bubble Size:** Magnitude (0-5)
**Bubble Color:** Directional Bias (-5 to +5)
**Bubble Y-Position:** Magnitude × 2 (pseudo-house position)

**Code Location:** `components/mathbrain/UnifiedSymbolicDashboard.tsx`

**Key Lines:**
```typescript
// Line 106: MAP layer uses houses for Y-axis
y: point.house,

// Line 173: FIELD layer uses scaled magnitude for Y-position
y: point.magnitude * 2, // Scale magnitude (0-5) to fit house range (0-10)

// Line 188: Magnitude determines bubble SIZE
pointRadius: fieldPoints.map(p => 5 + p.magnitude * 3),
```

**Compliance:** ⚠️ INTENTIONALLY NON-COMPLIANT with "True Accelerometer v5.0"

**Why?** This visualization serves a different purpose. It's designed to show MAP + FIELD integration, not pure FIELD measurement.

---

## 🎭 ARCHITECTURAL INTENT

### Design Decision: Two Separate Visualizations

The architecture intentionally provides **two different views** because they serve **two different diagnostic needs**:

### View 1: "FIELD Only" (AccelerometerScatter)
**When to use:**
- User wants pure pressure reading
- No need to see astrological structure
- Focus on experiential intensity
- Compare magnitude and bias trends over time

**What it shows:**
- ✅ How loud is the field? (Magnitude)
- ✅ Which way does energy lean? (Directional Bias)
- ❌ Where are planets? (Not shown)
- ❌ What houses are active? (Not shown)

**User question answered:** *"What am I feeling?"*

---

### View 2: "MAP + FIELD" (UnifiedSymbolicDashboard)
**When to use:**
- User wants to see correlation between geometry and experience
- Diagnostic: "Why does this day feel intense?"
- Understanding: "Which planet transit caused this pressure spike?"
- Integration: "How does MAP translate into FIELD?"

**What it shows:**
- ✅ Where are planets? (Planetary lines through houses)
- ✅ What houses are active? (Y-axis shows houses 1-12)
- ✅ How intense is the pressure? (Bubble size)
- ✅ Which way does energy lean? (Bubble color)

**User question answered:** *"Why am I feeling this?"*

---

## 🔍 DEVIATION ANALYSIS

### Is the Deviation Intentional?

**YES.** The UnifiedSymbolicDashboard intentionally breaks from "True Accelerometer v5.0" spec because:

1. **Different Purpose:** It's not trying to be a pure accelerometer. It's trying to show MAP + FIELD correlation.

2. **Y-Axis Constraint:** The chart needs the y-axis to show houses (1-12) for the MAP layer. This is the primary organizing principle.

3. **Bubble Encoding:** Magnitude is encoded in bubble size AND pseudo-y-position. This is a compromise to fit both layers on one chart.

4. **Diagnostic Value:** The overlay enables visual pattern matching: "Ah, Saturn crossed into House 10 right when magnitude spiked to 4.5."

---

## 📋 SPECIFICATION COMPLIANCE

| Feature | True Accelerometer Spec | AccelerometerScatter | UnifiedDashboard |
|---------|------------------------|---------------------|------------------|
| **Y-Axis: Magnitude** | ✅ Required | ✅ Compliant | ❌ Uses Houses |
| **Color: Directional Bias** | ✅ Required | ✅ Compliant | ✅ Compliant |
| **Discrete Points** | ✅ Required | ✅ Compliant | ✅ Compliant |
| **No Smoothing** | ✅ Required | ✅ Compliant | ✅ Compliant |
| **Diverging Color Scale** | ✅ Required | ✅ Compliant | ✅ Compliant |

**Verdict:**
- **AccelerometerScatter:** ✅ 100% spec-compliant
- **UnifiedDashboard:** ⚠️ Intentionally non-compliant (hybrid design)

---

## 🎯 RECOMMENDATION

### Keep Both Visualizations ✅

**Rationale:**
1. **Different use cases:** FIELD-only vs. MAP+FIELD serve different diagnostic needs
2. **User choice:** Toggle allows users to switch between views
3. **Complementary:** They tell different parts of the story

### Documentation Updates Required 📝

**1. Clarify naming:**
- "True Accelerometer" = FIELD only (AccelerometerScatter)
- "Unified Dashboard" = MAP + FIELD hybrid (UnifiedSymbolicDashboard)

**2. Update TRUE_ACCELEROMETER_VISUALIZATION_SPEC.md:**
- Add section: "Related Visualizations"
- Explain UnifiedDashboard is NOT a True Accelerometer
- Document the hybrid design intent

**3. Update UnifiedSymbolicDashboard.tsx comments:**
- Add disclaimer: "This visualization intentionally deviates from True Accelerometer spec"
- Explain the MAP-first design decision
- Document why y-axis shows houses instead of magnitude

**4. Update UI labels:**
- "FIELD View" (instead of ambiguous "Scatter Plot")
- "MAP + FIELD View" (instead of "Unified Dashboard")

---

## 🛠️ CODE CHANGES RECOMMENDED

### 1. Update Component Comments

**File:** `components/mathbrain/UnifiedSymbolicDashboard.tsx`

**Add to top:**
```typescript
/**
 * Unified Symbolic Dashboard v5.0
 *
 * ⚠️ ARCHITECTURAL NOTE:
 * This visualization intentionally deviates from "True Accelerometer v5.0" spec.
 *
 * DESIGN DECISION: Y-axis shows HOUSES (1-12), not Magnitude.
 *
 * Why?
 * - Purpose: Show correlation between MAP (planetary geometry) and FIELD (pressure)
 * - MAP layer needs y-axis for houses to plot planetary positions
 * - FIELD layer overlays as bubbles (size = magnitude, color = bias)
 *
 * For a pure "True Accelerometer" view, use AccelerometerScatter.tsx instead.
 *
 * Combines two data layers:
 * - MAP Layer: Planetary geometry (lines + points) - where planets move through houses
 * - FIELD Layer: Symbolic pressure (scatter bubbles) - how that geometry translates into energetic charge
 */
```

---

### 2. Update UI Toggle Labels

**File:** `components/mathbrain/WeatherPlots.tsx` (or wherever toggle lives)

**Current:**
```typescript
Toggle: "Scatter Plot" vs "Unified Dashboard"
```

**Recommended:**
```typescript
Toggle: "FIELD View (Pure Accelerometer)" vs "MAP + FIELD View (Hybrid)"
```

---

### 3. Add Hover Tooltips

**AccelerometerScatter:**
```typescript
title="True Accelerometer v5.0: Pure FIELD measurement (Magnitude on Y-axis, Directional Bias as color)"
```

**UnifiedDashboard:**
```typescript
title="MAP + FIELD Hybrid: Planetary positions (lines through houses) + Pressure bubbles (size = magnitude, color = bias)"
```

---

## 📊 VISUAL COMPARISON

### AccelerometerScatter (FIELD Only)
```
Y-Axis: Magnitude (0-5)
    5 |     ●        ● ← High pressure days
    4 |   ●   ●    ●
    3 | ●       ●
    2 |●
    1 |
    0 |________________________ X-Axis: Time
       Color: Red (contractive) → Gray → Blue (expansive)
```

**What you see:** Raw pressure readings over time

---

### UnifiedSymbolicDashboard (MAP + FIELD)
```
Y-Axis: Houses (1-12)
   12 | ――Saturn――            ← Planetary lines
   10 |        ◉ ← Pressure bubble (size=magnitude, color=bias)
    8 | ――Jupiter――
    6 |     ◉
    4 | ――Mars――
    2 |
    0 |________________________ X-Axis: Time
       Lines: Where planets move
       Bubbles: How that movement feels
```

**What you see:** Correlation between planetary positions and pressure

---

## 🎓 USER EDUCATION

### When to Use Each View

**Use AccelerometerScatter (FIELD Only) when:**
- You want to see raw pressure trends
- You're tracking how intense your days feel
- You don't need to know the astrological "why"
- You're validating the "True Accelerometer" philosophy

**Use UnifiedDashboard (MAP + FIELD) when:**
- You want to understand "why" a day felt intense
- You're learning how planetary transits correlate with experience
- You're looking for diagnostic patterns (e.g., "Saturn in 10th = pressure spike")
- You want to see both structure and experience together

---

## 🏆 FINAL VERDICT

### Status: ✅ WORKING AS DESIGNED

**AccelerometerScatter.tsx:**
- ✅ 100% compliant with "True Accelerometer v5.0"
- ✅ Pure FIELD measurement
- ✅ No changes needed

**UnifiedSymbolicDashboard.tsx:**
- ✅ Working as architecturally intended
- ⚠️ Intentionally non-compliant with "True Accelerometer v5.0"
- ✅ Serves a different purpose (MAP + FIELD correlation)
- 📝 Needs better documentation

**Integration (WeatherPlots.tsx):**
- ✅ Toggle works correctly
- 📝 Needs clearer labeling

---

## 📝 ACTION ITEMS

### Immediate (Documentation)
- [ ] Update UnifiedSymbolicDashboard.tsx header comments
- [ ] Add architectural note explaining deviation
- [ ] Update WeatherPlots.tsx toggle labels
- [ ] Add hover tooltips to both components

### Short-term (Documentation)
- [ ] Update TRUE_ACCELEROMETER_VISUALIZATION_SPEC.md
- [ ] Add "Related Visualizations" section
- [ ] Document MAP + FIELD hybrid design
- [ ] Create visual comparison diagram

### Optional (Enhancement)
- [ ] Consider adding a third view: "MAP Only" (just planetary lines, no bubbles)
- [ ] Add export button for each view type
- [ ] Add user preference: "Default to FIELD view" or "Default to MAP + FIELD view"

---

## 🎯 CONCLUSION

**The scatter plot implementations are working correctly.** The deviation in UnifiedSymbolicDashboard is an intentional architectural decision to enable MAP + FIELD correlation visualization.

**Recommendation:** Keep both. Improve documentation and UI labeling to clarify the different purposes.

**Key Insight:** These aren't competing implementations—they're complementary views that tell different parts of the story. One answers "What am I feeling?" The other answers "Why am I feeling this?"

---

**Report Generated:** October 18, 2025
**Analysis By:** User (external review)
**Architectural Review:** Confirmed by Cascade
**Status:** ✅ Production ready with documentation updates recommended
