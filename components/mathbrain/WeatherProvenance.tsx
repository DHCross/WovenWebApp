'use client';

import React from 'react';

type WeatherProvenanceProps = {
  schema: string;
  houseSystem: string;
  relocationMode: string;
  timezone: string;
  scaleMode?: string;
  coherenceInversion?: boolean;
  hasTransits: boolean;
  driversCount: number;
  suppressReasons?: string[];
};

export function WeatherProvenance({
  schema,
  houseSystem,
  relocationMode,
  timezone,
  scaleMode = 'absolute_x5',
  coherenceInversion = true,
  hasTransits,
  driversCount,
  suppressReasons = [],
}: WeatherProvenanceProps) {
  const showSuppression = !hasTransits || driversCount === 0 || suppressReasons.length > 0;

  return (
    <div className="mt-6 space-y-3 rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-xs">
      {/* Metadata Grid */}
      <div className="grid gap-3 sm:grid-cols-5">
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
          <div className="text-slate-500">Timezone</div>
          <div className="text-slate-300">{timezone}</div>
        </div>
        <div>
          <div className="text-slate-500">Scale Mode</div>
          <div className="text-slate-300">{scaleMode}</div>
        </div>
      </div>

      {/* Transform Status */}
      <div className="flex items-center gap-4 border-t border-slate-700 pt-3 text-slate-400">
        <div>
          <span className="text-slate-500">Coherence inversion:</span>{' '}
          <span className={coherenceInversion ? 'text-emerald-400' : 'text-amber-400'}>
            {coherenceInversion ? 'ON' : 'OFF'}
          </span>
        </div>
        <div>
          <span className="text-slate-500">Transit drivers:</span>{' '}
          <span className={hasTransits && driversCount > 0 ? 'text-emerald-400' : 'text-slate-500'}>
            {driversCount}
          </span>
        </div>
      </div>

      {/* Suppression Notice */}
      {showSuppression && (
        <div className="rounded border border-amber-700/50 bg-amber-900/20 p-3">
          <div className="mb-1 flex items-center gap-2 text-amber-300">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">Weather Constraints</span>
          </div>
          <div className="space-y-1 text-amber-200/90">
            {!hasTransits || driversCount === 0 ? (
              <div>
                • No transit drivers — symbolic weather is suppressed. This is a natal-only mirror.
              </div>
            ) : null}
            {suppressReasons.map((reason, i) => (
              <div key={i}>• {reason}</div>
            ))}
          </div>
        </div>
      )}

      {/* Status Summary */}
      <div className="border-t border-slate-700 pt-3 text-slate-500">
        {!hasTransits || driversCount === 0 ? (
          <>⚠️ FIELD empty → weather suppressed. Showing natal mirror only.</>
        ) : (
          <>✓ Full diagnostic active. FIELD ({driversCount} drivers) → MAP → VOICE operational.</>
        )}
      </div>
    </div>
  );
}

export default WeatherProvenance;
