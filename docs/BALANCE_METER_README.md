# Balance Meter Documentation Hub

**Spec Version:** 5.0  
**Last Updated:** January 2026  
**Status:** ✅ Production Ready

---

## Overview

The **Balance Meter** (also called "Symbolic Weather Seismograph") is the mathematical core of the Raven Calder system. It transforms raw astrological aspect geometry into two quantified axes that represent the energetic climate of a day.

### Two Core Axes (v5.0)

| Axis | Range | Formula | Interpretation |
|:-----|:------|:--------|:---------------|
| **Magnitude** | [0, 5] | `norm × 5 → clamp([0, 5])` | Peak activity level (intensity) |
| **Directional Bias** | [-5, +5] | `norm × 5 → clamp([-5, +5])` | Expansion (+) vs contraction (−) |

### Internal Diagnostics Only

| Metric | Range | Purpose |
|:-------|:------|:--------|
| **Volatility** | [0, 5] | Quality control metric (in `_diagnostics` object) |

**v5.0 Philosophy:** Every public number must trace directly to verifiable aspect geometry. Coherence (inverted volatility) was a meta-derivative from statistical distribution, not pure geometry, so it was moved to internal diagnostics.

**Deprecated Systems:**
- **v4.0:** Coherence axis (statistical meta-derivative, now in `_diagnostics`)
- **v3.x:** SFD (Support/Friction/Drift) and Integration Bias (experimental 4th axis)

---

## Woven FIELD Chart (MANDATE)

Summary
- The Woven FIELD Chart is the canonical geometry for all symbolic-weather, Seismograph, and Balance Meter computations. It is produced by a full relocation: computing the chart (angles, houses, planetary positions) for a single space–time coordinate (the observer location/time).

Key rule
- Do not compute symbolic-weather or Balance Meter metrics from a "Transit Overlay" (hybrid) geometry. Transit Overlay is for visualization only and must not feed into the math pipeline.

Computation pattern (canonical)
1. Decide observer coordinates (either natal coords, chosen relocation coords, or current location).
2. Request upstream chart(s) with houses included:
   - `POST /api/v4/birth-chart` with `include_houses: true` for the subject anchored to the observer coords (relocated natal).
   - `POST /api/v4/transit-chart` with `include_houses: true` for transit windows anchored to the same observer coords (relocated transits).
3. Use returned houses/angles as canonical for FIELD calculations (set `provenance.house_engine = 'upstream'`).
4. If upstream houses are missing, compute houses locally as an explicit fallback (`provenance.house_engine = 'local-swiss-ephemeris@x.y'`).
5. Compute axes (magnitude, directional bias, and any remaining axes) from the unified geometry.

Provenance example (fieldmap footer)

```json
{
  "provenance": {
    "schema": "BM-v5",
    "house_system": "Placidus",
    "orbs_profile": "wm-tight-2025-11-v5",
    "relocation_mode": "A_local",
    "relocation_coords": { "lat": 40.0167, "lng": -75.3 },
    "house_engine": "astrologer.p.rapidapi.com@v4.0",
    "has_transits": true,
    "drivers_count": 3,
    "house_shift_summary": [
      { "num": 1, "delta_deg": -3.12 },
      { "num": 2, "delta_deg": -1.04 },
      ...
    ],
    "tz": "America/New_York",
    "math_brain_version": "5.0",
    "notes": ["FIELD Chart used: relocated natal + relocated transits; upstream houses used"]
  }
}
```

UI guardrail (developer guidance)
- The UI must label any "overlay" exports or views clearly:
  - `geometry: OVERLAY` (for hybrid UI-only visualizations)
  - `geometry: FIELD` (for canonical math outputs)
- The Balance Meter job runner must assert `provenance.house_engine !== 'missing_upstream'` before proceeding, and if it is, either re-request with `include_houses` or run the local-house fallback and stamp provenance accordingly.

Migration note for legacy reports
- Old reports generated with transit overlay/hybrid geometry will continue to exist in the archive, but we must avoid using them for statistical calibration. Flag them with `geometry: OVERLAY` and prefer re-running high-value items under the FIELD mandate.

Testing checklist (quick)
- FIELD happy path:
  - Request relocation coords -> upstream returns houses -> provenance.house_engine === 'upstream' -> Balance Meter succeeds and outputs stable values.
- Upstream missing houses:
  - Adapter retries / fallback to swisseph -> provenance.house_engine === 'local-swiss-ephemeris@x.y' -> Balance Meter completes.
- Overlay guard:
  - UI Overlay option does not route to Balance Meter / Poetic Brain; only used for visualization and exports labeled `geometry: OVERLAY`.

---

## Architecture (Single Source of Truth)

```
lib/balance/constants.js (v5.0 spec: SCALE_FACTOR=5, SPEC_VERSION='5.0')
    ↓
lib/balance/scale.ts (canonical scalers)
    ├─→ scaleBipolar(normalized)      [Directional Bias]
    └─→ scaleUnipolar(normalized)     [Magnitude]
    ↓
lib/balance/scale-bridge.js (CommonJS wrapper)
    ↓
src/seismograph.js (core calculation + volatility diagnostics)
    ↓
lib/balance/assertions.ts (runtime validation)
```

**Key Principle:** All scaling math lives in `lib/balance/scale.ts`. No duplicate implementations allowed. Balance Meter v5.0 uses two core axes only. Volatility is calculated but stored in `_diagnostics` for internal quality control.

---

## Core Files

### Production Code

| File | Purpose | Lines | Protection |
|:-----|:--------|:------|:-----------|
| `config/spec.json` | Canonical v3.1 specification | 37 | Read-only (IDE) |
| `lib/balance/scale.ts` | TypeScript canonical scalers | 135 | Read-only (IDE) |
| `lib/balance/amplifiers.ts` | Domain-specific helpers | 75 | Read-only (IDE) |
| `lib/balance/scale-bridge.js` | CommonJS/ESM bridge | 145 | — |
| `lib/balance/assertions.ts` | Runtime spec validation | 176 | Read-only (IDE) |
| `src/seismograph.js` | Core calculation engine | 449 | Uses canonical scalers |

### Tests

| File | Purpose | Tests |
|:-----|:--------|:------|
| `test/balance-properties.test.ts` | Property-based invariants | 19 |
| `test/golden-standard-2018.test.ts` | Hurricane Michael validation | 1 |
| `test/bias-sanity-check.test.ts` | Acceptance gates | 3 |
| `test/export-consistency.test.ts` | Schema alignment | 1 |
| `test/canonical-scaling.test.ts` | Scaler unit tests | 8 |

---

## Documentation

### Current (Active)

1. **`BALANCE_METER_REFACTOR_COMPLETE.md`** (Root)
   - Complete implementation documentation
   - Architecture diagrams
   - Acceptance gate verification
   - Maintenance protocols

2. **`CHANGELOG.md`** (Root, entry 2025-01-21)
   - Comprehensive changelog entry
   - 7-phase refactor summary
   - Technical debt resolved

3. **`docs/BALANCE_METER_README.md`** (This file)
   - Quick reference hub
   - File inventory
   - Testing guide

### Historical (Archived)

1. **`docs/archive/BALANCE_METER_AUDIT_2025-10-05.md`**
   - Original audit identifying dual-pipeline violation
   - Now resolved; preserved for historical context

---

## Testing

### Run All Balance Meter Tests

```bash
# Property-based tests
npm run test:vitest:run test/balance-properties.test.ts

# Golden standard (Hurricane Michael)
npm run test:vitest:run test/golden-standard-2018.test.ts

# Acceptance gates
npm run test:vitest:run test/bias-sanity-check.test.ts
npm run test:vitest:run test/export-consistency.test.ts

# Full suite
npm run test:vitest:run
```

### Acceptance Criteria

| Gate | Expected | Command |
|:-----|:---------|:--------|
| All tests pass | 69/69 | `npm run test:vitest:run` |
| Lexicon lint | Clean | `npm run lexicon:lint` |
| Bias sanity | -0.05 → -2.5 | See test output |
| Hurricane Michael | mag 4.86, bias -3.3, coh 4.0 | See test output |
| 3-axis compliance | No SFD/Integration in output | Verify exports |

---

## Development Rules

### ✅ DO

- Modify `lib/balance/scale.ts` for any scaling changes
- Run full test suite before committing (`npm run test:vitest:run`)
- Keep `config/spec.json` as single source of truth
- Add property tests for new scaler logic
- Update transform traces when modifying pipeline

### ❌ DO NOT

- Reimplement scaling math in `seismograph.js` or elsewhere
- Bypass runtime assertions in production code
- Modify spec.json without bumping version
- Change pipeline order without updating all schemas
- Remove or modify read-only protections

---

## Maintenance Protocol

### When Modifying Balance Meter Math

1. **Update canonical scaler** in `lib/balance/scale.ts`
2. **Update spec** in `config/spec.json` (bump version if breaking)
3. **Add property test** in `test/balance-properties.test.ts`
4. **Run full test suite** (`npm run test:vitest:run`)
5. **Verify golden standards** (Hurricane Michael should still pass)
6. **Update documentation** (this file, CHANGELOG.md)
7. **Request human review** before merging

### When Debugging Math Issues

1. Check transform trace in seismograph output (`canonical_scalers_used: true`)
2. Verify spec version matches (`spec_version: '3.1'`)
3. Check clamp events in transform trace
4. Run property tests to isolate issue
5. Verify runtime assertions are not being bypassed

---

## Key Formulas (Spec v4.0)

### Directional Bias (Expansion/Contraction)
```javascript
// Step 1: Magnitude-based amplification
Y_amplified = Y_raw × (0.8 + 0.4 × magnitude)

// Step 2: Normalize to [-1, +1] range
Y_normalized = Y_amplified / 10

// Step 3: Scale by ×5 to display range [-5, +5]
biasScaled = scaleBipolar(Y_normalized)
directional_bias = biasScaled.value  // Clamped & rounded
```

### Magnitude (Intensity)
```javascript
// Already normalized in [0, 1] range
magnitudeScaled = scaleUnipolar(X_normalized)
magnitude = magnitudeScaled.value  // Scaled to [0, 5]
```

### Coherence (Narrative Stability)
```javascript
// Volatility normalized to [0, 0.1] range
VI_normalized = min(0.1, VI / 100)

// Invert: high volatility = low coherence
coherenceScaled = scaleCoherenceFromVol(VI_normalized)
coherence = coherenceScaled.value  // (5 - vol×5) → [0, 5]
```

### Field Signature (v4.0)
```javascript
// Product of three normalized axes
fieldSignature = (direction/5) × (magnitude/5) × (coherence/5)
// Range: [-1, +1] representing directional lean × intensity × stability
```

---

## Common Issues & Solutions

### "Math keeps going askew"
**Symptom:** Balance Meter values drift from expected  
**Diagnosis:** Check if duplicate math was introduced  
**Fix:** Ensure `seismograph.js` uses canonical scalers only  
**Prevention:** IDE read-only protection, runtime assertions

### "Tests passing but wrong values in prod"
**Symptom:** Test values correct, production values differ  
**Diagnosis:** Pipeline string mismatch or missing assertions  
**Fix:** Verify `meta.pipeline` matches spec, check transform trace  
**Prevention:** Schema validation enforces pipeline consistency

### "SFD/Integration still appearing in output"
**Symptom:** Deprecated 4th axis showing in exports or UI  
**Diagnosis:** Legacy code path still emitting SFD/Integration  
**Fix:** Remove SFD references from reporters, composers, and frontend displays  
**Prevention:** Grep codebase for `sfd|SFD|integration|Integration` and clean up

### "Clamp events missing from trace"
**Symptom:** Transform trace shows no clamps but values clamped  
**Diagnosis:** Scaler return structure mismatch  
**Fix:** Verify scalers return `{raw, value, flags: {hitMin, hitMax}}`  
**Prevention:** Property tests validate flag setting

---

## References

- **Raven Calder System:** `RAVEN_CALDER_VALIDATION_SUMMARY.md`
- **Seismograph Guide:** `Developers Notes/Implementation/SEISMOGRAPH_GUIDE.md`
- **Epistemic Rigor:** `Developers Notes/Implementation/EPISTEMIC_RIGOR_SPECIFICATION.md`
- **API Integration:** `API_INTEGRATION_GUIDE.md`

---

## Version History

| Version | Date | Changes |
|:--------|:-----|:--------|
| 5.0 | 2025-10-22 | **2-axis finalization:** Removed Coherence from public output, aligning all documentation and tests with the two-axis model. Resolved "Spec Fork" by unifying `spec.json` and `constants.js` under v5.0. |
| 4.0 | 2025-10-09 | **3-axis simplification:** Removed SFD/Integration Bias; Balance Meter now Magnitude + Directional Bias + Coherence only |
| 3.1 | 2025-01-21 | Dual-pipeline elimination, canonical scalers enforced |
| 3.0 | 2025 | Initial v3 specification with SFD + Coherence (deprecated in v4.0) |

---

**For Implementation Details:** See `BALANCE_METER_REFACTOR_COMPLETE.md`  
**For Historical Context:** See `docs/archive/BALANCE_METER_AUDIT_2025-10-05.md`
