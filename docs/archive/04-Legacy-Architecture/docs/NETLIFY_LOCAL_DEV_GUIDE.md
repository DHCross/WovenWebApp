# Netlify Local Development Guide

_Run the Woven Web App locally without burning Netlify build minutes._

## 1. Goals

- Develop and test the full stack (Next.js + Netlify Functions) on your machine.
- Keep Perplexity and RapidAPI keys straight between local and hosted environments.
- Avoid the common traps (missing env vars, wrong ports, stale Netlify linkage).

## 2. Prerequisites

| Tool | Why | Install |
|------|-----|---------|
| Node.js 20 | Matches `.nvmrc`, prevents dependency drift | `nvm use` (after `nvm install 20`) |
| npm ≥ 9 | Required by `package.json` | ships with Node 20 |
| Netlify CLI ≥ 17 | Runs Netlify Functions locally, pulls remote env | `npm install -g netlify-cli` |
| git-lfs (optional) | For large sample data blobs | `brew install git-lfs` |

## 3. Environment Keys Cheat Sheet

| Variable | Required? | Used by | Notes |
|----------|-----------|---------|-------|
| `RAPIDAPI_KEY` | ✅ | Math Brain Netlify functions | Needed for Astrologer API. Keep in `.env` locally or Netlify UI in production. |
| `PERPLEXITY_API_KEY` | ✅ (if Poetic Brain) | Poetic Brain Netlify function + Next.js | Do **not** expose via `NEXT_PUBLIC_` unless intentional. |
| `NEXT_PUBLIC_ENABLE_POETIC_BRAIN` | optional | Next.js client | Toggle Poetic Brain UI locally. |
| `AUTH0_*` | optional | Auth flows | Only needed when testing Auth0 guards. |

**Local storage convention**

1. Copy `.env.example` → `.env` and fill secrets. `npm run check-env` makes sure it exists.
2. Never commit `.env`; the repo’s `.gitignore` already covers it.
3. If you need per-machine overrides, create `.env.local` (Next merges it automatically).
4. Netlify CLI can pull production env vars once the project is linked (see §6).

## 4. Install & Bootstrap

```bash
nvm use           # or nvm install 20 && nvm use
npm install
cp .env.example .env  # if not already present
# edit .env with your keys
npm run build:css      # one-time before starting servers
```

## 5. Choose Your Dev Mode

| Scenario | Command | What you get |
|----------|---------|--------------|
| Frontend only | `npm run dev` | Next.js on port 3000; API routes served by Next. No Netlify functions. |
| Full stack | `netlify dev` | Netlify CLI serves functions + proxies to Next.js. App available at `http://localhost:8888`. |
| Production simulation | `npm run build && npm run start:prod` | Next.js production build on port 3000. Functions unavailable. |

### How `netlify dev` wires things

- Starts Netlify Functions on port 9999 and Next.js on a separate port, then exposes everything through `http://localhost:8888`.
- Requests to `/.netlify/functions/*` hit the local functions exactly like production.
- Respects `.env`, `.env.local`, and any secrets pulled from the linked Netlify site.

## 6. Link to the Hosted Site (Optional but Helpful)

If you want the CLI to reuse the production site configuration:

```bash
netlify login              # one-time browser auth
netlify link               # choose the WovenWebApp site (stores site ID in .netlify)
netlify env:list           # confirm remote env vars
```

After linking, `netlify dev` injects remote env vars **in addition to** your local `.env`. Local values win if both define the same key, which keeps you from accidentally leaking prod credentials into commits.

## 7. Typical Local Workflow

1. Start Tailwind (optional): `npm run dev:tailwind` in one terminal.
2. Start stack: `netlify dev` in another terminal.
3. Visit `http://localhost:8888`.
4. Generate a Math Brain report.
5. Use Poetic Brain chat — the CLI will use your local `PERPLEXITY_API_KEY`.
6. Ctrl+C when finished.

## 8. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `Error: Failed to reach Raven API` | Netlify functions not running | Use `netlify dev` instead of `npm run dev` so `/.netlify/functions/*` resolves. |
| `QuotaExceededError` in console | Legacy oversized `mb.lastPayload` in localStorage | Clear the key via DevTools (`Application → Local Storage`). New builds store trimmed payloads. |
| `RAPIDAPI_KEY missing` in logs | `.env` absent or key empty | Re-run `npm run check-env`, restart dev server after editing `.env`. |
| Wrong env after switching sites | Netlify CLI still linked to another project | `netlify unlink && netlify link` to reset. |

## 9. Safe Key Handling Tips

- Use separate Perplexity keys for local vs production; revoke local keys when laptops are lost.
- Never add secrets to `NEXT_PUBLIC_*` unless the client requires them — they end up in the browser bundle.
- Share sanitized `.env.local.sample` files with collaborators instead of real keys.
- Remember that `netlify dev` merges remote secrets; double-check `netlify env:list` before demo streams.

## 10. When to Fall Back to Remote Builds

- Validating Netlify Edge Functions (not emulated locally yet).
- Testing CDN behaviours or build plugins.
- Running deploy-preview smoke tests.

Otherwise, `netlify dev` mirrors production closely and protects your build quota.

---
Last updated: 2025-11-02
