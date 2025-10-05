# Balance Meter Documentation Hub

**Spec Version:** 3.1  
**Last Updated:** January 21, 2025  
**Status:** ✅ Production Ready

---

## Overview

The **Balance Meter** (also called "Symbolic Weather Seismograph") is the mathematical core of the Raven Calder system. It transforms raw astrological aspect geometry into four quantified axes that represent the energetic climate of a day.

### Four Axes

| Axis | Range | Formula | Interpretation |
|:-----|:------|:--------|:---------------|
| **Magnitude** | [0, 5] | `norm × 50 → clamp([0, 5])` | Peak activity level |
| **Directional Bias** | [-5, +5] | `norm × 50 → clamp([-5, +5])` | Inward/outward energetic tendency |
| **Coherence** | [0, 5] | `(5 - vol_norm × 50) → clamp([0, 5])` | Stability (inverted from volatility) |
| **SFD** | [-1, +1] or null | `(support - friction) / total` | Integration bias (supportive vs. frictional) |

---

## Architecture (Single Source of Truth)

```
config/spec.json (v3.1 constants)
    ↓
lib/balance/scale.ts (canonical scalers)
    ├─→ scaleBipolar(normalized)
    ├─→ scaleUnipolar(normalized)
    ├─→ scaleCoherenceFromVol(volatility_norm)
    └─→ scaleSFD(raw, preScaled)
    ↓
lib/balance/scale-bridge.js (CommonJS wrapper)
    ↓
src/seismograph.js (uses canonical scalers)
    ↓
lib/balance/assertions.ts (runtime validation)
```

**Key Principle:** All scaling math lives in `lib/balance/scale.ts`. No duplicate implementations allowed.

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
| Hurricane Michael | mag 4.86, bias -3.3 | See test output |
| SFD null handling | No fabrication | See test output |

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

## Key Formulas (Spec v3.1)

### Directional Bias
```javascript
// Step 1: Magnitude-based amplification
Y_amplified = Y_raw × (0.8 + 0.4 × magnitude)

// Step 2: Normalize to [-1, +1] range
Y_normalized = Y_amplified / 100

// Step 3: Scale by ×50 to display range [-5, +5]
biasScaled = scaleBipolar(Y_normalized)
directional_bias = biasScaled.value  // Clamped & rounded
```

### Magnitude
```javascript
// Already normalized in [0, 1] range
magnitudeScaled = scaleUnipolar(X_normalized)
magnitude = magnitudeScaled.value  // Scaled to [0, 5]
```

### Coherence (Inverted from Volatility)
```javascript
// Volatility normalized to [0, 0.1] range
VI_normalized = min(0.1, VI / 100)

// Invert: high volatility = low coherence
coherenceScaled = scaleCoherenceFromVol(VI_normalized)
coherence = coherenceScaled.value  // (5 - vol×50) → [0, 5]
```

### SFD (Support-Friction Differential)
```javascript
// Calculate raw SFD (already in [-1, +1])
sfd_raw = (sumSupport - sumFriction) / (sumSupport + sumFriction)

// Format with proper display
sfdScaled = scaleSFD(sfd_raw, true)  // preScaled=true
sfd = sfdScaled.value  // null if no drivers
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

### "SFD shows 0.00 instead of n/a"
**Symptom:** Zero fabrication when no drivers present  
**Diagnosis:** Null handling bypassed  
**Fix:** Ensure `scaleSFD` returns `{value: null, display: 'n/a'}`  
**Prevention:** Runtime assertions catch fabrication

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
| 3.1 | 2025-01-21 | Dual-pipeline elimination, canonical scalers enforced |
| 3.0 | 2025 | Initial v3 specification with SFD + Coherence |

---

**For Implementation Details:** See `BALANCE_METER_REFACTOR_COMPLETE.md`  
**For Historical Context:** See `docs/archive/BALANCE_METER_AUDIT_2025-10-05.md`
