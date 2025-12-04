"use client";

import React from 'react';

export type ProgressStage = 'field' | 'map' | 'voice';

interface StickyProgressProps {
  /** Current stage in the FIELD → MAP → VOICE flow */
  stage: ProgressStage;
  /** Optional: Show labels (hidden on very small screens by default) */
  showLabels?: boolean;
  /** Optional: Custom class name */
  className?: string;
}

const STEPS: { id: ProgressStage; label: string; plainLabel: string }[] = [
  { id: 'field', label: 'Field', plainLabel: 'Input' },
  { id: 'map', label: 'Map', plainLabel: 'Calculate' },
  { id: 'voice', label: 'Voice', plainLabel: 'Mirror' },
];

/**
 * StickyProgress - The "Golden Thread" Progress Bar
 * 
 * Shows users where they are in the FIELD (Input) → MAP (Calculation) → VOICE (Mirror)
 * process. This provides:
 * 
 * 1. Orientation - "Where am I in this process?"
 * 2. Expectation setting - "What comes next?"
 * 3. Completion satisfaction - Visual progress toward the goal
 * 
 * Per the Invisible Scaffolding philosophy, this reduces anxiety by
 * making the multi-step process feel navigable.
 */
export function StickyProgress({ 
  stage, 
  showLabels = true,
  className = '' 
}: StickyProgressProps) {
  const currentIndex = STEPS.findIndex(s => s.id === stage);

  return (
    <div className={`sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-sm border-b border-slate-800/50 ${className}`}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const isComplete = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isPending = idx > currentIndex;

            return (
              <React.Fragment key={step.id}>
                {/* Step indicator */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Circle */}
                  <div 
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                      transition-all duration-300
                      ${isComplete 
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' 
                        : isCurrent
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 ring-2 ring-indigo-400/30'
                          : 'bg-slate-800 text-slate-500'
                      }
                    `}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    {isComplete ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>

                  {/* Label (responsive) */}
                  {showLabels && (
                    <span 
                      className={`
                        text-xs uppercase tracking-wider hidden sm:inline
                        transition-colors duration-300
                        ${isComplete || isCurrent ? 'text-slate-200' : 'text-slate-600'}
                      `}
                    >
                      {step.plainLabel}
                    </span>
                  )}
                </div>

                {/* Connector line */}
                {idx < STEPS.length - 1 && (
                  <div 
                    className={`
                      flex-1 h-px mx-2 sm:mx-4 
                      transition-colors duration-300
                      ${isComplete ? 'bg-emerald-600' : 'bg-slate-800'}
                    `}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to determine the current progress stage based on app state
 */
export function deriveProgressStage(state: {
  hasInput?: boolean;
  hasGeometry?: boolean;
  hasMirror?: boolean;
}): ProgressStage {
  if (state.hasMirror) return 'voice';
  if (state.hasGeometry) return 'map';
  return 'field';
}

export default StickyProgress;
