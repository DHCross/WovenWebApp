// Minimal Auth0 bootstrap for the chat page using the existing auth-config function
export let auth0Client = null;

async function fetchAuthConfig() {
  const res = await fetch('/.netlify/functions/auth-config');
  if (!res.ok) throw new Error(`auth-config failed: ${res.status}`);
  return res.json();
}

export async function initAuth0() {
  const statusEl = document.getElementById('statusDisplay');
  try {
    const cfg = await fetchAuthConfig();
    auth0Client = await createAuth0Client({
      domain: cfg.domain,
      clientId: cfg.clientId,
      authorizationParams: {
        audience: cfg.audience || undefined,
        // Return to /chat so we stay on this page after Auth0 completes
        redirect_uri: window.location.origin + '/chat'
      }
    });

    // If coming back from Auth0
    const query = window.location.search;
    if (query.includes('code=') && query.includes('state=')) {
      await auth0Client.handleRedirectCallback();
      // Clean query params but remain on /chat
      window.history.replaceState({}, document.title, '/chat');
    }

    const isAuthed = await auth0Client.isAuthenticated();
    if (!isAuthed) {
      // Silent login if possible
      try {
        await auth0Client.getTokenSilently();
      } catch (_) {
        // fall through; UI will still work in debug mode
      }
    }

    const final = await auth0Client.isAuthenticated();
    if (statusEl) statusEl.textContent = final ? 'Connected to Poetic Brain' : 'Authentication not completed (debug mode allowed)';
    return final;
  } catch (error) {
    console.error('[Chat Auth0] init failed:', error);
    if (statusEl) statusEl.textContent = 'Auth initialization error (see console)';
    return false;
  }
}
