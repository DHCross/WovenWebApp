'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { TransformedWeatherData } from '@/lib/weatherDataTransforms';
import { AccelerometerScatter } from './AccelerometerScatter';
import { UnifiedSymbolicDashboard } from './UnifiedSymbolicDashboard';
import { transformToUnifiedDashboard } from '@/lib/unifiedDashboardTransforms';

type WeatherPlotsProps = {
  data: Array<{ date: string; weather: TransformedWeatherData }>;
  result?: any; // Full Math Brain result for Unified Dashboard
  showScatter?: boolean; // Retained for backwards compatibility (defaults to true)
  enableUnified?: boolean; // Enable Unified Dashboard option
};

export function WeatherPlots({
  data,
  result,
  showScatter = true,
  enableUnified = true,
}: WeatherPlotsProps) {
  const canShowUnified = Boolean(result && enableUnified);
  const shouldShowScatter = showScatter !== false;

  // Hooks must be called unconditionally at the top of the component
  const [viewMode, setViewMode] = useState<'unified' | 'scatter'>(
    canShowUnified ? 'unified' : 'scatter',
  );

  useEffect(() => {
    if (!canShowUnified) {
      setViewMode('scatter');
    }
  }, [canShowUnified]);

  const unifiedData = useMemo(() => {
    if (!canShowUnified) return null;
    try {
      // Detect synastry mode: both Person A and Person B present with synastry aspects
      const isSynastry = Boolean(
        result?.person_b &&
        (result?.synastry_aspects || result?.relationship)
      );

      return transformToUnifiedDashboard(result, { showPersonB: isSynastry });
    } catch {
      return null;
    }
  }, [canShowUnified, result]);

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
        No symbolic weather data available
      </div>
    );
  }

  if (!canShowUnified && !shouldShowScatter) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
        Visualizations disabled. Enable either Unified or Scatter view to display symbolic weather data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canShowUnified && shouldShowScatter && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <span className="text-xs font-medium text-slate-400">Visualization:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('unified')}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${viewMode === 'unified'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
            >
              Unified (MAP + FIELD)
            </button>
            <button
              onClick={() => setViewMode('scatter')}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${viewMode === 'scatter'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
            >
              Scatter (FIELD only)
            </button>
          </div>
        </div>
      )}

      {/* Unified Dashboard */}
      {viewMode === 'unified' && unifiedData && (
        <UnifiedSymbolicDashboard
          mapData={unifiedData.mapData}
          fieldData={unifiedData.fieldData}
          integration={unifiedData.integration}
          title="Poetic Brain Reading — MAP + Symbolic Weather"
        />
      )}

      {/* Scatter Plot */}
      {shouldShowScatter && (viewMode === 'scatter' || !canShowUnified) && (
        <>
          <AccelerometerScatter data={data} title="Symbolic Weather — FIELD Layer" />
          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-xs text-slate-400">
            <span className="font-medium">Interpretation Guide:</span>
            <span className="ml-1 text-slate-500">These FIELD points are the Symbolic Weather that feeds your Poetic Brain Reading.</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                • <span className="text-slate-300">High Mag / +Bias:</span> Constructive force, breakthroughs
              </div>
              <div>
                • <span className="text-slate-300">High Mag / −Bias:</span> Structural stress, conflict
              </div>
              <div>
                • <span className="text-slate-300">Low Mag / ±Bias:</span> Ambient noise, minor oscillations
              </div>
              <div>
                • <span className="text-slate-300">Clusters:</span> Symbolic weather patterns building/dissipating
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default WeatherPlots;
