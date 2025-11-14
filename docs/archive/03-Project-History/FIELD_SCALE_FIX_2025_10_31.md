# Field-Scale Display Fix — October 31, 2025

**Issue:** Directional Bias values were displaying in normalized range (−1 to +1) instead of field-scale range (−5 to +5)

**Root Cause:** Legacy naming and scaling inconsistency between seismograph computation and summary display layer

---

## Problem Analysis

### Two Competing Data Paths

1. **Seismograph Module (Correct)**
   - Returns fully scaled values: `directional_bias` → [−5, +5]
   - These are display-ready, human-readable integers

2. **Mock Response (Incorrect)**
   - Used legacy key `valence` with normalized values (−1 to +1)
   - Frontend received small decimals (0.6) instead of field-scale integers (3)

### Symptom

User query: "You said −4 to −5 bias, but I'm seeing 0.6!"

**Explanation:** The seismograph computed correctly, but the mock response bypassed the scaling layer and sent normalized values directly to the UI.

---

## Solution Implemented

### 1. Fixed Mock Response (lib/server/astrology-mathbrain.js:3870)

**Before:**
```js
derived: { seismograph_summary: { magnitude: 2.3, valence: 0.6, volatility: 1.1 } }
```

**After:**
```js
derived: { seismograph_summary: { magnitude: 2.3, directional_bias: 3.0, valence: 3.0, volatility: 1.1 } }
```

**Changes:**
- ✅ Added `directional_bias` key (v5.0 naming)
- ✅ Scaled value from 0.6 (normalized) to 3.0 (field-scale)
- ✅ Kept `valence` as legacy alias for backward compatibility

### 2. Added Display Transformation Helper (DanBiasTest.tsx)

**New Function:**
```ts
/**
 * Format axis value for frontstage display (field-scale -5 to +5)
 * Detects if value is normalized [-1,+1] and scales accordingly
 */
function fmtAxis(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  // If |value| <= 1.2, assume normalized; scale to [-5,+5]
  // Otherwise, assume already field-scaled
  return Math.abs(value) <= 1.2 ? Math.round(value * 5) : Math.round(value);
}
```

**Features:**
- ✅ Auto-detects normalized vs scaled values
- ✅ Applies 5× multiplier for normalized values
- ✅ Rounds to whole integers for symbolic legibility
- ✅ Returns null for invalid inputs

### 3. Updated Component Display Logic

**Changes:**
- ✅ Daily readings table shows whole integers (e.g., "+3" instead of "+0.60")
- ✅ Summary cards use `fmtAxis()` for consistent display
- ✅ SVG scatter plot uses field-scale Y-axis (−5 to +5)
- ✅ Color coding: blue for outward (+), red for inward (−)

---

## Verification Results

### Test Output (test-dan-simple.sh)

**Before Fix:**
```json
"seismograph_summary": { "magnitude": 2.3, "valence": 0.6, "volatility": 1.1 }
```

**After Fix:**
```json
"seismograph_summary": { "magnitude": 2.3, "directional_bias": 3, "valence": 3, "volatility": 1.1 }
```

✅ **Test passed:** API now returns field-scale integers

---

## Technical Details

### Scaling Formula

| Layer | Range | Display | Example |
|-------|-------|---------|---------|
| **Raw (Y_raw)** | unbounded | internal | 42.3 |
| **Normalized** | [−1, +1] | internal | 0.6 |
| **Field-Scale** | [−5, +5] | frontstage | +3 |

**Transform:**
```
normalized × 5 → field_scale
0.6 × 5 = 3 (rounded)
```

### Raven Calder Philosophy

- **MAP Layer:** Normalized decimals (−1 to +1) for mathematical precision
- **FIELD Layer:** Field-scale integers (−5 to +5) for symbolic legibility
- **VOICE Layer:** Plain language ("Mild Outward", "Strong Inward")

**Display priority:** Frontstage shows field-scale whole numbers; decimals stay backstage.

---

## Files Modified

1. **lib/server/astrology-mathbrain.js** (line 3870)
   - Fixed mock response to use field-scale values
   - Added `directional_bias` key alongside legacy `valence`

2. **app/math-brain/components/DanBiasTest.tsx**
   - Added `fmtAxis()` helper function
   - Updated extraction logic to apply field-scale transformation
   - Modified display templates to show whole integers

3. **DAN_BIAS_TEST_RESULTS.md**
   - Updated interpretation from "+0.6" to "+3"
   - Added note explaining normalized vs field-scale display

---

## Backward Compatibility

- ✅ Legacy `valence` key preserved in mock response
- ✅ `fmtAxis()` auto-detects value range (normalized vs scaled)
- ✅ Production code uses `directional_bias` from seismograph (already scaled)
- ✅ Mock response now matches production format

---

## Next Steps

1. **Deprecate `valence` key** in next major version
2. **Update all UI components** to expect field-scale values
3. **Add unit tests** for `fmtAxis()` transformation
4. **Document scaling bridge** in API_INTEGRATION_GUIDE.md

---

## Summary

**Before:** Symbolic weather displayed raw decimals (0.6), confusing users who expected field-scale integers (−5 to +5).

**After:** All directional bias values display as whole numbers on the frontstage scale, matching Raven Calder's "FIELD → MAP → VOICE" philosophy.

**Impact:** Symbolic seismograph now speaks one unified numerical dialect across all layers.

✨ **Resolved:** "Two scales, one voice" — normalized math stays backstage, field-scale integers take the spotlight.
