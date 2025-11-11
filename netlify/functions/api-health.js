// Netlify Function: API health/status
// Checks presence of critical env vars and reports function availability.

exports.handler = async function(event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  };

  try {
    const perplexityKey = process.env.PERPLEXITY_API_KEY || process.env.PERPLEXITY;
    const perplexity = Boolean(perplexityKey && String(perplexityKey).trim());
    const rapid = Boolean(process.env.RAPIDAPI_KEY && String(process.env.RAPIDAPI_KEY).trim());
    const auth0Domain = Boolean(process.env.AUTH0_DOMAIN && String(process.env.AUTH0_DOMAIN).trim());
    const auth0Client = Boolean(process.env.AUTH0_CLIENT_ID && String(process.env.AUTH0_CLIENT_ID).trim());

    const status = {
      success: true,
      timestamp: new Date().toISOString(),
      env: {
        perplexityConfigured: perplexity,
        rapidapiConfigured: rapid,
        auth0Configured: auth0Domain && auth0Client
      },
      endpoints: {
        poeticBrain: '/.netlify/functions/poetic-brain (POST, requires Auth0 bearer token)',
        authConfig: '/.netlify/functions/auth-config (GET)',
        astrologyHealth: '/.netlify/functions/astrology-health (GET)',
        astrologyMathBrain: '/.netlify/functions/astrology-mathbrain (POST)'
      }
    };

    return { statusCode: 200, headers, body: JSON.stringify(status) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: e.message || 'HEALTH_ERROR' }) };
  }
};
