/* eslint-disable no-console */
const { storeChartAsset, pruneExpired: pruneCachedCharts, DEFAULT_TTL_MS } = require('../../../lib/server/chart-cache');

// Lightweight logger to avoid pulling in larger logging deps
const logger = {
  log: (...args) => console.log('[LOG]', ...args),
  info: (...args) => console.info('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => process.env.LOG_LEVEL === 'debug' && console.debug('[DEBUG]', ...args),
};

const GRAPHIC_KEYS = new Set([
  'wheel','svg','chart','image','images','chart_image','graphical','png','jpg','jpeg','pdf',
  'wheel_url','image_url','chartUrl','rendered_svg','rendered_png'
]);

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

function resolveChartPreferences(options = {}) {
  const prefs = {};
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

function sanitizeChartPayload(payload, context = {}) {
  if (!payload || typeof payload !== 'object') {
    return { sanitized: payload, assets: [] };
  }

  const removed = [];
  const sanitized = stripGraphicsDeep(payload, { collector: removed });
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

function appendChartAssets(target, assets) {
  if (!target || !Array.isArray(assets) || assets.length === 0) return;
  if (!Array.isArray(target.chart_assets)) {
    target.chart_assets = [];
  }
  target.chart_assets.push(...assets);
}

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

function parseGraphicString(raw) {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;

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

  if (/^https?:\/\//i.test(value)) {
    const format = guessFormatFromUrl(value);
    return {
      url: value,
      contentType: guessContentTypeFromFormat(format),
      format,
    };
  }

  if (value.startsWith('<svg')) {
    return { buffer: Buffer.from(value, 'utf8'), contentType: 'image/svg+xml', format: 'svg' };
  }

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

function guessFormatFromContentType(contentType) {
  if (!contentType) return null;
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('svg')) return 'svg';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('pdf')) return 'pdf';
  return null;
}

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

module.exports = {
  sanitizeChartPayload,
  resolveChartPreferences,
  appendChartAssets,
};
