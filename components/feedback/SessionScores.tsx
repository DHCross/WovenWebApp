"use client";

import React from 'react';

interface SessionScoresProps {
  scores: {
    accuracy: number;
    edge_capture: number;
    clarity: number;
    total_entries: number;
    wb_count: number;
    abe_count: number;
    osr_count: number;
    unclear_count?: number;
  };
  driftIndex?: {
    drift_detected: boolean;
    drift_direction: 'sidereal' | 'tropical' | null;
    confidence: number;
    osr_count: number;
    driver_aligned: number;
    role_aligned: number;
    sample_size?: number;
  };
  className?: string;
  showDetails?: boolean;
}

export default function SessionScores({ 
  scores, 
  driftIndex, 
  className = '',
  showDetails = false 
}: SessionScoresProps) {
  if (scores.total_entries === 0) {
    return (
      <div className={`rounded-lg border border-slate-600 bg-slate-800/40 p-4 ${className}`}>
        <h3 className="font-medium text-slate-100 mb-2">Session Scores</h3>
        <div className="text-sm text-slate-400">
          No feedback entries yet. Try responding to some Hook Stack prompts to see your session metrics.
        </div>
      </div>
    );
  }

  const formatPercent = (value: number) => Math.round(value * 100);
  const formatScore = (value: number) => value.toFixed(2);

  return (
    <div className={`rounded-lg border border-slate-600 bg-slate-800/40 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-100">Session Scores</h3>
        <div className="text-xs text-slate-400">
          {scores.total_entries} entries
        </div>
      </div>

      {/* Core Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-400">
            {formatPercent(scores.accuracy)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">Accuracy</div>
          <div className="text-xs text-slate-500">
            WB ÷ Total
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-400">
            {formatPercent(scores.edge_capture)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">Edge Capture</div>
          <div className="text-xs text-slate-500">
            ABE ÷ (WB + ABE)
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-sky-400">
            {formatPercent(scores.clarity)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">Clarity</div>
          <div className="text-xs text-slate-500">
            Clear responses
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-md bg-emerald-900/30 border border-emerald-600/30 p-2 text-center">
          <div className="text-lg font-semibold text-emerald-100">{scores.wb_count}</div>
          <div className="text-xs text-emerald-200/80">WB</div>
        </div>
        
        <div className="rounded-md bg-amber-900/30 border border-amber-600/30 p-2 text-center">
          <div className="text-lg font-semibold text-amber-100">{scores.abe_count}</div>
          <div className="text-xs text-amber-200/80">ABE</div>
        </div>
        
        <div className="rounded-md bg-slate-700/40 border border-slate-600/50 p-2 text-center">
          <div className="text-lg font-semibold text-slate-100">{scores.osr_count}</div>
          <div className="text-xs text-slate-300/80">OSR</div>
        </div>
      </div>

      {/* Drift Index */}
      {driftIndex && driftIndex.osr_count >= 3 && (
        <div className="border-t border-slate-600 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-slate-200">Drift Index</h4>
            {driftIndex.drift_detected && (
              <span className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${
                driftIndex.drift_direction === 'sidereal' 
                  ? 'bg-purple-900/30 border border-purple-600/30 text-purple-100'
                  : 'bg-blue-900/30 border border-blue-600/30 text-blue-100'
              }`}>
                {driftIndex.drift_direction === 'sidereal' ? 'Sidereal Drift' : 'Tropical Drift'}
              </span>
            )}
          </div>
          
          {driftIndex.drift_detected ? (
            <div className="space-y-2">
              <div className="text-sm text-slate-300">
                {formatPercent(driftIndex.confidence)}% confidence in{' '}
                <span className="font-medium">
                  {driftIndex.drift_direction === 'sidereal' ? 'Driver-aligned' : 'Role-aligned'}
                </span>{' '}
                language preference
              </div>
              
              {showDetails && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-slate-900/60 p-2">
                    <div className="text-slate-400">Driver-aligned OSRs</div>
                    <div className="text-slate-100 font-medium">{driftIndex.driver_aligned}</div>
                  </div>
                  <div className="rounded bg-slate-900/60 p-2">
                    <div className="text-slate-400">Role-aligned OSRs</div>
                    <div className="text-slate-100 font-medium">{driftIndex.role_aligned}</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-400">
              No significant drift detected ({driftIndex.osr_count} OSR entries analyzed)
            </div>
          )}
        </div>
      )}

      {/* Purpose Statement */}
      <div className="border-t border-slate-600 pt-3 mt-4">
        <div className="text-xs text-slate-400">
          <strong>Purpose:</strong> Show how well mirrors landed, how often they caught the "edge," 
          how clear they read—enabling system tuning. Non-gamified performance indicators.
        </div>
      </div>
    </div>
  );
}

export type { SessionScoresProps };