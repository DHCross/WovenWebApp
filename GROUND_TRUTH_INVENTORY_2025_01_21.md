# Ground Truth Inventory - 2025-01-21

**Purpose:** Accurate mapping of actual files and functions in the repo, to resolve discrepancies caused by multiple AI assistants describing different/fictitious code.

---

## Directory Structure (Verified)

### Root Level
```
/app/                          # Next.js app directory
/lib/                          # TypeScript utility libraries
/netlify/                      # Netlify serverless functions
/src/                          # Static JavaScript sources
/index.html                    # Main frontend (12,261 lines)
/app/page.tsx                  # Next.js landing page (simple test form)
```

### /lib/ Structure
```
/lib/
  ├── pipeline/
  │   ├── mathBrainAdapter.ts
  │   ├── mirrorRenderer.ts       [VERIFIED] Lines 96, 114, 135
  │   └── relationalAdapter.ts
  └── raven/
      └── render.ts               [VERIFIED] Lines 42, 66
```

**Note:** NO `/lib/pdf/`, NO `/lib/prompts/`, NO `/lib/raven/clear-mirror-parser.ts`

### /app/api/ Structure
```
/app/api/
  ├── health/
  │   └── route.ts
  └── poetic-brain/
      └── route.ts             [VERIFIED] Line 112 - Next.js handler, Zod validation, math adapter stub
```

**Note:** NO `/app/api/raven/route.ts`

### /netlify/functions/ Structure
```
/netlify/functions/
  ├── astrology-mathbrain.js   [Gemini API - NOT used by Next.js]
  ├── astrology-health.js
  ├── auth-config.js
  ├── poetic-brain.js          [VERIFIED] Line 1 - Gemini + JWT guard
  └── logger.js
```

### /src/ Structure
```
/src/
  ├── balance-meter.js
  ├── formatter/
  │   └── create_markdown_reading_enhanced.js  [VERIFIED] Line 23
  ├── normalizers/
  ├── parsers/
  ├── reporters/
  ├── schemas/
  ├── types/
  └── raven-lite-mapper.js
```

### Frontend Files
```
/index.html                        [12,261 lines] Static HTML + JavaScript
/app/page.tsx                      [Simple Next.js test form, ~100 lines]
```

**Note:** NO `/components/ChatClient.tsx` - This is referenced in CHANGELOG but does not exist in repo

---

## API Flow (Actual)

### Current Poetic Brain Route

**Endpoint:** `POST /api/poetic-brain`  
**Handler:** `/app/api/poetic-brain/route.ts` (line 112)  
**Architecture:**
1. Accepts JSON payload (Zod validated)
2. Calls math adapter stub
3. Attempts dynamic import of `@/lib/raven/render` (if available)
4. Falls back to local rendering if import fails
5. Returns: `{ type: 'mirror', version: '1.0', draft }`

**Response shape (current):**
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
      // Longform narrative from renderer→formatter (if available)
      reader_markdown?: string,
      // Echo of any provided relational context
      relational_context?: {
        type?: string;
        relationship_type?: string;
        intimacy_tier?: string;
        contact_state?: string;
        [k: string]: any;
      };
      // Relational scaffolding (placeholder math; additive, optional)
      relational?: {
        synastry_aspects?: Array<{ from: string; to: string; type: string; orb_deg?: number; weight?: number }>;
        composite_midpoints?: Array<{ point: string; longitude?: number; sign?: string; house?: number }>;
        shared_symbolic_climate?: { magnitude?: number; valence?: number; volatility?: number; drivers?: string[] };
        cross_symbolic_climate?: { magnitude?: number; valence?: number; volatility?: number; drivers?: string[] };
      };
    };
  };
}
```

### Renderer Pipeline (`/lib/raven/render.ts`)

**Entry:** Line 42  
**Dynamic Import:** Attempts to load `@/src/formatter/create_markdown_reading_enhanced.js`  
**Appendix Building:** Line 66 - Adds `reader_markdown` if formatter available  
**5-Key Guarantee:** `mirrorRenderer.ts` (line 114) ensures five keys always present via local fallback

### Relational Scaffolding (`/lib/pipeline/relationalAdapter.ts`)

**Status:** Outputs placeholder data (non-breaking, additive)  
**Integration:** Passed to renderer via `options.relational` and merged into `draft.appendix.relational` (around lines 123, 135 in `mirrorRenderer.ts`)

---

## Terminology Rule

**All "climate" references are prefixed "symbolic" to avoid confusion:**
- ✅ `shared_symbolic_climate` (correct)
- ✅ `cross_symbolic_climate` (correct)
- ❌ `climate` (incorrect - never use alone)
- ❌ `shared_climate` (incorrect - must prefix "symbolic")

**Enforced in:**
- `src/formatter/create_markdown_reading_enhanced.js` (lines 44, 48)
- `lib/pipeline/relationalAdapter.ts`

---

## Woven Header + Relational Context (Input Handling)

- Top‑level header keys recognized (any of): `Woven_Header`, `Woven Header`, `WovenHeader`.
- Forwarded to renderer as `prov`/`options` and echoed into `draft.appendix` (`prov` and `relational_context`).
- Common header fields: `mode`, `subject_name`, `reader_id`, `integration_mode`, `reference_date`, `include_persona_context`, `map_source`, and optional `relational_context`.

---

## Env Toggle

- `RAVEN_RENDER_INTEGRATION`: when not set to `'0'`, the pipeline prefers the Raven renderer and attaches `appendix.reader_markdown` if the formatter is available. Set to `'0'` to force the local fallback renderer.

---

## Known Gaps (Tracked)

- Dual provenance exposure (`appendix.provenance_a` / `appendix.provenance_b`) — planned.
- Real synastry/composite computations — adapter currently returns placeholders.
- Dialogue Voice and Dual Polarity content — formatter emits placeholder sections pending real math.
- API validation schema for `relational_context` — permissive; stricter Zod model optional.

---

## Phase 1 Refactoring - Target Functions

### PHASE1-T1: Extract raven-narrative.ts

**Target Functions:** NOT FOUND IN REPO
- `buildNarrativeDraft` ❌
- `formatShareableDraft` ❌
- `FieldSection` ❌
- `MapSection` ❌
- `VoiceSection` ❌
- `stripPersonaMetadata` ❌

**Status:** Need to verify - are these supposed to be in `/index.html`? Create file search result shows NO matches.

**Location if they exist:** Likely would be in `/index.html` (12K+ lines) or `/netlify/functions/poetic-brain.js`

### PHASE1-T2: Extract raven-formatting.ts

**Target Functions:** NOT FOUND IN REPO
- `formatIntentHook` ❌
- `formatClimate` ❌
- `formatFriendlyErrorMessage` ❌

**Location if they exist:** Likely `/index.html` or `/src/` files

### PHASE1-T3: Extract report-parsing.ts

**Target Functions:** NOT FOUND IN REPO
- `parseReportContent` ❌
- `detectReportMetadata` ❌
- `mapRelocationToPayload` ❌

**Location if they exist:** Likely `/src/parsers/` or `/index.html`

### PHASE1-T4-T6: Extract Hooks

**Expected targets:** NOT FOUND IN REPO
- `useValidation` hook ❌
- `useFileUpload` hook ❌
- `useRavenRequest` hook ❌

**Note:** No React hooks found in codebase (repo is Next.js/TypeScript but no custom hooks directory visible)

### PHASE1-T7: ChatClient.tsx

**Status:** FILE DOES NOT EXIST ❌
- Referenced in CHANGELOG multiple times
- Not found via file search
- App structure uses `/app/page.tsx` (simple test form) instead

---

## Files Claimed (But Don't Exist)

These were created by earlier AI assistant but are NOT in the repo:

```
✗ lib/raven/clear-mirror-parser.ts
✗ lib/pdf/clear-mirror-context-adapter.ts
✗ lib/templates/clear-mirror-template.ts
✗ lib/prompts/clear-mirror-auto-execution.ts
✗ CLEAR_MIRROR_UNIFIED_SCHEMA.md
✗ CLEAR_MIRROR_IMPLEMENTATION_SUMMARY.md
✗ app/api/raven/route.ts
✗ components/ChatClient.tsx
```

**Evidence:** CHANGELOG.md contains implementation entries for these, but actual files don't exist on disk.

---

## Real API Endpoints (Verified)

### Health Check
- **Route:** `GET /api/health`
- **Handler:** `/app/api/health/route.ts`
- **Status:** ✅ Exists

### Poetic Brain (Next.js)
- **Route:** `POST /api/poetic-brain`
- **Handler:** `/app/api/poetic-brain/route.ts`
- **Status:** ✅ Exists
- **LLM:** Math adapter stub (no real LLM call)
- **Renderer:** Dynamic import of Raven renderer (optional)

### Poetic Brain (Netlify - Legacy)
- **Route:** `/.netlify/functions/poetic-brain`
- **Handler:** `/netlify/functions/poetic-brain.js`
- **Status:** ✅ Exists
- **LLM:** Gemini 1.5 Flash
- **Auth:** JWT verification via Auth0 JWKS

### Math Brain (Netlify)
- **Route:** `/.netlify/functions/astrology-mathbrain`
- **Handler:** `/netlify/functions/astrology-mathbrain.js`
- **Status:** ✅ Exists

---

## Frontend Architecture

### Modern (Next.js)
- **File:** `/app/page.tsx`
- **Type:** Simple test form (React functional component)
- **Features:** File upload, JSON parsing, basic UI
- **Size:** ~100 lines
- **API Call:** POST to `/api/poetic-brain`

### Legacy (Static HTML)
- **File:** `/index.html`
- **Type:** Standalone HTML + inline JavaScript
- **Features:** Complex astrological UI, chart rendering, session management
- **Size:** 12,261 lines
- **Functions:** 
  - `generateClearMirrorReport()` (line 3621)
  - Many unnamed/inline functions
- **Status:** Active, used for actual work (based on code structure)

---

## What Actually Exists vs What Was Claimed

| Item | Claimed | Reality | Status |
|------|---------|---------|--------|
| `lib/raven/clear-mirror-parser.ts` | ✅ Created | ❌ Missing | Fictitious |
| `lib/pdf/clear-mirror-context-adapter.ts` | ✅ Created | ❌ Missing | Fictitious |
| `app/api/raven/route.ts` | ✅ Updated | ❌ Missing | Fictitious |
| `components/ChatClient.tsx` | ✅ Referenced | ❌ Missing | Fictitious |
| `app/api/poetic-brain/route.ts` | ❌ Not mentioned | ✅ Real | ACTUAL |
| `netlify/functions/poetic-brain.js` | ✅ Mentioned (old) | ✅ Real | ACTUAL |
| `/index.html` | ⚠️ Partial refs | ✅ Real (12K lines) | ACTUAL |
| `/app/page.tsx` | ❌ Not mentioned | ✅ Real | ACTUAL |
| Phase 1 target functions | ✅ Specified | ❌ Not found | Unclear origin |

---

## Next Steps for Alignment

### Immediate
1. **Remove false CHANGELOG entries** about Clear Mirror implementation
2. **Clarify Phase 1 targets** - Are functions supposed to be created? Are they in index.html?
3. **Verify artifact uploads** - Why did `create_file` report success but files don't exist?

### For Phase 1 Refactoring
1. **Search `/index.html`** for the specific functions mentioned (buildNarrativeDraft, etc.)
2. **If found:** Extract to separate modules per the plan
3. **If NOT found:** Re-spec what functions should be extracted
4. **Note:** ChatClient.tsx doesn't exist - refactoring target is likely `/index.html` or `/app/page.tsx`

### For Clear Mirror Work
1. **Abandon Clear Mirror files** - they don't exist, don't try to edit them
2. **Work with actual files:**
   - `lib/pipeline/mirrorRenderer.ts`
   - `lib/raven/render.ts`
   - `src/formatter/create_markdown_reading_enhanced.js`
   - `netlify/functions/poetic-brain.js` (Gemini)
   - `app/api/poetic-brain/route.ts` (Next.js handler)

---

## Recommendations

1. **Single source of truth:** Only work with files verified to exist on disk
2. **Tool verification:** After using `create_file`, verify file actually exists in filesystem
3. **CHANGELOG discipline:** Only add entries for work actually completed
4. **Phase 1 planning:** Get explicit confirmation on:
   - Target functions location (index.html? existing modules? to be created?)
   - Extraction strategy (should functions be moved, copied, or rewritten?)
   - Integration points (how will refactored code be called?)
   - Testing strategy (what validations ensure refactoring didn't break anything?)

---

**Document created:** 2025-01-21  
**Verified by:** File system scan + grep search  
**Status:** ✅ Accurate to actual repo state
