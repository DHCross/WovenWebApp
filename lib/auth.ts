// Small shared utility for Auth0 redirect consistency
// Send users back to home page after authentication

const AUTH_CALLBACK_PATH = '/math-brain';

export function getRedirectUri(): string {
  if (typeof window === 'undefined') {
    // SSR fallback: safe default path; client will compute exact origin
    return AUTH_CALLBACK_PATH;
  }

  try {
    return new URL(AUTH_CALLBACK_PATH, window.location.origin).toString();
  } catch (err) {
    // Fallback to manual concatenation if URL construction fails (very unlikely)
    const origin = window.location.origin.replace(/\/$/, '');
    return `${origin}${AUTH_CALLBACK_PATH}`;
  }
}
