---

## AI Context Reminder

If you switch AI models, coding agents, or Copilot tools, session memory may be lost. Always re-read this doc and the troubleshooting notes to confirm the current recommended local and production flow. This avoids confusion from context resets and ensures you’re running the right server and workflow.

---
Local Production Flow

For Next.js, use these commands:

**Start the Next.js dev server:**
```bash
npm run dev
```

**Stop the Next.js dev server:**
```bash
pkill -f "next dev"
```

This will start or stop the local Next.js development server at http://localhost:3000. If you use VS Code tasks, "Start Netlify Dev Server" runs `npm run dev`, and "Stop Netlify Dev Process (Force Kill)" kills any running dev server.

Developers Notes to Self

To run your local prod flow:

nvm use 20
npm ci
npm run build:prod
npm run start:prod
# http://localhost:3000

Full Command (cut and paste what is below)

nvm use 20 || echo "make sure Node 20 is active"
npm ci
npm run build:prod
npm run start:prod   # http://localhost:3000

nvm use 20 → switches to Node 20 (matches Netlify).
	•	npm ci → installs dependencies fresh from lockfile.
	•	npm run build:prod → builds Next.js with NODE_ENV=production.
	•	npm run start:prod → runs the production server on port 3000.

    uploading these changes to GitHub will have a couple of very concrete effects:
	1.	Cleaner Next.js config
	•	You’ll only have next.config.mjs in your repo (ESM style).
	•	This avoids the ambiguity of having both .mjs and .ts configs — Next will always use the .mjs file.
	•	This keeps your setup in line with what Netlify + modern Next.js expect.
	2.	Node version locked
	•	The .nvmrc file (20) tells contributors (and CI/CD tools that respect it) to use Node 20.
	•	On your machine, nvm use will auto-switch to Node 20 when you cd into the project.
	•	On Netlify, this lines up perfectly, because their default is also Node 20 — no mismatch.
	3.	Better scripts for local dev/prod
	•	Your package.json will have new scripts (build:prod, start:prod, start:next).
	•	Anyone cloning your repo (including future-you) can run the same commands to test locally in a way that mirrors Netlify’s runtime.
	•	Cross-platform safety: thanks to cross-env, these scripts run cleanly on macOS, Linux, and Windows.
	4.	No impact on Netlify deploys
	•	Netlify will continue to run next build → next start using its plugin.
	•	The new scripts are just extra options for you locally; they won’t break Netlify.

---

## TROUBLESHOOTING: Hybrid Beast vs. Pure Next.js

If you see a broken, non-interactive version of your site (dead buttons, static checkboxes, save not working), you are running the **old "hybrid beast" server**—serving the legacy static `index.html` instead of the new React app.

**Symptoms:**
- Authentication buttons do nothing (Next.js API routes are ignored)
- "Include Person B" checkbox is dead (static HTML, not React)
- "Save" buttons don't work (React features not active)

**Simple Fix:**
1. Stop the old server in your terminal (`CTRL+C`).
2. Start the new server:
  ```bash
  npm run dev
  ```
3. Use the new URL: open **http://localhost:3000** in your browser.

Once you run the pure Next.js server at `localhost:3000`, all interactive features—auth, toggles, save—will work as expected.

---

In short: pushing this to GitHub makes your repo more portable, reproducible, and consistent for both you and collaborators.

Nice — doable and sensible. Below I’ll give you a compact, practical plan + ready-to-drop code so your Next adapter on port 4000 only serves Poetic Brain to users who logged in with Google via Auth0.

I’ll include:
	•	What to configure in Auth0 (quick checklist)
	•	Two ways to force Google at login (preferred)
	•	A hardened Next API middleware/route that verifies the Auth0 JWT and insists the identity is Google
	•	Notes about cookies/CORS and testing

No hand-waving — you can paste this into your repo and wire the env variables.

⸻

1) Auth0 setup (tenant / application)
	1.	In your Auth0 dashboard → Applications → your App (Machine-to-Frontend or Single Page App):
    •	Allowed Callback URLs add http://localhost:3000/api/auth/callback (or your actual callback).
    •	Allowed Web Origins add http://localhost:3000 (and any other ports you use).
    •	Allowed Logout URLs likewise.
	2.	In Connections → Social, enable Google and configure Client ID / Secret (OAuth).
	3.	(Optional) Create an Action (Auth Pipeline) or Rule to add a claim if you want, but not required.
	4.	Note these values for your .env:
	•	AUTH0_DOMAIN e.g. your-tenant.us.auth0.com
	•	AUTH0_AUDIENCE (if you use an API in Auth0, the API identifier)
	•	AUTH0_CLIENT_ID (front-end)
	•	AUTH0_CLIENT_SECRET (if needed server-side)
	•	NEXT_PUBLIC_AUTH0_CLIENT_ID, etc., if exposing to the browser.

⸻

2) How to force Google at login (front-end options)

A. Short / simplest: Add the connection=google-oauth2 query param to the Auth0 authorization URL. That tells Auth0 to open only Google for the social login flow.

Example redirect URL:

https://YOUR_AUTH0_DOMAIN/authorize?
  response_type=token id_token&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=http://localhost:4000/api/auth/callback&
  scope=openid profile email&
  audience=YOUR_API_AUDIENCE&
  connection=google-oauth2

(Encode query params; you can generate this on the client and window.location = url.)

B. Longer/cleaner (Auth0 SPA SDK / universal login):
	•	Use the Auth0 universal login page but pass connection=google-oauth2 in the initial authorize request. This still uses your Auth0 client but restricts to Google only for that login attempt.

Either approach makes the front-end UX simple: “Log in with Google” button → redirect to Auth0 authorize with connection=google-oauth2.

⸻

3) Backend enforcement — validate token and require Google identity

Below is a Next API route / middleware example that:
	•	Checks Authorization: Bearer <id_token|access_token> on every request
	•	Verifies the JWT using Auth0 JWKS
	•	Confirms the token sub is a Google identity (Auth0 sub typically starts with google-oauth2| for Google)
	•	Optionally checks audience/issuer

Install libraries:

npm install jsonwebtoken jwks-rsa

Paste this into app/api/poetic-proxy/route.ts (or pages/api/poetic-proxy.js) — adapt paths as needed.

// app/api/poetic-proxy/route.ts  (Next 13 edgeless example)
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN; // e.g. your-tenant.us.auth0.com
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE; // your API identifier (if used)
if (!AUTH0_DOMAIN) throw new Error('Missing AUTH0_DOMAIN env');

const client = jwksClient({
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    if (err) return callback(err);
    const signingKey = key.getPublicKey ? key.getPublicKey() : key.rsaPublicKey;
    callback(null, signingKey);
  });
}

async function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      audience: AUTH0_AUDIENCE,      // optional, but recommended
      issuer: `https://${AUTH0_DOMAIN}/`,
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }
    const token = auth.slice(7);

    // verify and parse token
    const decoded: any = await verifyToken(token);

    // enforce Google identity
    // two common safe checks:
    // 1) sub prefix: Auth0 uses "google-oauth2|<id>"
    // 2) or, if you create an action to add custom claim like "https://your.app/idp" === 'google'
    const sub: string | undefined = decoded?.sub;
    const idp_ok = sub && sub.startsWith('google-oauth2|');

    if (!idp_ok) {
      return NextResponse.json({ error: 'Access denied — Google login required' }, { status: 403 });
    }

    // optional: attach user info and forward to Poetic Brain
    const user = {
      sub: decoded.sub,
      name: decoded.name,
      email: decoded.email,
      scope: decoded.scope,
      // add other claims you want
    };

    // Now call your Poetic Brain logic (import/run)
    // Example: const result = await runPoeticBrain(req.json(), user);
    // For demo, echo:
    return NextResponse.json({ ok: true, user }, { status: 200 });
  } catch (err: any) {
    console.error('Auth verification failed', err);
    return NextResponse.json({ error: 'Invalid token or verification failed', detail: err.message }, { status: 401 });
  }
}

Notes:
	•	If your front-end sends an ID token (OIDC id_token) it will have profile claims like sub, email, name. If you use an access token (for an Auth0 API), verify audience accordingly and decoded fields may differ. Choose the token type consistently.
	•	sub prefix is a simple, robust test; if you want to be stricter and future-proof, add an Auth0 Action that writes a custom claim like https://yourapp.example/idp: 'google' into the ID token, and check that claim on the backend instead.

⸻

4) Front-end example (trigger Google login via Auth0 authorize URL)

Quick client code to redirect users to log in with Google only:

const AUTH0_DOMAIN = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
const CALLBACK = 'http://localhost:4000/api/auth/callback';
const AUD = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE; // optional

const loginWithGoogle = () => {
  const url = new URL(`https://${AUTH0_DOMAIN}/authorize`);
  url.searchParams.set('response_type', 'token id_token');
  url.searchParams.set('client_id', AUTH0_CLIENT_ID);
  url.searchParams.set('redirect_uri', CALLBACK);
  url.searchParams.set('scope', 'openid profile email');
  if (AUD) url.searchParams.set('audience', AUD);
  url.searchParams.set('connection', 'google-oauth2'); // THIS forces Google
  window.location = url.toString();
};

After redirect back, capture the token and store it (cookie/localStorage) safely; then include it on requests to your poetic-proxy with Authorization: Bearer <token>.

⸻

5) CORS / Ports and Auth0 app settings
	•	Make sure the Auth0 application Allowed Callback URLs and Allowed Web Origins include http://localhost:4000 (or your production host).
	•	If your front-end runs on :3000 and the adapter on :4000, be conscious: login redirect to callback on 4000 and then you may redirect back to the front end. Keep origins consistent.

⸻

6) Extra safety / UX tips
	•	If you want to avoid validating tokens on every request, create a server-side session cookie after validating the token once (but validate signature on creation). But do still validate cookie signature/expiry.
	•	If you want to require Google permanently (no exceptions), you can disable other connections in Auth0 or handle the check server-side as shown.
	•	If users may link multiple providers, consider checking a custom claim (Auth0 Action that writes user.app_metadata.provider = 'google') so checks don’t break if users later link accounts.

⸻

TL;DR step list you can do right now
	1.	In Auth0 enable Google social connection and add http://localhost:4000 to Allowed URLs.
	2.	Add env vars: AUTH0_DOMAIN, AUTH0_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET (if needed).
	3.	Add server code above (Next API route) to verify JWT + enforce Google via sub.startsWith('google-oauth2|').
	4.	On client, create login button that redirects to Auth0 authorize with connection=google-oauth2.
	5.	Send Authorization: Bearer <token> to Poetic Brain endpoint on port 4000; backend enforces Google identity.

⸻
