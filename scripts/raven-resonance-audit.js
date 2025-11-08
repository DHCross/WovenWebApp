#!/usr/bin/env node
/**
 * Human-in-the-Loop Raven Resonance Audit
 * 
 * Samples 10% of recent outputs for qualitative inspection.
 * Automated tests catch correctness; this catches tone nuance.
 * 
 * Questions for manual review:
 * 1. Does it feel like Raven? (Pattern witness, not oracle)
 * 2. Is the poetry still alive despite E-Prime discipline?
 * 3. Do metaphors stay leashed to geometry?
 * 4. Does conditional language feel natural, not evasive?
 * 5. Is there rhythm variation (not robotic)?
 */

const { readFileSync, existsSync, readdirSync } = require('fs');
const { join } = require('path');
const rootDir = __dirname.replace('/scripts', '');

// Configuration
const SAMPLE_RATE = 0.1; // 10% sampling
const OUTPUT_DIRS = [
  join(rootDir, 'test-results'),
  join(rootDir, 'Sample Output')
];

/**
 * @typedef {Object} AuditCriteria
 * @property {string} category
 * @property {string} question
 * @property {string} guidance
 */

/** @type {AuditCriteria[]} */
const AUDIT_CRITERIA = [
  {
    category: 'Voice Identity',
    question: 'Does it feel like Raven? (Pattern witness, not oracle)',
    guidance: 'Should observe patterns without declaring fate. Conditional, falsifiable, agency-preserving.'
  },
  {
    category: 'Poetic Vitality',
    question: 'Is the poetry still alive despite E-Prime discipline?',
    guidance: 'E-Prime should enhance precision, not sterilize metaphor. Should sing, not recite.'
  },
  {
    category: 'Geometric Grounding',
    question: 'Do metaphors stay leashed to geometry?',
    guidance: 'Every poetic image should trace back to aspects/placements/transits. No free-floating abstraction.'
  },
  {
    category: 'Conditional Naturalness',
    question: 'Does conditional language feel natural, not evasive?',
    guidance: 'May/might/could should flow smoothly. Shouldn\'t feel like hedging or uncertainty—just proper epistemology.'
  },
  {
    category: 'Rhythm & Cadence',
    question: 'Is there sentence rhythm variation (not robotic)?',
    guidance: 'Should alternate between short sharp observations and longer flowing synthesis. Not monotonous.'
  },
  {
    category: 'Somatic Resonance',
    question: 'Do FIELD descriptions land in the body?',
    guidance: 'Friction heat, flowing ease, pull-apart tension—should be visceral, not abstract.'
  },
  {
    category: 'Falsifiability',
    question: 'Can the reader test these claims?',
    guidance: 'Every statement should invite lived experience confirmation (WB/ABE/OSR). No unfalsifiable mysticism.'
  },
  {
    category: 'Agency Safety',
    question: 'Does the text preserve reader agency?',
    guidance: 'Should open possibilities, not close them. Reader remains free to disagree without being "wrong."'
  }
];

function sampleOutputs() {
  // Look for recent test results or output files in multiple directories
  const allFiles = [];
  
  OUTPUT_DIRS.forEach(dir => {
    if (existsSync(dir)) {
      const files = readdirSync(dir)
        .filter(f => f.endsWith('.json') || f.endsWith('.md'))
        .filter(f => !f.startsWith('.')) // Skip hidden files like .last-run.json
        .map(f => join(dir, f));
      allFiles.push(...files);
    }
  });
  
  if (allFiles.length === 0) {
    console.log('⚠️  No output files found in any output directories.');
    console.log('Directories checked:', OUTPUT_DIRS.map(d => d.replace(rootDir + '/', '')).join(', '));
    console.log('Run tests or generate outputs first:\n');
    console.log('  npm run test:e2e');
    console.log('  npm run dev  # Then upload test JSON\n');
    return [];
  }
  
  // Random sampling
  const sampleSize = Math.max(1, Math.ceil(allFiles.length * SAMPLE_RATE));
  const samples = [];
  
  while (samples.length < sampleSize && allFiles.length > 0) {
    const idx = Math.floor(Math.random() * allFiles.length);
    samples.push(allFiles[idx]);
    allFiles.splice(idx, 1);
  }
  
  return samples;
}

function displayAuditPrompt() {
  console.log('🐦‍⬛ Raven Resonance Audit — Human-in-the-Loop\n');
  console.log('This is a qualitative review. Automated tests catch correctness;');
  console.log('this catches tone nuance that only human ears can hear.\n');
  console.log('═'.repeat(60));
  console.log('\n📋 Audit Criteria:\n');
  
  AUDIT_CRITERIA.forEach((criteria, idx) => {
    console.log(`${idx + 1}. ${criteria.category}`);
    console.log(`   Q: ${criteria.question}`);
    console.log(`   → ${criteria.guidance}\n`);
  });
}

function displaySample(filePath, index, total) {
  console.log('═'.repeat(60));
  console.log(`\n📄 Sample ${index + 1} of ${total}`);
  console.log(`File: ${filePath.replace(rootDir + '/', '')}\n`);
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    
    // Try to extract markdown if JSON
    if (filePath.endsWith('.json')) {
      const json = JSON.parse(content);
      const markdown = json.draft?.appendix?.reader_markdown || 
                      json.reader_markdown ||
                      JSON.stringify(json, null, 2);
      
      // Display first 50 lines
      const lines = markdown.split('\n').slice(0, 50);
      console.log(lines.join('\n'));
      
      if (markdown.split('\n').length > 50) {
        console.log('\n... (truncated, see full file for complete output)');
      }
    } else {
      // Display markdown directly
      const lines = content.split('\n').slice(0, 50);
      console.log(lines.join('\n'));
      
      if (content.split('\n').length > 50) {
        console.log('\n... (truncated)');
      }
    }
  } catch (error) {
    console.error(`❌ Error reading file: ${error}`);
  }
}

function promptForReview() {
  console.log('\n═'.repeat(60));
  console.log('\n🎯 Manual Review Checklist:\n');
  
  AUDIT_CRITERIA.forEach((criteria, idx) => {
    console.log(`[ ] ${idx + 1}. ${criteria.category}`);
    console.log(`    ${criteria.question}`);
  });
  
  console.log('\n═'.repeat(60));
  console.log('\n📝 Review Instructions:\n');
  console.log('1. Read each sample with these questions in mind');
  console.log('2. Mark any that fail resonance checks');
  console.log('3. Note specific examples of what feels "off"');
  console.log('4. Look for patterns across samples\n');
  console.log('Remember: This isn\'t about correctness (tests handle that).');
  console.log('This is about whether Raven still sounds like Raven.\n');
}

function main() {
  displayAuditPrompt();
  
  const samples = sampleOutputs();
  
  if (samples.length === 0) {
    console.log('⚠️  No outputs found to sample.');
    console.log('Run tests or generate outputs first:\n');
    console.log('  npm run test:e2e');
    console.log('  npm run dev  # Then upload test JSON\n');
    process.exit(0);
  }
  
  console.log(`\n📊 Sampling ${samples.length} outputs (${(SAMPLE_RATE * 100).toFixed(0)}% of available)\n`);
  
  samples.forEach((sample, idx) => {
    displaySample(sample, idx, samples.length);
  });
  
  promptForReview();
  
  console.log('💡 Tips for spotting tone drift:');
  console.log('  • Does it sound "mystical" instead of precise?');
  console.log('  • Are metaphors doing real work or just decorative?');
  console.log('  • Could a reader test these claims against lived experience?');
  console.log('  • Does conditional language feel natural or stilted?');
  console.log('  • Is there rhythmic variety or robotic uniformity?\n');
  
  console.log('✅ If samples pass: Raven stays true.');
  console.log('⚠️  If samples drift: Check recent formatter changes.\n');
}

main();
