/**
 * Health check endpoint for monitoring the astrology service
 * Accessible at /.netlify/functions/astrology-health
 */

// Import the health function from the main module
const { health } = require('../../lib/server/astrology-mathbrain.js');


// Export the health handler
exports.handler = health;
