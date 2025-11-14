# Seismograph Pipeline Diagnostics Guide

## Overview

The seismograph pipeline now includes comprehensive diagnostic logging to help troubleshoot issues where values appear stuck, clamped, or unresponsive to actual astrological data changes.

## Quick Start

Enable diagnostics by passing `enableDiagnostics: true` in the options:

```javascript
const { aggregate } = require('./src/seismograph');

const result = aggregate(aspects, prevContext, {
  enableDiagnostics: true,
  rollingContext: { magnitudes: [3.2, 4.1, 3.8, ...] } // optional
});
```

## Diagnostic Stages

The pipeline logs diagnostics at 6 key stages:

### Stage 1: Aspect Input Validation
**Label:** `[INPUT]`

Logs what aspects were received and validates the input array.

**What to check:**
- `received_count` - Should match expected number of aspects
- `sample_aspects` - Verify aspects have correct structure (transit, natal, type, orb)
- Look for missing or malformed aspects

**Red flags:**
- Aspect count is 0 when you expect aspects
- Sample aspects have `undefined` or `?` for transit/natal bodies
- Orb values are outside expected ranges (> 6°)

---

### Stage 2: Aspect Scoring
**Label:** `[SCORING]`

Shows how aspects were converted to numerical scores (S values).

**What to check:**
- `total_aspects` - Should match input count (if different, check filtering)
- `score_distribution` - Balance of positive vs negative aspects
- `score_range` - Min/max/avg scores
- `sample_scored_aspects` - Verify S values make sense

**Red flags:**
- All scores are near zero (< 0.1) - may indicate scoring bug
- Distribution heavily skewed (e.g., 100% negative) without cause
- Min/max are identical across days (suggests static values)

---

### Stage 3: Geometry Amplification
**Label:** `[AMPLIFICATION]`

Shows which aspects received amplification based on orb tightness and outer planets.

**What to check:**
- `amplified_count` - How many aspects were boosted
- `samples` - Shows before/after and amplification factor
- Aspects with orb < 1° and outer planets should show amplification

**Red flags:**
- No amplification when you have tight outer planet aspects
- Amplification factors are always 1.0 (no change)
- Excessive amplification (factor > 2.0) without justification

---

### Stage 4: Magnitude Normalization
**Label:** `[MAGNITUDE_NORM]`

Critical stage showing how raw energy (X_raw) becomes normalized magnitude.

**What to check:**
- `scaling_method` - Should be `rolling_window_nX` if context provided, otherwise `static_divisor` or `aspect_adaptive`
- `effective_divisor` - The divisor used (default 4 for solo charts, higher for relational)
- `magnitude_normalized` - Should be 0.0-1.0 before scaling
- `formula` - Shows the exact calculation

**Red flags:**
- ⚠️ **Always using `static_divisor` when rolling context is provided** - Window is not being used!
- **effective_divisor is always 4** across multiple days - No adaptation happening
- **magnitude_normalized is always 1.0** - Saturation! Raw values too high or divisor too low
- **magnitude_normalized is always near 0** - Raw values too low or divisor too high

---

### Stage 5: Bias Normalization & Clamping
**Label:** `[BIAS_NORM]`

Shows the complete bias transformation pipeline and detects clamping.

**What to check:**
- `values` pipeline: `Y_raw → Y_amplified → Y_normalized → bias_scaled_raw → directional_bias_final`
- `clamping.was_clamped` - True if value hit ±5 boundary
- `clamping.clamped_amount` - How much was cut off

**Red flags:**
- ⚠️ **was_clamped is true every day** - You're hitting boundaries constantly
- **Y_normalized is always ±1.0** - Over-amplification or under-normalization
- **amplification_factor is always 1.0** - Magnitude-based amplification not working
- **Raw and final values identical across days** - Pipeline frozen

---

### Stage 6: Final Summary
**Label:** `[SUMMARY]`

High-level overview and stuck value detection.

**What to check:**
- `public_axes` - Final magnitude and directional_bias
- `raw_to_final_comparison` - Complete transformation chain for both axes
- `clamp_warnings` - Any clamping detected
- `variability_check` - Flags if values are at boundaries
- `warnings` - Alerts if values may be stuck

**Red flags:**
- ⚠️ **"VALUES AT BOUNDARIES"** warning appears on multiple consecutive days
- **Both magnitude and bias at extremes** (0 or ±5) - Likely stuck
- **Raw values change but finals don't** - Something overwriting computed values

---

## Common Issues & Solutions

### Issue 1: Values Always at Max/Min (Stuck at Boundaries)

**Symptoms:**
- Magnitude always 5 or 0
- Directional bias always -5 or +5
- `variability_check.potential_stuck_values` is true

**Diagnosis:**
1. Check `[MAGNITUDE_NORM]` log:
   - Is `magnitude_normalized` always 1.0? → Divisor too small
   - Is effective_divisor always 4 with 100+ aspects? → Should use adaptive scaling
2. Check `[BIAS_NORM]` log:
   - Is `was_clamped` always true? → Values hitting boundaries
   - Check `Y_normalized` - should be -1.0 to +1.0, not stuck at extremes

**Solutions:**
- Provide rolling context to enable dynamic normalization
- For relational charts (100+ aspects), verify aspect-adaptive divisor is activating
- Check if crisis mode is over-restricting supportive aspects

---

### Issue 2: Rolling Window Not Working

**Symptoms:**
- `scaling_method` shows `static_divisor` when rolling context provided
- Window contents show all identical values (e.g., [4, 4, 4, 4])
- effective_divisor is always 4

**Diagnosis:**
1. Check `[ROLLING_WINDOW]` log:
   - `window_contents` should show variation across days
   - `window_stats.min` and `max` should differ
   - If `warning: "Using fallback divisor"` appears, context is malformed

**Solutions:**
```javascript
// Ensure rolling context has this structure:
const rollingContext = {
  magnitudes: [3.2, 4.1, 3.8, 4.5, ...] // Array of raw X values from recent days
};

// NOT this:
const badContext = {
  magnitudes: 4 // ❌ Should be array
};
```

- Verify magnitudes array is populated with actual daily X_raw values
- Check array length is increasing day-by-day (up to 14)
- Ensure you're appending new values each day, not overwriting

---

### Issue 3: Aspect Count Dropping Unexpectedly

**Symptoms:**
- `received_count` is 100 but `total_aspects` is 30
- Expected aspects missing from output
- Magnitude unexpectedly low

**Diagnosis:**
1. Check `[INPUT]` log:
   - Verify `received_count` matches expectations
   - Check `sample_aspects` for malformed data
2. Check `[SCORING]` log:
   - If `total_aspects < received_count`, aspects were filtered during normalization
   - Review sample_scored_aspects for patterns (all same type? all high orb?)

**Solutions:**
- Verify aspect orb values are within range (typically < 6°)
- Check aspect types are valid: conjunction, square, opposition, trine, sextile
- Ensure transit/natal bodies are named correctly (not undefined)

---

### Issue 4: Raw Values Changing But Finals Don't

**Symptoms:**
- `X_raw` varies (e.g., 12.3, 15.8, 10.2) but magnitude is always 5
- `Y_raw` varies but directional_bias is always -5

**Diagnosis:**
1. Check `[SUMMARY]` → `raw_to_final_comparison`:
   - Trace where the value gets stuck in the pipeline
   - Example: `12.3 → norm:1.0 → scaled:5.2 → final:5` ← Clamped!
2. Check `clamp_warnings`:
   - If clamping every day, raw values are too extreme for the scale

**Solutions:**
- If using rolling context: values will self-correct as window fills
- If using static divisor: increase `magnitudeDivisor` option:
  ```javascript
  aggregate(aspects, null, {
    magnitudeDivisor: 8 // default is 4
  });
  ```
- For relational charts, ensure aspect count > 60 to trigger adaptive scaling

---

## Testing Diagnostics

Run the example test to see all diagnostics in action:

```bash
npm test __tests__/seismograph-diagnostics-example.test.js
```

This test demonstrates:
- ✅ All 6 diagnostic stages
- ✅ Clamping detection
- ✅ Rolling window validation
- ✅ Empty aspect handling
- ✅ Multi-day variability checks
- ✅ Real-world troubleshooting scenarios

---

## Multi-Day Debugging Strategy

To diagnose stuck values across multiple days:

```javascript
const testDays = [
  { date: '2025-10-01', aspects: day1Aspects },
  { date: '2025-10-02', aspects: day2Aspects },
  { date: '2025-10-03', aspects: day3Aspects }
];

const results = testDays.map(day => {
  console.log(`\n=== ${day.date} ===`);
  return aggregate(day.aspects, null, {
    enableDiagnostics: true
  });
});

// Compare magnitudes across days
const magnitudes = results.map(r => r.magnitude);
console.log('Magnitudes:', magnitudes);

// Look for stuck patterns
if (magnitudes.every(m => m === magnitudes[0])) {
  console.warn('⚠️ STUCK: All days have identical magnitude!');
}
```

**What to look for:**
- Raw values (X_raw, Y_raw) should vary if aspects are different
- Normalized values should reflect that variation proportionally
- If raw changes but normalized doesn't → normalization is stuck
- If normalized changes but final doesn't → clamping or rounding issue

---

## Diagnostic Output Reference

### Quick Diagnostic Checklist

When troubleshooting, check these in order:

| Stage | Log Label | Key Field | Healthy Value | Problem Value |
|-------|-----------|-----------|---------------|---------------|
| 1 | `[INPUT]` | `received_count` | > 0, matches expected | 0 or wrong count |
| 2 | `[SCORING]` | `total_aspects` | Matches input | Much less than input |
| 3 | `[AMPLIFICATION]` | `amplified_count` | > 0 if tight aspects | 0 when shouldn't be |
| 4 | `[MAGNITUDE_NORM]` | `magnitude_normalized` | 0.2 - 0.8 (varies) | Always 1.0 or 0.0 |
| 5 | `[BIAS_NORM]` | `was_clamped` | false (occasional true ok) | true every day |
| 6 | `[SUMMARY]` | `warnings` | [] (empty) | Non-empty |

---

## Additional Options

### Disable Diagnostics After Debugging

Once you've identified the issue, disable diagnostics for performance:

```javascript
const result = aggregate(aspects, prevContext, {
  enableDiagnostics: false // or just omit this option
});
```

### Access Internal Diagnostics Object

Even without console logging, internal diagnostics are available:

```javascript
const result = aggregate(aspects, null, {});

console.log(result._diagnostics);
// {
//   volatility: 3.5,
//   volatility_normalized: 0.35,
//   aspect_count: 42,
//   scaling_method: 'static_divisor',
//   effective_divisor: 4
// }
```

---

## Support

If diagnostics reveal an issue you can't resolve:

1. Capture the full diagnostic output for a stuck day
2. Note which stage shows the anomaly
3. Compare with a "healthy" day's output
4. Check the transform_trace for the exact transformation pipeline
5. Review this guide's troubleshooting section

The diagnostic logs are designed to pinpoint exactly where in the pipeline values diverge from expected behavior.
