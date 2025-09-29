"use client";

import React from "react";

// Math Brain Territory - Raw geometric data only
interface BigVector {
  tension: string;
  polarity: string;
  charge: number; // 1-5 intensity
  source: 'angles' | 'anaretic' | 'personal-outer' | 'hook-stack';
}

interface ResonanceFidelity {
  percentage: number;
  band: 'HIGH' | 'MIXED' | 'LOW';
  label: string;
  wb: number;
  abe: number;
  osr: number;
}

interface PatternRecognitionSummaryProps {
  bigVectors: BigVector[];
  resonanceFidelity: ResonanceFidelity;
  sessionId: string;
  onExportData?: () => void;
  onContinueToPoetic?: () => void;
}

export default function PatternRecognitionSummary({
  bigVectors,
  resonanceFidelity,
  sessionId,
  onExportData,
  onContinueToPoetic,
}: PatternRecognitionSummaryProps) {
  const getChargeIndicator = (charge: number) => {
    return '⚡'.repeat(Math.min(charge, 5));
  };

  const getSourceIndicator = (source: string) => {
    switch (source) {
      case 'hook-stack': return '🔗';
      case 'personal-outer': return '🪐';
      case 'angles': return '📐';
      case 'anaretic': return '🎯';
      default: return '◦';
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg border border-slate-300 shadow-sm">
      {/* Header - Math Brain Territory */}
      <div className="bg-slate-100 border-b border-slate-300 p-4">
        <div className="text-center">
          <h2 className="text-sm font-mono font-semibold text-slate-700 uppercase tracking-wider">
            Pattern Recognition Data
          </h2>
          <div className="text-xs text-slate-500 mt-1">
            Math Brain • Geometric Analysis Complete
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* Resonance Metrics */}
        <div className="text-center">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-3">
            Recognition Fidelity
          </h3>
          <div className="text-3xl font-mono font-bold text-slate-800 mb-2">
            {resonanceFidelity.percentage}%
          </div>
          <div className={`text-sm font-mono mb-4 ${
            resonanceFidelity.band === 'HIGH' ? 'text-slate-600' :
            resonanceFidelity.band === 'MIXED' ? 'text-slate-600' : 'text-slate-600'
          }`}>
            [{resonanceFidelity.band}]
          </div>

          {/* Raw Data Breakdown */}
          <div className="flex justify-center items-center gap-6 mb-4">
            <div className="flex items-center gap-1">
              <div className="text-xs font-mono text-slate-500">WB:</div>
              <div className="font-mono font-bold text-slate-700">{resonanceFidelity.wb}</div>
            </div>
            <div className="flex items-center gap-1">
              <div className="text-xs font-mono text-slate-500">ABE:</div>
              <div className="font-mono font-bold text-slate-700">{resonanceFidelity.abe}</div>
            </div>
            <div className="flex items-center gap-1">
              <div className="text-xs font-mono text-slate-500">OSR:</div>
              <div className="font-mono font-bold text-slate-700">{resonanceFidelity.osr}</div>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="w-full max-w-xs mx-auto bg-slate-200 rounded-sm h-1">
            <div
              className="h-1 rounded-sm bg-slate-600 transition-all duration-500"
              style={{width: `${resonanceFidelity.percentage}%`}}
            />
          </div>
        </div>

        {/* Pattern Vectors */}
        {bigVectors.length > 0 && (
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-4">
              High-Intensity Geometric Patterns
            </h3>
            <div className="space-y-3">
              {bigVectors.slice(0, 3).map((vector, index) => (
                <div
                  key={index}
                  className="bg-slate-50 border border-slate-200 rounded p-3 font-mono text-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">#{index + 1}</span>
                      <span>{getSourceIndicator(vector.source)}</span>
                      <span className="text-slate-600">{vector.tension || 'PATTERN_VECTOR'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-500">CHARGE:</span>
                      <span className="text-slate-700">{getChargeIndicator(vector.charge)}</span>
                      <span className="text-slate-500">({vector.charge})</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 pl-6">
                    POLARITY: {vector.polarity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Status */}
        <div className="bg-slate-50 rounded p-4 border border-slate-200">
          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">
            Calculation Status
          </h4>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500">VECTORS_FOUND:</span>
              <span className="ml-2 text-slate-700">{bigVectors.length}</span>
            </div>
            <div>
              <span className="text-slate-500">SESSION_ID:</span>
              <span className="ml-2 text-slate-700">{sessionId.slice(-8)}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex gap-3 pt-4 border-t border-slate-200">
          {onContinueToPoetic && (
            <button
              onClick={onContinueToPoetic}
              className="flex-1 bg-slate-700 hover:bg-slate-800 text-white font-mono text-sm py-2 px-4 rounded transition-colors"
            >
              → POETIC_BRAIN
            </button>
          )}
          {onExportData && (
            <button
              onClick={onExportData}
              className="px-4 py-2 border border-slate-300 text-slate-600 hover:text-slate-800 hover:border-slate-400 rounded transition-colors font-mono text-sm"
            >
              EXPORT_RAW
            </button>
          )}
        </div>

        {/* Math Brain Footer */}
        <div className="text-center text-xs font-mono text-slate-400 border-t border-slate-200 pt-3">
          GEOMETRIC_ANALYSIS_COMPLETE • DETERMINISTIC_OUTPUT
        </div>
      </div>
    </div>
  );
}