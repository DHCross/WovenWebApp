'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * Unified Symbolic Dashboard v5.0 - MAP + FIELD Hybrid Visualization
 * 
 * ⚠️ ARCHITECTURAL NOTE:
 * This visualization INTENTIONALLY DEVIATES from "True Accelerometer v5.0" spec.
 * 
 * DESIGN DECISION: Y-axis shows HOUSES (1-12), not Magnitude.
 * 
 * Why?
 * - Purpose: Show correlation between MAP (planetary geometry) and FIELD (pressure)
 * - MAP layer requires y-axis for houses to plot planetary positions
 * - FIELD layer overlays as bubbles (size = magnitude, color = directional bias)
 * - Enables diagnostic pattern matching: "Saturn in House 10 when magnitude spiked"
 * 
 * For a pure "True Accelerometer" view (y-axis = magnitude), use AccelerometerScatter.tsx instead.
 * 
 * Combines two data layers:
 * - MAP Layer: Planetary geometry (lines + points) - where planets move through houses
 * - FIELD Layer: Symbolic pressure (scatter bubbles) - how that geometry translates into energetic charge
 * 
 * Visualization Philosophy:
 * - Lines tell where the sky moves (structure)
 * - Bubbles tell how that motion feels (weather)
 * - When both spike together = diagnostic handshake between MAP and FIELD
 * 
 * User Question Answered: "WHY am I feeling this?" (MAP + FIELD correlation)
 * Compare to AccelerometerScatter which answers: "WHAT am I feeling?" (FIELD only)
 */

export type MapDataPoint = {
  date: string;
  planet: string;
  degree: string;
  house: number; // 1-12
  aspect?: string;
  house_label?: string;
};

export type FieldDataPoint = {
  date: string;
  subject?: string;
  magnitude: number; // 0-5 (×10 in storage)
  valence: number; // -5 to +5 (×10 in storage, renamed from directional_bias)
  shape?: string;
  color?: string;
  intensity_label?: string;
  note?: string;
};

export type IntegrationPoint = {
  date: string;
  planet: string;
  house: number;
  aspect?: string;
  magnitude: number;
  valence: number;
  source: string;
  orb_cap?: string;
  angle_drift?: boolean;
  note?: string;
};

type UnifiedDashboardProps = {
  mapData: MapDataPoint[];
  fieldData: FieldDataPoint[];
  integration?: IntegrationPoint[];
  title?: string;
};

export function UnifiedSymbolicDashboard({
  mapData = [],
  fieldData = [],
  integration = [],
  title = 'Unified Symbolic Dashboard',
}: UnifiedDashboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !canvasRef.current) return;
    if (mapData.length === 0 && fieldData.length === 0) return;

    import('chart.js').then((ChartJS) => {
      const { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } = ChartJS;
      
      Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Get unique dates from both datasets
      const allDates = Array.from(new Set([
        ...mapData.map(d => d.date),
        ...fieldData.map(d => d.date)
      ])).sort();

      // Group MAP data by planet
      const planetGroups: { [planet: string]: { x: number; y: number; date: string }[] } = {};
      mapData.forEach(point => {
        if (!planetGroups[point.planet]) {
          planetGroups[point.planet] = [];
        }
        const xIndex = allDates.indexOf(point.date);
        planetGroups[point.planet].push({
          x: xIndex,
          y: point.house,
          date: point.date,
        });
      });

      // Sort planet points by date to create continuous lines
      Object.keys(planetGroups).forEach(planet => {
        planetGroups[planet].sort((a, b) => a.x - b.x);
      });

      // Planet color mapping
      const planetColors: { [planet: string]: string } = {
        'Sun': 'rgb(251, 191, 36)', // yellow
        'Moon': 'rgb(203, 213, 225)', // silver
        'Mercury': 'rgb(139, 92, 246)', // purple
        'Venus': 'rgb(236, 72, 153)', // pink
        'Mars': 'rgb(239, 68, 68)', // red
        'Jupiter': 'rgb(249, 115, 22)', // orange
        'Saturn': 'rgb(100, 116, 139)', // gray
        'Uranus': 'rgb(56, 189, 248)', // cyan
        'Neptune': 'rgb(59, 130, 246)', // blue
        'Pluto': 'rgb(124, 58, 237)', // deep purple
        'Chiron': 'rgb(167, 139, 250)', // light purple
      };

      // Create MAP layer datasets (lines for each planet)
      const mapDatasets = Object.entries(planetGroups).map(([planet, points]) => ({
        label: `${planet} (MAP)`,
        data: points,
        borderColor: planetColors[planet] || 'rgb(148, 163, 184)',
        backgroundColor: planetColors[planet] || 'rgb(148, 163, 184)',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        showLine: true,
        tension: 0.1,
        type: 'line' as const,
      }));

      // FIELD layer: scatter bubbles
      const getColorFromValence = (valence: number): string => {
        const normalized = (valence + 5) / 10; // [-5, +5] → [0, 1]
        
        if (normalized < 0.5) {
          // Red to Gray (friction to neutral)
          const t = normalized * 2;
          const r = Math.round(220 + (148 - 220) * t);
          const g = Math.round(38 + (163 - 38) * t);
          const b = Math.round(38 + (184 - 38) * t);
          return `rgba(${r}, ${g}, ${b}, 0.7)`;
        } else {
          // Gray to Blue (neutral to ease)
          const t = (normalized - 0.5) * 2;
          const r = Math.round(148 - 148 * t);
          const g = Math.round(163 - 33 * t);
          const b = Math.round(184 + 62 * t);
          return `rgba(${r}, ${g}, ${b}, 0.7)`;
        }
      };

      // Map FIELD data to chart coordinates
      // ARCHITECTURAL DECISION: Y-axis is dedicated to houses (MAP layer)
      // FIELD bubbles use pseudo-house position (magnitude * 2) to approximate vertical placement
      // This is a compromise to fit both MAP and FIELD on one chart
      // TRUE ACCELEROMETER USERS: Use AccelerometerScatter.tsx for y-axis = magnitude
      const fieldPoints = fieldData.map(point => {
        const xIndex = allDates.indexOf(point.date);
        return {
          x: xIndex,
          y: point.magnitude * 2, // Pseudo-house position: scale magnitude (0-5) to fit house range (0-10)
          magnitude: point.magnitude,
          valence: point.valence,
          date: point.date,
          subject: point.subject,
          note: point.note,
        };
      });

      const fieldDataset = {
        label: 'Symbolic Pressure (FIELD)',
        data: fieldPoints,
        backgroundColor: fieldPoints.map(p => getColorFromValence(p.valence)),
        borderColor: fieldPoints.map(p => getColorFromValence(p.valence).replace('0.7', '1')),
        borderWidth: 2,
        pointRadius: fieldPoints.map(p => 5 + p.magnitude * 3), // Bubble size = magnitude
        pointHoverRadius: fieldPoints.map(p => 8 + p.magnitude * 3),
        showLine: false,
        type: 'scatter' as const,
      };

      // Combine datasets
      const datasets = [...mapDatasets, fieldDataset];

      chartInstanceRef.current = new Chart(ctx, {
        type: 'scatter',
        data: {
          labels: allDates,
          datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                color: 'rgb(203, 213, 225)',
                font: { size: 11 },
                filter: (item) => {
                  // Only show planet names and FIELD layer in legend
                  return item.text.includes('MAP') || item.text.includes('FIELD');
                },
              },
            },
            title: {
              display: true,
              text: title,
              color: 'rgb(226, 232, 240)',
              font: {
                size: 16,
                weight: 'bold',
              },
            },
            tooltip: {
              callbacks: {
                label: (context: any) => {
                  const dataPoint = context.raw;
                  if (context.dataset.label.includes('FIELD')) {
                    return [
                      `Magnitude: ${dataPoint.magnitude.toFixed(1)}`,
                      `Directional Bias: ${dataPoint.valence >= 0 ? '+' : ''}${dataPoint.valence.toFixed(1)}`,
                      ...(dataPoint.note ? [`Note: ${dataPoint.note}`] : []),
                    ];
                  } else {
                    return [
                      `Planet: ${context.dataset.label.replace(' (MAP)', '')}`,
                      `House: ${Math.round(dataPoint.y)}`,
                      `Date: ${dataPoint.date}`,
                    ];
                  }
                },
              },
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              titleColor: 'rgb(226, 232, 240)',
              bodyColor: 'rgb(203, 213, 225)',
              borderColor: 'rgb(100, 116, 139)',
              borderWidth: 1,
            },
          },
          scales: {
            x: {
              type: 'category',
              title: {
                display: true,
                text: 'Date',
                color: 'rgb(148, 163, 184)',
              },
              ticks: {
                color: 'rgb(100, 116, 139)',
                maxRotation: 45,
                minRotation: 45,
                autoSkip: true,
                maxTicksLimit: 15,
              },
              grid: {
                color: 'rgba(100, 116, 139, 0.1)',
              },
            },
            y: {
              min: 1,
              max: 12,
              reverse: true, // House 1 at top, 12 at bottom
              title: {
                display: true,
                text: 'House Number (Geometry)',
                color: 'rgb(148, 163, 184)',
              },
              ticks: {
                color: 'rgb(100, 116, 139)',
                stepSize: 1,
                callback: (value: any) => `H${value}`,
              },
              grid: {
                color: 'rgba(100, 116, 139, 0.2)',
              },
            },
          },
        },
      });
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [isClient, mapData, fieldData, title]);

  if (!isClient) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
        Loading dashboard...
      </div>
    );
  }

  if (mapData.length === 0 && fieldData.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
        No MAP or FIELD data available for visualization
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="text-xs text-slate-400">
            <span className="font-medium">Balance Meter v5.0</span>
            <span className="mx-2">•</span>
            <span>MAP: Planetary Geometry + FIELD: Symbolic Pressure</span>
          </div>
          
          {/* Color legend for FIELD layer */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <div className="font-medium">FIELD Layer:</div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'rgb(220, 38, 38)' }} />
              <span>Friction (−5)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'rgb(148, 163, 184)' }} />
              <span>Neutral (0)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'rgb(0, 130, 246)' }} />
              <span>Ease (+5)</span>
            </div>
          </div>
        </div>
        
        <div style={{ height: '500px', position: 'relative' }}>
          <canvas ref={canvasRef} />
        </div>
        
        <div className="mt-4 grid grid-cols-1 gap-3 text-xs text-slate-500 sm:grid-cols-2">
          <div>
            <span className="font-medium text-slate-400">MAP Layer (Lines):</span> Planetary movement through houses — the geometric structure
          </div>
          <div>
            <span className="font-medium text-slate-400">FIELD Layer (Bubbles):</span> Symbolic pressure readings — how geometry translates into energetic charge
          </div>
          <div className="sm:col-span-2">
            <span className="font-medium text-slate-400">Bubble Size:</span> Magnitude (intensity) • <span className="font-medium text-slate-400">Bubble Color:</span> Directional Bias (red = friction, blue = ease)
          </div>
        </div>
      </div>

      {/* Integration insights */}
      {integration && integration.length > 0 && (
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
          <h3 className="mb-3 text-sm font-medium text-slate-200">MAP ↔ FIELD Handshake</h3>
          <div className="space-y-2 text-xs">
            {integration.map((point, idx) => (
              <div key={idx} className="flex items-start gap-2 border-l-2 border-purple-500/50 pl-3">
                <div className="flex-1">
                  <div className="text-slate-300">
                    <span className="font-medium">{point.date}:</span> {point.planet} in H{point.house}
                    {point.aspect && <span className="text-purple-400"> ({point.aspect})</span>}
                  </div>
                  <div className="mt-1 text-slate-400">
                    Magnitude: {point.magnitude.toFixed(1)} • Bias: {point.valence >= 0 ? '+' : ''}{point.valence.toFixed(1)}
                  </div>
                  {point.note && <div className="mt-1 text-slate-500 italic">{point.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default UnifiedSymbolicDashboard;
