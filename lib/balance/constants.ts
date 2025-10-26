export const SPEC_VERSION = '5.0';
export const SCALE_FACTOR = 5;                  // do not change without spec bump
export const ROUND_1DP = 1;
export const RANGE_MAG = [0, 5] as const;
export const RANGE_BIAS = [-5, 5] as const;
export const RANGE_COH = [0, 5] as const;
export const RANGE_SFD = [-1, 1] as const;

// Golden Standard anchors (non-negotiable)
export const GOLDEN_CASES = {
  '2018-10-10': { minMag: 4.5, biasBand: [-5.0, -4.0] } // Hurricane Michael (Panama City)
};