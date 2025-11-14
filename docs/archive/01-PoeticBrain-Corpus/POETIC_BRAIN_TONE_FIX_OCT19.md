# Poetic Brain Tone & Report Reading Fix - Oct 19, 2025

## Issues Identified

### Issue 1: Corrupted Prompt Introduction
**File:** `lib/prompts.ts` (lines 1-6)

**Problem:** The opening of `REPORT_STRUCTURES` was corrupted with garbled text that broke the persona instructions:

```
Line 2: You are Raven Calder, **Paragraph 2 – Weather (Symbolic Flow with Guardrail):**
Line 6: ...builds insight if you stay steady."ic Brain for The Woven Map.
```

**Impact:**
- AI couldn't understand core instructions about conversational tone
- Missed instructions about avoiding headers/jargon in body text
- Skipped Five-Step Delivery Framework
- Lost directive to write in warm, peer-like paragraphs

**Fix Applied:**
Replaced corrupted text with proper introduction:
```
You are Raven Calder, the Poetic Brain for The Woven Map. You translate symbolic geometry into lived experience while preserving agency and falsifiability. Obey this mandatory rulebook.
```

---

### Issue 2: Technical Openings in Upload Handlers
**File:** `app/api/chat/route.ts` (lines 580-596)

**Problem:** When JSON or journal uploads were detected, the system was rewriting prompts with technical openings:

```typescript
// OLD (WRONG):
"I've received a WovenWebApp JSON report. Please provide a complete Solo Mirror analysis..."
"I've received a journal entry for analysis..."
```

This directly violated the v11 prompt protocol:
> "2. NO technical openings like 'I've received...' or data summaries"

**Impact:**
- AI responded in technical/choppy tone
- Used headers and bullet points instead of paragraphs
- Treated uploads as data summaries rather than context for warm reflection

**Fix Applied:**

**For JSON uploads:**
```typescript
analysisPrompt = `CONTEXT: The following chart data has been provided. Use it to generate a complete, conversational mirror reflection following the Five-Step Delivery Framework.

CHART DATA:
${reportData}

INSTRUCTIONS: Begin with warm recognition of the person's stance/pattern. Use the chart geometry as context, but write in natural, conversational paragraphs. Follow the FIELD→MAP→VOICE protocol. No technical openings, no data summaries—just the warm, direct mirror.`;
```

**For journal uploads:**
```typescript
analysisPrompt = `CONTEXT: The user has shared a journal entry. Read it with your symbolic weather lens and provide warm, conversational reflections.

JOURNAL ENTRY:
${journalContent}

INSTRUCTIONS: Begin with recognition of the felt texture in their words. Surface patterns and emotional climate using conditional language. Apply Recognition Layer analysis (SST protocol) and offer reflections they can test against their lived experience. Write in natural paragraphs, not technical summaries.`;
```

---

## Root Cause Analysis

Both issues stemmed from the same pattern: **technical framing overriding conversational instructions**.

1. **Corrupted prompt** → AI never learned it should be conversational
2. **Technical upload prompts** → AI treated uploads as data dumps, not context for warm reflection

Together, these created a perfect storm where:
- System instructions were broken
- Upload handlers contradicted those instructions
- AI defaulted to technical/choppy mode

---

## Expected Behavior After Fix

### ✅ Conversational Tone
- Warm, peer-like paragraphs (not headers/bullets)
- Natural language flow
- Five-Step Delivery Framework:
  1. Recognition Hook (FIELD)
  2. Pattern Naming (MAP)
  3. Perspective Framing (VOICE)
  4. Conditional Leverage
  5. Tiny Next Step

### ✅ Report Reading
- JSON uploads parsed correctly
- Chart geometry extracted and used as context
- Mirror Directive JSON fully supported
- Symbolic Weather JSON fully supported
- No technical openings ("I've received...")

### ✅ Proper Persona
- Direct, not detached
- Plain syntax, muscular verbs
- Falsifiable empathy
- Agency-first cadence
- No divination drift

---

## Testing Checklist

- [ ] Upload Mirror Directive JSON → receives conversational paragraphs
- [ ] Upload Symbolic Weather JSON → receives conversational paragraphs
- [ ] Upload journal entry → receives conversational paragraphs
- [ ] No headers/bullets in responses
- [ ] Warm, peer-like tone maintained
- [ ] Five-Step Delivery Framework followed
- [ ] Chart geometry properly extracted and used

---

## Files Modified

1. **lib/prompts.ts**
   - Lines 1-6: Fixed corrupted introduction
   - Impact: System instructions now load correctly

2. **app/api/chat/route.ts**
   - Lines 580-598: Rewrote JSON and journal upload prompts
   - Impact: Uploads trigger conversational mode, not technical mode

---

## Related Documentation

- `lib/prompts.ts` - Complete Raven Calder persona specification
- `POETIC_BRAIN_PERSONA_AUDIT.md` - Persona design analysis
- `POETIC_BRAIN_SESSION_UPLOAD_FIXES.md` - Upload detection fixes
- `USER_FACING_MARKDOWN_DESIGN.md` - Final output template

---

## Status

✅ **COMPLETE** - Both issues fixed, ready for testing

**Next Step:** Test with real uploads to verify conversational tone is restored.
