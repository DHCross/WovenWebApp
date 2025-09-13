"use client";

import React from 'react';

interface WrapUpCardProps {
  hookStack: {
    hooks: Array<{
      title: string;
      intensity: number;
      is_tier_1: boolean;
    }>;
    coverage: string;
  };
  sessionScores: {
    accuracy: number;
    edge_capture: number;
    clarity: number;
    wb_count: number;
    abe_count: number;
    osr_count: number;
  };
  climateLine?: string;
  actorRoleComposite?: {
    actor: string;
    role: string;
  };
  driftIndex?: {
    drift_detected: boolean;
    drift_direction: 'sidereal' | 'tropical' | null;
    confidence: number;
  };
  poeticIndex?: number;
  sessionId?: string;
  onSaveCard?: (cardData: any) => void;
  className?: string;
}

export default function WrapUpCard({
  hookStack,
  sessionScores,
  climateLine,
  actorRoleComposite,
  driftIndex,
  poeticIndex,
  sessionId,
  onSaveCard,
  className = ''
}: WrapUpCardProps) {
  const formatPercent = (value: number) => Math.round(value * 100);
  
  const cardData = {
    session_id: sessionId,
    timestamp: new Date().toISOString(),
    hook_stack_titles: hookStack.hooks.slice(0, 3).map(h => h.title),
    actor_role_composite: actorRoleComposite,
    resonance_scorecard: {
      wb: sessionScores.wb_count,
      abe: sessionScores.abe_count,
      osr: sessionScores.osr_count,
      accuracy: sessionScores.accuracy,
      edge_capture: sessionScores.edge_capture,
      clarity: sessionScores.clarity
    },
    climate_line: climateLine,
    poetic_index: poeticIndex,
    sidereal_drift: driftIndex?.drift_detected ? {
      direction: driftIndex.drift_direction,
      confidence: driftIndex.confidence
    } : null,
    schema: 'WrapUpCard-1.0'
  };

  const handleSave = () => {
    onSaveCard?.(cardData);
  };

  const handleCopyText = () => {
    const textSummary = [
      `Session Summary (${new Date().toLocaleDateString()})`,
      '',
      'Hook Stack Recognition:',
      ...hookStack.hooks.slice(0, 3).map((h, i) => `${i + 1}. "${h.title}"`),
      '',
      `Resonance: ${sessionScores.wb_count} WB, ${sessionScores.abe_count} ABE, ${sessionScores.osr_count} OSR`,
      `Accuracy: ${formatPercent(sessionScores.accuracy)}% | Edge: ${formatPercent(sessionScores.edge_capture)}% | Clarity: ${formatPercent(sessionScores.clarity)}%`,
      '',
      ...(climateLine ? [`Climate: ${climateLine}`] : []),
      ...(actorRoleComposite ? [`Actor/Role: ${actorRoleComposite.actor} / ${actorRoleComposite.role}`] : []),
      ...(driftIndex?.drift_detected ? [`Drift: ${driftIndex.drift_direction} (${formatPercent(driftIndex.confidence)}%)`] : []),
      '',
      'Falsifiability snapshot for next session'
    ].join('\n');

    navigator.clipboard.writeText(textSummary);
  };

  return (
    <div className={`rounded-lg border border-slate-600 bg-slate-800/60 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-slate-100">Session Wrap-Up Card</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyText}
            className="text-xs text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1"
          >
            Copy Text
          </button>
          {onSaveCard && (
            <button
              onClick={handleSave}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Save Card
            </button>
          )}
        </div>
      </div>

      {/* Hook Stack Titles */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-slate-200 mb-2">Strongest Hook Stack</h4>
        <div className="space-y-1">
          {hookStack.hooks.slice(0, 3).map((hook, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs text-slate-400 mt-0.5 w-4">{i + 1}.</span>
              <span className="text-sm text-amber-100 leading-relaxed">
                "{hook.title}"
              </span>
              {hook.is_tier_1 && (
                <span className="inline-flex items-center rounded bg-amber-600 px-1 py-0.5 text-xs font-medium text-amber-100 ml-1">
                  T1
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actor/Role Composite */}
      {actorRoleComposite && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-slate-200 mb-2">Actor/Role Composite</h4>
          <div className="text-sm text-slate-300">
            <span className="text-sky-200">{actorRoleComposite.actor}</span>
            {' / '}
            <span className="text-emerald-200">{actorRoleComposite.role}</span>
          </div>
        </div>
      )}

      {/* Resonance Scorecard */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-slate-200 mb-2">Resonance Scorecard</h4>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="rounded bg-emerald-900/30 border border-emerald-600/30 p-2 text-center">
            <div className="text-lg font-semibold text-emerald-100">{sessionScores.wb_count}</div>
            <div className="text-xs text-emerald-200/80">WB</div>
          </div>
          <div className="rounded bg-amber-900/30 border border-amber-600/30 p-2 text-center">
            <div className="text-lg font-semibold text-amber-100">{sessionScores.abe_count}</div>
            <div className="text-xs text-amber-200/80">ABE</div>
          </div>
          <div className="rounded bg-slate-700/40 border border-slate-600/50 p-2 text-center">
            <div className="text-lg font-semibold text-slate-100">{sessionScores.osr_count}</div>
            <div className="text-xs text-slate-300/80">OSR</div>
          </div>
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>Accuracy: {formatPercent(sessionScores.accuracy)}%</span>
          <span>Edge: {formatPercent(sessionScores.edge_capture)}%</span>
          <span>Clarity: {formatPercent(sessionScores.clarity)}%</span>
        </div>
      </div>

      {/* Climate Line */}
      {climateLine && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-slate-200 mb-2">Climate Line</h4>
          <div className="text-sm text-slate-300 italic">
            "{climateLine}"
          </div>
        </div>
      )}

      {/* Optional Elements */}
      <div className="space-y-3">
        {poeticIndex !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Poetic Index</span>
            <span className="text-slate-200">{poeticIndex.toFixed(1)}</span>
          </div>
        )}

        {driftIndex?.drift_detected && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Sidereal Drift</span>
            <span className={`font-medium ${
              driftIndex.drift_direction === 'sidereal' ? 'text-purple-200' : 'text-blue-200'
            }`}>
              {driftIndex.drift_direction} ({formatPercent(driftIndex.confidence)}%)
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-600 pt-4 mt-6">
        <div className="text-xs text-slate-400">
          <strong>Memory anchor + falsifiability snapshot</strong> to carry forward.
          Session completed {new Date().toLocaleTimeString()}.
        </div>
      </div>
    </div>
  );
}

export type { WrapUpCardProps };