# Core Natal Aspects — Key Patterns UI Redesign

**Status:** Pending implementation after Math Brain refactor completion  
**Priority:** Medium  
**Assigned:** TBD  
**Date Created:** 2025-10-04

---

## 🔍 Diagnostic Summary

### Current Strengths

✅ Clean layout — information hierarchy is clear.  
✅ Good typographic contrast and spacing.  
✅ Distinct color coding (orange for supportive/challenging).  
✅ Human-readable tone in the "What it feels like" field.

### Current Weaknesses

1. **Top Activations block is redundant and empty.**
   It repeats "creates important interaction between and themes" three times with no real differentiation.
2. **Symbol column isn't clearly connected to meaning.**
   "Symbol: Mercury Pluto opposition" could be made more visual or easier to scan.
3. **User doesn't immediately see polarity balance** (supportive vs. tense vs. challenging).
   There's no meta-signal of overall field tone or ratio.
4. **"Exactness" & "Strength" metrics are not intuitive.**
   "Wide" vs. "Moderate" are not visually mapped — the numbers are there but not semantically anchored.
5. **"What it feels like" copy could be made more active.**
   The phrasing sometimes reads like instruction rather than experience.

---

## 🧩 Structural Improvements

### 1. Replace "Top Activations" with *Aspect Synopsis Cards*

| Current                                                 | Proposed                                                                                                                                                                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ↔ creates important interaction between and themes (x3) | **Aspect Summary Table:**<br>• Mercury–Pluto Opposition → "Depth vs. Disclosure"<br>• Mercury–Neptune Trine → "Imagination in Motion"<br>• Node–Neptune Square → "Karmic Fog / Tension Toward Vision" |

This gives each activation a **semantic title** — a 2–4-word theme phrase that helps the user remember it.

---

### 2. Make Polarity Visually Readable

Add **color-coded polarity badges**:

* 🟥 **Challenging**
* 🟧 **Tense**
* 🟩 **Supportive**

And a quick header line:

> Overall field tone: 2 challenging / 1 supportive (Balanced pressure toward growth)

This mirrors the "integration bias" principle and helps the user see overall equilibrium.

---

### 3. Refine Metric Language

| Current                 | Suggested                             | Reason                                    |
| ----------------------- | ------------------------------------- | ----------------------------------------- |
| Strength: High / Medium | Intensity: Strong / Moderate / Subtle | "Intensity" aligns better with experience |
| Exactness: Wide (6.8°)  | Orb: 6.8° (wide)                      | Lead with the measurable quantity         |
| Coverage: adequate      | Coverage: 3 / 5 (Adequate)            | Adds numeric transparency                 |

---

### 4. Add a Visual Cue for Aspect Geometry

Include a small icon per card (trine △, opposition ☍, square □) before "Symbol."

**Example:**
```
Symbol: ☍ Mercury–Pluto Opposition
```

This helps users connect symbolic geometry and meaning.

---

### 5. Rewrite "What it feels like" for clarity and rhythm

| Current                                                                                                   | Improved                                                                                                            |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| "Conversations may bring hidden tensions to the surface, forcing you to face differences of perspective." | "Conversations dig up buried truths — uncomfortable but clarifying. You're asked to confront what's been unspoken." |
| "Ideas and communication flow easily—inspiration comes naturally, though details may slip."               | "Ideas drift and fuse freely — creative flow is effortless, though fine detail may blur."                           |
| "Relational or creative needs feel blocked, leading to frustration that eventually sparks growth."        | "Tension builds until movement becomes necessary — what blocks you now becomes the catalyst for growth."            |

These maintain interpretive accuracy but sound more *lived* and less formulaic.

---

### 6. Add Summary Footnote

At the bottom:

> *These describe the **field of tension and opportunity** in your natal map. They're not predictions, but reflective patterns you'll notice under stress, focus, or collaboration.*

This clarifies the epistemic stance — descriptive, not deterministic.

---

## ✨ Optional (Advanced UX Layer)

Add **hover micro-tooltips**:

* Over "Wide" → "The planets are 6.8° apart — influence is present but subtle."
* Over "Challenging" → "Oppositional dynamics — can surface insight through contrast."

And a toggle for:

> [ ] Show symbolic geometry overlay  
> [ ] Collapse explanations

---

## 🧠 Implementation Summary

| Type           | Problem                             | Fix                              |
| -------------- | ----------------------------------- | -------------------------------- |
| Information    | Redundant top activations           | Replace with titled aspect cards |
| Clarity        | Strength/Exactness language unclear | Rename to Intensity/Orb          |
| Interpretation | "What it feels like" too generic    | Rewrite for lived clarity        |
| Visual         | No geometric symbols                | Add glyphs (△ ☍ □ ⚹)             |
| Meta           | No overall polarity summary         | Add 3-axis tally badge           |
| UX             | Hidden meaning depth                | Add hover explanations           |

---

## 📋 Implementation Checklist

- [ ] Wait for Math Brain refactor completion (Codex)
- [ ] Identify component location in new structure
- [ ] Replace "Top Activations" section with semantic aspect titles
- [ ] Add polarity badges and overall tone summary
- [ ] Update metric labels (Strength → Intensity, Exactness → Orb)
- [ ] Add geometric symbols (△ ☍ □ ⚹) to aspect cards
- [ ] Rewrite "What it feels like" copy for all aspects
- [ ] Add epistemic stance footnote
- [ ] Implement hover tooltips (optional)
- [ ] Add user preference toggles (optional)
- [ ] Test with sample charts
- [ ] Update documentation

---

## 🔗 Related Files

- `app/math-brain/page.tsx` (will be refactored by Codex)
- `app/math-brain/components/` (new structure TBD)
- `src/raven-lite-mapper.js` (aspect calculation logic)

---

## 📝 Notes

- **Do not implement until Math Brain split is complete** to avoid merge conflicts
- These changes align with Raven Calder system principles: FIELD → MAP → VOICE
- Maintains epistemic rigor: descriptive patterns, not deterministic predictions
- Prioritizes user clarity and lived experience over technical jargon
