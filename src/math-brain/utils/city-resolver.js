/* eslint-disable no-console */
/**
 * City Resolution Module
 * Handles city geocoding and timezone resolution via the Astrologer API
 * 
 * This module was extracted from lib/server/astrology-mathbrain.js to enable
 * standalone testing and modular refactoring of the legacy monolithic function.
 */

const MATH_BRAIN_VERSION = '0.2.1';
const EPHEMERIS_SOURCE = 'AstrologerAPI-v4';
const CALIBRATION_BOUNDARY = '2025-09-05';

const API_BASE_URL = 'https://astrologer.p.rapidapi.com';
const API_ENDPOINTS = {
  BIRTH_DATA: `${API_BASE_URL}/api/v4/birth-data`,
  NOW: `${API_BASE_URL}/api/v4/now`,
};

const { logger } = require('./time-and-coords.js');

let loggedMissingRapidApiKey = false;

/**
 * Builds HTTP headers for RapidAPI requests
 * @returns {Object} Headers with authentication
 * @throws {Error} If RAPIDAPI_KEY is not configured
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
 * Makes an API call with exponential backoff retry logic
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @param {string} operation - Operation name for logging
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<Object>} Parsed response body
 * @throws {Error} On non-retryable errors or max retries exceeded
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
 * Probes RapidAPI endpoint for latency/connectivity check
 * @param {Object} headers - Request headers with authentication
 * @returns {Promise<Object>} Status object with ok flag and optional error
 */
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

/**
 * Resolves a city name to coordinates and timezone
 * GET /api/resolve-city?city=Bryn+Mawr&state=PA&nation=US
 * 
 * @param {Object} event - Lambda event with queryStringParameters
 * @returns {Promise<Object>} Netlify function response
 */
async function resolveCity(event) {
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
}

/**
 * Health check endpoint
 * Provides version, environment, cold start info, basic config validation,
 * and optional external API latency probe (opt-in via ?ping=now)
 * 
 * @param {Object} event - Lambda event with optional queryStringParameters
 * @returns {Promise<Object>} Netlify function response
 */
let __RC_COLD_START_TS = global.__RC_COLD_START_TS || Date.now();
global.__RC_COLD_START_TS = __RC_COLD_START_TS;
let __RC_HEALTH_INVOCATIONS = global.__RC_HEALTH_INVOCATIONS || 0;
global.__RC_HEALTH_INVOCATIONS = __RC_HEALTH_INVOCATIONS;

async function health(event){
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
}

module.exports = {
  resolveCity,
  health,
  buildHeaders,
  apiCallWithRetry,
  rapidApiPing,
};
