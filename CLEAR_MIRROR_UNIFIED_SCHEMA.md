# Clear Mirror Unified Rendering Schema

**Status:** ✅ IMPLEMENTED  
**Date:** 2025-01-21  
**System:** Poetic Brain → Clear Mirror PDF Export

---

## Overview

This document defines the **unified rendering contract** between Raven auto-execution (LLM output) and Clear Mirror template (PDF/export rendering). The LLM always emits the same structured sections with explicit headings, and the template knows exactly where to place:

- Hook Stack (top-loaded high-charge aspects)
- Frontstage (FIELD LAYER coordinates)
- Polarity Cards (tension/contradiction pairs)
- Mirror Voice (VOICE LAYER narrative)
- Socratic Closure (optional custom text + marking guide)
- Session Validation Layer (Actor/Role composite + resonance stats + rubric scores)

This unified schema ensures:
1. **Consistent LLM output** across all auto-execution modes (relational, parallel, solo, contextual)
2. **Predictable parsing** from markdown to structured data
3. **Template compatibility** for PDF, HTML email, share cards (future)
4. **Session diagnostics integration** with empirical validation data

---

## Architecture Components

### 1. Auto-Execution Prompts (`app/api/raven/route.ts`)

**Purpose:** Instruct Perplexity LLM to generate structured Clear Mirror sections

**Location:** `deriveAutoExecutionPlan()` function  
**Updated Modes:**
- ✅ `relational_auto` (lines 487-503)
- ✅ `parallel_auto` (lines 505-519)
- ✅ `contextual_auto` (lines 551-562)
- ✅ `solo_auto` (lines 567-579)

**Instruction Format:**
```typescript
instructions: [
  'AUTO-EXECUTION: [Mode description]',
  'STRUCTURE: Generate Clear Mirror format with explicit sections:',
  '1. Hook Stack (4 items): Numbered, bolded headlines with inline geometry footnotes',
  '2. Frontstage: FIELD LAYER coordinates (date/time/location), planetary geometry summary',
  '3. Polarity Cards (2-4): Tension/contradiction pairs with titles',
  '4. Mirror Voice: VOICE LAYER narrative with embedded Socratic question',
  '5. Socratic Closure: Optional custom reflection or standard closure',
  'Execute immediately. Use section headings (### Hook Stack, etc.). E-Prime language throughout.',
]
```

**Expected LLM Output:**
```markdown
### Hook Stack

**1. [The Pressure Valve]** You tend to channel accumulated intensity into tangible action—work, problem-solving, creation—rather than waiting for tension to dissipate organically.¹²

**2. [The Trust Sequence]** The chart indicates trust builds incrementally through demonstrated consistency rather than through verbal declaration.³

### Frontstage

Date/Time/Location: October 31, 2025, 12:00 PM, Portland, OR
Planetary geometry summary: Mars opposition Sun (0.2°), Saturn trine Neptune (1.1°)...

### Polarity Cards

**The Engine and the Brake**
Intensity drives; restraint regulates. The pattern shows both impulses operating simultaneously—pressure to act countered by caution to reflect.⁴

### Mirror Voice

The pattern suggests you navigate pressure through precision—not from inability to relax, but because structure provides the release valve that unstructured stillness cannot.⁵ Does this operating system still serve your actual life, or has the protective container calcified into limiting cage?

### Socratic Closure

Truth arrives through motion, then confirms itself through rest. The work may involve weighting both phases equally—allowing stillness to register as preparation rather than stagnation.
```

---

### 2. Response Parser (`lib/raven/clear-mirror-parser.ts`)

**Purpose:** Extract structured sections from LLM markdown output

**Exports:**
- `parseClearMirrorResponse(markdown: string)` → `ParsedClearMirrorSections`
- `hasValidClearMirrorStructure(parsed)` → `boolean` (validation)

**ParsedClearMirrorSections Interface:**
```typescript
{
  hookStack?: Array<{ headline: string; body: string }>;
  frontstage?: string;
  polarityCards?: Array<{ title: string; body: string }>;
  mirrorVoice?: string;
  socraticClosure?: string;
  rawMarkdown: string; // fallback if parsing fails
}
```

**Parsing Logic:**
1. **Hook Stack:** Match `### Hook Stack` section → extract numbered items `**1. [Headline]** body`
2. **Frontstage:** Match `### Frontstage` → capture all text until next section
3. **Polarity Cards:** Match `### Polarity Cards` → extract `**Title**\nbody` patterns
4. **Mirror Voice:** Match `### Mirror Voice` → capture narrative
5. **Socratic Closure:** Match `### Socratic Closure` → capture closure text

**Validation:**
```typescript
hasValidClearMirrorStructure(parsed) {
  return !!(
    parsed.hookStack && parsed.hookStack.length > 0 &&
    parsed.frontstage &&
    parsed.mirrorVoice
  );
}
```

---

### 3. Context Adapter (`lib/pdf/clear-mirror-context-adapter.ts`)

**Purpose:** Convert parsed LLM sections → `ClearMirrorData` interface

**Main Function:**
```typescript
buildClearMirrorFromContexts(
  contexts: ReportContext[], 
  sessionDiagnostics?: SessionDiagnostics
): ClearMirrorData
```

**Flow:**
1. Extract person names from contexts (`personA`, `personB?`)
2. Parse first context content: `parseClearMirrorResponse(contexts[0].content)`
3. If valid structure found → `buildFromStructuredResponse()`
4. Else → `buildFromTemplate()` (legacy fallback)

**Mapping (Structured Response):**
```typescript
{
  hookStack: parsed.hookStack.map(hook => ({
    headline: hook.headline,
    livedExample: hook.body,  // Parser's 'body' → Template's 'livedExample'
    geometry: undefined       // Embedded in footnotes
  })),
  
  frontstage: {
    text: parsed.frontstage,
    footnotes: []
  },
  
  polarityCards: parsed.polarityCards.map(card => ({
    title: card.title,
    text: card.body,
    footnote: ''  // Embedded in body
  })),
  
  mirrorVoice: {
    text: parsed.mirrorVoice,
    footnotes: []
  },
  
  socraticClosure: {
    text: parsed.socraticClosure,
    includeMarkingGuide: true
  },
  
  sessionDiagnostics: sessionDiagnostics  // Pass through from WrapUpCard
}
```

---

### 4. Clear Mirror Template (`lib/templates/clear-mirror-template.ts`)

**Purpose:** Render `ClearMirrorData` → markdown for PDF generation

**Key Rendering Functions:**
- `generateClearMirrorMarkdown(data)` → full markdown document
- Hook Stack section (if `data.hookStack` exists)
- Frontstage section (always included)
- Polarity Cards section (if `data.polarityCards` exists)
- Mirror Voice section (if `data.mirrorVoice` exists)
- Socratic Closure section (always included)
- Session Validation Layer (if `data.sessionDiagnostics` exists)

**Hook Stack Rendering:**
```typescript
if (data.hookStack && data.hookStack.length > 0) {
  lines.push('## Hook Stack', '');
  data.hookStack.forEach((hook, idx) => {
    lines.push(`**${idx + 1}. ${hook.headline}**`);
    lines.push(hook.livedExample);
    if (hook.geometry) lines.push(`*${hook.geometry}*`);
    lines.push('');
  });
}
```

**Session Validation Layer Rendering:**
```typescript
if (data.sessionDiagnostics) {
  lines.push('---', '## Session Validation Layer', '');
  
  // Actor/Role Composite
  if (data.sessionDiagnostics.actorRoleComposite) {
    lines.push(`**Actor/Role Composite:** ${composite.actor}/${composite.role}`);
    lines.push(`**Confidence:** ${confidence} (${confidenceBand})`);
  }
  
  // Session Stats
  if (data.sessionDiagnostics.sessionStats) {
    lines.push(`**Total Mirrors:** ${stats.totalMirrors}`);
    lines.push(`**Accuracy:** ${stats.accuracyRate}%`);
  }
  
  // Rubric Scores
  if (data.sessionDiagnostics.rubricScores) {
    lines.push(`**Total Score:** ${rubric.totalScore}/25 (${rubric.scoreBand})`);
  }
}
```

---

### 5. Session Diagnostics Integration (`components/WrapUpCard.tsx`)

**Purpose:** Collect Actor/Role + resonance stats + rubric scores for PDF

**Data Collection:**
```typescript
const sessionDiagnostics = {
  actorRoleComposite: {
    actor: detectedActor,
    role: detectedRole,
    composite,
    confidence,
    confidenceBand,
    siderealDrift,
    driftBand,
    driftIndex,
    evidenceN,
    sampleSize
  },
  sessionStats: {
    totalMirrors,
    accuracyRate,
    clarityRate,
    breakdown: { wb, abe, osr, pending }
  },
  rubricScores: {
    pressure, outlet, conflict, tone, surprise,
    totalScore, scoreBand, nullCount
  }
};

// Pass to ChatClient export handler
onExportClearMirror?.(sessionDiagnostics);
```

**Handler in ChatClient:**
```typescript
handleGenerateClearMirrorPDF(sessionDiagnostics?: SessionDiagnostics) {
  const clearMirrorData = buildClearMirrorFromContexts(
    reportContexts, 
    sessionDiagnostics
  );
  await generateClearMirrorPDF(clearMirrorData);
}
```

---

## Data Flow

```
1. User uploads chart → Math Brain computes geometry
2. Poetic Brain auto-execution triggered
3. LLM receives structured prompt:
   "STRUCTURE: Generate Clear Mirror format with explicit sections..."
4. LLM emits markdown with section headings:
   ### Hook Stack
   ### Frontstage
   ### Polarity Cards
   ### Mirror Voice
   ### Socratic Closure
5. Response stored in reportContext.content
6. User clicks "Export Clear Mirror" in WrapUpCard
7. WrapUpCard collects sessionDiagnostics (Actor/Role + stats + rubric)
8. ChatClient calls buildClearMirrorFromContexts(contexts, diagnostics)
9. Adapter parses LLM response → extracts sections
10. Adapter validates structure → builds ClearMirrorData
11. Template renders markdown → includes Session Validation Layer
12. PDF generator converts markdown → downloadable PDF
```

---

## Validation & Fallback

**Structure Validation:**
```typescript
if (hasValidClearMirrorStructure(parsed)) {
  // Use parsed sections
  return buildFromStructuredResponse(...);
} else {
  // Fall back to template-based construction
  return buildFromTemplate(...);
}
```

**Required Sections (for validity):**
- Hook Stack with at least 1 item
- Frontstage with content
- Mirror Voice with content

**Optional Sections:**
- Polarity Cards (recommended 2-4)
- Socratic Closure (defaults to marking guide if omitted)
- Session Diagnostics (only if WrapUpCard provides)

---

## Section Specifications

### Hook Stack (4 items recommended)

**Format:**
```markdown
### Hook Stack

**1. [Headline]** Brief real-world scenario with inline footnotes¹²³

**2. [Headline]** Another scenario

**3. [Headline]** Third pattern

**4. [Headline]** Fourth pattern
```

**Requirements:**
- Numbered list (1-4)
- Bolded headlines in brackets: `**1. [Headline]**`
- Inline geometry footnotes (superscript)
- Lived-language examples (not abstract theory)

---

### Frontstage (FIELD LAYER)

**Format:**
```markdown
### Frontstage

Date/Time/Location: October 31, 2025, 12:00 PM, Portland, OR

Planetary geometry summary: Mars opposition Sun (0.2°), Saturn trine Neptune (1.1°), Moon square Uranus (1.2°)

Narrative describing sensory-level patterns with embedded footnotes.¹²³⁴
```

**Requirements:**
- Coordinates (date/time/location)
- Planetary geometry summary
- E-Prime language (no "is/are/was/were")
- Inline footnotes for aspects

---

### Polarity Cards (2-4 recommended)

**Format:**
```markdown
### Polarity Cards

**The Engine and the Brake**
Intensity drives; restraint regulates. The pattern shows both impulses operating simultaneously.¹

**The Threshold**
Simultaneous craving for intimacy and construction of protective barriers.²
```

**Requirements:**
- Bolded card titles: `**Title**`
- Tension/contradiction pairs
- Reflective language (not prescriptive)
- Inline footnotes for geometry

---

### Mirror Voice (VOICE LAYER)

**Format:**
```markdown
### Mirror Voice

Direct "you" reflection addressing the person. Embedded Socratic question: Does this operating system still serve your actual life, or has the protective container calcified into limiting cage?¹²
```

**Requirements:**
- Second-person ("you") narrative
- Embedded Socratic question
- E-Prime language
- Inline footnotes

---

### Socratic Closure

**Format:**
```markdown
### Socratic Closure

Truth arrives through motion, then confirms itself through rest. The work may involve weighting both phases equally—allowing stillness to register as preparation rather than stagnation.
```

**Requirements:**
- Optional custom closure text
- Template always adds marking guide (WB/ABE/OSR instructions)
- Can be omitted (defaults to marking guide only)

---

## Session Validation Layer (Automatic)

**Included when `sessionDiagnostics` provided by WrapUpCard**

**Rendering:**
```markdown
---
## Session Validation Layer

### Actor/Role Composite
**Pattern:** Actor/Role
**Confidence:** 85% (HIGH)
**Sidereal Drift:** None detected (Band: NONE)
**Evidence:** 12 mirrors analyzed

### Session Statistics
**Total Mirrors:** 12
**Accuracy Rate:** 83%
**Clarity Rate:** 75%
**Breakdown:** WB: 5 | ABE: 4 | OSR: 2 | Pending: 1

### Rubric Scores
**Pressure Management:** 4/5
**Outlet Construction:** 4/5
**Conflict Navigation:** 3/5
**Tone Calibration:** 4/5
**Surprise Integration:** 3/5
**Total Score:** 18/25 (MODERATE-HIGH)
```

**Purpose:**
- Empirical validation of symbolic patterns
- Session quality metrics (accuracy, clarity)
- Rubric-based reflection scoring
- Actor/Role composite detection (future zodiac remapping)

---

## Future Export Formats

This unified schema supports:

1. **PDF** (current) - `lib/pdf/clear-mirror-pdf.ts`
2. **HTML Email** (future) - Render markdown → styled HTML
3. **Share Cards** (future) - Extract key sections → visual cards
4. **JSON API** (future) - Structured data for external integrations

**Key Advantage:** Single `ClearMirrorData` payload serves all formats. No format-specific logic needed—just different renderers consuming the same structured data.

---

## Error Handling

**Missing Sections:**
- Parser returns `undefined` for missing sections
- Adapter checks validity before using structured path
- Falls back to template-based construction if invalid
- Template handles undefined sections gracefully (skips rendering)

**Malformed Markdown:**
- Regex patterns fail silently (return empty arrays)
- `hasValidClearMirrorStructure()` catches missing required sections
- Fallback ensures PDF always generates (even with template placeholders)

**Session Diagnostics:**
- Optional in all flows
- Adapter passes through without validation
- Template renders only if provided
- Missing diagnostics → no Session Validation Layer section

---

## Testing

**Manual Verification:**
1. Upload chart to Math Brain
2. Trigger Poetic Brain auto-execution (any mode)
3. Verify LLM response contains section headings (### Hook Stack, etc.)
4. Complete session → open WrapUpCard
5. Export Clear Mirror PDF
6. Verify PDF contains:
   - Hook Stack section (if LLM generated)
   - Frontstage section
   - Polarity Cards (if LLM generated)
   - Mirror Voice (if LLM generated)
   - Socratic Closure with marking guide
   - Session Validation Layer (if diagnostics available)

**Regression Check:**
- Export Clear Mirror without completing session (no diagnostics)
- Verify PDF still generates (missing Session Validation Layer is OK)
- Verify legacy template fallback works (if LLM response unstructured)

---

## Maintenance Notes

**When updating LLM prompts:**
1. Update all four modes: `relational_auto`, `parallel_auto`, `contextual_auto`, `solo_auto`
2. Keep section structure consistent (same headings, same order)
3. Test parser still extracts sections correctly
4. Verify PDF renders new sections

**When updating template:**
1. Update `ClearMirrorData` interface in `clear-mirror-template.ts`
2. Update parser interface if section structure changes
3. Update adapter mapping logic
4. Update auto-execution prompts to match new structure
5. Run full integration test (upload → auto-exec → export)

**When adding new sections:**
1. Define in auto-execution prompt instructions
2. Add parser regex/logic
3. Update `ParsedClearMirrorSections` interface
4. Update adapter mapping
5. Update `ClearMirrorData` interface
6. Update template rendering
7. Document in this file

---

## References

- Auto-execution prompts: `app/api/raven/route.ts` (lines 487-579)
- Parser implementation: `lib/raven/clear-mirror-parser.ts`
- Context adapter: `lib/pdf/clear-mirror-context-adapter.ts`
- Template renderer: `lib/templates/clear-mirror-template.ts`
- Session diagnostics: `components/WrapUpCard.tsx`
- Prompt architecture: `lib/prompts/clear-mirror-auto-execution.ts`
- Session diagnostics doc: `CLEAR_MIRROR_SESSION_DIAGNOSTICS.md`

---

**Last Updated:** 2025-01-21  
**Status:** ✅ Production Ready  
**Next Steps:** Integration testing, user feedback collection, future export formats (HTML email, share cards)
