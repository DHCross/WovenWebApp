// Direct test of the mapper module
const { mapAspectToSRP } = require('./mapper');

// Test cases
const testCases = [
  'Sun square Moon (3.2°)',
  'Mars trine Jupiter (1.8°)',
  'Venus opposition Saturn (0.9°)',
  'Mercury square Pluto (2.5°)',
  'Jupiter sextile Sun (1.2°)'
];

console.log('Testing SRP Mapper Directly...\n');

testCases.forEach((label, i) => {
  console.log(`Test ${i + 1}: ${label}`);
  try {
    const result = mapAspectToSRP(label, 'WB');
    console.log('✅ Success!');
    console.log('   Blend ID:', result?.blendId || 'N/A');
    console.log('   Hinge Phrase:', result?.hingePhrase || 'N/A');
    if (result?.shadowRef) {
      console.log('   Shadow ID:', result.shadowRef.shadowId);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  console.log('');
});
