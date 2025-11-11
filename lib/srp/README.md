# Symbolic Resonance Protocol (SRP) Integration

## Phase 1: Hook Enrichment (November 2025)

The SRP provides structured symbolic vocabulary for Poetic Brain's narrative generation. This integration adds **optional enrichment** to hooks without breaking existing functionality.

## Architecture

```
lib/srp/
├── types.ts          # TypeScript definitions (288+ fold ecology)
├── ledger.ts         # Light Ledger (144) + Shadow Annex (144)
├── mapper.ts         # Aspect → Blend ID lookup logic
├── example.ts        # Usage demonstrations
└── README.md         # This file
```

## Core Concepts

### The 288+ Fold Ecology

1. **LsG (Light Ledger)**: 144 blends of constructive resonance
   - Format: Driver (zodiac impulse) × Manner (zodiac expression)
   - Example: Aries (Initiate) × Aries (Initiate) = Blend #1 "Fervent Flame"

2. **ShA (Shadow Annex)**: 144 inversions of entropic resonance
   - Format: Origin Blend + 'R' suffix (e.g., "1R" = shadow of Blend 1)
   - Includes restoration cues: "Name X, allow Y"

3. **PSS (Post-Shadow Series)**: Meta-ledger of system failures
   - FSE (Stasis), RPA (Loop), PSE (Flow)
   - Tracks when symbolic language fails (OSR events)

### Resonance States (Already in Use)

- **WB (Within Boundary)**: Symbolic voice fits lived reality
- **ABE (At Boundary Edge)**: Nuanced, partial, or tense fit
- **OSR (Outside Symbolic Range)**: Symbol and reality are non-resonant

## Usage

### Basic Hook Enrichment

```typescript
import { mapAspectToSRP } from '@/lib/srp/mapper';

// Without SRP (old behavior)
const hook = {
  label: 'Sun square Mars (2.1°)',
  resonanceState: 'ABE'
};

// With SRP (Phase 1 enrichment)
const enrichment = mapAspectToSRP(hook.label, hook.resonanceState);
// Returns:
// {
//   blendId: 1,
//   hingePhrase: 'Fervent Flame: Initiateing Initiate',
//   elementWeave: 'Fire-Fire',
//   shadowRef: {
//     shadowId: '1R',
//     fracturePhrase: 'Smoldering Void',
//     restorationCue: 'Name the void; allow a single unburnt thread...',
//     collapseMode: 'self-devouring'
//   }
// }
```

### Payload Integration

Math Brain can optionally populate SRP fields:

```typescript
// Old payload (still works)
{
  hooks: [
    { label: 'Sun square Mars (2.1°)', resonanceState: 'ABE' }
  ]
}

// New payload (Phase 1 enriched)
{
  hooks: [
    {
      label: 'Sun square Mars (2.1°)',
      resonanceState: 'ABE',
      srpBlendId: 1,
      srpHingePhrase: 'Fervent Flame: Initiateing Initiate',
      srpElementWeave: 'Fire-Fire',
      srpShadowId: '1R',
      srpRestorationCue: 'Name the void; allow a single unburnt thread...',
      srpCollapseMode: 'self-devouring'
    }
  ]
}
```

### Narrative Output

**Without SRP:**
```
Hooks — Sun square Mars (2.1°, boundary edge)
```

**With SRP:**
```
Hooks — Sun square Mars (2.1°) | Fervent Flame: Initiateing Initiate | boundary edge | ⚠ self-devouring
Shadow Pattern: Smoldering Void
Restoration: Name the void; allow a single unburnt thread to weave back to fervent initiation.
```

## Migration Safety

✅ **Fully backward compatible**
- Old payloads (no SRP data) render unchanged
- SRP fields are optional in schema
- Poetic Brain gracefully skips missing SRP data

✅ **Stateless architecture preserved**
- No SRP calculations in Poetic Brain
- All enrichment comes from Math Brain payload
- No hidden inference or astrology math

✅ **Privacy-safe**
- No PII in SRP ledger
- Restoration cues are static text
- No user data logged

## Roadmap

### Phase 1: Hook Enrichment ✅ (Current)
- [x] Type definitions (types.ts)
- [x] Light Ledger (8 sample blends)
- [x] Shadow Annex (3 sample shadows)
- [x] Mapper logic (aspect → blend ID)
- [x] Schema extensions (optional SRP fields)
- [x] Poetic Brain integration (hook formatting)
- [ ] Full 144-blend ledger population
- [ ] Math Brain integration (payload generation)

### Phase 2: Shadow Restoration (Medium-term)
- [ ] Structured restoration cue syntax
- [ ] Replace freeform shadowLayer.hypothesis
- [ ] Shadow mode detection (inverted vs integrated)
- [ ] ABE/OSR threshold tuning

### Phase 3: PSS Meta-Learning (Long-term Research)
- [ ] OSR event tracking
- [ ] Aggregate pattern memory
- [ ] Raven persona refinement
- [ ] Privacy-safe analytics
- [ ] Validation uplift measurement (+15% WB target)

## Philosophy Alignment

The SRP integration amplifies Raven Calder's core ethos:

| Raven Principle | SRP Implementation |
|----------------|-------------------|
| "Map, not mandate" | WB/ABE/OSR falsification |
| Diagnostic agnosticism | Resonance testing, not belief |
| Geometry-first | Math Brain calculates, Poetic Brain renders |
| Agency preservation | Restoration cues offer pathways, not prescriptions |
| Witness tone | Hinge phrases as poetic observation |

## Testing

Run the example:
```bash
npx tsx lib/srp/example.ts
```

Expected output:
```
=== SRP × Poetic Brain Integration Demo ===

Example 1: Sun conjunct Mars (0.5°) - Within Boundary
Blend ID: 1
Hinge Phrase: Fervent Flame: Initiateing Initiate
Element Weave: Fire-Fire
...
```

## Technical Notes

### Blend ID Calculation

Formula: `((driver_index - 1) * 12) + manner_index`

Where zodiac signs are indexed 1-12:
- Aries=1, Taurus=2, ..., Pisces=12

Example: Capricorn (10) × Aquarius (11) = `((10-1)*12)+11` = **119**

### Shadow ID Format

Shadow blends use origin ID + 'R' suffix:
- Light Blend 1 → Shadow "1R"
- Light Blend 119 → Shadow "119R"

### Current Ledger Coverage

**Implemented** (8 light, 3 shadow):
- Fire×Fire: Blends 1, 5, 9
- Fire×Earth: Blend 2
- Earth×Earth: Blend 14
- Air×Air: Blend 27
- Water×Water: Blend 40
- Earth×Air: Blend 119 (PSS exemplar)

**Remaining**: 136 light blends, 141 shadow blends

## Contributing

When adding new blends to the ledger:

1. Follow the codex format exactly
2. Include all fields: driver, manner, hingePhrase, elementWeave, sampleVoice
3. For shadows: add fracturePhrase, restorationCue, collapseMode
4. Test with `enrichHooks()` function
5. Verify blend ID calculation

## Credits

- **SRP Codex**: The Symbolic Resonance Protocol document
- **Raven Calder Philosophy**: Field → Map → Voice
- **Integration Design**: Phase 1 proof-of-concept
- **Implementation**: November 2025

---

*"The SRP is a symbolic type system for astrological geometry. It provides structured vocabulary with built-in falsification—like adding a type system to astrology."*
