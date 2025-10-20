// Secure logging utility with multiple levels and sensitive data protection.
// Relocated out of netlify/functions so Netlify stops packaging it as a Lambda.
const logger = {
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
          sanitized[key] = logger.sanitize(sanitized[key]);
        }
      }
      return sanitized;
    }
    return data;
  },
  debug: (msg, data, errorId) => {
    if (process.env.LOG_LEVEL === 'debug') {
      const sanitizedData = logger.sanitize(data);
      const prefix = errorId ? `[${errorId}] DEBUG: ${msg}` : `DEBUG: ${msg}`;
      console.log(prefix, sanitizedData ? JSON.stringify(sanitizedData, null, 2) : '');
    }
  },
  info: (msg, data, errorId) => {
    const sanitizedData = logger.sanitize(data);
    const prefix = errorId ? `[${errorId}] INFO: ${msg}` : `INFO: ${msg}`;
    console.log(prefix, sanitizedData ? JSON.stringify(sanitizedData, null, 2) : '');
  },
  warn: (msg, data, errorId) => {
    const sanitizedData = logger.sanitize(data);
    const prefix = errorId ? `[${errorId}] WARN: ${msg}` : `WARN: ${msg}`;
    console.warn(prefix, sanitizedData ? JSON.stringify(sanitizedData, null, 2) : '');
  },
  error: (msg, error, errorId) => {
    const sanitizedError = logger.sanitize(error);
    const prefix = errorId ? `[${errorId}] ERROR: ${msg}` : `ERROR: ${msg}`;
    console.error(prefix, sanitizedError);
  }
};

module.exports = logger;
