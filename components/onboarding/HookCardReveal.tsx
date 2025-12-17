"use client";

import React from 'react';

interface HookCardRevealProps {
  /** The primary hook headline (e.g., "Restless & Intense") */
  hook: string;
  /** The supporting subhook (e.g., "High tension seeking ground") */
  subhook: string;
  /** Optional: Person's name for personalization */
  personName?: string;
  /** Callback when user clicks to reveal the full map */
  onReveal: () => void;
  /** Optional: Whether to show the card (controlled externally) */
  visible?: boolean;
}

/**
 * HookCardReveal - Limbic Engagement Component
 * 
 * This overlay intercepts the report generation completion with a high-dopamine
 * "Hook Card" before showing the full technical details. It's designed to:
 * 
 * 1. Provide immediate emotional validation ("Pattern Detected")
 * 2. Create curiosity with a punchy hook phrase
 * 3. Build anticipation before the full reveal
 * 
 * Per the Invisible Scaffolding philosophy, this ensures users feel
 * understood before being shown complex geometry.
 */
export function HookCardReveal({
  hook,
  subhook,
  personName,
  onReveal,
  visible = true,
}: HookCardRevealProps) {
  if (!visible) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hook-card-title"
    >
      <div className="max-w-md w-full mx-4 p-8 rounded-2xl bg-gradient-to-br from-indigo-900/80 to-slate-900 border border-indigo-500/30 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-300">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-emerald-500/20 border border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs uppercase tracking-widest text-emerald-300 font-medium">
            Pattern Detected
          </span>
        </div>
        
        {/* Personalization (if available) */}
        {personName && (
          <p className="text-sm text-slate-400 mb-2">
            {personName}&apos;s core signature
          </p>
        )}
        
        {/* Main Hook */}
        <h1 
          id="hook-card-title"
          className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight"
        >
          {hook}
        </h1>
        
        {/* Subhook */}
        <p className="text-lg sm:text-xl text-indigo-200/90 mb-8 leading-relaxed">
          {subhook}
        </p>
        
        {/* Reveal Button */}
        <button 
          onClick={onReveal}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          Reveal My Map
        </button>
        
        {/* Subtle reassurance */}
        <p className="mt-4 text-xs text-slate-500">
          Your full pattern analysis is ready
        </p>
      </div>
    </div>
  );
}

/**
 * Extract a hook phrase from Math Brain geometry
 * This is a simplified extractor - in production, this would use
 * the full mandate/aspect analysis from Poetic Brain
 */
export function extractHookFromGeometry(geometry: any): { hook: string; subhook: string } {
  // Default fallback hooks based on common patterns
  const fallbackHooks = [
    { hook: "Restless & Intense", subhook: "High tension seeking ground" },
    { hook: "Quietly Burning", subhook: "Still waters with deep currents" },
    { hook: "Sharp & Alive", subhook: "Mental energy demanding expression" },
    { hook: "Soft Power", subhook: "Strength wrapped in gentleness" },
    { hook: "The Wanderer", subhook: "Freedom as a core need" },
  ];

  // Try to extract from geometry data
  if (geometry?.hookStack?.length > 0) {
    const first = geometry.hookStack[0];
    return {
      hook: first.headline || first.label || fallbackHooks[0].hook,
      subhook: first.subtext || first.description || fallbackHooks[0].subhook,
    };
  }

  // Check balance meter for dominant pattern
  if (geometry?.balance_meter) {
    const { magnitude, directional_bias } = geometry.balance_meter;
    if (magnitude > 3.5) {
      return { hook: "High Voltage", subhook: "Intensity is your default setting" };
    }
    if (directional_bias > 2) {
      return { hook: "Forward Motion", subhook: "Energy pushing toward action" };
    }
    if (directional_bias < -2) {
      return { hook: "Deep Processing", subhook: "Internal work happening beneath the surface" };
    }
  }

  // Random fallback for demo purposes
  const randomIndex = Math.floor(Math.random() * fallbackHooks.length);
  return fallbackHooks[randomIndex];
}

export default HookCardReveal;
