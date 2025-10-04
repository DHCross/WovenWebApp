'use client';

import { createSnapshotDisplay, type SnapshotDisplayData } from '../utils/snapshot';

interface SnapshotDisplayProps {
  result: any;
  location: { latitude: number; longitude: number };
  timestamp: Date;
}

export default function SnapshotDisplay({ result, location, timestamp }: SnapshotDisplayProps) {
  const snapshot = createSnapshotDisplay(result, location, timestamp);

  return (
    <div className="mt-6 rounded-lg border border-purple-700 bg-purple-900/20 p-4 backdrop-blur-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-purple-300 flex items-center gap-2">
            <span>🕐</span>
            <span>Snapshot: {snapshot.timestamp}</span>
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            📍 {snapshot.location.label}
          </p>
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

      {/* Woven Map Domains */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-purple-300">Woven Map Domains</h4>
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
