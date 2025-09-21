/*
 Simple smoke test for Raven API guard behavior.
 Requires: netlify dev running locally (http://localhost:8888)
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8888';

async function postJson(path, body) {
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

async function testConversationGuard() {
  const payload = {
    input: 'Can you read me? What do you see in my chart?',
    options: {
      reportContexts: []
    }
  };
  const data = await postJson('/api/raven', payload);
  if (!data || !data.ok) {
    throw new Error('Unexpected response shape from Raven API');
  }
  const draft = data.draft || {};
  const guardText = [draft.feeling, draft.container, draft.option, draft.next_step]
    .filter(Boolean)
    .join(' ');
  const ok = guardText.includes('I can’t responsibly read you without a chart or report context')
    && guardText.includes('Generate Math Brain')
    && guardText.includes('planetary weather only');
  if (!ok) {
    throw new Error('Guard guidance not present in Raven response');
  }
  return 'PASS: Raven guard guidance returned without context';
}

(async () => {
  try {
    const result = await testConversationGuard();
    console.log(result);
    process.exit(0);
  } catch (err) {
    console.error('FAIL:', err.message);
    process.exit(1);
  }
})();
