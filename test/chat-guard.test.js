/*
 Simple smoke test for chat API guard behavior.
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
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  return res.text();
}

async function testNoChartNoPersonalReading() {
  const payload = {
    messages: [{ role: 'user', content: 'Can you read me? What’s my pattern?' }],
    reportContexts: []
  };
  const text = await post('/api/chat', payload);
  // Expect guard guidance (from route.ts guidance string)
  const ok = text.includes('Generate Math Brain') || text.includes('planetary weather only');
  if (!ok) {
    throw new Error('Guard text not found in response');
  }
  return 'PASS: Guard enforced without chart context';
}

async function testWeatherOnlyBranch() {
  const payload = {
    messages: [{ role: 'user', content: 'planetary weather only' }],
    reportContexts: []
  };
  const text = await post('/api/chat', payload);
  // Expect the weather-only note
  const ok = text.toLowerCase().includes('field-only read') || text.toLowerCase().includes('no personal map');
  if (!ok) {
    throw new Error('Weather-only note not found in response');
  }
  return 'PASS: Weather-only branch returns field-only read';
}

(async () => {
  const results = [];
  try {
    results.push(await testNoChartNoPersonalReading());
    results.push(await testWeatherOnlyBranch());
    console.log(results.join('\n'));
    process.exit(0);
  } catch (err) {
    console.error('FAIL:', err.message);
    process.exit(1);
  }
})();
