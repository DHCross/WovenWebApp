# Poetic Brain

A modular, stateless narrative engine for WovenWebApp reports.

## NEW: Mirror Directive JSON Support (Oct 18, 2025)

Poetic Brain now supports the new Mirror Directive JSON format per Raven Calder specification.

### Quick Start

```ts
import { processMirrorDirective } from 'poetic-brain';

// Upload Mirror Directive JSON
const result = processMirrorDirective(mirrorDirectivePayload);

// Returns populated narrative_sections
console.log(result.narrative_sections);
// {
//   solo_mirror_a: "# Solo Mirror: Dan\n...",
//   relational_engine: "# Relational Engine: Dan & Stephie\n...",
//   weather_overlay: "# Weather Overlay\n..."
// }
```

> **⚠️ CRITICAL PRIVACY NOTE:** "Dan" and "Stephie" are example names for documentation only. In production, the system must ONLY use names from authenticated user data or uploaded JSON. Never hardcode these names or use them as defaults. These are real people whose privacy must be protected.

### Mirror Directive JSON Format

```json
{
  "_format": "mirror_directive_json",
  "_version": "1.0",
  "person_a": {
    "name": "Dan",  // ⚠️ EXAMPLE ONLY - Use actual user name in production
    "birth_data": { ... },
    "chart": { ... },
    "aspects": [ ... ]
  },
  "person_b": {
    "name": "Stephie",  // ⚠️ EXAMPLE ONLY - Use actual user name in production
    "birth_data": { ... },
    "chart": { ... },
    "aspects": [ ... ]
  },
  "mirror_contract": {
    "report_kind": "relational_mirror",
    "intimacy_tier": "P5a",
    "relationship_type": "PARTNER",
    "is_relational": true
  },
  "narrative_sections": {
    "solo_mirror_a": "",
    "relational_engine": "",
    "weather_overlay": ""
  }
}
```

### Features

- **Intimacy Tier Calibration** (P1-P5b)
  - P1: Formal (respectful distance)
  - P2: Friendly (warm but bounded)
  - P3: Exploratory (curious, undefined)
  - P4: Casual (relaxed, low stakes)
  - P5a: Intimate (deep, committed)
  - P5b: Intimate-nonsexual (deep, non-romantic)

- **Geometry Extraction**
  - Parses person_a/person_b chart data
  - Extracts planetary positions and aspects
  - Generates geometry summaries

- **Narrative Generation**
  - Solo mirrors for individual charts
  - Relational engine for dyadic analysis
  - Weather overlay for transit activations

## Legacy Usage (Backward Compatible)

```ts
import { generateSection } from 'poetic-brain';
const result = generateSection('MirrorVoice', payload);
```

## API Contract

### New: `processMirrorDirective(payload)`
- **Input:** Mirror Directive JSON with natal charts
- **Output:** Object with populated narrative_sections
- **Returns:**
  ```ts
  {
    success: boolean;
    narrative_sections: {
      solo_mirror_a?: string;
      solo_mirror_b?: string;
      relational_engine?: string;
      weather_overlay?: string;
    };
    intimacy_tier?: string;
    report_kind?: string;
    error?: string;
  }
  ```

### Legacy: `generateSection(sectionType, payload)`
- **Input:** Section type + old format payload
- **Output:** Narrative string

## Integration
- No global state, no astrology math, no side effects
- Ready for Node module or serverless deployment
- Supports both new Mirror Directive and legacy formats

## Testing
- See `test/generateSection.test.ts` for usage and contract
- Mirror Directive examples in documentation
