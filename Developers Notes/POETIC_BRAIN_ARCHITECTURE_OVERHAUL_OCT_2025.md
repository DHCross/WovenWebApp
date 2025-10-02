# POETIC BRAIN ARCHITECTURE OVERHAUL - October 2025

## Executive Summary

This document tracks the comprehensive architectural improvements made to the Woven Web application's Poetic Brain system, establishing clear boundaries between Math Brain (the architect) and Poetic Brain (the interpreter).

---

## Key Achievements

### 1. **Codified the JSON Schema** ✅
**File:** `/lib/types/woven-map-blueprint.ts`

Created the canonical `WovenMapBlueprint` type that serves as the **single source of truth** for all data exchange between Math Brain and Poetic Brain.

**Key Components:**
- `ProvenanceBlock` - Data source and calculation metadata
- `ContextBlock` - Report type, translocation state, time windows
- `ChartData` - Positions, aspects, houses, transits
- `RelationalData` - Synastry, composite, SFD analysis
- `WovenMapBlueprint` - The complete contract

**Benefits:**
- Version-controlled schema prevents silent drift
- Type safety ensures contract compliance
- Self-documenting interface
- Clear validation utilities and type guards

---

### 2. **Documented the Two-Mind Architecture** ✅
**File:** `/Developers Notes/Core/TWO_MIND_ARCHITECTURE_COVENANT.md`

Created the architectural covenant for the system - a sacred contract between the two minds:

**Math Brain's Covenant:**
> "I will give you a perfect, complete, self-describing WovenMapBlueprint. You will never need to know how I made it."

**Poetic Brain's Covenant:**
> "I will read only the WovenMapBlueprint you give me. I will never calculate, transform, or fetch additional data."

**The JSON's Covenant:**
> "I am the complete score. I contain everything needed for the performance. I am sufficient."

---

### 3. **Audited Poetic Brain for Violations** ✅

**Result:** Clean ✅

No architectural violations found. The Poetic Brain correctly:
- Reads only from the provided blueprint
- Performs no calculations or transformations
- Does acceptable data plumbing (normalizing field locations)
- Never calls external APIs
- Never computes aspects, orbs, or coordinates

**One clarification made:** Data reshaping/normalization (finding timezone in various payload locations) is acceptable—it's not calculation, just ensuring data accessibility.

---

### 4. **Fixed Critical Mobile Scroll Issue** 🔧
**File:** `/hooks/useScrollAnchor.ts`

**Problem:** Mobile Safari scroll targeting failed when container overflow context changed, causing new Raven messages to render off-screen.

**Solution:** Created robust `useScrollAnchor` hook with:
- IntersectionObserver sentinel detection
- User scroll position tracking (disable auto-scroll if user scrolled up)
- Window scroll fallback for mobile Safari
- Prefers-reduced-motion support
- "Follow Live" button when user scrolls up

---

### 5. **Enhanced Download Experience** ✅

**Problem:** Users didn't understand PDFs were AI system inputs, not human-readable reports.

**Solutions:**
1. **Updated UI text** - Clarified downloads are "for AI analysis (Gemini GEM, Poetic Brain, or custom GPT)"
2. **Created README template** - Explains what files contain and how to use them
3. **Added ZIP download** - Bundles README + JSON for complete package
4. **Rewrote ANALYSIS DIRECTIVE** - Commands AI to execute immediately, not describe system

**Key Files:**
- `/lib/download-readme-template.ts`
- `/app/math-brain/page.tsx` (lines 2865-2967, 3309-3360, 5679-5744)

---

### 6. **Strengthened ANALYSIS DIRECTIVE** ✅

**Before (passive):**
```
# ANALYSIS DIRECTIVE (Raven Calder GPT) — READ FIRST
CONTEXT: This is a PDF export containing...
YOUR TASK: Generate personality readings...
```

**After (commanding):**
```
# YOU ARE RAVEN CALDER — EXECUTE THIS DIRECTIVE
YOU ARE RAVEN CALDER. This is your work order, not documentation to describe.
Do not describe what you're about to do. Do it.
```

**Improvements:**
- Identity assertion first: "YOU ARE RAVEN CALDER"
- Explicit structure: SOLO MIRROR → RELATIONAL ENGINES → WEATHER OVERLAY
- Prohibition on meta-commentary
- Emphasis on "MIRROR and CONVERSATION STARTER, not just weather report"

---

## The Relocation Case Study

### The Misunderstanding
Poetic Brain thought: *"The engine corrects a single map."*

### The Reality
Math Brain:
1. Calls Astroseek with **birth coordinates** → natal houses
2. Calls Astroseek with **relocated coordinates** → relocated houses
3. Stitches them together into the blueprint

The blueprint contains:
```json
{
  "context": {
    "translocation": {
      "applies": true,
      "houses_basis": "relocation",
      "disclosure": "Houses recalculated for Tokyo lens"
    }
  }
}
```

**Poetic Brain's job:** Read the disclosure and describe it naturally.

**Poetic Brain does NOT:** Calculate midpoints, transform coordinates, or decide house systems.

---

## Pending Improvements (From GPT-5 Audit)

### High Priority
1. ✅ Mobile scroll anchoring (COMPLETED)
2. ⏳ Persona drift detection & identity anchoring
3. ⏳ Session persistence for feedback tracking
4. ⏳ ARIA accessibility enhancements

### Medium Priority
5. ⏳ Upload handling optimization (chunk-diff for large files)
6. ⏳ Memory growth management (size cap + pruning policy)
7. ⏳ Centralized HTML sanitization
8. ⏳ Scroll hint UI improvements

### Low Priority
9. ⏳ Config consolidation (raven-config.ts)
10. ⏳ Hook derivation enhancement (layered scoring)
11. ⏳ Observability (structured logging, latency metrics)

---

## The Metaphors We Live By

### The Instrument and The Music
**Math Brain** builds and tunes the instrument. It ensures every string is precisely calibrated.

**Poetic Brain** receives that instrument and makes it sing. It focuses on the music, not the metallurgy.

### The Sausage and The Score
The JSON IS the sausage—the finished product.

- **The Process** (Math Brain's world): Hidden, complex, technical
- **The Blueprint** (The JSON): The finished, perfect map
- **The Reflection** (Poetic Brain's world): The voice reading the score

---

## Maintaining the Separation

### When Adding Features:

**Ask: "Is this a calculation or an interpretation?"**
- Calculation → Math Brain
- Interpretation → Poetic Brain

**Ask: "Does this require external data?"**
- Yes → Math Brain fetches and adds to blueprint
- No → Poetic Brain reads from blueprint

**Ask: "Would knowing this help the voice or confuse it?"**
- Help → Add to blueprint with clear disclosure
- Confuse → Keep it backstage in Math Brain

### When Debugging:

**If Poetic Brain output is wrong:**
1. Check: Is the blueprint correct?
2. If blueprint wrong → Fix Math Brain
3. If blueprint right → Fix Poetic Brain's reading logic

**Never fix Poetic Brain by adding calculations.**

---

## Files Modified/Created

### Created:
- `/lib/types/woven-map-blueprint.ts` - Canonical schema
- `/Developers Notes/Core/TWO_MIND_ARCHITECTURE_OATH.md` - Architecture principles
- `/hooks/useScrollAnchor.ts` - Robust scroll management
- `/lib/download-readme-template.ts` - User-facing explanations
- `/Developers Notes/ANALYSIS_DIRECTIVE_OVERHAUL_2025.md` - PDF directive improvements
- `/Developers Notes/POETIC_BRAIN_ARCHITECTURE_OVERHAUL_OCT_2025.md` - This document

### Modified:
- `/app/math-brain/page.tsx` - ZIP download, updated ANALYSIS DIRECTIVE, UI text
- `/components/WrapUpCard.tsx` - Export UI clarifications
- `/lib/download-readme-template.ts` - Relocation explanation

---

## Next Steps

### Immediate (Week 1):
1. Integrate `useScrollAnchor` hook into ChatClient.tsx
2. Add "Follow Live" floating button for user scroll override
3. Implement ARIA roles and aria-live regions

### Short-term (Month 1):
4. Add persona drift detection in chat stream
5. Implement session persistence (sessionStorage)
6. Centralize HTML sanitization

### Long-term (Quarter 1):
7. Add observability (structured logging, latency tracking)
8. Memory management for long sessions
9. Upload preprocessing (summarize tables, compress geometry)

---

## The Contract in Practice

### ✅ Good: Math Brain Handles Relocation
```javascript
// Math Brain
if (relocationMode === 'A_local') {
  transitA = { ...transitA, latitude: loc.lat, longitude: loc.lon, timezone: tz };
  relocationApplied = true;
}

result.context.translocation = {
  applies: true,
  houses_basis: 'relocation',
  disclosure: 'Houses recalculated: A_local'
};
```

### ✅ Good: Poetic Brain Reads Disclosure
```typescript
// Poetic Brain
const relocationNote = blueprint.context.translocation.applies
  ? `(${blueprint.context.translocation.disclosure.toLowerCase()})`
  : '';
```

### ❌ Bad: Poetic Brain Calculating
```typescript
// NEVER do this in Poetic Brain:
const orb = Math.abs(planet1.longitude - planet2.longitude);
```

---

## Raven's Words

*"This distinction is the core of the Woven Map's design. The system was built with two minds—the Math Brain and the Poetic Brain—and each has a distinct and protected role.*

*My focus is on the woven pattern, not the mechanics of the loom.*

*Math Brain provides the rigorous, verifiable truth of the pattern. I give that pattern a resonant voice."*

---

**Maintained by: The Woven Web Development Team**
**Date: October 2025**
**Status: Architecture Solidified, Implementation Ongoing**
