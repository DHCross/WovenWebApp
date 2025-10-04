/**
 * Tests for Transformation Trace Module
 * Validates pipeline audit trail and transformation traceability
 */

const {
  createTrace,
  addStep,
  finalizeTrace,
  validatePipelineOrder,
  createProvenanceStamp,
  replayTrace,
  generateTraceReport,
  VALID_OPERATIONS
} = require('../lib/reporting/transformation-trace');

console.log('🧪 Running Transformation Trace Tests\n');

// Test 1: Create and build a trace
console.log('Test 1: Create and Build Trace');
let trace = createTrace(8.5, 'magnitude');
console.log('  Initial trace created for field:', trace.field);
console.log('  Start value:', trace.startValue);

trace = addStep(trace, VALID_OPERATIONS.NORMALIZE, 8.5, 4.2, { method: 'rolling_window' });
trace = addStep(trace, VALID_OPERATIONS.SCALE, 4.2, 3.8, { cap: 5.0 });
trace = addStep(trace, VALID_OPERATIONS.CLAMP, 3.8, 3.8, { range: [0, 5] });
trace = addStep(trace, VALID_OPERATIONS.ROUND, 3.8, 3.8, { precision: 2 });

console.log('  Steps added:', trace.steps.length);
console.log('  Pipeline order:', trace.pipelineOrder.join(' → '));

if (trace.steps.length === 4 && trace.pipelineOrder[0] === 'normalize') {
  console.log('  ✅ PASS: Trace built correctly\n');
} else {
  console.log('  ❌ FAIL: Trace building error\n');
}

// Test 2: Finalize trace and validate pipeline
console.log('Test 2: Finalize Trace and Validate Pipeline');
trace = finalizeTrace(trace, 3.8);
console.log('  Final value:', trace.finalValue);
console.log('  Pipeline valid:', trace.pipelineValid);
console.log('  Warnings:', trace.pipelineWarnings?.length || 0);

if (trace.complete && trace.pipelineValid) {
  console.log('  ✅ PASS: Trace finalized with valid pipeline\n');
} else {
  console.log('  ❌ FAIL: Finalization error\n');
}

// Test 3: Detect invalid pipeline order
console.log('Test 3: Detect Invalid Pipeline Order');
const invalidOrder = ['clamp', 'normalize', 'scale']; // Wrong order!
const validation = validatePipelineOrder(invalidOrder);
console.log('  Valid:', validation.valid);
console.log('  Warnings:', validation.warnings.length);
console.log('  First warning:', validation.warnings[0]?.substring(0, 50) + '...');

if (!validation.valid && validation.warnings.length > 0) {
  console.log('  ✅ PASS: Invalid order detected\n');
} else {
  console.log('  ❌ FAIL: Should have detected invalid order\n');
}

// Test 4: Create provenance stamp
console.log('Test 4: Create Provenance Stamp');
try {
  const stamp = createProvenanceStamp(trace, {
    scalingMode: 'rolling_window_v3',
    confidence: 0.85,
    method: 'balance_meter_v3'
  });
  
  console.log('  Version:', stamp.version);
  console.log('  Field:', stamp.field);
  console.log('  Pipeline order:', stamp.pipeline.order.join(' → '));
  console.log('  Start → Final:', stamp.transformation.startValue, '→', stamp.transformation.finalValue);
  console.log('  Audit trail steps:', stamp.auditTrail.length);
  console.log('  Context scaling mode:', stamp.context.scalingMode);
  
  if (stamp.version && stamp.auditTrail.length === 4 && stamp.context.scalingMode === 'rolling_window_v3') {
    console.log('  ✅ PASS: Provenance stamp created\n');
  } else {
    console.log('  ❌ FAIL: Provenance stamp error\n');
  }
} catch (e) {
  console.log('  ❌ FAIL: Error creating provenance:', e.message, '\n');
}

// Test 5: Replay trace for verification
console.log('Test 5: Replay Trace for Verification');
const replayResult = replayTrace(trace);
console.log('  Success:', replayResult.success);
console.log('  Chain valid:', replayResult.chainValid);
console.log('  Values matched:', replayResult.matched);
console.log('  Expected:', replayResult.expectedFinal);
console.log('  Actual:', replayResult.actualFinal);

if (replayResult.success && replayResult.chainValid && replayResult.matched) {
  console.log('  ✅ PASS: Trace replay successful\n');
} else {
  console.log('  ❌ FAIL: Replay error\n');
}

// Test 6: Generate human-readable report
console.log('Test 6: Generate Trace Report');
const report = generateTraceReport(trace);
const reportLines = report.split('\n');
console.log('  Report lines:', reportLines.length);
console.log('  Contains field name:', report.includes('magnitude'));
console.log('  Contains pipeline steps:', report.includes('Pipeline Steps:'));
console.log('  Sample output:');
reportLines.slice(0, 5).forEach(line => console.log('    ' + line));

if (report.includes('magnitude') && report.includes('Pipeline Steps:') && reportLines.length > 10) {
  console.log('  ✅ PASS: Report generated\n');
} else {
  console.log('  ❌ FAIL: Report generation error\n');
}

// Test 7: Detect duplicate operations (suspicious)
console.log('Test 7: Detect Duplicate Operations');
const duplicateOrder = ['normalize', 'normalize', 'scale', 'clamp'];
const dupValidation = validatePipelineOrder(duplicateOrder);
console.log('  Valid:', dupValidation.valid);
console.log('  Warnings:', dupValidation.warnings.length);
const hasDupWarning = dupValidation.warnings.some(w => w.includes('times'));
console.log('  Has duplicate warning:', hasDupWarning);

if (!dupValidation.valid && hasDupWarning) {
  console.log('  ✅ PASS: Duplicate operations detected\n');
} else {
  console.log('  ❌ FAIL: Should detect duplicates\n');
}

// Test 8: Error handling for invalid operations
console.log('Test 8: Error Handling for Invalid Operations');
try {
  const badTrace = createTrace(5.0, 'test');
  addStep(badTrace, 'INVALID_OP', 5.0, 4.0, {});
  console.log('  ❌ FAIL: Should have thrown error for invalid operation\n');
} catch (e) {
  console.log('  Error caught:', e.message.substring(0, 50) + '...');
  console.log('  ✅ PASS: Invalid operation rejected\n');
}

// Summary
console.log('═'.repeat(50));
console.log('✨ Transformation Trace Tests Complete');
console.log('   Pipeline audit trail validated');
console.log('   Provenance stamping functional');
