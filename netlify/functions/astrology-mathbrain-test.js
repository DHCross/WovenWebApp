// Minimal test function to debug the issue
exports.handler = async function(event) {
  console.log('[TEST] Function started');
  
  try {
    if (event.httpMethod !== 'POST') {
      console.log('[TEST] Non-POST method, returning 405');
      return {
        statusCode: 405,
        body: JSON.stringify({
          error: 'Only POST requests are allowed.',
          code: 'METHOD_NOT_ALLOWED'
        })
      };
    }

    console.log('[TEST] Parsing request body');
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      console.log('[TEST] Invalid JSON, returning 400');
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid JSON in request body.',
          code: 'INVALID_JSON'
        })
      };
    }

    console.log('[TEST] Request body parsed successfully');
    console.log('[TEST] Body context:', body.context);

    // Simple test response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Test function works',
        receivedContext: body.context,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('[TEST] Unexpected error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
