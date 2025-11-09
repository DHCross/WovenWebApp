## 7. Combined Uncanniness Analysis (Meta-Synthesis)

### Purpose
To measure the Poetic Brain’s overall interpretive coherence — whether multiple independent readings collectively exhibit statistically meaningful symbolic alignment (“uncanniness”) rather than isolated resonance.

### Variables (from telemetry and digests)
All fields are already emitted by the session seal and reducer processes:

```
wb_rate              # Within-Boundary resonance rate
abe_rate             # At-Boundary-Edge resonance rate
osr_rate             # Outside-Symbolic-Range rate (misses)
mag                  # Field Magnitude (symbolic intensity)
val                  # Directional Bias (signed directional tilt)
narrative_fit_score  # Symbolic → Narrative alignment, 0–100 scale
```

Derived inside the notebook or reducer:

```
mean_resonance_strength = wb_rate + 0.5 * abe_rate
osr_ratio = osr_rate / (wb_rate + abe_rate)
correlation_NV = corr(narrative_fit_score, mag * val)
```

### Uncanniness Index (UI)
A daily or weekly composite metric expressing aggregate symbolic–geometric coherence:

```
UI = (mean_resonance_strength * correlation_NV) / (1 + osr_ratio)
```

**Interpretation**
- High UI → sustained symbolic coherence and low falsification rate.
- Low UI → interpretive drift or noisy geometry.
- Tracking UI over time reveals “collective uncanny” intervals when multiple independent sessions converge in improbable alignment.

No additional infrastructure is required; once telemetry emits the above fields, your existing reducer or a simple notebook cell can compute this per day or per week.
