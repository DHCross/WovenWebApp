# Poetic Brain Test Page — Upload + Simulate

This guide explains how the Raven Calder Poetic Brain test page works, how to run it locally, and what to expect when you upload a Mirror + Symbolic Weather JSON.

---

## Overview
- Test page location: `app/page.tsx:5`
- API endpoint: `app/api/poetic-brain/route.ts:112`
- Renderer bridge: `lib/pipeline/mirrorRenderer.ts:97` → `lib/raven/render.ts:42`
- Longform markdown (if available): `draft.appendix.reader_markdown`
- Five-key contract is always present: `picture`, `feeling`, `container`, `option`, `next_step`

---

## How It Works
1. You click “Upload JSON” on the homepage.
   - File picker wiring: `app/page.tsx:53`
   - Upload handler posts the file JSON to `/api/poetic-brain`: `app/page.tsx:20`
2. The route validates the payload and derives minimal geometry.
   - Next Route Handler: `app/api/poetic-brain/route.ts:112`
3. The pipeline tries to use the Raven renderer; falls back to local draft if unavailable.
   - Dynamic import (toggle via env): `lib/pipeline/mirrorRenderer.ts:93`
   - Import path: `lib/pipeline/mirrorRenderer.ts:97`
   - Five-key merge and safe appendix attach: `lib/pipeline/mirrorRenderer.ts:125` and `lib/pipeline/mirrorRenderer.ts:135`
4. If the renderer is available, it calls the markdown formatter and adds `reader_markdown`.
   - Renderer entry: `lib/raven/render.ts:42`
   - Formatter import: `lib/raven/render.ts:16`
   - Append markdown: `lib/raven/render.ts:73`

---

## Run In Dev
- Start dev server: `npm run dev`
- Open: `http://localhost:3000/`
- Click “Upload JSON” and choose a file (see Sample Payloads below)
- Expect: green “Upload complete.” and the five narrative keys in the panel
  - Success cue: `app/page.tsx:36`
  - Keys displayed: `app/page.tsx:66`

---

## Toggle the Renderer (Optional)
- Env toggle: `RAVEN_RENDER_INTEGRATION`
  - Enabled (default): any value except `'0'`
  - Disabled (force fallback): set to `'0'`
- Behavior:
  - Enabled: pipeline tries `@/lib/raven/render` (dynamic import)
  - Disabled or on failure: local builder produces the five-key draft
- Code anchors: `lib/pipeline/mirrorRenderer.ts:93`, `lib/pipeline/mirrorRenderer.ts:97`

---

## Sample Payloads
- Minimal sample (ships with repo): `test-data/mirror-symbolic-weather-sample.json`
- Reader + Reflection header (optional but recommended):
  - Put this at the top level of your JSON to signal narrative mode
  - Any of these keys are accepted: `Woven_Header`, `Woven Header`, `WovenHeader`
```
"Woven_Header": {
  "mode": "Reader+Reflection",
  "subject_name": "Subject",
  "reader_id": "RavenCalder",
  "include_persona_context": true,
  "map_source": "Woven Map Probabilistic Field Lexicon 9.8.25",
  "integration_mode": "Full Interpretive",
  "reference_date": "2025-11-08",
  "relational_context": {
    "type": "PARTNER",
    "intimacy_tier": "P3",
    "contact_state": "ACTIVE"
  }
}
```
- With header + renderer enabled, the response includes `draft.appendix.reader_markdown` (longform markdown). The UI shows the five keys; to view the markdown, open DevTools → Network → the POST response.

---

## What You’ll See
- Always (fallback or renderer): the five keys in the output panel
- If header present and renderer/formatter available: `appendix.reader_markdown` with structured sections
- If relational context present: `appendix.relational_context` echo + placeholder relational scaffold under `appendix.relational`
  - Placeholders include: `synastry_aspects`, `composite_midpoints`, `shared_symbolic_climate`, `cross_symbolic_climate`
  - Terminology is “symbolic climate” (never “climate” alone)

---

## Troubleshooting
- Module not found for renderer: mitigated — a local stub exists at `lib/raven/render.ts:1`
- No longform text: ensure `RAVEN_RENDER_INTEGRATION` ≠ `'0'` and the formatter exists at `src/formatter/create_markdown_reading_enhanced.js:23`
- 400 “Unsupported payload”: the route accepts either a mirror directive or combined mirror+weather with recognizable markers (see `app/api/poetic-brain/route.ts:116`)
- UI shows error: open DevTools console; the test page logs upload lifecycle: `app/page.tsx:24`

---

## Internals (Quick Pointers)
- Header extraction and pass‑through: `lib/pipeline/mirrorRenderer.ts:100`
- Relational placeholders (non‑breaking, additive):
  - Computed: `lib/pipeline/relationalAdapter.ts:1`
  - Attached: `lib/pipeline/mirrorRenderer.ts:135`
- Five‑key merge guarantee: `lib/pipeline/mirrorRenderer.ts:129`

---

## Safe Defaults
- Production safety lever: set `RAVEN_RENDER_INTEGRATION=0` to force local drafts
- The five‑key API never breaks; everything else appears under `draft.appendix`

---

## Quick Test Script (optional)
- E2E test demonstrates the upload flow and verifies the five keys:
  - `tests/e2e/poetic-brain.ui.spec.ts:1`

