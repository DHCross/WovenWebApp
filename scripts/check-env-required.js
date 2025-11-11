#!/usr/bin/env node
/*
 * Minimal runtime guard for required secrets / environment variables.
 * Non-invasive: exits with non-zero only if a required key is missing.
 * Extend the REQUIRED list as new capabilities are integrated.
 */

const REQUIRED = [
  // Core external APIs
  'RAPIDAPI_KEY',
  // Perplexity AI for Poetic Brain
  'PERPLEXITY_API_KEY'
];

const missing = REQUIRED.filter(k => !process.env[k] || String(process.env[k]).trim() === '');

if (missing.length) {
  console.error('\u274c Missing required environment variables:', missing.join(', '));
  console.error('Create or update your .env file (see .env.example) and restart.');
  process.exit(1);
} else {
  console.log('\u2705 Environment check passed.');
}
