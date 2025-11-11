"use client";

import React from 'react';
import type { PersonaMode } from '../../lib/persona';
import { APP_NAME, STATUS_CONNECTED } from '../../lib/ui-strings';

interface ChatHeaderProps {
  personaMode: PersonaMode;
  onPersonaModeChange: (mode: PersonaMode) => void;
  onUploadMirror: () => void;
  onUploadWeather: () => void;
  canRecoverStoredPayload: boolean;
  onRecoverStoredPayload: () => void;
  onStartWrapUp: () => void;
}

export default function ChatHeader({
  personaMode,
  onPersonaModeChange,
  onUploadMirror,
  onUploadWeather,
  canRecoverStoredPayload,
  onRecoverStoredPayload,
  onStartWrapUp,
}: ChatHeaderProps) {
  return (
    <header className="border-b border-slate-800/60 bg-slate-900/70 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Raven Calder · Poetic Brain
          </div>
          <h1 className="text-2xl font-semibold text-slate-100">{APP_NAME}</h1>
          <p className="text-sm text-slate-400">
            Raven is already listening—share what is present, or upload Math Brain and Mirror exports when you are ready for a structured reading.
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-emerald-300">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            <span>{STATUS_CONNECTED}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-600/60 bg-slate-800/60 px-3 py-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Persona
            </span>
            <select
              value={personaMode}
              onChange={(event) => onPersonaModeChange(event.target.value as PersonaMode)}
              className="bg-transparent text-sm font-medium text-slate-100 focus:outline-none"
            >
              <option value="plain" className="bg-slate-900 text-slate-100">
                Plain · Technical
              </option>
              <option value="hybrid" className="bg-slate-900 text-slate-100">
                Hybrid · Default
              </option>
              <option value="poetic" className="bg-slate-900 text-slate-100">
                Poetic · Lyrical
              </option>
            </select>
          </div>
          <button
            type="button"
            onClick={onUploadMirror}
            className="rounded-lg border border-slate-600/60 bg-slate-800/60 px-4 py-2 font-medium text-slate-100 hover:border-slate-500 hover:bg-slate-800 transition"
          >
            🪞 Upload Mirror
          </button>
          <button
            type="button"
            onClick={onUploadWeather}
            className="rounded-lg border border-slate-600/60 bg-slate-800/60 px-4 py-2 font-medium text-slate-100 hover:border-slate-500 hover:bg-slate-800 transition"
          >
            🌡️ Upload Weather
          </button>
          {canRecoverStoredPayload && (
            <button
              type="button"
              onClick={onRecoverStoredPayload}
              className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 font-medium text-emerald-100 transition hover:bg-emerald-500/20"
            >
              ⏮️ Resume Math Brain
            </button>
          )}
          <button
            type="button"
            onClick={onStartWrapUp}
            className="rounded-lg border border-transparent px-4 py-2 text-slate-400 hover:text-slate-200 transition"
          >
            Reset Session
          </button>
        </div>
      </div>
    </header>
  );
}
