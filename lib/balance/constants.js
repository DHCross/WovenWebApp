const SPEC_VERSION = '4.0'; // Balance Meter v4: SFD removed, coherence added, directional_bias canonical
const SCALE_FACTOR = 5;                  // do not change without spec bump
const ROUND_1DP = 1;
const RANGE_MAG = [0, 5];
const RANGE_BIAS = [-5, 5];
const RANGE_COH = [0, 5];
const RANGE_SFD = [-1, 1];

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