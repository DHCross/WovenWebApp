// Netlify Function: Public Auth Config
// Exposes only non-secret values needed by the SPA to configure Auth0

exports.handler = async function () {
  try {
  const domain = process.env.AUTH0_DOMAIN || 'dev-z8gw1uk6zgsrzubk.us.auth0.com';
  // IMPORTANT: Do NOT default to Management API audience. Must be a custom API identifier.
  const audience = process.env.AUTH0_AUDIENCE || null;
    const clientId = process.env.AUTH0_CLIENT_ID || '0nV0L41xZijfc8HTKtoROPgyqgMttJYT';

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
      body: JSON.stringify({ error: 'Failed to load auth config' })
    };
  }
};
