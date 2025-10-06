#!/usr/bin/env node
/**
 * Audit Balance Meter Value Reads
 * 
 * Scans codebase for unsafe Balance Meter value extraction patterns.
 * Identifies code reading raw/uncalibrated values instead of calibrated axes.*.value.
 * 
 * Usage:
 *   node scripts/audit-balance-meter-reads.js
 * 
 * Exit codes:
 *   0 = All safe (or only known safe patterns found)
 *   1 = Unsafe patterns detected
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

// Patterns that indicate SAFE calibrated value reads
const SAFE_PATTERNS = [
  { pattern: 'axes\\.magnitude\\.value', label: 'axes.magnitude.value (calibrated)' },
  { pattern: 'axes\\.directional_bias\\.value', label: 'axes.directional_bias.value (calibrated)' },
  { pattern: 'axes\\.coherence\\.value', label: 'axes.coherence.value (calibrated)' },
  { pattern: 'magnitude_calibrated', label: 'magnitude_calibrated (explicit)' },
  { pattern: 'valence_bounded', label: 'valence_bounded (calibrated)' },
];

// Patterns that indicate UNSAFE raw/uncalibrated value reads
const UNSAFE_PATTERNS = [
  { 
    pattern: 'summary\\.magnitude(?!_calibrated|_label|_normalized)',
    label: 'summary.magnitude (UNCALIBRATED AVERAGE)',
    severity: 'CRITICAL'
  },
  { 
    pattern: '\\.rawMagnitude',
    label: '.rawMagnitude (pre-clamping)',
    severity: 'CRITICAL'
  },
  { 
    pattern: '\\.originalMagnitude',
    label: '.originalMagnitude (ambiguous)',
    severity: 'HIGH'
  },
  { 
    pattern: 'summary\\.valence(?!_bounded|_label|_code)',
    label: 'summary.valence (raw unbounded)',
    severity: 'HIGH'
  },
  { 
    pattern: '\\.magnitude(?!_|\\w)',
    label: '.magnitude (ambiguous - could be raw)',
    severity: 'MEDIUM',
    exclude: ['axes.magnitude', 'seismograph.magnitude', 'summary.magnitude'] // Handled by more specific patterns
  },
];

// Files/paths to scan
const SCAN_PATHS = ['app/', 'lib/', 'components/', 'src/'];

// Files/patterns to exclude from scanning
const EXCLUDE_PATTERNS = [
  'node_modules/',
  '.next/',
  'dist/',
  '__tests__/',
  '.test.',
  '.spec.',
  'EXPORT_FRAGMENTATION_RECOVERY_REPORT.md',
  'DASHBOARD_FIX_QUICKSTART.md',
  'audit-balance-meter-reads.js'
];

console.log(`${BOLD}${BLUE}🔍 Balance Meter Value Read Audit${RESET}\n`);
console.log(`Scanning: ${SCAN_PATHS.join(', ')}`);
console.log(`Excluding: ${EXCLUDE_PATTERNS.join(', ')}\n`);

let hasUnsafePatterns = false;
const findings = {
  critical: [],
  high: [],
  medium: [],
  safe: []
};

/**
 * Search for a pattern in the codebase
 */
function searchPattern(pattern, isRegex = true) {
  try {
    const grepCmd = isRegex 
      ? `grep -rn -E "${pattern}" ${SCAN_PATHS.join(' ')}` 
      : `grep -rn "${pattern}" ${SCAN_PATHS.join(' ')}`;
    
    const results = execSync(grepCmd, { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'] // Suppress stderr
    });
    
    // Filter out excluded patterns
    const lines = results.split('\n').filter(line => {
      return line && !EXCLUDE_PATTERNS.some(exclude => line.includes(exclude));
    });
    
    return lines;
  } catch (e) {
    // grep returns exit code 1 if no matches found (not an error)
    return [];
  }
}

/**
 * Check if a line is a false positive
 */
function isFalsePositive(line, excludePatterns) {
  if (!excludePatterns) return false;
  return excludePatterns.some(exclude => line.includes(exclude));
}

// Scan for UNSAFE patterns
console.log(`${BOLD}${RED}❌ UNSAFE PATTERNS (Uncalibrated Reads)${RESET}\n`);

UNSAFE_PATTERNS.forEach(({ pattern, label, severity, exclude }) => {
  const results = searchPattern(pattern, true);
  
  // Filter false positives
  const filtered = results.filter(line => !isFalsePositive(line, exclude));
  
  if (filtered.length > 0) {
    hasUnsafePatterns = true;
    const color = severity === 'CRITICAL' ? RED : severity === 'HIGH' ? YELLOW : BLUE;
    
    console.log(`${color}${BOLD}[${severity}] ${label}${RESET}`);
    console.log(`${color}Pattern: ${pattern}${RESET}`);
    console.log(`${color}Found ${filtered.length} occurrence(s):${RESET}\n`);
    
    filtered.forEach(line => {
      console.log(`  ${color}${line}${RESET}`);
    });
    console.log('');
    
    findings[severity.toLowerCase()].push({ pattern, label, count: filtered.length, lines: filtered });
  }
});

if (!hasUnsafePatterns) {
  console.log(`${GREEN}✅ No unsafe patterns detected!${RESET}\n`);
}

// Scan for SAFE patterns (informational)
console.log(`${BOLD}${GREEN}✅ SAFE PATTERNS (Calibrated Reads)${RESET}\n`);

SAFE_PATTERNS.forEach(({ pattern, label }) => {
  const results = searchPattern(pattern, true);
  
  if (results.length > 0) {
    console.log(`${GREEN}${label}: ${results.length} occurrence(s)${RESET}`);
    findings.safe.push({ pattern, label, count: results.length });
  } else {
    console.log(`${YELLOW}${label}: 0 occurrences (consider adding if needed)${RESET}`);
  }
});

console.log('');

// Summary
console.log(`${BOLD}${BLUE}📊 SUMMARY${RESET}\n`);
console.log(`${RED}Critical Issues: ${findings.critical.length}${RESET}`);
console.log(`${YELLOW}High Priority: ${findings.high.length}${RESET}`);
console.log(`${BLUE}Medium Priority: ${findings.medium.length}${RESET}`);
console.log(`${GREEN}Safe Patterns: ${findings.safe.length}${RESET}\n`);

// Recommendations
if (hasUnsafePatterns) {
  console.log(`${BOLD}${YELLOW}🔧 RECOMMENDED FIXES${RESET}\n`);
  
  if (findings.critical.length > 0) {
    console.log(`${RED}CRITICAL: These must be fixed immediately${RESET}`);
    console.log(`${RED}Replace with: axes.magnitude.value or magnitude_calibrated${RESET}\n`);
  }
  
  if (findings.high.length > 0) {
    console.log(`${YELLOW}HIGH: Fix before next release${RESET}`);
    console.log(`${YELLOW}Use: valence_bounded instead of valence${RESET}\n`);
  }
  
  if (findings.medium.length > 0) {
    console.log(`${BLUE}MEDIUM: Audit and fix if confirmed unsafe${RESET}`);
    console.log(`${BLUE}Review context: may be intentional debug/legacy code${RESET}\n`);
  }
  
  console.log(`${BOLD}See docs/EXPORT_FRAGMENTATION_RECOVERY_REPORT.md for detailed fix instructions.${RESET}\n`);
}

// Exit code
if (findings.critical.length > 0 || findings.high.length > 0) {
  console.log(`${RED}${BOLD}❌ AUDIT FAILED: ${findings.critical.length + findings.high.length} critical/high issues found${RESET}`);
  process.exit(1);
} else if (findings.medium.length > 0) {
  console.log(`${YELLOW}${BOLD}⚠️  AUDIT WARNING: ${findings.medium.length} medium priority issues found${RESET}`);
  process.exit(0); // Warning but not failure
} else {
  console.log(`${GREEN}${BOLD}✅ AUDIT PASSED: All Balance Meter reads are safe${RESET}`);
  process.exit(0);
}
