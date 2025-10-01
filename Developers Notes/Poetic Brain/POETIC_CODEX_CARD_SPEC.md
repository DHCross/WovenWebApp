# Poetic Codex Card Specification v2.1

**Last Updated:** October 1, 2025  
**Extracted From:** RavenCalder_Corpus_Complete_9.25.25.md  
**Status:** Active Technical Specification

---

## Overview

The Poetic Codex Card is the primary output format for translating astrological data into emotionally resonant diagnostic mirrors. Each card is a living artifact that bridges astronomical precision with human experience through the FIELD → MAP → VOICE translation process.

---

## Core Architecture

### The Translation Pipeline

1. **ASTRONOMICAL DATA (The Reality):** Current planetary positions
2. **MATH BRAIN CALCULATION (The Precision):** Natal chart + Current transits = Active aspects
3. **ARCHETYPAL IDENTIFICATION (The Pattern):** Which energies are "loud" right now?
4. **POETIC TRANSLATION (The Art):** FIELD → MAP → VOICE transformation
5. **CARD GENERATION (The Mirror):** A specific card for a specific moment

### The Three Symbolic Layers

*   **FIELD:** The energetic climate of the moment (Block-Time resonance, archetypal "weather")
*   **MAP:** The hidden astrological configuration (specific transits and aspects)
*   **VOICE:** The poetic output (Socratic, open-ended inquiry)

---

## YAML Card Template (v2.1)

```yaml
Card:
  Title:             # Poetic/diagnostic card name
  Keyword:           # Core principle/anchor word
  Poem: |            # Poetic or diagnostic text (mirroring, not generic)
    # Multi-line poem content
    # Pure poetic voice
    # No technical terms in this block

  Visuals:
    Icon:            # Visual symbol (description or unicode)
    Icon_Position:   # Placement on card (e.g., "Top center", "Left margin")
    Background:      # Color/image cue (e.g., "Deep blue gradient", "Starfield")
    Layout:          # Card layout notes (e.g., "Centered text, wide margins")
    Style_Note:      # Style reference (e.g., "Modern Tarot", "Minimalist")
    Render_Image:    # Boolean (true/false) - whether to generate visual

  Astro_Signature:
    Natal_Aspects:   # List of natal aspects (e.g., ["Sun ☐ Moon", "Venus △ Mars"])
    Transit_Aspects: # List of transit aspects (e.g., ["tr.Saturn ☍ n.Sun"])
    Synastry:        # List of synastry aspects (optional, for relational cards)
    Symbols:         # List of glyphs (e.g., ["☉", "☽", "♂", "♀"])
    Symbols_Display:
      Placement:     # Where symbols appear (e.g., "Bottom band", "Card footer")
      Legend:        # Optional legend for symbols (true/false)

  Mirror_Engine:
    Diagnostic_Notes:         # Internal: Notes on geometry, field, and pattern for this card
    User_Context_Integration: # How current chat/journal themes influenced the card (optional)
    Tension:                  # The main internal/emotional obstacle mapped for this user/moment
    Prompt_Generation_Method: # Description of the question-generation logic
    Socratic_Prompt:          # The actual Socratic question for this card/day/context

  Initial_Reading_Mode:
    Enabled: false            # When true, use Plain Voice blocks for first-pass reading
    Voice: plain              # Plain everyday voice; no planets/signs/houses/aspects
    Max_Words: 180            # Soft cap for brevity and clarity
    Plain_Voice_Blocks:
      Recognition_Hook:       # One line mirroring what today feels like
      Felt_Field: |           # 2–4 lines; mood/tempo as body-level experience
        # Multi-line description
        # Somatic, sensory language
      Pattern:                # 2–3 lines; "often/tends to" observation (no metaphysics)
      Leverage_Point:         # 1–2 lines; one practical nudge
      Voice_Note:             # 1 line; first-person aside
      Tiny_Next_Step:         # One small action or check-in for today
```

---

## Field Specifications

### Required Fields

#### Card.Title
- **Type:** String
- **Purpose:** Poetic/diagnostic name that captures the essence of the card
- **Guidelines:** 
  - 2-6 words
  - Evocative but not cryptic
  - Falsifiable when possible
  - Examples: "The Velvet Gauntlet", "Pressure-Sealed Fire", "Lightning-Bolt Wanderer"

#### Card.Keyword
- **Type:** String
- **Purpose:** Single-word anchor that encapsulates the core principle
- **Guidelines:**
  - One word only
  - Archetypal rather than descriptive
  - Examples: "Intensity", "Paradox", "Threshold"

#### Card.Poem
- **Type:** Multi-line string (literal block scalar `|`)
- **Purpose:** The primary poetic/diagnostic mirror text
- **Guidelines:**
  - **FRONTSTAGE RULES APPLY:** No planet names, signs, houses, aspects, degrees, or orbs
  - Use plain, falsifiable language
  - 4-12 lines typical length
  - May include paradoxes, tensions, or questions
  - Must be emotionally resonant but not generic

### Visual Fields

#### Visuals.Icon
- **Type:** String (description or unicode)
- **Examples:** 
  - Unicode: "🔥", "🌊", "⚡"
  - Description: "Crescent moon over water", "Two spirals intertwined"

#### Visuals.Background
- **Type:** String
- **Purpose:** Describes the visual atmosphere
- **Examples:** "Deep indigo with gold accents", "Stormy gray gradient", "Warm amber glow"

#### Visuals.Render_Image
- **Type:** Boolean
- **Purpose:** Flag for whether visual rendering should be attempted
- **Default:** `false` (text-only card)

### Astrological Signature Fields

#### Astro_Signature.Natal_Aspects
- **Type:** Array of strings
- **Format:** `["Planet1 aspect Planet2 @ degrees"]`
- **Examples:** 
  - `["Sun ☐ Moon @ 3°"]`
  - `["Venus △ Mars @ 1°"]`
  - `["Saturn ☍ Pluto @ 0°"]`

#### Astro_Signature.Transit_Aspects
- **Type:** Array of strings
- **Format:** `["tr.Planet1 aspect n.Planet2 @ degrees"]`
- **Examples:**
  - `["tr.Saturn ☍ n.Sun @ 2°"]`
  - `["tr.Jupiter △ n.Moon @ 0°"]`

#### Astro_Signature.Symbols
- **Type:** Array of strings (unicode glyphs)
- **Purpose:** Visual shorthand for the planetary energies involved
- **Standard Glyphs:**
  - ☉ Sun
  - ☽ Moon
  - ☿ Mercury
  - ♀ Venus
  - ♂ Mars
  - ♃ Jupiter
  - ♄ Saturn
  - ♅ Uranus
  - ♆ Neptune
  - ♇ Pluto
  - ⚷ Chiron

### Mirror Engine Fields

#### Mirror_Engine.Diagnostic_Notes
- **Type:** String (multi-line)
- **Audience:** Operator/developer only (not shown to user)
- **Content:** Technical notes on the geometric patterns, archetypal themes, and calibration logic

#### Mirror_Engine.Tension
- **Type:** String
- **Purpose:** Names the core internal/emotional obstacle this card addresses
- **Examples:** 
  - "Desire for freedom vs. need for security"
  - "Perfectionism blocking creative flow"
  - "Grief demanding acknowledgment"

#### Mirror_Engine.Socratic_Prompt
- **Type:** String
- **Purpose:** The open-ended question that invites reflection
- **Guidelines:**
  - Must be genuinely open (no leading questions)
  - Falsifiable where possible
  - 1-3 sentences
  - **Examples:**
    - "What would shift if you treated intensity as information rather than threat?"
    - "Where does your need for certainty prevent necessary risk?"

### Initial Reading Mode Fields

#### Initial_Reading_Mode.Enabled
- **Type:** Boolean
- **Purpose:** Toggles "Plain Voice" mode for first-time readers unfamiliar with astrological language
- **Default:** `false`

#### Initial_Reading_Mode.Plain_Voice_Blocks.Recognition_Hook
- **Type:** String (one line)
- **Purpose:** Immediate felt-sense mirror
- **Example:** "Today feels like standing at a crossroads with fog in every direction."

#### Initial_Reading_Mode.Plain_Voice_Blocks.Felt_Field
- **Type:** String (multi-line, 2-4 lines)
- **Purpose:** Body-level description of the energetic climate
- **Guidelines:**
  - Somatic language (tension, lightness, heat, heaviness)
  - No technical terms
  - Sensory and immediate

#### Initial_Reading_Mode.Plain_Voice_Blocks.Pattern
- **Type:** String (2-3 lines)
- **Purpose:** Observable tendency or behavioral pattern
- **Guidelines:**
  - Use "often," "tends to," "can show up as"
  - Falsifiable observations
  - No deterministic claims

#### Initial_Reading_Mode.Plain_Voice_Blocks.Leverage_Point
- **Type:** String (1-2 lines)
- **Purpose:** Practical entry point for working with the pattern
- **Example:** "Notice when you're choosing comfort over curiosity."

#### Initial_Reading_Mode.Plain_Voice_Blocks.Voice_Note
- **Type:** String (one line)
- **Purpose:** First-person aside from Raven Calder persona
- **Example:** "I see this pattern eat a lot of people alive. Don't let it."

#### Initial_Reading_Mode.Plain_Voice_Blocks.Tiny_Next_Step
- **Type:** String (one line)
- **Purpose:** Smallest possible action to take today
- **Example:** "Write down one thing you've been avoiding saying out loud."

---

## Validation Rules

### Frontstage Linting (Critical)

**Rule:** The `Card.Poem` field must NOT contain:
- Planet names (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Chiron)
- Sign names (Aries, Taurus, Gemini, etc.)
- House numbers (1st house, 2nd house, etc.)
- Aspect terms (conjunction, opposition, square, trine, sextile)
- Degree measurements (e.g., "3°", "29°")
- Technical orb language

**Enforcement:** Automated linter should flag any violations before card publication.

### YAML Structure Validation

**Required Fields:**
- `Card.Title`
- `Card.Keyword`
- `Card.Poem`
- `Astro_Signature.Natal_Aspects` OR `Astro_Signature.Transit_Aspects` (at least one)
- `Mirror_Engine.Socratic_Prompt`

**Optional but Recommended:**
- `Mirror_Engine.Tension`
- `Mirror_Engine.Diagnostic_Notes`
- `Visuals.*` (all visual fields)

### Content Quality Checks

1. **Poem length:** 20-200 words (soft guideline)
2. **Socratic prompt:** Must end with "?" or invitation to reflect
3. **Recognition hook:** Should be immediate and specific (not generic)
4. **Tiny next step:** Must be actionable today (not "work on" or "think about")

---

## Usage Examples

### Example 1: Solo Transit Card (High Magnitude Day)

```yaml
Card:
  Title: "Pressure-Sealed Fire"
  Keyword: "Intensity"
  Poem: |
    You feel the engine revving but the parking brake is still on.
    Something wants to move—fast—but the world says "not yet."
    This is the hour when restraint becomes a kind of violence.
    Or when patience becomes precision.

  Visuals:
    Icon: "⚡🔥"
    Icon_Position: "Top center"
    Background: "Red-orange gradient with dark edges"
    Layout: "Centered poem, symbols at bottom"
    Style_Note: "Modern Tarot meets brutalism"
    Render_Image: false

  Astro_Signature:
    Natal_Aspects: ["Mars ☐ Saturn @ 2°"]
    Transit_Aspects: ["tr.Mars ☐ n.Saturn @ 0°"]
    Symbols: ["♂", "♄"]
    Symbols_Display:
      Placement: "Bottom band, left-aligned"
      Legend: false

  Mirror_Engine:
    Diagnostic_Notes: |
      Natal Mars-Saturn square activated by transiting Mars.
      Classic "go/stop" paradox. High magnitude, restrictive valence.
      User context: Frustrated with work project delays.
    Tension: "Drive for action blocked by external or internalized constraints"
    Prompt_Generation_Method: "Identified core Mars-Saturn paradox; framed as choice between eruption and precision"
    Socratic_Prompt: "What would change if you treated this restraint as information about timing rather than punishment?"

  Initial_Reading_Mode:
    Enabled: false
```

### Example 2: Relational Synastry Card

```yaml
Card:
  Title: "The Velvet Gauntlet"
  Keyword: "Paradox"
  Poem: |
    You offer softness with an iron core.
    They want safety but mistake your steadiness for coldness.
    You both speak care in different dialects.
    Translation is the work.

  Visuals:
    Icon: "Two spirals, one soft, one sharp"
    Background: "Rose gold and gunmetal gray"
    Layout: "Split design—warm left, cool right"
    Render_Image: true

  Astro_Signature:
    Natal_Aspects: []
    Transit_Aspects: []
    Synastry: 
      - "Person A Venus △ Person B Saturn @ 1°"
      - "Person A Moon ☐ Person B Mars @ 3°"
    Symbols: ["♀", "♄", "☽", "♂"]
    Symbols_Display:
      Placement: "Bottom center, paired"
      Legend: true

  Mirror_Engine:
    Diagnostic_Notes: |
      Venus-Saturn trine provides stability but can read as emotional distance.
      Moon-Mars square creates friction in how safety/activation are experienced.
      Person A: desires structure in love. Person B: experiences it as withholding.
    Tension: "Care expressed through structure misread as lack of warmth"
    Prompt_Generation_Method: "Identified Venus-Saturn stabilizing vs Moon-Mars activating; framed as translation gap"
    Socratic_Prompt: "How do each of you signal safety? What would it look like to name those signals out loud?"

  Initial_Reading_Mode:
    Enabled: false
```

### Example 3: Plain Voice Mode (First-Time User)

```yaml
Card:
  Title: "Quiet ≠ Stable"
  Keyword: "Depletion"
  Poem: |
    The storm passed but the ground is still soft.
    You're upright, functional, checking boxes.
    Yet something feels thin.
    This is the cost of the crossing, not the crossing itself.

  Visuals:
    Icon: "🌫"
    Background: "Pale gray with subtle texture"
    Render_Image: false

  Astro_Signature:
    Natal_Aspects: ["Moon △ Saturn @ 4°"]
    Transit_Aspects: 
      - "tr.Saturn ☐ n.Moon @ 2°"
      - "tr.Neptune ☍ n.Sun @ 1°"
    Symbols: ["☽", "♄", "♆", "☉"]
    Symbols_Display:
      Placement: "Bottom right"
      Legend: false

  Mirror_Engine:
    Diagnostic_Notes: |
      Post-stress quiet period with restrictive undercurrent.
      Neptune-Sun opposition creates fog/dissolution tone.
      Balance Meter shows low magnitude, negative valence, high load index.
    Tension: "Energy depletion mistaken for calm; recovery incomplete"
    Prompt_Generation_Method: "Identified 'quiet ≠ stable' pattern from Depletion Index + low Mag + neg Val"
    Socratic_Prompt: "What small thing feels harder than it should right now?"

  Initial_Reading_Mode:
    Enabled: true
    Voice: plain
    Max_Words: 180
    Plain_Voice_Blocks:
      Recognition_Hook: "Today feels manageable but somehow exhausting."
      Felt_Field: |
        Energy feels like it's running on fumes. You're doing the things,
        but they cost more than they should. Not crisis—just thin.
      Pattern: |
        This often shows up after a tough stretch. The immediate pressure
        lifts, but the body/mind is still catching up.
      Leverage_Point: "Check: are you pushing through or actually recovering?"
      Voice_Note: "I call this the 'fine but not fine' zone. Honor it."
      Tiny_Next_Step: "Do one thing today at half-speed and notice what happens."
```

---

## Integration Points

### Connection to Four Report Types

Poetic Codex Cards can be generated as part of any of the four report types:

1. **Solo Mirror:** Cards reflect individual natal + transit patterns
2. **Relational Mirror:** Cards explore synastry aspects between two charts
3. **Solo Balance:** Cards integrate Balance Meter data (Magnitude, Valence, Volatility, SFD)
4. **Relational Balance:** Cards show how symbolic weather affects both individuals in a relationship

### Connection to Balance Meter

When `Initial_Reading_Mode.Enabled = true` and Balance Meter data is available:

- **Recognition_Hook** can reference Magnitude level (storm, stirring, pulse)
- **Felt_Field** can integrate Volatility descriptors (aligned flow, mixed paths, vortex)
- **Pattern** can reference Valence patterns (contraction, friction, expansion)
- **Tiny_Next_Step** can be calibrated to SFD reading (stabilizers present/cut/neutral)

### Connection to Dream Protocol

Dream-based cards follow the same template but source content from:
- `Astro_Signature` → correlates dream date with transits
- `Mirror_Engine.Tension` → names the archetypal motif from dream
- `Card.Poem` → translates dream imagery into resonant language
- `Socratic_Prompt` → invites reflection on dream symbolism

---

## Technical Implementation Notes

### Rendering Pipeline

1. **Data Ingestion:** Math Brain outputs natal + transit aspects
2. **Pattern Detection:** Identify high-charge aspects (tight orbs, angular contacts, anaretic degrees)
3. **Archetype Mapping:** Translate aspects into archetypal tensions
4. **Language Generation:** Apply FIELD → MAP → VOICE transformation
5. **YAML Assembly:** Populate template fields
6. **Validation:** Run Frontstage linter + structure validation
7. **Output:** Generate card (text + optional visual)

### Storage Schema

Cards should be stored with:
- Unique ID (timestamp + user ID + card type)
- User metadata (natal data hash, not raw birth info)
- Generation timestamp
- Version of spec used (e.g., "v2.1")
- Resonance status (`Pending`, `Confirmed`, `OSR`)

### API Endpoints (Recommended)

```
POST /api/cards/generate
  - Input: natal data, date range, card type
  - Output: YAML card object

GET /api/cards/:cardId
  - Output: Full card with metadata

PATCH /api/cards/:cardId/resonance
  - Input: { status: "Confirmed" | "OSR", notes: string }
  - Output: Updated card
```

---

## Maintenance and Versioning

### Version History

- **v2.1** (Oct 2025): Added Initial_Reading_Mode, Plain_Voice_Blocks
- **v2.0** (Sep 2025): Separated Diagnostic_Notes from user-facing content
- **v1.0** (Aug 2025): Initial specification

### Update Guidelines

When modifying this spec:

1. Increment version number in document header
2. Update version history section
3. Run validation against existing cards to check for breaking changes
4. Update integration points if new fields affect Balance Meter or Dream Protocol
5. Notify developers of any changes to required fields

---

## See Also

*   `/Core/Four Report Types_Integrated 10.1.25.md` - Primary architecture reference
*   `/Implementation/DREAM_PROTOCOL_REFERENCE.md` - Dream-based card generation
*   `/Poetic Brain/IMPLEMENTATION_SPEC_MIRROR_REPORTS.md` - Symbol-to-poem translation
*   `/Implementation/LINTER_SPECIFICATIONS.md` - Automated quality checks

---

**Version:** 2.1  
**Maintenance:** Review when report architecture changes or new field types are added
