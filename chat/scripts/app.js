import { initAuth0, auth0Client } from './auth.js';

const debugMode = new URLSearchParams(window.location.search).has('debug');

function addMessage(content, type) {
  const chatMessages = document.getElementById('chatMessages');
  const messageDiv = document.createElement('div');
  let classes = 'p-3 rounded-lg whitespace-pre-wrap ';
  if (type === 'user') {
    classes += 'bg-blue-600 ml-12 text-right';
  } else if (type === 'assistant') {
    classes += 'bg-purple-600 mr-12';
  } else if (type === 'error') {
    classes += 'bg-red-600 mr-12';
  } else {
    classes += 'bg-gray-700';
  }
  messageDiv.className = classes;
  messageDiv.textContent = content;
  chatMessages.appendChild(messageDiv);
  messageDiv.scrollIntoView({ behavior: 'smooth' });
}

async function sendPrompt(prompt) {
  const statusEl = document.getElementById('statusDisplay');
  try {
    if (!auth0Client) throw new Error('Auth0 not initialized');
    const token = await auth0Client.getTokenSilently();
    const res = await fetch('/.netlify/functions/poetic-brain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json().catch(() => ({ error: 'Invalid JSON from server' }));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    addMessage(data.response || '(no response)', 'assistant');
  } catch (err) {
    console.error('[Chat] sendPrompt error:', err);
    addMessage(`Error: ${err.message}`, 'error');
    if (statusEl) statusEl.textContent = 'Error sending message';
  }
}

function wireUI() {
  document.getElementById('backToMathBrain')?.addEventListener('click', () => {
    window.location.href = '/';
  });

  const form = document.getElementById('chatForm');
  const input = document.getElementById('promptInput');
  const sendBtn = document.getElementById('sendButton');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = input.value.trim();
    if (!prompt) return;
    input.value = '';
    addMessage(prompt, 'user');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending…';
    try {
      await sendPrompt(prompt);
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send';
    }
  });
}

async function main() {
  wireUI();
  const statusEl = document.getElementById('statusDisplay');
  if (statusEl) statusEl.textContent = 'Connecting…';
  const ok = await initAuth0();
  if (!ok && !debugMode) {
    if (statusEl) statusEl.textContent = 'Authentication required. Redirecting…';
    setTimeout(() => (window.location.href = '/'), 1500);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
