"use client";

import React from 'react';
import { usePlainMode } from '@/lib/plain-mode';

interface PlainModeToggleProps {
  /** Optional: Compact mode for tight spaces */
  compact?: boolean;
  /** Optional: Additional class names */
  className?: string;
}

/**
 * PlainModeToggle - Translation Layer Toggle
 * 
 * Allows users to switch between "Plain English" mode (for Anti-Dread users)
 * and "Technical Terms" mode (for Jung-Curious users who want the full vocabulary).
 * 
 * This implements Phase 3 of the Invisible Scaffolding philosophy:
 * technical complexity should be available but not forced.
 */
export function PlainModeToggle({ compact = false, className = '' }: PlainModeToggleProps) {
  const { isPlainMode, togglePlainMode } = usePlainMode();

  if (compact) {
    return (
      <button 
        onClick={togglePlainMode}
        className={`
          p-2 rounded-full transition-colors
          ${isPlainMode 
            ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' 
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }
          ${className}
        `}
        title={isPlainMode ? 'Switch to technical terms' : 'Switch to plain English'}
        aria-label={isPlainMode ? 'Currently in plain English mode. Click to switch to technical terms.' : 'Currently in technical terms mode. Click to switch to plain English.'}
      >
        <span className="text-sm">{isPlainMode ? '🌱' : '📐'}</span>
      </button>
    );
  }

  return (
    <button 
      onClick={togglePlainMode}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
        ${isPlainMode 
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30' 
          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
        }
        ${className}
      `}
      aria-pressed={isPlainMode}
    >
      <span>{isPlainMode ? '🌱' : '📐'}</span>
      <span>{isPlainMode ? 'Plain English' : 'Technical Terms'}</span>
    </button>
  );
}

export default PlainModeToggle;
