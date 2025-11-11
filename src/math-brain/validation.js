const { normalizeTimezone, logger, parseCoordinates } = require('./utils/time-and-coords');

/**
 * Lean validation - checks only essential birth data fields.
 * Used for natal-only requests where city/timezone lookup isn't needed.
 * @param {Object} s - Subject object
 * @returns {{isValid: boolean, message: string}}
 */
function validateSubjectLean(s = {}) {
  const req = ['year','month','day','hour','minute','latitude','longitude'];
  const missing = req.filter(k => s[k] === undefined || s[k] === null || s[k] === '');
  return { isValid: missing.length === 0, message: missing.length ? `Missing: ${missing.join(', ')}` : 'ok' };
}

/**
 * Full validation - checks all required fields including name, zodiac, and location.
 * Accepts either coordinate mode (lat/lon/tz) OR city mode (city/nation for lookup).
 * @param {Object} subject - The subject data to validate.
 * @returns {{isValid: boolean, message: string}}
 */
function validateSubject(subject) {
  const baseReq = ['year','month','day','hour','minute','name','zodiac_type'];
  const baseMissing = baseReq.filter(f => subject[f] === undefined || subject[f] === null || subject[f] === '');

  // Accept either coords-mode OR city-mode
  const hasCoords = (typeof subject.latitude === 'number') && (typeof subject.longitude === 'number') && !!subject.timezone;
  const hasCity = !!subject.city && !!subject.nation;

  if (baseMissing.length) return { isValid: false, message: `Missing base fields: ${baseMissing.join(', ')}` };
  if (!hasCoords && !hasCity) return { isValid: false, message: 'Missing location: need (latitude+longitude+timezone) OR (city+nation)' };
  return { isValid: true, message: 'ok' };
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

  logger.info('[VALIDATION] normalizeSubjectData called', { input: data });

  const normalized = {
    name: data.name || 'Subject',
    zodiac_type: data.zodiac_type || data.zodiac || 'Tropic',
  };

  // Handle date fields - support multiple formats
  // Priority: year/month/day > birth_date > date
  if (data.year && data.month && data.day) {
    normalized.year = data.year;
    normalized.month = data.month;
    normalized.day = data.day;
  } else if (data.birth_date) {
    try {
      const [y, m, d] = String(data.birth_date).split('-').map(Number);
      if (y && m && d) {
        normalized.year = y;
        normalized.month = m;
        normalized.day = d;
      }
    } catch(_) {}
  } else if (data.date) {
    const [m, d, y] = data.date.split('-').map(Number);
    if (y && m && d) {
      normalized.year = y;
      normalized.month = m;
      normalized.day = d;
    }
  }

  // Handle time fields - support multiple formats
  // Priority: hour/minute > birth_time > time
  if (data.hour !== undefined && data.minute !== undefined) {
    normalized.hour = data.hour;
    normalized.minute = data.minute;
  } else if (data.birth_time) {
    try {
      const [h, min] = String(data.birth_time).split(':').map(Number);
      if (h !== undefined && min !== undefined) {
        normalized.hour = h;
        normalized.minute = min;
      }
    } catch(_) {}
  } else if (data.time) {
    const [h, min] = data.time.split(':').map(Number);
    if (h !== undefined && min !== undefined) {
      normalized.hour = h;
      normalized.minute = min;
    }
  }

  // Location fields
  normalized.city = data.city || data.birth_city || data.city_name || data.town;
  normalized.nation = data.nation || data.birth_nation || data.birth_country || data.country || data.country_code;
  normalized.latitude = data.latitude ?? data.lat;
  normalized.longitude = data.longitude ?? data.lon ?? data.lng;
  normalized.timezone = normalizeTimezone(data.timezone || data.tz_str || data.offset || data.tz || data.tzid || data.time_zone);

  // Handle coordinates from string format if needed
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

  logger.info('[VALIDATION] normalizeSubjectData complete', { input: data, output: normalized });
  return normalized;
}

module.exports = {
    validateSubject,
    validateSubjectLean,
    normalizeSubjectData,
};
