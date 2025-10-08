/* eslint-disable no-console */
'use client';

import { createSnapshotDisplay, type SnapshotDisplayData } from '../utils/snapshot';

interface SnapshotDisplayProps {
  result: any;
  location: { latitude: number; longitude: number };
  timestamp: Date;
}

export default function SnapshotDisplay({ result, location, timestamp }: SnapshotDisplayProps) {
  console.log('[SnapshotDisplay] Rendering with result:', result);
  
  const snapshot = createSnapshotDisplay(result, location, timestamp);

  // Check if this is a relational snapshot
  const hasPersonB = result?.person_b?.chart?.positions;
  const isRelational = hasPersonB && result?.person_b;

  // Extract Balance Meter v4 metrics from the result
  const balanceMeter = result?.person_a?.summary || result?.summary || result?.balance_meter || {};
  const magnitude = balanceMeter.magnitude ?? null;
  const directionalBias = balanceMeter.directional_bias?.value ?? null;
  const volatility = balanceMeter.volatility ?? null;

  // Extract chart assets for visualization
  const chartAssets = result?.person_a?.chart_assets || [];
  const natalChart = chartAssets.find((asset: any) => 
    asset.type === 'natal' || asset.chartType === 'natal'
  );

  // Extract provenance
  const houseSystem = result?.person_a?.house_system || result?.context?.house_system || 'Placidus';
  const zodiacType = result?.person_a?.zodiac_type || 'Tropical';
  const schemaVersion = '3.1'; // From your system
  
  console.log('[SnapshotDisplay] Balance Meter v4:', { magnitude, directionalBias, volatility });

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
      {natalChart?.url ? (
        <div className="mb-6 flex justify-center rounded border border-slate-700 bg-slate-900/50 p-4">
          <img 
            src={natalChart.url} 
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
                  {magnitude !== null ? magnitude.toFixed(1) : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-slate-400">
                  {magnitude >= 4 ? 'Strong field activation' : 
                   magnitude >= 2 ? 'Moderate activation' :
                   magnitude >= 1 ? 'Light activation' : 'Latent field'}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-slate-300">Directional Bias</td>
                <td className="px-3 py-2 text-right font-mono text-indigo-300">
                  {directionalBias !== null ? 
                    (directionalBias > 0 ? '+' : '') + directionalBias.toFixed(1) : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-slate-400">
                  {directionalBias >= 3 ? 'Strong expansion' :
                   directionalBias >= 1 ? 'Moderate expansion' :
                   directionalBias >= -1 ? 'Equilibrium' :
                   directionalBias >= -3 ? 'Moderate contraction' : 'Strong contraction'}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-slate-300">Coherence (Volatility)</td>
                <td className="px-3 py-2 text-right font-mono text-indigo-300">
                  {volatility !== null ? volatility.toFixed(1) : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-slate-400">
                  {volatility >= 4 ? 'Very high variability' :
                   volatility >= 2 ? 'Moderate stability' :
                   volatility >= 1 ? 'High stability' : 'Very stable pattern'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Symbolic Weather Summary */}
        {(magnitude !== null || directionalBias !== null) && (
          <div className="mt-3 rounded border border-slate-700 bg-slate-800/30 p-3">
            <p className="text-xs text-slate-400 mb-1">
              <span className="font-medium text-slate-300">Symbolic Weather:</span>
            </p>
            <p className="text-sm text-indigo-200">
              {directionalBias < -1 ? 'Contracting' : 
               directionalBias > 1 ? 'Expanding' : 'Balanced'}{' '}
              {magnitude >= 3 ? 'with strong activation' :
               magnitude >= 1 ? 'gently' : 'subtly'}; 
              {volatility < 2 ? ' coherence steady' : 
               volatility >= 4 ? ' high variability' : ' moderate shifts'}.
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
            const personBPositions = result.person_b?.chart?.positions || [];
            const personBDomains = [
              { label: 'Self (H1)', houseNumber: 1 },
              { label: 'Connection (H2)', houseNumber: 2 },
              { label: 'Growth (H3)', houseNumber: 3 },
              { label: 'Responsibility (H4)', houseNumber: 4 },
            ].map(domain => ({
              ...domain,
              planets: personBPositions
                .filter((p: any) => p.house === domain.houseNumber)
                .map((p: any) => ({
                  name: p.name,
                  sign: p.sign,
                  degree: p.degree,
                })),
            }));

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
                          {domain.planets.map((planet: any) => (
                            <li key={planet.name} className="flex items-baseline justify-between gap-2">
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
