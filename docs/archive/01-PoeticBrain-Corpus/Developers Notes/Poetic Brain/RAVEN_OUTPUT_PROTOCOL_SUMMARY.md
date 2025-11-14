# Summary: Raven Output Protocol Implementation

**Date:** October 1, 2025  
**Status:** Complete

---

## What Was Created

### Primary Document: `RAVEN_OUTPUT_PROTOCOL.md`

A comprehensive, unified protocol that serves as the **single source of truth** for how Raven Calder generates human-facing text.

**Location:** `Developers Notes/Poetic Brain/RAVEN_OUTPUT_PROTOCOL.md`

**Contents:**

1. **Construction Algorithm** (6 steps)
   - Opening Signals (formerly Hook Stack)
   - Composite Personality Summary
   - Behavioral Anchors
   - Conditional Impulses
   - Pressure Patterns
   - Calibration Markers (SST Tags)

2. **Terminology Map**
   - Complete translation table: Internal → Reader-Facing
   - Example: "Hook Stack" → "Opening Signals", "WB/ABE/OSR" → "Calibration Notes"
   - Aspect names in lived language
   - Planet archetypes without jargon

3. **Copilot Rules**
   - 7 explicit rules for AI assistants
   - Jargon suppression requirements
   - Dual-pole phrasing enforcement
   - Frontstage vs Backstage separation

4. **Output Validation Checklist**
   - Content quality checks
   - Structure compliance
   - Language safety verification
   - Frontstage/backstage gatekeeping

---

## Problem This Solves

### Before

- **Scattered documentation** across multiple files with inconsistent terminology
- **Jargon leaks** in reader-facing output (e.g., "Hook Stack", "WB/ABE/OSR tags")
- **No clear construction algorithm** for AI assistants to follow
- **Technical labels** appearing in place of human-readable text (e.g., "Saturn-Moon Square" instead of "Disciplined or Shut Down")

### After

- **Single playbook** for all contributors and AI assistants
- **Explicit translation table** prevents jargon from reaching readers
- **Step-by-step algorithm** ensures consistent output structure
- **Quality checklist** catches issues before deployment

---

## Integration Points

### Documentation Updated

1. **`Developers Notes/Poetic Brain/README.md`**
   - Added RAVEN_OUTPUT_PROTOCOL.md as primary reference (⭐ marker)
   - Positioned at top of "Core Persona & Voice" section
   - Includes "Why it's primary" explanation

2. **`Developers Notes/README.md`**
   - Added protocol to "Quick Navigation" under "Voice & Content Generation"
   - Listed as ⭐ **START HERE** reference
   - Included in Poetic Brain folder description

3. **`CHANGELOG.md`**
   - New entry documenting protocol creation
   - Explains "Why This Matters"
   - Links to related Human Translation Layer work

---

## Key Features

### 1. Translation Enforcement

Every internal term has an explicit reader-facing translation:

| Internal | Reader-Facing |
|----------|---------------|
| Hook Stack | Opening Signals / Snapshot Traits |
| WB/ABE/OSR | Calibration Notes (with translations) |
| Balance Meter | Symbolic Weather Gauge |
| Conjunction | "Fused", "merged", "bound together" |

### 2. Dual-Pole Phrasing

Opening Signals **must** show both poles:

✅ "Disciplined or Shut Down"  
❌ "Disciplined"  
❌ "Saturn-Moon Square"

### 3. Construction Algorithm

Clear step-by-step process:

1. **Scan chart** for high-voltage aspects (orb ≤ 3°)
2. **Generate trait cards** with dual-pole format
3. **Synthesize** composite personality summary
4. **Name** behavioral anchors (stable traits)
5. **Identify** conditional impulses (trigger-based)
6. **Frame** pressure patterns (stress behaviors)
7. **Translate** SST tags into Calibration Notes

### 4. Quality Gatekeeping

Validation checklist ensures:
- No jargon leaks
- Polarity cards use dual-pole phrasing
- Symbolic weather stays separate from natal blueprint
- Tension framed as generative, not problematic
- No predictions or determinism

---

## Usage Guidelines

### For AI Assistants (Copilot, ChatGPT)

**Before generating ANY Raven output:**

1. Read `RAVEN_OUTPUT_PROTOCOL.md`
2. Follow the construction algorithm step-by-step
3. Translate ALL technical terms using the terminology map
4. Run output through the validation checklist
5. Verify no jargon leaks before finalizing

### For Developers

**When implementing narrative features:**

1. Use protocol as primary reference
2. Enforce translation layer in `lib/weather-lexicon-adapter.ts`, `src/frontstage-renderer.ts`
3. Add linter rules to catch jargon leaks (see `LINTER_SPECIFICATIONS.md`)
4. Test output against validation checklist

### For Content Designers

**When writing or reviewing content:**

1. Verify all polarity cards use dual-pole phrasing
2. Check that Opening Signals appear first (3–6 cards)
3. Ensure Calibration Notes translate WB/ABE/OSR tags
4. Confirm no technical aspect names in reader-facing text

---

## Related Documentation

- **Primary:** `Developers Notes/Poetic Brain/RAVEN_OUTPUT_PROTOCOL.md`
- **Lexicon:** `Woven Map Probabilistic Field Lexicon 8.28.25 copy.md`
- **Linter:** `Implementation/LINTER_SPECIFICATIONS.md`
- **Persona:** `Poetic Brain/RAVEN-PERSONA-SPEC.md`
- **Voice:** `Poetic Brain/How Raven Speaks v2.md`
- **Card Spec:** `Poetic Brain/POETIC_CODEX_CARD_SPEC.md`

---

## Next Steps

### Immediate

- [ ] Share protocol with all AI assistants working on Raven voice
- [ ] Audit existing output for jargon leaks using validation checklist
- [ ] Update any hardcoded labels in UI components to use reader-facing terms

### Future Work

- [ ] Add automated linter to catch jargon leaks pre-deployment
- [ ] Create test suite for translation quality (input → expected output)
- [ ] Build Copilot prompt template that enforces this protocol
- [ ] Add validation layer in frontstage renderer to block untranslated terms

---

## Success Metrics

**Protocol is working when:**

1. ✅ No "Hook Stack", "WB/ABE/OSR", "Balance Meter" in reader-facing UI
2. ✅ All Opening Signals use dual-pole phrasing
3. ✅ Aspect names appear as lived language ("tension", "flow", "tug-of-war")
4. ✅ AI assistants generate consistent output without manual corrections
5. ✅ New contributors can follow construction algorithm without confusion

---

## Contact

**Questions or issues?**  
Reference this summary and the protocol itself at:  
`Developers Notes/Poetic Brain/RAVEN_OUTPUT_PROTOCOL.md`

**For implementation help:**  
See integration notes in protocol (Section: "Implementation Notes for Developers")

---

**Status:** ✅ Complete and integrated into documentation structure
