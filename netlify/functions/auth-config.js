// Netlify Function: Public Auth Config
// Exposes only non-secret values needed by the SPA to configure Auth0

const logger = {
  info: (msg, ctx = {}) => console.log(`[INFO] ${msg}`, ctx),
  warn: (msg, ctx = {}) => console.warn(`[WARN] ${msg}`, ctx),
  error: (msg, ctx = {}) => console.error(`[ERROR] ${msg}`, ctx)
};

exports.handler = async function (event, context) {
  const errorId = `auth-config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const domain = process.env.AUTH0_DOMAIN;
    const clientId = process.env.AUTH0_CLIENT_ID;
    // IMPORTANT: Do NOT default to Management API audience. Must be a custom API identifier.
    const audience = process.env.AUTH0_AUDIENCE || null;

    if (!domain || !clientId) {
      const missing = {
        domain: !domain,
        clientId: !clientId
      };
      
      logger.warn('Auth0 configuration incomplete', { missing, errorId });
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Auth0 environment not configured. Set AUTH0_DOMAIN and AUTH0_CLIENT_ID.',
          code: 'AUTH0_CONFIG_MISSING',
          errorId,
          details: { missing }
        })
      };
    }

    logger.info('Auth0 configuration retrieved successfully', { 
      domain: domain,
      hasAudience: Boolean(audience),
      errorId 
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        domain, 
        audience, 
        clientId, 
        hasAudience: !!audience 
      })
    };
  } catch (e) {
    logger.error('Auth0 config endpoint failed', { error: e.message, errorId });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Failed to load auth config',
        code: 'AUTH0_CONFIG_ERROR',
        errorId
      })
    };
  }
};
