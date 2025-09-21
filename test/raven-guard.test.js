/*
 Smoke test to ensure Raven API guard prevents mirrors without context.
 Requires: netlify dev running locally (http://localhost:8888)
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8888';

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function testRavenGuardBlocksPersonalMirror() {
  const payload = {
    input: 'Mirror me—what do you see in my chart?',
    options: { reportContexts: [] }
  };
  const json = await post('/api/raven', payload);
  if (json.ok) {
    throw new Error('Expected guard to block mirror generation without context');
  }
  if (typeof json.error !== 'string' || !json.error.includes('chart or report context')) {
    throw new Error('Guard guidance not returned from Raven API');
  }
  return 'PASS: Raven guard withheld mirror without chart context';
}

(async () => {
  try {
    const result = await testRavenGuardBlocksPersonalMirror();
    console.log(result);
    process.exit(0);
  } catch (err) {
    console.error('FAIL:', err.message);
    process.exit(1);
  }
})();
