**Quick Deploy (Netlify + Next.js)**
- Plugin: `@netlify/plugin-nextjs` is enabled in `netlify.toml`.
- Build command: `npm run build`  •  Publish: `.next`  •  Node: 18.x

**Env Vars (Netlify → Site → Build & deploy → Environment)**
- `RAVEN_RENDER_INTEGRATION=1` (recommended; set `0` to force safe fallback)
- `RAPIDAPI_KEY` (if using Astrologer API)
- `PERPLEXITY_API_KEY` (only if used)
- `NEXT_TELEMETRY_DISABLED=1`

**Local Smoke**
- `npm run dev`
- Visit `/` and upload `test-data/mirror-symbolic-weather-sample.json`
  - Expect: "Upload complete." and five lines: picture, feeling, container, option, next_step

**Deploy**
- Push to the default branch; Netlify builds and serves SSR + `app/api/*` automatically.

**Post‑Deploy Check**
- Repeat upload smoke at the site root
- GET `/api/health` → 200 JSON

**Fast Rollback**
- Set `RAVEN_RENDER_INTEGRATION=0` and redeploy to force local renderer

**If Something Fails**
- Clear Netlify build cache and redeploy
- Verify TypeScript path aliases in `tsconfig.json` (`baseUrl: "."`, `paths: { "@/*": ["*"] }`)
- Check deploy logs for the Next plugin activation
