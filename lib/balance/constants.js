const SPEC_VERSION = '5.0'; // Balance Meter v5: Two axes only (Magnitude + Directional Bias), pure geometry
const SCALE_FACTOR = 50;                 // do not change without spec bump
const ROUND_1DP = 1;
const RANGE_MAG = [0, 5];
const RANGE_BIAS = [-5, 5];
// Coherence removed in v5.0 (not a core axis - derived from volatility statistics)
// RANGE_COH = [0, 5];  // DEPRECATED in v5.0
// RANGE_SFD = [-1, 1]; // DEPRECATED in v4.0

// Golden Standard anchors (non-negotiable)
const GOLDEN_CASES = {
  '2018-10-10': { minMag: 4.5, biasBand: [-5.0, -4.0] } // Hurricane Michael (Panama City)
};

module.exports = {
  SPEC_VERSION,
  SCALE_FACTOR,
  ROUND_1DP,
  RANGE_MAG,
  RANGE_BIAS,
  RANGE_COH,
  RANGE_SFD,
  GOLDEN_CASES,
};