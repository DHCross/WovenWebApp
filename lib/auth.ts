// Small shared utility for Auth0 redirect consistency
// Send users back to Math Brain after authentication (default)

const DEFAULT_CALLBACK_PATH = '/math-brain';

function normalizeCallbackPath(raw?: string | null): string {
  if (!raw) return DEFAULT_CALLBACK_PATH;
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_CALLBACK_PATH;

  // Allow developers to specify a full URL (https://example.com/callback)
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Ensure the path always starts with a single leading slash.
  const normalized = `/${trimmed.replace(/^\/+/g, '')}`;
  const withoutTrailing = normalized.replace(/\/+$/, '');
  return withoutTrailing || '/';
}

const AUTH_CALLBACK_PATH = normalizeCallbackPath(process.env.NEXT_PUBLIC_AUTH_CALLBACK_PATH);

export function getRedirectUri(): string {
  if (typeof window === 'undefined') {
    // SSR fallback: safe default path; client will compute exact origin
    return AUTH_CALLBACK_PATH;
  }

  try {
    const target = AUTH_CALLBACK_PATH || DEFAULT_CALLBACK_PATH;
    if (/^https?:\/\//i.test(target)) {
      return target;
    }
    return new URL(target, window.location.origin).toString();
  } catch (err) {
    // Fallback to manual concatenation if URL construction fails (very unlikely)
    const target = AUTH_CALLBACK_PATH || DEFAULT_CALLBACK_PATH;
    if (/^https?:\/\//i.test(target)) {
      return target;
    }
    const origin = window.location.origin.replace(/\/$/, '');
    return `${origin}${target.startsWith('/') ? target : `/${target}`}`;
  }
}
