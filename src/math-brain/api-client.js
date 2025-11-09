/* eslint-disable no-console */
/**
 * Math Brain API Client Module
 * 
 * Centralized external API communication logic for astrology data.
 * Handles authentication, retries, and data transformation.
 * 
 * Extracted from lib/server/astrology-mathbrain.js as part of Phase 2 refactoring.
 */

const { logger } = require('./utils/time-and-coords.js');
const { sanitizeChartPayload } = require('./utils/readiness.js');
const { extractHouseCusps } = require('./utils/compression.js');

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
  if (!natalResponse || !natalResponse.data || !natalResponse.data.person || !natalResponse.data.person.planets || natalResponse.data.person.planets.length === 0) {
    logger.error('Incomplete natal chart data received from upstream API', { 
      subject: subject.name, 
      subjectLabel,
      contextLabel,
      hasResponse: !!natalResponse,
      hasData: !!natalResponse?.data,
      hasPerson: !!natalResponse?.data?.person,
      planetCount: natalResponse?.data?.person?.planets?.length || 0
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
  
  // Build complete natal object
  const natalData = {
    details: subject,
    chart: chartData,
    aspects: Array.isArray(natalResponse.aspects) ? natalResponse.aspects : (chartData.aspects || []),
  };
  
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
};
