// This code is a consolidated and cleaned version of the provided Javascript for interacting with the Astrologer API.
// It is ready to be used as a serverless function handler (e.g., in a Node.js environment).

const { aggregate } = require('../../src/seismograph');
const { _internals: seismoInternals } = require('../../src/seismograph');
const { computeSFD, computeBalanceValence } = require('../../src/balance-meter');
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
const { mapT2NAspects } = require('../../src/raven-lite-mapper');
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

// Provenance constants
const MATH_BRAIN_VERSION = '0.2.1'; // Single source of truth for version
const EPHEMERIS_SOURCE = 'AstrologerAPI-v4';
const CALIBRATION_BOUNDARY = '2025-09-05';

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
 * Parses coordinate strings in various formats (DMS, decimal)
 * @param {string} coordString - Coordinate string like "30°10'N, 85°40'W" or "30.1667, -85.6667"
 * @returns {{lat: number, lng: number}|null} Parsed coordinates or null
 */
function parseCoordinates(coordString) {
  if (!coordString) return null;
  
  // Handle DMS format: "30°10'N, 85°40'W"
  const dmsPattern = /(\d+)°(\d+)'([NS]),\s*(\d+)°(\d+)'([EW])/;
  const dmsMatch = coordString.match(dmsPattern);
  
  if (dmsMatch) {
    const latDeg = parseInt(dmsMatch[1]);
    const latMin = parseInt(dmsMatch[2]);
    const latDir = dmsMatch[3];
    const lngDeg = parseInt(dmsMatch[4]);
    const lngMin = parseInt(dmsMatch[5]);
    const lngDir = dmsMatch[6];
    
    let lat = latDeg + (latMin / 60);
    let lng = lngDeg + (lngMin / 60);
    
    if (latDir === 'S') lat = -lat;
    if (lngDir === 'W') lng = -lng;
    
    logger.info('Parsed DMS coordinates', { 
      input: coordString, 
      output: { lat, lng } 
    });
    
    return { lat, lng };
  }
  
  // Handle decimal format: "30.1667, -85.6667"
  const parts = coordString.split(',').map(s => s.trim());
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }
  
  return null;
}

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

  // Handle coordinate parsing using the enhanced parseCoordinates function
  if (!normalized.latitude || !normalized.longitude) {
    // Check various field names for coordinate data
    const coordFields = ['astro', 'coords', 'coordinate', 'coord', 'location'];
    let coordString = null;
    
    for (const field of coordFields) {
      if (data[field] && typeof data[field] === 'string') {
        coordString = data[field];
        break;
      }
    }
    
    // If we found a coordinate string, parse it
    if (coordString) {
      try {
        const parsed = parseCoordinates(coordString);
        if (parsed && parsed.lat !== undefined && parsed.lon !== undefined) {
          normalized.latitude = normalized.latitude ?? parsed.lat;
          normalized.longitude = normalized.longitude ?? parsed.lon;
          logger.info('Coordinate parsing successful', { 
            input: coordString, 
            output: { lat: parsed.lat, lon: parsed.lon } 
          });
        } else {
          logger.warn('Coordinate parsing failed', { input: coordString });
        }
      } catch (error) {
        logger.error('Coordinate parsing error', { error: error.message, input: coordString });
      }
    }
  }

  // If lat/lon are still strings, try to parse them individually
  if (typeof normalized.latitude === 'string' || typeof normalized.longitude === 'string') {
    try {
      const coordString = `${normalized.latitude},${normalized.longitude}`;
      const parsed = parseCoordinates(coordString);
      if (parsed && parsed.lat !== undefined && parsed.lon !== undefined) {
        normalized.latitude = parsed.lat;
        normalized.longitude = parsed.lon;
        logger.info('Individual coordinate parsing successful', { 
          input: coordString, 
          output: { lat: parsed.lat, lon: parsed.lon } 
        });
      }
    } catch (error) {
      logger.error('Individual coordinate parsing error', { 
        error: error.message, 
        lat: normalized.latitude, 
        lon: normalized.longitude 
      });
    }
  }

  return normalized;
}

// ---- Aspect Filtering & Hook Extraction (refined) ----
// Aspect classes
const ASPECT_CLASS = {
  major: new Set(['conjunction','opposition','square','trine','sextile']),
  minor: new Set(['quincunx','sesquiquadrate','semi-square','semi-sextile']),
  harmonic: new Set(['quintile','biquintile'])
};

// Orb caps by aspect (geometry constraint)
const ASPECT_ORB_CAPS = {
  conjunction: 10,
  opposition: 10,
  square: 8,
  trine: 8,
  sextile: 6,
  quincunx: 3,
  sesquiquadrate: 3,
  'semi-square': 2,
  'semi-sextile': 2,
  quintile: 2,
  biquintile: 2
};

// Orb caps by body class (slower bodies tolerate larger orbs for the same structural salience)
const BODY_CLASS_CAPS = {
  luminary: 12,
  personal: 8,
  social: 7,     // Jupiter / Saturn
  outer: 6,
  angle: 8,
  point: 5,      // Chiron, Nodes, Lilith
  other: 6
};

const RETURN_BODIES = new Set(['Saturn','Jupiter','Chiron','Mean_Node','Mean_South_Node','True_Node','True_South_Node']);
const POINT_BODIES = new Set([
  'Ascendant','Medium_Coeli','Descendant','Imum_Coeli',
  'Mean_Node','True_Node','Mean_South_Node','True_South_Node',
  'Chiron','Mean_Lilith'
]); // Ensure True nodes & all angles included

function classifyAspectName(name){
  if (ASPECT_CLASS.major.has(name)) return 'major';
  if (ASPECT_CLASS.minor.has(name)) return 'minor';
  if (ASPECT_CLASS.harmonic.has(name)) return 'harmonic';
  return 'other';
}

function bodyClass(name){
  switch(name){
    case 'Sun':
    case 'Moon': return 'luminary';
    case 'Mercury':
    case 'Venus':
    case 'Mars': return 'personal';
    case 'Jupiter':
    case 'Saturn': return 'social';
    case 'Uranus':
    case 'Neptune':
    case 'Pluto': return 'outer';
    case 'Ascendant':
    case 'Medium_Coeli':
    case 'Descendant':
    case 'Imum_Coeli': return 'angle';
    case 'Chiron':
    case 'Mean_Node':
  case 'True_Node':
    case 'Mean_South_Node':
  case 'True_South_Node':
    case 'Mean_Lilith': return 'point';
    default: return 'other';
  }
}

function displayBodyName(raw){
  const map = {
    'Medium_Coeli': 'MC',
  'Imum_Coeli': 'IC',
    'Mean_Node': 'North Node',
    'Mean_South_Node': 'South Node',
  'True_Node': 'North Node (True)',
  'True_South_Node': 'South Node (True)',
    'Mean_Lilith': 'Lilith'
  };
  return map[raw] || raw;
}

function weightAspect(a){
  const base = a._class === 'major' ? 1.0 : a._class === 'minor' ? 0.55 : a._class === 'harmonic' ? 0.45 : 0.4;
  const aspectCap = ASPECT_ORB_CAPS[a._aspect] || 6;
  const classCapTransit = BODY_CLASS_CAPS[bodyClass(a.p1_name)] || 6;
  const classCapNatal = BODY_CLASS_CAPS[bodyClass(a.p2_name)] || 6;
  const effectiveCap = Math.min(aspectCap, Math.max(classCapTransit, classCapNatal));
  const tightness = a._orb != null ? Math.max(0, 1 - (a._orb / effectiveCap)) : 0;
  const lumOrAngle = (a.p1_isLuminary || a.p2_isLuminary || a.p1_isAngle || a.p2_isAngle) ? 1.15 : 1.0;
  return +(base * tightness * lumOrAngle).toFixed(4);
}

function enrichDailyAspects(rawList){
  if (!Array.isArray(rawList)) return { raw: [], filtered: [], hooks: [], rejections: [], counts: { raw:0, filtered:0, hooks:0 } };
  const enriched = [];
  const rejections = [];
  for (const a of rawList){
    const aspectName = (a.aspect || '').toLowerCase();
    const orb = typeof a.orbit === 'number' ? a.orbit : (typeof a.orb === 'number' ? a.orb : null);
    const p1 = a.p1_name; const p2 = a.p2_name;
    const sameBody = p1 === p2;
    const cls = classifyAspectName(aspectName);
    const p1Class = bodyClass(p1);
    const p2Class = bodyClass(p2);
    const aspectCap = ASPECT_ORB_CAPS[aspectName] || 6;
    const classCap = Math.max(BODY_CLASS_CAPS[p1Class] || 6, BODY_CLASS_CAPS[p2Class] || 6);
    const effectiveCap = Math.min(aspectCap, classCap);
    let dropReason = '';

    if (sameBody) {
      if (!['conjunction','opposition'].includes(aspectName)) dropReason = 'OUT_OF_CAP'; // treat non-return self aspect as out-of-scope
      else if (!(RETURN_BODIES.has(p1) || ['Sun','Moon'].includes(p1))) dropReason = 'OUT_OF_CAP';
    }
    if (!dropReason && orb != null && orb > effectiveCap) dropReason = 'OUT_OF_CAP';

    const rec = {
      ...a,
      _aspect: aspectName,
      _orb: orb,
      _class: cls,
      _sameBody: sameBody,
      p1_display: displayBodyName(p1),
      p2_display: displayBodyName(p2),
      p1_isLuminary: ['Sun','Moon'].includes(p1),
      p2_isLuminary: ['Sun','Moon'].includes(p2),
      p1_isAngle: ['Ascendant','Medium_Coeli','Descendant','Imum_Coeli'].includes(p1),
      p2_isAngle: ['Ascendant','Medium_Coeli','Descendant','Imum_Coeli'].includes(p2),
      p1_class: p1Class,
      p2_class: p2Class,
      effective_cap: effectiveCap
    };
    if (dropReason){
      rejections.push({ aspect: `${p1} ${aspectName} ${p2}`, reason: dropReason, orb });
    } else {
      rec._weight = weightAspect(rec);
      enriched.push(rec);
    }
  }

  // Post-weight filtering for weak weight
  const strong = []; 
  for (const r of enriched){
    if ((r._weight || 0) < 0.15){
      rejections.push({ aspect: `${r.p1_name} ${r._aspect} ${r.p2_name}`, reason: 'WEAK_WEIGHT', orb: r._orb });
    } else strong.push(r);
  }

  // Diversity & duplicate pair filtering
  const pairSeen = new Set();
  const primaryCounts = new Map(); // luminary + angle dominance guard
  const filtered = [];
  for (const r of strong){
    const pairKey = [r.p1_name, r.p2_name].sort().join('|') + '|' + r._aspect;
    if (pairSeen.has(pairKey)) { rejections.push({ aspect: `${r.p1_name} ${r._aspect} ${r.p2_name}`, reason: 'DUPLICATE_PAIR', orb: r._orb }); continue; }
    pairSeen.add(pairKey);
    const primaries = [];
    if (r.p1_isLuminary || r.p1_isAngle) primaries.push(r.p1_name);
    if (r.p2_isLuminary || r.p2_isAngle) primaries.push(r.p2_name);
    let primaryDup = false;
    for (const p of primaries){
      const c = (primaryCounts.get(p) || 0) + 1;
      primaryCounts.set(p, c);
      if (c > 3){ primaryDup = true; }
    }
    if (primaryDup){
      rejections.push({ aspect: `${r.p1_name} ${r._aspect} ${r.p2_name}`, reason: 'PRIMARY_DUP', orb: r._orb });
      continue;
    }
    filtered.push(r);
  }

  // Hook selection prioritisation
  const hookCandidates = filtered.filter(a => {
    const orb = a._orb != null ? a._orb : 6.01;
    const isExact = orb <= 0.5;
    const isTight = orb <= 1.5;
    const isLum = a.p1_isLuminary || a.p2_isLuminary;
    const isAngle = a.p1_isAngle || a.p2_isAngle;
    const isNodeChiron = ['Mean_Node','Mean_South_Node','Chiron'].includes(a.p1_name) || ['Mean_Node','Mean_South_Node','Chiron'].includes(a.p2_name);
    if (isExact) return true;
    if (isLum && orb <= 3) return true;
    if (isAngle && orb <= 2.5) return true;
    if (isNodeChiron && orb <= 2) return true;
    if (a._class === 'major' && isTight) return true;
    return false;
  });

  const hooks = (hookCandidates.length ? hookCandidates : filtered.slice(0, 8))
    .slice()
    .sort((a,b)=>{
      const oa = a._orb ?? 6.01; const ob = b._orb ?? 6.01;
      const ea = oa <= 0.5; const eb = ob <= 0.5;
      if (ea !== eb) return ea ? -1 : 1;
      const la = a.p1_isLuminary || a.p2_isLuminary; const lb = b.p1_isLuminary || b.p2_isLuminary;
      if (la !== lb) return la ? -1 : 1;
      if (oa !== ob) return oa - ob;
      return (b._weight||0) - (a._weight||0);
    })
    .slice(0,12);

  return {
    raw: rawList,
    filtered,
    hooks,
    rejections,
    counts: { raw: rawList.length, filtered: filtered.length, hooks: hooks.length, rejected: rejections.length }
  };
}


// Canonicalize incoming mode tokens: trim, uppercase, replace spaces/dashes with single underscore, collapse repeats
function canonicalizeMode(raw) {
  if (!raw) return '';
  return raw.toString()
    .trim()
    .replace(/[-\s]+/g, '_')
    .replace(/__+/g, '_')
    .toUpperCase();
}

// Build field-by-field validation map for strict subject requirements
const STRICT_REQUIRED_FIELDS = ['year','month','day','hour','minute','name','city','nation','latitude','longitude','timezone','zodiac_type'];
function validateSubjectStrictWithMap(subject) {
  const errors = {};
  STRICT_REQUIRED_FIELDS.forEach(f => {
    if (subject[f] === undefined || subject[f] === null || subject[f] === '') {
      errors[f] = 'Missing or empty';
    }
  });
  return { isValid: Object.keys(errors).length === 0, errors };
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
          // Capture status + body once
          const status = response.status;
          let rawText = '';
          try { rawText = await response.text(); } catch { rawText = 'Unable to read response body'; }
          let parsedMessage = rawText;
          try {
            const j = JSON.parse(rawText);
            if (j.message) parsedMessage = j.message;
          } catch(_) {/* keep rawText */}
          // Special handling for auth/subscription issues
            if (status === 401 || status === 403) {
              const hint = parsedMessage && /not subscribed|unauthorized|invalid api key|api key is invalid/i.test(parsedMessage)
                ? 'Verify RAPIDAPI_KEY, subscription plan, and that the key matches this API.'
                : 'Authentication / subscription issue likely.';
              logger.error('RapidAPI auth/subscription error', { status, operation, parsedMessage, hint });
              const err = new Error(`RapidAPI access denied (${status}): ${parsedMessage}. ${hint}`);
              err.code = 'RAPIDAPI_SUBSCRIPTION';
              err.status = status;
              err.raw = rawText.slice(0,1200);
              throw err;
            }
          logger.error('Client error (non-retryable)', { status, operation, url, body: rawText.slice(0,1200) });
          const err = new Error(`Client error ${status} for ${operation}`);
          err.code = 'CLIENT_ERROR';
          err.status = status;
          err.raw = rawText.slice(0,1200);
          throw err;
        }
        logger.warn(`API call failed with status ${response.status}. Retrying...`);
        throw new Error(`Server error: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      if (attempt === maxRetries || error.message.includes('Non-retryable')) {
        logger.error(`Failed after ${attempt} attempts: ${error.message}`, { url, operation, code: error.code, status: error.status });
        if (error.code === 'RAPIDAPI_SUBSCRIPTION') throw error; // surface directly
        if (error.code === 'CLIENT_ERROR') throw error;
        const err = new Error(`Service temporarily unavailable. Please try again later.`);
        err.code = 'UPSTREAM_TEMPORARY';
        throw err;
      }
      const delay = Math.pow(2, attempt) * 100 + Math.random() * 100; // Exponential backoff
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

// --- Transit helpers ---
// Coordinate parsing (supports DMS "30°10'N" and decimal)
function parseCoordinate(val){
  if (typeof val === 'number') return val;
  if (typeof val !== 'string') return null;
  const dec = val.trim();
  if (/^-?\d+(?:\.\d+)?$/.test(dec)) return parseFloat(dec);
  // DMS pattern e.g., 30°10'15"N or 30°10'N
  const dms = /^\s*(\d{1,3})[^0-9]+(\d{1,2})?(?:[^0-9]+(\d{1,2}(?:\.\d+)?))?\s*([NnSsEeWw])\s*$/.exec(dec);
  if (dms){
    const d=+dms[1]; const m=dms[2]?+dms[2]:0; const s=dms[3]?+dms[3]:0; const hemi=dms[4];
    const sign=/[SsWw]/.test(hemi)?-1:1; return sign*(d + m/60 + s/3600);
  }
  return null;
}

async function getTransits(subject, transitParams, headers, pass = {}) {
  if (!transitParams || !transitParams.startDate || !transitParams.endDate) return {};

  const transitsByDate = {};
  const retroFlagsByDate = {}; // body -> retro boolean per date
  const startDate = new Date(transitParams.startDate);
  const endDate = new Date(transitParams.endDate);
  endDate.setDate(endDate.getDate() + 1); // Make end date inclusive

  const promises = [];
  for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
    const dateString = d.toISOString().split('T')[0];
    const transit_subject = {
      year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
      hour: 12, minute: 0, city: "Greenwich", nation: "GB",
      latitude: 51.48, longitude: 0, timezone: "UTC",
      zodiac_type: "Tropic" // Fix: Add missing zodiac_type
    };

    // Include configuration parameters for which planets to include
    const payload = {
      first_subject: subject,
      transit_subject,
      ...pass // Include active_points, active_aspects, etc.
    };

    logger.debug(`Transit API call for ${dateString}:`, {
      active_points: payload.active_points || 'default',
      pass_keys: Object.keys(pass)
    });

    // Enhanced debug logging: Log full payload when debugging empty results
    logger.debug(`Full transit API payload for ${dateString}:`, JSON.stringify(payload, null, 2));

    promises.push(
      apiCallWithRetry(
        API_ENDPOINTS.TRANSIT_ASPECTS,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        },
        `Transits for ${subject.name} on ${dateString}`
  ).then(resp => {
        logger.debug(`Transit API response for ${dateString}:`, {
          hasAspects: !!(resp && resp.aspects),
          aspectCount: (resp && resp.aspects) ? resp.aspects.length : 0,
          responseKeys: resp ? Object.keys(resp) : 'null response',
          sample: resp && resp.aspects && resp.aspects.length > 0 ? resp.aspects[0] : 'no aspects'
        });
        
        if (resp.aspects && resp.aspects.length > 0) {
          transitsByDate[dateString] = resp.aspects;
          // Extract retro flags if available
          const retroMap = {};
          const fs = resp.data?.first_subject || resp.data?.firstSubject;
          const tr = resp.data?.transit || resp.data?.transit_subject;
          const collect = (block) => {
            if (!block || typeof block !== 'object') return;
            for (const [k,v] of Object.entries(block)) {
              if (v && typeof v === 'object' && 'retrograde' in v) {
                retroMap[(v.name||v.body||k)] = !!v.retrograde;
              }
            }
          };
          collect(fs); collect(tr);
          if (Object.keys(retroMap).length) retroFlagsByDate[dateString] = retroMap;
          logger.debug(`Stored ${resp.aspects.length} aspects for ${dateString}`);
        } else {
          // Enhanced debug logging: Log full response when no aspects found
          logger.debug(`No aspects found for ${dateString} - response structure:`, resp);
          logger.debug(`Full raw API response for ${dateString} (no aspects):`, JSON.stringify(resp, null, 2));
        }
      }).catch(e => logger.error(`Failed to get transits for ${dateString}`, e))
    );
  }
  await Promise.all(promises);
  
  logger.debug(`getTransits completed for ${subject.name}:`, {
    requestedDates: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)),
    datesWithData: Object.keys(transitsByDate).length,
    totalAspects: Object.values(transitsByDate).reduce((sum, aspects) => sum + aspects.length, 0),
    availableDates: Object.keys(transitsByDate)
  });
  
  return { transitsByDate, retroFlagsByDate };
}

// --- Transit Table Formatting: Orb-Band + Phase + Score ---
function formatTransitTable(enrichedAspects, prevDayAspects = null) {
  if (!Array.isArray(enrichedAspects) || enrichedAspects.length === 0) {
    return {
      exact: [],
      tight: [],
      moderate: [],
      wide: [],
      markdown: "No aspects for this date."
    };
  }

  // Create lookup map for previous day's orbs to determine phase
  const prevOrbMap = new Map();
  if (prevDayAspects && Array.isArray(prevDayAspects)) {
    for (const aspect of prevDayAspects) {
      const key = `${aspect.p1_name}|${aspect._aspect}|${aspect.p2_name}`;
      prevOrbMap.set(key, aspect._orb);
    }
  }

  // Process aspects with orb bands, phase, and score
  const processedAspects = enrichedAspects.map(aspect => {
    const orb = aspect._orb || 0;
    const key = `${aspect.p1_name}|${aspect._aspect}|${aspect.p2_name}`;
    const prevOrb = prevOrbMap.get(key);
    
    // Determine phase: ↑ tightening (orb decreasing), ↓ separating (orb increasing)
    let phase = '—'; // neutral/unknown
    if (prevOrb != null && typeof prevOrb === 'number') {
      if (orb < prevOrb) phase = '↑'; // tightening
      else if (orb > prevOrb) phase = '↓'; // separating
      // if equal, keep neutral
    }

    // Calculate score using seismograph internals
    const aspectForScore = {
      transit: { body: aspect.p1_name },
      natal: { body: aspect.p2_name },
      type: aspect._aspect,
      orbDeg: orb
    };
    const scored = seismoInternals.scoreAspect(aspectForScore, {
      isAngleProx: aspect.p2_isAngle,
      critical: false
    });

    return {
      transit: aspect.p1_display || aspect.p1_name,
      aspect: aspect._aspect,
      natal: aspect.p2_display || aspect.p2_name,
      orb: Number(orb.toFixed(1)),
      phase: phase,
      score: Number(scored.S.toFixed(2)),
      _orbValue: orb // for sorting
    };
  });

  // Sort by orb (tightest first)
  processedAspects.sort((a, b) => a._orbValue - b._orbValue);

  // Group by orb bands
  const exact = processedAspects.filter(a => a._orbValue <= 0.5);
  const tight = processedAspects.filter(a => a._orbValue > 0.5 && a._orbValue <= 2.0);
  const moderate = processedAspects.filter(a => a._orbValue > 2.0 && a._orbValue <= 6.0);
  const wide = processedAspects.filter(a => a._orbValue > 6.0);

  // Generate markdown table format
  function createMarkdownTable(aspects, title) {
    if (aspects.length === 0) return '';
    
    let table = `\n**${title}**\n\n`;
    table += '| Transit | Aspect | Natal | Orb (°) | Phase | Score |\n';
    table += '|---------|--------|-------|---------|--------|-------|\n';
    
    for (const a of aspects) {
      table += `| ${a.transit} | ${a.aspect} | ${a.natal} | ${a.orb} | ${a.phase} | ${a.score >= 0 ? '+' : ''}${a.score} |\n`;
    }
    
    return table;
  }

  let markdown = '';
  if (exact.length > 0) markdown += createMarkdownTable(exact, '⭐ Exact Aspects (≤0.5°)');
  if (tight.length > 0) markdown += createMarkdownTable(tight, '🔥 Tight Aspects (0.5° - 2°)');
  if (moderate.length > 0) markdown += createMarkdownTable(moderate, '📊 Moderate Aspects (2° - 6°)');
  if (wide.length > 0) markdown += createMarkdownTable(wide, '🌫️ Wide Aspects (>6°)');

  if (markdown === '') {
    markdown = "No aspects for this date.";
  }

  return {
    exact,
    tight,
    moderate,
    wide,
    markdown
  };
}

function calculateSeismograph(transitsByDate, retroFlagsByDate = {}) {
  if (!transitsByDate || Object.keys(transitsByDate).length === 0) {
    return { daily: {}, summary: {} };
  }

  const days = Object.keys(transitsByDate).sort();
  let prev = null;
  let prevDayFiltered = null;
  const daily = {};
  const rollingMagnitudes = []; // Track for 14-day rolling window
  const valenceHistory = []; // Track for trend analysis

  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const rawDayAspects = transitsByDate[d] || [];
  const enriched = enrichDailyAspects(rawDayAspects);
    
    // Enhance aspects with retrograde flags
    const retroMap = retroFlagsByDate[d] || {};
    const enrichedWithRetrograde = enriched.filtered.map(aspect => {
      const p1r = retroMap[aspect.p1_name] ?? retroMap[aspect.p1_display] ?? false;
      const p2r = retroMap[aspect.p2_name] ?? retroMap[aspect.p2_display] ?? false;
      return {
        ...aspect,
        p1_retrograde: p1r,
        p2_retrograde: p2r,
        retrograde_involved: p1r || p2r
      };
    });
    
    // Generate orb-band transit table with phase and score
    const transitTable = formatTransitTable(enriched.filtered, prevDayFiltered);
    
    const aspectsForAggregate = enriched.filtered.map(x => ({
      transit: { body: x.p1_name, retrograde: x.p1_retrograde },
      natal: {
        body: x.p2_name,
        retrograde: x.p2_retrograde,
        isAngleProx: ["Ascendant","Medium_Coeli","Descendant","Imum_Coeli"].includes(x.p2_name),
        isLuminary: ["Sun","Moon"].includes(x.p2_name),
        degCrit: false
      },
      type: x._aspect,
      orbDeg: typeof x._orb === 'number' ? x._orb : 6.01
    }));

    // Prepare rolling context for magnitude normalization
    const rollingContext = rollingMagnitudes.length >= 1 ? { magnitudes: [...rollingMagnitudes] } : null;
    
  const agg = aggregate(aspectsForAggregate, prev, { rollingContext });

  // Determine scaling strategy and confidence
  let scalingStrategy = 'prior';
  const nContext = rollingMagnitudes.length;
  if (nContext >= 14) scalingStrategy = 'rolling';
  else if (nContext >= 2) scalingStrategy = 'blended';
  const scaleConfidence = Math.min(1, nContext / 14);
    
    // Track rolling magnitudes using the original magnitude before normalization (keep last 14 days)
    const magnitudeToTrack = agg.originalMagnitude || agg.rawMagnitude || agg.magnitude;
    rollingMagnitudes.push(magnitudeToTrack);
    if (rollingMagnitudes.length > 14) rollingMagnitudes.shift();
    
    // Track valence history (keep last 7 days for trend)
    valenceHistory.push(agg.valence);
    if (valenceHistory.length > 7) valenceHistory.shift();
    
    // Identify retrograde recursion aspects
    const retrogradeAspects = enrichedWithRetrograde.filter(a => a.retrograde_involved);
    
    // Dispersion-based volatility override (std deviation of hook weights)
    let dispersionVol = 0;
    if (enriched.hooks.length >= 2) {
      const weights = enriched.hooks.map(h => h._weight || 0);
      const meanW = weights.reduce((s,v)=>s+v,0)/weights.length;
      const variance = weights.reduce((s,v)=>s+Math.pow(v-meanW,2),0)/weights.length;
      dispersionVol = Math.min(10, Math.sqrt(variance) * 10); // scale
    }

    const dayEntry = {
      seismograph: { 
        magnitude: agg.magnitude, 
        valence: agg.valence, 
        volatility: dispersionVol, // use dispersion measure
        rawMagnitude: agg.rawMagnitude,
        originalMagnitude: agg.originalMagnitude,
        scaling_strategy: scalingStrategy,
        scaling_confidence: +scaleConfidence.toFixed(2)
      },
      aspects: rawDayAspects,
      filtered_aspects: enrichedWithRetrograde,
      hooks: enriched.hooks,
      rejections: enriched.rejections,
      counts: enriched.counts,
      transit_table: transitTable,
      retrograde_aspects: retrogradeAspects,
      valence_trend: valenceHistory.length > 1 ? calculateTrend(valenceHistory) : 0
    };

    // Balance/SFD computation (always on in WM-Chart-1.2)
    try {
      const balanceVal = computeBalanceValence(enriched.filtered);
      const { SFD, Splus, Sminus } = computeSFD(enriched.filtered);
      dayEntry.balance = { magnitude: agg.magnitude, valence: balanceVal, version: 'v1.1' };
      dayEntry.sfd = { sfd: SFD, sPlus: Splus, sMinus: Sminus, version: 'v1.2' };
    } catch (e) {
      logger.warn('Balance/SFD computation failed for day', d, e.message);
    }

    daily[d] = dayEntry;
    prev = { scored: agg.scored, Y_effective: agg.valence };
    prevDayFiltered = enriched.filtered;
  }

  const numDays = days.length;
  const X = Object.values(daily).reduce((s, d) => s + d.seismograph.magnitude, 0) / numDays;
  const Y = Object.values(daily).reduce((s, d) => s + d.seismograph.valence, 0) / numDays;
  const VI = Object.values(daily).reduce((s, d) => s + d.seismograph.volatility, 0) / numDays;
  const summary = { magnitude: +X.toFixed(2), valence: +Y.toFixed(2), volatility: +VI.toFixed(2) };

  return { daily, summary };
}

// Helper function to calculate valence trend
function calculateTrend(values) {
  if (values.length < 2) return 0;
  const recent = values.slice(-3); // Last 3 values for trend
  if (recent.length < 2) return 0;
  
  let trend = 0;
  for (let i = 1; i < recent.length; i++) {
    trend += recent[i] - recent[i-1];
  }
  return +(trend / (recent.length - 1)).toFixed(2);
}

// --- Composite helpers ---
async function computeComposite(A, B, pass = {}, H) {
  try {
    logger.debug('Computing composite for subjects:', { 
      personA: A?.name || 'Unknown A', 
      personB: B?.name || 'Unknown B' 
    });
    
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
  // Prefer top-level aspects if present, fallback to data.aspects
  const data = stripGraphicsDeep(r.data || {});
  const topAspects = Array.isArray(r.aspects) ? r.aspects : (data.aspects || []);
  logger.debug('Composite calculation successful, aspects found:', topAspects.length);
  return { aspects: topAspects, raw: data };
  } catch (error) {
    logger.error('Composite calculation failed:', error);
    throw new Error(`Composite calculation failed: ${error.message}`);
  }
}

// --- Relational Processing Helpers ---
/**
 * Generate polarity cards from synastry aspects for relational tension analysis
 * @param {Array} synastryAspects - Cross-chart aspects between Person A and Person B
 * @param {Object} personA - Person A details
 * @param {Object} personB - Person B details
 * @returns {Array} Array of polarity card objects
 */
function generatePolarityCards(synastryAspects, personA, personB) {
  if (!Array.isArray(synastryAspects) || synastryAspects.length === 0) {
    return [];
  }

  const polarityCards = [];
  const processedPairs = new Set();

  // Focus on major tension aspects that create polarity
  const tensionAspects = synastryAspects.filter(aspect => {
    const type = (aspect.aspect || aspect.type || '').toLowerCase();
    return ['opposition', 'square', 'conjunction'].includes(type);
  });

  for (const aspect of tensionAspects) {
    const p1 = aspect.p1_name || aspect.a || aspect.first_point || '';
    const p2 = aspect.p2_name || aspect.b || aspect.second_point || '';
    const aspectType = aspect.aspect || aspect.type || '';
    const orb = aspect.orb || aspect.orbit || 0;

    // Create unique pair identifier to avoid duplicates
    const pairId = [p1, p2].sort().join('-');
    if (processedPairs.has(pairId)) continue;
    processedPairs.add(pairId);

    // Generate polarity card for significant aspects (tight orbs)
    if (parseFloat(orb) <= 6.0) {
      polarityCards.push({
        polarity_a: `${personA.name || 'Person A'}'s ${p1}`,
        polarity_b: `${personB.name || 'Person B'}'s ${p2}`,
        aspect_type: aspectType,
        orb_degrees: parseFloat(orb),
        field_description: `${p1} ${aspectType} ${p2}`,
        map_pattern: `Cross-chart ${aspectType} creating relational tension`,
        voice_summary: `Polarity between ${p1} and ${p2} energies in the relationship`
      });
    }
  }

  return polarityCards.slice(0, 3); // Limit to top 3 polarity cards
}

/**
 * Detect echo loops and REF cycles from recurring cross-chart patterns
 * @param {Array} synastryAspects - Cross-chart aspects
 * @param {Array} natalAspectsA - Person A's natal aspects
 * @param {Array} natalAspectsB - Person B's natal aspects
 * @returns {Array} Array of echo loop objects
 */
function detectEchoLoops(synastryAspects, natalAspectsA, natalAspectsB) {
  const echoLoops = [];
  
  if (!Array.isArray(synastryAspects)) return echoLoops;

  // Find recurring planetary patterns across charts
  const planetPairs = {};
  
  for (const aspect of synastryAspects) {
    const p1 = aspect.p1_name || aspect.a || '';
    const p2 = aspect.p2_name || aspect.b || '';
    const type = aspect.aspect || aspect.type || '';
    
    const key = [p1, p2].sort().join('-');
    if (!planetPairs[key]) {
      planetPairs[key] = [];
    }
    planetPairs[key].push({ type, orb: aspect.orb || 0 });
  }

  // Identify echo loops where the same planetary pair appears multiple times
  for (const [pair, aspects] of Object.entries(planetPairs)) {
    if (aspects.length > 1) {
      const [planet1, planet2] = pair.split('-');
      echoLoops.push({
        pattern_type: 'REF_CYCLE',
        planets_involved: [planet1, planet2],
        occurrences: aspects.length,
        aspects: aspects,
        description: `Recurring ${planet1}-${planet2} feedback loop`,
        intensity: aspects.reduce((sum, a) => sum + (6 - parseFloat(a.orb || 6)), 0)
      });
    }
  }

  return echoLoops.slice(0, 5); // Limit to top 5 echo loops
}

/**
 * Generate shared SST tags for both participants in relational context
 * @param {Object} personA - Person A details and chart data
 * @param {Object} personB - Person B details and chart data  
 * @param {Array} synastryAspects - Cross-chart aspects
 * @returns {Object} SST tags for both persons
 */
function generateSharedSSTTags(personA, personB, synastryAspects) {
  // This is a simplified SST implementation - in practice this would involve
  // more sophisticated analysis of lived resonance patterns
  
  const sstTags = {
    person_a_tags: [],
    person_b_tags: [],
    shared_resonance: []
  };

  // Generate SST tags for Person A
  if (personA.aspects && Array.isArray(personA.aspects)) {
    const significantAspects = personA.aspects.filter(a => 
      parseFloat(a.orb || 6) <= 3.0
    ).slice(0, 3);
    
    sstTags.person_a_tags = significantAspects.map(aspect => ({
      vector: `${aspect.p1_name || aspect.a}-${aspect.p2_name || aspect.b}`,
      tag: 'WB', // Default to Within Boundary - would need user feedback in practice
      aspect_type: aspect.aspect || aspect.type,
      orb: aspect.orb
    }));
  }

  // Generate SST tags for Person B  
  if (personB.aspects && Array.isArray(personB.aspects)) {
    const significantAspects = personB.aspects.filter(a => 
      parseFloat(a.orb || 6) <= 3.0
    ).slice(0, 3);
    
    sstTags.person_b_tags = significantAspects.map(aspect => ({
      vector: `${aspect.p1_name || aspect.a}-${aspect.p2_name || aspect.b}`,
      tag: 'WB', // Default to Within Boundary
      aspect_type: aspect.aspect || aspect.type,
      orb: aspect.orb
    }));
  }

  // Generate shared resonance from synastry
  if (Array.isArray(synastryAspects)) {
    const sharedAspects = synastryAspects.filter(a => 
      parseFloat(a.orb || 6) <= 4.0
    ).slice(0, 3);
    
    sstTags.shared_resonance = sharedAspects.map(aspect => ({
      vector: `${aspect.p1_name || aspect.a}↔${aspect.p2_name || aspect.b}`,
      tag: 'WB', // Default to Within Boundary
      aspect_type: aspect.aspect || aspect.type,
      orb: aspect.orb,
      description: 'Cross-chart resonance'
    }));
  }

  return sstTags;
}

/**
 * Compute relational Balance Meter for the bond itself (not just individuals)
 * @param {Array} synastryAspects - Cross-chart aspects
 * @param {Array} compositeAspects - Composite chart internal aspects
 * @param {Object} compositTransits - Composite transit data by date
 * @returns {Object} Relational balance meter data
 */
function computeRelationalBalanceMeter(synastryAspects, compositeAspects, compositeTransits) {
  // Simplified relational balance calculation
  // In practice this would use the Balance Meter algorithms adapted for relational context
  
  let totalSupport = 0;
  let totalFriction = 0;
  let aspectCount = 0;

  // Analyze synastry aspects for relational support/friction
  if (Array.isArray(synastryAspects)) {
    for (const aspect of synastryAspects) {
      const type = (aspect.aspect || aspect.type || '').toLowerCase();
      const orb = parseFloat(aspect.orb || 6);
      
      aspectCount++;
      
      // Supportive aspects
      if (['trine', 'sextile', 'conjunction'].includes(type)) {
        totalSupport += Math.max(0, 6 - orb) / 6; // Weight by tightness
      }
      
      // Friction aspects  
      if (['square', 'opposition'].includes(type)) {
        totalFriction += Math.max(0, 6 - orb) / 6;
      }
    }
  }

  // Calculate relational SFD (Support-Friction Differential)
  const relationalSFD = aspectCount > 0 ? 
    Math.round((totalSupport - totalFriction) * 100) / 100 : 0;

  // Determine relational valence
  let relationalValence = '🌗'; // Default to mixed
  if (relationalSFD > 1.0) relationalValence = '🌞';
  else if (relationalSFD < -1.0) relationalValence = '🌑';

  // Calculate magnitude based on total aspect intensity
  const magnitude = Math.min(5, Math.max(0, (totalSupport + totalFriction) * 2));

  return {
    relational_sfd: relationalSFD,
    relational_magnitude: Math.round(magnitude * 100) / 100,
    relational_valence: relationalValence,
    support_score: Math.round(totalSupport * 100) / 100,
    friction_score: Math.round(totalFriction * 100) / 100,
    aspect_count: aspectCount,
    climate_description: `Relational field showing ${relationalValence} dynamic with ${magnitude.toFixed(1)} intensity`
  };
}

/**
 * Generate vector-integrity tags for latent/suppressed/dormant relational vectors
 * @param {Array} synastryAspects - Cross-chart aspects
 * @param {Array} compositeAspects - Composite chart aspects
 * @returns {Array} Vector integrity tags
 */
function generateVectorIntegrityTags(synastryAspects, compositeAspects) {
  const vectorTags = [];
  
  // Look for wide orb aspects that are structurally present but behaviorally quiet
  const wideAspects = [];
  
  if (Array.isArray(synastryAspects)) {
    wideAspects.push(...synastryAspects.filter(a => {
      const orb = parseFloat(a.orb || 0);
      return orb > 4.0 && orb <= 8.0; // Wide but still within range
    }));
  }
  
  if (Array.isArray(compositeAspects)) {
    wideAspects.push(...compositeAspects.filter(a => {
      const orb = parseFloat(a.orb || 0);
      return orb > 4.0 && orb <= 8.0;
    }));
  }

  for (const aspect of wideAspects.slice(0, 3)) {
    const p1 = aspect.p1_name || aspect.a || '';
    const p2 = aspect.p2_name || aspect.b || '';
    const type = aspect.aspect || aspect.type || '';
    const orb = parseFloat(aspect.orb || 0);
    
    let status = 'LATENT';
    let description = 'structural presence but contained/waiting';
    
    // Determine vector status based on planets and aspect type
    if (['Saturn', 'Pluto', 'Neptune'].includes(p1) || ['Saturn', 'Pluto', 'Neptune'].includes(p2)) {
      status = 'DORMANT';
      description = 'waiting for specific activation timing';
    } else if (orb > 6.0) {
      status = 'SUPPRESSED';  
      description = 'boundaries fortified/compensated by other placements';
    }

    vectorTags.push({
      status: status,
      vector_name: `${p1}-${p2} ${type}`,
      orb_degrees: orb,
      structural_presence: true,
      behavioral_activity: 'contained',
      description: description
    });
  }

  return vectorTags;
}

/**
 * Generate comprehensive relational mirror structure with all missing elements
 * @param {Object} personA - Person A data
 * @param {Object} personB - Person B data  
 * @param {Array} synastryAspects - Cross-chart aspects
 * @param {Object} composite - Composite chart data
 * @param {Object} compositTransits - Composite transit data
 * @returns {Object} Complete relational mirror structure
 */
function generateRelationalMirror(personA, personB, synastryAspects, composite, compositeTransits) {
  logger.debug('Generating comprehensive relational mirror structure');
  
  // Generate all missing relational elements
  const polarityCards = generatePolarityCards(synastryAspects, personA, personB);
  const echoLoops = detectEchoLoops(synastryAspects, personA.aspects, personB.aspects);
  const sstTags = generateSharedSSTTags(personA, personB, synastryAspects);
  const relationalBalanceMeter = computeRelationalBalanceMeter(
    synastryAspects, 
    composite.aspects, 
    compositeTransits
  );
  const vectorIntegrityTags = generateVectorIntegrityTags(synastryAspects, composite.aspects);

  // Generate Mirror Voice for the relationship
  const mirrorVoice = {
    relationship_climate: `${relationalBalanceMeter.climate_description}`,
    polarity_summary: polarityCards.length > 0 ? 
      `${polarityCards.length} primary polarity tensions identified` : 
      'No major polarity tensions detected',
    echo_pattern_summary: echoLoops.length > 0 ? 
      `${echoLoops.length} recurring feedback loops active` : 
      'No significant echo patterns detected',
    shared_field_description: `Relational field with ${synastryAspects?.length || 0} cross-chart connections`
  };

  // Relocation notes (basic implementation - would need actual relocation logic)
  const relocationNotes = {
    relocation_applied: false,
    house_system: 'Placidus', // Default
    angles_relocated: false,
    baseline_remains_natal: true,
    disclosure: 'No relocation applied; all angles and houses remain natal'
  };

  return {
    relational_mirror: {
      polarity_cards: polarityCards,
      echo_loops: echoLoops,
      sst_tags: sstTags,
      relational_balance_meter: relationalBalanceMeter,
      mirror_voice: mirrorVoice,
      vector_integrity_tags: vectorIntegrityTags,
      relocation_notes: relocationNotes,
      scaffolding_complete: true,
      mirror_type: 'true_relational_mirror'
    }
  };
}

/**
 * Compute composite chart transits using the transit-aspects-data endpoint
 * @param {Object} compositeRaw - Raw composite chart data (first_subject from composite calculation)
 * @param {string} start - Start date (YYYY-MM-DD)
 * @param {string} end - End date (YYYY-MM-DD) 
 * @param {string} step - Step size (daily, weekly, etc)
 * @param {Object} pass - Additional parameters to pass through
 * @param {Object} H - Headers for API request
 * @returns {Object} Object with transitsByDate and optional note
 */
async function computeCompositeTransits(compositeRaw, start, end, step, pass = {}, H) {
  if (!compositeRaw) return { transitsByDate: {} };
  
  const transitsByDate = {};
  const startDate = new Date(start);
  const endDate = new Date(end);
  endDate.setDate(endDate.getDate() + 1); // Make end date inclusive

  const promises = [];
  
  // Process each date in the range
  for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
    const dateString = d.toISOString().split('T')[0];
    
    // Create transit subject for current date (transiting planets at noon UTC)
    const transit_subject = {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: 12,
      minute: 0,
      city: "Greenwich",
      nation: "GB",
      latitude: 51.48,
      longitude: 0,
      timezone: "UTC",
      zodiac_type: "Tropic" // Fix: Add missing zodiac_type for composite transits
    };

    // Create payload with composite chart as first_subject and current date as transit_subject
    const payload = {
      first_subject: compositeRaw, // Use composite chart as the base chart
      transit_subject,             // Current transiting planets
      ...pass                      // Include any additional parameters
    };

    // Enhanced debug logging for composite transits
    logger.debug(`Composite transit API call for ${dateString}:`, {
      pass_keys: Object.keys(pass),
      composite_subject: compositeRaw?.name || 'Unknown composite'
    });
    logger.debug(`Full composite transit API payload for ${dateString}:`, JSON.stringify(payload, null, 2));

    promises.push(
      apiCallWithRetry(
        API_ENDPOINTS.TRANSIT_ASPECTS,
        {
          method: 'POST',
          headers: H,
          body: JSON.stringify(payload),
        },
        `Composite transits for ${dateString}`
      ).then(resp => {
        logger.debug(`Composite transit API response for ${dateString}:`, {
          hasAspects: !!(resp && resp.aspects),
          aspectCount: (resp && resp.aspects) ? resp.aspects.length : 0,
          responseKeys: resp ? Object.keys(resp) : 'null response'
        });

        // Store aspects for this date if any exist
        if (resp.aspects && resp.aspects.length > 0) {
          transitsByDate[dateString] = resp.aspects;
          logger.debug(`Stored ${resp.aspects.length} composite aspects for ${dateString}`);
        } else {
          logger.debug(`No composite aspects found for ${dateString} - response structure:`, resp);
          logger.debug(`Full raw composite API response for ${dateString} (no aspects):`, JSON.stringify(resp, null, 2));
        }
      }).catch(e => {
        logger.warn(`Failed to get composite transits for ${dateString}:`, e.message);
        // Continue processing other dates even if one fails
      })
    );
  }

  try {
    // Execute all API calls in parallel
    await Promise.all(promises);
    
    // Return results with proper structure expected by frontend
    return { transitsByDate };
    
  } catch (e) {
    logger.error('Composite transits calculation failed:', e);
    return { 
      transitsByDate: {}, 
      _note: 'Composite transits not available in current plan' 
    };
  }
}


// --- Error ID generator ---
function generateErrorId() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `ERR-${date}-${time}-${random}`;
}


exports.handler = async function(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({
          error: 'Only POST requests are allowed.',
          code: 'METHOD_NOT_ALLOWED',
          errorId: generateErrorId()
        })
      };
    }

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid JSON in request body.',
          code: 'INVALID_JSON',
          errorId: generateErrorId()
        })
      };
    }

    // Inputs
    const personA = normalizeSubjectData(body.personA || body.person_a || body.first_subject || body.subject);
    const personB = normalizeSubjectData(body.personB || body.person_b || body.second_subject);
    // Use strict validator for full chart endpoints, lean for aspects-only
  const modeToken = canonicalizeMode(body.context?.mode || body.mode || '');
    const wantNatalAspectsOnly = modeToken === 'NATAL_ASPECTS' || event.path?.includes('natal-aspects-data');
    const wantBirthData = modeToken === 'BIRTH_DATA' || event.path?.includes('birth-data');
    const wantSynastry = modeToken === 'SYNASTRY' || modeToken === 'SYNASTRY_TRANSITS';
    const wantSynastryAspectsOnly = modeToken === 'SYNASTRY_ASPECTS' || event.path?.includes('synastry-aspects-data');
    const wantComposite = modeToken === 'COMPOSITE' || modeToken === 'COMPOSITE_ASPECTS' || modeToken === 'COMPOSITE_TRANSITS' || body.wantComposite === true;
    const wantSkyTransits = modeToken === 'SKY_TRANSITS' || modeToken === 'WEATHER' || body.context?.type === 'weather';
    const wantBalanceMeter = modeToken === 'BALANCE_METER' || body.context?.mode === 'balance_meter';

    // --- Relationship Context Validation (Partner / Friend / Family) ---
    // Canonical enumerations supplied by product spec
    const REL_PRIMARY = ['PARTNER','FRIEND','FAMILY']; // FRIEND covers Friend / Colleague
    const PARTNER_TIERS = ['P1','P2','P3','P4','P5a','P5b'];
    const FRIEND_ROLES = ['Acquaintance','Mentor','Other','Custom'];
    const FAMILY_ROLES = ['Parent','Offspring','Sibling','Cousin','Extended','Guardian','Mentor','Other','Custom'];

    function normalizeRelType(t){
      if(!t) return '';
      const up = t.toString().trim().toUpperCase();
      if (up.startsWith('FRIEND')) return 'FRIEND';
      if (up === 'COLLEAGUE' || up.includes('COLLEAGUE')) return 'FRIEND';
      if (up.startsWith('FAMILY')) return 'FAMILY';
      if (up.startsWith('PARTNER')) return 'PARTNER';
      return up; // fallback; will validate later
    }

    function validateRelationshipContext(raw, relationshipMode){
      if(!relationshipMode) return { valid: true, value: null, reason: 'Not in relationship mode' };
      const ctx = raw || body.relationship || body.relationship_context || body.relationshipContext || {};
      const errors = [];
      const cleaned = {};

      cleaned.type = normalizeRelType(ctx.type || ctx.relationship_type || ctx.category);
      if(!REL_PRIMARY.includes(cleaned.type)) {
        errors.push('relationship.type required (PARTNER|FRIEND|FAMILY)');
      }

      // Intimacy tier requirement for PARTNER
      if (cleaned.type === 'PARTNER') {
        cleaned.intimacy_tier = (ctx.intimacy_tier || ctx.tier || '').toString();
        if(!PARTNER_TIERS.includes(cleaned.intimacy_tier)) {
          errors.push(`intimacy_tier required for PARTNER (one of ${PARTNER_TIERS.join(',')})`);
        }
      }

      // Role requirement for FAMILY; optional for FRIEND
      if (cleaned.type === 'FAMILY') {
        cleaned.role = (ctx.role || ctx.family_role || '').toString();
        if(!FAMILY_ROLES.includes(cleaned.role)) {
          errors.push(`role required for FAMILY (one of ${FAMILY_ROLES.join(',')})`);
        }
      } else if (cleaned.type === 'FRIEND') {
        cleaned.role = (ctx.role || ctx.friend_role || '').toString();
        if (cleaned.role && !FRIEND_ROLES.includes(cleaned.role)) {
          errors.push(`friend role invalid (optional, one of ${FRIEND_ROLES.join(',')})`);
        }
      }

      // Ex / Estranged flag only for PARTNER or FAMILY
      if (ctx.ex_estranged !== undefined || ctx.ex || ctx.estranged) {
        const flag = Boolean(ctx.ex_estranged || ctx.ex || ctx.estranged);
        if (cleaned.type === 'FRIEND') {
          errors.push('ex_estranged flag not allowed for FRIEND');
        } else {
          cleaned.ex_estranged = flag;
        }
      }

      if (ctx.notes) cleaned.notes = (ctx.notes || '').toString().slice(0, 500);

      if(errors.length) return { valid:false, errors, value: cleaned };
      return { valid:true, value: cleaned };
    }


    const vA = (wantNatalAspectsOnly || wantBirthData) ? validateSubjectLean(personA) : validateSubject(personA);
    if (!vA.isValid) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: `Primary subject validation failed: ${vA.message}`,
          code: 'VALIDATION_ERROR_A',
          errorId: generateErrorId()
        })
      };
    }

    // Relationship mode strict validation for Person B (fail loud, no silent fallback)
    const relationshipMode = wantSynastry || wantSynastryAspectsOnly || wantComposite;
    let personBStrictValidation = { isValid: false, errors: { reason: 'Not requested' } };
    // Relationship context validation (must precede Person B requirements messaging to give precise feedback)
    const relContextValidation = validateRelationshipContext(body.relationship_context || body.relationshipContext, relationshipMode);
    if (relationshipMode && !relContextValidation.valid) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Relationship context invalid',
          code: 'REL_CONTEXT_INVALID',
          errorId: generateErrorId(),
          issues: relContextValidation.errors || []
        })
      };
    }
    if (relationshipMode) {
      // Auto-fill default zodiac_type if missing BEFORE validation to reduce false negatives
      if (!personB.zodiac_type) personB.zodiac_type = 'Tropic';
      personBStrictValidation = validateSubjectStrictWithMap(personB);
      if (!personBStrictValidation.isValid) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Secondary subject validation failed',
            code: 'VALIDATION_ERROR_B',
            mode: modeToken,
            errorId: generateErrorId(),
            fieldErrors: personBStrictValidation.errors
          })
        };
      }
    }

    const start = body.transitStartDate || body.transit_start_date || body.transitParams?.startDate || body.transit?.startDate;
    const end   = body.transitEndDate   || body.transit_end_date   || body.transitParams?.endDate || body.transit?.endDate;
    const step  = normalizeStep(body.transitStep || body.transit_step || body.transitParams?.step || body.transit?.step);
    const haveRange = Boolean(start && end);

    let headers;
    try {
      headers = buildHeaders();
    } catch (e) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: e.message,
          code: 'CONFIG_ERROR',
          errorId: generateErrorId()
        })
      };
    }

    const result = { 
      schema: 'WM-Chart-1.2', 
      provenance: {
        math_brain_version: MATH_BRAIN_VERSION,
        ephemeris_source: EPHEMERIS_SOURCE,
        build_ts: new Date().toISOString(),
        timezone: personA.timezone || 'UTC',
        calibration_boundary: CALIBRATION_BOUNDARY,
        engine_versions: { seismograph: 'v1.0', balance: 'v1.1', sfd: 'v1.2' }
      },
      context: { mode: modeToken || 'UNKNOWN' },
      mirror_ready: true,
      contract: 'clear-mirror/1.2',
      person_a: { details: personA }
    };
    // Eagerly initialize Person B details in any relationship mode so UI never loses the panel
    if (relationshipMode && personB && Object.keys(personB).length) {
      result.person_b = { details: personB };
    }
    if (relationshipMode && relContextValidation.valid && relContextValidation.value) {
      result.relationship = relContextValidation.value;
    }

    // Extract additional parameters for API calculations (including transits)
    const pass = {};
    ['active_points','active_aspects','houses_system_identifier','sidereal_mode','perspective_type']
      .forEach(k => { if (body[k] !== undefined) pass[k] = body[k]; });
    // Quarantine UI/VOICE flags so they never touch math layer
    const quarantineKeys = ['voice','voice_mode','exclude_person_b','excludePersonB','reflect_mode','ui','display'];
    quarantineKeys.forEach(k => { if (k in pass) delete pass[k]; });

    // Ensure active_points includes all planets (especially outer planets) if not explicitly set
    if (!pass.active_points) {
      pass.active_points = [
        'Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn',
        'Uranus','Neptune','Pluto',
        'Mean_Node','True_Node','Mean_South_Node','True_South_Node',
        'Chiron','Mean_Lilith',
        'Ascendant','Medium_Coeli','Descendant','Imum_Coeli'
      ];
      logger.debug('Setting default active_points (includes True nodes & full angle set)');
    }

    // Ensure active_aspects includes all major aspects if not explicitly set
    if (!pass.active_aspects) {
      pass.active_aspects = [
        // Accepted list per API error detail: 'conjunction', 'semi-sextile', 'semi-square', 'sextile', 'quintile', 'square', 'trine', 'sesquiquadrate', 'biquintile', 'quincunx', 'opposition'
        { name: "conjunction", orb: 10 },
        { name: "opposition", orb: 10 },
        { name: "trine", orb: 8 },
        { name: "square", orb: 8 },
        { name: "sextile", orb: 6 },
        { name: "semi-sextile", orb: 2 },
        { name: "semi-square", orb: 2 }, // renamed from semisquare
        { name: "quincunx", orb: 3 },
        { name: "sesquiquadrate", orb: 3 },
        { name: "quintile", orb: 2 },
        { name: "biquintile", orb: 2 }
      ];
      logger.debug('Setting default active_aspects to accepted canonical list');
    }

    // --- Aspect name normalization (handles user supplied list & legacy synonyms) ---
    const ASPECT_SYNONYMS = {
      'semisquare': 'semi-square',
      'semi_square': 'semi-square',
      'semi square': 'semi-square',
      'semisextile': 'semi-sextile',
      'semi_sextile': 'semi-sextile',
      'semi sextile': 'semi-sextile',
      'inconjunct': 'quincunx',
      'sesqui-square': 'sesquiquadrate',
      'sesquisquare': 'sesquiquadrate'
    };

    if (Array.isArray(pass.active_aspects)) {
      pass.active_aspects = pass.active_aspects
        .map(a => {
          if (!a) return null;
            if (typeof a === 'string') return { name: a, orb: 3 };
            if (typeof a === 'object') {
              const raw = (a.name || a.type || '').toString().toLowerCase();
              const canonical = ASPECT_SYNONYMS[raw] || raw;
              return { name: canonical, orb: a.orb != null ? a.orb : 3 };
            }
            return null;
        })
        .filter(Boolean)
        // Deduplicate by name keeping largest orb
        .reduce((acc, cur) => {
          const existing = acc.find(x => x.name === cur.name);
          if (!existing) acc.push(cur); else if (cur.orb > existing.orb) existing.orb = cur.orb;
          return acc;
        }, []);
    }
    logger.debug('Normalized active_aspects list:', pass.active_aspects);

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
      const chartData = stripGraphicsDeep(natalResponse.data || {});
      result.person_a.chart = chartData;
      result.person_a.aspects = Array.isArray(natalResponse.aspects) ? natalResponse.aspects : (chartData.aspects || []);
    } else {
      natalResponse = await apiCallWithRetry(
        API_ENDPOINTS.BIRTH_CHART,
        { method: 'POST', headers, body: JSON.stringify({ subject: personA }) },
        'Birth chart (A)'
      );
      const chartData = stripGraphicsDeep(natalResponse.data || {});
      result.person_a.chart = chartData;
      result.person_a.aspects = Array.isArray(natalResponse.aspects) ? natalResponse.aspects : (chartData.aspects || []);
    }

    // 2) Transits (optional; raw aspects by date, with advanced options)
    // Skip transit processing for natal_only mode even if date range is provided
    const skipTransits = modeToken === 'NATAL_ONLY';
    
    // Sky transits mode - planetary transits without personal natal chart
    if (wantSkyTransits && haveRange) {
      logger.debug('Processing sky transits mode:', { start, end, step });
      
      // Create a dummy subject for sky-only transits (no personal data)
      const skySubject = {
        name: 'Sky Patterns',
        birth_date: start, // Use start date as reference
        birth_time: '12:00',
        birth_location: 'Greenwich, UK', // Neutral location for sky patterns
        timezone: 'GMT'
      };
      
      try {
        const { transitsByDate, retroFlagsByDate } = await getTransits(skySubject, { startDate: start, endDate: end, step }, headers, pass);
        
        // Apply seismograph analysis to sky transits
        const seismographData = calculateSeismograph(transitsByDate, retroFlagsByDate);
        
        // Store sky transit data
        result.sky_transits = {
          transitsByDate: seismographData.daily,
          derived: {
            seismograph_summary: seismographData.summary,
            mode: 'sky_patterns_only'
          }
        };
        
        logger.debug('Sky transits completed with seismograph analysis');
      } catch (e) {
        logger.warn('Sky transits computation failed:', e.message);
        result.sky_transits = { error: 'Failed to compute sky patterns' };
      }
    } else if (haveRange && !skipTransits) {
      // Use new getTransits and seismograph logic with configuration parameters
  const { transitsByDate, retroFlagsByDate } = await getTransits(personA, { startDate: start, endDate: end, step }, headers, pass);
  result.person_a.chart = { ...result.person_a.chart, transitsByDate };
      // Raven-lite integration: flatten all aspects for derived.t2n_aspects
      const allAspects = Object.values(transitsByDate).flatMap(day => day);
      
      logger.debug(`Transit aspects found: ${allAspects.length} total including outer planets`);
      
      result.person_a.derived = result.person_a.derived || {};
      result.person_a.derived.t2n_aspects = mapT2NAspects(allAspects);
      // Add transit_data array for test compatibility
      result.person_a.transit_data = Object.values(transitsByDate);
      
      // Seismograph summary (using all aspects including outer planets for complete structural analysis)
  const seismographData = calculateSeismograph(transitsByDate, retroFlagsByDate);
      result.person_a.derived.seismograph_summary = seismographData.summary;
  // NOTE: transitsByDate now includes per-day: aspects (raw), filtered_aspects, hooks, counts, seismograph metrics
  // Frontend can progressively disclose hooks first, then filtered_aspects, then full list.
  result.person_a.chart.transitsByDate = seismographData.daily;
    }

    // 2b) Dual natal modes (explicit): provide both natal charts (and optional transits) WITHOUT synastry math
    const dualNatalMode = modeToken === 'DUAL_NATAL' || modeToken === 'DUAL_NATAL_TRANSITS';
    if ((dualNatalMode || (!relationshipMode && modeToken && modeToken.startsWith('NATAL') && personB && Object.keys(personB).length)) && personB) {
      const vBLeanPassive = validateSubjectLean(personB);
      if (vBLeanPassive.isValid) {
        if (!result.person_b || !result.person_b.chart) {
          try {
            const natalB = await apiCallWithRetry(
              API_ENDPOINTS.BIRTH_CHART,
              { method: 'POST', headers, body: JSON.stringify({ subject: personB }) },
              'Birth chart (B dual)'
            );
            const chartDataB = stripGraphicsDeep(natalB.data || {});
            result.person_b = { details: personB, chart: chartDataB, aspects: Array.isArray(natalB.aspects) ? natalB.aspects : (chartDataB.aspects || []) };
          } catch (e) {
            logger.warn('Dual Person B natal fetch failed', e.message);
            result.person_b = { details: personB, error: 'Failed to compute Person B chart' };
          }
        }
        // Optional Person B transits in dual transits mode
        if (haveRange && !skipTransits && modeToken === 'DUAL_NATAL_TRANSITS') {
          try {
            const { transitsByDate: transitsByDateB, retroFlagsByDate: retroFlagsByDateB } = await getTransits(personB, { startDate: start, endDate: end, step }, headers, pass);
            const allB = Object.values(transitsByDateB).flatMap(day => day);
            const seismoB = calculateSeismograph(transitsByDateB, retroFlagsByDateB);
            // Enriched Person B transits (dual mode) with hooks & filtered_aspects
            result.person_b.chart = { ...(result.person_b.chart || {}), transitsByDate: seismoB.daily };
            result.person_b.derived = result.person_b.derived || {};
            result.person_b.derived.seismograph_summary = seismoB.summary;
            result.person_b.derived.t2n_aspects = mapT2NAspects(allB); // Person B self transits (transit-to-natal B)
            result.person_b.transit_data = Object.values(transitsByDateB);
          } catch (e) {
            logger.warn('Dual Person B transits fetch failed', e.message);
            result.person_b.transits_error = 'Failed to compute Person B transits';
          }
        }
      } else {
        result.person_b = { details: personB, validation_error: vBLeanPassive.message };
      }
    }

    // 2c) Implicit dual transit support: if mode is a single-person NATAL* variant that requests transits (e.g., NATAL_TRANSITS)
    // and Person B was supplied, compute Person B transits as well (without requiring explicit DUAL_NATAL_TRANSITS token).
    // Skip if relationshipMode (synastry/composite) to avoid duplication, and skip if already handled by explicit dual mode above.
    if (
      haveRange &&
      !skipTransits &&
      !relationshipMode &&
      personB && Object.keys(personB).length &&
      modeToken && modeToken.startsWith('NATAL') && modeToken.includes('TRANSITS') &&
      modeToken !== 'DUAL_NATAL_TRANSITS'
    ) {
      const vBLeanPassive2 = validateSubjectLean(personB);
      if (vBLeanPassive2.isValid) {
        // Ensure we have Person B natal baseline (light fetch if missing)
        if (!result.person_b || !result.person_b.chart) {
          try {
            const natalB = await apiCallWithRetry(
              API_ENDPOINTS.BIRTH_CHART,
              { method: 'POST', headers, body: JSON.stringify({ subject: personB }) },
              'Birth chart (B implicit dual)'
            );
            const chartDataB = stripGraphicsDeep(natalB.data || {});
            result.person_b = { details: personB, chart: chartDataB, aspects: Array.isArray(natalB.aspects) ? natalB.aspects : (chartDataB.aspects || []) };
          } catch (e) {
            logger.warn('Implicit dual Person B natal fetch failed', e.message);
            result.person_b = { ...(result.person_b || {}), details: personB, error: 'Failed to compute Person B chart' };
          }
        }
        // Only compute B transits if not already present
        const hasBTransits = !!(result.person_b && result.person_b.chart && result.person_b.chart.transitsByDate);
        if (!hasBTransits) {
          try {
            const { transitsByDate: transitsByDateB, retroFlagsByDate: retroFlagsByDateB } = await getTransits(personB, { startDate: start, endDate: end, step }, headers, pass);
            const allB = Object.values(transitsByDateB).flatMap(day => day);
            const seismoB = calculateSeismograph(transitsByDateB, retroFlagsByDateB);
            // Enriched Person B implicit dual transits with hooks & filtered_aspects
            result.person_b.chart = { ...(result.person_b.chart || {}), transitsByDate: seismoB.daily };
            result.person_b.derived = result.person_b.derived || {};
            result.person_b.derived.seismograph_summary = seismoB.summary;
            result.person_b.derived.t2n_aspects = mapT2NAspects(allB);
            result.person_b.transit_data = Object.values(transitsByDateB);
            result.person_b.implicit_dual_transits = true; // provenance flag
          } catch (e) {
            logger.warn('Implicit dual Person B transits fetch failed', e.message);
            result.person_b.transits_error = 'Failed to compute Person B transits';
          }
        }
      } else {
        result.person_b = { ...(result.person_b || {}), details: personB, validation_error: vBLeanPassive2.message };
      }
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
  const synData = stripGraphicsDeep(syn.data || {});
  result.person_b = { ...(result.person_b || {}), details: personB };
  result.synastry_aspects = Array.isArray(syn.aspects) ? syn.aspects : (synData.aspects || []);
  result.synastry_data = synData;
  
      // Generate relational mirror for synastry-aspects-only mode
      const relationalMirror = generateRelationalMirror(
        result.person_a || { details: personA, aspects: [] },
        { details: personB, aspects: [] },
        result.synastry_aspects,
        { aspects: [], raw: {} }, // No composite in aspects-only mode
        {}
      );
      
      // Add relational processing to synastry results
      result.synastry_relational_mirror = relationalMirror.relational_mirror;
      logger.debug('Added relational mirror to synastry-aspects-only mode');
      // Optional: augment with Person B natal chart so UI has both charts in aspects-only mode
      try {
        const natalB = await apiCallWithRetry(
          API_ENDPOINTS.BIRTH_CHART,
          { method: 'POST', headers, body: JSON.stringify({ subject: personB }) },
          'Birth chart (B for synastry-aspects)'
        );
        const chartDataB = stripGraphicsDeep(natalB.data || {});
        result.person_b.chart = chartDataB;
      } catch (e) {
        logger.warn('Could not augment synastry-aspects with Person B natal chart', e.message);
      }
    } else if (wantSynastry && validBStrict.isValid) {
      // Full synastry chart endpoint
      const syn = await apiCallWithRetry(
        API_ENDPOINTS.SYNASTRY_CHART,
        { method: 'POST', headers, body: JSON.stringify({ first_subject: personA, second_subject: personB }) },
        'Synastry chart'
      );
  const synClean = stripGraphicsDeep(syn.data || {});
  result.person_b = { details: personB, chart: synClean.second_subject || {} };
  result.synastry_aspects = Array.isArray(syn.aspects) ? syn.aspects : (synClean.aspects || []);
      
      // Generate relational mirror for full synastry mode
      const relationalMirror = generateRelationalMirror(
        result.person_a || { details: personA, aspects: [] },
        result.person_b,
        result.synastry_aspects,
        { aspects: [], raw: {} }, // No composite in synastry mode
        {}
      );
      
      // Add relational processing to synastry results
      result.synastry_relational_mirror = relationalMirror.relational_mirror;
      logger.debug('Added relational mirror to full synastry mode');
      
      // Add Person B transits for synastry modes (especially SYNASTRY_TRANSITS)
      if (modeToken === 'SYNASTRY_TRANSITS' && haveRange && !skipTransits) {
        logger.debug('Computing Person B transits for synastry mode:', { start, end, step });
  const { transitsByDate: transitsByDateB, retroFlagsByDate: retroFlagsByDateB } = await getTransits(personB, { startDate: start, endDate: end, step }, headers, pass);
        result.person_b.chart = { ...result.person_b.chart, transitsByDate: transitsByDateB };
        
        // Apply seismograph analysis to Person B transits
  const seismographDataB = calculateSeismograph(transitsByDateB, retroFlagsByDateB);
  // Enriched Person B synastry transits
  result.person_b.chart.transitsByDate = seismographDataB.daily;
        result.person_b.derived = { 
          seismograph_summary: seismographDataB.summary,
          t2n_aspects: mapT2NAspects(Object.values(transitsByDateB).flatMap(day => day))
        };
        
        logger.debug('Person B transits completed for synastry mode');
      }
    }

    // === COMPOSITE CHARTS AND TRANSITS ===
  const vB = personB ? validateSubjectLean(personB) : { isValid:false };
  if (wantComposite && vB.isValid) {
      // Step 1: Always compute composite aspects first (data-only endpoint)
      // This creates the midpoint composite chart data that serves as the base for transits
      const composite = await computeComposite(personA, personB, pass, headers);
      
      // Step 1.5: Add natal scaffolding for both persons (required for full relational mirror)
      // CRITICAL FIX: Composite reports need both natal charts to generate polarity cards, 
      // Echo Loops, and SST logs. Without this scaffolding, the Poetic Brain only gets
      // Balance Meter data and metadata, missing the foundational chart geometries.
      // Ensure Person B natal chart is included if not already fetched
      if (!result.person_b || !result.person_b.chart) {
        try {
          logger.debug('Fetching Person B natal chart for composite scaffolding');
          const natalB = await apiCallWithRetry(
            API_ENDPOINTS.BIRTH_CHART,
            { method: 'POST', headers, body: JSON.stringify({ subject: personB }) },
            'Birth chart (B for composite scaffolding)'
          );
          const chartDataB = stripGraphicsDeep(natalB.data || {});
          result.person_b = { 
            ...(result.person_b || {}), 
            details: personB, 
            chart: chartDataB,
            aspects: Array.isArray(natalB.aspects) ? natalB.aspects : (chartDataB.aspects || [])
          };
          logger.debug('Person B natal chart added to composite scaffolding');
        } catch (e) {
          logger.warn('Could not fetch Person B natal chart for composite scaffolding', e.message);
          result.person_b = { ...(result.person_b || {}), details: personB };
        }
      } else {
        // Person B chart already exists, just ensure details are included
        result.person_b = { ...(result.person_b || {}), details: personB };
      }
      
      // Add synastry aspects for cross-field hooks and polarity cards
      try {
        logger.debug('Computing synastry aspects for composite scaffolding');
        const syn = await apiCallWithRetry(
          API_ENDPOINTS.SYNASTRY_ASPECTS,
          { method: 'POST', headers, body: JSON.stringify({ first_subject: personA, second_subject: personB }) },
          'Synastry aspects for composite scaffolding'
        );
        const synData = stripGraphicsDeep(syn.data || {});
        const synastryAspects = Array.isArray(syn.aspects) ? syn.aspects : (synData.aspects || []);
        
        // Generate comprehensive relational mirror with all missing elements
        const relationalMirror = generateRelationalMirror(
          result.person_a || { details: personA, aspects: [] },
          result.person_b || { details: personB, aspects: [] },
          synastryAspects,
          composite,
          {} // composite transits will be added later if date range provided
        );

        result.composite = { 
          aspects: composite.aspects,      // Composite chart internal aspects
          data: composite.raw,            // Raw composite chart data for further calculations
          synastry_aspects: synastryAspects, // Cross-chart aspects for relational mapping
          synastry_data: synData,          // Additional synastry data
          ...relationalMirror             // Include comprehensive relational processing
        };
        logger.debug(`Added ${synastryAspects.length} synastry aspects and complete relational mirror to composite scaffolding`);
      } catch (e) {
        logger.warn('Could not compute synastry aspects for composite scaffolding', e.message);
        // Generate relational mirror even without synastry aspects (limited but still relational)
        const relationalMirror = generateRelationalMirror(
          result.person_a || { details: personA, aspects: [] },
          result.person_b || { details: personB, aspects: [] },
          [], // No synastry aspects available
          composite,
          {}
        );

        result.composite = { 
          aspects: composite.aspects,    // Composite chart internal aspects
          data: composite.raw,           // Raw composite chart data for further calculations
          ...relationalMirror            // Include relational processing even without synastry
        };
      }

  // Step 2: Composite transits: now ALWAYS computed when a date range is supplied, regardless of specific composite sub-mode
  // Rationale: connection "pressure" mapping requires transits; aspects-only without transits is incomplete.
  if (haveRange && !skipTransits) {
        logger.debug('Computing composite transits for date range:', { start, end, step });
        
        // Calculate transits to the composite chart using the composite chart as base
  const t = await computeCompositeTransits(composite.raw, start, end, step, pass, headers);
        
        // Store raw transit aspects by date
        result.composite.transitsByDate = t.transitsByDate;
        if (t._note) result.composite.note = t._note;
        
        // Step 3: Apply seismograph analysis to composite transits
        // This converts raw aspects into magnitude, valence, and volatility metrics
  const seismographData = calculateSeismograph(t.transitsByDate, {});
        
        // Replace raw aspects with seismograph-processed daily data
  // Enriched composite transits with hooks & filtered_aspects
  result.composite.transitsByDate = seismographData.daily;
        
        // Add derived metrics for frontend consumption
        result.composite.derived = { 
          seismograph_summary: seismographData.summary 
        };
        
        // Update relational Balance Meter with transit data if relational mirror exists
        if (result.composite.relational_mirror) {
          const updatedRelationalBalanceMeter = computeRelationalBalanceMeter(
            result.composite.synastry_aspects || [],
            result.composite.aspects || [],
            seismographData.daily
          );
          result.composite.relational_mirror.relational_balance_meter = updatedRelationalBalanceMeter;
          logger.debug('Updated relational Balance Meter with composite transit data');
        }
        
        // Annotate if transits were auto-added (mode not explicitly COMPOSITE_TRANSITS)
        if (modeToken !== 'COMPOSITE_TRANSITS') {
          result.composite.auto_transits_included = true;
          result.composite.request_mode = modeToken;
        }
        logger.debug('Composite transits completed with seismograph analysis');
      }
    }

    // === BALANCE METER MODE ===
    if (wantBalanceMeter && haveRange) {
      logger.debug('Processing Balance Meter mode for standalone report');

      // Ensure Person A transit seismograph exists; compute if missing
      if (!result.person_a?.chart?.transitsByDate) {
        try {
          const { transitsByDate, retroFlagsByDate } = await getTransits(personA, { startDate: start, endDate: end, step }, headers, pass);
          const seismographData = calculateSeismograph(transitsByDate, retroFlagsByDate);
          result.person_a = result.person_a || {};
          result.person_a.derived = result.person_a.derived || {};
          result.person_a.derived.seismograph_summary = seismographData.summary;
          result.person_a.chart = { ...(result.person_a.chart || {}), transitsByDate: seismographData.daily };
        } catch (e) {
          logger.warn('Balance Meter fallback transit compute failed:', e.message);
        }
      }

      if (result.person_a?.chart?.transitsByDate) {
        // Balance Meter report focuses on triple-channel seismograph outputs
        const balanceMeterReport = {
          period: {
            start: start,
            end: end,
            step: step
          },
          schema_version: '1.2',
          channel_summary: result.person_a.derived?.seismograph_summary || null,
          daily_entries: result.person_a.chart.transitsByDate,
          person: {
            name: personA.name || 'Subject',
            birth_date: personA.birth_date,
            birth_time: personA.birth_time,
            birth_location: personA.birth_location
          }
        };

        // Replace standard natal-centric response with Balance Meter focus
        result.balance_meter = balanceMeterReport;
        result.mode = 'balance_meter';
        logger.debug('Balance Meter standalone report generated successfully');
      } else {
        logger.warn('Balance Meter requested but no transits available to compute report');
      }
    }

    // Post-compute contract assertions: if relationship mode requested ensure presence of person_b/composite
    if (relationshipMode) {
      const missing = [];
      if ((wantSynastry || wantSynastryAspectsOnly) && !result.person_b) missing.push('person_b');
      if (wantComposite && !result.composite) missing.push('composite');
      if (missing.length) {
        throw Object.assign(new Error('PIPELINE_DROPPED_B'), { code: 'PIPELINE_DROPPED_B', missing });
      }
    }

    // Final narrative key scrub (defense-in-depth for Clear Mirror contract)
    function scrubNarrativeKeys(obj){
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(scrubNarrativeKeys);
      const out = {};
      for (const [k,v] of Object.entries(obj)) {
        if (k === 'field' || k === 'voice' || k === 'map') continue;
        out[k] = scrubNarrativeKeys(v);
      }
      return out;
    }
    const safeResult = scrubNarrativeKeys(result);
    return { statusCode: 200, body: JSON.stringify(safeResult) };
  } catch (error) {
    logger.error('Handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
  error: error?.message || 'Internal server error',
  code: error?.code || 'INTERNAL_ERROR',
        errorId: generateErrorId(),
        stack: error?.stack || null,
        details: error
      }),
    };
  }
};
    // Mark reconstructed if any requested date precedes the calibration boundary
    try {
      if (start && new Date(start) < new Date(CALIBRATION_BOUNDARY)) {
        result.reconstructed = true;
      }
    } catch (_) { /* noop */ }
