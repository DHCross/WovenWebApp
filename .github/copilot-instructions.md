# Copilot Instructions for WovenWebApp

## Project Snapshot

**Product:** Raven Calder / Woven Map astrological analysis system  
**App Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Chart.js visualizations  
**Runtime & Hosting:** Node 18 (Netlify deploys; dev via `netlify dev` or `npm run dev`)  
**Core Flows:** Math Brain report generation (FIELD → MAP JSON exports) and Poetic Brain conversational synthesis (VOICE layer)  
**Two-File Protocol:** Mirror Directive JSON (natal geometry) + Symbolic Weather JSON/Fieldmap (transits). Frontstage copy must never leak raw geometry.

## Project Overview

WovenWebApp is a web-based astrological chart analysis application that generates detailed reports for individuals and relationships using the **Raven Calder** system. The application runs on Next.js App Router (React) and is deployed on Netlify. The `app/` directory is the source of truth for pages and API routes; legacy static HTML is preserved for reference only during migration.

### Core Philosophy (Raven Calder)

* **FIELD → MAP → VOICE:** Raw geometry → structural patterns → narrative synthesis.
* **Geometry‑First & Falsifiable:** Exact planetary angle math precedes language; reflections must land or be discarded.
* **Map, not mandate:** Symbolic weather supports agency; no deterministic claims.

---

## Coding Conventions

* **TypeScript everywhere:** Prefer functional React components with hooks
* **Tailwind for styling:** Use utilities + shared classes in `src/input.css`
* **Use existing helpers in `lib/`** instead of re-implementing (e.g., relocation math, seismograph)
* **Keep comments sparse:** Add only for non-obvious logic
* **Follow FIELD → MAP → VOICE terminology:** Use "symbolic weather," "magnitude," "directional bias," "solo mirror," etc.
* **Respect privacy rule:** Never default to "Dan/Stephie" names in runtime code

---

## Architecture Overview

### Technology Stack

* **Frontend:** Next.js 14 App Router (React 18), TypeScript, Tailwind CSS, Chart.js
* **Backend:** Netlify serverless functions (`netlify/functions/astrology-mathbrain.js`)
* **Data Processing:** `src/raven-lite-mapper.js` (+ `src/seismograph.js` for symbolic scoring)
* **External API:** RapidAPI **Astrologer** (Kerykeion-powered)
* **Deployment:** Netlify with GitHub integration and `@netlify/plugin-nextjs`
* **Styling:** Tailwind CSS (PostCSS)

### Architecture Highlights

* **`app/math-brain/`** — UI + hooks for report generation/exports
* **`src/math_brain/main.js`** — orchestrator combining natal + transits, produces unified output
* **`poetic-brain/`** — Node module for Mirror Directive processing; relies on Perplexity API (no Gemini)
* **`lib/relocation-houses.js`** — internal engine to recalc houses for relocation; use instead of API
* **Balance Meter v5.0** uses averaged aspect weights; only magnitude/directional bias axes

### Key Components

* **Frontend (App Router)**
  React pages under `app/` (home, `app/math-brain`, `app/chat`). Legacy `index.html` is retained only for temporary reference during migration and should not back live routes.
* **Backend (`astrology-mathbrain.js`)**
  Primary function for calculations, API proxying, validation, and structured error handling.
* **Raven Mapper (`src/raven-lite-mapper.js`)**
  Transit‑to‑natal aspect mapping and Raven Calder formatting.
* **Seismograph (`src/seismograph.js`)**
  Magnitude/Valence/Volatility aggregation for transit stacks (Two‑Axis Symbolic Seismograph).
* **Configuration**
  `package.json`, `tailwind.config.js`, `netlify.toml`, `.env(.example)`.

---

## Essential Documentation (review before changes)

1. **[Developers Notes/Core/Four Report Types_Integrated 10.1.25.md](../Developers%20Notes/Core/Four%20Report%20Types_Integrated%2010.1.25.md)** ⭐ PRIMARY REFERENCE
2. **[Developers Notes/Lessons Learned/Lessons Learned for Developer.md](../Developers%20Notes/Lessons%20Learned/Lessons%20Learned%20for%20Developer.md)** — Essential context
3. **[Developers Notes/README.md](../Developers%20Notes/README.md)** — Complete developer index
4. [README.md](../README.md) — Setup, API details, troubleshooting
5. [Developers Notes/Lessons Learned/MAINTENANCE_GUIDE.md](../Developers%20Notes/Lessons%20Learned/MAINTENANCE_GUIDE.md) — Best practices, error handling, file org
6. [CHANGELOG.md](../CHANGELOG.md) — Change history with AI collaboration notes
7. [Developers Notes/Lessons Learned/copilot_fix_recovery.md](../Developers%20Notes/Lessons%20Learned/copilot_fix_recovery.md) — **Emergency recovery when AI assistants cause issues**
8. [Developers Notes/Implementation/MATH_BRAIN_COMPLIANCE.md](../Developers%20Notes/Implementation/MATH_BRAIN_COMPLIANCE.md) — Technical compliance requirements
9. [Developers Notes/API/API_INTEGRATION_GUIDE.md](../Developers%20Notes/API/API_INTEGRATION_GUIDE.md) — External API usage patterns

### Additional Key Resources

* **API Integration:** [Developers Notes/API/API_INTEGRATION_GUIDE.md](../Developers%20Notes/API/API_INTEGRATION_GUIDE.md)
* **API Reference:** [Developers Notes/API/API_REFERENCE.md](../Developers%20Notes/API/API_REFERENCE.md)
* **Balance Meter v5.0:** [Developers Notes/Core/V5_IMPLEMENTATION_SUMMARY.md](../Developers%20Notes/Core/V5_IMPLEMENTATION_SUMMARY.md)
* **Seismograph:** [Developers Notes/Implementation/SEISMOGRAPH_GUIDE.md](../Developers%20Notes/Implementation/SEISMOGRAPH_GUIDE.md)
* **Raven Persona:** [Developers Notes/Poetic Brain/RAVEN-PERSONA-SPEC.md](../Developers%20Notes/Poetic%20Brain/RAVEN-PERSONA-SPEC.md)
* **Output Protocol:** [Developers Notes/Poetic Brain/RAVEN_OUTPUT_PROTOCOL.md](../Developers%20Notes/Poetic%20Brain/RAVEN_OUTPUT_PROTOCOL.md)
* **Voice Guide:** [docs/CLEAR_MIRROR_VOICE.md](../docs/CLEAR_MIRROR_VOICE.md)
* **Export Formats:** [docs/planning/USER_FACING_MARKDOWN_DESIGN.md](../docs/planning/USER_FACING_MARKDOWN_DESIGN.md), [app/math-brain/hooks/useChartExport.ts](../app/math-brain/hooks/useChartExport.ts)

---

## Development Workflow

### Environment Setup

```bash
# Clone repository
git clone <repository-url>
cd WovenWebApp

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local.development
# Add your RAPIDAPI_KEY to .env (SRP is enabled by default; set ENABLE_SRP=false to opt-out)

# Environment check
npm run check-env

# Local development (Next.js on port 3000)
npm run dev

# OR use Netlify dev (http://localhost:8888 for Auth0 callbacks)
netlify dev

# Production CSS build
npm run build:css
```

### Recommended Environment Variables for Development

```env
# Local development overrides
NEXT_PUBLIC_USE_LOCAL_AUTH=true
NEXT_PUBLIC_DEV_MODE=true
NEXT_PUBLIC_AUTH_ENABLED=false
NEXT_PUBLIC_MOCK_USER='{"name":"Local Dev User","email":"dev@local"}'

# API Configuration
MB_MOCK=true  # Set to false to test with real API
RAPIDAPI_KEY=your_key_here  # Only needed if MB_MOCK=false
NODE_ENV=development
```

### Testing

```bash
# Unit tests (Vitest)
npm run test:vitest

# Smoke tests
npm run test:smoke

# E2E tests (Playwright)
npm run test:e2e

# CI tests (all tests + linting)
npm run test:ci

# Specific test suite
npx jest __tests__/api-natal-aspects-refactor.test.js

# Validate fieldmap schema
npm run validate:fieldmap
```

**Before changes**

* Read **[Developers Notes/Core/Four Report Types_Integrated 10.1.25.md](../Developers%20Notes/Core/Four%20Report%20Types_Integrated%2010.1.25.md)** (PRIMARY REFERENCE)
* Check [Developers Notes/README.md](../Developers%20Notes/README.md) for relevant implementation guide
* Review [MAINTENANCE_GUIDE.md](../Developers%20Notes/Lessons%20Learned/MAINTENANCE_GUIDE.md)
* Verify API keys in `.env` / Netlify env
* Run `netlify dev` to confirm baseline health
* Prefer **mock mode** (`MB_MOCK=true`) during local work; switch off before validating production flows

**While changing**

* Make minimal, surgical modifications
* Test locally (`netlify dev` or `npm run dev`)
* Update docs if behavior/setup shifts
* Follow existing patterns and style
* Run smoke tests before committing

---

## Style & Voice Guardrails

### Frontstage vs. Backstage

**Frontstage (user-facing):**
* ❌ No planet names, signs, houses, aspects, degrees
* ✅ Plain, conversational language
* ✅ Possibility language ("often," "tends to")
* ✅ Conversational, falsifiable, agency-preserving tone
* ✅ Avoid deterministic language

**Backstage (operator-only):**
* ✅ All technical terms allowed
* ✅ Geometric calculations visible
* ✅ Diagnostic notes

### Voice Guidelines

* **Frontstage copy** (user-facing) must be conversational, falsifiable, agency-preserving; avoid deterministic language
* **Symbolic weather ≠ literal weather:** Speak in climate metaphors ("pressure," "visibility")
* Follow Raven persona quotes/tone references (see [docs/CLEAR_MIRROR_VOICE.md](../docs/CLEAR_MIRROR_VOICE.md), [RAVEN-PERSONA-SPEC.md](../Developers%20Notes/Poetic%20Brain/RAVEN-PERSONA-SPEC.md))
* When summarizing code output, prefer "tends to," "often," etc.

### Commit Message Standards

```
[YYYY-MM-DD] TYPE: Brief description
Types: FIX, FEATURE, BREAK, CHANGE, UPDATE, CRITICAL FIX
```

Examples:

* `[2025-01-21] FIX: Resolve API validation error for invalid coordinates`
* `[2025-01-21] FEATURE: Add composite transit support`

---

## Testing & Verification

**Required Steps**

1. Local function testing via `netlify dev`
2. API integration with test data (all endpoints)
3. Error-path checks using invalid inputs
4. Env variance (dev vs prod) validation
5. CSS production build verification

**Test Aids**

* `test-improvements.js`, `test-coords.js`
* `FORM_DATA_EXAMPLE.md`
* `debug-api.html`, `debug-test.html`

---

## Error Handling Best Practices

* Secrets only via environment variables; never commit keys
* User-facing errors stay clear and humane; logs hold detail
* Validate input before API calls
* Handle network/API failures gracefully with retries where appropriate
* Common fixes:

  * **Server misconfiguration:** Verify `RAPIDAPI_KEY`
  * **Port in use:** Stop existing `netlify dev`
  * **Styling issues:** `npm run build:css`

---

## AI Assistant Context Management

**Context reality**

* **IDE Copilot:** Live filesystem access; refreshable
* **Web Copilot:** Limited to uploaded files; manual context sync needed

**Best practices**

* If an AI “can’t find” a file that exists, it’s a context sync issue
* Prefer VS Code for full-context assistance
* Re‑upload changed files to web interfaces as needed
* Reference exact paths

---

## File Organization

```
WovenWebApp/
├── app/                    # Next.js 14 App Router
│   ├── math-brain/        # Main calculation interface
│   ├── chat/              # Poetic Brain interface (auth-gated)
│   └── api/               # API routes
├── components/            # React components
│   ├── mathbrain/         # Balance Meter components
│   └── ...
├── lib/                   # Core business logic
│   ├── server/            # Server-side calculations
│   ├── balance/           # Balance Meter v5.0
│   └── ...
├── src/                   # Legacy support files
│   ├── math_brain/        # Orchestrator
│   ├── seismograph.js     # Balance Meter calculations
│   ├── raven-lite-mapper.js  # Aspect mapping
│   ├── reporters/         # Report generation
│   └── input.css → public/dist/output.css (built)
├── netlify/functions/     # Serverless functions
│   └── astrology-mathbrain.js
├── poetic-brain/          # Mirror Directive processing
├── docs/                  # User-facing documentation
├── Developers Notes/      # Complete developer documentation
├── e2e/                   # Playwright E2E tests
└── __tests__/             # Jest unit tests
```

**Config Files**

* `.env.example`, `netlify.toml`, `package.json`, `tailwind.config.js`, `next.config.mjs`

**Key Documentation**

* `README.md`, [Developers Notes/Lessons Learned/MAINTENANCE_GUIDE.md](../Developers%20Notes/Lessons%20Learned/MAINTENANCE_GUIDE.md), `CHANGELOG.md`
* [Developers Notes/API/API_INTEGRATION_GUIDE.md](../Developers%20Notes/API/API_INTEGRATION_GUIDE.md), [Developers Notes/Core/Four Report Types_Integrated 10.1.25.md](../Developers%20Notes/Core/Four%20Report%20Types_Integrated%2010.1.25.md)

---

## Security & Privacy

* **Privacy Rule:** Never emit "Dan" or "Stephie" unless payload explicitly supplies and authenticated user matches. See [Developers Notes/Poetic Brain/PRIVACY_CONSTRAINT_DAN_STEPHIE.md](../Developers%20Notes/Poetic%20Brain/PRIVACY_CONSTRAINT_DAN_STEPHIE.md)
* Keep **example data in `/examples/` isolated**; do not wire into runtime defaults
* Never commit `.env`; rotate keys regularly (≈90 days)
* Separate dev/prod keys; monitor usage
* No persistent storage of personal data
* Respect privacy; process client‑side or in functions only
* Do not log secrets; `.env.*` files are gitignored

---

## Raven Calder System: Key Concepts

* **FIELD:** Energetic climate (raw geometry, orbs, houses)
* **MAP:** Structural patterns (echo loops, overlays, activated vectors)
* **VOICE:** Shareable mirror in plain language (no determinism)
* **Two‑Axis Symbolic Seismograph:** Magnitude (X), Valence (Y), Volatility index (VI)
* **Hook Stack UX:** High‑charge aspects, angles, anaretic, anchors—top‑loaded for fast recognition

---

## Development Patterns

**API Integration (frontend → function)**

```js
// Prefer Next.js API routes under /api. Legacy Netlify paths should be rewritten when possible.
const response = await fetch('/api/astrology-mathbrain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestData)
});
```

**Error Response (standard)**

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "errorId": "unique-id",
  "details": {}
}
```

**Logging**

```js
logger.info('Operation completed', { context });
logger.error('Operation failed', { error, context });
```

---

## Critical Flow (Must Implement)

- Math Brain entry is `/math-brain`.
- After successful Google Auth0 login, the user can reach Poetic Brain at `/chat`.
- `/chat` must be gated behind authentication (use `RequireAuth`). Do not expose `/chat` to unauthenticated users.

## Styling and Migration Rules

- Tailwind CSS is the primary styling system. Prefer utility classes; limit CSS modules to component-specific needs.
- Do not introduce new inline styles in React components.
- Legacy styles may persist only until their page is fully ported to React. Replace with Tailwind as you migrate.

## Final Desired State

- `/` and `/math-brain` are React pages in App Router.
- `/chat` is the Poetic Brain chat, reachable only after Auth0 login and gated by `RequireAuth`.
- `/legacy/*` contains old HTML files preserved for reference only.
- Netlify deploys the Next.js build (`.next`) using `@netlify/plugin-nextjs`.

## Branch Protection & Merge Guidelines

**Agent Permissions**

* AI agents work on feature branches; human review required for `main`
* Assign Jules or repo owner for final verification
* Branch names: `feature/...`, `fix/...`

**Conflict Resolution**

1. Manual review for core files (`index.html`, `astrology-mathbrain.js`)
2. For documentation, integrate both perspectives with clear attribution
3. Config conflicts defer to production‑tested settings
4. Follow established style and error handling patterns

**Merge Checklist**

* [ ] Local tests pass (`netlify dev`)
* [ ] No secrets committed
* [ ] `CHANGELOG.md` updated
* [ ] Documentation updated
* [ ] CSS built if styles changed (`npm run build:css`)
* [ ] Human reviewer assigned

---

## Security & Data Handling

* Never commit `.env`; rotate keys regularly (≈90 days)
* Separate dev/prod keys; monitor usage
* No persistent storage of personal data
* Respect privacy; process client‑side or in functions only

---

## Deployment (Netlify)

* Auto deploys from GitHub `main`
* Env vars set in Netlify dashboard (include `RAPIDAPI_KEY`)
* Build command: `npm run build:css`
* Functions picked up from `netlify/functions/`

**Production checklist**

1. Configure env vars (esp. `RAPIDAPI_KEY`)
2. Verify build settings and deploy hooks
3. Test API integration live
4. Monitor function logs

---

## Troubleshooting Guide

**Common Errors**

* “Error computing geometry” → likely missing/invalid API key
* “End date must be after start date” → validation issue
* CORS complaints → route through Netlify functions
* Empty reports → check response shape vs expected schema

**Debug Steps**

1. `LOG_LEVEL=debug`
2. Inspect browser console + network tab
3. Verify env & keys
4. Test with known‑good payloads
5. Review Netlify function logs

---

## Serverless Functions Instructions

These rules apply to Netlify functions stored in `netlify/functions/` and any supporting modules under `lib/`.

### Structure & Naming
- Each function file must export `export const handler = async (event, context) => { ... }`.
- Keep filenames kebab-case (e.g. `astrology-mathbrain.js`).
- Shared helpers belong in `lib/` and are imported into the function file.

### Input Validation & Error Handling
- Validate all query/body params. Return `400` with a descriptive error when required params are missing.
- Wrap external API calls in try/catch. Log errors via `console.error` with contextual metadata.
- Return JSON-encoded responses: `{ statusCode, headers, body: JSON.stringify(payload) }`.
- Never leak secrets or raw stack traces in responses.

### Data & Domain Rules
- Preserve Raven Calder FIELD → MAP → VOICE flow: raw geometry first, then derived metrics, then narrative.
- When modifying seismograph or aspect logic, update corresponding docs (`MATH_BRAIN_COMPLIANCE.md`, etc.).
- Guard privacy: never hardcode personal names; use request payload values or anonymized placeholders.

### Testing & Verification
- Add/update integration tests under `tests/functions/` or Playwright flows that exercise the function.
- Run `npm run test` (Jest/Vitest) and `netlify dev` to confirm the function works in the local Netlify runtime.
- If schema changes, update consumers (frontend hooks, Poetic Brain) and document the change.

### Deployment Checks
- Ensure environment variables are accessed via `process.env.*` and documented in `.env.example`.
- Coordinate with CI (copilot-setup-steps) so builds install required deps before invoking the function.

---

## Frontend Instructions

These rules govern React UI code under the Next.js App Router (`app/`, `components/`, `hooks/`). Copilot must follow them when editing or generating frontend files.

### File & Naming Conventions
- Components belong in `components/` or the closest feature directory under `app/`.
- Use **PascalCase** filenames (e.g. `MirrorSummaryCard.tsx`).
- Export React **function components** only. Prefer explicit prop interfaces.
- Co-locate custom hooks in `hooks/` with `useSomething.ts` filenames when they are shared across components.

### Styling & Layout
- Tailwind CSS is the source of truth. Use utility classes instead of inline `style` objects.
- Shared design tokens live in `tailwind.config.js`; extend that file instead of hardcoding colors.
- Respect the dark theme. Reuse palette families already in use (`slate`, `indigo`, `emerald`).

### Data Flow & State Management
- Fetch data via helpers in `lib/` or Next.js route handlers; never call Netlify endpoints directly from components.
- Keep React hook dependency arrays accurate. Derive memoized values with `useMemo`/`useCallback` where needed.
- Every async action must surface loading and error UI states. Follow the toast pattern used in `components/ChatClient.tsx`.

### Accessibility & UX
- Ensure interactive elements have accessible labels and keyboard focus states.
- Copy must reflect Raven Calder tone: conversational, agency-first, zero determinism.
- Keep animations subtle (100–200 ms transitions). Avoid motion-heavy effects.

### Testing & Verification
- Update or add Jest tests in `__tests__/` for logical changes; use Playwright specs under `e2e/` for UI flows.
- Run `npm run lint` and `npm run test` before submitting changes.
- When touching shared layout/theme files, validate via `netlify dev` to confirm no regressions.

---

## Best Practices for AI‑Assisted Development

1. Preserve existing patterns (validation, logging, errors)
2. Validate against any schemas/contracts
3. Test with the live RapidAPI endpoint
4. Update docs alongside code changes
5. Keep **FIELD → MAP → VOICE** intact in outputs
6. Maintain geometry‑first, falsifiable phrasing

**Recommended Reading**

* [README.md](../README.md), [Developers Notes/Lessons Learned/MAINTENANCE_GUIDE.md](../Developers%20Notes/Lessons%20Learned/MAINTENANCE_GUIDE.md), [Developers Notes/Lessons Learned/Lessons Learned for Developer.md](../Developers%20Notes/Lessons%20Learned/Lessons%20Learned%20for%20Developer.md)
* Raven Calder system briefs (Hook Stack, Seismograph, Shareable Mirror)

---

## Emergency & Escalation

* **Owner:** Jules (DHCross)
* **Prod:** Netlify dashboard
* **API:** RapidAPI status/key validity
* **Build:** Verify Node version & deps

**Escalate when**

* Main functionality breaks
* API integration fails
* Security concerns appear
* Major architecture changes occur

---

## Quick Reference Commands

```bash
# Environment check
npm run check-env

# Local development
npm run dev

# CSS production build
npm run build:css

# Test env var (unix)
echo $RAPIDAPI_KEY

# Kill stuck Netlify dev (unix)
pkill -f netlify
```

**Reminder:** Review docs before changes, test with `netlify dev`, and keep the documentation standards high.
