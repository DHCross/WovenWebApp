// Quick diagnostic script to test the new report structure
// This will help us identify where the "Method Not Allowed" error is coming from

console.log("=== DIAGNOSTIC: Testing Report Generation ===");

// Test 1: Check if our new functions exist
const functionsToTest = [
    'generateClearMirrorReport',
    'generateBehavioralPatterns', 
    'generateTypologicalProfile',
    'generateHookStack',
    'generateBalanceMeterClimate'
];

functionsToTest.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
        console.log(`✅ ${funcName} is available`);
    } else {
        console.log(`❌ ${funcName} is NOT available`);
    }
});

// Test 2: Check the config
console.log("=== Config Check ===");
console.log("API endpoint:", window.WovenMapConfig?.getApiEndpoint('astrologyMathBrain'));
console.log("Full config:", window.WovenMapConfig);

// Test 3: Simulate a minimal data structure for report generation
const mockData = {
    person_a: {
        chart: {
            aspects: [
                {
                    p1_name: "Sun",
                    p2_name: "Mars",
                    aspect: "square",
                    orb: 2.1
                }
            ],
            planets: [],
            houses: [],
            signs: []
        },
        details: {
            name: "Test Person",
            birthDate: "1990-01-01",
            birthTime: "12:00 PM",
            birthCity: "New York",
            birthState: "NY"
        }
    },
    transitsByDate: {
        "2025-01-21": {
            seismograph: {
                magnitude: 2.5,
                valence: 1.2
            }
        }
    }
};

console.log("=== Testing Report Generation Locally ===");
try {
    if (typeof generateClearMirrorReport === 'function') {
        const report = generateClearMirrorReport(mockData);
        console.log("✅ Report generation succeeded locally");
        console.log("Report preview (first 500 chars):", report.substring(0, 500));
    } else {
        console.log("❌ generateClearMirrorReport function not found");
    }
} catch (error) {
    console.log("❌ Report generation failed:", error);
}

console.log("=== Diagnostic Complete ===");
