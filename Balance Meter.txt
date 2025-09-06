# Seismograph Rebalance + Balance Meter — Integrated Protocol (v1.2 Draft)

*Last updated: Sep 5, 2025*

---

## Executive Summary

The original Seismograph was engineered for crisis detection: keep **Magnitude** true, let **Valence** lean negative to avoid missing quakes. This draft integrates three layers:

1. **Seismograph (v1.0)** — crisis-weighted baseline, preserved for historical continuity.
2. **Balance Channel (v1.1)** — rebalanced valence to reveal stabilizers without diluting magnitude.
3. **Support–Friction Differential (SFD, v1.2)** — a bipolar support meter that measures how much stabilizing signal survives targeted friction.

All three channels render daily and braid into one synthesized Mirror.

---

## Problem Statement — The Red Tilt & Fatalism Feedback Loop

When symbolic forecast and material crisis coincide, a negative-skewed valence can read like fate. The model needs to distinguish **correlation** from **causation** and surface **scaffolding** alongside strain. The goal is navigation, not prophecy.

---

## v1.1 Calibration Note — Rebalance (Valence Only)

**Core principle:** Leave **Magnitude** untouched (intensity is intensity). Re-weight **Valence** so supportive geometry becomes visible and extreme negatives don’t auto-peg.

### 1) Aspect Base (v)

* Square / Opposition: **–1.0** (was –1.2 to –1.6)
* Trine: **+1.1** (was +1.0)
* Sextile: **+0.8** (was +0.7)
* Quintile: **+0.4** (optional, minor)
* Conjunctions:

  * with Venus/Jupiter → **+0.8** (was +0.6)
  * with Saturn/Pluto/Chiron → **–0.7** (was –0.8)
  * neutral with others

### 2) Planetary Weights (p)

* Pluto, Saturn, Neptune, Uranus: **×1.3** (was ×1.5)
* Chiron: **×1.1** (was ×1.2)
* Jupiter, Venus: **×1.2** (was ×1.0)
* Sun, Mars, Mercury: **×1.0** (unchanged)
* Moon: **×0.5** (unchanged)

### 3) Orb Multipliers (o)

* Unchanged. Tight hits dominate; loose fades.

### 4) Sensitivity (s)

* Unchanged. Angles/luminaries/personals boosted symmetrically.

### 5) Stacking Rule

* Unchanged. Multiplicity bonuses remain; strike days still flag.

### 6) Versioning

* **v1.0** outputs remain archived; no overwrites.
* Apply **v1.1** from **Sep 2025** forward.
* Reports state: “Valence calculated under v1.1 calibration.”

### 7) Expected Results

* Magnitude: unchanged (strike days remain \~5).
* Valence: extreme negatives soften; mixed days can tilt slightly positive when benefics are exact; true positive strikes (+2 to +4) become possible.

---

## Balance Meter Protocol — Triple-Channel Integration (v1.2 Architecture)

**Core principle:** Seismograph remains the foundation (Magnitude × Valence, crisis-weighted). Two additional channels nest alongside it so each day carries a synthesized triple read. None replaces another; each shows a facet of the same geometry.

### Channels

* **Seismograph (v1.0):** Original weighting, tuned to detect collapse. Magnitude unchanged; Valence heavily negative. Preserves historic log.
* **Balance Channel (v1.1):** Rebalanced weighting (above). Magnitude unchanged; Valence reveals scaffolding when present.
* **SFD (v1.2):** Replaces one-sided Positive Index with a **bipolar** support meter (–5…+5). Measures net support after targeted friction is accounted for.

### Output Structure

Every report includes:

* Quake intensity (Seismograph)
* Strain vs scaffolding (Balance)
* Net support vs anti-support (SFD), plus its components (S+ and S−)

A single synthesized **Mirror** braids the three voices.

### Boundary Rules

* Pre–Sep 2025: Seismograph-only archives.
* From Sep 2025 forward: all three channels emitted and labeled; end with a fused Mirror.

### Expected Results

* Apex days remain apex across channels.
* Balance prevents “red wall” flattening.
* SFD identifies whether stabilizers **prevail**, are **cut**, or net **neutral**.

---

## Build Spec — Support–Friction Differential (SFD)

**Purpose:** Measure the net availability of stabilizing geometry after subtracting friction that **targets** those stabilizers. Output is signed **\[–5 … +5]**, zero-centered.

### Inputs

* Planetary positions; major aspects; orbs (same feed as other meters).

### Aspect Sets

**Support Set (S+):**

* Trines, sextiles among: Jupiter, Venus, Sun, Moon, Saturn (stabilizing), Mercury (when cohering)
* Benefic conjunctions (Jupiter/Venus)
* Moon–Saturn trine/sextile
* Minors: quintile/novile only when ≤1°

**Counter-Support Set (S−):** friction that targets/breaks S+ threads

* Squares/oppositions to Jupiter/Venus; or from Saturn/Mars/Neptune to S+ nodes
* Saturn/Neptune hard to Moon/Mercury **when** those anchor S+
* Mars hard to Venus/Jupiter; Saturn hard to Venus
* Conjunctions with Saturn/Pluto/Chiron to a benefic (undermining unless compensated by a simultaneous trine/sextile within ≤1.5°)

**Rule:** A hard aspect is eligible for S− if it touches any planet providing S+ that day.

### Weights & Multipliers

**Base aspect weights (valence units):**

* Trine **+1.5**; Sextile **+1.0**; Benefic Conj **+1.2**; Moon–Saturn (soft) **+1.2**; Minor (≤1°) **+0.5**
* Square/Opp to benefics **–1.3**; Saturn/Neptune hard to Moon/Mercury (when in S+) **–1.1**; Mars hard to Ven/Jup **–1.2**; Sat/Plu/Chi conj to benefic **–0.8**

**Planetary multipliers (mₚ):**

* Jupiter, Venus **×1.4**
* Moon, Saturn (stabilizing roles only) **×1.2**
* Sun, Mercury **×1.0**
* Mars (only in S−) **×1.2**
* Saturn/Pluto/Chiron (only in S−) **×1.2**
* Neptune (only in S−) **×1.1**

**Orb multiplier (o):** 1.0 at exact; linear taper to 0 at caps — ≤6° luminaries, ≤4° planets, ≤3° points; minors cap ≤1°.

**Sensitivity (s):** use global rules; angles/luminaries/personals boosted symmetrically.

### Calculation

1. Collect S+ events; score: `score = base * mₚA * mₚB * orb(o) * s` and accumulate **SupportSum**. Track **support\_nodes**.
2. Collect S− events that **touch support\_nodes**; score similarly and accumulate **CounterSum**. If S− does **not** touch support\_nodes, apply **0.7 locality factor**.
3. Normalize with soft cap using `norm(x) = 5 * tanh(x / K)` where **K≈4.0** (tune from historical median Σ|scores|).
4. Compute components: **Splus = norm(SupportSum)**; **Sminus = norm(CounterSum)**.
5. **SFD = clamp(Splus − Sminus, −5, +5)**.
6. Expose **Splus**, **Sminus**, and **SFD** in output.

### Pseudocode

```python
def compute_sfd(day_aspects):
    support, counter = 0.0, 0.0
    support_nodes = set()

    for a in day_aspects:
        if a in SUPPORT_SET:
            w = base_support_weight(a) * mult(a.planets) * orb(a) * sensitivity(a)
            support += max(w, 0)
            support_nodes |= set(a.planets)

    for a in day_aspects:
        if a in COUNTER_SET and touches_support_nodes(a, support_nodes):
            w = base_counter_weight(a) * mult(a.planets) * orb(a) * sensitivity(a)
            counter += max(abs(w), 0)
        elif a in COUNTER_SET:
            w = base_counter_weight(a) * mult(a.planets) * orb(a) * sensitivity(a) * 0.7
            counter += max(abs(w), 0)

    Splus  = 5 * tanh(support / K)
    Sminus = 5 * tanh(counter / K)
    SFD = clamp(Splus - Sminus, -5, 5)
    return SFD, Splus, Sminus
```

### Why SFD fixes the skew

A one-sided “Positive” meter could only say **how much green**. SFD says how much green **survives contact with red that targets it**. Some days the breeze lifts; some days headwinds slice it; some days the air is still. The read stays honest.

---

## Sample — Triple-Channel Synthesized Daily Entry (Nov 1, 2025)

**Sky context (qualitative):** Mom’s Solar Return; Scorpio stellium; slow heavies (Pluto, Saturn) in hard angles; minor softeners present.

**Channel reads:**

* **Seismograph (v1.0):** Mag **5.0**; Valence **–5.0** (pegged)
* **Balance (v1.1):** Mag **5.0**; Valence **≈ –3.0** (severe, not absolute)
* **SFD (v1.2):** `SFD = –1.5` (example), components `S+ = 1.2`, `S− = 2.7`

**Synthesized Mirror:**
“Nov 1 lands as a strike day by any meter. The Seismograph logs collapse at full tilt. The Balance channel pulls the readout up from inevitability—severe, not erasure. SFD shows stabilizers present but cut by direct headwinds (SFD –1.5; S+ 1.2 / S− 2.7). One expression: this is peak strain, yet the ground doesn’t vanish; softer tones hum beneath the dominant note.”

---

## Reporting & Labeling

**Daily line template:**

> **Quake high/med/low**, **balance leans \[direction]**, stabilizers **\[prevail/cut/neutral]** $SFD = X; S+ Y / S− Z$.

**Header:** always state channel versions (v1.0 / v1.1 / v1.2) and the date.

**Archiving:**

* No retro-edits. Pre–Sep 2025 logs remain Seismograph-only.
* Post–Sep 2025: emit all three channels and the fused Mirror.
* Any historical SFD backtests are labeled **“post‑hoc SFD sim.”**

---

## Appendix — Quick Weight Tables

**v1.1 Aspect Base:** Trine +1.1; Sextile +0.8; Square/Opp –1.0; Quintile +0.4; Conj: Ven/Jup +0.8; Sat/Plu/Chi –0.7; others 0.

**v1.1 Planetary Multipliers:** Pluto/Saturn/Neptune/Uranus ×1.3; Chiron ×1.1; Jupiter/Venus ×1.2; Sun/Mars/Mercury ×1.0; Moon ×0.5.

**SFD Base Weights:** Trine +1.5; Sextile +1.0; Benefic Conj +1.2; Moon–Saturn soft +1.2; Minor (≤1°) +0.5; Square/Opp to benefics –1.3; Sat/Nept hard to Moon/Mercury (when in S+) –1.1; Mars hard to Ven/Jup –1.2; Sat/Plu/Chi conj to benefic –0.8.

---

**Status:** Ready for implementation and live testing from Sep 2025 forward.
