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

    let postBody;
    let API_BASE_URL;

    try {
      const body = JSON.parse(event.body);
      console.log("Parsed request body:", body);

      if (body.first_subject && body.second_subject) {
        // Synastry call
        const requiredFields = ['year', 'month', 'day', 'hour', 'minute', 'name', 'city'];
        for (const field of requiredFields) {
          if (!body.first_subject[field]) throw new Error(`Missing required field in first_subject: ${field}`);
          if (!body.second_subject[field]) throw new Error(`Missing required field in second_subject: ${field}`);
        }
        API_BASE_URL = "https://astrologer.p.rapidapi.com/api/v4/synastry-aspects-data";
        postBody = {
          first_subject: body.first_subject,
          second_subject: body.second_subject
        };
      } else if (body.subject) {
        // Natal call
        const subject = body.subject;
        const requiredFields = ['year', 'month', 'day', 'hour', 'minute', 'name', 'city'];
        for (const field of requiredFields) {
          if (!subject[field]) throw new Error(`Missing required field in subject: ${field}`);
        }
        API_BASE_URL = "https://astrologer.p.rapidapi.com/api/v4/natal-aspects-data";
        postBody = { subject };
      } else {
        throw new Error("Invalid request body. Must contain either 'subject' or 'first_subject' and 'second_subject'.");
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
      body: JSON.stringify(postBody)
    };

    const apiResponse = await fetch(API_BASE_URL, options);
    const rawText = await apiResponse.text();

    console.log("Raw response from astrology API:", rawText);

    let apiData;
    try {
      apiData = JSON.parse(rawText);
    } catch (err) {
      console.error("Non-JSON response from astrology API:", rawText);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: `Invalid JSON from upstream API: ${rawText}`
        })
      };
    }

    // Ensure error details are always returned as a readable string
    if (apiData && typeof apiData.detail !== 'string' && apiData.detail !== undefined) {
      apiData.detail = JSON.stringify(apiData.detail);
    }

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