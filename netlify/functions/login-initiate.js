// Netlify Function: Auth0 Login Initiation Handler
// Handles OIDC third-party initiated login and other Auth0 redirect scenarios
// Routes users to Auth0's /authorize endpoint with proper parameters

exports.handler = async function(event, context) {
  try {
    // Parse query parameters from the login initiation request
    const params = event.queryStringParameters || {};
    
    // Log the incoming request for debugging
    console.log('[Login Initiate] Incoming request:', {
      path: event.path,
      method: event.httpMethod,
      query: params,
      headers: event.headers
    });

    // Get Auth0 configuration from environment
    const auth0Domain = process.env.AUTH0_DOMAIN;
    const auth0ClientId = process.env.AUTH0_CLIENT_ID;
    const auth0Audience = process.env.AUTH0_AUDIENCE;

    if (!auth0Domain || !auth0ClientId) {
      console.error('[Login Initiate] Missing Auth0 configuration');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store'
        },
        body: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Authentication Error</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; padding: 2rem; text-align: center;">
            <h1>Authentication Configuration Error</h1>
            <p>Auth0 is not properly configured. Please contact the administrator.</p>
            <p><a href="/">Return to Home</a></p>
          </body>
          </html>
        `
      };
    }

    // Determine the origin for redirect_uri
    const origin = event.headers.origin || 
                  (event.headers['x-forwarded-proto'] && event.headers.host 
                    ? `${event.headers['x-forwarded-proto']}://${event.headers.host}`
                    : 'https://sprightly-genie-998c07.netlify.app');

    // Build Auth0 authorization URL
    const authParams = new URLSearchParams({
      client_id: auth0ClientId,
      response_type: 'code',
      redirect_uri: origin,
      scope: 'openid profile email'
    });

    // Add audience if configured
    if (auth0Audience) {
      authParams.set('audience', auth0Audience);
    }

    // Handle specific Auth0 scenarios based on query parameters
    
    // OIDC Third-Party Initiated Login
    if (params.iss) {
      console.log('[Login Initiate] OIDC third-party initiated login detected');
      // The 'iss' parameter is added by Auth0 for third-party initiated login
      // We don't need to forward it, just log it for debugging
    }

    // Organization invitation flow
    if (params.invitation && params.organization) {
      console.log('[Login Initiate] Organization invitation flow detected');
      authParams.set('invitation', params.invitation);
      authParams.set('organization', params.organization);
      
      if (params.organization_name) {
        authParams.set('organization_name', params.organization_name);
      }
    }

    // Generic organization parameter
    if (params.organization && !params.invitation) {
      console.log('[Login Initiate] Organization login detected');
      authParams.set('organization', params.organization);
    }

    // Handle any additional state parameters that should be preserved
    if (params.state) {
      authParams.set('state', params.state);
    }

    // Add prompt parameter for fresh authentication if needed
    if (params.prompt) {
      authParams.set('prompt', params.prompt);
    } else {
      // Default to select_account for better UX
      authParams.set('prompt', 'select_account');
    }

    // Build the full Auth0 authorization URL
    const authUrl = `https://${auth0Domain}/authorize?${authParams.toString()}`;

    console.log('[Login Initiate] Redirecting to Auth0:', {
      domain: auth0Domain,
      clientId: auth0ClientId,
      redirectUri: origin,
      hasAudience: !!auth0Audience,
      authUrl: authUrl.replace(auth0ClientId, '[CLIENT_ID]') // Mask client ID in logs
    });

    // Redirect to Auth0 with proper parameters
    return {
      statusCode: 302,
      headers: {
        'Location': authUrl,
        'Cache-Control': 'no-store'
      },
      body: ''
    };

  } catch (error) {
    console.error('[Login Initiate] Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store'
      },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Login Error</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; padding: 2rem; text-align: center;">
          <h1>Login Error</h1>
          <p>An error occurred while initiating login. Please try again.</p>
          <p><a href="/">Return to Home</a></p>
          <details style="margin-top: 2rem; text-align: left;">
            <summary>Error Details</summary>
            <pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow: auto;">${error.message}</pre>
          </details>
        </body>
        </html>
      `
    };
  }
};