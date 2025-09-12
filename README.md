# Raven Calder Chat Scaffold

Minimal manual scaffold (Next.js App Router + TypeScript) for Raven Calder persona chat while create-next-app was stalled.

## Features
- `/chat` UI with streaming simulation
- `/api/chat` route emits newline-delimited JSON chunks (climate, hook, delta)
- Persona hooks + conditional climate tags
- Ready to wire Gemini / Poetic Brain later (server-only)

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

## Env Placeholders
```
GEMINI_API_KEY=
MODEL_PROVIDER=gemini
MODEL_API_KEY=
```
Do not expose secrets to client.
