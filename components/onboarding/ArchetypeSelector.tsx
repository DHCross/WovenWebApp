"use client";

import React from 'react';

export interface Archetype {
  id: 'antiDread' | 'creative' | 'jungCurious';
  icon: string;
  label: string;
  desc: string;
  color: 'emerald' | 'purple' | 'indigo';
  /** Default form presets for this archetype */
  presets: {
    reportType: 'mirror' | 'relational' | 'weather';
    showTechnicalDetails: boolean;
    plainModeDefault: boolean;
  };
}

export const ARCHETYPES: Archetype[] = [
  {
    id: 'antiDread',
    icon: '🧭',
    label: "I Need Clarity Now",
    desc: "Navigate a crisis or major transition.",
    color: 'emerald',
    presets: {
      reportType: 'mirror',
      showTechnicalDetails: false,
      plainModeDefault: true,
    },
  },
  {
    id: 'creative',
    icon: '🎭',
    label: "I'm Crafting Something",
    desc: "Understand patterns for storytelling.",
    color: 'purple',
    presets: {
      reportType: 'mirror',
      showTechnicalDetails: true,
      plainModeDefault: true,
    },
  },
  {
    id: 'jungCurious',
    icon: '🔬',
    label: "Show Me the System",
    desc: "Evidence-based symbolic insights.",
    color: 'indigo',
    presets: {
      reportType: 'mirror',
      showTechnicalDetails: true,
      plainModeDefault: false,
    },
  },
];

interface ArchetypeSelectorProps {
  /** Callback when an archetype is selected */
  onSelect: (archetype: Archetype) => void;
  /** Currently selected archetype ID (if any) */
  selectedId?: string;
  /** Whether to show a compact version */
  compact?: boolean;
}

/**
 * ArchetypeSelector - Quick Start Flow Component
 * 
 * This component provides a "Quick Start" façade that makes the complex
 * form behind the scenes feel invisible. It:
 * 
 * 1. Identifies the user's primary intent/archetype
 * 2. Pre-fills form defaults based on that archetype
 * 3. Adjusts the UX (Plain Mode, technical details) accordingly
 * 
 * Per the Invisible Scaffolding philosophy, this reduces cognitive load
 * by asking ONE question instead of many form fields.
 */
export function ArchetypeSelector({ 
  onSelect, 
  selectedId,
  compact = false 
}: ArchetypeSelectorProps) {
  const colorClasses = {
    emerald: 'hover:border-emerald-500/50 hover:bg-emerald-950/20',
    purple: 'hover:border-purple-500/50 hover:bg-purple-950/20',
    indigo: 'hover:border-indigo-500/50 hover:bg-indigo-950/20',
  };

  const selectedColorClasses = {
    emerald: 'border-emerald-500/70 bg-emerald-950/30 ring-2 ring-emerald-500/20',
    purple: 'border-purple-500/70 bg-purple-950/30 ring-2 ring-purple-500/20',
    indigo: 'border-indigo-500/70 bg-indigo-950/30 ring-2 ring-indigo-500/20',
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {ARCHETYPES.map((arch) => {
          const isSelected = selectedId === arch.id;
          return (
            <button
              key={arch.id}
              onClick={() => onSelect(arch)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
                ${isSelected 
                  ? selectedColorClasses[arch.color]
                  : `border-slate-700 bg-slate-900/50 ${colorClasses[arch.color]}`
                }
              `}
            >
              <span className="text-lg">{arch.icon}</span>
              <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                {arch.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
      {ARCHETYPES.map((arch) => {
        const isSelected = selectedId === arch.id;
        return (
          <button
            key={arch.id}
            onClick={() => onSelect(arch)}
            className={`
              text-left p-6 rounded-xl border transition-all duration-200
              ${isSelected 
                ? selectedColorClasses[arch.color]
                : `border-slate-800 bg-slate-900/50 ${colorClasses[arch.color]} hover:scale-[1.02]`
              }
              group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950
              ${isSelected ? '' : 'focus:ring-slate-500'}
            `}
            aria-pressed={isSelected}
          >
            {/* Icon */}
            <div className="text-3xl mb-3 transition-transform group-hover:scale-110">
              {arch.icon}
            </div>
            
            {/* Label */}
            <div className={`font-bold transition-colors ${isSelected ? 'text-white' : 'text-slate-100 group-hover:text-white'}`}>
              {arch.label}
            </div>
            
            {/* Description */}
            <div className={`text-sm mt-1 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
              {arch.desc}
            </div>

            {/* Selection indicator */}
            {isSelected && (
              <div className="mt-3 flex items-center gap-1 text-xs text-emerald-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Selected</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Get archetype by ID
 */
export function getArchetypeById(id: string): Archetype | undefined {
  return ARCHETYPES.find(a => a.id === id);
}

/**
 * Apply archetype presets to localStorage/session state
 */
export function applyArchetypePresets(archetype: Archetype): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Store selected archetype for session continuity
    window.localStorage.setItem('woven.archetype', archetype.id);
    
    // Apply plain mode preference
    window.localStorage.setItem('woven.plainMode', String(archetype.presets.plainModeDefault));
    
    // Store technical details preference
    window.localStorage.setItem('woven.showTechnicalDetails', String(archetype.presets.showTechnicalDetails));
  } catch {
    // localStorage not available
  }
}

export default ArchetypeSelector;
