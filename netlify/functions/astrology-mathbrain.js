const API_BASE_URL = 'https://astrologer.p.rapidapi.com';

const API_ENDPOINTS = {
  BIRTH_CHART:        `${API_BASE_URL}/api/v4/birth-chart`,
  NATAL_ASPECTS_DATA: `${API_BASE_URL}/api/v4/natal-aspects-data`,
  SYNASTRY_CHART:     `${API_BASE_URL}/api/v4/synastry-chart`,
  TRANSIT_ASPECTS:    `${API_BASE_URL}/api/v4/transit-aspects-data`,
  SYNASTRY_ASPECTS:   `${API_BASE_URL}/api/v4/synastry-aspects-data`,
  COMPOSITE_ASPECTS:  `${API_BASE_URL}/api/v4/composite-aspects-data`,
};

const logger = {
  log: (...args) => console.log(`[LOG]`, ...args),
  info: (...args) => console.info(`[INFO]`, ...args),
  warn: (...args) => console.warn(`[WARN]`, ...args),
  error: (...args) => console.error(`[ERROR]`, ...args),
  debug: (...args) => process.env.LOG_LEVEL === 'debug' && console.debug(`[DEBUG]`, ...args),
};

function stripGraphicsDeep(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const kill = new Set(['wheel','svg','image','chart']);
  if (Array.isArray(obj)) return obj.map(stripGraphicsDeep);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (kill.has(k)) continue;
    out[k] = (v && typeof v === 'object') ? stripGraphicsDeep(v) : v;
  }
  return out;
}

function buildHeaders() {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error('RAPIDAPI_KEY environment variable is not configured.');
  return {
    "content-type": "application/json",
    "x-rapidapi-key": key,
    "x-rapidapi-host": "astrologer.p.rapidapi.com",
  };
}

function validateSubject(subject) {
  if (!subject) return { isValid: false, message: 'Subject is null or undefined.' };
  const requiredFields = ['year', 'month', 'day', 'hour', 'minute', 'latitude', 'longitude', 'timezone'];
  const errors = requiredFields.filter(field => subject[field] === undefined || subject[field] === null);
  const isValid = errors.length === 0;
  return {
    isValid,
    message: isValid ? 'Validation successful' : `Missing required fields: ${errors.join(', ')}`,
  };
}

function normalizeSubjectData(data) {
    if (!data || typeof data !== 'object') return null;
    return {
      name: data.name || 'Subject',
      year: data.year, month: data.month, day: data.day,
      hour: data.hour, minute: data.minute,
      city: data.city || 'Unknown', nation: data.nation || 'US',
      latitude: data.latitude, longitude: data.longitude,
      timezone: data.timezone,
      zodiac_type: data.zodiac_type || 'Tropic',
    };
}

async function apiCallWithRetry(url, options, operation) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      logger.debug(`API call attempt ${attempt}/2 for ${operation}`);
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorBody = await response.text();
        logger.error(`API Error for ${operation} [${response.status}]: ${errorBody}`);
        throw new Error(`API call for ${operation} failed with status ${response.status}`);
      }
      return response.json();
    } catch (error) {
      if (attempt === 2) {
          logger.error(`API call for ${operation} failed after all retries.`, error);
          throw error;
      }
      await new Promise(res => setTimeout(res, 100 * attempt));
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

exports.handler = async function (event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Only POST requests are allowed.' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const { context = {}, transitParams } = body;
    const mode = (context.mode || 'natal_transits').toUpperCase();

    const personA = normalizeSubjectData(body.personA);
    const validationA = validateSubject(personA);
    if (!validationA.isValid) {
      return { statusCode: 400, body: JSON.stringify({ error: `Person A validation failed: ${validationA.message}` }) };
    }

    const headers = buildHeaders();
    let result = { schema: 'WM-Chart-1.2', person_a: { details: personA } };

    switch (mode) {
      case 'NATAL_TRANSITS': {
        const [natalResp, transits] = await Promise.all([
            apiCallWithRetry(API_ENDPOINTS.NATAL_ASPECTS_DATA, { method: 'POST', headers, body: JSON.stringify({ subject: personA }) }, 'Natal Aspects A'),
            getTransits(personA, transitParams, headers)
        ]);
        result.person_a.chart = { ...stripGraphicsDeep(natalResp.data), aspects: natalResp.aspects, transitsByDate: transits };
        break;
      }

      case 'SYNASTRY_TRANSITS': {
        const personB = normalizeSubjectData(body.personB);
        const validationB = validateSubject(personB);
        if (!validationB.isValid) {
            return { statusCode: 400, body: JSON.stringify({ error: `Person B is required for synastry mode: ${validationB.message}` }) };
        }
        result.person_b = { details: personB };

        const [natalA, natalB, synastry, transitsA, transitsB] = await Promise.all([
            apiCallWithRetry(API_ENDPOINTS.NATAL_ASPECTS_DATA, { method: 'POST', headers, body: JSON.stringify({ subject: personA }) }, 'Natal Aspects A'),
            apiCallWithRetry(API_ENDPOINTS.NATAL_ASPECTS_DATA, { method: 'POST', headers, body: JSON.stringify({ subject: personB }) }, 'Natal Aspects B'),
            apiCallWithRetry(API_ENDPOINTS.SYNASTRY_ASPECTS, { method: 'POST', headers, body: JSON.stringify({ first_subject: personA, second_subject: personB }) }, 'Synastry Aspects'),
            getTransits(personA, transitParams, headers),
            getTransits(personB, transitParams, headers)
        ]);

        result.person_a.chart = { ...stripGraphicsDeep(natalA.data), aspects: natalA.aspects, transitsByDate: transitsA };
        result.person_b.chart = { ...stripGraphicsDeep(natalB.data), aspects: natalB.aspects, transitsByDate: transitsB };
        result.synastry = { aspects: synastry.aspects };
        break;
      }

      case 'COMPOSITE_TRANSITS': {
        const personB = normalizeSubjectData(body.personB);
        const validationB = validateSubject(personB);
        if (!validationB.isValid) {
            return { statusCode: 400, body: JSON.stringify({ error: `Person B is required for composite mode: ${validationB.message}` }) };
        }
        result.person_b = { details: personB };

        const compositeResp = await apiCallWithRetry(API_ENDPOINTS.COMPOSITE_ASPECTS, { method: 'POST', headers, body: JSON.stringify({ first_subject: personA, second_subject: personB }) }, 'Composite Aspects');
        result.composite = {
            chart: stripGraphicsDeep(compositeResp.data.composite_subject),
            aspects: compositeResp.aspects,
            transitsByDate: {}
        };
        logger.warn('Composite transit calculation is not yet implemented.');
        break;
      }

      default:
        return { statusCode: 400, body: JSON.stringify({ error: `Unknown or unsupported context mode: ${mode}` }) };
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