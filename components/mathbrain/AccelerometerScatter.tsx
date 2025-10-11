'use client';

import React, { useEffect, useRef, useState } from 'react';
import { TransformedWeatherData } from '@/lib/weatherDataTransforms';

type AccelerometerScatterProps = {
  data: Array<{ date: string; weather: TransformedWeatherData }>;
  title?: string;
};

/**
 * True Accelerometer v5.0: Scatter Plot Visualization
 * 
 * Philosophy: "The math must keep the poetry honest"
 * - Each dot is a measurable tremor
 * - Y-axis: Magnitude (0-5) - How loud is the field?
 * - Color: Directional Bias (-5 to +5) - Which way does energy lean?
 * - No smoothing, no derivatives, only raw measurements
 */
export function AccelerometerScatter({ data, title = 'Astrological Field Map' }: AccelerometerScatterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Create chart when data changes
  useEffect(() => {
    if (!isClient || !canvasRef.current || !data || data.length === 0) return;

    // Dynamically import Chart.js to avoid SSR issues
    import('chart.js').then((ChartJS) => {
      const { Chart, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend } = ChartJS;
      
      // Register components
      Chart.register(CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend);

      // Destroy existing chart
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      // Extract dates and values
      const dates = data.map(d => d.date);
      const points = data.map((d, index) => ({
        x: index,
        y: d.weather.axes.magnitude.value,
        valence: d.weather.axes.directional_bias.value,
        date: d.date,
      }));

      // Color mapping: diverging colormap (red → gray → blue)
      const getColorFromValence = (valence: number): string => {
        const normalized = (valence + 5) / 10; // [-5, +5] → [0, 1]
        
        if (normalized < 0.5) {
          // Red to Gray (contractive to neutral)
          const t = normalized * 2;
          const r = Math.round(220 + (148 - 220) * t);
          const g = Math.round(38 + (163 - 38) * t);
          const b = Math.round(38 + (184 - 38) * t);
          return `rgb(${r}, ${g}, ${b})`;
        } else {
          // Gray to Blue (neutral to expansive)
          const t = (normalized - 0.5) * 2;
          const r = Math.round(148 - 148 * t);
          const g = Math.round(163 - 33 * t);
          const b = Math.round(184 + 62 * t);
          return `rgb(${r}, ${g}, ${b})`;
        }
      };

      // Create chart
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      chartInstanceRef.current = new Chart(ctx, {
        type: 'scatter',
        data: {
          labels: dates,
          datasets: [
            {
              label: 'Field Intensity',
              data: points,
              backgroundColor: points.map(p => getColorFromValence(p.valence)),
              borderColor: points.map(p => {
                const bgColor = getColorFromValence(p.valence);
                return bgColor.replace('rgb', 'rgba').replace(')', ', 0.8)');
              }),
              borderWidth: 2,
              pointRadius: 8,
              pointHoverRadius: 10,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
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
                  const point = points[context.dataIndex];
                  return [
                    `Magnitude: ${point.y.toFixed(2)}`,
                    `Directional Bias: ${point.valence >= 0 ? '+' : ''}${point.valence.toFixed(2)}`,
                    `Date: ${point.date}`,
                  ];
                },
              },
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
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
                maxTicksLimit: 12,
              },
              grid: {
                color: 'rgba(100, 116, 139, 0.1)',
              },
            },
            y: {
              min: 0,
              max: 5,
              title: {
                display: true,
                text: 'Magnitude ⚡ (0 = latent → 5 = peak)',
                color: 'rgb(148, 163, 184)',
              },
              ticks: {
                color: 'rgb(100, 116, 139)',
                stepSize: 1,
              },
              grid: {
                color: 'rgba(100, 116, 139, 0.2)',
              },
            },
          },
        },
      });
    });

    // Cleanup on unmount
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [isClient, data, title]);

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
        No accelerometer data available
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-slate-400">
          <span className="font-medium">True Accelerometer v5.0</span>
          <span className="mx-2">•</span>
          <span>Raw geometry measurements</span>
        </div>
        
        {/* Color legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'rgb(220, 38, 38)' }} />
            <span>Contractive (−5)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'rgb(148, 163, 184)' }} />
            <span>Neutral (0)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'rgb(0, 130, 246)' }} />
            <span>Expansive (+5)</span>
          </div>
        </div>
      </div>
      
      <div style={{ height: '400px', position: 'relative' }}>
        <canvas ref={canvasRef} />
      </div>
      
      <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-2 sm:gap-4">
        <div>
          <span className="font-medium text-slate-400">Magnitude Range:</span> 0 (latent) → 5 (peak storm)
        </div>
        <div>
          <span className="font-medium text-slate-400">Bias Range:</span> −5 (inward/contractive) ↔ +5 (outward/expansive)
        </div>
      </div>
    </div>
  );
}

export default AccelerometerScatter;
