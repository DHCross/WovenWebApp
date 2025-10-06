# Seismograph v3.1 Refactor & Validation

**Date:** 2025-10-06

## 1. Overview

This document summarizes the validation process for the `v3.1` refactor of the `seismograph.js` astrological scoring engine. The primary goal was to improve the model's fidelity to the Raven Calder system, particularly its ability to accurately identify high-stress "crisis" events without introducing a persistent negative bias.

The refactor involved several key changes:
-   **Updated `baseValence` Scores:** Aligning aspect scores with the v3 spec.
-   **Asymmetric `orbMultiplier`:** Applying different influence curves for hard vs. soft aspects.
-   **Outer Planet & Angle Multipliers:** Increasing the weight of significant outer-planet interactions.
-   **"Supportive Cap" Crisis Mechanic:** A rule to prevent supportive aspects from neutralizing a clear crisis signature.
-   **Canonical Scaling Pipeline:** Offloading all final value scaling, clamping, and rounding to a centralized, canonical pipeline in `lib/balance/scale.js`.

## 2. Validation Benchmarks

Two key benchmarks were used to validate the new logic.

### A. Crisis Benchmark: Hurricane Michael (2018-10-10)

-   **Objective:** Verify the model could correctly identify the severe astrological weather corresponding to the landfall of Hurricane Michael, a Category 5 storm.
-   **Expected Outcome:** A "Magnitude 5.0 crisis event" with a strong negative valence (`~ -5.0`).
-   **Test Script:** `test-benchmark-direct.js`
-   **Result:** **SUCCESS**
    -   **Magnitude:** `5`
    -   **Valence (Directional Bias):** `-5.00`
    -   **Analysis:** The refactored engine correctly identified the crisis signature, producing the maximum possible magnitude and a deeply negative valence, confirming the "supportive cap" and other crisis mechanics were functioning as intended.

### B. Counter-Benchmark: A "Normal" Day (2025-10-06)

-   **Objective:** Ensure the refactor did not create an overly sensitive or negatively biased model. This test used a contemporary date with a mix of aspects but no overwhelming crisis signature.
-   **Expected Outcome:** A balanced, non-crisis reading with moderate magnitude and valence.
-   **Test Script:** `test-counter-benchmark-2025.js`
-   **Result:** **SUCCESS**
    -   **Magnitude:** `2.8`
    -   **Valence (Directional Bias):** `-1.9`
    -   **Analysis:** The model produced a moderate, balanced reading, confirming it was not over-calibrated for crisis detection. The result aligned with the user's "felt reality" for the day, demonstrating the system's improved nuance and balance.

## 3. Conclusion

The `v3.1` refactor of `seismograph.js` is validated. The engine now demonstrates both **accuracy** in identifying high-impact crisis events and **balance** in assessing more typical astrological weather. The move to a canonical scaling pipeline also ensures consistency and maintainability for all exported data.

## 4. Next Steps: Full Consolidation

While the core `v3.1` logic is validated, the work described by Raven Calder to fully consolidate the system remains. The following tasks will ensure a single source of truth for all astrological calculations and eliminate legacy code paths:

-   **[ ] Consolidate All Paths through Canonical Scalers:** Ensure every function that generates balance meter values, including legacy or auxiliary paths, uses the canonical functions from `lib/balance/scale.ts` and `lib/balance/amplifiers.ts`.

-   **[ ] Integrate Canonical Assertions:** Implement the runtime checks from `lib/validation/assertions.ts` to enforce data integrity across all calculation paths, preventing pipeline inconsistencies.

-   **[ ] Remove Redundant Helpers:** Deprecate and remove duplicate helper functions (e.g., `normalizeRelocationMode`, local `scoreAspect` variations) in favor of the shared, canonical modules.

-   **[ ] Unify Async Wrappers:** Refactor older functions like `callNatal` to use the modern, unified async wrapper pattern for consistency and improved error handling.

-   **[ ] Enhance Test Coverage:**
    -   **Parity Tests:** Create tests to confirm that "solo" and "relational" outputs are identical when given the same inputs.
    -   **Property-Based Tests:** Implement property-based testing to lock down the mathematical logic, ensuring it remains stable and predictable across a wide range of inputs.
