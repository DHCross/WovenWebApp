Perfe# **Balance Meter v4.0 — Authoritative Label Map and Scaling Specification**

### **Principle**

The Balance Meter reports symbolic field conditions — *it measures, it doesn't moralize.*
Three core axes quantify the sky's energetic geometry in neutral language:
1. **Magnitude** (intensity)
2. **Directional Bias** (expansion vs. contraction)
3. **Coherence** (narrative stability)

This document defines the **canonical labels and numeric bins** for Magnitude and Directional Bias (Valence).
It supersedes all prior label sets (v3.2 and below), including deprecated SFD/Integration Bias systems.e’s your **final, cleaned, version-controlled specification** for Balance Meter **v4.0**, with everything aligned to current logic, binning, and terminology.
This is what should go in both your repo’s `/specs/Balance_Meter_v4.md` and the internal markdown exports used by the reporting layer.

---

# **Balance Meter v4.0 — Authoritative Label Map and Scaling Specification**

### **Principle**

The Balance Meter reports symbolic field conditions — *it measures, it doesn’t moralize.*
Four axes quantify the sky’s energetic geometry in neutral language.
This document defines the **canonical labels and numeric bins** for Magnitude and Directional Bias (Valence).
It supersedes all prior label sets (v3.2 and below).

---

## **1. Magnitude (0–5)**

**Semantic field:** energetic *amplitude* or *pressure intensity* — “how loud the field is.”
**Levels:** 5 numeric bands, 4 text labels, with a *Peak* badge at the extreme upper bound.

| Display (0–5) | Label     | Description                                                    |
| :------------ | :-------- | :------------------------------------------------------------- |
| **0.0 – 0.9** | **Trace** | Barely perceptible field — faint atmospheric hum.              |
| **1.0 – 1.9** | **Pulse** | Noticeable but contained rhythm — intermittent signal.         |
| **2.0 – 2.9** | **Wave**  | Sustained, repeating motif — stable symbolic flow.             |
| **3.0 – 5.0** | **Surge** | Strong, immersive pressure — dominant pattern in play.         |
| *(≥ 4.8)*     | *(Peak)*  | Optional tag applied to **Surge** when near-maximum amplitude. |

**Mathematical definition**

```js
magnitude_display = round1(clamp(norm * 5, 0, 5))
```

* `round1(x)` = `Math.round(x * 10) / 10`
* “Peak” is a *badge*, not a label.
* No synonyms beyond these four canonical words.

---

## **2. Directional Bias / Valence (−5 … +5)**

**Semantic field:** energetic *vector* or *flow direction* — “which way the pressure leans.”
This axis describes motion, not morality.

| Bias value      | Label              | Description                                                           |
| :-------------- | :----------------- | :-------------------------------------------------------------------- |
| **≥ +4.0**      | **Strong Outward** | Expansive momentum — boundary-dissolving, externalized expression.    |
| **+1.5 … +3.9** | **Mild Outward**   | Gentle expansion — openness or growth without overreach.              |
| **−1.4 … +1.4** | **Equilibrium**    | Centered — inward and outward forces in balance.                      |
| **−3.9 … −1.5** | **Mild Inward**    | Subtle contraction — reflection, restraint, consolidation.            |
| **≤ −4.0**      | **Strong Inward**  | Maximum compression — focused, self-containing, or defensive posture. |

**Mathematical definition**

```js
bias_display = round1(clamp(norm * 5, -5, 5))
```

* Always use the proper Unicode minus (U+2212) in display.
* `norm` is the normalized bias value (−1 … +1).
* Bias words are **directional**, never evaluative.

---

## **3. Integration & Compatibility**

```
label_profile: "v4.magnitude{Trace|Pulse|Wave|Surge+Peak}.bias{Strong/Mild Out|Eq|Mild/Strong In}"
```

* **Magnitude** → 0–5 axis
* **Directional Bias** → −5 … +5 axis
* **Canonical profile name:** `"BalanceMeter.v4"`
* Back-compat translators for legacy labels (`Collapse/Friction/Drag/Equilibrium/Flow/Expansion`) remain supported in data imports but **never surface in UI or exports**.

---

## **4. Implementation Guidance**

1. **Precision:** Always display one decimal.
2. **Clamping:** Clamp *after* scaling; never pre-clamp normalized inputs.
3. **Badging:** Add `(Peak)` only when `magnitude_display ≥ 4.8`.
4. **Cross-axis independence:** Labeling logic must not alter numeric state or propagate rounding across axes.
5. **Hash Stamp:**

   ```
   spec_version: "BalanceMeter_v4"
   label_profile: "v4"
   scale_mode: "absolute"
   build_date: YYYY-MM-DD
   ```

---

## **5. Purpose Recap**

| Axis                 | Measures                              | Range   | Core Labels                          | Interpretive Mode            |
| :------------------- | :------------------------------------ | :------ | :----------------------------------- | :--------------------------- |
| **Magnitude**        | Symbolic amplitude / energy intensity | 0 – 5   | Trace / Pulse / Wave / Surge (+Peak) | *Descriptive* — “how strong” |
| **Directional Bias** | Vector of motion / pressure lean      | −5 … +5 | Strong Inward ← → Strong Outward     | *Descriptive* — “which way”  |

---

### **Summary Footer**

> **Balance Meter v4**
> A seismograph of symbolic geometry — precise, falsifiable, and linguistically neutral.
> It measures amplitude and vector; the meaning is emergent, not imposed.

---

✅ **v4.0 Accepted for Implementation**
Frozen 2025-10-07 UTC
`sha256: TBD-on-build`
Authoritative vocabulary for all future Balance Meter exports.
