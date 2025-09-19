#!/usr/bin/env node
// Moves legacy artifacts into ./legacy/ for safe archival instead of deleting.
// This is reversible and keeps git history intact.

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const legacyRoot = path.join(repoRoot, 'legacy');
const ensureDir = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); };
const moveIfExists = (srcRel, destRelDir = '') => {
  const src = path.join(repoRoot, srcRel);
  if (!fs.existsSync(src)) return false;
  const destDir = path.join(legacyRoot, destRelDir);
  ensureDir(destDir);
  const dest = path.join(destDir, path.basename(srcRel));
  fs.renameSync(src, dest);
  console.log(`Moved: ${srcRel} -> legacy/${destRelDir}${path.basename(srcRel)}`);
  return true;
};

ensureDir(legacyRoot);

// Root-level legacy HTML/testing/demo files
const legacyHtml = [
  'api-test-simple.html',
  'api-test.html',
  'css-visual-test.html',
  'debug-api.html',
  'debug-auth-direct.html',
  'debug-auth-verify.html',
  'debug-auth0-simple.html',
  'debug-auth0-step-by-step.html',
  'debug-button-clicks.html',
  'debug-buttons.html',
  'debug-dashboard.html',
  'debug-test.html',
  'demo-card-preview.html',
  'demo-reading-summary.html',
  'demo-seismograph.html',
  'demo-session-analysis.html',
  'index copy snapshot 9.7.25.html',
  'index.html',
  'simple-auth0-test.html',
  'test-api-only.html',
  'test-balance-integration.html',
  'test-balance-meter-ui.html',
  'test-buttons.html',
  'test-chat-browser.html',
  'test-chat-legacy.html',
  'test-chat-simple.html',
  'test-interface.html',
  'test-mobile.html',
  'test-relational-mirror-validation.html',
  'test-streamlined-api.html',
];

// Duplicated config/file variants with spaces (keep canonical ones)
const dupeConfigs = [
  'next-env.d 2.ts',
  'package 2.json',
  'package-lock 2.json',
  'tsconfig 2.json',
];

// Stray HTML under subfolders
const nestedLegacy = [
  'public/debug-dashboard.html',
  'offshoot/erp_pcs.html',
  'chat/index.html.backup',
];

// JS function files that have TS counterparts — move JS to legacy
const functionPairs = [
  ['netlify/functions/_shared.js', 'netlify/functions/_shared.ts'],
  ['netlify/functions/auth-config.js', 'netlify/functions/auth-config.ts'],
  ['netlify/functions/health.js', 'netlify/functions/health.ts'],
  ['netlify/functions/astrology-mathbrain.js', 'netlify/functions/astrology-mathbrain.ts'],
];

let movedCount = 0;
for (const f of legacyHtml) if (moveIfExists(f, 'html/')) movedCount++;
for (const f of dupeConfigs) if (moveIfExists(f, 'dupe-configs/')) movedCount++;
for (const f of nestedLegacy) if (moveIfExists(f, 'html/')) movedCount++;

for (const [jsFile, tsFile] of functionPairs) {
  const jsPath = path.join(repoRoot, jsFile);
  const tsPath = path.join(repoRoot, tsFile);
  if (fs.existsSync(jsPath) && fs.existsSync(tsPath)) {
    if (moveIfExists(jsFile, 'functions-js-legacy/')) movedCount++;
  }
}

console.log(`\nLegacy cleanup complete. Files moved: ${movedCount}`);
