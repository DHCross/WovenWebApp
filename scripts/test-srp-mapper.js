// Direct SRP Mapper Test
const { mapAspectToSRP } = require('../lib/srp/mapper');

// Enable SRP for this test
process.env.ENABLE_SRP = 'true';

// Test cases that should map to known blend IDs
const testCases = [
  // Sun-Uranus conjunction (should map to blend 1)
  {
    label: 'Sun conjunction Uranus (1.2°)',
    resonance: 'WB',
    expectedBlend: 1
  },
  // Moon-Saturn square (should map to a valid blend)
  {
    label: 'Moon square Saturn (2.8°)',
    resonance: 'OSR',
    expectedBlend: 2
  },
  // Venus-Mars trine (should map to a valid blend)
  {
    label: 'Venus trine Mars (1.5°)',
    resonance: 'ABE',
    expectedBlend: 3
  }
];

console.log('=== SRP Mapper Direct Test ===\n');

// Run tests
let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: "${testCase.label}"`);
  
  try {
    const result = mapAspectToSRP(testCase.label, testCase.resonance);
    
    if (!result) {
      console.error('  ❌ Failed: No result returned');
      failed++;
      return;
    }
    
    console.log('  ✅ Mapped to blend:', result.blendId);
    console.log('     Hinge Phrase:', result.hingePhrase);
    console.log('     Element Weave:', result.elementWeave);
    
    if (result.shadowRef) {
      console.log('     Shadow ID:', result.shadowRef.shadowId);
      console.log('     Restoration Cue:', result.shadowRef.restorationCue);
    }
    
    passed++;
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    failed++;
  }
  
  console.log('');
});

// Summary
console.log('=== Test Summary ===');
console.log(`Total: ${testCases.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('===================');

if (failed > 0) {
  process.exit(1); // Exit with error code if any tests failed
}
