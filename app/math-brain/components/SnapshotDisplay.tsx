/* eslint-disable no-console */
'use client';

import { buildDomainsFromChart, createSnapshotDisplay } from '../utils/snapshot';

interface SnapshotDisplayProps {
  result: any;
  location: { latitude: number; longitude: number };
  timestamp: Date;
}

export default function SnapshotDisplay({ result, location, timestamp }: SnapshotDisplayProps) {
  console.log('[SnapshotDisplay] Rendering with result:', result);
  
  const snapshot = createSnapshotDisplay(result, location, timestamp);

  // Check if this is a relational snapshot
  const hasPersonB = Boolean(result?.person_b);
  const isRelational = hasPersonB && Boolean(result.person_b);

  const selectSummarySource = () =>
    result?.balance_meter?.channel_summary_canonical ||
    result?.balance_meter?.channel_summary ||
    result?.person_a?.derived?.seismograph_summary_canonical ||
    result?.person_a?.derived?.seismograph_summary ||
    result?.summary?.balance_meter ||
    result?.person_a?.summary ||
    result?.summary ||
    null;

  const summarySource = selectSummarySource();

  const getFirstTransitDay = () => {
    const transits = result?.person_a?.chart?.transitsByDate;
    if (!transits || typeof transits !== 'object') return null;
    const keys = Object.keys(transits).sort();
    if (!keys.length) return null;
    const day = transits[keys[0]];
    if (!day || typeof day !== 'object') return null;
    return day;
  };

  const fallbackFromDay = (() => {
    const day = getFirstTransitDay();
    const seismograph = day?.seismograph || day?.raw || null;
    if (!seismograph || typeof seismograph !== 'object') return null;

    const magnitudeCandidate =
      typeof seismograph.magnitude === 'number'
        ? seismograph.magnitude
        : typeof seismograph.rawMagnitude === 'number'
        ? seismograph.rawMagnitude
        : undefined;

    const biasCandidate =
      typeof seismograph.directional_bias?.value === 'number'
        ? seismograph.directional_bias.value
        : typeof seismograph.rawDirectionalBias === 'number'
        ? seismograph.rawDirectionalBias
        : undefined;

    const volatilityCandidate =
      typeof seismograph.volatility === 'number'
        ? seismograph.volatility
        : typeof seismograph.volatility_scaled === 'number'
        ? seismograph.volatility_scaled
        : undefined;

    if (
      magnitudeCandidate === undefined &&
      biasCandidate === undefined &&
      volatilityCandidate === undefined
    ) {
      return null;
    }

    return {
      magnitude: magnitudeCandidate,
      directionalBias: biasCandidate,
      volatility: volatilityCandidate,
    };
  })();

  const toNumber = (value: any): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
    if (value && typeof value === 'object') {
      if (typeof value.value === 'number') return value.value;
      if (typeof value.mean === 'number') return value.mean;
      if (typeof value.score === 'number') return value.score;
    }
    return undefined;
  };

  const magnitudePrimary =
    toNumber(summarySource?.axes?.magnitude) ??
    toNumber(summarySource?.magnitude) ??
    toNumber(summarySource?.magnitude_value);

  const biasPrimary =
    toNumber(summarySource?.axes?.directional_bias) ??
    toNumber(summarySource?.directional_bias) ??
    toNumber(summarySource?.bias_signed) ??
    toNumber(summarySource?.valence_bounded) ??
    toNumber(summarySource?.valence);

  const volatilityPrimary =
    toNumber(summarySource?.axes?.coherence) ??
    toNumber(summarySource?.axes?.volatility) ??
    toNumber(summarySource?.volatility) ??
    toNumber(summarySource?.coherence);

  const shouldUseFallback = (primary: number | undefined, fallback: number | undefined) =>
    (primary === undefined || primary === null || Math.abs(primary) < 0.01) &&
    typeof fallback === 'number' &&
    Math.abs(fallback) >= 0.05;

  const magnitudeResolved =
    (typeof magnitudePrimary === 'number' ? magnitudePrimary : undefined) ??
    (typeof fallbackFromDay?.magnitude === 'number' ? fallbackFromDay.magnitude : undefined);

  const directionalBiasResolved =
    (typeof biasPrimary === 'number' ? biasPrimary : undefined) ??
    (typeof fallbackFromDay?.directionalBias === 'number' ? fallbackFromDay.directionalBias : undefined);

  const volatilityResolved =
    (typeof volatilityPrimary === 'number' ? volatilityPrimary : undefined) ??
    (typeof fallbackFromDay?.volatility === 'number' ? fallbackFromDay.volatility : undefined);

  const magnitude =
    shouldUseFallback(magnitudePrimary, fallbackFromDay?.magnitude) && fallbackFromDay
      ? fallbackFromDay.magnitude ?? null
      : typeof magnitudeResolved === 'number'
      ? magnitudeResolved
      : null;
  const directionalBias =
    shouldUseFallback(biasPrimary, fallbackFromDay?.directionalBias) && fallbackFromDay
      ? fallbackFromDay.directionalBias ?? null
      : typeof directionalBiasResolved === 'number'
      ? directionalBiasResolved
      : null;
  const volatility =
    shouldUseFallback(volatilityPrimary, fallbackFromDay?.volatility) && fallbackFromDay
      ? fallbackFromDay.volatility ?? null
      : typeof volatilityResolved === 'number'
      ? volatilityResolved
      : null;

  // Extract chart assets for visualization
  const chartAssets = result?.person_a?.chart_assets || [];

  const selectWheelAsset = () => {
    if (!Array.isArray(chartAssets) || chartAssets.length === 0) return null;

    const priorityChartTypes = ['natal', 'transit', 'synastry', 'composite'];
    const prioritySubjects = ['person_a', 'transit', 'synastry'];

    for (const type of priorityChartTypes) {
      const match = chartAssets.find((asset: any) => {
        const chartType = typeof asset?.chartType === 'string' ? asset.chartType.toLowerCase() : '';
        return chartType === type;
      });
      if (match?.url) return match;
    }

    for (const subject of prioritySubjects) {
      const match = chartAssets.find((asset: any) => {
        const subjectKey = typeof asset?.subject === 'string' ? asset.subject.toLowerCase() : '';
        return subjectKey === subject;
      });
      if (match?.url) return match;
    }

    return chartAssets.find((asset: any) => asset?.url) || null;
  };

  const wheelChart = selectWheelAsset();

  // Extract provenance
  const houseSystem =
    result?.provenance?.house_system_name ||
    result?.provenance?.house_system ||
    result?.person_a?.chart?.houses_system_name ||
    result?.person_a?.chart?.houses_system_identifier ||
    'Placidus';
  const zodiacType =
    result?.provenance?.zodiac_type ||
    result?.person_a?.chart?.zodiac_type ||
    result?.person_a?.zodiac_type ||
    'Tropical';
  const schemaVersion = '5.0'; // From your system

  const personBDomains = isRelational ? buildDomainsFromChart(result?.person_b?.chart) : [];
  const showPersonBDomains = isRelational && personBDomains.some((domain) => domain.planets.length > 0);
  
  console.log('[SnapshotDisplay] Balance Meter metrics:', {
    magnitude,
    directionalBias,
    volatility,
    summarySourceKeys: summarySource ? Object.keys(summarySource) : [],
    fallbackFromDay,
  });

  return (
    <div className="mt-6 rounded-lg border border-purple-700 bg-purple-900/20 p-6 backdrop-blur-sm">
      {/* HEADER */}
      <div className="mb-6 flex items-start justify-between border-b border-purple-700/30 pb-4">
        <div className="w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-purple-600 bg-purple-700/20 px-2 py-0.5 text-xs text-purple-300">
              <span>⭐</span>
              <span>Symbolic Moment Snapshot</span>
            </span>
          </div>
          <h3 className="text-xl font-semibold text-purple-200 flex items-center gap-2">
            <span>🕐</span>
            <span>{snapshot.timestamp}</span>
          </h3>
          <p className="mt-1 text-sm text-slate-300">
            📍 {snapshot.location.label}
          </p>
          {isRelational && (
            <p className="mt-1 text-xs text-purple-300">
              ℹ️ Relational snapshot: Both charts relocated to current location
            </p>
          )}
        </div>
      </div>

      {/* CHART WHEEL PLACEHOLDER (TOP HALF) */}
      {wheelChart?.url ? (
        <div className="mb-6 flex justify-center rounded border border-slate-700 bg-slate-900/50 p-4">
          <img 
            src={wheelChart.url} 
            alt="Natal Chart" 
            className="max-w-full h-auto"
            onError={(e) => {
              console.error('[SnapshotDisplay] Chart image failed to load');
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      ) : (
        <div className="mb-6 rounded border border-slate-700 bg-slate-900/50 p-8 text-center">
          <div className="mb-4">
            <div className="inline-block rounded-full border-4 border-purple-600 w-32 h-32 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl">🌌</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-2">Chart Wheel</p>
          {snapshot.houses && (snapshot.houses.asc || snapshot.houses.mc) && (
            <div className="flex justify-center gap-6 text-xs text-slate-400">
              {snapshot.houses.asc && (
                <div>
                  <span className="text-slate-500">ASC</span>{' '}
                  <span className="text-purple-300">
                    {snapshot.houses.asc.sign} {snapshot.houses.asc.degree.toFixed(1)}°
                  </span>
                </div>
              )}
              {snapshot.houses.mc && (
                <div>
                  <span className="text-slate-500">MC</span>{' '}
                  <span className="text-purple-300">
                    {snapshot.houses.mc.sign} {snapshot.houses.mc.degree.toFixed(1)}°
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* BALANCE METER DIAGNOSTIC PANEL (BOTTOM HALF) */}
      <div className="mb-6 rounded-lg border border-indigo-700 bg-indigo-900/20 p-4">
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-indigo-300">
          Balance Meter Snapshot
        </h4>
        
        {/* Metrics Table */}
        <div className="rounded border border-slate-700 bg-slate-900/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/50">
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Axis</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">Value</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              <tr>
                <td className="px-3 py-2 text-slate-300">Magnitude</td>
                <td className="px-3 py-2 text-right font-mono text-indigo-300">
                  {typeof magnitude === 'number' ? magnitude.toFixed(1) : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-slate-400">
                  {typeof magnitude === 'number' && magnitude >= 4
                    ? 'Strong field activation'
                    : typeof magnitude === 'number' && magnitude >= 2
                    ? 'Moderate activation'
                    : typeof magnitude === 'number' && magnitude >= 1
                    ? 'Light activation'
                    : 'Latent field'}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-slate-300">Directional Bias</td>
                <td className="px-3 py-2 text-right font-mono text-indigo-300">
                  {typeof directionalBias === 'number'
                    ? `${directionalBias > 0 ? '+' : ''}${directionalBias.toFixed(1)}`
                    : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-slate-400">
                  {typeof directionalBias === 'number' && directionalBias >= 3
                    ? 'Strong expansion'
                    : typeof directionalBias === 'number' && directionalBias >= 1
                    ? 'Moderate expansion'
                    : typeof directionalBias === 'number' && directionalBias >= -1
                    ? 'Equilibrium'
                    : typeof directionalBias === 'number' && directionalBias >= -3
                    ? 'Moderate contraction'
                    : 'Strong contraction'}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-slate-300">Coherence (Volatility)</td>
                <td className="px-3 py-2 text-right font-mono text-indigo-300">
                  {typeof volatility === 'number' ? volatility.toFixed(1) : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-slate-400">
                  {typeof volatility === 'number' && volatility >= 4
                    ? 'Very high variability'
                    : typeof volatility === 'number' && volatility >= 2
                    ? 'Moderate stability'
                    : typeof volatility === 'number' && volatility >= 1
                    ? 'High stability'
                    : 'Very stable pattern'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Symbolic Reading Summary (Field Metrics) */}
        {(typeof magnitude === 'number' || typeof directionalBias === 'number') && (
          <div className="mt-3 rounded border border-slate-700 bg-slate-800/30 p-3">
            <p className="text-xs text-slate-400 mb-1">
              <span className="font-medium text-slate-300">Symbolic Weather (FIELD layer):</span>
            </p>
            <p className="text-sm text-indigo-200">
              {typeof directionalBias === 'number' && directionalBias < -1
                ? 'Contracting'
                : typeof directionalBias === 'number' && directionalBias > 1
                ? 'Expanding'
                : 'Balanced'}{' '}
              {typeof magnitude === 'number' && magnitude >= 3
                ? 'with strong activation'
                : typeof magnitude === 'number' && magnitude >= 1
                ? 'gently'
                : 'subtly'}
              ;
              {typeof volatility === 'number' && volatility < 2
                ? ' coherence steady'
                : typeof volatility === 'number' && volatility >= 4
                ? ' high variability'
                : ' moderate shifts'}
              .
            </p>
          </div>
        )}
      </div>

      {/* PROVENANCE FOOTER */}
      <div className="rounded border border-slate-700/50 bg-slate-900/30 p-3 text-xs text-slate-400">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <span className="text-slate-500">Schema:</span>{' '}
            <span className="text-slate-300">BM-v{schemaVersion}</span>
          </div>
          <div>
            <span className="text-slate-500">House System:</span>{' '}
            <span className="text-slate-300">{houseSystem}</span>
          </div>
          <div>
            <span className="text-slate-500">Zodiac:</span>{' '}
            <span className="text-slate-300">{zodiacType}</span>
          </div>
          <div>
            <span className="text-slate-500">Weather:</span>{' '}
            <span className="text-emerald-300">Active</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-700/50">
          <div className="text-slate-500">
            Coordinates: {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
          </div>
          <div className="text-slate-500">
            Local: {snapshot.localTime} · UTC: {snapshot.utcTime}
          </div>
        </div>
      </div>

      {/* EXPANDABLE: Planetary Positions */}
      <details className="rounded border border-slate-700/50 bg-slate-900/20">
        <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-slate-300 hover:text-slate-200 select-none">
          📊 View Planetary Positions
        </summary>
        <div className="border-t border-slate-700/50 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {snapshot.domains.map((domain) => (
              <div
                key={domain.label}
                className="rounded border border-slate-700 bg-slate-800/50 p-3"
              >
                <h5 className="mb-2 text-xs font-medium text-slate-400">{domain.label}</h5>
                {domain.planets.length > 0 ? (
                  <ul className="space-y-1 text-xs text-slate-400">
                    {domain.planets.map((planet) => (
                      <li key={planet.name} className="flex items-baseline justify-between gap-2">
                        <span className="text-purple-300">{planet.name}</span>
                        <span className="text-slate-500 font-mono text-[10px]">
                          {planet.sign} {planet.degree.toFixed(1)}°
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">—</p>
                )}
              </div>
            ))}
          </div>
          
          {isRelational && (() => {
          if (!showPersonBDomains) return null;

          return (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <h5 className="mb-3 text-xs font-medium text-indigo-400">Person B</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {personBDomains.map((domain) => (
                  <div
                    key={domain.label}
                    className="rounded border border-slate-700 bg-slate-800/50 p-3"
                  >
                    <h6 className="mb-2 text-xs font-medium text-slate-400">{domain.label}</h6>
                    {domain.planets.length > 0 ? (
                      <ul className="space-y-1 text-xs text-slate-400">
                        {domain.planets.map((planet) => (
                          <li
                            key={`${planet.name}-${planet.sign}`}
                            className="flex items-baseline justify-between gap-2"
                          >
                            <span className="text-indigo-300">{planet.name}</span>
                            <span className="text-slate-500 font-mono text-[10px]">
                              {planet.sign} {planet.degree.toFixed(1)}°
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500">—</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
          })()}
        </div>
      </details>
    </div>
  );
}
