/*
 * Test for export filename utilities
 * Verifies that each export type has a distinct, recognizable filename
 */

const {
  getDirectivePrefix,
  getExportFilename,
  getDirectiveSuffix
} = require('../lib/export/filename-utils');

function testDistinctPrefixes() {
  console.log('Testing: All export types have distinct prefixes');

  const types = [
    'mirror-directive',
    'mirror-symbolic-weather',
    'fieldmap',
    'symbolic-weather',
    'dashboard',
    'weather-log',
    'engine-config',
    'ai-bundle'
  ];

  const prefixes = types.map(type => getDirectivePrefix(type));
  const uniquePrefixes = new Set(prefixes);

  if (prefixes.length !== uniquePrefixes.size) {
    throw new Error('Duplicate prefixes detected!');
  }

  console.log('Prefixes generated:');
  types.forEach((type, i) => {
    console.log(`  ${type}: "${prefixes[i]}"`);
  });

  return 'PASS: All export types have distinct prefixes';
}

function testMirrorVsSymbolicWeatherDistinction() {
  console.log('\nTesting: Mirror_Report vs Mirror+SymbolicWeather distinction');

  const mirrorPrefix = getDirectivePrefix('mirror-directive');
  const symbolicPrefix = getDirectivePrefix('mirror-symbolic-weather');

  if (mirrorPrefix === symbolicPrefix) {
    throw new Error('Mirror and Symbolic Weather prefixes are identical!');
  }

  // Generate full filenames with same suffix
  const personA = 'dan';
  const personB = 'stephie';
  const dateRange = '2024-11-01-to-2024-11-30';

  const mirrorFile = getExportFilename('mirror-directive', personA, personB, dateRange);
  const symbolicFile = getExportFilename('mirror-symbolic-weather', personA, personB, dateRange);

  console.log(`  Mirror Directive: "${mirrorFile}"`);
  console.log(`  Mirror+Symbolic:  "${symbolicFile}"`);

  if (mirrorFile === symbolicFile) {
    throw new Error('Generated filenames are identical!');
  }

  return 'PASS: Mirror_Report and Mirror+SymbolicWeather have distinct filenames';
}

function testSuffixConsistency() {
  console.log('\nTesting: Suffix generation is consistent');

  const personA = 'alice';
  const personB = 'bob';
  const dateRange = '2024-10-01-to-2024-10-31';

  const suffix = getDirectiveSuffix(personA, personB, dateRange);
  const expectedSuffix = `${personA}-${personB}_${dateRange}`;

  if (suffix !== expectedSuffix) {
    throw new Error(`Suffix mismatch: expected "${expectedSuffix}", got "${suffix}"`);
  }

  console.log(`  Suffix: "${suffix}"`);

  return 'PASS: Suffix generation is consistent';
}

function testSoloVsRelationalFilenames() {
  console.log('\nTesting: Solo vs Relational filename distinction');

  const personA = 'dan';
  const dateRange = '2024-11-01-to-2024-11-30';

  // Solo (no Person B)
  const soloFile = getExportFilename('mirror-directive', personA, null, dateRange);

  // Relational (with Person B)
  const relationalFile = getExportFilename('mirror-directive', personA, 'stephie', dateRange);

  console.log(`  Solo:       "${soloFile}"`);
  console.log(`  Relational: "${relationalFile}"`);

  if (soloFile === relationalFile) {
    throw new Error('Solo and relational filenames are identical!');
  }

  // Solo should not contain hyphen between names
  if (soloFile.includes('dan-')) {
    throw new Error('Solo filename incorrectly contains name separator');
  }

  // Relational should contain hyphen between names
  if (!relationalFile.includes('dan-stephie')) {
    throw new Error('Relational filename missing name separator');
  }

  return 'PASS: Solo and Relational filenames are distinct';
}

function testAllExportTypesGenerate() {
  console.log('\nTesting: All export types generate valid filenames');

  const types = [
    'mirror-directive',
    'mirror-symbolic-weather',
    'fieldmap',
    'symbolic-weather',
    'dashboard',
    'weather-log',
    'engine-config',
    'ai-bundle'
  ];

  types.forEach(type => {
    const filename = getExportFilename(type, 'test', null, 'dates');

    if (!filename || filename.length < 10) {
      throw new Error(`Invalid filename generated for type: ${type}`);
    }

    if (!filename.endsWith('.json')) {
      throw new Error(`Filename missing .json extension: ${filename}`);
    }
  });

  return 'PASS: All export types generate valid filenames';
}

// Run all tests
(async () => {
  const results = [];

  try {
    results.push(testDistinctPrefixes());
    results.push(testMirrorVsSymbolicWeatherDistinction());
    results.push(testSuffixConsistency());
    results.push(testSoloVsRelationalFilenames());
    results.push(testAllExportTypesGenerate());

    console.log('\n=== All Tests Passed ===');
    results.forEach(r => console.log(r));
    process.exit(0);
  } catch (err) {
    console.error('\n=== Test Failed ===');
    console.error('FAIL:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
