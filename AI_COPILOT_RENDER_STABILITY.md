AI CoPilot Render Stability Checklist

Purpose: Keep the app in the “good” styled state across deploys and ensure login works.

Critical assets
- CSS: dist/output.css must load with 200. Netlify build runs `npm run build:css`.
- Auth SDK: /vendor/auth0-spa-js.production.js must resolve with 200 (no SPA rewrite).

Before commit
- netlify.toml has build command and CSP for Auth0.
- _redirects includes vendor exceptions before the SPA catch-all.
- index.html links /dist/output.css and the SDK loader logs the chosen path.

Smoke test
- Run `netlify dev` and open the app:
  - Confirm two-column layout (Person A/B) and Tailwind classes styled.
  - Open console: see `[Auth0] Self-hosted SDK verified at ...`.
  - Click “Use Today” and switch tabs; no JS errors.

Notes
- Chicago baseline remains for bucketing rationale in docs; Person A defaults to Eastern when Bryn Mawr, PA or Eastern coords are detected. This never overwrites a user-changed timezone.

Auth0 app settings quickcheck
- Application Type: Single Page Application
- Domain: dev-z8gw1uk6zgsrzubk.us.auth0.com
- Client ID: 0nV0L41xZijfc8HTKtoROPgyqgMttJYT
- Allowed Callback URLs: http://localhost:8888/, https://<your-domain>/
- Allowed Logout URLs: http://localhost:8888/, https://<your-domain>/
- Allowed Web Origins: http://localhost:8888, https://<your-domain>
- After changes, hard-refresh or test in an incognito window to avoid cached state.

Auth config quickcheck
- GET /.netlify/functions/auth-config returns JSON with { domain, clientId, audience }
- If it fails, ensure AUTH0_DOMAIN / AUTH0_CLIENT_ID / AUTH0_AUDIENCE are set in Netlify env or .env for `netlify dev`