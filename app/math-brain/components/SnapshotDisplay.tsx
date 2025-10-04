'use client';

import { createSnapshotDisplay, type SnapshotDisplayData } from '../utils/snapshot';

interface SnapshotDisplayProps {
  result: any;
  location: { latitude: number; longitude: number };
  timestamp: Date;
}

export default function SnapshotDisplay({ result, location, timestamp }: SnapshotDisplayProps) {
  const snapshot = createSnapshotDisplay(result, location, timestamp);

  // Check if this is a relational snapshot
  const hasPersonB = result?.person_b?.chart?.positions;
  const isRelational = hasPersonB && result?.person_b;

  return (
    <div className="mt-6 rounded-lg border border-purple-700 bg-purple-900/20 p-4 backdrop-blur-sm">
      <div className="mb-4 flex items-start justify-between">
        <div className="w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-purple-600 bg-purple-700/20 px-2 py-0.5 text-xs text-purple-300">
              <span>⭐</span>
              <span>{isRelational ? 'Relational Mirror Snapshot' : 'Solo Mirror Snapshot'}</span>
            </span>
          </div>
          <h3 className="text-lg font-semibold text-purple-300 flex items-center gap-2">
            <span>🕐</span>
            <span>Symbolic Moment: {snapshot.timestamp}</span>
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            📍 {snapshot.location.label}
          </p>
          {isRelational && (
            <p className="mt-1 text-xs text-purple-300">
              ℹ️ Both Person A and Person B relocated to current location
            </p>
          )}
        </div>
      </div>

      {/* Relocated Houses */}
      {snapshot.houses && (snapshot.houses.asc || snapshot.houses.mc) && (
        <div className="mb-4 rounded border border-slate-700 bg-slate-800/50 p-3">
          <h4 className="mb-2 text-sm font-medium text-slate-300">Relocated Houses</h4>
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
            {snapshot.houses.asc && (
              <div>
                <span className="text-slate-500">ASC:</span>{' '}
                <span className="text-purple-300">
                  {snapshot.houses.asc.sign} {snapshot.houses.asc.degree.toFixed(1)}°
                </span>
              </div>
            )}
            {snapshot.houses.mc && (
              <div>
                <span className="text-slate-500">MC:</span>{' '}
                <span className="text-purple-300">
                  {snapshot.houses.mc.sign} {snapshot.houses.mc.degree.toFixed(1)}°
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Woven Map Domains - Person A */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-purple-300">
          {isRelational ? 'Person A - Woven Map Domains' : 'Woven Map Domains'}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {snapshot.domains.map((domain) => (
            <div
              key={domain.label}
              className="rounded border border-slate-700 bg-slate-800/50 p-3"
            >
              <h5 className="mb-2 text-sm font-medium text-slate-300">{domain.label}</h5>
              {domain.planets.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-slate-400">
                  {domain.planets.map((planet) => (
                    <li key={planet.name} className="flex items-baseline justify-between gap-2">
                      <span className="text-purple-300">{planet.name}</span>
                      <span className="text-slate-500">
                        {planet.sign} {planet.degree.toFixed(1)}°
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">No planets</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Person B Woven Map Domains (if relational) */}
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
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-medium text-purple-300">Person B - Woven Map Domains</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {personBDomains.map((domain) => (
                <div
                  key={domain.label}
                  className="rounded border border-slate-700 bg-slate-800/50 p-3"
                >
                  <h5 className="mb-2 text-sm font-medium text-slate-300">{domain.label}</h5>
                  {domain.planets.length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-slate-400">
                      {domain.planets.map((planet: any) => (
                        <li key={planet.name} className="flex items-baseline justify-between gap-2">
                          <span className="text-indigo-300">{planet.name}</span>
                          <span className="text-slate-500">
                            {planet.sign} {planet.degree.toFixed(1)}°
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500">No planets</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Timestamp details */}
      <div className="mt-4 pt-3 border-t border-slate-700">
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer hover:text-slate-400">Technical Details</summary>
          <div className="mt-2 space-y-1 pl-4">
            <p>Local: {snapshot.localTime}</p>
            <p>UTC: {snapshot.utcTime}</p>
            <p>Coordinates: {snapshot.location.latitude.toFixed(6)}, {snapshot.location.longitude.toFixed(6)}</p>
          </div>
        </details>
      </div>
    </div>
  );
}
