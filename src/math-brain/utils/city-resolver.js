/* eslint-disable no-console */
/**
 * City Resolution Module
 * Handles city geocoding and timezone resolution via the AstroAPI v3
 * 
 * This module was extracted from lib/server/astrology-mathbrain.js to enable
 * standalone testing and modular refactoring of the legacy monolithic function.
 */

const MATH_BRAIN_VERSION = '0.2.1';
const EPHEMERIS_SOURCE = 'AstroAPI-v3';
const CALIBRATION_BOUNDARY = '2025-09-05';

const { logger } = require('./time-and-coords.js');
const {
  API_ENDPOINTS,
  buildHeaders,
  apiCallWithRetry,
  rapidApiPing,
} = require('../api-client.js');

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
