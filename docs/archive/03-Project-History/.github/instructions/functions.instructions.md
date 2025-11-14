# Serverless Functions Instructions

These rules apply to Netlify functions stored in `netlify/functions/` and any supporting modules under `lib/`.

## Structure & Naming
- Each function file must export `export const handler = async (event, context) => { ... }`.
- Keep filenames kebab-case (e.g. `astrology-mathbrain.js`).
- Shared helpers belong in `lib/` and are imported into the function file.

## Input Validation & Error Handling
- Validate all query/body params. Return `400` with a descriptive error when required params are missing.
- Wrap external API calls in try/catch. Log errors via `console.error` with contextual metadata.
- Return JSON-encoded responses: `{ statusCode, headers, body: JSON.stringify(payload) }`.
- Never leak secrets or raw stack traces in responses.

## Data & Domain Rules
- Preserve Raven Calder FIELD → MAP → VOICE flow: raw geometry first, then derived metrics, then narrative.
- When modifying seismograph or aspect logic, update corresponding docs (`MATH_BRAIN_COMPLIANCE.md`, etc.).
- Guard privacy: never hardcode personal names; use request payload values or anonymized placeholders.

## Testing & Verification
- Add/update integration tests under `tests/functions/` or Playwright flows that exercise the function.
- Run `npm run test` (Jest/Vitest) and `netlify dev` to confirm the function works in the local Netlify runtime.
- If schema changes, update consumers (frontend hooks, Poetic Brain) and document the change.

## Deployment Checks
- Ensure environment variables are accessed via `process.env.*` and documented in `.env.example`.
- Coordinate with CI (copilot-setup-steps) so builds install required deps before invoking the function.
