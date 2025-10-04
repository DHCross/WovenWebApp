#!/usr/bin/env node

/**
 * Spec Validation Script
 * Runs CI guards to verify spec integrity
 * 
 * Usage: node validate.js [--test=TEST-ID]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');

const SPEC_DIR = __dirname;
const SPEC_MD = path.join(SPEC_DIR, 'spec.md');

const tests = [];
let failureCount = 0;

// Test result tracking
function addTest(id, name, fn) {
  tests.push({ id, name, fn });
}

function pass(msg) {
  console.log(`   ✅ ${msg}`);
}

function fail(msg) {
  console.log(`   ❌ ${msg}`);
  failureCount++;
}

function warn(msg) {
  console.log(`   ⚠️  ${msg}`);
}

// Define tests

addTest('TEST-001', 'Multi-Format Generation', () => {
  const requiredFiles = [
    'spec.md',
    'spec.html',
    'spec.txt',
    'manifest.yaml',
    'api/meta.json',
    'api/anchors.json',
    'api/glossary.json',
    'index.html'
  ];
  
  let allPresent = true;
  requiredFiles.forEach(file => {
    const filePath = path.join(SPEC_DIR, file);
    if (fs.existsSync(filePath)) {
      pass(`${file} exists`);
    } else {
      fail(`${file} missing`);
      allPresent = false;
    }
  });
  
  return allPresent;
});

addTest('TEST-003', 'Section Count Verification', () => {
  const specContent = fs.readFileSync(SPEC_MD, 'utf-8');
  const htmlContent = fs.readFileSync(path.join(SPEC_DIR, 'spec.html'), 'utf-8');
  
  const mdSections = (specContent.match(/\{#(§?[\d.]+[\w-]*)\}/g) || []).length;
  const htmlSections = (htmlContent.match(/id="(§?[\d.]+[\w-]*)"/g) || []).length;
  
  console.log(`   Markdown sections: ${mdSections}`);
  console.log(`   HTML sections: ${htmlSections}`);
  
  if (mdSections === htmlSections && mdSections > 0) {
    pass(`Section count matches (${mdSections})`);
    return true;
  } else {
    fail(`Section count mismatch (MD: ${mdSections}, HTML: ${htmlSections})`);
    return false;
  }
});

addTest('TEST-004', 'Anchor Parity', () => {
  const specContent = fs.readFileSync(SPEC_MD, 'utf-8');
  const htmlContent = fs.readFileSync(path.join(SPEC_DIR, 'spec.html'), 'utf-8');
  
  const mdAnchors = (specContent.match(/\{#(§?[\d.]+[\w-]*)\}/g) || [])
    .map(m => m.replace(/\{#|}/g, ''));
  const uniqueMdAnchors = [...new Set(mdAnchors)];
  
  let allFound = true;
  uniqueMdAnchors.forEach(anchor => {
    if (htmlContent.includes(`id="${anchor}"`)) {
      // OK
    } else {
      fail(`Anchor ${anchor} missing in HTML`);
      allFound = false;
    }
  });
  
  if (allFound) {
    pass(`All ${uniqueMdAnchors.length} anchors present in HTML`);
  }
  
  return allFound;
});

addTest('TEST-005', 'Line Anchor Density', () => {
  const specContent = fs.readFileSync(SPEC_MD, 'utf-8');
  const lines = specContent.split('\n');
  const anchors = (specContent.match(/`\[L\d+\]`/g) || []);
  
  const density = anchors.length / lines.length;
  console.log(`   Total lines: ${lines.length}`);
  console.log(`   Line anchors: ${anchors.length}`);
  console.log(`   Density: ${density.toFixed(3)}`);
  
  if (density >= 0.08 && density <= 0.25) {
    pass(`Density within range (0.08-0.25)`);
    return true;
  } else if (density > 0) {
    warn(`Density outside ideal range but present`);
    return true;
  } else {
    fail(`No line anchors found`);
    return false;
  }
});

addTest('TEST-006', 'Manifest Hash Verification', () => {
  const manifestPath = path.join(SPEC_DIR, 'manifest.yaml');
  if (!fs.existsSync(manifestPath)) {
    fail('manifest.yaml missing');
    return false;
  }
  
  const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
  const manifest = yaml.load(manifestContent);
  
  let allMatch = true;
  manifest.artifacts.forEach(artifact => {
    const filePath = path.join(SPEC_DIR, artifact.file);
    if (!fs.existsSync(filePath)) {
      warn(`${artifact.file} listed in manifest but not found`);
      return;
    }
    
    const content = fs.readFileSync(filePath);
    const actualHash = crypto.createHash('sha256').update(content).digest('hex');
    
    if (actualHash === artifact.sha256) {
      pass(`${artifact.file} hash matches`);
    } else {
      fail(`${artifact.file} hash mismatch`);
      console.log(`      Expected: ${artifact.sha256}`);
      console.log(`      Actual:   ${actualHash}`);
      allMatch = false;
    }
  });
  
  return allMatch;
});

addTest('TEST-007', 'Completeness Badge Accuracy', () => {
  const specContent = fs.readFileSync(SPEC_MD, 'utf-8');
  const testsContent = fs.readFileSync(path.join(SPEC_DIR, 'tests-acceptance.md'), 'utf-8');
  
  const badgeMatch = specContent.match(/This document contains (\d+) parts, (\d+) sections, .* (\d+) (acceptance )?tests/);
  if (!badgeMatch) {
    fail('Completeness badge not found in spec');
    return false;
  }
  
  const [, declaredParts, declaredSections, declaredTests] = badgeMatch;
  const actualSections = (specContent.match(/\{#(§?[\d.]+[\w-]*)\}/g) || []).length;
  const actualTests = (testsContent.match(/### TEST-\d+/g) || []).length;
  
  console.log(`   Declared: ${declaredParts} parts, ${declaredSections} sections, ${declaredTests} tests`);
  console.log(`   Actual: ${actualSections} sections, ${actualTests} tests`);
  
  let accurate = true;
  if (parseInt(declaredSections) !== actualSections) {
    fail(`Section count mismatch (badge: ${declaredSections}, actual: ${actualSections})`);
    accurate = false;
  }
  if (parseInt(declaredTests) !== actualTests) {
    fail(`Test count mismatch (badge: ${declaredTests}, actual: ${actualTests})`);
    accurate = false;
  }
  
  if (accurate) {
    pass('Badge counts accurate');
  }
  
  return accurate;
});

addTest('TEST-011', 'Plain Text Size Limit', () => {
  const txtPath = path.join(SPEC_DIR, 'spec.txt');
  if (!fs.existsSync(txtPath)) {
    fail('spec.txt missing');
    return false;
  }
  
  const stats = fs.statSync(txtPath);
  const sizeKB = stats.size / 1024;
  const sizeMB = sizeKB / 1024;
  
  console.log(`   Size: ${sizeKB.toFixed(2)} KB (${sizeMB.toFixed(3)} MB)`);
  
  if (stats.size < 1024 * 1024) {
    pass('Under 1 MB size limit');
    return true;
  } else {
    fail(`Exceeds 1 MB limit (${sizeMB.toFixed(2)} MB)`);
    return false;
  }
});

addTest('TEST-012', 'Glossary Completeness', () => {
  const glossaryContent = fs.readFileSync(path.join(SPEC_DIR, 'glossary.md'), 'utf-8');
  const terms = (glossaryContent.match(/\*\*[A-Z][A-Za-z\s/()]+\*\*/g) || []);
  
  console.log(`   Terms found: ${terms.length}`);
  
  if (terms.length >= 34) {
    pass(`Meets minimum requirement (≥34)`);
    return true;
  } else {
    fail(`Below minimum (found ${terms.length}, need ≥34)`);
    return false;
  }
});

addTest('TEST-013', 'Data Tables Present', () => {
  const specContent = fs.readFileSync(SPEC_MD, 'utf-8');
  
  const requiredTables = [
    'PLANET.*SIGN.*DEGREE.*HOUSE',
    'PLANET A.*ASPECT.*PLANET B',
    'HOUSE.*SIGN.*DEGREE.*QUALITY'
  ];
  
  let allPresent = true;
  requiredTables.forEach((pattern, idx) => {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(specContent)) {
      pass(`Table ${idx + 1} present`);
    } else {
      fail(`Table ${idx + 1} missing (pattern: ${pattern})`);
      allPresent = false;
    }
  });
  
  return allPresent;
});

addTest('TEST-015', 'JSON API Schema Validation', () => {
  const apiFiles = [
    'api/meta.json',
    'api/anchors.json',
    'api/glossary.json'
  ];
  
  let allValid = true;
  apiFiles.forEach(file => {
    const filePath = path.join(SPEC_DIR, file);
    if (!fs.existsSync(filePath)) {
      fail(`${file} missing`);
      allValid = false;
      return;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      JSON.parse(content);
      pass(`${file} is valid JSON`);
    } catch (error) {
      fail(`${file} invalid JSON: ${error.message}`);
      allValid = false;
    }
  });
  
  return allValid;
});

addTest('TEST-016', 'Quick Context Size', () => {
  const limits = {
    'api/meta.json': 10,
    'api/glossary.json': 50,
    'tests-acceptance.md': 20
  };
  
  let allWithinLimits = true;
  Object.entries(limits).forEach(([file, limitKB]) => {
    const filePath = path.join(SPEC_DIR, file);
    if (!fs.existsSync(filePath)) {
      warn(`${file} missing (skipping size check)`);
      return;
    }
    
    const stats = fs.statSync(filePath);
    const sizeKB = stats.size / 1024;
    
    if (sizeKB < limitKB) {
      pass(`${file}: ${sizeKB.toFixed(2)} KB (< ${limitKB} KB)`);
    } else {
      fail(`${file}: ${sizeKB.toFixed(2)} KB (exceeds ${limitKB} KB limit)`);
      allWithinLimits = false;
    }
  });
  
  return allWithinLimits;
});

addTest('TEST-017', 'No External Tool Requirements', () => {
  const txtPath = path.join(SPEC_DIR, 'spec.txt');
  const htmlPath = path.join(SPEC_DIR, 'spec.html');
  
  let accessible = true;
  
  if (fs.existsSync(txtPath)) {
    const txtContent = fs.readFileSync(txtPath, 'utf-8');
    if (txtContent.length > 0) {
      pass('spec.txt is readable');
    } else {
      fail('spec.txt is empty');
      accessible = false;
    }
  } else {
    fail('spec.txt missing');
    accessible = false;
  }
  
  if (fs.existsSync(htmlPath)) {
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    if (htmlContent.includes('<!DOCTYPE html>') && !htmlContent.includes('<script src=')) {
      pass('spec.html is standalone');
    } else if (htmlContent.length > 0) {
      warn('spec.html may have external dependencies');
    } else {
      fail('spec.html is empty');
      accessible = false;
    }
  } else {
    fail('spec.html missing');
    accessible = false;
  }
  
  return accessible;
});

// Main validation runner
async function validate() {
  console.log('🔍 Validating Symbolic Weather Directive Specs...\n');
  
  const args = process.argv.slice(2);
  const testFilter = args.find(arg => arg.startsWith('--test='))?.split('=')[1];
  
  const testsToRun = testFilter 
    ? tests.filter(t => t.id === testFilter)
    : tests;
  
  if (testsToRun.length === 0) {
    console.error(`❌ No tests found matching filter: ${testFilter}`);
    process.exit(1);
  }
  
  console.log(`Running ${testsToRun.length} tests...\n`);
  
  for (const test of testsToRun) {
    console.log(`\n${test.id}: ${test.name}`);
    try {
      test.fn();
    } catch (error) {
      fail(`Test threw error: ${error.message}`);
    }
  }
  
  console.log('\n' + '─'.repeat(60));
  console.log(`\n📊 SUMMARY: ${testsToRun.length - failureCount}/${testsToRun.length} tests passed`);
  
  if (failureCount === 0) {
    console.log('✅ STATUS: READY FOR RELEASE\n');
    process.exit(0);
  } else {
    console.log(`❌ STATUS: ${failureCount} FAILURE(S) — BLOCKED\n`);
    process.exit(1);
  }
}

// Run validation
validate();
