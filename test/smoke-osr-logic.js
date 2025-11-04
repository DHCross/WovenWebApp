/*
 * Smoke test for OSR detection logic (without server)
 * Tests the classification functions directly
 */

// Mock the OSR detection functions (copied from route.ts)
function checkForOSRIndicators(text) {
  const lower = text.toLowerCase();
  const osrPhrases = [
    'doesn\'t feel familiar',
    'doesn\'t resonate',
    'not me',
    'doesn\'t sound like me',
    'not familiar',
    'doesn\'t ring true',
    'not quite right',
    'off the mark',
    'doesn\'t match',
    'not accurate',
    'not really me'
  ];
  
  return osrPhrases.some(phrase => lower.includes(phrase));
}

function checkForClearAffirmation(text) {
  const lower = text.toLowerCase();
  const clearAffirmPhrases = [
    'that\'s familiar',
    'feels familiar',
    'that resonates',
    'resonates with me',
    'exactly',
    'that\'s me',
    'spot on',
    'that hits',
    'so true',
    'absolutely',
    'definitely me',
    'that\'s accurate',
    'yes, that\'s right',
    'that\'s it exactly',
    'i just said it was',
    'it was',
    'it is',
    'that is',
    'yes it is',
    'yes that is',
    'that\'s right',
    'correct',
    'true'
  ];
  
  if (/^yes\b/i.test(text.trim())) return true;
  
  return clearAffirmPhrases.some(phrase => lower.includes(phrase));
}

function checkForReadingStartRequest(text) {
  const lower = text.toLowerCase();
  const startReadingPhrases = [
    'give me the reading',
    'start the reading',
    'begin the reading',
    'continue with the reading',
    'show me the reading',
    'start the mirror',
    'give me the mirror',
    'show me the mirror',
    'start mirror flow',
    'give me mirror flow',
    'show me mirror flow',
    'start symbolic weather',
    'give me symbolic weather',
    'show me symbolic weather',
    'let\'s begin',
    'let\'s start',
    'please continue',
    'go ahead',
    'proceed'
  ];
  
  return startReadingPhrases.some(phrase => lower.includes(phrase));
}

function checkForPartialAffirmation(text) {
  const lower = text.toLowerCase();
  const partialPhrases = [
    'sort of',
    'kind of',
    'partly',
    'somewhat',
    'maybe',
    'i think so',
    'possibly',
    'in a way',
    'to some extent'
  ];
  
  return partialPhrases.some(phrase => lower.includes(phrase));
}

function classifyUserResponse(text) {
  if (checkForReadingStartRequest(text)) return 'CLEAR_WB';
  if (checkForClearAffirmation(text)) return 'CLEAR_WB';
  if (checkForPartialAffirmation(text)) return 'PARTIAL_ABE';
  if (checkForOSRIndicators(text)) return 'OSR';
  return 'UNCLEAR';
}

// Test cases
const testCases = [
  {
    input: 'Give me mirror flow and symbolic weather for relational',
    expected: 'CLEAR_WB',
    description: 'Original problem case - should be CLEAR_WB, not OSR'
  },
  {
    input: 'start the reading',
    expected: 'CLEAR_WB',
    description: 'Simple start command'
  },
  {
    input: 'let\'s begin',
    expected: 'CLEAR_WB',
    description: 'Casual start command'
  },
  {
    input: 'please continue',
    expected: 'CLEAR_WB',
    description: 'Polite continuation'
  },
  {
    input: 'That doesn\'t resonate with me at all',
    expected: 'OSR',
    description: 'Actual OSR - should still be detected'
  },
  {
    input: 'That doesn\'t feel familiar',
    expected: 'OSR',
    description: 'Another OSR phrase'
  },
  {
    input: 'yes, that\'s right',
    expected: 'CLEAR_WB',
    description: 'Clear affirmation'
  },
  {
    input: 'kind of',
    expected: 'PARTIAL_ABE',
    description: 'Partial affirmation'
  },
  {
    input: 'what do you think about this?',
    expected: 'UNCLEAR',
    description: 'Unclear response'
  }
];

console.log('=== OSR Logic Smoke Test ===\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = classifyUserResponse(testCase.input);
  const isPass = result === testCase.expected;
  
  if (isPass) {
    passed++;
    console.log(`✓ Test ${index + 1}: ${testCase.description}`);
  } else {
    failed++;
    console.log(`✗ Test ${index + 1}: ${testCase.description}`);
    console.log(`  Input: "${testCase.input}"`);
    console.log(`  Expected: ${testCase.expected}`);
    console.log(`  Got: ${result}`);
  }
});

console.log(`\n=== Results ===`);
console.log(`Passed: ${passed}/${testCases.length}`);
console.log(`Failed: ${failed}/${testCases.length}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n✓ All tests passed!');
  process.exit(0);
}
