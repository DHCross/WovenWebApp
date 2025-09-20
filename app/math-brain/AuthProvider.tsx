"use client";

import { useEffect, useRef, useState } from 'react';
import { getRedirectUri } from '../../lib/auth';

type Auth0Client = {
  isAuthenticated: () => Promise<boolean>;
  handleRedirectCallback: () => Promise<void>;
  loginWithRedirect: (opts?: any) => Promise<void>;
  getUser: () => Promise<any>;
};

declare global {
  interface Window {
    createAuth0Client?: (config: any) => Promise<Auth0Client>;
    auth0?: {
      createAuth0Client?: (config: any) => Promise<Auth0Client>;
    };
  }
}

export interface AuthState {
  authReady: boolean;
  authed: boolean;
  authEnvOk: boolean;
  authStatus: { domain?: string; clientId?: string } | null;
  login: () => Promise<void>;
}

interface AuthProviderProps {
  onStateChange: (state: AuthState) => void;
}

export default function AuthProvider({ onStateChange }: AuthProviderProps) {
  const authClientRef = useRef<Auth0Client | null>(null);
  const [authState, setAuthState] = useState<Omit<AuthState, 'login'>>({
    authReady: false,
    authed: false,
    authEnvOk: true,
    authStatus: null,
  });

  const loginWithGoogle = async () => {
    try {
      if (!authClientRef.current) {
        console.error("Auth client not ready.");
        return;
      }
      await authClientRef.current?.loginWithRedirect({
        authorizationParams: {
          redirect_uri: getRedirectUri(),
          connection: "google-oauth2",
        },
      });
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function initAuth() {
      try {
        const hasCreate = typeof window.auth0?.createAuth0Client === 'function' || typeof window.createAuth0Client === 'function';
        if (!hasCreate) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "/vendor/auth0-spa-js.production.js";
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Failed to load Auth0 SDK"));
            document.head.appendChild(s);
          });
        }

        let config: any = null;
        try {
          const res = await fetch("/api/auth-config", { cache: "no-store" });
          if (!res.ok) throw new Error(`Auth config failed: ${res.status}`);
          config = await res.json();
          if (!config?.domain || !config?.clientId) {
            if (!cancelled) {
              setAuthState(prev => ({ ...prev, authEnvOk: false, authReady: true }));
            }
            return;
          }
          if (!cancelled) {
            setAuthState(prev => ({
              ...prev,
              authStatus: { domain: String(config.domain), clientId: String(config.clientId) },
              authEnvOk: true,
            }));
          }
        } catch (e) {
          if (!cancelled) {
            setAuthState(prev => ({ ...prev, authEnvOk: false, authReady: true }));
          }
          return;
        }

        const creator = window.auth0?.createAuth0Client || window.createAuth0Client;
        if (typeof creator !== 'function') throw new Error('Auth0 SDK not available');

        // Add timeout to prevent hanging
        const client = await Promise.race([
          creator({
            domain: String(config.domain).replace(/^https?:\/\//, ''),
            clientId: config.clientId,
            authorizationParams: { redirect_uri: getRedirectUri() },
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Auth0 client creation timeout')), 10000)
          )
        ]);
        authClientRef.current = client;

        const qs = window.location.search;
        if (qs.includes("code=") && qs.includes("state=")) {
          await client.handleRedirectCallback();
          const url = new URL(window.location.href);
          url.search = "";
          window.history.replaceState({}, "", url.toString());
          const nowAuthed = await client.isAuthenticated();
          if (nowAuthed) {
            window.location.replace('/chat?from=math-brain');
            return;
          }
        }

        const isAuthed = await client.isAuthenticated();
        if (!cancelled) {
          setAuthState(prev => ({ ...prev, authed: isAuthed, authReady: true }));
        }
      } catch {
        if (!cancelled) {
          setAuthState(prev => ({ ...prev, authReady: true, authEnvOk: false }));
        }
      }
    }

    initAuth();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    onStateChange({ ...authState, login: loginWithGoogle });
  }, [authState, onStateChange]);

  return null; // This is a provider component, it does not render anything itself.
}
