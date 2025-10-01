const { randomUUID } = require('crypto');

const CACHE = new Map();
const DEFAULT_TTL_MS = 1000 * 60 * 30; // 30 minutes

function pruneExpired(now = Date.now()) {
  for (const [key, entry] of CACHE.entries()) {
    if (!entry || entry.expiresAt <= now) {
      CACHE.delete(key);
    }
  }
}

function storeChartAsset(buffer, options = {}) {
  if (!buffer || !(buffer instanceof Buffer)) {
    throw new TypeError('storeChartAsset expects a Buffer');
  }
  const id = options.id || `chart_${randomUUID()}`;
  const ttl = typeof options.ttl === 'number' && options.ttl > 0 ? options.ttl : DEFAULT_TTL_MS;
  const now = Date.now();
  const expiresAt = now + ttl;
  CACHE.set(id, {
    buffer,
    contentType: options.contentType || 'application/octet-stream',
    metadata: options.metadata || {},
    expiresAt,
    createdAt: now,
    ttl,
  });
  return { id, expiresAt };
}

function getChartAsset(id) {
  if (!id) return null;
  const entry = CACHE.get(id);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    CACHE.delete(id);
    return null;
  }
  return entry;
}

module.exports = {
  storeChartAsset,
  getChartAsset,
  pruneExpired,
  DEFAULT_TTL_MS,
};
