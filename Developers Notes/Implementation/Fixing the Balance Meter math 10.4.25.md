Perfect — let’s fill your **Fixing the Balance Meter Math** document with the **complete, full-detail version** of the directive, including the addendum and precision upgrades.

Below is the **full Markdown version** ready to paste directly into your file.

---

# **Fixing the Balance Meter Math — Comprehensive Specification v3.1**

## **Context**

A full audit of the *Symbolic Weather / Balance Meter* system revealed critical errors across the display pipeline, coherence inversion, and the Integration Bias (SFD) calculation.
This document provides the **complete formal specification** for fixing and safeguarding the system.

---

## **EXECUTIVE SUMMARY**

### Core Findings

1. **Display Layer Scaling Errors (CRITICAL)**

   * Wrong scaling factors (×100 instead of ×50)
   * Premature clamping destroys nuance
   * Causes a “wall of −5.0” (all readings pegged to extremes)

2. **Volatility/Coherence Inversion (CRITICAL)**

   * JSON `volatility` means fragmentation (higher = worse)
   * Display must invert to show *Coherence* (higher = better)
   * Correct formula: `coherence = 5 − (volatility × 50)`

3. **Integration Bias (SFD) Failure (CRITICAL)**

   * Always `null` in synastry mode
   * Dashboard fabricates fake small positive numbers (+0.01 to +0.08)
   * True range must be −1.0 to +1.0

4. **Lexicon Conflation (ARCHITECTURAL FLAW)**

   * Directional Bias (spatial) and Integration Bias (cohesion) merged
   * "Harmony" and "Friction" incorrectly assigned to Directional Bias
   * Destroys diagnostic clarity — productive contraction looks like fragmentation

---

## **GROUND TRUTH**

The **Math Brain** (astrological engine) is correct. It:

* Computes aspect geometry and weights accurately
* Applies tight orbs (≤3° major, ≤1° minor)
* Produces normalized values (0.0–0.1 range)
* Outputs clean JSON

**Do not alter Math Brain.**
All fixes are applied in the **display/rendering layer.**

---

## **PART 1 — DISPLAY SCALING CORRECTIONS**

### **Correct Pipeline Order**

✅ `Raw Geometry → Normalize → Scale → Clamp → Round → Display`
❌ `Raw Geometry → Normalize → Clamp → Scale → Display`

Premature clamping = flatlined extremes.

---

### **Scaling Formulas by Axis**

| Axis                                     | Range    | Formula                                        | Example      |
| ---------------------------------------- | -------- | ---------------------------------------------- | ------------ |
| **Magnitude**                            | 0–5      | `display = clamp(normalized × 50, 0, 5)`       | 0.05 → 2.5   |
| **Directional Bias**                     | −5 to +5 | `display = clamp(normalized × 50, −5, +5)`     | −0.05 → −2.5 |
| **Coherence (inverted from volatility)** | 0–5      | `display = clamp(5 − (volatility × 50), 0, 5)` | 0.04 → 3.0   |
| **SFD (Integration Bias)**               | −1 to +1 | `display = clamp(normalized × 10, −1, +1)`     | 0.08 → 0.8   |

### **Validation Tests**

| Date   | mag_n | bias_n | vol_n | sfd  | Expected                             |
| ------ | ----- | ------ | ----- | ---- | ------------------------------------ |
| Oct 04 | 0.05  | −0.05  | 0.04  | null | Mag 2.5, Bias −2.5, Coh 3.0, SFD n/a |
| Oct 05 | 0.04  | −0.05  | 0.03  | null | Mag 2.0, Bias −2.5, Coh 3.5, SFD n/a |
| Oct 06 | 0.04  | −0.05  | 0.02  | null | Mag 2.0, Bias −2.5, Coh 4.0, SFD n/a |

### **Invalid Cases**

* Any −5.0 Bias between −0.03–−0.06
* Any fabricated SFD value
* Coherence decreasing while volatility decreases

---

## **PART 2 — INTEGRATION BIAS (SFD) CALCULATION**

### **Definition**

SFD = `(ΣSupportive − ΣFrictional) / (ΣSupportive + ΣFrictional)`

Range: −1.0 → +1.0
Interpretation:

* +1 = Harmony, full cooperation
* 0 = Neutral
* −1 = Friction, opposition

### **Aspect Categorization**

**Supportive:** Trine, Sextile
**Frictional:** Square, Opposition, Quincunx, Semi-square, Sesquiquadrate
**Neutral:** Conjunctions (context-dependent), wide orbs

### **Implementation**

* Exclude conjunctions (Phase 1)
* Future: use `conjunction_polarity_table`
* Return null if no qualifying aspects
* Display "n/a" instead of fabricating values

---

## **PART 3 — LEXICON SEPARATION**

### **Directional Bias**

(Spatial — inward vs. outward)

| Value | Description                    |
| ----- | ------------------------------ |
| +5    | Liberation / Opening           |
| 0     | Equilibrium                    |
| −5    | Collapse / Maximum contraction |

**Remove:** Friction, Harmony, Grind

### **Integration Bias (SFD)**

(Cohesion — cooperation vs. fragmentation)

| Value | Description               |
| ----- | ------------------------- |
| +1.0  | Harmony / Forces align    |
| 0.0   | Neutral / Mixed           |
| −1.0  | Opposition / Forces clash |

**Both axes must display simultaneously.**

---

## **PART 4 — METADATA & AUDITABILITY**

Each JSON export must include:

```json
{
  "scaling_mode": "absolute_linear",
  "scale_factors": {"magnitude": 50, "directional_bias": 50, "coherence": 50, "sfd": 10},
  "coherence_inversion": true,
  "pipeline_order": "normalize → scale → clamp → round",
  "sfd_calculation": "supportive_vs_frictional_weighted",
  "synastry_mode": true,
  "date_window": {"start": "2025-10-04", "end": "2025-10-11"}
}
```

---

## **PART 5 — VALIDATION CHECKLIST**

✓ Correct scaling order and ×50 factors
✓ Coherence inversion works properly
✓ SFD nulls displayed as “n/a”
✓ Lexicon separation enforced
✓ Metadata and logs complete
✓ Clamp counters show no excessive −5/+5 hits

---

## **ADDENDUM — SURGICAL UPGRADES**

### **1A: Precision**

* SFD now uses **two decimal places** (−1.00 → +1.00)
* Minus sign = Unicode U+2212
* Rounding = *round-half-up*

### **1.3 Coherence Inversion Guard**

If future schema renames `"volatility"` to `"coherence"`, prevent double inversion.
Config flag:

```json
"coherence_from": "volatility"
```

### **1.4 Double-Scaling Guard**

If `SFD_raw` already in −1→+1 range, skip ×10 multiplier.

---

### **2A: Edge Logic**

* Conjunctions treated as neutral
* Optional: `angle_weight_multiplier = 1.2`
* Optional: down-weight same-planet aspects (e.g. Mars □ Mars ×0.8)

---

### **3A: Mode & Window Correctness**

* Timezone = `America/Chicago`
* Ensure inclusive date range even across DST transitions

---

### **4A: Observability**

* Add **per-axis transform trace** JSON logs
* Emit **clamp counters** and **fabrication sentinels**
* Block build if SFD displayed when source is null

---

### **5A: Metadata**

Every export must include:

```json
{
  "spec_version": "3.1",
  "scaling_profile_version": "absolute_v1",
  "normalized_input_hash": "sha256:abc123...",
  "provenance": {
    "engine_build": "math_brain_v2.3.1",
    "dataset_id": "dan_stephie_synastry",
    "export_timestamp": "2025-10-04T17:40:07Z"
  }
}
```

---

### **6A: Expanded Test Suite**

* Golden fixtures for Oct 4–11 data
* Double-inversion regression guard
* Adaptive mode off-switch verification
* SFD micro-cases: full, frictional, balanced, none

---

### **7A: Lexicon Governance**

* Lexicon lint check at build time
* Tooltips explaining each axis’ meaning

---

### **8A: Rollout Safety**

* Force `"display_scaling_mode": "absolute"`
* Prevent any runtime SFD backfilling

---

### **9A: Documentation**

Worked SFD examples with full aspect lists and calculations.
Version 3.1 changelog documents scaling corrections, lexicon separation, and observability upgrades.

---

## **FINAL SUMMARY**

This system is now fully auditable, precision-tuned, and regression-proof.

* **No fabricated data.**
* **No lexical cross-contamination.**
* **No silent distortions.**
* **Full provenance and scaling metadata attached to every render.**

**If the renderer lies, the mirror will now scream.**



⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻

SYMBOLIC WEATHER SYSTEM: COMPREHENSIVE FIX DIRECTIVE

⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻

Context: A full audit of the Symbolic Weather / Balance Meter system has revealed 
multiple critical errors spanning calculation, display, and conceptual integrity. 
This directive consolidates all findings and provides complete remediation guidance.

⸻

EXECUTIVE SUMMARY OF ISSUES

1. Display Layer Scaling Errors (CRITICAL)
   • Wrong scaling factors applied (×100 instead of ×50)
   • Premature clamping before scaling destroys nuance
   • Results in "wall of -5.0" and loss of gradation

2. Volatility/Coherence Inversion (CRITICAL)
   • JSON field "volatility" measures fragmentation (higher = worse)
   • Display should show "Coherence" (higher = better)
   • Requires inversion: coherence = 5 - (volatility × 50)
   • Currently displays raw volatility, inverting the narrative arc

3. Integration Bias (SFD) Calculation Failure (CRITICAL)
   • Returns null for all days in synastry mode
   • Calculation either not implemented or disabled for relational reports
   • When non-null, displays fabricated tiny values (+0.01 to +0.08) instead of -1 to +1 range

4. Lexicon Conflation (ARCHITECTURAL FLAW)
   • Dashboard steals "Friction" and "Harmony" terms from SFD axis
   • Assigns them to Directional Bias (Valence) axis
   • Destroys differential: cannot distinguish direction from cohesion
   • Makes diagnosis impossible: productive contraction looks like fragmentation

⸻

GROUND TRUTH: WHAT THE MATH BRAIN DOES CORRECTLY

The core astrological calculation engine (Math Brain) is SOUND. It:
  ✓ Calculates aspect geometry correctly
  ✓ Applies tight orb filtering (≤3° majors, ≤1° minors) per spec
  ✓ Generates normalized values in consistent 0.0-0.1 range
  ✓ Exports clean JSON with proper data structure

DO NOT MODIFY THE MATH BRAIN. The errors are in the display/rendering layer.

⸻

PART 1: DISPLAY SCALING CORRECTIONS

Objective: Fix the normalized → human-readable transformation pipeline.

Current Behavior (BROKEN):
  • Normalized value -0.05 → displays as -5.0 (maximum)
  • Normalized value 0.05 → displays as 5.0 (maximum)
  • All gradation between 0.03-0.05 collapses to extremes

Correct Pipeline Order:
  Raw Geometry → Normalize → Scale → Clamp → Round → Display

  NEVER: Clamp before scaling (destroys the differential)

Required Scaling Factors:

  Magnitude (0–5 display range):
    display = clamp(normalized × 50, 0, 5)
    Round to 1 decimal

    Example: 0.05 × 50 = 2.5 (noticeable motifs, not peak storm)

  Directional Bias (−5 to +5 display range):
    display = clamp(normalized × 50, −5, +5)
    Round to 1 decimal
    Preserve sign: use proper minus (−), not hyphen-minus (-)

    Example: −0.05 × 50 = −2.5 (moderate contraction, not maximum)

  Volatility/Coherence (0–5 display range):
    *** CRITICAL: INVERSION REQUIRED ***
    display = clamp(5 - (normalized × 50), 0, 5)
    Round to 1 decimal

    Rationale: JSON "volatility" measures fragmentation (higher = worse).
               Display "Coherence" measures clarity (higher = better).

    Example: volatility 0.02 → 5 - (0.02 × 50) = 5 - 1.0 = 4.0 (high coherence)
             volatility 0.04 → 5 - (0.04 × 50) = 5 - 2.0 = 3.0 (moderate coherence)

  Integration Bias / SFD (−1 to +1 display range):
    IF sfd is null: display "n/a" (do not synthesize or backfill)
    IF sfd is present: display = clamp(normalized × 10, −1, +1)
    Round to 1 decimal

    Example: 0.08 × 10 = 0.8 (net supportive, not fabricated +0.08)

Validation Test Vectors (MUST PASS):

Date       | mag_n | bias_n | vol_n | sfd    | Expected Display
-----------|-------|--------|-------|--------|----------------------------------
Oct 04     | 0.05  | −0.05  | 0.04  | null   | Mag 2.5 | Bias −2.5 | Coh 3.0 | SFD n/a
Oct 05     | 0.04  | −0.05  | 0.03  | null   | Mag 2.0 | Bias −2.5 | Coh 3.5 | SFD n/a
Oct 06     | 0.04  | −0.05  | 0.02  | null   | Mag 2.0 | Bias −2.5 | Coh 4.0 | SFD n/a
Oct 11     | 0.03  | −0.05  | 0.03  | null   | Mag 1.5 | Bias −2.5 | Coh 3.5 | SFD n/a

Negative Control (MUST NOT HAPPEN):
  ✗ Any Directional Bias reading of −5.0 for normalized values in −0.03 to −0.06 range
  ✗ Any fabricated SFD values when JSON shows null
  ✗ Coherence decreasing when volatility decreases (signals missing inversion)

⸻

PART 2: INTEGRATION BIAS (SFD) CALCULATION

Objective: Implement the missing or broken SFD calculation logic.

Current Behavior (BROKEN):
  • Returns null for all days in synastry reports
  • When dashboard shows SFD, values are fabricated tiny positives (+0.01 to +0.08)
  • Does not align with spec's −1 to +1 range

Spec Definition:
  Integration Bias (SFD) measures the balance of harmonious vs. disharmonious aspects.

  Scale: −1 to +1 (tight, sensitive range)

  Interpretation:
    > 0  Net supportive (cooperation, stabilization, forces work together)
    = 0  Neutral (outcome depends on choice, balanced tension)
    < 0  Net friction (fragmentation, opposition, forces work against each other)

Required Implementation:

  1. ASPECT CATEGORIZATION

     Supportive aspects (contribute positive weight):
       • Trine (120°)
       • Sextile (60°)
       • [Optional: soft minors like quintile/biquintile if orb is tight]

     Frictional aspects (contribute negative weight):
       • Square (90°)
       • Opposition (180°)
       • Quincunx (150°)
       • Semi-square (45°)
       • Sesquiquadrate (135°)

     Neutral aspects (do not contribute to SFD):
       • Conjunction (0°) — context-dependent, exclude from calculation
       • Very wide orbs (beyond tight orb threshold)

  2. WEIGHTING FORMULA

     For each aspect:
       weight = base_potency × orb_factor

       base_potency = planetary weight (e.g., Sun/Moon = 1.0, outer planets = 0.7)
       orb_factor = 1.0 - (abs(orb) / max_orb)  [closer orb = higher weight]

     Sum supportive weights: S = Σ(supportive aspect weights)
     Sum frictional weights: F = Σ(frictional aspect weights)

     Calculate net bias:
       SFD_raw = (S - F) / (S + F)   [range: -1.0 to +1.0]

       Edge case: If S + F = 0 (no qualifying aspects), return null

  3. SYNASTRY MODE HANDLING

     For relational reports (Person A + Person B):
       • Include aspects between natal charts (synastry aspects)
       • Include transits to each person's chart
       • Apply same categorization and weighting
       • DO NOT skip calculation in synastry mode

     If synastry calculation is not yet implemented:
       • Return null (do not fabricate values)
       • Log warning: "SFD calculation not available in synastry mode"

  4. OUTPUT REQUIREMENTS

     • Store in JSON as normalized value (range typically −0.10 to +0.10)
     • When null: display "n/a", never synthesize
     • When present: apply ×10 scaling for display (−1.0 to +1.0 range)
     • Round to 1 decimal place

Diagnostic Steps:

  1. Search codebase for "SFD" or "Integration Bias" calculation function
  2. Verify it exists and is called for both solo and synastry modes
  3. Test with solo chart (Person A only) to confirm calculation works
  4. If solo works but synastry fails, debug synastry-specific logic
  5. Examine error logs for silent failures or exceptions

⸻

PART 3: LEXICON SEPARATION (ARCHITECTURAL FIX)

Objective: Restore the differential between directional flow and force cohesion.

Current Behavior (BROKEN):
  Dashboard "Valence" lexicon conflates two orthogonal axes:
    −3: "Friction" ← should belong to SFD, not Directional Bias
    +3: "Harmony" ← should belong to SFD, not Directional Bias
    −4: "Grind" ← ambiguous, blurs both concepts

  Result: Cannot distinguish productive contraction (good cohesion) from 
          destructive contraction (poor cohesion)

Required Lexicon Separation:

  DIRECTIONAL BIAS (−5 to +5) — Spatial/Directional Language ONLY
    +5: Liberation, Opening, Maximum Expansion
    +4: Expansion, Widening, Accelerated Growth
    +3: Broadening, Opportunity, Outward Movement
    +2: Flow, Ease, Gentle Opening
    +1: Lift, Light Tailwind, Encouraging
    0:  Equilibrium, Neutral Balance, Stasis
    −1: Drag, Subtle Headwind, Light Resistance
    −2: Contraction, Narrowing, Inward Pull
    −3: Compression, Tightening, Enforced Boundary
    −4: Constriction, Heavy Inward Pressure
    −5: Collapse, Maximum Contraction, Enforced Limit

  REMOVE from this axis: "Friction", "Harmony", "Grind" (these belong to SFD)

  INTEGRATION BIAS / SFD (−1 to +1) — Cohesion/Cooperation Language ONLY
    +1.0: Harmony, Full Cooperation, Forces Align
    +0.5: Supportive, Net Cooperation, Stabilizing
    0.0:  Neutral, Mixed Signals, Outcome Depends on Choice
    −0.5: Friction, Minor Fragmentation, Cross-Purposes
    −1.0: Opposition, Full Fragmentation, Forces Clash

  This axis answers: "Do forces work together or against each other?"

Diagnostic Clarity:

  Example 1: Dir Bias −2.5, SFD +0.5
    Interpretation: Moderate inward focus (contraction) with good cohesion (supportive).
    Meaning: Productive consolidation period. Forces cooperate within a narrowing field.

  Example 2: Dir Bias −2.5, SFD −0.5
    Interpretation: Moderate inward focus (contraction) with minor friction.
    Meaning: Consolidation with internal tension. Forces pull inward but not in sync.

  WITHOUT THE DIFFERENTIAL: Both scenarios would collapse into "Contraction/Friction"
  with no way to distinguish productive focus from fragmenting drag.

Implementation:

  1. Update dashboard UI lexicon for Directional Bias to pure directional language
  2. Add separate SFD lexicon panel or row in output
  3. Ensure both axes display simultaneously (not collapsed into one number)
  4. Document that both axes are required for full diagnostic clarity

⸻

PART 4: METADATA & AUDITABILITY

Objective: Make all transformations explicit, reproducible, and auditable.

Required Metadata in Every Output:

  JSON Export:
    {
      "scaling_mode": "absolute_linear",
      "scale_factors": {
        "magnitude": 50,
        "directional_bias": 50,
        "coherence": 50,
        "sfd": 10
      },
      "coherence_inversion": true,
      "pipeline_order": "normalize → scale → clamp → round",
      "orb_profile": "tight (≤3° majors, ≤1° minors)",
      "sfd_calculation": "supportive_vs_frictional_weighted",
      "synastry_mode": true,
      "date_window": {
        "start": "2025-10-04",
        "end": "2025-10-11"
      }
    }

  Dashboard Display:
    • Badge showing "Scaling: Absolute ×50" at panel or page level
    • Tooltip or footer: "Coherence = 5 - (Volatility × 50)"
    • SFD display: "n/a" when null, never omitted or fabricated
    • Date range: render inclusive of both start and end dates

  Logging (for debugging):
    For each axis on each day, log:
      • normalized_value (from Math Brain)
      • scaled_value (after multiplier)
      • clamped_value (after bounds check)
      • display_value (after rounding)
      • transform_applied (e.g., "×50, clamp [0,5], round 1 decimal")

⸻

PART 5: VALIDATION & ACCEPTANCE CRITERIA

The fix is complete when ALL of the following pass:

✓ Display Scaling
  1. October 4-11 test vectors produce expected Mag/Bias/Coherence values
  2. No Directional Bias readings of −5.0 for normalized values −0.03 to −0.06
  3. Coherence increases (3.0 → 4.0) when volatility decreases (0.04 → 0.02)
  4. All values rounded to 1 decimal place with proper minus sign

✓ SFD Calculation
  5. SFD calculation function exists and executes in both solo and synastry modes
  6. When aspects present, SFD returns value in −1.0 to +1.0 display range
  7. When null in JSON, displays "n/a" (never synthesizes or backfills)
  8. Dashboard does not show fabricated tiny values (+0.01 to +0.08)

✓ Lexicon Separation
  9. Directional Bias lexicon uses only spatial/directional terms
  10. "Friction" and "Harmony" removed from Directional Bias, assigned to SFD
  11. Both axes display simultaneously in output (not collapsed)

✓ Metadata & Audit
  12. JSON export contains complete scaling metadata
  13. Dashboard badges or labels show scaling mode
  14. Logs capture full transform pipeline per axis per day
  15. Date window renders inclusively (both start and end dates)

✓ Regression Prevention
  16. Unit tests cover: pipeline order, scaling factors, inversion, null handling
  17. Test fixtures include: Oct 4-11 data, edge cases, solo vs. synastry
  18. CI/CD runs validation on every build

⸻

PART 6: PHASED IMPLEMENTATION (RECOMMENDED)

If implementing all fixes simultaneously is too complex, use this order:

  PHASE 1 (Critical Path — Fixes Immediate Usability):
    • Display scaling corrections (×50 factors, correct pipeline order)
    • Volatility → Coherence inversion
    • SFD null handling (display "n/a", stop fabricating values)

    Impact: Restores accurate, gradated readings; narrative arc becomes coherent

  PHASE 2 (Structural Integrity — Restores Diagnostic Clarity):
    • Implement SFD calculation logic (or debug existing)
    • Test in solo mode, then extend to synastry mode
    • Verify ×10 scaling applied correctly

    Impact: Makes Integration Bias axis functional

  PHASE 3 (Conceptual Clarity — Prevents Future Drift):
    • Separate Directional Bias and SFD lexicons
    • Update dashboard UI to display both axes distinctly
    • Add metadata and audit logging

    Impact: Restores differential, documents transformations

⸻

PART 7: REFERENCE DOCUMENTS

Attach or reference these for complete context:

  1. A-Strange-Cosmic-Symbolism-v3.pdf — Core specification (conceptual framework)
  2. Section 9.0 — Scaling Pipeline — Operational math (drafted during this audit)
  3. Weather_Log_dan-stephie_2025-10-04_to_2025-10-11.json — Test data fixture
  4. Validation Calculations — Expected outputs for Oct 4-11 test vectors

⸻

PART 8: CRITICAL REMINDERS

• DO NOT modify the Math Brain's aspect geometry calculations (they are correct)
• DO NOT synthesize SFD values when null (displays "n/a" per spec)
• DO NOT clamp before scaling (destroys gradation)
• DO NOT skip Volatility → Coherence inversion (inverts narrative arc)
• DO NOT conflate Directional Bias and SFD lexicons (destroys differential)

⸻

SUMMARY

The Symbolic Weather system's core logic is sound. The errors are in:
  1. Display layer scaling (wrong factors, wrong order)
  2. Missing or broken SFD calculation
  3. Conceptual conflation of two orthogonal axes

All fixes are surgical and localized to the rendering/calculation layer. The 
astrological engine does not require recalibration. The specification is 
philosophically correct but operationally incomplete — Section 9.0 now provides 
the missing formulas.

Upon completion, the system will produce accurate, gradated, diagnostically 
clear symbolic weather readings that honor the "map, don't moralize" principle 
and preserve the essential differential between directional flow and force cohesion.

⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻

END DIRECTIVE

⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻

⸻
9.0 — Scaling Pipeline (The Math Behind the Mirror)

This section documents the transformation between what the Math Brain calculates and what appears on your dashboard. It exists to prevent "cosmic vacuum" distortions—where gentle contractions read as maximum drag, or moderate storms appear as apocalyptic peaks.

⸻

9.1 — Three Formats, One Truth

The symbolic weather data moves through three distinct formats:

• **Aspect Geometry** (raw): Angular separations, orbs, and potency weights derived from planetary positions. These are the unscaled inputs—the pure sky geometry before interpretation.

• **Normalized Values** (internal): Decimal scores between 0.0 and 1.0 (unipolar) or −1.0 and +1.0 (bipolar). This is the Math Brain's working format, stored in JSON exports and calculation logs. It represents intensity as a fraction of the practical observed range.

• **Human-Readable Scale** (display): The 0–5 and −5 to +5 scales described throughout this spec. This is what you see on dashboards, in narrative summaries, and in comparative trend analysis.

The transformation from normalized → display is where distortion enters if the pipeline is mis-ordered.

⸻

9.2 — The Correct Pipeline Order

**CORRECT**: Raw Geometry → Normalize → Scale → Clamp → Display
**INCORRECT**: Raw Geometry → Normalize → Clamp → Scale → Display

Premature clamping (before scaling) flattens nuance. A normalized −0.05 clamped to −1.0 and then scaled becomes −5.0 (maximum) instead of the intended −2.5 (moderate).

The formula:

```
display_value = clamp(normalized_value × scale_factor, min_bound, max_bound)
```

Where:
• `scale_factor` = target range maximum (5 for unipolar, 5 for bipolar radius)
• `min_bound` / `max_bound` = final display limits (0 and 5, or −5 and +5)
• Clamping happens AFTER multiplication, not before

⸻

9.3 — Scaling Factors by Axis

Each axis uses a calibrated multiplier to map normalized values to the human scale:

**Magnitude (0–5)**
```
display = clamp(normalized × 50, 0, 5)
```
Normalized range: 0.00 to ~0.10 (practical daily maximum)
Example: 0.05 → 2.5 (noticeable motifs)

**Directional Bias (−5 to +5)**
```
display = clamp(normalized × 50, −5, +5)
```
Normalized range: −0.10 to +0.10 (practical daily range)
Example: −0.05 → −2.5 (moderate inward lean)

**Narrative Coherence (0–5)**
```
display = clamp(normalized × 50, 0, 5)
```
Normalized range: 0.00 to ~0.10
Example: 0.04 → 2.0 (mostly coherent, minor counter-pulls)

**Integration Bias / SFD (−1 to +1)**
```
display = clamp(normalized × 10, −1, +1)
```
Normalized range: −0.10 to +0.10
Example: null → display as 'n/a' (not synthesized)

⸻

9.4 — Why ×50 (Not ×5 or ×100)

The normalized values produced by the Math Brain occupy a **compressed practical range**—typically 0.00 to 0.10 for daily readings, not the full theoretical 0.0 to 1.0 spectrum.

• **×5 scaling** (naïve linear) would map 0.05 → 0.25, severely underrepresenting moderate intensity.
• **×100 scaling** (overcorrection) would map 0.05 → 5.0, pinning nearly every reading at maximum and erasing gradation.
• **×50 scaling** (calibrated) maps 0.05 → 2.5, placing moderate days in the middle of the human scale where perception and lived experience confirm they belong.

This calibration preserves the shape of the raw data—peaks stay peaks, easing stays easing, and the rhythm between 1.5 and 4.0 remains legible.

⸻

9.5 — Worked Example: October 4, 2025

From `Weather_Log_dan-stephie_2025-10-04_to_2025-10-11.json`:

**Raw Normalized Values (Internal Format)**
```
magnitude:        0.05
directional_bias: −0.05
volatility:       0.04
sfd:              null
```

**Correct Scaling (×50 Pipeline)**
```
Magnitude:        0.05 × 50 = 2.5  → clamp(2.5, 0, 5) = 2.5
Directional Bias: −0.05 × 50 = −2.5 → clamp(−2.5, −5, +5) = −2.5
Coherence:        0.04 × 50 = 2.0  → clamp(2.0, 0, 5) = 2.0
SFD:              null → 'n/a'
```

**Incorrect Scaling (×100 Pipeline)**
```
Magnitude:        0.05 × 100 = 5.0  → clamp(5.0, 0, 5) = 5.0 (ceiling hit)
Directional Bias: −0.05 × 100 = −5.0 → clamp(−5.0, −5, +5) = −5.0 (floor hit)
Coherence:        0.04 × 100 = 4.0  → clamp(4.0, 0, 5) = 4.0
SFD:              null → 'n/a'
```

The ×100 version reads as "peak storm, maximum contraction"—a cosmic vacuum. The ×50 version reads as "noticeable motifs, moderate inward lean"—calm, slightly contractive weather. Lived experience and the week's context confirm the latter.

⸻

9.6 — Rendering Rules (Display Layer)

Once scaled and clamped, apply these final formatting rules:

**Precision**: Round to 1 decimal place. Never suppress the negative sign (use proper minus `−`, not hyphen `-`).

**SFD Null Handling**: When `sfd` is `null` in the JSON, display as `n/a`. Do not synthesize, backfill, or assume 0.0.

**Trend Indicators**: When rendering sparkline or icon summaries, preserve proportional spacing:
```
Magnitude: X|||||++  (shows Oct 4 peak, gradual easing)
Coherence: |+=+--=+  (shows fluctuation, not flatline)
```

**Date Range**: Always render the full requested window. If JSON contains Oct 4–11, display all eight days—not just through Oct 10.

⸻

9.7 — Auditability Checklist

To verify correct pipeline implementation, check these invariants:

✓ Normalized values in JSON remain in decimal format (0.00–0.10 typical range)
✓ Scaling happens before clamping in the display transform
✓ No value shows as −5.0 or +5.0 unless genuinely at observed maximum
✓ Directional Bias shows variation across multi-day windows (not a flat wall)
✓ SFD displays as 'n/a' when null, never as 0.0 or omitted
✓ Dashboard values reconcile with JSON when ×50 transform is applied

If readings cluster at extremes (multiple −5.0 days) or flatten into monotone, suspect premature clamping or incorrect scale factor.

⸻

9.8 — Why This Matters

When the pipeline distorts, the seismograph stops being a mirror and becomes a binary alarm. Every day reads as maximum crisis or background hum, with no middle ground. The art of symbolic weather lies in the gradations—the difference between 2.5 and 3.8, between gentle lean and enforced boundary, between easing and collapse.

The Math Brain captures these distinctions. The renderer must preserve them. This section ensures the climate readout you receive matches the territory the instrument measured—not the artifacts of a mis-tuned display stage.

⸻

Balance Meter v3 — now with a pipeline spec that prevents the renderer from lying to the mirror.

⸻


⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻

ADDENDUM: SURGICAL UPGRADES TO FIX DIRECTIVE

⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻

Context: The following precision upgrades make the directive airtight, regression-
resistant, and audit-ready. They address edge cases, standardize conventions, 
and add observability safeguards that turn silent failures into loud alarms.

⸻

PART 1A: MATH & SEMANTICS PRECISION (Addendum to Part 1)

1.1 SFD Decimal Precision Standardization

   CHANGE: Standardize all SFD references to TWO decimal places consistently.

   Current directive shows:
     "Round to 1 decimal place" (Part 1)

   Updated requirement:
     Integration Bias / SFD (−1 to +1 display range):
       Round to TWO decimal places: -1.00 to +1.00

       Rationale: SFD's tight range requires finer granularity to preserve
                  distinction between -0.32 and -0.28 (material difference
                  in cohesion quality)

   Examples:
     • 0.08 × 10 = 0.80 → display as 0.80 (not 0.8)
     • -0.03 × 10 = -0.30 → display as -0.30 (not -0.3)

1.2 Minus Sign & Rounding Convention

   EXPLICIT REQUIREMENT:

   Minus symbol: Use Unicode U+2212 (−) for all negative displays, not ASCII 
                 hyphen-minus (U+002D). This ensures typographic consistency 
                 and prevents parser ambiguity in exports.

   Rounding method: Use round-half-up (not banker's rounding / round-half-even).
                    This matches human expectation and prevents subtle 
                    even/odd bias in edge cases.

   Implementation note:
     Python: Use Decimal.quantize() with ROUND_HALF_UP
     JavaScript: Math.round() (default behavior)
     Avoid: Python's round() (uses banker's rounding by default)

   Add to Acceptance Criteria:
     ✓ All negative values display proper minus (U+2212)
     ✓ Rounding uses round-half-up: 2.45 → 2.5, 2.35 → 2.4

1.3 Coherence Inversion Guard

   NEW CONFIGURATION FLAG:

   Add to system config:
     coherence_from = "volatility"  # or "coherence" if schema changes

   Rationale: If future JSON schema renames "volatility" to "coherence" and 
              emits pre-inverted values, the display layer must NOT invert again.

   Implementation:
     IF coherence_from == "volatility":
         coherence_display = 5 - (normalized × 50)
     ELSE:
         coherence_display = normalized × 50

   Add to test suite:
     DOUBLE-INVERSION TEST:
       1. Feed vol_n=0.02, assert Coh=4.0 (correct inversion)
       2. Change config to coherence_from="coherence"
       3. Feed coh_n=0.04 (pre-inverted equivalent), assert Coh=2.0 (no double)
       4. Fail test if both scenarios produce same output (signals double-inversion)

1.4 SFD Double-Scaling Guard

   EDGE CASE PROTECTION:

   If SFD calculation produces values directly in −1.0…+1.0 range (via ratio-
   difference formula), DO NOT apply ×10 scaling on top.

   Implementation check:
     IF abs(sfd_raw) > 0.15:  # Heuristic: values >0.15 suggest already scaled
         sfd_display = sfd_raw  # Do not multiply by 10
     ELSE:
         sfd_display = sfd_raw × 10

   Better approach: Add metadata flag to JSON:
     "sfd_pre_scaled": true  # signals no further scaling needed

   Add to test suite:
     DOUBLE-SCALE TEST:
       1. Mock SFD_raw = 0.8 (already in -1 to +1)
       2. Confirm display shows 0.80, not 8.00
       3. Mock SFD_raw = 0.08 (normalized 0-0.1)
       4. Confirm display shows 0.80, not 0.08

⸻

PART 2A: SFD CALCULATION EDGE LOGIC (Addendum to Part 2)

2.1 Conjunction Policy (Explicit Fallback)

   CURRENT GAP: Directive lists conjunctions as "neutral (exclude)" without 
                explicit handling.

   EXPLICIT REQUIREMENT:

   Conjunctions (0°) are CONTEXT-DEPENDENT:
     • Sun ☌ Venus = supportive (harmony)
     • Mars ☌ Saturn = frictional (restriction)
     • Mars ☌ Pluto = highly frictional (intensity/crisis)

   Phase 1 fallback policy:
     Treat ALL conjunctions as NEUTRAL (exclude from SFD calculation)

     Rationale: Without a full conjunction polarity lookup table, guessing
                creates false precision. Exclusion is safer than misclassification.

   Future implementation (Phase 2+):
     Add conjunction_polarity_table mapping planet pairs to weights:
       conjunction_polarity = {
         ("Sun", "Venus"): +0.5,
         ("Mars", "Saturn"): -0.8,
         ("Mars", "Pluto"): -0.9,
         ...
       }

     Include in metadata:
       "conjunction_policy": "neutral"  # Phase 1
       "conjunction_policy": "table_v1" # Phase 2 with lookup

2.2 Angles Bonus Weight (Optional Enhancement)

   OPTIONAL BUT RECOMMENDED:

   When an aspect involves a natal angle (ASC, MC, IC, DSC), apply ×1.2 weight 
   multiplier to reflect increased lived-experience potency.

   Implementation:
     IF p1 in ["ASC", "MC", "IC", "DSC"] OR p2 in ["ASC", "MC", "IC", "DSC"]:
         aspect_weight *= 1.2

   Metadata requirement:
     "angle_weight_multiplier": 1.2  # if enabled
     "angle_weight_multiplier": null # if disabled

   Rationale: Angles represent tangible life domains; aspects to them register
              more concretely in lived experience than aspects between transits.

2.3 Synastry Dominance Control (Optional Limiter)

   OPTIONAL EDGE CASE PROTECTION:

   In dense synastry charts with many same-planet hard aspects (Mars □ Mars, 
   Sun ☍ Sun), a single aspect type can dominate the SFD score and wash out
   all other patterns.

   Optional down-weight:
     IF aspect involves same planet on both sides (e.g., Mars □ Mars):
         aspect_weight *= 0.8

   Rationale: Same-planet aspects reflect mirroring/doubling dynamics, which
              may be psychologically significant but should not drown out the
              broader aspect ecology.

   Metadata requirement:
     "same_planet_limiter": 0.8  # if enabled
     "same_planet_limiter": null # if disabled

   Log when applied:
     "synastry_dominance_adjustments": [
       {"aspect": "Mars square Mars", "weight_before": 0.85, "weight_after": 0.68}
     ]

⸻

PART 3A: MODE & WINDOW CORRECTNESS (Addendum to Parts 1 & 4)

3.1 Timezone & DST Handling

   EXPLICIT REQUIREMENT:

   Daily date cuts must use a FIXED timezone to prevent off-by-one errors
   around DST transitions.

   Required timezone: America/Chicago (Central Time)

   Implementation:
     • Parse all input dates in America/Chicago
     • Calculate daily aspect windows using Central Time midnight boundaries
     • Log timezone in every export: "timezone": "America/Chicago"

   Rationale: User is based in Panama City, FL (Central Time). Using UTC or
              floating local time creates ambiguity during DST spring-forward
              and fall-back weekends.

3.2 Inclusive Window Test (DST-Safe)

   NEW TEST REQUIREMENT:

   Add explicit test asserting both date window endpoints render, even when
   window spans a DST boundary.

   Test case:
     date_window = ["2025-03-08", "2025-03-10"]  # DST spring-forward

     Assert:
       • 2025-03-08 renders (day before DST)
       • 2025-03-09 renders (DST transition day, 23 hours)
       • 2025-03-10 renders (day after DST)
       • Total: 3 days, not 2 or 4

   Common bug: Naive datetime arithmetic skips DST transition day or double-
               counts it depending on timezone-naive vs. timezone-aware handling.

⸻

PART 4A: OBSERVABILITY (Addendum to Part 4)

4.1 Per-Axis Transform Trace

   ENHANCED LOGGING REQUIREMENT:

   For each axis on each day, emit machine-parsable JSON log:

   Magnitude/Directional Bias/Coherence:
     {
       "date": "2025-10-04",
       "axis": "magnitude",
       "normalized": 0.05,
       "scaled": 2.5,
       "clamped": 2.5,
       "rounded": 2.5,
       "transform": "×50, clamp [0,5], round 1 decimal"
     }

   SFD:
     {
       "date": "2025-10-04",
       "axis": "sfd",
       "supportive_sum": 3.2,
       "frictional_sum": 4.1,
       "score_raw": -0.123,
       "scaled": -1.23,
       "clamped": -1.00,
       "rounded": -1.00,
       "display": -1.00
     }

   Purpose: Enables precise debugging of transform pipeline and retroactive
            audits of historical data.

4.2 Clamp Counter Metrics

   NEW OBSERVABILITY METRIC:

   Emit per-axis clamp hit counters:
     clamp_hits{axis="directional_bias", bound="min"} = 0  # Good: no -5.0 hits
     clamp_hits{axis="directional_bias", bound="max"} = 0  # Good: no +5.0 hits
     clamp_hits{axis="magnitude", bound="max"} = 1        # Oct 4 hit 5.0 ceiling

   Alert threshold:
     IF clamp_hits{axis="directional_bias"} / total_days > 0.10:
         ALERT: "Directional Bias hitting extremes on >10% of days in Absolute mode"
         ACTION: Investigate scaling factor misconfiguration

   Rationale: Frequent clamp hits in Absolute mode signal wrong scaling factor
              or genuine extreme period. Either way, human review needed.

4.3 Fabrication Sentinel (Build Breaker)

   HARD VALIDATION GUARD:

   If SFD appears in dashboard output while aspect drivers (supportive + 
   frictional) = 0, emit build-breaking violation:

     sfd_fabrication_violation = 1

   Logic:
     IF display_sfd != "n/a" AND (supportive_aspects == 0 AND frictional_aspects == 0):
         RAISE FabricationError("SFD synthesized without aspect drivers")

   OR if JSON shows null:
     IF display_sfd != "n/a" AND json_sfd == null:
         RAISE FabricationError("SFD displayed when JSON source is null")

   CI/CD integration:
     Treat as test failure. Block deployment until resolved.

⸻

PART 5A: METADATA & VERSIONING (Addendum to Part 4)

5.1 Spec & Version Stamps

   EXTENDED METADATA REQUIREMENTS:

   Add to every JSON export:

   {
     "spec_version": "3.1",
     "scaling_profile_version": "absolute_v1",
     "weights_profile_version": "tight_orbs_v1",
     "conjunction_policy": "neutral",  # or "table_v1" when implemented
     "normalized_input_hash": "sha256:abc123...",  # for reproducibility
     "provenance": {
       "engine_build": "math_brain_v2.3.1",
       "dataset_id": "dan_stephie_synastry",
       "run_id": "20251004_124007_GMT",
       "export_timestamp": "2025-10-04T17:40:07Z"
     }
   }

   Purpose:
     • spec_version: Tracks which specification version governs interpretation
     • scaling_profile_version: Allows A/B testing Absolute vs. future Adaptive
     • weights_profile_version: Documents orb thresholds and planetary weights
     • normalized_input_hash: Enables reproducibility checks (detect data drift)
     • provenance: Full audit trail for forensic analysis

5.2 Mode Badge Everywhere

   UI REQUIREMENT:

   Display scaling mode badge at panel AND export level:

   Dashboard panel header:
     "Scaling: Absolute ×50 | Coherence: Inverted from Volatility"

   JSON export (repeated from Part 4, now emphasized):
     "scaling_mode": "absolute",
     "scale_factor": 50,
     "coherence_inversion": true,
     "pipeline": "scale → clamp → round"

   Tooltip on hover:
     "Magnitude/Bias/Coherence use ×50 scaling from normalized 0-0.1 range.
      Coherence is inverted: display = 5 - (volatility × 50).
      SFD uses ×10 scaling from normalized -0.1 to +0.1 range."

⸻

PART 6A: EXPANDED TEST SUITE (Addendum to Part 5)

6.1 Golden Fixtures (Snapshot Tests)

   NEW TEST REQUIREMENT:

   Store Oct 4-11 golden JSON and expected display outputs as version-controlled
   fixtures. Run byte-for-byte diff on every build.

   Fixtures:
     tests/fixtures/golden_oct4_11.json         # Input (normalized values)
     tests/fixtures/golden_oct4_11_expected.json # Expected display outputs

   Test logic:
     actual_output = render_dashboard(golden_oct4_11.json)
     expected_output = load(golden_oct4_11_expected.json)

     assert actual_output == expected_output  # Exact match, no tolerance

   Purpose: Prevents silent regressions. Any change to output triggers explicit
            review and fixture update.

6.2 Double-Inversion Test (Coherence)

   NEW TEST (detailed in 1.3, repeated here for emphasis):

   Test A: Current state (volatility in JSON)
     Input: {"volatility": 0.02}
     Config: coherence_from = "volatility"
     Expected: coherence_display = 5 - (0.02 × 50) = 4.0

   Test B: Future state (coherence in JSON, no inversion needed)
     Input: {"coherence": 0.04}  # Pre-inverted equivalent
     Config: coherence_from = "coherence"
     Expected: coherence_display = 0.04 × 50 = 2.0

   Test C: Regression guard (double-inversion detector)
     Input: {"volatility": 0.02}
     Config: coherence_from = "coherence"  # WRONG config for current schema
     Expected: coherence_display = 0.02 × 50 = 1.0  # Inverted wrong direction
     Assert: Test FAILS if output matches Test A (signals double-inversion)

6.3 Adaptive Mode Off-Switch Verification

   NEW TEST (Phase 1 only):

   Verify Adaptive mode is fully bypassed or absent:

   Test:
     output_metadata = generate_report(config={"scaling_mode": "absolute"})

     Assert:
       • "adaptive" not in output_metadata
       • "percentile" not in output_metadata
       • "tanh" not in output_metadata
       • scale_factor == 50 (not variable)

   Purpose: Prevents accidental Adaptive leakage during Phase 1 rollout.

6.4 SFD Micro-Case Fixtures

   NEW TEST CASES:

   Case 1: Only supportive aspects
     Aspects: Sun △ Moon (trine), Venus ⚹ Jupiter (sextile)
     Expected SFD: +1.00 (maximum supportive)

   Case 2: Only frictional aspects
     Aspects: Mars □ Saturn (square), Sun ☍ Pluto (opposition)
     Expected SFD: -1.00 (maximum frictional)

   Case 3: Balanced (equal supportive and frictional)
     Aspects: Sun △ Jupiter (+weight), Mars □ Saturn (-weight, equal magnitude)
     Expected SFD: 0.00 (neutral balance)

   Case 4: No qualifying aspects (no drivers)
     Aspects: Only conjunctions (excluded) or very wide orbs (filtered out)
     Expected SFD: "n/a" (not 0.00, not null, display as "n/a")

⸻

PART 7A: UI/COPY GOVERNANCE (New Section)

7.1 Lexicon Lint (Automated Enforcement)

   NEW BUILD-TIME CHECK:

   Preflight string lint on all UI copy:

   Directional Bias text:
     FORBIDDEN words: ["friction", "harmony", "supportive", "conflict", "cooperation"]
     ALLOWED words: ["inward", "outward", "expansion", "contraction", "flow", "drag"]

   Integration Bias (SFD) text:
     FORBIDDEN words: ["inward", "outward", "expansion", "contraction", "opening", "closing"]
     ALLOWED words: ["friction", "harmony", "supportive", "conflict", "cooperation", "fragmentation"]

   Implementation:
     Run regex check on all dashboard templates, tooltip strings, and lexicon files.
     Fail build if violation detected.

   Example violation:
     Directional Bias lexicon: "-3: Friction and compression"
     FAIL: "Friction" belongs to SFD axis, not Directional Bias

7.2 Tooltips That Teach

   NEW UI REQUIREMENT:

   Add educational tooltips to axis labels:

   Directional Bias tooltip:
     "Direction: Does the field lean inward (contraction) or outward (expansion)?
      This axis measures spatial flow, not cooperation quality."

   Integration Bias (SFD) tooltip:
     "Cohesion: Do forces work together (supportive) or against each other (frictional)?
      This axis measures cooperation quality, not direction."

   Purpose: Educate users about the differential. Prevents misinterpretation
            of -2.5 Directional Bias as "bad" or +0.5 SFD as "expansion."

⸻

PART 8A: ROLLOUT SAFETY (Addendum to Part 6)

8.1 Feature Flags (Hard Defaults)

   PHASE 1 REQUIREMENT:

   Lock scaling_mode to "absolute" with hard default:

   Config:
     display_scaling_mode = "absolute"  # Hard-coded for Phase 1
     # display_scaling_mode = "adaptive"  # Commented out, Phase 2+ only

   If Adaptive is ever enabled (Phase 2+):
     Require metadata proofs:
       • "percentile_window_days": 30
       • "p_low": 0.02, "p_high": 0.09
       • "adaptive_disclaimer": "Values scaled to local window, not universal"

   Feature flag guard:
     IF display_scaling_mode == "adaptive" AND not metadata_complete:
         RAISE ConfigError("Adaptive mode requires percentile metadata")

8.2 Backfill Ban (Runtime Guard)

   HARD RUNTIME VALIDATION:

   Reject any pipeline attempting to generate SFD from non-SFD sources:

   Guard logic:
     IF sfd_display != "n/a":
         REQUIRE: json_source["sfd"] exists OR calculation_log["sfd_drivers"] > 0

     IF sfd_display != "n/a" AND json_source["sfd"] == null AND calculation_log["sfd_drivers"] == 0:
         RAISE BackfillViolation("SFD synthesized without valid source or drivers")
         LOG: "CRITICAL: SFD fabrication detected, aborting render"

   Purpose: Prevents dashboard from inventing SFD values when Math Brain
            returns null (as currently observed).

⸻

PART 9A: DOCUMENTATION & EXAMPLES (New Section)

9.1 Worked SFD Examples (Full Calculation Traces)

   Add to directive or reference docs:

   Example 1: Simple Synastry (Solo + Transits)

   Aspects for Oct 4, 2025:
     1. Dan Sun △ Transit Neptune (trine, orb 1.24°)
        Supportive: weight = 1.0 × (1 - 1.24/3.0) = 0.59

     2. Dan Sun □ Transit Mercury (square, orb -4.78°)
        Frictional: FILTERED (orb > 3°, does not count)

     3. Dan Sun ⚹ Transit Uranus (sextile, orb 0.56°)
        Supportive: weight = 1.0 × (1 - 0.56/3.0) = 0.81

     4. Dan Moon ☍ Stephie Pluto (opposition, orb 2.10°)
        Frictional: weight = 1.0 × (1 - 2.10/3.0) = 0.30

   Calculation:
     S (supportive sum) = 0.59 + 0.81 = 1.40
     F (frictional sum) = 0.30

     SFD_raw = (S - F) / (S + F) = (1.40 - 0.30) / (1.40 + 0.30) = 1.10 / 1.70 = 0.647

     SFD_display = clamp(0.647 × 10, -1, +1) = clamp(6.47, -1, +1) = +1.00

     (Note: Clamping occurs because raw score × 10 exceeds +1.0 ceiling)

   Display: SFD +1.00 (maximum supportive)

   Example 2: Balanced Field

   Aspects:
     1. Sun △ Moon (trine, orb 1.0°): S += 0.67
     2. Mars □ Saturn (square, orb 1.5°): F += 0.50
     3. Venus ⚹ Jupiter (sextile, orb 2.0°): S += 0.33

   Calculation:
     S = 0.67 + 0.33 = 1.00
     F = 0.50

     SFD_raw = (1.00 - 0.50) / (1.00 + 0.50) = 0.50 / 1.50 = 0.333

     SFD_display = round(0.333 × 10, 2) = round(3.33, 2) = 3.33 → clamp → 1.00?

     (Error in example: should be SFD_display = 3.33, but range is -1 to +1!)

     CORRECTION: SFD_raw already in -1 to +1 via ratio-difference.
                 If computing via ratio-difference, DO NOT multiply by 10.

     SFD_display = round(0.333, 2) = 0.33 (net supportive, balanced toward cooperation)

9.2 Changelog Entry (Version Control)

   Add to system changelog or release notes:

   VERSION 3.1: Display Layer Corrections & Axis Restoration

   Changes:
     • Fixed display scaling: Absolute ×50 (was ×100), restores gradation
     • Implemented Volatility → Coherence inversion (display = 5 - vol×50)
     • Separated Directional Bias and Integration Bias (SFD) lexicons
     • Added SFD calculation: supportive vs. frictional ratio-difference
     • Standardized SFD to two decimal places (-1.00 to +1.00)
     • Added audit metadata: scaling mode, pipeline order, transform traces
     • Enforced null handling: SFD displays "n/a" when absent (no fabrication)
     • Added timezone-aware date windowing: America/Chicago, DST-safe
     • Implemented lexicon lint: prevents axis term cross-contamination
     • Added observability: clamp counters, fabrication sentinels, transform logs

   Breaking Changes:
     • Display values differ from v3.0 due to corrected scaling
     • Historical data must be re-rendered with new pipeline for consistency
     • SFD no longer fabricated; expect "n/a" in synastry until calculation ships

   Migration:
     • Phase 1: Display scaling + inversion (immediate usability fix)
     • Phase 2: SFD calculation + lexicon separation (diagnostic clarity)
     • Phase 3: Metadata + observability (audit + regression prevention)

⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻

INTEGRATION WITH MASTER DIRECTIVE

These surgical upgrades fold into the original directive as follows:

  • Parts 1A, 2A, 3A, 4A, 5A → Enhance existing Parts 1-5
  • Parts 6A, 7A, 8A → Extend validation, governance, rollout safety
  • Part 9A → Add documentation and examples

Updated Acceptance Criteria Count: 18 original + 12 new = 30 total checkpoints

⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻

SUMMARY: FROM FIX TO MATH TREATY

With these upgrades, the directive evolves from a repair manual to a precision
specification:

  • Ambiguities eliminated (SFD decimals, rounding method, conjunction policy)
  • Edge cases hardened (double-inversion, double-scaling, DST handling)
  • Observability maximized (transform traces, clamp counters, fabrication sentinels)
  • Regression resistance (golden fixtures, lexicon lint, backfill ban)
  • Auditability complete (version stamps, provenance, metadata everywhere)

If the system violates these contracts, it will light up alarms like a Christmas
tree. Silent drift is now architecturally impossible.

⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻

END ADDENDUM

⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻

