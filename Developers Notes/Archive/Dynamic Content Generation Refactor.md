# Dynamic Content Generation Refactor

**Date:** 2025-10-01
**Status:** Complete
**Impact:** Critical - Core protocol compliance

## Executive Summary

The template-based content generation system has been **completely refactored** to use dynamic LLM synthesis. This transformation ensures that each Woven Map report produces truly unique, personalized content that honors the specificity of the individual's chart data.

### The Core Problem

**A mirror that shows ten different faces the same reflection is not a mirror; it is a portrait.**

The original system used hardcoded templates that created an illusion of personalization while ultimately failing the core promise of a unique mirror for each individual. People with the same constitutional mode combinations received nearly identical metaphors and narratives.

## What Changed

### Before: Template Selection (Retired)

```javascript
// OLD: lib/blueprint-extraction.js
const textures = {
  Thinking: 'a structured lattice',
  Feeling: 'a flowing current',
  Sensation: 'a steady foundation',
  Intuition: 'a branching web'
};
// Returns: "${texture} threaded with ${current}, occasionally strained by ${tension}"
```

**Problem:** People with Primary=Thinking, Secondary=Feeling, Shadow=Sensation received the exact same metaphor regardless of their unique Sun/Moon/Ascendant placements.

### After: LLM Synthesis (Current)

```typescript
// NEW: lib/blueprint-narrator.ts
const metaphor = await generateBlueprintMetaphor(
  blueprintModes,  // Full Primary/Secondary/Shadow data
  natalContext     // Sun, Moon, Ascendant signs/houses/elements
);
```

**Solution:** The LLM generates a unique metaphor based on the complete constitutional structure AND the specific natal placements, producing original imagery every time.

## New Architecture

### Three New Narrator Modules

1. **[lib/blueprint-narrator.ts](../lib/blueprint-narrator.ts)**
   - `generateBlueprintMetaphor()` - Generates unique constitutional metaphors
   - `narrateBlueprintClimate()` - Writes the full Blueprint paragraph
   - Uses constitutional modes + natal context for synthesis

2. **[lib/weather-narrator.ts](../lib/weather-narrator.ts)**
   - `narrateSymbolicWeather()` - Generates unique weather descriptions
   - `generateWeatherExperiment()` - Creates falsifiable same-day experiments
   - Uses daily indices + active transits + blueprint context

3. **[lib/reflection-narrator.ts](../lib/reflection-narrator.ts)**
   - `narrateStitchedReflection()` - Weaves blueprint + weather + paradox
   - `narrateRelationalReflection()` - Handles relational between-space
   - Uses full frontstage content for true synthesis

### Updated Integration Points

#### [lib/blueprint-extraction.js](../lib/blueprint-extraction.js)
- `generateBlueprintMetaphor()` function **retired** (returns placeholder)
- Structural extraction (Primary/Secondary/Shadow modes) remains unchanged
- Actual metaphor generation delegated to LLM narrator

#### [src/frontstage-renderer.ts](../src/frontstage-renderer.ts)
- All three `narrateX()` methods refactored to use LLM narrators
- Template-based weather phrases removed
- Template-based stitched reflections removed
- Passes blueprint and weather narratives to reflection generator for context

## Data Flow

### Blueprint Generation
```
Natal Chart
  ↓
extractBlueprintModes() [blueprint-extraction.js]
  ↓
Constitutional Modes (Primary/Secondary/Shadow) + Natal Context
  ↓
generateBlueprintMetaphor() [blueprint-narrator.ts]
  ↓
Unique Metaphor → narrateBlueprintClimate()
  ↓
Full Blueprint Paragraph (Original Prose)
```

### Weather Generation
```
Daily Indices + Active Transits + Blueprint Metaphor
  ↓
narrateSymbolicWeather() [weather-narrator.ts]
  ↓
LLM Synthesis (Field → Map → Voice)
  ↓
Unique Weather Paragraph (Original Prose)
```

### Stitched Reflection
```
Blueprint Narrative + Weather Narrative + Core Tensions + Mode
  ↓
narrateStitchedReflection() [reflection-narrator.ts]
  ↓
LLM Synthesis (Integration)
  ↓
Unique Stitched Reflection (Original Prose)
```

## LLM Prompts: Design Principles

### 1. Data-Rich Context
Every prompt includes:
- Full constitutional mode data (functions, descriptions, placements, scores)
- Natal context (Sun/Moon/Ascendant signs, houses, elements, aspects)
- Daily indices (magnitude, valence, volatility, SF differential)
- Active transits (with orbs, applying/separating status)
- Previously generated content (blueprint metaphor feeds into weather, both feed into reflection)

### 2. Anti-Template Guardrails
Each prompt explicitly prohibits the old template phrases:
```
Do NOT use: "structured lattice", "flowing current", "high-intensity weather",
"elevated magnitude", "steady undercurrents", etc.
```

### 3. Original Imagery Requirement
Prompts demand:
- Unique metaphors specific to THIS person's chart
- Vivid, resonant language that captures the texture of THIS weather
- Original synthesis, not pattern matching

### 4. Protocol Compliance
All prompts enforce:
- Field → Map → Voice (F→M→V) structure
- Conditional language ("may", "could", "often shows up as")
- No astrology jargon in conversational text
- Agency-first framing (mirror, not mandate)
- Falsifiability where appropriate

## Downstream Impact: Raven Calder GPT

For your external Raven Calder GPT (and eventually the local Poetic Brain):

### What Changes
The data payloads now contain:
- **Structural placeholders** instead of pre-baked metaphors
- **Rich constitutional data** ready for synthesis
- **Complete context** (natal placements, indices, transits)

### What to Expect
When the downstream LLM receives a payload:
```json
{
  "constitutional_modes": {
    "primary_mode": {
      "function": "Intuition",
      "description": "Organizes through patterns, envisions possibilities...",
      "primary_placements": ["Sun in Leo (fire)", "Sagittarius Rising (fire)"],
      "score": 7.5
    },
    "secondary_mode": { ... },
    "shadow_mode": { ... },
    "blueprint_metaphor": "[Blueprint: Intuition/Thinking/Feeling - metaphor pending LLM synthesis]"
  },
  "natal_context": {
    "sun": { "sign": "Leo", "house": 1, "element": "fire" },
    "moon": { "sign": "Scorpio", "house": 4, "element": "water" },
    "ascendant": { "sign": "Sagittarius", "element": "fire" }
  }
}
```

The downstream LLM should:
1. **Ignore the placeholder** in `blueprint_metaphor`
2. **Synthesize from the raw data** (constitutional modes + natal context)
3. **Generate original imagery** specific to this person's configuration

## Testing & Validation

### Test Scenarios
1. **Same Mode, Different Charts**
   - Two people with Thinking/Feeling/Sensation modes but different Sun/Moon/Ascendant
   - **Expected:** Completely different metaphors and narratives

2. **Same Sun/Moon, Different Modes**
   - Two people with Sun in Leo/Moon in Scorpio but different constitutional dominance
   - **Expected:** Different emphasis and framing in blueprint narrative

3. **High Magnitude Weather**
   - Same daily indices fed to different blueprint contexts
   - **Expected:** Weather description varies based on constitutional architecture

### Validation Checklist
- [ ] No two identical metaphors for different charts
- [ ] No template phrases in generated content
- [ ] Blueprint metaphors reflect specific placements (not just modes)
- [ ] Weather narratives integrate blueprint context
- [ ] Stitched reflections synthesize all three layers (not just concatenate)

## Migration Path

### Phase 1: ✅ Complete (This Refactor)
- Create narrator modules with LLM synthesis
- Update frontstage renderer to use narrators
- Retire template functions in blueprint-extraction.js

### Phase 2: Integration Testing
- Test with sample charts across all four report types
- Verify unique output for same-mode charts
- Ensure protocol compliance in all generated content

### Phase 3: Downstream Alignment
- Update Raven Calder GPT instructions to ignore placeholders
- Train on synthesizing from raw constitutional data
- Validate F→M→V structure in all outputs

## Technical Notes

### Dependencies
- **[lib/llm.ts](../lib/llm.ts)** - Uses Google Gemini 1.5 Flash
- **Temperature:** 0.7 (creative but consistent)
- **Max tokens:** 2048 per generation
- **System instruction:** REPORT_STRUCTURES prompt from [lib/prompts.ts](../lib/prompts.ts)
  - Includes full protocol rulebook (F→M→V, SST, compliance)
  - **NEW:** Relocated Houses Engine procedure (complete mathematical reference)
  - Ensures Raven Calder has access to relocation calculation logic when interpreting relocated charts

### Error Handling
All narrator functions include fallbacks:
- If LLM generation fails → structural description (no templates)
- If data is incomplete → explicit message about missing data
- Never silent failures; always surface the issue

### Performance Considerations
- Blueprint generation: ~2-3 seconds (one metaphor + one narrative)
- Weather generation: ~2-3 seconds (one narrative)
- Stitched reflection: ~2-3 seconds (one synthesis)
- **Total frontstage generation:** ~6-9 seconds (acceptable for report quality)

## Key Takeaways

### The Mandate
**The Poetic Brain must be a poet, not a librarian.**

This refactor transforms the system from:
- **Selection** → **Synthesis**
- **Templates** → **Creativity**
- **Categories** → **Individuals**

### The Promise
Each Woven Map report now delivers:
1. A unique blueprint metaphor that captures THIS person's architecture
2. A unique weather narrative that describes THIS moment's conditions
3. A unique stitched reflection that integrates THIS person's blueprint with THIS moment's weather

### The Protocol
All generated content maintains:
- Field → Map → Voice structure
- Conditional, agency-preserving language
- Falsifiability where appropriate
- No astrology jargon in conversational text
- Original imagery, never templates

## Questions & Future Work

### Open Questions
1. Should we add a "metaphor quality" validator to catch generic LLM output?
2. How do we ensure long-term consistency in voice while maintaining uniqueness?
3. Should we implement caching for identical chart configurations (privacy consideration)?

### Future Enhancements
1. **Metaphor Repository:** Store generated metaphors (with consent) to train on what resonates
2. **SST Integration:** Use user feedback to refine prompt engineering
3. **Voice Tuning:** Fine-tune temperature/top_p based on resonance data
4. **Relational Narrator:** Expand reflection-narrator.ts for full relational support

---

**This refactor is complete and ready for integration testing.**

The system now generates truly unique content for each individual, honoring the core protocol: *a mirror that reflects the specific complexity of each soul, not a portrait painted from a template.*
