"use client";

import React from "react";

interface SessionWrapUpModalProps {
  open: boolean;
  sessionId?: string | null;
  onDismiss: () => void;
  onConfirmEnd: () => void;
  onSkipToExport?: () => void;
}

const baseButtonClass =
  "inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900";

export function SessionWrapUpModal({
  open,
  sessionId,
  onDismiss,
  onConfirmEnd,
  onSkipToExport,
}: SessionWrapUpModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-wrap-up-title"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 px-4 py-6"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">
              Session Wrap-Up
            </p>
            <h2 id="session-wrap-up-title" className="mt-2 text-xl font-semibold text-slate-100">
              Ready to close this reading?
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              We&apos;ll move next into the wrap-up flow to capture resonance stats, journal
              prompts, and sealing exports before the slate is cleared.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close wrap-up dialog"
            className="text-slate-500 transition hover:text-slate-300"
            onClick={onDismiss}
          >
            ×
          </button>
        </div>

        <div className="space-y-4 px-6 py-6 text-sm text-slate-300">
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-3">
            <p>
              <span className="font-semibold text-slate-100">Current session:</span>{" "}
              {sessionId ? <code className="text-xs text-slate-400">{sessionId}</code> : "Active"}
            </p>
            <p className="mt-2 text-slate-400">
              The wrap-up modal will surface the session summary cards (Reading Summary,
              Poetic Card, and Wrap-Up rubric). You can still return to the conversation if you
              want to gather more resonance pings before sealing.
            </p>
          </div>

          <ul className="space-y-2 text-slate-400">
            <li className="flex items-start gap-2">
              <span className="mt-[3px] text-emerald-300">•</span>
              <span>
                Review resonance stats and highlights before you export or seal the session.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-[3px] text-emerald-300">•</span>
              <span>Generate the poetic journal entry and download CSV/PDF diagnostics.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-[3px] text-emerald-300">•</span>
              <span>
                Seal the session to rotate the telemetry container and clear Raven&apos;s memory.
              </span>
            </li>
          </ul>
        </div>

        <div className="border-t border-slate-800 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <button
              type="button"
              onClick={onDismiss}
              className={`${baseButtonClass} border-slate-700/80 bg-transparent text-slate-300 hover:border-slate-500 hover:text-slate-100`}
            >
              Return to session
            </button>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              {onSkipToExport && (
                <button
                  type="button"
                  onClick={onSkipToExport}
                  className={`${baseButtonClass} border-blue-500/60 bg-blue-500/20 text-blue-100 hover:border-blue-400 hover:bg-blue-500/30`}
                >
                  Skip to Clear Mirror Export
                </button>
              )}
              <button
                type="button"
                onClick={onConfirmEnd}
                className={`${baseButtonClass} border-emerald-500/60 bg-emerald-500/20 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/30`}
              >
                Continue to wrap-up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionWrapUpModal;
