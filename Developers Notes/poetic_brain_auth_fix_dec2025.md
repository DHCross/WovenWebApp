# Poetic Brain Auth Fix & Future Plans (Dec 2025)

## The Issue
In early December 2025, we encountered a critical blocking issue where the Poetic Brain (Raven) was inaccessible due to authentication failures (`401 User not authenticated`).

This was caused by a mismatch between the development environment and the rigorous Auth0 token requirements. The `getTokenSilently` call was failing with "Login required", but the application had no UI flow to force a login. This triggered an infinite 401 loop, preventing any usage of the Poetic Brain.

## The Fix: Disabling Auth0 (For Now)
We have made the decision to **disable the strict Auth0 requirement** for the Poetic Brain API endpoints.

**Changes:**
- Introduced a new environment variable: `POETIC_BRAIN_AUTH_ENABLED`.
- Updated `app/api/raven/route.ts` to check this variable.
- Default behavior: **Auth is DISABLED** (`POETIC_BRAIN_AUTH_ENABLED` defaults to `false`).
- If enabled, it checks for a Bearer token (simulating a future "License Key" or "Access Key" model).
- Cleaned up the `ALLOWED_EMAILS` check which is now redundant.

## Why?
1.  **Blocker Removal**: The auth layer was preventing the core value (narrative generation) from being tested and used.
2.  **Complexity vs. Value**: Implementing a full OAuth flow with token refresh and login UI is excessive for the current stage.
3.  **Monetization Strategy Re-think**: We are pivoting away from "account-based auth" towards simpler "access gating".

## Future Plan: Monetization & Access Control
When we are ready to monetize or restrict access, we will **NOT** return to a complex OAuth user profiling system. Instead, we will use one of the following simpler methods:

### Option A: Site-Wide Password (The "Speakeasy" Model)
- **Mechanism**: A single password field on the HomeHero landing page.
- **Storage**: Password saved in browser `localStorage`.
- **Check**: API validates the password header.
- **Pros**: Implementation takes ~10 minutes. Zero user friction beyond one password. No database of users to manage.

### Option B: License Key / Token
- **Mechanism**: Users purchase a key (via Stripe, etc.).
- **Usage**: Key is entered once and stored in `localStorage`.
- **Check**: API validates the key (Bearer token).
- **Pros**: Allows for per-user tracking and revocation if needed.

### Option C: Freemium via "Auth-for-Depth"
- **Mechanism**: Basic functionality is open to all. Deep, personalized readings require a key/password.
- **Pros**: Maximizes funnel/engagement.

## Summary
For now, **Poetic Brain is open**. The code for auth remains but is dormant behind the feature flag. This allows us to focus on the narrative engine's quality without infrastructure overhead.
