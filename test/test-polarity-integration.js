/**
 * Test Polarity Cards integration with extracted legacy functions
 */

import createMarkdownReadingEnhanced from '../src/formatter/create_markdown_reading_enhanced.js';

const testData = {
  geo: {
    aspects: [
      {
        p1_name: 'Mars',
        p2_name: 'Saturn',
        aspect: 'Square',
        orb: 2.3
      },
      {
        p1_name: 'Venus',
        p2_name: 'Jupiter',
        aspect: 'Trine',
        orb: 1.1
      },
      {
        p1_name: 'Moon',
        p2_name: 'Pluto',
        aspect: 'Opposition',
        orb: 3.5
      }
    ]
  },
  prov: {
    subject_name: 'Test Subject',
    reference_date: '2025-11-08',
    reader_id: 'test-reader'
  },
  options: {
    mode: 'Solo Mirror',
    relational: {
      shared_symbolic_climate: {
        magnitude: 3.2,
        valence: -1.5,
        volatility: 2.1
      }
    }
  }
};

console.log('Testing Polarity Cards Integration\n');
console.log('='.repeat(60));

try {
  const markdown = createMarkdownReadingEnhanced(testData);
  
  console.log(markdown);
  console.log('\n' + '='.repeat(60));
  
  // Verify expected elements
  const checks = {
    'Has FIELD sections': markdown.includes('**FIELD:**'),
    'Has VOICE sections': markdown.includes('**VOICE:**'),
    'No MAP in output': !markdown.includes('**MAP:**'),
    'Has somatic language': /friction|ease|tension|pull|pressure/.test(markdown),
    'Has conditional language': /may|might|could/.test(markdown),
    'Has Safe Lexicon descriptors': /(Whisper|Pulse|Wave|Surge|Peak|Apex)/.test(markdown),
    'Has Agency Hygiene': markdown.includes('Agency Hygiene')
  };
  
  console.log('\n✅ Verification Results:');
  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'} ${check}`);
  });
  
  const allPassed = Object.values(checks).every(v => v);
  console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  process.exit(allPassed ? 0 : 1);
  
} catch (error) {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
}
