// Data normalization utilities shared across reporting modules
// Provides resilient helpers that safely coerce values used in PDF/table builders

/**
 * Safely coerce a value into a finite number.
 * @param {unknown} value - Value to coerce.
 * @param {number|null} [fallback=null] - Value to use when coercion fails.
 * @returns {number|null}
 */
function safeNum(value, fallback = null) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return fallback;

    // Remove characters that commonly accompany numeric fields (e.g., degree symbols)
    const normalized = trimmed.replace(/[^0-9+\-\.eE]/g, '');
    if (!normalized) return fallback;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  const coerced = Number(value);
  return Number.isFinite(coerced) ? coerced : fallback;
}

module.exports = {
  safeNum,
};
