// This code is a consolidated and cleaned version of the provided Javascript for interacting with the Astrologer API.
// It is ready to be used as a serverless function handler (e.g., in a Node.js environment).

const API_BASE_URL = 'https://astrologer.p.rapidapi.com';

const API_ENDPOINTS = {
  BIRTH_CHART:        `${API_BASE_URL}/api/v4/birth-chart`,          // natal chart + aspects
  NATAL_ASPECTS_DATA: `${API_BASE_URL}/api/v4/natal-aspects-data`,  // natal aspects only
  SYNASTRY_CHART:     `${API_BASE_URL}/api/v4/synastry-chart`,       // A↔B + aspects
  TRANSIT_CHART:      `${API_BASE_URL}/api/v4/transit-chart`,        // subject + aspects
  TRANSIT_ASPECTS:    `${API_BASE_URL}/api/v4/transit-aspects-data`, // data-only
  SYNASTRY_ASPECTS:   `${API_BASE_URL}/api/v4/synastry-aspects-data`,
  BIRTH_DATA:         `${API_BASE_URL}/api/v4/birth-data`,
  NOW:                `${API_BASE_URL}/api/v4/now`,
  COMPOSITE_ASPECTS:  `${API_BASE_URL}/api/v4/composite-aspects-data`, // composite aspects only
};

// Simplified logging utility to avoid external dependencies
const logger = {
  log: (...args) => console.log(`[LOG]`, ...args),
  info: (...args) => console.info(`[INFO]`, ...args),
  warn: (...args) => console.warn(`[WARN]`, ...args),
  error: (...args) => console.error(`[ERROR]`, ...args),
  debug: (...args) => process.env.LOG_LEVEL === 'debug' && console.debug(`[DEBUG]`, ...args),
};

// --- DATA-ONLY HELPERS (drop-in) ---
function stripGraphicsDeep(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const kill = new Set([
    'wheel','svg','image','images','chart_image','graphical','png','jpg','jpeg','pdf',
    'wheel_url','image_url','chartUrl','rendered_svg','rendered_png'
  ]);
  if (Array.isArray(obj)) return obj.map(stripGraphicsDeep);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (kill.has(k)) continue;
    if (v && typeof v === 'object') {
      out[k] = stripGraphicsDeep(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function normalizeStep(step) {
  const s = String(step || '').toLowerCase();
  if (['daily','weekly','monthly'].includes(s)) return s;
  if (s === '1d') return 'daily';
  if (s === '7d') return 'weekly';
  if (s === '1m' || s === '1mo' || s === 'monthly') return 'monthly';
  return 'daily';
}

function validateSubjectLean(s = {}) {
  const req = ['year','month','day','hour','minute','latitude','longitude'];
  const missing = req.filter(k => s[k] === undefined || s[k] === null || s[k] === '');
  return { isValid: missing.length === 0, message: missing.length ? `Missing: ${missing.join(', ')}` : 'ok' };
}

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
    city: data.city, nation: data.nation,
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

// --- Composite helpers ---
async function computeComposite(A, B, pass = {}, H) {
  const payload = {
    first_subject: A,
    second_subject: B,
    ...pass,
  };
  const r = await apiCallWithRetry(
    API_ENDPOINTS.COMPOSITE_ASPECTS,
    { method: 'POST', headers: H, body: JSON.stringify(payload) },
    'Composite aspects'
  );
  const data = stripGraphics(r.data || {});
  return {
    aspects: data.aspects || [],
    raw: data,
  };
}

async function computeCompositeTransits(compositeRaw, start, end, step, pass = {}, H) {
  if (!compositeRaw) return { transitsByDate: {} };
  const payload = {
    composite_subject: compositeRaw,
    start_date: start,
    end_date: end,
    step,
    ...pass,
  };
  try {
    const r = await apiCallWithRetry(
      API_ENDPOINTS.TRANSIT_ASPECTS,
      { method:'POST', headers:H, body: JSON.stringify(payload) },
      'Composite transit aspects'
    );
    return { transitsByDate: r.data?.transitsByDate || {} };
  } catch (e) {
    return { transitsByDate: {}, _note: 'Composite transits not available in current plan' };
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
    // Use strict validator for full chart endpoints, lean for aspects-only
    const modeToken = (body.context?.mode || body.mode || '').toString().toUpperCase();
    const wantNatalAspectsOnly = modeToken === 'NATAL_ASPECTS' || event.path?.includes('natal-aspects-data');
    const wantBirthData = modeToken === 'BIRTH_DATA' || event.path?.includes('birth-data');
    const wantSynastry = modeToken === 'SYNASTRY';
    const wantSynastryAspectsOnly = modeToken === 'SYNASTRY_ASPECTS' || event.path?.includes('synastry-aspects-data');
    const wantComposite = modeToken === 'COMPOSITE' || modeToken === 'COMPOSITE_ASPECTS' || modeToken === 'COMPOSITE_TRANSITS' || body.wantComposite === true;

    const vA = (wantNatalAspectsOnly || wantBirthData) ? validateSubjectLean(personA) : validateSubject(personA);
    if (!vA.isValid) return { statusCode: 400, body: JSON.stringify({ error: `Primary subject validation failed: ${vA.message}` }) };

    const start = body.transitStartDate || body.transit_start_date || body.transitParams?.startDate;
    const end   = body.transitEndDate   || body.transit_end_date   || body.transitParams?.endDate;
    const step  = normalizeStep(body.transitStep || body.transit_step || body.transitParams?.step);
    const haveRange = Boolean(start && end);

    const headers = buildHeaders();
    const result = { person_a: { details: personA } };

    // 1) Natal (chart + aspects, natal aspects-only, or birth data)
    let natalResponse;
    if (wantBirthData) {
      natalResponse = await apiCallWithRetry(
        API_ENDPOINTS.BIRTH_DATA,
        { method: 'POST', headers, body: JSON.stringify({ subject: personA }) },
        'Birth data (A)'
      );
      result.person_a.birth_data = stripGraphicsDeep(natalResponse.data || {});
    } else if (wantNatalAspectsOnly) {
      natalResponse = await apiCallWithRetry(
        API_ENDPOINTS.NATAL_ASPECTS_DATA,
        { method: 'POST', headers, body: JSON.stringify({ subject: personA }) },
        'Natal aspects data (A)'
      );
      let chartData = stripGraphicsDeep(natalResponse.data || {});
      result.person_a.chart = chartData;
      result.person_a.aspects = (chartData && chartData.aspects) || [];
    } else {
      natalResponse = await apiCallWithRetry(
        API_ENDPOINTS.BIRTH_CHART,
        { method: 'POST', headers, body: JSON.stringify({ subject: personA }) },
        'Birth chart (A)'
      );
      let chartData = stripGraphicsDeep(natalResponse.data || {});
      result.person_a.chart = chartData;
      result.person_a.aspects = (chartData && chartData.aspects) || [];
    }

    // 2) Transits (optional; raw aspects by date, with advanced options)
    if (haveRange) {
      const active_points = body.active_points;
      const active_aspects = body.active_aspects;
      const transitPayload = {
        subject: personA,
        start_date: start,
        end_date: end,
        step,
      };
      if (Array.isArray(active_points)) transitPayload.active_points = active_points;
      if (Array.isArray(active_aspects)) transitPayload.active_aspects = active_aspects;
      const t = await apiCallWithRetry(
        API_ENDPOINTS.TRANSIT_ASPECTS,
        { method: 'POST', headers,
          body: JSON.stringify(transitPayload)
        },
        'Transit aspects (A)'
      );
      result.person_a.chart = { ...result.person_a.chart, transitsByDate: stripGraphicsDeep(t.data?.transitsByDate || {}) };
    }

    // 3) Synastry (chart + aspects, or synastry aspects-only)
    const validBLean = validateSubjectLean(personB);
    const validBStrict = validateSubject(personB);
    if (wantSynastryAspectsOnly && validBLean.isValid) {
      // Synastry aspects-only endpoint
      const syn = await apiCallWithRetry(
        API_ENDPOINTS.SYNASTRY_ASPECTS,
        { method: 'POST', headers, body: JSON.stringify({ first_subject: personA, second_subject: personB }) },
        'Synastry aspects data'
      );
      let synData = stripGraphicsDeep(syn.data || {});
      result.person_b = { details: personB };
      result.synastry = synData.aspects || [];
      result.synastry_data = synData;
    } else if (wantSynastry && validBStrict.isValid) {
      // Full synastry chart endpoint
      const syn = await apiCallWithRetry(
        API_ENDPOINTS.SYNASTRY_CHART,
        { method: 'POST', headers, body: JSON.stringify({ first_subject: personA, second_subject: personB }) },
        'Synastry chart'
      );
      const synClean = stripGraphicsDeep(syn.data || {});
      result.person_b = { details: personB, chart: synClean.second_subject || {} };
      result.synastry = synClean.aspects || [];
    }

    // === NEW COMPOSITE BRANCH ===
    const pass = {};
    ['active_points','active_aspects','houses_system_identifier','sidereal_mode','perspective_type']
      .forEach(k => { if (body[k] !== undefined) pass[k] = body[k]; });

    const vB = personB ? validateSubjectLean(personB) : { isValid:false };
    if (wantComposite && vB.isValid) {
      // Always compute composite aspects first (data-only)
      const composite = await computeComposite(personA, personB, pass, headers);
      result.person_b = { ...(result.person_b || {}), details: personB };
      result.composite = { aspects: composite.aspects, data: composite.raw };

      // Optional: if range present and your plan supports it, try composite transit activations
      if (modeToken === 'COMPOSITE_TRANSITS' && haveRange) {
        const t = await computeCompositeTransits(composite.raw, start, end, step, pass, headers);
        result.composite.transitsByDate = t.transitsByDate;
        if (t._note) result.composite.note = t._note;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    logger.error('Handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};