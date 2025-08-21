# Copilot Instructions for WovenWebApp

## Project Overview

WovenWebApp is a web-based astrological chart analysis application that generates detailed reports for individuals and relationships using the **Raven Calder** system. It combines a static HTML/JavaScript frontend with Tailwind CSS and a Netlify serverless backend that interfaces with the RapidAPI Astrologer API.

### Core Philosophy (Raven Calder)

* **FIELD → MAP → VOICE:** Raw geometry → structural patterns → narrative synthesis.
* **Geometry‑First & Falsifiable:** Exact planetary angle math precedes language; reflections must land or be discarded.
* **Map, not mandate:** Symbolic weather supports agency; no deterministic claims.

---

## Architecture Overview

### Technology Stack

* **Frontend:** Static HTML, JavaScript, Tailwind CSS
* **Backend:** Netlify serverless functions (`netlify/functions/astrology-mathbrain.js`)
* **Data Processing:** `src/raven-lite-mapper.js` (+ `src/seismograph.js` for symbolic scoring)
* **External API:** RapidAPI **Astrologer** (Kerykeion-powered)
* **Deployment:** Netlify with GitHub integration
* **Styling:** Tailwind CSS (PostCSS)

### Key Components

* **Frontend (`index.html`)**
  Single-page UI with form-based input, real-time validation, responsive dark theme, report rendering.
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

1. `README.md` – Setup, API details, troubleshooting
2. `MAINTENANCE_GUIDE.md` – Best practices, error handling, file org
3. `CHANGELOG.md` – Change history with AI collaboration notes
4. `Lessons Learned for Developer.md` – Context & IDE integration
5. `MATH_BRAIN_COMPLIANCE.md` – Technical compliance requirements
6. `API_INTEGRATION_GUIDE.md` – External API usage patterns

---

## Development Workflow

### Environment Setup

```bash
# Environment check
npm run check-env

# Local development
npm run dev

# Production CSS build
npm run build:css
```

**Before changes**

* Read `CHANGELOG.md` and `MAINTENANCE_GUIDE.md`
* Verify API keys in `.env` / Netlify env
* Run `netlify dev` to confirm baseline health

**While changing**

* Make minimal, surgical modifications
* Test locally (`netlify dev`)
* Update docs if behavior/setup shifts
* Follow existing patterns and style

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

**Core**

* `index.html` – UI + frontend logic
* `netlify/functions/astrology-mathbrain.js` – backend function
* `src/raven-lite-mapper.js` – aspect mapping
* `src/seismograph.js` – symbolic seismograph aggregation
* `src/input.css` → `dist/output.css` (built)

**Config**

* `.env.example`, `netlify.toml`, `package.json`, `tailwind.config.js`

**Docs**

* `README.md`, `MAINTENANCE_GUIDE.md`, `CHANGELOG.md`, `API_INTEGRATION_GUIDE.md`, `Lessons Learned for Developer.md`

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
const response = await fetch('/.netlify/functions/astrology-mathbrain', {
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

## Best Practices for AI‑Assisted Development

1. Preserve existing patterns (validation, logging, errors)
2. Validate against any schemas/contracts
3. Test with the live RapidAPI endpoint
4. Update docs alongside code changes
5. Keep **FIELD → MAP → VOICE** intact in outputs
6. Maintain geometry‑first, falsifiable phrasing

**Recommended Reading**

* `README.md`, `MAINTENANCE_GUIDE.md`, `Lessons Learned for Developer.md`
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
