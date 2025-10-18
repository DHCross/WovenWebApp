# Poetic Brain Integration

This project includes a self-contained `poetic-brain` module (FIELD → MAP → VOICE narrative layer) powered by the **Perplexity API**. We intentionally **do not rewrite or duplicate** its logic—only provide a safe adapter + API surface. For a deep dive into Actor/Role diagnostics, see `ACTOR_ROLE_OVERVIEW.md`.

## Directory Layout
```
poetic-brain/
  src/index.ts          # Exports generateSection(sectionType, inputPayload)
  api/handler.ts        # (Optional) Vercel-style function wrapper
  test/generateSection.test.ts
```

## Adapter
`lib/poetic-brain-adapter.ts` is a thin wrapper used by the Next.js API route. Add validation or caching there (not inside `poetic-brain`).

## API Route
`POST /api/poetic-brain`
Body:
```json
{ "sectionType": "MirrorVoice", "inputPayload": { /* structured geometry */ } }
```
Response:
```json
{ "success": true, "text": "Generated narrative for MirrorVoice" }
```

## Extension Points
| Layer | Purpose | Add In |
|-------|---------|--------|
| Validation | Ensure payload matches geometry schema | Adapter layer |
| Caching | Avoid duplicate generation for identical inputs | Adapter or API route |
| Streaming | Switch to streamed VOICE | New route variant (e.g. `/api/poetic-brain/stream`) |
| Section Registry | Map UI names → `sectionType` tokens | Adapter |

## Guardrails
1. Don’t push astrology math into Poetic Brain—keep it geometry-consumer only.
2. Don’t mutate incoming payloads; derive ephemeral summaries client-side if needed.
3. Keep output falsifiable (testable against provided structure) and non-deterministic within acceptable bounds.

## Next Steps (Optional)
- Add schema: create `schemas/poetic-brain-payload.ts` with Zod.
- Add test hitting `/api/poetic-brain` via `fetch` in a Node environment.
- Introduce a cache key: hash(JSON.stringify({sectionType, payload})).

---
Lightweight by design—extend via adapter, not core module edits.
