/**
 * Simple logger utility for the feedback system
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

function shouldLog(level) {
  return levels[level] <= levels[LOG_LEVEL];
}

function formatMessage(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const contextStr = Object.keys(context).length > 0 ? JSON.stringify(context) : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message} ${contextStr}`;
}

const logger = {
  error: (message, context = {}) => {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message, context));
    }
  },
  
  warn: (message, context = {}) => {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, context));
    }
  },
  
  info: (message, context = {}) => {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message, context));
    }
  },
  
  debug: (message, context = {}) => {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message, context));
    }
  }
};

module.exports = logger;