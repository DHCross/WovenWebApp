# Epistemic Rigor - Quick Reference

**Version:** 1.0.0  
**Quick Start Guide for Developers**

---

## What Is This?

The Woven Map system now implements **formal epistemic rigor** - moving from metaphorical interpretation to falsifiable, auditable precision.

**Core Principle:**  
> Truth = fidelity across layers. When geometry, data, and language align, the mirror holds.

---

## When To Use Each Module

### 📊 Epistemic Integrity (`lib/reporting/epistemic-integrity.js`)

**Use when:** You need to validate data quality and detect semantic failures

```javascript
const {
  calculateSymbolicEntropy,    // Measure interpretive spread
  detectNarrativeFlattening,   // Detect monotony (coherence < 2.0 + |bias| ≥ 4.5)
  checkAxesOrthogonality,      // Ensure axes remain independent
  detectEpistemicKeyLeakage,   // Catch fabricated data or axis collapse
  assessMisinterpretationRisk, // Label high-risk readings
  enforceNullHonesty          // Ensure nulls stay null
} = require('./lib/reporting/epistemic-integrity');
```

**Quick Example:**
```javascript
// Check if reading is at risk of flattening
const check = detectNarrativeFlattening(coherence, bias);
if (check.flattening && check.severity === 'critical') {
  console.warn('⚠️ Narrative flattening detected!');
  // Freeze output, investigate normalization
}
```

### 🔍 Transformation Trace (`lib/reporting/transformation-trace.js`)

**Use when:** You need to audit how a value transformed from raw → display

```javascript
const {
  createTrace,              // Initialize trace
  addStep,                  // Log transformation step
  finalizeTrace,            // Complete and validate
  createProvenanceStamp,    // Generate audit stamp
  replayTrace,              // Verify chain integrity
  generateTraceReport       // Human-readable report
} = require('./lib/reporting/transformation-trace');
```

**Quick Example:**
```javascript
// Track magnitude transformation
let trace = createTrace(8.5, 'magnitude');
trace = addStep(trace, 'normalize', 8.5, 4.2, { method: 'rolling_window' });
trace = addStep(trace, 'scale', 4.2, 3.8, { cap: 5.0 });
trace = addStep(trace, 'clamp', 3.8, 3.8, { range: [0, 5] });
trace = finalizeTrace(trace, 3.8);

// Create audit stamp
const stamp = createProvenanceStamp(trace, {
  scalingMode: 'rolling_window_v3',
  confidence: 0.95
});

// Stamp now contains full audit trail
```

### 📖 Lexical Guard (`src/validation/lexical-guard.ts`)

**Use when:** You need to prevent terminology cross-contamination between axes

```typescript
import {
  lintText,                  // Check single text string
  lintReading,               // Check reading object
  lintPayload,               // Check full payload
  assertLexicalIntegrity,    // Build-time check (throws)
  getSuggestedReplacements   // Get correct terms
} from './src/validation/lexical-guard';
```

**Quick Example:**
```typescript
// Check payload before sending to Poetic Brain
const result = lintPayload(payload);
if (!result.valid) {
  console.error('Lexical bleed detected!');
  result.violations.forEach(v => {
    console.log(`  ${v.field}: "${v.term}" (${v.category} in ${v.wrongContext})`);
  });
  throw new Error('Fix lexical violations before proceeding');
}
```

---

## Common Workflows

### Workflow 1: Processing a Daily Reading

```javascript
// 1. Generate raw reading from seismograph
const rawReading = aggregate(aspects, prevContext, options);

// 2. Check for epistemic key leakage
const leakCheck = detectEpistemicKeyLeakage({
  magnitude: rawReading.magnitude,
  bias: rawReading.valence,
  coherence: 5 - rawReading.volatility,
  magnitude_meta: rawReading.magnitude_meta
});

if (leakCheck.leakage) {
  console.error('Epistemic key leakage:', leakCheck.failures);
  // Freeze, purge, restore protocol
}

// 3. Check narrative flattening
const flatCheck = detectNarrativeFlattening(
  5 - rawReading.volatility,
  rawReading.valence
);

if (flatCheck.flattening) {
  console.warn('Narrative flattening detected:', flatCheck.reason);
}

// 4. Assess misinterpretation risk
const risk = assessMisinterpretationRisk({
  magnitude: rawReading.magnitude,
  coherence: 5 - rawReading.volatility,
  bias: rawReading.valence
});

if (risk.risk === 'high') {
  // Add warning label to display
  rawReading.interpretationWarning = risk.label;
}
```

### Workflow 2: Validating Before Poetic Brain

```typescript
import { ContractLinter } from './src/contract-linter';

// Lint includes both schema AND lexical checks
const result = ContractLinter.lint(payload);

if (!result.valid) {
  console.error('Contract validation failed');
  result.errors.forEach(e => console.error('  ERROR:', e));
  throw new Error('Cannot send to Poetic Brain - fix errors');
}

if (result.warnings.length > 0) {
  console.warn('Warnings present:');
  result.warnings.forEach(w => console.warn('  WARNING:', w));
}

// Check lexical result specifically
if (result.lexical && !result.lexical.valid) {
  console.error('Lexical integrity compromised');
  // Fix terminology before proceeding
}
```

### Workflow 3: Monitoring Entropy Over Time

```javascript
// Collect recent readings (recommend 7-14 days)
const recentReadings = dailyData.map(day => ({
  coherence: 5 - day.volatility,
  magnitude: day.magnitude,
  bias: day.valence
}));

// Calculate entropy
const entropy = calculateSymbolicEntropy(recentReadings, {
  meanCoherence: 3.5,  // Historical baseline
  meanBias: 1.0
});

console.log('Symbolic Entropy:', entropy.entropy);
console.log('Status:', entropy.status);

if (entropy.status === 'flattening') {
  console.error('System entering monotony - investigate normalization');
  // Adjust rolling window or reset baseline
}

if (entropy.status === 'elevated') {
  console.warn('High variance - coherence unstable');
}
```

---

## Key Thresholds

### Narrative Flattening
- **Condition:** `coherence < 2.0` AND `|bias| >= 4.5`
- **Status:** `critical`
- **Action:** Freeze output, audit normalization

### Symbolic Entropy
- **Normal:** `entropy < 1.5`
- **Elevated:** `entropy >= 1.5` (high variance)
- **Flattening:** `coherence < 2.0` (approaching monotony)

### Misinterpretation Risk
- **High:** `magnitude >= 4.0` AND `coherence <= 2.5`
- **Medium:** `|bias| >= 4.5` (endpoint)
- **Label:** "High Signal / High Misinterpretation Risk"

### Axis Correlation (Orthogonality)
- **Healthy:** `|correlation| < 0.7`
- **Warning:** `|correlation| >= 0.7`
- **Critical:** `|correlation| >= 0.85` (possible collapse)

---

## Pipeline Order (Canonical)

**Correct Order:**
```
raw → normalize → scale → clamp → (round) → display
```

**Violations Detected:**
- ❌ Clamp before normalize (data loss)
- ❌ Scale before normalize (loses gradation)
- ⚠️ Duplicate operations (suspicious)

---

## Lexical Vocabulary Rules

### Directional Bias Only
✅ **Use:** expansion, contraction, outward, inward, opening, closing  
❌ **Don't use:** harmony, friction, support, tension

### Integration Bias (SFD) Only
✅ **Use:** harmony, friction, support, tension, alignment, resistance  
❌ **Don't use:** expansion, contraction, outward, inward

### Neutral (Any Context)
✅ **Always OK:** intensity, strong, weak, magnitude, pressure, volatile

---

## Recovery Protocols

### Narrative Flattening Recovery
1. **Detect** via `detectNarrativeFlattening()`
2. **Freeze** display output
3. **Audit** recent readings for monotony
4. **Adjust** normalization window or baseline
5. **Verify** with test reading

### Epistemic Key Leakage Recovery
1. **Freeze** display immediately
2. **Purge** fabricated values → `null` + `status: 'n/a'`
3. **Restore Orthogonality** (check correlations)
4. **Stamp Provenance** (add traces)
5. **Replay Trace** to verify
6. **Resume** only after checks pass

### Lexical Bleed Recovery
1. **Detect** via `lintPayload()`
2. **Identify** contaminating terms
3. **Replace** using `getSuggestedReplacements()`
4. **Re-lint** to verify clean
5. **Deploy** updated strings

---

## Testing

```bash
# Run individual test suites
node test/epistemic-integrity.test.js
node test/transformation-trace.test.js
npx tsx test/lexical-guard.test.ts

# Run integration example
node examples/epistemic-rigor-integration.js
```

---

## Integration Points

### In Seismograph
- Already outputs `magnitude_meta` with provenance
- Add transformation traces for full audit

### In Balance Meter
- Add entropy calculation after aggregation
- Check flattening before display
- Label high-risk readings

### In Contract Linter
- Already includes lexical checks (as of v1.0.0)
- Check `result.lexical` for violations

### In Math Brain API
- Validate payload before sending to Poetic Brain
- Add epistemic metadata to response

---

## Quick Checklist

Before deploying a reading:
- [ ] Transformation trace complete and valid
- [ ] No epistemic key leakage detected
- [ ] Narrative flattening check passed
- [ ] Misinterpretation risk assessed
- [ ] Lexical integrity verified (no axis bleed)
- [ ] Axes orthogonality maintained
- [ ] Nulls preserved honestly (not fabricated)

---

## Further Reading

- **Full Specification:** `EPISTEMIC_RIGOR_SPECIFICATION.md`
- **Philosophy:** Problem statement "From Metaphor to Specification"
- **Tests:** `test/epistemic-integrity.test.js`, `test/transformation-trace.test.js`, `test/lexical-guard.test.ts`
- **Integration Example:** `examples/epistemic-rigor-integration.js`

---

**Remember:**  
> The system is no longer interpretive art—it's a structured epistemic instrument.  
> Its single governing law: keep the axes distinct and the transformations honest.

---

**Last Updated:** 2025-01-21  
**Version:** 1.0.0
