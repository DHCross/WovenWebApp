"use strict";

/**
 * Transformation Trace Module
 * 
 * Provides auditable pipeline traceability for all data transformations.
 * Enforces correct transformation order: normalize → scale → clamp → display
 * 
 * Every transformation step is logged with:
 * - Input value
 * - Operation performed
 * - Output value
 * - Timestamp
 * - Method used
 * 
 * This enables replay and verification of any reading's journey from raw data to display.
 */

const PIPELINE_STAGES = Object.freeze({
  RAW: 'raw',
  NORMALIZED: 'normalized',
  SCALED: 'scaled',
  CLAMPED: 'clamped',
  DISPLAY: 'display'
});

const VALID_OPERATIONS = Object.freeze({
  NORMALIZE: 'normalize',
  SCALE: 'scale',
  CLAMP: 'clamp',
  ROUND: 'round',
  BLEND: 'blend'
});

/**
 * Create a new transformation trace
 * @returns {object} Empty trace object ready for steps
 */
function createTrace(initialValue, field) {
  return {
    field: field || 'unknown',
    startValue: initialValue,
    startTime: new Date().toISOString(),
    steps: [],
    complete: false,
    finalValue: null,
    pipelineOrder: []
  };
}

/**
 * Add a transformation step to the trace
 * 
 * @param {object} trace - Trace object
 * @param {string} operation - Operation name (must be from VALID_OPERATIONS)
 * @param {number} inputValue - Value before transformation
 * @param {number} outputValue - Value after transformation
 * @param {object} metadata - Additional context (method, parameters, etc.)
 * @returns {object} Updated trace
 */
function addStep(trace, operation, inputValue, outputValue, metadata = {}) {
  if (!VALID_OPERATIONS[operation.toUpperCase()]) {
    throw new Error(`Invalid operation: ${operation}. Must be one of: ${Object.values(VALID_OPERATIONS).join(', ')}`);
  }

  const step = {
    step: trace.steps.length + 1,
    operation,
    input: round(inputValue),
    output: round(outputValue),
    delta: round(outputValue - inputValue),
    timestamp: new Date().toISOString(),
    metadata: metadata || {}
  };

  trace.steps.push(step);
  trace.pipelineOrder.push(operation);
  
  return trace;
}

/**
 * Finalize the trace and mark it complete
 * @param {object} trace - Trace object
 * @param {number} finalValue - Final display value
 * @returns {object} Completed trace
 */
function finalizeTrace(trace, finalValue) {
  trace.finalValue = round(finalValue);
  trace.complete = true;
  trace.endTime = new Date().toISOString();
  
  // Validate pipeline order
  const validation = validatePipelineOrder(trace.pipelineOrder);
  trace.pipelineValid = validation.valid;
  trace.pipelineWarnings = validation.warnings;
  
  return trace;
}

/**
 * Validate that pipeline order follows canonical sequence
 * Correct order: normalize → scale → clamp (→ round)
 * 
 * @param {Array<string>} order - Sequence of operations
 * @returns {{valid: boolean, warnings: Array<string>}}
 */
function validatePipelineOrder(order) {
  const warnings = [];
  
  // Find indices of key operations
  const normalizeIdx = order.indexOf(VALID_OPERATIONS.NORMALIZE);
  const scaleIdx = order.indexOf(VALID_OPERATIONS.SCALE);
  const clampIdx = order.indexOf(VALID_OPERATIONS.CLAMP);

  // Check ordering
  if (normalizeIdx !== -1 && scaleIdx !== -1 && normalizeIdx > scaleIdx) {
    warnings.push('WARNING: Scale performed before normalize - may lose gradation');
  }

  if (scaleIdx !== -1 && clampIdx !== -1 && scaleIdx > clampIdx) {
    warnings.push('WARNING: Clamp performed before scale - scale may have incorrect reference');
  }

  if (normalizeIdx !== -1 && clampIdx !== -1 && normalizeIdx > clampIdx) {
    warnings.push('CRITICAL: Clamp performed before normalize - data loss likely');
  }

  // Check for duplicate operations (suspicious)
  const counts = {};
  order.forEach(op => {
    counts[op] = (counts[op] || 0) + 1;
  });

  Object.keys(counts).forEach(op => {
    if (counts[op] > 1 && op !== VALID_OPERATIONS.ROUND) {
      warnings.push(`WARNING: Operation "${op}" performed ${counts[op]} times - may indicate error`);
    }
  });

  return {
    valid: warnings.length === 0,
    warnings
  };
}

/**
 * Create a provenance stamp for a reading
 * Documents the complete transformation history
 * 
 * @param {object} trace - Completed trace
 * @param {object} context - Additional context (scaling mode, confidence, etc.)
 * @returns {object} Provenance stamp
 */
function createProvenanceStamp(trace, context = {}) {
  if (!trace.complete) {
    throw new Error('Cannot create provenance stamp for incomplete trace');
  }

  return {
    version: '1.0.0',
    field: trace.field,
    pipeline: {
      order: trace.pipelineOrder,
      valid: trace.pipelineValid,
      warnings: trace.pipelineWarnings || []
    },
    transformation: {
      startValue: trace.startValue,
      finalValue: trace.finalValue,
      totalDelta: round(trace.finalValue - trace.startValue),
      steps: trace.steps.length
    },
    timing: {
      start: trace.startTime,
      end: trace.endTime,
      duration_ms: calculateDuration(trace.startTime, trace.endTime)
    },
    context: {
      scalingMode: context.scalingMode || 'unknown',
      confidence: context.confidence || null,
      method: context.method || 'unknown',
      ...context
    },
    auditTrail: trace.steps.map(s => ({
      step: s.step,
      operation: s.operation,
      input: s.input,
      output: s.output,
      delta: s.delta
    }))
  };
}

/**
 * Replay a trace to verify output
 * Useful for debugging and validation
 * 
 * @param {object} trace - Trace to replay
 * @returns {{success: boolean, expectedFinal: number, actualFinal: number, matched: boolean}}
 */
function replayTrace(trace) {
  if (trace.steps.length === 0) {
    return {
      success: false,
      error: 'No steps to replay'
    };
  }

  // Verify chain continuity
  let currentValue = trace.startValue;
  let chainValid = true;

  trace.steps.forEach((step, idx) => {
    if (idx === 0) {
      if (Math.abs(step.input - currentValue) > 0.01) {
        chainValid = false;
      }
    } else {
      const prevStep = trace.steps[idx - 1];
      if (Math.abs(step.input - prevStep.output) > 0.01) {
        chainValid = false;
      }
    }
    currentValue = step.output;
  });

  const finalStep = trace.steps[trace.steps.length - 1];
  const matched = Math.abs(finalStep.output - trace.finalValue) < 0.01;

  return {
    success: chainValid && matched,
    expectedFinal: trace.finalValue,
    actualFinal: finalStep.output,
    matched,
    chainValid,
    steps: trace.steps.length
  };
}

/**
 * Generate human-readable trace report
 * @param {object} trace - Trace to report
 * @returns {string} Formatted report
 */
function generateTraceReport(trace) {
  const lines = [];
  
  lines.push(`📋 Transformation Trace: ${trace.field}`);
  lines.push('='.repeat(50));
  lines.push(`Start Value: ${trace.startValue}`);
  lines.push(`Final Value: ${trace.finalValue || 'incomplete'}`);
  lines.push(`Total Delta: ${trace.finalValue ? round(trace.finalValue - trace.startValue) : 'n/a'}`);
  lines.push('');
  
  lines.push('Pipeline Steps:');
  trace.steps.forEach(step => {
    lines.push(`  ${step.step}. ${step.operation.toUpperCase()}: ${step.input} → ${step.output} (Δ ${step.delta})`);
    if (step.metadata && Object.keys(step.metadata).length > 0) {
      lines.push(`     Metadata: ${JSON.stringify(step.metadata)}`);
    }
  });
  
  if (trace.complete) {
    lines.push('');
    lines.push(`Pipeline Valid: ${trace.pipelineValid ? '✅' : '⚠️'}`);
    if (trace.pipelineWarnings && trace.pipelineWarnings.length > 0) {
      lines.push('Warnings:');
      trace.pipelineWarnings.forEach(w => lines.push(`  • ${w}`));
    }
  }
  
  return lines.join('\n');
}

// Helper functions

function round(n, precision = 2) {
  if (!Number.isFinite(n)) return 0;
  const factor = Math.pow(10, precision);
  return Math.round(n * factor) / factor;
}

function calculateDuration(startISO, endISO) {
  try {
    const start = new Date(startISO);
    const end = new Date(endISO);
    return end.getTime() - start.getTime();
  } catch (e) {
    return null;
  }
}

module.exports = {
  createTrace,
  addStep,
  finalizeTrace,
  validatePipelineOrder,
  createProvenanceStamp,
  replayTrace,
  generateTraceReport,
  PIPELINE_STAGES,
  VALID_OPERATIONS
};
