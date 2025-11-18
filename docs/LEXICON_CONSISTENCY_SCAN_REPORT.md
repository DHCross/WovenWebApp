# Lexicon Consistency Scan Report
**Date**: November 18, 2025  
**Scope**: FIELD→MAP→VOICE Translation Pipeline  
**Status**: ✅ Build-time lint PASSED | ⚠️ User-facing inconsistencies FOUND

---

## Executive Summary

The build-time lexicon lint (`scripts/lexicon-lint.mjs`) **passed successfully**, confirming no forbidden patterns in source code. However, a manual deep scan revealed **user-facing terminology inconsistencies** that violate Raven Calder's v5.0 specification.

### Critical Findings

1. ✅ **Directional/Neutral Boundary**: No violations found
2. ⚠️ **"Climate" vs "Symbolic Weather"**: 5 user-facing violations
3. ⚠️ **"Collapse" vs "Compression"**: 2 legacy violations
4. ✅ **FIELD→MAP→VOICE Separation**: Properly enforced
5. ✅ **Approved Label System**: Functioning correctly

---

## 1. Directional/Neutral Term Boundary ✅

**Status**: COMPLIANT

**Validation**:
- Lexical guard system enforces semantic orthogonality (`src/validation/lexical-guard.ts:30`)
- No instances of directional terms (expansion/contraction) mixed with neutral terms (magnitude/intensity)
- Build-time enforcement prevents violations

**Files Checked**:
- `src/validation/lexical-guard.ts` - Guard definitions
- `lib/voice/guard.ts` - Runtime enforcement
- All `*.ts`, `*.tsx`, `*.js` source files

**Result**: ✅ No violations detected

---

## 2. "Climate" vs "Symbolic Weather" ⚠️

**Status**: INCONSISTENT

**Raven's Mandate**:
> "Climate" implies a static background; "Symbolic Weather" describes the active, navigational pressure fronts defined in the Symbolic Seismograph protocols.

### User-Facing Violations Found

#### **Violation 1: `lib/climate-renderer.ts` (lines 135, 141)**
```typescript
// CURRENT (INCORRECT):
return `Symbolic Climate: ⚡ ${climate.magnitude} magnitude · ⚖️ neutral balance · ${volEmoji} ${climate.volatility} volatility`;

return `Symbolic Climate: ⚡ ${climate.magnitude} magnitude · ${emojiExplanation} · ${volEmoji} ${climate.volatility} volatility`;

// SHOULD BE:
return `Symbolic Weather: ⚡ ${climate.magnitude} magnitude · ⚖️ neutral balance · ${volEmoji} ${climate.volatility} volatility`;

return `Symbolic Weather: ⚡ ${climate.magnitude} magnitude · ${emojiExplanation} · ${volEmoji} ${climate.volatility} volatility`;
```

**Impact**: High - This is a user-facing display string  
**Function**: `formatFullClimateDisplay()`  
**Used by**: Balance Meter summary displays

---

#### **Violation 2: `components/mathbrain/BalanceMeterSummary.tsx` (line 125)**
```tsx
// CURRENT (INCORRECT):
<h3 className="text-sm font-semibold text-indigo-200 mb-3">Period Symbolic Climate Pattern</h3>

// SHOULD BE:
<h3 className="text-sm font-semibold text-indigo-200 mb-3">Period Symbolic Weather Pattern</h3>
```

**Impact**: High - Visible header in Balance Meter summary  
**Component**: `BalanceMeterSummary`

---

#### **Violation 3: `components/mathbrain/BalanceMeterSummary.tsx` (line 215)**
```tsx
// CURRENT (INCORRECT):
{isLatentField ? 'Dormant Field Symbolic Climate (Conditional)' : 'Period Pattern Analysis'}

// SHOULD BE:
{isLatentField ? 'Dormant Field Symbolic Weather (Conditional)' : 'Period Pattern Analysis'}
```

**Impact**: Medium - Conditional header for latent fields  
**Component**: `BalanceMeterSummary`

---

#### **Violation 4: `app/math-brain/hooks/useChartExport.ts` (lines 637, 1452)**
```typescript
// CURRENT (INCORRECT):
} SYMBOLIC WEATHER — Transits (Current Symbolic Climate)

// SHOULD BE:
} SYMBOLIC WEATHER — Transits (Current Symbolic Weather)
```

**Impact**: Medium - Markdown export instructions  
**Function**: `downloadResultPDF()` and JSON export

---

#### **Violation 5: `lib/prompts.ts` (lines 520, 622)**
```typescript
// CURRENT (INCORRECT):
1. **Narrative Fit** — Do your journal entries or daily stories echo the symbolic climate?

A: Uncanny Scoring is strictly post-hoc. The Balance Meter generates the map (symbolic climate).

// SHOULD BE:
1. **Narrative Fit** — Do your journal entries or daily stories echo the symbolic weather?

A: Uncanny Scoring is strictly post-hoc. The Balance Meter generates the map (symbolic weather).
```

**Impact**: Medium - Documentation and prompt templates  
**File**: Core prompts used by LLM

---

### Internal Variable Names (Acceptable)

The following uses of "climate" are **acceptable** as they are internal variable/function names, not user-facing text:

- `ClimateData` interface
- `formatClimateDisplay()` function
- `generateClimateNarrative()` function
- `climateClasses` variable
- `climateLine` property

**Rationale**: Internal naming conventions can remain for code consistency. Only user-facing strings must say "Symbolic Weather."

---

## 3. "Collapse" vs "Compression" ⚠️

**Status**: LEGACY VIOLATIONS FOUND

**Raven's Mandate**:
> "The term 'Collapse' for a negative Directional Bias is a legacy artifact (pre-v3 'theatrical weighting') that violates the Epistemological Integrity protocols... a negative bias (–3 to –5) represents **Compression or Contraction**—a structural tightening essential for density and focus—not a failure of state."

### Violations Found

#### **Violation 1: `lib/reporting/metric-labels.js` (line 142)**
```javascript
// CURRENT (INCORRECT):
{ min: -5, max: -4, label: 'Collapse', emoji: '🌋', polarity: 'negative', code: 'collapse' },

// SHOULD BE:
{ min: -5, max: -4, label: 'Compression', emoji: '🌋', polarity: 'negative', code: 'compression' },
```

**Impact**: High - Legacy valence level definition  
**Note**: File comment says "Legacy valence (for backward compatibility only)"  
**Recommendation**: Update to v5.0 terminology or deprecate entirely

---

#### **Violation 2: `lib/pdf/archival-mode-generator.ts` (line 439)**
```typescript
// CURRENT (INCORRECT):
'−5  Compression — maximum restrictive tilt, collapsed field',

// SHOULD BE:
'−5  Compression — maximum restrictive tilt, deep inward compression',
```

**Impact**: Low - PDF legend text uses "collapsed field" descriptor  
**Recommendation**: Replace "collapsed field" with "deep inward compression"

---

### Acceptable Uses of "Collapse"

The following uses are **acceptable** as they refer to Shadow Restoration Protocol (SRP) concepts, not directional bias:

- `collapseMode` in SRP schema (e.g., "self-devouring", "custody")
- `getSafeCollapseMode()` function in `lib/srp/guards.ts`
- Shadow ledger entries describing collapse modes

**Rationale**: SRP "collapse mode" describes shadow fracture patterns, not directional bias states.

---

## 4. FIELD→MAP→VOICE Layer Separation ✅

**Status**: COMPLIANT

**Validation**:
- Frontstage renderer properly enforces layer separation (`src/frontstage-renderer.ts:15`)
- Natal-only mode strips balance payload correctly (`src/frontstage-renderer.ts:240`)
- Preface construction follows conversational protocol (`src/frontstage-renderer.ts:328`)

**Key Components**:
1. **FIELD Layer**: Raw emotional texture extraction ✅
2. **MAP Layer**: Symbolic structure mapping ✅
3. **VOICE Layer**: Conversational synthesis ✅

**Files Checked**:
- `src/frontstage-renderer.ts`
- `lib/prompts.ts`
- `lib/blueprint-narrator.ts`
- `lib/weather-narrator.ts`
- `lib/reflection-narrator.ts`

**Result**: ✅ Layers properly separated, no violations

---

## 5. Approved Label System ✅

**Status**: FUNCTIONING CORRECTLY

**Validation**:
- `synthesizeLabel()` function correctly maps metrics to approved labels (`lib/voice/labels.ts:12`)
- Guard system replaces uncodified patterns (`lib/voice/guard.ts:33`)
- No forbidden composite labels (e.g., "Surge Collapse") detected

**Approved Labels**:
- Diagnostic Surge ✅
- Compression Phase ✅
- Expansion Phase ✅
- Systemic Shutdown ✅
- Stabilization Window ✅
- Structural Reset ✅

**Result**: ✅ No violations detected

---

## 6. SST Falsifiability Tracking ✅

**Status**: FUNCTIONING CORRECTLY

**Validation**:
- WB/ABE/OSR classification system operational (`src/feedback/sst-log-manager.js:8`)
- Alignment detection working (`src/feedback/sst-log-manager.js:98`)
- Log entry creation and session stats tracking functional

**Result**: ✅ No violations detected

---

## Recommended Fixes

### Priority 1: High Impact (User-Facing)

1. **`lib/climate-renderer.ts`** (lines 135, 141)
   - Replace `Symbolic Climate:` with `Symbolic Weather:`
   - Impact: Balance Meter displays

2. **`components/mathbrain/BalanceMeterSummary.tsx`** (lines 125, 215)
   - Replace `Period Symbolic Climate Pattern` with `Period Symbolic Weather Pattern`
   - Replace `Dormant Field Symbolic Climate` with `Dormant Field Symbolic Weather`
   - Impact: Balance Meter summary headers

3. **`lib/reporting/metric-labels.js`** (line 142)
   - Replace `'Collapse'` with `'Compression'`
   - Replace `code: 'collapse'` with `code: 'compression'`
   - Impact: Legacy valence level mapping

### Priority 2: Medium Impact (Export/Documentation)

4. **`app/math-brain/hooks/useChartExport.ts`** (lines 637, 1452)
   - Replace `(Current Symbolic Climate)` with `(Current Symbolic Weather)`
   - Impact: Markdown export instructions

5. **`lib/prompts.ts`** (lines 520, 622)
   - Replace `symbolic climate` with `symbolic weather`
   - Impact: LLM prompt templates

### Priority 3: Low Impact (Polish)

6. **`lib/pdf/archival-mode-generator.ts`** (line 439)
   - Replace `collapsed field` with `deep inward compression`
   - Impact: PDF legend text

---

## Implementation Plan

### Step 1: Update User-Facing Strings
```bash
# Files to edit:
- lib/climate-renderer.ts (2 instances)
- components/mathbrain/BalanceMeterSummary.tsx (2 instances)
- lib/reporting/metric-labels.js (1 instance)
```

### Step 2: Update Export Templates
```bash
# Files to edit:
- app/math-brain/hooks/useChartExport.ts (2 instances)
- lib/prompts.ts (2 instances)
```

### Step 3: Polish PDF Legends
```bash
# Files to edit:
- lib/pdf/archival-mode-generator.ts (1 instance)
```

### Step 4: Verify Build
```bash
npm run build
```

### Step 5: Test User-Facing Output
- Generate Balance Meter report
- Verify "Symbolic Weather" appears in headers
- Verify "Compression" appears for -5 bias
- Download PDF and check legend

---

## Summary Statistics

| Category | Status | Violations | Priority |
|----------|--------|------------|----------|
| Directional/Neutral Boundary | ✅ PASS | 0 | - |
| "Climate" vs "Symbolic Weather" | ⚠️ FAIL | 5 | High |
| "Collapse" vs "Compression" | ⚠️ FAIL | 2 | High |
| FIELD→MAP→VOICE Separation | ✅ PASS | 0 | - |
| Approved Label System | ✅ PASS | 0 | - |
| SST Falsifiability Tracking | ✅ PASS | 0 | - |

**Total Violations**: 7  
**High Priority**: 5  
**Medium Priority**: 2  
**Low Priority**: 0

---

## Conclusion

The FIELD→MAP→VOICE translation pipeline is **architecturally sound** with proper layer separation and semantic boundary enforcement. However, **user-facing terminology** requires updates to align with Raven Calder's v5.0 specification:

1. Replace "Symbolic Climate" with "Symbolic Weather" (5 instances)
2. Replace "Collapse" with "Compression" (2 instances)

All violations are **localized and straightforward to fix**. No architectural changes required.

---

**Next Action**: Implement Priority 1 fixes (user-facing strings) to achieve full v5.0 compliance.
