"use client";

import React from "react";
import { generateMirrorNarrative, MirrorNarrative } from "../../lib/mirror-narrative";
import { getRecognitionTheme, getPatternIntensityVisuals, VALENCE_COLORS } from "../../lib/symbolic-visuals";

// Types matching the existing ReadingSummaryCard structure
interface BigVector {
  tension: string;
  polarity: string;
  charge: number;
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

interface ActorRoleComposite {
  actor: string;
  role: string;
  composite: string;
  confidence: 'tentative' | 'emerging' | 'clear';
}

interface EnhancedMirrorNarrativeSummaryProps {
  bigVectors: BigVector[];
  resonanceFidelity: ResonanceFidelity;
  actorRoleComposite: ActorRoleComposite;
  explanation?: string;
  sessionId: string;
  onClose?: () => void;
  onContinueToChat?: () => void;
}

export default function EnhancedMirrorNarrativeSummary({
  bigVectors,
  resonanceFidelity,
  actorRoleComposite,
  explanation,
  sessionId,
  onClose,
  onContinueToChat,
}: EnhancedMirrorNarrativeSummaryProps) {
  const narrative = generateMirrorNarrative(bigVectors, resonanceFidelity, actorRoleComposite, explanation);

  const getRecognitionColor = (level: string) => {
    switch (level) {
      case 'immediate': return 'from-emerald-600 to-green-600';
      case 'emerging': return 'from-amber-600 to-orange-600';
      default: return 'from-slate-600 to-gray-600';
    }
  };

  const getPatternIntensityVisual = (charge: number) => {
    return {
      opacity: Math.min(charge / 5, 1),
      borderWidth: charge >= 4 ? '2px' : charge >= 3 ? '1.5px' : '1px',
      scale: charge >= 4 ? 'scale-105' : 'scale-100',
    };
  };

  return (
    <div className="max-w-4xl mx-auto bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-xl border border-slate-200/70">
      {/* Header - Poetic Brain Territory */}
      <div className={`relative bg-gradient-to-r ${getRecognitionColor(narrative.recognitionLevel)} text-white p-8 rounded-t-2xl`}>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(40%_60%_at_70%_0%,rgba(255,255,255,0.4),transparent)]"/>
        <div className="relative">
          <div className="text-center">
            <div className="text-sm uppercase tracking-wider opacity-90 mb-2">
              Poetic Brain • Actor/Role Composite
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold mb-2">
              {narrative.headline}
            </h1>
            <div className="text-lg opacity-90">
              {narrative.pattern.icon} {narrative.pattern.name}
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">

        {/* Core Signature Story */}
        <div className="text-center">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">
            Your Core Energetic Signature
          </h2>
          <p className="text-lg text-slate-700 leading-relaxed mb-6">
            {narrative.coreSignature}
          </p>

          <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded-r-lg">
            <p className="text-slate-700 leading-relaxed">
              {narrative.actorRoleStory}
            </p>
          </div>
        </div>

        {/* Key Patterns */}
        {narrative.keyPatterns.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-6 text-center">
              Key Patterns That Shape Your Experience
            </h3>
            <div className="space-y-6">
              {narrative.keyPatterns.map((pattern, index) => {
                const vector = bigVectors[index];
                const intensity = vector ? getPatternIntensityVisual(vector.charge) : { opacity: 1, borderWidth: '1px', scale: 'scale-100' };

                return (
                  <div
                    key={index}
                    className={`bg-white rounded-xl p-6 border-l-4 shadow-sm transition-transform ${intensity.scale}`}
                    style={{
                      borderColor: vector?.charge >= 4 ? '#3b82f6' : vector?.charge >= 3 ? '#6366f1' : '#8b5cf6',
                      opacity: intensity.opacity
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800 mb-2">{pattern.title}</h4>
                        <p className="text-slate-600 mb-4">{pattern.description}</p>

                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                            <div className="font-medium text-emerald-800 mb-1">✅ When Working Well</div>
                            <div className="text-emerald-700">{pattern.whenWorking}</div>
                          </div>
                          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                            <div className="font-medium text-amber-800 mb-1">⚠️ When Challenged</div>
                            <div className="text-amber-700">{pattern.whenChallenged}</div>
                          </div>
                        </div>

                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-blue-700 text-sm italic">
                            Recognition Check: {pattern.recognitionPrompt}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Resonance Story */}
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">
            Pattern Recognition Analysis
          </h3>
          <p className="text-slate-700 leading-relaxed mb-6">
            {narrative.resonanceStory}
          </p>

          {/* Resonance Breakdown */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">✅</span>
                <div>
                  <div className="font-semibold text-emerald-800">{narrative.resonanceBreakdown.wb.count} WB</div>
                  <div className="text-xs text-emerald-600">{narrative.resonanceBreakdown.wb.meaning}</div>
                </div>
              </div>
              <p className="text-sm text-emerald-700">{narrative.resonanceBreakdown.wb.interpretation}</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🟡</span>
                <div>
                  <div className="font-semibold text-amber-800">{narrative.resonanceBreakdown.abe.count} ABE</div>
                  <div className="text-xs text-amber-600">{narrative.resonanceBreakdown.abe.meaning}</div>
                </div>
              </div>
              <p className="text-sm text-amber-700">{narrative.resonanceBreakdown.abe.interpretation}</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">❌</span>
                <div>
                  <div className="font-semibold text-red-800">{narrative.resonanceBreakdown.osr.count} OSR</div>
                  <div className="text-xs text-red-600">{narrative.resonanceBreakdown.osr.meaning}</div>
                </div>
              </div>
              <p className="text-sm text-red-700">{narrative.resonanceBreakdown.osr.interpretation}</p>
            </div>
          </div>
        </div>

        {/* Guidance & Next Steps */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
          <h3 className="text-sm font-semibold text-purple-800 uppercase tracking-wider mb-4">
            Guidance & Next Steps
          </h3>
          <div className="space-y-4">
            <div className="bg-white/80 rounded-lg p-4">
              <div className="font-medium text-purple-800 mb-2">Pattern Guidance</div>
              <p className="text-purple-700">{narrative.pattern.guidance}</p>
            </div>
            <div className="bg-white/80 rounded-lg p-4">
              <div className="font-medium text-indigo-800 mb-2">Moving Forward</div>
              <p className="text-indigo-700">{narrative.nextSteps}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {(onContinueToChat || onClose) && (
          <div className="flex gap-4 pt-6 border-t border-slate-200">
            {onContinueToChat && (
              <button
                onClick={onContinueToChat}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-xl transition-all shadow-sm"
              >
                Continue to Poetic Brain Chat
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="px-6 py-3 border border-slate-300 text-slate-600 hover:text-slate-800 hover:border-slate-400 rounded-xl transition-colors"
              >
                Close
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 border-t border-slate-200 pt-4">
          <p className="italic">
            "Here's what resonated, here's what didn't, here's what pattern Raven is tentatively guessing — but you remain the validator."
          </p>
          <p className="mt-2">Session ID: {sessionId.slice(-8)}</p>
        </div>
      </div>
    </div>
  );
}