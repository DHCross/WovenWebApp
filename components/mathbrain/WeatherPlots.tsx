'use client';

import React, { useState } from 'react';
import { TransformedWeatherData } from '@/lib/weatherDataTransforms';
import { AccelerometerScatter } from './AccelerometerScatter';
import { UnifiedSymbolicDashboard } from './UnifiedSymbolicDashboard';
import { transformToUnifiedDashboard } from '@/lib/unifiedDashboardTransforms';

type WeatherPlotsProps = {
  data: Array<{ date: string; weather: TransformedWeatherData }>;
  result?: any; // Full Math Brain result for Unified Dashboard
  showScatter?: boolean; // Toggle between scatter and line plots
  enableUnified?: boolean; // Enable Unified Dashboard option
};

export function WeatherPlots({ 
  data, 
  result, 
  showScatter = true,
  enableUnified = true 
}: WeatherPlotsProps) {
  const [viewMode, setViewMode] = useState<'scatter' | 'unified' | 'legacy'>('unified');
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
        No weather data available
      </div>
    );
  }

  // Prepare data for Unified Dashboard
  const unifiedData = result && enableUnified ? transformToUnifiedDashboard(result) : null;
  
  return (
    <div className="space-y-4">
      {/* View mode toggle */}
      {enableUnified && result && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <span className="text-xs font-medium text-slate-400">Visualization:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('unified')}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === 'unified'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Unified (MAP + FIELD)
            </button>
            <button
              onClick={() => setViewMode('scatter')}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === 'scatter'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Scatter (FIELD only)
            </button>
            <button
              onClick={() => setViewMode('legacy')}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === 'legacy'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Legacy (Line plots)
            </button>
          </div>
        </div>
      )}

      {/* Unified Dashboard: MAP + FIELD */}
      {viewMode === 'unified' && unifiedData && (
        <UnifiedSymbolicDashboard
          mapData={unifiedData.mapData}
          fieldData={unifiedData.fieldData}
          integration={unifiedData.integration}
          title="Unified Symbolic Dashboard — MAP + FIELD"
        />
      )}

      {/* Scatter Plot: FIELD only */}
      {viewMode === 'scatter' && (
        <>
          <AccelerometerScatter data={data} title="Astrological Field Map (FIELD Layer)" />
          
          {/* Interpretation guide */}
          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-xs text-slate-400">
            <span className="font-medium">Interpretation Guide:</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>• <span className="text-slate-300">High Mag / +Bias:</span> Constructive force, breakthroughs</div>
              <div>• <span className="text-slate-300">High Mag / −Bias:</span> Structural stress, conflict</div>
              <div>• <span className="text-slate-300">Low Mag / ±Bias:</span> Ambient noise, minor oscillations</div>
              <div>• <span className="text-slate-300">Clusters:</span> Symbolic weather fronts building/dissipating</div>
            </div>
          </div>
        </>
      )}

      {/* Legacy line plots */}
      {viewMode === 'legacy' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BiasPlot dates={data.map(d => d.date)} values={data.map(d => d.weather.axes.directional_bias.value)} />
          <MagnitudePlot dates={data.map(d => d.date)} values={data.map(d => d.weather.axes.magnitude.value)} />
        </div>
      )}
    </div>
  );
}

function BiasPlot({ dates, values }: { dates: string[]; values: number[] }) {
  const min = -5;
  const max = 5;
  const height = 120;

  // Normalize to 0-1 range for plotting
  const normalized = values.map(v => (v - min) / (max - min));
  const points = normalized.map((v, i) => {
    const x = (i / (dates.length - 1)) * 100;
    const y = height - v * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
      <div className="mb-2 text-sm font-medium text-slate-200">
        Directional Bias
        <span className="ml-2 text-xs text-slate-400">(−5 inward ↔ +5 outward)</span>
      </div>
      <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ height: '120px' }}>
        {/* Background halves */}
        <rect x="0" y="0" width="100" height={height / 2} fill="rgb(100, 116, 139)" fillOpacity="0.1" />
        <rect x="0" y={height / 2} width="100" height={height / 2} fill="rgb(59, 130, 246)" fillOpacity="0.1" />

        {/* Zero line (bold) */}
        <line x1="0" y1={height / 2} x2="100" y2={height / 2} stroke="rgb(148, 163, 184)" strokeWidth="1" strokeDasharray="2,2" />

        {/* Data line */}
        <polyline points={points} fill="none" stroke="rgb(139, 92, 246)" strokeWidth="2" />

        {/* Clamp markers */}
        {values.map((v, i) => {
          const x = (i / (dates.length - 1)) * 100;
          if (v === 5) return <text key={i} x={x} y="8" fontSize="8" fill="rgb(248, 113, 113)" textAnchor="middle">▲</text>;
          if (v === -5) return <text key={i} x={x} y={height - 2} fontSize="8" fill="rgb(248, 113, 113)" textAnchor="middle">▼</text>;
          return null;
        })}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-slate-500">
        <span>Inward</span>
        <span>0</span>
        <span>Outward</span>
      </div>
    </div>
  );
}

function MagnitudePlot({ dates, values }: { dates: string[]; values: number[] }) {
  const min = 0;
  const max = 5;
  const height = 120;

  const normalized = values.map(v => v / max);
  const points = normalized.map((v, i) => {
    const x = (i / (dates.length - 1)) * 100;
    const y = height - v * height;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} 100,${height}`;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
      <div className="mb-2 text-sm font-medium text-slate-200">
        Magnitude
        <span className="ml-2 text-xs text-slate-400">(0 latent → 5 peak)</span>
      </div>
      <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ height: '120px' }}>
        {/* Zone bands */}
        <rect x="0" y={height - (1 / 5) * height} width="100" height={(1 / 5) * height} fill="rgb(100, 116, 139)" fillOpacity="0.1" />
        <rect x="0" y={height - (3 / 5) * height} width="100" height={(2 / 5) * height} fill="rgb(59, 130, 246)" fillOpacity="0.1" />
        <rect x="0" y="0" width="100" height={(2 / 5) * height} fill="rgb(139, 92, 246)" fillOpacity="0.1" />

        {/* Reference lines */}
        <line x1="0" y1={height - (2 / 5) * height} x2="100" y2={height - (2 / 5) * height} stroke="rgb(148, 163, 184)" strokeWidth="0.5" strokeDasharray="1,1" />
        <line x1="0" y1={height - (4 / 5) * height} x2="100" y2={height - (4 / 5) * height} stroke="rgb(148, 163, 184)" strokeWidth="0.5" strokeDasharray="1,1" />

        {/* Area fill */}
        <polygon points={areaPoints} fill="rgb(34, 211, 238)" fillOpacity="0.3" />

        {/* Line */}
        <polyline points={points} fill="none" stroke="rgb(34, 211, 238)" strokeWidth="2" />

        {/* Peak markers */}
        {values.map((v, i) => {
          if (v >= 4) {
            const x = (i / (dates.length - 1)) * 100;
            const y = height - (v / max) * height;
            return <circle key={i} cx={x} cy={y} r="2" fill="rgb(251, 191, 36)" />;
          }
          return null;
        })}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-slate-500">
        <span>Latent</span>
        <span>Noticeable</span>
        <span>Peak</span>
      </div>
    </div>
  );
}

export default WeatherPlots;
