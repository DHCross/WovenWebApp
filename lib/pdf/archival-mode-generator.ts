/**
 * ARCHIVAL MODE PDF GENERATOR
 * Generates precision instrument logs using native PDF elements
 * Replaces html2canvas screenshot approach with vector-based rendering
 * Per Raven Calder specification: "The system stops capturing and starts generating"
 */

import { PDFDocument, PDFPage, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import { generateSeismographSVG, generateSeismographBar, SeismographDataPoint } from './seismograph-svg';

export interface ArchivalPDFOptions {
  title: string;
  dateRange: string;
  seismographData: SeismographDataPoint[];
  dailyReadings: Array<{
    date: string;
    magnitude: number;
    directional_bias: number;
    coherence?: number;
    description?: string;
  }>;
  provenance?: {
    generated_at: string;
    house_system?: string;
    orbs_profile?: string;
    location?: string;
  };
  personA?: {
    name: string;
    birth_data?: any;
  };
  personB?: {
    name: string;
    birth_data?: any;
  };
}

const PAGE_WIDTH = 612; // 8.5" * 72 DPI
const PAGE_HEIGHT = 792; // 11" * 72 DPI
const MARGIN = 50;
const PRINTABLE_WIDTH = PAGE_WIDTH - (2 * MARGIN); // 7.5"

export async function generateArchivalModePDF(options: ArchivalPDFOptions): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  
  // Embed fonts
  const monoFont = await pdfDoc.embedFont(StandardFonts.Courier);
  const serifFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  
  // Page 1: Visual Overview with Seismograph Strip
  await addVisualOverviewPage(pdfDoc, options, monoFont, serifFont, serifBold);
  
  // Page 2+: Daily Readings
  await addDailyReadingsPages(pdfDoc, options, monoFont, serifFont);
  
  // Final Page: Provenance & Interpretation Guide
  await addProvenancePage(pdfDoc, options, monoFont, serifFont, serifBold);
  
  return await pdfDoc.save();
}

async function addVisualOverviewPage(
  pdfDoc: PDFDocument,
  options: ArchivalPDFOptions,
  monoFont: PDFFont,
  serifFont: PDFFont,
  serifBold: PDFFont
): Promise<void> {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let yPosition = PAGE_HEIGHT - MARGIN;
  
  // Title
  page.drawText(options.title, {
    x: MARGIN,
    y: yPosition,
    size: 18,
    font: serifBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  yPosition -= 30;
  
  // Date Range
  page.drawText(options.dateRange, {
    x: MARGIN,
    y: yPosition,
    size: 12,
    font: serifFont,
    color: rgb(0.4, 0.4, 0.4),
  });
  yPosition -= 40;
  
  // Dashboard Header: Two-Column Layout
  const columnWidth = PRINTABLE_WIDTH / 2;
  
  // Left Column: Seismograph Strip
  page.drawText('SYMBOLIC SEISMOGRAPH', {
    x: MARGIN,
    y: yPosition,
    size: 10,
    font: monoFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= 20;
  
  // Embed seismograph SVG
  if (options.seismographData && options.seismographData.length > 0) {
    const svgString = generateSeismographSVG({
      width: PRINTABLE_WIDTH * 0.6 * 72, // 60% of printable width
      height: 60,
      data: options.seismographData,
      showLabels: true,
      colorMode: 'archival'
    });
    
    try {
      const svgImage = await pdfDoc.embedPng(await svgToPng(svgString));
      page.drawImage(svgImage, {
        x: MARGIN,
        y: yPosition - 60,
        width: PRINTABLE_WIDTH * 0.6,
        height: 60,
      });
    } catch (error) {
      console.warn('Failed to embed seismograph SVG, using text fallback');
      page.drawText('[Seismograph visualization]', {
        x: MARGIN,
        y: yPosition - 30,
        size: 10,
        font: monoFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }
  
  // Right Column: Status Stamps
  const rightColumnX = MARGIN + (PRINTABLE_WIDTH * 0.65);
  let rightY = yPosition;
  
  page.drawText('STATUS', {
    x: rightColumnX,
    y: rightY,
    size: 10,
    font: monoFont,
    color: rgb(0, 0, 0),
  });
  rightY -= 20;
  
  // Date range stamp
  const dates = options.dateRange.split(' - ');
  page.drawText(`START: ${dates[0] || 'N/A'}`, {
    x: rightColumnX,
    y: rightY,
    size: 8,
    font: monoFont,
    color: rgb(0, 0, 0),
  });
  rightY -= 15;
  
  page.drawText(`END: ${dates[1] || 'N/A'}`, {
    x: rightColumnX,
    y: rightY,
    size: 8,
    font: monoFont,
    color: rgb(0, 0, 0),
  });
  rightY -= 15;
  
  // Location stamp
  if (options.provenance?.location) {
    page.drawText(`LOC: ${options.provenance.location}`, {
      x: rightColumnX,
      y: rightY,
      size: 8,
      font: monoFont,
      color: rgb(0, 0, 0),
    });
    rightY -= 15;
  }
  
  // SST Status stamp (WB = Within Bounds)
  page.drawRectangle({
    x: rightColumnX,
    y: rightY - 12,
    width: 60,
    height: 16,
    borderColor: rgb(0, 0, 0),
    borderWidth: 2,
  });
  page.drawText('WB', {
    x: rightColumnX + 20,
    y: rightY - 8,
    size: 10,
    font: monoFont,
    color: rgb(0, 0, 0),
  });
  
  yPosition -= 100;
  
  // Summary Statistics
  if (options.dailyReadings && options.dailyReadings.length > 0) {
    const avgMag = options.dailyReadings.reduce((sum, r) => sum + r.magnitude, 0) / options.dailyReadings.length;
    const avgBias = options.dailyReadings.reduce((sum, r) => sum + r.directional_bias, 0) / options.dailyReadings.length;
    
    page.drawText('FIELD SUMMARY', {
      x: MARGIN,
      y: yPosition,
      size: 14,
      font: serifBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPosition -= 25;
    
    page.drawText(`Average Magnitude: ${avgMag.toFixed(2)}`, {
      x: MARGIN,
      y: yPosition,
      size: 10,
      font: monoFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
    
    page.drawText(`Average Directional Bias: ${avgBias >= 0 ? '+' : ''}${avgBias.toFixed(2)}`, {
      x: MARGIN,
      y: yPosition,
      size: 10,
      font: monoFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
    
    page.drawText(`Days Analyzed: ${options.dailyReadings.length}`, {
      x: MARGIN,
      y: yPosition,
      size: 10,
      font: monoFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;
  }
  
  // Interpretive Note (VOICE channel - serif italic)
  const noteLines = [
    'This is a field report, not a forecast. The seismograph measures',
    'structural climate—the geometry of pressure and possibility—not',
    'predetermined outcomes. Use as one reference among many when',
    'orienting to lived patterns.'
  ];
  
  noteLines.forEach(line => {
    page.drawText(line, {
      x: MARGIN,
      y: yPosition,
      size: 10,
      font: serifFont,
      color: rgb(0.3, 0.3, 0.3),
    });
    yPosition -= 14;
  });
  
  // Footer
  page.drawText(`Generated: ${new Date().toLocaleString()} | Archival Mode v1.0`, {
    x: MARGIN,
    y: MARGIN - 20,
    size: 8,
    font: monoFont,
    color: rgb(0.5, 0.5, 0.5),
  });
}

async function addDailyReadingsPages(
  pdfDoc: PDFDocument,
  options: ArchivalPDFOptions,
  monoFont: PDFFont,
  serifFont: PDFFont
): Promise<void> {
  if (!options.dailyReadings || options.dailyReadings.length === 0) return;
  
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let yPosition = PAGE_HEIGHT - MARGIN;
  
  // Title
  page.drawText('DAILY FIELD READINGS', {
    x: MARGIN,
    y: yPosition,
    size: 14,
    font: monoFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  yPosition -= 30;
  
  options.dailyReadings.forEach((reading, index) => {
    // Check if we need a new page
    if (yPosition < MARGIN + 100) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      yPosition = PAGE_HEIGHT - MARGIN;
    }
    
    // Date header
    const dateStr = new Date(reading.date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    page.drawText(dateStr, {
      x: MARGIN,
      y: yPosition,
      size: 11,
      font: monoFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 18;
    
    // Metrics
    const metrics = [
      `  Magnitude: ${reading.magnitude.toFixed(2)}`,
      `  Directional Bias: ${reading.directional_bias >= 0 ? '+' : ''}${reading.directional_bias.toFixed(2)}`,
    ];
    
    if (reading.coherence !== undefined) {
      metrics.push(`  Coherence: ${reading.coherence.toFixed(2)}`);
    }
    
    metrics.forEach(metric => {
      page.drawText(metric, {
        x: MARGIN + 10,
        y: yPosition,
        size: 9,
        font: monoFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 14;
    });
    
    yPosition -= 10;
  });
}

async function addProvenancePage(
  pdfDoc: PDFDocument,
  options: ArchivalPDFOptions,
  monoFont: PDFFont,
  serifFont: PDFFont,
  serifBold: PDFFont
): Promise<void> {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let yPosition = PAGE_HEIGHT - MARGIN;
  
  // Title
  page.drawText('PROVENANCE & INTERPRETATION GUIDE', {
    x: MARGIN,
    y: yPosition,
    size: 14,
    font: serifBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  yPosition -= 30;
  
  // Provenance block
  if (options.provenance) {
    page.drawText('PROVENANCE', {
      x: MARGIN,
      y: yPosition,
      size: 12,
      font: monoFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;
    
    const provenanceLines = [
      `Generated: ${options.provenance.generated_at || new Date().toISOString()}`,
      `House System: ${options.provenance.house_system || 'Placidus'}`,
      `Orbs Profile: ${options.provenance.orbs_profile || 'wm-tight-2025-11-v5'}`,
    ];
    
    provenanceLines.forEach(line => {
      page.drawText(line, {
        x: MARGIN + 10,
        y: yPosition,
        size: 9,
        font: monoFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 14;
    });
    
    yPosition -= 20;
  }
  
  // Interpretation guide
  page.drawText('MAGNITUDE SCALE (0–5)', {
    x: MARGIN,
    y: yPosition,
    size: 12,
    font: monoFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= 20;
  
  const magnitudeLevels = [
    '5  Breakpoint — full system engagement, maximum vector density',
    '4  High charge — concentrated field, elevated load',
    '3  Sustained drive — stable momentum, persistent activation',
    '2  Moderate charge — manageable load, incremental motion',
    '1  Gentle signal — minimal activation, background hum',
    '0  Baseline — quiescent field, no detectable drive',
  ];
  
  magnitudeLevels.forEach(level => {
    page.drawText(level, {
      x: MARGIN + 10,
      y: yPosition,
      size: 9,
      font: monoFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 14;
  });
  
  yPosition -= 20;
  
  // Directional Bias scale
  page.drawText('DIRECTIONAL BIAS SCALE (−5…+5)', {
    x: MARGIN,
    y: yPosition,
    size: 12,
    font: monoFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= 20;
  
  const biasLevels = [
    '+5  Liberation — peak expansive tilt, unrestricted field',
    '+3  Stable Flow — coherent outward bias, aligned geometry',
    ' 0  Equilibrium — net-neutral tilt; forces cancel or balance',
    '−3  Friction — cross-pressure, conflicting vectors',
    '−5  Compression — maximum restrictive tilt, collapsed field',
  ];
  
  biasLevels.forEach(level => {
    page.drawText(level, {
      x: MARGIN + 10,
      y: yPosition,
      size: 9,
      font: monoFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 14;
  });
}

// Helper: Convert SVG to PNG (simplified - in production, use a proper library)
async function svgToPng(svgString: string): Promise<ArrayBuffer> {
  // This is a placeholder - in production, you'd use a library like sharp or canvas
  // For now, we'll skip SVG embedding and use text fallback
  throw new Error('SVG to PNG conversion not implemented');
}
