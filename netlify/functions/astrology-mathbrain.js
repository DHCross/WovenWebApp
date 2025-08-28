// This code is a consolidated and cleaned version of the provided Javascript for interacting with the Astrologer API.
// It is ready to be used as a serverless function handler (e.g., in a Node.js environment).

const { aggregate } = require('../../src/seismograph');
const { _internals: seismoInternals } = require('../../src/seismograph');
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

// ---- Aspect Filtering & Hook Extraction Helpers ----
// Classification sets & orb caps (soft guidance; we tag wide aspects rather than always dropping majors)
const ASPECT_CLASS = {
  major: new Set(['conjunction','opposition','square','trine','sextile']),
  minor: new Set(['quincunx','sesquiquadrate','semi-square','semi-sextile']),
  harmonic: new Set(['quintile','biquintile'])
};
const ORB_CAPS = {
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

const RETURN_BODIES = new Set(['Saturn','Jupiter','Chiron','Mean_Node','Mean_South_Node']);

function classifyAspectName(name){
  if (ASPECT_CLASS.major.has(name)) return 'major';
  if (ASPECT_CLASS.minor.has(name)) return 'minor';
  if (ASPECT_CLASS.harmonic.has(name)) return 'harmonic';
  return 'other';
}

function displayBodyName(raw){
  const map = {
    'Medium_Coeli': 'MC',
    'Mean_Node': 'North Node',
    'Mean_South_Node': 'South Node',
    'Mean_Lilith': 'Lilith'
  };
  return map[raw] || raw;
}

function weightAspect(a){
  // Base factor by class
  const base = a._class === 'major' ? 1.0 : a._class === 'minor' ? 0.55 : a._class === 'harmonic' ? 0.45 : 0.4;
  const cap = ORB_CAPS[a._aspect] || 6;
  const tightness = Math.max(0, 1 - (a._orb / cap));
  // Luminary / Angle emphasis
  const lumOrAngle = (a.p1_isLuminary || a.p2_isLuminary || a.p1_isAngle || a.p2_isAngle) ? 1.15 : 1.0;
  return +(base * tightness * lumOrAngle).toFixed(4);
}

function enrichDailyAspects(rawList){
  if (!Array.isArray(rawList)) return { raw: [], filtered: [], hooks: [], counts: { raw:0, filtered:0, hooks:0 } };
  const enriched = [];
  for (const a of rawList){
    const aspectName = (a.aspect || '').toLowerCase();
    const orb = typeof a.orbit === 'number' ? a.orbit : (typeof a.orb === 'number' ? a.orb : null);
    const p1 = a.p1_name; const p2 = a.p2_name;
    const sameBody = p1 === p2;
    let drop = false; let dropReason = '';
    const cls = classifyAspectName(aspectName);
    // Self aspects: keep only conjunction/opposition (returns) & only if body in RETURN_BODIES or it's a luminary
    if (sameBody) {
      if (!['conjunction','opposition'].includes(aspectName)) { drop = true; dropReason = 'self-nonreturn'; }
      else if (!(RETURN_BODIES.has(p1) || ['Sun','Moon'].includes(p1))) { drop = true; dropReason = 'self-noncritical'; }
    }
    // Wide minor/harmonic aspects beyond cap
    const cap = ORB_CAPS[aspectName];
    if (!drop && cap && orb != null && orb > cap) { drop = true; dropReason = 'orb-exceeds-cap'; }
    // Tag
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
      _drop: drop,
      _dropReason: dropReason
    };
    if (!drop){
      rec._weight = weightAspect(rec);
    }
    enriched.push(rec);
  }
  const filtered = enriched.filter(a => !a._drop);
  // Enhanced Hook selection: prioritize resonance - luminary involvement, exact geometry, nodes/chiron
  const hookCandidates = filtered.filter(a => {
    const orb = a._orb != null ? a._orb : 6.01;
    const isLuminary = a.p1_isLuminary || a.p2_isLuminary;
    const isAngle = a.p1_isAngle || a.p2_isAngle;
    const isNodeChiron = ['Mean_Node', 'Mean_South_Node', 'Chiron'].includes(a.p1_name) || 
                         ['Mean_Node', 'Mean_South_Node', 'Chiron'].includes(a.p2_name);
    const isExact = orb <= 0.5;
    const isTight = orb <= 1.5;
    const isMajorAspect = a._class === 'major';
    
    // Priority selection criteria
    if (isExact) return true; // Always include exact aspects
    if (isLuminary && orb <= 3.0) return true; // Luminary hooks with wider orb
    if (isAngle && orb <= 2.5) return true; // Angle aspects 
    if (isNodeChiron && orb <= 2.0) return true; // Node/Chiron for long-running storylines
    if (isMajorAspect && isTight) return true; // Major aspects within tight orb
    
    return false;
  });
  
  // Enhanced sorting for hooks: exact > luminary > tight > weighted score
  const hooks = (hookCandidates.length ? hookCandidates : filtered.slice(0, 8))
    .slice() // copy
    .sort((a, b) => {
      const orbA = a._orb != null ? a._orb : 6.01;
      const orbB = b._orb != null ? b._orb : 6.01;
      const isExactA = orbA <= 0.5;
      const isExactB = orbB <= 0.5;
      const isLumA = a.p1_isLuminary || a.p2_isLuminary;
      const isLumB = b.p1_isLuminary || b.p2_isLuminary;
      
      // Sort exact aspects first
      if (isExactA && !isExactB) return -1;
      if (!isExactA && isExactB) return 1;
      
      // Then luminary aspects
      if (isLumA && !isLumB) return -1;
      if (!isLumA && isLumB) return 1;
      
      // Then by tighter orb
      if (orbA !== orbB) return orbA - orbB;
      
      // Finally by weight
      return (b._weight || 0) - (a._weight || 0);
    })
    .slice(0, 12); // Keep reasonable limit but allow more than before
  return {
    raw: rawList,
    filtered,
    hooks,
    counts: { raw: rawList.length, filtered: filtered.length, hooks: hooks.length }
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
async function getTransits(subject, transitParams, headers, pass = {}) {
  if (!transitParams || !transitParams.startDate || !transitParams.endDate) return {};

  const transitsByDate = {};
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
  
  return transitsByDate;
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

function calculateSeismograph(transitsByDate) {
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
    const enrichedWithRetrograde = enriched.filtered.map(aspect => ({
      ...aspect,
      p1_retrograde: aspect.p1_is_retrograde || false,
      p2_retrograde: aspect.p2_is_retrograde || false,
      retrograde_involved: aspect.p1_is_retrograde || aspect.p2_is_retrograde
    }));
    
    // Generate orb-band transit table with phase and score
    const transitTable = formatTransitTable(enriched.filtered, prevDayFiltered);
    
    const aspectsForAggregate = enriched.filtered.map(x => ({
      transit: { body: x.p1_name, retrograde: x.p1_is_retrograde },
      natal: {
        body: x.p2_name,
        retrograde: x.p2_is_retrograde,
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
    
    // Track rolling magnitudes using the original magnitude before normalization (keep last 14 days)
    const magnitudeToTrack = agg.originalMagnitude || agg.rawMagnitude || agg.magnitude;
    rollingMagnitudes.push(magnitudeToTrack);
    if (rollingMagnitudes.length > 14) rollingMagnitudes.shift();
    
    // Track valence history (keep last 7 days for trend)
    valenceHistory.push(agg.valence);
    if (valenceHistory.length > 7) valenceHistory.shift();
    
    // Identify retrograde recursion aspects
    const retrogradeAspects = enrichedWithRetrograde.filter(a => a.retrograde_involved);
    
    daily[d] = {
      seismograph: { 
        magnitude: agg.magnitude, 
        valence: agg.valence, 
        volatility: agg.volatility,
        rawMagnitude: agg.rawMagnitude,
        originalMagnitude: agg.originalMagnitude,
        scaleConfidence: agg.scaleConfidence
      },
      aspects: rawDayAspects,
      filtered_aspects: enrichedWithRetrograde,
      hooks: enriched.hooks,
      counts: enriched.counts,
      transit_table: transitTable,
      retrograde_aspects: retrogradeAspects,
      valence_trend: valenceHistory.length > 1 ? calculateTrend(valenceHistory) : 0
    };
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
    
    const data = stripGraphicsDeep(r.data || {});
    logger.debug('Composite calculation successful, aspects found:', data.aspects?.length || 0);
    
    return {
      aspects: data.aspects || [],
      raw: data,
    };
  } catch (error) {
    logger.error('Composite calculation failed:', error);
    throw new Error(`Composite calculation failed: ${error.message}`);
  }
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

    const result = { schema: 'WM-Chart-1.0', person_a: { details: personA } };
    // Eagerly initialize Person B details in any relationship mode so UI never loses the panel
    if (relationshipMode && personB && Object.keys(personB).length) {
      result.person_b = { details: personB };
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
        "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn",
        "Uranus", "Neptune", "Pluto", "Mean_Node", "Chiron", 
        "Ascendant", "Medium_Coeli", "Mean_Lilith", "Mean_South_Node"
      ];
      logger.debug('Setting default active_points to include all planets including outer planets');
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
      // Use new getTransits and seismograph logic with configuration parameters
      const transitsByDate = await getTransits(personA, { startDate: start, endDate: end, step }, headers, pass);
      result.person_a.chart = { ...result.person_a.chart, transitsByDate };
      // Raven-lite integration: flatten all aspects for derived.t2n_aspects
      const allAspects = Object.values(transitsByDate).flatMap(day => day);
      
      logger.debug(`Transit aspects found: ${allAspects.length} total including outer planets`);
      
      result.person_a.derived = result.person_a.derived || {};
      result.person_a.derived.t2n_aspects = mapT2NAspects(allAspects);
      // Add transit_data array for test compatibility
      result.person_a.transit_data = Object.values(transitsByDate);
      
      // Seismograph summary (using all aspects including outer planets for complete structural analysis)
      const seismographData = calculateSeismograph(transitsByDate);
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
            result.person_b = { details: personB, chart: chartDataB, aspects: chartDataB.aspects || [] };
          } catch (e) {
            logger.warn('Dual Person B natal fetch failed', e.message);
            result.person_b = { details: personB, error: 'Failed to compute Person B chart' };
          }
        }
        // Optional Person B transits in dual transits mode
        if (haveRange && modeToken === 'DUAL_NATAL_TRANSITS') {
          try {
            const transitsByDateB = await getTransits(personB, { startDate: start, endDate: end, step }, headers, pass);
            const allB = Object.values(transitsByDateB).flatMap(day => day);
            const seismoB = calculateSeismograph(transitsByDateB);
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
            result.person_b = { details: personB, chart: chartDataB, aspects: chartDataB.aspects || [] };
          } catch (e) {
            logger.warn('Implicit dual Person B natal fetch failed', e.message);
            result.person_b = { ...(result.person_b || {}), details: personB, error: 'Failed to compute Person B chart' };
          }
        }
        // Only compute B transits if not already present
        const hasBTransits = !!(result.person_b && result.person_b.chart && result.person_b.chart.transitsByDate);
        if (!hasBTransits) {
          try {
            const transitsByDateB = await getTransits(personB, { startDate: start, endDate: end, step }, headers, pass);
            const allB = Object.values(transitsByDateB).flatMap(day => day);
            const seismoB = calculateSeismograph(transitsByDateB);
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
      let synData = stripGraphicsDeep(syn.data || {});
      // Preserve existing person_b (eager init) while ensuring details present
      result.person_b = { ...(result.person_b || {}), details: personB };
      result.synastry_aspects = synData.aspects || [];
      result.synastry_data = synData;
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
      result.synastry_aspects = synClean.aspects || [];
      
      // Add Person B transits for synastry modes (especially SYNASTRY_TRANSITS)
      if (modeToken === 'SYNASTRY_TRANSITS' && haveRange) {
        logger.debug('Computing Person B transits for synastry mode:', { start, end, step });
        const transitsByDateB = await getTransits(personB, { startDate: start, endDate: end, step }, headers, pass);
        result.person_b.chart = { ...result.person_b.chart, transitsByDate: transitsByDateB };
        
        // Apply seismograph analysis to Person B transits
        const seismographDataB = calculateSeismograph(transitsByDateB);
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
      result.person_b = { ...(result.person_b || {}), details: personB };
      result.composite = { 
        aspects: composite.aspects,    // Composite chart internal aspects
        data: composite.raw           // Raw composite chart data for further calculations
      };

  // Step 2: Composite transits: now ALWAYS computed when a date range is supplied, regardless of specific composite sub-mode
  // Rationale: connection "pressure" mapping requires transits; aspects-only without transits is incomplete.
  if (haveRange) {
        logger.debug('Computing composite transits for date range:', { start, end, step });
        
        // Calculate transits to the composite chart using the composite chart as base
        const t = await computeCompositeTransits(composite.raw, start, end, step, pass, headers);
        
        // Store raw transit aspects by date
        result.composite.transitsByDate = t.transitsByDate;
        if (t._note) result.composite.note = t._note;
        
        // Step 3: Apply seismograph analysis to composite transits
        // This converts raw aspects into magnitude, valence, and volatility metrics
        const seismographData = calculateSeismograph(t.transitsByDate);
        
        // Replace raw aspects with seismograph-processed daily data
  // Enriched composite transits with hooks & filtered_aspects
  result.composite.transitsByDate = seismographData.daily;
        
        // Add derived metrics for frontend consumption
        result.composite.derived = { 
          seismograph_summary: seismographData.summary 
        };
        
        // Annotate if transits were auto-added (mode not explicitly COMPOSITE_TRANSITS)
        if (modeToken !== 'COMPOSITE_TRANSITS') {
          result.composite.auto_transits_included = true;
          result.composite.request_mode = modeToken;
        }
        logger.debug('Composite transits completed with seismograph analysis');
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
  code: error?.code || 'INTERNAL_ERROR',
        errorId: generateErrorId(),
        stack: error?.stack || null,
        details: error
      }),
    };
  }
};
