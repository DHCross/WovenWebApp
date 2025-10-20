// City Resolution Endpoint - Helper for debugging city->coords resolution
// GET /api/resolve-city?city=Bryn+Mawr&state=PA&nation=US
// Returns resolved coordinates and timezone to verify what the API sees


const { health, resolveCity } = require('../../lib/server/astrology-mathbrain.js');


exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Call the resolveCity function from astrology-mathbrain
  return await resolveCity(event, context);
};