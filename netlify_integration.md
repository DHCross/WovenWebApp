# Netlify Integration

## Troubleshooting Auth0 404 Domain Errors

1. Verify the Auth0 tenant’s **Domain** in the dashboard and ensure it matches your `AUTH0_DOMAIN` setting.
2. Navigate to `https://<domain>/.well-known/openid-configuration` to confirm the domain is active.
3. Check that the tenant is active and not suspended or deleted.
4. Update local and Netlify environment variables if the domain or credentials change.

For more Auth0 configuration details, see [AUTH0_FIX_GUIDE.md](AUTH0_FIX_GUIDE.md).
