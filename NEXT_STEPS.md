# Next Steps - Clarification Needed

**Date:** 2025-01-21  
**Status:** Waiting for guidance on Phase 1 refactoring and architecture

---

## Situation

Multiple AI assistants have been working on this repo, creating confusion:
- ✅ **Real files:** Verified to exist on disk (see GROUND_TRUTH_INVENTORY_2025_01_21.md)
- ❌ **Fictitious files:** Claimed to be created but don't exist
- ⚠️ **Unclear specs:** Phase 1 refactoring targets functions that can't be located

---

## What We Know (Verified)

### Current Architecture
- **Next.js Poetic Brain:** `app/api/poetic-brain/route.ts` ✅
- **Netlify Gemini Poetic Brain:** `netlify/functions/poetic-brain.js` ✅
- **Pipeline:** `lib/pipeline/mirrorRenderer.ts`, `lib/raven/render.ts` ✅
- **Frontend:** `index.html` (12,261 lines) + `app/page.tsx` ✅
- **Formatter:** `src/formatter/create_markdown_reading_enhanced.js` ✅

### Terminology Rule
- All "climate" refs must be "symbolic_climate" ✅
- Enforced in formatter and adapter ✅

### Real API Response Shape
```typescript
{
  type: 'mirror',
  version: '1.0',
  draft: {
    picture: string,
    feeling: string,
    container: string,
    option: string,
    next_step: string,
    appendix?: {
      reader_markdown?: string,
      relational?: {
        synastry, composite, shared_symbolic_climate, cross_symbolic_climate
      }
    }
  }
}
```

---

## What We Need From You

### Question 1: Phase 1 Target Functions

These functions are specified for extraction in Phase 1 but are NOT found in the repo:

```
buildNarrativeDraft
formatShareableDraft
FieldSection
MapSection
VoiceSection
stripPersonaMetadata
formatIntentHook
formatClimate
formatFriendlyErrorMessage
parseReportContent
detectReportMetadata
mapRelocationToPayload
```

**Please clarify:**
- Are these functions supposed to be in `/index.html`?
- Should they be created as part of Phase 1?
- Are the Phase 1 specs based on an older version of the code?
- Should we search `/index.html` for similar/related functions?

### Question 2: Refactoring Target File

Phase 1 targets extraction from `components/ChatClient.tsx`, but that file doesn't exist.

**Please clarify:**
- Is the refactoring target actually `/index.html`?
- Or should we focus on other files in the pipeline?
- Should we create a new ChatClient module as part of Phase 1?

### Question 3: Extraction Strategy

Once we locate the functions:

**Please clarify:**
- Should we move functions to new files, or copy them?
- How should the refactored code be imported/called?
- Should functions be wrapped in modules/classes?
- What tests/validation prove refactoring didn't break anything?

### Question 4: Clear Mirror Work

Earlier work claimed to implement Clear Mirror unified schema, but files don't exist.

**Please clarify:**
- Is Clear Mirror still on the roadmap?
- Should we work with actual files: `lib/pipeline/mirrorRenderer.ts`, `lib/raven/render.ts`, formatter?
- What's the priority: Phase 1 refactoring or Clear Mirror feature?

---

## What We Can Do (Ready Now)

### ✅ High Confidence Work
1. **Search `/index.html`** for Phase 1 target functions
2. **Map line numbers** and function signatures
3. **Extract to new modules** once functions are located
4. **Write unit tests** for extracted functions
5. **Verify no regressions** with integration tests

### ✅ Real Architecture Work
1. **Enhance existing pipeline** (mirrorRenderer, relationalAdapter)
2. **Improve formatter** integration (create_markdown_reading_enhanced.js)
3. **Add relational data** to appendix (synastry, composite, symbolic climates)
4. **Strengthen validation** in poetic-brain route

### ✅ Documentation
1. **Architecture.md** - Document actual system flow
2. **Refactoring guide** - How to extract modules safely
3. **API contract** - Document response shape and error handling

---

## Recommended Next Steps

### Immediate (Today)
1. **Review GROUND_TRUTH_INVENTORY_2025_01_21.md** - Understand what actually exists
2. **Answer Questions 1-4 above** - Clarify Phase 1 specs
3. **Confirm priorities** - What should we work on first?

### Short-term (This Week)
1. **Search index.html** for Phase 1 functions
2. **Begin Phase 1 refactoring** (if specs confirmed)
3. **Or:** Pivot to Clear Mirror work (if higher priority)
4. **Document architecture** as we understand it

### Risk Mitigation
- Only work with files verified to exist
- Verify tool operations actually created files
- Maintain ground truth inventory as we make changes
- Use git commits to track all changes

---

## Files Created (Reference)

- `GROUND_TRUTH_INVENTORY_2025_01_21.md` - Detailed inventory (see this first)
- `GROUND_TRUTH_SUMMARY.md` - Executive summary
- `NEXT_STEPS.md` - This file

Updated:
- `CHANGELOG.md` - Flagged false entry for removal

---

## Waiting For

**Your answers to the four questions above.**

Once we have clarification, we can proceed with confidence knowing we're working with real, verified code.
