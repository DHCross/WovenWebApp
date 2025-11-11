# Consolidated Balance Meter v5.0 Documentation
## Complete Reference & Cleanup Guide

**Date:** October 18, 2025
**Status:** ✅ PRODUCTION READY
**Version:** v5.0.0 (Post-Refactor Build 2)
**Last Updated:** October 18, 2025

---

## 🎯 EXECUTIVE SUMMARY

Balance Meter v5.0 is the **current production system**. It measures symbolic weather using two core axes:
- **Magnitude [0-5]**: Raw intensity of astrological field
- **Directional Bias [-5 to +5]**: Energetic direction (expansion vs. contraction)

**Philosophy:** "True Accelerometer" — measures what the sky is doing, not what we think about it.

---

## 📋 DOCUMENTATION HIERARCHY

### PRIMARY REFERENCE (Always Authoritative)
**`/Developers Notes/Core/Four Report Types_Integrated 10.1.25.md`**
- Defines report types, FIELD→MAP→VOICE protocol
- Specifies v5.0 scoring and data architecture
- When conflicts arise, this document wins

### SUPPORTING SPECIFICATIONS
1. **`BALANCE_METER_V5_COMPLETE.md`** - Philosophy & architecture
2. **`V5_IMPLEMENTATION_SUMMARY.md`** - Implementation details & post-release fixes
3. **`MATH_BRAIN_V2_COMPLETE.md`** - v2 orchestrator status
4. **`CHANGELOG_v5.0_UNIFIED_DASHBOARD.md`** - Complete changelog

### USER-FACING GUIDES
- **`docs/UNIFIED_DASHBOARD_GUIDE.md`** - Feature guide
- **`docs/UNIFIED_DASHBOARD_IMPLEMENTATION_COMPARISON.md`** - Specification comparison

---

## ❌ WHAT WAS REMOVED (v4 → v5)

### Deleted Metrics (Non-Geometric)
| Metric | Reason | Status |
|--------|--------|--------|
| **SFD** (Support-Friction Differential) | Redundant with Directional Bias | ❌ DELETED |
| **Coherence** [0-5] | Statistical, not geometric | ❌ DELETED |
| **Volatility** | Rate measure, not direct geometry | ❌ DELETED |
| **Field Signature** | Composite product, too layered | ❌ DELETED |
| **Balance Channel v1.1** | Interpretive layer | ❌ DELETED |

### Deleted Files
- ❌ `Developers Notes/Implementation/Fixing the Balance Meter math 10.4.25.md`
- ❌ `Developers Notes/Math Brain Ideas/A Strange Cosmic Symbolism v3.md`

### Deprecated Files (Marked, Not Deleted)
- ⚠️ `lib/uncanny-scoring-spec.md` - References v3.1 4-axis system
- ⚠️ `docs/POETIC_BRAIN_V1_SNAPSHOT.md` - Historical snapshot only

---

## ✅ WHAT EXISTS IN v5.0

### Two Core Axes (Direct Measurement)

| Axis | Range | Formula | Storage | Meaning |
|------|-------|---------|---------|---------|
| **Magnitude** | 0-5 | `Σ(orbStrength × planetWeight × sensitivity)` | `mag_x10` (int) | How loud is the field? |
| **Directional Bias** | -5 to +5 | `Σ(orbStrength × polarity × planetWeight)` | `bias_x10` (int) | Which way does energy lean? |

**Key Principle:** Every number traces directly to specific aspects with specific orbs and planet weights.

### Aspect Base Weights (v5.0)
```
Trine: +0.40
Sextile: +0.25
Conjunction: ±0 (contextual)
Square: −0.50
Opposition: −0.45
```

### Modifiers
```
Angularity (ASC/MC): ±0.10–0.20
Applying: +0.10 / Separating: −0.05
Multi-stack pressure: −0.10
```

### Pre-Weight Orb Gate (Enforced Before Calculation)
```
Conjunction/Opposition: ≤8°
Square/Trine: ≤7°
Sextile: ≤5°
Moon modifier: +1° to cap
Outer→personal modifier: −1° to cap
```

---

## 🏗️ DATA ARCHITECTURE: MAP/FIELD SPLIT

v5.0 enforces Weather-Structure rule at the data layer.

### MAP File (Constitutional Geometry)
- **Purpose:** Permanent natal structure (never uses weather language)
- **Schema:** `wm-map-v1`
- **Contents:** Integer planetary positions, natal aspects, house cusps, provenance
- **Size:** 5-10KB

### FIELD File (Symbolic Weather)
- **Purpose:** Temporal activations (only when transits + auditable location exist)
- **Schema:** `wm-field-v1`
- **Contents:** Daily transit positions, transit house positions, filtered aspects, Balance Meter v5.0 readings
- **Size:** 200-400KB

### Compact Aspect Format
```
[tIdx, nIdx, aspKey, orb_cdeg, w*10]
- tIdx: Transit planet index (0-12)
- nIdx: Natal planet index (0-12)
- aspKey: Aspect type (0=cnj, 1=opp, 2=sq, 3=tri, 4=sex)
- orb_cdeg: Orb in centidegrees (±XXX)
- w*10: Weight × 10 (integer)
```

**Token Budget:** MAP (~2K) + FIELD (~50-75K) = ~52-77K total (well under 100K limit)

---

## 🔧 IMPLEMENTATION STATUS

### Core Files (v5.0 Complete)
| File | Purpose | Status |
|------|---------|--------|
| `src/math_brain/main.js` | v2 orchestrator | ✅ Complete |
| `src/seismograph.js` | Aspect aggregation | ✅ Complete |
| `lib/balance/scale.js` | Scaling functions | ✅ Complete |
| `lib/weatherDataTransforms.js` | Data transformation | ✅ Complete |
| `app/api/astrology-mathbrain/route.ts` | API integration | ✅ Complete |

### UI Components (v5.0 Complete)
| Component | Status |
|-----------|--------|
| `BalanceMeterSummary.tsx` | ✅ 2-axis display |
| `EnhancedDailyClimateCard.tsx` | ✅ v5.0 format |
| `WeatherPlots.tsx` | ✅ 2 plots only |
| `UnifiedSymbolicDashboard.tsx` | ✅ MAP/FIELD/Integration |

### Recent Fixes (Oct 18, 2025)
- ✅ **Symbolic Weather Normalization** - Fixed flattened values bug
  - Implemented 14-day rolling window
  - Added previous state tracking
  - Proper adaptive normalization per day

---

## 🚨 KNOWN ISSUES & FIXES

### Issue #1: Symbolic Weather Flattened to Max Values
**Status:** ✅ FIXED (Oct 18, 2025)

**Problem:** All daily entries reported constant magnitude: 5, directional_bias: -5

**Root Cause:** `computeSymbolicWeather()` called `aggregate()` without rolling context

**Solution:**
- Renamed to `computeSymbolicWeatherWithContext()`
- Added 14-day rolling window tracking
- Pass `rollingContext` to `aggregate()` function
- Track previous day state for continuity

**Files Modified:**
- `src/math_brain/main.js` (lines 38-62, 155-195)

---

## 📊 REPORT TYPES (v5.0)

### Mirror Flow Reports
- **Purpose:** Qualitative, recognition-first
- **Inputs:** Natal geometry (optional transits)
- **Location Sensitivity:** Low
- **Transits:** Optional

### Balance Meter Reports
- **Purpose:** Quantitative, transit-dependent
- **Inputs:** Natal + transits + date range + location
- **Location Sensitivity:** High (relocation recommended)
- **Transits:** Required

---

## 🎯 ROUTING LOGIC

```javascript
if (mode === 'balance_meter' || report_type.includes('balance_meter')) {
  // Use Math Brain v2 with date range requirement
  // High location sensitivity, relocation recommended
} else {
  // Use Mirror Flow (legacy system)
  // Low location sensitivity, transits optional
}
```

---

## 📝 VOICE PROTOCOL (v5.0)

### FIELD → MAP → VOICE Flow
1. **FIELD:** Raw astrological geometry (aspects, orbs, planets)
2. **MAP:** Measurement layer (Magnitude, Directional Bias)
3. **VOICE:** Narrative interpretation (lived mirror)

### Key Rules
- **No weather language for natal:** Only transits use "symbolic weather"
- **Falsifiability:** Every claim must be testable against lived experience
- **Possibility language:** "often correlates," never "will feel"
- **Grounded:** No mystical or moral terms

---

## 🔍 FALSIFIABILITY TEST

### v4.0 (Failed)
**User:** "Where does this Coherence score of 4.2 come from?"
**System:** "It's the inverse of volatility, which is the standard deviation of aspect weight distribution..."
**Result:** ❌ Not traceable to specific geometry

### v5.0 (Passes)
**User:** "Where does this Magnitude of 3.8 come from?"
**System:** "Here are the 12 aspects: Sun square Mars (orb 0.5°) → weight 2.1, Moon trine Venus (orb 2.1°) → weight 1.4, ... Total: 3.8"
**Result:** ✅ Fully traceable, verifiable against ephemeris

---

## 🧹 DOCUMENTATION CLEANUP CHECKLIST

### ✅ Completed
- [x] Removed 4-axis system documentation
- [x] Deleted outdated v3/v4 files
- [x] Marked deprecated files with warnings
- [x] Updated PRIMARY REFERENCE document
- [x] Consolidated v5.0 specs
- [x] Fixed symbolic weather normalization bug

### ⚠️ Needs Attention
- [ ] `lib/uncanny-scoring-spec.md` - Complete rewrite for v5.0
- [ ] `docs/POETIC_BRAIN_V1_SNAPSHOT.md` - Update lexicon for v5.0
- [ ] Search codebase for remaining SFD/Coherence references
- [ ] Verify all test fixtures use v5.0 format

### 🔍 Verification Commands
```bash
# Check for remaining SFD references
grep -r "sfd\|SFD" --include="*.js" --include="*.ts" src/ lib/ app/ | \
  grep -v "deprecated\|legacy\|v4\|comment"

# Check for Coherence references
grep -r "coherence\|Coherence" --include="*.js" --include="*.ts" src/ lib/ app/ | \
  grep -v "deprecated\|legacy\|v4\|comment"

# Check for "four axes" references
grep -r "four axes\|4 axes\|fourth axis" --include="*.md" .
```

---

## 📚 COMPLETE FILE REFERENCE

### PRIMARY REFERENCE
- **`/Developers Notes/Core/Four Report Types_Integrated 10.1.25.md`** ⭐ AUTHORITATIVE

### SPECIFICATIONS
- `BALANCE_METER_V5_COMPLETE.md` - Philosophy & architecture
- `V5_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `MATH_BRAIN_V2_COMPLETE.md` - v2 orchestrator
- `CHANGELOG_v5.0_UNIFIED_DASHBOARD.md` - Complete changelog

### GUIDES
- `docs/UNIFIED_DASHBOARD_GUIDE.md` - Feature guide
- `docs/UNIFIED_DASHBOARD_IMPLEMENTATION_COMPARISON.md` - Spec comparison
- `DEPLOYMENT_TROUBLESHOOTING.md` - Cache & deployment
- `docs/REFACTOR_UNIFIED_NATAL_ARCHITECTURE.md` - Architecture

### DEPRECATED (Historical Only)
- ⚠️ `lib/uncanny-scoring-spec.md` - Needs rewrite
- ⚠️ `docs/POETIC_BRAIN_V1_SNAPSHOT.md` - Historical snapshot
- ⚠️ `Developers Notes/Core/A Strange Cosmic Symbolism v4.md` - Partially outdated

### DELETED (No Longer Used)
- ❌ `Developers Notes/Implementation/Fixing the Balance Meter math 10.4.25.md`
- ❌ `Developers Notes/Math Brain Ideas/A Strange Cosmic Symbolism v3.md`

---

## 🎓 QUICK START BY ROLE

### I'm New to the Project
1. Read `/README.md` (Quick start)
2. Read `/Developers Notes/Core/Four Report Types_Integrated 10.1.25.md` (PRIMARY REFERENCE)
3. Read `BALANCE_METER_V5_COMPLETE.md` (Philosophy)

### I'm Implementing a Feature
1. Check PRIMARY REFERENCE for specs
2. Review `V5_IMPLEMENTATION_SUMMARY.md` for implementation details
3. Follow `/Developers Notes/Lessons Learned/MAINTENANCE_GUIDE.md`

### I'm Debugging an Issue
1. Check `/CHANGELOG.md` for recent changes
2. See `/Deployment_TROUBLESHOOTING.md` for cache issues
3. Review memory: "Bug Fix: Flattened Symbolic Weather Normalization"

### I'm Working on Balance Meter
1. Read `BALANCE_METER_V5_COMPLETE.md` (Executive summary)
2. Read `V5_IMPLEMENTATION_SUMMARY.md` (Technical details)
3. Check `CHANGELOG_v5.0_UNIFIED_DASHBOARD.md` (Complete changelog)

---

## 🏆 ARCHITECTURAL PRINCIPLES (v5.0)

### 1. Geometry First
Every metric must trace directly to specific aspects with specific orbs.

### 2. No Meta-Derivatives
No smoothing, no statistical layers, no composite products between raw geometry and output.

### 3. Weather-Structure Separation
- **MAP:** Permanent natal structure (no weather language)
- **FIELD:** Temporal transits (weather language only)

### 4. Falsifiability
Every claim must be testable against lived experience and ephemeris data.

### 5. True Accelerometer
Measure what the sky is doing, not what we think about it.

---

## 📞 SUPPORT & MAINTENANCE

**Primary Contact:** Dan Cross (DHCross)
**Last Updated:** October 18, 2025
**Status:** ✅ Production Ready

**For Issues:**
- Check this document first
- Review PRIMARY REFERENCE
- See CHANGELOG for recent changes
- Check memory for known bugs

---

## 🔐 VERSION HISTORY

| Version | Date | Status | Key Changes |
|---------|------|--------|------------|
| v5.0.0 | Oct 18, 2025 | ✅ PRODUCTION | Symbolic weather normalization fix |
| v5.0.0 | Oct 12, 2025 | ✅ PRODUCTION | Post-refactor build 2, unified natal architecture |
| v5.0.0 | Oct 9, 2025 | ✅ PRODUCTION | Initial release, v4→v5 transition |
| v4.0 | Oct 8, 2025 | ⚠️ DEPRECATED | 3-axis system (Magnitude, Directional Bias, Coherence) |
| v3.1 | Earlier | ❌ OBSOLETE | 4-axis system (removed) |

---

**This document is the authoritative consolidated reference for Balance Meter v5.0. When in doubt, check the PRIMARY REFERENCE document.**
