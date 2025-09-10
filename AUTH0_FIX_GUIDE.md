# Auth0 Configuration Fix Guide

## Issue Summary
The Auth0 configuration has incorrect redirect URLs and missing proper application setup.

## Problem with Current Configuration
The redirect URLs provided in the issue:
- `https://dev-z8gw1uk6zgsrzubk.us.auth0.com/login/callback`
- `http://dev-z8gw1uk6zgsrzubk.us.auth0.com/login/callback`

These are **Auth0's internal callback URLs**, not the application's callback URLs. These URLs are where Auth0 itself receives callbacks from social providers (like Google), not where Auth0 should redirect back to your application.

## Correct Configuration Required

### 1. Auth0 Application Settings (in Auth0 Dashboard)

Navigate to: `Auth0 Dashboard > Applications > [Your Application] > Settings`

#### Application Type
- Must be set to: **Single Page Application**

#### Allowed Callback URLs
```
http://localhost:8888
https://[YOUR-NETLIFY-SITE].netlify.app
```

#### Allowed Logout URLs  
```
http://localhost:8888
https://[YOUR-NETLIFY-SITE].netlify.app
```

#### Allowed Web Origins
```
http://localhost:8888
https://[YOUR-NETLIFY-SITE].netlify.app
```

#### Grant Types
Ensure these are enabled:
- Authorization Code
- Refresh Token (optional)

### 2. Google OAuth as Social Connection (Optional)

If you want to use Google OAuth, configure it as a **Social Connection** in Auth0:

Navigate to: `Auth0 Dashboard > Authentication > Social`

1. Click "+ Create Connection"
2. Select "Google"  
3. Enter the Google OAuth credentials:
   - Client ID: `1084807378002-trcpgg1i56s35qj51tuvrbbi2jo8fcq0.apps.googleusercontent.com`
   - Client Secret: `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`
4. Enable for your application

### 3. Environment Variables (.env file)

Update your `.env` file with the **Auth0 Application** credentials:

```bash
# Auth0 Domain (without https://)
AUTH0_DOMAIN=dev-z8gw1uk6zgsrzubk.us.auth0.com

# Auth0 Application Client ID (NOT the Google Client ID)
# Get this from: Auth0 Dashboard > Applications > [Your App] > Settings
AUTH0_CLIENT_ID=[YOUR_AUTH0_APP_CLIENT_ID]

# Optional: API Audience if using protected APIs
AUTH0_AUDIENCE=[YOUR_API_IDENTIFIER]
```

### 4. Netlify Environment Variables

Set the same variables in your Netlify dashboard:
- `AUTH0_DOMAIN=dev-z8gw1uk6zgsrzubk.us.auth0.com`
- `AUTH0_CLIENT_ID=[YOUR_AUTH0_APP_CLIENT_ID]`
- `AUTH0_AUDIENCE=[YOUR_API_IDENTIFIER]` (if needed)

## Steps to Fix

1. **Get the correct Auth0 Application Client ID**
   - Go to Auth0 Dashboard > Applications
   - Find your Single Page Application
   - Copy the Client ID from the Settings tab

2. **Update redirect URLs in Auth0 Dashboard**
   - Remove the Auth0 callback URLs
   - Add the application callback URLs listed above

3. **Update environment variables**
   - Update `.env` with the correct AUTH0_CLIENT_ID
   - Update Netlify environment variables

4. **Configure Google Social Connection (if desired)**
   - Use the provided Google OAuth credentials in Auth0's Social Connections
   - Do NOT use them directly in the application

## Testing the Fix

After configuration:

1. Test auth config endpoint:
   ```bash
   curl -s http://localhost:8888/.netlify/functions/auth-config
   ```

2. Run Auth0 validation:
   ```bash
   npm run test:auth0
   ```

3. Test the auth flow in the application

## Common Mistakes to Avoid

1. **Using Google Client ID as AUTH0_CLIENT_ID**: The Google credentials should be configured as a social connection in Auth0, not used directly by the application.

2. **Wrong redirect URLs**: Never use `*.auth0.com/login/callback` as callback URLs for your application. Those are for Auth0's internal use.

3. **Incorrect authorizationParams usage in getTokenSilently()**: 
   - ❌ Wrong: `getTokenSilently({ authorizationParams: { audience } })`
   - ✅ Correct: `getTokenSilently({ audience })`
   - This prevents `[object Object]` errors in auth URLs (see `auth0_authorizationparams_fix.md` for details)

4. **Including protocol in AUTH0_DOMAIN**: 
   - ❌ Wrong: `https://dev-z8gw1uk6zgsrzubk.us.auth0.com`
   - ✅ Correct: `dev-z8gw1uk6zgsrzubk.us.auth0.com`

3. **Missing HTTPS in production**: Production callback URLs must use HTTPS.

4. **Trailing slashes**: Include both with and without trailing slashes in callback URLs for better compatibility.