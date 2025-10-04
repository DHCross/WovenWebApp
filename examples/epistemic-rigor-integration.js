/**
 * Epistemic Rigor Integration Example
 * 
 * Demonstrates how to use the complete epistemic rigor framework
 * in a typical Balance Meter workflow.
 */

const {
  calculateSymbolicEntropy,
  detectNarrativeFlattening,
  checkAxesOrthogonality,
  detectEpistemicKeyLeakage,
  assessMisinterpretationRisk,
  enforceNullHonesty
} = require('../lib/reporting/epistemic-integrity');

const {
  createTrace,
  addStep,
  finalizeTrace,
  createProvenanceStamp,
  generateTraceReport
} = require('../lib/reporting/transformation-trace');

// Note: ContractLinter is TypeScript and requires compilation
// For this example, we'll demonstrate the core epistemic modules only

/**
 * Example 1: Full balance meter reading with epistemic checks
 */
function processBalanceMeterReading(rawReading, recentHistory = []) {
  console.log('🔬 Processing Balance Meter Reading with Epistemic Rigor\n');

  // Step 1: Create transformation traces
  console.log('Step 1: Create Transformation Traces');
  
  let magTrace = createTrace(rawReading.rawMagnitude, 'magnitude');
  magTrace = addStep(magTrace, 'normalize', rawReading.rawMagnitude, rawReading.normalizedMagnitude, {
    method: 'rolling_window',
    windowSize: 14
  });
  magTrace = addStep(magTrace, 'scale', rawReading.normalizedMagnitude, rawReading.scaledMagnitude, {
    cap: 5.0,
    reference: 4.0
  });
  magTrace = addStep(magTrace, 'clamp', rawReading.scaledMagnitude, rawReading.finalMagnitude, {
    range: [0, 5]
  });
  magTrace = finalizeTrace(magTrace, rawReading.finalMagnitude);

  const magProvenance = createProvenanceStamp(magTrace, {
    scalingMode: 'rolling_window_v3',
    confidence: 0.95,
    method: 'seismograph_v3'
  });

  console.log('  ✅ Magnitude trace complete');
  console.log('  Pipeline:', magProvenance.pipeline.order.join(' → '));
  console.log('  Valid:', magProvenance.pipeline.valid);
  console.log('');

  // Step 2: Check epistemic key leakage
  console.log('Step 2: Check for Epistemic Key Leakage');
  
  const reading = {
    magnitude: rawReading.finalMagnitude,
    bias: rawReading.bias,
    coherence: rawReading.coherence,
    magnitude_meta: magProvenance
  };

  const leakageCheck = detectEpistemicKeyLeakage(reading);
  
  if (leakageCheck.leakage) {
    console.log('  ⚠️ LEAKAGE DETECTED:', leakageCheck.severity);
    leakageCheck.failures.forEach(f => console.log('    -', f));
  } else {
    console.log('  ✅ No leakage detected');
  }
  console.log('');

  // Step 3: Check narrative flattening
  console.log('Step 3: Check for Narrative Flattening');
  
  const flatteningCheck = detectNarrativeFlattening(reading.coherence, reading.bias);
  
  if (flatteningCheck.flattening) {
    console.log(`  ⚠️ FLATTENING: ${flatteningCheck.severity}`);
    console.log(`  Reason: ${flatteningCheck.reason}`);
  } else {
    console.log('  ✅ Normal variation maintained');
  }
  console.log('');

  // Step 4: Assess misinterpretation risk
  console.log('Step 4: Assess Misinterpretation Risk');
  
  const riskAssessment = assessMisinterpretationRisk(reading);
  
  console.log(`  Risk Level: ${riskAssessment.risk.toUpperCase()}`);
  if (riskAssessment.label) {
    console.log(`  Label: "${riskAssessment.label}"`);
  }
  if (riskAssessment.warnings.length > 0) {
    riskAssessment.warnings.forEach(w => console.log('    ⚠️', w));
  } else {
    console.log('  ✅ Low misinterpretation risk');
  }
  console.log('');

  // Step 5: Calculate entropy if history available
  if (recentHistory.length >= 3) {
    console.log('Step 5: Calculate Symbolic Entropy');
    
    const entropyResult = calculateSymbolicEntropy(recentHistory, {
      meanCoherence: 3.5,
      meanBias: 1.0
    });
    
    console.log('  Entropy:', entropyResult.entropy);
    console.log('  Status:', entropyResult.status.toUpperCase());
    console.log('  Coherence Variance:', entropyResult.coherenceVariance);
    console.log('  Drift:', entropyResult.drift);
    console.log('');
  }

  // Step 6: Return enriched reading with epistemic metadata
  return {
    ...reading,
    epistemic: {
      provenance: magProvenance,
      leakage: leakageCheck,
      flattening: flatteningCheck,
      risk: riskAssessment
    }
  };
}

/**
 * Example 2: Demonstrate transformation trace report
 */
function demonstrateTraceReport(trace) {
  console.log('📋 Generating Transformation Trace Report\n');
  
  const report = generateTraceReport(trace);
  console.log(report);
  console.log('');
}

/**
 * Example 3: Check axes orthogonality over time
 */
function monitorOrthogonality(readings) {
  console.log('📊 Monitoring Axes Orthogonality\n');

  const orthoCheck = checkAxesOrthogonality(readings);

  console.log('Orthogonality Check:');
  console.log('  Orthogonal:', orthoCheck.orthogonal ? '✅' : '❌');
  
  if (orthoCheck.correlations) {
    console.log('  Correlations:');
    Object.entries(orthoCheck.correlations).forEach(([key, val]) => {
      const icon = Math.abs(val) > 0.7 ? '⚠️' : '✅';
      console.log(`    ${icon} ${key}: ${val.toFixed(2)}`);
    });
  }

  if (orthoCheck.issues.length > 0) {
    console.log('\n  🚨 ISSUES:');
    orthoCheck.issues.forEach(i => console.log('    -', i));
  }

  console.log('');
  return orthoCheck;
}

// ============================================================================
// Run Examples
// ============================================================================

console.log('═'.repeat(70));
console.log('  EPISTEMIC RIGOR INTEGRATION EXAMPLES');
console.log('═'.repeat(70));
console.log('');

// Example 1: Process a single reading
const rawReading = {
  rawMagnitude: 8.5,
  normalizedMagnitude: 4.2,
  scaledMagnitude: 3.8,
  finalMagnitude: 3.8,
  bias: 2.5,
  coherence: 3.5
};

const recentHistory = [
  { coherence: 3.2, magnitude: 2.5, bias: 1.2 },
  { coherence: 3.5, magnitude: 2.8, bias: 1.5 },
  { coherence: 3.1, magnitude: 2.3, bias: 1.0 },
  { coherence: 3.8, magnitude: 3.0, bias: 1.8 }
];

const enrichedReading = processBalanceMeterReading(rawReading, recentHistory);

console.log('═'.repeat(70));
console.log('');

// Example 2: Generate transformation trace report
const magTrace = enrichedReading.epistemic.provenance;
console.log('📋 Transformation Trace Report\n');
console.log('Field:', magTrace.field);
console.log('Start Value:', magTrace.transformation.startValue);
console.log('Final Value:', magTrace.transformation.finalValue);
console.log('Pipeline:', magTrace.pipeline.order.join(' → '));
console.log('Valid:', magTrace.pipeline.valid);
console.log('Steps:', magTrace.transformation.steps);
console.log('');

console.log('═'.repeat(70));
console.log('');

// Example 3: Monitor orthogonality
const weeklyReadings = [
  { magnitude: 2.5, bias: 1.2, coherence: 3.5 },
  { magnitude: 3.0, bias: -1.5, coherence: 2.8 },
  { magnitude: 2.2, bias: 0.5, coherence: 4.0 },
  { magnitude: 2.8, bias: 2.0, coherence: 3.2 }
];

monitorOrthogonality(weeklyReadings);

console.log('═'.repeat(70));
console.log('✨ All examples complete');
console.log('   Epistemic rigor enforced at every layer');
console.log('═'.repeat(70));
