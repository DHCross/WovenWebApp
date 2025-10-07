Here’s a **rewritten, current, fully corrected** version of your Balance Meter specification — **v3.2**, SFD officially retired, Coherence formally grounded, and the Provenance protocol baked in.
It keeps your elegant voice and precise architecture but removes internal redundancies, ensuring that the document reflects your *real current system* rather than the transitional one.

---

# **A Strange Cosmic Symbolism — Balance Meter v3.2 (Unified Specification)**

## **Core Principle — Map, Don’t Moralize**

A symbolic weather instrument for *inner* and *relational* fields.
It **maps climate**; it never **prescribes conduct**.

The Balance Meter quantifies three independent axes of sky geometry, derived from direct ephemeris motion and aspect topology.

**Axes:**

* **Magnitude (0–5):** How loud the symbolic field is.
* **Directional Bias (−5…+5):** Which way energy leans (inward contraction ↔ outward expansion).
* **Coherence (0–5):** How stable the storyline is (continuity vs. flux).

Each value is geometric, testable, and location-aware via house recalculation.

---

## **Relocation Framework — Coherence with Coordinates**

A chart is a **rotating field**, not a flat image.
Planetary longitudes/aspects stay fixed; relocation changes the **angle grid** (ASC/DSC/MC/IC), shifting where pressure expresses.

* Same sky, different rooms (houses).
* Correlation honored; causation not claimed.
* If a day doesn’t resonate, we mark **OSR (Outside Symbolic Range)** — a miss in the model, not a failure of intuition.

Uncertainty is sacred: the **coefficient of freedom** that keeps choice alive.
The system offers navigation, never orders.

---

## **The Three Axes (Neutral Lexicons)**

### **1. Magnitude (0–5) — Loudness of the Field**

| Score | Description                   |
| :---- | :---------------------------- |
| 0–1   | Background hum                |
| 2–3   | Noticeable motifs             |
| 4     | Palpable weight               |
| 5     | Peak storm / chapter-defining |

**Math:**
`display = clamp(normalized × 50, 0, 5)` → round **1 decimal**

Magnitude is absolute, not moral. Loudness ≠ goodness.

---

### **2. Directional Bias (−5…+5) — Flow Vector (Directional, Not Moral)**

| Value | Interpretation                             |
| :---- | :----------------------------------------- |
| −5    | Maximum contraction / enforced boundary    |
| −3…−1 | Compression / drag                         |
| 0     | Neutral balance                            |
| +1…+3 | Lift / expansion                           |
| +5    | Maximum outward flow / boundary dissolving |

**Math:**
`display = clamp(normalized × 50, −5, +5)` → round **1 decimal** (proper minus “−”).

Directional Bias expresses energetic polarity, not virtue.

---

### **3. Coherence (0–5) — Stability of the Storyline**

Coherence quantifies the **temporal stability of aspect geometry** — how slowly the field reconfigures.
High Coherence = one clear arc.
Low Coherence = rapid rewriting, competing threads.

| Score | Description                            |
| :---- | :------------------------------------- |
| 4.5–5 | Highly stable / enduring pattern       |
| 3–4   | Moderately stable / traceable subplots |
| 2–3   | Variable / mixed storylines            |
| 0–2   | Chaotic / fractured flux               |

**Mathematical Definition (v3.2):**
Let **Gₜ** = vector of aspect weights at time *t*.
Compute ΔGₜ = Gₜ₊₁ − Gₜ (change in aspect field).
Average absolute change σ_G = mean(|ΔGₜ|).
Normalize σ_G to baseline (max = 0.5).
Then:
**Coherence = 5 − (σ_G / 0.5 × 5)**

Ephemeris-driven. Falsifiable.

---

## **Transformation Pipeline (Invariant Order)**

`Normalize → Scale → Clamp → Round → Display`
Never clamp before scaling.

**Checks:**

* Normalized bias −0.05 → display −2.5 (not −5).
* Lower volatility → higher Coherence.
* If inputs absent → field returns “n/a”, never fabricates.

---

## **Houses — Where Pressure Lands (Relocated)**

| Quadrant           | Domain                            | Theme               |
| :----------------- | :-------------------------------- | :------------------ |
| I. Self            | body, resources, expression       | identity pressure   |
| II. Connection     | communication, partners, networks | relational currents |
| III. Growth        | home, intimacy, horizon           | evolution arcs      |
| IV. Responsibility | career, duty, dissolution         | structural tension  |

Same sky, different rooms.

---

## **Sources of Force (Geometry → Scores)**

* **Orb:** tighter = stronger
* **Aspect class:** majors roar, minors whisper
* **Planetary potency:** outers = tectonic; inners = transient
* **Resonance:** Sun/Moon/ASC/MC/Nodes amplify
* **Recursion:** repeated motifs echo louder

All derive from astrologerAPI geometry, not inference.

---

## **Orbs — Gatekeepers (Audit-Stamped)**

| Type             | Major Aspects                           | Minor Aspects |
| :--------------- | :-------------------------------------- | :------------ |
| Tight (surgical) | ≤3° planets, ≤6° luminaries             | ≤1°           |
| Loose (climate)  | ≤6° luminaries, ≤4° planets, ≤3° points | ≤1°           |

Wide trines are not grace by default. Every run stamps `orbs_profile` for transparency.

---

## **Resilience & Depletion Layer (Optional Physiological Overlay)**

| Condition        | Definition                                  |
| :--------------- | :------------------------------------------ |
| **Stress Event** | High Magnitude + negative Bias              |
| **Load**         | Sustained contraction pressure              |
| **Recovery**     | Return within 1–2 days                      |
| **Resilience**   | Rolling recovery index                      |
| **Depletion**    | Quiet but incoherent = potential exhaustion |

Optional correlation to HRV/sleep/mood datasets.

---

## **Narrative Layer (Poetic Brain Hooks)**

Language reflects motion, not morality.

| Bias × Coherence         | Narrative Tone                           |
| :----------------------- | :--------------------------------------- |
| Supportive + Coherent    | Outward lean, steady storyline           |
| Supportive + Fragmented  | Outward lean, scattered openings         |
| Restrictive + Coherent   | Inward lean, distillation                |
| Restrictive + Fragmented | Inward lean, cross-pulls / pressure rise |

---

## **How to Read a Day**

1. Compute **Magnitude**, **Bias**, and **Coherence**.
2. Locate active houses (relocated).
3. Combine: **Bias × Magnitude × Coherence**.
4. Name one symbolic gesture consistent with that field.
5. Log outcome neutrally (WB / ABE / OSR).

---

## **Governance & Integrity**

**Lexicon Sanity (Build-Time Check):**

* Directional Bias → directional terms only (inward/outward, contract/expand).
* Coherence → stability terms only (thread, drift, rewrite).
* Mixing fields fails the build.

**Observability:**

* Logs each stage: normalized, scaled, clamped, rounded.
* Coherence inversion guard prevents double-flip.
* Clamp counters tracked; fabrications rejected.

**Export Metadata:**
`spec_version, scaling_mode, coherence_source, orbs_profile, timezone, provenance, normalized_hash`.

---

## **Provenance & Blind Corroboration Protocol**

Preserves falsifiability: every correlation must occur **after** the map exists.

1. **Freeze the Map (SMP)**

   * Store `inputs.json`, `normalized_weather.json`, `display_report.json`, metadata, SHA256 hash, timestamp, run_id.
   * SMP is immutable; re-runs create new IDs.

2. **Log Lived Outcomes**

   * Neutral tags only (**WB / ABE / OSR**).
   * No retroactive edits to SMP.

3. **Corroborate After the Fact**

   * External event entries include event time, link, and map_run_id.
   * UI badge confirms: “Map preceded event reference.”

4. **Audit Enforcement**

   * `event_time ≤ map_timestamp` → **CorroborationOrderError**.
   * Provenance footer example:

     > “Provenance: SMP #R2025-10-04-DANSTEP — spec v3.2 — sha256:… — map frozen before event.”

**Plain-Language UI Copy:**

> *This correlation was logged after the map was created. The map measures; the world responded. We record synchrony, not cause.*

---

## **Calibration Touchstone**

**Reference Event:** Hurricane Michael (2018-10-10, Panama City).
The rebuilt instrument must reproduce:

* **Magnitude:** near-maximum (5.0)
* **Directional Bias:** strong inward (≈ −5)
* **Coherence:** high, not inverted (≈ 4)
* **Localization:** 2nd / 4th house domains

Purpose: fidelity, not doctrine.

---

## **Lexicon Bridge (Continuity)**

| Legacy Term | v3.2 Equivalent                                    |
| :---------- | :------------------------------------------------- |
| Numinosity  | Magnitude                                          |
| Valence     | Directional Bias                                   |
| Volatility  | Coherence                                          |
| SFD         | *Retired* (replaced by Coherence × Bias interplay) |

---

## **Glossary (Quick Reference)**

* **Magnitude:** amplitude of symbolic charge.
* **Directional Bias:** contraction ↔ expansion vector.
* **Coherence:** temporal stability of geometric storyline.
* **WB / ABE / OSR:** Within Boundary / At Boundary Edge / Outside Symbolic Range.

---

## **Summary**

**Balance Meter v3.2** =
A seismograph of sky geometry.
Three axes. No moral frames.
Falsifiable. Correlational. Relocatable.
The map listens; the mirror reflects.

**Not prophecy — precision.**
**Not faith — fidelity.**
**Not belief — calibration.**
