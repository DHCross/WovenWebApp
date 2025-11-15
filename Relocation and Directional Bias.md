# **Relocation Astrology & Directional Bias: A Technical Overview**

*(Valence \= deprecated legacy term; retained parenthetically where historically relevant)*

## **The Woven Map's Architectural Foundation**

---

## **Executive Summary**

This document explains the critical relationship between **Relocation** (geographic recalibration of a chart’s angular framework) and **Directional Bias** *(formerly “Valence”)* within The Woven Map’s diagnostic methodology. Distinguishing these layers is essential for correct interpretation of the **Two-Axis Symbolic Seismograph** (Balance Meter).

**Key Finding:** Relocation determines *which house* (life domain) receives symbolic pressure. Directional Bias measures *the qualitative tilt* of that pressure (contraction vs. expansion), and **does not change with location**.

**Terminology Update:** This document conforms to AstrologerAPI standards and retires the older term **Translocation**, which created semantic ambiguity.

**Note:** Magnitude, like Directional Bias, is fully invariant across locations because it is computed solely from natal–transit aspect geometry. Relocation never alters either metric—only the house placement that localizes their impact.

---

## **I. Core Definitions**

### **Relocation (Computational)**

The mathematically rigorous process of recalculating a chart’s **house system and angles** (ASC/MC/DSC/IC) for a new geographic position while keeping the original birth or event time unchanged.

**Relocation changes:**

* House cusps  
* Angular emphasis  
* Domain of impact (the “room” where symbolic pressure lands)

**Relocation does *not* change:**

* Planetary longitudes  
* Aspects between planets  
* Personalized symbolic metrics (Magnitude \+ Directional Bias)

**API Implementation:** AstrologerAPI recomputes houses using updated `latitude/longitude` inputs in the `subjectModel`.

**Woven Map Mandate:** All “felt-weather” metrics (Seismograph, Balance Meter) must use **relocated charts** for accuracy.

---

### **Context (Narrative/Biographical)**

Descriptive metadata explaining the human circumstance of a relocation.

**Does not influence computation.** Encoded optionally in `context.location_note`.

---

### **Directional Bias *(formerly Valence)***

A quantitative measure of the *quality* or *tilt* of symbolic pressure, ranging from **–5 (maximum contraction)** to **\+5 (maximum expansion)**.

**Directional Bias measures:**

* Harmonious vs. stressful natal–transit aspect patterns  
* Global “tilt” toward stability or destabilization  
* Flow dynamics (compression vs. expansion)

**Directional Bias does *not* measure:**

* Emotional valence (expansion can feel overwhelming; contraction can feel grounding)  
* Morality (“good” or “bad”)  
* Location (Directional Bias is invariant across space)

**Architectural Note:** Directional Bias is calculated *exclusively* from natal–transit aspect geometry and planetary weighting. **House placement plays no role in Directional Bias.**

**Diagnostic work: Placidus (anchored to the true horizon/meridian and the system’s internal relocation engine outputs Placidus by default; analysts must not switch to Whole Sign for diagnosis).**

---

## **II. The Three-Layer Architecture**

The Woven Map uses three independent structural layers:

### **Layer 1: Universal Geometry (Invariant)**

Fixed planetary positions and interplanetary aspects at a given UTC timestamp.

### **Layer 2: Personalized Response (Natal-Specific)**

**Magnitude (0–5):** How strongly the universal sky activates *your* chart. **Directional Bias (–5 to \+5):** The qualitative tilt produced by those activations.

### **Layer 3: Geographic Localization (Location-Specific)**

**Houses (1–12):** The life domain that receives the symbolic pressure. **Angles:** Horizon and meridian anchors; define house structure.

---

## **III. Transit Overlay vs. True Relocation**

### **Transit Overlay (Hybrid Model, Not Used)**

* Natal houses fixed to birth location  
* Transit angles tied to current location  
* Produces **fractured geometry**

**Rejected by Woven Map.** Not used for diagnostic FIELD calculations.

### **True Relocation (Unified Model, Required)**

* Both natal and transit geometry anchored to the same coordinates  
* Produces a unified FIELD chart  
* Ensures diagnostic precision

---

## **IV. What Relocation Changes vs. What It Doesn’t**

### **Relocation DOES change:**

1. Natal and transiting house placement  
2. Angular emphasis  
3. Crisis *domain* (not intensity, not quality)  
4. Diagnostic accuracy

### **Relocation DOES NOT change:**

1. Planetary longitudes  
2. Planetary aspects  
3. **Magnitude** (intensity)  
4. **Directional Bias** *(legacy term: Valence)*

**Principle:** Directional Bias reflects the *quality* of activation; Relocation determines *where* that quality manifests.

---

## **V. Hurricane Michael Validation (Gold Standard)**

### **Universal Geometry**

* Pluto in Capricorn  
* Stress aspects globally identical

### **Personalized Response (Layer 2\)**

* **Magnitude:** 5.0  
* **Directional Bias:** –3.3 to –5  
* Values identical regardless of location

### **Geographic Localization (Layer 3\)**

#### **Panama City (Impact Zone):**

* Pluto activates **2nd House** (resources/material security)  
* Home physically destroyed  
* 93% stronger correlation vs. control

#### **Baltimore (Control Group):**

* Same Magnitude \+ Directional Bias  
* Pluto activates *different* house  
* No material crisis  
* Signal weak/nonexistent

**Conclusion:** Crisis type correlates with **house placement**, not with magnitude or someone’s geography in isolation.

---

## **VI. The Two-Axis Symbolic Seismograph (Balance Meter)**

### **Axis 1 — Magnitude (Vertical)**

Intensity of symbolic pressure (0–5)

### **Axis 2 — Directional Bias (Horizontal)**

Qualitative tilt (–5 → contraction; \+5 → expansion)

**Directional Bias \= aspect geometry only. Never influenced by houses.**

### **Integration With Houses**

Houses localize pressure:

* High Magnitude \+ Negative Directional Bias in 2nd House → material strain  
* High Magnitude \+ Negative Directional Bias in 7th House → relational strain  
* Same pressure, different domain

---

## **VII. Dual Nature of Relocation**

### **Symbolic Physics (Instant)**

Map shifts the moment the body does.

### **Symbolic Psychology (Gradual)**

Experience updates over weeks or months.

This duality prevents metaphysical overreach and preserves empirical discipline.

---

## **VIII. Practical Diagnostic Protocol**

**Current Location:**

1. Compute natal chart  
2. Compute universal transits  
3. Relocate chart  
4. Compute Magnitude \+ Directional Bias  
5. Identify activated houses  
6. Diagnose domain-specific pressure

**Multi-Location Tracking:**

* Magnitude \+ Directional Bias stay constant  
* Houses shift with latitude/longitude

**Longitudinal Studies:**

* Log relocation date  
* Track domain changes  
* Identify O-INTEGRATION point

---

## **IX. Common Misconceptions**

1. **“Directional Bias changes with location.”** False. Aspect geometry doesn’t move.

2. **“Relocation moves planets.”** False. Only houses rotate.

3. **“Positive Directional Bias feels good.”** False. Psychological tone ≠ structural quality.

4. **“Crisis shifts instantly when relocating.”** Physically yes; experientially no.

5. **“Any house system works.”** Diagnostic work requires **Placidus**.

6. **“Transit Overlay \= Relocation.”** False. Overlay \= fractured frame.

---

## **X. Falsifiability**

Three independent predictions:

### **1\. Natal Sensitivity**

Only activated charts show high Magnitude \+ extreme Directional Bias.

### **2\. House-Domain Correlation**

Activated house predicts crisis type.

### **3\. Relocation Shift**

Same natal chart \+ new coordinates → new crisis domain.

If any fail, the model fails.

---

## **XI. Epistemological Status**

### **Known:**

* Relocation increases predictive accuracy  
* Personalized metrics remain stable across locations  
* Domain correlation exceeds chance

### **Unknown:**

* Mechanism of correlation  
* Whether causal or acausal  
* Ontological status of symbolic information

### **Stance:**

**Model-agnostic. Diagnostic, not deterministic.**

---

## **XII. Terminology Standardization**

### **Adopted:**

* Relocation  
* Context  
* FIELD Chart  
* Directional Bias

### **Deprecated:**

* Valence *(legacy term; retained parenthetically)*  
* Translocation  
* Transit Overlay

### **Woven Map-Specific:**

* Symbolic Physics  
* Symbolic Psychology  
* O-INTEGRATION

---

## **XIII. Conclusion**

Relocation and Directional Bias operate on two different structural layers:

* **Directional Bias:** Quality of pressure derived solely from aspect geometry. *(Invariant; formerly called Valence)*

* **Relocation:** Determines which house receives that pressure. *(Variable; location-dependent)*

Both are required for precision. Together they produce diagnostically meaningful, falsifiable predictions.

**High Magnitude \+ Negative Directional Bias in the 2nd House \= material crisis likely in this window.**

**The map provides coordinates. The user navigates.**

Note: In implementation, these steps correspond to `computeSymbolicWeatherWithContext` for FIELD generation and the Balance Meter for Magnitude \+ Directional Bias scoring.