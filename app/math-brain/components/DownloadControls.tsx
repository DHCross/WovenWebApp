"use client";

import HealthDataUpload from "../../../components/HealthDataUpload";
import type { SeismographMap } from "../../../lib/health-data-types";

interface DownloadControlsProps {
  includeTransits: boolean;
  pdfGenerating: boolean;
  graphsPdfGenerating: boolean;
  astroFileJsonGenerating: boolean;
  engineConfigGenerating: boolean;
  cleanJsonGenerating: boolean;
  onDownloadPDF: () => void;
  onDownloadAstroFile: () => void;
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
  graphsPdfGenerating,
  astroFileJsonGenerating,
  engineConfigGenerating,
  cleanJsonGenerating,
  onDownloadPDF,
  onDownloadAstroFile,
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
    graphsPdfGenerating || 
    astroFileJsonGenerating ||
    engineConfigGenerating ||
    cleanJsonGenerating;
  const showDevExports = process.env.NEXT_PUBLIC_DEV_MODE === "true";

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
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">For AI Analysis & Interpretation</h3>
        <p className="text-xs text-slate-400 -mt-1 mb-2">Download and use with any AI trained in astrology, or upload to Poetic Brain for the unique Raven Calder experience</p>
        <button
          type="button"
          onClick={onDownloadAstroFile}
          disabled={astroFileJsonGenerating}
          className="w-full rounded-md border border-blue-600 bg-blue-700/30 px-4 py-3 text-left hover:bg-blue-700/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
          aria-label="Download Astro File JSON for AI analysis or Poetic Brain"
        >
          <div className="flex items-center gap-3">
            {astroFileJsonGenerating ? (
              <svg className="animate-spin h-5 w-5 text-blue-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <span className="text-2xl">🪐</span>
            )}
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-100">
                {astroFileJsonGenerating ? "Preparing Astro File..." : "Astro File (JSON)"}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {includeTransits
                  ? "Use with any AI trained in astrology, or upload to Poetic Brain for the unique Raven Calder experience (Google login required)"
                  : "Upload to Poetic Brain (Google login required); add transits for symbolic weather"}
              </div>
            </div>
          </div>
        </button>
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
          {showDevExports && (
            <>
              <button
                type="button"
                onClick={onDownloadMapFile}
                disabled={cleanJsonGenerating}
                className="w-full rounded border border-indigo-500 bg-indigo-600/15 px-3 py-2 text-left text-xs hover:bg-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed transition"
                aria-label="Download MAP file (constitutional geometry)"
              >
                <div className="flex items-center gap-2">
                  {cleanJsonGenerating ? (
                    <svg className="animate-spin h-4 w-4 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <span>🗺️</span>
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-slate-200">
                      {cleanJsonGenerating ? "Preparing MAP..." : "MAP File (wm-map-v1)"}
                    </div>
                    <div className="text-slate-500 text-[10px] mt-0.5">
                      Permanent constitutional geometry (natal chart)
                    </div>
                  </div>
                </div>
              </button>

              {includeTransits && (
                <button
                  type="button"
                  onClick={onDownloadFieldFile}
                  disabled={astroFileJsonGenerating}
                  className="w-full rounded border border-cyan-500 bg-cyan-600/15 px-3 py-2 text-left text-xs hover:bg-cyan-600/25 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  aria-label="Download FIELD file (symbolic weather)"
                >
                  <div className="flex items-center gap-2">
                    {astroFileJsonGenerating ? (
                      <svg className="animate-spin h-4 w-4 text-cyan-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <span>⛅</span>
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-slate-200">
                        {astroFileJsonGenerating ? "Preparing FIELD..." : "FIELD File (wm-field-v1)"}
                      </div>
                      <div className="text-slate-500 text-[10px] mt-0.5">
                        Raw symbolic-weather activations (daily transit aspects)
                      </div>
                    </div>
                  </div>
                </button>
              )}
            </>
          )}

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
