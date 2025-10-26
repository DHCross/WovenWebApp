'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

// Register Chart.js components
if (typeof window !== 'undefined') {
  Chart.register(...registerables, annotationPlugin);
}

/**
 * Relocation overlay metadata (author-authored, not computed)
 */
export interface RelocationOverlay {
  user_place: string;
  advisory: string;
  confidence: 'author_note' | 'heuristic' | 'computed';
  notes: string[];
}

/**
 * BM-v3 Data Point Schema
 */
export interface BalanceMeterDataPoint {
  date: string;
  magnitude_0to5: number;
  bias_signed_minus5to5: number;
  coherence_0to5?: number;
  schema_version?: string;
  orbs_profile?: string;
  house_frame?: string;
  relocation_supported?: boolean;
  relocation_overlay?: RelocationOverlay;
  provenance?: ProvenanceData;
}

/**
 * Provenance metadata for auditability
 */
export interface ProvenanceData {
  house_system?: string;
  relocation_mode?: string;
  orbs_profile?: string;
  math_brain_version?: string;
  tz?: string;
  bias_method?: string;
  mag_method?: string;
}

export interface SymbolicSeismographProps {
  /**
   * Pre-fetched data points (if available)
   */
  data?: BalanceMeterDataPoint[];

  /**
   * Or provide API endpoint details to fetch
   */
  apiEndpoint?: string;
  startDate?: string;
  endDate?: string;
  step?: 'daily' | 'weekly';

  /**
   * Provenance metadata
   */
  provenance?: ProvenanceData;

  /**
   * Optional className for container
   */
  className?: string;

  /**
   * Show provenance card
   */
  showProvenance?: boolean;
}

/**
 * Symbolic Seismograph Component
 *
 * Renders dual-panel time-series charts for Balance Meter v3:
 * - Top panel: Directional Bias (-5 to +5) with zero-line
 * - Bottom panel: Magnitude (0 to 5)
 *
 * Optional: Coherence and SFD can be shown as badges or overlays
 */
export default function SymbolicSeismograph({
  data: initialData,
  apiEndpoint,
  startDate,
  endDate,
  step = 'daily',
  provenance,
  className = '',
  showProvenance = true,
}: SymbolicSeismographProps) {
  const biasChartRef = useRef<HTMLCanvasElement>(null);
  const magChartRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<BalanceMeterDataPoint[]>(initialData || []);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [biasChart, setBiasChart] = useState<Chart | null>(null);
  const [magChart, setMagChart] = useState<Chart | null>(null);

  // Fetch data if not provided
  useEffect(() => {
    if (initialData || !apiEndpoint) return;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        if (!apiEndpoint) {
          throw new Error('API endpoint is required');
        }
        const url = new URL(apiEndpoint, window.location.origin);
        if (startDate) url.searchParams.set('start', startDate);
        if (endDate) url.searchParams.set('end', endDate);
        if (step) url.searchParams.set('step', step);

        const res = await fetch(url.toString());
        if (!res.ok) {
          throw new Error(`API error: ${res.status} ${res.statusText}`);
        }

        const json = await res.json();
        setData(json.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [apiEndpoint, startDate, endDate, step, initialData]);

  // Render charts when data changes
  useEffect(() => {
    if (!data || data.length === 0 || !biasChartRef.current || !magChartRef.current) return;

    const labels = data.map(d => d.date);
    const biasData = data.map(d => d.bias_signed_minus5to5);
    const magData = data.map(d => d.magnitude_0to5);

    // Destroy existing charts
    if (biasChart) biasChart.destroy();
    if (magChart) magChart.destroy();

    // Bias Chart (Directional Bias: -5 to +5)
    const biasConfig: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Directional Bias (−5…+5)',
            data: biasData,
            borderColor: 'rgba(99, 102, 241, 1)', // indigo
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.25,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: -5,
            max: 5,
            ticks: {
              stepSize: 1,
              color: '#94a3b8', // slate-400
            },
            grid: {
              color: '#334155', // slate-700
            },
          },
          x: {
            ticks: {
              autoSkip: true,
              maxRotation: 45,
              minRotation: 0,
              color: '#94a3b8',
            },
            grid: {
              color: '#334155',
            },
          },
        },
        plugins: {
          legend: {
            labels: {
              color: '#e2e8f0', // slate-200
            },
          },
          annotation: {
            annotations: {
              zeroLine: {
                type: 'line',
                yMin: 0,
                yMax: 0,
                borderColor: 'rgba(248, 113, 113, 0.6)', // red-400 with opacity
                borderWidth: 1,
                borderDash: [5, 5],
                label: {
                  display: false,
                },
              },
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed.y;
                let motion = 'neutral balance';
                if (val > 0) motion = 'expansion (outward)';
                else if (val < 0) motion = 'contraction (inward)';
                return `Bias: ${val.toFixed(2)} (${motion})`;
              },
            },
          },
        },
      },
    };

    // Magnitude Chart (0 to 5)
    const magConfig: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Magnitude (0–5)',
            data: magData,
            borderColor: 'rgba(34, 197, 94, 1)', // green-500
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.25,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 5,
            ticks: {
              stepSize: 1,
              color: '#94a3b8',
            },
            grid: {
              color: '#334155',
            },
          },
          x: {
            ticks: {
              autoSkip: true,
              maxRotation: 45,
              minRotation: 0,
              color: '#94a3b8',
            },
            grid: {
              color: '#334155',
            },
          },
        },
        plugins: {
          legend: {
            labels: {
              color: '#e2e8f0',
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed.y;
                let intensity = 'latent';
                if (val >= 4) intensity = 'peak storm';
                else if (val >= 2) intensity = 'noticeable';
                else if (val >= 1) intensity = 'background';
                return `Magnitude: ${val.toFixed(2)} (${intensity})`;
              },
            },
          },
        },
      },
    };

    const newBiasChart = new Chart(biasChartRef.current, biasConfig);
    const newMagChart = new Chart(magChartRef.current, magConfig);

    setBiasChart(newBiasChart);
    setMagChart(newMagChart);

    return () => {
      newBiasChart.destroy();
      newMagChart.destroy();
    };
  }, [data]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-slate-400">Loading symbolic weather data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-red-700 bg-red-900/20 p-4 ${className}`}>
        <p className="text-red-400">Error loading data: {error}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`rounded-lg border border-slate-700 bg-slate-800/40 p-4 ${className}`}>
        <p className="text-slate-400">No symbolic weather data available</p>
      </div>
    );
  }

  // Extract house frame and relocation info from first data point
  const firstPoint = data[0];
  const houseFrame = firstPoint?.house_frame || 'natal';
  const relocationSupported = firstPoint?.relocation_supported ?? false;
  const relocationOverlay = firstPoint?.relocation_overlay;
  const provenanceData = firstPoint?.provenance || provenance;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* House Frame Warning Banner */}
      {houseFrame !== 'relocated' && (
        <div className="rounded-lg border border-amber-600 bg-amber-900/20 p-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-amber-400">⚠️</span>
            <div className="flex-1">
              <strong className="text-amber-200">House frame: Natal only.</strong>
              <p className="mt-1 text-amber-300/90">
                Relocation not applied by the API. Houses are derived from natal frame only.
                {relocationOverlay?.user_place && (
                  <> Local advisory for <em className="text-amber-200">{relocationOverlay.user_place}</em> is shown below.</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Relocation Overlay Advisory */}
      {relocationOverlay && (
        <div className="rounded-lg border border-slate-600 bg-slate-800/60 p-3 text-sm">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Relocation Advisory ({relocationOverlay.confidence})
          </div>
          <p className="text-slate-300">{relocationOverlay.advisory}</p>
          {relocationOverlay.notes && relocationOverlay.notes.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-slate-400">
              {relocationOverlay.notes.map((note, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-slate-600">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Provenance Card */}
      {showProvenance && provenanceData && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">Provenance</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 md:grid-cols-3">
            {provenanceData.house_system && (
              <div>
                <span className="text-slate-500">House System:</span> {provenanceData.house_system}
              </div>
            )}
            {provenanceData.orbs_profile && (
              <div>
                <span className="text-slate-500">Orbs:</span> {provenanceData.orbs_profile}
              </div>
            )}
            {provenanceData.relocation_mode && (
              <div>
                <span className="text-slate-500">Relocation:</span> {provenanceData.relocation_mode}
              </div>
            )}
            {provenanceData.math_brain_version && (
              <div>
                <span className="text-slate-500">Version:</span> {provenanceData.math_brain_version}
              </div>
            )}
            {provenanceData.tz && (
              <div>
                <span className="text-slate-500">Timezone:</span> {provenanceData.tz}
              </div>
            )}
            {provenanceData.bias_method && (
              <div>
                <span className="text-slate-500">Bias Method:</span> {provenanceData.bias_method}
              </div>
            )}
            {provenanceData.mag_method && (
              <div>
                <span className="text-slate-500">Mag Method:</span> {provenanceData.mag_method}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Directional Bias Chart */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-200">
          Directional Bias (Contraction ← → Expansion)
        </h3>
        <div className="relative h-64">
          <canvas ref={biasChartRef} />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          −5 = maximum contraction (inward) | 0 = neutral | +5 = maximum expansion (outward)
        </p>
      </div>

      {/* Magnitude Chart */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-200">
          Magnitude (Field Intensity)
        </h3>
        <div className="relative h-64">
          <canvas ref={magChartRef} />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          0 = latent | 1-2 = background | 2-3 = noticeable | 4+ = peak storm
        </p>
      </div>

      {/* Data Point Count */}
      <div className="text-center text-xs text-slate-500">
        {data.length} data point{data.length !== 1 ? 's' : ''} • Schema: BM-v5.0
      </div>
    </div>
  );
}
