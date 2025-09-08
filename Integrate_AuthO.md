Auth0 & Netlify Integration GuideIntegrating Auth0 with a Netlify-hosted Single Page Application (SPA) requires a specific setup to ensure your application can access the necessary credentials securely during deployment.Key ConceptsSingle Page Application (SPA): Your website is an SPA, which means it loads a single HTML file and then dynamically updates the content. This provides a fast, seamless user experience.Environment Variables: Netlify's recommended way to handle sensitive data like API keys and client secrets is through environment variables, which are stored securely on the Netlify platform. Your code can then access these variables during the build process.The Problem: Your local application code needs to know the Auth0 clientId and domain. When you deploy to Netlify, your local credentials aren't available, and you can't hard-code them for security reasons. The solution is to get the credentials from Netlify's environment variables.Steps for a Successful IntegrationStep 1: Securely Store Your Credentials in NetlifyYou must add your Auth0 credentials as environment variables in the Netlify dashboard for your site. This is a crucial step to avoid hard-coding sensitive information directly into your application's source code.Log in to your Netlify Dashboard.Navigate to your site's settings.Go to Site configuration > Environment variables.Click Add a variable and create two new variables:Key: AUTH0_CLIENT_ID | Value: [Your Auth0 Client ID]Key: AUTH0_DOMAIN | Value: [Your Auth0 Domain]Step 2: Configure the Build Process to Use These VariablesYour application needs a way to read these new environment variables during the build. The most common solution for SPAs is to have the build command generate a configuration file that your application can then read.In your Netlify dashboard, go to Site configuration > Build & deploy > Build settings.Locate the Build command field.Modify the build command to include a script that creates a JSON file. A common pattern is to create a file named auth_config.json.Example Build Command:echo "{\"clientId\": \"${AUTH0_CLIENT_ID}\", \"domain\": \"${AUTH0_DOMAIN}\"}" > src/auth_config.json && npm run buildecho ...: This command creates the auth_config.json file.\${...}: This is the syntax for telling the shell to substitute the environment variable's value.&& npm run build: This ensures that your main build command runs only after the configuration file has been created.Step 3: Update Your Application CodeFinally, your application's JavaScript code needs to be updated to read the Auth0 credentials from the new auth_config.json file instead of using hard-coded values.// In your main application file (e.g., index.js)

// Fetch the configuration file during app initialization
async function fetchAuthConfig() {
  const response = await fetch('/auth_config.json');
  return response.json();
}

// Then, use the fetched config to create the Auth0 client
async function initAuth() {
  const config = await fetchAuthConfig();
  const auth0Client = await createAuth0Client({
    domain: config.domain,
    clientId: config.clientId
  });
  // ... continue with your application logic
}

initAuth();
By following these steps, you create a robust and secure deployment process where your application's credentials are not stored in the public source code, and your app can successfully authenticate users whether it's running locally or deployed on Netlify.

---

Application Logo

- A simple SVG logo is available at: `/public/logo.svg`
- Public URL after deploy (Netlify): `https://<your-domain>/logo.svg`
- Use this URL in Auth0: Applications → Ravencalder → Settings → Application Logo
- You can also reference it in your HTML: `<link rel="icon" href="/logo.svg" type="image/svg+xml">`

---

Common Pitfalls & Fixes

- Missing or wrong Audience → 401/403
  - Symptom: “You don't have permissions to access the resource.”
  - Fix: Create a custom API in Auth0 (APIs → Create API). Use its Identifier as `AUTH0_AUDIENCE` (e.g., `https://ravencalder.com/poetic-brain`). Authorize your SPA for that API. Ensure the SPA requests that audience.
  - Don’t use the Management API audience (`https://<tenant>/api/v2/`).

- App not authorized for API
  - Symptom: Auth succeeds but API calls still 403.
  - Fix: Applications → Your SPA → APIs tab → Authorize the custom API.

- Origins/Callbacks not set
  - Symptom: CORS/redirect errors or silent failures.
  - Fix: Add both envs:
    - Allowed Callback URLs: `http://localhost:8888/`, `https://<your-domain>/`
    - Allowed Logout URLs: `http://localhost:8888/`, `https://<your-domain>/`
    - Allowed Web Origins: `http://localhost:8888`, `https://<your-domain>`

- SDK served as HTML (SPA rewrite)
  - Symptom: `Unexpected token '<'` / `createAuth0Client is not defined`.
  - Fix: `_redirects` must bypass SPA for vendor assets:
    - `/vendor/*   /vendor/:splat   200!`
    - `/public/vendor/*   /public/vendor/:splat   200!`

- Wrong tenant/app mix
  - Symptom: `invalid_client` or login loop.
  - Fix: `AUTH0_DOMAIN` and `AUTH0_CLIENT_ID` must belong to the same tenant and the intended SPA application.

- Audience not flowing to token
  - Symptom: Token verifies iss but aud mismatch on backend.
  - Fix: Confirm Network → `/authorize` includes `audience=<your API Identifier>`. In this app, audience is loaded from `/.netlify/functions/auth-config` (set `AUTH0_AUDIENCE` env and redeploy).

- RS256 vs HS256
  - Symptom: Backend verification fails.
  - Fix: Use RS256 for your API. The function validates with JWKS (`jwks-rsa`).

- Silent auth/popup quirks
  - Symptom: Popup blocked (Safari/ITP) or third‑party cookie limits.
  - Fix: Prefer redirect login in production; we keep `cacheLocation: 'localstorage'` and `useRefreshTokens: true` for SPA resilience.

- Time skew
  - Symptom: “token expired” immediately.
  - Fix: Sync system clock (NTP) on dev machine.

- Google OAuth dev keys in prod
  - Symptom: “This app is not configured for Google” warnings.
  - Fix: In Auth0 → Connections → Google, supply your own Google Client ID/Secret; add the Auth0 callback URL in Google Cloud console.

- Auth config endpoint missing
  - Symptom: `/\.netlify/functions/auth-config` 404 or `hasAudience: false`.
  - Fix: Ensure Netlify env vars set (AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_AUDIENCE). Restart `netlify dev` or redeploy.
