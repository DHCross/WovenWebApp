/**
 * Session Bridge Utility
 * 
 * Handles the handoff between Math Brain (anonymous/pre-auth) and Poetic Brain
 * (authenticated). This allows users to:
 * 
 * 1. Generate a report anonymously via Math Brain
 * 2. Carry that context into the authenticated Chat environment
 * 3. Resume without losing state after auth redirect
 * 
 * This implements Phase 1 of the Invisible Scaffolding philosophy:
 * the transition should feel seamless, not like a "broken handoff".
 */

import { v4 as uuidv4 } from 'uuid';

const BRIDGE_STORAGE_KEY = 'woven.bridgeSession';
const BRIDGE_COOKIE_NAME = 'woven_bridge_id';
const BRIDGE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

export interface BridgeSession {
  id: string;
  timestamp: number;
  archetype?: 'antiDread' | 'creative' | 'jungCurious';
  reportData: any;
  reportType?: 'mirror' | 'relational' | 'weather';
  personAName?: string;
  personBName?: string;
  status: 'pending_handoff' | 'acknowledged' | 'consumed';
}

/**
 * Save the Math Brain result to a temporary "Bridge" session
 * This persists across the auth redirect flow
 */
export function bridgeMathBrainSession(
  reportData: any,
  options: {
    archetype?: BridgeSession['archetype'];
    reportType?: BridgeSession['reportType'];
    personAName?: string;
    personBName?: string;
  } = {}
): string {
  const bridgeId = uuidv4();
  const payload: BridgeSession = {
    id: bridgeId,
    timestamp: Date.now(),
    archetype: options.archetype,
    reportData,
    reportType: options.reportType || 'mirror',
    personAName: options.personAName,
    personBName: options.personBName,
    status: 'pending_handoff',
  };

  if (typeof window !== 'undefined') {
    try {
      // Save to localStorage for client-side persistence across redirects
      window.localStorage.setItem(BRIDGE_STORAGE_KEY, JSON.stringify(payload));
      
      // Set a short-lived cookie for middleware verification if needed
      const maxAgeSeconds = Math.floor(BRIDGE_MAX_AGE_MS / 1000);
      document.cookie = `${BRIDGE_COOKIE_NAME}=${bridgeId}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
    } catch {
      // Failed to persist - non-critical, session may not survive redirect
    }
  }

  return bridgeId;
}

/**
 * Recover a pending bridge session
 * Called in ChatClient.tsx to check if there's a handoff waiting
 */
export function recoverBridgeSession(): BridgeSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(BRIDGE_STORAGE_KEY);
    if (!raw) return null;

    const data: BridgeSession = JSON.parse(raw);
    
    // Check expiration
    if (Date.now() - data.timestamp > BRIDGE_MAX_AGE_MS) {
      clearBridgeSession();
      return null;
    }
    
    // Only return if still pending
    if (data.status !== 'pending_handoff') {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Mark a bridge session as acknowledged
 * Called when the Poetic Brain starts processing the handoff
 */
export function acknowledgeBridgeSession(bridgeId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const raw = window.localStorage.getItem(BRIDGE_STORAGE_KEY);
    if (!raw) return;

    const data: BridgeSession = JSON.parse(raw);
    if (data.id !== bridgeId) return;

    data.status = 'acknowledged';
    window.localStorage.setItem(BRIDGE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore errors
  }
}

/**
 * Mark a bridge session as consumed and clear it
 * Called after the Poetic Brain has fully processed the handoff
 */
export function consumeBridgeSession(bridgeId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const raw = window.localStorage.getItem(BRIDGE_STORAGE_KEY);
    if (!raw) return;

    const data: BridgeSession = JSON.parse(raw);
    if (data.id === bridgeId) {
      clearBridgeSession();
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Clear the bridge session completely
 */
export function clearBridgeSession(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(BRIDGE_STORAGE_KEY);
    // Clear the cookie
    document.cookie = `${BRIDGE_COOKIE_NAME}=; path=/; max-age=0`;
  } catch {
    // Ignore errors
  }
}

/**
 * Check if there's a pending bridge session without consuming it
 */
export function hasPendingBridgeSession(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const raw = window.localStorage.getItem(BRIDGE_STORAGE_KEY);
    if (!raw) return false;

    const data: BridgeSession = JSON.parse(raw);
    
    // Check expiration
    if (Date.now() - data.timestamp > BRIDGE_MAX_AGE_MS) {
      return false;
    }

    return data.status === 'pending_handoff';
  } catch {
    return false;
  }
}

const sessionBridge = {
  bridge: bridgeMathBrainSession,
  recover: recoverBridgeSession,
  acknowledge: acknowledgeBridgeSession,
  consume: consumeBridgeSession,
  clear: clearBridgeSession,
  hasPending: hasPendingBridgeSession,
};

export default sessionBridge;
