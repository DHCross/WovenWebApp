Auth0 + Netlify: Secure SPA Integration

Overview
- SPA reads Auth0 public config at runtime from a Netlify Function, not from hardcoded values or a build-time JSON file.
- Only non-secret values are exposed: AUTH0_DOMAIN, AUTH0_CLIENT_ID, and optional AUTH0_AUDIENCE.
- If config is missing, the UI disables auth and shows a helpful notice.

Environment Variables
- Netlify dashboard → Site configuration → Environment variables:
  - AUTH0_DOMAIN: your-tenant.us.auth0.com
  - AUTH0_CLIENT_ID: SPA client ID
  - AUTH0_AUDIENCE: API Identifier (optional; set if your API requires it)
- Local development: create a `.env` for `netlify dev` with the same keys.

Runtime Config Endpoint
- The SPA fetches `/.netlify/functions/auth-config` and uses that response to initialize the Auth0 SDK.
- There is no build step generating `auth_config.json` anymore; that approach has been replaced by the function.

Auth0 Dashboard Settings
- Allowed Callback URLs:
  - http://localhost:8888
  - https://<your-site>.netlify.app
- Allowed Logout URLs:
  - http://localhost:8888
  - https://<your-site>.netlify.app
- Allowed Web Origins:
  - http://localhost:8888
  - https://<your-site>.netlify.app

Security Notes
- No fallbacks to real domain/client ID exist in code; env is required.
- CSP allows only the minimum needed for Auth0:
  - connect-src 'self' https://*.auth0.com
  - frame-src https://*.auth0.com
- Tokens are cached in localStorage for persistence; consider in‑memory cache if you want to reduce exposure to XSS (trade-off vs. UX).

Verify Setup
- Check the config function (replace origin as needed):
  - curl -s https://<your-site>.netlify.app/.netlify/functions/auth-config
- You should see: { domain, clientId, audience? }. If domain/clientId are absent, set env vars and redeploy/restart.

Common Issues
- 401 calling serverless API: Ensure AUTH0_AUDIENCE matches your API Identifier exactly and that your SPA is authorized for that API in Auth0.
- Callback errors: Verify exact origins and URLs in the Auth0 Dashboard (no stray spaces, correct scheme/host).
