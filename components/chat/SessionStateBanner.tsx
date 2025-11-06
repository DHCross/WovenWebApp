"use client";

import React from 'react';

interface SessionStateBannerProps {
  sessionStarted: boolean;
  sessionModeDescriptor: {
    label: string;
    description: string;
    badgeClass: string;
  };
  onStartWrapUp: () => void;
}

export default function SessionStateBanner({
  sessionStarted,
  sessionModeDescriptor,
  onStartWrapUp,
}: SessionStateBannerProps) {
  if (!sessionStarted) {
    return null;
  }

  return (
    <div className="border-b border-slate-800/60 bg-slate-900/60">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${sessionModeDescriptor.badgeClass}`}
          >
            {sessionModeDescriptor.label}
          </span>
          <p className="mt-2 text-xs text-slate-300 sm:max-w-xl">
            {sessionModeDescriptor.description}
          </p>
        </div>
        <button
          type="button"
          onClick={onStartWrapUp}
          className="inline-flex items-center justify-center rounded-md border border-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
        >
          End Session
        </button>
      </div>
    </div>
  );
}
