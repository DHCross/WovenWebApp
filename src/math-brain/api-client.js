/* eslint-disable no-console */
/**
 * Math Brain API Client Module - AstroAPI v3
 * 
 * Centralized external API communication logic for astrology data.
 * Handles authentication, retries, and data transformation.
 * 
 * API Provider: api.astrology-api.io (RapidAPI)
 * Swiss Ephemeris precision, 68+ endpoints, 23 house systems
 * 
 * Migrated from Kerykeion-based astrologer.p.rapidapi.com to AstroAPI v3
 */

const { DateTime } = require('luxon');
const { logger, normalizeTimezone } = require('./utils/time-and-coords.js');
const { sanitizeChartPayload, resolveChartPreferences } = require('./utils/readiness.js');
const { extractHouseCusps, calculateNatalHouse } = require('./utils/compression.js');
const { buildWindowSamples } = require('../../lib/time-sampling');

// AstroAPI v3 Base URL
// Switched to RapidAPI gateway URL to match user subscription
const API_BASE_URL = 'https://best-astrology-api.p.rapidapi.com';

// AstroAPI v3 Endpoints
const API_ENDPOINTS = {
  // Chart endpoints
  BIRTH_CHART: `${API_BASE_URL}/v3/charts/natal`,
  SYNASTRY_CHART: `${API_BASE_URL}/v3/charts/synastry`,
  COMPOSITE_CHART: `${API_BASE_URL}/v3/charts/composite`,
  TRANSIT_CHART: `${API_BASE_URL}/v3/charts/transit`,

  // Analysis endpoints for transit data over time
  NATAL_TRANSITS: `${API_BASE_URL}/v3/charts/natal-transits`,
  RELOCATION_CHART: `${API_BASE_URL}/v3/astrocartography/relocation-chart`,

  // Raw data endpoints (faster, no interpretations)
  DATA_POSITIONS: `${API_BASE_URL}/v3/data/positions`,
  DATA_ASPECTS: `${API_BASE_URL}/v3/data/aspects`,
  DATA_HOUSE_CUSPS: `${API_BASE_URL}/v3/data/house-cusps`,
  DATA_LUNAR_METRICS: `${API_BASE_URL}/v3/data/lunar-metrics`,
  DATA_GLOBAL_POSITIONS: `${API_BASE_URL}/v3/data/global-positions`,

  // Enhanced data (traditional astrology features)
  ENHANCED_POSITIONS: `${API_BASE_URL}/v3/data/positions/enhanced`,
  ENHANCED_ASPECTS: `${API_BASE_URL}/v3/data/aspects/enhanced`,

  // Returns (Solar/Lunar)
  SOLAR_RETURN: `${API_BASE_URL}/v3/charts/solar-return`,
  LUNAR_RETURN: `${API_BASE_URL}/v3/charts/lunar-return`,

  // Progressions and Directions
  PROGRESSIONS: `${API_BASE_URL}/v3/charts/progressions`,
  DIRECTIONS: `${API_BASE_URL}/v3/charts/directions`,

  // Current sky data
  NOW: `${API_BASE_URL}/v3/data/now`,

  // Legacy compatibility aliases (mapped to new endpoints)
  NATAL_ASPECTS_DATA: `${API_BASE_URL}/v3/data/aspects`,
  TRANSIT_ASPECTS: `${API_BASE_URL}/v3/charts/transit`,
  SYNASTRY_ASPECTS: `${API_BASE_URL}/v3/charts/synastry`,
  COMPOSITE_ASPECTS: `${API_BASE_URL}/v3/charts/composite`,
  BIRTH_DATA: `${API_BASE_URL}/v3/data/positions`,
};

// House system mapping (single character codes used by new API)
const HOUSE_SYSTEMS = {
  placidus: 'P',
  whole_sign: 'W',
  koch: 'K',
  equal: 'E',
  campanus: 'C',
  regiomontanus: 'R',
  porphyry: 'O',
  morinus: 'M',
  alcabitius: 'B',
  P: 'P', W: 'W', K: 'K', E: 'E', A: 'A', C: 'C', R: 'R', O: 'O', M: 'M', B: 'B',
};

// Default active points for chart calculations
const DEFAULT_ACTIVE_POINTS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'Mean_Node', 'Chiron'
];

let loggedMissingRapidApiKey = false;

/**
 * Convert nation name to ISO 2-letter country code
 * The new API requires country_code (e.g., "US", "GB", "UA")
 */
function convertNationToCountryCode(nation) {
  if (!nation) return 'US';
  const nationUpper = nation.toUpperCase();
  if (nationUpper.length === 2) return nationUpper;

  const nationMap = {
    'USA': 'US', 'UNITED STATES': 'US', 'UNITED STATES OF AMERICA': 'US',
    'UK': 'GB', 'UNITED KINGDOM': 'GB', 'GREAT BRITAIN': 'GB', 'ENGLAND': 'GB',
    'GERMANY': 'DE', 'FRANCE': 'FR', 'SPAIN': 'ES', 'ITALY': 'IT',
    'JAPAN': 'JP', 'CHINA': 'CN', 'AUSTRALIA': 'AU', 'CANADA': 'CA',
    'BRAZIL': 'BR', 'INDIA': 'IN', 'RUSSIA': 'RU', 'UKRAINE': 'UA',
    'POLAND': 'PL', 'NETHERLANDS': 'NL', 'BELGIUM': 'BE', 'SWITZERLAND': 'CH',
    'AUSTRIA': 'AT', 'PORTUGAL': 'PT', 'GREECE': 'GR', 'SWEDEN': 'SE',
    'NORWAY': 'NO', 'DENMARK': 'DK', 'FINLAND': 'FI', 'IRELAND': 'IE',
    'NEW ZEALAND': 'NZ', 'MEXICO': 'MX', 'ARGENTINA': 'AR',
    'SOUTH KOREA': 'KR', 'KOREA': 'KR',
  };
  return nationMap[nationUpper] || nation.substring(0, 2).toUpperCase();
}

/**
 * Build options object for AstroAPI v3
 */
function buildChartOptions(pass = {}) {
  const hsys = pass.houses_system_identifier || pass.house_system || 'P';
  return {
    house_system: HOUSE_SYSTEMS[hsys] || hsys,
    zodiac_type: pass.zodiac_type || 'Tropic',
    active_points: pass.active_points || DEFAULT_ACTIVE_POINTS,
    precision: pass.precision ?? 2,
  };
}

/**
 * Converts internal subject format to AstroAPI v3 format
 * 
 * New API uses nested birth_data structure:
 * {
 *   name: "...",
 *   birth_data: {
 *     year, month, day, hour, minute, second,
 *     city, country_code  OR  latitude, longitude
 *   }
 * }
 */
function subjectToAPI(s = {}, pass = {}) {
  if (!s) return {};

  const hasCoords = (typeof s.latitude === 'number' || typeof s.lat === 'number')
    && (typeof s.longitude === 'number' || typeof s.lon === 'number' || typeof s.lng === 'number')
    && (s.timezone || s.tz_str);
  const hasCity = !!(s.city && (s.nation || s.country_code));

  // Build birth_data object
  const birthData = {
    year: s.year,
    month: s.month,
    day: s.day,
    hour: s.hour ?? 12,
    minute: s.minute ?? 0,
    second: s.second ?? 0,
  };

  // Priority: Use coordinates when available (more accurate, avoids city name ambiguity)
  const includeCoords = hasCoords && !pass.force_city_mode && !pass.suppress_coords;
  if (includeCoords) {
    birthData.latitude = s.latitude ?? s.lat;
    birthData.longitude = s.longitude ?? s.lon ?? s.lng;
    const tz = normalizeTimezone(s.timezone || s.tz_str);
    if (tz) birthData.timezone = tz;
  }

  // Add city-based location (for display or when coords not available)
  const wantCity = hasCity && (pass.require_city || !includeCoords);
  if (wantCity) {
    birthData.city = s.state ? `${s.city}, ${s.state}` : s.city;
    birthData.country_code = s.country_code || convertNationToCountryCode(s.nation);
  }

  return {
    name: s.name || 'Subject',
    birth_data: birthData,
  };
}

function normalizeStep(step) {
  const s = String(step || '').toLowerCase();
  if (['daily', 'weekly', 'monthly'].includes(s)) return s;
  if (s === '1d') return 'daily';
  if (s === '7d') return 'weekly';
  if (s === '1m' || s === '1mo' || s === 'monthly') return 'monthly';
  return 'daily';
}

/**
 * Convert ISO date string (YYYY-MM-DD) to AstroAPI v3 date_range format
 * @param {string} dateStr - ISO date string like "2024-01-15"
 * @returns {{ year: number, month: number, day: number }}
 */
function parseDateToV3(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

/**
 * Build date_range object for AstroAPI v3 natal-transits endpoint
 * @param {string} startDate - ISO date string "YYYY-MM-DD"
 * @param {string} endDate - ISO date string "YYYY-MM-DD"
 * @returns {{ start_date: object, end_date: object } | null}
 */
function mapDateRangeToV3(startDate, endDate) {
  const start = parseDateToV3(startDate);
  const end = parseDateToV3(endDate);
  if (!start || !end) return null;
  return { start_date: start, end_date: end };
}

/**
 * Build subject payload for AstroAPI v3 with STRICT coordinate priority
 * When coordinates are provided, OMIT city/country_code to force geometry mode
 * This prevents city name ambiguity (e.g., "Bryn Mawr, PA" vs "Bryn Mawr, WA")
 * 
 * CRITICAL: The new API may re-geocode if city is sent alongside coordinates.
 * This function ensures ONLY coordinates are sent when available.
 */
function subjectToAPIStrict(s = {}, pass = {}) {
  if (!s) return {};

  const lat = s.latitude ?? s.lat;
  const lon = s.longitude ?? s.lon ?? s.lng;
  const hasCoords = (typeof lat === 'number') && (typeof lon === 'number') && (s.timezone || s.tz_str);

  // Handle nested birth_data if present (common in internal modules)
  const source = s.birth_data || s;

  // Build birth_data object
  const birthData = {
    year: source.year,
    month: source.month,
    day: source.day,
    hour: source.hour ?? 12,
    minute: source.minute ?? 0,
    second: source.second ?? 0,
  };

  // STRICT: When coordinates available, use ONLY coordinates (no city/country_code)
  // This forces the API to use exact geometry, avoiding city name resolution issues
  if (hasCoords && !pass.force_city_mode) {
    birthData.latitude = lat;
    birthData.longitude = lon;
    const tz = normalizeTimezone(s.timezone || s.tz_str);
    if (tz) birthData.timezone = tz;

    // DIAGNOSTIC: Log that we're intentionally omitting city to prevent re-geocoding
    logger.debug(`[STRICT_MODE] Omitting city/country_code for ${s.name || 'Subject'}:`, {
      coords: { lat, lon },
      omittedCity: s.city || null,
      omittedCountry: s.nation || s.country_code || null,
      reason: 'Prevent API re-geocoding from overwriting exact coordinates'
    });
  } else if (s.city && (s.nation || s.country_code)) {
    // City fallback only when coordinates not available
    birthData.city = s.state ? `${s.city}, ${s.state}` : s.city;
    birthData.country_code = s.country_code || convertNationToCountryCode(s.nation);

    logger.debug(`[STRICT_MODE] Using city mode for ${s.name || 'Subject'} (no coords available):`, {
      city: birthData.city,
      country_code: birthData.country_code
    });
  }

  return {
    name: s.name || 'Subject',
    birth_data: birthData,
  };
}

/**
 * Call natal chart endpoint with coordinate priority
 * AstroAPI v3 uses /api/v3/charts/natal
 * 
 * CRITICAL: When coordinates are provided, we use subjectToAPIStrict() which
 * OMITS city/country_code to prevent the API from re-geocoding and overwriting
 * the exact coordinates (e.g., Bryn Mawr PA → Bryn Mawr WA bug)
 */
/**
 * NEW: Get a static relocated chart using AstroAPI v3 dedicated endpoint
 * @param {Object} subject - Original birth subject
 * @param {Object} targetLocation - { latitude, longitude, city? }
 * @param {Object} headers - Request headers
 * @param {Object} pass - Options (house_system, etc.)
 */
async function getRelocationChart(subject, targetLocation, headers, pass = {}) {
  // Fallback to Coordinate Swap pattern since /relocation-chart returned 501
  // We construct a subject with the original birth time but target coordinates.
  // subjectToAPIStrict will ensure latitude/longitude are prioritized over city.

  // Extract timezone from subject or its birth_data
  const originalTimezone = subject.timezone || subject.birth_data?.timezone;

  const relocatedSubject = {
    ...subject,
    latitude: targetLocation.latitude,
    longitude: targetLocation.longitude,
    city: targetLocation.city,
    timezone: originalTimezone, // Ensure timezone is at top level for callNatal validation
  };

  logger.info(`[V3] Fetching relocation chart (via swap) for ${subject.name} at ${targetLocation.city || 'target coords'}`);

  try {
    // Reuse callNatal which hits API_ENDPOINTS.BIRTH_CHART
    const response = await callNatal(
      API_ENDPOINTS.BIRTH_CHART,
      relocatedSubject,
      headers,
      pass,
      `Relocation Chart (Swap) for ${subject.name}`
    );

    // Handle different response formats (wrapped in .data or flat)
    if (response.data) {
      return response.data;
    } else if (response.chart_data) {
      // Map flat response to expected structure
      return {
        chart: response.chart_data,
        person: response.subject_data
      };
    }
    return response;
  } catch (error) {
    logger.error(`[V3] Relocation chart fetch failed: ${error.message}`);
    throw error;
  }
}

async function callNatal(endpoint, subject, headers, pass = {}, description = 'Natal call') {
  const hasCoords = !!(subject.latitude && subject.longitude && subject.timezone);
  const canTryCity = !!(subject.city && (subject.nation || subject.country_code));
  let lastError = null;

  // PRIORITY: When we have explicit coordinates, USE THEM FIRST
  // Use subjectToAPIStrict to OMIT city/country_code - prevents API re-geocoding
  if (hasCoords) {
    const apiSubject = subjectToAPIStrict(subject, pass);
    const payload = { subject: apiSubject, options: buildChartOptions(pass) };

    logger.info(`[COORD_TRACE] callNatal using STRICT COORDINATES mode (no city sent):`, {
      description, latitude: subject.latitude, longitude: subject.longitude,
      timezone: subject.timezone,
      cityOmitted: true,  // Confirm city is NOT being sent
      originalCity: subject.city  // Log for debugging only
    });

    try {
      return await apiCallWithRetry(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) }, description);
    } catch (eCoords) {
      lastError = eCoords;
      logger.warn(`Coords mode failed for ${description}, trying city mode`, { error: eCoords.message });
    }
  }

  // Fallback to city-based lookup
  if (canTryCity) {
    const apiSubject = subjectToAPI(subject, { ...pass, require_city: true, force_city_mode: true, suppress_coords: true });
    const payload = { subject: apiSubject, options: buildChartOptions(pass) };

    logger.info(`[COORD_TRACE] callNatal using CITY mode:`, {
      description, city: subject.city, state: subject.state, nation: subject.nation || subject.country_code
    });

    try {
      return await apiCallWithRetry(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) }, `${description} (city-first)`);
    } catch (eCity) {
      lastError = eCity;
      logger.warn(`City mode failed for ${description}`, { error: eCity.message });
    }
  }

  if (lastError) throw new Error(`${description} failed: ${lastError.message}`);
  throw new Error(`No valid location data provided for ${description}. Need either city+country_code or coordinates+timezone.`);
}

/**
 * Resolve coordinates from city name using geonames fallback
 */
async function geoResolve({ city, state, nation }) {
  const username = process.env.GEONAMES_USERNAME || '';
  if (!username) {
    logger.warn('GEONAMES_USERNAME not configured, cannot resolve coordinates from city');
    return null;
  }
  const q = encodeURIComponent(state ? `${city}, ${state}` : city);
  const c = encodeURIComponent(convertNationToCountryCode(nation) || '');
  const searchUrl = `http://api.geonames.org/searchJSON?q=${q}&country=${c}&maxRows=1&username=${encodeURIComponent(username)}`;
  try {
    const res1 = await fetch(searchUrl);
    const j1 = await res1.json();
    const g = j1 && Array.isArray(j1.geonames) && j1.geonames[0];
    if (!g) return null;
    const lat = parseFloat(g.lat);
    const lon = parseFloat(g.lng);
    let tz = null;
    try {
      const tzUrl = `http://api.geonames.org/timezoneJSON?lat=${lat}&lng=${lon}&username=${encodeURIComponent(username)}`;
      const res2 = await fetch(tzUrl);
      const j2 = await res2.json();
      tz = j2 && (j2.timezoneId || j2.timezone || null);
    } catch (error) {
      logger.warn('GeoNames timezone lookup failed', error.message);
    }
    return { lat, lon, tz };
  } catch (error) {
    logger.warn('GeoNames search failed', error.message);
    return null;
  }
}

async function getTransits(subject, transitParams, headers, pass = {}) {
  if (!transitParams || !transitParams.startDate || !transitParams.endDate) return {};

  const transitsByDate = {};
  const retroFlagsByDate = {};
  const provenanceByDate = {};
  const chartAssets = [];

  const {
    request_transit_wheel = false,
    snapshot_mode = false,
    ...passRest
  } = pass || {};
  const wantsTransitWheel = !!request_transit_wheel || !!snapshot_mode;
  const { natalHouseCusps, ...apiPass } = passRest;

  const ianaTz = subject?.timezone || 'UTC';
  const step = normalizeStep(transitParams.step || 'daily');
  const samplingWindow = buildWindowSamples(
    { start: transitParams.startDate, end: transitParams.endDate, step },
    ianaTz,
    transitParams?.timeSpec || null
  );
  const samples = Array.isArray(samplingWindow?.samples) ? samplingWindow.samples : [];
  const samplingZone = samplingWindow?.zone || ianaTz || 'UTC';
  const timePolicy = transitParams?.timePolicy || 'noon_default';
  const timePrecision = transitParams?.timePrecision || 'minute';
  const relocationMode = transitParams?.relocationMode || null;
  const locationLabelOverride = transitParams?.locationLabel || null;

  const preferCoords = (typeof subject.latitude === 'number' || typeof subject.lat === 'number')
    && (typeof subject.longitude === 'number' || typeof subject.lon === 'number' || typeof subject.lng === 'number')
    && !!(subject.timezone || subject.tz_str);

  async function ensureCoords(s) {
    if (!s) return s;
    const hasCoords = (typeof s.latitude === 'number' || typeof s.lat === 'number')
      && (typeof s.longitude === 'number' || typeof s.lon === 'number' || typeof s.lng === 'number')
      && !!(s.timezone || s.tz_str);
    if (hasCoords) return s;
    if (s.city && s.nation) {
      try {
        const r = await geoResolve({ city: s.city, state: s.state, nation: s.nation });
        if (r && typeof r.lat === 'number' && typeof r.lon === 'number') {
          return { ...s, latitude: r.lat, longitude: r.lon, timezone: normalizeTimezone(r.tz || s.timezone || 'UTC') };
        }
      } catch (e) {
        logger.warn('ensureCoords geoResolve failed', e.message);
      }
    }
    return { ...s, latitude: s.latitude ?? 51.48, longitude: s.longitude ?? 0, timezone: normalizeTimezone(s.timezone || 'UTC') };
  }

  const CHUNK_SIZE = 5;
  let wheelCaptured = false;

  for (let chunkStart = 0; chunkStart < samples.length; chunkStart += CHUNK_SIZE) {
    const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, samples.length);
    const chunkSamples = samples.slice(chunkStart, chunkEnd);
    const chunkPromises = [];

    logger.debug(`Processing transit chunk ${Math.floor(chunkStart / CHUNK_SIZE) + 1}/${Math.ceil(samples.length / CHUNK_SIZE)}: ${chunkSamples.length} dates`);

    for (const sampleIso of chunkSamples) {
      const utcIso = sampleIso;
      const utcDate = DateTime.fromISO(utcIso, { zone: 'utc' });
      let localDate = utcDate.setZone(samplingZone);
      if (!localDate.isValid) {
        localDate = utcDate;
      }
      const dateString = localDate.isValid ? localDate.toISODate() : utcIso.slice(0, 10);
      const tzForSample = localDate.isValid ? (localDate.zoneName || samplingZone) : samplingZone;
      const resolvedCoords = preferCoords ? await ensureCoords(subject) : null;
      const cityField = subject.state ? `${subject.city}, ${subject.state}` : subject.city;
      const locationLabel = locationLabelOverride || cityField || null;

      const transitBase = {
        year: localDate.year,
        month: localDate.month,
        day: localDate.day,
        hour: localDate.hour,
        minute: localDate.minute,
        zodiac_type: 'Tropic',
        timezone: tzForSample
      };

      const resolvedTimezone = resolvedCoords?.timezone || tzForSample;
      let transitSubject;
      if (preferCoords && resolvedCoords) {
        transitSubject = {
          ...transitBase,
          latitude: resolvedCoords.latitude,
          longitude: resolvedCoords.longitude,
          timezone: resolvedTimezone || tzForSample,
          city: cityField,
          nation: subject.nation
        };
      } else {
        transitSubject = { ...transitBase };
        if (cityField) transitSubject.city = cityField;
        if (subject.nation) transitSubject.nation = subject.nation;
      }

      const coordsForProvenance = resolvedCoords && typeof resolvedCoords.latitude === 'number' && typeof resolvedCoords.longitude === 'number'
        ? { lat: resolvedCoords.latitude, lon: resolvedCoords.longitude, label: locationLabel || undefined }
        : (typeof subject.latitude === 'number' && typeof subject.longitude === 'number'
          ? { lat: Number(subject.latitude), lon: Number(subject.longitude), label: locationLabel || undefined }
          : null);

      const hasCoords = !!(subject.latitude && subject.longitude && subject.timezone);
      // Use subjectToAPIStrict when coordinates available to prevent re-geocoding
      const transitPass = hasCoords
        ? { ...apiPass, suppress_geonames: true }
        : { ...apiPass, require_city: true, suppress_geonames: false };

      // CRITICAL: Use subjectToAPIStrict for natal subject when coords present
      // This omits city/country_code to prevent API from re-geocoding
      const payload = {
        first_subject: hasCoords ? subjectToAPIStrict(subject, transitPass) : subjectToAPI(subject, transitPass),
        transit_subject: subjectToAPI(transitSubject, transitPass),
        ...transitPass
      };

      const baseProvenance = {
        timestamp_utc: utcDate.toISO(),
        timezone: resolvedTimezone || tzForSample || 'UTC',
        time_policy: timePolicy,
        time_precision: timePrecision
      };
      if (localDate.isValid) {
        baseProvenance.timestamp_local = localDate.toISO();
      }
      if (coordsForProvenance) baseProvenance.coordinates = coordsForProvenance;
      if (locationLabel) baseProvenance.location_label = locationLabel;
      if (relocationMode) baseProvenance.relocation_mode = relocationMode;

      chunkPromises.push(
        (async () => {
          let resp = null;
          let endpoint = 'transit-aspects-data';
          let formation = transitSubject.city ? 'city' : 'coords';
          let attempts = 0;
          const maxAttempts = 3;
          const preferWheel = wantsTransitWheel && !wheelCaptured;

          if (preferWheel) {
            try {
              endpoint = 'transit-chart';
              logger.info(`Preferring transit-chart for wheel capture on ${dateString}`);

              const payloadWithPrefs = {
                ...payload,
                ...resolveChartPreferences(apiPass),
              };
              resp = await apiCallWithRetry(
                API_ENDPOINTS.TRANSIT_CHART,
                {
                  method: 'POST',
                  headers,
                  body: JSON.stringify(payloadWithPrefs),
                },
                `Transit chart fallback for ${subject.name} on ${dateString}`
              );
              attempts++;

              if (resp && !resp.aspects && resp.data) {
                resp.aspects = resp.data.aspects || resp.aspects;
              }
              wheelCaptured = true;
              logger.debug(`Transit chart (wheel) response for ${dateString}`, { aspectCount: resp?.aspects?.length || 0 });
            } catch (e) {
              logger.warn(`Transit chart preferred fetch failed for ${dateString}:`, e.message);
              resp = null;
            }
          }

          if ((!resp || !resp.aspects || resp.aspects.length === 0) && attempts < maxAttempts) {
            try {
              endpoint = 'transit-aspects-data';
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
              logger.debug(`Transit API response for ${dateString} (${endpoint})`, { aspectCount: resp?.aspects?.length || 0 });
            } catch (e) {
              logger.warn(`Primary transit endpoint failed for ${dateString}:`, e.message);
            }
          }

          if ((!resp || !resp.aspects || resp.aspects.length === 0) && attempts < maxAttempts) {
            try {
              endpoint = 'formation-switch';
              logger.info(`Formation switch: Trying alternate transit subject for ${dateString}`);

              const alternateTransitSubject = await (async function () {
                const base = {
                  year: localDate.year,
                  month: localDate.month,
                  day: localDate.day,
                  hour: localDate.hour,
                  minute: localDate.minute,
                  zodiac_type: 'Tropic',
                  timezone: resolvedTimezone || tzForSample || 'UTC'
                };

                if (!preferCoords && subject.city && subject.nation) {
                  const s = await ensureCoords(subject);
                  return { ...base, latitude: s.latitude, longitude: s.longitude, timezone: s.timezone || base.timezone };
                }

                const fallbackCity = subject.state ? `${subject.city}, ${subject.state}` : (subject.city || 'London');
                const t = { ...base, city: fallbackCity, nation: subject.nation || 'UK' };
                if (process.env.GEONAMES_USERNAME) t.geonames_username = process.env.GEONAMES_USERNAME;
                return t;
              })();

              const alternatePayload = {
                first_subject: subjectToAPI(subject, transitPass),
                transit_subject: subjectToAPI(alternateTransitSubject, transitPass),
                ...transitPass
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

              logger.debug(`Formation switch response for ${dateString}`, {
                aspectCount: resp?.aspects?.length || 0,
                alternateFormation: alternateTransitSubject.city ? 'city-mode' : 'coords-mode'
              });
            } catch (e) {
              logger.warn(`Formation switch failed for ${dateString}:`, e.message);
            }
          }

          if (resp && resp.aspects && resp.aspects.length > 0) {
            let transitHouses = [];

            if (natalHouseCusps && resp.data && resp.data.transit_subject) {
              const ts = resp.data.transit_subject;
              const planetNames = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'mean_node', 'chiron'];

              for (const planetName of planetNames) {
                const planetData = ts[planetName];
                if (planetData && typeof planetData.abs_pos === 'number') {
                  const house = calculateNatalHouse(planetData.abs_pos, natalHouseCusps);
                  transitHouses.push(house);
                }
              }
            }

            transitsByDate[dateString] = resp.aspects;

            provenanceByDate[dateString] = {
              ...baseProvenance,
              endpoint,
              formation,
              attempts,
              aspect_count: resp.aspects.length,
              has_transit_houses: transitHouses.length > 0
            };

            if (endpoint === 'transit-chart' && resp.data) {
              const { sanitized, assets } = sanitizeChartPayload(resp.data, {
                subject: 'transit',
                chartType: 'transit',
                scope: `transit_${dateString}`,
              });
              if (assets && assets.length > 0) {
                chartAssets.push(...assets);
                logger.debug(`Extracted ${assets.length} chart asset(s) from transit on ${dateString}`);
              }
              resp.data = sanitized;
            }
            if (endpoint === 'transit-chart' && resp.chart) {
              const { assets: wheelAssets } = sanitizeChartPayload({ chart: resp.chart }, {
                subject: 'transit',
                chartType: 'transit',
                scope: `transit_wheel_${dateString}`,
              });
              if (wheelAssets && wheelAssets.length > 0) {
                chartAssets.push(...wheelAssets);
                logger.debug(`Extracted ${wheelAssets.length} transit wheel asset(s) from ${dateString}`);
              }
            }

            const retroMap = {};
            const fs = resp.data?.first_subject || resp.data?.firstSubject;
            const tr = resp.data?.transit || resp.data?.transit_subject;
            const collect = (block) => {
              if (!block || typeof block !== 'object') return;
              for (const [k, v] of Object.entries(block)) {
                if (v && typeof v === 'object' && 'retrograde' in v) {
                  retroMap[(v.name || v.body || k)] = !!v.retrograde;
                }
              }
            };
            collect(fs);
            collect(tr);
            if (Object.keys(retroMap).length) retroFlagsByDate[dateString] = retroMap;

            logger.info(`✓ Success for ${dateString}: ${resp.aspects.length} aspects via ${endpoint} (attempts: ${attempts})`);
          } else {
            logger.warn(`✗ No aspects found for ${dateString} after ${attempts} attempts (endpoints: ${endpoint})`);
            if (resp) {
              logger.debug(`Full raw API response for ${dateString} (no aspects):`, JSON.stringify(resp, null, 2));
            }
            provenanceByDate[dateString] = {
              ...baseProvenance,
              endpoint,
              formation,
              attempts,
              aspect_count: 0
            };
          }
        })().catch(e => logger.error(`Failed to get transits for ${dateString}`, e))
      );
    }

    await Promise.all(chunkPromises);
    logger.debug(`Chunk ${Math.floor(chunkStart / CHUNK_SIZE) + 1} complete`);
  }

  logger.debug(`getTransits completed for ${subject.name}:`, {
    requestedDates: samples.length,
    datesWithData: Object.keys(transitsByDate).length,
    totalAspects: Object.values(transitsByDate).reduce((sum, aspects) => sum + aspects.length, 0),
    availableDates: Object.keys(transitsByDate),
    chartAssets: chartAssets.length
  });

  return { transitsByDate, retroFlagsByDate, provenanceByDate, chartAssets };
}

/**
 * NEW: Get transits using AstroAPI v3 natal-transits endpoint with date_range
 * This replaces the legacy per-day loop with a single API call for the entire range
 * 
 * @param {Object} subject - The natal subject data
 * @param {Object} transitParams - { startDate, endDate, step, ... }
 * @param {Object} headers - Request headers with API key
 * @param {Object} pass - Additional options
 * @returns {Promise<Object>} { transitsByDate, retroFlagsByDate, provenanceByDate, chartAssets }
 */
async function getTransitsV3(subject, transitParams, headers, pass = {}) {
  if (!transitParams || !transitParams.startDate || !transitParams.endDate) return {};

  const transitsByDate = {};
  const retroFlagsByDate = {};
  const provenanceByDate = {};
  const chartAssets = [];

  const dateRange = mapDateRangeToV3(transitParams.startDate, transitParams.endDate);
  if (!dateRange) {
    logger.error('Invalid date range for natal-transits', { transitParams });
    return { transitsByDate, retroFlagsByDate, provenanceByDate, chartAssets };
  }

  // Build the v3 payload structure
  const apiSubject = subjectToAPIStrict(subject, pass);
  const options = buildChartOptions(pass);

  const payload = {
    subject: apiSubject,
    date_range: dateRange,
    options,
  };

  logger.info(`[V3] Fetching natal-transits for ${subject.name}:`, {
    startDate: transitParams.startDate,
    endDate: transitParams.endDate,
    latitude: apiSubject.birth_data?.latitude,
    longitude: apiSubject.birth_data?.longitude,
  });

  console.error('[DEBUG] V3 PAYLOAD:', JSON.stringify(payload));

  try {
    const response = await apiCallWithRetry(
      API_ENDPOINTS.NATAL_TRANSITS,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      },
      `Natal transits for ${subject.name} (${transitParams.startDate} to ${transitParams.endDate})`
    );

    // Parse the v3 response format
    // The API returns transits grouped by date in a single response
    // Some endpoints return 'transits', others 'events'
    const transitsArray = response?.transits || response?.events;

    if (transitsArray) {
      const transits = Array.isArray(transitsArray) ? transitsArray : [];

      if (transits.length === 0) {
        logger.warn(`[V3] Natal-transits response has empty array for ${subject.name}`);
      }

      for (const transitEntry of transits) {
        const date = transitEntry.date;

        // Handle flat event structure (API v3 returns events, not grouped days)
        // If transitEntry has 'aspects', it's grouped. If not, it's a single event.
        if (transitEntry.aspects) {
          // Grouped format (legacy or specific endpoint)
          if (date && Array.isArray(transitEntry.aspects) && transitEntry.aspects.length > 0) {
            transitsByDate[date] = transitEntry.aspects;
          }
        } else {
          // Flat event format (API v3 natal-transits)
          if (date) {
            if (!transitsByDate[date]) {
              transitsByDate[date] = [];
            }
            transitsByDate[date].push(transitEntry);
          }
        }

        // Extract retrograde flags if available (usually in a separate 'planets' object in grouped response)
        // For flat events, we might need to check the event itself or a separate metadata field
        if (transitEntry.planets) {
          const retroMap = {};
          for (const [name, data] of Object.entries(transitEntry.planets)) {
            if (data && typeof data === 'object' && 'retrograde' in data) {
              retroMap[name] = !!data.retrograde;
            }
          }
          if (Object.keys(retroMap).length) {
            retroFlagsByDate[date] = retroMap;
          }
        }
      }

      // Post-process to build provenance for each date found
      for (const date of Object.keys(transitsByDate)) {
        provenanceByDate[date] = {
          timestamp_utc: `${date}T12:00:00Z`,
          timezone: subject.timezone || 'UTC',
          endpoint: 'natal-transits-v3',
          formation: 'coords',
          aspect_count: transitsByDate[date].length,
        };
      }

      logger.info(`[V3] Natal-transits completed for ${subject.name}:`, {
        datesWithData: Object.keys(transitsByDate).length,
        totalAspects: Object.values(transitsByDate).reduce((sum, aspects) => sum + aspects.length, 0),
      });
    } else {
      logger.warn(`[V3] Natal-transits response MISSING 'transits' or 'events' property for ${subject.name}`, {
        responseKeys: response ? Object.keys(response) : 'null',
        status: response?.status,
        error: response?.error
      });
    }

    // Extract chart assets if present
    if (response.chart) {
      const { assets } = sanitizeChartPayload({ chart: response.chart }, {
        subject: 'transit',
        chartType: 'natal-transits',
        scope: 'natal_transits_v3',
      });
      if (assets && assets.length) {
        chartAssets.push(...assets);
      }
    }

    return { transitsByDate, retroFlagsByDate, provenanceByDate, chartAssets };
  } catch (error) {
    logger.error(`[V3] Natal-transits failed for ${subject.name}:`, error.message);

    // Fallback to legacy per-day method if v3 endpoint fails
    logger.info(`[V3] Falling back to legacy getTransits for ${subject.name}`);
    return getTransits(subject, transitParams, headers, pass);
  }
}

// ============================================================
// SYNASTRY API FUNCTIONS (v3)
// ============================================================

/**
 * Call synastry endpoint to get cross-chart aspects between two people
 * This returns the "terrain" of the relationship - static aspects
 * 
 * @param {Object} personA - First subject data
 * @param {Object} personB - Second subject data
 * @param {Object} headers - Request headers with API key
 * @param {Object} pass - Additional options (house_system, etc.)
 * @returns {Promise<Object>} { aspects, raw }
 */
async function callSynastry(personA, personB, headers, pass = {}) {
  try {
    logger.debug('[Synastry] Computing synastry between:', {
      personA: personA?.name || 'Unknown A',
      personB: personB?.name || 'Unknown B'
    });

    // Use strict mode to prevent re-geocoding issues
    const hasACords = !!(personA?.latitude && personA?.longitude && personA?.timezone);
    const hasBCords = !!(personB?.latitude && personB?.longitude && personB?.timezone);

    const payload = {
      subject1: hasACords ? subjectToAPIStrict(personA, pass) : subjectToAPI(personA, pass),
      subject2: hasBCords ? subjectToAPIStrict(personB, pass) : subjectToAPI(personB, pass),
      options: buildChartOptions(pass),
    };

    const response = await apiCallWithRetry(
      API_ENDPOINTS.SYNASTRY_CHART,
      { method: 'POST', headers, body: JSON.stringify(payload) },
      `Synastry: ${personA?.name || 'A'} & ${personB?.name || 'B'}`
    );

    // logger.info('[Synastry] Raw response keys:', Object.keys(response || {}));
    // if (response?.chart_data) logger.info(`[Synastry] Found chart_data with keys: ${Object.keys(response.chart_data)}`);

    // Handle v3 response structure (chart_data) vs legacy (data or root)
    const rawData = response.chart_data || response.data || response || {};

    const { sanitized: data, assets } = sanitizeChartPayload(rawData, {
      subject: 'synastry',
      chartType: 'synastry',
      scope: 'synastry_chart',
    });

    // Extract aspects from various possible response locations
    const aspects = response.aspects
      || response.cross_aspects
      || data.aspects
      || [];

    logger.debug('[Synastry] Calculation successful:', {
      aspectCount: aspects.length,
      hasAssets: !!(assets && assets.length)
    });

    return {
      aspects,
      raw: data,
      assets: assets || [],
    };
  } catch (error) {
    logger.error('[Synastry] Calculation failed:', error.message);
    throw new Error(`Synastry calculation failed: ${error.message}`);
  }
}

/**
 * Get synastry-transits (Resonance Seismograph data)
 * Fetches terrain (synastry) + weather (transits for both) in parallel
 * 
 * @param {Object} personA - First subject data
 * @param {Object} personB - Second subject data
 * @param {Object} transitParams - { startDate, endDate }
 * @param {Object} headers - Request headers with API key
 * @param {Object} pass - Additional options
 * @returns {Promise<Object>} { terrain, streamA, streamB }
 */
async function getSynastryTransits(personA, personB, transitParams, headers, pass = {}) {
  if (!transitParams?.startDate || !transitParams?.endDate) {
    throw new Error('getSynastryTransits requires startDate and endDate');
  }

  logger.info('[SynastryTransits] Fetching terrain + weather:', {
    personA: personA?.name || 'Unknown A',
    personB: personB?.name || 'Unknown B',
    startDate: transitParams.startDate,
    endDate: transitParams.endDate
  });

  try {
    // Parallel fetch: terrain (synastry) + both transit streams
    const streamAPromise = getTransitsV3(personA, transitParams, headers, pass);
    const streamBPromise = getTransitsV3(personB, transitParams, headers, pass);

    const [terrainResult, streamAResult, streamBResult] = await Promise.all([
      callSynastry(personA, personB, headers, pass),
      streamAPromise,
      streamBPromise
    ]);

    logger.info('[SynastryTransits] Fetch completed:', {
      terrainAspects: terrainResult.aspects?.length || 0,
      streamADates: Object.keys(streamAResult.transitsByDate || {}).length,
      streamBDates: Object.keys(streamBResult.transitsByDate || {}).length
    });

    return {
      synastry: terrainResult,
      transitsA: streamAResult,
      transitsB: streamBResult,
    };
  } catch (error) {
    logger.error('[SynastryTransits] Failed:', error.message);
    throw new Error(`Synastry transits fetch failed: ${error.message}`);
  }
}

/**
 * Extract "hot degrees" from synastry aspects
 * These are degrees where tight cross-aspects exist (the relational terrain)
 * 
 * @param {Array} aspects - Synastry aspects array
 * @param {number} maxOrb - Maximum orb for "hot" aspects (default 3°)
 * @returns {Array<number>} Array of hot degrees
 */
function extractHotDegrees(aspects, maxOrb = 3.0) {
  if (!Array.isArray(aspects)) return [];

  return aspects
    .filter(a => Math.abs(a.orb || 0) <= maxOrb)
    .flatMap(a => [a.degree_a, a.degree_b, a.p1_degree, a.p2_degree])
    .filter(d => typeof d === 'number');
}

async function computeComposite(personA, personB, pass = {}, headers) {
  try {
    logger.debug('Computing composite for subjects:', {
      personA: personA?.name || 'Unknown A',
      personB: personB?.name || 'Unknown B'
    });

    // Use subjectToAPIStrict to ensure coordinates take priority over city names
    // This prevents re-geocoding issues (e.g., wrong city resolution)
    const hasACords = !!(personA?.latitude && personA?.longitude && personA?.timezone);
    const hasBCords = !!(personB?.latitude && personB?.longitude && personB?.timezone);

    const payload = {
      first_subject: hasACords ? subjectToAPIStrict(personA, pass) : subjectToAPI(personA, pass),
      second_subject: hasBCords ? subjectToAPIStrict(personB, pass) : subjectToAPI(personB, pass),
      ...pass,
    };

    const response = await apiCallWithRetry(
      API_ENDPOINTS.COMPOSITE_ASPECTS,
      { method: 'POST', headers, body: JSON.stringify(payload) },
      'Composite aspects'
    );

    const { sanitized: data, assets } = sanitizeChartPayload(response.data || {}, {
      subject: 'composite',
      chartType: 'composite',
      scope: 'composite_aspects',
    });

    const aspects = Array.isArray(response.aspects) ? response.aspects : (data.aspects || []);
    logger.debug('Composite calculation successful, aspects found:', aspects.length);

    if (assets && assets.length) {
      data.assets = assets;
    }

    return { aspects, raw: data };
  } catch (error) {
    logger.error('Composite calculation failed:', error);
    throw new Error(`Composite calculation failed: ${error.message}`);
  }
}

async function computeCompositeTransits(compositeRaw, start, end, step, pass = {}, headers) {
  if (!compositeRaw) return { transitsByDate: {} };

  const transitsByDate = {};
  const startDate = new Date(start);
  const endDate = new Date(end);
  endDate.setDate(endDate.getDate() + 1); // Make end date inclusive

  const promises = [];

  for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
    const dateString = d.toISOString().split('T')[0];

    const transitSubject = {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: 12,
      minute: 0,
      city: 'Greenwich',
      nation: 'GB',
      latitude: 51.48,
      longitude: 0,
      timezone: 'UTC',
      zodiac_type: 'Tropic'
    };

    const payload = {
      first_subject: subjectToAPI(compositeRaw, pass),
      transit_subject: subjectToAPI(transitSubject, pass),
      ...pass
    };

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
          headers,
          body: JSON.stringify(payload),
        },
        `Composite transits for ${dateString}`
      )
        .then(resp => {
          logger.debug(`Composite transit API response for ${dateString}:`, {
            hasAspects: !!(resp && resp.aspects),
            aspectCount: resp?.aspects?.length || 0,
            responseKeys: resp ? Object.keys(resp) : 'null response'
          });

          if (resp && Array.isArray(resp.aspects) && resp.aspects.length > 0) {
            transitsByDate[dateString] = resp.aspects;
            logger.debug(`Stored ${resp.aspects.length} composite aspects for ${dateString}`);
          } else {
            logger.debug(`No composite aspects found for ${dateString} - response structure:`, resp);
            if (resp) {
              logger.debug(`Full raw composite API response for ${dateString} (no aspects):`, JSON.stringify(resp, null, 2));
            }
          }
        })
        .catch(e => {
          logger.warn(`Failed to get composite transits for ${dateString}:`, e.message);
        })
    );
  }

  try {
    await Promise.all(promises);
    return { transitsByDate };
  } catch (error) {
    logger.error('Composite transits calculation failed:', error);
    return {
      transitsByDate: {},
      _note: 'Composite transits not available in current plan'
    };
  }
}

async function rapidApiPing(headers) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(API_ENDPOINTS.NOW, { method: 'GET', headers, signal: controller.signal });
    clearTimeout(timeout);
    return { ok: res.ok, status: res.status };
  } catch (error) {
    clearTimeout(timeout);
    return { ok: false, error: error.name === 'AbortError' ? 'timeout' : error.message };
  }
}

/**
 * Builds standard HTTP headers for RapidAPI requests, including authentication.
 * @returns {Object} A headers object for fetch.
 * @throws {Error} If the RAPIDAPI_KEY environment variable is not set.
 */
function buildHeaders() {
  // Check RAPIDAPI_KEY first, then fall back to ASTROLOGER_API (legacy var name)
  const rawKey = process.env.RAPIDAPI_KEY || process.env.ASTROLOGER_API;
  const key = rawKey && String(rawKey).trim();
  if (!key) {
    if (!loggedMissingRapidApiKey) {
      logger.error('RAPIDAPI_KEY environment variable is not configured.');
      loggedMissingRapidApiKey = true;
    }
    throw new Error('RAPIDAPI_KEY environment variable is not configured.');
  }
  // Log masked key for debugging (show only first/last 4 chars)
  const maskedKey = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : '****';
  logger.debug(`Building headers with RAPIDAPI_KEY: ${maskedKey}`);
  return {
    "content-type": "application/json",
    "x-rapidapi-key": key,
    "x-rapidapi-host": "best-astrology-api.p.rapidapi.com",
  };
}

/**
 * Makes an API call with exponential backoff retry logic.
 * @param {string} url The API endpoint URL.
 * @param {Object} options The options for the fetch call.
 * @param {string} operation A descriptive name for the operation, for logging.
 * @param {number} [maxRetries=2] The maximum number of retries.
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
          } catch (_) {/* keep rawText */ }
          // Special handling for auth/subscription issues
          if (status === 401 || status === 403) {
            const hint = parsedMessage && /not subscribed|unauthorized|invalid api key|api key is invalid/i.test(parsedMessage)
              ? 'Verify RAPIDAPI_KEY, subscription plan, and that the key matches this API.'
              : 'Authentication / subscription issue likely.';
            logger.error('RapidAPI auth/subscription error', { status, operation, parsedMessage, hint });
            const err = new Error(`RapidAPI access denied (${status}): ${parsedMessage}. ${hint}`);
            err.code = 'RAPIDAPI_SUBSCRIPTION';
            err.status = status;
            err.raw = rawText.slice(0, 1200);
            throw err;
          }
          logger.error('Client error (non-retryable)', { status, operation, url, body: rawText.slice(0, 1200) });
          const err = new Error(`Client error ${status} for ${operation}`);
          err.code = 'CLIENT_ERROR';
          err.status = status;
          err.raw = rawText.slice(0, 1200);
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

/**
 * Fetches and validates a complete natal chart for a subject.
 * This includes chart data, aspects, house cusps, and graphical assets.
 * @param {Object} subject - The subject data (personA or personB).
 * @param {Object} headers - The request headers.
 * @param {Object} pass - Pass-through parameters for the API call.
 * @param {string} subjectLabel - A label for logging ('person_a', 'person_b').
 * @param {string} contextLabel - A context description for logging.
 * @returns {Promise<Object|null>} A complete natal data object, or null if fetch/validation fails.
 */
async function fetchNatalChartComplete(subject, headers, pass, subjectLabel, contextLabel) {
  logger.debug(`Fetching complete natal chart for ${subjectLabel} (${contextLabel})`);

  // DIAGNOSTIC: Log the subject coordinates being sent to the API
  logger.info(`[COORD_TRACE] ${subjectLabel} SENDING to API:`, {
    name: subject.name,
    city: subject.city,
    nation: subject.nation,
    latitude: subject.latitude,
    longitude: subject.longitude,
    timezone: subject.timezone,
    contextLabel
  });

  // Always use BIRTH_CHART endpoint for complete data
  const natalResponse = await callNatal(
    API_ENDPOINTS.BIRTH_CHART,
    subject,
    headers,
    pass,
    `Birth chart (${subjectLabel}) - ${contextLabel}`
  );

  // NEW: Handle flat V3 response structure (subject_data / chart_data)
  // The API sometimes returns flat objects instead of wrapping in .data
  if (natalResponse && !natalResponse.data && (natalResponse.chart_data || natalResponse.subject_data)) {
    logger.info(`[V3] Normalizing flat response for ${subjectLabel}`);
    natalResponse.data = {
      person: natalResponse.subject_data,
      chart: natalResponse.chart_data,
      aspects: natalResponse.chart_data?.aspects,
      // Map top-level planets if they exist in subject_data
      ...natalResponse.subject_data
    };
  }

  // DIAGNOSTIC: Log the coordinates received from the API
  const responseCoords = {
    lat: natalResponse?.data?.lat,
    lng: natalResponse?.data?.lng,
    tz_str: natalResponse?.data?.tz_str,
    person_lat: natalResponse?.data?.person?.latitude,
    person_lng: natalResponse?.data?.person?.longitude,
  };
  logger.info(`[COORD_TRACE] ${subjectLabel} RECEIVED from API:`, responseCoords);

  // CRITICAL: Validate that we received actual chart data from the upstream API
  // RapidAPI payloads have evolved — planets may live directly on data.*, under data.planets,
  // data.person.planets, or data.chart.planets. Accept any of those footprints.
  const planetArray = Array.isArray(natalResponse?.data?.person?.planets)
    ? natalResponse.data.person.planets
    : Array.isArray(natalResponse?.data?.planets)
      ? natalResponse.data.planets
      : Array.isArray(natalResponse?.data?.chart?.planets)
        ? natalResponse.data.chart.planets
        : null;
  const keyedPlanets = natalResponse?.data
    ? ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
      .filter(key => natalResponse.data[key] != null)
    : [];
  const hasPlanets = Boolean(
    (keyedPlanets && keyedPlanets.length > 0) || (planetArray && planetArray.length > 0)
  );

  const normalizedPlanets = (() => {
    if (Array.isArray(planetArray) && planetArray.length) {
      return planetArray;
    }
    if (!keyedPlanets.length) return [];
    return keyedPlanets
      .map(key => {
        const record = natalResponse?.data?.[key];
        if (!record || typeof record !== 'object') return null;
        return {
          name: key,
          ...record,
        };
      })
      .filter(Boolean);
  })();

  // Accept lean payloads in test/dev environments where upstream planets may be
  // stripped. As long as we have subject identity or any aspect data, allow the
  // pipeline to proceed and synthesize missing chart scaffolding. This keeps
  // report generation resilient when mocks omit full planet geometry.
  const hasSubject = Boolean(
    natalResponse?.data?.person ||
    natalResponse?.data?.subject ||
    natalResponse?.data?.chart?.person
  );
  const hasAspects = Array.isArray(natalResponse?.data?.aspects) || Array.isArray(natalResponse?.aspects);
  const hasMinimalChart = hasPlanets || hasSubject || hasAspects;

  logger.info('Natal API response validation', {
    subject: subject.name,
    hasResponse: !!natalResponse,
    hasData: !!natalResponse?.data,
    hasPerson: !!natalResponse?.data?.person,
    hasPlanets,
    responseKeys: natalResponse ? Object.keys(natalResponse) : 'none',
    dataKeys: natalResponse?.data ? Object.keys(natalResponse.data) : 'none'
  });

  if (!natalResponse || !natalResponse.data || !hasMinimalChart) {
    logger.error('Incomplete natal chart data received from upstream API', {
      subject: subject.name,
      subjectLabel,
      contextLabel,
      hasResponse: !!natalResponse,
      hasData: !!natalResponse?.data,
      hasPerson: !!natalResponse?.data?.person,
      planetCount: planetArray?.length || natalResponse?.data?.person?.planets?.length || 0,
      keyedPlanets,
      hasSubject,
      hasAspects
    });
    // Return null to signal the failure - callers MUST handle this
    return null;
  }

  // Sanitize and extract chart data
  const { sanitized: chartData, assets: chartAssets } = sanitizeChartPayload(natalResponse.data || {}, {
    subject: subjectLabel,
    chartType: 'natal',
    scope: 'natal_chart',
  });

  // Ensure we retain at least minimal subject information when upstream payloads
  // omit the rich person object (common in mocks and lean fixtures)
  if (!chartData.person && natalResponse?.data?.subject) {
    chartData.person = natalResponse.data.subject;
  }
  if (!chartData.person && natalResponse?.data?.chart?.person) {
    chartData.person = natalResponse.data.chart.person;
  }
  if (!chartData.person) {
    chartData.person = { name: subject.name };
  }

  // Ensure the sanitized chart retains explicit planet listings for downstream consumers
  if (normalizedPlanets.length) {
    chartData.person = chartData.person || {};
    if (!Array.isArray(chartData.person.planets) || chartData.person.planets.length === 0) {
      chartData.person.planets = normalizedPlanets;
    }
    if (!Array.isArray(chartData.planets) || chartData.planets.length === 0) {
      chartData.planets = normalizedPlanets;
    }
  } else {
    chartData.person = chartData.person || {};
    if (!Array.isArray(chartData.person.planets)) {
      chartData.person.planets = [];
    }
    if (!Array.isArray(chartData.planets)) {
      chartData.planets = [];
    }
  }

  // Build complete natal object
  const natalData = {
    details: subject,
    chart: chartData,
    aspects: Array.isArray(natalResponse.aspects) ? natalResponse.aspects : (chartData.aspects || []),
  };

  if (!Array.isArray(chartData.aspects) || chartData.aspects.length === 0) {
    chartData.aspects = natalData.aspects;
  }

  // Extract house cusps for transit-to-natal-house calculations
  if (natalResponse.data) {
    const houseCusps = extractHouseCusps(natalResponse.data);
    if (houseCusps) {
      natalData.chart.house_cusps = houseCusps;
      logger.debug(`Extracted ${houseCusps.length} natal house cusps for ${subjectLabel}:`, houseCusps.map(c => c.toFixed(2)));
    } else {
      logger.warn(`Failed to extract house cusps from natal chart for ${subjectLabel}`);
    }
  }

  // Attach chart assets
  const allAssets = [...chartAssets];

  // Extract chart wheel SVG from top-level chart field
  if (natalResponse.chart) {
    const { assets: wheelAssets } = sanitizeChartPayload({ chart: natalResponse.chart }, {
      subject: subjectLabel,
      chartType: 'natal',
      scope: 'natal_chart_wheel',
    });
    allAssets.push(...wheelAssets);
  }

  // Add all assets to natal data
  if (allAssets.length > 0) {
    natalData.assets = allAssets;
  }

  logger.debug(`Natal chart complete for ${subjectLabel}: ${natalData.aspects.length} aspects, ${natalData.chart.house_cusps?.length || 0} house cusps`);

  return natalData;
}

// ============================================================
// RAW DATA API FUNCTIONS (v3)
// ============================================================

/**
 * Get planetary positions (Raw Data)
 * @param {Object} subject - Subject data
 * @param {Object} headers - Request headers
 * @param {Object} pass - Options
 */
async function getPositions(subject, headers, pass = {}) {
  const hasCoords = !!(subject.latitude && subject.longitude && subject.timezone);
  const apiSubject = hasCoords ? subjectToAPIStrict(subject, pass) : subjectToAPI(subject, pass);
  const payload = {
    subject: apiSubject,
    options: buildChartOptions(pass)
  };

  return apiCallWithRetry(
    API_ENDPOINTS.DATA_POSITIONS,
    { method: 'POST', headers, body: JSON.stringify(payload) },
    `Positions for ${subject.name}`
  );
}

/**
 * Get house cusps (Raw Data)
 * @param {Object} subject - Subject data
 * @param {Object} headers - Request headers
 * @param {Object} pass - Options
 */
async function getHouseCusps(subject, headers, pass = {}) {
  const hasCoords = !!(subject.latitude && subject.longitude && subject.timezone);
  const apiSubject = hasCoords ? subjectToAPIStrict(subject, pass) : subjectToAPI(subject, pass);
  const payload = {
    subject: apiSubject,
    options: buildChartOptions(pass)
  };

  return apiCallWithRetry(
    API_ENDPOINTS.DATA_HOUSE_CUSPS,
    { method: 'POST', headers, body: JSON.stringify(payload) },
    `House Cusps for ${subject.name}`
  );
}

/**
 * Get aspects (Raw Data)
 * @param {Object} subject - Subject data
 * @param {Object} headers - Request headers
 * @param {Object} pass - Options
 */
async function getAspects(subject, headers, pass = {}) {
  const hasCoords = !!(subject.latitude && subject.longitude && subject.timezone);
  const apiSubject = hasCoords ? subjectToAPIStrict(subject, pass) : subjectToAPI(subject, pass);
  const payload = {
    subject: apiSubject,
    options: buildChartOptions(pass)
  };

  return apiCallWithRetry(
    API_ENDPOINTS.DATA_ASPECTS,
    { method: 'POST', headers, body: JSON.stringify(payload) },
    `Aspects for ${subject.name}`
  );
}

/**
 * Get lunar metrics (Raw Data)
 * @param {Object} subject - Subject data
 * @param {Object} headers - Request headers
 * @param {Object} pass - Options
 */
async function getLunarMetrics(subject, headers, pass = {}) {
  const hasCoords = !!(subject.latitude && subject.longitude && subject.timezone);
  const apiSubject = hasCoords ? subjectToAPIStrict(subject, pass) : subjectToAPI(subject, pass);
  const payload = {
    subject: apiSubject,
    options: buildChartOptions(pass)
  };

  return apiCallWithRetry(
    API_ENDPOINTS.DATA_LUNAR_METRICS,
    { method: 'POST', headers, body: JSON.stringify(payload) },
    `Lunar Metrics for ${subject.name}`
  );
}

/**
 * Get global positions for a specific date (Raw Data)
 * @param {string} date - ISO date string YYYY-MM-DD
 * @param {Object} headers - Request headers
 * @param {Object} pass - Options
 */
async function getGlobalPositions(date, headers, pass = {}) {
  const d = parseDateToV3(date);
  if (!d) throw new Error('Invalid date format for global positions');

  const payload = {
    date: d,
    options: buildChartOptions(pass)
  };

  return apiCallWithRetry(
    API_ENDPOINTS.DATA_GLOBAL_POSITIONS,
    { method: 'POST', headers, body: JSON.stringify(payload) },
    `Global Positions for ${date}`
  );
}

/**
 * Get current astrological data (Now)
 * @param {Object} headers - Request headers
 */
async function getCurrentData(headers) {
  return apiCallWithRetry(
    API_ENDPOINTS.NOW,
    { method: 'GET', headers },
    'Current Data'
  );
}

module.exports = {
  API_ENDPOINTS,
  buildHeaders,
  apiCallWithRetry,
  fetchNatalChartComplete,
  subjectToAPI,
  subjectToAPIStrict,
  callNatal,
  geoResolve,
  getTransits,
  getTransitsV3,
  getRelocationChart,
  computeComposite,
  computeCompositeTransits,
  rapidApiPing,
  // New v3 helpers
  mapDateRangeToV3,
  parseDateToV3,
  buildChartOptions,
  convertNationToCountryCode,
  // Synastry functions (Resonance Seismograph)
  callSynastry,
  getSynastryTransits,
  extractHotDegrees,
  // Raw Data v3
  getPositions,
  getHouseCusps,
  getAspects,
  getLunarMetrics,
  getGlobalPositions,
  getCurrentData,
};
