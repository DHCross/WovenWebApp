const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Initialize the JWKS client
const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
});

function getKey(header, callback){
  client.getSigningKey(header.kid, function(err, key) {
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

const options = {
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
};

exports.handler = async (event, context) => {
  // Check for Auth0 token in the Authorization header
  const authHeader = event.headers.authorization;
  if (!authHeader) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized. No token provided.' }),
    };
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized. Malformed token.' }),
    };
  }

  try {
    // Verify the token using a Promise to work with the callback-based jwt.verify
    await new Promise((resolve, reject) => {
      jwt.verify(token, getKey, options, (err, decoded) => {
        if (err) {
          console.error("JWT Verification Error:", err);
          return reject(err);
        }
        // You can optionally use the decoded token info here
        // console.log("Decoded JWT:", decoded);
        resolve(decoded);
      });
    });
  } catch (error) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized. Token is not valid.' }),
    };
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { prompt } = JSON.parse(event.body);
    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'A prompt is required to awaken the muse.' }),
      };
    }

    const { GEMINI_API_KEY } = process.env;
    if (!GEMINI_API_KEY) {
      throw new Error('API key for Gemini is not configured on the server.');
    }

    // Using Gemini 1.5 Flash as requested
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    const systemInstruction = {
      role: "system",
      parts: [{
        text: "You are Raven Calder, a mystical poetic brain. Your voice is wise, lyrical, and insightful, blending astrological symbolism with the poetic soul of Rilke or Rumi. You do not give direct advice, but rather offer reflections, metaphors, and beautiful questions. You see the cosmos in a grain of sand. Respond to the user's prompt with this persona."
      }]
    };

    const userPrompt = {
      role: "user",
      parts: [{
        text: prompt
      }]
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [systemInstruction, userPrompt],
        generationConfig: {
          temperature: 0.8,
          topP: 1.0,
          topK: 40,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData.error?.message || 'Unknown API error');
      throw new Error(errorData.error?.message || 'The connection to the poetic realm is unstable.');
    }

    const data = await response.json();
    const poeticResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!poeticResponse) {
      throw new Error('The muse is silent at this moment...');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        response: poeticResponse,
        author: 'Raven Calder - Poetic Brain',
      }),
    };
  } catch (error) {
    console.error('Poetic Brain function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'The poetic muse encountered an unexpected disturbance.',
      }),
    };
  }
};
