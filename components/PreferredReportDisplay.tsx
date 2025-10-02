// Preferred Report Structure Display Component
// Displays Solo Mirrors → Relational Engines → Weather Overlay in a user-friendly format

import React from 'react';

interface SoloMirror {
  name: string;
  snapshot: string;
}

interface RelationalEngine {
  name: string;
  mechanism: string;
  tendency: string;
}

interface WeatherOverlay {
  timeframe: string;
  narrative: string;
}

interface PreferredReportData {
  soloMirrors?: Record<string, SoloMirror>;
  relationalEngines?: RelationalEngine[];
  weatherOverlay?: WeatherOverlay;
  meta?: any;
}

interface PreferredReportDisplayProps {
  data: PreferredReportData;
}

export function PreferredReportDisplay({ data }: PreferredReportDisplayProps) {
  if (!data) return null;

  const { soloMirrors, relationalEngines, weatherOverlay } = data;

  return (
    <div className="space-y-6">
      {/* Solo Mirrors Section */}
      {soloMirrors && Object.keys(soloMirrors).length > 0 && (
        <section className="rounded-lg border border-slate-700 bg-slate-900/40 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Individual Snapshots</h3>
          <div className="space-y-4">
            {Object.entries(soloMirrors).map(([name, mirror]) => (
              <div key={name} className="rounded-md border border-slate-700 bg-slate-800/60 p-4">
                <h4 className="text-md font-medium text-indigo-200 mb-2">{name}</h4>
                <p className="text-sm leading-relaxed text-slate-100">
                  {mirror.snapshot}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Relational Engines Section */}
      {relationalEngines && relationalEngines.length > 0 && (
        <section className="rounded-lg border border-slate-700 bg-slate-900/40 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Relational Engines</h3>
          <div className="space-y-4">
            {relationalEngines.map((engine, index) => (
              <div key={index} className="rounded-md border border-slate-700 bg-slate-800/60 p-4">
                <h4 className="text-md font-medium text-emerald-200 mb-2">{engine.name}</h4>
                <p className="text-sm text-slate-200 mb-2">{engine.mechanism}</p>
                <p className="text-xs text-slate-400 italic">{engine.tendency}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Weather Overlay Section */}
      {weatherOverlay && (
        <section className="rounded-lg border border-slate-700 bg-slate-900/40 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Current Weather</h3>
          <div className="rounded-md border border-slate-700 bg-slate-800/60 p-4">
            <div className="prose prose-slate prose-sm max-w-none text-slate-100">
              {weatherOverlay.narrative.split('\n\n').map((paragraph, index) => (
                <p key={index} className="text-sm leading-relaxed text-slate-100 mb-3 last:mb-0">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer Note */}
      <div className="rounded-md border border-amber-700 bg-amber-900/20 p-4">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 text-amber-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-amber-200">Conversational Format</h4>
            <p className="mt-1 text-xs text-amber-100">
              This format presents your astrological patterns as tendencies and probabilities rather than fixed predictions. 
              Use these insights as conversation starters about energy patterns you might notice in daily life.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PreferredReportDisplay;