"use client";

import React from 'react';

interface WelcomeMessageProps {
  sessionStarted: boolean;
  storedPayload: any;
  reportContexts: any[];
  onUploadMirror: () => void;
  canRecoverStoredPayload: boolean;
  onRecoverStoredPayload: () => void;
}

export default function WelcomeMessage({
  sessionStarted,
  storedPayload,
  reportContexts,
  onUploadMirror,
  canRecoverStoredPayload,
  onRecoverStoredPayload,
}: WelcomeMessageProps) {
  if (sessionStarted || storedPayload || reportContexts.length > 0) {
    return null;
  }

  return (
    <section className="mx-auto mt-8 w-full max-w-3xl rounded-xl border border-emerald-500/40 bg-slate-900/60 px-6 py-5 text-slate-100 shadow-lg">
      <h2 className="text-lg font-semibold text-emerald-200">Drop in whenever you&apos;re ready</h2>
      <p className="mt-3 text-sm text-slate-300">
        Raven is already listening. Begin typing below to share what&apos;s on your mind, or send a quick
        question to move straight into open dialogue.
      </p>
      <p className="mt-3 text-xs text-slate-400">
        Uploading a Math Brain export (or resuming a saved chart) automatically opens a structured
        reading. Raven will announce the shift and the banner above will always tell you which lane
        you are in. End the session any time to clear the slate.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onUploadMirror}
          className="rounded-lg border border-slate-600/60 bg-slate-800/70 px-4 py-2 text-sm text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
        >
          Upload a Report
        </button>
        {canRecoverStoredPayload && (
          <button
            type="button"
            onClick={onRecoverStoredPayload}
            className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20"
          >
            Resume last Math Brain export
          </button>
        )}
      </div>
      <div className="flex justify-between items-center p-2 border-b border-gray-700">
        <div></div> {/* Empty div for flex spacing */}
        <h1 className="text-xl font-semibold">Poetic Brain</h1>
        <a
          href="/math-brain"
          className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
          title="Return to Math Brain"
        >
          <svg xmlns="http://www.w.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Math Brain
        </a>
      </div>
    </section>
  );
}
