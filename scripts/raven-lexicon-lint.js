#!/usr/bin/env node
/**
 * Raven Calder Lexical Linter
 * 
 * Enforces E-Prime discipline and Raven's "do-not-touch" list
 * Scans user-facing text (voice templates, descriptions, output strings)
 * for forbidden patterns that violate falsifiability or agency-safety
 */

import { readFileSync } from 'fs';
import { globSync } from 'glob';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Raven's "do-not-touch" list
const FORBIDDEN_PATTERNS = {
  // 1. Static identity language (E-Prime violations in user-facing text)
  'E-Prime violations': {
    patterns: [
      /\byou are\b/i,
      /\byou're\b/i,
      /\bit is\b/i,
      /\bit's\b/i,
      /\bthis is\b/i,
      /\bthat is\b/i,
      /\bthey are\b/i,
      /\bwe are\b/i,
      /\bi am\b/i,
      /\byou were\b/i,
      /\bit was\b/i,
      /\bhas been\b/i,
      /\bhave been\b/i
    ],
    severity: 'high',
    message: 'E-Prime violation: Use process language instead of static "to be" forms'
  },

  // 2. Deterministic or fated phrases
  'Deterministic language': {
    patterns: [
      /\bdestined\b/i,
      /\bmeant to\b/i,
      /\bfated\b/i,
      /\balways will\b/i,
      /\bnever will\b/i,
      /\binevitabl(e|y)\b/i,
      /\bpredestined\b/i,
      /\bguaranteed to\b/i
    ],
    severity: 'critical',
    message: 'Deterministic language: Use probability/tendency instead of fate'
  },

  // 3. Moralizing or evaluative adjectives
  'Moral judgments': {
    patterns: [
      /\b(good|bad|right|wrong) (aspect|placement|transit|energy|pattern)\b/i,
      /\btoxic (relationship|pattern|dynamic)\b/i,
      /\bpure\b.*\b(energy|soul|intention)\b/i,
      /\bevil\b/i,
      /\bkarmic (debt|punishment|reward)\b/i,
      /\bblessed\b.*\b(aspect|placement)\b/i
    ],
    severity: 'high',
    message: 'Moral judgment: Describe polarity/friction/flow instead of good/bad'
  },

  // 4. Psychoanalytic certainty
  'Psychoanalytic claims': {
    patterns: [
      /\byou fear\b/i,
      /\byou secretly\b/i,
      /\byou really want\b/i,
      /\byou're afraid\b/i,
      /\bdeep down you\b/i,
      /\bunconsciously you\b/i
    ],
    severity: 'critical',
    message: 'Psychoanalytic certainty: Use "this geometry can correlate with..." instead'
  },

  // 5. Esoteric authority language
  'Esoteric authority': {
    patterns: [
      /\bchanneling\b/i,
      /\bdivine message\b/i,
      /\bspirit guide\b/i,
      /\bsoul contract\b/i,
      /\bhigher self (says|told|revealed)\b/i,
      /\bdownload (from|of) (spirit|universe|source)\b/i,
      /\bascended master\b/i
    ],
    severity: 'critical',
    message: 'Esoteric authority: Use structural metaphors instead'
  },

  // 6. Binary emotional simplifications
  'Binary emotions': {
    patterns: [
      /\b(happy|sad|positive|negative) (person|chart|energy)\b/i,
      /\byou will (feel happy|feel sad|be positive|be negative)\b/i
    ],
    severity: 'medium',
    message: 'Binary emotion: Use expansive/constricted, open/pressured instead'
  },

  // 7. Abstract fluff (undefined terms)
  'Undefined jargon': {
    patterns: [
      /\braise your (vibration|frequency)\b/i,
      /\bhigh vibration\b/i,
      /\blow vibration\b/i,
      /\bmanifest(ing)? (abundance|wealth|love)\b/i,
      /\bin alignment with\b(?! (natal|transit|geometry))/i, // Allow technical "alignment"
      /\benergetic alignment\b/i
    ],
    severity: 'medium',
    message: 'Abstract jargon: Define precisely or use testable terminology'
  },

  // 8. Passive absolutes
  'Passive absolutes': {
    patterns: [
      /\bfor a reason\b/i,
      /\beverything (is|happens for)\b/i,
      /\bno accidents\b/i,
      /\bmeant to teach you\b/i,
      /\buniverse is trying to\b/i
    ],
    severity: 'high',
    message: 'Passive absolute: Map how something connects, not that it does'
  },

  // 9. Blueprint vs. Weather boundary (Critical semantic firewall)
  'Weather without transits': {
    patterns: [
      /\bsymbolic weather\b/i,
      /\batmospheric\b/i,
      /\bsky (is|in) motion\b/i,
      /\bcurrent climate\b/i,
      /\bpressing against\b/i,
      /\bactivating your\b/i
    ],
    severity: 'high',
    message: 'Weather language detected: Ensure transits are active in data. Use "blueprint" language if natal-only.',
    context: 'Blueprint vs. Weather Firewall'
  }
};

// Files to scan (user-facing text only)
const SCAN_PATTERNS = [
  'lib/legacy/*.js',
  'src/formatter/**/*.js',
  'lib/pipeline/*.js',
  'lib/raven/*.js'
];

// Exceptions (technical contexts where violations are OK)
const EXCEPTION_CONTEXTS = [
  /\/\/ .*/,  // Comments
  /\/\*[\s\S]*?\*\//,  // Block comments
  /@param/,  // JSDoc params
  /@returns/,  // JSDoc returns
  /console\.(log|error|warn)/,  // Debug logging
  /const \w+ = /,  // Variable names
  /function \w+/,  // Function names
  /export const/  // Export names
];

function isExceptionContext(line, lineNum, lines) {
  // Check if line is in a comment block or other exception context
  for (const pattern of EXCEPTION_CONTEXTS) {
    if (pattern.test(line)) return true;
  }
  
  // Check if we're in a multi-line comment
  let inComment = false;
  for (let i = 0; i < lineNum; i++) {
    if (lines[i].includes('/*')) inComment = true;
    if (lines[i].includes('*/')) inComment = false;
  }
  
  return inComment;
}

function scanFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    
    // Skip exception contexts
    if (isExceptionContext(line, idx, lines)) return;
    
    // Check for violations in user-facing strings (template literals, quotes)
    const stringMatches = line.match(/[`'"](.*?)[`'"]/g);
    if (!stringMatches) return;
    
    stringMatches.forEach(str => {
      for (const [category, config] of Object.entries(FORBIDDEN_PATTERNS)) {
        for (const pattern of config.patterns) {
          if (pattern.test(str)) {
            violations.push({
              file: filePath.replace(rootDir + '/', ''),
              line: lineNum,
              category,
              severity: config.severity,
              message: config.message,
              match: str.trim(),
              pattern: pattern.toString()
            });
          }
        }
      }
    });
  });

  return violations;
}

function main() {
  console.log('🐦‍⬛ Raven Calder Lexical Linter\n');
  console.log('Scanning for E-Prime violations and forbidden patterns...\n');

  const allViolations = [];
  
  for (const pattern of SCAN_PATTERNS) {
    const files = globSync(pattern, { cwd: rootDir, absolute: true });
    
    for (const file of files) {
      const violations = scanFile(file);
      allViolations.push(...violations);
    }
  }

  if (allViolations.length === 0) {
    console.log('✅ No violations found. Raven stays clean.\n');
    process.exit(0);
  }

  // Group by severity
  const critical = allViolations.filter(v => v.severity === 'critical');
  const high = allViolations.filter(v => v.severity === 'high');
  const medium = allViolations.filter(v => v.severity === 'medium');

  console.log(`❌ Found ${allViolations.length} violations:\n`);
  
  if (critical.length > 0) {
    console.log(`🔴 CRITICAL (${critical.length}):`);
    critical.forEach(v => {
      console.log(`  ${v.file}:${v.line}`);
      console.log(`  Category: ${v.category}`);
      console.log(`  Match: ${v.match}`);
      console.log(`  Fix: ${v.message}\n`);
    });
  }

  if (high.length > 0) {
    console.log(`🟠 HIGH (${high.length}):`);
    high.forEach(v => {
      console.log(`  ${v.file}:${v.line}`);
      console.log(`  Category: ${v.category}`);
      console.log(`  Match: ${v.match}`);
      console.log(`  Fix: ${v.message}\n`);
    });
  }

  if (medium.length > 0) {
    console.log(`🟡 MEDIUM (${medium.length}):`);
    medium.forEach(v => {
      console.log(`  ${v.file}:${v.line}`);
      console.log(`  Category: ${v.category}`);
      console.log(`  Match: ${v.match}`);
      console.log(`  Fix: ${v.message}\n`);
    });
  }

  console.log('\n📖 Raven\'s Lexical Firewall:');
  console.log('  1. No static identity (E-Prime: avoid is/are/was/were)');
  console.log('  2. No deterministic language (destined/fated/always)');
  console.log('  3. No moral judgments (good/bad/toxic/pure)');
  console.log('  4. No psychoanalytic certainty (you fear/you secretly)');
  console.log('  5. No esoteric authority (channeling/divine message)');
  console.log('  6. No binary emotions (happy/sad as verdicts)');
  console.log('  7. No undefined jargon (vibration/manifestation without definition)');
  console.log('  8. No passive absolutes (for a reason/everything happens)\n');

  process.exit(critical.length > 0 ? 1 : 0);
}

main();
