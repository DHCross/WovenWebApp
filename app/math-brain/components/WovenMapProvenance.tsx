'use client';

interface WovenMapProvenanceProps {
  schema: string;
  houseSystem: string;
  relocationMode: string;
  natalAspectsCount: number;
  polarityHooksCount: number;
  timeSeriesCount: number;
  suppressionReasons: {
    weather?: string;
    relational?: string;
    hooks?: string;
  };
}

export function WovenMapProvenance({
  schema,
  houseSystem,
  relocationMode,
  natalAspectsCount,
  polarityHooksCount,
  timeSeriesCount,
  suppressionReasons,
}: WovenMapProvenanceProps) {
  const hasSuppressions = Object.keys(suppressionReasons).length > 0;

  return (
    <div className="mt-4 space-y-3">
      {/* Technical Metadata */}
      <div className="grid grid-cols-2 gap-3 rounded-md border border-slate-700 bg-slate-900/40 p-3 text-xs sm:grid-cols-4">
        <div>
          <div className="text-slate-500">Schema</div>
          <div className="font-mono text-slate-300">{schema}</div>
        </div>
        <div>
          <div className="text-slate-500">House System</div>
          <div className="text-slate-300">{houseSystem}</div>
        </div>
        <div>
          <div className="text-slate-500">Relocation</div>
          <div className="text-slate-300">{relocationMode}</div>
        </div>
        <div>
          <div className="text-slate-500">Report Type</div>
          <div className="text-slate-300">Relational</div>
        </div>
      </div>

      {/* Data Counts */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="rounded border border-slate-700 bg-slate-800/50 p-2">
          <div className="text-slate-400">Natal aspects (A)</div>
          <div className="mt-1 text-lg font-semibold text-slate-200">{natalAspectsCount}</div>
        </div>
        <div className="rounded border border-slate-700 bg-slate-800/50 p-2">
          <div className="text-slate-400">Polarity cards (hooks)</div>
          <div className="mt-1 text-lg font-semibold text-slate-200">{polarityHooksCount}</div>
        </div>
        <div className="rounded border border-slate-700 bg-slate-800/50 p-2">
          <div className="text-slate-400">Time series entries</div>
          <div className="mt-1 text-lg font-semibold text-slate-200">{timeSeriesCount}</div>
        </div>
      </div>

      {/* Suppression Reasons (Why Things Are Silent) */}
      {hasSuppressions && (
        <div className="rounded-md border border-amber-700/50 bg-amber-900/10 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-amber-300">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span>Why certain channels are silent</span>
          </div>
          <div className="space-y-1.5 text-xs">
            {suppressionReasons.weather && (
              <div className="flex items-start gap-2">
                <div className="mt-0.5 text-amber-400">•</div>
                <div className="flex-1 text-amber-200/80">
                  <strong className="text-amber-300">Symbolic Weather:</strong>{' '}
                  {suppressionReasons.weather}
                </div>
              </div>
            )}
            {suppressionReasons.relational && (
              <div className="flex items-start gap-2">
                <div className="mt-0.5 text-amber-400">•</div>
                <div className="flex-1 text-amber-200/80">
                  <strong className="text-amber-300">Relational Engines:</strong>{' '}
                  {suppressionReasons.relational}
                </div>
              </div>
            )}
            {suppressionReasons.hooks && (
              <div className="flex items-start gap-2">
                <div className="mt-0.5 text-amber-400">•</div>
                <div className="flex-1 text-amber-200/80">
                  <strong className="text-amber-300">Polarity Hooks:</strong>{' '}
                  {suppressionReasons.hooks}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diagnostic Status */}
      <div className="text-xs text-slate-500">
        {natalAspectsCount === 0 && timeSeriesCount === 0 ? (
          <>
            ⚠️ No geometric data loaded. FIELD layer empty → MAP inactive → VOICE silent. This is
            expected before birth data submission.
          </>
        ) : timeSeriesCount === 0 ? (
          <>
            ✓ Natal geometry loaded ({natalAspectsCount} aspects). FIELD active → MAP ready. Weather
            layer awaits transit window.
          </>
        ) : (
          <>
            ✓ Full diagnostic active. FIELD ({natalAspectsCount} aspects, {timeSeriesCount} time
            entries) → MAP → VOICE pipeline operational.
          </>
        )}
      </div>
    </div>
  );
}

export default WovenMapProvenance;
