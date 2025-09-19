/**
 * Health check endpoint for monitoring the astrology service
 * Accessible at /.netlify/functions/astrology-health
 */

// Import the health function from the main module
const { health } = require('./astrology-mathbrain');

// Export the health handler
exports.handler = health;
