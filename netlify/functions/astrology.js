const API_NATAL_URL = "https://astrologer.p.rapidapi.com/api/v4/natal-aspects-data";
const API_SYNASTRY_URL = "https://astrologer.p.rapidapi.com/api/v4/synastry-aspects-data";

const headers = {
  "content-type": "application/json",
  "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
  "X-RapidAPI-Host": "astrologer.p.rapidapi.com"
};

exports.handler = async function (event) {
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

      [fs, ss].forEach(subject => {
        if (subject.timezone && !subject.tz_str) {
          subject.tz_str = subject.timezone;
          delete subject.timezone;
        }

        const required = ['year', 'month', 'day', 'hour', 'minute', 'name', 'city'];
        for (const key of required) {
          if (!subject[key]) throw new Error(`Missing ${key} in subject`);
        }
      });

      const response = await fetch(API_SYNASTRY_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ first_subject: fs, second_subject: ss })
      });

      const rawText = await response.text();
      console.error('Astrology API error (synastry):', response.status, rawText);
      if (!response.ok) {
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
      if (subject.timezone && !subject.tz_str) {
        subject.tz_str = subject.timezone;
        delete subject.timezone;
      }

      const required = ['year', 'month', 'day', 'hour', 'minute', 'name', 'city'];
      for (const key of required) {
        if (!subject[key]) throw new Error(`Missing ${key} in subject`);
      }

      const response = await fetch(API_NATAL_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ subject })
      });

      const rawText = await response.text();
      console.error('Astrology API error (natal):', response.status, rawText);
      if (!response.ok) {
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
