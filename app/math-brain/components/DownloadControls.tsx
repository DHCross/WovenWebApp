"use client";

import HealthDataUpload from "../../../components/HealthDataUpload";
import type { SeismographMap } from "../../../lib/health-data-types";

interface DownloadControlsProps {
  includeTransits: boolean;
  pdfGenerating: boolean;
  markdownGenerating: boolean;
  graphsPdfGenerating: boolean;
  weatherJsonGenerating: boolean;
  engineConfigGenerating: boolean;
  cleanJsonGenerating: boolean;
  bundleGenerating: boolean;
  onDownloadPDF: () => void;
  onDownloadMarkdown: () => void;
  onDownloadMirrorDirective: () => void;
  onDownloadSymbolicWeather: () => void;
  onDownloadBundle: () => void;
  onDownloadGraphsPDF: () => void;
  onDownloadEngineConfig: () => void;
  onDownloadCleanJSON: () => void;
  onDownloadMapFile: () => void;           // NEW: MAP file export
  onDownloadFieldFile: () => void;         // NEW: FIELD file export
  seismographMap: SeismographMap;
  authReady: boolean;
  isAuthenticated: boolean;
  canVisitPoetic: boolean;
  onNavigateToPoetic: () => void;
}

export default function DownloadControls({
  includeTransits,
  pdfGenerating,
  markdownGenerating,
  graphsPdfGenerating,
  weatherJsonGenerating,
  engineConfigGenerating,
  cleanJsonGenerating,
  bundleGenerating,
  onDownloadPDF,
  onDownloadMarkdown,
  onDownloadMirrorDirective,
  onDownloadSymbolicWeather,
  onDownloadBundle,
  onDownloadGraphsPDF,
  onDownloadEngineConfig,
  onDownloadCleanJSON,
  onDownloadMapFile,
  onDownloadFieldFile,
  seismographMap,
  authReady,
  isAuthenticated,
  canVisitPoetic,
  onNavigateToPoetic,
}: DownloadControlsProps) {
  const hasSeismographData = Object.keys(seismographMap || {}).length > 0;
  const isAnyGenerating =
    pdfGenerating ||
    markdownGenerating ||
    graphsPdfGenerating ||
    weatherJsonGenerating ||
    engineConfigGenerating ||
    cleanJsonGenerating ||
    bundleGenerating;

  return (
    <>
      {/* Overlay during export to prevent double-clicks */}
      {isAnyGenerating && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center pointer-events-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 text-center max-w-sm">
            <div className="flex justify-center mb-4">
              <svg className="animate-spin h-12 w-12 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-100 mb-2">Preparing your report…</h3>
            <p className="text-sm text-slate-400">This may take up to a minute for large windows. Please be patient.</p>
          </div>
        </div>
      )}
      <div className="space-y-4 print:hidden">
        <div className="text-sm text-slate-300">
          <span className="font-medium">Your report is ready.</span> Choose how to use it:
        </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">For Raven Calder (AI Analysis)</h3>



        <button
          type="button"
          onClick={onDownloadBundle}
          disabled={bundleGenerating}
          className="w-full rounded-md border border-emerald-500 bg-emerald-600/20 px-4 py-3 text-left hover:bg-emerald-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
          aria-label="Download AI-ready ZIP bundle"
          title="Includes README, Mirror Directive JSON, Symbolic Weather JSON, and FieldMap JSON"
        >
          <div className="flex items-center gap-3">
            {bundleGenerating ? (
              <svg className="animate-spin h-5 w-5 text-emerald-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <span className="text-2xl">📦</span>
            )}
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-100">
                {bundleGenerating ? "Preparing AI bundle..." : "AI Analysis Bundle (ZIP)"}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                README + Mirror Directive + Symbolic Weather + FieldMap
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onDownloadMarkdown}
          disabled={markdownGenerating}
          className="w-full rounded-md border border-purple-600 bg-purple-700/30 px-4 py-3 text-left hover:bg-purple-700/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
          aria-label="Download Mirror Report (lightweight, AI-friendly)"
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
                {markdownGenerating ? "Generating Markdown..." : "Mirror Report (AI Optimized)"}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Clean Markdown with structured summaries (~100KB)
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onDownloadMirrorDirective}
          disabled={cleanJsonGenerating}
          className="w-full rounded-md border border-amber-500 bg-amber-600/20 px-4 py-3 text-left hover:bg-amber-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
          aria-label="Download Mirror Directive JSON for Poetic Brain"
        >
          <div className="flex items-center gap-3">
            {cleanJsonGenerating ? (
              <svg className="animate-spin h-5 w-5 text-amber-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <span className="text-2xl">🧭</span>
            )}
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-100">
                {cleanJsonGenerating ? "Preparing Mirror Directive..." : "Mirror Directive (JSON)"}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Structured natal blueprint for Poetic Brain
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onDownloadMapFile}
          disabled={cleanJsonGenerating}
          className="w-full rounded-md border border-indigo-500 bg-indigo-600/20 px-4 py-3 text-left hover:bg-indigo-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
          aria-label="Download MAP file (constitutional geometry)"
          title="MAP = Your Chart: Permanent natal geometry for Mirror Flow Reports"
        >
          <div className="flex items-center gap-3">
            {cleanJsonGenerating ? (
              <svg className="animate-spin h-5 w-5 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <span className="text-2xl">🗺️</span>
            )}
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-100">
                {cleanJsonGenerating ? "Preparing MAP..." : "MAP File (wm-map-v1)"}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Constitutional geometry - your permanent chart
              </div>
            </div>
          </div>
        </button>

        {includeTransits && (
          <button
            type="button"
            onClick={onDownloadFieldFile}
            disabled={weatherJsonGenerating}
            className="w-full rounded-md border border-cyan-500 bg-cyan-600/20 px-4 py-3 text-left hover:bg-cyan-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
            aria-label="Download FIELD file (symbolic weather)"
            title="FIELD = The Weather: Temporal transit activations for Balance Meter Reports"
          >
            <div className="flex items-center gap-3">
              {weatherJsonGenerating ? (
                <svg className="animate-spin h-5 w-5 text-cyan-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <span className="text-2xl">⛅</span>
              )}
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-100">
                  {weatherJsonGenerating ? "Preparing FIELD..." : "FIELD File (wm-field-v1)"}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Symbolic weather - transits activating your chart
                </div>
              </div>
            </div>
          </button>
        )}

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
                  {weatherJsonGenerating ? "Generating..." : "Symbolic Weather (Compact)"}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Unified data object with computed summaries (JSON)
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
    </>
  );
}
