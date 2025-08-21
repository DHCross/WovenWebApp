const API_BASE_URL = 'https://astrologer.p.rapidapi.com';

const API_ENDPOINTS = {
  NATAL_ASPECTS: `${API_BASE_URL}/api/v4/natal-aspects-data`,
  SYNASTRY_ASPECTS: `${API_BASE_URL}/api/v4/synastry-aspects-data`,
  TRANSIT_ASPECTS: `${API_BASE_URL}/api/v4/transit-aspects-data`,
  COMPOSITE_ASPECTS: `${API_BASE_URL}/api/v4/composite-aspects-data`,
};

const logger = {
  log: (...args) => console.log(`[LOG]`, ...args),
  info: (...args) => console.info(`[INFO]`, ...args),
  warn: (...args) => console.warn(`[WARN]`, ...args),
  error: (...args) => console.error(`[ERROR]`, ...args),
  debug: (...args) => process.env.LOG_LEVEL === 'debug' && console.debug(`[DEBUG]`, ...args),
};

function buildHeaders() {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    throw new Error('RAPIDAPI_KEY environment variable is not configured.');
  }
  return {
    "content-type": "application/json",
    "x-rapidapi-key": key,
    "x-rapidapi-host": "astrologer.p.rapidapi.com",
  };
}

function validateSubject(subject) {
  if (!subject) return { isValid: false, message: 'Subject is null or undefined.' };
  const requiredFields = ['year', 'month', 'day', 'hour', 'minute', 'latitude', 'longitude'];
  const errors = requiredFields.filter(field => subject[field] === undefined || subject[field] === null);
  const isValid = errors.length === 0;
  return {
    isValid,
    message: isValid ? 'Validation successful' : `Missing required fields: ${errors.join(', ')}`,
  };
}

function normalizeSubjectData(data) {
    if (!data || typeof data !== 'object') return null;

    const normalized = {
      name: data.name || 'Subject',
      year: data.year, month: data.month, day: data.day,
      hour: data.hour, minute: data.minute,
      city: data.city || 'London', nation: data.nation,
      latitude: data.latitude, longitude: data.longitude,
      timezone: data.timezone,
      zodiac_type: data.zodiac_type || data.zodiac || 'Tropic',
    };
  
    return normalized;
}

async function apiCallWithRetry(url, options, operation, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`API call attempt ${attempt}/${maxRetries} for ${operation}`);
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorBody = await response.text();
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          logger.error(`Non-retryable client error for ${operation}: ${response.status}`, errorBody);
          throw new Error(`Client error: ${errorBody}`);
        }
        logger.warn(`API call for ${operation} failed with status ${response.status}. Retrying...`);
        throw new Error(`Server error: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      if (attempt === maxRetries || error.message.includes('Client error')) {
        logger.error(`Failed API call for ${operation} after ${attempt} attempts: ${error.message}`);
        throw new Error(`Service temporarily unavailable. Please try again later.`);
      }
      const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

/**
 * Calculates transits for a given subject over a date range.
 * @param {Object} subject - The natal subject data.
 * @param {Object} transitParams - The transit parameters (startDate, endDate, step).
 * @returns {Promise<Object>} An object with transits grouped by date.
 */
async function getTransits(subject, transitParams) {
    if (!transitParams || !transitParams.startDate || !transitParams.endDate) {
        logger.warn('Skipping transit calculation due to missing transit parameters.');
        return {};
    }

    const transitsByDate = {};
    const startDate = new Date(transitParams.startDate);
    const endDate = new Date(transitParams.endDate);

    // Add a day to endDate to make it inclusive
    endDate.setDate(endDate.getDate() + 1);

    for (let d = startDate; d < endDate; d.setDate(d.getDate() + 1)) {
        const dateString = d.toISOString().split('T')[0];
        const transit_subject = {
            year: d.getFullYear(),
            month: d.getMonth() + 1,
            day: d.getDate(),
            hour: 12, // Use noon for consistent daily transits
            minute: 0,
            city: "Greenwich", // Use a neutral reference location
            nation: "GB",
            latitude: 51.4825766,
            longitude: -0.0076589,
            timezone: "UTC"
        };

        try {
            const transit_resp = await apiCallWithRetry(
                API_ENDPOINTS.TRANSIT_ASPECTS,
                {
                    method: 'POST',
                    headers: buildHeaders(),
                    body: JSON.stringify({
                        first_subject: subject,
                        transit_subject: transit_subject,
                    }),
                },
                `Transits for ${subject.name} on ${dateString}`
            );

            // As per changelog, the aspects are at the root level of the response
            if (transit_resp.aspects && transit_resp.aspects.length > 0) {
                transitsByDate[dateString] = transit_resp.aspects;
            }
        } catch (error) {
            logger.error(`Failed to get transits for ${subject.name} on ${dateString}`, error);
        }
    }
    return transitsByDate;
}


exports.handler = async function (event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Only POST requests are allowed.' }) };
    }

    const body = JSON.parse(event.body);
    const { context = {}, transitParams } = body;
    const mode = context.mode || 'natal_transits'; // Default mode

    const personA = normalizeSubjectData(body.personA);
    const personB = normalizeSubjectData(body.personB);

    const validationA = validateSubject(personA);
    if (!validationA.isValid) {
      return { statusCode: 400, body: JSON.stringify({ error: `Person A validation failed: ${validationA.message}` }) };
    }

    let result = {
      schema: 'WM-Chart-1.1',
      person_a: { details: personA },
    };

    switch (mode) {
      case 'natal_transits':
        const natalA_resp = await apiCallWithRetry(
          API_ENDPOINTS.NATAL_ASPECTS,
          { method: 'POST', headers: buildHeaders(), body: JSON.stringify({ subject: personA }) },
          'Natal chart for Person A'
        );
        result.person_a.chart = natalA_resp.data;
        result.person_a.chart.aspects = natalA_resp.aspects;
        result.person_a.chart.transitsByDate = await getTransits(personA, transitParams);
        break;

      case 'synastry_transits':
        const validationB = validateSubject(personB);
        if (!validationB.isValid) {
            return { statusCode: 400, body: JSON.stringify({ error: `Person B is required for synastry mode: ${validationB.message}` }) };
        }
        result.person_b = { details: personB };

        const [natalRespA, natalRespB, synastryResp, transitsA, transitsB] = await Promise.all([
            apiCallWithRetry(API_ENDPOINTS.NATAL_ASPECTS, { method: 'POST', headers: buildHeaders(), body: JSON.stringify({ subject: personA }) }, 'Natal Chart A'),
            apiCallWithRetry(API_ENDPOINTS.NATAL_ASPECTS, { method: 'POST', headers: buildHeaders(), body: JSON.stringify({ subject: personB }) }, 'Natal Chart B'),
            apiCallWithRetry(API_ENDPOINTS.SYNASTRY_ASPECTS, { method: 'POST', headers: buildHeaders(), body: JSON.stringify({ first_subject: personA, second_subject: personB }) }, 'Synastry Aspects'),
            getTransits(personA, transitParams),
            getTransits(personB, transitParams)
        ]);

        result.person_a.chart = { ...natalRespA.data, aspects: natalRespA.aspects, transitsByDate: transitsA };
        result.person_b.chart = { ...natalRespB.data, aspects: natalRespB.aspects, transitsByDate: transitsB };
        result.synastry = { aspects: synastryResp.aspects };
        break;

      case 'composite_transits':
        const validationComp = validateSubject(personB);
        if (!validationComp.isValid) {
            return { statusCode: 400, body: JSON.stringify({ error: `Person B is required for composite mode: ${validationComp.message}` }) };
        }
        result.person_b = { details: personB };

        const composite_resp = await apiCallWithRetry(
          API_ENDPOINTS.COMPOSITE_ASPECTS,
          { method: 'POST', headers: buildHeaders(), body: JSON.stringify({ first_subject: personA, second_subject: personB }) },
          'Composite aspects'
        );
        result.composite = {
            chart: composite_resp.data.composite_subject,
            aspects: composite_resp.aspects,
            transitsByDate: {} // Placeholder
        };
        logger.warn('Composite transit calculation is not yet fully implemented.');
        // TODO: Implement logic to calculate transits to composite chart if API allows.
        break;

      default:
        return { statusCode: 400, body: JSON.stringify({ error: `Unknown context mode: ${mode}` }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };

  } catch (error) {
    logger.error('Handler failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
    };
  }
};