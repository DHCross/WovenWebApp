# Auth0 Configuration Setup Guide

## ✅ Current Status
- Auth0 domain configured: `dev-z8gw1uk6zgsrzubk.us.auth0.com`
- Auth0 configuration function working properly
- Environment file created with proper structure

## 🎯 Next Steps Required

### 1. Get Your Auth0 Application Client ID

You mentioned you fixed the settings on the Auth0 website. Now you need to get the **Client ID** from your Auth0 application:

1. Go to **Auth0 Dashboard** → **Applications**
2. Find your **Single Page Application** (the one you just configured)
3. Click on it to open the **Settings** tab
4. Copy the **Client ID** from the **Basic Information** section

### 2. Update the .env File

Replace the placeholder in your `.env` file:

```bash
# Change this line:
AUTH0_CLIENT_ID=REPLACE_WITH_ACTUAL_AUTH0_SPA_CLIENT_ID

# To this (with your actual Client ID):
AUTH0_CLIENT_ID=your_actual_client_id_here
```

### 3. Verify Your Auth0 Application Settings

Ensure your Auth0 application has these settings configured:

#### Application Type
- **Must be**: Single Page Application

#### Allowed Callback URLs
```
http://localhost:8888
http://localhost:8888/
https://your-netlify-site.netlify.app
https://your-netlify-site.netlify.app/
```

#### Allowed Logout URLs
```
http://localhost:8888
http://localhost:8888/
https://your-netlify-site.netlify.app
https://your-netlify-site.netlify.app/
```

#### Allowed Web Origins
```
http://localhost:8888
https://your-netlify-site.netlify.app
```

### 4. Verify Your Configuration

After updating the Client ID, verify everything is set up correctly:

```bash
# Quick verification script
npm run verify:auth0

# Or run directly
node verify-auth0-setup.js
```

### 5. Test the Configuration

After verification passes, test the full configuration:

```bash
# Test the auth config endpoint
curl -s http://localhost:8888/.netlify/functions/auth-config

# Run comprehensive Auth0 validation
npm run test:auth0
```

### 6. Deploy to Netlify

Set the same environment variables in your **Netlify Dashboard**:
- Go to **Site Configuration** → **Environment Variables**
- Add:
  - `AUTH0_DOMAIN=dev-z8gw1uk6zgsrzubk.us.auth0.com`
  - `AUTH0_CLIENT_ID=your_actual_client_id_here`

## 🔧 Optional: Google OAuth Setup

If you want to use Google OAuth, configure it as a **Social Connection** in Auth0:

1. Go to **Auth0 Dashboard** → **Authentication** → **Social**
2. Click **"+ Create Connection"**
3. Select **"Google"**
4. Enter the Google OAuth credentials:
   - Client ID: `1084807378002-trcpgg1i56s35qj51tuvrbbi2jo8fcq0.apps.googleusercontent.com`
   - Client Secret: `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`
5. Enable for your application

## ⚠️ Important Notes

- **DO NOT** use the Google Client ID as your AUTH0_CLIENT_ID
- The Google credentials should only be used in Auth0's Social Connections
- Your application uses the Auth0 Client ID, not the Google Client ID

## 🆘 Need Help?

If you need assistance:
1. Check the `AUTH0_FIX_GUIDE.md` for detailed troubleshooting
2. Run `npm run test:auth0` to validate your configuration
3. Ensure your Auth0 application type is "Single Page Application"