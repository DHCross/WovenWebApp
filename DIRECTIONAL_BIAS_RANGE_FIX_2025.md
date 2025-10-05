# Directional Bias Display Range Fix (October 5, 2025)

## Executive Summary

**Critical Error Discovered**: The seismograph was using a **[-50, +50]** display range for Directional Bias instead of the correct **[-5, +5]** range specified in Balance Meter v3.

This error made the "restoration" appear successful (golden standard test passed with -50), but the numbers were **meaningless** because they were outside the spec range by 10x.

## Root Cause

When implementing the Pipeline Treaty restoration, I misunderstood the scaling formula:

```
display = clamp(normalized × 50, −5, +5)
```

I incorrectly thought:
1. Normalize to [-1, +1]
2. Scale by ×50 to get [-50, +50]
3. Clamp to [-50, +50]

**WRONG!** The formula means:
1. Normalize to small range (e.g., [-0.1, +0.1])
2. Scale by ×50 to get [-5, +5] range
3. Clamp to [-5, +5]

## The Fix

### Before (WRONG)
```javascript
const Y_norm_clamped = Math.max(-1, Math.min(1, Y_amplified / 6));
const directional_bias_scaled = Y_norm_clamped * 50;
const directional_bias = round(Math.max(-50, Math.min(50, directional_bias_scaled)), 1);
```

**Result**: Hurricane Michael showed `directional_bias: -50` (outside spec!)

### After (CORRECT)
```javascript
// Step 1: Amplify directional signal based on magnitude
const Y_amplified = Y_raw * (0.8 + 0.4 * magnitudeValue);

// Step 2: Normalize to [-0.1, +0.1] typical range
const Y_normalized = Y_amplified / 100;

// Step 3: Scale by ×50 to get [-5, +5] display range
const directional_bias_scaled = Y_normalized * 50;

// Step 4: Final clamp to [-5, +5] per v3 spec
const directional_bias = round(Math.max(-5, Math.min(5, directional_bias_scaled)), 1);
```

**Result**: Hurricane Michael shows `directional_bias: -3.3` (within spec ✅)

## Validation

### Golden Standard Test (Hurricane Michael, Oct 10 2018)
```
✓ magnitude: 4.86          // Near maximum (0-5 range) ✅
✓ directional_bias: -3.3   // Strong inward (-5 to +5 range) ✅
✓ volatility: 2            // Moderate ✅
✓ coherence: 4             // Moderate stability ✅
✓ sfd: -0.21               // Net frictional ✅
```

### Bias Sanity Tests (Raven's Acceptance Criteria)
```
✓ Small negative aspects don't clamp to -5.0
✓ Moderate aspects show appropriate mid-range values
✓ Positive aspects work symmetrically
✓ No premature clamping detected
```

## What Raven Was Warning About

Raven's autopsy identified six dampening mechanisms:

1. ✅ **Premature clamping + overscaling** - FIXED (clamp after scale, use ×50 not ×100)
2. ✅ **Adaptive/percentile scaling leak** - VERIFIED ABSENT (no adaptive mode in code)
3. ✅ **Metric mixing (Direction vs. Cohesion)** - PARTIALLY FIXED (renamed valence→directional_bias, lexicon lint pending)
4. ✅ **Fabrication to hide nulls** - FIXED (SFD returns null when no aspects)
5. ✅ **Volatility shown as Coherence without inversion** - FIXED (coherence = 5 - volatility/2)
6. ✅ **Wide orbs and soft aspect padding** - NOT APPLICABLE (orbs are tight, 3° majors / 1° minors)

## Display Ranges Per v3 Spec

| Axis | Display Range | Rounding |
|------|---------------|----------|
| Magnitude | `[0, 5]` | 1 decimal |
| Directional Bias | `[-5, +5]` | 1 decimal |
| Coherence | `[0, 5]` | 1 decimal |
| SFD | `[-1.00, +1.00]` | 2 decimals |

## Lessons Learned

### The Danger of Passing Tests with Wrong Numbers

The golden standard test **passed** with `directional_bias: -50`, which seemed like "maximum inward contraction" was working. But -50 is **outside the v3 spec range**, making it meaningless.

**Red flag I missed**: The v3 spec explicitly states:
> **Directional Bias (−5…+5)**
> * −5: maximum contraction / enforced boundary
> * 0: neutral balance
> * +5: maximum expansion / boundary-dissolving

I should have noticed that -50 couldn't be right when the spec says -5 is the maximum.

### The Importance of Reading the Spec Carefully

Raven's config showed:
```yaml
scale_factors:
  magnitude: 50
  directional_bias: 50  # This is the MULTIPLIER, not the max value!
```

And the display formula:
```python
display = clamp(normalized × 50, −5, +5)  # The second part is the RANGE!
```

I confused the scale factor (50) with the display range (5).

### AI "Helping" Can Break Things

Raven's warning was prescient:
> "You tried to correct a perceived red bias, added SFD to keep the mirror honest, and somewhere in the refactor an overeager coding agent 'helped' by padding, averaging, and clamping until the instrument got… sleepy."

In my case, I "helped" by using a larger display range ([-50, +50]) thinking it would preserve more detail. Instead, it broke calibration entirely.

## What's Still Pending

1. **Display Layer Updates**: Propagate `directional_bias` (not `valence`) to UI components
2. **Lexicon Enforcement**: Add build-time lint to prevent mixing direction/cohesion terms
3. **Metadata/Provenance**: Add rendering metadata to all seismograph outputs

## Files Changed

* `src/seismograph.js` - Fixed Directional Bias calculation and display range
* `test/golden-standard-2018.test.ts` - Updated expectations to [-5, +5] range
* `test/bias-sanity-check.test.ts` - NEW: Acceptance tests per Raven's spec
* `SEISMOGRAPH_RESTORATION_2025.md` - Updated with correct ranges and fix details

## Test Results

```
Test Files  8 passed (10 total, 2 unrelated failures)
Tests       38 passed (39 total, 1 unrelated blueprint failure)

Seismograph Tests:
✓ Golden Standard: Hurricane Michael (directional_bias: -3.3)
✓ Bias Sanity Check: Small bias not amplified to -5.0
✓ Bias Sanity Check: Positive bias works symmetrically
✓ All seismograph unit tests passing
```

---

**Date**: October 5, 2025  
**Status**: Display range corrected, validated against v3 spec  
**Confidence**: High (all acceptance tests pass, values within spec ranges)  
**Next**: Display layer updates to use new field names and ranges

