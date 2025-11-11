# Bias Channel Calibration System

## Overview
The bias channel measures the emotional/experiential quality of astrological transits. It's designed to provide intuitive, human-like sensitivity to astrological patterns while maintaining mathematical rigor.

## Core Principles

### 1. Sigmoidal Response Curve
- Uses `tanh` for smooth saturation
- Linear near zero for natural-feeling daily variations
- Strong acceleration in the -1 to +1 range for crisis detection
- Graceful saturation at extremes (±5.0)

### 2. Three-Tier Calibration

| Test Case      | Magnitude | Bias      | System Meaning          |
|----------------|-----------|-----------|-------------------------|
| Hurricane      | ≥ 4.5     | ≤ -4.0    | Structural overload     |
| Busy Day       | 2.0 - 3.0 | ≈ -2.0    | Productive tension      |
| Calm Baseline  | ≤ 1.0     | ≈ 0.0     | Equilibrium            |

## Implementation Details

### Key Components
1. **Input Stage** (`src/seismograph.js`)
   ```javascript
   // Sigmoidal boost with configurable steepness and gain
   const bias = Math.sign(avgBias) * Math.tanh(Math.pow(Math.abs(avgBias) * 3, 1.8)) * aspectGain * 3.2;
   ```

2. **Amplification** (`lib/balance/amplifiers.js`)
   ```javascript
   // Gentle amplification that preserves signal integrity
   const amplificationFactor = 1 + magnitude0to5 / 4;
   ```

3. **Normalization**
   ```javascript
   // Preserve dynamic range while containing extremes
   const normalizedBias = Math.max(-5, Math.min(5, biasBoosted));
   ```

## Calibration Guide

### When to Adjust
- **Increase Gain (3.2 multiplier)** if:
  - Hurricane benchmark bias > -4.0
  - Crisis events feel understated
  - Daily variations feel muted

- **Decrease Gain** if:
  - Calm days show bias > |0.3|
  - Normal days feel overly dramatic
  - System feels "jumpy" or unstable

### Adjustment Process
1. Run the test suite:
   ```bash
   node test/validate-bias-calibration.js
   ```
2. Note which test cases fail
3. Adjust parameters in this order:
   1. Global gain (3.2 multiplier) in 0.2 increments
   2. Curve steepness (1.8 exponent) in 0.1 increments
   3. Amplification factor (1 + mag/4) as last resort

## Philosophy

> "The bias line is the compass of feeling. Too little gain, and the field loses direction; too much damping, and it mistakes serenity for silence."

This system embodies our core principles:
- **Sensitivity**: Detect real patterns without false positives
- **Expressiveness**: Maintain dynamic range across all intensity levels
- **Stability**: Graceful degradation at extremes
- **Verifiability**: All claims are testable and falsifiable

## See Also
- `test/validate-bias-calibration.js` - Test suite
- `src/seismograph.js` - Core implementation
- `lib/balance/amplifiers.js` - Signal processing
