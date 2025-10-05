'use client';

import { WovenMapReadiness } from './WovenMapReadiness';
import { WovenMapProvenance } from './WovenMapProvenance';

interface WovenMapDisplayProps {
  wovenMap: any;
  personA: any;
  personB: any | null;
  includePersonB: boolean;
  includeTransits: boolean;
  startDate: string;
  endDate: string;
  mode: string;
}

export function WovenMapDisplay({
  wovenMap,
  personA,
  personB,
  includePersonB,
  includeTransits,
  startDate,
  endDate,
  mode,
}: WovenMapDisplayProps) {
  // Determine readiness
  const personAHasDate = Boolean(personA?.year && personA?.month && personA?.day);
  const personAHasTime = Boolean(personA?.hour !== '' && personA?.minute !== '');
  const personAHasLocation = Boolean(
    personA?.latitude && personA?.longitude && personA?.timezone
  );

  const personBHasDate = includePersonB && Boolean(personB?.year && personB?.month && personB?.day);
  const personBHasTime =
    includePersonB && Boolean(personB?.hour !== '' && personB?.minute !== '');
  const personBHasLocation =
    includePersonB && Boolean(personB?.latitude && personB?.longitude && personB?.timezone);

  const transitWindowConfigured = includeTransits && Boolean(startDate && endDate);

  // Extract Woven Map data
  const natalAspectsCount = wovenMap?.data_tables?.natal_aspects?.length || 0;
  const polarityHooksCount = wovenMap?.polarity_hooks?.length || 0;
  const timeSeriesCount = wovenMap?.time_series?.length || 0;
  const integrationFactors = wovenMap?.integration_factors || {};

  const hasAnyData = natalAspectsCount > 0 || timeSeriesCount > 0;

  // Determine mode
  const reportMode = includePersonB ? 'relational' : personAHasDate ? 'solo' : 'undetermined';

  // Suppression reasons
  const suppressionReasons: Record<string, string> = {};
  if (!includeTransits || !transitWindowConfigured) {
    suppressionReasons.weather =
      'Transit window not configured. Balance Meter requires date range.';
  }
  if (reportMode === 'relational' && (!personBHasDate || !personBHasLocation)) {
    suppressionReasons.relational = 'Person B data incomplete. Cross-chart vectors unavailable.';
  }
  if (reportMode === 'relational' && natalAspectsCount === 0) {
    suppressionReasons.hooks = 'No natal aspects loaded. Polarity cards require chart geometry.';
  }

  // If no data at all, show readiness checklist
  if (!hasAnyData) {
    return (
      <>
        <WovenMapReadiness
          personA={{
            hasDate: personAHasDate,
            hasTime: personAHasTime,
            hasLocation: personAHasLocation,
          }}
          personB={
            includePersonB
              ? {
                  hasDate: personBHasDate || false,
                  hasTime: personBHasTime || false,
                  hasLocation: personBHasLocation || false,
                }
              : null
          }
          transitWindow={{
            configured: transitWindowConfigured,
            startDate,
            endDate,
          }}
          mode={reportMode}
        />
        <WovenMapProvenance
          schema={wovenMap?.schema || 'WM-WovenMap-1.1'}
          houseSystem={wovenMap?.house_system || 'Placidus'}
          relocationMode={wovenMap?.translocation?.method || 'Natal'}
          natalAspectsCount={natalAspectsCount}
          polarityHooksCount={polarityHooksCount}
          timeSeriesCount={timeSeriesCount}
          suppressionReasons={suppressionReasons}
        />
      </>
    );
  }

  // Otherwise, render the actual Woven Map data
  return (
    <>
      {/* Mode Banner */}
      <div className="mb-4 flex items-center justify-between rounded-md border border-slate-700 bg-slate-800/60 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium text-slate-200">
            Mode: {reportMode === 'relational' ? 'Relational Mirror' : 'Solo Mirror'}
          </div>
          {!includeTransits && (
            <div className="rounded-full border border-amber-600/50 bg-amber-900/20 px-2 py-0.5 text-xs text-amber-300">
              Natal-only (no transits loaded)
            </div>
          )}
          {includeTransits && timeSeriesCount > 0 && (
            <div className="rounded-full border border-emerald-600/50 bg-emerald-900/20 px-2 py-0.5 text-xs text-emerald-300">
              Balance Meter active
            </div>
          )}
        </div>
        <div className="text-xs text-slate-400">
          {natalAspectsCount} aspects · {timeSeriesCount} time entries
        </div>
      </div>

      {/* Integration Factors */}
      {Object.keys(integrationFactors).length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-slate-300">Integration Factors</div>
          <div className="mt-2 space-y-2">
            {Object.entries(integrationFactors).map(([key, value]: [string, any]) => {
              const pct = Math.max(0, Math.min(100, Number(value ?? 0)));
              const label = key
                .split('_')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
              return (
                <div key={String(key)}>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{label}</span>
                    <span>{pct}%</span>
                  </div>
                  <svg viewBox="0 0 100 6" className="h-1.5 w-full">
                    <rect x="0" y="0" width="100" height="6" className="fill-slate-700" />
                    <rect x="0" y="0" width={pct} height="6" className="fill-emerald-500" />
                  </svg>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Time Series Info */}
      {timeSeriesCount > 0 && (
        <div className="mb-4 rounded border border-slate-700 bg-slate-900/40 p-3 text-xs text-slate-400">
          <div className="font-medium text-slate-300">Time Series Active</div>
          <div className="mt-1">
            {timeSeriesCount} daily readings from {startDate} → {endDate}
          </div>
        </div>
      )}

      {/* Provenance Footer */}
      <WovenMapProvenance
        schema={wovenMap?.schema || 'WM-WovenMap-1.1'}
        houseSystem={wovenMap?.house_system || 'Placidus'}
        relocationMode={wovenMap?.translocation?.method || 'Natal'}
        natalAspectsCount={natalAspectsCount}
        polarityHooksCount={polarityHooksCount}
        timeSeriesCount={timeSeriesCount}
        suppressionReasons={suppressionReasons}
      />
    </>
  );
}

export default WovenMapDisplay;
