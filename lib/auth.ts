// Small shared utility for Auth0 redirect consistency
// Always send users back to Math Brain after authentication

export function getRedirectUri(): string {
  // Always land the OAuth callback on Math Brain so a single place handles it.
  // This must exactly match an Allowed Callback URL in Auth0 (incl. path, port, and protocol).
  if (typeof window === 'undefined') {
    // SSR fallback: safe default path for Next to render; client computes exact origin
    return '/math-brain';
  }
  return window.location.origin + '/math-brain';
}
