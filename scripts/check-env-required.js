#!/usr/bin/env node
/*
 * Minimal runtime guard for required secrets / environment variables.
 * Non-invasive: exits with non-zero only if a required key is missing.
 * Extend the REQUIRED list as new capabilities are integrated.
 */

const authEnabled = process.env.NEXT_PUBLIC_ENABLE_AUTH !== 'false';

const REQUIRED = [
  // Core external APIs
  'RAPIDAPI_KEY',
  // Perplexity AI for Poetic Brain
  'PERPLEXITY_API_KEY',
];

// Auth0 Configuration only required if auth is enabled
if (authEnabled) {
  REQUIRED.push('AUTH0_DOMAIN', 'AUTH0_CLIENT_ID', 'AUTH0_AUDIENCE');
}

const missing = REQUIRED.filter(k => !process.env[k] || String(process.env[k]).trim() === '');

if (missing.length) {
  console.error('\u274c Missing required environment variables:', missing.join(', '));
  console.error('Create or update your .env file (see .env.example) and restart.');
  process.exit(1);
} else {
  console.log('\u2705 Environment check passed.');
}
