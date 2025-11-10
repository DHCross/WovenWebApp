/* eslint-disable no-console */
const { DateTime } = require('luxon');

// Simplified logging utility to avoid external dependencies
const logger = {
  log: (...args) => console.log(`[LOG]`, ...args),
  info: (...args) => console.info(`[INFO]`, ...args),
  warn: (...args) => console.warn(`[WARN]`, ...args),
  error: (...args) => console.error(`[ERROR]`, ...args),
  debug: (...args) => process.env.LOG_LEVEL === 'debug' && console.debug(`[DEBUG]`, ...args),
};

// Timezone normalization for common aliases and US/* forms
function normalizeTimezone(tz) {
  // Return early if timezone isn't a string.
  if (!tz || typeof tz !== 'string') return tz;

  const t = tz.trim().toUpperCase();

  // Map common US timezone names and abbreviations to the correct IANA format.
  const timezoneMap = {
    // Deprecated US/* format (common in legacy systems)
    'US/EASTERN': 'America/New_York',
    'US/CENTRAL': 'America/Chicago',
    'US/MOUNTAIN': 'America/Denver',
    'US/PACIFIC': 'America/Los_Angeles',
    // Common timezone names
    'EASTERN': 'America/New_York',
    'EST': 'America/New_York',
    'EDT': 'America/New_York',
    'CENTRAL': 'America/Chicago',
    'CST': 'America/Chicago',
    'CDT': 'America/Chicago',
    'MOUNTAIN': 'America/Denver',
    'MST': 'America/Denver',
    'MDT': 'America/Denver',
    'PACIFIC': 'America/Los_Angeles',
    'PST': 'America/Los_Angeles',
    'PDT': 'America/Los_Angeles',
  };

  // If the input matches a key in the map, return the corresponding IANA timezone.
  if (timezoneMap[t]) {
    return timezoneMap[t];
  }

  // Fallback for any other timezone, defaulting to UTC if invalid.
  try {
    // Check if the timezone is a valid IANA format.
    return new Intl.DateTimeFormat('en-US', { timeZone: tz }).resolvedOptions().timeZone;
  } catch {
    // If it's not a valid format, return UTC as a default.
    return 'UTC';
  }
}

/**
 * Parses coordinate strings in various formats (DMS, decimal)
 * Accepts: "40°1'N, 75°18'W", "40° 1' N, 75° 18' W", optional seconds and unicode primes.
 * @param {string} coordString - Coordinate string.
 * @returns {{lat: number, lon: number}|null} Parsed coordinates or null
 */
function parseCoordinates(coordString) {
  if (!coordString || typeof coordString !== 'string') return null;

  // Normalize common unicode variants
  let s = coordString.trim()
    .replace(/º/g, '°')    // alt degree symbol
    .replace(/[’′]/g, "'") // prime to apostrophe
    .replace(/[”″]/g, '"'); // double prime to quote

  // Flexible DMS pattern with optional minutes/seconds and spaces
  // Groups: 1=latDeg,2=latMin?,3=latSec?,4=latHem,5=lonDeg,6=lonMin?,7=lonSec?,8=lonHem
  const DMS = /^\s*(\d{1,3})(?:\s*°\s*(\d{1,2})(?:['"]?\s*([\d.]+))?)?\s*([NS])\s*,\s*(\d{1,3})(?:\s*°\s*(\d{1,2})(?:['"]?\s*([\d.]+))?)?\s*([EW])\s*$/i;
  const m = DMS.exec(s);
  if (m) {
    const dmsToDec = (d, m, sec, hem) => {
      const deg = parseInt(d, 10) || 0;
      const min = parseInt(m || '0', 10) || 0;
      const secF = parseFloat(sec || '0') || 0;
      let val = deg + min / 60 + secF / 3600;
      if (/S|W/i.test(hem)) val *= -1;
      return val;
    };
    const lat = dmsToDec(m[1], m[2], m[3], m[4]);
    const lon = dmsToDec(m[5], m[6], m[7], m[8]);
    if (isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      logger.info('Parsed DMS coordinates', { input: coordString, output: { lat, lon } });
      return { lat, lon };
    }
  }

  // Decimal fallback: "40.0167, -75.3000"
  const DEC = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;
  const d = DEC.exec(s);
  if (d) {
    const lat = parseFloat(d[1]);
    const lon = parseFloat(d[2]);
    if (isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat, lon };
    }
  }

  return null;
}


function formatBirthDate(details) {
  if (!details) return '';
  if (typeof details.birth_date === 'string' && details.birth_date.trim()) return details.birth_date;
  const { year, month, day } = details;
  if (year && month && day) {
    const mm = `${month}`.padStart(2, '0');
    const dd = `${day}`.padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }
  return '';
}

function formatBirthTime(details) {
  if (!details) return '';
  if (typeof details.birth_time === 'string' && details.birth_time.trim()) return details.birth_time;
  const { hour, minute } = details;
  if ((hour || hour === 0) && (minute || minute === 0)) {
    const hh = `${hour}`.padStart(2, '0');
    const mm = `${minute}`.padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return '';
}

function formatBirthPlace(details) {
  if (!details) return '';
  if (typeof details.birth_place === 'string' && details.birth_place.trim()) return details.birth_place;
  const city = details.city || details.birthCity;
  const nation = details.nation || details.country;
  if (city && nation) return `${city}, ${nation}`;
  return city || nation || '';
}

function normalizeRelocationMode(mode) {
  if (!mode && mode !== 0) return null;
  const token = String(mode).trim();
  if (!token) return null;
  const lower = token.toLowerCase();
  if (['none', 'off', 'natal', 'default'].includes(lower)) return 'none';
  if (['a_local', 'a-local', 'alocal', 'person_a', 'person-a'].includes(lower)) return 'A_local';
  if (['b_local', 'b-local', 'blocal', 'person_b', 'person-b'].includes(lower)) return 'B_local';

  if (['both_local', 'both-local', 'both', 'dual_local', 'dual-local', 'shared_local', 'shared'].includes(lower)) return 'Both_local';

  if (['a_natal', 'a-natal', 'anatal', 'person_a_natal'].includes(lower)) return 'A_natal';
  if (['b_natal', 'b-natal', 'bnatal', 'person_b_natal'].includes(lower)) return 'B_natal';

  if (['custom', 'manual', 'user'].includes(lower)) return 'Custom';
  if (['midpoint', 'mid-point'].includes(lower)) return 'Midpoint';
  return token;
}

function normalizeTranslocationBlock(raw) {
  if (raw === null || raw === undefined) return null;

  const coerceBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return undefined;
      return value !== 0;
    }
    if (typeof value === 'string') {
      const token = value.trim().toLowerCase();
      if (!token) return undefined;
      if (['false', '0', 'no', 'off', 'none', 'natal'].includes(token)) return false;
      if (['true', '1', 'yes', 'on', 'apply', 'applies'].includes(token)) return true;
    }
    return undefined;
  };

  if (typeof raw === 'string') {
    const method = normalizeRelocationMode(raw);
    if (!method) return null;
    const applies = !['none', 'A_natal', 'B_natal'].includes(method);
    return { applies, method };
  }

  if (typeof raw === 'object') {
    const block = { ...raw };
    const methodCandidate = block.method || block.mode || block.selection || block.type || block.lens;
    const method = normalizeRelocationMode(methodCandidate);
    if (method) block.method = method;
    const coercedApplies = coerceBoolean(block.applies);
    if (coercedApplies !== undefined) {
      block.applies = coercedApplies;
    } else if (method) {
      block.applies = !['none', 'A_natal', 'B_natal'].includes(method);
    } else {
      block.applies = false;
    }
    return block;
  }

  return null;
}

function deriveTransitTimeSpecFromBody(body, fallbackTimezone, options = {}) {
  const raw = body?.transit_time;
  const defaultZone = normalizeTimezone(fallbackTimezone || 'UTC') || 'UTC';

  const coerceZone = (candidate) => {
    if (!candidate || typeof candidate !== 'string') return defaultZone;
    const normalized = normalizeTimezone(candidate);
    return normalized || defaultZone;
  };

  const makeSpec = (hour, minute, zone) => ({
    hour: Math.max(0, Math.min(23, Math.trunc(hour))),
    minute: Math.max(0, Math.min(59, Math.trunc(minute))),
    timezone: coerceZone(zone)
  });

  const requestPolicyRaw = raw?.time_policy || raw?.policy || raw?.mode;
  const canonicalRequestPolicy = requestPolicyRaw ? String(requestPolicyRaw).toLowerCase() : null;

  const tryNowSpec = (zone, sourceTag) => {
    const now = DateTime.now().setZone(coerceZone(zone));
    if (!now.isValid) return null;
    return {
      spec: { hour: now.hour, minute: now.minute, timezone: now.zoneName },
      policy: 'now',
      source: sourceTag
    };
  };

  if (raw && typeof raw === 'object') {
    const zone = raw.timezone || defaultZone;
    const hour = Number(raw.hour);
    const minute = Number(raw.minute);
    const hasExplicitTime = Number.isFinite(hour) && Number.isFinite(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;

    if (canonicalRequestPolicy === 'now') {
      const nowSpec = tryNowSpec(zone, 'request_now');
      if (nowSpec) return nowSpec;
    }

    if (hasExplicitTime) {
      return {
        spec: makeSpec(hour, minute, zone),
        policy: canonicalRequestPolicy && canonicalRequestPolicy !== 'explicit' ? canonicalRequestPolicy : 'explicit',
        source: 'request_explicit'
      };
    }
  }

  if (options.isNowMode) {
    const autoNow = tryNowSpec(defaultZone, 'auto_now');
    if (autoNow) return autoNow;
  }

  return {
    spec: makeSpec(12, 0, defaultZone),
    policy: 'noon_default',
    source: 'default_noon'
  };
}


module.exports = {
  normalizeTimezone,
  parseCoordinates,
  formatBirthDate,
  formatBirthTime,
  formatBirthPlace,
  normalizeRelocationMode,
  normalizeTranslocationBlock,
  deriveTransitTimeSpecFromBody,
  logger
};
