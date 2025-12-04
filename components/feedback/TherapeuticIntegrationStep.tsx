'use client';

import React, { useState, useCallback } from 'react';
import AdviceLadderTree from './AdviceLadderTree';
import DailyIntegrationLayer from './DailyIntegrationLayer';

export type IntegrationPhase = 
  | 'offer'           // Initial offer to continue
  | 'ladder'          // AdviceLadderTree step
  | 'integration'     // DailyIntegrationLayer step  
  | 'complete';       // User chose to skip or finished

export type UserNeed = 'general' | 'decision' | 'boundary' | 'action' | 'crisis';
export type IntegrationPreference = 'minimal' | 'gentle' | 'active';

interface TherapeuticIntegrationStepProps {
  sessionId: string;
  hookStack?: {
    titles: Array<{
      title: string;
      intensity: number;
      polarity: string;
    }>;
    volatilityIndex: number;
  };
  sessionScores?: {
    accuracy: number;
    edgeCapture: number;
    clarity: number;
  };
  driftIndex?: number;
  sstLogs?: Array<any>;
  onComplete: () => void;
  onSkip: () => void;
}

const baseButtonClass =
  "inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900";

export default function TherapeuticIntegrationStep({
  sessionId,
  hookStack,
  sessionScores,
  driftIndex,
  sstLogs,
  onComplete,
  onSkip,
}: TherapeuticIntegrationStepProps) {
  const [phase, setPhase] = useState<IntegrationPhase>('offer');
  const [userNeed, setUserNeed] = useState<UserNeed>('general');
  const [integrationPreference, setIntegrationPreference] = useState<IntegrationPreference>('gentle');
  const [ladderResults, setLadderResults] = useState<any>(null);

  // Default hook stack if none provided (graceful degradation)
  const effectiveHookStack = hookStack ?? {
    titles: [{ title: 'Session Insights', intensity: 3, polarity: 'supportive' }],
    volatilityIndex: 0.5,
  };

  // Session context for API calls
  const sessionContext = {
    sessionId,
    sessionScores,
    driftIndex,
    sstLogs,
  };

  // Session data for DailyIntegrationLayer
  const sessionData = {
    sessionId,
    hookStack: effectiveHookStack,
    sessionScores,
    driftIndex,
    sstLogs,
  };

  const handleStartLadder = useCallback(() => {
    setPhase('ladder');
  }, []);

  const handleLadderComplete = useCallback((result: any) => {
    setLadderResults(result);
    setPhase('integration');
  }, []);

  const handleIntegrationComplete = useCallback(() => {
    setPhase('complete');
    onComplete();
  }, [onComplete]);

  const handleSkipToSeal = useCallback(() => {
    setPhase('complete');
    onSkip();
  }, [onSkip]);

  // PHASE: Offer therapeutic integration
  if (phase === 'offer') {
    return (
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">
              Integration Opportunity
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-100">
              Would you like support with what emerged?
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Your reading surfaced some patterns. We can help you translate them into
              practical guidance — or you can skip to seal your session now.
            </p>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          {/* What this includes */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-3">
            <p className="font-semibold text-slate-100 mb-2">Integration includes:</p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="mt-[3px] text-emerald-300">•</span>
                <span><strong className="text-slate-200">Therapeutic Ladder</strong> — Step-by-step guidance based on your patterns</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] text-emerald-300">•</span>
                <span><strong className="text-slate-200">Weight Belt Cards</strong> — Portable reminders to carry forward</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] text-emerald-300">•</span>
                <span><strong className="text-slate-200">Daily Prompts</strong> — Recognition cues for ongoing awareness</span>
              </li>
            </ul>
          </div>

          {/* User need selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              What brought you to this reading? (optional)
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                { value: 'general', label: 'General', icon: '🔮' },
                { value: 'decision', label: 'Decision', icon: '⚖️' },
                { value: 'boundary', label: 'Boundary', icon: '🛡️' },
                { value: 'action', label: 'Action', icon: '🚀' },
                { value: 'crisis', label: 'Crisis', icon: '🆘' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setUserNeed(option.value as UserNeed)}
                  className={`p-3 rounded-lg border text-center transition ${
                    userNeed === option.value
                      ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100'
                      : 'border-slate-700/80 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className="text-lg block mb-1">{option.icon}</span>
                  <span className="text-xs">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pacing preference */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              How much support do you want?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'minimal', label: 'Minimal', desc: 'Just the essentials' },
                { value: 'gentle', label: 'Gentle', desc: 'Guided at my pace' },
                { value: 'active', label: 'Active', desc: 'Full integration' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setIntegrationPreference(option.value as IntegrationPreference)}
                  className={`p-3 rounded-lg border text-left transition ${
                    integrationPreference === option.value
                      ? 'border-blue-500/60 bg-blue-500/20 text-blue-100'
                      : 'border-slate-700/80 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className="font-medium text-sm block">{option.label}</span>
                  <span className="text-xs text-slate-400">{option.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <button
              type="button"
              onClick={handleSkipToSeal}
              className={`${baseButtonClass} border-slate-700/80 bg-transparent text-slate-300 hover:border-slate-500 hover:text-slate-100`}
            >
              Skip to seal session
            </button>
            <button
              type="button"
              onClick={handleStartLadder}
              className={`${baseButtonClass} border-emerald-500/60 bg-emerald-500/20 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/30`}
            >
              Begin integration →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // PHASE: Ladder step
  if (phase === 'ladder') {
    return (
      <div className="w-full max-w-4xl">
        {/* Dark theme wrapper for AdviceLadderTree */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">
              Step 1 of 2 — Therapeutic Ladder
            </p>
            <button
              type="button"
              onClick={handleSkipToSeal}
              className="text-sm text-slate-400 hover:text-slate-200 transition"
            >
              Skip remaining →
            </button>
          </div>
          
          {/* Invert theme for child component */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 [&_.bg-white]:bg-slate-900 [&_.bg-blue-50]:bg-slate-800/70 [&_.bg-green-50]:bg-slate-800/70 [&_.bg-yellow-50]:bg-slate-800/70 [&_.bg-purple-50]:bg-slate-800/70 [&_.bg-amber-50]:bg-slate-800/70 [&_.bg-gray-50]:bg-slate-800/50 [&_.text-gray-800]:text-slate-200 [&_.text-gray-700]:text-slate-300 [&_.text-gray-600]:text-slate-400 [&_.text-gray-500]:text-slate-500 [&_.text-blue-900]:text-blue-300 [&_.text-blue-800]:text-blue-400 [&_.text-green-900]:text-green-300 [&_.text-green-800]:text-green-400 [&_.text-yellow-900]:text-yellow-300 [&_.text-yellow-800]:text-yellow-400 [&_.text-purple-900]:text-purple-300 [&_.text-purple-800]:text-purple-400 [&_.text-amber-900]:text-amber-300 [&_.text-amber-800]:text-amber-400 [&_.border-gray-200]:border-slate-700 [&_.border-gray-300]:border-slate-600 [&_.bg-blue-600]:bg-emerald-600 [&_.hover\:bg-blue-700]:hover:bg-emerald-700">
            <AdviceLadderTree
              hookStack={effectiveHookStack}
              sessionContext={sessionContext}
              userNeed={userNeed}
              onComplete={handleLadderComplete}
            />
          </div>
        </div>
      </div>
    );
  }

  // PHASE: Integration step
  if (phase === 'integration') {
    return (
      <div className="w-full max-w-6xl">
        {/* Dark theme wrapper for DailyIntegrationLayer */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">
              Step 2 of 2 — Daily Integration
            </p>
            <button
              type="button"
              onClick={handleSkipToSeal}
              className="text-sm text-slate-400 hover:text-slate-200 transition"
            >
              Skip to seal →
            </button>
          </div>
          
          {/* Invert theme for child component */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 [&_.bg-white]:bg-slate-900 [&_.bg-blue-50]:bg-slate-800/70 [&_.bg-green-50]:bg-slate-800/70 [&_.bg-yellow-50]:bg-slate-800/70 [&_.bg-purple-50]:bg-slate-800/70 [&_.bg-amber-50]:bg-slate-800/70 [&_.bg-indigo-50]:bg-slate-800/70 [&_.bg-gray-50]:bg-slate-800/50 [&_.text-gray-800]:text-slate-200 [&_.text-gray-700]:text-slate-300 [&_.text-gray-600]:text-slate-400 [&_.text-gray-500]:text-slate-500 [&_.text-blue-900]:text-blue-300 [&_.text-blue-800]:text-blue-400 [&_.text-green-900]:text-green-300 [&_.text-green-800]:text-green-400 [&_.text-yellow-900]:text-yellow-300 [&_.text-yellow-800]:text-yellow-400 [&_.text-purple-900]:text-purple-300 [&_.text-purple-800]:text-purple-400 [&_.text-amber-900]:text-amber-300 [&_.text-amber-800]:text-amber-400 [&_.text-indigo-900]:text-indigo-300 [&_.text-indigo-800]:text-indigo-400 [&_.border-gray-200]:border-slate-700 [&_.border-gray-300]:border-slate-600 [&_.bg-green-600]:bg-emerald-600 [&_.hover\:bg-green-700]:hover:bg-emerald-700 [&_.bg-gradient-to-r]:bg-slate-800/70 [&_.from-indigo-50]:from-slate-800/70 [&_.to-purple-50]:to-slate-800/70">
            <DailyIntegrationLayer
              sessionData={sessionData}
              ladderResults={ladderResults}
              integrationPreference={integrationPreference}
              onComplete={handleIntegrationComplete}
            />
          </div>
        </div>
      </div>
    );
  }

  // PHASE: Complete (should not render, but fallback)
  return null;
}
