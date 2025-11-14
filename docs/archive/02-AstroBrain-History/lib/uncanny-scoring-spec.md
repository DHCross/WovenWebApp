# Technical Computation of Uncanny Scoring

**⚠️ DEPRECATED - Balance Meter v4.0 Update Required**

This specification references the deprecated SFD (Support-Friction Differential) system. 
Balance Meter v4.0 uses three core axes only:
- **Directional Bias** [-5, +5] — expansion vs. contraction
- **Magnitude** [0, 5] — intensity of symbolic charge
- **Coherence** [0, 5] — narrative stability (inverted volatility)

**This document needs updating to reflect v4.0 architecture.**

---

## Original Inputs (v3.x - DEPRECATED)

### Symbolic Fields (from Balance Meter v3.x)

- **SFD (Support–Friction Differential)** — DEPRECATED in v4.0
- **Magnitude** — intensity of symbolic charge, scaled 0–5
- **Volatility** — narrative instability (inverted to Coherence in v4.0), scaled 0–5

### Event Markers / Lived Data

- **Type:** event, mood note, physiological reading, relational marker
- **Valence:** −1 (negative), 0 (neutral), +1 (positive)
- **Timestamp:** day-aligned (with ±1–3 day windows allowed for lag modeling)

### Parameters (defaults)

- **Weights:** SFD 0.45, Magnitude 0.35, Volatility 0.20
- **Normalization:** robust median/MAD (to avoid skew from rare peaks)
- **Proximity radius:** R = 1 day (optional extended radius = 3 days)
- **Peak bonus:** +20% triangular weighting if lived event aligns with symbolic spike
- **Coherence penalty:** floor multiplier = 0.85 if valence misaligns with bias

---

## Computation Pipeline

### 1. Composite Signal (S)

Each day's symbolic input is normalized via robust z-scores, then combined:

```
S = 0.45 · z(SFD) + 0.35 · z(Magnitude) + 0.20 · z(Volatility)
```

### 2. Rarity Probability (p)

A rarity score is calculated: how unusual was this composite signal relative to the local 30–60 day distribution?

```
p = P(|S| ≥ S_day)
```

### 3. Base Score

The rarity is mapped into a 0–100 scale using −log probability (capped at 100).

### 4. Peak Proximity Bonus

If a lived event occurs within ±R days of a symbolic peak, apply up to +20% triangular boost.

### 5. Coherence Factor

If the symbolic bias (SFD sign) matches the lived event valence, score remains. If mismatched, apply penalty (typically ×0.85).

### 6. Final Score and Tiering

```
Final score = Base × Coherence × (1 + Bonus)
```

Then assign SST tier:

- **WB (Within Boundary):** strong resonance, >70
- **ABE (At Boundary Edge):** partial fit or lag, 40–70
- **OSR (Off-Signature Reversal):** mismatch or inversion, <40

---

## Vector Integrity Checks

To avoid overfitting or false positives:

- **Latent:** High symbolic S with no lived data logged → flagged as latent surge
- **Suppressed:** Event logged but score <20 → suppressed resonance
- **Dormant:** Weak SFD prevents match, even if event valence aligns

---

## Three Lanes Implementation

### Narrative Lane
Matches symbolic contraction/expansion with logged story language.

### Physiological Lane
Matches symbolic intensity with stress markers (HRV ↓, HR ↑, sleep ↓, mood −). Binary scoring of each stress marker (0–6 points).

### Relational Lane (experimental)
Event coding for communication friction, breakthroughs, or silences. Planned scoring parallels the other lanes.

---

## Summary

The quantitative version of Uncanny Scoring is designed to be **falsifiable and auditable**.

- It only applies **after the fact**
- All parameters, weights, and transformations are explicit
- Scores can be recalculated by any researcher with access to the symbolic fields and lived data logs

Everyday users don't need this math. It is included for transparency and for those interested in using the framework as a research instrument.

---

# FAQ: Technical Computation of Uncanny Scoring

## 1. What is the Composite Signal (S), and why are weights used?

The Composite Signal combines three symbolic axes—SFD (directional bias), Magnitude (charge), and Volatility (story stability)—into a single normalized score for each day.

The weights (0.45, 0.35, 0.20) reflect empirical importance:
- **SFD** is weighted most heavily, because directional bias is the primary axis of "lean"
- **Magnitude** is next, since intensity amplifies whatever direction is active
- **Volatility** matters, but is treated as a moderating influence rather than a driver

This creates a balanced but testable weighting model that can be recalibrated in future studies.

---

## 2. Why use robust median/MAD normalization instead of standard z-scores?

Symbolic weather data often includes rare peaks (like surges or storms) that skew averages. Using **Median Absolute Deviation (MAD)** instead of standard deviation ensures that those rare but meaningful spikes don't distort the scaling. This makes the signal more resilient to outliers, so everyday variation doesn't get exaggerated and rare extremes still stand out.

---

## 3. How does the rarity probability (p) work?

Rarity measures how unusual a day's composite signal is within a moving 30–60 day window.

- **Example:** if only 5% of days are as intense as today's, then p = 0.05
- This probability is then inverted via −log(p), which rewards rarity with a higher base score

This step ensures that ordinary days don't inflate scores, while rare symbolic configurations get recognized.

---

## 4. What's the purpose of the Peak Proximity Bonus?

Human experience doesn't always align exactly with symbolic peaks; often events cluster within a ±1–3 day window.

The **triangular proximity bonus** adds weight if a lived event happens near a symbolic surge, tapering as distance increases.

- This models lag and anticipation effects, while preventing "everything near a peak" from scoring equally high

---

## 5. Why penalize incoherence with a Coherence Factor?

Coherence checks whether the valence of the lived event (positive/negative) matches the symbolic bias (outward/inward).

- **Match** → score is preserved
- **Mismatch** → penalty applied (×0.85 by default)

This prevents the system from "rewarding" cases where the symbolic field and lived experience move in opposite directions (e.g., symbolic contraction but lived joy).

---

## 6. How are final scores interpreted?

Final scores (0–100) are classified into SST tiers:

- **WB (Within Boundary):** 70–100 → strong resonance, clear symbolic echo
- **ABE (At Boundary Edge):** 40–70 → partial or phase-lagged match
- **OSR (Off-Signature Reversal):** 0–40 → mismatch or inverse resonance

This tiering turns raw numbers into categories that can be compared across people or time periods.

---

## 7. What about false positives or empty surges?

Integrity checks guard against overfitting:

- **Latent:** symbolic surge but no logged event
- **Suppressed:** event logged, but score <20 (low resonance)
- **Dormant:** weak SFD prevents match, even if event valence aligns

This ensures the method is scientifically falsifiable—it openly records misses and nulls, rather than forcing matches.

---

## 8. How do the Three Lanes work in practice?

The framework separates resonance into three independent channels:

- **Narrative Lane:** checks whether story language (journals, logs) mirrors symbolic fields
- **Physiological Lane:** checks biometric stress markers (HRV ↓, HR ↑, poor sleep, mood drops)
- **Relational Lane (experimental):** checks communication patterns or interpersonal conflict/connection

A day can resonate in one lane, two, or all three.

- **All three aligning** → Rosetta Stone day
- **Fragmented coherence** (e.g., physiology lags behind narrative/mood) is logged as diagnostically significant

---

## 9. How is this different from prediction?

Uncanny Scoring is **strictly post-hoc**.

- The Balance Meter generates the map (symbolic climate)
- Uncanny Scoring compares that map to actual lived territory

This preserves credibility and falsifiability by avoiding any claim that symbolic weather causes outcomes. Instead, it measures whether outcomes echo symbolic fields.

---

## 10. Why is this framework important?

Because it creates an **auditable, transparent bridge** between symbolic geometry and measurable life markers.

- Researchers can rerun all calculations from scratch
- Users get validation (or disconfirmation) that isn't anecdotal
- Both hits and misses are part of the record

This is what makes it different from traditional symbolic interpretation: it is **falsifiable, testable, and iterative**.

---

## Implementation Status

### ✅ Currently Implemented (v1.0 - Simple Mode)
- Three-lane correlation (Valence ↔ Mood, Magnitude ↔ Intensity, Volatility ↔ Swings)
- Shuffle testing for statistical significance (1000 permutations)
- WB/ABE/OSR band classification
- Min-max normalization
- Client-side processing (privacy-first)

### 🔄 Planned (v2.0 - Research Mode)
- Weighted composite signal (SFD 0.45, Magnitude 0.35, Volatility 0.20)
- Robust median/MAD normalization
- Rarity probability calculation (z-scores → -log p)
- Peak proximity bonus (±1-3 day lag windows, triangular weighting)
- Coherence penalty (0.85× multiplier for valence/bias mismatch)
- Vector integrity flags (Latent, Suppressed, Dormant)
- Physiological binary scoring (0-6 point system)
- Relational lane implementation

### 📋 Configuration Modes

Users will be able to toggle between:

- **Simple Mode** (current) - Quick correlation validation
- **Research Mode** (planned) - Full specification with all parameters explicit and auditable

---

## References

- Balance Meter specification: `/lib/prompts.ts`
- Apple Health integration: `/lib/health-correlator.ts`
- UI component: `/components/HealthDataUpload.tsx`
- Type definitions: `/lib/health-data-types.ts`
