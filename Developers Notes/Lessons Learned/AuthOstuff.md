Perplexity Allowlist & JWT Enforcement – Quick Instructions

1. What this change does

Server-side protections for any route that calls Perplexity:
	•	Verifies incoming JWT access tokens (Auth0) using JWKS.
	•	Checks the user against an email/domain allowlist before allowing Perplexity calls.
	•	Centralizes logic in reusable helpers:
	•	lib/auth/jwt.ts – token verification
	•	lib/auth/allowlist.ts – allowlist checks
	•	Enforced in:
	•	app/api/raven/route.ts
	•	app/api/poetic-brain/route.ts

If the user is not allowed, the route returns an error and never calls Perplexity.

⸻

2. Files involved

Helpers
	•	lib/auth/jwt.ts
	•	Exports verifyToken(authorizationHeader: string)
	•	Uses Auth0 JWKS from https://${AUTH0_DOMAIN}/.well-known/jwks.json
	•	Validates signature, audience, issuer, etc.
	•	Returns decoded token (incl. email) or throws on failure.
	•	lib/auth/allowlist.ts
	•	Exports checkAllowlist(email: string): boolean (or similar).
	•	Reads env vars:
	•	ALLOWED_EMAILS – comma-separated list of allowed emails
	•	ALLOWED_DOMAIN – single domain allowed (e.g. yourdomain.com)
	•	If neither env var is set → permissive (no blocking).

Routes
	•	app/api/raven/route.ts
	•	app/api/poetic-brain/route.ts

Both now:
	1.	Read Authorization: Bearer <token> header.
	2.	Call verifyToken to decode and verify.
	3.	Extract email from the token.
	4.	Call checkAllowlist(email).
	5.	If failed → return 401/403, do not call Perplexity (generateStream / callPerplexity).
	6.	If passed → proceed as before.

⸻

3. How to configure the allowlist

Set these in your environment (Netlify, local .env, etc.):

# strict single-user
ALLOWED_EMAILS=you@yourdomain.com

# OR: allow a full domain
ALLOWED_DOMAIN=yourdomain.com

Notes:
	•	ALLOWED_EMAILS can be a comma-separated list:
ALLOWED_EMAILS=user1@example.com,user2@example.com
	•	If both ALLOWED_EMAILS and ALLOWED_DOMAIN are unset, the allowlist check is effectively OFF (for backward compatibility).

⸻

4. How to test locally
	1.	Start dev server

npm install   # if needed
npm run dev

	2.	Obtain a valid Auth0 access token
	•	Use your app’s login flow or Auth0 test tools.
	•	Token must be issued for the configured AUTH0_AUDIENCE.
	3.	Call the Poetic Brain API with curl

export TOKEN="YOUR_ACCESS_TOKEN"

curl -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"prompt":"Hello"}' \
     http://localhost:3000/api/poetic-brain -v

	4.	Verify behavior

	•	With an allowed email/domain:
	•	Request succeeds; route may call Perplexity.
	•	With a disallowed email/domain:
	•	Route responds with 401/403 and explanatory error.
	•	No Perplexity traffic should be triggered.

⸻

5. When editing or adding new Perplexity routes

For any new route that calls Perplexity:
	1.	Import helpers:

import { verifyToken } from '@/lib/auth/jwt';
import { checkAllowlist } from '@/lib/auth/allowlist';

	2.	At the top of the handler:

const authHeader = req.headers.get('authorization') ?? '';
const decoded = await verifyToken(authHeader);
const email = decoded?.email;

if (!email || !checkAllowlist(email)) {
  return new Response(JSON.stringify({ error: 'Not authorized' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

	3.	Only after this block should you call generateStream / callPerplexity.

⸻

6. Optional next steps
	•	Add an auth0/ folder with:
	•	Post-Login Action code (if you want client-side gating too).
	•	README explaining how to configure Auth0 + env vars.
	•	Add tests that:
	•	Mock verifyToken and checkAllowlist.
	•	Assert that disallowed users never reach the Perplexity call.

⸻

That’s the whole pattern: JWT verify → allowlist check → call Perplexity only if both pass.

You don’t have to write code for each approved email.

That line just means:

“Any time you add a new API endpoint that talks to Perplexity, make sure you plug in the same JWT + allowlist check pattern.”

A few key points:
	•	“Perplexity routes” = API routes like /api/raven or /api/poetic-brain that call generateStream / callPerplexity, not routes for specific users.
	•	The allowlist lives in env vars, not in code:
	•	ALLOWED_EMAILS=user1@example.com,user2@example.com
	•	or ALLOWED_DOMAIN=yourdomain.com
	•	The code just calls checkAllowlist(email) once; that helper reads those env vars and decides yes/no.

So if you add a new endpoint later that also uses Perplexity, you:
	1.	Import verifyToken and checkAllowlist.
	2.	Run the same “verify token → check email in allowlist” snippet at the top.
	3.	Let the env vars decide who’s allowed.

You only change the env config to add/remove people, not the code itself.