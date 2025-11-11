
import { useState, useCallback } from 'react';
import { saveAs } from 'file-saver';
import { WovenMap, WovenMapBlueprint, Person, ChartSection, AnalysisDirective } from '@/lib/types/woven-map-blueprint';
import { createFrontStageResult } from '@/lib/unifiedDashboardTransforms';

const useChartExport = (result: any, reportKind: string) => {
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [markdownGenerating, setMarkdownGenerating] = useState(false);
  const [weatherJsonGenerating, setWeatherJsonGenerating] = useState(false);
  const [graphsPdfGenerating, setGraphsPdfGenerating] = useState(false);
  const [engineConfigGenerating, setEngineConfigGenerating] = useState(false);
  const [cleanJsonGenerating, setCleanJsonGenerating] = useState(false);

  const santizedFilename = (result?.context?.person_a?.name || 'chart').replace(/[^a-zA-Z0-9]/g, '_');

  const handleDownload = useCallback(async (
    generator: (data: any, kind: string) => Promise<Blob | { error: string }>,
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    filename: string,
    resultData: any,
    kind: string
  ) => {
    setter(true);
    try {
      const blob = await generator(resultData, kind);
      if ('error' in blob) {
        throw new Error(blob.error);
      }
      saveAs(blob, filename);
    } catch (error) {
      console.error(`Failed to generate ${filename}:`, error);
      alert(`An error occurred while generating the file: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setter(false);
    }
  }, []);

  const onDownloadPDF = useCallback(() => {
    // PDF generation logic here
  }, [result, reportKind]);

  const onDownloadMarkdown = useCallback(() => {
    const markdown = buildMirrorMarkdown(result, reportKind);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, `${santizedFilename}_mirror_report.md`);
  }, [result, reportKind]);

  const onDownloadSymbolicWeather = useCallback(() => {
    const weatherData = result?.symbolic_weather || {};
    const blob = new Blob([JSON.stringify(weatherData, null, 2)], { type: 'application/json' });
    saveAs(blob, `${santizedFilename}_symbolic_weather.json`);
  }, [result]);

  const onDownloadGraphsPDF = useCallback(() => {
    // Graphs PDF generation logic here
  }, [result]);

  const onDownloadEngineConfig = useCallback(() => {
    const config = result?.engine_config || {};
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    saveAs(blob, `${santizedFilename}_engine_config.json`);
  }, [result]);

  const onDownloadCleanJSON = useCallback(() => {
    const cleanJson = createFrontStageResult(result);
    const blob = new Blob([JSON.stringify(cleanJson, null, 2)], { type: 'application/json' });
    saveAs(blob, `${santizedFilename}_clean.json`);
  }, [result]);

  return {
    pdfGenerating,
    markdownGenerating,
    weatherJsonGenerating,
    graphsPdfGenerating,
    engineConfigGenerating,
    cleanJsonGenerating,
    onDownloadPDF,
    onDownloadMarkdown,
    onDownloadSymbolicWeather,
    onDownloadGraphsPDF,
    onDownloadEngineConfig,
    onDownloadCleanJSON,
  };
};

export default useChartExport;

function formatNatalSummaryForPDF(summary: any, person: Person | undefined): string {
  // Implementation for formatNatalSummaryForPDF
  return '';
}

function formatPersonBBlueprintForPDF(blueprint: WovenMapBlueprint, person: Person): string {
  // Implementation for formatPersonBBlueprintForPDF
  return '';
}

function formatPlanetaryPositionsTable(positions: any[]): string {
  // Implementation for formatPlanetaryPositionsTable
  return '';
}

function formatHouseCuspsTable(cusps: any[]): string {
  // Implementation for formatHouseCuspsTable
  return '';
}

function formatAspectsTable(aspects: any[]): string {
  // Implementation for formatAspectsTable
  return '';
}

function formatSymbolicWeatherSummary(weather: any): string {
  // Implementation for formatSymbolicWeatherSummary
  return '';
}

function buildAnalysisDirective(reportKind: string): AnalysisDirective {
  // Implementation for buildAnalysisDirective
  return {} as AnalysisDirective;
}

const instructionsSection: ChartSection = {
  title: 'How to Use This Report',
  body: 'This report is designed for use with the Raven Calder AI. The AI can provide a detailed interpretation of the data contained in this report.',
  mode: 'regular',
};

function buildChartPackageSections(result: any, reportKind: string): ChartSection[] {
  const wovenMap = result as WovenMap;
  const prefaceSections: ChartSection[] = [];

  if (wovenMap?.blueprint) {
    if (wovenMap.blueprint.modes) {
      const { modes } = wovenMap.blueprint;
      let summary = 'CONSTITUTIONAL BASELINE (Natal Blueprint)\\n\\n';

      if (modes.primary_mode) {
        summary += `PRIMARY MODE: ${modes.primary_mode.function}\\n${modes.primary_mode.description}\\n\\n`;
      }
      if (modes.secondary_mode) {
        summary += `SECONDARY MODE: ${modes.secondary_mode.function}\\n${modes.secondary_mode.description}\\n\\n`;
      }
      if (modes.shadow_mode) {
        summary += `SHADOW PATTERN: ${modes.shadow_mode.function}\\n${modes.shadow_mode.description}\\n\\n`;
      }

      if (summary.trim()) {
        prefaceSections.push({
          title: '0. Blueprint Foundation (Structural Personality Diagnostic)',
          body: summary.trim(),
          mode: 'regular',
        });
      }
    }
  }

  const bodySections: ChartSection[] = [instructionsSection];

  if (wovenMap?.blueprint) {
    if (wovenMap.blueprint.natal_summary) {
      const natalText = formatNatalSummaryForPDF(
        wovenMap.blueprint.natal_summary,
        wovenMap.context?.person_a,
      );
      if (natalText.trim()) {
        bodySections.push({
          title: 'Person A: Natal Blueprint',
          body: natalText,
          mode: 'regular',
        });
      }
    }

    if (wovenMap.blueprint.person_b_modes && wovenMap.context?.person_b) {
      const personBText = formatPersonBBlueprintForPDF(
        wovenMap.blueprint,
        wovenMap.context.person_b,
      );
      if (personBText.trim()) {
        bodySections.push({
          title: 'Person B: Natal Blueprint',
          body: personBText,
          mode: 'regular',
        });
      }
    }
  }

  if (wovenMap?.data_tables) {
    const hasPrintableTable = (text: string) =>
      text && !/^No\\s.+\\savailable\\.?$/i.test(text.trim());

    if (wovenMap.data_tables.natal_positions && Array.isArray(wovenMap.data_tables.natal_positions)) {
      const positionsText = formatPlanetaryPositionsTable(wovenMap.data_tables.natal_positions);
      if (hasPrintableTable(positionsText)) {
        bodySections.push({
          title: 'Planetary Positions (Person A)',
          body: positionsText,
          mode: 'mono',
        });
      }
    }

    if (wovenMap.data_tables.house_cusps && Array.isArray(wovenMap.data_tables.house_cusps)) {
      const cuspsText = formatHouseCuspsTable(wovenMap.data_tables.house_cusps);
      if (hasPrintableTable(cuspsText)) {
        bodySections.push({
          title: 'House Cusps (Person A)',
          body: cuspsText,
          mode: 'mono',
        });
      }
    }

    if (wovenMap.data_tables.natal_aspects && Array.isArray(wovenMap.data_tables.natal_aspects)) {
      const aspectsText = formatAspectsTable(wovenMap.data_tables.natal_aspects);
      if (hasPrintableTable(aspectsText)) {
        bodySections.push({
          title: 'Major Aspects (Person A)',
          body: aspectsText,
          mode: 'mono',
        });
      }
    }

    if (
      wovenMap.data_tables.person_b_positions &&
      Array.isArray(wovenMap.data_tables.person_b_positions)
    ) {
      const positionsBText = formatPlanetaryPositionsTable(
        wovenMap.data_tables.person_b_positions,
      );
      if (hasPrintableTable(positionsBText)) {
        bodySections.push({
          title: 'Planetary Positions (Person B)',
          body: positionsBText,
          mode: 'mono',
        });
      }
    }

    if (
      wovenMap.data_tables.person_b_house_cusps &&
      Array.isArray(wovenMap.data_tables.person_b_house_cusps)
    ) {
      const cuspsBText = formatHouseCuspsTable(wovenMap.data_tables.person_b_house_cusps);
      if (hasPrintableTable(cuspsBText)) {
        bodySections.push({
          title: 'House Cusps (Person B)',
          body: cuspsBText,
          mode: 'mono',
        });
      }
    }

    if (wovenMap.data_tables.synastry_aspects) {
      const synAspectsText = formatAspectsTable(wovenMap.data_tables.synastry_aspects);
      if (hasPrintableTable(synAspectsText)) {
        bodySections.push({
          title: 'Synastry Aspects',
          body: synAspectsText,
          mode: 'mono',
        });
      }
    }

    if (wovenMap.data_tables.daily_readings && Array.isArray(wovenMap.data_tables.daily_readings)) {
      const readings = wovenMap.data_tables.daily_readings;
      const trendLines: string[] = [];

      if (readings.length > 0) {
        const avgMag =
          readings.reduce((sum: number, r: any) => sum + (r.magnitude || 0), 0) /
          readings.length;
        const avgVal =
          readings.reduce((sum: number, r: any) => sum + (r.directional_bias?.value ?? r.directional_bias ?? 0), 0) /
          readings.length;
        const avgVol =
          readings.reduce((sum: number, r: any) => sum + (r.volatility || 0), 0) /
          readings.length;

        const dateRange = `${readings[0]?.date || 'Start'} to ${
          readings[readings.length - 1]?.date || 'End'
        }`;
        const peakDays =
          readings
            .filter((r: any) => (r.magnitude || 0) >= 4)
            .map((r: any) => r.date)
            .join(', ') || 'None';

        trendLines.push(`Period: ${dateRange} (${readings.length} days analyzed)`);
        trendLines.push(
          `Average Climate: Magnitude ${avgMag.toFixed(1)}, Valence ${
            avgVal > 0 ? '+' : ''
          }${avgVal.toFixed(1)}, Volatility ${avgVol.toFixed(1)}`,
        );
        trendLines.push(`Peak Activation Days (Mag >=4): ${peakDays}`);
        trendLines.push('');
        trendLines.push('Note: Full daily data preserved in JSON export for detailed analysis.');
      }

      if (trendLines.length > 0) {
        bodySections.push({
          title: 'Transit Trend Summary',
          body: trendLines.join('\\n'),
          mode: 'regular',
        });
      }
    }
  }

  if (wovenMap?.symbolic_weather) {
    const weatherSummary = formatSymbolicWeatherSummary(wovenMap.symbolic_weather);
    if (weatherSummary) {
      bodySections.push({
        title: 'Symbolic Weather Overview',
        body: weatherSummary,
        mode: 'regular',
      });
    }
  }

  return [...prefaceSections, ...bodySections];
}

function buildMirrorMarkdown(result: any, reportKind: string): string {
  const sections = buildChartPackageSections(result, reportKind);
  const heading = reportKind.includes('Relational')
    ? 'Mirror Chart -- Relational Reading'
    : 'Mirror Chart -- Solo Reading';

  const lines: string[] = [`# ${heading}`, ''];

  sections.forEach((section) => {
    lines.push(`## ${section.title}`);
    lines.push('');

    if (section.mode === 'mono') {
      lines.push('```');
      lines.push(section.body);
      lines.push('```');
    } else {
      lines.push(section.body);
    }

    lines.push('');
  });

  const markdown = lines.join('\\n');
  return markdown.replace(/\\n{3,}/g, '\\n\\n').trimEnd();
}

function formatProvenanceStamp(provenance: any): string {
  if (!provenance || typeof provenance !== 'object') {
    return 'Provenance stamp unavailable.';
  }

  const lines: string[] = [];
  const pushLine = (label: string, value: unknown) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value.trim().length === 0) return;
    lines.push(`${label}: ${value}`);
  };

  const formatEngineVersions = (engines: any) => {
    if (!engines || typeof engines !== 'object') return null;
    const parts = Object.entries(engines)
      .filter(([_, version]) => version !== undefined && version !== null)
      .map(([key, version]) => `${key}: ${version}`);
    return parts.length ? parts.join(' · ') : null;
  };

  const formatCoords = (coords: any) => {
    if (!coords || typeof coords !== 'object') return null;
    const lat = typeof coords.lat === 'number' ? coords.lat : coords.latitude;
    const lon = typeof coords.lon === 'number' ? coords.lon : coords.longitude;
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
    }
    return null;
  };

  pushLine('Math Brain Version', provenance.math_brain_version);
  pushLine('Build Timestamp', provenance.build_ts);
  pushLine('Ephemeris Source', provenance.ephemeris_source);
  pushLine('House System', provenance.house_system_name || provenance.house_system);
  pushLine('Orbs Profile', provenance.orbs_profile);
  pushLine('Timezone Database', provenance.timezone_db_version || provenance.timezone);
  pushLine('Relocation Mode', provenance.relocation_mode);
  pushLine('Translocation Mode', provenance.translocation_mode);

  const engineVersions = formatEngineVersions(provenance.engine_versions);
  if (engineVersions) pushLine('Engine Versions', engineVersions);

  const coords = formatCoords(provenance.relocation_coords);
  if (coords) pushLine('Relocation Coordinates', coords);

  const normalizedHash = provenance.normalized_input_hash || provenance.hash;
  pushLine('Normalized Input Hash', normalizedHash);
  pushLine('Signed Map Package ID', normalizedHash || 'unavailable');

  if (lines.length === 0) {
    return 'Provenance stamp unavailable.';
  }

  return lines.join('\\n');
}

export function augmentPayloadWithMirrorContract(payload: any, reportKind: string) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const sanitized = createFrontStageResult(payload);
  const sections = buildChartPackageSections(sanitized, reportKind);
  const directive = buildAnalysisDirective(reportKind);
  const mirrorMarkdown = buildMirrorMarkdown(sanitized, reportKind);

  return {
    ...sanitized,
    export_contract: {
      ...(sanitized.export_contract ?? {}),
      mirror: {
        kind: reportKind,
        generated_at: new Date().toISOString(),
        directive,
        sections,
        markdown: mirrorMarkdown,
        provenance: sanitized.provenance ?? null,
        smp_id: sanitized.provenance?.normalized_input_hash || sanitized.provenance?.hash || null,
      },
    },
  };
}
