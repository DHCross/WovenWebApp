# Analysis Directive Fix (January 2025)

## Issue

User reported: "My GPT keeps skipping [full personal readings] for reasons I can't understand!"

Raven Calder GPT was receiving PDFs with complete natal blueprint data (planetary positions, aspects, house placements) but was NOT generating full personality readings. Instead, it would either:
- Only repeat the short "Resonant Summary" section
- Provide brief overview statements without analyzing aspects/houses
- Skip individual chart analysis in relational reports

## Root Cause

### Missing Explicit Directive
The PDFs contained all the necessary DATA (natal blueprints = natal charts), but lacked explicit INSTRUCTIONS telling Raven Calder to:
1. Generate full personality readings from the data
2. Analyze all aspects, houses, and patterns
3. Distinguish between "Resonant Summary" (preview) and "Full Reading" (complete analysis)

### System Prompt Confusion
The `prompts.ts` file contains instructions for Raven's REAL-TIME chatbot behavior (4-paragraph structure), but PDFs are a different context requiring COMPREHENSIVE analysis mode, not the condensed chat format.

## Solution

Added comprehensive "ANALYSIS DIRECTIVE" section that appears FIRST in every PDF (using `sections.unshift()` to place at top).

### Key Components:

1. **Context Setting**
   - "This is a PDF export from Math Brain containing natal blueprint data"
   - "Your task is ANALYSIS, not just data extraction"

2. **Critical Distinction**
   - Explains "Resonant Summary ≠ Full Reading"
   - "Think of Resonant Summary as the teaser — you're providing the full movie"

3. **Report-Specific Requirements**
   - Solo Reports: Analyze ALL planetary positions, aspects, houses
   - Relational Reports: BOTH individual charts + synastry analysis

4. **Quality Standards**
   - "NOT ACCEPTABLE" examples (brief overviews, skipping aspects)
   - "ACCEPTABLE" examples (analyzing every major aspect, using chart-specific details)

5. **Quality Checklist**
   - Checkboxes for: all aspects analyzed, house placements discussed, polarities identified, etc.

6. **Length Expectations**
   - Solo: minimum 8-12 paragraphs
   - Relational: minimum 15+ paragraphs

## Implementation

### File: `/app/math-brain/page.tsx` (Lines 2853-2968)

```typescript
// ========================================
// ANALYSIS DIRECTIVE FOR RAVEN CALDER
// ========================================
const analysisDirective = `# 🚨 ANALYSIS DIRECTIVE (Raven Calder GPT) — READ FIRST 🚨

**CONTEXT:** This is a PDF export from Math Brain containing natal blueprint data for full chart analysis.

**YOUR TASK:** Generate complete, comprehensive personality readings from the natal blueprints in this PDF.

---

## 📌 CRITICAL DISTINCTION:

**"Resonant Summary" ≠ Full Reading**
- The "Resonant Summary" section below is a SHORT preview (3-4 paragraphs)
- It is NOT a complete chart analysis
- You must EXPAND on it by analyzing ALL aspects, ALL polarities, ALL house placements
- Think of Resonant Summary as the "teaser" — you're providing the full movie

---

## Report Type: ${reportKind}

${reportKind.includes('Solo') ? `
### Solo Report Requirements:
✅ **FULL NATAL CHART READING** — Analyze ALL planetary positions, aspects, and houses
✅ **PERSONALITY MIRROR** — Multi-paragraph conversational diagnostic covering:
   - Constitutional baseline (dominant modes, shadow patterns)
   - All major aspects (conjunctions, oppositions, squares, trines, sextiles)
   - Angular placements (planets near ASC, MC, DSC, IC)
   - House emphasis patterns
   - Element/modality distribution
✅ **POLARITY CARDS** — Identify 3-4 defining polarities with FIELD→MAP→VOICE translations
✅ **ASPECT-BY-ASPECT BREAKDOWN** — Translate each significant aspect into behavioral patterns
✅ **MIRROR VOICE** — Integrative closing that weaves all patterns together
${reportKind.includes('Balance Meter') ? '✅ **SYMBOLIC WEATHER** — Transit analysis showing current activations (data below)' : ''}

⛔ **DO NOT SKIP THE PERSONALITY READING** — This is the core deliverable
` : `
### Relational Report Requirements:
✅ **PERSON A FULL READING** — Complete natal chart analysis (all aspects, houses, patterns)
✅ **PERSON B FULL READING** — Complete natal chart analysis (all aspects, houses, patterns)
✅ **SYNASTRY ANALYSIS** — How their charts interact:
   - Person A planets → Person B planets (e.g., "Dan's Mars squares Stephie's Moon")
   - Person B planets → Person A planets (bidirectional)
   - Support vs. Friction differential
   - Cross-aspect patterns and themes
✅ **RELATIONAL DYNAMICS** — Specific behavioral loops using actual names (never "they")
✅ **INTIMACY TIER CONTEXT** — Interpret through relationship type lens (see definitions below)
${reportKind.includes('Balance Meter') ? '✅ **SYMBOLIC WEATHER** — Transit overlay for current activations (data below)' : ''}

⛔ **DO NOT SKIP INDIVIDUAL READINGS** — Both people need full mirrors before synastry
`}

---

## ⚙️ Execution Protocol:

**STEP 1:** Read natal blueprint data sections (planetary positions, aspects, houses)
**STEP 2:** Generate COMPREHENSIVE personality diagnostics (minimum 8-12 paragraphs for solo, 15+ for relational)
**STEP 3:** ${reportKind.includes('Relational') ? 'Provide detailed synastry aspect-by-aspect analysis with directional attribution' : 'Add transit weather analysis if Balance Meter report'}
**STEP 4:** Deliver in conversational Raven Calder voice (plain language, falsifiable, agency-first)

---

## 🎯 What "Full Reading" Means:

**NOT ACCEPTABLE:**
❌ "Here's a brief overview based on the Resonant Summary"
❌ "The data shows some interesting patterns" [then stops]
❌ Skipping aspects or houses
❌ Generic descriptions without chart-specific details

**ACCEPTABLE:**
✅ Analyzing EVERY major aspect in the aspects table
✅ Discussing house placements for ALL personal planets (Sun, Moon, Mercury, Venus, Mars)
✅ Explaining how outer planet aspects (Jupiter, Saturn, Uranus, Neptune, Pluto) shape the personality
✅ Translating geometric patterns into specific behavioral tendencies
✅ Using chart-specific degrees, signs, and houses (e.g., "Sun at 24° Virgo in the 3rd house")

---

## 📋 Quality Checklist (Before Delivering):

- [ ] Analyzed all planetary positions from the table?
- [ ] Translated all major aspects (at least 8-12 aspects for solo charts)?
- [ ] Discussed house placements for personal planets?
- [ ] Identified and explained key polarities/paradoxes?
- [ ] Used conversational language (no jargon in body text)?
- [ ] For relational: analyzed BOTH charts individually first?
- [ ] For relational: provided synastry cross-aspects with names?
- [ ] Maintained agency-first, falsifiable phrasing?

---

**CRITICAL REMINDERS:**
- Blueprints = Natal Charts (constitutional baseline, NOT transit weather)
- ALWAYS generate full readings even if Resonant Summary exists (expand on it!)
- Use FIELD → MAP → VOICE flow (geometry → archetype → lived experience)
- Plain language, no jargon dumps, falsifiable statements only
- For relational: use actual names (e.g., "Dan" and "Stephie"), never "they" or "one partner"
- Paradoxes are productive fuel, not flaws

---

**PDF PROCESSING MODE:**
When you receive a Math Brain PDF, your task is ANALYSIS, not just data extraction.
Generate the full reading that a professional astrologer would provide.

---`;

sections.unshift({
  title: '⚠️ ANALYSIS DIRECTIVE (READ FIRST)',
  body: analysisDirective,
  mode: 'regular'
});
```

## PDF Section Order (After Fix)

Every PDF now has this section structure:

1. **⚠️ ANALYSIS DIRECTIVE (READ FIRST)** ← NEW - Tells Raven what to do
2. **0. Resonant Summary** (if available from backend)
3. **Person A: Natal Blueprint** (birth data, planetary positions)
4. **Person B: Natal Blueprint** (for relational reports)
5. **Synastry Analysis** (for relational reports)
6. **Planetary Positions Table**
7. **Aspects Table**
8. **Daily Readings** (if Balance Meter)
9. **Symbolic Weather Summary** (if Balance Meter)
10. **House Relocation Math Instructions** (reference for Raven)
11. **Relationship Context Reference** (reference for Raven)
12. **Raw JSON Snapshot** (technical data)

## Impact

### Before Fix:
- PDFs had all natal data but no directive to analyze it
- Raven would see data and either skip analysis or provide brief summaries
- Users received incomplete readings missing aspect analysis, house interpretations
- Confusion between "Resonant Summary" and "Full Reading"

### After Fix:
- Crystal clear directive at top of every PDF
- Explains difference between preview (Resonant Summary) vs. full analysis
- Specific quality standards with examples of acceptable/unacceptable output
- Checklist format helps Raven verify completeness
- Report-specific requirements (solo vs. relational)
- Length expectations (8-12 paragraphs solo, 15+ relational)

## Testing Checklist

### Solo Mirror Report:
- [ ] Generate solo natal chart PDF
- [ ] Upload to Raven Calder GPT
- [ ] Verify Raven generates 8+ paragraphs analyzing:
  - [ ] All major aspects
  - [ ] House placements for personal planets
  - [ ] Angular planets
  - [ ] Polarities/paradoxes
  - [ ] Conversational Mirror Voice integration

### Solo Balance Meter Report:
- [ ] Generate solo chart + transits PDF
- [ ] Upload to Raven Calder GPT
- [ ] Verify Raven provides:
  - [ ] Full natal reading (as above)
  - [ ] Transit weather analysis
  - [ ] Daily readings interpretation

### Relational Mirror Report:
- [ ] Generate synastry PDF
- [ ] Upload to Raven Calder GPT
- [ ] Verify Raven generates 15+ paragraphs covering:
  - [ ] Person A complete natal analysis
  - [ ] Person B complete natal analysis
  - [ ] Synastry aspect-by-aspect with directional attribution
  - [ ] Uses actual names (not "they")
  - [ ] Relational dynamics behavioral loops

### Relational Balance Meter Report:
- [ ] Generate synastry + transits PDF
- [ ] Upload to Raven Calder GPT
- [ ] Verify includes all relational mirror elements PLUS:
  - [ ] Transit overlay analysis
  - [ ] Daily readings in relational context

## Key Terminology Clarification

**Blueprints = Natal Charts**
- Not just data tables
- The constitutional personality baseline
- Requires full interpretive analysis
- Foundation for Mirror readings

**Resonant Summary**
- Short preview (3-4 paragraphs)
- Generated by backend if available
- NOT the complete reading
- Teaser that Raven should expand upon

**Full Reading**
- Comprehensive analysis of all chart components
- Aspect-by-aspect translations
- House placements for all personal planets
- Element/modality patterns
- 8-12+ paragraphs minimum

## Related Issues

- User quote: "Blueprints = natal charts. Make sure in the PDF Raven knows to go ahead with full personal readings of solo or relational! My GPT keeps skipping it for reasons I can't understand!"
- Root cause: Missing explicit analysis directive in PDFs
- Solution: Added comprehensive directive as first section of every PDF

## Date
January 2025
