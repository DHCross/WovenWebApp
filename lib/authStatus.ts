export const AUTH_STATUS_STORAGE_KEY = 'auth.status';
export const AUTH_STATUS_EVENT = 'auth-status-change';

export type AuthStatusPayload = {
  authed: boolean;
  user: string | null;
  updatedAt: number;
};

function sanitizeUser(userValue: string | null): string | null {
  if (typeof userValue !== 'string') {
    return null;
  }
  const trimmed = userValue.trim();
  return trimmed ? trimmed : null;
}

export function persistAuthStatus(authedValue: boolean, userValue: string | null) {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: AuthStatusPayload = {
    authed: Boolean(authedValue),
    user: sanitizeUser(userValue),
    updatedAt: Date.now(),
  };

  try {
    window.localStorage.setItem(AUTH_STATUS_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    // Keep behavior consistent with existing components that log but do not throw.
    console.warn('Auth status persistence failed', err);
  }

  try {
    window.dispatchEvent(new CustomEvent(AUTH_STATUS_EVENT, { detail: payload }));
  } catch (err) {
    console.warn('Auth status event dispatch failed', err);
  }
}

export function readAuthStatus(): AuthStatusPayload | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STATUS_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const authed = Boolean((parsed as any).authed);
    const user = sanitizeUser((parsed as any).user ?? null);
    const updatedAt = typeof (parsed as any).updatedAt === 'number' ? (parsed as any).updatedAt : Date.now();
    return { authed, user, updatedAt };
  } catch (err) {
    console.warn('Failed to read cached auth status', err);
    return null;
  }
}
