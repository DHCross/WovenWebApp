#!/usr/bin/env node
/**
 * Tiny checker for /api/auth-config that prints a friendly pass/fail
 * Usage:
 *   node scripts/auth-config-check.js [baseUrl]
 * Examples:
 *   node scripts/auth-config-check.js              # defaults to http://localhost:8888
 *   node scripts/auth-config-check.js https://your-site.netlify.app
 */

const DEFAULT_BASE = 'http://localhost:8888';

async function main() {
  const base = process.argv[2] || DEFAULT_BASE;
  const url = `${base.replace(/\/$/, '')}/api/auth-config`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }

    const ok = res.ok && data && data.success !== false && !!data.domain && !!data.clientId;
    const isExplicitlyDisabled = res.ok && data && data.code === 'AUTH_DISABLED';

    const millis = Date.now() - t0;
    if (ok) {
      console.log(`✅ /api/auth-config OK (${millis}ms)`);
      console.log(`   Domain: ${data.domain}`);
      console.log(`   ClientId: ${String(data.clientId).slice(0, 4)}… (redacted)`);
      if (data.hasAudience) console.log(`   Audience: (present)`);
      process.exit(0);
    } else if (isExplicitlyDisabled) {
      console.log(`⚠️ /api/auth-config DISABLED (${millis}ms)`);
      console.log(`   Server reports: ${data.error}`);
      console.log(`   Passing check because auth is intentionally disabled.`);
      process.exit(0);
    } else {
      console.error(`❌ /api/auth-config FAILED (${millis}ms)`);
      console.error(`   HTTP: ${res.status}`);
      if (data && data.error) console.error(`   Error: ${data.error} (${data.code || 'NO_CODE'})`);
      else console.error(`   Body: ${text.slice(0, 200)}${text.length > 200 ? '…' : ''}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`❌ Request error: ${err.message}`);
    process.exit(2);
  }
}

// Polyfill fetch for Node < 18
if (typeof fetch === 'undefined') {
  try { global.fetch = require('node-fetch'); }
  catch { console.error('node-fetch not available'); process.exit(3); }
}

main();
