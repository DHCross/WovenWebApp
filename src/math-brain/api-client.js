/* eslint-disable no-console */
/**
 * Math Brain API Client Module
 * 
 * Centralized external API communication logic for astrology data.
 * Handles authentication, retries, and data transformation.
 * 
 * Extracted from lib/server/astrology-mathbrain.js as part of Phase 2 refactoring.
 */

const { DateTime } = require('luxon');
const { logger, normalizeTimezone } = require('./utils/time-and-coords.js');
const { sanitizeChartPayload, resolveChartPreferences } = require('./utils/readiness.js');
const { extractHouseCusps, calculateNatalHouse } = require('./utils/compression.js');
const { buildWindowSamples } = require('../../lib/time-sampling');

const API_BASE_URL = 'https://astrologer.p.rapidapi.com';

const API_ENDPOINTS = {
  BIRTH_CHART:        `${API_BASE_URL}/api/v4/birth-chart`,         // natal chart + aspects
  NATAL_ASPECTS_DATA: `${API_BASE_URL}/api/v4/natal-aspects-data`,  // natal aspects only
  SYNASTRY_CHART:     `${API_BASE_URL}/api/v4/synastry-chart`,       // A↔B + aspects
  TRANSIT_CHART:      `${API_BASE_URL}/api/v4/transit-chart`,       // subject + aspects
  TRANSIT_ASPECTS:    `${API_BASE_URL}/api/v4/transit-aspects-data`,// data-only
  SYNASTRY_ASPECTS:   `${API_BASE_URL}/api/v4/synastry-aspects-data`,
  BIRTH_DATA:         `${API_BASE_URL}/api/v4/birth-data`,
  NOW:                `${API_BASE_URL}/api/v4/now`,
  COMPOSITE_ASPECTS:  `${API_BASE_URL}/api/v4/composite-aspects-data`, // composite aspects only
  COMPOSITE_CHART:    `${API_BASE_URL}/api/v4/composite-chart`,
};

let loggedMissingRapidApiKey = false;

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
  const includeCoords = hasCoords && !pass.force_city_mode && !pass.suppress_coords;
  if (includeCoords) {
    apiSubject.latitude = s.latitude ?? s.lat;
    apiSubject.longitude = s.longitude ?? s.lon ?? s.lng;
    apiSubject.timezone = tzNorm;
  }
  const wantCity = hasCity && (pass.require_city || !includeCoords);
  if (wantCity) {
    apiSubject.city = s.state ? `${s.city}, ${s.state}` : s.city;
    apiSubject.nation = s.nation;
    if ((!includeCoords || pass.force_city_mode) && process.env.GEONAMES_USERNAME && !pass?.suppress_geonames) {
      apiSubject.geonames_username = process.env.GEONAMES_USERNAME;
    }
  }
  const hsys = s.houses_system_identifier || pass.houses_system_identifier;
  if (hsys) apiSubject.houses_system_identifier = hsys;
  return apiSubject;
}

function normalizeStep(step) {
  const s = String(step || '').toLowerCase();
  if (['daily','weekly','monthly'].includes(s)) return s;
  if (s === '1d') return 'daily';
  if (s === '7d') return 'weekly';
  if (s === '1m' || s === '1mo' || s === 'monthly') return 'monthly';
  return 'daily';
}

async function callNatal(endpoint, subject, headers, pass = {}, description = 'Natal call') {
  const hasCoords = !!(subject.latitude && subject.longitude && subject.timezone);
  const geonamesUser = process.env.GEONAMES_USERNAME || subject.geonames_username;
  const hasGeonames = !!geonamesUser;
  const canTryCity = !!(subject.city && subject.nation);
  const chartPrefs = endpoint === API_ENDPOINTS.BIRTH_CHART ? resolveChartPreferences(pass) : null;

  let lastError = null;

  if (canTryCity) {
    const payloadCity = { subject: subjectToAPI(subject, { ...pass, require_city: true, force_city_mode: true, suppress_coords: true, suppress_geonames: !hasGeonames }) };
    if (hasGeonames && payloadCity.subject && !payloadCity.subject.geonames_username && !pass?.suppress_geonames) {
      payloadCity.subject.geonames_username = geonamesUser;
    }
    if (chartPrefs) Object.assign(payloadCity, chartPrefs);
    try {
      return await apiCallWithRetry(endpoint, { method: 'POST', headers, body: JSON.stringify(payloadCity) }, `${description} (city-first)`);
    } catch (eCity) {
      lastError = eCity;
      logger.warn(`City/geonames mode failed for ${description}, falling back to coordinates`, { error: eCity.message });
    }
  }

  if (hasCoords) {
    // CRITICAL: RapidAPI v4 requires city+nation even when coordinates are provided
    const payloadCoords = { subject: subjectToAPI(subject, { ...pass, require_city: true, force_city_mode: false, suppress_coords: false, suppress_geonames: true }) };
    if (chartPrefs) Object.assign(payloadCoords, chartPrefs);
    try {
      return await apiCallWithRetry(endpoint, { method: 'POST', headers, body: JSON.stringify(payloadCoords) }, description);
    } catch (eCoords) {
      lastError = eCoords;
      logger.warn(`Coords mode failed for ${description}`, { error: eCoords.message });
    }
  }

  if (lastError) {
    const geoNote = !hasGeonames && canTryCity ? ' (Note: GEONAMES_USERNAME not configured for fallback city resolution)' : '';
    throw new Error(`${description} failed: ${lastError.message}${geoNote}`);
  }

  throw new Error(`No valid location data provided for ${description}. Need either city+geonames_username or coordinates+timezone.`);
}

async function geoResolve({ city, state, nation }) {
  const username = process.env.GEONAMES_USERNAME || '';
  const q = encodeURIComponent(state ? `${city}, ${state}` : city);
  const c = encodeURIComponent(nation || '');
  const searchUrl = `http://api.geonames.org/searchJSON?q=${q}&country=${c}&maxRows=1&username=${encodeURIComponent(username)}`;
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
    const hasCoords = typeof s.latitude === 'number' && typeof s.longitude === 'number' && !!s.timezone;
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
      const transitPass = hasCoords
        ? { ...apiPass, require_city: true, suppress_geonames: true, suppress_coords: false }
        : { ...apiPass, require_city: true, suppress_geonames: false, suppress_coords: true };

      const payload = {
        first_subject: subjectToAPI(subject, transitPass),
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

              const alternateTransitSubject = await (async function (){
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
              const planetNames = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','mean_node','chiron'];

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

async function computeComposite(personA, personB, pass = {}, headers) {
  try {
    logger.debug('Computing composite for subjects:', {
      personA: personA?.name || 'Unknown A',
      personB: personB?.name || 'Unknown B'
    });

    const payload = {
      first_subject: subjectToAPI(personA, pass),
      second_subject: subjectToAPI(personB, pass),
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
  const rawKey = process.env.RAPIDAPI_KEY;
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
    "x-rapidapi-host": "astrologer.p.rapidapi.com",
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
  
  // Always use BIRTH_CHART endpoint for complete data
  const natalResponse = await callNatal(
    API_ENDPOINTS.BIRTH_CHART,
    subject,
    headers,
    pass,
    `Birth chart (${subjectLabel}) - ${contextLabel}`
  );
  
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
    ? ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto']
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
  
  logger.info('Natal API response validation', {
    subject: subject.name,
    hasResponse: !!natalResponse,
    hasData: !!natalResponse?.data,
    hasPerson: !!natalResponse?.data?.person,
    hasPlanets,
    responseKeys: natalResponse ? Object.keys(natalResponse) : 'none',
    dataKeys: natalResponse?.data ? Object.keys(natalResponse.data) : 'none'
  });
  
  if (!natalResponse || !natalResponse.data || !hasPlanets) {
    logger.error('Incomplete natal chart data received from upstream API', { 
      subject: subject.name, 
      subjectLabel,
      contextLabel,
      hasResponse: !!natalResponse,
      hasData: !!natalResponse?.data,
      hasPerson: !!natalResponse?.data?.person,
      planetCount: planetArray?.length || natalResponse?.data?.person?.planets?.length || 0,
      keyedPlanets
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

  // Ensure the sanitized chart retains explicit planet listings for downstream consumers
  if (normalizedPlanets.length) {
    chartData.person = chartData.person || {};
    if (!Array.isArray(chartData.person.planets) || chartData.person.planets.length === 0) {
      chartData.person.planets = normalizedPlanets;
    }
    if (!Array.isArray(chartData.planets) || chartData.planets.length === 0) {
      chartData.planets = normalizedPlanets;
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

module.exports = {
  API_ENDPOINTS,
  buildHeaders,
  apiCallWithRetry,
  fetchNatalChartComplete,
  subjectToAPI,
  callNatal,
  geoResolve,
  getTransits,
  computeComposite,
  computeCompositeTransits,
  rapidApiPing,
};
