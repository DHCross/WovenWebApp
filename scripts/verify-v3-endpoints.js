const orchestrator = require('../src/math-brain/orchestrator.js');

console.log('Verifying Math Brain Orchestrator Exports...');

const expectedFunctions = [
    'getPositions',
    'getHouseCusps',
    'getAspects',
    'getLunarMetrics',
    'getGlobalPositions',
    'getCurrentData'
];

const missing = [];

expectedFunctions.forEach(fnName => {
    if (typeof orchestrator[fnName] === 'function') {
        console.log(`✅ ${fnName} is exported correctly.`);
    } else {
        console.error(`❌ ${fnName} is MISSING!`);
        missing.push(fnName);
    }
});

if (missing.length === 0) {
    console.log('\nAll new v3 endpoints are correctly integrated into the orchestrator.');
    process.exit(0);
} else {
    console.error('\nSome functions are missing from the orchestrator export.');
    process.exit(1);
}
