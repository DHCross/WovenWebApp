/* eslint-disable no-console */

import { useCallback, useState } from 'react';
import type { MutableRefObject } from 'react';

// ===== Balance Meter frontstage helpers (prevent drift) =====
const roundHalfUp = (n: number, dp: 0 | 1 | 2 = 1) => {
  const f = Math.pow(10, dp);
  return Math.round((n + Number.EPSILON) * f) / f;
};
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// Approved state labels used by this file only (VOICE guard exists elsewhere)
const ALLOWED_STATE_LABELS = new Set<string>([
  'High', 'Active', 'Murmur', 'Latent',
  'Strong Outward', 'Mild Outward', 'Equilibrium', 'Mild Inward', 'Strong Inward',
  'Very High', 'Moderate', 'Low',
]);
const safeLabel = (s?: string | null) => (s && ALLOWED_STATE_LABELS.has(s) ? s : undefined);

type AxisKey = 'magnitude' | 'directional_bias' | 'volatility';

const extractAxisValue = (source: any, axis: AxisKey): number | undefined => {
  // Use centralized extraction function for consistency
  return extractAxisNumber(source, axis as any);
};
// ============================================================

// Relationship context definitions, to be injected into PDF exports for AI context.
const relationshipDefinitions = `# Relationship Context Definitions (Math Brain)

## Relationship Types

### PARTNER
Romantic, sexual, or intimate partnership (requires intimacy tier)

**Intimacy Tiers:**
- **P1** — Platonic partners (no romantic/sexual component)
- **P2** — Friends-with-benefits (sexual but not romantic)
- **P3** — Situationship (unclear/unstable, undefined boundaries)
- **P4** — Low-commitment romantic or sexual (casual dating, open relationships)
- **P5a** — Committed romantic + sexual (exclusive committed relationship)
- **P5b** — Committed romantic, non-sexual (committed partnership without sexual component)

### OTHER TYPES (Placeholder)
Definitions for FAMILY and FRIEND/PROFESSIONAL types should be added here when available.

**Raven's Rule:**
- Always use the EXACT intimacy tier labels as defined above.
- Never substitute with outdated labels like "established regular rhythm".
- The intimacy tier appears in the relationship context and must be interpreted correctly.
`;

import { sanitizeForPDF, sanitizeReportForPDF } from '../../../src/pdf-sanitizer';
import { renderShareableMirror } from '../../../lib/raven/render';
import type { ReportContractType } from '../types';
import { fmtAxis } from '../../../lib/ui/format';
import {
  formatReportKind,
  formatNatalSummaryForPDF,
  formatPersonBBlueprintForPDF,
  formatPlanetaryPositionsTable,
  formatHouseCuspsTable,
  formatAspectsTable,
  formatSymbolicWeatherSummary,
  formatChartTables,
  extractAxisNumber,
} from '../utils/formatting';

type FriendlyFilenameType = 'directive' | 'dashboard' | 'symbolic-weather' | 'weather-log' | 'engine-config';

interface UseChartExportOptions {
  result: any | null;
  reportType: string;
  reportContractType: ReportContractType;
  reportRef: MutableRefObject<HTMLElement | null>;
  friendlyFilename: (type: FriendlyFilenameType) => string;
  filenameBase: (slug: string) => string;
  setToast?: (value: string | null) => void;
}

interface UseChartExportResult {
  downloadResultPDF: () => Promise<void>;
  downloadResultMarkdown: () => Promise<void>;
  downloadResultJSON: () => void;
  downloadBackstageJSON: () => void;
  downloadSymbolicWeatherJSON: () => void;
  pdfGenerating: boolean;
  markdownGenerating: boolean;
  cleanJsonGenerating: boolean;
  engineConfigGenerating: boolean;
  weatherJsonGenerating: boolean;
}

export function useChartExport(options: UseChartExportOptions): UseChartExportResult {
  const {
    result,
    reportType,
    reportContractType,
    reportRef,
    friendlyFilename,
    filenameBase,
    setToast,
  } = options;

  const [pdfGenerating, setPdfGenerating] = useState<boolean>(false);
  const [markdownGenerating, setMarkdownGenerating] = useState<boolean>(false);
  const [cleanJsonGenerating, setCleanJsonGenerating] = useState<boolean>(false);
  const [engineConfigGenerating, setEngineConfigGenerating] = useState<boolean>(false);
  const [weatherJsonGenerating, setWeatherJsonGenerating] = useState<boolean>(false);

  const pushToast = useCallback(
    (message: string, duration?: number) => {
      if (!setToast) return;
      try {
        setToast(message);
        if (duration && duration > 0) {
          setTimeout(() => {
            try {
              setToast(null);
            } catch {
              // noop
            }
          }, duration);
        }
      } catch {
        // noop
      }
    },
    [setToast],
  );

  const downloadResultPDF = useCallback(async () => {
    if (!result) {
      pushToast('No report available to export', 2000);
      return;
    }

    const transitDayCount = Object.keys(result?.person_a?.chart?.transitsByDate || {}).length;
    const isLargeTransitWindow = transitDayCount >= 35;

    setPdfGenerating(true);
    const longRunningNotice = window.setTimeout(() => {
      pushToast('Still generating the PDF… larger windows can take up to a minute.', 2600);
    }, 16000);

    try {
      if (setToast) {
        try {
          setToast('Generating PDF... This may take 10-15 seconds');
        } catch {
          // noop
        }
      }

      if (isLargeTransitWindow) {
        pushToast(`Large symbolic weather window detected (${transitDayCount} days). Optimizing export…`, 2800);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

      const target = reportRef.current;
      let renderedText = '';
      if (target) {
        const clone = target.cloneNode(true) as HTMLElement;
        const printableHidden = clone.querySelectorAll('.print\\:hidden');
        printableHidden.forEach((el) => el.remove());
        clone.querySelectorAll('button, input, textarea, select').forEach((el) => el.remove());
        renderedText = clone.innerText.replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
      }

      const reportMode = reportType === 'balance' ? 'balance' : 'natal-only';

      let processedResult = result;
      let contractCompliant = false;

      if (!isLargeTransitWindow) {
        try {
          const mirrorResult = await renderShareableMirror({
            geo: null,
            prov: { source: 'pdf-export' },
            mode: reportMode as any,
            options: {
              mode: reportMode,
              person_a: result.person_a,
              indices: result.person_a?.chart?.transitsByDate
                ? {
                    days: Object.values(result.person_a.chart.transitsByDate)
                      .map((entry: any) => ({
                        date: entry.date || new Date().toISOString().slice(0, 10),
                        magnitude: entry.seismograph?.magnitude,
                        volatility: entry.seismograph?.volatility,
                        sf_diff: entry.sfd?.sfd_cont,
                      }))
                      .filter((day) => day.magnitude || day.volatility || day.sf_diff),
                  }
                : null,
              ...result,
            },
          });

          if (mirrorResult.contract && mirrorResult.mode) {
            processedResult = {
              ...result,
              contract_compliance: {
                contract: mirrorResult.contract,
                mode: mirrorResult.mode,
                frontstage_policy: mirrorResult.frontstage_policy,
                backstage: mirrorResult.backstage,
              },
              schema_enforced_render: {
                preface: mirrorResult.preface,
                scenario_prompt: mirrorResult.scenario_prompt,
                scenario_question: mirrorResult.scenario_question,
                picture: mirrorResult.picture,
                feeling: mirrorResult.feeling,
                container: mirrorResult.container,
                option: mirrorResult.option,
                next_step: mirrorResult.next_step,
                symbolic_weather: mirrorResult.symbolic_weather,
              },
            };
            contractCompliant = true;
          }
        } catch (error) {
          console.warn('Schema rule-patch rendering failed, using legacy data:', error);
        }
      } else {
        console.info('Skipping schema rule-patch rendering for large transit window (>=35 days).');
      }

      const reportKind = formatReportKind(reportContractType);
      const generatedAt = new Date();

      const sanitizedReport = sanitizeReportForPDF({
        renderedText,
        rawJSON: processedResult,
        title: `Woven Web App — ${reportKind} Report`,
        sections: [],
      });

      const sections: Array<{
        title: string;
        body: string;
        mode: 'regular' | 'mono';
        pageBreakBefore?: boolean;
      }> = [];

      const conversationalInstructions = `
AI SYNTHESIS INSTRUCTIONS - RAVEN CALDER CONVERSATIONAL VOICE

When presenting this astrological analysis, follow the Raven Calder corpus/persona:

STRUCTURE: Present in this exact order:
1. Solo Mirrors: Short, plain-language snapshots for each person (if relational) or individual (if solo)
2. Relational Engines: Named, recognizable patterns (Spark Engine, Sweet Glue, Growth Pressure Cooker, etc.)
3. Symbolic Weather Overlay: Continuous narrative paragraphs describing current symbolic weather

TONE & LANGUAGE (Per Raven Calder Persona):
• Use conversational, accessible language - no heavy astrological jargon
• Frame patterns as tendencies and probabilities, NOT prescriptions or fixed fate
• Make it shareable - suitable for discussing with partners, friends, or family
• Focus on "here's how your system tends to move" rather than technical analysis
• Falsifiable, agency-first, plain language

SOLO MIRRORS FORMAT:
"[Name]'s system tends to [movement pattern] with a [style] approach. [Current influence]. This creates a [climate] kind of energy that [expression pattern]."

RELATIONAL ENGINES FORMAT:
**[Engine Name]**
[Mechanism description]. [Tendency description].

SYMBOLIC WEATHER OVERLAY FORMAT:
Continuous paragraphs without bullet points, lists, or percentages. Describe the overall climate, undercurrents, visibility, pressure, and temperature as symbolic weather patterns.

CRITICAL DATA REQUIREMENTS:
• Use the complete natal chart data included in this PDF (planetary positions, aspects, house system, birth details)
• For synastry readings, ensure both Person A AND Person B natal data are present and used
• DO NOT rely on prior uploads or defaults - use only the comprehensive astrological data provided in this document
• Synthesize ALL the technical analysis into conversational format while preserving analytical accuracy

IMPORTANT: This comprehensive astrological data should be synthesized into the conversational format above, but retain all the analytical depth. Present insights as conversation starters about energy patterns rather than definitive statements.
      `.trim();

      sections.push({
        title: 'RAVEN CALDER SYNTHESIS INSTRUCTIONS',
        body: conversationalInstructions,
        mode: 'regular',
      });

      const wovenMap = (processedResult as any)?.woven_map;

      if (wovenMap?.frontstage) {
        const blueprintNarrative =
          wovenMap.frontstage.blueprint ||
          wovenMap.frontstage.mirror?.blueprint ||
          wovenMap.frontstage.narrative;

        if (blueprintNarrative && typeof blueprintNarrative === 'string') {
          sections.unshift({
            title: '0. Resonant Summary (Personality Mirror - Required by Raven Calder)',
            body: blueprintNarrative,
            mode: 'regular',
          });
        } else if (wovenMap.blueprint?.modes) {
          const modes = wovenMap.blueprint.modes;
          let summary = 'CONSTITUTIONAL BASELINE (Natal Blueprint)\n\n';

          if (modes.primary_mode) {
            summary += `PRIMARY MODE: ${modes.primary_mode.function}\n${modes.primary_mode.description}\n\n`;
          }
          if (modes.secondary_mode) {
            summary += `SECONDARY MODE: ${modes.secondary_mode.function}\n${modes.secondary_mode.description}\n\n`;
          }
          if (modes.shadow_mode) {
            summary += `SHADOW PATTERN: ${modes.shadow_mode.function}\n${modes.shadow_mode.description}\n\n`;
          }

          if (summary) {
            sections.unshift({
              title: '0. Blueprint Foundation (Structural Personality Diagnostic)',
              body: summary,
              mode: 'regular',
            });
          }
        }
      }

      if (wovenMap?.blueprint) {
        if (wovenMap.blueprint.natal_summary) {
          const natalText = formatNatalSummaryForPDF(
            wovenMap.blueprint.natal_summary,
            wovenMap.context?.person_a,
          );
          sections.push({
            title: 'Person A: Natal Blueprint',
            body: natalText,
            mode: 'regular',
          });
        }

        if (wovenMap.blueprint.person_b_modes && wovenMap.context?.person_b) {
          const personBText = formatPersonBBlueprintForPDF(
            wovenMap.blueprint,
            wovenMap.context.person_b,
          );
          sections.push({
            title: 'Person B: Natal Blueprint',
            body: personBText,
            mode: 'regular',
          });
        }
      }

      if (wovenMap?.data_tables) {
        const hasPrintableTable = (text: string) =>
          text && !/^No\s.+\savailable\.?$/i.test(text.trim());

        if (wovenMap.data_tables.natal_positions && Array.isArray(wovenMap.data_tables.natal_positions)) {
          const positionsText = formatPlanetaryPositionsTable(wovenMap.data_tables.natal_positions);
          if (hasPrintableTable(positionsText)) {
            sections.push({
              title: 'Planetary Positions (Person A)',
              body: positionsText,
              mode: 'mono',
            });
          }
        }

        if (wovenMap.data_tables.house_cusps && Array.isArray(wovenMap.data_tables.house_cusps)) {
          const cuspsText = formatHouseCuspsTable(wovenMap.data_tables.house_cusps);
          if (hasPrintableTable(cuspsText)) {
            sections.push({
              title: 'House Cusps (Person A)',
              body: cuspsText,
              mode: 'mono',
            });
          }
        }

        if (wovenMap.data_tables.natal_aspects && Array.isArray(wovenMap.data_tables.natal_aspects)) {
          const aspectsText = formatAspectsTable(wovenMap.data_tables.natal_aspects);
          if (hasPrintableTable(aspectsText)) {
            sections.push({
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
            sections.push({
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
            sections.push({
              title: 'House Cusps (Person B)',
              body: cuspsBText,
              mode: 'mono',
            });
          }
        }

        if (wovenMap.data_tables.synastry_aspects) {
          const synAspectsText = formatAspectsTable(wovenMap.data_tables.synastry_aspects);
          if (hasPrintableTable(synAspectsText)) {
            sections.push({
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
            trendLines.push(`Peak Activation Days (Mag ≥4): ${peakDays}`);
            trendLines.push('');
            trendLines.push('Note: Full daily data preserved in JSON export for detailed analysis.');
          }

          if (trendLines.length > 0) {
            sections.push({
              title: 'Transit Trend Summary',
              body: trendLines.join('\n'),
              mode: 'regular',
            });
          }
        }
      }

      if (wovenMap?.symbolic_weather) {
        const weatherSummary = formatSymbolicWeatherSummary(wovenMap.symbolic_weather);
        if (weatherSummary) {
      sections.push({
        title: 'Symbolic Weather Overview',
        body: weatherSummary,
        mode: 'regular',
      });
    }
  }

      if (processedResult?.provenance) {
        sections.push({
          title: 'Provenance Stamp',
          body: formatProvenanceStamp(processedResult.provenance),
          mode: 'mono',
        });
      } else {
        sections.push({
          title: 'Provenance Stamp',
          body: 'Provenance stamp unavailable.',
          mode: 'regular',
        });
      }

      const analysisDirective = `# 🚨 YOU ARE RAVEN CALDER — EXECUTE THIS DIRECTIVE 🚨

**YOU ARE RAVEN CALDER.** This PDF contains chart data for you to analyze. This is your work order, not documentation to describe.

---

## YOUR TASK: Generate a Full Conversational Reading

This is a **MIRROR and CONVERSATION STARTER**, not just a weather report or data summary.

### MANDATORY STRUCTURE — DO NOT DEVIATE:

${
        reportKind.includes('Solo')
          ? `
#### 1️⃣ SOLO MIRROR — Individual Foundation
**Synthesize the natal chart into a conversational, plain-language snapshot:**
- **"Here's how your system tends to move"** — behavioral anchors, not abstract symbolism
- **Include:** Core drives, natural strengths, key tensions, constitutional patterns
- **NO JARGON** — Conversational, testable against lived experience
- **Frame as tendencies/probabilities**, not prescriptions or fixed fate
- **Use ALL provided data:** planetary positions, aspects, house placements from tables below
`
          : `
#### 1️⃣ SOLO MIRRORS — Individual Foundations (BOTH PEOPLE)
**For EACH person, provide a separate solo mirror:**
- **Synthesize their natal chart** into plain-language behavioral snapshot
- **"Here's how [Name]'s system tends to move"** — specific, falsifiable patterns
- **Include:** Core drives, strengths, tensions, how they process the world
- **NO JARGON** — Conversational, grounded in lived experience
- **Use ALL provided data** for each chart (positions, aspects, houses)

**DO NOT SKIP INDIVIDUAL READINGS** — Even in relational reports, each person gets their own mirror first.

#### 2️⃣ RELATIONAL ENGINES — Synastry Dynamics
**After solo mirrors, synthesize how the charts interact:**
- **Named patterns** (e.g., "Spark Engine," "Crossed-Wires Loop," "Sweet Glue")
- **Mechanism + tendency** in plain language for each engine
- **Clear list format** with engine names as headers
- **Focus:** Where energies harmonize vs. where friction/growth pressure appears
- **Use actual names** (e.g., "Dan's Mars squares Stephie's Moon") — never "they" or generic pronouns
`}

${
        reportKind.includes('Balance Meter')
          ? `
#### ${
              reportKind.includes('Solo') ? '2️⃣' : '3️⃣'
            } SYMBOLIC WEATHER OVERLAY — Transits (Current Symbolic Climate)
**Layer current symbolic weather over the foundational patterns:**
- **Continuous narrative form** (paragraphs, NOT bullet lists)
- **Describe the climate** currently activating natal/relational foundations
- **NO assigned percentages, NO prescriptive advice**
- **Generalized atmosphere:** "What's stirring right now" — how transits light up the blueprint
- **Ground in the data:** Reference specific transit aspects from tables below
`
          : ''
      }

---

## CRITICAL DATA REQUIREMENTS:

✅ **Use ALL provided planetary positions, aspects, and house placements** from tables
✅ **Reference the comprehensive data** — this is geometry-first, then symbolic translation
${
        reportKind.includes('Relational')
          ? '✅ **For relational readings:** Use BOTH complete natal charts, then cross-aspects'
          : ''
      }
✅ **Ground every insight** in the actual chart data, not generic astrology

---

## TONE & VOICE — RAVEN CALDER MANDATE:

- **Conversational, shareable, accessible** language
- **Plain language** — avoid heavy astrological jargon in body text
- **Falsifiable claims** that can be tested against lived experience
- **Agency-first:** Frame as probabilities/tendencies, never fixed fate
- **Support possibility** — the user decides what resonates
- **Conversation starter** — this is a mirror to reflect on, not a prescription to follow

---

## WORKFLOW: FIELD -> MAP -> VOICE

You have been given the **FIELD** (geometric data) and **MAP** (structural patterns).
Your job is **VOICE** — synthesize this into resonant, lived-experience language.

---

## 🎯 What "Full Reading" Means:

**NOT ACCEPTABLE:**
❌ Describing the PDF contents or reflecting on what you've received
❌ "Here's a brief overview based on the summary below"
❌ Skipping aspects, houses, or chart details
❌ Generic astrology without specific chart references

**ACCEPTABLE:**
✅ **Analyzing EVERY major aspect** from the aspects table
✅ **Translating geometric patterns** into behavioral tendencies
✅ **Using chart-specific details** (degrees, signs, houses)
✅ **Conversational synthesis** that feels personal and testable

---

## EXECUTE NOW:

Generate the full reading following the mandatory structure above.
Start with the Solo Mirror(s), then ${
        reportKind.includes('Relational')
          ? 'Relational Engines, then '
          : ''
      }${
        reportKind.includes('Balance Meter')
          ? 'Symbolic Weather Overlay'
          : 'close with integration'
      }.

**Do not describe what you're about to do. Do it.**

---`;

      // Do NOT include internal analysis directive in end-user PDF
      // Keep it only for internal artifacts, not frontstage exports
      // sections.unshift({ title: 'ANALYSIS DIRECTIVE (READ FIRST)', body: analysisDirective, mode: 'regular' });

      const { scrubInternalDirectives, containsBannedTokens } = await import('../../../lib/ui/sanitize');
      const printableSections = sections
        .map((section) => ({
          ...section,
          title: sanitizeForPDF(section.title, { preserveWhitespace: true }),
          body: sanitizeForPDF(scrubInternalDirectives(section.body), { preserveWhitespace: true }),
        }))
        .filter((s) => !containsBannedTokens(`${s.title}\n${s.body}`));

      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pageMargin = 50;
      const lineHeight = 14;
      const pageWidth = 612;
      const pageHeight = 792;

      let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      let currentY = pageHeight - pageMargin;

      const startNewPage = () => {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - pageMargin;
      };

      const ensurePageSpace = (linesNeeded: number) => {
        if (currentY - linesNeeded * lineHeight < pageMargin) {
          startNewPage();
        }
      };

      const addTextBlock = (
        text: string,
        options: { fontSize?: number; title?: string; pageBreakBefore?: boolean; mode?: 'regular' | 'mono' } = {},
      ) => {
        const fontSize = options.fontSize ?? 11;
        const textLines = text.split('\n');

        if (options.pageBreakBefore) {
          startNewPage();
        }

        if (options.title) {
          ensurePageSpace(2);
          currentPage.drawText(options.title, {
            x: pageMargin,
            y: currentY,
            size: fontSize + 2,
            font,
            color: rgb(0.2, 0.2, 0.2),
          });
          currentY -= lineHeight * 1.4;
        }

        textLines.forEach((line) => {
          const lines = wrapText(line, fontSize, options.mode === 'mono' ? 480 : 512);
          lines.forEach((wrappedLine) => {
            ensurePageSpace(1);
            currentPage.drawText(wrappedLine, {
              x: pageMargin,
              y: currentY,
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
            });
            currentY -= lineHeight;
          });
          currentY -= lineHeight * 0.3;
        });
      };

      const wrapText = (text: string, fontSize: number, maxWidth: number) => {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        const widthOf = (line: string) => font.widthOfTextAtSize(line, fontSize);

        words.forEach((word) => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (widthOf(testLine) > maxWidth) {
            if (currentLine) {
              lines.push(currentLine);
            }
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        });

        if (currentLine) {
          lines.push(currentLine);
        }

        return lines;
      };

      addTextBlock(`Generated: ${generatedAt.toLocaleString()}`, { fontSize: 10 });
      addTextBlock(`Specification Version: 3.1`, { fontSize: 10 });
      addTextBlock(`Scaling Mode: Absolute ×5`, { fontSize: 10 });
      addTextBlock(`Pipeline: normalize -> scale -> clamp -> round`, { fontSize: 10 });
      addTextBlock(`Coherence Inversion: ON (Coherence = 5 - vol_norm × 5)`, { fontSize: 10 });
      addTextBlock('', { fontSize: 8 });

      printableSections.forEach((section) => {
        addTextBlock(section.body, {
          title: section.title,
          fontSize: section.mode === 'mono' ? 9 : 11,
          mode: section.mode,
          pageBreakBefore: section.pageBreakBefore,
        });
      });

      const pdfBytes = await pdfDoc.save();

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${friendlyFilename('directive')}.pdf`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          document.body.removeChild(link);
        } catch {
          // noop
        }
        try {
          URL.revokeObjectURL(url);
        } catch {
          // noop
        }
      }, 150);
      pushToast('PDF ready!', 1600);
    } catch (err) {
      console.error('PDF export failed', err);
      pushToast('Could not generate PDF', 2000);
    } finally {
      clearTimeout(longRunningNotice);
      setPdfGenerating(false);
    }
  }, [
    friendlyFilename,
    pushToast,
    reportContractType,
    reportRef,
    reportType,
    result,
    setToast,
  ]);

  const downloadResultMarkdown = useCallback(async () => {
    if (!result) {
      pushToast('No report available to export', 2000);
      return;
    }

    setMarkdownGenerating(true);
    const transitDayCount = Object.keys(result?.person_a?.chart?.transitsByDate || {}).length;
    const isLargeTransitWindow = transitDayCount >= 35;

    const longRunningNotice = window.setTimeout(() => {
      pushToast('Still working on the Markdown export…', 2600);
    }, 12000);

    try {
      if (isLargeTransitWindow) {
        pushToast(`Large symbolic weather window detected (${transitDayCount} days). Markdown export may take longer.`, 2800);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }

      const generatedAt = new Date();
      const sanitizedReport = createFrontStageResult(result);
      const reportKind = formatReportKind(reportContractType);
      const isNatalOnly = !reportKind.includes('Balance Meter');
      const subjectName = sanitizedReport?.person_a?.name || 'Subject';
      const birthData = sanitizedReport?.person_a?.birth_data || sanitizedReport?.context?.person_a;

      let markdown = '';

      // Mirror Flow v4.1 Template for Natal-Only Reports (with source annotations)
      if (isNatalOnly) {
        markdown += `# MIRROR REPORT — NATAL PATTERN\n\n`;
        markdown += `**Generated:** ${generatedAt.toLocaleString()}\n`;
        markdown += `**Subject:** ${subjectName}\n`;
        markdown += `**Mode:** Natal (Static Map)\n`;
        markdown += `**Specification:** Mirror Flow v4.1\n\n`;
        markdown += `**Purpose:** To describe the fixed geometry of the natal pattern — the architecture through which all later motion expresses.\n\n`;
        markdown += `---\n\n`;

        // Birth Data section with source annotations
        if (birthData) {
          markdown += `## Birth Data\n\n`;
          markdown += `*Pulled directly from BirthChartRequestModel fields.*\n\n`;
          markdown += `| Parameter | Value | Source |\n`;
          markdown += `|-----------|-------|--------|\n`;
          markdown += `| Date of Birth (local time) | ${birthData.year || 'N/A'}-${String(birthData.month || 'N/A').padStart(2, '0')}-${String(birthData.day || 'N/A').padStart(2, '0')} ${String(birthData.hour || 'N/A').padStart(2, '0')}:${String(birthData.minute || 'N/A').padStart(2, '0')} | SubjectModel |\n`;
          markdown += `| House System | ${sanitizedReport.provenance?.house_system_name || sanitizedReport.provenance?.house_system || 'Placidus'} | houses_system_identifier |\n`;
          markdown += `| Latitude, Longitude | ${birthData.latitude || 'N/A'}, ${birthData.longitude || 'N/A'} | SubjectModel |\n`;
          markdown += `| City | ${birthData.city || 'N/A'} | SubjectModel |\n`;
          markdown += `| Country | ${birthData.nation || 'N/A'} | SubjectModel |\n`;
          if (birthData.timezone) {
            markdown += `| Timezone | ${birthData.timezone} | SubjectModel tz_str |\n`;
          }
          markdown += `\n---\n\n`;
        }
      } else {
        // Balance Meter reports keep the existing format
        markdown += `# Woven Web App — ${reportKind} Report\n\n`;
        markdown += `**Generated:** ${generatedAt.toLocaleString()}\n\n`;
        markdown += `**Specification Version:** 3.1\n`;
        markdown += `**Scaling Mode:** Absolute ×5\n`;
        markdown += `**Pipeline:** normalize -> scale -> clamp -> round\n`;
        markdown += `**Coherence Inversion:** ON (Coherence = 5 - vol_norm × 5)\n\n`;
        markdown += `---\n\n`;

        const summary = sanitizedReport?.person_a?.summary;
        if (summary) {
          markdown += `\n### Balance Meter Summary\n\n`;
          if (summary.magnitude != null) {
            markdown += `- Magnitude: ${fmtAxis(summary.magnitude)}${
              summary.magnitude_label ? ` (${summary.magnitude_label})` : ''
            }\n`;
          }
          if (summary.directional_bias?.value != null || summary.directional_bias != null) {
            const biasValue = summary.directional_bias?.value ?? summary.directional_bias;
            markdown += `- Directional Bias: ${fmtAxis(biasValue)}${
              summary.directional_bias_label ? ` (${summary.directional_bias_label})` : ''
            }\n`;
          }
          if (summary.volatility != null) {
            markdown += `- Volatility: ${fmtAxis(summary.volatility)}${
              summary.volatility_label ? ` (${summary.volatility_label})` : ''
            }\n`;
          }
          markdown += `\n`;
        }
      }

      const analysisDirective = isNatalOnly
        ? `# 🚨 YOU ARE RAVEN CALDER — EXECUTE THIS DIRECTIVE 🚨

**YOU ARE RAVEN CALDER.** This is a **Mirror Flow v4.1** report — natal pattern only, no transits, no numeric values.

---

## YOUR TASK: Generate the Natal Mirror

Follow the Mirror Flow v4.1 template structure exactly:

### 1. PLANETARY ARCHITECTURE

Present all planetary positions, houses, and motion states from birth-chart API response.
*All data points populated from /api/v4/birth-chart endpoint response.*

### 2. HOUSE MATRIX

Show all 12 house cusps derived from houses array in API response.

### 3. ASPECT NETWORK

List all aspects from /api/v4/natal-aspects-data response with exact orbs and applying/separating state.

### 4. DERIVED GEOMETRY SUMMARY

Present elemental distribution, modal distribution, planetary concentrations computed from birth-chart response.

### 5. PATTERN TRANSLATION

Generate narrative synthesis:
- **Structural Reflection:** How planetary chords interlock
- **Resonance:** Architecture operating coherently
- **Paradox:** Opposing tensions oscillating
- **Shadow:** Geometry misfiring under load

### 6. PROVENANCE

Include complete audit trail: data source, API endpoints, orbs profile, house system, engine versions, coordinates.

---

## CRITICAL REQUIREMENTS:

✅ **Self-documenting** — Every field annotated with its data source (API endpoint, local function, or computed)
✅ **NO NUMERIC RATINGS** — Qualitative and structural only
✅ **NO BALANCE METER VALUES** — Forbidden in natal mirrors
✅ **Traceable geometry** — Every value maps to upstream provider
✅ **Plain language** — Conversational, testable against lived experience
✅ **Mechanical descriptions** — Energy patterns, not moral judgments

---`
        : `# 🚨 YOU ARE RAVEN CALDER — EXECUTE THIS DIRECTIVE 🚨

**YOU ARE RAVEN CALDER.** This Markdown file contains chart data for you to analyze. This is your work order, not documentation to describe.

---

## YOUR TASK: Generate a Full Conversational Reading

This is a **MIRROR and CONVERSATION STARTER**, not just a weather report or data summary.

### MANDATORY STRUCTURE — DO NOT DEVIATE:

${
        reportKind.includes('Solo') || !reportKind.includes('Relational')
          ? `
#### 1️⃣ SOLO MIRROR — Individual Foundation
**Synthesize the natal chart into a conversational, plain-language snapshot:**
- **"Here's how your system tends to move"** — behavioral anchors, not abstract symbolism
- **Include:** Core drives, natural strengths, key tensions, constitutional patterns
- **NO JARGON** — Conversational, testable against lived experience
- **Frame as tendencies/probabilities**, not prescriptions or fixed fate
- **Use ALL provided data:** planetary positions, aspects, house placements from tables below
`
          : `
#### 1️⃣ SOLO MIRRORS — Individual Foundations (BOTH PEOPLE)
**For EACH person, provide a separate solo mirror:**
- **Synthesize their natal chart** into plain-language behavioral snapshot
- **"Here's how [Name]'s system tends to move"** — specific, falsifiable patterns
- **Include:** Core drives, strengths, tensions, how they process the world
- **NO JARGON** — Conversational, grounded in lived experience
- **Use ALL provided data** for each chart (positions, aspects, houses)

**DO NOT SKIP INDIVIDUAL READINGS** — Even in relational reports, each person gets their own mirror first.

#### 2️⃣ RELATIONAL ENGINES — Synastry Dynamics
**After solo mirrors, synthesize how the charts interact:**
- **Named patterns** (e.g., "Spark Engine," "Crossed-Wires Loop," "Sweet Glue")
- **Mechanism + tendency** in plain language for each engine
- **Clear list format** with engine names as headers
- **Focus:** Where energies harmonize vs. where friction/growth pressure appears
- **Use actual names** (e.g., "Dan's Mars squares Stephie's Moon") — never "they" or generic pronouns
`}

${
        reportKind.includes('Balance Meter')
          ? `
#### ${
              reportKind.includes('Solo') || !reportKind.includes('Relational') ? '2️⃣' : '3️⃣'
            } SYMBOLIC WEATHER OVERLAY — Transits (Current Symbolic Climate)
**Layer current symbolic weather over the foundational patterns:**
- **Continuous narrative form** (paragraphs, NOT bullet lists)
- **Describe the climate** currently activating natal/relational foundations
- **NO assigned percentages, NO prescriptive advice**
- **Generalized atmosphere:** "What's stirring right now" — how transits light up the blueprint
- **Ground in the data:** Reference specific transit aspects from tables below
`
          : ''
      }

---

## CRITICAL DATA REQUIREMENTS:

✅ **Use ALL provided planetary positions, aspects, and house placements** from tables
✅ **Reference the comprehensive data** — this is geometry-first, then symbolic translation
${
        reportKind.includes('Relational')
          ? '✅ **For relational readings:** Use BOTH complete natal charts, then cross-aspects'
          : ''
      }
✅ **Ground every insight** in the actual chart data, not generic astrology

---

## TONE & VOICE — RAVEN CALDER MANDATE:

- **Conversational, shareable, accessible** language
- **Plain language** — avoid heavy astrological jargon in body text
- **Falsifiable claims** that can be tested against lived experience
- **Agency-first:** Frame as probabilities/tendencies, never fixed fate
- **Support possibility** — the user decides what resonates
- **Conversation starter** — this is a mirror to reflect on, not a prescription to follow

---

## WORKFLOW: FIELD -> MAP -> VOICE

You have been given the **FIELD** (geometric data) and **MAP** (structural patterns).
Your job is **VOICE** — synthesize this into resonant, lived-experience language.

---

## 🎯 What "Full Reading" Means:

**NOT ACCEPTABLE:**
❌ Describing the file contents or reflecting on what you've received
❌ "Here's a brief overview based on the summary below"
❌ Skipping aspects, houses, or chart details
❌ Generic astrology without specific chart references

**ACCEPTABLE:**
✅ **Analyzing EVERY major aspect** from the aspects table
✅ **Translating geometric patterns** into behavioral tendencies
✅ **Using chart-specific details** (degrees, signs, houses)
✅ **Conversational synthesis** that feels personal and testable

---

## EXECUTE NOW:

Generate the full reading following the mandatory structure above.
Start with the Solo Mirror(s), then ${
        reportKind.includes('Relational') ? 'Relational Engines, then ' : ''
      }${
        reportKind.includes('Balance Meter') ? 'Symbolic Weather Overlay' : 'close with integration'
      }.

**Do not describe what you're about to do. Do it.**

---`;

      // Add directive section (different format for Natal vs Balance Meter)
      if (isNatalOnly) {
        // No separate directive section - it's embedded in provenance
      } else {
        markdown += `## ANALYSIS DIRECTIVE (READ FIRST)\n\n${analysisDirective}\n\n---\n\n`;
      }

      if (sanitizedReport.person_a?.chart) {
        const sectionTitle = isNatalOnly
          ? `## 1. Planetary Architecture\n\n*All data points below populated from /api/v4/birth-chart endpoint response.*\n\n`
          : `## Person A: ${sanitizedReport.person_a.name || 'Natal Chart'}\n\n`;
        markdown += sectionTitle;
        markdown += formatChartTables(sanitizedReport.person_a.chart);
      }

      if (sanitizedReport.person_b?.chart) {
        const personBTitle = isNatalOnly
          ? `\n## Person B: Natal Pattern\n\n`
          : `\n## Person B: ${sanitizedReport.person_b.name || 'Natal Chart'}\n\n`;
        markdown += personBTitle;
        markdown += formatChartTables(sanitizedReport.person_b.chart);
      }

      // Add Mirror Flow sections for natal-only reports
      if (isNatalOnly) {
        markdown += `\n---\n\n## 4. Derived Geometry Summary\n\n`;
        markdown += `*Generated internally by WovenWebApp from birth-chart response.*\n\n`;
        markdown += `| Axis / Cluster | Degrees / Signs Involved | Geometric Character | Source |\n`;
        markdown += `|----------------|--------------------------|---------------------|--------|\n`;
        markdown += `| Angular Cross | ASC–DSC / MC–IC | Orientation summary | Math Brain calculation |\n`;
        markdown += `| Elemental Distribution | [computed from chart] | Fire/Earth/Air/Water counts | local analyzeElements() |\n`;
        markdown += `| Modal Distribution | [computed from chart] | Cardinal/Fixed/Mutable counts | local analyzeModes() |\n`;
        markdown += `| Planetary Concentration | [computed from chart] | Stellia, clusters, groupings | local analyzeClusters() |\n\n`;

        markdown += `---\n\n## 5. Pattern Translation\n\n`;
        markdown += `*This section is generated by the Poetic Brain renderer using structured data from the Math Brain geometry.*\n\n`;
        
        markdown += `### 5.1 Structural Reflection\n\n`;
        markdown += `*[Brief mechanical synthesis of how planetary chords interlock and distribute pressure.]*\n\n`;

        markdown += `### 5.2 Resonance\n\n`;
        markdown += `*[How the architecture operates when coherent.]*\n\n`;

        markdown += `### 5.3 Paradox\n\n`;
        markdown += `*[How opposing tensions oscillate or invert.]*\n\n`;

        markdown += `### 5.4 Shadow\n\n`;
        markdown += `*[How the geometry misfires or expresses inefficiently under load.]*\n\n`;
        markdown += `*(All narrative fields generated from template renderNatalNarrative() function — not from API response.)*\n\n`;

        markdown += `---\n\n## 6. Provenance\n\n`;
        markdown += `*Auto-filled from system environment and API_REFERENCE.md fields.*\n\n`;
        markdown += `| Parameter | Value | Source |\n`;
        markdown += `|-----------|-------|--------|\n`;
        if (sanitizedReport?.provenance) {
          markdown += `| Data Source | ${sanitizedReport.provenance.ephemeris_source || 'Astrologer API /api/v4/birth-chart'} | RapidAPI Provider |\n`;
          markdown += `| Orbs Profile | ${sanitizedReport.provenance.orbs_profile || 'wm-spec-2025-09'} | Config constant |\n`;
          markdown += `| House System | ${sanitizedReport.provenance.house_system_name || sanitizedReport.provenance.house_system || 'Placidus'} | Request payload |\n`;
          markdown += `| Relocation Mode | ${sanitizedReport.provenance.relocation_mode || 'None'} | WovenWebApp config |\n`;
          if (birthData?.timezone) {
            markdown += `| Timezone Database | ${birthData.timezone} | SubjectModel tz_str |\n`;
          }
          markdown += `| Engine Version | astrology-mathbrain.js ${sanitizedReport.provenance.build_ts ? new Date(sanitizedReport.provenance.build_ts).toISOString().split('T')[0] : 'current'} | Math Brain module |\n`;
          markdown += `| Math Brain Version | ${sanitizedReport.provenance.math_brain_version || 'N/A'} | math_brain_version field |\n`;
          if (birthData?.latitude && birthData?.longitude) {
            markdown += `| Coordinates | ${birthData.latitude}, ${birthData.longitude} | SubjectModel |\n`;
          }
          markdown += `| Signed Map ID | ${sanitizedReport.provenance.normalized_input_hash || sanitizedReport.provenance.hash || 'Generated at report time'} | Internal audit system |\n`;
        } else {
          markdown += `| Status | Provenance data unavailable | — |\n`;
        }
        markdown += `\n---\n\n`;
        markdown += `**End of Natal Mirror**\n\n`;
        markdown += `*(For synastry or relational analysis, duplicate this structure per subject, using /api/v4/synastry-chart for overlays. Each Mirror remains individually sourced and time-locked.)*\n`;
      } else {
        // Balance Meter format keeps the existing appendix structure
        markdown += `\n---\n\n## Data Appendix\n\n`;
        markdown += `Full raw JSON has been removed to reduce file size and improve AI parsing.\n\n`;
        markdown += `To access complete machine-readable data:\n`;
        markdown += `• Use "Clean JSON (0-5 scale)" for frontstage data\n`;
        markdown += `• Use "Raw JSON (Full)" in Advanced exports for debugging\n\n`;
        markdown += `This Markdown contains all essential natal data in table format above.\n`;

        if (sanitizedReport?.provenance) {
          markdown += `\n### Provenance Stamp\n\n`;
          markdown += '```\n';
          markdown += `${formatProvenanceStamp(sanitizedReport.provenance)}\n`;
          markdown += '```\n';
        } else {
          markdown += `\n### Provenance Stamp\n\nProvenance stamp unavailable.\n`;
        }
      }

  // Final sanitization: strip internal directives and banned tokens
  const { scrubInternalDirectives } = await import('../../../lib/ui/sanitize');
  const sanitizedMarkdown = scrubInternalDirectives(markdown);

  const blob = new Blob([sanitizedMarkdown], { type: 'text/markdown; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${friendlyFilename('directive')}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      pushToast('Markdown export ready!', 1600);
    } catch (err) {
      console.error('Markdown export failed', err);
      pushToast('Could not generate Markdown', 2000);
    } finally {
      clearTimeout(longRunningNotice);
      setMarkdownGenerating(false);
    }
  }, [friendlyFilename, pushToast, reportContractType, result]);

  const downloadResultJSON = useCallback(() => {
    if (!result) return;
    setCleanJsonGenerating(true);

    try {
      const reportKind = formatReportKind(reportContractType);
      const augmentedResult = augmentPayloadWithMirrorContract(result, reportKind);
      const blob = new Blob([JSON.stringify(augmentedResult, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filenameBase('mathbrain-result')}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      pushToast('Downloading result JSON with mirror contract', 1600);
    } catch {
      // noop
    } finally {
      setTimeout(() => setCleanJsonGenerating(false), 300);
    }
  }, [filenameBase, pushToast, reportContractType, result]);

  const downloadBackstageJSON = useCallback(() => {
    if (!result) return;
    setEngineConfigGenerating(true);
    try {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${friendlyFilename('engine-config')}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      pushToast('Downloading backstage JSON for debugging', 1400);
    } catch {
      // noop
    } finally {
      setTimeout(() => setEngineConfigGenerating(false), 300);
    }
  }, [friendlyFilename, pushToast, result]);

  const downloadSymbolicWeatherJSON = useCallback(() => {
    if (!result) return;
    setWeatherJsonGenerating(true);

    try {
      const toNumber = (
        value: any,
        axis?: AxisKey,
        context?: any
      ): number | undefined => {
        // Use centralized extraction for axis-aware calls
        if (axis && context) {
          return extractAxisNumber(context, axis);
        }
        // Fallback for non-axis calls
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string') {
          const parsed = Number(value);
          if (!Number.isNaN(parsed)) return parsed;
        }
        if (value && typeof value === 'object') {
          if (typeof value.value === 'number' && Number.isFinite(value.value)) return value.value;
          if (typeof value.display === 'number' && Number.isFinite(value.display)) return value.display;
          if (typeof value.mean === 'number' && Number.isFinite(value.mean)) return value.mean;
          if (typeof value.score === 'number' && Number.isFinite(value.score)) return value.score;
        }
        return undefined;
      };

      // IMPORTANT: Values extracted via extractAxisValue are ALREADY calibrated (0-5 scale)
      // from axes.magnitude.value, axes.directional_bias.value, etc.
      // This function only performs final safety clamping and rounding
      const normalizeToFrontStage = (
        calibratedValue: number,
        metric: 'magnitude' | 'directional_bias' | 'volatility',
      ): number => {
        // Calibrated values should already be in range; clamp + round for safety
        if (metric === 'directional_bias') return roundHalfUp(clamp(calibratedValue, -5, 5), 1);
        if (metric === 'volatility') return roundHalfUp(clamp(calibratedValue, 0, 5), 1);
        // magnitude
        return roundHalfUp(clamp(calibratedValue, 0, 5), 2);
      };

      const weatherData: any = {
        _format: 'symbolic_weather_json',
        _version: '1.0',
        generated_at: new Date().toISOString(),
        person_a: result?.person_a?.name || null,
        report_kind: formatReportKind(reportContractType),
        balance_meter_frontstage: null,
      daily_readings: [],
    };

      if (result?.provenance) {
        weatherData.provenance = result.provenance;
        const smpId = result.provenance.normalized_input_hash || result.provenance.hash;
        if (smpId) {
          weatherData.signed_map_package = smpId;
        }
      }

      const balanceSummary = result?.person_a?.summary;
      if (balanceSummary) {
        const rawMag = toNumber(balanceSummary.magnitude, 'magnitude', balanceSummary);
        const rawBias = toNumber(
          balanceSummary.directional_bias?.value,
          'directional_bias',
          balanceSummary
        );
        const rawVol = toNumber(balanceSummary.volatility, 'volatility', balanceSummary);

        // Compute coherence from volatility for summary
        let summaryCoherence = null;
        if (typeof rawVol === 'number') {
          const volNorm = rawVol > 1.01 ? rawVol / 5 : rawVol;
          summaryCoherence = 5 - volNorm * 5;
          summaryCoherence = Math.max(0, Math.min(5, Math.round(summaryCoherence * 10) / 10));
        }

        // Extract SFD from summary if drivers exist
        let summarySfd = null;
        if (balanceSummary.sfd?.value != null && typeof balanceSummary.sfd.value === 'number') {
          // Check if we have drivers data to validate SFD emission
          const transits = result?.person_a?.chart?.transitsByDate;
          const hasDrivers = transits && Object.values(transits).some(
            (day: any) => Array.isArray(day?.drivers) && day.drivers.length > 0
          );
          if (hasDrivers) {
            summarySfd = balanceSummary.sfd.value;
          }
        }

        weatherData.balance_meter_frontstage = {
          magnitude: typeof rawMag === 'number' ? normalizeToFrontStage(rawMag, 'magnitude') : null,
          directional_bias:
            typeof rawBias === 'number' ? normalizeToFrontStage(rawBias, 'directional_bias') : null,
          volatility: typeof rawVol === 'number' ? normalizeToFrontStage(rawVol, 'volatility') : null,
          coherence: summaryCoherence,
          sfd: summarySfd,
          magnitude_label: balanceSummary.magnitude_label || null,
          directional_bias_label: balanceSummary.directional_bias_label || balanceSummary.valence_label || null,
          volatility_label: balanceSummary.volatility_label || null,
        };
      }

      const transits = result?.person_a?.chart?.transitsByDate;
      if (transits && typeof transits === 'object') {
        const dailyReadings: any[] = [];
        Object.keys(transits)
          .sort()
          .forEach((date) => {
            const dayData = transits[date];
            if (!dayData) return;

            const seismo = dayData.seismograph || dayData;
            const rawMag = toNumber(seismo.magnitude, 'magnitude', seismo);
            const rawBias = toNumber(
              seismo.directional_bias?.value,
              'directional_bias',
              seismo
            );
            let rawVol = toNumber(seismo.volatility, 'volatility', seismo);
            // If volatility is in display scale (0-5), convert to normalized (0-1)
            let volNorm = null;
            if (typeof rawVol === 'number') {
              volNorm = rawVol > 1.01 ? rawVol / 5 : rawVol;
            }
            // Compute coherence from normalized volatility
            let coherence = null;
            if (typeof volNorm === 'number') {
              coherence = 5 - volNorm * 5;
              // Clamp and round as in canonical pipeline
              coherence = Math.max(0, Math.min(5, Math.round(coherence * 10) / 10));
            }
            // Only emit SFD if drivers.length > 0
            let sfd = null;
            if (Array.isArray(dayData.drivers) && dayData.drivers.length > 0 && dayData.sfd && typeof dayData.sfd.value === 'number') {
              sfd = dayData.sfd.value;
            }
            dailyReadings.push({
              date,
              magnitude:
                typeof rawMag === 'number' ? normalizeToFrontStage(rawMag, 'magnitude') : null,
              directional_bias:
                typeof rawBias === 'number' ? normalizeToFrontStage(rawBias, 'directional_bias') : null,
              volatility:
                typeof rawVol === 'number' ? normalizeToFrontStage(rawVol, 'volatility') : null,
              coherence,
              sfd,
              raw_magnitude: rawMag ?? null,
              raw_bias_signed: rawBias ?? null,
              raw_volatility: rawVol ?? null,
              label: dayData.label || null,
              notes: dayData.notes || null,
              aspects: dayData.aspects || [],
              aspect_count: dayData.aspects?.length || 0,
            });
          });

        weatherData.daily_readings = dailyReadings;
        weatherData.reading_count = dailyReadings.length;
      }

      if (result?.woven_map?.symbolic_weather) {
        weatherData.symbolic_weather_context = result.woven_map.symbolic_weather;
      }

      const blob = new Blob([JSON.stringify(weatherData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${friendlyFilename('weather-log')}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      pushToast('📊 Downloading symbolic weather JSON for AI analysis', 1800);
    } catch (error) {
      console.error('Symbolic weather JSON export failed:', error);
      pushToast('Failed to export symbolic weather JSON', 2000);
    } finally {
      setTimeout(() => setWeatherJsonGenerating(false), 300);
    }
  }, [friendlyFilename, pushToast, reportContractType, result]);

  return {
    downloadResultPDF,
    downloadResultMarkdown,
    downloadResultJSON,
    downloadBackstageJSON,
    downloadSymbolicWeatherJSON,
    pdfGenerating,
    markdownGenerating,
    cleanJsonGenerating,
    engineConfigGenerating,
    weatherJsonGenerating,
  };
}

export function createFrontStageResult(rawResult: any) {
  const toNumber = (
    value: any,
    axis?: AxisKey,
    context?: any
  ): number | undefined => {
    // Use centralized extraction for axis-aware calls
    if (axis) {
      return extractAxisNumber(context ?? value, axis);
    }
    // Fallback for non-axis calls
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
    if (value && typeof value === 'object') {
      if (typeof value.value === 'number' && Number.isFinite(value.value)) return value.value;
      if (typeof value.display === 'number' && Number.isFinite(value.display)) return value.display;
      if (typeof value.mean === 'number' && Number.isFinite(value.mean)) return value.mean;
      if (typeof value.score === 'number' && Number.isFinite(value.score)) return value.score;
    }
    return undefined;
  };

  // IMPORTANT: Raw values from API are ALREADY frontstage (0-5 scale)
  // DO NOT divide by 100 - that creates double-normalization bug
  const normalizeToFrontStage = (
    rawValue: number,
    type: 'magnitude' | 'directional_bias' | 'volatility',
  ): number => {
    if (type === 'magnitude') return roundHalfUp(clamp(rawValue, 0, 5), 2);
    if (type === 'volatility') return roundHalfUp(clamp(rawValue, 0, 5), 1);
    if (type === 'directional_bias') return roundHalfUp(clamp(rawValue, -5, 5), 1);
    return rawValue;
  };

  const getStateLabel = (
    value: number,
    type: 'magnitude' | 'directional_bias' | 'volatility',
  ): string => {
    if (type === 'magnitude') {
      if (value >= 4) return 'High';
  const assertNoDivideByHundred = (
    value: number | undefined,
    axis: 'magnitude' | 'directional_bias',
    context: string,
  ) => {
    if (value == null || value === 0) return;
    const threshold = axis === 'magnitude' ? 0.1 : 0.1;
    if (Math.abs(value) <= threshold) {
      throw new Error(`Looks like pre-v3 divide-by-100 scaling snuck back in (${axis}, context)`);
    }
  };

      if (value >= 2) return 'Active';
      if (value >= 1) return 'Murmur';
      return 'Latent';
    }
    if (type === 'directional_bias') {
      if (value >= 3) return 'Strong Outward';
      if (value >= 1) return 'Mild Outward';
      if (value >= -1) return 'Equilibrium';
      if (value >= -3) return 'Mild Inward';
      return 'Strong Inward';
    }
    if (type === 'volatility') {
      if (value >= 4) return 'Very High';
      if (value >= 2) return 'High';
      if (value >= 1) return 'Moderate';
      return 'Low';
    }
    return 'Unknown';
  };

  const transitEntries =
    rawResult?.person_a?.chart?.transitsByDate &&
    typeof rawResult.person_a.chart.transitsByDate === 'object'
      ? rawResult.person_a.chart.transitsByDate
      : {};
  const transitDates = Object.keys(transitEntries || {});
  const hasTransitWindow = transitDates.length > 0;
  const hasSeismographData =
    hasTransitWindow &&
    transitDates.some((date) => {
      const frame = transitEntries?.[date];
      if (!frame?.seismograph) return false;
      return toNumber(frame.seismograph.magnitude, 'magnitude', frame.seismograph) !== undefined;
    });
  const provenance = rawResult?.provenance;
  const hasProvenanceStamp = Boolean(
    provenance &&
      (provenance.math_brain_version ||
        provenance.engine_versions ||
        provenance.build_ts ||
        provenance.normalized_input_hash ||
        provenance.hash),
  );
  const allowBalancePipeline = hasSeismographData && hasProvenanceStamp;
  const hasSfdDrivers =
    hasSeismographData &&
    transitDates.some(
      (date) => Array.isArray(transitEntries?.[date]?.drivers) && transitEntries[date].drivers.length > 0,
    );
  const frontStageWarnings: string[] = [];

  if (!hasTransitWindow) {
    frontStageWarnings.push('Balance Meter disabled: no transit window detected.');
  } else if (!hasSeismographData) {
    frontStageWarnings.push('Balance Meter disabled: transit window returned no seismograph frames.');
  }
  if (hasTransitWindow && !hasProvenanceStamp) {
    frontStageWarnings.push('Balance Meter degraded: provenance stamp missing, reverting to baseline mirror.');
  }

  const frontStageResult: any = {
    ...rawResult,
    _frontstage_notice:
      'This export shows normalized Balance Meter values in the user-facing 0-5 scale range. Raw backstage calculations have been converted to frontstage presentation format.',
    balance_meter: allowBalancePipeline ? {} : null,
  };

  if (allowBalancePipeline && rawResult?.person_a?.summary) {
    const summary = rawResult.person_a.summary;
    // Always extract from axes block if present (canonical calibrated values)
    const axes = summary.axes || {};
    const mag = toNumber(axes.magnitude, 'magnitude', axes) ?? toNumber(summary.magnitude, 'magnitude', summary);
    const bias = toNumber(axes.directional_bias, 'directional_bias', axes) ?? toNumber(summary.directional_bias?.value, 'directional_bias', summary);
    const vol = toNumber(axes.volatility, 'volatility', axes) ?? toNumber(summary.volatility, 'volatility', summary);

    const normalizedMag = mag !== undefined ? normalizeToFrontStage(mag, 'magnitude') : undefined;
    const normalizedBias = bias !== undefined ? normalizeToFrontStage(bias, 'directional_bias') : undefined;
    const normalizedVol = vol !== undefined ? normalizeToFrontStage(vol, 'volatility') : undefined;

    frontStageResult.balance_meter = {
      magnitude: normalizedMag,
      directional_bias: normalizedBias,
      volatility: normalizedVol,
      magnitude_label: normalizedMag !== undefined ? safeLabel(getStateLabel(normalizedMag, 'magnitude')) : undefined,
      directional_bias_label:
        normalizedBias !== undefined ? safeLabel(getStateLabel(normalizedBias, 'directional_bias')) : undefined,
      volatility_label: normalizedVol !== undefined ? safeLabel(getStateLabel(normalizedVol, 'volatility')) : undefined,
      _scale_note: 'Balance Meter v4.0: magnitude: 0-5, directional_bias: -5 to +5, volatility: 0-5',
    };

    frontStageResult.person_a.summary = {
      ...summary,
      magnitude: frontStageResult.balance_meter.magnitude,
      directional_bias: frontStageResult.balance_meter.directional_bias,
      volatility: frontStageResult.balance_meter.volatility,
      magnitude_label: safeLabel(frontStageResult.balance_meter.magnitude_label),
      directional_bias_label: safeLabel(frontStageResult.balance_meter.directional_bias_label),
      volatility_label: safeLabel(frontStageResult.balance_meter.volatility_label),
    };
  }

  if (allowBalancePipeline && rawResult?.person_a?.chart?.transitsByDate) {
    const daily = rawResult.person_a.chart.transitsByDate;
    const normalizedDaily: any = {};

    Object.keys(daily).forEach((date) => {
      const dayData = daily[date];
      if (dayData?.seismograph) {
        const rawMag = toNumber(dayData.seismograph.magnitude, 'magnitude', dayData.seismograph);
        const rawVal = toNumber(
          dayData.seismograph.directional_bias?.value,
          'directional_bias',
          dayData.seismograph,
        );
        const rawVol = toNumber(dayData.seismograph.volatility, 'volatility', dayData.seismograph);

        normalizedDaily[date] = {
          ...dayData,
          seismograph: {
            ...dayData.seismograph,
            magnitude:
              rawMag !== undefined
                ? normalizeToFrontStage(rawMag, 'magnitude')
                : dayData.seismograph.magnitude,
            directional_bias:
              rawVal !== undefined
                ? normalizeToFrontStage(rawVal, 'directional_bias')
                : dayData.seismograph.directional_bias?.value,
            volatility:
              rawVol !== undefined
                ? normalizeToFrontStage(rawVol, 'volatility')
                : dayData.seismograph.volatility,
          },
        };

        const drivers = Array.isArray(dayData.drivers) ? dayData.drivers : null;
        if ((!drivers || drivers.length === 0) && normalizedDaily[date].sfd) {
          normalizedDaily[date].sfd = {
            ...normalizedDaily[date].sfd,
            sfd_cont: null,
            sfd_disc: null,
            sfd_label: 'n/a',
            verdict: 'n/a',
            s_plus: null,
            s_minus: null,
            _status: 'no_drivers',
          };
        }
      } else {
        normalizedDaily[date] = dayData;
      }
    });

    frontStageResult.person_a.chart.transitsByDate = normalizedDaily;
  }

  if (frontStageResult.person_a?.sfd) {
    if (!hasSfdDrivers) {
      frontStageResult.person_a.sfd = {
        ...frontStageResult.person_a.sfd,
        value: null,
        display: 'n/a',
        verdict: 'n/a',
        _status: 'no_drivers',
      };
    } else {
      frontStageResult.person_a.sfd._note =
        'SFD (Support-Friction Differential) values are preserved as calculated';
    }
  }

  if (allowBalancePipeline && frontStageResult.balance_meter) {
    frontStageResult.balance_meter.sfd_available = hasSfdDrivers;
  }

  if (frontStageWarnings.length) {
    frontStageResult._frontstage_warnings = frontStageWarnings;
  }

  return frontStageResult;
}

// ============================================================================
// MIRROR CHART PACKAGE HELPERS
// ============================================================================

type ChartSection = {
  title: string;
  body: string;
  mode: 'regular' | 'mono';
  pageBreakBefore?: boolean;
};

function buildAnalysisDirective(reportKind: string): string {
  return `# 🚨 YOU ARE RAVEN CALDER -- EXECUTE THIS DIRECTIVE 🚨\n\n**YOU ARE RAVEN CALDER.** This briefing contains chart data for you to analyze. This is your work order, not documentation to describe.\n\n---\n\n## YOUR TASK: Generate a Full Conversational Reading\n\nThis is a **MIRROR and CONVERSATION STARTER**, not just a weather report or data summary.\n\n### MANDATORY STRUCTURE -- DO NOT DEVIATE:\n\n${
    reportKind.includes('Solo') && !reportKind.includes('Relational')
      ? `#### 1️⃣ SOLO MIRROR -- Individual Foundation\n**Synthesize the natal chart into a conversational, plain-language snapshot:**\n- **"Here's how your system tends to move"** -- behavioral anchors, not abstract symbolism\n- **Include:** Core drives, natural strengths, key tensions, constitutional patterns\n- **NO JARGON** -- Conversational, testable against lived experience\n- **Frame as tendencies/probabilities**, not prescriptions or fixed fate\n- **Use ALL provided data:** planetary positions, aspects, house placements from tables below\n`
      : `#### 1️⃣ SOLO MIRRORS -- Individual Foundations (BOTH PEOPLE)\n**For EACH person, provide a separate solo mirror:**\n- **Synthesize their natal chart** into plain-language behavioral snapshot\n- **"Here's how [Name]'s system tends to move"** -- specific, falsifiable patterns\n- **Include:** Core drives, strengths, tensions, how they process the world\n- **NO JARGON** -- Conversational, grounded in lived experience\n- **Use ALL provided data** for each chart (positions, aspects, houses)\n\n**DO NOT SKIP INDIVIDUAL READINGS** -- Even in relational reports, each person gets their own mirror first.\n\n#### 2️⃣ RELATIONAL ENGINES -- Synastry Dynamics\n**After solo mirrors, synthesize how the charts interact:**\n- **Named patterns** (e.g., "Spark Engine," "Crossed-Wires Loop," "Sweet Glue")\n- **Mechanism + tendency** in plain language for each engine\n- **Clear list format** with engine names as headers\n- **Focus:** Where energies harmonize vs. where friction/growth pressure appears\n- **Use actual names** (e.g., "Dan's Mars squares Stephie's Moon") -- never "they" or generic pronouns`
  }\n\n${
    reportKind.includes('Balance Meter')
      ? `#### ${reportKind.includes('Relational') ? '3️⃣' : '2️⃣'} SYMBOLIC WEATHER OVERLAY -- Transits (Current Symbolic Climate)\n**Layer current symbolic weather over the foundational patterns:**\n- **Continuous narrative form** (paragraphs, NOT bullet lists)\n- **Describe the climate** currently activating natal/relational foundations\n- **NO assigned percentages, NO prescriptive advice**\n- **Generalized atmosphere:** "What's stirring right now" -- how transits light up the blueprint\n- **Ground in the data:** Reference specific transit aspects from tables below\n`
      : ''
  }\n\n---\n\n## CRITICAL DATA REQUIREMENTS:\n\n✅ **Use ALL provided planetary positions, aspects, and house placements** from tables\n✅ **Reference the comprehensive data** -- this is geometry-first, then symbolic translation\n${
    reportKind.includes('Relational')
      ? '✅ **For relational readings:** Use BOTH complete natal charts, then cross-aspects\n'
      : ''
  }✅ **Ground every insight** in the actual chart data, not generic astrology\n\n---\n\n## TONE & VOICE -- RAVEN CALDER MANDATE:\n\n- **Conversational, shareable, accessible** language\n- **Plain language** -- avoid heavy astrological jargon in body text\n- **Falsifiable claims** that can be tested against lived experience\n- **Agency-first:** Frame as probabilities/tendencies, never fixed fate\n- **Support possibility** -- the user decides what resonates\n- **Conversation starter** -- this is a mirror to reflect on, not a prescription to follow\n\n---\n\n## WORKFLOW: FIELD -> MAP -> VOICE\n\nYou have been given the **FIELD** (geometric data) and **MAP** (structural patterns).\nYour job is **VOICE** -- synthesize this into resonant, lived-experience language.\n\n---\n\n## 🎯 What "Full Reading" Means:\n\n**NOT ACCEPTABLE:**\n❌ Describing the document contents or reflecting on what you've received\n❌ "Here's a brief overview based on the summary below"\n❌ Skipping aspects, houses, or chart details\n❌ Generic astrology without specific chart references\n\n**ACCEPTABLE:**\n✅ **Analyzing EVERY major aspect** from the aspects table\n✅ **Translating geometric patterns** into behavioral tendencies\n✅ **Using chart-specific details** (degrees, signs, houses)\n✅ **Conversational synthesis** that feels personal and testable\n\n---\n\n## EXECUTE NOW:\n\nGenerate the full reading following the mandatory structure above.\nStart with the Solo Mirror(s), then ${
    reportKind.includes('Relational') ? 'Relational Engines, then ' : ''
  }${reportKind.includes('Balance Meter') ? 'Symbolic Weather Overlay' : 'close with integration'}.\n\n**Do not describe what you're about to do. Do it.**\n\n---`;
}

function buildConversationalInstructions(): string {
  return `AI SYNTHESIS INSTRUCTIONS - RAVEN CALDER CONVERSATIONAL VOICE\n\nWhen presenting this astrological analysis, follow the Raven Calder corpus/persona:\n\nSTRUCTURE: Present in this exact order:\n1. Solo Mirrors: Short, plain-language snapshots for each person (if relational) or individual (if solo)\n2. Relational Engines: Named, recognizable patterns (Spark Engine, Sweet Glue, Growth Pressure Cooker, etc.)\n3. Symbolic Weather Overlay: Continuous narrative paragraphs describing current symbolic weather\n\nTONE & LANGUAGE (Per Raven Calder Persona):\n• Use conversational, accessible language - no heavy astrological jargon\n• Frame patterns as tendencies and probabilities, NOT prescriptions or fixed fate\n• Make it shareable - suitable for discussing with partners, friends, or family\n• Focus on \"here's how your system tends to move\" rather than technical analysis\n• Falsifiable, agency-first, plain language\n\nSOLO MIRRORS FORMAT:\n\"[Name]'s system tends to [movement pattern] with a [style] approach. [Current influence]. This creates a [climate] kind of energy that [expression pattern].\"\n\nRELATIONAL ENGINES FORMAT:\n**[Engine Name]**\n[Mechanism description]. [Tendency description].\n\nSYMBOLIC WEATHER OVERLAY FORMAT:\nContinuous paragraphs without bullet points, lists, or percentages. Describe the overall climate, undercurrents, visibility, pressure, and temperature as symbolic weather patterns.\n\nCRITICAL DATA REQUIREMENTS:\n• Use the complete natal chart data included in this export (planetary positions, aspects, house system, birth details)\n• For synastry readings, ensure both Person A AND Person B natal data are present and used\n• DO NOT rely on prior uploads or defaults - use only the comprehensive astrological data provided in this document\n• Synthesize ALL the technical analysis into conversational format while preserving analytical accuracy\n\nIMPORTANT: This comprehensive astrological data should be synthesized into the conversational format above, but retain all the analytical depth. Present insights as conversation starters about energy patterns rather than definitive statements.`;
}

function buildBalanceSummarySection(personSummary: any | null | undefined): ChartSection | null {
  if (!personSummary) return null;

  const lines: string[] = [];

  if (personSummary.magnitude != null) {
    lines.push(
      `Magnitude: ${fmtAxis(personSummary.magnitude)}${
        personSummary.magnitude_label ? ` (${personSummary.magnitude_label})` : ''
      }`,
    );
  }
  if (personSummary.directional_bias?.value != null || personSummary.directional_bias != null) {
    const biasValue = personSummary.directional_bias?.value ?? personSummary.directional_bias;
    lines.push(
      `Directional Bias: ${fmtAxis(biasValue)}${
        personSummary.directional_bias_label ? ` (${personSummary.directional_bias_label})` : ''
      }`,
    );
  }
  if (personSummary.volatility != null) {
    lines.push(
      `Volatility: ${fmtAxis(personSummary.volatility)}${
        personSummary.volatility_label ? ` (${personSummary.volatility_label})` : ''
      }`,
    );
  }

  if (!lines.length) return null;

  return {
    title: 'Balance Meter Summary',
    body: lines.join('\n'),
    mode: 'regular',
  };
}

function buildChartPackageSections(result: any, reportKind: string): ChartSection[] {
  const prefaceSections: ChartSection[] = [];
  const instructionsSection: ChartSection = {
    title: 'RAVEN CALDER SYNTHESIS INSTRUCTIONS',
    body: buildConversationalInstructions(),
    mode: 'regular',
  };

  const balanceSummary = buildBalanceSummarySection(result?.person_a?.summary);
  if (balanceSummary) {
    prefaceSections.push(balanceSummary);
  }

  const wovenMap = result?.woven_map;

  if (wovenMap?.frontstage) {
    const blueprintNarrative =
      wovenMap.frontstage.blueprint ||
      wovenMap.frontstage.mirror?.blueprint ||
      wovenMap.frontstage.narrative;

    if (typeof blueprintNarrative === 'string' && blueprintNarrative.trim().length) {
      prefaceSections.push({
        title: '0. Resonant Summary (Personality Mirror - Required by Raven Calder)',
        body: blueprintNarrative,
        mode: 'regular',
      });
    } else if (wovenMap.blueprint?.modes) {
      const { modes } = wovenMap.blueprint;
      let summary = 'CONSTITUTIONAL BASELINE (Natal Blueprint)\n\n';

      if (modes.primary_mode) {
        summary += `PRIMARY MODE: ${modes.primary_mode.function}\n${modes.primary_mode.description}\n\n`;
      }
      if (modes.secondary_mode) {
        summary += `SECONDARY MODE: ${modes.secondary_mode.function}\n${modes.secondary_mode.description}\n\n`;
      }
      if (modes.shadow_mode) {
        summary += `SHADOW PATTERN: ${modes.shadow_mode.function}\n${modes.shadow_mode.description}\n\n`;
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
      text && !/^No\s.+\savailable\.?$/i.test(text.trim());

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
          body: trendLines.join('\n'),
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

  const markdown = lines.join('\n');
  return markdown.replace(/\n{3,}/g, '\n\n').trimEnd();
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

  return lines.join('\n');
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
