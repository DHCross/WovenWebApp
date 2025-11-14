# Three-Layer Protection Against Amplitude Regression

**Date:** 2025-01-21  
**Context:** Post-amplitude restoration (BIAS_DIVISOR: 100→10)  
**Goal:** Prevent future regressions that could dampen Balance Meter amplitude

---

## 🎯 Protection Layers

### Layer 1: **CI Gate Test** (Blocking)

**File:** `__tests__/ci-gate-golden-case.test.ts`  
**Status:** ✅ **ACTIVE** — Runs on every `npm run test:ci`  
**Coverage:** 11 tests

#### Test Coverage

1. **Golden Standard Enforcement**
   - Verifies `GOLDEN_CASES['2018-10-10']` exists
   - Minimum thresholds: Mag ≥4.5, Bias ∈[-5.0, -4.0]
   - Blocks merges if Golden Standard definition changes

2. **BIAS_DIVISOR Protection**
   - Ensures `BIAS_DIVISOR = 10` (not 100)
   - Located in `lib/balance/constants.js`
   - Critical for full amplitude restoration

3. **Pipeline Order Validation**
   - Verifies no `/100` division before `×50` scaling
   - Checks `amplifiers.js` for ghost divisions
   - Confirms geometry amplification happens BEFORE summing

4. **Single-Source Scaling**
   - Enforces imports from `lib/balance/scale-bridge.js`
   - Prevents duplicate scaling logic
   - Validates `seismograph.js` imports correctly

5. **Transform Trace Validation**
   - Expected pipeline: `amplify-geometry → sum → amplify-magnitude → normalize → ×50 → clamp → round`
   - Ensures `SPEC_VERSION = '3.1'`
   - Confirms `canonical_scalers_used: true`

6. **Runtime Assertions Active**
   - Verifies `assertGoldenCase()` is exported
   - Available for production runtime checks
   - Guards against out-of-range values

7. **Backward Compatibility**
   - `SCALE_FACTOR = 50` (not 5)
   - `SPEC_VERSION = '3.1'`
   - Ranges remain canonical ([0,5] for Mag/Bias)

#### Running the CI Gate

```bash
# Full CI suite (includes golden case gate)
npm run test:ci

# Just the golden case gate
npm run test:vitest:run __tests__/ci-gate-golden-case.test.ts
```

#### Results (2025-01-21)

```
✓ Golden Standard: 2018-10-10 Hurricane Michael (via constants)
✓ BIAS_DIVISOR must be 10 (not 100) for full amplitude
✓ Pipeline order: amplifiers.js has no /100 before scaling
✓ Seismograph applies geometry amplification BEFORE summing
✓ No scaling logic duplicated in seismograph.js
✓ Constants are imported from single source
✓ Transform trace includes correct pipeline order
✓ assertGoldenCase is exported from assertions.js
✓ SCALE_FACTOR remains 50
✓ SPEC_VERSION is 3.1
✓ Ranges remain canonical

Test Files  1 passed (1)
Tests  11 passed (11)
```

---

### Layer 2: **Smoke Test** (Developer Convenience)

**File:** `scripts/smoke-golden-case.js`  
**Status:** ✅ **ACTIVE** — Available via `npm run smoke:golden`  
**Purpose:** Quick 1-minute regression check

#### What It Tests

1. **Golden Case (2018-10-10)**
   - Hits `/api/astrology-mathbrain` endpoint
   - Birth: 1985-05-15, Pensacola, FL
   - Translocation: Panama City, FL
   - Expects: Mag ≥4.5, Bias ≤-4.0

2. **Current Date (2025-10-06)**
   - Same birth data
   - Current transit date
   - Expects: Reasonable values (Mag 3-4, Bias mild)

#### Running the Smoke Test

```bash
# Requires dev server running
npm run dev  # In terminal 1

# In terminal 2
npm run smoke:golden
```

#### Output Example

```
🔬 Regression Smoke Test: Golden Case

Expected Results:
  • Golden Case (2018-10-10): Mag ≥4.5, Bias ≤-4.0
  • Current Date: Mag 3-4, Bias mild

Testing Golden Case (Hurricane Michael) (2018-10-10)...
  Magnitude: 5
  Bias: -5
  ✅ Golden Case (Hurricane Michael) PASS

Testing Current Date (2025-10-06)...
  Magnitude: 3.9
  Bias: -2.3
  ✅ Current Date PASS

═══════════════════════════════════════
📊 SMOKE TEST SUMMARY
═══════════════════════════════════════
Golden Case: ✅ PASS
Current Date: ✅ PASS
═══════════════════════════════════════

✨ Smoke test complete. Amplitude restoration intact.
```

---

### Layer 3: **Single-Source Scaling Architecture**

**Documentation:** `docs/SINGLE_SOURCE_SCALING.md`  
**Status:** ✅ **ENFORCED** — Via CI gate + code review  
**Canonical Source:** `lib/balance/scale-bridge.js`

#### Architecture

```
lib/balance/constants.js
  ↓ (SCALE_FACTOR=50, BIAS_DIVISOR=10, ranges)
  
lib/balance/scale-bridge.js (SINGLE SOURCE OF TRUTH)
  ↓ (scaleUnipolar, scaleBipolar, scaleCoherenceFromVol, scaleSFD, etc.)
  
CONSUMERS:
  • src/seismograph.js
  • netlify/functions/astrology-mathbrain.js
```

#### Why This Matters

**Before (Problem):**
- Multiple files had inline `/100` divisions
- Amplitude dampened by factor of 10
- 2018-10-10 returned Mag 0.5 instead of 5.0

**After (Solution):**
- All scaling centralized in `scale-bridge.js`
- `BIAS_DIVISOR` changed from 100 to 10
- Single-source imports enforced by CI
- 2018-10-10 now correctly returns Mag 5.0

#### Code Review Checklist

Before merging any PR touching scaling:

- [ ] Imports from `scale-bridge.js`?
- [ ] No inline `/100` or `/10` divisions?
- [ ] Transform trace shows `×50` (not `×5`)?
- [ ] Golden Standard still passes?

---

## 🛡️ How These Layers Work Together

### Developer Workflow

1. **During Development:**
   ```bash
   npm run smoke:golden  # Quick check after changes
   ```

2. **Before Commit:**
   ```bash
   npm run test:ci       # Full test suite including CI gate
   ```

3. **During Code Review:**
   - Reviewer checks for single-source scaling
   - Verifies no ghost `/100` divisions
   - Confirms Golden Standard still valid

4. **On Merge to Main:**
   - GitHub Actions runs CI gate automatically
   - Merge blocked if any test fails
   - Golden Standard enforced at pipeline level

### Detection Flow

```
┌─────────────────────┐
│   Code Change       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Smoke Test (opt)   │  ← Developer runs locally
│  1-min quick check  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  CI Gate Tests      │  ← Automated on commit
│  11 blocking tests  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Code Review        │  ← Human verification
│  Architecture check │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Merge to Main      │  ← Protected by all layers
└─────────────────────┘
```

---

## 📊 Golden Standard Reference

**Date:** 2018-10-10 (Hurricane Michael)  
**Birth:** 1985-05-15, Pensacola, FL  
**Translocation:** Panama City, FL  

### Expected Results (Non-Negotiable)

| Metric            | Value   | Range      | Status |
|-------------------|---------|------------|--------|
| **Magnitude**     | 5.0     | [4.5, 5.0] | ✅ MAX |
| **Directional Bias** | -5.0 | [-5.0, -4.0] | ✅ MIN |
| **Volatility**    | ~6      | [0, ∞)     | High   |
| **Coherence**     | ~1.2    | [0, 5.0]   | Low    |

### Why This Case Is Golden

1. **Historical Crisis Event:** Category 5 hurricane, direct hit
2. **Extreme Transit Stack:** Multiple hard aspects (<1° orbs)
3. **Amplitude Ceiling:** Magnitude and Bias both clamped at limits
4. **Transform Trace:** All 7 pipeline steps hit maximum amplification
5. **Reproducible:** Fixed date, fixed birth data, deterministic result

---

## 🚨 What to Do If a Layer Fails

### CI Gate Failure

```bash
FAIL  __tests__/ci-gate-golden-case.test.ts
× BIAS_DIVISOR must be 10 (not 100) for full amplitude
```

**Action:**
1. **DO NOT OVERRIDE** — This is a critical protection
2. Check `lib/balance/constants.js` for `BIAS_DIVISOR` value
3. Review recent changes to scaling logic
4. Run `npm run smoke:golden` to verify actual output
5. If legitimate change, update Golden Standard definition AND document in changelog

### Smoke Test Failure

```bash
❌ Golden Case (Hurricane Michael) FAIL
  Expected Magnitude ≥4.5, got 0.5
```

**Action:**
1. **STOP** — Amplitude regression detected
2. Check `lib/balance/scale-bridge.js` for changes
3. Search for ghost `/100` divisions: `grep -r "/100" src/ lib/`
4. Verify `BIAS_DIVISOR = 10` in `constants.js`
5. Compare transform trace to expected pipeline
6. Roll back recent changes if needed

### Single-Source Violation

**Symptoms:**
- Multiple files define scaling logic
- Transform trace shows unexpected pipeline
- Golden Standard passes but values seem "off"

**Action:**
1. Audit all imports: `grep -r "SCALE_FACTOR\|BIAS_DIVISOR" src/ lib/`
2. Ensure all imports come from `scale-bridge.js`
3. Remove duplicate scaling logic
4. Run full test suite to confirm fix

---

## 📚 Related Documentation

- **`AMPLITUDE_RESTORATION_2025.md`** — Full restoration story
- **`docs/SINGLE_SOURCE_SCALING.md`** — Architecture details
- **`reports/compare-2018-10-10_vs_2025-10-06.md`** — Golden case validation
- **`MATH_BRAIN_COMPLIANCE.md`** — Technical requirements
- **`lib/balance/README.md`** — Balance Meter architecture

---

## 🔒 Maintenance Commitment

**These protections are PERMANENT and NON-NEGOTIABLE.**

Any attempt to:
- Change `BIAS_DIVISOR` from 10 to any other value
- Add `/100` divisions before `×50` scaling
- Bypass `scale-bridge.js` for scaling logic
- Modify Golden Standard thresholds

...will be **blocked by CI** and **rejected in code review**.

**Rationale:**  
The amplitude dampening bug was subtle, hard to detect, and caused months of incorrect outputs. These three layers ensure it can never happen again.

---

**Last Updated:** 2025-01-21  
**Next Review:** On any amplitude-related issue or before major refactors  
**Owner:** Jules (DHCross)
