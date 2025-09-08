// Netlify Function: Public Auth Config
// Exposes only non-secret values needed by the SPA to configure Auth0

exports.handler = async function () {
  try {
    const domain = process.env.AUTH0_DOMAIN;
    const clientId = process.env.AUTH0_CLIENT_ID;
    // IMPORTANT: Do NOT default to Management API audience. Must be a custom API identifier.
    const audience = process.env.AUTH0_AUDIENCE || null;

    if (!domain || !clientId) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify({
          error: 'Auth0 environment not configured. Set AUTH0_DOMAIN and AUTH0_CLIENT_ID.',
          hasAudience: !!audience
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify({ domain, audience, clientId, hasAudience: !!audience })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ error: 'Failed to load auth config' })
    };
  }
};
