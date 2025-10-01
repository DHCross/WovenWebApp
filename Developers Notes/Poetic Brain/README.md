# Poetic Brain Documentation

**Purpose:** Voice, persona, and narrative generation specifications for the Raven Calder system.

---

## Overview

This folder contains all documentation related to the **Poetic Brain**—the narrative generation and symbolic translation layer of the Raven Calder system. These documents define how mathematical/geometric data transforms into emotionally resonant, diagnostic mirrors.

The Poetic Brain follows the **FIELD → MAP → VOICE** translation protocol, ensuring all output is:
- Falsifiable and testable
- Agency-preserving (no determinism)
- Plain language (Frontstage rules enforced)
- Archetypal yet specific

---

## Core Persona & Voice

### [RAVEN-PERSONA-SPEC.md](RAVEN-PERSONA-SPEC.md)
**Purpose:** Canonical Raven Calder persona definition  
**Audience:** All contributors, content designers

**Contents:**
- Raven Calder identity and voice characteristics
- Frontstage vs. Backstage separation rules
- E-Prime usage enforcement
- Possibility language requirements
- Voice examples and anti-patterns

**When to use:** Any content generation, reviewing output, training new contributors

---

### [How Raven Speaks v2.md](How%20Raven%20Speaks%20v2.md)
**Purpose:** Narrative style guide and voice calibration  
**Audience:** Content designers, developers implementing narrative generation

**Contents:**
- Sentence-level voice patterns
- Rhythm and pacing guidelines
- Metaphor usage rules
- Paradox framing techniques
- Common voice violations to avoid

**When to use:** Writing or reviewing narrative content, debugging voice inconsistencies

---

## Content Generation Specifications

### [POETIC_CODEX_CARD_SPEC.md](POETIC_CODEX_CARD_SPEC.md) ⭐
**Purpose:** Technical specification for Poetic Codex cards  
**Audience:** Developers implementing card generation  
**Version:** 2.1 (Updated Oct 1, 2025)

**Contents:**
- Complete YAML card template
- Field specifications and validation rules
- Initial Reading Mode (Plain Voice blocks)
- Integration with Balance Meter and Dream Protocol
- Usage examples (Solo, Relational, Plain Voice modes)
- Rendering pipeline documentation

**When to use:** Implementing card generation, debugging card output, creating new card types

**Key Features:**
- FIELD → MAP → VOICE structure
- Frontstage linting requirements
- Socratic prompt generation logic
- Visual design specifications

---

### [IMPLEMENTATION_SPEC_MIRROR_REPORTS.md](IMPLEMENTATION_SPEC_MIRROR_REPORTS.md)
**Purpose:** Mirror report generation implementation  
**Audience:** Backend developers, content generation pipeline engineers

**Contents:**
- Symbol-to-poem translation protocol
- Hook Stack generation
- Frontstage Preface composition
- Explanation table structure
- Color/emoji legend usage
- Planet-to-emoji mapping

**When to use:** Building report generation logic, debugging translation pipeline

---

## Specialized Tools & Filters

### [QUEUE_ANALYSIS_FILTERS_GUIDE.md](QUEUE_ANALYSIS_FILTERS_GUIDE.md)
**Purpose:** Chat queue filtering and analysis tools  
**Audience:** Backend developers, UX designers

**Contents:**
- Queue filtering algorithms
- Priority scoring methods
- Context windowing for chat history
- Relevance detection patterns
- Memory management strategies

**When to use:** Implementing chat features, optimizing queue processing, debugging context issues

---

## Translation Protocols

### Core Translation Process: FIELD → MAP → VOICE

All Poetic Brain output follows this three-layer translation:

#### 1. FIELD (Energetic Climate)
- Raw symbolic data from Math Brain
- Balance Meter metrics (Magnitude, Valence, Volatility, SFD)
- Somatic/sensory tone extraction
- **Output:** Felt-sense description, no technical terms

#### 2. MAP (Archetypal Pattern)
- Geometric aspects mapped to archetypes
- Tension identification
- Paradox framing
- **Output:** Structural patterns, diagnostic notes (Backstage)

#### 3. VOICE (Lived Mirror)
- Plain language narrative synthesis
- Socratic prompt generation
- Possibility language enforcement
- **Output:** User-facing content (Frontstage)

### Language Requirements

**Frontstage Content (User-Facing):**
- ❌ No planet names, signs, houses, aspects, degrees
- ✅ Plain, conversational language
- ✅ "Often," "tends to," "can show up as" (possibility language)
- ✅ Falsifiable observations
- ✅ Testable mirrors

**Backstage Content (Operator-Only):**
- ✅ All technical terms allowed
- ✅ Geometric calculations visible
- ✅ Diagnostic notes
- ❌ Never shown to users

---

## Integration Points

### Connection to Core Architecture
All Poetic Brain specs align with:
- [`/Core/Four Report Types_Integrated 10.1.25.md`](../Core/Four%20Report%20Types_Integrated%2010.1.25.md) - Primary architecture
- Frontstage Preface requirements
- Report type specifications

### Connection to Math Brain
Poetic Brain receives input from:
- [`/Implementation/MATH_BRAIN_COMPLIANCE.md`](../Implementation/MATH_BRAIN_COMPLIANCE.md) - Calculation outputs
- [`/Implementation/SEISMOGRAPH_GUIDE.md`](../Implementation/SEISMOGRAPH_GUIDE.md) - Balance Meter data

### Connection to Quality Enforcement
Output validated by:
- [`/Implementation/LINTER_SPECIFICATIONS.md`](../Implementation/LINTER_SPECIFICATIONS.md) - Frontstage linter rules
- POETIC_CODEX_CARD_SPEC validation schemas

---

## Content Generation Workflow

### Generating a Solo Mirror Report

1. **Receive Math Brain Data**
   - Natal chart geometry
   - Current transits
   - Aspect calculations

2. **Apply Balance Meter** (if applicable)
   - Calculate Magnitude, Valence, Volatility, SFD
   - Identify high-charge aspects

3. **Translate FIELD**
   - Convert metrics to somatic language
   - Extract felt-sense tone
   - Avoid technical terms

4. **Identify MAP**
   - Map aspects to archetypes
   - Name core tensions
   - Frame paradoxes

5. **Generate VOICE**
   - Write Frontstage Preface (Persona Intro, Resonance Profile, Paradoxes)
   - Compose narrative sections
   - Generate Socratic prompts

6. **Assemble Card/Report**
   - Populate YAML template (POETIC_CODEX_CARD_SPEC)
   - Add symbols/visuals
   - Include Diagnostic Notes (Backstage)

7. **Validate**
   - Run Frontstage linter (LINTER_SPECIFICATIONS)
   - Check YAML structure
   - Verify voice consistency (RAVEN-PERSONA-SPEC)

### Generating a Relational Mirror Report

Follow Solo process, plus:
- Generate synastry aspects
- Frame bidirectional attributions
- Name both individuals explicitly
- Avoid "they/them" generalizations

### Generating Balance Meter Content

1. **Receive Balance Meter Data**
   - Magnitude, Valence, Volatility, SFD components
   - Depletion Index, Resilience Score

2. **Translate Metrics to Language**
   - Magnitude → intensity descriptors (Threshold, Stirring, Pulse, etc.)
   - Valence → tonal flavors (Collapse, Friction, Flow, Liberation, etc.)
   - Volatility → distribution patterns (Aligned Flow, Mixed Paths, Vortex)
   - SFD → support/friction verdict

3. **Compose Daily Entry**
   - Hook Stack (Recognition + Paradox)
   - FIELD layer (sensory atmosphere)
   - MAP layer (structural pattern)
   - VOICE layer (plain language mirror)

---

## Voice Calibration Checklist

Use this checklist to verify Raven Calder voice is properly calibrated:

### Persona Alignment
- [ ] Blunt honesty without cruelty
- [ ] Grounded, non-mystical tone
- [ ] Conversational but precise
- [ ] Archetypal outsider narrator stance

### Language Rules
- [ ] E-Prime enforced (no "to be" verbs when describing states)
- [ ] Possibility language ("often," "tends to," "can show up as")
- [ ] Falsifiable claims only
- [ ] No determinism ("you will," "this means")
- [ ] No mystical language ("divine," "destined," "meant to be")

### Structure
- [ ] Hook Stack at beginning (Resonance + Paradox)
- [ ] FIELD → MAP → VOICE layers present
- [ ] Frontstage/Backstage separation clear
- [ ] Socratic prompts genuinely open-ended

### Technical Compliance
- [ ] No planet names in Frontstage
- [ ] No sign/house terms in Frontstage
- [ ] No aspect jargon in Frontstage
- [ ] Symbols/glyphs only in Backstage or legends

---

## Common Voice Issues & Fixes

### Issue: Content Too Generic
**Symptom:** Could apply to anyone, lacks specificity  
**Fix:** 
- Reference specific geometric patterns (in Backstage)
- Use concrete behavioral anchors
- Name paradoxes explicitly

### Issue: Mystical/Spiritual Language
**Symptom:** "Divine timing," "meant to be," "soul purpose"  
**Fix:**
- Use "often correlates," "symbolic alignment"
- Frame as probability, not destiny
- Ground in falsifiable observation

### Issue: Technical Jargon in Frontstage
**Symptom:** "Saturn square Moon," "12th house," "opposition"  
**Fix:**
- Move to Diagnostic Notes (Backstage)
- Translate to plain language ("constraint meets feeling," "hidden tension")
- Use FIELD layer sensory descriptions

### Issue: Deterministic Claims
**Symptom:** "You will," "This means," "You are"  
**Fix:**
- Use "often," "tends to," "can show up as"
- Frame as pattern, not identity
- Offer possibility, not certainty

### Issue: Advice-Giving
**Symptom:** "You should," "Do this," "Avoid that"  
**Fix:**
- Reframe as Socratic question
- Describe pattern without prescribing response
- Honor agency: show options, not commands

---

## Document Status

| Document | Version | Last Updated | Priority |
|----------|---------|--------------|----------|
| POETIC_CODEX_CARD_SPEC.md | 2.1 | Oct 1, 2025 | 🔴 Critical |
| RAVEN-PERSONA-SPEC.md | - | - | 🔴 Critical |
| How Raven Speaks v2.md | 2.0 | - | 🟡 High |
| IMPLEMENTATION_SPEC_MIRROR_REPORTS.md | - | - | 🟡 High |
| QUEUE_ANALYSIS_FILTERS_GUIDE.md | - | - | 🟢 Medium |

**Priority Legend:**
- 🔴 Critical - Core voice/persona definition
- 🟡 High - Implementation specifications
- 🟢 Medium - Specialized tools

---

## Quick Reference

**Need to:**
- **Understand Raven Calder voice?** → RAVEN-PERSONA-SPEC.md
- **Write narrative content?** → How Raven Speaks v2.md
- **Generate cards?** → POETIC_CODEX_CARD_SPEC.md
- **Build report pipeline?** → IMPLEMENTATION_SPEC_MIRROR_REPORTS.md
- **Debug voice issues?** → Voice Calibration Checklist (above)
- **Check quality?** → `/Implementation/LINTER_SPECIFICATIONS.md`

**Working on:**
- Card generation → POETIC_CODEX_CARD_SPEC.md
- Mirror reports → IMPLEMENTATION_SPEC_MIRROR_REPORTS.md
- Chat features → QUEUE_ANALYSIS_FILTERS_GUIDE.md
- Voice consistency → RAVEN-PERSONA-SPEC.md + How Raven Speaks v2.md

---

## Contribution Guidelines

### Adding New Poetic Brain Docs

1. **Naming:** Use descriptive names ending in `_SPEC.md` or `_GUIDE.md`
2. **Required Sections:**
   - Overview/Purpose
   - Audience
   - Voice requirements
   - FIELD → MAP → VOICE integration
   - Examples
   - See Also
3. **Voice Alignment:** All examples must pass Frontstage linter
4. **Update this README** with new document reference

### Updating Existing Docs

1. **Version control:** Increment version number if breaking changes
2. **Cross-references:** Update links if structure changes
3. **Voice examples:** Ensure all examples still pass linter
4. **Test generation:** Verify pipeline still works after changes

---

## See Also

- **Architecture:** [`/Core/`](../Core/) - System design and report types
- **Implementation:** [`/Implementation/`](../Implementation/) - Technical specs
- **Quality:** [`/Implementation/LINTER_SPECIFICATIONS.md`](../Implementation/LINTER_SPECIFICATIONS.md) - Frontstage validation
- **API:** [`/API/`](../API/) - External service integration
- **Lessons Learned:** [`/Lessons Learned/`](../Lessons%20Learned/) - Best practices

---

**Maintained by:** Dan Cross (DHCross)  
**Last README Update:** October 1, 2025
