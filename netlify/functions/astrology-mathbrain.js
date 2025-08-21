// This code is a consolidated and cleaned version of the provided Javascript for interacting with the Astrologer API.
// It is ready to be used as a serverless function handler (e.g., in a Node.js environment).

const API_BASE_URL = 'https://astrologer.p.rapidapi.com';

const API_ENDPOINTS = {
  BIRTH_CHART:        `${API_BASE_URL}/api/v4/birth-chart`,          // natal chart + aspects
  SYNASTRY_CHART:     `${API_BASE_URL}/api/v4/synastry-chart`,       // A↔B + aspects
  TRANSIT_CHART:      `${API_BASE_URL}/api/v4/transit-chart`,        // subject + aspects
  TRANSIT_ASPECTS:    `${API_BASE_URL}/api/v4/transit-aspects-data`, // data-only
  SYNASTRY_ASPECTS:   `${API_BASE_URL}/api/v4/synastry-aspects-data`,
  BIRTH_DATA:         `${API_BASE_URL}/api/v4/birth-data`,
  NOW:                `${API_BASE_URL}/api/v4/now`,
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
  const required = [
    'year','month','day','hour','minute',
    'name','city','nation','latitude','longitude','zodiac_type','timezone'
  ];
  const missing = required.filter(f => subject[f] === undefined || subject[f] === null || subject[f] === '');
  return { isValid: missing.length === 0, message: missing.length ? `Missing: ${missing.join(', ')}` : 'ok' };
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

exports.handler = async function(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Only POST requests are allowed.' }) };
    }

    const body = JSON.parse(event.body || '{}');

    // Inputs
    const personA = normalizeSubjectData(body.personA || body.person_a || body.first_subject || body.subject);
    const personB = normalizeSubjectData(body.personB || body.person_b || body.second_subject);
    const { isValid, message } = validateSubject(personA);
    if (!isValid) return { statusCode: 400, body: JSON.stringify({ error: `Primary subject validation failed: ${message}` }) };

    const start = body.transitStartDate || body.transit_start_date || body.transitParams?.startDate;
    const end   = body.transitEndDate   || body.transit_end_date   || body.transitParams?.endDate;
    const step  = body.transitStep      || body.transit_step       || body.transitParams?.step || 'daily';
    const haveRange = Boolean(start && end);

    const headers = buildHeaders();
    const result = { person_a: { details: personA } };

    // 1) Natal (chart + aspects)
    const natal = await apiCallWithRetry(
      API_ENDPOINTS.BIRTH_CHART,
      { method: 'POST', headers, body: JSON.stringify({ subject: personA }) },
      'Birth chart (A)'
    );
    // assuming provider returns { data: { positions/angles/houseCusps..., aspects: [...] } }
    result.person_a.chart = natal.data || {};
    result.person_a.aspects = (natal.data && natal.data.aspects) || [];

    // 2) Transits (optional; raw aspects by date)
    if (haveRange) {
      const t = await apiCallWithRetry(
        API_ENDPOINTS.TRANSIT_ASPECTS,
        { method: 'POST', headers,
          body: JSON.stringify({ subject: personA, start_date: start, end_date: end, step })
        },
        'Transit aspects (A)'
      );
      // expecting { data: { transitsByDate: { 'YYYY-MM-DD': [...] } } }
      result.person_a.chart = { ...result.person_a.chart, transitsByDate: t.data?.transitsByDate || {} };
    }

    // 3) Optional synastry (chart + aspects) — only if explicitly requested
    const wantSynastry = (body.context?.mode || body.mode || '').toString().toUpperCase() === 'SYNASTRY';
    const validB = validateSubject(personB).isValid;
    if (wantSynastry && validB) {
      const syn = await apiCallWithRetry(
        API_ENDPOINTS.SYNASTRY_CHART,
        { method: 'POST', headers, body: JSON.stringify({ first_subject: personA, second_subject: personB }) },
        'Synastry chart'
      );
      result.person_b = { details: personB, chart: syn.data?.second_subject || {} };
      result.synastry = syn.data?.aspects || [];
    }

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result) };
  } catch (err) {
    logger.error('Handler failed:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected error.' }) };
  }
};