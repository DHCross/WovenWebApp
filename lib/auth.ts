// Small shared utility for Auth0 redirect consistency
// Always send users back to Math Brain after authentication

export function getRedirectUri(): string {
  if (typeof window === 'undefined') {
    // SSR fallback: safe default path; client will compute exact origin
    return '/math-brain';
  }
  return window.location.origin + '/math-brain';
}
