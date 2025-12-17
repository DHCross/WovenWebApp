/* eslint-disable no-console */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createAuth0Client, Auth0Client } from '@auth0/auth0-spa-js';
import { getRedirectUri, normalizeAuth0Audience, normalizeAuth0ClientId, normalizeAuth0Domain } from '../lib/auth';

const AUTH_TOKEN_KEY = 'auth.token';

// Cache the Auth0 client instance to avoid re-creating
let auth0ClientPromise: Promise<Auth0Client | null> | null = null;
let cachedAudience: string | null = null;

async function getAuth0Client(): Promise<Auth0Client | null> {
  if (auth0ClientPromise) return auth0ClientPromise;

  auth0ClientPromise = (async (): Promise<Auth0Client | null> => {
    try {
      const res = await fetch('/api/auth-config');
      if (!res.ok) throw new Error(`Auth config failed: ${res.status}`);
      const config = await res.json();

      const domain = normalizeAuth0Domain(config?.domain);
      const clientId = normalizeAuth0ClientId(config?.clientId);
      const audience = normalizeAuth0Audience(config?.audience ?? null);

      if (!domain || !clientId) {
        throw new Error('Invalid Auth0 config');
      }

      cachedAudience = audience;

      const redirect_uri = getRedirectUri();
      const authorizationParams: Record<string, any> = { redirect_uri };
      if (audience) {
        authorizationParams.audience = audience;
      }

      return await createAuth0Client({
        domain,
        clientId,
        cacheLocation: 'localstorage',
        useRefreshTokens: true,
        useRefreshTokensFallback: true,
        authorizationParams
      });
    } catch (e) {
      console.error('[useAuth] Failed to initialize Auth0 client:', e);
      auth0ClientPromise = null;
      return null;
    }
  })();

  return auth0ClientPromise;
}

/**
 * Hook for getting fresh auth tokens.
 * This should be used instead of reading directly from localStorage.
 */
export function useAuth() {
  const [isReady, setIsReady] = useState(false);
  const clientRef = useRef<Auth0Client | null>(null);

  useEffect(() => {
    let cancelled = false;

    getAuth0Client().then((client) => {
      if (!cancelled && client) {
        clientRef.current = client;
        setIsReady(true);
      }
    });

    return () => { cancelled = true; };
  }, []);

  /**
   * Gets a fresh access token, refreshing if necessary.
   * This should be called before each authenticated API request.
   */
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const client = clientRef.current;
    if (!client) {
      // Fallback to stored token if client not ready
      return typeof window !== 'undefined'

        ? window.localStorage.getItem(AUTH_TOKEN_KEY) 

        ? window.localStorage.getItem(AUTH_TOKEN_KEY)

        : null;
    }

    try {
      // getTokenSilently will automatically use cached token if valid,
      // or refresh using the refresh token if expired
      const token = await client.getTokenSilently({
        authorizationParams: {
          audience: cachedAudience || undefined,
          scope: 'openid profile email'
        }
      });

      // Update localStorage for components that still read from it
      if (token && typeof window !== 'undefined') {
        window.localStorage.setItem(AUTH_TOKEN_KEY, token);
      }

      return token;
    } catch (error) {
      console.warn('[useAuth] Failed to get token silently:', error);


      // Clear any stale token so we do not keep sending invalid credentials
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
      }

      // If login is required, force a redirect so the user can re-authenticate cleanly
      const requiresLogin = (error as any)?.error === 'login_required' || (error as any)?.error === 'consent_required';
      if (requiresLogin) {
        try {
          await client.loginWithRedirect({
            authorizationParams: {
              redirect_uri: getRedirectUri(),
            }
          });
        } catch (redirectError) {
          console.warn('[useAuth] Redirect for re-auth failed:', redirectError);
        }
      }

      return null;

      // If refresh fails, try to return cached token as last resort
      // (it might still work if the error was transient)
      return typeof window !== 'undefined'
        ? window.localStorage.getItem(AUTH_TOKEN_KEY)
        : null;

    }
  }, []);

  return {
    isReady,
    getAccessToken
  };
}

/**
 * Non-hook version for use in callbacks or outside React components.
 * Attempts to refresh the token using the cached Auth0 client.
 */
export async function getAccessTokenAsync(): Promise<string | null> {
  const client = await getAuth0Client();

  if (!client) {

=======
    // No client = auth not configured. Return stored token if exists.

    return typeof window !== 'undefined'
      ? window.localStorage.getItem(AUTH_TOKEN_KEY)
      : null;
  }

  try {
    const token = await client.getTokenSilently({
      authorizationParams: {
        audience: cachedAudience || undefined,
        scope: 'openid profile email'
      }
    });

    if (token && typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    }

    return token;

  } catch (error) {
    console.warn('[getAccessTokenAsync] Failed to get token:', error);

    // Clear stale token to avoid repeated invalid-session failures
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }

    const requiresLogin = (error as any)?.error === 'login_required' || (error as any)?.error === 'consent_required';
    if (requiresLogin) {
      try {
        await client.loginWithRedirect({
          authorizationParams: {
            redirect_uri: getRedirectUri(),
          }
        });
      } catch (redirectError) {
        console.warn('[getAccessTokenAsync] Redirect for re-auth failed:', redirectError);

  } catch (error: any) {
    console.warn('[getAccessTokenAsync] Failed to get token:', error?.message || error);

    // IMPORTANT: Do NOT return stale token when refresh fails.
    // This causes "token invalid/expired" errors that confuse users.
    // Instead, clear the stale token and return null.
    // The API will return 401, and the UI should prompt re-login.
    if (typeof window !== 'undefined') {
      const errorMsg = error?.message || '';
      // Only clear if it's a legitimate auth failure (not network issues)
      if (errorMsg.includes('Login required') ||
        errorMsg.includes('Consent required') ||
        errorMsg.includes('expired') ||
        errorMsg.includes('invalid')) {
        console.log('[getAccessTokenAsync] Clearing stale token - reauth required');
        window.localStorage.removeItem(AUTH_TOKEN_KEY);

      }
    }

    return null;
  }
}


export default useAuth;
