# Architecture.md - Woven Map Poetic Brain (Actual State)

**Date:** 2025-01-21  
**Status:** Production (Next.js Route + Netlify Legacy)  
**Last Updated:** After ground truth sync with Codex

---

## Single Source of Truth

This document describes the **actual, deployed architecture**. It replaces all previous claims about "Clear Mirror parser/adapter/template" or "app/api/raven/route.ts" — those files do not exist.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (index.html or app/page.tsx)                      │
│  User uploads Mirror + Symbolic Weather JSON                │
└──────────────────────┬──────────────────────────────────────┘
                       │ POST /api/poetic-brain
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  app/api/poetic-brain/route.ts (Line 112)                   │
│  - Zod validation (payload schema)                          │
│  - Math adapter stub (processWithMathBrain)                 │
│  - Render pipeline entry                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │ renderMirrorDraft(data, options)
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  lib/pipeline/mirrorRenderer.ts (Line 96)                   │
│  - Dynamic import @/lib/raven/render (if RAVEN_RENDER_      │
│    INTEGRATION ≠ '0')                                       │
│  - Fallback to local rendering if import fails              │
│  - 5-key merge guarantee (Line 114–125)                     │
│  - Attach relational data (Line 123, 135)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ IF renderer available:
                       │   call render(data, options)
                       │ ELSE:
                       │   use local fallback
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  lib/raven/render.ts (Line 42)                              │
│  - Entry point: buildAppendix(draft, options)               │
│  - Try import @/src/formatter/...enhanced.js                │
│  - If success: appendix.reader_markdown = format result     │
│  - If fail: skip reader_markdown                            │
│  - Always return appendix with 5 keys + relational data     │
└──────────────────────┬──────────────────────────────────────┘
                       │ appendix includes:
                       │   - reader_markdown (longform narrative)
                       │   - relational_context (echo input)
                       │   - relational (placeholder shapes)
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  src/formatter/create_markdown_reading_enhanced.js          │
│  (Line 23)                                                  │
│  - Accepts: geometry + relational data                      │
│  - Outputs: markdown sections (FIELD → MAP → VOICE)         │
│  - Always uses "symbolic_climate" terminology (not "climate")│
│  - Return: formatted markdown string                        │
└──────────────────────┬──────────────────────────────────────┘
                       │ return to render.ts
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  Merge relational scaffolding                               │
│  lib/pipeline/relationalAdapter.ts (Line 1)                 │
│  - Placeholder synastry_aspects[]                           │
│  - Placeholder composite_midpoints[]                        │
│  - Placeholder shared_symbolic_climate{}                    │
│  - Placeholder cross_symbolic_climate{}                     │
│  Attached to draft.appendix.relational                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  Return Response (Line 112)                                 │
│  {                                                          │
│    type: 'mirror',                                          │
│    version: '1.0',                                          │
│    draft: {                                                 │
│      picture: string,                                       │
│      feeling: string,                                       │
│      container: string,                                     │
│      option: string,                                        │
│      next_step: string,                                     │
│      appendix: {                                            │
│        reader_markdown?: string,                            │
│        relational_context?: {...},                          │
│        relational?: {                                       │
│          synastry_aspects?: [...],                          │
│          composite_midpoints?: [...],                       │
│          shared_symbolic_climate?: {...},                   │
│          cross_symbolic_climate?: {...}                     │
│        }                                                    │
│      }                                                      │
│    }                                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Files (Verified to Exist)

### API Entry Point
- **`app/api/poetic-brain/route.ts`** (Line 112)
  - Validates incoming JSON with Zod
  - Calls math adapter stub
  - Invokes renderMirrorDraft
  - Returns standardized response

### Pipeline
- **`lib/pipeline/mirrorRenderer.ts`** (Lines 96, 114, 135)
  - Dynamic import of Raven renderer (if enabled)
  - 5-key merge guarantee
  - Relational data attachment
  
- **`lib/raven/render.ts`** (Lines 42, 66–75)
  - Renderer entry point
  - Attempts formatter import
  - Builds appendix with reader_markdown
  
- **`lib/pipeline/relationalAdapter.ts`** (Line 1)
  - Returns relational placeholder shapes
  - Passed via `options.relational`
  - Merged into `draft.appendix.relational`

### Formatter
- **`src/formatter/create_markdown_reading_enhanced.js`** (Lines 23, 44, 48)
  - Markdown generation with section structure
  - Enforces "Shared Symbolic Climate" and "Cross Symbolic Climate" terminology
  - Never uses "climate" alone

### Legacy (Netlify)
- **`netlify/functions/poetic-brain.js`** (Line 1)
  - Gemini 1.5 Flash LLM
  - JWT auth via Auth0 JWKS
  - Not used by Next.js route (legacy only)

---

## Response Shape (Authoritative)

```typescript
{
  type: 'mirror',
  version: '1.0',
  draft: {
    // Five required keys (always present)
    picture: string,              // Sensory/visual impression
    feeling: string,              // Emotional resonance
    container: string,            // Holding structure / context
    option: string,               // Choice / alternative path
    next_step: string,            // Immediate action or inquiry
    
    // Optional appendix (added by renderer if available)
    appendix?: {
      // Longform narrative from formatter (if enabled)
      reader_markdown?: string;
      
      // Echo of input relational context (if provided)
      relational_context?: {
        type?: string;
        relationship_type?: string;
        intimacy_tier?: string;
        contact_state?: string;
        [k: string]: any;
      };
      
      // Relational scaffolding (currently placeholders)
      relational?: {
        synastry_aspects?: Array<{
          from: string;           // e.g., "Sun (A)"
          to: string;             // e.g., "Moon (B)"
          type: string;           // e.g., "opposition", "trine"
          orb_deg?: number;
          weight?: number;
        }>;
        
        composite_midpoints?: Array<{
          point: string;          // e.g., "Venus"
          longitude?: number;     // 0-360
          sign?: string;          // e.g., "Libra"
          house?: number;
        }>;
        
        shared_symbolic_climate?: {
          magnitude?: number;     // Field strength
          valence?: number;       // -10 to +10 quality
          volatility?: number;    // Instability index
          drivers?: string[];     // Primary aspects
        };
        
        cross_symbolic_climate?: {
          magnitude?: number;
          valence?: number;
          volatility?: number;
          drivers?: string[];
        };
      };
    };
  };
}
```

---

## Environment Toggles

### `RAVEN_RENDER_INTEGRATION`

- **When NOT set or `!== '0'`:** Pipeline prefers Raven renderer (`lib/raven/render.ts`)
  - Attempts to attach `appendix.reader_markdown` from formatter
  - Falls back to local rendering if import fails
  - Always guarantees 5 keys + relational data

- **When set to `'0'`:** Force local fallback renderer
  - Skips dynamic import attempt
  - Uses built-in rendering
  - Useful for debugging or performance isolation

---

## Terminology Rule (Enforced)

### ✅ Correct
- `shared_symbolic_climate`
- `cross_symbolic_climate`
- `Shared Symbolic Climate` (in markdown)
- `Cross Symbolic Climate` (in markdown)

### ❌ Incorrect (Never Use)
- `climate` (alone)
- `shared_climate` (missing "symbolic")
- `cross_climate` (missing "symbolic")

**Enforced in:**
- `src/formatter/create_markdown_reading_enhanced.js` (lines 44, 48)
- Response shape and documentation

---

## Known Limitations (Tracked)

### Current Placeholders
- `relational.synastry_aspects` — returns empty or placeholder data
- `relational.composite_midpoints` — returns empty or placeholder data
- `shared_symbolic_climate` — placeholder structure, no real computation
- `cross_symbolic_climate` — placeholder structure, no real computation
- Formatter Dialogue Voice section — scaffolded but placeholder content
- Formatter Dual Polarity section — scaffolded but placeholder content

### Optional Future Enhancements
- `appendix.provenance_a` / `appendix.provenance_b` — dual provenance (source, rectification, confidence)
- Stricter Zod validation for `relational_context` input
- Real synastry/composite mathematical calculations
- Extended formatter sections with real narrative

---

## What Does NOT Exist

These are frequently mentioned but do **not exist** in this repo:

```
❌ lib/raven/clear-mirror-parser.ts
❌ lib/pdf/clear-mirror-context-adapter.ts
❌ lib/templates/clear-mirror-template.ts
❌ lib/prompts/clear-mirror-auto-execution.ts
❌ CLEAR_MIRROR_UNIFIED_SCHEMA.md
❌ app/api/raven/route.ts
❌ components/ChatClient.tsx (referenced in old CHANGELOG; file does not exist)
```

If you see references to these files, they are either:
1. Outdated documentation
2. False claims from earlier AI assistants
3. Planned work that was never completed

---

## Safe Next Steps (Recommended Order)

### Priority 1: Dual Provenance
Add source tracking to appendix:
```typescript
appendix.provenance_a?: {
  source?: string;           // e.g., "natal", "transit"
  rectification_status?: string;
  map_reference?: string;
  confidence?: number;
};
```
**Impact:** Additive. No breaking changes. Improves data traceability.

### Priority 2: Real Synastry/Composite Math
Replace placeholder shapes with actual calculations in `lib/pipeline/relationalAdapter.ts`.
**Impact:** Formatter gets real data to work with.

### Priority 3: Extend Formatter Sections
Enrich Dialogue Voice and Dual Polarity with real narrative using relational data.
**Impact:** Reader markdown becomes richer, more useful.

### Priority 4: Stricter Input Validation
Add permissive Zod block for `relational_context` in API route.
**Impact:** Can fail early on invalid relational inputs.

---

## Semantic Boundary: Blueprint vs. Weather

This is the **foundational distinction** for falsifiability:

### Blueprint / Baseline / Natal Geometry (Inner Structure—Static)
- The **permanent pattern**, the skeleton, the vessel
- The native chart geometry (sun/moon/rising, aspects, placements)
- Fields of tension/ease that define enduring patterns
- Always present; never "activated" or "dormant"
- **Never uses "weather" terminology**

**Language:** "blueprint," "baseline," "natal geometry," "enduring field," "inner architecture"

**Example:** "Saturn conjunct Venus in your natal chart tends to compress relational ease."

### Symbolic Weather (External Activation—Dynamic)
- **Transits, progressions, directions**—the sky in motion
- Activations pressing against the static map
- Temporal, ephemeral (changes with time)
- **Only uses "weather" terminology when active transiting geometry exists in data**

**Language:** "symbolic weather," "atmospheric," "sky pressing," "activating," "in transit"

**Example:** "Saturn transiting your natal Venus tends to intensify relational friction."

### The Linguistic Firewall (Enforced)

**Core Rule:** Do not confuse the vessel (blueprint) for the tide (weather). This collapses falsifiability.

| Context | Language to Use | Language to Avoid |
|---------|-----------------|-------------------|
| Describing natal chart alone | Blueprint/baseline/natal geometry/field | Weather/atmospheric/pressing |
| Describing transits pressing natal | Weather/atmospheric/sky in motion | Blueprint (use only for comparison) |
| Both blueprint + transits | Make distinction explicit | Mixing without clarity |
| No transits in data | Blueprint language only | Any weather terminology |

**Enforcement Points:**
- `tests/e2e/poetic-brain.temporal-integrity.spec.ts` (Test 4: Symbolic weather semantic sanity check)
- `scripts/raven-lexicon-lint.js` can extend to flag weather language without active transits
- Formatter logic in `src/formatter/create_markdown_reading_enhanced.js` should check `data.transits` before using weather language

---

## Raven Calder: E-Prime & Lexical Firewall

### E-Prime Discipline

The Raven voice operates in **E-Prime**—English without the verb "to be" (is/are/was/were/am/be). This isn't grammatical austerity; it's philosophical hygiene.

**Why E-Prime:**
1. **Keeps agency alive** — Nothing is fixed. Every statement stays conditional (may/might/could).
2. **Maintains falsifiability** — "This geometry tends to produce friction" can be tested. "This aspect is chaotic" cannot.
3. **Aligns Poetic Brain with Math Brain** — Math describes correlation, not ontology. E-Prime forces poetry to do the same.
4. **Protects emotional resonance** — "Avoidance sometimes shows up when this tension activates" vs. "You are avoidant."
5. **Fits the Raven's ethics** — Observe, never declare law.

### The "Do-Not-Touch" List

Eight categories of forbidden language enforced by `scripts/raven-lexicon-lint.js`:

1. **Static identity language** — No is/are/was/were in user-facing text
2. **Deterministic phrases** — No destined/fated/meant to/always/never
3. **Moralizing adjectives** — No good/bad/right/wrong/toxic/pure/evil
4. **Psychoanalytic certainty** — No "You fear..." or "You secretly want..."
5. **Esoteric authority** — No channeling/divine message/soul contract
6. **Binary emotions** — No happy/sad as verdicts; use expansive/constricted
7. **Abstract fluff** — Define jargon precisely or retire it
8. **Passive absolutes** — No "for a reason" / "everything happens"

**Enforcement:**
```bash
npm run raven:lint  # Scans lib/legacy, src/formatter, lib/pipeline
npm run lint:all    # Runs ESLint + Raven lint
```

**Human-in-the-Loop Quality:**
```bash
npm run raven:audit  # Samples 10% of outputs for tone nuance review
```

Automated tests catch correctness (schema, E-Prime, Safe Lexicon).  
Manual audits catch tone drift that only human ears detect.  
See `docs/RAVEN_RESONANCE_AUDIT_GUIDE.md` for full review process.

**Implementation:**
- Voice templates in `lib/legacy/polarityHelpers.js` use only conditional verbs
- FIELD layer uses noun phrases without static verbs
- Safe Lexicon descriptors use process language
- Agency Hygiene clause reminds users of conditional nature

---

## For External AI Assistants

If you're reading this:

1. **This is the truth.** All files listed above under "Key Files (Verified to Exist)" actually exist on disk. Everything else is fiction.

2. **No Clear Mirror parser pipeline.** There is no separate parser→adapter→template chain. The renderer dynamically imports a formatter and attaches markdown directly to the response.

3. **No /api/raven route.** The Poetic Brain route is at `/api/poetic-brain` only.

4. **Relational data is scaffolding.** Synastry and composite are currently placeholder shapes. This is known and tracked.

5. **Environment toggle controls rendering.** `RAVEN_RENDER_INTEGRATION` gates the dynamic import of the Raven renderer.

6. **Terminology is strict:** Only "symbolic climate", never "climate" alone. Enforced in code.

---

## References

- **Ground Truth Inventory:** `GROUND_TRUTH_INVENTORY_2025_01_21.md`
- **API Route:** `app/api/poetic-brain/route.ts:112`
- **Renderer:** `lib/pipeline/mirrorRenderer.ts:96`
- **Formatter:** `src/formatter/create_markdown_reading_enhanced.js:23`
- **Relational Adapter:** `lib/pipeline/relationalAdapter.ts:1`

---

**Authoritative as of:** 2025-01-21  
**Next sync:** When Phase 1 refactoring or Safe Next Steps are implemented
