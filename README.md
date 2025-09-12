# Raven Calder — Woven Web App

Next.js App Router + TypeScript scaffold for Raven Calder’s Woven Web App. Includes Math Brain (geometry-first analysis) and Poetic Brain (chat) foundations.

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

Open a browser automatically:
- Run and Debug → "Start Dev + Open Browser (Chrome)". This launches http://localhost:8888 and starts the dev servers first.

## Terminal alternative
```bash
npm run dev:all
```
Runs `npm run dev` and `npm run dev:tailwind` in parallel (via concurrently).

## Export/Print & Handoff (Math Brain v1.6)

- Print button: prints a clean report with only Balance Meter and Raw Geometry (UI chrome, forms, and debug blocks are hidden in print).
- Download JSON: saves the full API payload to a file like `math-brain-result-YYYYMMDD.json`.
- Open in Poetic Brain →: saves a compact `mb.lastSession` snapshot in localStorage and navigates to `/chat?from=math-brain`.
	- The handoff button is enabled when you’re signed in (Auth0). If not signed in, it appears disabled with a tooltip.

### Session Resume

- On submit, your inputs are saved to `mb.lastInputs` and a session snapshot to `mb.lastSession`.
- On page load, a banner offers “Resume inputs” (restores fields) and “Reset” (clears storage keys).

### Weekly Mean↔Max

- When Step is set to Weekly, a Mean↔Max toggle appears.
- Mean averages daily values per week; Max picks the highest daily value per week.
- Your selection is stored in `localStorage.weeklyAgg` and persists across refreshes.
- A small “?” tooltip next to the toggle explains these semantics.

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
