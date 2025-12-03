/**
 * Lightweight Netlify function providing a health check for the astrology
 * service. Intentional duplicate of the core health logic so we can keep this
 * bundle tiny and avoid shipping the full astrology engine for a simple ping.
 *
 * NOTE: Keep the metadata constants in sync with lib/server/astrology-mathbrain.js.
 */

const API_NOW_ENDPOINT = 'https://best-astrology-api.p.rapidapi.com/v3/data/now';
const MATH_BRAIN_VERSION = '0.2.1';            // Keep in sync with core module
const EPHEMERIS_SOURCE = 'AstrologerAPI-v3';   // Updated to v3
const CALIBRATION_BOUNDARY = '2025-09-05';     // Keep in sync with core module

let coldStartTimestamp = Date.now();
let invocationCount = 0;

function buildRapidApiHeaders() {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    throw new Error('RAPIDAPI_KEY environment variable is not configured.');
  }
  return {
    'content-type': 'application/json',
    'x-rapidapi-key': key,
    'x-rapidapi-host': 'best-astrology-api.p.rapidapi.com'
  };
}

async function rapidApiPing(shouldPing) {
  if (!shouldPing || !process.env.RAPIDAPI_KEY) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(API_NOW_ENDPOINT, {
      method: 'GET',
      headers: buildRapidApiHeaders(),
      signal: controller.signal
    });
    clearTimeout(timeout);
    return { ok: response.ok, status: response.status };
  } catch (error) {
    clearTimeout(timeout);
    return {
      ok: false,
      error: error && error.name === 'AbortError' ? 'timeout' : error?.message || 'unknown'
    };
  }
}

exports.handler = async function handler(event) {
  invocationCount += 1;

  const queryParams = event?.queryStringParameters || {};
  const wantsPing = 'ping' in queryParams || 'now' in queryParams;
  const rapidPing = await rapidApiPing(wantsPing);

  const body = {
    success: true,
    service: 'astrology-mathbrain',
    version: MATH_BRAIN_VERSION,
    ephemeris_source: EPHEMERIS_SOURCE,
    calibration_boundary: CALIBRATION_BOUNDARY,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    rapidapi: {
      configured: Boolean(process.env.RAPIDAPI_KEY && String(process.env.RAPIDAPI_KEY).trim()),
      ping: rapidPing
    },
    cold_start_ms: Date.now() - coldStartTimestamp,
    invocations: invocationCount,
    uptime_s: typeof process.uptime === 'function' ? process.uptime() : null,
    memory: (() => {
      try {
        const usage = process.memoryUsage();
        return {
          rss: usage.rss,
          heapUsed: usage.heapUsed,
          heapTotal: usage.heapTotal
        };
      } catch {
        return null;
      }
    })()
  };

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  };
};
