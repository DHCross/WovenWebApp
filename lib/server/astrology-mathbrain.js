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
const { composeWovenMapReport } = require('../../src/reporters/woven-map-composer');
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

// Timezone normalization for common aliases and US/* forms
function normalizeTimezone(tz) {
  if (!tz || typeof tz !== 'string') return tz;
  const t = tz.trim();
  const map = {
    // US area aliases
    'US/Eastern': 'America/New_York',
    'US/Central': 'America/Chicago',
    'US/Mountain': 'America/Denver',
    'US/Pacific': 'America/Los_Angeles',
    'US/Arizona': 'America/Phoenix',
    'US/Alaska': 'America/Anchorage',
    'US/Hawaii': 'Pacific/Honolulu',
    'US/East-Indiana': 'America/Indiana/Indianapolis',
    // Abbreviations (best-effort; DST not inferred, but upstream only needs IANA ID)
    'EST': 'America/New_York',
    'EDT': 'America/New_York',
    'CST': 'America/Chicago',
    'CDT': 'America/Chicago',
    'MST': 'America/Denver',
    'MDT': 'America/Denver',
    'PST': 'America/Los_Angeles',
    'PDT': 'America/Los_Angeles',
    'AKST': 'America/Anchorage',
    'AKDT': 'America/Anchorage',
    'HST': 'Pacific/Honolulu'
  };
  const mapped = map[t] || t;
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: mapped }).resolvedOptions().timeZone;
  } catch {
    return mapped;
  }
}

function normalizeRelocationMode(mode) {
  if (!mode && mode !== 0) return null;
  const token = String(mode).trim();
  if (!token) return null;
  const lower = token.toLowerCase();
  if (['none', 'off', 'natal', 'default'].includes(lower)) return 'none';
  if (['a_local', 'a-local', 'alocal', 'person_a', 'person-a'].includes(lower)) return 'A_local';
  if (['b_local', 'b-local', 'blocal', 'person_b', 'person-b'].includes(lower)) return 'B_local';
  if (['custom', 'manual', 'user'].includes(lower)) return 'Custom';
  if (['midpoint', 'mid-point'].includes(lower)) return 'Midpoint';
  return token;
}

function evaluateMirrorReadiness(result) {
  if (!result || typeof result !== 'object') return false;
  const wm = result.woven_map;
  if (!wm || typeof wm !== 'object') return false;

  const voice = wm.mirror_voice;
  const hasVoice = typeof voice === 'string'
    ? voice.trim().length > 0
    : (voice && typeof voice === 'object' && Object.keys(voice).length > 0);

  const vector = wm.vector_integrity || {};
  const vectorReady = Boolean(
    vector &&
    vector.method &&
    vector.method !== 'stub-0' &&
    ((Array.isArray(vector.latent) && vector.latent.length > 0) ||
     (Array.isArray(vector.suppressed) && vector.suppressed.length > 0))
  );

  const anchorsReady = Boolean(
    wm.natal_summary &&
    wm.natal_summary.anchors &&
    Object.values(wm.natal_summary.anchors).some(Boolean)
  );

  const sfdReady = wm.balance_meter && wm.balance_meter.support_friction &&
    wm.balance_meter.support_friction.value !== null &&
    wm.balance_meter.support_friction.value !== undefined;

  return Boolean(hasVoice && vectorReady && anchorsReady && sfdReady);
}

// Derive time provenance for a subject based on presence of hour/minute
function deriveTimeMeta(subject) {
  const h = subject?.hour;
  const m = subject?.minute;
  const known = (h !== undefined && h !== null) && (m !== undefined && m !== null);
  const pad2 = (n)=> String(n).padStart(2, '0');
  return {
    birth_time_known: !!known,
    time_precision: known ? 'exact' : 'unknown',
    effective_time_used: known ? `${pad2(h)}:${pad2(m)}` : undefined
  };
}

// Canonicalize an incoming time policy token
function canonicalizeTimePolicy(raw) {
  if (!raw) return 'user_provided';
  const t = String(raw).trim().toLowerCase();
  if (t === 'planetary_only' || t === 'planetary-only' || t === 'planetary') return 'planetary_only';
  if (t === 'whole_sign' || t === 'whole-sign' || t === 'wholesign' || t === 'whole') return 'whole_sign';
  if (t === 'sensitivity_scan' || t === 'sensitivity-scan' || t === 'scan') return 'sensitivity_scan';
  return 'user_provided';
}

// Derive time provenance but honor explicit time_policy when birth time is unknown
function deriveTimeMetaWithPolicy(subject, timePolicy) {
  const base = deriveTimeMeta(subject);
  const unknown = !base.birth_time_known;
  if (!unknown) return base;
  const policy = canonicalizeTimePolicy(timePolicy);
  if (policy === 'planetary_only') {
    return { birth_time_known: false, time_precision: 'unknown', effective_time_used: undefined };
  }
  if (policy === 'whole_sign') {
    return { birth_time_known: false, time_precision: 'noon_fallback', effective_time_used: '12:00' };
  }
  if (policy === 'sensitivity_scan') {
    return { birth_time_known: false, time_precision: 'range_scan', effective_time_used: undefined };
  }
  return base;
}

function validateSubjectLean(s = {}) {
  const req = ['year','month','day','hour','minute','latitude','longitude'];
  const missing = req.filter(k => s[k] === undefined || s[k] === null || s[k] === '');
  return { isValid: missing.length === 0, message: missing.length ? `Missing: ${missing.join(', ')}` : 'ok' };
}

// --- Helper Functions ---

/**
 * Parses coordinate strings in various formats (DMS, decimal)
 * Accepts: "40°1'N, 75°18'W", "40° 1' N, 75° 18' W", optional seconds and unicode primes.
 * @param {string} coordString - Coordinate string.
 * @returns {{lat: number, lon: number}|null} Parsed coordinates or null
 */
function parseCoordinates(coordString) {
  if (!coordString || typeof coordString !== 'string') return null;

  // Normalize common unicode variants
  let s = coordString.trim()
    .replace(/º/g, '°')    // alt degree symbol
    .replace(/[’′]/g, "'") // prime to apostrophe
    .replace(/[”″]/g, '"'); // double prime to quote

  // Flexible DMS pattern with optional minutes/seconds and spaces
  // Groups: 1=latDeg,2=latMin?,3=latSec?,4=latHem,5=lonDeg,6=lonMin?,7=lonSec?,8=lonHem
  const DMS = /^\s*(\d{1,3})(?:\s*°\s*(\d{1,2})(?:['"]?\s*([\d.]+))?)?\s*([NS])\s*,\s*(\d{1,3})(?:\s*°\s*(\d{1,2})(?:['"]?\s*([\d.]+))?)?\s*([EW])\s*$/i;
  const m = DMS.exec(s);
  if (m) {
    const dmsToDec = (d, m, sec, hem) => {
      const deg = parseInt(d, 10) || 0;
      const min = parseInt(m || '0', 10) || 0;
      const secF = parseFloat(sec || '0') || 0;
      let val = deg + min / 60 + secF / 3600;
      if (/S|W/i.test(hem)) val *= -1;
      return val;
    };
    const lat = dmsToDec(m[1], m[2], m[3], m[4]);
    const lon = dmsToDec(m[5], m[6], m[7], m[8]);
    if (isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      logger.info('Parsed DMS coordinates', { input: coordString, output: { lat, lon } });
      return { lat, lon };
    }
  }

  // Decimal fallback: "40.0167, -75.3000"
  const DEC = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;
  const d = DEC.exec(s);
  if (d) {
    const lat = parseFloat(d[1]);
    const lon = parseFloat(d[2]);
    if (isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat, lon };
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
  const baseReq = ['year','month','day','hour','minute','name','zodiac_type'];
  const baseMissing = baseReq.filter(f => subject[f] === undefined || subject[f] === null || subject[f] === '');
  // Accept either coords-mode OR city-mode
  const hasCoords = (typeof subject.latitude === 'number') && (typeof subject.longitude === 'number') && !!subject.timezone;
  const hasCity = !!(subject.city && subject.nation);
  const okMode = hasCoords || hasCity;
  const modeMsg = okMode ? '' : 'coords(lat,lon,timezone) OR city,nation required';
  const missingMsg = baseMissing.length ? `Missing: ${baseMissing.join(', ')}` : '';
  return { isValid: baseMissing.length === 0 && okMode, message: [missingMsg, modeMsg].filter(Boolean).join('; ') || 'ok' };
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
  latitude: data.latitude ?? data.lat,
  longitude: data.longitude ?? data.lon ?? data.lng,
  timezone: normalizeTimezone(data.timezone || data.tz_str),
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
  // Support birth_date / birth_time aliases
  if (data.birth_date && (!normalized.year || !normalized.month || !normalized.day)) {
    try {
      const [y, m, d] = String(data.birth_date).split('-').map(Number);
      if (y && m && d) { normalized.year = y; normalized.month = m; normalized.day = d; }
    } catch(_) {}
  }
  if (data.birth_time && (!normalized.hour || !normalized.minute)) {
    try {
      const [h, min] = String(data.birth_time).split(':').map(Number);
      if (h !== undefined && min !== undefined) { normalized.hour = h; normalized.minute = min; }
    } catch(_) {}
  }
  // City / Country aliases
  if (!normalized.city) {
    normalized.city = data.birth_city || data.city_name || data.town || normalized.city;
  }
  if (!normalized.nation) {
    normalized.nation = data.birth_country || data.country || data.country_code || normalized.nation;
  }
  // Timezone aliases
  if (!normalized.timezone) {
    normalized.timezone = normalizeTimezone(data.offset || data.tz || data.tzid || data.time_zone || normalized.timezone);
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

/**
 * Convert internal normalized subject shape to Astrologer API Subject Model.
 * Internal uses latitude, longitude, timezone; API expects lat, lng, tz_str.
 * Keeps core birth fields and optional houses_system_identifier.
 * @param {Object} s - Internal subject
 * @param {Object} pass - Optional pass-through config (may include houses_system_identifier)
 * @returns {Object} API SubjectModel
 */
function subjectToAPI(s = {}, pass = {}) {
  if (!s) return {};
  const hasCoords = (typeof s.latitude === 'number' || typeof s.lat === 'number')
    && (typeof s.longitude === 'number' || typeof s.lon === 'number' || typeof s.lng === 'number')
    && (s.timezone || s.tz_str);
  const hasCity = !!(s.city && s.nation);
  const tzNorm = normalizeTimezone(s.timezone || s.tz_str);
  const apiSubject = {
    name: s.name,
    year: s.year, month: s.month, day: s.day,
    hour: s.hour, minute: s.minute,
    zodiac_type: s.zodiac_type || 'Tropic'
  };
  // Send coordinates if available (API expects latitude/longitude/timezone field names)
  const includeCoords = hasCoords && !pass.force_city_mode && !pass.suppress_coords;
  if (includeCoords) {
    apiSubject.latitude = s.latitude ?? s.lat;
    apiSubject.longitude = s.longitude ?? s.lon ?? s.lng;
    apiSubject.timezone = tzNorm;
  }
  
  // Send city/nation when requested or when coords are absent
  // Notes: Some natal endpoints validate presence of city field even if lat/lng/tz provided.
  // pass.require_city forces inclusion alongside coords; we avoid adding geonames_username
  // when coords are present to reduce resolver ambiguity.
  const wantCity = hasCity && (pass.require_city || !includeCoords);
  if (wantCity) {
    apiSubject.city = s.state ? `${s.city}, ${s.state}` : s.city;
    apiSubject.nation = s.nation;
    // Only include geonames_username when operating in pure city mode (no coords) unless explicitly forced
    if ((!includeCoords || pass.force_city_mode) && process.env.GEONAMES_USERNAME && !pass?.suppress_geonames) {
      (apiSubject).geonames_username = process.env.GEONAMES_USERNAME;
    }
  }
  const hsys = s.houses_system_identifier || pass.houses_system_identifier;
  if (hsys) apiSubject.houses_system_identifier = hsys;
  return apiSubject;
}

// Helper: call natal endpoints with formation fallback
async function callNatal(endpoint, subject, headers, pass = {}, description = 'Natal call'){
  const hasCoords = !!(subject.latitude && subject.longitude && subject.timezone);
  const hasGeonames = !!(process.env.GEONAMES_USERNAME || subject.geonames_username);

  if (hasCoords) {
    // Attempt 1: coords+city (API requires city field even with coordinates)
    const payloadCoords = { subject: subjectToAPI(subject, { ...pass, require_city: true, force_city_mode: false, suppress_geonames: true, suppress_coords: false }) };
    try {
      return await apiCallWithRetry(endpoint, { method: 'POST', headers, body: JSON.stringify(payloadCoords) }, description);
    } catch (e1) {
      // If coords fail, fall through to city+geonames
    }
  }

  // Fallback: city+geonames (when no coords or coords failed)
  const canTryCity = !!(subject.city && subject.nation);
  if (canTryCity && hasGeonames) {
    const payloadCityWithGeo = { subject: subjectToAPI(subject, { ...pass, require_city: true, force_city_mode: true, suppress_coords: true, suppress_geonames: false }) };
    try {
      return await apiCallWithRetry(endpoint, { method: 'POST', headers, body: JSON.stringify(payloadCityWithGeo) }, `${description} (city+geonames)`);
    } catch (e2) {
      throw e2;
    }
  }

  throw new Error(`No valid location data provided for ${description}. Need either coordinates+city or city+geonames_username.`);
}

// ---- Aspect Filtering & Hook Extraction (refined) ----
// Aspect classes
const ASPECT_CLASS = {
  major: new Set(['conjunction','opposition','square','trine','sextile']),
  minor: new Set(['quincunx','sesquiquadrate','semi-square','semi-sextile']),
  harmonic: new Set(['quintile','biquintile'])
};

// Orb caps by aspect (geometry constraint) — aligned to spec
const ASPECT_ORB_CAPS = {
  conjunction: 8,
  opposition: 8,
  square: 7,
  trine: 7,
  sextile: 5,
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

// Hard-cap adjustments
const PERSONAL_SET = new Set(['Sun','Moon','Mercury','Venus','Mars']);
const OUTER_SET = new Set(['Jupiter','Saturn','Uranus','Neptune','Pluto']);
function adjustOrbCapForSpecials(baseCap, p1, p2){
  let cap = baseCap;
  if (p1 === 'Moon' || p2 === 'Moon') cap += 1; // Moon +1°
  const outerPersonal = (OUTER_SET.has(p1) && PERSONAL_SET.has(p2)) || (OUTER_SET.has(p2) && PERSONAL_SET.has(p1));
  if (outerPersonal) cap -= 1; // Outer → personal −1°
  if (cap < 1) cap = 1;
  return cap;
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
  let effectiveCap = Math.min(aspectCap, Math.max(classCapTransit, classCapNatal));
  effectiveCap = adjustOrbCapForSpecials(effectiveCap, a.p1_name, a.p2_name);
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
    let effectiveCap = Math.min(aspectCap, classCap);
    effectiveCap = adjustOrbCapForSpecials(effectiveCap, p1, p2);
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
const STRICT_REQUIRED_FIELDS = ['year','month','day','hour','minute','name','zodiac_type'];
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

  const { buildWindowSamples } = require('../../lib/time-sampling');
  const transitsByDate = {};
  const retroFlagsByDate = {}; // body -> retro boolean per date
  const provenanceByDate = {}; // per-day endpoint + formation provenance

  // Determine sampling timezone: prefer subject.timezone, else UTC
  const ianaTz = subject?.timezone || 'UTC';
  const step = normalizeStep(transitParams.step || 'daily');
  const samples = buildWindowSamples({ start: transitParams.startDate, end: transitParams.endDate, step }, ianaTz);

  const promises = [];
  // Helper: ensure coords/tz from city using GeoNames when needed
  async function ensureCoords(s){
    if (!s) return s;
    const hasCoords = typeof s.latitude === 'number' && typeof s.longitude === 'number' && !!s.timezone;
    if (hasCoords) return s;
    if (s.city && s.nation){
      try {
        const r = await geoResolve({ city: s.city, state: s.state, nation: s.nation });
        if (r && typeof r.lat === 'number' && typeof r.lon === 'number'){
          return { ...s, latitude: r.lat, longitude: r.lon, timezone: normalizeTimezone(r.tz || s.timezone || 'UTC') };
        }
      } catch(e){ logger.warn('ensureCoords geoResolve failed', e.message); }
    }
    return { ...s, latitude: s.latitude ?? 51.48, longitude: s.longitude ?? 0, timezone: normalizeTimezone(s.timezone || 'UTC') };
  }

  // Determine a consistent formation approach up-front for the entire window
  // Rule: if coords+tz present, use coords-only for all days; else use city-mode (with optional geonames_username)
  const preferCoords = (typeof subject.latitude === 'number' || typeof subject.lat === 'number')
    && (typeof subject.longitude === 'number' || typeof subject.lon === 'number' || typeof subject.lng === 'number')
    && !!(subject.timezone || subject.tz_str);

  for (const sampleIso of samples) {
    const dt = new Date(sampleIso);
    const dateString = sampleIso.slice(0, 10); // YYYY-MM-DD
    // Transit instant: prefer city mode; fallback to coords resolved
      const transit_subject = await (async function(){
        const base = {
          year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate(),
          hour: dt.getUTCHours(), minute: dt.getUTCMinutes(),
          zodiac_type: 'Tropic'
        };
        if (preferCoords) {
          const s = await ensureCoords(subject);
          // Include both coords AND city for maximum compatibility
          const cityField = subject.state ? `${subject.city}, ${subject.state}` : subject.city;
          return {
            ...base,
            latitude: s.latitude,
            longitude: s.longitude,
            timezone: 'UTC',
            city: cityField,
            nation: subject.nation
          };
        }
        const cityField = subject.state ? `${subject.city}, ${subject.state}` : subject.city;
        return { ...base, city: cityField, nation: subject.nation };
      })();

    // Include configuration parameters for which planets to include
    // For transit calls: always include city (API requirement), with coords if available
    const hasCoords = !!(subject.latitude && subject.longitude && subject.timezone);
    const transitPass = hasCoords
      ? { ...pass, require_city: true, suppress_geonames: true, suppress_coords: false }
      : { ...pass, require_city: true, suppress_geonames: false, suppress_coords: true };

    const payload = {
      first_subject: subjectToAPI(subject, transitPass),
      transit_subject: subjectToAPI(transit_subject, transitPass),
      ...pass // Include active_points, active_aspects, etc.
    };

    logger.debug(`Transit API call for ${dateString}:`, {
      active_points: payload.active_points || 'default',
      pass_keys: Object.keys(pass)
    });

    // Enhanced debug logging: Log full payload when debugging empty results
    logger.debug(`Full transit API payload for ${dateString}:`, JSON.stringify(payload, null, 2));

    promises.push(
      (async () => {
  let resp = null;
  let endpoint = 'transit-aspects-data';
  let formation = transit_subject.city ? 'city' : 'coords';
        let attempts = 0;
        const maxAttempts = 3;

        // Attempt 1: Primary endpoint - /transit-aspects-data
        try {
          resp = await apiCallWithRetry(
            API_ENDPOINTS.TRANSIT_ASPECTS,
            {
              method: 'POST',
              headers,
              body: JSON.stringify(payload),
            },
            `Transits for ${subject.name} on ${dateString}`
          );
          attempts++;
          
          logger.debug(`Transit API response for ${dateString} (${endpoint}):`, {
            hasAspects: !!(resp && resp.aspects),
            aspectCount: (resp && resp.aspects) ? resp.aspects.length : 0,
            responseKeys: resp ? Object.keys(resp) : 'null response',
            sample: resp && resp.aspects && resp.aspects.length > 0 ? resp.aspects[0] : 'no aspects'
          });
        } catch (e) {
          logger.warn(`Primary transit endpoint failed for ${dateString}:`, e.message);
        }

        // Attempt 2: Fallback to /transit-chart if no aspects found
        if ((!resp || !resp.aspects || resp.aspects.length === 0) && attempts < maxAttempts) {
          try {
            endpoint = 'transit-chart';
            logger.info(`Fallback: Trying transit-chart endpoint for ${dateString}`);
            
            resp = await apiCallWithRetry(
              API_ENDPOINTS.TRANSIT_CHART,
              {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
              },
              `Transit chart fallback for ${subject.name} on ${dateString}`
            );
            attempts++;

            // Extract aspects from chart response structure
            if (resp && !resp.aspects && resp.data) {
              // Sometimes aspects are nested in data
              resp.aspects = resp.data.aspects || resp.aspects;
            }

            logger.debug(`Transit chart fallback response for ${dateString}:`, {
              hasAspects: !!(resp && resp.aspects),
              aspectCount: (resp && resp.aspects) ? resp.aspects.length : 0,
              responseKeys: resp ? Object.keys(resp) : 'null response'
            });
          } catch (e) {
            logger.warn(`Transit chart fallback failed for ${dateString}:`, e.message);
          }
        }

        // Attempt 3: Try switching transit subject formation if still empty
        if ((!resp || !resp.aspects || resp.aspects.length === 0) && attempts < maxAttempts) {
          try {
            endpoint = 'formation-switch';
            logger.info(`Formation switch: Trying alternate transit subject for ${dateString}`);
            
            // Switch between city mode and coords mode
            const alternateTransitSubject = await (async function(){
              const base = {
                year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate(),
                hour: dt.getUTCHours(), minute: dt.getUTCMinutes(),
                zodiac_type: 'Tropic'
              };
              
              // If original was city mode, try coords mode
              if (!preferCoords && subject.city && subject.nation) {
                const s = await ensureCoords(subject);
                return { ...base, latitude: s.latitude, longitude: s.longitude, timezone: 'UTC' };
              }
              // If original was coords mode, try city mode with geonames
              const cityField = subject.state ? `${subject.city}, ${subject.state}` : (subject.city || 'London');
              const t = { ...base, city: cityField, nation: subject.nation || 'UK' };
              if (process.env.GEONAMES_USERNAME) t.geonames_username = process.env.GEONAMES_USERNAME;
              return t;
            })();

            const alternatePayload = {
              first_subject: subjectToAPI(subject, pass),
              transit_subject: subjectToAPI(alternateTransitSubject, pass),
              ...pass
            };

            resp = await apiCallWithRetry(
              API_ENDPOINTS.TRANSIT_ASPECTS,
              {
                method: 'POST',
                headers,
                body: JSON.stringify(alternatePayload),
              },
              `Formation switch for ${subject.name} on ${dateString}`
            );
            attempts++;

            logger.debug(`Formation switch response for ${dateString}:`, {
              hasAspects: !!(resp && resp.aspects),
              aspectCount: (resp && resp.aspects) ? resp.aspects.length : 0,
              alternateFormation: alternateTransitSubject.city ? 'city-mode' : 'coords-mode'
            });
          } catch (e) {
            logger.warn(`Formation switch failed for ${dateString}:`, e.message);
          }
        }

        // Process successful response
        if (resp && resp.aspects && resp.aspects.length > 0) {
          transitsByDate[dateString] = resp.aspects;
          provenanceByDate[dateString] = {
            endpoint,
            formation,
            attempts,
            aspect_count: resp.aspects.length
          };
          
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
          
          logger.info(`✓ Success for ${dateString}: ${resp.aspects.length} aspects via ${endpoint} (attempts: ${attempts})`);
        } else {
          logger.warn(`✗ No aspects found for ${dateString} after ${attempts} attempts (endpoints: ${endpoint})`);
          // Enhanced debug logging: Log full response when no aspects found
          if (resp) {
            logger.debug(`Full raw API response for ${dateString} (no aspects):`, JSON.stringify(resp, null, 2));
          }
          provenanceByDate[dateString] = { endpoint, formation, attempts, aspect_count: 0 };
        }
      })().catch(e => logger.error(`Failed to get transits for ${dateString}`, e))
    );
  }
  await Promise.all(promises);
  
  logger.debug(`getTransits completed for ${subject.name}:`, {
    requestedDates: samples.length,
    datesWithData: Object.keys(transitsByDate).length,
    totalAspects: Object.values(transitsByDate).reduce((sum, aspects) => sum + aspects.length, 0),
    availableDates: Object.keys(transitsByDate)
  });
  
  return { transitsByDate, retroFlagsByDate, provenanceByDate };
}

// Geo resolve via GeoNames
async function geoResolve({ city, state, nation }){
  const u = process.env.GEONAMES_USERNAME || '';
  const q = encodeURIComponent(state ? `${city}, ${state}` : city);
  const c = encodeURIComponent(nation || '');
  const searchUrl = `http://api.geonames.org/searchJSON?q=${q}&country=${c}&maxRows=1&username=${encodeURIComponent(u)}`;
  const res1 = await fetch(searchUrl);
  const j1 = await res1.json();
  const g = j1 && Array.isArray(j1.geonames) && j1.geonames[0];
  if (!g) return null;
  const lat = parseFloat(g.lat), lon = parseFloat(g.lng);
  let tz = null;
  try {
    const tzUrl = `http://api.geonames.org/timezoneJSON?lat=${lat}&lng=${lon}&username=${encodeURIComponent(u)}`;
    const res2 = await fetch(tzUrl);
    const j2 = await res2.json();
    tz = j2 && (j2.timezoneId || j2.timezone || null);
  } catch {}
  return { lat, lon, tz };
}

// Expose resolve-city endpoint helper
exports.resolveCity = async function(event){
  const qs = event.queryStringParameters || {};
  const city = qs.city || '';
  const state = qs.state || '';
  const nation = qs.nation || '';
  try {
    const r = await geoResolve({ city, state, nation });
    return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify({ input:{city,state,nation}, resolved:r }) };
  } catch(e){
    return { statusCode: 500, headers: { 'content-type':'application/json' }, body: JSON.stringify({ error: e.message }) };
  }
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

    // Build compact drivers reflecting top hooks
    const driversCompact = (enriched.hooks || []).map(h => ({
      a: h.p1_name,
      b: h.p2_name,
      type: h._aspect || h.aspect || h.type,
      orb: h._orb != null ? h._orb : (typeof h.orb === 'number' ? h.orb : (typeof h.orbit === 'number' ? h.orbit : null)),
      applying: typeof h.applying === 'boolean' ? h.applying : undefined,
      weight: typeof h._weight === 'number' ? h._weight : weightAspect(h),
      // compatibility fields for existing composers/templates
      planet1: h.p1_name,
      planet2: h.p2_name,
      name: h._aspect || h.aspect || h.type,
      first_planet: h.p1_name,
      second_planet: h.p2_name,
      is_transit: true
    }));

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
      // Keep legacy 'hooks' for backward compatibility; add normalized 'drivers'
      hooks: enriched.hooks,
      drivers: driversCompact,
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
      first_subject: subjectToAPI(A, pass),
      second_subject: subjectToAPI(B, pass),
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
      first_subject: subjectToAPI(compositeRaw, pass), // Use composite chart as the base chart
      transit_subject: subjectToAPI(transit_subject, pass), // Current transiting planets
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

    // --- DEV MOCK: allow UI verification without RapidAPI key ---
    const wantMock = (!process.env.RAPIDAPI_KEY || process.env.MB_MOCK === 'true') && process.env.NODE_ENV !== 'production';
    if (wantMock) {
      const today = new Date();
      const iso = today.toISOString().slice(0,10);
      const rangeStart = String(body.startDate || body.transitStartDate || iso);
      const mock = {
        success: true,
        provenance: { source: 'mock', engine: 'MathBrain', version: '0.0-dev' },
        context: { mode: body?.context?.mode || 'mirror', translocation: body?.translocation || { applies: false, method: 'Natal' } },
        person_a: {
          meta: { birth_time_known: true, time_precision: 'exact', houses_suppressed: false, effective_time_used: '12:00' },
          details: body.personA || {},
          chart: { transitsByDate: { [rangeStart]: [{ p1_name: 'Sun', p2_name: 'Mars', aspect: 'square', orb: 1.2, _class: 'major' }] } },
          derived: { seismograph_summary: { magnitude: 2.3, valence: 0.6, volatility: 1.1 } }
        },
        person_b: body.personB ? { details: body.personB, chart: { } } : undefined,
        woven_map: { type: body.personB ? 'dyad' : 'solo', schema: 'WM-Chart-1.2', hook_stack: { tier_1_orbs: 2 } }
      };
      return { statusCode: 200, body: JSON.stringify(mock) };
    }

  // Inputs
  const personA = normalizeSubjectData(body.personA || body.person_a || body.first_subject || body.subject);
    const personB = normalizeSubjectData(body.personB || body.person_b || body.second_subject);
    // Use strict validator for full chart endpoints, lean for aspects-only
  // Accept multiple ways of specifying mode, including saved JSON shapes
  const modeHint = body.context?.mode || body.mode || body.contextMode?.relational || body.contextMode?.solo || '';
  const modeToken = canonicalizeMode(modeHint);
  // Time policy: read early so we can apply fallback time before validation when birth time is unknown
  const timePolicy = canonicalizeTimePolicy(body.time_policy || body.timePolicy || body.birth_time_policy);
    const wantNatalAspectsOnly = modeToken === 'NATAL_ASPECTS' || event.path?.includes('natal-aspects-data');
    const wantBirthData = modeToken === 'BIRTH_DATA' || event.path?.includes('birth-data');
    const wantSynastry = modeToken === 'SYNASTRY' || modeToken === 'SYNASTRY_TRANSITS';
    const wantSynastryAspectsOnly = modeToken === 'SYNASTRY_ASPECTS' || event.path?.includes('synastry-aspects-data');
    const wantComposite = modeToken === 'COMPOSITE' || modeToken === 'COMPOSITE_ASPECTS' || modeToken === 'COMPOSITE_TRANSITS' || body.wantComposite === true;
    const wantSkyTransits = modeToken === 'SKY_TRANSITS' || modeToken === 'WEATHER' || body.context?.type === 'weather';
  const wantBalanceMeter = modeToken === 'BALANCE_METER' || body.context?.mode === 'balance_meter';
  const includeTransitTag = !!body.includeTransitTag;

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

    function validateRelationshipContext(raw, isRelationshipMode){
      if(!isRelationshipMode) return { valid: true, value: null, reason: 'Not in relationship mode' };
      // Accept multiple aliases including saved config shape `relationalContext`
      const ctx = raw || body.relationship || body.relationship_context || body.relationshipContext || body.relationalContext || {};
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
        // Accept relationship_role alias; normalize case (e.g., "parent" -> "Parent")
        const roleRaw = (ctx.role || ctx.family_role || ctx.relationship_role || '').toString();
        const roleCanon = roleRaw ? roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1).toLowerCase() : '';
        cleaned.role = roleCanon;
        if(!FAMILY_ROLES.includes(cleaned.role)) {
          errors.push(`role required for FAMILY (one of ${FAMILY_ROLES.join(',')})`);
        }
      } else if (cleaned.type === 'FRIEND') {
        const roleRaw = (ctx.role || ctx.friend_role || ctx.relationship_role || '').toString();
        const roleCanon = roleRaw ? roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1).toLowerCase() : '';
        cleaned.role = roleCanon;
        if (cleaned.role && !FRIEND_ROLES.includes(cleaned.role)) {
          errors.push(`friend role invalid (optional, one of ${FRIEND_ROLES.join(',')})`);
        }
      }

      // Ex / Estranged flag only for PARTNER or FAMILY
      if (ctx.ex_estranged !== undefined || ctx.ex || ctx.estranged || ctx.is_ex_relationship !== undefined) {
        const flag = Boolean(ctx.ex_estranged || ctx.ex || ctx.estranged || ctx.is_ex_relationship);
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


  // Keep originals for provenance/meta before applying fallback hour/minute
  const personAOriginal = { ...personA };
  const personBOriginal = personB && Object.keys(personB).length ? { ...personB } : null;

  // Apply time_policy fallback for unknown birth time to satisfy API validators while preserving provenance
    const applyFallbackTime = (s) => {
      if (!s) return s;
      const missing = s.hour == null || s.minute == null;
      if (!missing) return s;
      if (timePolicy === 'planetary_only' || timePolicy === 'whole_sign' || timePolicy === 'sensitivity_scan') {
        return { ...s, hour: 12, minute: 0 };
      }
      return s;
    };
    Object.assign(personA, applyFallbackTime(personA));
    Object.assign(personB, applyFallbackTime(personB));

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
    
    // Debug logging for Balance Meter logic - Part 1
    logger.debug('Balance Meter decision variables (Part 1):', {
      wantBalanceMeter,
      modeToken,
      contextMode: body.context?.mode,
      relationshipMode,
      wantSynastry,
      wantSynastryAspectsOnly,
      wantComposite
    });
    
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

  // Accept both legacy transit* fields and a consolidated body.window = { start, end, step }
    const win = body.window || body.transit_window || null;
    const start = (win && (win.start || win.startDate)) || body.start || body.startDate || body.transitStartDate || body.transit_start_date || body.transitParams?.startDate || body.transit?.startDate;
    const end   = (win && (win.end || win.endDate))     || body.end   || body.endDate   || body.transitEndDate   || body.transit_end_date   || body.transitParams?.endDate || body.transit?.endDate;
    const step  = normalizeStep((win && (win.step || win.interval)) || body.step || body.interval || body.transitStep || body.transit_step || body.transitParams?.step || body.transit?.step);
    const haveRange = Boolean(start && end);
    
    // Debug logging for Balance Meter logic - Part 2
    logger.debug('Balance Meter decision variables (Part 2):', {
      haveRange,
      start,
      end
    });

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

    // Early safety: LOCATION_REQUIRED when Balance Meter (or Mirror+climate) lacks transit location
    const hasLoc = (s)=> s && typeof s.latitude === 'number' && typeof s.longitude === 'number' && !!s.timezone;
    // Transit subjects: allow explicit transit_subject, else default to personA
    const transitA_raw = body.transit_subject || personA;
    const transitB_raw = body.transit_subject_B || body.second_transit_subject || personB;

    const translocationBlock = body.translocation || body.context?.translocation || null;
    const aLocal = body.personA?.A_local || body.subjectA?.A_local || body.A_local || null;
    const fallbackModeToken = normalizeRelocationMode(
      body.relocation_mode || body.context?.relocation_mode || translocationBlock?.method
    );
    const relocationRequested = !!(translocationBlock && translocationBlock.applies);
    let relocationMode = 'none';
    if (relocationRequested) {
      relocationMode = normalizeRelocationMode(translocationBlock.method) || (fallbackModeToken && fallbackModeToken !== 'none' ? fallbackModeToken : 'Custom');
    } else if (fallbackModeToken && fallbackModeToken !== 'none') {
      relocationMode = fallbackModeToken;
    }
    if (relocationMode === 'Midpoint') {
      return { statusCode: 400, body: JSON.stringify({ code:'RELOCATION_UNSUPPORTED', error:'Midpoint relocation is not supported for this protocol. Use A_local or B_local.', errorId: generateErrorId() }) };
    }

    if (wantBalanceMeter) {
      if (!haveRange) {
        return { statusCode: 400, body: JSON.stringify({ code:'WINDOW_REQUIRED', error:'Balance Meter requires a time window (start, end, step)', errorId: generateErrorId() }) };
      }
      const cityModeA = !!(aLocal?.city && aLocal?.nation) || !!(personA?.city && personA?.nation);
      const cityModeB = !!(personB && ((body.personB?.B_local?.city && body.personB?.B_local?.nation) || (personB.city && personB.nation)));
      if (!hasLoc(transitA_raw) && !cityModeA) {
        return { statusCode: 400, body: JSON.stringify({ code:'LOCATION_REQUIRED', error:'Balance Meter requires location (coords or city/nation) for A', errorId: generateErrorId() }) };
      }
      if (personB && Object.keys(personB).length && !hasLoc(transitB_raw || {}) && !cityModeB) {
        return { statusCode: 400, body: JSON.stringify({ code:'LOCATION_REQUIRED', error:'Balance Meter dyad requires location (coords or city/nation) for Person B', errorId: generateErrorId() }) };
      }
    } else if ((modeToken === 'MIRROR' || body.context?.mode === 'mirror') && includeTransitTag) {
      if (!hasLoc(transitA_raw)) {
        return { statusCode: 400, body: JSON.stringify({ code:'LOCATION_REQUIRED', error:'Mirror with Climate Tag requires location', errorId: generateErrorId() }) };
      }
    }

    // Build API-shaped subjects now so timezone checks apply to effective transit subjects
    const natalA = personA; // already normalized
    const natalB = personB && Object.keys(personB).length ? personB : null;
    let transitA = { ...transitA_raw };
    let transitB = transitB_raw ? { ...transitB_raw } : (natalB ? { ...natalB } : null);

    // Apply relocation modes
    let relocationCoords = null;
    let relocationLabel = translocationBlock?.current_location || (aLocal?.label ?? null);

    if (relocationMode === 'Midpoint' && transitB) {
      if (typeof transitA.latitude !== 'number' || typeof transitA.longitude !== 'number' || typeof transitB.latitude !== 'number' || typeof transitB.longitude !== 'number') {
        return { statusCode: 400, body: JSON.stringify({ code:'LOCATION_REQUIRED', error:'Midpoint relocation requires coords for both persons', errorId: generateErrorId() }) };
      }
      const mid = (function midpointCoords(lat1, lon1, lat2, lon2){
        const toRad = d => d * Math.PI / 180; const toDeg = r => r * 180 / Math.PI;
        const φ1 = toRad(lat1), λ1 = toRad(lon1); const φ2 = toRad(lat2), λ2 = toRad(lon2);
        const x1 = Math.cos(φ1) * Math.cos(λ1), y1 = Math.cos(φ1) * Math.sin(λ1), z1 = Math.sin(φ1);
        const x2 = Math.cos(φ2) * Math.cos(λ2), y2 = Math.cos(φ2) * Math.sin(λ2), z2 = Math.sin(φ2);
        const xm = (x1+x2)/2, ym=(y1+y2)/2, zm=(z1+z2)/2; const φm = Math.atan2(zm, Math.sqrt(xm*xm+ym*ym)); const λm = Math.atan2(ym, xm);
        return { latitude: toDeg(φm), longitude: toDeg(λm) };
      })(transitA.latitude, transitA.longitude, transitB.latitude, transitB.longitude);
      try {
        const tz = require('tz-lookup')(mid.latitude, mid.longitude);
        transitA = { ...transitA, latitude: mid.latitude, longitude: mid.longitude, timezone: tz };
        transitB = transitB ? { ...transitB, latitude: mid.latitude, longitude: mid.longitude, timezone: tz } : transitB;
        relocationCoords = { lat: mid.latitude, lon: mid.longitude, tz };
      } catch {
        return { statusCode: 422, body: JSON.stringify({ code:'HOUSES_UNSTABLE', error:'Midpoint timezone lookup failed; try custom location', errorId: generateErrorId() }) };
      }
    } else if (relocationMode === 'A_local') {
      // Render as-if at A's local venue (and mirror onto B if present)
      const loc = (() => {
        if (translocationBlock?.coords && typeof translocationBlock.coords.latitude === 'number' && typeof translocationBlock.coords.longitude === 'number') {
          return { lat: Number(translocationBlock.coords.latitude), lon: Number(translocationBlock.coords.longitude), tz: translocationBlock.tz };
        }
        if (typeof translocationBlock?.latitude === 'number' && typeof translocationBlock?.longitude === 'number') {
          return { lat: Number(translocationBlock.latitude), lon: Number(translocationBlock.longitude), tz: translocationBlock.tz };
        }
        if (aLocal) {
          if (typeof aLocal.lat === 'number' && typeof aLocal.lon === 'number') {
            return { lat: Number(aLocal.lat), lon: Number(aLocal.lon), tz: aLocal.tz || aLocal.timezone };
          }
          if (typeof aLocal.latitude === 'number' && typeof aLocal.longitude === 'number') {
            return { lat: Number(aLocal.latitude), lon: Number(aLocal.longitude), tz: aLocal.timezone || aLocal.tz };
          }
        }
        if (body.custom_location && typeof body.custom_location.latitude === 'number' && typeof body.custom_location.longitude === 'number') {
          return { lat: Number(body.custom_location.latitude), lon: Number(body.custom_location.longitude), tz: body.custom_location.timezone };
        }
        return null;
      })();

      if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lon)) {
        try {
          const tzRaw = loc.tz || translocationBlock?.tz;
          const tz = tzRaw ? normalizeTimezone(tzRaw) : require('tz-lookup')(loc.lat, loc.lon);
          transitA = { ...transitA, latitude: loc.lat, longitude: loc.lon, timezone: tz };
          if (transitB) transitB = { ...transitB, latitude: loc.lat, longitude: loc.lon, timezone: tz };
          relocationCoords = { lat: loc.lat, lon: loc.lon, tz };
          if (!relocationLabel) {
            if (translocationBlock?.current_location) relocationLabel = translocationBlock.current_location;
            else if (aLocal?.city && aLocal?.nation) relocationLabel = `${aLocal.city}, ${aLocal.nation}`;
          }
        } catch {
          return { statusCode: 400, body: JSON.stringify({ code:'TZ_LOOKUP_FAIL', error:'Could not resolve A_local timezone', errorId: generateErrorId() }) };
        }
      } else if (aLocal?.city && aLocal?.nation) {
        transitA = { ...transitA, city: aLocal.city, nation: aLocal.nation };
        if (transitB) transitB = { ...transitB, city: aLocal.city, nation: aLocal.nation };
        if (!relocationLabel) relocationLabel = `${aLocal.city}, ${aLocal.nation}`;
      }
    } else if (relocationMode === 'B_local') {
      if (natalB && transitB && hasLoc(transitB)) {
        // leave as provided
      } else if (natalB) {
        return { statusCode: 400, body: JSON.stringify({ code:'LOCATION_REQUIRED', error:'B_local requires coords for Person B', errorId: generateErrorId() }) };
      }
    } else if (relocationMode === 'Custom' && body.custom_location) {
      const c = body.custom_location;
      if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number') {
        return { statusCode: 400, body: JSON.stringify({ code:'LOCATION_REQUIRED', error:'Custom relocation requires coords', errorId: generateErrorId() }) };
      }
      try {
        const tzRaw = c.timezone || translocationBlock?.tz;
        const tz = tzRaw ? normalizeTimezone(tzRaw) : require('tz-lookup')(c.latitude, c.longitude);
        transitA = { ...transitA, latitude: c.latitude, longitude: c.longitude, timezone: tz };
        if (transitB) transitB = { ...transitB, latitude: c.latitude, longitude: c.longitude, timezone: tz };
        relocationCoords = { lat: c.latitude, lon: c.longitude, tz };
        if (!relocationLabel) relocationLabel = c.label || null;
      } catch {
        return { statusCode: 400, body: JSON.stringify({ code:'TZ_LOOKUP_FAIL', error:'Could not resolve custom timezone', errorId: generateErrorId() }) };
      }
    }

    // TZ mismatch detection for A (+B if present)
    try {
      if (hasLoc(transitA)) {
        const tz = require('tz-lookup')(transitA.latitude, transitA.longitude);
        if (transitA.timezone && transitA.timezone !== tz) {
          return { statusCode: 400, body: JSON.stringify({ code:'TZ_MISMATCH', error:'Provided timezone does not match coordinates', suggested_timezone: tz, errorId: generateErrorId() }) };
        }
        if (!transitA.timezone) transitA.timezone = tz;
      }
      if (transitB && hasLoc(transitB)) {
        const tzB = require('tz-lookup')(transitB.latitude, transitB.longitude);
        if (transitB.timezone && transitB.timezone !== tzB) {
          return { statusCode: 400, body: JSON.stringify({ code:'TZ_MISMATCH', error:'Provided timezone for Person B does not match coordinates', suggested_timezone: tzB, errorId: generateErrorId() }) };
        }
        if (!transitB.timezone) transitB.timezone = tzB;
      }
    } catch {
      // fall through; if tz-lookup failed we return a generic
    }

    // High-latitude guard
    const unstable = (lat)=> Math.abs(Number(lat)) >= 66.0;
    if (hasLoc(transitA) && unstable(transitA.latitude)) {
      return { statusCode: 422, body: JSON.stringify({ code:'HOUSES_UNSTABLE', error:'House math may be unstable at this latitude; consider whole-sign or different location', errorId: generateErrorId() }) };
    }
    if (transitB && hasLoc(transitB) && unstable(transitB.latitude)) {
      return { statusCode: 422, body: JSON.stringify({ code:'HOUSES_UNSTABLE', error:'House math may be unstable for Person B at this latitude; consider whole-sign or different location', errorId: generateErrorId() }) };
    }

  // timePolicy is already determined earlier to allow fallback time before validation

  const result = {
      schema: 'WM-Chart-1.2',
      provenance: {
        math_brain_version: MATH_BRAIN_VERSION,
        ephemeris_source: EPHEMERIS_SOURCE,
        build_ts: new Date().toISOString(),
        timezone: normalizeTimezone(transitA?.timezone || personA.timezone || 'UTC'),
        calibration_boundary: CALIBRATION_BOUNDARY,
        engine_versions: { seismograph: 'v1.0', balance: 'v1.1', sfd: 'v1.2' },
        time_meta_a: deriveTimeMetaWithPolicy(personAOriginal, timePolicy),
        // New provenance fields (stamped after pass/body are finalized below)
        house_system: undefined,
        orbs_profile: undefined,
        timezone_db_version: undefined,
        relocation_mode: relocationMode || 'none'
      },
      context: { mode: modeToken || 'UNKNOWN' },
      mirror_ready: false,
      contract: 'clear-mirror/1.2',
      person_a: { details: personAOriginal, meta: deriveTimeMetaWithPolicy(personAOriginal, timePolicy) }
    };
    // Eagerly initialize Person B details in any relationship mode so UI never loses the panel
    if (relationshipMode && personB && Object.keys(personB).length) {
      result.person_b = { details: personBOriginal || personB, meta: deriveTimeMetaWithPolicy(personBOriginal || personB, timePolicy) };
      result.provenance.time_meta_b = deriveTimeMetaWithPolicy(personBOriginal || personB, timePolicy);
    }
    if (relationshipMode && relContextValidation.valid && relContextValidation.value) {
      result.relationship = relContextValidation.value;
    }

    // Attach translocation (relocation) context from request if provided (data-only)
    try {
      const tl = body.translocation || body.context?.translocation || null;
      if (tl || relocationMode !== 'none') {
        const ctxApplies = relocationMode !== 'none' ? true : !!tl?.applies;
        const ctxMethod = relocationMode !== 'none'
          ? relocationMode
          : (normalizeRelocationMode(tl?.method) || (ctxApplies ? 'Custom' : 'Natal'));
        const tzSource = tl?.tz || relocationCoords?.tz || transitA?.timezone || personA.timezone || 'UTC';
        const coordsBlock = (() => {
          if (tl?.coords && typeof tl.coords.latitude === 'number' && typeof tl.coords.longitude === 'number') {
            return { latitude: Number(tl.coords.latitude), longitude: Number(tl.coords.longitude) };
          }
          if (typeof tl?.latitude === 'number' && typeof tl?.longitude === 'number') {
            return { latitude: Number(tl.latitude), longitude: Number(tl.longitude) };
          }
          if (relocationCoords) {
            return { latitude: Number(relocationCoords.lat), longitude: Number(relocationCoords.lon) };
          }
          return undefined;
        })();
        const currentLocation = tl?.current_location || relocationLabel || (aLocal?.city && aLocal?.nation ? `${aLocal.city}, ${aLocal.nation}` : undefined);
        const houseSystem = tl?.house_system || 'Placidus';
        const ctx = {
          applies: ctxApplies,
          method: ctxMethod,
          house_system: houseSystem,
          tz: normalizeTimezone(tzSource)
        };
        if (currentLocation) ctx.current_location = currentLocation;
        if (coordsBlock) ctx.coords = coordsBlock;
        result.context.translocation = ctx;
      }
    } catch { /* ignore */ }

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
    // Time policy can suppress house/angle semantics: remove angles when policy forbids houses
    if (timePolicy === 'planetary_only' || timePolicy === 'sensitivity_scan') {
      pass.active_points = pass.active_points.filter(p => !['Ascendant','Medium_Coeli','Descendant','Imum_Coeli'].includes(p));
      logger.debug('Time policy excludes angular points for transits');
    }
    // Whole-sign preference: user allows houses with noon fallback; prefer whole-sign house system
    if (timePolicy === 'whole_sign' && !pass.houses_system_identifier) {
      pass.houses_system_identifier = 'Whole_Sign';
      logger.debug('Time policy set houses_system_identifier=Whole_Sign');
    }

    // Stamp provenance fields now that pass/body are known
    try {
      result.provenance.house_system = pass.houses_system_identifier || result.provenance.house_system || 'Placidus';
      result.provenance.orbs_profile = body.orbs_profile || result.provenance.orbs_profile || 'wm-spec-2025-09';
      result.provenance.timezone_db_version = result.provenance.timezone_db_version || 'IANA (system)';
      result.provenance.relocation_mode = relocationMode || result.provenance.relocation_mode || 'none';
    } catch { /* ignore */ }

    // Ensure active_aspects includes all major aspects if not explicitly set
    if (!pass.active_aspects) {
      pass.active_aspects = [
        // Raven caps for majors: 8/8/7/7/5
        { name: "conjunction", orb: 8 },
        { name: "opposition",  orb: 8 },
        { name: "trine",       orb: 7 },
        { name: "square",      orb: 7 },
        { name: "sextile",     orb: 5 },
        // Minors / harmonic
        { name: "quincunx",        orb: 3 },
        { name: "sesquiquadrate",  orb: 3 },
        { name: "semi-square",     orb: 2 },
        { name: "semi-sextile",    orb: 2 },
        { name: "quintile",        orb: 2 },
        { name: "biquintile",      orb: 2 }
      ];
      logger.debug('Setting default active_aspects to Raven caps list');
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
        // Deduplicate by name keeping largest orb (we'll cap later)
        .reduce((acc, cur) => {
          const existing = acc.find(x => x.name === cur.name);
          if (!existing) acc.push(cur); else if (cur.orb > existing.orb) existing.orb = cur.orb;
          return acc;
        }, []);

      // Clamp to provider caps before calling upstream
      pass.active_aspects = pass.active_aspects.map(a => {
        const cap = ASPECT_ORB_CAPS[a.name] || a.orb;
        const clamped = Math.min(a.orb, cap);
        if (a.orb > clamped) logger.debug(`Clamping orb for ${a.name} from ${a.orb} -> ${clamped}`);
        return { name: a.name, orb: clamped };
      });
    }
    logger.debug('Normalized + clamped active_aspects list:', pass.active_aspects);

    // 1) Natal (chart + aspects, natal aspects-only, or birth data)
    let natalResponse;
    if (wantBalanceMeter) {
      // For Balance Meter runs, skip natal API calls; seismograph uses transits only
      result.person_a = result.person_a || {};
      result.person_a.details = personA;
    } else if (wantBirthData) {
      natalResponse = await callNatal(
        API_ENDPOINTS.BIRTH_DATA,
        personA,
        headers,
        pass,
        'Birth data (A)'
      );
      result.person_a.birth_data = stripGraphicsDeep(natalResponse.data || {});
    } else if (wantNatalAspectsOnly) {
      natalResponse = await callNatal(
        API_ENDPOINTS.NATAL_ASPECTS_DATA,
        personA,
        headers,
        pass,
        'Natal aspects data (A)'
      );
      const chartData = stripGraphicsDeep(natalResponse.data || {});
      result.person_a.chart = chartData;
      result.person_a.aspects = Array.isArray(natalResponse.aspects) ? natalResponse.aspects : (chartData.aspects || []);
    } else {
      natalResponse = await callNatal(
        API_ENDPOINTS.BIRTH_CHART,
        personA,
        headers,
        pass,
        'Birth chart (A)'
      );
      const chartData = stripGraphicsDeep(natalResponse.data || {});
      result.person_a.chart = chartData;
      result.person_a.aspects = Array.isArray(natalResponse.aspects) ? natalResponse.aspects : (chartData.aspects || []);
    }

    // Birth-time suppression marker
    try {
  const birthTimeMissing = (s) => s?.hour == null || s?.minute == null;
  // Policy drives suppression: for unknown birth time, planetary_only and sensitivity_scan suppress houses; whole_sign allows
  const shouldSuppress = (s) => birthTimeMissing(s) && (timePolicy === 'planetary_only' || timePolicy === 'sensitivity_scan');
  if (shouldSuppress(personAOriginal)) result.person_a.houses_suppressed = true;
  if (result.person_b && shouldSuppress(personBOriginal || personB)) result.person_b.houses_suppressed = true;
      // Keep meta aligned with suppression and policy
  result.person_a.meta = Object.assign({}, result.person_a.meta, deriveTimeMetaWithPolicy(personAOriginal, timePolicy));
  if (result.person_b) result.person_b.meta = Object.assign({}, result.person_b.meta || {}, deriveTimeMetaWithPolicy(personBOriginal || personB, timePolicy));
    } catch {/* ignore */}

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
        const { transitsByDate, retroFlagsByDate, provenanceByDate } = await getTransits(skySubject, { startDate: start, endDate: end, step }, headers, pass);
        
        // Apply seismograph analysis to sky transits
        const seismographData = calculateSeismograph(transitsByDate, retroFlagsByDate);
        
        // Store sky transit data
        result.sky_transits = {
          transitsByDate: seismographData.daily,
          provenanceByDate,
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
  const { transitsByDate, retroFlagsByDate, provenanceByDate } = await getTransits(personA, { startDate: start, endDate: end, step }, headers, pass);
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
      result.person_a.chart.provenanceByDate = provenanceByDate;
    }

    // 2b) Dual natal modes (explicit): provide both natal charts (and optional transits) WITHOUT synastry math
    const dualNatalMode = modeToken === 'DUAL_NATAL' || modeToken === 'DUAL_NATAL_TRANSITS';
    if ((dualNatalMode || (!relationshipMode && modeToken && modeToken.startsWith('NATAL') && personB && Object.keys(personB).length)) && personB) {
      const vBLeanPassive = validateSubjectLean(personB);
      if (vBLeanPassive.isValid) {
        if (!result.person_b || !result.person_b.chart) {
          try {
            const natalB = await callNatal(
              API_ENDPOINTS.BIRTH_CHART,
              personB,
              headers,
              pass,
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
            const { transitsByDate: transitsByDateB, retroFlagsByDate: retroFlagsByDateB, provenanceByDate: provenanceByDateB } = await getTransits(personB, { startDate: start, endDate: end, step }, headers, pass);
            const allB = Object.values(transitsByDateB).flatMap(day => day);
            const seismoB = calculateSeismograph(transitsByDateB, retroFlagsByDateB);
            // Enriched Person B transits (dual mode) with hooks & filtered_aspects
            result.person_b.chart = { ...(result.person_b.chart || {}), transitsByDate: seismoB.daily, provenanceByDate: provenanceByDateB };
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
            const natalB = await callNatal(
              API_ENDPOINTS.BIRTH_CHART,
              personB,
              headers,
              pass,
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
            const { transitsByDate: transitsByDateB, retroFlagsByDate: retroFlagsByDateB, provenanceByDate: provenanceByDateB } = await getTransits(personB, { startDate: start, endDate: end, step }, headers, pass);
            const allB = Object.values(transitsByDateB).flatMap(day => day);
            const seismoB = calculateSeismograph(transitsByDateB, retroFlagsByDateB);
            // Enriched Person B implicit dual transits with hooks & filtered_aspects
            result.person_b.chart = { ...(result.person_b.chart || {}), transitsByDate: seismoB.daily, provenanceByDate: provenanceByDateB };
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
        { method: 'POST', headers, body: JSON.stringify({ first_subject: subjectToAPI(personA, { ...pass, require_city: true }), second_subject: subjectToAPI(personB, { ...pass, require_city: true }) }) },
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
        const natalB = await callNatal(
          API_ENDPOINTS.BIRTH_CHART,
          personB,
          headers,
          pass,
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
        { method: 'POST', headers, body: JSON.stringify({ first_subject: subjectToAPI(personA, { ...pass, require_city: true }), second_subject: subjectToAPI(personB, { ...pass, require_city: true }) }) },
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
      const { transitsByDate: transitsByDateB, retroFlagsByDate: retroFlagsByDateB, provenanceByDate: provenanceByDateB } = await getTransits(personB, { startDate: start, endDate: end, step }, headers, pass);
        result.person_b.chart = { ...result.person_b.chart, transitsByDate: transitsByDateB };
        
        // Apply seismograph analysis to Person B transits
  const seismographDataB = calculateSeismograph(transitsByDateB, retroFlagsByDateB);
  // Enriched Person B synastry transits
        result.person_b.chart.transitsByDate = seismographDataB.daily;
        result.person_b.chart.provenanceByDate = provenanceByDateB;
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
          const natalB = await callNatal(
            API_ENDPOINTS.BIRTH_CHART,
            personB,
            headers,
            pass,
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
          { method: 'POST', headers, body: JSON.stringify({ first_subject: subjectToAPI(personA, pass), second_subject: subjectToAPI(personB, pass) }) },
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

  // Step 2: Composite transits: TEMPORARILY DISABLED due to API compatibility issues
  // The transit API expects natal chart birth data but composite charts only have planetary positions
  // TODO: Investigate if there's a specific composite transit endpoint or if we need synthetic birth data
  if (haveRange && !skipTransits && (modeToken === 'COMPOSITE_TRANSITS')) {
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
      
      // Add note about disabled composite transits only when not explicitly requested
      if (haveRange && !skipTransits && modeToken !== 'COMPOSITE_TRANSITS') {
        result.composite.transitsByDate = {};
        result.composite.note = 'Composite transits temporarily disabled due to API compatibility issues';
        logger.debug('Composite transits disabled - returning empty transit data');
      }
    }

    // === BALANCE METER MODE ===
    // Only generate Balance Meter for solo reports, not relational ones
    logger.debug('Checking Balance Meter conditions:', {
      wantBalanceMeter,
      haveRange,
      relationshipMode,
      shouldRunBalanceMeter: wantBalanceMeter && haveRange && !relationshipMode
    });
    
    if (wantBalanceMeter && haveRange && !relationshipMode) {
      logger.debug('Processing Balance Meter mode for standalone report');

      // Ensure Person A transit seismograph exists; compute if missing
      if (!result.person_a?.chart?.transitsByDate) {
        try {
          const { transitsByDate, retroFlagsByDate, provenanceByDate } = await getTransits(personA, { startDate: start, endDate: end, step }, headers, pass);
          const seismographData = calculateSeismograph(transitsByDate, retroFlagsByDate);
          result.person_a = result.person_a || {};
          result.person_a.derived = result.person_a.derived || {};
          result.person_a.derived.seismograph_summary = seismographData.summary;
          result.person_a.chart = { ...(result.person_a.chart || {}), transitsByDate: seismographData.daily, provenanceByDate };
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
    // Attach relocation coordinates when applied
    try {
      if (relocationCoords && relocationMode !== 'none') {
        const tz = relocationCoords.tz ? normalizeTimezone(relocationCoords.tz) : null;
        result.provenance.relocation_coords = {
          lat: Number(relocationCoords.lat),
          lon: Number(relocationCoords.lon),
          tz
        };
      } else if (relocationMode === 'A_local' && aLocal?.city && aLocal?.nation) {
        result.provenance.relocation_coords = {
          city: aLocal.city,
          nation: aLocal.nation,
          tz: transitA?.timezone ? normalizeTimezone(transitA.timezone) : null
        };
      }
    } catch { /* ignore */ }

    // Human-readable house system
    try {
      const hs = result.provenance.house_system;
      const names = { P:'Placidus', W:'Whole Sign', R:'Regiomontanus', K:'Koch', C:'Campanus', E:'Equal' };
      if (typeof hs === 'string' && hs.length === 1 && names[hs]) {
        result.provenance.house_system_name = names[hs];
      }
    } catch { /* ignore */ }

    // Attach a data-only Woven Map report (does not add VOICE content)
    try {
      const period = (start && end) ? { start, end, step } : null;
      result.woven_map = composeWovenMapReport({ result, mode: modeToken, period });
    } catch (e) {
      logger.warn('Woven Map composer failed:', e.message);
    }

    result.mirror_ready = evaluateMirrorReadiness(result);

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

// ---------------------------------------------------------------------------
// City Resolution Endpoint - Helper for debugging city->coords resolution
// GET /api/resolve-city?city=Bryn+Mawr&state=PA&nation=US
// Returns resolved coordinates and timezone to verify what the API sees
// ---------------------------------------------------------------------------
exports.resolveCity = async function(event) {
  try {
    const qs = event.queryStringParameters || {};
    const city = qs.city;
    const state = qs.state;
    const nation = qs.nation || 'US';
    
    if (!city) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'city parameter required' })
      };
    }

    // Use same formation logic as transit subjects
    const cityField = state ? `${city}, ${state}` : city;
    const testSubject = {
      name: 'Test Resolution',
      year: 2025, month: 1, day: 1, hour: 12, minute: 0,
      city: cityField,
      nation: nation,
      zodiac_type: 'Tropic'
    };
    
    if (process.env.GEONAMES_USERNAME) {
      testSubject.geonames_username = process.env.GEONAMES_USERNAME;
    }

    const headers = buildHeaders();
    const payload = {
      name: testSubject.name,
      year: testSubject.year,
      month: testSubject.month,
      day: testSubject.day,
      hour: testSubject.hour,
      minute: testSubject.minute,
      city: testSubject.city,
      nation: testSubject.nation,
      zodiac_type: testSubject.zodiac_type,
      ...(testSubject.geonames_username && { geonames_username: testSubject.geonames_username })
    };

    // Use birth-data endpoint for quick resolution test
    const response = await apiCallWithRetry(
      API_ENDPOINTS.BIRTH_DATA,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      },
      `City resolution test for ${cityField}, ${nation}`
    );

    const resolved = {
      success: true,
      query: { city, state, nation, formatted: cityField },
      resolved: {
        latitude: response.lat || response.latitude,
        longitude: response.lng || response.longitude, 
        timezone: response.tz_str || response.timezone,
        city_resolved: response.city,
        nation_resolved: response.nation
      },
      geonames_used: !!testSubject.geonames_username,
      raw_response: response
    };

    logger.info(`City resolution: ${cityField}, ${nation} -> ${resolved.resolved.latitude}, ${resolved.resolved.longitude}`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resolved)
    };

  } catch (error) {
    logger.error('City resolution error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || 'City resolution failed',
        details: error
      })
    };
  }
};

// ---------------------------------------------------------------------------
// Lightweight health endpoint logic (consumed by astrology-health.js wrapper)
// Provides: version, environment, cold start info, basic config validation,
// optional external API latency probe (opt-in via ?ping=now)
// ---------------------------------------------------------------------------
let __RC_COLD_START_TS = global.__RC_COLD_START_TS || Date.now();
global.__RC_COLD_START_TS = __RC_COLD_START_TS;
let __RC_HEALTH_INVOCATIONS = global.__RC_HEALTH_INVOCATIONS || 0;
global.__RC_HEALTH_INVOCATIONS = __RC_HEALTH_INVOCATIONS;

async function rapidApiPing(headers){
  const controller = new AbortController();
  const to = setTimeout(()=>controller.abort(), 3500);
  try {
    const res = await fetch(`${API_ENDPOINTS.NOW}`, { method:'GET', headers, signal: controller.signal });
    const ok = res.ok;
    const status = res.status;
    clearTimeout(to);
    return { ok, status };
  } catch (e) {
    clearTimeout(to);
    return { ok:false, error: e.name === 'AbortError' ? 'timeout' : e.message };
  }
}

exports.health = async function(event){
  __RC_HEALTH_INVOCATIONS++;
  const qs = (event && event.queryStringParameters) || {};
  const wantPing = 'ping' in qs || 'now' in qs; // enable API probe with ?ping or ?ping=1
  const rapKeyPresent = !!process.env.RAPIDAPI_KEY;
  let ping = null;
  if (wantPing && rapKeyPresent) {
    try {
      ping = await rapidApiPing(buildHeaders());
    } catch(e){
      ping = { ok:false, error: e.message };
    }
  }
  const body = {
    success: true,
    service: 'astrology-mathbrain',
    version: MATH_BRAIN_VERSION,
    ephemeris_source: EPHEMERIS_SOURCE,
    calibration_boundary: CALIBRATION_BOUNDARY,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    rapidapi: {
      configured: rapKeyPresent,
      ping: ping
    },
    cold_start_ms: Date.now() - __RC_COLD_START_TS,
    invocations: __RC_HEALTH_INVOCATIONS,
    uptime_s: process.uptime(),
    memory: (()=>{try{const m=process.memoryUsage();return { rss:m.rss, heapUsed:m.heapUsed, heapTotal:m.heapTotal }; }catch{ return null; }})()
  };
  return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify(body) };
};
