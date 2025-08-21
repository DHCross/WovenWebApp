// This code is a consolidated and cleaned version of the provided Javascript for interacting with the Astrologer API.
// It is ready to be used as a serverless function handler (e.g., in a Node.js environment).

const { aggregate } = require('../../src/seismograph');
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

async function getTransits(subject, transitParams, headers) {
    if (!transitParams || !transitParams.startDate || !transitParams.endDate) return {};

    const transitsByDate = {};
    const startDate = new Date(transitParams.startDate);
    const endDate = new Date(transitParams.endDate);
    endDate.setDate(endDate.getDate() + 1); // Make end date inclusive

    const promises = [];
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
        const dateString = d.toISOString().split('T')[0];
        const transit_subject = {
            year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(),
            hour: 12, minute: 0, city: "Greenwich", nation: "GB",
            latitude: 51.48, longitude: 0, timezone: "UTC"
        };

        promises.push(
            apiCallWithRetry(
                API_ENDPOINTS.TRANSIT_ASPECTS,
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ first_subject: subject, transit_subject }),
                },
                `Transits for ${subject.name} on ${dateString}`
            ).then(resp => {
                if (resp.aspects && resp.aspects.length > 0) {
                    transitsByDate[dateString] = resp.aspects;
                }
            }).catch(e => logger.error(`Failed to get transits for ${dateString}`, e))
        );
    }
    await Promise.all(promises);
    return transitsByDate;
}

function calculateSeismograph(transitsByDate) {
    if (!transitsByDate || Object.keys(transitsByDate).length === 0) {
        return { daily: {}, summary: {} };
    }

    const days = Object.keys(transitsByDate).sort();
    let prev = null;
    const daily = {};

    for (const d of days) {
        const aspects = (transitsByDate[d] || []).map(x => ({
            transit: { body: x.p1_name },
            natal: {
                body: x.p2_name,
                isAngleProx: ["Ascendant","Medium_Coeli","Descendant","Imum_Coeli"].includes(x.p2_name),
                isLuminary: ["Sun","Moon"].includes(x.p2_name),
                degCrit: false // This information is not available from the API
            },
            type: (x.aspect || "").toLowerCase(),
            orbDeg: typeof x.orbit === "number" ? x.orbit : 6.01
        }));

        const agg = aggregate(aspects, prev);
        daily[d] = { seismograph: { magnitude: agg.magnitude, valence: agg.valence, volatility: agg.volatility } };
        prev = { scored: agg.scored, Y_effective: agg.valence };
    }

    const numDays = days.length;
    const X = Object.values(daily).reduce((s, d) => s + d.seismograph.magnitude, 0) / numDays;
    const Y = Object.values(daily).reduce((s, d) => s + d.seismograph.valence, 0) / numDays;
    const VI = Object.values(daily).reduce((s, d) => s + d.seismograph.volatility, 0) / numDays;
    const summary = { magnitude: +X.toFixed(2), valence: +Y.toFixed(2), volatility: +VI.toFixed(2) };

    return { daily, summary };
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
  const data = stripGraphicsDeep(r.data || {});
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
    const modeToken = (body.context?.mode || 'NATAL_TRANSITS').toString().toUpperCase();

    const vA = validateSubject(personA);
    if (!vA.isValid) return { statusCode: 400, body: JSON.stringify({ error: `Primary subject validation failed: ${vA.message}` }) };

    const start = body.transitStartDate || body.transit_start_date || body.transitParams?.startDate;
    const end   = body.transitEndDate   || body.transit_end_date   || body.transitParams?.endDate;
    const step  = normalizeStep(body.transitStep || body.transit_step || body.transitParams?.step);
    const haveRange = Boolean(start && end);

    const headers = buildHeaders();
    const result = { person_a: { details: personA } };

    switch (modeToken) {
        case 'BIRTH_CHART': {
            const natalResp = await apiCallWithRetry(API_ENDPOINTS.BIRTH_CHART, { method: 'POST', headers, body: JSON.stringify({ subject: personA }) }, 'Birth Chart A');
            result.person_a.chart = { ...stripGraphicsDeep(natalResp.data), aspects: natalResp.aspects || [] };
            break;
        }

        case 'SYNASTRY': {
            const vB = validateSubject(personB);
            if (!vB.isValid) return { statusCode: 400, body: JSON.stringify({ error: `Person B is required for synastry mode: ${vB.message}` }) };
            result.person_b = { details: personB };
            const synastryResp = await apiCallWithRetry(API_ENDPOINTS.SYNASTRY_CHART, { method: 'POST', headers, body: JSON.stringify({ first_subject: personA, second_subject: personB }) }, 'Synastry Chart');
            const synClean = stripGraphicsDeep(synastryResp.data || {});
            result.person_b.chart = synClean.second_subject || {};
            result.synastry = { aspects: synClean.aspects || [] };
            break;
        }

        case 'NATAL_TRANSITS': {
            const [natalResp, transits] = await Promise.all([
                apiCallWithRetry(API_ENDPOINTS.NATAL_ASPECTS_DATA, { method: 'POST', headers, body: JSON.stringify({ subject: personA }) }, 'Natal Aspects A'),
                getTransits(personA, {startDate: start, endDate: end, step}, headers)
            ]);
            result.person_a.chart = { ...stripGraphicsDeep(natalResp.data), aspects: natalResp.aspects, transitsByDate: transits };

            if (haveRange) {
                const seismographData = calculateSeismograph(transits);
                result.person_a.chart.transitsByDate = seismographData.daily;
                result.person_a.derived = { seismograph_summary: seismographData.summary };
            }
            break;
        }

        case 'SYNASTRY_TRANSITS': {
            const vB = validateSubject(personB);
            if (!vB.isValid) return { statusCode: 400, body: JSON.stringify({ error: `Person B is required for synastry mode: ${vB.message}` }) };
            result.person_b = { details: personB };

            const [natalA, natalB, synastry, transitsA, transitsB] = await Promise.all([
                apiCallWithRetry(API_ENDPOINTS.NATAL_ASPECTS_DATA, { method: 'POST', headers, body: JSON.stringify({ subject: personA }) }, 'Natal Aspects A'),
                apiCallWithRetry(API_ENDPOINTS.NATAL_ASPECTS_DATA, { method: 'POST', headers, body: JSON.stringify({ subject: personB }) }, 'Natal Aspects B'),
                apiCallWithRetry(API_ENDPOINTS.SYNASTRY_ASPECTS, { method: 'POST', headers, body: JSON.stringify({ first_subject: personA, second_subject: personB }) }, 'Synastry Aspects'),
                getTransits(personA, {startDate: start, endDate: end, step}, headers),
                getTransits(personB, {startDate: start, endDate: end, step}, headers)
            ]);

            result.person_a.chart = { ...stripGraphicsDeep(natalA.data), aspects: natalA.aspects, transitsByDate: transitsA };
            result.person_b.chart = { ...stripGraphicsDeep(natalB.data), aspects: natalB.aspects, transitsByDate: transitsB };
            result.synastry = { aspects: synastry.aspects };

            if (haveRange) {
                const seismographA = calculateSeismograph(transitsA);
                result.person_a.chart.transitsByDate = seismographA.daily;
                result.person_a.derived = { seismograph_summary: seismographA.summary };

                const seismographB = calculateSeismograph(transitsB);
                result.person_b.chart.transitsByDate = seismographB.daily;
                result.person_b.derived = { seismograph_summary: seismographB.summary };
            }
            break;
        }

        case 'COMPOSITE_TRANSITS': {
            const vB = validateSubject(personB);
            if (!vB.isValid) return { statusCode: 400, body: JSON.stringify({ error: `Person B is required for composite mode: ${vB.message}` }) };
            result.person_b = { details: personB };

            const pass = {};
            ['active_points','active_aspects','houses_system_identifier','sidereal_mode','perspective_type']
              .forEach(k => { if (body[k] !== undefined) pass[k] = body[k]; });

            const composite = await computeComposite(personA, personB, pass, headers);
            result.composite = { aspects: composite.aspects, data: composite.raw };

            if (haveRange) {
                const t = await computeCompositeTransits(composite.raw, start, end, step, pass, headers);
                result.composite.transitsByDate = t.transitsByDate;
                if (t._note) result.composite.note = t._note;

                const seismographData = calculateSeismograph(t.transitsByDate);
                result.composite.transitsByDate = seismographData.daily;
                result.composite.derived = { seismograph_summary: seismographData.summary };
            }
            break;
        }

        default:
            return { statusCode: 400, body: JSON.stringify({ error: `Unknown or unsupported context mode: ${modeToken}` }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    logger.error('Handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error?.message || 'Internal server error',
        stack: error?.stack || null,
        details: error
      }),
    };
  }
};
