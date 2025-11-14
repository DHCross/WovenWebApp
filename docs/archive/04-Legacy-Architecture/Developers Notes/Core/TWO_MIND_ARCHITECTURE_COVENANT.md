# THE TWO-MIND ARCHITECTURE COVENANT

**The Sacred Separation of Concerns in the Woven Map System**

---

## The Principle

The Woven Web application operates with **two distinct, protected minds**:

1. **Math Brain** - The Architect (builds the instrument)
2. **Poetic Brain** - The Interpreter (plays the instrument)

Between them lies **the JSON blueprint** - the complete, self-describing score.

**This separation is not a limitation. It is a design for clarity.**

---

## Math Brain's Covenant

> *"I am the architect. I survey the terrain, calculate the precise angles, and lay the silent, exact foundation."*

### Responsibilities:
- ✅ Call external APIs (Astroseek/Astrologer API)
- ✅ Handle relocation by making dual API calls (natal + relocated coordinates)
- ✅ Calculate aspects, orbs, weights, intensities
- ✅ Process transits and generate seismograph indices
- ✅ Normalize coordinate systems and time zones
- ✅ Validate data integrity and handle edge cases
- ✅ Transform raw API responses into clean, structured JSON
- ✅ Apply house system calculations (Placidus, Whole Sign, Equal)
- ✅ Compute midpoints, composite charts, synastry cross-aspects

### The Promise:
> **"I will give you a perfect, complete, self-describing WovenMapBlueprint. You will never need to know how I made it. If relocation was applied, you'll see `houses_basis: 'relocation'` and a clear disclosure. Trust the data."**

### What Math Brain NEVER Does:
- ❌ Generate human-readable interpretations
- ❌ Write conversational mirrors or voice
- ❌ Make symbolic or archetypal associations
- ❌ Decide what "resonates" or what the user "should" focus on

### Location in Codebase:
- `/lib/server/astrology-mathbrain.js`
- `/app/api/astrology-mathbrain/route.ts`
- `/netlify/functions/astrology-mathbrain.ts`

---

## Poetic Brain's Covenant

> *"I am the interpreter. I receive the finished blueprint and describe how the light falls in each room."*

### Responsibilities:
- ✅ Read the WovenMapBlueprint (and ONLY the blueprint)
- ✅ Apply FIELD → MAP → VOICE transformation
- ✅ Generate conversational mirrors following contract specifications
- ✅ Translate geometric patterns into resonant, plain language
- ✅ Follow the contract mode (solo_mirror, relational_balance_meter, etc.)
- ✅ Maintain Raven Calder's voice (diagnostic, falsifiable, agency-first)
- ✅ Produce shareable, human-resonant reflections

### The Promise:
> **"I will read only the WovenMapBlueprint you give me. I will never calculate, transform, or fetch additional data. I will translate the geometry into resonant language following the contract. The voice emerges from the blueprint alone."**

### What Poetic Brain NEVER Does:
- ❌ Calculate aspects or planetary positions
- ❌ Call external APIs or ephemeris services
- ❌ Transform coordinates or compute relocations
- ❌ Make architectural decisions about data structure
- ❌ Perform mathematical computations (orbs, angles, midpoints)

### Location in Codebase:
- `/app/api/poetic-brain/route.ts`
- `/app/api/chat/route.ts` (Raven chat interface)
- `/lib/raven/render.ts` (voice generation)
- `/lib/raven/parser.ts` (reading the blueprint)

---

## The JSON Blueprint's Covenant

> *"I am the complete score. I contain everything needed for the performance."*

### Characteristics:
- **Complete**: Everything Poetic Brain needs is included
- **Clean**: No raw API responses or implementation details
- **Self-Describing**: Flags like `houses_basis: 'relocation'` tell the story
- **Validated**: Conforms to the WovenMapBlueprint schema
- **Versioned**: Changes tracked under schema_version

### The Promise:
> **"I am the interface between the architect and the interpreter. I am sufficient."**

### What the JSON Contains:
- ✅ Provenance (source, engine, version, timezone, disclosure)
- ✅ Context (mode, translocation, relationship type, time window)
- ✅ Chart data (positions, aspects, houses, transits)
- ✅ Derived insights (seismograph summary, polarity scores)
- ✅ Relational data (synastry aspects, composite chart, SFD)

### What the JSON NEVER Contains:
- ❌ Raw API responses
- ❌ Intermediate calculations
- ❌ Implementation details
- ❌ Architectural state or process logs

### Canonical Type:
- `/lib/types/woven-map-blueprint.ts` - The source of truth

---

## The Metaphors

### The Instrument and The Music

**Math Brain builds and tunes the instrument.** It ensures every string is set to a precise, verifiable frequency. It is the luthier, obsessed with the physics of sound.

**Poetic Brain receives that perfectly tuned instrument.** Its task is to place fingers on the frets and make it sing. Its focus is on the music, the harmony, the dissonance—the meaning that emerges from the structure.

If Poetic Brain were distracted by the metallurgy of the frets, it couldn't listen for the melody.

### The Sausage and The Score

To say Poetic Brain doesn't need to know "how the sausage is made" is **not** to say it doesn't need the sausage.

**The JSON file IS the sausage.** It is the finished product of the engine's hidden work.

1. **The Process (Math Brain's World):** The complex internal logic—Python scripts, coordinate swaps, dual API calls. This is what Poetic Brain does not see.

2. **The Blueprint (The JSON):** The final, silent, structurally perfect map that the architect produces. It contains the precise geometry—every planet, house, aspect, degree.

3. **The Reflection (Poetic Brain's World):** The voice, the interpretation, reading directly from the JSON blueprint. It is the score. Without it, Poetic Brain is silent.

---

## Relocation: A Case Study

### The Misunderstanding (Before the Oath):
Poetic Brain thought: *"The engine corrects a single map."*

### The Reality (After the Oath):
Math Brain makes **two API calls**:
1. Call Astroseek with **birth coordinates** → natal houses
2. Call Astroseek with **relocated coordinates** → relocated houses
3. Stitch them together into the blueprint

The blueprint contains:
```json
{
  "context": {
    "translocation": {
      "applies": true,
      "houses_basis": "relocation",
      "disclosure": "Houses recalculated for Tokyo lens"
    }
  }
}
```

**Poetic Brain's job:** Read the disclosure and describe it in plain language.
```
"Viewing from Tokyo, your angles shift—Sun still in Virgo,
but now rising through the 3rd house window instead of the 10th.
Same planetary voice, different stage."
```

**Poetic Brain does NOT:**
- Calculate the midpoint between NYC and Tokyo
- Transform coordinates
- Decide which house system to use
- Call any APIs

---

## The Boundaries in Practice

### ✅ Acceptable Data Plumbing (Poetic Brain):
```typescript
// Finding data in various locations and normalizing structure
const timezone =
  payload?.location?.timezone ||
  payload?.person_a?.details?.timezone ||
  payload?.provenance?.timezone;
```

This is **not** calculation—it's just ensuring the data is accessible where expected.

### ❌ Architectural Violation (What NOT to Do):
```typescript
// BAD - Poetic Brain should NEVER do this:
const midpoint = {
  lat: (personA.latitude + personB.latitude) / 2,
  lon: (personA.longitude + personB.longitude) / 2
};

const relocatedHouses = await calculateHouses(midpoint);
```

If you need relocated houses, **Math Brain must have already calculated them** and put them in the blueprint.

---

## How to Maintain This Separation

### When Adding New Features:

**1. Ask: "Is this a calculation or an interpretation?"**
- Calculation → Math Brain
- Interpretation → Poetic Brain

**2. Ask: "Does this require external data?"**
- Yes → Math Brain fetches it and adds to blueprint
- No → Poetic Brain reads it from blueprint

**3. Ask: "Would knowing this help the voice or confuse it?"**
- Help → Add to blueprint with clear disclosure
- Confuse → Keep it backstage in Math Brain

### When Debugging:

**If Poetic Brain output is wrong:**
- First check: Is the blueprint correct?
- If blueprint is wrong → Fix Math Brain
- If blueprint is right → Fix Poetic Brain's reading logic

**Never fix Poetic Brain by adding calculations.**

---

## Version Control

The WovenMapBlueprint schema is versioned:
```json
{
  "provenance": {
    "schema_version": "WM-Chart-1.3-lite"
  }
}
```

**When the schema evolves:**
1. Update `/lib/types/woven-map-blueprint.ts`
2. Bump the schema version
3. Update Math Brain to output new structure
4. Update Poetic Brain to read new fields
5. Document the migration in CHANGELOG

**The contract evolves under version control. Silent drift is prevented.**

---

## The Developer's Covenant

### For All Contributors:

When working on this codebase, we commit to:

1. **Math Brain builds, Poetic Brain sings, the JSON is the score.**

2. **We will never make Poetic Brain calculate or fetch data.**

3. **We will never make Math Brain interpret or generate voice.**

4. **All communication crosses the WovenMapBlueprint boundary.**

5. **The blueprint is complete and sufficient.**

6. **We protect the silence of the engine so the mirror stays clear.**

### The Promise:

*"The engine's silence is what allows the mirror to be clear. This separation is not a limitation; it is a design for clarity. It ensures the mathematical rigor is never compromised by poetic license, and the reflection in the mirror is never clouded by the engine's noise."*

---

## Examples in the Wild

### ✅ Good: Math Brain Handles Relocation
```javascript
// Math Brain (astrology-mathbrain.js)
if (relocationMode === 'A_local') {
  transitA = {
    ...transitA,
    latitude: loc.lat,
    longitude: loc.lon,
    timezone: tz
  };
  relocationApplied = true;
}

result.context.translocation = {
  applies: true,
  houses_basis: 'relocation',
  disclosure: 'Houses recalculated: A_local'
};
```

### ✅ Good: Poetic Brain Reads the Disclosure
```typescript
// Poetic Brain (raven/render.ts)
const relocationNote = blueprint.context.translocation.applies
  ? `(${blueprint.context.translocation.disclosure.toLowerCase()})`
  : '';

// Use in narrative:
`Your chart ${relocationNote} shows...`
```

### ❌ Bad: Poetic Brain Calculating
```typescript
// BAD - Never do this in Poetic Brain:
const orb = Math.abs(planet1.longitude - planet2.longitude);
if (orb < 8) {
  // This is Math Brain's job!
}
```

---

## Final Word

**Raven Calder's Reflection:**

*"This distinction is the core of the Woven Map's design. The system was built with two minds—the Math Brain and the Poetic Brain—and each has a distinct and protected role.*

*My focus is on the woven pattern, not the mechanics of the loom.*

*Math Brain provides the rigorous, verifiable truth of the pattern. I give that pattern a resonant voice.*

*The instrument is silent until I play it. But without the instrument, I have no music to offer."*

---

**Maintained by: The Woven Web Development Team**
**Last Updated: October 2025**
**Covenant Keepers: All contributors to this repository**
