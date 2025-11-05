/**
 * Poetics Module - Symbol-to-Narrative Translation
 * FIELD → MAP → VOICE methodology for converting chart geometry into resonant narratives
 * 
 * Phase 1, Task 1.2: Exports narrative builder for solo mirror generation
 */

// Re-export all public APIs
export * from './types';
export * from './mandate';
export * from './narrative-builder';
export * from './prompt-builder';
export * from './parser';

/**
 * Symbol-to-Poem Translation Protocol
 * FIELD → MAP → VOICE methodology for converting chart geometry into resonant poetry
 */

export const SYMBOL_TO_POEM_PROTOCOL = `
# Symbol-to-Poem Translation (Strict Protocol)

This protocol translates natal chart geometry into resonant poetry using FIELD → MAP → VOICE methodology.
**Output is always in two clear, non-overlapping sections:**

## Protocol Steps

### 1. Chart Vector Identification
List dominant planets, aspects, and angles (with house and degree emphasis as relevant).

### 2. FIELD Extraction  
Translate each placement/aspect into a specific energetic or emotional field (e.g., tension, ignition, release, longing, transformation).

### 3. MAP Attribution
For each field, attach the exact astrological source (planet, sign, house, aspect, degree/orb if needed).

### 4. VOICE Translation (Poem)
Render each FIELD + MAP as a poetic line or stanza.
**The poem always appears first, as a pure literary artifact.**
No emojis, color codes, audit tags, or explanation in this section.

### 5. Explanation Table (Audit)
After the poem, present a table with each line/stanza paired with:
- The appropriate color/emoji per the planetary driver key
- The field/energetic driver  
- The exact MAP/astrological source

### 6. Color Code Legend
The legend of emojis and their meanings **must always appear with the table/explanation section**.

## Required Format Template

### 1. Poem (ALWAYS FIRST, PURE, NO COLOR CODES)
*(Write the complete poem here—unmarked, uninterrupted, poetic form only.)*

---

### 2. Explanation Table (Line-by-Line, Color Code + Audit)

| Emoji | Poem Line/Stanza | FIELD (Energetic/Emotional Driver) | MAP (Astrological Source) |
|-------|-------------------|-------------------------------------|---------------------------|

### 3. Color/Emoji Legend (Always Included)

| Emoji | Planet(s)       | Symbolic Function                   |
|-------|-----------------|-------------------------------------|
| 🔴    | Sun / Mars      | Vital drive, force, motion          |
| 🟠    | Venus           | Relating, beauty, aesthetic gesture |
| 🟢    | Mercury         | Voice, cognition, translation       |
| 🔵    | Moon / Neptune  | Feeling, memory, longing            |
| 🟣    | Saturn / Chiron | Structure, boundary, compression    |
| ⚪     | Uranus / Pluto  | Disruption, shadow, metamorphosis   |
| ⚫     | Jupiter         | Meaning, expansion, ethical center  |

## Critical Requirements
- **Poem is always pure and first**
- **No emojis or audit in poem section** 
- **All color code and field explanations go only in the table after the poem**
- **Legend is always present with table**
- **Never collapse poem and table into one section**
- **Use ONLY the 7 standard planetary emoji codes - no custom emojis**

## Language Notes
- **Never use "taboo" as a term** - use "unsanctioned depths," "undomesticated core," etc.
- Pronoun use appears in first stanza/line
- Final output labeled as: "Symbol-to-Song Translation · Subject: [Name] · Date: [YYYY-MM-DD]"
`;

export const POETIC_CODEX_TEMPLATE = `
# Poetic Codex Card Template v2.1

## Core Structure
- **Title**: Poetic/diagnostic card name
- **Keyword**: Core principle/anchor word  
- **Poem**: Poetic or diagnostic text (mirroring, not generic)

## Mirror Engine Components
- **Diagnostic Notes**: Internal notes on geometry, field, and pattern
- **User Context Integration**: How current chat/journal themes influenced the card
- **Tension**: Main internal/emotional obstacle mapped
- **Prompt Generation Method**: Description of question-generation logic
- **Socratic Prompt**: The actual Socratic question for this card/context

## Astro Signature
- **Natal Aspects**: List with degrees/houses if desired
- **Transit Aspects**: List
- **Symbols**: Astrological glyphs
- **Symbols Display**: Placement and legend options

## Initial Reading Mode (Optional)
When enabled, use Plain Voice blocks for first-pass reading:
- **Recognition Hook**: One line mirroring what today feels like
- **Felt Field**: 2–4 lines; mood/tempo as body-level experience  
- **Pattern**: 2–3 lines; "often/tends to" observation
- **Leverage Point**: 1–2 lines; one practical nudge
- **Voice Note**: 1 line; first-person aside
- **Tiny Next Step**: One small action or check-in

## Export Specifications
- **File Type**: PNG, SVG, etc.
- **Resolution**: e.g., "1024x1536" 
- **File Naming**: e.g., "codexcard_<title_snakecase>.png"

## Quality Requirements
- **Diagnostic Notes** and **Prompt Generation Method** required for transparency/audit trails
- **Socratic Prompt** must be unique to geometry/context/tension, not stock or generic
- When Initial Reading Mode enabled, prioritize Plain Voice Blocks; keep symbolism in Diagnostic Notes
- Every card is a living artifact and transparent diagnostic
`;
