/**
 * SEISMOGRAPH SVG GENERATOR
 * Generates vector-based seismograph strips for PDF export
 * Per Raven Calder Archival Mode specification
 */

export interface SeismographDataPoint {
  date: string;
  magnitude: number;
  directional_bias: number;
  coherence?: number;
}

export interface SeismographSVGOptions {
  width: number;
  height: number;
  data: SeismographDataPoint[];
  showLabels?: boolean;
  colorMode?: 'archival' | 'screen';
}

/**
 * Generate SVG markup for seismograph strip
 * Returns clean SVG string ready for embedding in PDF
 */
export function generateSeismographSVG(options: SeismographSVGOptions): string {
  const {
    width = 540, // 7.5in * 72 DPI
    height = 60,
    data,
    showLabels = true,
    colorMode = 'archival'
  } = options;

  if (!data || data.length === 0) {
    return generateEmptySeismograph(width, height);
  }

  const padding = { top: 10, right: 10, bottom: 20, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const xScale = chartWidth / Math.max(1, data.length - 1);
  const magnitudeScale = chartHeight / 5; // 0-5 scale

  // Generate magnitude line path
  const magnitudePath = data
    .map((point, i) => {
      const x = padding.left + i * xScale;
      const y = padding.top + chartHeight - point.magnitude * magnitudeScale;
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

  // Generate bias fill areas
  const biasFills = generateBiasFills(data, xScale, chartHeight, padding, colorMode);

  // Generate markers for peak days
  const markers = generatePeakMarkers(data, xScale, chartHeight, padding);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <!-- Background -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="${colorMode === 'archival' ? '#FFFFFF' : '#0f172a'}" />
  
  <!-- Bias gradient fills -->
  ${biasFills}
  
  <!-- Baseline -->
  <line 
    x1="${padding.left}" 
    y1="${padding.top + chartHeight}" 
    x2="${padding.left + chartWidth}" 
    y2="${padding.top + chartHeight}" 
    stroke="${colorMode === 'archival' ? '#000000' : '#64748b'}" 
    stroke-width="1" 
  />
  
  <!-- Magnitude line -->
  <path 
    d="${magnitudePath}" 
    fill="none" 
    stroke="${colorMode === 'archival' ? '#000000' : '#3b82f6'}" 
    stroke-width="2" 
  />
  
  <!-- Peak markers -->
  ${markers}
  
  ${showLabels ? generateLabels(data, width, height, colorMode) : ''}
</svg>
  `.trim();
}

function generateBiasFills(
  data: SeismographDataPoint[],
  xScale: number,
  chartHeight: number,
  padding: { top: number; left: number },
  colorMode: 'archival' | 'screen'
): string {
  const fills: string[] = [];
  
  for (let i = 0; i < data.length - 1; i++) {
    const x1 = padding.left + i * xScale;
    const x2 = padding.left + (i + 1) * xScale;
    const bias = data[i].directional_bias;
    
    // Determine fill color based on bias
    let fillColor: string;
    if (colorMode === 'archival') {
      if (bias > 0) {
        fillColor = `rgba(255, 180, 0, ${Math.min(0.3, bias / 10)})`; // Amber (expansion)
      } else if (bias < 0) {
        fillColor = `rgba(0, 50, 100, ${Math.min(0.3, Math.abs(bias) / 10)})`; // Blue (compression)
      } else {
        fillColor = 'rgba(128, 128, 128, 0.1)'; // Neutral
      }
    } else {
      fillColor = bias > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
    }
    
    fills.push(`
      <rect 
        x="${x1}" 
        y="${padding.top}" 
        width="${x2 - x1}" 
        height="${chartHeight}" 
        fill="${fillColor}" 
      />
    `);
  }
  
  return fills.join('\n');
}

function generatePeakMarkers(
  data: SeismographDataPoint[],
  xScale: number,
  chartHeight: number,
  padding: { top: number; left: number }
): string {
  const markers: string[] = [];
  const magnitudeScale = chartHeight / 5;
  
  data.forEach((point, i) => {
    if (point.magnitude >= 4) {
      const x = padding.left + i * xScale;
      const y = padding.top + chartHeight - point.magnitude * magnitudeScale;
      
      // Diamond marker
      markers.push(`
        <polygon 
          points="${x},${y - 4} ${x + 3},${y} ${x},${y + 4} ${x - 3},${y}" 
          fill="#000000" 
        />
      `);
    }
  });
  
  return markers.join('\n');
}

function generateLabels(
  data: SeismographDataPoint[],
  width: number,
  height: number,
  colorMode: 'archival' | 'screen'
): string {
  const textColor = colorMode === 'archival' ? '#000000' : '#cbd5e1';
  const firstDate = data[0]?.date || '';
  const lastDate = data[data.length - 1]?.date || '';
  
  return `
    <text 
      x="10" 
      y="${height - 5}" 
      font-family="monospace" 
      font-size="10" 
      fill="${textColor}"
    >
      ${formatDate(firstDate)}
    </text>
    <text 
      x="${width - 10}" 
      y="${height - 5}" 
      font-family="monospace" 
      font-size="10" 
      fill="${textColor}" 
      text-anchor="end"
    >
      ${formatDate(lastDate)}
    </text>
  `;
}

function generateEmptySeismograph(width: number, height: number): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#FFFFFF" />
  <text 
    x="${width / 2}" 
    y="${height / 2}" 
    font-family="monospace" 
    font-size="12" 
    fill="#666666" 
    text-anchor="middle"
  >
    No seismograph data available
  </text>
</svg>
  `.trim();
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Generate compact seismograph bar for dashboard header
 * Returns SVG string for the horizontal bar with bias gradient
 */
export function generateSeismographBar(
  biasValue: number,
  width: number = 200,
  height: number = 12
): string {
  const markerPosition = ((biasValue + 5) / 10) * width; // Map -5 to +5 onto 0 to width
  
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <!-- Gradient background -->
  <defs>
    <linearGradient id="biasGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:rgba(0, 50, 100, 0.3);stop-opacity:1" />
      <stop offset="50%" style="stop-color:rgba(128, 128, 128, 0.1);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgba(255, 180, 0, 0.3);stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#biasGradient)" stroke="#000000" stroke-width="1" />
  
  <!-- Marker -->
  <polygon 
    points="${markerPosition},0 ${markerPosition + 6},${height / 2} ${markerPosition},${height} ${markerPosition - 6},${height / 2}" 
    fill="#000000" 
  />
</svg>
  `.trim();
}
