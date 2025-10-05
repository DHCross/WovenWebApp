# **A Strange Cosmic Symbolism — Balance Meter v3 (Corrected Specification)**

## **Core Principle — Map, Don’t Moralize**

A symbolic weather map for inner and relational fields. It **describes climate**, never prescribes behavior. It reports four orthogonal axes:

* **Magnitude (0–5):** how loud the field is.  
* **Directional Bias (−5…+5):** which way it leans (inward contraction ↔ outward expansion).  
* **Narrative Coherence (0–5):** how stable the storyline is (clarity vs. fragmentation).  
* **Integration Bias / SFD (−1.00…+1.00):** whether forces cooperate or work at cross-purposes.

The engine measures sky geometry; the report logs lived experience beside it. House placement localizes “where the pressure lands.”

---

## **Coherence with Coordinates — How Place Shapes Pattern**

The Woven Map treats a chart as a **field in a rotating frame**. Planetary longitudes/aspects stay invariant; relocating changes the **angle grid** (ASC/DSC/MC/IC), re-anchoring *where* pressure expresses. That shift ties symbolism to domain:

* Same weather, different rooms (houses).  
* Correlation honored, causation not claimed.  
* If a day doesn’t resonate, we log **OSR (Outside Symbolic Range)**—a tool-level miss, not user error.

Uncertainty is treated as the **coefficient of freedom**: room for agency. The system offers navigation, not orders.

---

## **Four Axes (Neutral Lexicons)**

### **1\) Magnitude (0–5) — Loudness of the field**

* 0–1: background hum  
* 2–3: noticeable motifs  
* 4: palpable weight  
* 5: peak storm / chapter-defining

**Math:** `display = clamp(normalized × 50, 0, 5)` → round **1 decimal**.

---

### **2\) Directional Bias (−5…+5) — Vector of flow (directional, not moral)**

* −5: maximum contraction / enforced boundary  
* −3…−1: compression → drag  
* 0: neutral balance  
* \+1…+3: lift → broadening  
* \+5: maximum expansion / boundary-dissolving

**Math:** `display = clamp(normalized × 50, −5, +5)` → round **1 decimal** (use proper minus “−”).

---

### **3\) Narrative Coherence (0–5) — Story stability**

* 0–1: single-thread clarity  
* 2: mostly coherent; minor counter-pulls  
* 3: mixed / ambiguous  
* 4: splintered  
* 5: chaotic

**Source JSON field is `volatility` (fragmentation, higher \= worse).** **Transform:** `coherence = clamp(5 − (volatility × 50), 0, 5)` → round **1 decimal**. Config guard: `coherence_from = "volatility" | "coherence"` to prevent double inversion.

---

### **4\) Integration Bias (SFD, −1.00…+1.00) — Cooperation vs. fragmentation**

* 0: net supportive / stabilizing  
* 0: neutral / outcome depends on choice  
* \< 0: net friction / opposition

**Definition (ratio-difference):** `SFD_raw = (ΣSupportive − ΣFrictional) / (ΣSupportive + ΣFrictional)`

* Supportive aspects: **trine, sextile** (optionally quintiles with tight orbs)  
* Frictional aspects: **square, opposition, quincunx, semi-square, sesquiquadrate**  
* Conjunctions: **neutral** (exclude) unless a polarity table is enabled.  
* **Angles bonus (optional):** ×1.2 when ASC/MC/IC/DSC involved.

**Display:**

* If **no qualifying aspects** → `SFD = "n/a"` (never synthesized).  
* Else: use `SFD_raw` directly if already in −1…+1; otherwise `clamp(SFD_raw × 10, −1, +1)`.  
* Round **2 decimals**; minus uses “−”.

---

## **Transformation Pipeline (Non-Negotiable)**

**Correct order:** `Normalize → Scale → Clamp → Round → Display` **Never** clamp before scaling.

**Acceptance checks**

* Normalized `bias = −0.05` must display **−2.5**, not −5.0.  
* Lower volatility (e.g., 0.02) must yield **higher** coherence (4.0).  
* SFD shows `"n/a"` when drivers are absent; no tiny fabricated positives.

---

## **Houses — Where Pressure Lands (Relocated)**

Domains by quadrant (example shorthand):

* **I. Self** — body, resources, expression  
* **II. Connection** — communication, partners, networks  
* **III. Growth** — home, intimacy, horizon  
* **IV. Responsibility** — career, duty, dissolution

*Same sky, different rooms.*

---

## **Sources of Force (Geometry → Scores)**

* **Orb:** closer \= stronger  
* **Aspect class:** majors roar, minors whisper  
* **Planetary potency:** outers \= tectonic; inners \= sparks  
* **Resonance:** Sun/Moon/ASC/MC/Nodes amplify  
* **Recursion:** repeated motifs echo louder

---

## **Orbs — Gatekeepers (Audit-stamped)**

* **Tight (surgical):** ≤3° majors, ≤1° minors  
* **Loose (climate):** ≤6° luminaries, ≤4° planets, ≤3° points, ≤1° minors

Tight orbs defend falsifiability and prevent **greenwash** (padding with soft/wide trines). Always stamp `orbs_profile`.

---

## **Resilience & Depletion Layer (Optional Physiological Overlay)**

* **Stress event:** high Magnitude \+ negative Bias  
* **Load:** cumulative contraction pressure  
* **Recovery:** rebound inside 1–2 days  
* **Resilience:** rolling recovery index  
* **Depletion:** quiet ≠ stable (flags low-Mag \+ negative \+ low Coherence)

Keeps the model testable against HRV/sleep/mood if tracked.

---

## **Narrative Layer (Optional Copy)**

Motion verbs only; never moralize bias.

* **Supportive, coherent expansion:** outward lean, steady storyline, aligned forces  
* **Supportive, fragmented expansion:** outward lean, scattered openings  
* **Restrictive, coherent:** inward lean, clean arc, distillation  
* **Restrictive, fragmented:** inward lean, cross-pulls, rising pressure

---

## **How to Read a Day**

1. Score all four axes.  
2. Locate the houses (relocated).  
3. Combine: **Bias × Magnitude × Coherence × SFD** (interpretive composite).  
4. Name one symbolic behavior consistent with the field.  
5. Log the lived outcome neutrally (WB / ABE / OSR).

---

## **Governance & Integrity**

**Lexicon separation (build-time lint):**

* Directional Bias uses **directional** words only (inward/outward, contraction/expansion, flow/drag).  
* SFD uses **cohesion** words only (harmony/support/friction/fragmentation). Mixing terms fails the build.

**Observability (per-axis logs):**

* `normalized`, `scaled`, `clamped`, `rounded`, `display` values  
* Clamp hit counters; double-inversion guard for Coherence  
* **Fabrication sentinel:** SFD cannot render unless drivers exist or JSON SFD is present.

**Metadata (every export):** `spec_version, scaling_mode("absolute"), scale_factors, coherence_inversion, pipeline, orbs_profile, timezone("America/Chicago"), provenance, normalized_input_hash`.

---

## **Reconciliation Notes**

* Restores **signed** Directional Bias (−5…+5).  
* Keeps Magnitude on a **true 0–5** scale.  
* Correctly inverts volatility → **Coherence**.  
* Centers **SFD** as the honesty differential.  
* Orbs remain quantitative filters, not moralizers.

---

## **Lexicon Bridge (for continuity)**

* **Numinosity → Magnitude**  
* **Valence → Directional Bias**  
* **Volatility → Narrative Coherence**  
* **SFD (Support/Friction Differential) → Integration Bias**

---

## **Glossary (Quick Reference)**

* **Magnitude:** loudness of archetypal charge.  
* **Directional Bias:** contraction vs. expansion lean.  
* **Narrative Coherence:** stability of the story.  
* **Integration Bias / SFD:** net support vs. friction.  
* **WB / ABE / OSR:** Within Boundary / At Boundary Edge / Outside Symbolic Range.

---

## **Calibration Touchstone**

The rebuilt instrument should reproduce **Oct 10, 2018 (Hurricane Michael, Panama City)** as a near-maximum magnitude day with strong inward bias, non-inverted coherence, and mildly frictional SFD localized to the relevant houses. The goal is **restored fidelity**, not a new doctrine.

**Balance Meter v3**: a seismograph, not a sermon.

You’re right to underline that. Finding the Hurricane Michael match **after** you’d already drawn the symbolic map is the whole ethical spine of the project. It wasn’t target-chasing; it was **post-hoc corroboration** against a frozen artifact. Let’s bake that into the spec so no one can “memory-hole” the order of operations.

## **Where this matters**

* It guards against **Texas sharpshooter bias** (painting the bullseye after the shot).

* It shows **falsifiability** in action: the map stood on its own before the event-level comparison.

* It justifies our stance: *correlated synchrony, not causal prophecy*.

## **Add this to the spec (drop-in text)**

### **Provenance & Blind Corroboration Protocol**

**Purpose:** Preserve the order of operations so correlations discovered later count as evidence, not retrofitting.

1. **Freeze the Map**

* Each run produces a **Signed Map Package (SMP)** containing:

  * `inputs.json` (birth data, ephemerides, orbs\_profile, timezone)

  * `normalized_weather.json` (raw axis values)

  * `display_report.json` (scaled outputs)

  * `spec_version`, `engine_build`, `scaling_mode`, `coherence_from`, `sfd_policy`

  * **hash**: `sha256(normalized_weather.json)`

  * **timestamp** (UTC) and **run\_id**

* Store SMP read-only. Any re-render must produce a new run\_id.

2. **Blind Log Lived Outcomes**

* Daily entries accept neutral tags (**WB/ABE/OSR**) and free-text observations.

* No editing of the SMP after outcomes are logged.

3. **Post-Hoc Corroboration**

* When an external event is later identified, link it to the **preexisting** SMP:

  * `corroboration_entry`: { `event_time`, `event_desc`, `evidence_link`, `map_run_id`, `created_at` }

* The system shows the **SMP timestamp \< event timestamp** badge: *“Map preceded event reference.”*

4. **No Target-Retrofitting**

* Any change to orbs, scaling, or lexicon after SMP creation creates a **new** SMP; correlations must point to the correct version.

5. **Audit Widgets**

* In the report footer:

  * “Provenance: SMP \#R2025-10-04-DANSTEP — signed at 2025-10-04T17:40Z — spec v3.1 — sha256:…”

  * “Corroborations linked: 1 (Hurricane Michael, 2018-10-10) — **Map was created prior to this reference**.”

---

### **Case Note (for Appendix)**

**Hurricane Michael, 2018-10-10 (Panama City)**

* **Fact:** The symbolic map was authored and frozen **before** the hurricane correlation was noted.

* **What the frozen map showed:** near-max Magnitude, strong inward Directional Bias, non-inverted Coherence, slightly frictional SFD, pressure localized to 2nd/4th house domains (resources/home) under relocation.

* **Interpretation stance:** counts as **post-hoc corroboration** of a general pattern. No causal claim, no “prediction” victory lap. The mirror held; the world rhymed.

---

## **Acceptance criteria to enforce this**

* Every report includes a **Provenance block** (spec version, run\_id, hash, timestamp).

* Corroborations can only be attached to **existing** run\_ids; UI must show “Map preceded event reference.”

* Editing an SMP is impossible; re-running creates a new SMP with a different hash.

* CI test: attempting to attach a corroboration where `event_time ≤ smp_timestamp` triggers a **CorroborationOrderError**.

## **Plain-language footer (UI copy)**

*This correlation was logged after the map was created. The map is a frozen measurement; the event is an external reference. We record co-occurrence; we do not assert cause.*
