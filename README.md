
# Raven Calder — Woven Web App

Next.js App Router + TypeScript scaffold for Raven Calder’s Woven Web App. Includes Math Brain (geometry-first analysis) and Poetic Brain (chat) foundations.

## Architectural Philosophy: Separate but Connected

**Critical Insight (2025-09):** Math Brain and Poetic Brain are intentionally separate subsystems. They share a site but maintain distinct codebases, UX patterns, and data flows. Attempts to tightly integrate them created unnecessary complexity and broke core functionality. The current architecture uses a simple handoff pattern that preserves both systems' independence while enabling collaboration.

- **Math Brain (`/math-brain`):** A simple, utilitarian calculator. Its purpose is to compute astrological geometry and provide downloadable reports (JSON, PDF). The user experience is straightforward: enter data, get results.
- **Poetic Brain (`/chat`):** An immersive, beautiful interface for interpretation and dialogue with the Raven Calder system. It requires authentication and provides a rich, atmospheric experience.
- **The Handoff:** The two brains are connected via a loose coupling. The primary method is downloading a JSON report from Math Brain and uploading it to Poetic Brain. A secondary, browser-based handoff uses a `localStorage` snapshot. This avoids complex state management and direct API dependencies.

This separation allows each brain to excel at its purpose and be developed independently, leading to a more robust and maintainable system.

## Key Lessons Learned (2025-09)

### [2025-09-19] Coordinate-Based Timezone Resolution

**Why this matters:**
- Math Brain API requires a strict IANA timezone string for birth location to accurately convert local birth time to UTC for geometry calculations.
- The new system uses tz-lookup (from coordinates) and luxon (for DST-aware offset) to ensure every request includes the correct timezone.
- This prevents errors from ambiguous city/nation fields and makes the geometry engine (Kerykeion) reliable and falsifiable.
- GeoNames is now optional and only used if the user provides it; coordinates are always prioritized.

### Provenance & Auditability
- Every report must stamp provenance: house system, orbs profile, relocation mode, timezone DB, engine versions, and math_brain_version. This ensures all results are auditable and reproducible.

### GeoNames and Formation Stability
- Natal validators upstream are strict about “city-mode.” When a GeoNames username is provided and the subject includes city + nation, the backend prefers city-mode with GeoNames and falls back cleanly if needed.
- Add GEONAMES_USERNAME to your env (optional but recommended). Without it, natal may require coords-only more often.
- Formation fallback (per window, locked for consistency): city+GeoNames → coords-only → city-only (last resort). Per-day provenance records which path was used.

### Relocation: Power & Pitfalls
- Relocation (A_local/B_local) is essential for Balance Meter accuracy but brittle—depends on precise location and upstream resolver behavior. Robust fallbacks and “Angle Drift Cone” are implemented for ambiguous cases.

### API Payload & Adapter Quirks
- Upstream transit endpoints are finicky. City-only vs coords-only vs city+state behave differently. Adapter logic and explicit geocoding modes (GeoNames, city+state) are supported. Developer UX is clear about these requirements.

### Orbs & Filters
- Strict orb caps and documented Moon/outer rules (+Moon +1°, outer→personal −1°) are enforced before weighting. Orbs profile is always explicit in provenance.
	- Adapter clamps requested orbs to provider caps before calling upstream; clamp events are logged in debug and reflected via `provenance.orbs_profile`.

### Graceful Fallbacks
- If the provider returns no aspects, the report template renders fully with explicit “no aspects received” placeholders and simulated examples flagged as such. Partial days are handled, and Angle Drift Alerts are shown for house ambiguity.

### User Simplicity & Developer Detail
- UI remains minimal for non-programmers (date + birth city). The backend/adapter handles complexity and documents all required options for power users. Clear UX copy guides users on location accuracy and fallback options.

### Falsifiability & Feedback
- SST, Drift Index, Session Scores, and micro-probes are enforced. Misses are calibration data, not user error. Every report includes a provenance block and raw geometry appendix for transparency.

---

## Features
- Math Brain at `/math-brain` (Next.js App Router)
- Poetic Brain chat at `/chat` (Auth0-gated)
- `/api/chat` emits NDJSON stream (climate, hook, delta)
- Persona hooks + conditional climate tags

## Run
```bash
npm install
npm run dev
# open http://localhost:8888/chat

# (Optional) CLI tinker mode (requires dev server running on port 8888)
npm run tinker
```
Exit tinker with an empty line.

## Local Dev (one click)
- Command Palette → Run Task → "Start All Dev Servers (Netlify & Tailwind)" to start Netlify Dev and Tailwind CSS watch together.
- Optionally set it as the Default Build Task so Cmd+Shift+B runs it.
- If you change .env, restart the Netlify Dev task to reload environment variables.

Auth quick check:
- Run Task → "Auth: Check Config" for local env, or "Auth: Check Config (Prod URL)" to test your Netlify site.

Open a browser automatically:
- Run and Debug → "Start Dev + Open Browser (Chrome)". This launches http://localhost:8888 and starts the dev servers first.

## Terminal alternative
```bash
npm run dev:all
```
Runs `npm run dev` and `npm run dev:tailwind` in parallel (via concurrently).

## Export/Print & Handoff (Math Brain v1.6)

- Print button: prints a clean report with only Balance Meter (Astro Reports) and Raw Geometry (UI chrome, forms, and debug blocks are hidden in print).
- Download JSON: saves the full API payload to a file like `math-brain-result-YYYYMMDD.json`.
- Open in Poetic Brain →: saves a compact `mb.lastSession` snapshot in localStorage and navigates to `/chat?from=math-brain`.
	- The handoff button is enabled when you’re signed in (Auth0). If not signed in, it appears disabled with a tooltip.


# Woven Map — Revised Report Guide (Lessons Learned)

A single, practical guide that preserves the original architecture (Mirror Flow vs Balance Meter; FIELD → MAP → VOICE; Poetic Brain) while integrating operational lessons discovered during implementation and live testing: API resolver quirks, relocation brittleness, provenance needs, orb policy, formation/fallback rules, developer UX, and QA checks.

---

## At-a-glance: What changed (quick summary)

- Provenance is required. Every report must stamp house system, orbs_profile, relocation_mode, timezone_db_version, engine versions and math_brain_version.
- Relocation is valuable — and fragile. A_local/B_local reanchors houses but depends on reliable geocoding. We added fallbacks and an Angle Drift Cone for ambiguous inputs.
- Do not mix geocoding modes per run. Either coords-only or city-mode (with optional GeoNames) for the whole transit window.
- Orb policy enforced pre-weight. Conj/Opp 8°, Sq/Tr 7°, Sext 5°; Moon +1°; outer→personal −1°.
- Reports must render even when data is missing. Use explicit “no aspects received” placeholders and clearly-labeled simulated examples if needed.
- Non-programmer UX stays minimal. The backend/adaptor hides complexity but exposes clear UI hints and admin debug guidance.

---

## 1. Report Types — core distinction

**Mirror Flow (qualitative)**
- Purpose: Recognition & self-reflection.
- Inputs: Natal geometry (transits optional).
- Location sensitivity: Low — works without relocation.
- Output: Poetic FIELD → MAP → VOICE translations, polarity cards, actor/role composites.

**Balance Meter (quantitative)**
- Purpose: Pressure diagnostics (symbolic seismograph).
- Inputs: Natal + precise transit window + relocation option (recommended when event is place-specific).
- Location sensitivity: High — houses/angles relocate and change how transits land.
- Output: Time-series of Magnitude (0–5), Valence (−5..+5), Volatility (0–5); drivers[] per day; SFD/Balance Channel.

All reports must include a provenance header and a status block describing whether live transits were received or which fallback was used.

---

## 2. Provenance — mandatory fields

Include at minimum:
- house_system and house_system_name (e.g., “P”, “Placidus”)
- orbs_profile (e.g., “wm-spec-2025-09”)
- timezone_db_version (IANA/system)
- relocation_mode (None | A_local | B_local | midpoint — midpoint opt-in)
- relocation_coords when applicable
- math_brain_version, ephemeris_source, engine_versions (seismograph, balance, sfd)
- provenanceByDate (per-day endpoint/formation/attempts/aspect_count)

Why: audits, reproducibility, UI diagnostics, and debugging.

---

## 3. Relocation rules & practical guidance

**What relocation does**

Reanchors ASC/MC and house cusps to a new geographic point. Planets keep natal longitudes; houses change where energies manifest.

**When to use**
- Localized events (storms, disasters, local gatherings)
- When the reading must represent “where life is happening now”
- Long-distance relationship analysis (prefer A_local/B_local rather than midpoint)

**Best practices & guards**
- Default dyad behavior: Relational Balance Meter defaults to A_local.
- Midpoint: opt-in only; the server may reject midpoint requests (RELOCATION_UNSUPPORTED) for some endpoints.
- Angle Drift Cone: If time/place are ambiguous, compute multiple plausible house placements; if houses disagree, degrade to planet/sign language and flag angle ambiguity to user.
- UI copy: Prompt users for city + state (US) or coords; note that GeoNames stabilizes lookups.

---

## 4. Geocoding & formation rules (adapter contract)

**Fundamental rule:** Pick one formation per run and never mix modes across the same window.

**Formations**
- coords-only — send lat, lng (or lat/lon depending on provider), tz_str. Do not include city/nation.
- city-mode — send city, state (optional), nation and, when available, geonames_username. Do not send lat/lon/tz.

**Adapter behavior (recommended)**
- Prefer coords-only for transit subjects when coordinates exist.
- For natal endpoints:
	- If GEONAMES_USERNAME is configured and city/nation present → use city+GeoNames first.
	- Else fallback to coords-only.
	- Final fallback: city-only without GeoNames (some providers accept it).
- Lock formation for the entire window; record formation in provenanceByDate.

**Fallback sequence (per day)**
1. transit-aspects-data with chosen formation
2. If empty → transit-chart with same formation
3. If still empty → flip formation once (coords ↔ city-mode) and try again
4. If still empty → mark day as no aspects received and include simulated examples only when explicitly flagged

---

## 5. Orb policy (pre-weight filter)

Apply before weighting/scoring:
- Conjunction/Opposition: max 8°
- Square/Trine: max 7°
- Sextile: max 5°
- Moon rule: +1° when Moon is the pair member
- Outer→personal: −1° when Jupiter/Saturn/Uranus/Neptune/Pluto aspects Sun/Moon/Mercury/Venus/Mars

Log orbs_profile in provenance.

---

## 6. drivers[] normalized shape

Each returned driver (per-day top aspects) should be normalized and include compatibility fields:

```
{
	"a": "Venus",
	"b": "Saturn",
	"type": "square",
	"orb": 2.1,
	"applying": true,
	"weight": 1.32,
	"is_transit": true,
	"planet1": "Venus",
	"planet2": "Saturn",
	"name": "Venus square Saturn"
}
```

Drivers are sorted by weight. drivers[] must be present (empty array when upstream returns none) to ensure stable UI rendering.

---

## 7. Missing-data policy (graceful degradation)

- If no aspects for a day: include full UI/report structure and explicit placeholders:
	- drivers: []
	- seismograph: { magnitude: null, valence: null, volatility: null, status: "no aspects received" }
- Label simulated drivers clearly when shown (for layout QA only).
- For partial days, populate available days; mark others pending.
- Provide clear UI guidance: “No aspects received for these dates — try city+state, enable GeoNames, or use coords for the transit subject.”

---

## 8. The Math backbone (Weight Belt, SFD, Balance Channel)

- Aspect base weights (defaults):
	- Trine: +0.40
	- Sextile: +0.25
	- Conjunction: ±0 (contextual)
	- Square: −0.50
	- Opposition: −0.45
- Modifiers: Angularity (ASC/MC) ±0.10–0.20; Applying +0.10 / Separating −0.05; 3+ stack volatility kicker −0.10
- SFD: SupportSum − CounterSum, scaled to −5..+5
- Balance Channel v1.1: rebalances valence, boosting stabilizers (Jupiter/Venus), softening hard aspects to reveal support under load
- SST guardrail: Lived pings (WB/ABE/OSR) can flip theoretical signs; the system learns from user feedback and pings

Always include a short numeric audit in the report appendix showing component contributions to SFD and magnitude.

---

## 9. UX: what we ask of users & simple copy

Minimum fields (UI):
- Name
- Birth date
- Birth time (exact preferred; warn if approximate)
- Birth city (UI asks for state for US)
- Mode: Natal vs Natal+Transits
- If Transits: start / end / step and whether to anchor to current city

**GeoNames UI copy (drop-in)**
- Tooltip: “Optional: Add a GeoNames username to stabilize city lookups for natal charts. It’s free and server-only.”
- Inline helper: “GeoNames (optional): a free username lets the server resolve birth cities reliably. If present and you enter city + nation, natal prefers city-mode; otherwise we fall back to coordinates.”
- Settings description (admin): “GEONAMES_USERNAME: one server account stabilizes city resolution for all users.”

If aspects are missing: show clear fix suggestions and an action button for “Retry with coords” or “Provide state / enable GeoNames”.

---

## 10. Developer & API guidance (payloads, probes, provenance)

**Canonical payload shapes**

Relational Balance Meter (A_local)

```
{
	"report_type":"relational_balance_meter",
	"subjectA":{
		"name":"DH Cross",
		"birth":{ "date":"1973-07-24","time":"14:30","city":"Bryn Mawr","state":"PA","nation":"US" },
		"A_local":{ "city":"Panama City","state":"FL","nation":"US" }
	},
	"subjectB":{
		"name":"Stephie",
		"birth":{ "date":"1965-04-18","time":"18:37","city":"Albany","state":"GA","nation":"US" }
	},
	"transits":{ "from":"2025-09-01","to":"2025-09-30","step":"1d" },
	"houses":"Placidus",
	"relocation_mode":"A_local",
	"orbs_profile":"wm-spec-2025-09"
}
```

Coords-only note: remove city/state/nation and include lat, lon (or lng per upstream), tz_str.

**Probe script & verification checklist (dev)**
- Add RAPIDAPI_KEY and optional GEONAMES_USERNAME to .env.
- Run dev server: npm run dev (Next.js on http://localhost:3000).
- Run probe: node scripts/probe-provenance.js.
- Check output:
	- provenance top-level present
	- provenanceByDate entries per day with formation, endpoint, attempts, aspect_count
	- For days with aspects: transitsByDate[date].drivers is non-empty
	- If drivers[] empty but provenance shows formation=city_state_geonames and aspect_count=0, try toggling to coords for the transit instant as fallback.

---

## 11. Testing & QA rules

- 14-day pilot for new users to seed SST/personalization (3 short pings/day).
- Automated schema checks in CI to assert drivers[] shape and required provenance fields.
- Logging: log raw upstream request/response (trimmed) for 422/429/500 with per-day provenance to speed debugging.
- Backoff: treat 429 as retryable with exponential backoff; log attempts and final error body.

---

## 12. Product philosophy (restate)

- Falsifiability first. Every poetic line must trace to a math anchor or be explicitly labeled as non-transit/simulated.
- Recognition before diagnosis. Start with FIELD (felt sense), then MAP (geometry), then VOICE (actionable prompts).
- Graceful honesty. If inputs are ambiguous or aspects are missing, call it out and provide practical fixes.
- Human in the loop. Calibrations use lived pings; the system learns.

---

## 13. Quick appendix (troubleshooting checklist)

1. drivers[] empty:
	- Check provenanceByDate.formation (coords vs city).
	- If formation=city_state_geonames but aspect_count=0, ensure GEONAMES_USERNAME is valid.
	- If formation=coords but upstream returns 422 requiring city, try city+state formation.
2. House differences vs old reports:
	- Verify relocation_mode used (A_local vs None).
	- Confirm house system (Placidus vs Whole Sign).
	- Check exact event timestamp (small time shifts can move cusps).
3. Strange orbs/weights:
	- Ensure orb clamping applied pre-weight (8/7/5 + Moon/outer adjustments).
	- Check orbs_profile in provenance.

## Resume from Math Brain (Poetic Brain v1.7)

When a Math Brain session exists in `localStorage.mb.lastSession`, the chat page (`/chat`) shows a small "Resume from Math Brain" pill at the top:

- Shows the saved climate and the date range of the Math Brain run.
- Click "Load context" to pre-fill the composer with a concise handoff prompt and drop a subtle Raven preface card indicating the loaded climate and range.
- Click "Dismiss" to hide the pill. The stored session is not deleted; use Reset in Math Brain to clear it.
- Appears whether you navigate via `/chat?from=math-brain` or visit later.

Quick check:
1) Generate in `/math-brain` → confirm `localStorage.mb.lastSession` exists.
2) Open `/chat` (signed in) → pill appears with climate and range.
3) Click "Load context" → composer is pre-filled and a small Raven preface appears.

## Streaming Protocol
Endpoint: POST /api/chat
Body: `{ messages: [{role:'user'|'raven', content:string}], persona?:object }`
Response: text stream with NDJSON lines. Client should append `delta` fields.

## Next Steps
- Replace mock stream with provider (Gemini/OpenAI) using server env vars.
- Add Auth0 gating later (wrap `/chat`).
- Integrate Poetic Brain module for FIELD → MAP → VOICE shaping.
- Add rate limiting + error surface.
 - Expand persona guardrails in `lib/persona.ts` (lexicon enforcement, WB/ABE/OSR hooks).

## QA checklist (Math Brain v1.6)

1) Print/JSON
- Generate a report → Print preview shows only Balance Meter + Raw Geometry.
- Download JSON saves a full payload with a date-stamped filename.

2) Session handoff
- After generation, click Open in Poetic Brain →; the app navigates to `/chat?from=math-brain`.
- Confirm `localStorage.mb.lastSession` exists.

3) Session resume/reset
- Refresh `/math-brain`; use Resume to restore inputs; use Reset to clear keys.

4) Weekly Mean↔Max
- Set Step=Weekly; toggle Mean/Max; confirm bars repaint and preference persists across refresh.

## Env Placeholders
```
GEMINI_API_KEY=
MODEL_PROVIDER=gemini
MODEL_API_KEY=
```
Do not expose secrets to client.

## Auth Troubleshooting (Auth0 SPA)

Keep SPA approach (no @auth0/nextjs-auth0). Auth flow uses the Auth0 SPA SDK loaded from `/public/vendor` and the config endpoint at `/api/auth-config`.

Required Auth0 Application settings (Dashboard → Applications → Your App):
- Application Type: Single Page Application
- Allowed Callback URLs:
	- http://localhost:4000/math-brain
	- http://localhost:8888/math-brain
	- https://<your-site>.netlify.app/math-brain
	- https://ravencalder.com/math-brain
- Allowed Logout URLs:
	- http://localhost:4000/
	- http://localhost:8888/
	- https://<your-site>.netlify.app/
	- https://ravencalder.com/
- Allowed Web Origins:
	- http://localhost:4000
	- http://localhost:8888
	- https://<your-site>.netlify.app
	- https://ravencalder.com
- Connections: Ensure Google (google-oauth2) is enabled for this application

Environment variables (local and Netlify):
- AUTH0_DOMAIN (no protocol, e.g., your-tenant.us.auth0.com)
- AUTH0_CLIENT_ID
- AUTH0_AUDIENCE (optional, not the Management API)

Smoke checks:
1) Start dev: Run Task → "Start All Dev Servers (Netlify & Tailwind)"
2) Check config: Run Task → "Auth: Check Config" (or `npm run auth:check`)
3) GET http://localhost:8888/api/auth-config → JSON contains `domain` and `clientId`
4) Visit /math-brain → Sign in → Google prompt → returns to /math-brain (URL cleaned) → navigates to /chat?from=math-brain
5) Direct /chat unauthenticated → redirected away (gated by RequireAuth)

Common pitfalls:
- AUTH0_DOMAIN includes https:// — remove the protocol
- Callback/Origin URLs mismatch (missing /math-brain on callback)
- Google connection not enabled for the specific application
- Netlify env vars not set or deploy needs a redeploy to pick up changes

Math Brain UX notes
- Report Types: `/math-brain?report=balance` shows on-screen gauges; `/math-brain?report=mirror` prepares a handoff to Poetic Brain and requires Auth0 sign-in. Mirror never renders on-screen meters.
- Include Person B: The toggle appears near the top controls and again inside Relationship Context; both stay in sync. Relational modes are disabled unless Person B is included and has valid details.

### Midpoint relocation (policy)

Midpoint relocation is available only by explicit opt-in. By default, dyad reports use `A_local` (Person A’s location) when `relocation_mode` is not specified. Midpoint mode may be requested but the upstream provider and our adapter can reject it (`RELOCATION_UNSUPPORTED`) depending on endpoint support. If you need midpoint flows as a standard option, flag the request explicitly in your API call and expect potential provider-specific constraints. For production stability we recommend `A_local`/`B_local` over midpoint unless you have a clear downstream use case.
