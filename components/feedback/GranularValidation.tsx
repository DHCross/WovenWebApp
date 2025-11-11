'use client';

import React, { useState, useMemo } from 'react';
import type { SSTTag } from '../../lib/raven/sst';
import type { ValidationPoint } from '../../lib/validation/types';

interface GranularValidationProps {
  messageId: string;
  validationPoints: ValidationPoint[];
  onComplete: (validations: ValidationPoint[]) => void;
  onNoteChange?: (id: string, note: string) => void;
  className?: string;
}

const TAG_OPTIONS: { value: SSTTag; label: string; color: string; icon: string; shortLabel: string }[] = [
  { value: 'WB', label: 'Lands', color: 'emerald', icon: '✓', shortLabel: 'Lands' },
  { value: 'ABE', label: 'Edge', color: 'amber', icon: '~', shortLabel: 'Edge' },
  { value: 'OSR', label: 'Outside', color: 'slate', icon: '×', shortLabel: 'Outside' },
];

export function GranularValidation({
  messageId,
  validationPoints,
  onComplete,
  onNoteChange,
  className = '',
}: GranularValidationProps) {
  const [activePoint, setActivePoint] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const handleTagSelect = (pointId: string, tag: SSTTag) => {
    const updatedPoints = validationPoints.map(p => 
      p.id === pointId ? { ...p, tag } : p
    );
    onComplete(updatedPoints);
    setActivePoint(null);
  };

  const handleNoteChange = (pointId: string, note: string) => {
    setNotes(prev => ({ ...prev, [pointId]: note }));
    onNoteChange?.(pointId, note);
  };

  const validationSummary = useMemo(() => {
    const counts = validationPoints.reduce(
      (acc, p) => ({
        ...acc,
        [p.tag || 'unset']: (acc[p.tag || 'unset'] || 0) + 1,
      }),
      {} as Record<string, number>
    );

    return (
      <div className="text-sm text-slate-400 mt-4 p-3 bg-slate-800/30 rounded-lg">
        <div className="flex flex-wrap gap-4 justify-center">
          {TAG_OPTIONS.map(({ value, shortLabel, color, icon }) => (
            <div key={value} className="flex items-center gap-1">
              <span className={`text-${color}-400`}>{icon}</span>
              <span>{counts[value] || 0} {shortLabel}</span>
            </div>
          ))}
          {counts.unset > 0 && (
            <div className="flex items-center gap-1 text-slate-500">
              <span>•</span>
              <span>{counts.unset} to review</span>
            </div>
          )}
        </div>
      </div>
    );
  }, [validationPoints]);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-3">
        {validationPoints.map((point) => (
          <div key={point.id} className="relative group">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-28">
                <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-slate-700/50 text-slate-300">
                  {point.field}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-100">{point.voice}</p>
                
                {point.tag ? (
                  <div className="mt-1">
                    <button
                      onClick={() => setActivePoint(activePoint === point.id ? null : point.id)}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        point.tag === 'WB' 
                          ? 'bg-emerald-900/50 text-emerald-200 border border-emerald-800/50'
                          : point.tag === 'ABE'
                            ? 'bg-amber-900/50 text-amber-200 border border-amber-800/50'
                            : 'bg-slate-800/50 text-slate-300 border border-slate-700/50'
                      }`}
                      title={TAG_OPTIONS.find(t => t.value === point.tag)?.label}
                    >
                      {TAG_OPTIONS.find(t => t.value === point.tag)?.icon} {TAG_OPTIONS.find(t => t.value === point.tag)?.shortLabel}
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex gap-1">
                    {TAG_OPTIONS.map(({ value, color, icon, label, shortLabel }) => (
                      <button
                        key={value}
                        onClick={() => handleTagSelect(point.id, value)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                          value === 'WB' 
                            ? 'hover:bg-emerald-800/30 hover:text-emerald-300 text-emerald-400'
                            : value === 'ABE'
                              ? 'hover:bg-amber-800/30 hover:text-amber-300 text-amber-400'
                              : 'hover:bg-slate-700/50 hover:text-slate-200 text-slate-400'
                        }`}
                        title={label}
                      >
                        <span>{icon}</span>
                        <span className="hidden sm:inline">{shortLabel}</span>
                      </button>
                    ))}
                  </div>
                )}

                {(activePoint === point.id || notes[point.id]) && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={notes[point.id] || ''}
                      onChange={(e) => handleNoteChange(point.id, e.target.value)}
                      placeholder="Add a note (optional)"
                      className="w-full px-2 py-1 text-sm bg-slate-800/50 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-600"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {validationSummary}
    </div>
  );
}

export default GranularValidation;
