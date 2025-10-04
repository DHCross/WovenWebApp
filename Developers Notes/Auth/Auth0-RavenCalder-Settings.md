# Auth0 Application Settings — RavenCalder (SPA)

_Last updated: 2025-10-04_

---

## Basic Information
- **Name:** RavenCalder
- **Domain:** dev-z8gw1uk6zgsrzubk.us.auth0.com
- **Client ID:** 0nV0L41xZijfc8HTKtoROPgyqgMttJYT
- **Client Secret:** (hidden, can be revealed)
- **Description:** (Custom field, up to 140 characters)

## Application Logo
- **Logo URL:** (can be set, e.g. https://path.to/my_logo.png)

## Application Type
- **Type:** Single Page Application

## Application URIs
- **Application Login URI:** https://sprightly-genie-998c07.netlify.app
- **Allowed Callback URLs:**
    - http://localhost:4000/
    - http://localhost:8888/
    - https://sprightly-genie-998c07.netlify.app/
    - http://localhost:3000/math-brain
    - https://ravencalder.com/math-brain
    - https://ravencalder.com/
- **Allowed Logout URLs:**
    - http://localhost:4000/
    - http://localhost:8888/
    - https://sprightly-genie-998c07.netlify.app/
    - https://ravencalder.com/math-brain
    - https://ravencalder.com/
- **Allowed Web Origins:**
    - http://localhost:4000
    - http://localhost:8888
    - https://sprightly-genie-998c07.netlify.app
    - http://localhost:3000
    - https://ravencalder.com/math-brain
    - https://ravencalder.com

## Cross-Origin Authentication
- **Allow Cross-Origin Authentication:** Enabled
- **Allowed Origins (CORS):** (editable field; allowed callback URLs are included)

## OpenID Connect Back-Channel Logout
- **Back-Channel Logout URI:** (requires enterprise subscription)
- **Logout Initiators:** Several categories (IdP-Logout, RP-Logout, Password Changed, etc. — mostly enterprise features)

## Security & Token Settings
- **ID Token Expiration:** Maximum lifetime: 36,000 seconds
- **Refresh Token Expiration:**
    - **Idle Lifetime:** 1,296,000 seconds (checkbox present)
    - **Maximum Lifetime:** 2,592,000 seconds (checkbox present)
- **Refresh Token Rotation:** (checkbox present)
- **Rotation Overlap Period:** 0 seconds (requires rotation enabled)

## Sender-Constraining, Authorization Requests, Advanced Settings
- **Require Token Sender-Constraining:** (add-on required)
- **Require Pushed Authorization Requests (PAR):** (add-on required)
- **Require JWT-Secured Authorization Requests (JAR):** (add-on required)

## Miscellaneous
- **Cross-Origin Verification Fallback URL:** (can be set)
- **Danger Zone:**
    - Delete this application (button)
    - Rotate client secret (button)

---

For more settings (credentials, APIs, add-ons, login experience, etc.), see the Auth0 dashboard:  
https://manage.auth0.com/dashboard/us/dev-z8gw1uk6zgsrzubk/applications/0nV0L41xZijfc8HTKtoROPgyqgMttJYT/settings
