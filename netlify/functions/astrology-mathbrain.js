const API_BASE_URL = process.env.ASTRO_API_BASE || "https://astrologer.p.rapidapi.com";
const API_NATAL_URL = `${API_BASE_URL}/api/v4/natal-aspects-data`;
const API_SYNASTRY_URL = `${API_BASE_URL}/api/v4/synastry-aspects-data`;
const API_TRANSIT_URL = `${API_BASE_URL}/api/v4/transit-aspects-data`;
const API_COMPOSITE_DATA_URL = `${API_BASE_URL}/api/v4/composite-aspects-data`;
const API_NOW_URL = `${API_BASE_URL}/api/v4/now`;
const API_BIRTH_DATA_URL = `${API_BASE_URL}/api/v4/birth-data`;

/**
 * Default configuration for transit calculations
 * Uses Greenwich Observatory as the reference point for planetary positions
 */
const DEFAULT_TRANSIT_CONFIG = {
  city: "Greenwich",
  nation: "GB", 
  latitude: 51.4825766,    // Greenwich Observatory latitude
  longitude: 0,            // Prime Meridian
  timezone: "UTC",         // Universal Coordinated Time
  zodiac_type: "Tropic",   // Tropical zodiac system
  hour: 12,               // Noon for consistent daily transit timing
  minute: 0
};

/**
 * Performance monitoring and API usage statistics
 * Tracks request metrics for optimization and monitoring
 */
const performanceMonitor = {
  stats: {
    totalRequests: 0,
    totalApiCalls: 0,
    averageResponseTime: 0,
    requestsByType: {},
    errorsByType: {},
    lastResetTime: Date.now()
  },
  
  /**
   * Record the start of a request
   * @returns {Object} Request context for tracking
   */
  startRequest(requestType = 'unknown') {
    this.stats.totalRequests++;
    this.stats.requestsByType[requestType] = (this.stats.requestsByType[requestType] || 0) + 1;
    
    return {
      startTime: Date.now(),
      requestType: requestType,
      requestId: generateErrorId()
    };
  },
  
  /**
   * Record the completion of a request
   * @param {Object} context - Request context from startRequest
   * @param {boolean} success - Whether the request succeeded
   * @param {string} errorType - Type of error if failed
   */
  endRequest(context, success = true, errorType = null) {
    const duration = Date.now() - context.startTime;
    
    // Update average response time (exponential moving average)
    this.stats.averageResponseTime = this.stats.averageResponseTime === 0 
      ? duration 
      : (this.stats.averageResponseTime * 0.9) + (duration * 0.1);
    
    if (!success && errorType) {
      this.stats.errorsByType[errorType] = (this.stats.errorsByType[errorType] || 0) + 1;
    }
    
    logger.debug('Request completed', {
      duration: duration,
      success: success,
      errorType: errorType,
      averageResponseTime: Math.round(this.stats.averageResponseTime)
    }, context.requestId);
  },
  
  /**
   * Record an API call for usage tracking
   * @param {string} endpoint - API endpoint called
   */
  recordApiCall(endpoint) {
    this.stats.totalApiCalls++;
    rateLimiter.recordCall(); // Also record for rate limiting
    
    logger.debug('API call recorded', {
      endpoint: endpoint,
      totalApiCalls: this.stats.totalApiCalls,
      rateLimitRemaining: rateLimiter.maxCallsPerMinute - rateLimiter.calls.length
    });
  },
  
  /**
   * Get current performance statistics
   * @returns {Object} Current performance metrics
   */
  getStats() {
    const uptime = Date.now() - this.stats.lastResetTime;
    const requestsPerMinute = this.stats.totalRequests / (uptime / 60000);
    
    return {
      ...this.stats,
      uptime: uptime,
      requestsPerMinute: Math.round(requestsPerMinute * 100) / 100,
      memoryUsage: process.memoryUsage(),
      rateLimitStatus: {
        current: rateLimiter.calls.length,
        limit: rateLimiter.maxCallsPerMinute,
        resetIn: rateLimiter.getWaitTime()
      }
    };
  },
  
  /**
   * Reset statistics (useful for monitoring periods)
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      totalApiCalls: 0,
      averageResponseTime: 0,
      requestsByType: {},
      errorsByType: {},
      lastResetTime: Date.now()
    };
    logger.info('Performance statistics reset');
  }
};

/**
 * Rate limiting tracker to prevent API quota exhaustion
 * Tracks API calls per minute to proactively throttle requests
 */
const rateLimiter = {
  calls: [],
  maxCallsPerMinute: parseInt(process.env.API_RATE_LIMIT) || 60,
  
  /**
   * Check if we can make an API call without exceeding rate limits
   * @returns {boolean} True if call is allowed, false if should wait
   */
  canMakeCall() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove calls older than 1 minute
    this.calls = this.calls.filter(timestamp => timestamp > oneMinuteAgo);
    
    return this.calls.length < this.maxCallsPerMinute;
  },
  
  /**
   * Record an API call for rate limiting purposes
   */
  recordCall() {
    this.calls.push(Date.now());
  },
  
  /**
   * Get time until next call is allowed (in milliseconds)
   * @returns {number} Milliseconds to wait, or 0 if call is allowed now
   */
  getWaitTime() {
    if (this.canMakeCall()) return 0;
    
    const oldestCall = Math.min(...this.calls);
    const waitTime = oldestCall + 60000 - Date.now();
    return Math.max(0, waitTime);
  }
};

/**
 * Generate unique error ID for tracking and correlation
 * @returns {string} Unique error identifier in format: ERR-YYYYMMDD-HHMMSS-XXXX
 */
function generateErrorId() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `ERR-${date}-${time}-${random}`;
}

/**
 * Secure logging utility with multiple levels and sensitive data protection
 * Automatically redacts sensitive information like API keys and personal data
 */
const logger = {
  /**
   * Redact sensitive information from log data
   * @param {any} data - Data to be logged
   * @returns {any} Sanitized data safe for logging
   */
  sanitize(data) {
    if (!data) return data;
    
    const sensitiveFields = [
      'rapidapi-key', 'x-rapidapi-key', 'RAPIDAPI_KEY', 'api_key', 
      'password', 'secret', 'token', 'auth'
    ];
    
    if (typeof data === 'string') {
      // Redact potential API keys (32+ character alphanumeric strings)
      return data.replace(/[a-zA-Z0-9]{32,}/g, '[REDACTED]');
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = Array.isArray(data) ? [...data] : { ...data };
      
      for (const key in sanitized) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object') {
          sanitized[key] = this.sanitize(sanitized[key]);
        }
      }
      
      return sanitized;
    }
    
    return data;
  },

  /**
   * Debug level logging - only shown when LOG_LEVEL=debug
   * @param {string} msg - Log message
   * @param {any} data - Optional data to log
   * @param {string} errorId - Optional error ID for correlation
   */
  debug: (msg, data, errorId) => {
    if (process.env.LOG_LEVEL === 'debug') {
      const sanitizedData = logger.sanitize(data);
      const prefix = errorId ? `[${errorId}] DEBUG: ${msg}` : `DEBUG: ${msg}`;
      console.log(prefix, sanitizedData ? JSON.stringify(sanitizedData, null, 2) : '');
    }
  },

  /**
   * Info level logging - general operational messages
   * @param {string} msg - Log message
   * @param {any} data - Optional data to log
   * @param {string} errorId - Optional error ID for correlation
   */
  info: (msg, data, errorId) => {
    const sanitizedData = logger.sanitize(data);
    const prefix = errorId ? `[${errorId}] INFO: ${msg}` : `INFO: ${msg}`;
    console.log(prefix, sanitizedData ? JSON.stringify(sanitizedData, null, 2) : '');
  },

  /**
   * Warning level logging - potential issues that don't stop execution
   * @param {string} msg - Log message
   * @param {any} data - Optional data to log
   * @param {string} errorId - Optional error ID for correlation
   */
  warn: (msg, data, errorId) => {
    const sanitizedData = logger.sanitize(data);
    const prefix = errorId ? `[${errorId}] WARN: ${msg}` : `WARN: ${msg}`;
    console.warn(prefix, sanitizedData ? JSON.stringify(sanitizedData, null, 2) : '');
  },

  /**
   * Error level logging - serious issues that need attention
   * @param {string} msg - Log message
   * @param {any} error - Error object or data
   * @param {string} errorId - Optional error ID for correlation
   */
  error: (msg, error, errorId) => {
    const sanitizedError = logger.sanitize(error);
    const prefix = errorId ? `[${errorId}] ERROR: ${msg}` : `ERROR: ${msg}`;
    console.error(prefix, sanitizedError);
  }
};

/**
 * Build secure headers for RapidAPI requests
 * Validates API key presence and format before constructing headers
 * @returns {Object} Headers object for API requests
 * @throws {Error} If RAPIDAPI_KEY is not configured or invalid
 */
function buildHeaders() {
  const key = process.env.RAPIDAPI_KEY;
  
  if (!key) {
    throw new Error('RAPIDAPI_KEY environment variable is not configured');
  }
  
  // Basic validation of API key format (should be 32+ characters)
  if (key.length < 32) {
    throw new Error('RAPIDAPI_KEY appears to be invalid (too short)');
  }
  
  return {
    "content-type": "application/json",
    "x-rapidapi-key": key,
    "x-rapidapi-host": "astrologer.p.rapidapi.com",
  };
}

/**
 * Create user-friendly error messages with tracking capabilities
 * Maps HTTP status codes to actionable user messages
 * @param {Object} apiError - Error object with status code
 * @param {string} operation - Description of failed operation
 * @param {string} errorId - Unique error ID for tracking
 * @returns {Object} Enhanced error object with user message and metadata
 */
function createUserFriendlyError(apiError, operation, errorId) {
  const errorMap = {
    400: 'Invalid birth data provided. Please check dates, times, and location information.',
    401: 'Authentication failed. Please contact support.',
    403: 'Access denied. API quota may be exceeded.',
    404: 'Service temporarily unavailable. Please try again later.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'Server error. Please try again later.',
    502: 'Service temporarily down. Please try again later.',
    503: 'Service temporarily unavailable. Please try again later.',
    504: 'Request timed out. Reduce the date range or try again.'
  };
  
  const userMessage = errorMap[apiError.status] || 'Unexpected error occurred. Please try again.';
  
  return {
    message: userMessage,
    operation: operation,
    technical: `${operation} failed with status ${apiError.status}`,
    retryable: [429, 500, 502, 503].includes(apiError.status),
    errorId: errorId,
    timestamp: new Date().toISOString()
  };
}

/**
 * Enhanced API call function with retry logic, rate limiting, and comprehensive error handling
 * Implements exponential backoff and respects API rate limits
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options (method, headers, body)
 * @param {string} operation - Description of operation for logging
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {Promise<Object>} Parsed API response
 * @throws {Error} If all retry attempts fail or non-retryable error occurs
 */
async function apiCallWithRetry(url, options, operation, maxRetries = 3) {
  const errorId = generateErrorId();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check rate limiting before making the call
      if (!rateLimiter.canMakeCall()) {
        const waitTime = rateLimiter.getWaitTime();
        logger.warn(`Rate limit approached, waiting ${waitTime}ms`, { operation, attempt }, errorId);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      logger.debug(`API call attempt ${attempt}/${maxRetries}`, { 
        url: url.replace(/\/\/.*@/, '//***@'), // Hide credentials in URL
        operation 
      }, errorId);
      
      // Record the API call for rate limiting
      rateLimiter.recordCall();
      performanceMonitor.recordApiCall(url); // Record API call for performance monitoring
      
      const response = await fetch(url, options);
      const rawText = await response.text();
      
      if (!response.ok) {
        const error = createUserFriendlyError({ status: response.status }, operation, errorId);
        logger.error(`API call failed`, error, errorId);
        
        // Don't retry on client errors (4xx) except rate limiting (429)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error(error.message);
        }
        
        // Retry on server errors and rate limits
        if (attempt === maxRetries) {
          throw new Error(error.message);
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        logger.warn(`Retrying in ${delay}ms...`, { attempt, maxRetries, status: response.status }, errorId);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      try {
        const parsed = JSON.parse(rawText);
        logger.debug(`API call successful`, { 
          operation, 
          responseKeys: Object.keys(parsed),
          responseSize: rawText.length 
        }, errorId);
        return parsed;
      } catch (parseError) {
        logger.error(`JSON parse error`, { 
          parseError: parseError.message, 
          responseLength: rawText.length,
          responsePreview: rawText.substring(0, 200) 
        }, errorId);
        throw new Error('Received invalid data from astrology service. Please try again.');
      }
    } catch (error) {
      // Don't retry on fetch errors (network issues) if this is the last attempt
      if (attempt === maxRetries || error.message.includes('fetch')) {
        logger.error(`Final API call failure`, { 
          error: error.message, 
          attempt, 
          maxRetries 
        }, errorId);
        throw error;
      }
      
      const delay = Math.pow(2, attempt - 1) * 1000;
      logger.warn(`Network error, retrying in ${delay}ms...`, { 
        attempt, 
        error: error.message 
      }, errorId);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * MATH BRAIN COMPLIANCE: Comprehensive subject data validation
 * Validates all required fields and performs range checking for dates, times, and coordinates
 * Ensures data integrity before sending to external astrology API
 * 
 * @param {Object} subject - Subject data to validate
 * @param {string} subjectName - Human-readable name for error messages (default: 'Subject')
 * @returns {Object} Validation result with isValid flag and detailed error information
 * 
 * Required fields:
 * - year: Birth year (1900-2100)
 * - month: Birth month (1-12) 
 * - day: Birth day (1-31)
 * - hour: Birth hour (0-23)
 * - minute: Birth minute (0-59)
 * - name: Person's name (string)
 * - city: Birth city (string)
 * - nation: Birth country/nation (string)
 * - latitude: Birth latitude (-90 to 90)
 * - longitude: Birth longitude (-180 to 180)
 * - zodiac_type: Zodiac system ('Tropic' or 'Sidereal')
 * - timezone: Timezone identifier (string)
 */
function validateSubject(subject, subjectName = 'Subject') {
  const required = [
    'year', 'month', 'day', 'hour', 'minute',
    'name', 'city', 'nation', 'latitude', 'longitude', 'zodiac_type', 'timezone'
  ];
  
  const missing = [];
  const invalid = [];
  
  // Check each required field for presence and validity
  for (const key of required) {
    const value = subject[key];
    
    // Check if field is present and not empty
    if (value === undefined || value === null || value === "") {
      missing.push(key);
      continue; // Skip range validation if field is missing
    }
    
    // Perform range validation for specific fields
    switch (key) {
      case 'year':
        if (value < 1900 || value > 2100) {
          invalid.push(`${key} must be between 1900 and 2100`);
        }
        break;
      case 'month':
        if (value < 1 || value > 12) {
          invalid.push(`${key} must be between 1 and 12`);
        }
        break;
      case 'day':
        if (value < 1 || value > 31) {
          invalid.push(`${key} must be between 1 and 31`);
        }
        break;
      case 'hour':
        if (value < 0 || value > 23) {
          invalid.push(`${key} must be between 0 and 23`);
        }
        break;
      case 'minute':
        if (value < 0 || value > 59) {
          invalid.push(`${key} must be between 0 and 59`);
        }
        break;
      case 'latitude':
        if (value < -90 || value > 90) {
          invalid.push(`${key} must be between -90 and 90`);
        }
        break;
      case 'longitude':
        if (value < -180 || value > 180) {
          invalid.push(`${key} must be between -180 and 180`);
        }
        break;
      case 'zodiac_type':
        if (!['Tropic', 'Sidereal'].includes(value)) {
          invalid.push(`${key} must be either 'Tropic' or 'Sidereal'`);
        }
        break;
    }
  }
  
  // Return validation result
  if (missing.length > 0 || invalid.length > 0) {
    const errors = [];
    if (missing.length > 0) {
      errors.push(`Missing required fields: ${missing.join(', ')}`);
    }
    if (invalid.length > 0) {
      errors.push(`Invalid values: ${invalid.join(', ')}`);
    }
    
    return {
      isValid: false,
      errors: errors,
      missingFields: missing,
      invalidFields: invalid,
      userMessage: `${subjectName} data is incomplete or invalid. Please check: ${errors.join(' ')}`
    };
  }
  
  return { isValid: true };
}

// Helper to group transits by date (YYYY-MM-DD)
function groupByDate(transits) {
  return transits.reduce((acc, tr) => {
    let date = tr.date;
    if (date) {
      if (date instanceof Date) {
        date = date.toISOString().slice(0, 10);
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
        const [mm, dd, yyyy] = date.split('-');
        date = `${yyyy}-${mm}-${dd}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        // Already in ISO format
      } else {
        try {
          date = new Date(date).toISOString().slice(0, 10);
        } catch {
          // Leave as-is if parse fails
        }
      }
    }
    (acc[date] ??= []).push(tr);
    return acc;
  }, {});
}

// ---------- Composite & Aspect Utilities ----------
function degNorm(x){
  let d = x % 360; if (d < 0) d += 360; return d;
}
function angleSeparation(a,b){
  const diff = Math.abs(degNorm(a) - degNorm(b));
  return diff > 180 ? 360 - diff : diff;
}
function circularMidpoint(a,b){
  const A = degNorm(a), B = degNorm(b);
  const d = ((B - A + 540) % 360) - 180; // shortest signed arc (-180,180]
  return degNorm(A + d/2);
}

// Attempt to extract planet longitudes from various API shapes
function extractPlanetLongitudesFromApiResponse(resp){
  // Expected output: { Sun: 123.45, Moon: 234.56, Mercury: ..., ASC?: ..., MC?: ... }
  const out = {};
  const candidates = [
    resp?.planets, resp?.data?.planets, resp?.points, resp?.data?.points,
    resp?.bodies, resp?.data?.bodies
  ].filter(Boolean);

  for (const arr of candidates){
    if (Array.isArray(arr)){
      for (const p of arr){
        const name = p.name || p.point || p.body || p.id || p.label;
        const lon = p.longitude ?? p.lon ?? p.lng ?? p.long;
        if (name && typeof lon === 'number') out[name] = lon;
      }
    } else if (typeof arr === 'object') {
      for (const [k,v] of Object.entries(arr)){
        const lon = v?.longitude ?? v?.lon ?? v?.lng ?? v?.long;
        if (typeof lon === 'number') out[k] = lon;
      }
    }
  }

  // Common angle points sometimes broken out separately
  const asc = resp?.angles?.ASC || resp?.angles?.Asc || resp?.data?.angles?.ASC;
  const mc  = resp?.angles?.MC  || resp?.data?.angles?.MC;
  if (typeof asc === 'number') out.ASC = asc;
  if (typeof mc  === 'number') out.MC  = mc;

  // --- Kerykeion-style nested placements (e.g., data.composite_subject.sun.abs_pos)
  const nestedContainers = [
    resp?.data?.composite_subject,
    resp?.data?.first_subject,
    resp?.data?.second_subject,
    resp?.data?.transit,
    resp?.data,
    resp?.composite_subject
  ].filter(Boolean);

  const planetKeys = [
    'sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','chiron',
    'mean_lilith','mean_node','true_node','mean_south_node','true_south_node',
    'ascendant','descendant','medium_coeli','imum_coeli'
  ];

  for (const container of nestedContainers){
    for (const k of planetKeys){
      const v = container[k];
      if (!v) continue;
      const lon = v?.longitude ?? v?.lon ?? v?.abs_pos ?? v?.position;
      if (typeof lon === 'number'){
        const keyName = (
          k === 'ascendant' ? 'ASC' :
          k === 'medium_coeli' ? 'MC' :
          k
        );
        const normalized = keyName === k ? (k[0].toUpperCase()+k.slice(1)) : keyName;
        if (out[normalized] === undefined) out[normalized] = lon;
      }
    }
  }

  return out;
}

const DEFAULT_ASPECTS = [
  {name:'Conjunction', angle:0,  orb:8},
  {name:'Opposition',  angle:180,orb:7},
  {name:'Trine',       angle:120,orb:6},
  {name:'Square',      angle:90, orb:6},
  {name:'Sextile',     angle:60, orb:4}
];

function findAspectsBetween(placementsA, placementsB, aspects=DEFAULT_ASPECTS){
  const results = [];
  for (const [nameA, lonA] of Object.entries(placementsA)){
    if (typeof lonA !== 'number') continue;
    for (const [nameB, lonB] of Object.entries(placementsB)){
      if (typeof lonB !== 'number') continue;
      const sep = angleSeparation(lonA, lonB);
      for (const asp of aspects){
        const delta = Math.abs(sep - asp.angle);
        if (delta <= asp.orb){
          results.push({
            a: nameA, b: nameB,
            aspect: asp.name, exact: asp.angle,
            separation: +sep.toFixed(2), orb: +delta.toFixed(2)
          });
          break; // prefer first matching aspect
        }
      }
    }
  }
  return results;
}

// MATH BRAIN COMPLIANCE: Extract only FIELD-level data, ignore all VOICE context
function extractFieldData(inputData) {
  const allowedFields = [
    'year', 'month', 'day', 'hour', 'minute',
    'name', 'city', 'nation', 'latitude', 'longitude', 
    'zodiac_type', 'timezone', 'state', 'coordinates'
  ];

  const fieldData = {};
  
  // Handle direct fields first (new frontend format)
  for (const key of allowedFields) {
    if (inputData[key] !== undefined && inputData[key] !== null && inputData[key] !== "") {
      fieldData[key] = inputData[key];
    }
  }
  
  // Convert legacy frontend format to API format (for backwards compatibility)
  if (!fieldData.year && inputData.date) {
    try {
      const [month, day, year] = inputData.date.split('-');
      fieldData.year = parseInt(year);
      fieldData.month = parseInt(month);
      fieldData.day = parseInt(day);
    } catch (error) {
      logger.warn('Failed to parse legacy date format', { date: inputData.date, error: error.message });
    }
  }
  
  if (!fieldData.hour && inputData.time) {
    try {
      const [hour, minute] = inputData.time.split(':');
      fieldData.hour = parseInt(hour);
      fieldData.minute = parseInt(minute);
    } catch (error) {
      logger.warn('Failed to parse legacy time format', { time: inputData.time, error: error.message });
    }
  }
  
  if (!fieldData.latitude && inputData.coordinates) {
    try {
      const [lat, lng] = inputData.coordinates.split(',').map(s => parseFloat(s.trim()));
      if (!isNaN(lat) && !isNaN(lng)) {
        fieldData.latitude = lat;
        fieldData.longitude = lng;
      }
    } catch (error) {
      logger.warn('Failed to parse legacy coordinates format', { coordinates: inputData.coordinates, error: error.message });
    }
  }
  
  // Map other legacy field names for backwards compatibility
  const legacyMappings = {
    'name': 'name',
    'city': 'city', 
    'nation': 'nation',
    'zodiac': 'zodiac_type',
    'offset': 'timezone',
    'lat': 'latitude',
    'lng': 'longitude',
    'tz_str': 'timezone'
  };
  
  for (const [legacyField, modernField] of Object.entries(legacyMappings)) {
    if (!fieldData[modernField] && inputData[legacyField] !== undefined) {
      fieldData[modernField] = inputData[legacyField];
    }
  }

  // STRICT FILTERING: Only return allowed FIELD-level data
  const filtered = {};
  for (const key of Object.keys(fieldData)) {
    if (allowedFields.includes(key)) {
      filtered[key] = fieldData[key];
    }
  }

  logger.debug('Extracted field data', filtered);
  return filtered;
}

function extractRelocationFieldData(relocationData) {
  const coords = relocationData.coordinates.split(',').map(s => parseFloat(s.trim()));
  return {
    latitude: coords[0],
    longitude: coords[1],
    city: relocationData.city || "Relocated Location",
  };
}

// ----------- Composite Chart Builders -----------
function buildCompositePlacements(natalAResp, natalBResp){
  const A = extractPlanetLongitudesFromApiResponse(natalAResp) || {};
  const B = extractPlanetLongitudesFromApiResponse(natalBResp) || {};
  const haveLongitudes = Object.keys(A).length && Object.keys(B).length;
  if (haveLongitudes){
    const keys = Array.from(new Set([...Object.keys(A), ...Object.keys(B)]));
    const composite = {};
    for (const k of keys){
      if (typeof A[k] === 'number' && typeof B[k] === 'number'){
        composite[k] = circularMidpoint(A[k], B[k]);
      }
    }
    return composite;
  }
  // If we don't have longitudes here, the handler will call the API composite endpoint instead
  return {};
}

function toSubjectModel(p){
  return {
    year: p.year || p.y || p.birth_year,
    month: p.month || p.m || p.birth_month,
    day: p.day || p.d || p.birth_day,
    hour: p.hour ?? (typeof p.birth_time==='string'? parseInt(p.birth_time.split(':')[0],10) : undefined),
    minute: p.minute ?? (typeof p.birth_time==='string'? parseInt((p.birth_time.split(':')[1]||'0'),10) : 0),
    city: p.city || p.birth_city || 'London',
    nation: p.nation || p.birth_country || undefined,
    name: p.name || 'Subject',
    longitude: p.longitude ?? p.lng ?? undefined,
    latitude: p.latitude ?? p.lat ?? undefined,
    timezone: p.timezone || undefined,
    zodiac_type: p.zodiac_type || p.zodiac || 'Tropic'
  };
}

async function fetchCompositePlacementsViaApi(personA, personB){
  const body = { first_subject: toSubjectModel(personA), second_subject: toSubjectModel(personB) };
  const resp = await apiCallWithRetry(
    API_COMPOSITE_DATA_URL,
    { method:'POST', headers: buildHeaders(), body: JSON.stringify(body) },
    'Composite aspects data'
  );
  return extractPlanetLongitudesFromApiResponse(resp);
}

function buildCompositeAspects(compositePlacements){
  return findAspectsBetween(compositePlacements, compositePlacements)
    .filter(x => x.a !== x.b); // ignore self aspects
}

async function getCurrentPlanetPlacements(dateStr){
  const todayIso = new Date().toISOString().slice(0,10);
  if (dateStr === todayIso){
    const resp = await apiCallWithRetry(
      API_NOW_URL,
      { method:'GET', headers: buildHeaders() },
      'Now planets'
    );
    return extractPlanetLongitudesFromApiResponse(resp);
  }
  const [yyyy,mm,dd] = dateStr.split('-').map(Number);
  const subject = {
    year: yyyy, month: mm, day: dd,
    hour: 12, minute: 0,
    city: 'Greenwich', nation: 'GB', name: `Transit ${dateStr}`,
    longitude: 0, latitude: 51.4826,
    zodiac_type: 'Tropic'
  };
  const resp = await apiCallWithRetry(
    API_BIRTH_DATA_URL,
    { method:'POST', headers: buildHeaders(), body: JSON.stringify({ subject }) },
    `Birth-data planets for ${dateStr}`
  );
  return extractPlanetLongitudesFromApiResponse(resp);
}

async function computeCompositeTransitsByDate(compositePlacements, startDate, endDate, step='daily', requestId=null){
  const start = new Date(startDate); const end = new Date(endDate);
  if (isNaN(start) || isNaN(end)) throw new Error('Invalid date format. Use YYYY-MM-DD.');
  const stepDays = (typeof step === 'number') ? Math.max(1, step|0) : (step === 'weekly' ? 7 : 1);
  const dates = [];
  for (let d=new Date(start); d<=end; d.setDate(d.getDate()+stepDays)){
    dates.push(d.toISOString().slice(0,10));
  }
  const out = {};
  for (const ds of dates){
    try{
      const transiting = await getCurrentPlanetPlacements(ds);
      const aspects = findAspectsBetween(transiting, compositePlacements);
      out[ds] = aspects;
    }catch(err){
      logger.warn('Failed composite transit day', { date: ds, error: err.message }, requestId);
    }
  }
  return out;
}

function hasValidData(data) {
  return data && (data.date || data.year) && (data.coordinates || (data.latitude && data.longitude));
}

async function calculateNatalChart(subject) {
  logger.debug('Calculating natal chart for subject', subject);
  
  try {
    const response = await apiCallWithRetry(
      API_NATAL_URL,
      {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ subject })
      },
      'Natal chart calculation'
    );

    logger.debug('Natal API response keys', Object.keys(response));

    // Group transits by date for easier access
    if (response.transits && Array.isArray(response.transits)) {
      response.transitsByDate = groupByDate(response.transits);
    }

    return response;
  } catch (error) {
    logger.error('Failed to calculate natal chart', error);
    throw error;
  }
}

async function calculateSynastry(firstSubject, secondSubject) {
  logger.debug('Calculating synastry', { firstSubject, secondSubject });
  
  try {
    const response = await apiCallWithRetry(
      API_SYNASTRY_URL,
      {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ 
          first_subject: firstSubject,
          second_subject: secondSubject 
        })
      },
      'Synastry calculation'
    );

    logger.debug('Synastry API response keys', Object.keys(response));
    return response;
  } catch (error) {
    logger.error('Failed to calculate synastry', error);
    throw error;
  }
}

// Helper: Convert DMS string (e.g. "30°10'N, 85°40'W") to decimal degrees
function dmsToDecimal(dmsStr) {
  const regex = /([0-9]+)°([0-9]+)'([NS]),\s*([0-9]+)°([0-9]+)'([EW])/;
  const match = dmsStr.match(regex);
  if (!match) return null;
  let lat = parseInt(match[1]) + parseInt(match[2]) / 60;
  let lng = parseInt(match[4]) + parseInt(match[5]) / 60;
  if (match[3] === 'S') lat = -lat;
  if (match[6] === 'W') lng = -lng;
  return { latitude: lat, longitude: lng };
}

// Helper: Normalize subject coordinates (DMS to decimal)
function normalizeCoordinates(subject) {
  // Always check birth_coordinates first
  if (subject.birth_coordinates && typeof subject.birth_coordinates === "string" && /°/.test(subject.birth_coordinates)) {
    const dms = dmsToDecimal(subject.birth_coordinates);
    if (dms) {
      subject.latitude = dms.latitude;
      subject.longitude = dms.longitude;
    }
  } else if (subject.latitude && typeof subject.latitude === "string" && /°/.test(subject.latitude)) {
    // If latitude is DMS string, try to parse with longitude
    const dms = dmsToDecimal(subject.latitude + ',' + subject.longitude);
    if (dms) {
      subject.latitude = dms.latitude;
      subject.longitude = dms.longitude;
    }
  }
  // If latitude/longitude are still missing, try to parse from birth_coordinates as decimal
  if ((!subject.latitude || !subject.longitude) && subject.birth_coordinates && /,/.test(subject.birth_coordinates)) {
    const parts = subject.birth_coordinates.split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      subject.latitude = parts[0];
      subject.longitude = parts[1];
    }
  }
}

function buildWMChart({ personA, personB, relocationA, relocationB, synastry, context }) {
  function extractDetails(subject) {
    let coords = subject.birth_coordinates || `${subject.latitude},${subject.longitude}` || "";
    let latitude = subject.latitude;
    let longitude = subject.longitude;
    if (coords && /°/.test(coords)) {
      const dms = dmsToDecimal(coords);
      if (dms) {
        latitude = dms.latitude;
        longitude = dms.longitude;
      }
    } else if (coords && /,/.test(coords)) {
      const parts = coords.split(',').map(s => parseFloat(s.trim()));
      latitude = parts[0];
      longitude = parts[1];
    }
    return {
      name: subject.name || "",
      birth_date: subject.birth_date || subject.date || "",
      birth_time: subject.birth_time || subject.time || "",
      birth_city: subject.birth_city || subject.city || "",
      birth_state: subject.birth_state || subject.state || "",
      birth_country: subject.birth_country || subject.nation || "",
      birth_coordinates: coords,
      latitude,
      longitude,
      timezone: subject.timezone || "",
      zodiac_type: subject.zodiac_type || subject.zodiac || "Tropic"
    };
  }
  const root = {
    schema: "WM-Chart-1.0",
    relationship_type: context?.relationship_type || "partner",
    intimacy_tier: context?.intimacy_tier || undefined,
    is_ex_relationship: context?.is_ex_relationship || false,
    diagnostics: [],
    person_a: {
      details: extractDetails(personA.details || personA),
      chart: personA.chart || personA
    },
    person_b: personB ? {
      details: extractDetails(personB.details || personB),
      chart: personB.chart || personB
    } : undefined,
    relocation_a: relocationA ? relocationA : undefined,
    relocation_b: relocationB ? relocationB : undefined,
    synastry: synastry ? synastry : undefined,
    composite: context?.mode === 'COMPOSITE_TRANSITS' && context?.composite
      ? context.composite
      : undefined,
  };
  if (personA.chart?.transits && personA.chart?.transitsByDate) {
    const flat = JSON.stringify(personA.chart.transits);
    const dict = JSON.stringify(Object.values(personA.chart.transitsByDate).flat());
    if (flat !== dict) throw new Error("transits and transitsByDate must be deeply equal if both are present");
  }
  Object.keys(root).forEach(k => root[k] === undefined && delete root[k]);
  return root;
}

/**
 * MATH BRAIN COMPLIANT HANDLER
 * Main serverless function handler for astrological calculations
 * 
 * Supports multiple request formats:
 * 1. Modern format: { personA, personB?, transitStartDate?, transitEndDate?, context?, relocation? }
 * 2. Legacy format: { person_a, person_b, include_synastry? }
 * 3. API format: { first_subject, second_subject }
 * 4. Single format: { subject }
 * 
 * Features:
 * - Comprehensive input validation with detailed error messages
 * - Natal chart calculations for one or two people
 * - Synastry (relationship compatibility) analysis
 * - Transit calculations for date ranges
 * - Relocation chart support
 * - Rate limiting and retry logic
 * - Structured error handling with unique tracking IDs
 * 
 * @param {Object} event - Netlify function event object
 * @param {string} event.httpMethod - HTTP method (must be POST)
 * @param {string} event.body - JSON request body
 * @returns {Promise<Object>} HTTP response with status code and JSON body
 */
exports.handler = async function (event) {
  const requestId = generateErrorId(); // Generate unique ID for this request
  
  // Start performance monitoring
  const requestType = (() => {
    try {
      const body = JSON.parse(event.body || '{}');
      if (body.personB || body.person_b || body.second_subject) return 'synastry';
      if (body.transitStartDate || body.transit_start_date) return 'natal_with_transits';
      return 'natal';
    } catch {
      return 'invalid';
    }
  })();
  
  const requestContext = performanceMonitor.startRequest(requestType);
  requestContext.requestId = requestId; // Link monitoring to error ID
  
  try {
    // Environment validation - ensure all required config is present
    if (!process.env.RAPIDAPI_KEY) {
      logger.error('RAPIDAPI_KEY environment variable is not configured', null, requestId);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Service temporarily unavailable. Please try again later.',
          code: 'CONFIG_ERROR',
          errorId: requestId
        })
      };
    }
    
    logger.debug('Environment check passed', { 
      hasKey: !!process.env.RAPIDAPI_KEY,
      keyLength: process.env.RAPIDAPI_KEY?.length || 0 
    }, requestId);
    
    // HTTP method validation
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ 
          error: 'Only POST requests are allowed',
          code: 'METHOD_NOT_ALLOWED',
          errorId: requestId
        })
      };
    }

    // Request body parsing and validation
    let body;
    try {
      body = JSON.parse(event.body);
      logger.debug('Received request body', body, requestId);
    } catch (err) {
      logger.error('Invalid JSON in request body', err, requestId);
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid request format. Please check your data and try again.',
          code: 'INVALID_JSON',
          errorId: requestId
        })
      };
    }

    // Initialize variables for processing
    let personA = null;
    let personB = null;
    let relocationData = null;
    let context = body.context || null;
    let transitParams = null;
    
    // Extract transit parameters if present for date range analysis
    if (body.transitStartDate && body.transitEndDate) {
      transitParams = {
        startDate: body.transitStartDate,
        endDate: body.transitEndDate,
        step: body.transitStep || 'daily'
      };
      logger.debug('Extracted transit params', transitParams, requestId);
    }
    
    // Parse different request formats with comprehensive error handling
    try {
      if (body.personA) {
        // Modern frontend format - most common case
        logger.debug('Processing new frontend format', { 
          hasPersonA: true, 
          hasPersonB: !!body.personB 
        }, requestId);
        
        personA = extractFieldData(body.personA);
        normalizeCoordinates(personA);
        
        // Optional second person for synastry analysis
        if (body.personB && hasValidData(body.personB)) {
          personB = extractFieldData(body.personB);
          normalizeCoordinates(personB);
        }
        
        // Optional relocation data for relocated charts
        if (body.relocation && body.relocation.enabled && body.relocation.coordinates) {
          relocationData = extractRelocationFieldData(body.relocation);
          normalizeCoordinates(relocationData);
        }
      } else if (body.person_a && body.person_b && !body.include_synastry) {
        // Legacy format for backward compatibility
        logger.debug('Processing legacy person_a/person_b format', null, requestId);
        personA = extractFieldData(body.person_a);
        normalizeCoordinates(personA);
        personB = extractFieldData(body.person_b);
        normalizeCoordinates(personB);
      } else if (body.first_subject && body.second_subject) {
        // Direct API format
        logger.debug('Processing first_subject/second_subject format', null, requestId);
        personA = extractFieldData(body.first_subject);
        normalizeCoordinates(personA);
        personB = extractFieldData(body.second_subject);
        normalizeCoordinates(personB);
      } else if (body.subject) {
        // Single subject format
        logger.debug('Processing single subject format', null, requestId);
        personA = extractFieldData(body.subject);
        normalizeCoordinates(personA);
      } else {
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            error: 'No birth data provided. Please include subject information.',
            code: 'MISSING_SUBJECT',
            errorId: requestId
          })
        };
      }
    } catch (error) {
      logger.error('Error processing request data', error, requestId);
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid birth data format. Please check your information and try again.',
          code: 'DATA_PROCESSING_ERROR',
          errorId: requestId
        })
      };
    }
    
    // Ensure we have at least one valid subject
    if (!personA) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Primary person\'s birth data is required.',
          code: 'MISSING_PRIMARY_SUBJECT',
          errorId: requestId
        })
      };
    }
    
    // Mode invariants: COMPOSITE_TRANSITS guard (concrete checks)
    if (body?.context?.mode === 'COMPOSITE_TRANSITS') {
      const haveA = !!body.personA || !!body.person_a || !!body.first_subject;
      const haveB = !!body.personB || !!body.person_b || !!body.second_subject;
      const tp = body.transitParams || (body.transitStartDate && body.transitEndDate && {
        startDate: body.transitStartDate, endDate: body.transitEndDate
      });
      const validDate = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
      let failReason = null;
      if (!haveA) failReason = 'missingA';
      else if (!haveB) failReason = 'missingB';
      else if (!tp) failReason = 'missingDateRange';
      else if (!validDate(tp.startDate) || !validDate(tp.endDate)) failReason = 'badDate';
      if (failReason) {
        logger.warn(`COMPOSITE_TRANSITS guard tripped: ${failReason}`, { haveA, haveB, tp }, requestId);
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "COMPOSITE_TRANSITS requires two subjects (A & B) and a valid date range (startDate, endDate in YYYY-MM-DD).",
            code: "COMPOSITE_TRANSITS_INVALID_REQUEST",
            errorId: requestId
          })
        };
      }
    }

    // Comprehensive data validation for all subjects
    const validationA = validateSubject(personA, 'Primary person');
    if (!validationA.isValid) {
      logger.warn('Person A validation failed', validationA, requestId);
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: validationA.userMessage,
          code: 'VALIDATION_ERROR_A',
          details: validationA.errors,
          errorId: requestId
        })
      };
    }
    
    if (personB) {
      const validationB = validateSubject(personB, 'Second person');
      if (!validationB.isValid) {
        logger.warn('Person B validation failed', validationB, requestId);
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            error: validationB.userMessage,
            code: 'VALIDATION_ERROR_B',
            details: validationB.errors,
            errorId: requestId
          })
        };
      }
    }

    // Execute astrological calculations with comprehensive error handling
    let natalA, natalB, relocationA, relocationB, synastry;
    // --- Composite chart block
    let composite = null;
    try {
      logger.info('Starting chart calculations', { requestId }, requestId);

      // Primary natal chart calculation (always required)
      natalA = await calculateNatalChart(personA);
      logger.debug('Person A natal chart calculated successfully', null, requestId);

      // Secondary natal chart (for synastry analysis)
      if (personB) {
        natalB = await calculateNatalChart(personB);
        logger.debug('Person B natal chart calculated successfully', null, requestId);
      }

      // Build composite chart using API (fallback to midpoint)
      if (natalA && natalB){
        let compositePlacements = {};
        try{
          compositePlacements = await fetchCompositePlacementsViaApi(personA, personB);
          logger.debug('Composite placements fetched from API', { points: Object.keys(compositePlacements).length }, requestId);
        }catch(e){
          logger.warn('Composite API fetch failed; falling back to midpoint', { error: e.message }, requestId);
          compositePlacements = buildCompositePlacements(natalA, natalB);
        }
        const compositeAspects = buildCompositeAspects(compositePlacements);
        composite = { placements: compositePlacements, aspects: compositeAspects };
      }

      // Relocation charts (for geographic relocation analysis)
      if (relocationData) {
        relocationA = await calculateNatalChart({ ...personA, ...relocationData });
        logger.debug('Person A relocation chart calculated successfully', null, requestId);

        if (personB && !body.relocation?.excludePersonB) {
          relocationB = await calculateNatalChart({ ...personB, ...relocationData });
          logger.debug('Person B relocation chart calculated successfully', null, requestId);
        }
      }

      // Synastry analysis (relationship compatibility)
      if (personB) {
        synastry = await calculateSynastry(personA, personB);
        logger.debug('Synastry calculated successfully', null, requestId);
      }

    } catch (error) {
      logger.error('Chart calculation failed', error, requestId);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: error.message || 'Failed to calculate astrological charts. Please try again.',
          code: 'CALCULATION_ERROR',
          retryable: error.retryable || false,
          errorId: requestId
        })
      };
    }

    // Calculate transit data for date range analysis (if requested)
    if (transitParams && transitParams.startDate && transitParams.endDate) {
      logger.info('Calculating transit data for date range', transitParams, requestId);

      try {
        const batchSize = parseInt(process.env.TRANSIT_BATCH_SIZE) || 5;

        // Calculate transits for primary person
        const transitDataA = await calculateTransitData(
          personA,
          transitParams.startDate,
          transitParams.endDate,
          transitParams.step || 'daily',
          batchSize,
          requestId
        );

        if (Object.keys(transitDataA).length > 0) {
          natalA.transitsByDate = transitDataA;
          logger.info('Successfully added transit data to Person A', {
            datesWithData: Object.keys(transitDataA).length
          }, requestId);
        } else {
          logger.warn('No transit data available for Person A', null, requestId);
        }

        // Calculate transits for secondary person (if present)
        if (personB) {
          const transitDataB = await calculateTransitData(
            personB,
            transitParams.startDate,
            transitParams.endDate,
            transitParams.step || 'daily',
            batchSize,
            requestId
          );

          if (Object.keys(transitDataB).length > 0) {
            natalB.transitsByDate = transitDataB;
            logger.info('Successfully added transit data to Person B', {
              datesWithData: Object.keys(transitDataB).length
            }, requestId);
          } else {
            logger.warn('No transit data available for Person B', null, requestId);
          }
        }
        // Composite transits (transits to the composite chart)
        if (composite && composite.placements){
          const compTransits = await computeCompositeTransitsByDate(
            composite.placements,
            transitParams.startDate,
            transitParams.endDate,
            transitParams.step || 'daily',
            requestId
          );
          composite.transitsByDate = compTransits;
          logger.info('Composite transit data added', { dates: Object.keys(compTransits||{}).length }, requestId);
        }
      } catch (error) {
        logger.error('Transit calculation failed', error, requestId);
        // Don't fail the entire request, just continue without transit data
        logger.warn('Continuing without transit data due to calculation error', null, requestId);
      }
    } else {
      logger.debug('No transit parameters provided', {
        hasStartDate: !!transitParams?.startDate,
        hasEndDate: !!transitParams?.endDate
      }, requestId);
    }

    // Legacy transit grouping (for backwards compatibility with older API responses)
    if (natalA.transits && Array.isArray(natalA.transits)) {
      natalA.transitsByDate = groupByDate(natalA.transits);
    }
    if (natalB && natalB.transits && Array.isArray(natalB.transits)) {
      natalB.transitsByDate = groupByDate(natalB.transits);
    }
    if (synastry && synastry.transits && Array.isArray(synastry.transits)) {
      synastry.transitsByDate = groupByDate(synastry.transits);
    }

    // Build final WM Chart response structure
    const contextWithComposite = { 
      ...(context || {}),
      ...(context?.mode === 'COMPOSITE_TRANSITS' ? { composite } : {})
      // Do NOT override mode; keep context?.mode as-is
    };
    const wmChart = buildWMChart({
      personA: { details: personA, chart: natalA },
      personB: personB ? { details: personB, chart: natalB } : undefined,
      relocationA,
      relocationB,
      synastry,
      context: contextWithComposite
    });

    // Log successful completion with summary
    logger.info('Chart calculation completed successfully', {
      requestId,
      hasPersonA: !!wmChart.person_a,
      hasPersonB: !!wmChart.person_b,
      hasRelocationA: !!wmChart.relocation_a,
      hasRelocationB: !!wmChart.relocation_b,
      hasSynastry: !!wmChart.synastry,
      hasTransitDataA: !!(wmChart.person_a?.chart?.transitsByDate && Object.keys(wmChart.person_a.chart.transitsByDate).length > 0),
      hasTransitDataB: !!(wmChart.person_b?.chart?.transitsByDate && Object.keys(wmChart.person_b.chart.transitsByDate).length > 0)
    }, requestId);

    // Record successful completion
    performanceMonitor.endRequest(requestContext, true);

    return {
      statusCode: 200,
      body: JSON.stringify(wmChart)
    };

  } catch (err) {
    const errorId = generateErrorId();
    logger.error('Unexpected error in handler', err, errorId);

    // Record failed completion
    performanceMonitor.endRequest(requestContext, false, 'INTERNAL_ERROR');

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'An unexpected error occurred. Please try again.',
        code: 'INTERNAL_ERROR',
        retryable: true,
        errorId: errorId
      })
    };
  }
};

/**
 * Health check and statistics endpoint
 * Provides operational status and performance metrics
 * 
 * @param {Object} event - Netlify function event object
 * @returns {Promise<Object>} HTTP response with status and statistics
 */
exports.health = async function (event) {
  try {
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        body: JSON.stringify({ 
          error: 'Only GET requests are allowed for health check',
          code: 'METHOD_NOT_ALLOWED'
        })
      };
    }

    const stats = performanceMonitor.getStats();
    const environmentStatus = {
      hasApiKey: !!process.env.RAPIDAPI_KEY,
      logLevel: process.env.LOG_LEVEL || 'info',
      nodeEnv: process.env.NODE_ENV || 'production',
      rateLimitConfig: {
        maxCallsPerMinute: rateLimiter.maxCallsPerMinute,
        currentCalls: rateLimiter.calls.length
      }
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        environment: environmentStatus,
        performance: stats,
        uptime: stats.uptime
      })
    };
    
  } catch (error) {
    logger.error('Health check failed', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      })
    };
  }
};

// Export internal functions for unit testing (if needed)
if (process.env.NODE_ENV === 'test') {
  module.exports = {
    ...module.exports,
    // Internal functions for testing
    validateSubject,
    extractFieldData,
    rateLimiter,
    performanceMonitor,
    logger,
    generateErrorId,
    createUserFriendlyError,
    toSubjectModel,
    fetchCompositePlacementsViaApi,
    buildCompositePlacements,
    buildCompositeAspects,
    computeCompositeTransitsByDate,
    extractPlanetLongitudesFromApiResponse,
    circularMidpoint,
    angleSeparation
  };
}

/**
 * Calculate transit data for a given date range with batching and rate limiting
 * Processes multiple dates in parallel batches to optimize performance while respecting API limits
 * 
 * @param {Object} natalSubject - Validated natal subject data
 * @param {string} transitStartDate - Start date in YYYY-MM-DD format
 * @param {string} transitEndDate - End date in YYYY-MM-DD format  
 * @param {number} batchSize - Number of concurrent API calls (default: 5)
 * @param {string} requestId - Unique request ID for logging correlation
 * @returns {Promise<Object>} Object with date keys and transit aspect arrays as values
 * @throws {Error} If validation fails or date format is invalid
 */
async function calculateTransitData(natalSubject, transitStartDate, transitEndDate, step = 'daily', batchSize = 5, requestId = null) {
  logger.info('Starting transit calculation', { 
    natalSubject: natalSubject.name, 
    startDate: transitStartDate, 
    endDate: transitEndDate,
    batchSize,
    step
  }, requestId);
  
  // Validate natal subject has all required fields
  const validation = validateSubject(natalSubject, 'Natal subject for transits');
  if (!validation.isValid) {
    logger.error('Natal subject validation failed for transits', validation, requestId);
    throw new Error(`Transit calculation failed: ${validation.userMessage}`);
  }
  
  logger.debug('Natal subject validation passed for transits', null, requestId);
  
  // Parse and validate date range
  const start = new Date(transitStartDate);
  const end = new Date(transitEndDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format. Please use YYYY-MM-DD format.');
  }
  
  if (start > end) {
    throw new Error('Start date must be before end date.');
  }
  
  // Calculate date range and warn for large ranges
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  if (daysDiff > 365) {
    logger.warn('Large date range requested', { days: daysDiff }, requestId);
  }
  
  logger.debug('Date range validation passed', { start, end, days: daysDiff }, requestId);
  
  const stepDays = (typeof step === 'number') ? Math.max(1, step | 0) : (step === 'weekly' ? 7 : 1);
  const maxPoints = parseInt(process.env.MAX_TRANSIT_POINTS) || 40;
  const transitDataByDate = {};
  const dates = [];
  // Generate array of all dates in the range with step sizing
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + stepDays)) {
    dates.push(new Date(d));
  }
  if (dates.length > maxPoints) {
    logger.warn('Transit date count exceeds cap; truncating', { requested: dates.length, cap: maxPoints }, requestId);
    dates.length = maxPoints;
    transitDataByDate._truncated = true;
  }
  
  // Process dates in batches to avoid overwhelming the API
  for (let i = 0; i < dates.length; i += batchSize) {
    const batch = dates.slice(i, i + batchSize);
    const batchNumber = Math.floor(i/batchSize) + 1;
    const totalBatches = Math.ceil(dates.length/batchSize);
    
    logger.debug(`Processing batch ${batchNumber}/${totalBatches}`, { 
      batchSize: batch.length, 
      dates: batch.map(d => d.toISOString().split('T')[0]) 
    }, requestId);
    
    // Create promises for all dates in this batch
    const batchPromises = batch.map(async (date) => {
      const dateStr = date.toISOString().split('T')[0];
      
      try {
        // Create configurable transit subject for this specific date
        const transitSubject = {
          ...DEFAULT_TRANSIT_CONFIG,
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate()
        };
        
        // Override with environment-specific transit location if configured
        if (process.env.TRANSIT_CITY) transitSubject.city = process.env.TRANSIT_CITY;
        if (process.env.TRANSIT_NATION) transitSubject.nation = process.env.TRANSIT_NATION;
        if (process.env.TRANSIT_LATITUDE) transitSubject.latitude = parseFloat(process.env.TRANSIT_LATITUDE);
        if (process.env.TRANSIT_LONGITUDE) transitSubject.longitude = parseFloat(process.env.TRANSIT_LONGITUDE);
        if (process.env.TRANSIT_TIMEZONE) transitSubject.timezone = process.env.TRANSIT_TIMEZONE;
        
        logger.debug(`Transit subject for ${dateStr}`, transitSubject, requestId);
        
        const requestBody = {
          first_subject: natalSubject,
          transit_subject: transitSubject
        };
        
        // Make API call with retry logic and error handling
        const response = await apiCallWithRetry(
          API_TRANSIT_URL,
          {
            method: 'POST',
            headers: buildHeaders(),
            body: JSON.stringify(requestBody)
          },
          `Transit calculation for ${dateStr}`
        );
        
        logger.debug(`Transit API response for ${dateStr}`, { 
          responseKeys: Object.keys(response),
          hasAspects: !!response.aspects,
          aspectCount: response.aspects?.length || 0
        }, requestId);
        
        // Extract aspects from response according to API documentation
        let aspects = [];
        if (response.aspects && Array.isArray(response.aspects)) {
          aspects = response.aspects;
        } else if (response.data && response.data.aspects && Array.isArray(response.data.aspects)) {
          // Fallback for different response structure
          aspects = response.data.aspects;
        } else {
          logger.warn(`No aspects found in response for ${dateStr}`, { 
            responseStructure: Object.keys(response) 
          }, requestId);
        }
        
        return { date: dateStr, aspects };
        
      } catch (error) {
        logger.error(`Transit calculation failed for ${dateStr}`, error, requestId);
        // Return error result but don't fail the entire operation
        return { date: dateStr, aspects: [], error: error.message };
      }
    });
    
    try {
      // Wait for all promises in this batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Process results and add to main data structure
      for (const result of batchResults) {
        if (result.aspects.length > 0) {
          transitDataByDate[result.date] = result.aspects;
          logger.debug(`Added ${result.aspects.length} transits for ${result.date}`, null, requestId);
        } else if (result.error) {
          logger.warn(`Skipped ${result.date} due to error: ${result.error}`, null, requestId);
        } else {
          logger.debug(`No transits found for ${result.date}`, null, requestId);
        }
      }
      
      // Add configurable delay between batches to respect API rate limits
      if (i + batchSize < dates.length) {
        const delay = parseInt(process.env.TRANSIT_BATCH_DELAY) || 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      logger.error(`Batch processing failed for dates ${batch[0].toISOString().split('T')[0]} to ${batch[batch.length-1].toISOString().split('T')[0]}`, error, requestId);
      // Continue with next batch rather than failing completely
    }
  }
  
  // Calculate and log success metrics
  const successfulDates = Object.keys(transitDataByDate).length;
  const totalDates = dates.length;
  const successRate = totalDates > 0 ? Math.round((successfulDates/totalDates) * 100) : 0;
  
  logger.info('Transit calculation completed', { 
    successfulDates, 
    totalDates, 
    successRate: `${successRate}%` 
  }, requestId);
  
  if (successfulDates === 0) {
    logger.warn('No transit data was successfully calculated', null, requestId);
  }
  
  return transitDataByDate;
}
