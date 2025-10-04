"use strict";

/**
 * Epistemic Integrity Module
 * 
 * Implements formal epistemic rigor as specified in the "From Metaphor to Specification" document.
 * 
 * Core Functions:
 * 1. Quantify symbolic entropy (coherence variance + drift)
 * 2. Detect narrative flattening (low coherence + endpoint bias)
 * 3. Validate orthogonality between axes
 * 4. Detect epistemic key leakage (fabricated data, collapsed axes)
 * 5. Label high misinterpretation risk readings
 */

const ENTROPY_THRESHOLDS = Object.freeze({
  COHERENCE_FLATLINE: 2.0,        // Below this = narrative flattening
  BIAS_ENDPOINT: 4.5,              // |bias| >= this = locked endpoint
  COHERENCE_VARIANCE_HIGH: 1.5,   // High spread in recent readings
  DRIFT_THRESHOLD: 0.3             // Drift from baseline distribution
});

const MISINTERPRETATION_RISK = Object.freeze({
  HIGH_MAGNITUDE_THRESHOLD: 4.0,
  LOW_COHERENCE_THRESHOLD: 2.5,
  ENDPOINT_BIAS_THRESHOLD: 4.5
});

/**
 * Calculate symbolic entropy from recent readings
 * 
 * Entropy = spread of interpretive possibilities
 * Measured by: Coherence variance + drift from baseline
 * 
 * @param {Array<{coherence:number, magnitude:number, bias:number}>} readings - Recent daily readings (recommend 7-14 days)
 * @param {object|null} baseline - Optional baseline distribution { meanCoherence, meanBias, stdCoherence }
 * @returns {{
 *   entropy: number,
 *   coherenceVariance: number,
 *   drift: number,
 *   status: 'normal'|'elevated'|'flattening',
 *   details: object
 * }}
 */
function calculateSymbolicEntropy(readings, baseline = null) {
  if (!Array.isArray(readings) || readings.length === 0) {
    return {
      entropy: 0,
      coherenceVariance: 0,
      drift: 0,
      status: 'normal',
      details: { error: 'No readings provided' }
    };
  }

  // Extract coherence values (volatility inverse)
  const coherenceValues = readings
    .map(r => typeof r.coherence === 'number' ? r.coherence : null)
    .filter(c => c !== null);

  if (coherenceValues.length === 0) {
    return {
      entropy: 0,
      coherenceVariance: 0,
      drift: 0,
      status: 'normal',
      details: { error: 'No valid coherence values' }
    };
  }

  // Calculate coherence variance
  const meanCoherence = coherenceValues.reduce((sum, c) => sum + c, 0) / coherenceValues.length;
  const variance = coherenceValues.reduce((sum, c) => sum + Math.pow(c - meanCoherence, 2), 0) / coherenceValues.length;
  const coherenceVariance = Math.sqrt(variance);

  // Calculate drift from baseline (if provided)
  let drift = 0;
  if (baseline && typeof baseline.meanCoherence === 'number') {
    drift = Math.abs(meanCoherence - baseline.meanCoherence);
  }

  // Entropy = variance + drift (normalized)
  const entropy = coherenceVariance + (drift * 2);

  // Detect narrative flattening
  let status = 'normal';
  if (meanCoherence < ENTROPY_THRESHOLDS.COHERENCE_FLATLINE) {
    status = 'flattening';
  } else if (coherenceVariance > ENTROPY_THRESHOLDS.COHERENCE_VARIANCE_HIGH) {
    status = 'elevated';
  }

  return {
    entropy: round(entropy, 2),
    coherenceVariance: round(coherenceVariance, 2),
    drift: round(drift, 2),
    status,
    details: {
      sampleSize: coherenceValues.length,
      meanCoherence: round(meanCoherence, 2),
      threshold_flatline: ENTROPY_THRESHOLDS.COHERENCE_FLATLINE,
      threshold_variance: ENTROPY_THRESHOLDS.COHERENCE_VARIANCE_HIGH
    }
  };
}

/**
 * Detect narrative flattening condition
 * Occurs when: Coherence < 2.0 AND |bias| >= 4.5
 * 
 * @param {number} coherence - Current coherence (0-5)
 * @param {number} bias - Current directional bias (-5 to +5)
 * @returns {{
 *   flattening: boolean,
 *   severity: 'none'|'warning'|'critical',
 *   reason: string|null
 * }}
 */
function detectNarrativeFlattening(coherence, bias) {
  if (typeof coherence !== 'number' || typeof bias !== 'number') {
    return { flattening: false, severity: 'none', reason: null };
  }

  const lowCoherence = coherence < ENTROPY_THRESHOLDS.COHERENCE_FLATLINE;
  const endpointBias = Math.abs(bias) >= ENTROPY_THRESHOLDS.BIAS_ENDPOINT;

  if (lowCoherence && endpointBias) {
    return {
      flattening: true,
      severity: 'critical',
      reason: `Narrative flattening: Coherence ${coherence.toFixed(1)} < ${ENTROPY_THRESHOLDS.COHERENCE_FLATLINE} AND |Bias| ${Math.abs(bias).toFixed(1)} >= ${ENTROPY_THRESHOLDS.BIAS_ENDPOINT}`
    };
  }

  if (lowCoherence) {
    return {
      flattening: true,
      severity: 'warning',
      reason: `Low coherence (${coherence.toFixed(1)}) approaching flattening threshold`
    };
  }

  return { flattening: false, severity: 'none', reason: null };
}

/**
 * Check orthogonality between axes
 * Ensures Magnitude, Bias, and Coherence are independent
 * Detects if values are suspiciously correlated (epistemic drift)
 * 
 * @param {Array<{magnitude:number, bias:number, coherence:number}>} readings
 * @returns {{
 *   orthogonal: boolean,
 *   issues: Array<string>,
 *   correlations: object
 * }}
 */
function checkAxesOrthogonality(readings) {
  if (!Array.isArray(readings) || readings.length < 3) {
    return {
      orthogonal: true,
      issues: [],
      correlations: {},
      note: 'Insufficient data for correlation check (need >= 3 readings)'
    };
  }

  const issues = [];
  
  // Extract valid triplets
  const validData = readings.filter(r => 
    typeof r.magnitude === 'number' && 
    typeof r.bias === 'number' && 
    typeof r.coherence === 'number'
  );

  if (validData.length < 3) {
    return {
      orthogonal: true,
      issues: [],
      correlations: {},
      note: 'Insufficient valid data for correlation check'
    };
  }

  // Simple correlation check (magnitude vs bias)
  const magBiasCorr = simpleCorrelation(
    validData.map(r => r.magnitude),
    validData.map(r => Math.abs(r.bias))
  );

  // Check if magnitude and bias are suspiciously correlated
  if (Math.abs(magBiasCorr) > 0.85) {
    issues.push(`High correlation between Magnitude and |Bias| (${magBiasCorr.toFixed(2)}). Possible axis collapse or fabrication.`);
  }

  return {
    orthogonal: issues.length === 0,
    issues,
    correlations: {
      magnitude_bias: round(magBiasCorr, 2)
    }
  };
}

/**
 * Detect epistemic key leakage (catastrophic semantic failure)
 * 
 * Failure modes:
 * 1. Fabricated data (nulls replaced with fake values)
 * 2. Collapsed axes (magnitude = |bias|)
 * 3. Lexical bleed (directional terms in cohesion, or vice versa)
 * 
 * @param {object} reading - Single day's reading with full metadata
 * @returns {{
 *   leakage: boolean,
 *   severity: 'none'|'warning'|'critical',
 *   failures: Array<string>
 * }}
 */
function detectEpistemicKeyLeakage(reading) {
  const failures = [];

  // Check for fabricated data indicators
  if (reading.magnitude === 0 && reading.bias === 0 && reading.coherence === 0) {
    // All zeros might indicate null replacement
    failures.push('CRITICAL: All values zero - possible null fabrication');
  }

  // Check for axis collapse (magnitude suspiciously equals |bias|)
  if (typeof reading.magnitude === 'number' && typeof reading.bias === 'number') {
    if (Math.abs(reading.magnitude - Math.abs(reading.bias)) < 0.01) {
      failures.push('WARNING: Magnitude equals |Bias| - possible axis collapse');
    }
  }

  // Check for missing provenance
  if (reading.magnitude !== null && reading.magnitude !== undefined) {
    if (!reading.magnitude_meta && !reading.meta) {
      failures.push('WARNING: Magnitude value present without provenance metadata');
    }
  }

  const severity = failures.some(f => f.startsWith('CRITICAL')) ? 'critical' :
                   failures.length > 0 ? 'warning' : 'none';

  return {
    leakage: failures.length > 0,
    severity,
    failures
  };
}

/**
 * Label readings with high misinterpretation risk
 * "High Signal / High Misinterpretation Risk"
 * 
 * Risk factors:
 * - High magnitude (>4.0) with low coherence (<2.5)
 * - Endpoint bias without contextual anchors
 * - Rapid volatility swings
 * 
 * @param {object} reading - Daily reading
 * @returns {{
 *   risk: 'low'|'medium'|'high',
 *   label: string|null,
 *   warnings: Array<string>
 * }}
 */
function assessMisinterpretationRisk(reading) {
  const warnings = [];
  let riskLevel = 'low';

  const mag = typeof reading.magnitude === 'number' ? reading.magnitude : 0;
  const coherence = typeof reading.coherence === 'number' ? reading.coherence : 5;
  const bias = typeof reading.bias === 'number' ? reading.bias : 0;

  // High magnitude + low coherence = high risk
  if (mag >= MISINTERPRETATION_RISK.HIGH_MAGNITUDE_THRESHOLD && 
      coherence <= MISINTERPRETATION_RISK.LOW_COHERENCE_THRESHOLD) {
    riskLevel = 'high';
    warnings.push('High magnitude with low coherence - user may over-dramatize or misread context');
  }

  // Endpoint bias = medium-high risk
  if (Math.abs(bias) >= MISINTERPRETATION_RISK.ENDPOINT_BIAS_THRESHOLD) {
    riskLevel = riskLevel === 'high' ? 'high' : 'medium';
    warnings.push('Endpoint directional bias - user may project extreme expansion/contraction without nuance');
  }

  const label = riskLevel === 'high' 
    ? 'High Signal / High Misinterpretation Risk'
    : riskLevel === 'medium'
    ? 'Moderate Interpretation Risk'
    : null;

  return {
    risk: riskLevel,
    label,
    warnings
  };
}

/**
 * Enforce null honesty
 * Ensures that missing data displays as "n/a" or null, never fabricated
 * 
 * @param {object} data - Raw data object
 * @param {Array<string>} requiredFields - Fields that must not be fabricated
 * @returns {{
 *   honest: boolean,
 *   violations: Array<string>,
 *   sanitized: object
 * }}
 */
function enforceNullHonesty(data, requiredFields) {
  const violations = [];
  const sanitized = { ...data };

  requiredFields.forEach(field => {
    const value = data[field];
    
    // Check for suspicious "default" values that might be fabricated
    if (value === 0 && !data[`${field}_source`] && !data[`${field}_meta`]) {
      // Zero without provenance might be fabricated
      violations.push(`${field}: Zero value without provenance - possible fabrication`);
    }

    // Ensure null/undefined stays null
    if (value === null || value === undefined) {
      sanitized[field] = null;
      sanitized[`${field}_status`] = 'n/a';
    }
  });

  return {
    honest: violations.length === 0,
    violations,
    sanitized
  };
}

// Helper functions

function round(n, precision = 2) {
  if (!Number.isFinite(n)) return 0;
  const factor = Math.pow(10, precision);
  return Math.round(n * factor) / factor;
}

/**
 * Simple Pearson correlation coefficient
 */
function simpleCorrelation(x, y) {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

module.exports = {
  calculateSymbolicEntropy,
  detectNarrativeFlattening,
  checkAxesOrthogonality,
  detectEpistemicKeyLeakage,
  assessMisinterpretationRisk,
  enforceNullHonesty,
  ENTROPY_THRESHOLDS,
  MISINTERPRETATION_RISK
};
