# Reporting & Epistemic Rigor Modules

This directory contains the core modules for data transformation, scaling, and epistemic integrity enforcement in the Woven Map system.

## Core Modules

### 1. Canonical Scaling (`canonical-scaling.js`)
Provides honest 0-5 scaling for magnitude and -5 to +5 scaling for directional bias while preserving sign provenance and providing repeatable metadata.

**Key Functions:**
- `scaleDirectionalBias(raw, options)` - Scale signed bias to canonical range
- `scaleMagnitude(raw, options)` - Scale magnitude with reference-aware blending

**Features:**
- ✅ Preserves sign provenance
- ✅ Provides transformation metadata
- ✅ Includes provenance timestamps
- ✅ Tracks pipeline order

### 2. Epistemic Integrity (`epistemic-integrity.js`) ⭐ NEW
Implements formal epistemic rigor: entropy measurement, flattening detection, orthogonality validation, and observer bias mitigation.

**Key Functions:**
- `calculateSymbolicEntropy(readings, baseline)` - Quantify interpretive spread
- `detectNarrativeFlattening(coherence, bias)` - Detect monotony condition
- `checkAxesOrthogonality(readings)` - Ensure axes remain independent
- `detectEpistemicKeyLeakage(reading)` - Catch catastrophic failures
- `assessMisinterpretationRisk(reading)` - Label high-risk readings
- `enforceNullHonesty(data, fields)` - Ensure nulls stay null

**Features:**
- ✅ Falsifiable thresholds
- ✅ Measurable entropy
- ✅ Recovery protocols
- ✅ Observer bias protection

### 3. Transformation Trace (`transformation-trace.js`) ⭐ NEW
Provides auditable pipeline traceability for all data transformations with provenance stamping and replay verification.

**Key Functions:**
- `createTrace(initialValue, field)` - Initialize trace
- `addStep(trace, operation, input, output, metadata)` - Log transformation
- `finalizeTrace(trace, finalValue)` - Complete and validate
- `createProvenanceStamp(trace, context)` - Generate audit stamp
- `replayTrace(trace)` - Verify chain integrity
- `generateTraceReport(trace)` - Human-readable report

**Features:**
- ✅ Full audit trail
- ✅ Pipeline order validation
- ✅ Provenance metadata
- ✅ Replay verification

## Quick Usage Examples

### Canonical Scaling with Provenance
```javascript
const { scaleDirectionalBias, scaleMagnitude } = require('./canonical-scaling');

// Scale directional bias
const biasResult = scaleDirectionalBias(rawBias, {
  calibratedMagnitude: 3.8,
  confidence: 0.95
});
// biasResult.meta.transform_pipeline = ['sign_resolution', 'magnitude_selection', 'clamp', 'round']
// biasResult.meta.timestamp = '2025-01-21T...'

// Scale magnitude with rolling window
const magResult = scaleMagnitude(rawMag, {
  context: { median: 2.2, prior: 4.0, windowSize: 12 },
  cap: 5
});
// magResult.meta.transform_pipeline = ['use_normalised', 'reference_scaling', 'clamp', 'round']
```

### Epistemic Integrity Checks
```javascript
const {
  calculateSymbolicEntropy,
  detectNarrativeFlattening,
  assessMisinterpretationRisk
} = require('./epistemic-integrity');

// Check for narrative flattening
const flatCheck = detectNarrativeFlattening(coherence, bias);
if (flatCheck.flattening && flatCheck.severity === 'critical') {
  console.error('⚠️ Narrative flattening detected:', flatCheck.reason);
  // Trigger recovery protocol
}

// Calculate entropy over recent readings
const entropy = calculateSymbolicEntropy(recentReadings, baseline);
if (entropy.status === 'flattening') {
  console.warn('System entering monotony - investigate normalization');
}

// Assess misinterpretation risk
const risk = assessMisinterpretationRisk(reading);
if (risk.risk === 'high') {
  reading.interpretationWarning = risk.label;
  // Display: "High Signal / High Misinterpretation Risk"
}
```

### Transformation Traces
```javascript
const {
  createTrace,
  addStep,
  finalizeTrace,
  createProvenanceStamp
} = require('./transformation-trace');

// Create and build trace
let trace = createTrace(8.5, 'magnitude');
trace = addStep(trace, 'normalize', 8.5, 4.2, { method: 'rolling_window' });
trace = addStep(trace, 'scale', 4.2, 3.8, { cap: 5.0 });
trace = addStep(trace, 'clamp', 3.8, 3.8, { range: [0, 5] });
trace = finalizeTrace(trace, 3.8);

// Create provenance stamp
const stamp = createProvenanceStamp(trace, {
  scalingMode: 'rolling_window_v3',
  confidence: 0.95
});

// Stamp now contains:
// - Complete audit trail
// - Pipeline order validation
// - Timing information
// - Context metadata
```

## Key Thresholds

### Narrative Flattening
- **Condition:** `coherence < 2.0 AND |bias| ≥ 4.5`
- **Status:** `critical`
- **Action:** Freeze output, audit normalization

### Symbolic Entropy
- **Normal:** `entropy < 1.5`
- **Elevated:** `entropy ≥ 1.5` (high variance)
- **Flattening:** `coherence < 2.0` (approaching monotony)

### Misinterpretation Risk
- **High:** `magnitude ≥ 4.0 AND coherence ≤ 2.5`
- **Medium:** `|bias| ≥ 4.5` (endpoint)

### Orthogonality
- **Healthy:** `|correlation| < 0.7`
- **Warning:** `|correlation| ≥ 0.7`
- **Critical:** `|correlation| ≥ 0.85` (possible collapse)

## Canonical Pipeline Order

**Correct sequence:**
```
raw → normalize → scale → clamp → (round) → display
```

**Violations detected:**
- ❌ Clamp before normalize (data loss)
- ❌ Scale before normalize (loses gradation)
- ⚠️ Duplicate operations (suspicious)

## Recovery Protocols

### Narrative Flattening Recovery
1. Detect via `detectNarrativeFlattening()`
2. Freeze display output
3. Audit recent readings for monotony
4. Adjust normalization window or baseline
5. Verify with test reading
6. Resume only after variation restored

### Epistemic Key Leakage Recovery
1. Freeze display immediately
2. Purge fabricated values → `null` + `status: 'n/a'`
3. Restore orthogonality (check correlations)
4. Stamp provenance (add traces)
5. Replay trace to verify
6. Resume only after checks pass

## Testing

```bash
# Test canonical scaling
npx vitest run test/canonical-scaling.test.ts

# Test epistemic integrity
node test/epistemic-integrity.test.js

# Test transformation traces
node test/transformation-trace.test.js

# Run integration example
node examples/epistemic-rigor-integration.js
```

## Documentation

**Comprehensive Guides:**
- `Developers Notes/Implementation/EPISTEMIC_RIGOR_SPECIFICATION.md` (11.8KB)
- `Developers Notes/Implementation/EPISTEMIC_RIGOR_QUICK_REFERENCE.md` (9.6KB)
- `Developers Notes/Implementation/EPISTEMIC_RIGOR_IMPLEMENTATION_SUMMARY.md` (15.7KB)

**Integration Examples:**
- `examples/epistemic-rigor-integration.js` (complete workflows)

## Philosophy

> **The Symbolic Weather system is no longer interpretive art—it's a structured epistemic instrument. It measures entropy as drift, codifies meaning as math, and guards against both machine error and human misreading.**

**Governing Law:**  
Keep the axes distinct and the transformations honest.

---

**Version:** 1.0.0  
**Last Updated:** January 21, 2025  
**Status:** Production Ready
