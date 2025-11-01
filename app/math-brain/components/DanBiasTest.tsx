'use client';

import { useEffect, useState } from 'react';

// --- TYPE DEFINITIONS ---

interface BiasDataPoint {
  date: string;
  magnitude: number | null;
  directional_bias: number | null;
  volatility: number | null;
  aspect_count: number;
}

// --- HELPER FUNCTIONS ---

/**
 * Format axis value for frontstage display (field-scale -5 to +5)
 * Detects if value is normalized [-1,+1] and scales accordingly
 */
function fmtAxis(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  // If |value| <= 1.2, assume normalized; scale to [-5,+5]
  // Otherwise, assume already field-scaled
  return Math.abs(value) <= 1.2 ? Math.round(value * 5) : Math.round(value);
}

/**
 * Extracts and cleans the daily bias data from the API response.
 * Applies field-scale transformation: normalized [-1,+1] → frontstage [-5,+5]
 */
function extractBiasScatterData(payload: any): BiasDataPoint[] {
  const dailyReadings = payload?.person_a?.chart?.transitsByDate?.daily_readings;
  if (!dailyReadings || !Array.isArray(dailyReadings)) {
    return [];
  }

  return dailyReadings
    .filter((day: any) => day.date && (day.seismograph?.magnitude?.value !== undefined || day.seismograph?.directional_bias?.value !== undefined))
    .map((day: any) => {
      const mag = day.seismograph?.magnitude;
      const bias = day.seismograph?.directional_bias;
      const vol = day.seismograph?.volatility;
      
      return {
        date: day.date,
        magnitude: mag?.value_calibrated ?? mag?.value ?? null,
        directional_bias: fmtAxis(bias?.value_calibrated ?? bias?.value),
        volatility: vol?.value_calibrated ?? vol?.value ?? null,
        aspect_count: day.aspects?.total_aspect_count ?? 0,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Generates a simple SVG scatter plot for the bias data
 */
function generateScatterPlotSVG(data: BiasDataPoint[]): string {
  if (data.length === 0) {
    return '<svg width="100" height="50" xmlns="http://www.w3.org/2000/svg"><text x="10" y="20" font-size="12" fill="#666">No data available</text></svg>';
  }

  const padding = 60;
  const width = 800;
  const height = 500;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Y-axis scaling for Directional Bias [-5, 5]
  const minBias = -5;
  const maxBias = 5;
  const biasRange = maxBias - minBias;
  const yScale = (bias: number) => {
    const normalized = (bias - minBias) / biasRange;
    return padding + chartHeight - normalized * chartHeight;
  };

  // X-axis scaling for dates (simple index)
  const xScale = (index: number) => {
    if (data.length === 1) return padding + chartWidth / 2; // Center if only one point
    return padding + (index / (data.length - 1)) * chartWidth;
  };

  // Build SVG string
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="border: 1px solid #e2e8f0; background: #fdfdfd; border-radius: 8px;">`;

  // --- Axes and Gridlines ---
  // Y-Axis (Bias)
  svg += `<line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#a0aec0" stroke-width="1.5" />`;
  // X-Axis (Date)
  svg += `<line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#a0aec0" stroke-width="1.5" />`;

  // Y-Axis Labels & Grid (-5, 0, +5)
  const yLabels = [-5, -2.5, 0, 2.5, 5];
  yLabels.forEach((label) => {
    const y = yScale(label);
    // Grid line
    svg += `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="${label === 0 ? '#4a5568' : '#e2e8f0'}" stroke-dasharray="${label === 0 ? '2 2' : '4 4'}" />`;
    // Label
    svg += `<text x="${padding - 40}" y="${y + 4}" font-size="12" fill="#4a5568" text-anchor="end">${label > 0 ? '+' : ''}${label}</text>`;
  });

  // X-Axis Labels (Dates)
  data.forEach((d, i) => {
    const x = xScale(i);
    svg += `<text x="${x}" y="${height - padding + 25}" font-size="12" fill="#4a5568" text-anchor="middle">${d.date.replace('2025-', '')}</text>`;
  });

  // --- Data Plot ---
  let pathData = '';
  data.forEach((d, i) => {
    if (d.directional_bias !== null) {
      const x = xScale(i);
      const y = yScale(d.directional_bias);
      pathData += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
    }
  });

  // Draw connecting line
  if (pathData) {
    svg += `<path d="${pathData}" stroke="#8b5cf6" stroke-width="2" fill="none" opacity="0.6" />`;
  }

  // Draw points
  data.forEach((d, i) => {
    if (d.directional_bias !== null) {
      const x = xScale(i);
      const y = yScale(d.directional_bias);
      const color = d.directional_bias > 0 ? '#2563eb' : '#dc2626'; // Blue for Outward, Red for Inward
      svg += `<circle cx="${x}" cy="${y}" r="5" fill="${color}" stroke="white" stroke-width="2" opacity="0.9">`;
      // Tooltip
      svg += `<title>${d.date}
Bias: ${d.directional_bias > 0 ? '+' : ''}${d.directional_bias.toFixed(2)}
Magnitude: ${d.magnitude?.toFixed(2) ?? 'N/A'}
Volatility: ${d.volatility?.toFixed(2) ?? 'N/A'}
Aspects: ${d.aspect_count}</title>`;
      svg += `</circle>`;
    }
  });

  // --- Titles and Labels ---
  svg += `<text x="15" y="${height / 2}" font-size="13" fill="#1e293b" text-anchor="middle" transform="rotate(-90 15 ${height / 2})">Directional Bias (−5 Inward to +5 Outward)</text>`;
  svg += `<text x="${width / 2}" y="${height - 15}" font-size="13" fill="#1e293b" text-anchor="middle">Date</text>`;
  svg += `<text x="${width / 2}" y="30" font-size="16" font-weight="600" fill="#111827" text-anchor="middle">Dan's Daily Directional Bias (Oct 31 – Nov 1, 2025)</text>`;
  svg += `<text x="${width / 2}" y="50" font-size="12" fill="#4a5568" text-anchor="middle">Relocated to Panama City, FL (30°10'N, 85°40'W)</text>`;

  svg += '</svg>';
  return svg;
}

// --- MAIN COMPONENT ---

export function DanBiasTest() {
  const [data, setData] = useState<any>(null);
  const [biasData, setBiasData] = useState<BiasDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runTest = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/astrology-mathbrain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            person_a: {
              name: 'Dan',
              birth_date: '1973-07-24',
              birth_time: '14:30',
              timezone: 'US/Eastern',
              latitude: 40.0196,   // Bryn Mawr, PA
              longitude: -75.3167,
              city: 'Bryn Mawr',
              nation: 'USA',
            },
            report_type: 'balance',
            transit_start_date: '2025-10-31',
            transit_end_date: '2025-11-01',
            house_system: 'placidus',
            // --- RELOCATION DATA ---
            relocation: {
              latitude: 30.1667,  // Panama City, FL: 30°10'N
              longitude: -85.6667, // 85°40'W
              city: 'Panama City',
              state: 'FL',
              timezone: 'US/Central', // Correct timezone for Panama City, FL
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API error: ${response.status} ${response.statusText}. Response: ${errText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'API returned unsuccessful response');
        }

        setData(result);
        const unifiedOutput = result.unified_output || result;
        const extracted = extractBiasScatterData(unifiedOutput);
        setBiasData(extracted);

        if (extracted.length === 0) {
          setError('No daily readings returned from API');
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Test failed:', err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    runTest();
  }, []);

  // --- RENDER LOGIC ---

  if (loading) {
    return (
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
          <span className="text-slate-700 font-medium">Running test for Dan (Relocated to Panama City, FL)...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-300 rounded-lg">
        <h3 className="font-semibold text-red-900 mb-2 text-lg">Test Failed</h3>
        <p className="text-red-800 font-mono text-sm break-words">{error}</p>
      </div>
    );
  }

  if (biasData.length === 0) {
    return (
      <div className="p-6 bg-amber-50 border border-amber-300 rounded-lg">
        <p className="text-amber-900 font-medium">No daily readings were returned for this period.</p>
      </div>
    );
  }

  const summary = data?.unified_output?.person_a?.chart?.transitsByDate?.summary;
  const provenance = data?.provenance;
  const svgChart = generateScatterPlotSVG(biasData);

  return (
    <div className="space-y-6 p-4 md:p-6 bg-slate-50">
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Dan's Directional Bias Analysis</h2>
        <p className="text-slate-600">
          <strong>Birth:</strong> July 24, 1973, 2:30 PM ET, Bryn Mawr, PA
        </p>
        <p className="text-slate-600 font-medium">
          <strong>Relocation:</strong> Panama City, FL (30°10'N, 85°40'W) | Central Time
        </p>
        <p className="text-slate-600">
          <strong>Transit Window:</strong> October 31 – November 1, 2025
        </p>
      </div>

      {/* Daily Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-slate-100 px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900 text-lg">Daily Readings (Frontstage 0-5 Scale)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Magnitude</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Directional Bias</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Volatility</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Aspects</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {biasData.map((day) => (
                <tr key={day.date} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-900">{day.date}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-slate-900">
                      {day.magnitude?.toFixed(2) ?? '—'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-center font-bold ${day.directional_bias !== null && day.directional_bias > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {day.directional_bias !== null
                      ? `${day.directional_bias > 0 ? '+' : ''}${day.directional_bias}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-slate-900">
                      {day.volatility?.toFixed(2) ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">{day.aspect_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scatter Plot */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 overflow-x-auto">
        <div dangerouslySetInnerHTML={{ __html: svgChart }} />
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 text-lg mb-4">Overall Summary (Frontstage 0-5 Scale)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-sm text-slate-600 mb-1">Avg. Magnitude</div>
              <div className="text-2xl font-bold text-slate-900">
                {summary.magnitude?.value_calibrated?.toFixed(2) ?? 'N/A'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {summary.magnitude?.label ?? '...'}
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-sm text-slate-600 mb-1">Avg. Directional Bias</div>
              <div className={`text-2xl font-bold ${(summary.directional_bias?.value_calibrated ?? summary.directional_bias?.value ?? 0) > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {(() => {
                  const rawBias = summary.directional_bias?.value_calibrated ?? summary.directional_bias?.value ?? 0;
                  const biasScaled = fmtAxis(rawBias) ?? 0;
                  return `${biasScaled > 0 ? '+' : ''}${biasScaled}`;
                })()}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {summary.directional_bias?.label ?? '...'}
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-sm text-slate-600 mb-1">Avg. Volatility</div>
              <div className="text-2xl font-bold text-slate-900">
                {summary.volatility?.value_calibrated?.toFixed(2) ?? 'N/A'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {summary.volatility?.label ?? '...'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Provenance */}
      {provenance && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 text-lg mb-3">Provenance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm font-mono text-slate-700">
            <div className="text-slate-600">Math Brain Ver:</div>
            <div>{provenance.math_brain_version ?? 'N/A'}</div>
            <div className="text-slate-600">House System:</div>
            <div>{provenance.house_system ?? 'N/A'}</div>
            <div className="text-slate-600">Orbs Profile:</div>
            <div>{provenance.orbs_profile ?? 'N/A'}</div>
            <div className="text-slate-600">Relocated:</div>
            <div>{provenance.relocated ? 'Yes' : 'No'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
