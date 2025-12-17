const { enrichDailyAspects } = require('../lib/server/astrology-mathbrain');

const sampleAspects = [
    {
        "date": "2018-10-10",
        "exact_time": null,
        "transiting_planet": "Moon",
        "aspect_type": "square",
        "stationed_planet": "Jupiter",
        "orb": 0.56,
        "aspect_direction": "separating",
        "transiting_speed": 13.6,
        "transiting_house": 10,
        "natal_house": 12,
        "p1_name": "Moon",
        "p2_name": "Jupiter"
    }
];

// Mock orb profile helper since it's required inside the function
// We need to make sure the require path inside astrology-mathbrain resolves
// relative to THAT file.
// The file is at lib/server/astrology-mathbrain.js
// It requires '../config/orb-profiles' -> lib/config/orb-profiles.js
// That should exist.

console.log("Testing enrichDailyAspects with V3 data structure...");
const result = enrichDailyAspects(sampleAspects, 'wm-tight-2025-11-v5');

console.log("Filtered count:", result.filtered.length);
console.log("Rejections:", JSON.stringify(result.rejections, null, 2));

if (result.filtered.length === 1) {
    console.log("SUCCESS: Aspect was accepted.");
} else {
    console.error("FAILURE: Aspect was rejected.");
}
