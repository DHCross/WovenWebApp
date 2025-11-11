/* eslint-disable no-console */
/**
 * Readiness & Graphics Handling Module
 *
 * This module handles:
 * 1. Graphics stripping from API payloads (sanitizeChartPayload)
 * 2. Chart asset extraction and storage
 * 3. Readiness checks for Mirror and Balance outputs
 *
 * Extracted from lib/server/astrology-mathbrain.js as part of Phase 2 refactoring.
 */

const { logger } = require('./utils/time-and-coords.js');
const { storeChartAsset, pruneExpired: pruneCachedCharts, DEFAULT_TTL_MS } = require('../../lib/server/chart-cache');

// --- GRAPHICS HANDLING ---

/**
 * Set of keys that indicate graphical content (SVGs, images, PDFs, etc.)
 * These will be stripped from payloads and stored separately
 */
const GRAPHIC_KEYS = new Set([
  'wheel','svg','chart','image','images','chart_image','graphical','png','jpg','jpeg','pdf',
  'wheel_url','image_url','chartUrl','rendered_svg','rendered_png'
]);

/**
 * Recursively strips graphical data from an object tree.
 * @param {any} obj - The object to process
 * @param {Object} options - Options for processing
 * @param {Array} options.collector - Optional array to collect removed graphics
 * @returns {any} The object with graphics removed
 */
function stripGraphicsDeep(obj, options = {}) {
  const { collector = null } = options;

  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => stripGraphicsDeep(item, options));
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (GRAPHIC_KEYS.has(key)) {
      // This is a graphic key - collect it and skip
      if (collector) {
        collector.push({ key, value, path: [key] });
      }
      continue;
    }

    if (value && typeof value === 'object') {
      result[key] = stripGraphicsDeep(value, options);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Extract chart-specific preferences from options to pass to the API.
 * @param {Object} options - Input options
 * @returns {Object} Chart preferences object
 */
function resolveChartPreferences(options = {}) {
  const prefs = {};

  // Chart visualization and calculation preferences
  const chartKeys = [
    'houses_system_identifier',
    'sidereal_mode',
    'perspective_type',
    'wheel_only',
    'wheel_format',
    'theme',
    'language',
    'active_points',
    'active_aspects'
  ];

  chartKeys.forEach(key => {
    if (options[key] !== undefined) {
      prefs[key] = options[key];
    }
  });

  return prefs;
}

/**
 * Main payload sanitization function.
 * Strips graphics from a chart payload and stores them as separate assets.
 * @param {Object} payload - The raw chart payload from the API
 * @param {Object} context - Context for asset storage (subject, chartType, etc.)
 * @returns {{sanitized: Object, assets: Array}} Sanitized payload and extracted assets
 */
function sanitizeChartPayload(payload, context = {}) {
  if (!payload || typeof payload !== 'object') {
    return { sanitized: payload, assets: [] };
  }

  const removed = [];
  const sanitized = stripGraphicsDeep(payload, { collector: removed });

  // Prune expired chart assets from cache
  try {
    pruneCachedCharts();
  } catch (error) {
    if (logger && typeof logger.debug === 'function') {
      logger.debug('Chart cache prune failed', error.message);
    }
  }

  const assets = [];

  for (const entry of removed) {
    const extracted = extractGraphicAssets(entry, context);
    if (extracted.length) {
      assets.push(...extracted);
    }
  }

  return { sanitized, assets };
}

/**
 * Append chart assets to a target object.
 * @param {Object} target - Target object to add assets to
 * @param {Array} assets - Array of asset objects to append
 */
function appendChartAssets(target, assets) {
  if (!target || !Array.isArray(assets) || assets.length === 0) return;
  if (!Array.isArray(target.chart_assets)) {
    target.chart_assets = [];
  }
  target.chart_assets.push(...assets);
}

/**
 * Extract graphic assets from a removed entry and store them.
 * @param {Object} entry - Removed entry containing graphics
 * @param {Object} context - Storage context (subject, chartType, etc.)
 * @returns {Array} Array of asset metadata objects
 */
function extractGraphicAssets(entry, context) {
  const { key, path, value } = entry || {};
  if (!path) return [];
  const leafPath = Array.isArray(path) ? path : [String(path || key || 'image')];
  const packets = extractGraphicPackets(value, leafPath);
  if (!packets.length) return [];

  const assets = [];
  for (const packet of packets) {
    try {
      if (packet.buffer) {
        const { buffer, contentType, format } = packet;
        const { id, expiresAt } = storeChartAsset(buffer, {
          contentType,
          ttl: context.ttlMs || DEFAULT_TTL_MS,
          metadata: {
            contentType,
            format,
            fieldPath: packet.path,
            pathSegments: packet.pathSegments,
            subject: context.subject || null,
            chartType: context.chartType || null,
            scope: context.scope || 'chart',
            sourceKey: key,
          },
        });

        assets.push({
          id,
          url: `/api/chart/${id}`,
          contentType,
          format,
          fieldPath: packet.path,
          pathSegments: packet.pathSegments,
          key,
          subject: context.subject || null,
          chartType: context.chartType || null,
          scope: context.scope || 'chart',
          size: buffer.length,
          expiresAt,
          external: false,
        });
      } else if (packet.url) {
        const guessedFormat = packet.format || guessFormatFromUrl(packet.url);
        assets.push({
          id: packet.url,
          url: packet.url,
          contentType: packet.contentType || guessContentTypeFromFormat(guessedFormat) || 'image/png',
          format: guessedFormat,
          fieldPath: packet.path,
          pathSegments: packet.pathSegments,
          key,
          subject: context.subject || null,
          chartType: context.chartType || null,
          scope: context.scope || 'chart',
          size: null,
          expiresAt: null,
          external: true,
        });
      }
    } catch (error) {
      logger.warn('Failed to cache chart asset', { error: error.message, path: packet?.path });
    }
  }

  return assets;
}

/**
 * Extract graphic data packets from various value formats.
 * @param {any} value - Value to extract packets from
 * @param {Array|string} path - Path to this value in the object tree
 * @returns {Array} Array of graphic packets
 */
function extractGraphicPackets(value, path) {
  const packets = [];

  if (!value && value !== '') return packets;

  if (typeof value === 'string') {
    const parsed = parseGraphicString(value);
    if (parsed) {
      const pathSegments = Array.isArray(path) ? path.slice() : [String(path)];
      packets.push({ ...parsed, path: pathSegments.join('.'), pathSegments });
    }
    return packets;
  }

  if (Buffer.isBuffer(value)) {
    const pathSegments = Array.isArray(path) ? path.slice() : [String(path)];
    packets.push({ buffer: value, contentType: 'application/octet-stream', format: 'binary', path: pathSegments.join('.'), pathSegments });
    return packets;
  }

  if (typeof value === 'object') {
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      const nextPath = Array.isArray(path) ? path.concat(nestedKey) : [path, nestedKey];
      packets.push(...extractGraphicPackets(nestedValue, nextPath));
    }
  }

  return packets;
}

/**
 * Parse a string that might contain graphic data (data URI, URL, SVG, base64).
 * @param {string} raw - Raw string to parse
 * @returns {Object|null} Parsed graphic data or null
 */
function parseGraphicString(raw) {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;

  // Data URI (e.g., "data:image/png;base64,...")
  if (value.startsWith('data:')) {
    const commaIndex = value.indexOf(',');
    if (commaIndex === -1) return null;
    const meta = value.slice(5, commaIndex);
    const data = value.slice(commaIndex + 1);
    const [contentTypePart, encodingPart] = meta.split(';');
    const contentType = contentTypePart || 'application/octet-stream';
    const encoding = (encodingPart || '').toLowerCase();
    const buffer = Buffer.from(data, encoding.includes('base64') ? 'base64' : 'utf8');
    return { buffer, contentType, format: guessFormatFromContentType(contentType) };
  }

  // HTTP(S) URL
  if (/^https?:\/\//i.test(value)) {
    const format = guessFormatFromUrl(value);
    return {
      url: value,
      contentType: guessContentTypeFromFormat(format),
      format,
    };
  }

  // SVG string
  if (value.startsWith('<svg')) {
    return { buffer: Buffer.from(value, 'utf8'), contentType: 'image/svg+xml', format: 'svg' };
  }

  // Base64-encoded data (heuristic)
  const looksBase64 = /^[A-Za-z0-9+/=\s]+$/.test(value) && value.length % 4 === 0;
  if (looksBase64) {
    try {
      const buffer = Buffer.from(value, 'base64');
      return { buffer, contentType: 'image/png', format: 'png' };
    } catch (error) {
      logger.warn('Failed to decode base64 graphic string', error.message);
    }
  }

  return null;
}

/**
 * Guess image format from content type string.
 * @param {string} contentType - MIME type
 * @returns {string|null} Format (png, svg, jpg, pdf) or null
 */
function guessFormatFromContentType(contentType) {
  if (!contentType) return null;
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('svg')) return 'svg';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('pdf')) return 'pdf';
  return null;
}

/**
 * Guess image format from URL extension.
 * @param {string} url - URL string
 * @returns {string|null} Format (png, svg, jpg, pdf) or null
 */
function guessFormatFromUrl(url) {
  if (!url) return null;
  const match = url.toLowerCase().match(/\.(png|svg|jpe?g|pdf)(\?|#|$)/);
  if (match) {
    switch (match[1]) {
      case 'png':
        return 'png';
      case 'svg':
        return 'svg';
      case 'jpg':
      case 'jpeg':
        return 'jpg';
      case 'pdf':
        return 'pdf';
      default:
        return null;
    }
  }
  return null;
}

/**
 * Guess content type from format string.
 * @param {string} format - Format (png, svg, jpg, pdf)
 * @returns {string|null} MIME type or null
 */
function guessContentTypeFromFormat(format) {
  if (!format) return null;
  switch (format) {
    case 'png':
      return 'image/png';
    case 'svg':
      return 'image/svg+xml';
    case 'jpg':
      return 'image/jpeg';
    case 'pdf':
      return 'application/pdf';
    default:
      return null;
  }
}

// --- READINESS CHECKS ---

/**
 * Check if Mirror output is ready (has all required components).
 * @param {Object} result - Math Brain result object
 * @returns {{mirror_ready: boolean, mirror_missing: Array<string>}}
 */
function checkMirrorReadiness(result) {
  const missing = [];

  // Check for blueprint
  if (!result.frontstage?.mirror?.blueprint) {
    missing.push('blueprint');
  }

  // Check for symbolic weather if transits are present
  if (result.person_a?.chart?.transitsByDate && Object.keys(result.person_a.chart.transitsByDate).length > 0) {
    if (!result.frontstage?.mirror?.symbolic_weather) {
      missing.push('symbolic_weather');
    }
  }

  // Check for polarity cards
  if (!result.frontstage?.mirror?.tensions?.polarity_cards || !result.frontstage.mirror.tensions.polarity_cards.length) {
    missing.push('polarity_cards');
  }

  // Check for stitched reflection
  if (!result.frontstage?.mirror?.stitched_reflection) {
    missing.push('stitched_reflection');
  }

  return {
    mirror_ready: missing.length === 0,
    mirror_missing: missing
  };
}

/**
 * Check if Balance Meter output is ready (has transit data and seismograph).
 * @param {Object} result - Math Brain result object
 * @returns {{balance_ready: boolean, balance_missing: Array<string>}}
 */
function checkBalanceReadiness(result) {
  const missing = [];

  // Check for transit data
  const transitsByDate = result.person_a?.chart?.transitsByDate;
  if (!transitsByDate || Object.keys(transitsByDate).length === 0) {
    missing.push('transits');
  }

  // v5: Validate seismograph presence (Magnitude/Directional Bias/Volatility)
  const hasSeismograph = result.person_a?.derived?.seismograph_summary;
  if (!hasSeismograph) {
    missing.push('seismograph');
  }

  return {
    balance_ready: missing.length === 0,
    balance_missing: missing
  };
}

// --- EXPORTS ---

module.exports = {
  // Graphics handling
  GRAPHIC_KEYS,
  stripGraphicsDeep,
  resolveChartPreferences,
  sanitizeChartPayload,
  appendChartAssets,
  extractGraphicAssets,
  extractGraphicPackets,
  parseGraphicString,
  guessFormatFromContentType,
  guessFormatFromUrl,
  guessContentTypeFromFormat,

  // Readiness checks
  checkMirrorReadiness,
  checkBalanceReadiness,
};
