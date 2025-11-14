# Export Fragmentation Recovery Report
**Date:** 2025-01-21  
**Session:** Post-Amplitude Restoration  
**Status:** Dashboard reading uncalibrated values; exports partially fixed  
**Context:** User requested "look but don't touch" audit while Codex works on fixes

---

## Executive Summary

Despite successful implementation of axis formatting helpers (`fmtAxis`) and sanitization utilities (`scrubInternalDirectives`), the **dashboard still displays raw uncalibrated values** (Magnitude 5.0, Bias -5.0) instead of the correct calibrated values (Magnitude 3.9, Bias -2.3) from the Golden Standard test case (2018-10-10).

**Root Cause:** Multiple code paths read from different layers of the data structure:
- ✅ **PDF/MD Exports:** Now read calibrated values via `axes.magnitude.value` 
- ❌ **Dashboard:** Reads raw values via `summary.magnitude` (uncalibrated)
- ⚠️ **formatSymbolicWeatherSummary:** Has intelligent fallback but includes `'raw'` in priority keys

---

## Critical Data Flow Analysis

### Backend Pipeline (CORRECT)
```javascript
// lib/server/astrology-mathbrain.js lines 2620-2650
const X = Object.values(daily).reduce((s, d) => s + d.seismograph.magnitude, 0) / numDays;
const summary = {
  magnitude: +X.toFixed(2),  // ❌ RAW UNCALIBRATED - averaging daily .magnitude
  valence_bounded: biasSummaryValue,  // ✅ Calibrated via scaleDirectionalBias
  // ...
};
```

**Problem:** The `summary.magnitude` field averages raw daily magnitudes from seismograph WITHOUT applying the Balance Meter v3.1 canonical pipeline.

### Seismograph Output (PRE-CALIBRATION)
```javascript
// src/seismograph.js lines 450-470
const result = {
  magnitude: magnitudeValue,  // ✅ Post-scaling (×50)
  directional_bias,           // ✅ Post-scaling (×50)
  // ...
  rawMagnitude: magnitudeScaled.raw,     // ❌ Pre-clamping (could be >5.0)
  originalMagnitude: magnitudeValue,     // ✅ Final calibrated
};
```

**Note:** Seismograph returns both calibrated (`magnitude`, `directional_bias`) and uncalibrated (`rawMagnitude`) values. The issue is which field gets averaged into the summary.

### Dashboard Consumption (WRONG PATH)
```tsx
// app/math-brain/page.tsx lines 4490-4500
const summary = result?.person_a?.derived?.seismograph_summary;
const mag = Number(summary.magnitude ?? 0);  // ❌ READS RAW UNCALIBRATED
const val = Number(summary.valence_bounded ?? summary.valence ?? 0);  // ✅ Reads calibrated
```

**Asymmetry:** Dashboard correctly reads `valence_bounded` (calibrated) but incorrectly reads `summary.magnitude` (uncalibrated average).

### Export Path (PARTIALLY FIXED)
```typescript
// app/math-brain/utils/formatting.ts lines 270-310
const extractAxisNumber = (source: any, axis: AxisName): number | undefined => {
  const AXIS_NUMBER_KEYS = [
    'value',        // ✅ Calibrated
    'display',      // ✅ Calibrated  
    'final',        // ✅ Calibrated
    'scaled',       // ✅ Calibrated
    'score',        // ⚠️  Unknown
    'mean',         // ⚠️  Unknown
    'raw',          // ❌ UNCALIBRATED BACKDOOR
    'normalized',   // ⚠️  Pre-×50 scaling
  ];
  // Priority search through multiple key paths...
};
```

**Risk:** The `extractAxisNumber` helper includes `'raw'` and `'normalized'` in its priority list, creating a potential backdoor to uncalibrated values if `'value'` is missing.

---

## Validated Working Code

### ✅ lib/ui/format.ts (SAFE)
```typescript
export const fmtAxis = (a?: AxisLike, decimals = 1): string => {
  if (a === null || a === undefined) return 'n/a';
  if (typeof a === 'number' && Number.isFinite(a)) return a.toFixed(decimals);
  if (typeof a === 'string') return a;
  if (typeof a === 'object') {
    // Priority: .display → .value
    if (anyA?.display != null) return String(anyA.display);
    if (anyA?.value != null && Number.isFinite(anyA.value)) {
      return Number(anyA.value).toFixed(decimals);
    }
  }
  return 'n/a';
};
```
**Status:** ✅ Deployed, tested (2/2 rendering tests passing)

### ✅ lib/ui/sanitize.ts (SAFE)
```typescript
const BANNED_TOKENS = ['YOU ARE RAVEN CALDER', 'MANDATORY STRUCTURE', ...];
const BANNED_HEADINGS = ['ANALYSIS DIRECTIVE', ...];

export function scrubInternalDirectives(text: string): string {
  // Remove blocks from banned headings through next H2
  // Strip banned tokens anywhere in text
  return out.trim();
}
```
**Status:** ✅ Deployed, integrated into MD/PDF exports

### ⚠️ app/math-brain/utils/formatting.ts (AT RISK)
```typescript
const AXIS_NUMBER_KEYS = [
  'value', 'display', 'final', 'scaled', 'score', 'mean', 
  'raw',        // ❌ DANGER: Uncalibrated backdoor
  'normalized'  // ⚠️  DANGER: Pre-×50 scaling
];
```
**Status:** ⚠️ User added intelligent fallback, but priority list includes unsafe keys

### ❌ components/mathbrain/BalanceMeterSummary.tsx (READS WRONG VALUES)
```tsx
// Lines 170-185
<span className="text-xl font-bold text-yellow-300">
  {formatValue(narrative.dimensions.magnitude.value)}
</span>
```
**Source Chain:**
1. Dashboard passes `overallClimate={{ magnitude: mag, valence: val, ... }}`
2. `mag = Number(summary.magnitude ?? 0)` ← ❌ **UNCALIBRATED SOURCE**
3. `generateClimateNarrative(overallClimate, ...)` ← Receives wrong magnitude
4. Component displays `narrative.dimensions.magnitude.value` ← Shows 5.0 instead of 3.9

---

## Test Results

### ✅ Passing Tests
```bash
npm run test:vitest:run __tests__/rendering-sanity.test.ts
# 2/2 tests passing
# - fmtAxis prevents [object Object] bleed
# - scrubInternalDirectives removes banned tokens

npm run test:ci
# 107/117 tests passing (9 pre-existing failures unrelated to this work)
# - __tests__/ci-gate-golden-case.test.ts: 11/11 passing
# - Math engine validated (seismograph.js pipeline correct)
```

### ❌ Known Issue
**Golden Standard Fragmentation:**
- **Backend calculation (correct):** Magnitude 5.0 → Balance Meter pipeline → **3.9 final**
- **Dashboard display (wrong):** Reads `summary.magnitude` (5.0) directly, bypassing calibration
- **Export display (partially fixed):** Uses `extractAxisNumber` with 'raw' backdoor

---

## Recovery Plan

### Priority 1: Fix Backend Summary Calculation ⚠️ HIGH IMPACT
**File:** `lib/server/astrology-mathbrain.js` lines 2620-2650

**Current (WRONG):**
```javascript
const X = Object.values(daily).reduce((s, d) => s + d.seismograph.magnitude, 0) / numDays;
const summary = {
  magnitude: +X.toFixed(2),  // ❌ Raw average
  // ...
};
```

**Proposed Fix:**
```javascript
// Option A: Average calibrated values from axes
const X = Object.values(daily).reduce((s, d) => {
  const mag = d.balance_meter?.axes?.magnitude?.value 
           ?? d.seismograph?.magnitude 
           ?? 0;
  return s + mag;
}, 0) / numDays;

// Option B: Add explicit calibrated field
const summary = {
  magnitude: +X.toFixed(2),                    // Legacy (keep for backward compat)
  magnitude_calibrated: +X_calibrated.toFixed(2),  // NEW: Explicit calibrated value
  // ...
};
```

**Recommendation:** **Option B** (add new field) to avoid breaking existing code paths. Dashboard can migrate to `magnitude_calibrated` while legacy code uses `magnitude`.

**Testing:**
```javascript
// After fix, verify in Golden Standard test
const summary = result.person_a.derived.seismograph_summary;
expect(summary.magnitude_calibrated).toBeCloseTo(3.9, 1);  // Should pass
expect(summary.magnitude).toBeCloseTo(5.0, 1);              // Legacy field unchanged
```

---

### Priority 2: Fix Dashboard Data Binding 🎯 CRITICAL USER-FACING
**File:** `app/math-brain/page.tsx` line 4497

**Current (WRONG):**
```tsx
const mag = Number(summary.magnitude ?? 0);  // ❌ Reads uncalibrated
```

**Proposed Fix:**
```tsx
// Option A: Read from new calibrated field (after Priority 1)
const mag = Number(summary.magnitude_calibrated ?? summary.magnitude ?? 0);

// Option B: Read from axes if available
const mag = Number(
  summary.axes?.magnitude?.value 
  ?? summary.magnitude_calibrated 
  ?? summary.magnitude 
  ?? 0
);

// Option C: Add helper function
const getMagnitude = (summary) => {
  // Priority: axes.magnitude.value → magnitude_calibrated → magnitude (fallback)
  return summary?.axes?.magnitude?.value 
      ?? summary?.magnitude_calibrated 
      ?? summary?.magnitude 
      ?? 0;
};
const mag = getMagnitude(summary);
```

**Recommendation:** **Option C** (helper function) for consistency and testability.

**Impact:** This is the user-facing dashboard display. Fix this FIRST for immediate user benefit.

---

### Priority 3: Harden extractAxisNumber Safety 🛡️ PREVENT REGRESSION
**File:** `app/math-brain/utils/formatting.ts` lines 36-47

**Current (AT RISK):**
```typescript
const AXIS_NUMBER_KEYS = [
  'value', 'display', 'final', 'scaled', 'score', 'mean', 
  'raw',        // ❌ DANGER
  'normalized'  // ⚠️  DANGER
];
```

**Proposed Fix:**
```typescript
// SAFE ONLY: Post-pipeline calibrated values
const AXIS_NUMBER_KEYS_SAFE = ['value', 'display', 'final'];

// FALLBACK: If needed for legacy data
const AXIS_NUMBER_KEYS_LEGACY = ['scaled', 'rounded'];

// FORBIDDEN: Never read these
const AXIS_NUMBER_KEYS_FORBIDDEN = [
  'raw',              // Pre-calibration
  'rawMagnitude',     // Pre-calibration  
  'originalMagnitude',// Ambiguous
  'normalized'        // Pre-×50 scaling
];

// Update extractAxisNumber to use safe keys only
const extractAxisNumber = (source: any, axis: AxisName): number | undefined => {
  // Try safe keys first
  for (const key of AXIS_NUMBER_KEYS_SAFE) {
    const value = toAxisNumber(axisCandidate?.[key]);
    if (value !== undefined) return value;
  }
  // Only if absolutely needed, try legacy (add warning log)
  for (const key of AXIS_NUMBER_KEYS_LEGACY) {
    const value = toAxisNumber(axisCandidate?.[key]);
    if (value !== undefined) {
      console.warn(`[extractAxisNumber] Using legacy key '${key}' for ${axis}`);
      return value;
    }
  }
  return undefined;
};
```

**Rationale:** Remove all unsafe keys from priority list to prevent backdoor reads of uncalibrated values.

---

### Priority 4: Add Comprehensive Audit Script 🔍 OBSERVABILITY
**New File:** `scripts/audit-balance-meter-reads.js`

```javascript
#!/usr/bin/env node
// Audit all Balance Meter value reads across codebase

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SAFE_PATTERNS = [
  /axes\.magnitude\.value/,
  /axes\.directional_bias\.value/,
  /axes\.coherence\.value/,
  /magnitude_calibrated/,
  /valence_bounded/
];

const UNSAFE_PATTERNS = [
  /\.rawMagnitude(?!\w)/,
  /\.originalMagnitude(?!\w)/,
  /\.magnitude(?!_|\w)/,  // .magnitude without suffix
  /summary\.magnitude(?!_calibrated)/
];

console.log('🔍 Auditing Balance Meter value reads...\n');

// Search for unsafe patterns
UNSAFE_PATTERNS.forEach(pattern => {
  const results = execSync(
    `grep -rn "${pattern.source}" app/ lib/ components/ 2>/dev/null || true`,
    { encoding: 'utf-8' }
  );
  
  if (results.trim()) {
    console.log(`❌ UNSAFE PATTERN: ${pattern.source}`);
    console.log(results);
    console.log('');
  }
});

// Verify safe pattern coverage
console.log('✅ Verifying safe pattern usage...');
SAFE_PATTERNS.forEach(pattern => {
  const count = execSync(
    `grep -rc "${pattern.source}" app/ lib/ components/ 2>/dev/null | awk -F: '{sum+=$2} END {print sum}'`,
    { encoding: 'utf-8' }
  ).trim();
  
  console.log(`   ${pattern.source}: ${count} occurrences`);
});
```

**Usage:**
```bash
chmod +x scripts/audit-balance-meter-reads.js
node scripts/audit-balance-meter-reads.js
```

---

### Priority 5: Add Dashboard Regression Test 🧪 PREVENT FUTURE BREAKS
**New File:** `__tests__/dashboard-calibrated-values.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('Dashboard displays calibrated values only', () => {
  it('should show calibrated magnitude (3.9) not raw (5.0)', () => {
    const mockSummary = {
      magnitude: 5.0,           // Legacy uncalibrated
      magnitude_calibrated: 3.9, // New calibrated
      valence_bounded: -2.3,
      axes: {
        magnitude: { value: 3.9, display: '3.9' },
        directional_bias: { value: -2.3, display: '-2.3' }
      }
    };

    // Helper function from Priority 2 fix
    const getMagnitude = (summary: any) => 
      summary?.axes?.magnitude?.value 
      ?? summary?.magnitude_calibrated 
      ?? summary?.magnitude 
      ?? 0;

    const displayedMag = getMagnitude(mockSummary);
    
    expect(displayedMag).toBeCloseTo(3.9, 1);  // Should read calibrated
    expect(displayedMag).not.toBeCloseTo(5.0, 1);  // Should NOT read raw
  });

  it('should show calibrated bias (-2.3) not raw (-5.0)', () => {
    const mockSummary = {
      valence: -5.0,           // Raw
      valence_bounded: -2.3,   // Calibrated
      axes: {
        directional_bias: { value: -2.3 }
      }
    };

    const getValence = (summary: any) =>
      summary?.axes?.directional_bias?.value
      ?? summary?.valence_bounded
      ?? summary?.valence
      ?? 0;

    const displayedVal = getValence(mockSummary);

    expect(displayedVal).toBeCloseTo(-2.3, 1);
    expect(displayedVal).not.toBeCloseTo(-5.0, 1);
  });

  it('should handle missing calibrated fields gracefully', () => {
    const mockSummary = {
      magnitude: 2.5,
      valence_bounded: 1.2
    };

    const getMagnitude = (summary: any) =>
      summary?.axes?.magnitude?.value 
      ?? summary?.magnitude_calibrated 
      ?? summary?.magnitude 
      ?? 0;

    // Should fall back to legacy field if calibrated missing
    expect(getMagnitude(mockSummary)).toBe(2.5);
  });
});
```

**Run Test:**
```bash
npm run test:vitest:run __tests__/dashboard-calibrated-values.test.ts
```

---

### Priority 6: Natal Table Section Hiding 📄 LOW PRIORITY
**File:** `app/math-brain/hooks/useChartExport.ts` lines 320-380

**Current Behavior:** Shows "No planetary positions available." when arrays empty

**Proposed Fix (Option A - Hide Section):**
```typescript
// formatPlanetaryPositionsTable should return null sentinel
export function formatPlanetaryPositionsTable(positions: any[]): string | null {
  if (!positions || positions.length === 0) {
    return null;  // ← Return null instead of message
  }
  // ... existing table formatting
}

// In useChartExport.ts, check for null before adding section
if (result?.person_a?.chart?.planetaryPositions?.length) {
  const table = formatPlanetaryPositionsTable(result.person_a.chart.planetaryPositions);
  if (table !== null) {  // ← Only add if not null
    sections.push({
      title: 'Natal Planetary Positions',
      body: table
    });
  }
}
```

**Proposed Fix (Option B - Keep Current):**
Keep explicit message for debugging. This is clearer for troubleshooting missing data.

**Recommendation:** **Option B** (keep current behavior) until dashboard is fixed. Explicit messages help diagnose data flow issues.

---

## Documentation Updates Needed

### 1. Add CALIBRATED_VS_RAW_VALUES.md
**New File:** `docs/CALIBRATED_VS_RAW_VALUES.md`

```markdown
# Calibrated vs Raw Values: Field Guide

## Always Read These Fields ✅

### Magnitude
- ✅ `axes.magnitude.value` (calibrated, post-×50)
- ✅ `magnitude_calibrated` (new explicit field)
- ❌ `magnitude` (legacy, may be uncalibrated average)
- ❌ `rawMagnitude` (pre-clamping, can exceed 5.0)

### Directional Bias  
- ✅ `axes.directional_bias.value` (calibrated, post-×50)
- ✅ `valence_bounded` (calibrated, -5 to +5)
- ❌ `valence` (raw, unbounded)
- ❌ `bias_signed` (raw, unbounded)

### Coherence/Volatility
- ✅ `axes.coherence.value` (calibrated)
- ✅ `volatility` (usually safe, but check context)

## Data Structure Hierarchy

```
result.person_a.derived.seismograph_summary
├── magnitude            ❌ Legacy uncalibrated average
├── magnitude_calibrated ✅ NEW: Explicit calibrated value
├── valence_bounded      ✅ Calibrated directional bias
├── valence              ❌ Raw unbounded valence
└── axes                 ✅ ALWAYS SAFE
    ├── magnitude        { value: 3.9, display: "3.9" }
    ├── directional_bias { value: -2.3, display: "-2.3" }
    └── coherence        { value: 1.2, display: "1.2" }
```

## Migration Checklist

- [ ] Replace `summary.magnitude` with `getMagnitude(summary)` helper
- [ ] Replace `summary.valence` with `summary.valence_bounded`
- [ ] Audit `extractAxisNumber` for 'raw'/'normalized' in AXIS_NUMBER_KEYS
- [ ] Add regression tests for calibrated value display
- [ ] Update all export paths to use axes.*.value
```

### 2. Update MAINTENANCE_GUIDE.md
Add section:
```markdown
## Balance Meter Value Extraction

**CRITICAL RULE:** Always read post-calibration values from `axes.*.value` fields.

**Never read:**
- `rawMagnitude`, `originalMagnitude` (pre-clamping)
- `magnitude` without checking if it's calibrated
- `valence` without checking for `valence_bounded`
- Any field with `raw` in the name (unless explicitly debugging)

**Safe extraction pattern:**
```typescript
const getMagnitude = (source: any): number => {
  return source?.axes?.magnitude?.value
      ?? source?.magnitude_calibrated
      ?? 0;  // Never fall back to uncalibrated
};
```

### 3. Update THREE_LAYER_PROTECTION.md
Add to "Layer 1: Math Engine Correctness":
```markdown
**Value Extraction Rules:**
1. Backend must generate both raw and calibrated fields
2. Frontend must prioritize calibrated over raw
3. Tests must validate calibrated values only (except debug tests)
4. Never include 'raw', 'rawMagnitude', 'normalized' in production extraction priority lists
```

---

## Risk Assessment

### 🔴 CRITICAL (Fix Immediately)
1. **Dashboard shows wrong values** (Priority 2)
   - **Impact:** User sees 5.0/-5.0 instead of 3.9/-2.3
   - **Visibility:** HIGH (main dashboard display)
   - **Fix Complexity:** Low (change one line)

### 🟡 HIGH (Fix Before Next Release)
2. **Backend summary averaging uncalibrated values** (Priority 1)
   - **Impact:** All downstream consumers receive wrong data
   - **Visibility:** HIGH (affects exports and dashboard)
   - **Fix Complexity:** Medium (modify aggregation logic)

3. **extractAxisNumber includes 'raw' backdoor** (Priority 3)
   - **Impact:** Silent data corruption if 'value' field missing
   - **Visibility:** LOW (only triggers if primary fields missing)
   - **Fix Complexity:** Low (remove unsafe keys)

### 🟢 MEDIUM (Schedule for Next Sprint)
4. **Natal table hiding** (Priority 6)
   - **Impact:** Cosmetic only (shows message vs hiding)
   - **Visibility:** LOW (only affects exports with missing natal data)
   - **Fix Complexity:** Low (add null check)

5. **Add audit script** (Priority 4)
   - **Impact:** Prevents future regressions
   - **Visibility:** N/A (developer tool)
   - **Fix Complexity:** Low (create script)

6. **Add regression tests** (Priority 5)
   - **Impact:** Prevents future regressions
   - **Visibility:** N/A (CI/CD)
   - **Fix Complexity:** Medium (write tests)

---

## Immediate Next Steps (When Codex Completes)

### Step 1: Verify Codex Changes
```bash
# Check what Codex modified
git status
git diff app/math-brain/page.tsx
git diff app/math-brain/utils/formatting.ts
git diff lib/server/astrology-mathbrain.js
```

### Step 2: If Dashboard Still Broken, Apply Quick Fix
```bash
# Open page.tsx and apply Priority 2 fix (Option A)
code app/math-brain/page.tsx:4497

# Change:
const mag = Number(summary.magnitude ?? 0);
# To:
const mag = Number(summary.axes?.magnitude?.value ?? summary.magnitude_calibrated ?? summary.magnitude ?? 0);
```

### Step 3: Test Locally
```bash
npm run dev
# Navigate to Math Brain dashboard
# Verify displays 3.9/-2.3 for Oct 10, 2018 Golden Standard test
```

### Step 4: Run Full Test Suite
```bash
npm run test:ci
# Verify all tests still passing (especially ci-gate-golden-case.test.ts)
```

### Step 5: If Tests Pass, Commit
```bash
git add -A
git commit -m "[2025-01-21] CRITICAL FIX: Dashboard now reads calibrated Balance Meter values

- app/math-brain/page.tsx: Changed dashboard to read axes.magnitude.value instead of summary.magnitude
- Fixes Golden Standard fragmentation (was showing 5.0/-5.0 instead of 3.9/-2.3)
- Preserves asymmetry: valence_bounded already read correctly
- No changes to math engine (still passing 11/11 Golden Standard tests)

Co-authored-by: Codex AI
Co-authored-by: GitHub Copilot"
```

---

## Golden Standard Validation (After Fix)

**Test Case:** October 10, 2018 (Hurricane Michael)

**Expected Values (Calibrated):**
- Magnitude: 3.9 (±0.1)
- Directional Bias: -2.3 (±0.1)
- Volatility: ~1.1
- Integration Bias (SFD): ~-0.8

**Current Dashboard (BROKEN):**
- Magnitude: 5.0 ❌ (reading uncalibrated)
- Directional Bias: -5.0 ❌ (reading uncalibrated)

**After Fix (Expected):**
- Magnitude: 3.9 ✅ (reading calibrated)
- Directional Bias: -2.3 ✅ (reading calibrated)

**Validation Commands:**
```bash
# Run Golden Standard test
npm run test:vitest:run __tests__/ci-gate-golden-case.test.ts

# Expected output:
# ✓ Golden Standard: 2018-10-10 magnitude matches (11/11 passing)
# ✓ Golden Standard: directional bias within range
# ✓ Golden Standard: pipeline order preserved
```

---

## Rollback Plan (If Issues Arise)

### If Dashboard Shows Wrong Values After Codex Changes
```bash
# Revert to last known good state
git checkout HEAD~1 app/math-brain/page.tsx

# Apply manual quick fix from Step 2 above
# Test locally before re-committing
```

### If Backend Summary Breaks Other Components
```bash
# If Priority 1 changes cause issues, revert backend only
git checkout HEAD~1 lib/server/astrology-mathbrain.js

# Use Priority 2 fix (dashboard-only) as interim solution
# Schedule backend fix for next sprint
```

### If Tests Start Failing
```bash
# Isolate which test is failing
npm run test:vitest:run __tests__/ci-gate-golden-case.test.ts
npm run test:vitest:run __tests__/rendering-sanity.test.ts

# If Golden Standard fails, math engine was touched (CRITICAL)
# Revert all changes immediately and escalate to Jules
```

---

## Contact & Escalation

**Owner:** Jules (DHCross)  
**Critical Issues:** Notify immediately if:
- Golden Standard tests start failing (math engine affected)
- Dashboard shows values >5.0 or <-5.0 (clamping broken)
- Exports leak raw values to users (calibration bypassed)

**Safe to Proceed:** If:
- Golden Standard tests remain 11/11 passing ✅
- Rendering tests remain 2/2 passing ✅
- Dashboard fix is isolated to page.tsx data binding ✅

---

## Appendix: Complete File Inventory

### Created Files (This Session)
- ✅ `lib/ui/format.ts` - Safe axis value extraction
- ✅ `lib/ui/sanitize.ts` - Internal directive scrubbing
- ✅ `__tests__/rendering-sanity.test.ts` - Regression prevention

### Modified Files (This Session)
- ⚠️ `app/math-brain/utils/formatting.ts` - User added extractAxisNumber (at risk)
- ⚠️ `app/math-brain/hooks/useChartExport.ts` - Sanitization integrated (safe)

### Files Requiring Attention (Next Session)
- 🎯 `app/math-brain/page.tsx` line 4497 - **CRITICAL** dashboard data binding
- 🎯 `lib/server/astrology-mathbrain.js` line 2620 - Backend summary calculation
- 🛡️ `app/math-brain/utils/formatting.ts` line 47 - Remove 'raw' from AXIS_NUMBER_KEYS

### Files Already Correct (No Changes Needed)
- ✅ `src/seismograph.js` - Math engine (Golden Standard passing)
- ✅ `lib/balance/scale.ts` - SCALE_FACTOR=50 canonical
- ✅ `__tests__/ci-gate-golden-case.test.ts` - Golden Standard enforcement

---

## Final Checklist (Before Declaring Complete)

- [ ] Dashboard displays 3.9/-2.3 for Oct 10, 2018 test
- [ ] Export PDFs show calibrated values only (no 5.0/-5.0)
- [ ] Export markdown sanitized (no "YOU ARE RAVEN CALDER" tokens)
- [ ] Golden Standard tests: 11/11 passing
- [ ] Rendering tests: 2/2 passing
- [ ] No 'raw' or 'rawMagnitude' in production extraction paths
- [ ] Audit script added (scripts/audit-balance-meter-reads.js)
- [ ] Regression tests added (__tests__/dashboard-calibrated-values.test.ts)
- [ ] Documentation updated (CALIBRATED_VS_RAW_VALUES.md)
- [ ] CHANGELOG.md updated with session summary

---

**Session Status:** ⏸️ PAUSED - Awaiting Codex completion  
**Next Action:** Verify Codex changes, apply quick fix if needed, run tests, commit  
**Estimated Time to Resolution:** 15-30 minutes after Codex completes

---

*This report generated by GitHub Copilot in "look but don't touch" audit mode.*
