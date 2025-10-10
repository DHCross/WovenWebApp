# Seismograph Diagnostic Implementation Summary

## Overview

Comprehensive diagnostic logging has been added to the seismograph pipeline to troubleshoot issues where magnitude and directional bias values appear stuck, clamped, or unresponsive to changes in astrological data.

## What Was Implemented

### 1. **Core Diagnostic Logger** ([seismograph.js:317-331](src/seismograph.js#L317-L331))

A flexible logging function that only outputs when `enableDiagnostics: true` is passed in options.

```javascript
function logDiagnostics(data, options = {}) {
  if (!options.enableDiagnostics) return;
  const label = options.label || 'DIAGNOSTIC';
  console.log(`[${label}]`, JSON.stringify(data, null, 2));
}
```

### 2. **Six Diagnostic Stages**

Each critical point in the transformation pipeline now logs detailed information:

#### **Stage 1: Aspect Input Validation** ([seismograph.js:335-349](src/seismograph.js#L335-L349))
- Logs: aspect count, array validity, sample aspects
- Detects: empty arrays, malformed aspects
- **Purpose:** Ensure aspects are being received correctly

#### **Stage 2: Aspect Scoring** ([seismograph.js:431-456](src/seismograph.js#L431-L456))
- Logs: score distribution (positive/negative/zero), score range, sample scored aspects
- Detects: uniform scores, unexpected filtering
- **Purpose:** Verify aspects are converting to S values correctly

#### **Stage 3: Geometry Amplification** ([seismograph.js:478-493](src/seismograph.js#L478-L493))
- Logs: amplification count, before/after samples, amplification factors
- Detects: missing amplification, excessive amplification
- **Purpose:** Ensure tight/outer aspects get proper boost

#### **Stage 4: Magnitude Normalization** ([seismograph.js:568-584](src/seismograph.js#L568-L584))
**⭐ CRITICAL FOR STUCK VALUES**
- Logs: scaling method, effective divisor, raw → normalized transformation
- Detects: saturation, wrong divisor, rolling window not used
- **Purpose:** Identify why magnitude is stuck at 0 or 5

#### **Stage 5: Bias Normalization & Clamping** ([seismograph.js:598-622](src/seismograph.js#L598-L622))
**⭐ CRITICAL FOR STUCK VALUES**
- Logs: complete pipeline (raw → amplified → normalized → scaled → clamped)
- Detects: clamping events, over-amplification, normalization issues
- **Purpose:** Identify why directional bias is stuck at -5 or +5

#### **Stage 6: Final Summary** ([seismograph.js:681-713](src/seismograph.js#L681-L713))
**⭐ STUCK VALUE DETECTION**
- Logs: final axes, raw-to-final comparison, clamp warnings, variability check
- Detects: **values stuck at boundaries** across multiple days
- **Purpose:** High-level overview with automatic warnings

### 3. **Enhanced Rolling Window Diagnostics** ([seismograph.js:269-352](src/seismograph.js#L269-L352))

The `normalizeWithRollingWindow` function now logs:
- Window size and contents
- Window statistics (min, max, avg)
- Calculation method (full window, partial blend, single day)
- Exact formula used
- Warnings when fallback to static divisor

**Key diagnostic:** If window contains identical values (e.g., [4, 4, 4, 4]), it's not being updated properly.

### 4. **Enhanced Diagnostics Object** ([seismograph.js:658-664](src/seismograph.js#L658-L664))

The returned `_diagnostics` object now includes:
```javascript
_diagnostics: {
  volatility: number,
  volatility_normalized: number,
  aspect_count: number,
  scaling_method: string,        // NEW: shows which normalization strategy used
  effective_divisor: number,     // NEW: shows actual divisor applied
  warnings: string[]             // NEW: for empty aspect arrays
}
```

## Files Modified

### Core Implementation
- **[src/seismograph.js](src/seismograph.js)** - Added 6 diagnostic stages + enhanced rolling window logging

### Documentation
- **[docs/SEISMOGRAPH_DIAGNOSTICS.md](docs/SEISMOGRAPH_DIAGNOSTICS.md)** - Comprehensive guide (50+ sections)
- **[docs/DIAGNOSTIC_QUICK_REFERENCE.md](docs/DIAGNOSTIC_QUICK_REFERENCE.md)** - Quick reference card

### Tests
- **[__tests__/seismograph-diagnostics-example.test.js](/__tests__/seismograph-diagnostics-example.test.js)** - 11 test cases demonstrating diagnostic usage

## How to Use

### Basic Usage

```javascript
const { aggregate } = require('./src/seismograph');

const result = aggregate(aspects, prevContext, {
  enableDiagnostics: true
});
```

This will log all 6 stages to console, showing the complete transformation pipeline.

### With Rolling Context

```javascript
const result = aggregate(aspects, prevContext, {
  enableDiagnostics: true,
  rollingContext: {
    magnitudes: [3.2, 4.1, 3.8, 4.5, 3.9, 4.2, ...] // Last 14 days of X_raw
  }
});
```

This additionally shows rolling window calculation and whether it's being used.

### Multi-Day Testing

```javascript
const days = [day1Aspects, day2Aspects, day3Aspects];
const results = days.map((aspects, i) => {
  console.log(`\n=== Day ${i + 1} ===`);
  return aggregate(aspects, null, { enableDiagnostics: true });
});

// Check for stuck values
const magnitudes = results.map(r => r.magnitude);
if (magnitudes.every(m => m === magnitudes[0])) {
  console.warn('⚠️ MAGNITUDES STUCK - all days identical!');
}
```

## Run the Example Tests

```bash
# Run diagnostic example (shows all 6 stages in action)
npm test __tests__/seismograph-diagnostics-example.test.js

# Run with verbose output to see all logs
npm test __tests__/seismograph-diagnostics-example.test.js -- --verbose
```

## Troubleshooting Workflow

### Problem: Values stuck at max/min

1. **Enable diagnostics** for 3-5 consecutive days
2. **Check Stage 4 ([MAGNITUDE_NORM])**:
   - Is `magnitude_normalized` always 1.0? → Saturation (divisor too small)
   - Is `scaling_method` always `static_divisor`? → Rolling window not used
   - Is `effective_divisor` always 4 with 100+ aspects? → Should use adaptive
3. **Check Stage 5 ([BIAS_NORM])**:
   - Is `was_clamped` true every day? → Hitting boundaries
   - Is `Y_normalized` always ±1.0? → Over-amplification
4. **Check Stage 6 ([SUMMARY])**:
   - Does `variability_check.potential_stuck_values` = true? → Confirmed stuck
   - Review `raw_to_final_comparison` to see where values get stuck

### Problem: Rolling window not working

1. **Check Stage 4 ([MAGNITUDE_NORM])**:
   - Verify `scaling_method` includes `rolling_window_nX`
   - Check `effective_divisor` changes day-to-day
2. **Check [ROLLING_WINDOW] log**:
   - `window_contents` should show daily variation, not [4, 4, 4, 4]
   - `window_stats.min` and `max` should differ
   - Check `method` is `full_window_median` or `partial_window_blend`, not `single_day_prior`

### Problem: Aspects missing/filtered

1. **Check Stage 1 ([INPUT])**:
   - Verify `received_count` matches expectations
   - Check `sample_aspects` structure
2. **Check Stage 2 ([SCORING])**:
   - If `total_aspects < received_count`, aspects were filtered during normalization
   - Common causes: orb > 6°, invalid aspect types, malformed transit/natal bodies

## Key Diagnostic Outputs Explained

### Magnitude Normalization Formula

```
[MAGNITUDE_NORM] → normalization.formula:
"min(1, 12.5 / 4) = 1.0"
       ↑    ↑      ↑
    X_raw  divisor  normalized (SATURATED!)
```

If normalized is always 1.0, you're saturating the scale.

### Bias Transformation Pipeline

```
[BIAS_NORM] → values:
Y_raw: -15.2 → Y_amplified: -18.5 → Y_normalized: -1.0 → scaled: -5.0 → final: -5
                                                    ↑
                                            STUCK AT BOUNDARY
```

If Y_normalized is ±1.0, the amplification or energy normalization is too aggressive.

### Variability Check

```
[SUMMARY] → variability_check:
{
  magnitude_at_boundary: true,      // magnitude is 0 or 5
  bias_at_boundary: true,           // bias is -5 or +5
  potential_stuck_values: true      // ⚠️ BOTH at boundaries - likely stuck!
}
```

If this appears on multiple consecutive days, values are likely frozen.

## What the Diagnostics Detect

### ✅ Automatic Detection Of:

- Empty or missing aspect arrays
- Aspect filtering/exclusion
- Score distribution anomalies (all positive, all negative, all zero)
- Missing or incomplete rolling window context
- Static rolling window (not updating)
- Wrong scaling method (static when should be rolling)
- Saturation (magnitude_normalized = 1.0)
- Under-scaling (magnitude_normalized always near 0)
- Clamping events (hitting ±5 boundaries)
- Over-amplification (Y_normalized = ±1.0)
- Stuck values across multiple days
- Values at boundaries (0 or ±5)
- Raw values changing but finals staying same

## Performance Impact

- **With diagnostics OFF** (default): Zero overhead
- **With diagnostics ON**: Minimal overhead (only console.log calls)
- Diagnostics are **opt-in** and **disabled by default**

## Backward Compatibility

✅ **Fully backward compatible**
- Diagnostics are opt-in via `enableDiagnostics: true`
- Default behavior unchanged
- All existing tests pass
- No breaking changes to API or return values

## Next Steps

### To Debug Your Stuck Values:

1. **Enable diagnostics on your production data**:
   ```javascript
   const result = aggregate(aspects, prevCtx, { enableDiagnostics: true });
   ```

2. **Run for 3-5 consecutive days** to see if values vary

3. **Review the 6 diagnostic stages** in order:
   - Stage 1: Are aspects being received?
   - Stage 2: Are they scoring correctly?
   - Stage 3: Are tight/outer aspects amplified?
   - Stage 4: **Is magnitude normalization working?** ⭐
   - Stage 5: **Is bias normalization working?** ⭐
   - Stage 6: **Are values stuck at boundaries?** ⭐

4. **Compare with expected behavior** using the guide in `docs/SEISMOGRAPH_DIAGNOSTICS.md`

5. **Identify the stuck stage** and apply the relevant fix from the documentation

## Example Output

When you run diagnostics, you'll see output like this:

```
[INPUT] {
  "step": "ASPECT_INPUT_VALIDATION",
  "received_count": 5,
  "sample_aspects": [...]
}

[SCORING] {
  "step": "ASPECT_SCORING",
  "total_aspects": 5,
  "score_distribution": { "positive": 1, "negative": 4, "near_zero": 0 }
}

[AMPLIFICATION] {
  "amplified_count": 5,
  "samples": [{ "aspect": "Saturn square Sun", "factor": 1.783 }]
}

[MAGNITUDE_NORM] {
  "scaling_method": "static_divisor",
  "effective_divisor": 4,
  "magnitude_normalized": 0.825
}

[BIAS_NORM] {
  "was_clamped": false,
  "Y_normalized": 0.75
}

[SUMMARY] {
  "public_axes": { "magnitude": 4.1, "directional_bias": 3.8 },
  "variability_check": { "potential_stuck_values": false },
  "warnings": []
}
```

If values are stuck, you'll see warnings like:
```
⚠️ VALUES AT BOUNDARIES - Check if stuck at extremes across multiple days
```

---

## Questions?

Refer to:
- **[docs/SEISMOGRAPH_DIAGNOSTICS.md](docs/SEISMOGRAPH_DIAGNOSTICS.md)** - Full troubleshooting guide
- **[docs/DIAGNOSTIC_QUICK_REFERENCE.md](docs/DIAGNOSTIC_QUICK_REFERENCE.md)** - Quick reference card
- **[__tests__/seismograph-diagnostics-example.test.js](/__tests__/seismograph-diagnostics-example.test.js)** - Working examples

The diagnostic system is designed to pinpoint exactly where in the pipeline values diverge from expected behavior, making it much easier to identify and fix issues with stuck, clamped, or frozen values.
