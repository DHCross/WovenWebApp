#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * STC Protocol: Debug Signal Appender
 *
 * Usage examples:
 *   npm run debug:signal -- "Poetic Brain render crash on /map"
 *   node scripts/debug-signal.js --source=codex --area=math-brain -- "Timezone mismatch"
 *
 * Writes a structured JSON line to .logs/debug-session.jsonl so any agent
 * (Copilot, Codex, etc.) can notice the signal and investigate.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LOG_DIR = path.resolve(process.cwd(), '.logs');
const LOG_FILE = path.join(LOG_DIR, 'debug-session.jsonl');
const DOCS_HINT = 'docs/debug-signal.md';

function ensureLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '', 'utf8');
  }
}

function parseArgs(argv) {
  const meta = {};
  const messageParts = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const [rawKey, rawValue] = token.split('=');
      const key = rawKey.replace(/^--/, '');
      if (rawValue !== undefined) {
        meta[key] = rawValue;
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        meta[key] = argv[++i];
      } else {
        meta[key] = true;
      }
    } else {
      messageParts.push(token);
    }
  }
  return { meta, message: messageParts.join(' ').trim() };
}

function getLocalBranch() {
  try {
    const refs = fs.readFileSync('.git/HEAD', 'utf8').trim();
    if (refs.startsWith('ref:')) {
      return refs.split('/').slice(-1)[0];
    }
  } catch {
    /* ignore */
  }
  return 'LOCAL_BRANCH';
}

function main() {
  ensureLogFile();

  const { meta, message } = parseArgs(process.argv.slice(2));
  const entry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    source: meta.source || process.env.DEBUG_SIGNAL_SOURCE || 'manual',
    area: meta.area || meta.scope || 'general',
    branch: process.env.GITHUB_REF_NAME || getLocalBranch(),
    commit: process.env.GITHUB_SHA || null,
    environment: process.env.NODE_ENV || 'development',
    message: message || 'No description provided',
  };

  fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`, 'utf8');

  console.log('✅ Debug signal appended to', LOG_FILE);
  console.log(`   • ID: ${entry.id}`);
  console.log(`   • Area: ${entry.area}`);
  console.log(`   • Message: ${entry.message}`);
  console.log('');
  console.log(`ℹ️  See ${DOCS_HINT} for how to respond when this log updates.`);
}

main();

