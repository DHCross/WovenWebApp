"use client";

import HealthDataUpload from "../../../components/HealthDataUpload";
import type { SeismographMap } from "../../../lib/health-data-types";

interface DownloadControlsProps {
  includeTransits: boolean;
  markdownGenerating: boolean;
  graphsPdfGenerating: boolean;
  weatherJsonGenerating: boolean;
  engineConfigGenerating: boolean;
  cleanJsonGenerating: boolean;
  onDownloadMarkdown: () => void;
  onDownloadSymbolicWeather: () => void;
  onDownloadGraphsPDF: () => void;
  onDownloadEngineConfig: () => void;
  onDownloadCleanJSON: () => void;
  seismographMap: SeismographMap;
  authReady: boolean;
  isAuthenticated: boolean;
  canVisitPoetic: boolean;
  onNavigateToPoetic: () => void;
}

export default function DownloadControls({
  includeTransits,
  markdownGenerating,
  graphsPdfGenerating,
  weatherJsonGenerating,
  engineConfigGenerating,
  cleanJsonGenerating,
  onDownloadMarkdown,
  onDownloadSymbolicWeather,
  onDownloadGraphsPDF,
  onDownloadEngineConfig,
  onDownloadCleanJSON,
  seismographMap,
  authReady,
  isAuthenticated,
  canVisitPoetic,
  onNavigateToPoetic,
}: DownloadControlsProps) {
  const hasSeismographData = Object.keys(seismographMap || {}).length > 0;

  return (
    <div className="space-y-4 print:hidden">
      <div className="text-sm text-slate-300">
        <span className="font-medium">Your report is ready.</span> Choose how to use it:
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">For Raven Calder (AI Analysis)</h3>



        <button
          type="button"
          onClick={onDownloadMarkdown}
          disabled={markdownGenerating}
          className="w-full rounded-md border border-purple-600 bg-purple-700/30 px-4 py-3 text-left hover:bg-purple-700/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
          aria-label="Download Markdown Directive (lightweight, AI-friendly)"
        >
          <div className="flex items-center gap-3">
            {markdownGenerating ? (
              <svg className="animate-spin h-5 w-5 text-purple-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <span className="text-2xl">📝</span>
            )}
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-100">
                {markdownGenerating ? "Generating Markdown..." : "Markdown Directive (for AI)"}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Lightweight plain text, &lt;50KB (better for AI parsing)
              </div>
            </div>
          </div>
        </button>

        {includeTransits && (
          <button
            type="button"
            onClick={onDownloadSymbolicWeather}
            disabled={weatherJsonGenerating}
            className="w-full rounded-md border border-blue-600 bg-blue-700/30 px-4 py-3 text-left hover:bg-blue-700/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
            aria-label="Download Symbolic Weather Log JSON for AI pattern analysis"
          >
            <div className="flex items-center gap-3">
              {weatherJsonGenerating ? (
                <svg className="animate-spin h-5 w-5 text-blue-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <span className="text-2xl">🌦️</span>
              )}
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-100">
                  {weatherJsonGenerating ? "Generating..." : "Symbolic Weather"}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Day-by-day transit patterns + climate data (JSON)
                </div>
              </div>
            </div>
          </button>
        )}
      </div>

      {includeTransits && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">For Human Review</h3>

          <button
            type="button"
            onClick={onDownloadGraphsPDF}
            disabled={graphsPdfGenerating}
            className="w-full rounded-md border border-emerald-600 bg-emerald-700/30 px-4 py-3 text-left hover:bg-emerald-700/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
            aria-label="Download Symbolic Weather Dashboard PDF (visual summary)"
          >
            <div className="flex items-center gap-3">
              {graphsPdfGenerating ? (
                <svg className="animate-spin h-5 w-5 text-emerald-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <span className="text-2xl">📊</span>
              )}
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-100">
                  {graphsPdfGenerating ? "Generating..." : "Symbolic Weather Dashboard"}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  At-a-glance charts and summaries (PDF)
                </div>
              </div>
            </div>
          </button>
        </div>
      )}

      <details className="rounded-lg border border-slate-700/50 bg-slate-900/20">
        <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-300 select-none">
          Advanced / Developer Exports
        </summary>
        <div className="border-t border-slate-700/50 p-3 space-y-2">
          <button
            type="button"
            onClick={onDownloadEngineConfig}
            disabled={engineConfigGenerating}
            className="w-full rounded border border-slate-700 bg-slate-800/50 px-3 py-2 text-left text-xs hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            aria-label="Download Engine Configuration JSON"
          >
            <div className="flex items-center gap-2">
              {engineConfigGenerating ? (
                <svg className="animate-spin h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <span>🔧</span>
              )}
              <div className="flex-1">
                <div className="font-medium text-slate-200">{engineConfigGenerating ? "Generating..." : "Engine Configuration"}</div>
                <div className="text-slate-500 text-[10px] mt-0.5">Foundation natal data + system settings (JSON)</div>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={onDownloadCleanJSON}
            disabled={cleanJsonGenerating}
            className="w-full rounded border border-slate-700 bg-slate-800/50 px-3 py-2 text-left text-xs hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            aria-label="Download normalized JSON"
          >
            <div className="flex items-center gap-2">
              {cleanJsonGenerating ? (
                <svg className="animate-spin h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <span>📋</span>
              )}
              <div className="flex-1">
                <div className="font-medium text-slate-200">{cleanJsonGenerating ? "Generating..." : "Clean JSON (0-5 scale)"}</div>
                <div className="text-slate-500 text-[10px] mt-0.5">Normalized frontstage data (JSON)</div>
              </div>
            </div>
          </button>
        </div>
      </details>

      {includeTransits && hasSeismographData && (
        authReady ? (
          <HealthDataUpload seismographData={seismographMap} isAuthenticated={isAuthenticated} />
        ) : (
          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-300">
            Checking your sign-in status
            <span className="ml-1 animate-pulse">…</span>
          </div>
        )
      )}

      <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-700/50">
        <div className="text-xs text-slate-400">Ready for AI reading?</div>
        {canVisitPoetic ? (
          <button
            type="button"
            onClick={onNavigateToPoetic}
            className="rounded-md px-4 py-2 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition flex items-center gap-2"
          >
            Go to Poetic Brain
            <span className="text-lg">→</span>
          </button>
        ) : (
          <span className="rounded-md border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-400">
            Poetic Brain offline
          </span>
        )}
      </div>
    </div>
  );
}
