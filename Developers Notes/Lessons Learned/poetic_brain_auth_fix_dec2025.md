# Poetic Brain Auth Fix — December 2025

## Problem Summary

Users experienced persistent **401 Unauthorized** errors when using the Poetic Brain, even after signing in. The error message displayed:

> "Authentication failed: your session token is invalid or expired. Try signing out and back in."

Signing out and back in would temporarily work, but the problem would recur.

---

## Root Cause

**Inconsistent Auth0 client configurations** across the codebase.

Different components created Auth0 clients with different settings:

| File | Issue |
|------|-------|
| `AuthProvider.tsx` | Missing `cacheLocation: 'localstorage'`, `useRefreshTokens` |
| `dev-tools/auth-status-ab123/page.tsx` | Missing `cacheLocation: 'localstorage'`, `useRefreshTokens` |
| `components/dev/AuthStatusPill.tsx` | Missing `cacheLocation: 'localstorage'`, `useRefreshTokens` |

When a user logged in via `AuthProvider.tsx`, the token was created without localStorage caching or refresh token support. When `useAuth.ts` (which had the correct config) tried to refresh the token, it created a **separate** Auth0 client that couldn't access the original session.

### The Two-Client Problem

```
Login Flow:
  AuthProvider.tsx → Auth0Client A (no localStorage, no refresh tokens)
                   ↓
                 Token stored in memory only

API Request Flow:
  useAuth.ts → Auth0Client B (with localStorage, with refresh tokens)
             ↓
           Can't find tokens → Falls back to localStorage
             ↓
           Old/invalid token → 401 error
```

---

## Solution

Standardized all Auth0 client configurations to use the same settings:

```javascript
{
  domain,
  clientId,
  cacheLocation: 'localstorage',      // Share tokens via localStorage
  useRefreshTokens: true,              // Enable refresh tokens
  useRefreshTokensFallback: true,      // Fallback for older browsers
  authorizationParams: {
    redirect_uri: getRedirectUri(),
    ...(audience ? { audience } : {}),
  }
}
```

### Files Modified

1. **`app/math-brain/AuthProvider.tsx`** — Added missing config options
2. **`app/dev-tools/auth-status-ab123/page.tsx`** — Added missing config options
3. **`components/dev/AuthStatusPill.tsx`** — Added missing config options

### Files Already Correct (no changes needed)

- `hooks/useAuth.ts`
- `components/RequireAuth.tsx`
- `components/HomeHero.tsx`

---

## Related Fixes in This Session

### 1. Token Refresh Mechanism (`hooks/useAuth.ts`)
Created a new hook that calls `getTokenSilently()` before each API request to automatically refresh expired tokens.

### 2. Enhanced Error Reporting
- API routes now return structured errors with `hint` fields
- `formatFriendlyErrorMessage()` extracts and displays these hints
- Removed duplicate "sign out and back in" messages

### 3. Wheel Chart Freeze Fix
- Large base64 SVGs converted to blob URLs to prevent browser freezes on "click to enlarge"

---

## Prevention Checklist

When adding new Auth0 client creations:

- [ ] Include `cacheLocation: 'localstorage'`
- [ ] Include `useRefreshTokens: true`
- [ ] Include `useRefreshTokensFallback: true`
- [ ] Use `normalizeAuth0Domain()`, `normalizeAuth0ClientId()`, `normalizeAuth0Audience()` for config values
- [ ] Include audience in `authorizationParams` if configured

---

## User Recovery

After deploying these fixes, users with stale tokens need to:

1. **Sign out** completely
2. **Sign back in**

This creates a fresh token with the correct configuration.

---

## Code Map Reference

See: `Developers Notes/Architecture/poetic_brain_code_map.md`
