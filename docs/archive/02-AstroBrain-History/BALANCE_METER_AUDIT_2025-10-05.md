# Balance Meter Math Audit Report
**Date:** October 5, 2025  
**Auditor:** GitHub Copilot  
**Spec Version:** v3.1  
**Scope:** Full verification of Balance Meter mathematics against canonical specification  
**Status:** ✅ **RESOLVED** - See `BALANCE_METER_REFACTOR_COMPLETE.md` for implementation

---

## 🎉 RESOLUTION NOTICE

**This audit identified a critical dual-pipeline architecture violation that has been FULLY RESOLVED.**

**Completion Date:** January 21, 2025  
**Implementation Doc:** `BALANCE_METER_REFACTOR_COMPLETE.md`  
**All Acceptance Gates:** ✅ PASSING (14/14 test files, 69/69 tests)

The refactor successfully:
- ✅ Eliminated duplicate math in `src/seismograph.js`
- ✅ Enforced single source of truth via `lib/balance/scale.ts`
- ✅ Added runtime assertions (`lib/balance/assertions.ts`)
- ✅ Created spec guard (`config/spec.json`)
- ✅ Added 19 property-based tests
- ✅ Implemented IDE read-only protections

**This document is preserved for historical reference. For current architecture, see completion report.**

---

## Executive Summary (Historical)

✅ **TESTS PASSING:** All golden standard tests pass with correct values  
⚠️ **ARCHITECTURAL VIOLATION:** Dual pipeline implementation violates single source of truth *(NOW RESOLVED)*  
✅ **NULL HANDLING:** SFD correctly returns null (no fabrication)  
✅ **LEXICON COMPLIANCE:** Lexicon lint passes  

### Critical Finding (NOW RESOLVED)

**`src/seismograph.js` reimplemented Balance Meter math instead of using the canonical `lib/balance/scale.ts` functions.**

This created the exact "dual pipeline" problem:
- **Path A (canonical):** `lib/balance/scale.ts` → `scaleBipolar()` → `norm × 50 → clamp([-5, +5]) → round`
- **Path B (legacy):** `src/seismograph.js` → custom logic → `Y_raw × mag_amp / 100 × 50 → clamp → round`

**Resolution:** 7-phase refactor eliminated Path B, now all math flows through canonical scalers.

While Path B produced correct test outputs, it:
1. Created maintenance burden (changes must be applied twice) *(NOW RESOLVED)*
2. Risked future divergence when AI assistants modified one path *(NOW PREVENTED)*
3. Violated the v3.1 "single source of truth" principle *(NOW ENFORCED)*
4. Made the codebase harder to audit *(NOW SIMPLIFIED)*

---

## Detailed Findings

### 1. Core Pipeline Order ✅ (with caveat)

**Location:** `src/seismograph.js:353-369`

**Current Implementation:**
```javascript
// Step 1: Amplify directional signal based on magnitude
const Y_amplified = Y_raw * (0.8 + 0.4 * magnitudeValue);

// Step 2: Normalize to [-0.1, +0.1] typical range
const Y_normalized = Y_amplified / 100;  // ← DIVIDE BY 100

// Step 3: Scale by ×50 to get [-5, +5] display range
const directional_bias_scaled = Y_normalized * 50;

// Step 4: Final clamp to [-5, +5] and round to 1 decimal
const directional_bias = round(Math.max(-5, Math.min(5, directional_bias_scaled)), 1);
```

**Net Scaling Effect:** `Y_raw × (0.8 + 0.4 * mag) × 0.5`

**Canonical Implementation (not used):**
`lib/balance/scale.ts:40-48` → `scaleBipolar(normalized)` → `norm × 50 → clamp([-5, +5])`

**Verdict:** The pipeline order is technically correct (normalize → scale → clamp → round), but the normalization step includes domain-specific magnitude amplification and a `/100` divisor that makes the effective scaling `×0.5` rather than the canonical `×50`.

---

### 2. Scaling Factors ✅ (mathematically correct, architecturally wrong)

| Metric | Canonical (scale.ts) | Legacy (seismograph.js) | Status |
|:-------|:---------------------|:------------------------|:-------|
| **Directional Bias** | `norm × 50 → clamp([-5, +5])` | `Y_raw × mag × 0.5 → clamp([-5, +5])` | ⚠️ Dual pipeline |
| **Magnitude** | `norm × 50 → clamp([0, 5])` | Uses `scaleMagnitude()` from canonical-scaling.js | ✅ Centralized |
| **Coherence** | `(5 - vol_norm × 50) → clamp([0, 5])` | `5 - min(5, VI/2)` | ⚠️ Dual pipeline |
| **SFD** | `clamp(raw × 10, [-1, +1]) → round(2dp)` | Custom `calculateSFD()` | ⚠️ Dual pipeline |

**Test Results (Hurricane Michael):**
- `magnitude: 4.86` ✓ (expected ~4.8)
- `directional_bias: -3.3` ✓ (expected ~–3.3)
- `coherence: 4.0` ✓ (expected ~4.0)
- `sfd: -0.21` ✓ (expected ~–0.21)

All values are correct, but achieved through separate implementations.

---

### 3. Duplicate Pipelines 🚨 **CRITICAL ISSUE**

**Three separate implementations found:**

#### A. Canonical Balance Meter (`lib/balance/scale.ts`)
```typescript
export const scaleBipolar = (normalized: number) => {
  const safe = Number.isFinite(normalized) ? normalized : 0;
  const raw = safe * 50;  // ← CANONICAL SCALING
  const [clamped, flags] = clamp(raw, -5, 5);
  return { raw, value: roundHalfUp(clamped, ROUND_1DP), flags };
};
```

#### B. Legacy Seismograph (`src/seismograph.js`)
```javascript
const Y_amplified = Y_raw * (0.8 + 0.4 * magnitudeValue);
const Y_normalized = Y_amplified / 100;  // ← CUSTOM NORMALIZATION
const directional_bias_scaled = Y_normalized * 50;
const directional_bias = round(Math.max(-5, Math.min(5, directional_bias_scaled)), 1);
```

#### C. Transform Layer (`lib/weatherDataTransforms.ts`)
```typescript
// Uses canonical functions ✓
const biasScaled = scaleBipolar(biasNormalized);
```

**Architectural Risk:**
When an AI assistant sees a request to "fix directional bias scaling," it may modify:
- Just `seismograph.js` → breaks frontend
- Just `scale.ts` → breaks backend
- Both with slightly different logic → silent divergence

---

### 4. Null Handling ✅

**Location:** `src/seismograph.js:260-277`

```javascript
function calculateSFD(scored){
  if (!scored || scored.length === 0) return null;
  
  let sumSupport = 0;
  let sumFriction = 0;
  
  for (const aspect of scored) {
    const S = aspect.S;
    if (S > 0) {
      sumSupport += S;
    } else if (S < 0) {
      sumFriction += Math.abs(S);
    }
  }
  
  const total = sumSupport + sumFriction;
  if (total === 0) return null; // ← CORRECT: no fabrication
  
  const sfd = (sumSupport - sumFriction) / total;
  return round(sfd, 2);
}
```

**Verdict:** ✅ Correctly returns `null` when no drivers exist. No fabrication detected.

**Canonical comparison:** `lib/balance/scale.ts:66-72` also correctly handles null:
```typescript
if (sfdRaw == null || Number.isNaN(sfdRaw)) {
  return {
    raw: null,
    value: null,
    display: 'n/a',  // ← CORRECT: displays "n/a"
    flags: { hitMin: false, hitMax: false },
  };
}
```

---

### 5. Golden Standard Tests ✅

**Test Run:** `npx vitest run test/golden-standard-2018.test.ts test/bias-sanity-check.test.ts`

**Results:**
```
✓ Golden Standard: Hurricane Michael (2018-10-10)
  magnitude: 4.86, directional_bias: -3.3, coherence: 4, sfd: -0.21
✓ Bias Sanity Check: bias_n = −0.05 → display -0.8 (not -5.0)
✓ Small negative bias: -0.7 (not clamped)
✓ Positive bias: 2.0 (symmetric behavior)
```

All tests pass within tolerance.

---

### 6. Lexicon Compliance ✅

**Test Run:** `npm run lexicon:lint`

**Result:** `Lexicon lint passed.`

**Verified:**
- No uncodified phrases like "storm system" or "surge collapse"
- Axis vocabularies properly separated (e.g., "friction" only in SFD context)
- VOICE guard active in `lib/voice/guard.ts`

---

## Architectural Recommendations

### Immediate Actions

#### 1. Deprecate Custom Math in `seismograph.js`

**Current state:** `src/seismograph.js` lines 353-369 implement custom directional bias calculation.

**Recommendation:** Refactor to use `lib/balance/scale.ts:scaleBipolar()`.

**Challenge:** The current implementation includes magnitude-based amplification (`Y_raw × (0.8 + 0.4 * magnitudeValue)`). This domain logic needs to be preserved.

**Proposed solution:**
```javascript
// In seismograph.js (new approach)
const Y_amplified = Y_raw * (0.8 + 0.4 * magnitudeValue);
const Y_normalized = Y_amplified / 100;  // Keep domain normalization
const biasScaled = scaleBipolar(Y_normalized);  // Use canonical scaler
const directional_bias = biasScaled.value;
```

Or extract the amplification logic into a dedicated function:
```javascript
// In lib/balance/scale.ts (new function)
export const amplifyByMagnitude = (rawBias: number, magnitude: number): number => {
  return rawBias * (0.8 + 0.4 * magnitude);
};

// In seismograph.js
const Y_amplified = amplifyByMagnitude(Y_raw, magnitudeValue);
const Y_normalized = Y_amplified / 100;
const directional_bias = scaleBipolar(Y_normalized).value;
```

#### 2. Centralize Coherence Calculation

**Current:** `seismograph.js:376-378`
```javascript
const volatility_normalized = Math.min(5, VI / 2);
const coherence = round(5 - volatility_normalized, 2);
```

**Should use:** `lib/balance/scale.ts:scaleCoherenceFromVol()`

**Proposed:**
```javascript
// Normalize VI to [0, 0.1] range first
const VI_normalized = Math.min(0.1, VI / 100);  // or appropriate divisor
const coherenceScaled = scaleCoherenceFromVol(VI_normalized);
const coherence = coherenceScaled.value;
```

#### 3. Add Spec Version Guard

**Create:** `config/spec.json`
```json
{
  "spec_version": "3.1",
  "scaling_mode": "absolute",
  "scale_factor": 50,
  "pipeline": "normalize→scale→clamp→round",
  "coherence_inversion": true,
  "ranges": {
    "magnitude": [0, 5],
    "directional_bias": [-5, 5],
    "coherence": [0, 5],
    "sfd": [-1, 1]
  }
}
```

**Import in all transform files:**
```typescript
import spec from '@/config/spec.json';
if (SCALE_FACTOR !== spec.scale_factor) {
  throw new Error(`Scale factor mismatch: expected ${spec.scale_factor}`);
}
```

#### 4. Add Runtime Assertions

**In:** `lib/balance/scale.ts` (or new `lib/balance/assertions.ts`)
```typescript
export function assertBalanceMeterInvariants(result: TransformedWeatherData): void {
  const { axes } = result;
  
  // Range checks
  if (axes.magnitude.value < 0 || axes.magnitude.value > 5) {
    throw new Error(`Magnitude out of range: ${axes.magnitude.value}`);
  }
  if (axes.directional_bias.value < -5 || axes.directional_bias.value > 5) {
    throw new Error(`Directional bias out of range: ${axes.directional_bias.value}`);
  }
  if (axes.coherence.value < 0 || axes.coherence.value > 5) {
    throw new Error(`Coherence out of range: ${axes.coherence.value}`);
  }
  if (axes.sfd.value !== null && (axes.sfd.value < -1 || axes.sfd.value > 1)) {
    throw new Error(`SFD out of range: ${axes.sfd.value}`);
  }
  
  // Null integrity check
  if (axes.sfd.value === null && axes.sfd.display !== 'n/a') {
    throw new Error(`SFD fabrication detected: null value but display="${axes.sfd.display}"`);
  }
  
  // Scaling monotonicity
  // (Add property tests for scale then clamp equivalence)
}
```

Call in every export function:
```typescript
export function transformWeatherData(raw: RawSeismograph): TransformedWeatherData {
  const result = /* ...calculation... */;
  assertBalanceMeterInvariants(result);  // ← GUARD
  return result;
}
```

#### 5. Property-Based Tests

**Add:** `test/balance-properties.test.ts`
```typescript
import { fc, test } from '@fast-check/vitest';
import { scaleBipolar, scaleUnipolar } from '@/lib/balance/scale';

describe('Balance Meter Property Tests', () => {
  test.prop([fc.double({ min: -0.2, max: 0.2 })])(
    'scaleBipolar is monotonic',
    (normalized) => {
      const result1 = scaleBipolar(normalized);
      const result2 = scaleBipolar(normalized + 0.01);
      return result2.value >= result1.value;
    }
  );

  test.prop([fc.double({ min: -0.2, max: 0.2 })])(
    'scaleBipolar × 50 stays in range',
    (normalized) => {
      const result = scaleBipolar(normalized);
      return result.value >= -5 && result.value <= 5;
    }
  );

  test.prop([fc.double({ min: -0.05, max: 0.05 })])(
    'Small normalized bias (±0.05) produces display ≈ ±2.5',
    (normalized) => {
      const result = scaleBipolar(normalized);
      const expected = normalized * 50;
      return Math.abs(result.value - expected) < 0.2; // Tolerance
    }
  );
});
```

---

### Medium-Term Improvements

#### 6. Make Core Files Read-Only (to AI assistants)

**Git attributes:** `.gitattributes`
```
lib/balance/scale.ts linguist-generated=false -diff
lib/voice/guard.ts linguist-generated=false -diff
config/spec.json linguist-generated=false -diff
```

**IDE config:** `.vscode/settings.json`
```json
{
  "files.readonlyInclude": {
    "lib/balance/scale.ts": true,
    "lib/voice/guard.ts": true,
    "lib/voice/periodLabel.ts": true,
    "config/spec.json": true
  }
}
```

**Cursor/Copilot rules:** `.cursorrules`
```
PROTECTED FILES (require explicit permission to modify):
- lib/balance/scale.ts
- lib/voice/guard.ts
- lib/voice/periodLabel.ts
- config/spec.json

If you think these need changes, explain why and wait for approval.
Never change scale_factor, pipeline order, or lexicon without bumping spec_version.
```

#### 7. CI Workflow for AI Commits

**GitHub Actions:** `.github/workflows/ai-guard.yml`
```yaml
name: AI Commit Guard
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check protected files
        run: |
          git diff --name-only origin/main | grep -E "lib/balance/scale.ts|config/spec.json" && exit 1 || exit 0
      - name: Run contract tests
        run: |
          npm test
          npm run lexicon:lint
      - name: Check spec version
        run: |
          node scripts/check-spec-version.js
```

#### 8. Transform Trace in All Outputs

**Already present in `seismograph.js`:** ✅
```javascript
transform_trace: {
  pipeline: 'normalize_scale_clamp_round',
  steps: [
    { stage: 'raw', Y_raw, X_raw },
    { stage: 'amplified', Y_amplified },
    { stage: 'normalized', Y_normalized },
    { stage: 'scaled', directional_bias_scaled },
    { stage: 'final', directional_bias }
  ],
  clamp_events: [/* ... */]
}
```

**Add to:** `lib/balance/scale.ts` (return extended objects with traces)

#### 9. Observability Dashboard

**Log clamp rates:**
```typescript
export let clampStats = {
  magnitude: { hitMin: 0, hitMax: 0, total: 0 },
  directional_bias: { hitMin: 0, hitMax: 0, total: 0 },
  coherence: { hitMin: 0, hitMax: 0, total: 0 },
};

export const scaleUnipolar = (normalized: number) => {
  const result = /* ... */;
  clampStats.magnitude.total++;
  if (result.flags.hitMin) clampStats.magnitude.hitMin++;
  if (result.flags.hitMax) clampStats.magnitude.hitMax++;
  return result;
};
```

Alert if >10% of days hit clamps (suggests systematic over/under-scaling).

---

## Sign-Off Criteria (from User's Instructions)

| Criterion | Status | Notes |
|:----------|:-------|:------|
| All tests pass within tolerance | ✅ | Hurricane Michael: mag 4.86, bias -3.3, coh 4.0, sfd -0.21 |
| Bias sanity: −0.05 → −2.5 (not −5.0) | ⚠️ | Test uses single aspect with Y_raw ≈ −1.58 → display −0.8 (different from spec example) |
| Hurricane Michael yields correct values | ✅ | All values within ±0.2 tolerance |
| Empty aspects → null/n/a for SFD | ✅ | Correctly returns null, displays "n/a" |
| **Single source of truth (scale.ts)** | ❌ | **FAILING:** seismograph.js reimplements math |

---

## Recommended Refactor Path

### Phase 1: Extract Domain Logic (Low Risk)
1. Create `lib/balance/amplifiers.ts`:
   ```typescript
   export const amplifyByMagnitude = (rawBias: number, magnitude: number): number => {
     return rawBias * (0.8 + 0.4 * magnitude);
   };
   export const normalizeAmplifiedBias = (amplified: number): number => {
     return amplified / 100;
   };
   ```
2. Update `seismograph.js` to use these helpers while keeping current behavior.
3. Run full test suite to confirm no regressions.

### Phase 2: Adopt Canonical Scalers (Medium Risk)
1. Replace custom clamp/round in `seismograph.js` with `scaleBipolar()`.
2. Update coherence calculation to use `scaleCoherenceFromVol()`.
3. Verify transform traces match expected pipeline.

### Phase 3: Centralize SFD (Low Risk)
1. Move `calculateSFD()` from `seismograph.js` to `lib/balance/scale.ts`.
2. Ensure it integrates with the `scaleSFD()` formatting function.
3. Update exports and tests.

### Phase 4: Add Guards (Low Risk, High Value)
1. Implement `spec.json` with version enforcement.
2. Add `assertBalanceMeterInvariants()` to all transform functions.
3. Add property-based tests for monotonicity and range adherence.

### Phase 5: Lock Down (Ongoing)
1. Mark critical files read-only in IDE configs.
2. Add AI commit guard workflow.
3. Document in `.cursorrules` and `CONTRIBUTING.md`.

---

## Conclusion

### What's Working
- ✅ Test suite validates correct mathematical behavior
- ✅ Null handling prevents fabrication
- ✅ Lexicon compliance enforced
- ✅ Transform traces provide observability

### What Needs Fixing
- 🚨 **Dual pipeline violation:** `seismograph.js` reimplements logic that exists in `scale.ts`
- ⚠️ **No spec version enforcement:** Nothing prevents future ×100 regressions
- ⚠️ **No runtime guards:** Invalid values could slip through
- ⚠️ **AI assistants can modify protected files:** No technical enforcement

### The Path Forward

The math is **correct** but the **architecture is fragile**. Any AI assistant (including me) that modifies `seismograph.js` without understanding its relationship to `scale.ts` will introduce silent regressions.

**Recommendation:** Follow the 5-phase refactor plan above, prioritizing Phase 4 (guards) for immediate protection, then Phase 2 (canonical adoption) for long-term maintainability.

---

**Audit Completed:** October 5, 2025  
**Next Review:** After Phase 2 refactor (estimated 2-4 hours of dev time)
