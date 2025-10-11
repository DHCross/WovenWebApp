# Balance Meter Math Fixes - October 11, 2025

## Summary

Fixed two critical bugs in the Balance Meter calculation that were causing incorrect directional bias and magnitude saturation.

---

## Bug #1: Amplifier Implementation Mismatch

### Problem

The JavaScript and TypeScript implementations of `amplifyByMagnitude` and `normalizeAmplifiedBias` were completely different, causing incorrect directional bias calculations.

**TypeScript** (`lib/balance/amplifiers.ts`) - Spec-compliant:
```typescript
amplifyByMagnitude(rawBias, magnitude0to5) {
  const amplificationFactor = 0.8 + 0.4 * magnitude0to5;  // 0.8x to 2.8x range
  return rawBias * amplificationFactor;
}

normalizeAmplifiedBias(amplifiedBias) {
  return amplifiedBias / 10;  // Simple division
}
```

**JavaScript** (`lib/balance/amplifiers.js`) - INCORRECT:
```javascript
amplifyByMagnitude(sumS, magnitude0to5) {
  const k = 0.08;
  return sumS * (1 + k * (magnitude0to5 - 2.5));  // 0.9x to 1.1x range - TOO GENTLE
}

normalizeAmplifiedBias(amplifiedBias, context) {
  const divisor = Math.max(1, context.energy) * 1.1;  // Energy-based - WRONG
  return amplifiedBias / divisor;
}
```

### Impact

- Directional bias was under-amplified on high-magnitude days
- Bias normalization used magnitude energy instead of a fixed divisor
- This caused bias values to be flattened and inconsistent

### Fix

**File:** `lib/balance/amplifiers.js`

Updated to match TypeScript spec exactly:
```javascript
function amplifyByMagnitude(rawBias, magnitude0to5) {
  const amplificationFactor = 0.8 + 0.4 * magnitude0to5;
  return rawBias * amplificationFactor;
}

function normalizeAmplifiedBias(amplifiedBias) {
  const normalized = amplifiedBias / BIAS_DIVISOR;  // BIAS_DIVISOR = 10
  if (normalized > 1) return 1;
  if (normalized < -1) return -1;
  return normalized;
}
```

**File:** `src/seismograph.js`

Removed context parameters from call:
```javascript
const Y_amplified = amplifyByMagnitude(Y_raw, magnitudeValue);
const Y_normalized = normalizeAmplifiedBias(Y_amplified);  // No context param
```

---

## Bug #2: Magnitude Saturation

### Problem

The `magnitudeDivisor` constant was set to 4, which was calibrated before geometry amplification was added. Geometry amplification boosts tight outer-planet aspects by 1.5-2x, causing magnitude to saturate at the maximum value (5.0) even for moderate aspect loads.

**Example:**
- 4 aspects with geometry amplification: X_raw = 15.33
- With divisor = 4: `magnitude_normalized = min(1, 15.33 / 4) = 1` (saturated!)
- Result: `magnitude = 1 × 5 = 5.0` (maximum)

### Impact

- Magnitude values stuck at 5.0 for most charts
- Loss of granularity in magnitude readings
- Balance Meter unable to distinguish between different intensity levels

### Fix

**File:** `src/seismograph.js`

Increased default magnitude divisor to partially compensate for geometry amplification:
```javascript
const DEFAULTS = {
  magnitudeDivisor: 8,  // Increased from 4 to account for geometry amplification
  // ...
};
```

### Status

✅ **Partially Fixed** - Magnitude saturation reduced but not eliminated

**Note:** Test expectations may need updating as they were written for pre-amplification values. Some tests still expect magnitude values in the 2.0-4.9 range, which may require divisor ~40 or revised test expectations based on current amplification behavior.

---

## Files Changed

1. **`lib/balance/amplifiers.js`** - Unified with TypeScript spec
2. **`src/seismograph.js`** - Increased magnitude divisor, removed context param from normalizeAmplifiedBias call

---

## Test Results

- **Before fixes:** 18 failed tests
- **After fixes:** 17 failed tests
- **Remaining issues:** Magnitude saturation tests (triwheel-validation.test.ts) still failing

### Remaining Test Failures

The triwheel validation tests expect:
- Magnitude 2.0, 2.3, 4.9 for three test cases
- Currently getting: 5.0 for all three

**Analysis:** Test expectations appear to be based on pre-amplification behavior. Either:
1. Increase divisor to ~40 (very high, may cause other issues)
2. Update test expectations to match post-amplification behavior
3. Adjust geometry amplification factors

---

## Verification

To verify the fixes in production:

1. **Check Directional Bias:** Should now show stronger amplification on high-magnitude days
2. **Check Magnitude Variability:** Should see more variation (not all 5.0), though may still saturate on very high-aspect days
3. **Monitor over time:** Rolling window normalization will self-correct as data accumulates

---

## Related Documentation

- [Balance Meter v5.0 Complete](BALANCE_METER_V5_COMPLETE.md) - Current spec
- [Balance Meter Index](BALANCE_METER_INDEX.md) - Documentation index
- [Seismograph Diagnostics](docs/SEISMOGRAPH_DIAGNOSTICS.md) - Diagnostic guide

---

---

## Update 2: Scatter Plot Visualization (True Accelerometer Display)

### Problem

The weather charts were using SVG line plots instead of scatter plots, which doesn't align with the True Accelerometer v5.0 philosophy. Scatter plots are needed to:
- Show each measurement as a discrete point (tremor)
- Color-code points by directional bias (diverging colormap)
- Avoid artificial smoothing/interpolation
- Support multi-entity relational maps

### Solution

Created **`AccelerometerScatter.tsx`** component that:
- Uses Chart.js scatter plot type
- **Y-axis:** Magnitude (0-5) - "How loud is the field?"
- **Color:** Directional Bias mapped to diverging colormap:
  - Red (`rgb(220, 38, 38)`) = Contractive (-5)
  - Gray (`rgb(148, 163, 184)`) = Neutral (0)
  - Blue (`rgb(0, 130, 246)`) = Expansive (+5)
- **X-axis:** Date (categorical)
- Point size: 8px (hover: 10px)
- Dynamic import to avoid SSR issues

### Philosophy Alignment

**"The scatter plot is the diagnostic seismograph of the symbolic world"**
- Each dot = measurable tremor
- Axis labels = calibrated instruments
- Color = vector lean
- Pattern = where poetry begins

The visualization follows the core v5.0 mandate:
- ✅ No synthetic smoothing
- ✅ No derivative indices
- ✅ Scaling verification (±5, 0-5 enforced)
- ✅ Direct traceability to geometry

### Files Changed

- **Created:** `components/mathbrain/AccelerometerScatter.tsx` - Scatter plot component
- **Updated:** `components/mathbrain/WeatherPlots.tsx` - Now uses scatter plot by default

### Usage

```tsx
<WeatherPlots data={weatherData} showScatter={true} />
```

Toggle `showScatter={false}` to revert to legacy line plots for comparison.

---

**Date:** October 11, 2025  
**Author:** AI Assistant (Cascade)  
**Reported By:** User (website math issues)
