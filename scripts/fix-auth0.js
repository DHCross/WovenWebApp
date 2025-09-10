#!/usr/bin/env node
// Fix Auth0 SDK placement and Netlify redirects
const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const publicVendor = path.join(repoRoot, 'public', 'vendor');
const altVendor = path.join(repoRoot, 'vendor');
const redirectsFile = path.join(repoRoot, '_redirects');
const sdkSrc = path.join(publicVendor, 'auth0-spa-js.production.js');
const sdkDst = path.join(altVendor, 'auth0-spa-js.production.js');

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function copySdk(){
  if(!fs.existsSync(sdkSrc)) {
    console.error('[fix:auth0] Missing', sdkSrc);
    process.exitCode = 1; return;
  }
  ensureDir(altVendor);
  fs.copyFileSync(sdkSrc, sdkDst);
  console.log('[fix:auth0] Copied SDK to', sdkDst);
}

function ensureRedirects(){
  const line = '/public/vendor/*   /public/vendor/:splat   200!\n';
  let current = '';
  if(fs.existsSync(redirectsFile)) current = fs.readFileSync(redirectsFile, 'utf8');
  if(!current.includes('/public/vendor/*')){
    const updated = (current.trim() + '\n' + line).trim() + '\n';
    fs.writeFileSync(redirectsFile, updated, 'utf8');
    console.log('[fix:auth0] Ensured _redirects includes vendor passthrough');
  } else {
    console.log('[fix:auth0] _redirects already has vendor passthrough');
  }
}

copySdk();
ensureRedirects();
console.log('[fix:auth0] Done');
