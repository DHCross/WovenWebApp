/**
 * Tests for Epistemic Integrity Module
 * Validates entropy measurement, flattening detection, and orthogonality checks
 */

const {
  calculateSymbolicEntropy,
  detectNarrativeFlattening,
  checkAxesOrthogonality,
  detectEpistemicKeyLeakage,
  assessMisinterpretationRisk,
  enforceNullHonesty,
  ENTROPY_THRESHOLDS
} = require('../lib/reporting/epistemic-integrity');

console.log('🧪 Running Epistemic Integrity Tests\n');

// Test 1: Calculate symbolic entropy
console.log('Test 1: Calculate Symbolic Entropy');
const normalReadings = [
  { coherence: 3.2, magnitude: 2.5, bias: 1.2 },
  { coherence: 3.5, magnitude: 2.8, bias: 1.5 },
  { coherence: 3.1, magnitude: 2.3, bias: 1.0 },
  { coherence: 3.8, magnitude: 3.0, bias: 1.8 }
];

const entropyResult = calculateSymbolicEntropy(normalReadings);
console.log('  Entropy:', entropyResult.entropy);
console.log('  Coherence Variance:', entropyResult.coherenceVariance);
console.log('  Status:', entropyResult.status);
if (entropyResult.status === 'normal' && entropyResult.entropy > 0) {
  console.log('  ✅ PASS: Normal entropy calculated\n');
} else {
  console.log('  ❌ FAIL: Unexpected entropy status\n');
}

// Test 2: Detect narrative flattening
console.log('Test 2: Detect Narrative Flattening');
const flatteningTest1 = detectNarrativeFlattening(1.5, 4.8);
const flatteningTest2 = detectNarrativeFlattening(3.5, 2.0);

console.log('  Low coherence + endpoint bias:', flatteningTest1.flattening, flatteningTest1.severity);
console.log('  Normal coherence + mid bias:', flatteningTest2.flattening);

if (flatteningTest1.flattening && flatteningTest1.severity === 'critical' && !flatteningTest2.flattening) {
  console.log('  ✅ PASS: Flattening correctly detected\n');
} else {
  console.log('  ❌ FAIL: Flattening detection error\n');
}

// Test 3: Check axes orthogonality
console.log('Test 3: Check Axes Orthogonality');
const orthogonalReadings = [
  { magnitude: 2.5, bias: 1.2, coherence: 3.5 },
  { magnitude: 3.0, bias: -1.5, coherence: 2.8 },
  { magnitude: 2.2, bias: 0.5, coherence: 4.0 },
  { magnitude: 2.8, bias: 2.0, coherence: 3.2 }
];

const collapsedReadings = [
  { magnitude: 2.5, bias: 2.5, coherence: 3.0 },
  { magnitude: 3.0, bias: 3.0, coherence: 3.0 },
  { magnitude: 4.0, bias: 4.0, coherence: 3.0 }
];

const orthoCheck1 = checkAxesOrthogonality(orthogonalReadings);
const orthoCheck2 = checkAxesOrthogonality(collapsedReadings);

console.log('  Orthogonal data:', orthoCheck1.orthogonal, 'Issues:', orthoCheck1.issues.length);
console.log('  Collapsed data:', orthoCheck2.orthogonal, 'Issues:', orthoCheck2.issues.length);

if (orthoCheck1.orthogonal && !orthoCheck2.orthogonal) {
  console.log('  ✅ PASS: Orthogonality check working\n');
} else {
  console.log('  ❌ FAIL: Orthogonality check error\n');
}

// Test 4: Detect epistemic key leakage
console.log('Test 4: Detect Epistemic Key Leakage');
const goodReading = {
  magnitude: 2.5,
  bias: 1.2,
  coherence: 3.5,
  magnitude_meta: { method: 'rolling_window_v3' }
};

const fabricatedReading = {
  magnitude: 0,
  bias: 0,
  coherence: 0
};

const collapsedReading = {
  magnitude: 3.5,
  bias: 3.5,
  coherence: 2.0
};

const leak1 = detectEpistemicKeyLeakage(goodReading);
const leak2 = detectEpistemicKeyLeakage(fabricatedReading);
const leak3 = detectEpistemicKeyLeakage(collapsedReading);

console.log('  Good reading leakage:', leak1.leakage, 'Severity:', leak1.severity);
console.log('  Fabricated reading leakage:', leak2.leakage, 'Severity:', leak2.severity);
console.log('  Collapsed reading leakage:', leak3.leakage, 'Severity:', leak3.severity);

if (!leak1.leakage && leak2.leakage && leak3.leakage) {
  console.log('  ✅ PASS: Epistemic key leakage detected\n');
} else {
  console.log('  ❌ FAIL: Leakage detection error\n');
}

// Test 5: Assess misinterpretation risk
console.log('Test 5: Assess Misinterpretation Risk');
const highRiskReading = {
  magnitude: 4.5,
  bias: 4.8,
  coherence: 2.0
};

const lowRiskReading = {
  magnitude: 2.5,
  bias: 1.2,
  coherence: 3.8
};

const risk1 = assessMisinterpretationRisk(highRiskReading);
const risk2 = assessMisinterpretationRisk(lowRiskReading);

console.log('  High risk reading:', risk1.risk, 'Label:', risk1.label);
console.log('  Low risk reading:', risk2.risk, 'Label:', risk2.label);

if (risk1.risk === 'high' && risk1.label && risk2.risk === 'low') {
  console.log('  ✅ PASS: Misinterpretation risk assessment working\n');
} else {
  console.log('  ❌ FAIL: Risk assessment error\n');
}

// Test 6: Enforce null honesty
console.log('Test 6: Enforce Null Honesty');
const dataWithNull = {
  magnitude: null,
  bias: 1.2,
  coherence: 3.5
};

const dataWithZero = {
  magnitude: 0,
  bias: 0,
  coherence: 0
};

const honesty1 = enforceNullHonesty(dataWithNull, ['magnitude', 'bias', 'coherence']);
const honesty2 = enforceNullHonesty(dataWithZero, ['magnitude', 'bias', 'coherence']);

console.log('  Data with null:', honesty1.honest, 'Violations:', honesty1.violations.length);
console.log('  Data with zeros:', honesty2.honest, 'Violations:', honesty2.violations.length);
console.log('  Sanitized magnitude status:', honesty1.sanitized.magnitude_status);

if (honesty1.sanitized.magnitude === null && honesty1.sanitized.magnitude_status === 'n/a') {
  console.log('  ✅ PASS: Null honesty enforced\n');
} else {
  console.log('  ❌ FAIL: Null honesty error\n');
}

// Summary
console.log('═'.repeat(50));
console.log('✨ Epistemic Integrity Tests Complete');
console.log('   All core functions validated for epistemic rigor');
