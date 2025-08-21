// This code is a consolidated and cleaned version of the provided Javascript for interacting with the Astrologer API.
// It is ready to be used as a serverless function handler (e.g., in a Node.js environment).

const API_BASE_URL = 'https://astrologer.p.rapidapi.com';

const API_ENDPOINTS = {
  NATAL_ASPECTS: `${API_BASE_URL}/api/v4/natal-aspects-data`,
  SYNASTRY_ASPECTS: `${API_BASE_URL}/api/v4/synastry-aspects-data`,
  TRANSIT_ASPECTS: `${API_BASE_URL}/api/v4/transit-aspects-data`,
  COMPOSITE_ASPECTS: `${API_BASE_URL}/api/v4/composite-aspects-data`,
  BIRTH_DATA: `${API_BASE_URL}/api/v4/birth-data`,
  NOW: `${API_BASE_URL}/api/v4/now`,
};

// Simplified logging utility to avoid external dependencies
const logger = {
  log: (...args) => console.log(`[LOG]`, ...args),
  info: (...args) => console.info(`[INFO]`, ...args),
  warn: (...args) => console.warn(`[WARN]`, ...args),
  error: (...args) => console.error(`[ERROR]`, ...args),
  debug: (...args) => process.env.LOG_LEVEL === 'debug' && console.debug(`[DEBUG]`, ...args),
};

// --- Helper Functions ---

/**
 * Builds standard headers for API requests.
 * @returns {Object} Headers object.
 * @throws {Error} if the RapidAPI key is not configured.
 */
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

/**
 * Validates a subject object for all required fields.
 * @param {Object} subject - The subject data to validate.
 * @returns {{isValid: boolean, message: string}}
 */
function validateSubject(subject) {
  const requiredFields = ['year', 'month', 'day', 'hour', 'minute', 'latitude', 'longitude'];
  const errors = requiredFields.filter(field => !subject[field] && subject[field] !== 0);
  const isValid = errors.length === 0;
  return {
    isValid,
    message: isValid ? 'Validation successful' : `Missing required fields: ${errors.join(', ')}`,
  };
}

/**
 * Normalizes subject data from various input formats to the API's `SubjectModel`.
 * @param {Object} data - Raw subject data.
 * @returns {Object} Normalized subject model.
 */
function normalizeSubjectData(data) {
  if (!data || typeof data !== 'object') return {};
  
  const normalized = {
    name: data.name || 'Subject',
    year: data.year, month: data.month, day: data.day,
    hour: data.hour, minute: data.minute,
    city: data.city || 'London', nation: data.nation,
    latitude: data.latitude, longitude: data.longitude,
    timezone: data.timezone,
    zodiac_type: data.zodiac_type || data.zodiac || 'Tropic',
  };

  // Convert legacy fields
  if (data.date) {
    const [m, d, y] = data.date.split('-').map(Number);
    normalized.year = normalized.year || y;
    normalized.month = normalized.month || m;
    normalized.day = normalized.day || d;
  }
  if (data.time) {
    const [h, min] = data.time.split(':').map(Number);
    normalized.hour = normalized.hour || h;
    normalized.minute = normalized.minute || min;
  }
  if (data.coordinates) {
    const [lat, lng] = data.coordinates.split(',').map(s => parseFloat(s.trim()));
    normalized.latitude = normalized.latitude || lat;
    normalized.longitude = normalized.longitude || lng;
  }

  return normalized;
}

/**
 * Robustly calls an API endpoint with retry logic and error handling.
 * @param {string} url - The API endpoint URL.
 * @param {Object} options - Fetch options.
 * @param {string} operation - A description for logging.
 * @param {number} maxRetries - Max retry attempts.
 * @returns {Promise<Object>} The parsed JSON response.
 */
async function apiCallWithRetry(url, options, operation, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`API call attempt ${attempt}/${maxRetries} for ${operation}`);
      const response = await fetch(url, options);

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error('Non-retryable client error');
        }
        logger.warn(`API call failed with status ${response.status}. Retrying...`);
        throw new Error(`Server error: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      if (attempt === maxRetries || error.message.includes('Non-retryable')) {
        logger.error(`Failed after ${attempt} attempts: ${error.message}`, { url, operation });
        throw new Error(`Service temporarily unavailable. Please try again later.`);
      }
      const delay = Math.pow(2, attempt) * 100 + Math.random() * 100; // Exponential backoff
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

// --- Main Handler ---

/**
 * Main serverless function to handle astrological chart calculations.
 * @param {Object} event - The Netlify function event object.
 * @returns {Promise<Object>} An HTTP response object.
 */
exports.handler = async function (event) {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Only POST requests are allowed.' }),
      };
    }

    const body = JSON.parse(event.body);
    const personA = normalizeSubjectData(body.personA || body.person_a || body.first_subject || body.subject);
    const personB = normalizeSubjectData(body.personB || body.person_b || body.second_subject);

    const validationA = validateSubject(personA);
    if (!validationA.isValid) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Primary subject validation failed: ${validationA.message}` }),
      };
    }

    let result = {
      person_a: { details: personA },
      person_b: undefined,
      synastry: undefined,
    };

    // Calculate Person A's natal aspects
    const natalA_resp = await apiCallWithRetry(
      API_ENDPOINTS.NATAL_ASPECTS,
      { method: 'POST', headers: buildHeaders(), body: JSON.stringify({ subject: personA }) },
      'Natal chart for Person A'
    );
    result.person_a.chart = natalA_resp.data;
    result.person_a.aspects = natalA_resp.aspects;


    // --- Transit & Composite Calculation ---
    const mode = body.context?.mode || body.mode;
    const transitParams = body.transitParams || {};
    const transitStartDate = body.transitStartDate || body.transit_start_date || transitParams.startDate;
    const transitEndDate = body.transitEndDate || body.transit_end_date || transitParams.endDate;
    const transitStep = body.transitStep || body.transit_step || transitParams.step || 'daily';

    // Composite Transits
    if (
      (mode === 'COMPOSITE_TRANSITS' || (personA && personB && transitStartDate && transitEndDate))
    ) {
      try {
        const compositePayload = {
          first_subject: personA,
          second_subject: personB,
          start_date: transitStartDate,
          end_date: transitEndDate,
          step: transitStep,
        };
        const composite_resp = await apiCallWithRetry(
          API_ENDPOINTS.COMPOSITE_ASPECTS,
          { method: 'POST', headers: buildHeaders(), body: JSON.stringify(compositePayload) },
          'Composite aspects and transits'
        );
        result.composite = composite_resp.data || {};
      } catch (err) {
        logger.warn('Composite calculation failed:', err);
      }
    } else if (
      mode === 'natal_transits' || mode === 'synastry_transits'
    ) {
      if (transitStartDate && transitEndDate) {
        try {
          const transitPayload = {
            subject: personA,
            start_date: transitStartDate,
            end_date: transitEndDate,
            step: transitStep,
          };
          const transit_resp = await apiCallWithRetry(
            API_ENDPOINTS.TRANSIT_ASPECTS,
            { method: 'POST', headers: buildHeaders(), body: JSON.stringify(transitPayload) },
            'Transit aspects for Person A'
          );
          if (result.person_a.chart) {
            result.person_a.chart.transitsByDate = transit_resp.data?.transitsByDate || {};
          } else {
            result.person_a.chart = { transitsByDate: transit_resp.data?.transitsByDate || {} };
          }
        } catch (err) {
          logger.warn('Transit calculation failed:', err);
        }
      }
    }

    // Calculate synastry if Person B is present
    if (validateSubject(personB).isValid) {
      const synastry_resp = await apiCallWithRetry(
        API_ENDPOINTS.SYNASTRY_ASPECTS,
        {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify({
            first_subject: personA,
            second_subject: personB,
          }),
        },
        'Synastry aspects'
      );
      result.person_b = { details: personB, chart: synastry_resp.data.second_subject };
      result.synastry = synastry_resp.aspects;
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