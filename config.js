/**
 * Woven Map Application Configuration
 * This file centralizes all configuration settings to prevent hardcoding
 * and reduce the risk of endpoint or configuration errors.
 */
window.WovenMapConfig = {
    // API Configuration
    api: {
        baseUrl: '/api',
        endpoints: {
            astrologyMathBrain: '/api/astrology-mathbrain'
        },
        timeout: 30000 // 30 seconds
    },
    
    // Form Validation Configuration
    validation: {
        requiredFields: {
            person: [
                'year', 'month', 'day', 'hour', 'minute',
                'name', 'city', 'nation', 'latitude', 'longitude', 
                'zodiac_type', 'timezone'
            ]
        },
        coordinateFormats: {
            decimal: /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/,
            dms: /(\d+)[°\s]+(\d+)'?\s*([NS]),\s*(\d+)[°\s]+(\d+)'?\s*([EW])/i
        },
        dateFormats: {
            date: /^\d{4}-\d{2}-\d{2}$/,
            time: /^\d{2}:\d{2}$/
        }
    },
    
    // Default Values
    defaults: {
        zodiacType: 'Tropic',
        timezone: 'America/New_York',
        country: 'US'
    },
    
    // Environment Configuration
    environment: {
        isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
        enableDebugLogging: true
    }
};

/**
 * Utility function to get API endpoint URL
 * @param {string} endpointName - Name of the endpoint
 * @returns {string} - Full endpoint URL
 */
window.WovenMapConfig.getApiEndpoint = function(endpointName) {
    const endpoint = this.api.endpoints[endpointName];
    if (!endpoint) {
        throw new Error(`Unknown API endpoint: ${endpointName}`);
    }
    return endpoint;
};

/**
 * Utility function for debug logging
 * @param {string} message - Log message
 * @param {any} data - Optional data to log
 */
window.WovenMapConfig.debugLog = function(message, data = null) {
    if (this.environment.enableDebugLogging) {
        console.log(`[WovenMap Debug] ${message}`, data || '');
    }
};
