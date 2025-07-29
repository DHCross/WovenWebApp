// Note: const fetch = require('node-fetch'); has been removed.

exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Allow': 'POST'
  };

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed. Please use POST.' })
    };
  }

  try {
    const API_KEY = process.env.RAPIDAPI_KEY;
    if (!API_KEY) {
      throw new Error("API key is not configured on the server.");
    }
    const API_HOST = "astrologer.p.rapidapi.com";
    const API_BASE_URL = "https://astrologer.p.rapidapi.com/api/v4/natal-aspects-data";

    if (!event.body) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Request body is missing." })
        };
    }
      
    let subject;
    try {
        subject = JSON.parse(event.body).subject;
        if (!subject) {
            throw new Error("'subject' key is missing in the request body.");
        }
    } catch (e) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: `Invalid JSON in request body: ${e.message}` })
        };
    }

    const options = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': API_HOST
      },
      body: JSON.stringify({ subject })
    };

    const apiResponse = await fetch(API_BASE_URL, options);
    const apiData = await apiResponse.json();

    if (!apiResponse.ok) {
      return {
        statusCode: apiResponse.status,
        headers,
        body: JSON.stringify({ error: apiData.detail || 'Failed to fetch data from astrology API.' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(apiData)
    };

  } catch (error) {
    console.error('Critical Error in Netlify function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};