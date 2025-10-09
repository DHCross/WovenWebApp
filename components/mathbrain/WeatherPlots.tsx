'use client';

import React from 'react';
import { TransformedWeatherData } from '@/lib/weatherDataTransforms';

type WeatherPlotsProps = {
  data: Array<{ date: string; weather: TransformedWeatherData }>;
};

export function WeatherPlots({ data }: WeatherPlotsProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
        No weather data available
      </div>
    );
  }

  const dates = data.map(d => d.date);
  const biases = data.map(d => d.weather.axes.directional_bias.value);
  const magnitudes = data.map(d => d.weather.axes.magnitude.value);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* 1. Directional Bias (-5 to +5) */}
      <BiasPlot dates={dates} values={biases} />

      {/* 2. Magnitude (0 to 5) */}
      <MagnitudePlot dates={dates} values={magnitudes} />
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
