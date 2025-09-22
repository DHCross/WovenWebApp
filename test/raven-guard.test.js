
/**
 * Raven API Guard – Smoke Tests
 *
 * Verifies:
 * 1) Conversation guard messaging appears when no chart/context is provided.
 * 2) Personal mirror requests are blocked without required context.
 *
 * Requires: a local server (e.g., netlify dev) at http://localhost:8888
 */


/*

 Simple smoke test to ensure Raven API enforces guardrails
 when no chart/report context is provided.
 Requires: netlify dev running locally (http://localhost:8888)
*/

 Smoke test to ensure Raven API guard prevents mirrors without context.
 Requires: netlify dev running locally (http://localhost:8888)
 */


const fetch = require('node-fetch');


const BASE_URL = process.env.BASE_URL || 'http://localhost:8888';

// Use global fetch if available (Node 18+), otherwise fall back to node-fetch.
let fetchFn = globalThis.fetch;
if (!fetchFn) {
  fetchFn = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
}

async function postJSON(path, body) {
  const res = await fetchFn(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });


  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Non-JSON response from ${path}: ${text}`);
  }


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
  const data = await postJSON('/api/raven', payload);
  if (!data || typeof data.guidance !== 'string') {
    throw new Error('Guard guidance not returned');
  }
  const guidance = String(data.guidance);
  const containsCorePhrases = guidance.includes('Generate Math Brain') && guidance.includes('planetary weather only');
  const mentionsJsonHelp = /export file/i.test(guidance) && /astroseek/i.test(guidance);
  if (!containsCorePhrases || !mentionsJsonHelp) {
    throw new Error('Expected guard guidance missing export instructions for the AstroSeek JSON report');
  }
  return 'PASS: Raven guard enforced without chart context';

  const data = await res.json();

  if (!res.ok) {
    const msg = json?.error || text || `HTTP ${res.status}`;
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${msg}`);
  }
  return json;
}

/**
 * Test 1: Conversation guard returns guidance (no chart/context).
 * Expects a friendly refusal + suggested next actions, not a mirror.
 */
async function testConversationGuard() {
  const payload = {
    input: 'Can you read me? What do you see in my chart?',
    options: { reportContexts: [] }, // no consent/context provided
  };

  const data = await postJSON('/api/raven', payload);

  if (!data || typeof data !== 'object') {
    throw new Error('Unexpected response shape (not an object).');
  }

  // Draft fields are where your UX copies currently surface.
  const draft = data.draft || {};
  const guardText = [
    draft.feeling,
    draft.container,
    draft.option,
    draft.next_step,
    draft.message,
    data.message,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const mustContain = [
    'i can’t responsibly read you without a chart or report context',
    'generate math brain',
    'planetary weather only',
    'export file',
    'astroseek',
  ];

  const missing = mustContain.filter((needle) => !guardText.includes(needle));
  if (missing.length) {
    throw new Error(
      `Guard guidance missing: ${missing.map((m) => `"${m}"`).join(', ')}`
    );
  }

  return 'PASS: Conversation guard guidance returned without context.';
}

/**
 * Test 2: Mirror request is blocked without chart/context.
 * Expects ok=false (or 4xx) with error mentioning missing chart/context.
 */
async function testRavenGuardBlocksPersonalMirror() {
  const payload = {
    input: 'Mirror me—what do you see in my chart?',
    options: { reportContexts: [] }, // still no context
  };

  // The route should either:
  //  - respond 200 with { ok: false, error: '...' }, or
  //  - respond 4xx; postJSON would throw in that case.
  const json = await postJSON('/api/raven', payload);

  if (json.ok === true) {
    throw new Error('Expected guard to block mirror generation without context.');
  }

  const errMsg = String(json.error || '').toLowerCase();
  if (!errMsg.includes('chart or report context')) {
    throw new Error('Guard error message did not mention missing chart/context.');
  }


  return 'PASS: Personal mirror blocked without chart context.';

  return 'PASS: Raven guard withheld mirror without chart context';


}

// Run tests sequentially; fail fast with meaningful output.
(async () => {
  try {

    const r1 = await testConversationGuard();
    console.log(r1);

    const r2 = await testRavenGuardBlocksPersonalMirror();
    console.log(r2);



    const result = await testRavenGuardWithoutContext();

    const result = await testRavenGuardBlocksPersonalMirror();

    console.log(result);

    process.exit(0);
  } catch (err) {
    console.error('FAIL:', err?.message || err);
    process.exit(1);
  }
})();
