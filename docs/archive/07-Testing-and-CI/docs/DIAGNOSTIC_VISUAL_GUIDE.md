# Visual Diagnostic Guide - Troubleshooting Stuck Values

## 🎯 Quick Diagnostic Decision Tree

```
Are your magnitude/bias values stuck?
│
├─► YES - Values always at 0 or ±5
│   │
│   ├─► Run diagnostics for 3-5 consecutive days
│   │   ```javascript
│   │   aggregate(aspects, null, { enableDiagnostics: true })
│   │   ```
│   │
│   ├─► Check Stage 4: [MAGNITUDE_NORM]
│   │   │
│   │   ├─► magnitude_normalized always 1.0?
│   │   │   └─► SATURATION - divisor too small
│   │   │       ✅ FIX: Provide rolling context or increase divisor
│   │   │
│   │   ├─► effective_divisor always 4 with 100+ aspects?
│   │   │   └─► STATIC SCALING - should be adaptive
│   │   │       ✅ FIX: Verify aspect count > 60 or provide rolling context
│   │   │
│   │   └─► scaling_method: "static_divisor" when rolling context provided?
│   │       └─► WINDOW NOT USED
│   │           ✅ FIX: Check rolling context structure: { magnitudes: [...] }
│   │
│   └─► Check Stage 5: [BIAS_NORM]
│       │
│       ├─► was_clamped: true every day?
│       │   └─► HITTING BOUNDARIES
│       │       ✅ FIX: Check energy normalization, may need larger divisor
│       │
│       └─► Y_normalized always ±1.0?
│           └─► OVER-AMPLIFICATION
│               ✅ FIX: Review amplification factor or energy context
│
└─► NO - Values vary normally
    └─► Good! Pipeline working correctly
```

---

## 📊 Reading the Diagnostic Output

### Healthy vs Problematic Patterns

#### ✅ HEALTHY: Normal Variation

```
Day 1:
[MAGNITUDE_NORM] magnitude_normalized: 0.65
[BIAS_NORM] Y_normalized: 0.42, was_clamped: false
[SUMMARY] magnitude: 3.2, directional_bias: 2.1

Day 2:
[MAGNITUDE_NORM] magnitude_normalized: 0.78
[BIAS_NORM] Y_normalized: -0.35, was_clamped: false
[SUMMARY] magnitude: 3.9, directional_bias: -1.8

Day 3:
[MAGNITUDE_NORM] magnitude_normalized: 0.52
[BIAS_NORM] Y_normalized: 0.61, was_clamped: false
[SUMMARY] magnitude: 2.6, directional_bias: 3.1
```

**✅ Good signs:**
- `magnitude_normalized` varies (0.52 → 0.78)
- `was_clamped` is false
- Final values change day-to-day
- Values not stuck at boundaries

---

#### 🚨 PROBLEM: Saturation (Always Maxed Out)

```
Day 1:
[MAGNITUDE_NORM] magnitude_normalized: 1.0 ⚠️
[MAGNITUDE_NORM] effective_divisor: 4
[SUMMARY] magnitude: 5 ⚠️

Day 2:
[MAGNITUDE_NORM] magnitude_normalized: 1.0 ⚠️
[MAGNITUDE_NORM] effective_divisor: 4
[SUMMARY] magnitude: 5 ⚠️

Day 3:
[MAGNITUDE_NORM] magnitude_normalized: 1.0 ⚠️
[MAGNITUDE_NORM] effective_divisor: 4
[SUMMARY] magnitude: 5 ⚠️
```

**🚨 Problem:**
- `magnitude_normalized` stuck at 1.0 (saturation)
- `effective_divisor` always 4 (not adapting)
- Final magnitude always 5 (maxed out)

**✅ Solution:**
```javascript
// Provide rolling context for dynamic normalization
const rollingContext = {
  magnitudes: [12.5, 15.2, 11.8, 14.1, ...] // X_raw from last 14 days
};

const result = aggregate(aspects, null, {
  rollingContext,
  enableDiagnostics: true
});
```

---

#### 🚨 PROBLEM: Clamping (Hitting Boundaries)

```
Day 1:
[BIAS_NORM] Y_normalized: 1.0 ⚠️
[BIAS_NORM] bias_scaled_raw: 6.2
[BIAS_NORM] was_clamped: true ⚠️
[SUMMARY] directional_bias: 5 ⚠️ (clamped from 6.2)

Day 2:
[BIAS_NORM] Y_normalized: 1.0 ⚠️
[BIAS_NORM] bias_scaled_raw: 5.8
[BIAS_NORM] was_clamped: true ⚠️
[SUMMARY] directional_bias: 5 ⚠️

Day 3:
[BIAS_NORM] Y_normalized: 1.0 ⚠️
[BIAS_NORM] bias_scaled_raw: 6.5
[BIAS_NORM] was_clamped: true ⚠️
[SUMMARY] directional_bias: 5 ⚠️
```

**🚨 Problem:**
- `Y_normalized` stuck at 1.0 (over-amplified)
- `was_clamped` true every day (hitting ceiling)
- Final bias always 5 (clamped)

**✅ Solution:**
- Check energy normalization context
- Verify crisis mode not over-restricting supportive aspects
- Review amplification logic

---

#### 🚨 PROBLEM: Rolling Window Not Updating

```
Day 1:
[ROLLING_WINDOW] window_contents: [4.0, 4.0, 4.0, 4.0] ⚠️
[MAGNITUDE_NORM] scaling_method: "rolling_window_n4"
[MAGNITUDE_NORM] X_ref: 4.0

Day 2:
[ROLLING_WINDOW] window_contents: [4.0, 4.0, 4.0, 4.0] ⚠️
[MAGNITUDE_NORM] scaling_method: "rolling_window_n4"
[MAGNITUDE_NORM] X_ref: 4.0

Day 3:
[ROLLING_WINDOW] window_contents: [4.0, 4.0, 4.0, 4.0] ⚠️
[MAGNITUDE_NORM] scaling_method: "rolling_window_n4"
[MAGNITUDE_NORM] X_ref: 4.0
```

**🚨 Problem:**
- `window_contents` shows identical values [4, 4, 4, 4]
- Window not updating with new daily values
- `X_ref` (reference magnitude) is static

**✅ Solution:**
```javascript
// Ensure you're appending new X_raw values each day:
const rollingContext = {
  magnitudes: [] // Start empty
};

// Day 1
const result1 = aggregate(day1Aspects, null, { rollingContext });
rollingContext.magnitudes.push(result1.energyMagnitude); // ✅ Append X_raw

// Day 2
const result2 = aggregate(day2Aspects, null, { rollingContext });
rollingContext.magnitudes.push(result2.energyMagnitude); // ✅ Append X_raw

// Keep last 14 days
if (rollingContext.magnitudes.length > 14) {
  rollingContext.magnitudes.shift(); // Remove oldest
}
```

---

## 🔍 Stage-by-Stage Visual Breakdown

### Stage 4: Magnitude Normalization

```
X_raw (energy) ─┐
                ├─► magnitude_normalized ─► scaleUnipolar ─► magnitude (0-5)
effective_divisor ┘

Example (Healthy):
  15.2 (X_raw)
  ÷ 6.8 (effective_divisor from rolling median)
  = 0.67 (magnitude_normalized) ✅ Good range: 0.2-0.8
  × scale & round
  = 3.4 (final magnitude) ✅ Mid-range, can vary

Example (Saturated):
  15.2 (X_raw)
  ÷ 4.0 (static divisor - too small!)
  = 1.0 (magnitude_normalized) ⚠️ CAPPED AT 1.0
  × scale & clamp
  = 5.0 (final magnitude) ⚠️ MAXED OUT
```

**What to look for:**
- `magnitude_normalized` should be 0.2-0.8 typically
- If always 1.0 → divisor too small (saturation)
- If always < 0.2 → divisor too large (under-scaling)

---

### Stage 5: Bias Normalization

```
Y_raw (valence) ─► amplifyByMagnitude ─► normalizeAmplifiedBias ─► scaleBipolar ─► bias (-5 to +5)
                          ↑                        ↑
                    magnitude (0-5)        energy context

Example (Healthy):
  Y_raw: -8.5
  × amplification (magnitude 3.5): 1.05
  = Y_amplified: -8.93
  ÷ energy (15.2): -8.93 / 15.2
  = Y_normalized: -0.59 ✅ Good range: -0.8 to +0.8
  × scale to -5/+5
  = directional_bias: -2.9 ✅ Mid-range

Example (Over-amplified):
  Y_raw: -8.5
  × amplification: 1.2
  = Y_amplified: -10.2
  ÷ energy (5.0 - too small!): -10.2 / 5.0
  = Y_normalized: -1.0 ⚠️ CAPPED AT -1.0
  × scale to -5/+5
  = bias_scaled_raw: -6.8
  → clamped to -5.0 ⚠️ HITTING BOUNDARY
```

**What to look for:**
- `Y_normalized` should be -0.8 to +0.8 typically
- If always ±1.0 → over-amplification or energy too small
- If `was_clamped: true` → hitting ±5 boundaries

---

## 🎯 Multi-Day Comparison Chart

| Day | X_raw | divisor | mag_norm | final mag | Y_raw | Y_norm | clamped | final bias |
|-----|-------|---------|----------|-----------|-------|--------|---------|------------|
| 1   | 12.3  | 4.0     | **1.0**  | **5.0** ⚠️ | -15.2 | **-1.0** | **yes** ⚠️ | **-5.0** ⚠️ |
| 2   | 15.8  | 4.0     | **1.0**  | **5.0** ⚠️ | -18.5 | **-1.0** | **yes** ⚠️ | **-5.0** ⚠️ |
| 3   | 10.2  | 4.0     | **1.0**  | **5.0** ⚠️ | -12.8 | **-1.0** | **yes** ⚠️ | **-5.0** ⚠️ |

**🚨 STUCK VALUES DETECTED:**
- Raw values vary (X_raw: 10.2 → 15.8)
- But mag_norm stuck at 1.0 (saturation)
- Final magnitude stuck at 5.0 (maxed)
- Y_norm stuck at -1.0 (over-amplified)
- Clamping every day (hitting boundary)
- Final bias stuck at -5.0

**✅ Solution:** Provide rolling context to adapt divisor and energy normalization.

---

## 📋 Diagnostic Checklist

Use this checklist when troubleshooting:

### Pre-Flight Check
- [ ] Enable diagnostics: `{ enableDiagnostics: true }`
- [ ] Run for at least 3 consecutive days
- [ ] Capture console output for comparison

### Stage 1: Input
- [ ] `received_count` > 0
- [ ] `sample_aspects` have valid bodies (not "?" or undefined)
- [ ] Orb values reasonable (< 6°)

### Stage 2: Scoring
- [ ] `total_aspects` matches input (if not, aspects were filtered)
- [ ] `score_distribution` makes sense (not all one type)
- [ ] `score_range` has variation across days

### Stage 3: Amplification
- [ ] `amplified_count` > 0 if you have tight/outer aspects
- [ ] Amplification factors reasonable (1.1 - 2.0 typical)

### Stage 4: Magnitude (⭐ CRITICAL)
- [ ] `magnitude_normalized` varies day-to-day
- [ ] NOT always 1.0 (saturation)
- [ ] NOT always near 0 (under-scaling)
- [ ] `scaling_method` uses rolling window if context provided
- [ ] `effective_divisor` adapts for relational charts (100+ aspects)

### Stage 5: Bias (⭐ CRITICAL)
- [ ] `Y_normalized` varies day-to-day
- [ ] NOT always ±1.0 (over-amplification)
- [ ] `was_clamped` is false (or only occasionally true)
- [ ] Raw values changing causes finals to change

### Stage 6: Summary (⭐ CRITICAL)
- [ ] `variability_check.potential_stuck_values` is FALSE
- [ ] `warnings` array is empty
- [ ] Raw-to-final comparison shows smooth transformation
- [ ] Final values not stuck at 0 or ±5 every day

---

## 🔧 Common Fixes

### Fix 1: Saturation (magnitude always 5)

**Before:**
```javascript
const result = aggregate(aspects, null, {});
// magnitude_normalized: 1.0 → magnitude: 5.0 (stuck!)
```

**After:**
```javascript
const rollingContext = { magnitudes: [] };

// Each day, append X_raw to build history
const result = aggregate(aspects, null, { rollingContext });
rollingContext.magnitudes.push(result.energyMagnitude);

// Keep last 14 days
if (rollingContext.magnitudes.length > 14) {
  rollingContext.magnitudes.shift();
}

// magnitude_normalized: 0.65 → magnitude: 3.2 (varies!)
```

### Fix 2: Clamping (bias always -5 or +5)

**Diagnosis:**
```
[BIAS_NORM] Y_normalized: 1.0 (over-amplified)
[BIAS_NORM] was_clamped: true (hitting ceiling)
```

**Check:**
- Is energy context too small?
- Is crisis mode over-restricting?
- Is amplification factor too high?

**Adjust energy normalization:**
```javascript
// Energy normalization uses X_raw (energyMagnitude)
// If X_raw is too small, Y_normalized will be too large
// Ensure X_raw reflects total aspect energy correctly
```

### Fix 3: Rolling Window Stuck

**Before:**
```javascript
const rollingContext = {
  magnitudes: [4, 4, 4, 4] // Static values
};
```

**After:**
```javascript
// Properly maintain rolling window:
const rollingContext = { magnitudes: [] };

for (const day of days) {
  const result = aggregate(day.aspects, null, {
    rollingContext,
    enableDiagnostics: true
  });

  // ✅ Append actual X_raw (not a constant!)
  rollingContext.magnitudes.push(result.energyMagnitude);

  // Keep last 14
  if (rollingContext.magnitudes.length > 14) {
    rollingContext.magnitudes.shift();
  }
}
```

---

## 🎓 Learning Examples

### Example 1: Detecting Stuck Values

```javascript
console.log('\n=== MULTI-DAY VARIABILITY TEST ===\n');

const days = [
  { date: '2025-10-01', aspects: day1Aspects },
  { date: '2025-10-02', aspects: day2Aspects },
  { date: '2025-10-03', aspects: day3Aspects }
];

const results = days.map(day => {
  console.log(`\n--- ${day.date} ---`);
  const result = aggregate(day.aspects, null, {
    enableDiagnostics: true
  });
  return { date: day.date, ...result };
});

// Check for stuck magnitudes
const magnitudes = results.map(r => r.magnitude);
const allSame = magnitudes.every(m => m === magnitudes[0]);

if (allSame) {
  console.error('🚨 STUCK VALUES: All magnitudes identical!');
  console.error('Review [MAGNITUDE_NORM] logs above');
} else {
  console.log('✅ Magnitudes vary:', magnitudes);
}
```

### Example 2: Rolling Window Verification

```javascript
const rollingContext = { magnitudes: [] };

for (let i = 0; i < 14; i++) {
  console.log(`\n=== Day ${i + 1} ===`);

  const result = aggregate(getDayAspects(i), null, {
    rollingContext,
    enableDiagnostics: true
  });

  // Append X_raw
  rollingContext.magnitudes.push(result.energyMagnitude);

  console.log(`Window size: ${rollingContext.magnitudes.length}`);
  console.log(`Window contents:`, rollingContext.magnitudes);
  console.log(`Magnitude: ${result.magnitude}`);

  // Verify window is growing and varying
  if (i > 0) {
    const prevMag = rollingContext.magnitudes[i - 1];
    const currMag = rollingContext.magnitudes[i];
    if (prevMag === currMag) {
      console.warn('⚠️ Window value identical to previous day');
    }
  }
}
```

---

## 📖 Full Documentation

- **[SEISMOGRAPH_DIAGNOSTICS.md](./SEISMOGRAPH_DIAGNOSTICS.md)** - Complete troubleshooting guide
- **[DIAGNOSTIC_QUICK_REFERENCE.md](./DIAGNOSTIC_QUICK_REFERENCE.md)** - Quick reference card
- **[DIAGNOSTIC_IMPLEMENTATION_SUMMARY.md](../DIAGNOSTIC_IMPLEMENTATION_SUMMARY.md)** - Implementation details

---

The visual diagnostics make it easy to spot patterns and identify exactly where values get stuck in the transformation pipeline.
