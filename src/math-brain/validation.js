const { validateSubjectLean, normalizeTimezone, parseCoordinates, logger } = require('../../lib/server/astrology-mathbrain');

/**
 * Validates a subject object for all required fields for lean validation.
 * @param {Object} subject - The subject data to validate.
 * @returns {{isValid: boolean, message: string}}
 */
function validateSubject(subject) {
    return validateSubjectLean(subject);
}

/**
 * Normalizes subject data from various input formats into standard internal format.
 * Supports multiple field naming conventions (name vs birth_date, lat vs latitude, etc).
 * Handles coordinate parsing and timezone normalization.
 * @param {Object} data - Raw subject data from input
 * @returns {Object} Normalized subject object with standard fields
 */
function normalizeSubjectData(data) {
  if (!data || typeof data !== 'object') return {};

  const normalized = {
    name: data.name || 'Subject',
    year: data.year, month: data.month, day: data.day,
    hour: data.hour, minute: data.minute,
    city: data.city, nation: data.nation,
    latitude: data.latitude ?? data.lat,
    longitude: data.longitude ?? data.lon ?? data.lng,
    timezone: normalizeTimezone(data.timezone || data.tz_str),
    zodiac_type: data.zodiac_type || data.zodiac || 'Tropic',
  };

  // Convert legacy fields
  if (data.date) {
    const [m, d, y] = data.date.split('-').map(Number);
    normalized.year = normalized.year || y;
    normalized.month = normalized.month || m;
    normalized.day = normalized.day || d;
  }
  if (data.time) {
    const [h, min] = data.time.split(':').map(Number);
    normalized.hour = normalized.hour || h;
    normalized.minute = normalized.minute || min;
  }
  // Support birth_date / birth_time aliases
  if (data.birth_date && (!normalized.year || !normalized.month || !normalized.day)) {
    try {
      const [y, m, d] = String(data.birth_date).split('-').map(Number);
      if (y && m && d) { normalized.year = y; normalized.month = m; normalized.day = d; }
    } catch(_) {}
  }
  if (data.birth_time && (!normalized.hour || !normalized.minute)) {
    try {
      const [h, min] = String(data.birth_time).split(':').map(Number);
      if (h !== undefined && min !== undefined) { normalized.hour = h; normalized.minute = min; }
    } catch(_) {}
  }
  // City / Country aliases
  if (!normalized.city) {
    normalized.city = data.birth_city || data.city_name || data.town || normalized.city;
  }
  if (!normalized.nation) {
    normalized.nation = data.birth_country || data.country || data.country_code || normalized.nation;
  }
  // Timezone aliases
  if (!normalized.timezone) {
    normalized.timezone = normalizeTimezone(data.offset || data.tz || data.tzid || data.time_zone || normalized.timezone);
  }
  if (data.coordinates) {
    const [lat, lng] = data.coordinates.split(',').map(s => parseFloat(s.trim()));
    normalized.latitude = normalized.latitude || lat;
    normalized.longitude = normalized.longitude || lng;
  }

  // Handle coordinate parsing using the enhanced parseCoordinates function
  if (!normalized.latitude || !normalized.longitude) {
    // Check various field names for coordinate data
    const coordFields = ['astro', 'coords', 'coordinate', 'coord', 'location'];
    let coordString = null;
    
    for (const field of coordFields) {
      if (data[field] && typeof data[field] === 'string') {
        coordString = data[field];
        break;
      }
    }
    
    // If we found a coordinate string, parse it
    if (coordString) {
      try {
        const parsed = parseCoordinates(coordString);
        if (parsed && parsed.lat !== undefined && parsed.lon !== undefined) {
          normalized.latitude = normalized.latitude ?? parsed.lat;
          normalized.longitude = normalized.longitude ?? parsed.lon;
          logger.info('Coordinate parsing successful', { 
            input: coordString, 
            output: { lat: parsed.lat, lon: parsed.lon } 
          });
        } else {
          logger.warn('Coordinate parsing failed', { input: coordString });
        }
      } catch (error) {
        logger.error('Coordinate parsing error', { error: error.message, input: coordString });
      }
    }
  }

  // If lat/lon are still strings, try to parse them individually
  if (typeof normalized.latitude === 'string' || typeof normalized.longitude === 'string') {
    try {
      const coordString = `${normalized.latitude},${normalized.longitude}`;
      const parsed = parseCoordinates(coordString);
      if (parsed && parsed.lat !== undefined && parsed.lon !== undefined) {
        normalized.latitude = parsed.lat;
        normalized.longitude = parsed.lon;
        logger.info('Individual coordinate parsing successful', { 
          input: coordString, 
          output: { lat: parsed.lat, lon: parsed.lon } 
        });
      }
    } catch (error) {
      logger.error('Individual coordinate parsing error', { 
        error: error.message, 
        lat: normalized.latitude, 
        lon: normalized.longitude 
      });
    }
  }

  return normalized;
}

module.exports = {
    validateSubject,
    normalizeSubjectData,
};
