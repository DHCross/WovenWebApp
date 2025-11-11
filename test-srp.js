// Simple test script for SRP Mapper
const { mapAspectToSRP } = require('./lib/srp/mapper');

// Enable SRP for this test
process.env.ENABLE_SRP = 'true';

// Test cases
const testCases = [
  { label: 'Sun square Moon (3.2°)', resonance: 'WB' },
  { label: 'Mars trine Jupiter (1.8°)', resonance: 'OSR' },
  { label: 'Venus opposition Saturn (0.9°)', resonance: 'ABE' },
  { label: 'Mercury square Pluto (2.5°)', resonance: 'WB' },
  { label: 'Jupiter sextile Sun (1.2°)', resonance: 'OSR' }
];

console.log('Testing SRP Mapper...\n');

testCases.forEach((test, i) => {
  console.log(`Test ${i + 1}: ${test.label}`);
  try {
    const result = mapAspectToSRP(test.label, test.resonance);
    if (result) {
      console.log('✅ Success!');
      console.log('   Blend ID:', result.blendId);
      console.log('   Hinge Phrase:', result.hingePhrase);
      if (result.shadowRef) {
        console.log('   Shadow ID:', result.shadowRef.shadowId);
      }
    } else {
      console.log('❌ No result returned');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  console.log('');
});
