// Small shared utility for Auth0 redirect consistency
// Send users back to home page after authentication

export function getRedirectUri(): string {
  if (typeof window === 'undefined') {
    // SSR fallback: safe default path; client will compute exact origin
    return '/';
  }
  return window.location.origin + '/';
}
