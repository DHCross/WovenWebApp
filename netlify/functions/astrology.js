const API_NATAL_URL = "https://astrologer.p.rapidapi.com/api/v4/natal-aspects-data";
const API_SYNASTRY_URL = "https://astrologer.p.rapidapi.com/api/v4/synastry-aspects-data";

// Header template for RapidAPI requests. The API key is injected
// at runtime inside the handler so tests can verify configuration
// without reloading this module.
function buildHeaders() {
  return {
    "content-type": "application/json",
    "x-rapidapi-key": process.env.RAPIDAPI_KEY,
    "x-rapidapi-host": "astrologer.p.rapidapi.com",
  };
}

exports.handler = async function (event) {
  if (!process.env.RAPIDAPI_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server misconfiguration: RAPIDAPI_KEY is not set.' })
    };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Only POST requests allowed' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON' })
    };
  }

  try {
    // Synastry request
    if (body.first_subject && body.second_subject) {
      const fs = body.first_subject;
      const ss = body.second_subject;

      // Normalize lat/lng to latitude/longitude for API
      [fs, ss].forEach(subject => {
        if (subject.lat !== undefined) {
          subject.latitude = subject.lat;
          delete subject.lat;
        }
        if (subject.lng !== undefined) {
          subject.longitude = subject.lng;
          delete subject.lng;
        }
        // If tz_str is present, use as timezone
        if (subject.tz_str && !subject.timezone) {
          subject.timezone = subject.tz_str;
        }
        // Only keep allowed fields
        const allowedFields = [
          'year', 'month', 'day', 'hour', 'minute',
          'name', 'city', 'nation', 'latitude', 'longitude', 'zodiac_type', 'timezone'
        ];
        for (const key of Object.keys(subject)) {
          if (!allowedFields.includes(key)) delete subject[key];
        }
      });

      console.log('Outgoing synastry body:', JSON.stringify({ first_subject: fs, second_subject: ss }));

      let response;
      try {
        response = await fetch(API_SYNASTRY_URL, {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify({ first_subject: fs, second_subject: ss })
        });
      } catch (err) {
        console.error('Fetch error (synastry):', err);
        return {
          statusCode: 502,
          body: JSON.stringify({ error: 'External API error', details: err.message })
        };
      }

      const rawText = await response.text();
      if (!response.ok) {
        console.error('Astrology API error (synastry):', response.status, rawText);
        return {
          statusCode: 502,
          body: JSON.stringify({ error: 'External API error', details: rawText })
        };
      }

      try {
        JSON.parse(rawText);
      } catch {
        return {
          statusCode: 502,
          body: JSON.stringify({ error: 'Malformed response from API' })
        };
      }

      return {
        statusCode: 200,
        body: rawText
      };
    }

    // Natal request
    else if (body.subject) {
      const subject = body.subject;
      // Normalize lat/lng to latitude/longitude for API
      if (subject.lat !== undefined) {
        subject.latitude = subject.lat;
        delete subject.lat;
      }
      if (subject.lng !== undefined) {
        subject.longitude = subject.lng;
        delete subject.lng;
      }
      // If tz_str is present, use as timezone
      if (subject.tz_str && !subject.timezone) {
        subject.timezone = subject.tz_str;
      }
      // Only keep allowed fields
      const allowedFields = [
        'year', 'month', 'day', 'hour', 'minute',
        'name', 'city', 'nation', 'latitude', 'longitude', 'zodiac_type', 'timezone'
      ];
      for (const key of Object.keys(subject)) {
        if (!allowedFields.includes(key)) delete subject[key];
      }

      console.log('Outgoing natal body:', JSON.stringify({ subject }));

      let response;
      try {
        response = await fetch(API_NATAL_URL, {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify({ subject })
        });
      } catch (err) {
        console.error('Fetch error (natal):', err);
        return {
          statusCode: 502,
          body: JSON.stringify({ error: 'External API error', details: err.message })
        };
      }

      const rawText = await response.text();
      if (!response.ok) {
        console.error('Astrology API error (natal):', response.status, rawText);
        return {
          statusCode: 502,
          body: JSON.stringify({ error: 'External API error', details: rawText })
        };
      }

      try {
        JSON.parse(rawText);
      } catch {
        return {
          statusCode: 502,
          body: JSON.stringify({ error: 'Malformed response from API' })
        };
      }

      return {
        statusCode: 200,
        body: rawText
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing subject or synastry subjects' })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
