"use client";

import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { translateTerm, translateText } from './dictionary';

const STORAGE_KEY = 'woven.plainMode';

interface PlainModeContextValue {
  isPlainMode: boolean;
  togglePlainMode: () => void;
  setPlainMode: (enabled: boolean) => void;
  /** Translate a single term */
  t: (term: string) => string;
  /** Translate all terms in a text block */
  tt: (text: string) => string;
}

const PlainModeContext = createContext<PlainModeContextValue | null>(null);

interface PlainModeProviderProps {
  children: ReactNode;
  /** Default to plain mode for new users (recommended for Anti-Dread archetype) */
  defaultPlainMode?: boolean;
}

export function PlainModeProvider({ children, defaultPlainMode = true }: PlainModeProviderProps) {
  const [isPlainMode, setIsPlainModeState] = useState(defaultPlainMode);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsPlainModeState(stored === 'true');
      }
    } catch {
      // localStorage not available
    }
    setHydrated(true);
  }, []);

  const setPlainMode = useCallback((enabled: boolean) => {
    setIsPlainModeState(enabled);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, String(enabled));
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const togglePlainMode = useCallback(() => {
    setPlainMode(!isPlainMode);
  }, [isPlainMode, setPlainMode]);

  const t = useCallback(
    (term: string) => translateTerm(term, isPlainMode),
    [isPlainMode]
  );

  const tt = useCallback(
    (text: string) => translateText(text, isPlainMode),
    [isPlainMode]
  );

  const value: PlainModeContextValue = {
    isPlainMode,
    togglePlainMode,
    setPlainMode,
    t,
    tt,
  };

  // Prevent hydration mismatch by rendering with default until client hydrates
  if (!hydrated) {
    return (
      <PlainModeContext.Provider value={{ ...value, isPlainMode: defaultPlainMode }}>
        {children}
      </PlainModeContext.Provider>
    );
  }

  return (
    <PlainModeContext.Provider value={value}>
      {children}
    </PlainModeContext.Provider>
  );
}

/**
 * Hook to access plain mode state and translations
 * @example
 * const { isPlainMode, t, tt } = usePlainMode();
 * return <h1>{t('Math Brain')}</h1>; // "Clarity Engine" in plain mode
 */
export function usePlainMode(): PlainModeContextValue {
  const context = useContext(PlainModeContext);
  
  if (!context) {
    // Fallback for components outside provider - return passthrough
    return {
      isPlainMode: false,
      togglePlainMode: () => {},
      setPlainMode: () => {},
      t: (term: string) => term,
      tt: (text: string) => text,
    };
  }
  
  return context;
}

export default PlainModeProvider;
