# Intimacy Tier Labels Fix (January 2025)

## Issue

User reported that P2 was being described as "P2 — established, regular rhythm" in PDF reports instead of the correct label "P2 — Friends-with-benefits". Raven Calder GPT was reading from the "Four Report Types" documentation which did not have complete intimacy tier definitions.

## Root Cause

The "Four Report Types_Integrated 10.1.25.md" document only mentioned "P1–P3" without defining what those labels meant. This caused Raven Calder to use outdated or generic descriptions instead of the precise labels defined in the Math Brain interface.

## Correct Labels (P1–P5b)

### PARTNER Intimacy Tiers:
- **P1** — Platonic partners (no romantic/sexual component)
- **P2** — Friends-with-benefits (sexual but not romantic)
- **P3** — Situationship (unclear/unstable, undefined boundaries)
- **P4** — Low-commitment romantic or sexual (casual dating, open relationships)
- **P5a** — Committed romantic + sexual (exclusive committed relationship)
- **P5b** — Committed romantic, non-sexual (committed partnership without sexual component)

## Files Modified

### 1. `/app/math-brain/page.tsx` (Lines 2935-3003)
Added comprehensive "Relationship Context Definitions" section to all generated PDFs.

**What was added:**
```typescript
const relationshipDefinitions = `# Relationship Context Definitions (Math Brain)

## Relationship Types

### PARTNER
Romantic, sexual, or intimate partnership (requires intimacy tier)

**Intimacy Tiers:**
- **P1** — Platonic partners (no romantic/sexual component)
- **P2** — Friends-with-benefits (sexual but not romantic)
- **P3** — Situationship (unclear/unstable, undefined boundaries)
- **P4** — Low-commitment romantic or sexual (casual dating, open relationships)
- **P5a** — Committed romantic + sexual (exclusive committed relationship)
- **P5b** — Committed romantic, non-sexual (committed partnership without sexual component)

// ... includes FAMILY and PROFESSIONAL types too

**Raven's Rule:**
- Always use the EXACT intimacy tier labels as defined above
- Never substitute with outdated labels like "established regular rhythm"
- The intimacy tier appears in the relationship context and must be interpreted correctly`;

sections.push({
  title: 'Relationship Context Reference (For Raven Calder)',
  body: relationshipDefinitions,
  mode: 'regular'
});
```

### 2. `/Developers Notes/Core/Four Report Types_Integrated 10.1.25.md` (Lines 117-138)
Updated the "Relationship Diagnostics" section to include complete intimacy tier definitions.

**Before:**
```markdown
## Relationship Diagnostics (P1–P3)

Same FIELD→MAP→VOICE flow...
After P2/P3, shift to **Post-Diagnostic Resonant Excavation**...
```

**After:**
```markdown
## Relationship Diagnostics (Partner Intimacy Tiers)

**PARTNER Intimacy Tiers (P1–P5b):**
- **P1** — Platonic partners (no romantic/sexual component)
- **P2** — Friends-with-benefits (sexual but not romantic)
- **P3** — Situationship (unclear/unstable, undefined boundaries)
- **P4** — Low-commitment romantic or sexual (casual dating, open relationships)
- **P5a** — Committed romantic + sexual (exclusive committed relationship)
- **P5b** — Committed romantic, non-sexual (committed partnership without sexual component)

**CRITICAL:** Always use these EXACT labels. Never substitute with phrases like "established regular rhythm" or other generic descriptions.

Same FIELD→MAP→VOICE flow...
After diagnostic phase, shift to **Post-Diagnostic Resonant Excavation**...
```

## Impact

### Before Fix:
- PDFs did not include intimacy tier definitions for Raven Calder
- "Four Report Types" documentation only mentioned "P1–P3" without definitions
- Raven Calder GPT used outdated labels like "established regular rhythm"

### After Fix:
- Every PDF includes "Relationship Context Reference (For Raven Calder)" section
- Complete P1–P5b definitions with exact labels
- Explicit warning: "Always use these EXACT labels. Never substitute..."
- "Four Report Types" documentation updated with complete tier definitions
- Raven Calder GPT will now use correct labels from both PDF and documentation

## Testing Checklist

- [ ] Generate a relational report with P2 (Friends-with-benefits) intimacy tier
- [ ] Verify PDF contains "Relationship Context Reference" section
- [ ] Upload PDF to Raven Calder GPT
- [ ] Confirm Raven uses "Friends-with-benefits" not "established regular rhythm"
- [ ] Test with other tiers (P3, P4, P5a, P5b) to ensure consistency

## Source of Truth

The authoritative intimacy tier definitions are maintained in:
1. **Math Brain Interface UI** - `/app/math-brain/page.tsx` (form dropdown labels)
2. **PDF Generation** - `/app/math-brain/page.tsx` (relationship definitions section)
3. **Core Documentation** - `/Developers Notes/Core/Four Report Types_Integrated 10.1.25.md`
4. **Archive Documentation** - `/Developers Notes/Archive/REPORT_REQUIREMENTS.md` (lines 97-103)

All four sources now have consistent P1–P5b labels.

## Related Issues

- User Quote: "P2 was said to be 'P2 — established, regular rhythm'. Raven said it was because in the document 'The Four Reports' it is different."
- This was the final fix needed to ensure Raven Calder has all required data for complete Mirror + Weather readings

## Date
January 2025
