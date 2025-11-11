# Terminology Style Guide

## Critical Terminology: "Symbolic Weather"

### The Rule
**Always use "Symbolic Weather" (capitalized) in user-facing contexts. Never use just "weather" which can be confused with meteorological weather.**

### Why This Matters
- **Clarity**: "Weather" is ambiguous and confusing
- **Precision**: "Symbolic Weather" clearly indicates astrological transit patterns
- **Brand Identity**: This is our specific term for the Balance Meter's temporal readings
- **User Experience**: Prevents confusion with actual meteorological conditions

---

## Usage Guidelines

### ✅ CORRECT Usage

**User-Facing Labels** (UI, charts, buttons, headings):
- "Symbolic Weather"
- "Symbolic Weather — FIELD Layer"
- "Symbolic Weather — MAP + FIELD"
- "Symbolic Weather reading"
- "Symbolic Weather patterns"
- "Symbolic Weather data"
- "Symbolic Weather overlay"

**Inline Text** (sentences, descriptions):
- "symbolic weather" (lowercase acceptable in prose)
- "Add symbolic weather to your report"
- "This shows symbolic weather patterns over time"

**Technical Documentation**:
- "Symbolic Weather Protocol"
- "Symbolic Weather calculation"
- "Symbolic Weather constraints"

---

### ❌ INCORRECT Usage

**Never Use These in User-Facing Contexts:**
- ❌ "Weather" (alone, without "Symbolic")
- ❌ "Astrological weather" (redundant)
- ❌ "Transit weather" (too technical)
- ❌ "Weather data" (ambiguous)
- ❌ "Weather patterns" (ambiguous)
- ❌ "Weather overlay" (ambiguous)

**Exception**: Internal code (variable names, types, function names) can use `weather` for brevity:
```typescript
// ✅ Internal code - OK to use "weather"
type TransformedWeatherData = { ... }
function extractWeather() { ... }
const weatherData = transform(data);

// ✅ But user-facing labels MUST say "Symbolic Weather"
<h2>Symbolic Weather — FIELD Layer</h2>
<p>No symbolic weather data available</p>
```

---

## Scope Definitions

### "Symbolic Weather" Refers To:
1. **Transit calculations** — planetary movements relative to natal chart
2. **Balance Meter readings** — Magnitude & Directional Bias over time
3. **Temporal activations** — how geometry changes day-to-day
4. **FIELD layer data** — pressure measurements from aspects

### "Symbolic Weather" Does NOT Refer To:
- ❌ Natal chart data (that's "natal geometry" or "chart blueprint")
- ❌ Synastry patterns (that's "relational geometry")
- ❌ Static aspects (that's "natal aspects")
- ❌ House positions (that's "chart structure")

---

## Implementation Checklist

### User-Facing Components
- [x] AccelerometerScatter.tsx — title updated
- [x] UnifiedSymbolicDashboard.tsx — labels updated
- [x] WeatherPlots.tsx — all labels updated
- [x] ChatClient.tsx — already correct
- [ ] Math Brain main page — section headers (audit needed)
- [ ] Export buttons — filenames (audit needed)
- [ ] PDF generation — report titles (audit needed)
- [ ] Documentation — all user guides (audit needed)

### What Can Stay As-Is
- ✅ Variable names: `weatherData`, `TransformedWeatherData`, etc.
- ✅ Function names: `extractWeather()`, `transformWeather()`, etc.
- ✅ Type definitions: `Weather`, `WeatherPoint`, etc.
- ✅ File names: `weatherDataTransforms.ts`, `WeatherPlots.tsx`, etc.
- ✅ API routes: `/api/symbolic-weather` (already specific)

---

## Related Terminology Standards

### "Balance Meter"
- User-facing term for the measurement system
- Always capitalize: "Balance Meter v5.0"
- Never: "balance meter" (lowercase) or "Balance Meter System"

### "FIELD" vs "MAP"
- Always uppercase when referring to data layers
- "FIELD Layer" (pressure readings)
- "MAP Layer" (planetary geometry)
- "MAP + FIELD" (combined visualization)

### "True Accelerometer"
- Refers to the v5.0 measurement philosophy
- Always capitalize: "True Accelerometer v5.0"
- Emphasizes raw, unsmoothed measurements

### "Overflow Detail"
- Internal-only label for the overflow diagnostics block in Symbolic Weather exports
- Always describe it as a **detail** or **diagnostic**; never call it a "warning" or "error"
- `drivers` are "aspect drivers" or "overflow drivers" (not "reasons" or "causes")
- Use phrasing like "value trimmed to ±5 with overflow detail recorded" in engineering notes

### Avoid These Terms
- ❌ "Astrological forecast" (implies prediction)
- ❌ "Transit predictions" (violates falsifiability)
- ❌ "Weather forecast" (confusing + predictive)
- ❌ "Cosmic weather" (too mystical)

---

## Philosophy Behind This Rule

### Core Principle: Falsifiability
From RAVEN_PROTOCOL_V10.2_UNIFIED.md:
> "Symbolic Weather = transits/progressions ONLY. Blueprint = natal structure ONLY. Never mix these categories."

**Why "Symbolic"?**
- Emphasizes this is a **model**, not meteorology
- Indicates **symbolic/archetypal** patterns, not literal events
- Preserves **falsifiability** — user can confirm or refute

**Why "Weather"?**
- Conveys **temporal** nature (changes over time)
- Suggests **climate** vs **identity** (passing conditions, not fixed traits)
- Familiar metaphor for **atmospheric pressure** (field intensity)

**Why Both Together?**
- "Symbolic" = what it is (archetypal model)
- "Weather" = how it behaves (temporal, atmospheric)
- Together = clear, precise, falsifiable

---

## User Experience Implications

### What Users See vs Feel

**Scatter plots show:**
- ✅ "What does the geometry calculate?"
- ✅ "What patterns exist in the mathematical model?"

**NOT:**
- ❌ "What am I feeling?" (Only Poetic Brain conversation can confirm this)
- ❌ "What will happen?" (No predictions allowed)

**User Confirmation Required:**
The scatter plot data becomes meaningful only when the user validates it through conversation with Poetic Brain. The geometry proposes hypotheses; the user's lived experience provides verification.

### Proper Framing in UI

**Good:**
- "View your Symbolic Weather patterns"
- "This chart shows Symbolic Weather calculations based on your birth chart and current transits"
- "Symbolic Weather data helps identify potential periods of intensity"

**Bad:**
- ❌ "See what you'll feel"
- ❌ "Your weather forecast"
- ❌ "Predictions for the coming week"

---

## Quick Reference

| Context | Use This | Not This |
|---------|----------|----------|
| Chart title | "Symbolic Weather — FIELD Layer" | "Weather Map" |
| Button label | "View Symbolic Weather" | "See Weather" |
| Empty state | "No symbolic weather data available" | "No weather data" |
| Section header | "Symbolic Weather (Transits)" | "Weather (Transits)" |
| Inline text | "symbolic weather patterns" | "weather patterns" |
| Error message | "Symbolic Weather calculation failed" | "Weather failed" |
| Documentation | "Symbolic Weather Protocol" | "Weather Protocol" |

---

## Enforcement

### Code Review Checklist
- [ ] All user-facing strings use "Symbolic Weather"
- [ ] No bare "weather" in UI labels, buttons, or headings
- [ ] Chart titles specify "Symbolic Weather"
- [ ] Error messages are clear and specific
- [ ] Documentation uses consistent terminology

### Testing Prompts
1. Can a non-astrologist understand what "Symbolic Weather" means from context?
2. Is it clear this is NOT meteorological weather?
3. Does the label convey temporal/transit nature?
4. Is the term used consistently across related UI elements?

---

## Version History
- **v1.0** (Oct 20, 2025): Initial style guide created
  - Established "Symbolic Weather" as mandatory terminology
  - Updated AccelerometerScatter, UnifiedSymbolicDashboard, WeatherPlots
  - Documented philosophy and implementation guidelines
