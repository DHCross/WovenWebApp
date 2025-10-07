# Epistemic Rigor Specification

**Version:** 1.0.0  
**Status:** ✅ Implemented  
**Last Updated:** 2025-01-21

## Overview

This specification documents the formal epistemic rigor framework implemented in the Woven Map system, transforming symbolic interpretation from metaphorical art to structured epistemic instrument.

**Core Principle:**  
> Truth = fidelity across layers. When geometry, data, and language align, the mirror holds.

---

## Table of Contents

1. [Philosophical Foundation](#philosophical-foundation)
2. [Core Components](#core-components)
3. [Implementation Details](#implementation-details)
4. [Usage Guide](#usage-guide)
5. [Recovery Protocols](#recovery-protocols)
6. [Testing & Validation](#testing--validation)

---

## Philosophical Foundation

### From Metaphor to Specification

The Woven Map system implements measurable epistemic rigor through:

1. **Quantified Symbolic Entropy** - The spread of interpretive possibilities
2. **Falsifiable Thresholds** - Narrative flattening detection
3. **Orthogonal Axes** - Preventing semantic collapse
4. **Transformation Traceability** - Every value's journey is auditable
5. **Null Honesty** - No fabricated data; nulls stay null
6. **Observer Bias Mitigation** - Risk labeling for high-signal/high-misread scenarios

### Key Concepts

#### Symbolic Entropy
Entropy = Coherence variance + drift from baseline distribution

**Formula:**
```
entropy = √(Σ(coherence - mean)² / n) + 2 × |mean - baseline|
```

**Thresholds:**
- Normal: entropy < 1.5
- Elevated: entropy ≥ 1.5
- Flattening: coherence < 2.0 AND |bias| ≥ 4.5

#### Narrative Flattening
A catastrophic state where the system enters monotony:
- **Condition:** Coherence drops below 2.0 AND Directional Bias locks at endpoint (|bias| ≥ 4.5)
- **Effect:** Symbolic variation collapses; all readings sound identical
- **Detection:** Automated via `detectNarrativeFlattening()`

#### Epistemic Key Leakage
Catastrophic semantic failure modes:
1. **Fabricated Data:** Nulls replaced with fake values
2. **Axis Collapse:** Magnitude = |Bias| (suspicious correlation)
3. **Missing Provenance:** Values without transformation metadata

---

## Core Components

### 1. Epistemic Integrity Module
**File:** `lib/reporting/epistemic-integrity.js`

**Functions:**
- `calculateSymbolicEntropy(readings, baseline)` - Quantify interpretive spread
- `detectNarrativeFlattening(coherence, bias)` - Detect monotony condition
- `checkAxesOrthogonality(readings)` - Ensure axes remain independent
- `detectEpistemicKeyLeakage(reading)` - Detect catastrophic failures
- `assessMisinterpretationRisk(reading)` - Label high-risk readings
- `enforceNullHonesty(data, fields)` - Ensure nulls stay null

**Key Thresholds:**
```javascript
const ENTROPY_THRESHOLDS = {
  COHERENCE_FLATLINE: 2.0,
  BIAS_ENDPOINT: 4.5,
  COHERENCE_VARIANCE_HIGH: 1.5,
  DRIFT_THRESHOLD: 0.3
};
```

### 2. Transformation Trace Module
**File:** `lib/reporting/transformation-trace.js`

**Purpose:** Auditable pipeline for all data transformations

**Canonical Pipeline Order:**
```
normalize → scale → clamp → (round) → display
```

**Functions:**
- `createTrace(initialValue, field)` - Initialize trace
- `addStep(trace, operation, input, output, metadata)` - Log transformation
- `finalizeTrace(trace, finalValue)` - Complete and validate trace
- `createProvenanceStamp(trace, context)` - Generate audit stamp
- `replayTrace(trace)` - Verify transformation chain
- `generateTraceReport(trace)` - Human-readable audit report

**Pipeline Validation:**
- Detects out-of-order operations (e.g., clamp before normalize)
- Flags duplicate operations (suspicious)
- Ensures chain continuity (step N output = step N+1 input)

### 3. Lexical Guard Module
**File:** `src/validation/lexical-guard.ts`

**Purpose:** Prevent cross-contamination between axes (lexical bleed)

**Vocabulary Categories:**

**Directional Terms** (Bias only):
- expansion, contraction, outward, inward, opening, closing, etc.

**Functions:**
- `lintText(text, expectedContext, fieldName)` - Check single text string
- `lintReading(reading)` - Check complete reading object
- `lintPayload(payload)` - Check entire balance meter output
- `assertLexicalIntegrity(payload)` - Build-time check (throws on violation)
- `getSuggestedReplacements(term, targetContext)` - Suggest correct terms

**Violation Severity:**
- **ERROR:** Direct lexical bleed (cohesion term in directional context or vice versa)
- **WARNING:** Suspicious patterns or missing context

---

## Implementation Details

### Canonical Scaling Enhancements

The `lib/reporting/canonical-scaling.js` module now includes provenance metadata in all scaling operations:

```javascript
// Added to scaleDirectionalBias() output
meta: {
  // ... existing metadata
  transform_pipeline: ['sign_resolution', 'magnitude_selection', 'clamp', 'round'],
  timestamp: '2025-01-21T...'
}

// Added to scaleMagnitude() output
meta: {
  // ... existing metadata
  transform_pipeline: ['use_normalised', 'reference_scaling', 'clamp', 'round'],
  timestamp: '2025-01-21T...'
}
```

### Integration Points

#### Math Brain → Poetic Brain
Before sending data to Poetic Brain:
1. **Lexical Lint:** `lintPayload(payload)` - Check for terminology bleed
2. **Epistemic Check:** `detectEpistemicKeyLeakage(reading)` - Validate data integrity
3. **Risk Assessment:** `assessMisinterpretationRisk(reading)` - Flag high-risk readings

#### Contract Linter Enhancement
The existing `ContractLinter` can be extended with epistemic checks:

```typescript
// In contract-linter.ts
import { lintPayload } from '../validation/lexical-guard';
import { detectEpistemicKeyLeakage } from '../../lib/reporting/epistemic-integrity';

// Add to lint() method
const lexicalResult = lintPayload(payload);
if (!lexicalResult.valid) {
  errors.push(...lexicalResult.violations.map(v => v.message));
}
```

---

## Usage Guide

### Example: Entropy Monitoring

```javascript
const { calculateSymbolicEntropy } = require('./lib/reporting/epistemic-integrity');

// Recent 14-day readings
const readings = [
  { coherence: 3.2, magnitude: 2.5, bias: 1.2 },
  { coherence: 3.5, magnitude: 2.8, bias: 1.5 },
  // ... more readings
];

const baseline = {
  meanCoherence: 3.5,
  meanBias: 1.0
};

const entropy = calculateSymbolicEntropy(readings, baseline);

if (entropy.status === 'flattening') {
  console.warn('⚠️ Narrative flattening detected');
  console.warn('Coherence:', entropy.details.meanCoherence);
  console.warn('System entering monotony - readings may lack variation');
}
```

### Example: Transformation Trace

```javascript
const {
  createTrace,
  addStep,
  finalizeTrace,
  createProvenanceStamp
} = require('./lib/reporting/transformation-trace');

// Create trace
let trace = createTrace(8.5, 'magnitude');

// Log each transformation
trace = addStep(trace, 'normalize', 8.5, 4.2, { method: 'rolling_window' });
trace = addStep(trace, 'scale', 4.2, 3.8, { cap: 5.0 });
trace = addStep(trace, 'clamp', 3.8, 3.8, { range: [0, 5] });
trace = addStep(trace, 'round', 3.8, 3.8, { precision: 2 });

// Finalize and create stamp
trace = finalizeTrace(trace, 3.8);
const stamp = createProvenanceStamp(trace, {
  scalingMode: 'rolling_window_v3',
  confidence: 0.85
});

// Stamp is now available for display or audit
console.log('Provenance:', stamp);
```

### Example: Lexical Linting

```typescript
import { lintPayload, generateLexicalReport } from './src/validation/lexical-guard';

const payload = {
  balance_meter: {
    bias_label: 'Strong outward expansion'      // ✅ Correct
  }
};

const result = lintPayload(payload);

if (!result.valid) {
  const report = generateLexicalReport(result);
  console.error(report);
  throw new Error('Lexical integrity violation');
}
```

---

## Recovery Protocols

### Narrative Flattening Recovery

**Steps:**
1. **Detect:** `detectNarrativeFlattening()` returns critical severity
2. **Freeze:** Stop generating new readings until investigated
3. **Audit:** Review recent readings for monotony pattern
4. **Adjust:** Check if:
   - Magnitude normalization is over-aggressive
   - Bias calibration has locked to endpoint
   - Volatility calculation is suppressed
5. **Restore:** Adjust normalization window or reset baseline
6. **Verify:** Generate test reading and check coherence variance

### Epistemic Key Leakage Recovery

**Protocol:**
1. **Freeze:** Halt display output immediately
2. **Purge:** Remove fabricated values; replace with `null` + `status: 'n/a'`
3. **Restore Orthogonality:** 
   - Verify Magnitude ≠ |Bias|
   - Check correlation coefficients
   - Ensure axes use independent calculations
4. **Stamp Provenance:**
   - Add transformation traces to all values
   - Document scaling mode and confidence
5. **Replay Trace:** Use `replayTrace()` to verify chain integrity
6. **Resume:** Only after all checks pass

### Lexical Bleed Recovery

**Steps:**
1. **Detect:** `lintPayload()` returns violations
2. **Identify:** Review violation fields and contaminating terms
3. **Replace:** Use `getSuggestedReplacements()` for correct terms
4. **Re-lint:** Verify clean result
5. **Deploy:** Update display strings

---

## Testing & Validation

### Test Files

1. **Epistemic Integrity:** `test/epistemic-integrity.test.js`
   - Entropy calculation
   - Flattening detection
   - Orthogonality checks
   - Key leakage detection
   - Risk assessment
   - Null honesty

2. **Transformation Trace:** `test/transformation-trace.test.js`
   - Trace creation and building
   - Pipeline validation
   - Provenance stamping
   - Replay verification
   - Report generation

3. **Lexical Guard:** `test/lexical-guard.test.ts`
   - Text linting (directional/cohesion contexts)
   - Reading object validation
   - Payload-wide checks
   - Violation reporting
   - Suggested replacements

### Running Tests

```bash
# Individual tests
node test/epistemic-integrity.test.js
node test/transformation-trace.test.js
npx tsx test/lexical-guard.test.ts

# All tests
npm test
```

### Success Criteria

All tests must pass with:
- ✅ Entropy correctly calculated and categorized
- ✅ Flattening detected when coherence < 2.0 AND |bias| ≥ 4.5
- ✅ Axis collapse detected (magnitude = |bias|)
- ✅ Pipeline order violations flagged
- ✅ Lexical bleed detected and reported
- ✅ Null values preserved (not fabricated)
- ✅ Transformation chains remain continuous

---

## Glossary

**Symbolic Entropy** - The spread of interpretive possibilities; measured by coherence variance + drift

**Narrative Flattening** - Collapse of symbolic variation (low coherence + endpoint bias)

**Epistemic Key Leakage** - Catastrophic semantic failure (fabricated data, axis collapse)

**Lexical Bleed** - Cross-contamination between directional and cohesion terminology

**Orthogonality** - Independence of axes (Magnitude, Bias, Coherence remain uncorrelated)

**Provenance Stamp** - Audit trail documenting all transformations and scaling decisions

**Transformation Trace** - Step-by-step record of value's journey from raw → display

**Null Honesty** - Principle that missing data displays as "n/a", never fabricated

**Observer Bias Risk** - High-signal readings that users may misinterpret dramatically

**Pipeline Order** - Canonical sequence: normalize → scale → clamp → round

---

## References

- Problem Statement: "From Metaphor to Specification"
- Math Brain Compliance: `MATH_BRAIN_COMPLIANCE.md`
- Canonical Scaling: `lib/reporting/canonical-scaling.js`
- Contract Linter: `src/contract-linter.ts`
- Seismograph: `src/seismograph.js`

---

**Maintained by:** Dan Cross (DHCross)  
**Implementation Date:** January 21, 2025  
**Version:** 1.0.0