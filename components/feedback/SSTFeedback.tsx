"use client";

import React, { useState } from 'react';

interface SSTFeedbackProps {
  hookTitle: string;
  hookData?: {
    intensity?: number;
    orb?: number;
    aspect_type?: string;
    planets?: string[];
  };
  sessionId?: string;
  onSubmitFeedback?: (feedback: SSTFeedbackData) => void;
  className?: string;
}

interface SSTFeedbackData {
  category: 'within_boundary' | 'at_boundary_edge' | 'outside_symbolic_range';
  clarification: string;
  hookTitle: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

const SST_OPTIONS = [
  {
    category: 'within_boundary' as const,
    label: 'WB — Within Boundary',
    description: 'Clear, felt resonance — this fits my lived experience',
    color: 'emerald',
    icon: '✓'
  },
  {
    category: 'at_boundary_edge' as const,
    label: 'ABE — At Boundary Edge', 
    description: 'Partial fit — almost right but needs adjustment',
    color: 'amber',
    icon: '~'
  },
  {
    category: 'outside_symbolic_range' as const,
    label: 'OSR — Outside Symbolic Range',
    description: 'No resonance — this doesn\'t match my experience',
    color: 'slate',
    icon: '×'
  }
];

export default function SSTFeedback({ 
  hookTitle, 
  hookData, 
  sessionId, 
  onSubmitFeedback,
  className = ''
}: SSTFeedbackProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [clarification, setClarification] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = () => {
    if (!selectedCategory) return;

    const feedback: SSTFeedbackData = {
      category: selectedCategory as any,
      clarification: clarification.trim(),
      hookTitle,
      sessionId,
      metadata: {
        hook_intensity: hookData?.intensity,
        orb_degrees: hookData?.orb,
        aspect_type: hookData?.aspect_type,
        planets: hookData?.planets,
        timestamp: new Date().toISOString()
      }
    };

    onSubmitFeedback?.(feedback);
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setSelectedCategory('');
    setClarification('');
    setIsSubmitted(false);
    setIsExpanded(false);
  };

  if (isSubmitted) {
    return (
      <div className={`rounded-lg border border-emerald-600/30 bg-emerald-900/20 p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-100">
            <span className="text-lg">✓</span>
            <span className="font-medium">Feedback recorded</span>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-emerald-200/70 hover:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded px-2 py-1"
          >
            Add another
          </button>
        </div>
        <div className="mt-2 text-sm text-emerald-200/80">
          Hook: "{hookTitle}" → {selectedCategory.replace('_', ' ').toUpperCase()}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-slate-600 bg-slate-800/60 p-4 ${className}`}>
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-slate-100">How does this land?</h4>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-slate-400 hover:text-slate-200 focus:outline-none"
          >
            {isExpanded ? 'Collapse' : 'Details'}
          </button>
        </div>
        <div className="mt-1 text-sm text-slate-300 font-medium">
          "{hookTitle}"
        </div>
        {isExpanded && hookData && (
          <div className="mt-2 text-xs text-slate-400 space-y-1">
            {hookData.planets && <div>Planets: {hookData.planets.join(' ')}</div>}
            {hookData.aspect_type && <div>Aspect: {hookData.aspect_type}</div>}
            {hookData.orb !== undefined && <div>Orb: {hookData.orb.toFixed(1)}°</div>}
            {hookData.intensity && <div>Intensity: {Math.round(hookData.intensity)}</div>}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {SST_OPTIONS.map((option) => {
          const isSelected = selectedCategory === option.category;
          const colorClasses: Record<string, string> = {
            emerald: isSelected 
              ? 'border-emerald-500 bg-emerald-900/40 text-emerald-100' 
              : 'border-emerald-600/30 hover:border-emerald-500/50 hover:bg-emerald-900/20',
            amber: isSelected 
              ? 'border-amber-500 bg-amber-900/40 text-amber-100' 
              : 'border-amber-600/30 hover:border-amber-500/50 hover:bg-amber-900/20',
            slate: isSelected 
              ? 'border-slate-400 bg-slate-700/60 text-slate-100' 
              : 'border-slate-600/50 hover:border-slate-500 hover:bg-slate-700/40'
          };

          return (
            <button
              key={option.category}
              onClick={() => setSelectedCategory(option.category)}
              className={`w-full text-left rounded-md border p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${colorClasses[option.color]}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{option.icon}</span>
                  <span className="font-medium">{option.label}</span>
                </div>
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-current"></div>
                )}
              </div>
              <div className="mt-1 text-xs opacity-80">
                {option.description}
              </div>
            </button>
          );
        })}
      </div>

      {selectedCategory && (
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="clarification" className="block text-sm text-slate-300 mb-1">
              Optional clarification:
            </label>
            <textarea
              id="clarification"
              value={clarification}
              onChange={(e) => setClarification(e.target.value)}
              placeholder="Add specific details about how this lands (or doesn't) for you..."
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              maxLength={500}
            />
            <div className="mt-1 text-xs text-slate-400">
              {clarification.length}/500 characters
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Purpose: Keep mirrors honest; misses are calibration data
            </div>
            <button
              onClick={handleSubmit}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Submit Feedback
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export type { SSTFeedbackData, SSTFeedbackProps };