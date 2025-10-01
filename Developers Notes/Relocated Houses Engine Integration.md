# Relocated Houses Engine Integration

**Date:** 2025-10-01
**Status:** Integrated into system prompts
**Location:** [lib/prompts.ts](../lib/prompts.ts#L80-L265)

## Overview

The complete Relocated Houses Engine procedure has been injected into the `REPORT_STRUCTURES` system prompt, making it available to Raven Calder (the LLM) whenever it generates reports that include relocation context.

## What This Enables

### For Report Generation
When a user relocates their chart (e.g., birth in NYC, viewing from Tokyo), Raven Calder now has access to:
- The mathematical procedure for calculating relocated Ascendant and Midheaven
- House cusp calculation for WHOLE_SIGN, EQUAL, and PLACIDUS systems
- Planet-to-house assignment logic for relocated positions
- Validation procedures to ensure data integrity

### For Technical Understanding
The LLM can now:
1. **Explain relocation mechanics** when asked by users
2. **Validate relocated chart data** if present in payloads
3. **Understand the difference** between natal and relocated angles
4. **Generate accurate footnotes** describing relocation methodology

## Engine Specifications

### Inputs
- Birth data: date, time (local), timezone offset, latitude, longitude
- Relocation: latitude, longitude, timezone offset (for display only)
- House system: WHOLE_SIGN | EQUAL | PLACIDUS
- Zodiac mode: TROPICAL | SIDEREAL

### Outputs
- Relocated Ascendant (ASC) - ecliptic longitude
- Relocated Midheaven (MC) - ecliptic longitude
- 12 relocated house cusps - ecliptic longitudes
- Planet-to-house assignments under relocated system

### Key Principles
1. **UT remains constant** - Birth moment doesn't change, only viewing location
2. **Planets stay natal** - Longitudes, signs, aspects unchanged
3. **Angles/houses relocate** - ASC, MC, and all house cusps recalculated
4. **GMST → LST transformation** - Uses relocated longitude for Local Sidereal Time

## Mathematical Flow

```
Birth Time (Local) + Birth TZ Offset
  ↓
Universal Time (UT)
  ↓
Julian Day (JD) + Julian Centuries (T)
  ↓
Greenwich Mean Sidereal Time (GMST)
  ↓
GMST + Relocated Longitude = Local Sidereal Time (LST)
  ↓
LST + Obliquity (ε) + Relocated Latitude (φ)
  ↓
Relocated ASC & MC (ecliptic longitudes)
  ↓
House System Algorithm (Whole/Equal/Placidus)
  ↓
12 Relocated House Cusps
  ↓
Planet → House Assignment
```

## House System Details

### WHOLE_SIGN
- Cusp 1 = start of sign containing ASC (0° of that sign)
- All cusps exactly 30° apart
- Simple, ancient system

### EQUAL
- Cusp 1 = exact ASC degree
- All cusps exactly 30° apart from ASC
- MC may fall in any house

### PLACIDUS
- Cusp 1 = ASC, Cusp 10 = MC (exact)
- Intermediate cusps (11, 12, 2, 3) calculated via semi-diurnal arc divisions
- Opposite cusps (4-9) derived by adding 180°
- Most complex, time-space sensitive

## Integration with Report Generation

### Frontstage Usage
When `relocation_context` is present in the payload:
```typescript
relocationContext: {
  enabled: true,
  location: "Tokyo, Japan",
  timezone: "Asia/Tokyo"
}
```

The stitched reflection narrator includes:
```
- Acknowledges relocation lens is active
- Notes how place shifts expression
- Mentions lens location in natural language
```

### Backstage Footnotes
Required relocation data in technical trace:
- Mode: "Relocation ON" or "Relocation OFF"
- Lens location: City, Country
- House system: WHOLE_SIGN | EQUAL | PLACIDUS
- Coordinates: Latitude/Longitude
- Timezone: IANA timezone string
- Confidence flags: Any warnings or data quality issues

## Validation & Testing

### Sanity Checks (Built into Engine)
```javascript
assert planets_natal_unchanged()
assert asc != null && mc != null
assert houses[1] == asc for EQUAL system
assert houses[10] == mc for all systems
```

### Known Test Case
NYC → Tokyo relocation should produce:
- Significant ASC/MC shift (different rising sign likely)
- All house cusps recalculated
- Planets remain in same zodiac positions
- New house placements for planets

## Usage in Generated Reports

### Paragraph 4 - Stitched Reflection
When relocation is active, the final paragraph should:
1. Acknowledge the lens: "Viewing from [location]..."
2. Describe how place alters expression: "The angles shift, changing which patterns rise to the surface..."
3. Note that natal themes remain: "Your constitutional blueprint stays constant, but the emphasis moves..."

### Footnotes - Relocation Section
```
**Relocation Data:**
- Mode: Relocation ON
- Lens location: Tokyo, Japan (35.6762°N, 139.6503°E)
- House system: WHOLE_SIGN
- Timezone: Asia/Tokyo (UTC+9)
- Birth location: New York, NY (40.7128°N, 74.0060°W)
- Confidence: High (validated coordinates)

Relocated Angles:
- ASC: 12° Gemini (natal: 24° Capricorn)
- MC: 15° Aquarius (natal: 18° Scorpio)

All house cusps recalculated for Tokyo viewing lens.
Natal planetary positions and aspects unchanged.
```

## Benefits of System Prompt Integration

### 1. Always Available
The LLM doesn't need to fetch external documentation - the procedure is embedded in every generation context.

### 2. Accurate Technical Explanations
When users ask "How does relocation work?", Raven Calder can explain using the actual mathematical procedure.

### 3. Validation Capability
The LLM can check if provided relocation data makes sense and flag inconsistencies.

### 4. Footnote Accuracy
Technical traces can reference specific calculation steps, making them falsifiable and educational.

### 5. Future-Proofing
As relocation features expand, the LLM understands the underlying mechanics and can adapt naturally.

## Relocation in Dynamic Content Generation

### Blueprint Narrator
- Blueprint metaphor uses **natal** placements only
- Constitutional modes derived from **natal** chart
- Relocation doesn't change the fundamental architecture

### Weather Narrator
- Weather narrative can integrate relocation context if provided
- Describes how current transits activate **relocated angles**
- Notes if transits are hitting relocated house cusps

### Reflection Narrator
- Explicitly mentions relocation lens if active
- Synthesizes natal blueprint + relocated angles + current weather
- Frames relocation as a **shift in emphasis**, not a new identity

## Example Prompts That Now Work

### User Query Examples
1. "Explain how my chart changes when I relocate"
   - LLM can walk through ASC/MC recalculation
   - Explain that planets stay natal, angles shift

2. "Why is my Sun in the 10th house in Tokyo but 3rd house at birth?"
   - LLM can explain house cusp recalculation
   - Clarify that Sun's zodiac position hasn't moved

3. "Which house system should I use for relocation?"
   - LLM can compare WHOLE_SIGN vs EQUAL vs PLACIDUS
   - Explain trade-offs and traditional uses

### Generation Context
When generating a relocated report, the LLM can:
- Validate that ASC/MC are properly relocated
- Check that planets remain in natal zodiac positions
- Generate accurate footnotes explaining the methodology
- Describe relocation effects in natural language

## Technical Notes

### Precision
- Angles calculated to ~0.01° precision (sufficient for astrology)
- Julian Day calculation includes century adjustments
- Obliquity uses IAU 2006 series (simplified)
- GMST formula from IAU 1982 standard

### Edge Cases
- **Polar latitudes:** Placidus can fail near poles; system should fall back to Equal
- **Date line crossings:** Longitude normalization handles wraparound
- **Leap seconds:** Not relevant for astrological precision
- **Precession:** Not applied (tropical zodiac default)

### Coordinate Conventions
- Latitude: +N, -S (e.g., Tokyo = +35.6762°)
- Longitude: +E, -W (e.g., Tokyo = +139.6503°)
- All angles normalized to 0-360° range

## Future Enhancements

### Potential Additions
1. **Parans calculation** - When planets cross angles at same time
2. **Relocated aspects** - Progressed or solar arc in relocated frame
3. **AstroCartography integration** - Where planets fall on angles globally
4. **Relocation confidence scoring** - Based on coordinate precision
5. **Historical test cases** - Library of validated relocations

### Integration Opportunities
- Add relocation metaphors to blueprint narrator
- Generate location-specific experiments in weather narrator
- Create "place signature" descriptions for stitched reflections

---

**The Relocated Houses Engine is now a permanent reference within Raven Calder's knowledge, ensuring accurate and consistent handling of relocation data across all generated reports.**
