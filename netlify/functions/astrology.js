// netlify/functions/astrology.js
// Simple proxy to astrology-mathbrain function

exports.handler = async (event, context) => {
  // CORS headers for preflight requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // For non-OPTIONS requests, redirect to the main astrology-mathbrain function
  // Since this is a serverless function, we'll import and call the handler directly
  try {
    // Import the astrology-mathbrain handler
    const { handler: mathBrainHandler } = await import('./astrology-mathbrain.ts');

    // Call the math brain handler with the same event and context
    const result = await mathBrainHandler(event, context);

    // Add CORS headers to the response
    return {
      ...result,
      headers: {
        ...result.headers,
        ...corsHeaders
      }
    };
  } catch (error) {
    console.error('Error proxying to astrology-mathbrain:', error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to proxy to astrology-mathbrain function'
      })
    };
  }
};