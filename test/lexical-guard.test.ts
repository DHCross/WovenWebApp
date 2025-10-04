/**
 * Tests for Lexical Guard Module
 * Validates semantic orthogonality and prevents axis terminology bleed
 */

import {
  lintText,
  lintReading,
  lintPayload,
  generateLexicalReport,
  assertLexicalIntegrity,
  getSuggestedReplacements
} from '../src/validation/lexical-guard';

console.log('🧪 Running Lexical Guard Tests\n');

// Test 1: Lint clean directional text
console.log('Test 1: Lint Clean Directional Text');
const cleanDirectional = 'Strong outward expansion with opening pressure';
const result1 = lintText(cleanDirectional, 'directional', 'bias_label');
console.log('  Text:', cleanDirectional);
console.log('  Valid:', result1.valid);
console.log('  Violations:', result1.violations.length);
if (result1.valid && result1.violations.length === 0) {
  console.log('  ✅ PASS: Clean directional text accepted\n');
} else {
  console.log('  ❌ FAIL: Should accept clean directional text\n');
}

// Test 2: Detect directional term in cohesion context
console.log('Test 2: Detect Directional Term in Cohesion Context');
const bleedText1 = 'Strong expansion with harmony'; // expansion is directional!
const result2 = lintText(bleedText1, 'cohesion', 'sfd_label');
console.log('  Text:', bleedText1);
console.log('  Valid:', result2.valid);
console.log('  Violations:', result2.violations.length);
if (result2.violations.length > 0) {
  console.log('  Violation:', result2.violations[0].message);
}
if (!result2.valid && result2.violations[0]?.category === 'directional') {
  console.log('  ✅ PASS: Lexical bleed detected\n');
} else {
  console.log('  ❌ FAIL: Should detect directional term in cohesion context\n');
}

// Test 3: Detect cohesion term in directional context
console.log('Test 3: Detect Cohesion Term in Directional Context');
const bleedText2 = 'Outward pressure with friction'; // friction is cohesion!
const result3 = lintText(bleedText2, 'directional', 'bias_label');
console.log('  Text:', bleedText2);
console.log('  Valid:', result3.valid);
console.log('  Violations:', result3.violations.length);
if (result3.violations.length > 0) {
  console.log('  Violation:', result3.violations[0].message);
}
if (!result3.valid && result3.violations[0]?.category === 'cohesion') {
  console.log('  ✅ PASS: Cohesion bleed detected\n');
} else {
  console.log('  ❌ FAIL: Should detect cohesion term in directional context\n');
}

// Test 4: Lint complete reading object
console.log('Test 4: Lint Complete Reading Object');
const cleanReading = {
  magnitude: 3.5,
  bias_label: 'Strong outward expansion',
  sfd_label: 'High integration with harmony',
  support_friction: {
    sfd_label: 'Supportive cohesion'
  }
};

const dirtyReading = {
  magnitude: 3.5,
  bias_label: 'Strong expansion with friction', // friction in directional!
  sfd_label: 'High integration with opening' // opening in cohesion!
};

const result4a = lintReading(cleanReading);
const result4b = lintReading(dirtyReading);

console.log('  Clean reading valid:', result4a.valid);
console.log('  Dirty reading valid:', result4b.valid);
console.log('  Dirty reading violations:', result4b.violations.length);

if (result4a.valid && !result4b.valid && result4b.violations.length === 2) {
  console.log('  ✅ PASS: Reading lint working\n');
} else {
  console.log('  ❌ FAIL: Reading lint error\n');
}

// Test 5: Lint full payload with daily readings
console.log('Test 5: Lint Full Payload with Daily Readings');
const payload = {
  balance_meter: {
    bias_label: 'Outward pressure',
    sfd_label: 'High friction' // Clean
  },
  indices: {
    days: [
      {
        seismograph: {
          bias_label: 'Expansion with harmony', // harmony in directional!
          sfd_label: 'Support and alignment' // Clean
        }
      },
      {
        seismograph: {
          bias_label: 'Contraction phase', // Clean
          sfd_label: 'Tension and expansion' // expansion in cohesion!
        }
      }
    ]
  }
};

const result5 = lintPayload(payload);
console.log('  Payload valid:', result5.valid);
console.log('  Total violations:', result5.violations.length);
if (result5.violations.length > 0) {
  console.log('  First violation field:', result5.violations[0].field);
}

if (!result5.valid && result5.violations.length === 2) {
  console.log('  ✅ PASS: Payload lint detected all violations\n');
} else {
  console.log('  ❌ FAIL: Payload lint error (expected 2 violations)\n');
}

// Test 6: Generate lexical report
console.log('Test 6: Generate Lexical Report');
const report = generateLexicalReport(result5);
const reportLines = report.split('\n');
console.log('  Report lines:', reportLines.length);
console.log('  Contains violations:', report.includes('VIOLATIONS DETECTED'));
console.log('  Contains action required:', report.includes('ACTION REQUIRED'));

if (report.includes('VIOLATIONS DETECTED') && report.includes('ACTION REQUIRED') && reportLines.length > 10) {
  console.log('  ✅ PASS: Report generated\n');
} else {
  console.log('  ❌ FAIL: Report generation error\n');
}

// Test 7: Get suggested replacements
console.log('Test 7: Get Suggested Replacements');
const suggestions1 = getSuggestedReplacements('expansion', 'cohesion');
const suggestions2 = getSuggestedReplacements('friction', 'directional');

console.log('  Suggestions for "expansion" in cohesion:', suggestions1);
console.log('  Suggestions for "friction" in directional:', suggestions2);

if (suggestions1.length > 0 && suggestions2.length > 0) {
  console.log('  ✅ PASS: Suggestions provided\n');
} else {
  console.log('  ❌ FAIL: Should provide suggestions\n');
}

// Test 8: Assert integrity (throws on violations)
console.log('Test 8: Assert Integrity (Should Throw)');
try {
  assertLexicalIntegrity(payload, 'test-payload');
  console.log('  ❌ FAIL: Should have thrown error\n');
} catch (e) {
  console.log('  Error caught:', (e as Error).message.substring(0, 50) + '...');
  console.log('  ✅ PASS: Assertion correctly threw error\n');
}

// Test 9: Assert integrity with clean payload (should not throw)
console.log('Test 9: Assert Integrity with Clean Payload');
const cleanPayload = {
  balance_meter: {
    bias_label: 'Outward expansion',
    sfd_label: 'High harmony'
  }
};

try {
  assertLexicalIntegrity(cleanPayload, 'clean-payload');
  console.log('  ✅ PASS: Clean payload passed assertion\n');
} catch (e) {
  console.log('  ❌ FAIL: Clean payload should not throw\n');
}

// Summary
console.log('═'.repeat(50));
console.log('✨ Lexical Guard Tests Complete');
console.log('   Semantic orthogonality validated');
console.log('   Axis terminology bleed prevented');
