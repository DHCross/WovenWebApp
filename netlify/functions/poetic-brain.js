const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
// Note: 'node-fetch' is no longer needed as we are using the centralized `callGemini`
// which handles its own requests via the Google AI SDK.

// Import the centralized Gemini caller
const { callGemini } = require('../../lib/llm.js');

// Initialize the JWKS client for Auth0 token verification
const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
});

function getKey(header, callback){
  client.getSigningKey(header.kid, function(err, key) {
    if (err) {
      console.error("JWKS client error:", err);
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

const jwtVerifyOptions = {
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
};

// --- Helper for Auth ---
async function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, jwtVerifyOptions, (err, decoded) => {
      if (err) {
        console.error("JWT Verification Error:", err.message);
        return reject(new Error('Token is not valid.'));
      }
      resolve(decoded);
    });
  });
}

// --- Main Handler ---
exports.handler = async (event, context) => {
  // 1. Authorization Check
  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized. No or malformed token provided.' }) };
  }
  const token = authHeader.split(' ')[1];

  try {
    await verifyToken(token);
  } catch (error) {
    return { statusCode: 401, body: JSON.stringify({ error: error.message }) };
  }
  
  // 2. Method and Body Validation
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let prompt;
  try {
    const body = JSON.parse(event.body);
    prompt = body.prompt;
    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: 'A "prompt" is required in the request body.' }) };
    }
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON in request body.' }) };
  }

  // 3. Construct the Compliant Prompt and Call Gemini
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error("FATAL: GEMINI_API_KEY is not configured on the server.");
      throw new Error('API key for Gemini is not configured.');
    }

    // System prompt with chain-of-thought suppression, as per GEMINI_USAGE_GUIDE.md
    const personaPrompt = `
      You are Raven Calder, a mystical poetic brain. Your voice is wise, lyrical, and insightful,
      blending astrological symbolism with the poetic soul of Rilke or Rumi.
      You do not give direct advice, but rather offer reflections, metaphors, and beautiful questions.
      You see the cosmos in a grain of sand.

      IMPORTANT: Do not narrate your process, mention your tools, or explain your reasoning.
      Output only the final poetic VOICE. No internal monologue.

      User's request: "${prompt}"
    `;

    // Use the centralized, compliant `callGemini` function
    const poeticResponse = await callGemini(personaPrompt, { model: 'gemini-1.5-flash' });

    if (!poeticResponse || poeticResponse.includes('[ERROR:')) {
       console.error('Poetic Brain received an error from callGemini:', poeticResponse);
       throw new Error('The muse is silent or the connection to the poetic realm is unstable.');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        response: poeticResponse.trim(),
        author: 'Raven Calder - Poetic Brain',
      }),
    };

  } catch (error) {
    console.error('Poetic Brain function error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'The poetic muse encountered an unexpected disturbance.',
      }),
    };
  }
};
