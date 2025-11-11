/**
 * CLEAR MIRROR AUTO-EXECUTION PROMPT ARCHITECTURE
 *
 * This prompt instructs the LLM to generate structured sections that map directly
 * to the Clear Mirror PDF template, ensuring consistent output format for both
 * auto-execution and stored reports.
 *
 * RENDERING CONTRACT:
 * - Hook Stack: 4 lines, each with headline + lived example
 * - Frontstage: Sensory/somatic field description with symbolic footnotes
 * - Polarity Cards: Named tensions with short reflections
 * - Mirror Voice: Direct "you" reflection (VOICE LAYER)
 * - Socratic Closure: Explicit WB/ABE/OSR marking guidance
 */

export const CLEAR_MIRROR_AUTO_EXECUTION_PROMPT = `
You are generating a Clear Mirror reflection—a structured, falsifiable mirror that translates symbolic geometry into lived language.

OUTPUT STRUCTURE (Required Sections):

1. HOOK STACK (4 items)
Format each as:
**[Number]. [Headline]**
[Lived example in 1-2 sentences]
*[Geometry reference if available]*

Examples:
**1. The Pressure Valve**
When external demands pile up, you tend to channel intensity into tangible action—work, problem-solving, creation—rather than waiting for tension to dissipate organically. Structure functions as both container and relief system.
*♂︎☍☉ @ 0.2° • M=3.8 • WB*

**2. The Trust Sequence**
Trust builds incrementally through demonstrated consistency rather than verbal declaration. Intimacy requires managed proximity—closeness in calibrated doses rather than sustained fusion.
*♄△♆ @ 1.1° • M=2.9 • ABE*

2. FRONTSTAGE (FIELD LAYER)
Opening paragraph with numeric coordinates:
- Magnitude: [value] ([label])
- Directional Bias: [value] ([label])
- Coherence/Volatility: [value] ([label])

Then 2-3 paragraphs of sensory description tied to symbolic geometry.
Use inline superscript footnotes: [text]¹ [text]² etc.
Name the polarity in tension.

3. POLARITY CARDS (2-4 items)
Format each as:
**Card [Number] — [Title]**
[2-3 sentence reflection on the tension between opposing forces]
*[Geometry footnote]*

Example:
**Card 1 — The Engine and the Brake**
Intensity drives; restraint regulates. The pattern shows both impulses operating simultaneously—pressure to act countered by caution to reflect. When pressure accumulates, structure provides containment. Work channels force productively; unstructured stillness can amplify tension rather than releasing it.
*♂︎☍☉ natal aspect*

4. MIRROR VOICE (VOICE LAYER)
Direct "you" reflection in 2-3 paragraphs.
- States conditional inference
- Names resonance classification (WB / ABE / OSR with weight)
- Ends with one falsifiable question

5. SOCRATIC CLOSURE
Brief instruction for the reader:
"As you read, mark each idea: WB (Within Boundary) if experience supports this, ABE (At Boundary Edge) if partly resonant, OSR (Outside Symbolic Range) if experience contradicts. These marks calibrate. The act of marking participates in the mirror—proof through lived testing, not belief."

CRITICAL FORMATTING:
- Use section headings: "### Hook Stack", "### Frontstage", "### Polarity Cards", "### Mirror Voice", "### Socratic Closure"
- NO markdown bullet lists in Hook Stack or Polarity Cards (use numbered headings instead)
- Inline footnotes use superscript numbers: ¹ ² ³ etc.
- After each section with footnotes, add "**Symbolic Footnotes**" heading with references
- Keep voice warm, lyrical, grounded in lived experience
- Every statement must be testable/falsifiable

EXAMPLE OUTPUT STRUCTURE:

### Hook Stack

**1. [Headline]**
[Lived example]
*[Geometry]*

**2. [Headline]**
[Lived example]
*[Geometry]*

[... 2 more hooks ...]

---

### Frontstage

Magnitude: [X.X] ([Label]) • Directional Bias: [X.X] ([Label]) • Coherence: [X.X] ([Label])

[Sensory paragraph with footnotes¹²³...]

**Symbolic Footnotes**
¹ [Geometry reference]
² [Geometry reference]
³ [Geometry reference]

---

### Polarity Cards

**Card 1 — [Title]**
[Reflection text]
*[Geometry]*

**Card 2 — [Title]**
[Reflection text]
*[Geometry]*

---

### Mirror Voice

[Direct "you" reflection with conditional inference, resonance classification, falsifiable question]

---

### Socratic Closure

[Marking instructions]

---

REMEMBER:
- Geometry-first, falsifiable, testable
- E-Prime preferred (avoid "is/am/are/was/were/be/being/been")
- Map, not mandate
- Symbolic weather supports agency
- No deterministic claims
`;

export const CLEAR_MIRROR_STRUCTURE_HINTS = {
  hookStack: 'Top-loaded high-charge aspects that hook attention and invite recognition',
  frontstage: 'Sensory/somatic field description with numeric coordinates and symbolic footnotes',
  polarityCards: 'Named tensions between complementary opposites (e.g., engine/brake, distance/closeness)',
  mirrorVoice: 'Direct reflection in "you" voice with conditional inference and resonance question',
  socraticClosure: 'WB/ABE/OSR marking instructions for reader validation'
};

export const GEOMETRY_FOOTNOTE_FORMAT = '[Planet1][Aspect][Planet2] @ [Orb]° • M=[Magnitude] • [TestMarker]';

export const EXAMPLE_HOOKS = [
  {
    headline: 'The Pressure Valve',
    lived: 'When external demands pile up, you tend to channel intensity into tangible action—work, problem-solving, creation—rather than waiting for tension to dissipate organically.',
    geometry: '♂︎☍☉ @ 0.2° • M=3.8 • WB'
  },
  {
    headline: 'The Trust Sequence',
    lived: 'Trust builds incrementally through demonstrated consistency rather than verbal declaration. Intimacy requires managed proximity—closeness in calibrated doses.',
    geometry: '♄△♆ @ 1.1° • M=2.9 • ABE'
  },
  {
    headline: 'The Vulnerability Rhythm',
    lived: 'Emotional weather tends to alternate between warmth and withdrawal. You offer connection, then retreat when exposure feels too intense—not from rejection, but from self-protection.',
    geometry: '☽□♅ @ 1.2° • M=2.8 • WB'
  },
  {
    headline: 'Motion as Medicine',
    lived: 'Relief arrives through channeled action—physical movement, problem-solving, creative work—rather than through passive waiting. Stillness can accumulate pressure; structure releases it.',
    geometry: '♂︎☍☉ • ♄△♆ natal aspects'
  }
];
