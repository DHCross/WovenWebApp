/*
 Simple smoke test to ensure Raven API enforces guardrails
 when no chart/report context is provided.
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
  return res.json();
}

async function testRavenGuardWithoutContext() {
  const payload = {
    input: 'Can you read my chart right now?',
    options: {
      reportContexts: []
    }
  };
  const data = await post('/api/raven', payload);
  if (!data || typeof data.guidance !== 'string') {
    throw new Error('Guard guidance not returned');
  }
  const ok = data.guidance.includes('Generate Math Brain') || data.guidance.includes('planetary weather only');
  if (!ok) {
    throw new Error('Expected guard guidance missing from response');
  }
  return 'PASS: Raven guard enforced without chart context';
}

(async () => {
  try {
    const result = await testRavenGuardWithoutContext();
    console.log(result);
    process.exit(0);
  } catch (err) {
    console.error('FAIL:', err.message);
    process.exit(1);
  }
})();
