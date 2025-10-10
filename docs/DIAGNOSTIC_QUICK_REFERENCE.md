# Seismograph Diagnostics - Quick Reference Card

## Enable Diagnostics

```javascript
const result = aggregate(aspects, prevCtx, {
  enableDiagnostics: true,
  rollingContext: { magnitudes: [...] } // optional
});
```

## 6 Diagnostic Stages

| # | Label | What It Shows | Key Fields to Check |
|---|-------|--------------|-------------------|
| 1 | `[INPUT]` | Aspect validation | `received_count`, `sample_aspects` |
| 2 | `[SCORING]` | Aspect → S scores | `score_distribution`, `score_range` |
| 3 | `[AMPLIFICATION]` | Geometry boost | `amplified_count`, `samples` |
| 4 | `[MAGNITUDE_NORM]` | **X_raw → magnitude** | `scaling_method`, `effective_divisor`, `magnitude_normalized` |
| 5 | `[BIAS_NORM]` | **Y_raw → bias** | `was_clamped`, `Y_normalized` |
| 6 | `[SUMMARY]` | Final values & warnings | `variability_check`, `warnings` |

## Red Flags at a Glance

### 🚨 Stage 4: MAGNITUDE_NORM
- `magnitude_normalized` always 1.0 → **SATURATION** (divisor too small)
- `effective_divisor` always 4 with 100+ aspects → **Not adapting**
- `scaling_method: "static_divisor"` when rolling context provided → **Window not used**

### 🚨 Stage 5: BIAS_NORM
- `was_clamped: true` every day → **Hitting boundaries**
- `Y_normalized` always ±1.0 → **Over-amplification**
- Values change but `directional_bias_final` doesn't → **Stuck**

### 🚨 Stage 6: SUMMARY
- `⚠️ VALUES AT BOUNDARIES` warning → **Likely stuck**
- `potential_stuck_values: true` → **Check earlier stages**
- Raw changes but finals don't → **Pipeline frozen**

## Common Issues - One-Liner Diagnosis

| Symptom | Check This | Quick Fix |
|---------|-----------|-----------|
| **Always magnitude 5** | Stage 4: `magnitude_normalized` = 1.0? | Provide rolling context or increase divisor |
| **Always bias -5 or +5** | Stage 5: `was_clamped` = true? | Check Y_normalized, may need energy normalization |
| **Rolling window not working** | Stage 4: `window_contents` all same? | Verify rolling context structure: `{magnitudes: [...]}` |
| **Aspect count drops** | Stage 1 vs 2: count mismatch? | Check orb values < 6°, valid aspect types |
| **No daily variation** | Stage 6: raw changes but finals don't? | Trace `raw_to_final_comparison` for stuck stage |

## Test Your Diagnostics

```bash
npm test __tests__/seismograph-diagnostics-example.test.js
```

## Access Diagnostics Object (No Logging)

```javascript
const result = aggregate(aspects, null, {});
console.log(result._diagnostics);
// { volatility, aspect_count, scaling_method, effective_divisor }
```

---

📖 **Full Guide:** [docs/SEISMOGRAPH_DIAGNOSTICS.md](./SEISMOGRAPH_DIAGNOSTICS.md)
