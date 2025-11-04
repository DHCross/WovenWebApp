/**
 * Shared utility for generating consistent, distinct export filename suffixes
 * across all Math Brain export types.
 * 
 * This ensures each export type has a unique, recognizable filename pattern.
 */

/**
 * Generate a consistent, distinct prefix for each export type
 * @param {string} type The export type
 * @returns {string} A distinct prefix string (e.g., "Mirror_Report", "Mirror+SymbolicWeather")
 */
function getDirectivePrefix(type) {
  const prefixMap = {
    'mirror-directive': 'Mirror_Report',
    'mirror-symbolic-weather': 'Mirror+SymbolicWeather',
    'fieldmap': 'FieldMap',
    'symbolic-weather': 'Symbolic_Weather',
    'dashboard': 'Weather_Dashboard',
    'weather-log': 'Weather_Log',
    'engine-config': 'Engine_Config',
    'ai-bundle': 'AI_Bundle',
  };
  
  return prefixMap[type] || 'Export';
}

/**
 * Generate a complete export filename with consistent suffix
 * @param {string} type The export type
 * @param {string} personASlug Slugified name for Person A
 * @param {string|null} personBSlug Optional slugified name for Person B (for relational reports)
 * @param {string|null} dateRangeSlug Optional date range slug (for timed reports)
 * @param {string} extension File extension (defaults to 'json')
 * @returns {string} Complete filename with extension
 */
function getExportFilename(
  type,
  personASlug,
  personBSlug = null,
  dateRangeSlug = null,
  extension = 'json'
) {
  const prefix = getDirectivePrefix(type);
  const duo = personBSlug ? `${personASlug}-${personBSlug}` : personASlug;
  const dateStr = dateRangeSlug || 'no-dates';
  
  return `${prefix}_${duo}_${dateStr}.${extension}`;
}

/**
 * Generate just the suffix part (person + dates) for backwards compatibility
 * @param {string} personASlug Slugified name for Person A
 * @param {string|null} personBSlug Optional slugified name for Person B
 * @param {string|null} dateRangeSlug Optional date range slug
 * @returns {string} Suffix string (e.g., "dan-stephie_2024-11-01-to-2024-11-30")
 */
function getDirectiveSuffix(
  personASlug,
  personBSlug = null,
  dateRangeSlug = null
) {
  const duo = personBSlug ? `${personASlug}-${personBSlug}` : personASlug;
  const dateStr = dateRangeSlug || 'no-dates';
  
  return `${duo}_${dateStr}`;
}

/**
 * Export pattern for dual compatibility:
 * - CommonJS (module.exports) for Node.js test files
 * - ES module default for TypeScript imports in Next.js
 * 
 * This is a pragmatic approach for Next.js projects that need to support
 * both runtime environments. Next.js's build system handles this correctly.
 * 
 * Alternative would be to maintain separate .cjs/.mjs entry points, but
 * that adds complexity for minimal benefit in this use case.
 */
module.exports = {
  getDirectivePrefix,
  getExportFilename,
  getDirectiveSuffix
};

module.exports.default = module.exports;
