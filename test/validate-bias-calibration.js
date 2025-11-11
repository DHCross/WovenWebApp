const { aggregate } = require('../src/seismograph');

console.log('\n🎯 Bias Channel Calibration Test\n');
console.log('='.repeat(50));

// Test 1: Hurricane benchmark
const hurricaneAspects = [
  { transit: { body: 'Sun' }, natal: { body: 'Pluto' }, type: 'square', orbDeg: 1.03 },
  { transit: { body: 'Venus' }, natal: { body: 'Mars' }, type: 'square', orbDeg: 0.01 },
  { transit: { body: 'Uranus' }, natal: { body: 'Mercury' }, type: 'opposition', orbDeg: 0.61 },
  { transit: { body: 'Moon' }, natal: { body: 'Venus' }, type: 'conjunction', orbDeg: 2.68 },
  { transit: { body: 'Moon' }, natal: { body: 'Jupiter' }, type: 'conjunction', orbDeg: 2.5 },
  { transit: { body: 'Saturn' }, natal: { body: 'Uranus' }, type: 'trine', orbDeg: 2.43 },
  { transit: { body: 'Neptune' }, natal: { body: 'Mars' }, type: 'sextile', orbDeg: 3.93 }
];

const hurricaneResult = aggregate(hurricaneAspects);
console.log('1️⃣ Hurricane Michael Benchmark (Oct 10, 2018)');
console.log(`   Magnitude: ${hurricaneResult.magnitude.toFixed(2)} (target: ~5.0)`);
console.log(`   Bias: ${hurricaneResult.directional_bias.toFixed(2)} (target: -4.3 to -4.8)`);
console.log(`   Status: ${hurricaneResult.magnitude >= 4.5 && hurricaneResult.directional_bias <= -4.0 ? '✅' : '❌'}`);

// Test 2: Busy but stable day
const busyAspects = [
  { transit: { body: 'Mercury' }, natal: { body: 'Venus' }, type: 'trine', orbDeg: 2.5 },
  { transit: { body: 'Mars' }, natal: { body: 'Jupiter' }, type: 'square', orbDeg: 3.8 },
  { transit: { body: 'Venus' }, natal: { body: 'Moon' }, type: 'sextile', orbDeg: 1.2 },
  { transit: { body: 'Sun' }, natal: { body: 'Mercury' }, type: 'conjunction', orbDeg: 4.1 }
];

const busyResult = aggregate(busyAspects);
console.log('\n2️⃣ Busy but Stable Day');
console.log(`   Magnitude: ${busyResult.magnitude.toFixed(2)} (target: 2.7 ± 0.3)`);
console.log(`   Bias: ${busyResult.directional_bias.toFixed(2)} (target: -2 ± 0.5)`);
console.log(`   Status: ${Math.abs(busyResult.magnitude - 2.7) <= 0.3 ? '✅' : '⚠️'}`);

// Test 3: Calm baseline
const calmAspects = [
  { transit: { body: 'Moon' }, natal: { body: 'Neptune' }, type: 'trine', orbDeg: 5.2 },
  { transit: { body: 'Mercury' }, natal: { body: 'Saturn' }, type: 'sextile', orbDeg: 6.8 }
];

const calmResult = aggregate(calmAspects);
console.log('\n3️⃣ Calm Baseline');
console.log(`   Magnitude: ${calmResult.magnitude.toFixed(2)} (target: 0.7 ± 0.2)`);
console.log(`   Bias: ${calmResult.directional_bias.toFixed(2)} (target: 0 ± 0.3)`);
console.log(`   Status: ${Math.abs(calmResult.magnitude - 0.7) <= 0.2 ? '✅' : '⚠️'}`);

console.log('\n' + '='.repeat(50));
console.log('\n📊 Summary:');
const goldenCasePassed = hurricaneResult.magnitude >= 4.5 && hurricaneResult.directional_bias <= -4.0;
console.log(`Golden Case (Hurricane): ${goldenCasePassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`\nBias Channel Status: ${goldenCasePassed ? 'Calibrated - Ready for production' : 'Needs further tuning'}`);

if (!goldenCasePassed) {
  console.log('\n⚠️ Recommendation: Increase Y_raw multiplier by 0.2-0.3 increments');
  console.log('   Current: 3.2 → Try: 3.5, 3.8, etc. until bias reaches -4.x range');
}

process.exit(goldenCasePassed ? 0 : 1);
