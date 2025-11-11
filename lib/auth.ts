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

export function normalizeAuth0Domain(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, '');
  const withoutTrailingSlashes = withoutProtocol.replace(/\/+$/, '');
  return withoutTrailingSlashes || null;
}

export function normalizeAuth0ClientId(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

export function normalizeAuth0Audience(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

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

// Optional connection override. Defaults to 'google-oauth2' for convenience,
// but can be disabled (to use Universal Login) by setting
// NEXT_PUBLIC_AUTH_CONNECTION to 'auto', 'none', '' or 'false'.
export function getAuthConnection(): string | null {
  const raw = process.env.NEXT_PUBLIC_AUTH_CONNECTION;
  if (typeof raw !== 'string') return 'google-oauth2';
  const v = raw.trim().toLowerCase();
  if (!v || v === 'auto' || v === 'none' || v === 'false') return null;
  return raw.trim();
}
