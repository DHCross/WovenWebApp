#!/usr/bin/env node
const http = require('http');

const baseUrls = [
  'http://localhost:3999', 'http://localhost:8888',
  'http://127.0.0.1:3999', 'http://127.0.0.1:8888'
];
const paths = [
  '/public/vendor/auth0-spa-js.production.js',
  '/vendor/auth0-spa-js.production.js'
];
const urls = baseUrls.flatMap(b => paths.map(p => b + p));

function check(url){
  return new Promise((resolve) => {
    const req = http.get(url, res => {
      const ok = res.statusCode === 200;
      console.log(`[smoke:auth0] ${res.statusCode} ${url}`);
      // drain
      res.resume();
      resolve(ok);
    });
    req.on('error', err => { console.error(`[smoke:auth0] ERR ${url}`, err.message); resolve(false); });
    req.setTimeout(3000, () => { console.error(`[smoke:auth0] TIMEOUT ${url}`); req.destroy(); resolve(false); });
  });
}

(async () => {
  let allOk = true;
  for (const u of urls) {
    const ok = await check(u);
    allOk = allOk && ok;
  }
  if (!allOk) {
    console.error('[smoke:auth0] One or more checks failed');
    process.exit(1);
  } else {
    console.log('[smoke:auth0] All checks passed');
  }
})();
