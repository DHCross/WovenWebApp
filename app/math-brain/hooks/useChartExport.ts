/* eslint-disable no-console */

import { useCallback, useState } from 'react';
import type { MutableRefObject } from 'react';
import { sanitizeReportForPDF } from '../../../src/pdf-sanitizer';
import { renderShareableMirror } from '../../../lib/raven/render';
import type { ReportContractType } from '../types';
import {
  formatReportKind,
  formatNatalSummaryForPDF,
  formatPersonBBlueprintForPDF,
  formatPlanetaryPositionsTable,
  formatHouseCuspsTable,
  formatAspectsTable,
  formatSymbolicWeatherSummary,
  formatChartTables,
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
        if (wovenMap.data_tables.natal_positions && Array.isArray(wovenMap.data_tables.natal_positions)) {
          const positionsText = formatPlanetaryPositionsTable(wovenMap.data_tables.natal_positions);
          sections.push({
            title: 'Planetary Positions (Person A)',
            body: positionsText,
            mode: 'mono',
          });
        }

        if (wovenMap.data_tables.house_cusps && Array.isArray(wovenMap.data_tables.house_cusps)) {
          const cuspsText = formatHouseCuspsTable(wovenMap.data_tables.house_cusps);
          sections.push({
            title: 'House Cusps (Person A)',
            body: cuspsText,
            mode: 'mono',
          });
        }

        if (wovenMap.data_tables.natal_aspects && Array.isArray(wovenMap.data_tables.natal_aspects)) {
          const aspectsText = formatAspectsTable(wovenMap.data_tables.natal_aspects);
          sections.push({
            title: 'Major Aspects (Person A)',
            body: aspectsText,
            mode: 'mono',
          });
        }

        if (
          wovenMap.data_tables.person_b_positions &&
          Array.isArray(wovenMap.data_tables.person_b_positions)
        ) {
          const positionsBText = formatPlanetaryPositionsTable(
            wovenMap.data_tables.person_b_positions,
          );
          sections.push({
            title: 'Planetary Positions (Person B)',
            body: positionsBText,
            mode: 'mono',
          });
        }

        if (
          wovenMap.data_tables.person_b_house_cusps &&
          Array.isArray(wovenMap.data_tables.person_b_house_cusps)
        ) {
          const cuspsBText = formatHouseCuspsTable(wovenMap.data_tables.person_b_house_cusps);
          sections.push({
            title: 'House Cusps (Person B)',
            body: cuspsBText,
            mode: 'mono',
          });
        }

        if (wovenMap.data_tables.synastry_aspects) {
          const synAspectsText = formatAspectsTable(wovenMap.data_tables.synastry_aspects);
          sections.push({
            title: 'Synastry Aspects',
            body: synAspectsText,
            mode: 'mono',
          });
        }

        if (wovenMap.data_tables.daily_readings && Array.isArray(wovenMap.data_tables.daily_readings)) {
          const readings = wovenMap.data_tables.daily_readings;
          const trendLines: string[] = [];

          if (readings.length > 0) {
            const avgMag =
              readings.reduce((sum: number, r: any) => sum + (r.magnitude || 0), 0) /
              readings.length;
            const avgVal =
              readings.reduce((sum: number, r: any) => sum + (r.valence || 0), 0) /
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

## WORKFLOW: FIELD → MAP → VOICE

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

      sections.unshift({
        title: '⚠️ ANALYSIS DIRECTIVE (READ FIRST)',
        body: analysisDirective,
        mode: 'regular',
      });

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
      addTextBlock(`Scaling Mode: Absolute ×50`, { fontSize: 10 });
      addTextBlock(`Pipeline: normalize → scale → clamp → round`, { fontSize: 10 });
      addTextBlock('', { fontSize: 8 });

      sections.forEach((section) => {
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

      let markdown = `# Woven Web App — ${reportKind} Report\n\n`;
      markdown += `**Generated:** ${generatedAt.toLocaleString()}\n\n`;
      markdown += `**Specification Version:** 3.1\n`;
      markdown += `**Scaling Mode:** Absolute ×50\n`;
      markdown += `**Pipeline:** normalize → scale → clamp → round\n\n`;
      markdown += `---\n\n`;

      const summary = sanitizedReport?.person_a?.summary;
      if (summary) {
        markdown += `### Balance Meter Summary\n\n`;
        if (summary.magnitude != null) {
          markdown += `- Magnitude: ${summary.magnitude}${
            summary.magnitude_label ? ` (${summary.magnitude_label})` : ''
          }\n`;
        }
        if (summary.valence != null) {
          markdown += `- Valence: ${summary.valence}${
            summary.valence_label ? ` (${summary.valence_label})` : ''
          }\n`;
        }
        if (summary.bias_signed != null && summary.bias_signed !== summary.valence) {
          markdown += `- Directional Bias: ${summary.bias_signed}${
            summary.directional_bias_label ? ` (${summary.directional_bias_label})` : ''
          }\n`;
        }
        if (summary.volatility != null) {
          markdown += `- Volatility: ${summary.volatility}${
            summary.volatility_label ? ` (${summary.volatility_label})` : ''
          }\n`;
        }
        markdown += `\n`;
      }

      const analysisDirective = `# 🚨 YOU ARE RAVEN CALDER — EXECUTE THIS DIRECTIVE 🚨

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

## WORKFLOW: FIELD → MAP → VOICE

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

      markdown += `## ⚠️ ANALYSIS DIRECTIVE (READ FIRST)\n\n${analysisDirective}\n\n---\n\n`;

      if (sanitizedReport.person_a?.chart) {
        markdown += `## Person A: ${sanitizedReport.person_a.name || 'Natal Chart'}\n\n`;
        markdown += formatChartTables(sanitizedReport.person_a.chart);
      }

      if (sanitizedReport.person_b?.chart) {
        markdown += `\n## Person B: ${sanitizedReport.person_b.name || 'Natal Chart'}\n\n`;
        markdown += formatChartTables(sanitizedReport.person_b.chart);
      }

      markdown += `\n---\n\n## Data Appendix\n\n`;
      markdown += `Full raw JSON has been removed to reduce file size and improve AI parsing.\n\n`;
      markdown += `To access complete machine-readable data:\n`;
      markdown += `• Use "Clean JSON (0-5 scale)" for frontstage data\n`;
      markdown += `• Use "Raw JSON (Full)" in Advanced exports for debugging\n\n`;
      markdown += `This Markdown contains all essential natal data in table format above.\n`;

      const blob = new Blob([markdown], { type: 'text/markdown; charset=utf-8' });
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
      const toNumber = (value: any): number | undefined => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string') {
          const parsed = Number(value);
          if (!Number.isNaN(parsed)) return parsed;
        }
        if (value && typeof value === 'object') {
          if (typeof value.value === 'number' && Number.isFinite(value.value)) return value.value;
          if (typeof value.mean === 'number' && Number.isFinite(value.mean)) return value.mean;
          if (typeof value.score === 'number' && Number.isFinite(value.score)) return value.score;
        }
        return undefined;
      };

      const normalizeToFrontStage = (
        rawValue: number,
        metric: 'magnitude' | 'directional_bias' | 'volatility',
      ): number => {
        if (metric === 'directional_bias') {
          const clamped = Math.max(-500, Math.min(500, rawValue));
          return Number((clamped / 100).toFixed(2));
        }
        const clamped = Math.max(0, Math.min(500, rawValue));
        return Number((clamped / 100).toFixed(2));
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

      const balanceSummary = result?.person_a?.summary;
      if (balanceSummary) {
        const rawMag = toNumber(balanceSummary.magnitude);
        const rawBias = toNumber(balanceSummary.bias_signed ?? balanceSummary.valence);
        const rawVol = toNumber(balanceSummary.volatility);

        weatherData.balance_meter_frontstage = {
          magnitude: typeof rawMag === 'number' ? normalizeToFrontStage(rawMag, 'magnitude') : null,
          directional_bias:
            typeof rawBias === 'number' ? normalizeToFrontStage(rawBias, 'directional_bias') : null,
          volatility: typeof rawVol === 'number' ? normalizeToFrontStage(rawVol, 'volatility') : null,
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
            const rawMag = toNumber(seismo.magnitude);
            const rawBias = toNumber(seismo.bias_signed ?? seismo.valence_bounded ?? seismo.valence);
            const rawVol = toNumber(seismo.volatility);

            dailyReadings.push({
              date,
              magnitude:
                typeof rawMag === 'number' ? normalizeToFrontStage(rawMag, 'magnitude') : null,
              directional_bias:
                typeof rawBias === 'number' ? normalizeToFrontStage(rawBias, 'directional_bias') : null,
              volatility:
                typeof rawVol === 'number' ? normalizeToFrontStage(rawVol, 'volatility') : null,
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

function createFrontStageResult(rawResult: any) {
  const toNumber = (value: any): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
    if (value && typeof value === 'object') {
      if (typeof value.value === 'number' && Number.isFinite(value.value)) return value.value;
      if (typeof value.mean === 'number' && Number.isFinite(value.mean)) return value.mean;
      if (typeof value.score === 'number' && Number.isFinite(value.score)) return value.score;
    }
    return undefined;
  };

  const normalizeToFrontStage = (
    rawValue: number,
    type: 'magnitude' | 'directional_bias' | 'volatility',
  ): number => {
    if (type === 'magnitude' || type === 'volatility') {
      return Math.min(5, Math.max(0, Math.round((rawValue / 100) * 10) / 10));
    }
    if (type === 'directional_bias') {
      return Math.min(5, Math.max(-5, Math.round((rawValue / 100) * 10) / 10));
    }
    return rawValue;
  };

  const getStateLabel = (
    value: number,
    type: 'magnitude' | 'directional_bias' | 'volatility',
  ): string => {
    if (type === 'magnitude') {
      if (value >= 4) return 'High';
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

  const frontStageResult: any = {
    ...rawResult,
    _frontstage_notice:
      'This export shows normalized Balance Meter values in the user-facing 0-5 scale range. Raw backstage calculations have been converted to frontstage presentation format.',
    balance_meter: {},
  };

  if (rawResult?.person_a?.summary) {
    const summary = rawResult.person_a.summary;
    const rawMag = toNumber(summary.magnitude);
    const rawVal = toNumber(summary.bias_signed ?? summary.valence_bounded ?? summary.valence);
    const rawVol = toNumber(summary.volatility);

    const normalizedMag = rawMag ? normalizeToFrontStage(rawMag, 'magnitude') : undefined;
    const normalizedBias = rawVal ? normalizeToFrontStage(rawVal, 'directional_bias') : undefined;
    const normalizedVol = rawVol ? normalizeToFrontStage(rawVol, 'volatility') : undefined;

    frontStageResult.balance_meter = {
      magnitude: normalizedMag,
      directional_bias: normalizedBias,
      valence: normalizedBias,
      volatility: normalizedVol,
      magnitude_label: normalizedMag !== undefined ? getStateLabel(normalizedMag, 'magnitude') : undefined,
      directional_bias_label:
        normalizedBias !== undefined ? getStateLabel(normalizedBias, 'directional_bias') : undefined,
      valence_label:
        normalizedBias !== undefined ? getStateLabel(normalizedBias, 'directional_bias') : undefined,
      volatility_label: normalizedVol !== undefined ? getStateLabel(normalizedVol, 'volatility') : undefined,
      _scale_note: 'magnitude: 0-5, directional_bias: -5 to +5, volatility: 0-5',
    };

    frontStageResult.person_a.summary = {
      ...summary,
      magnitude: frontStageResult.balance_meter.magnitude,
      valence: frontStageResult.balance_meter.valence,
      bias_signed: frontStageResult.balance_meter.directional_bias,
      volatility: frontStageResult.balance_meter.volatility,
      magnitude_label: frontStageResult.balance_meter.magnitude_label,
      valence_label: frontStageResult.balance_meter.valence_label,
      volatility_label: frontStageResult.balance_meter.volatility_label,
    };
  }

  if (rawResult?.person_a?.chart?.transitsByDate) {
    const daily = rawResult.person_a.chart.transitsByDate;
    const normalizedDaily: any = {};

    Object.keys(daily).forEach((date) => {
      const dayData = daily[date];
      if (dayData?.seismograph) {
        const rawMag = toNumber(dayData.seismograph.magnitude);
        const rawVal = toNumber(
          dayData.seismograph.bias_signed ?? dayData.seismograph.valence_bounded ?? dayData.seismograph.valence,
        );
        const rawVol = toNumber(dayData.seismograph.volatility);

        normalizedDaily[date] = {
          ...dayData,
          seismograph: {
            ...dayData.seismograph,
            magnitude: rawMag ? normalizeToFrontStage(rawMag, 'magnitude') : dayData.seismograph.magnitude,
            valence: rawVal ? normalizeToFrontStage(rawVal, 'directional_bias') : dayData.seismograph.valence,
            bias_signed: rawVal ? normalizeToFrontStage(rawVal, 'directional_bias') : dayData.seismograph.bias_signed,
            volatility: rawVol ? normalizeToFrontStage(rawVol, 'volatility') : dayData.seismograph.volatility,
          },
        };
      } else {
        normalizedDaily[date] = dayData;
      }
    });

    frontStageResult.person_a.chart.transitsByDate = normalizedDaily;
  }

  if (frontStageResult.person_a?.sfd) {
    frontStageResult.person_a.sfd._note =
      'SFD (Support-Friction Differential) values are preserved as calculated';
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
  return `AI SYNTHESIS INSTRUCTIONS - RAVEN CALDER CONVERSATIONAL VOICE\n\nWhen presenting this astrological analysis, follow the Raven Calder corpus/persona:\n\nSTRUCTURE: Present in this exact order:\n1. Solo Mirrors: Short, plain-language snapshots for each person (if relational) or individual (if solo)\n2. Relational Engines: Named, recognizable patterns (Spark Engine, Sweet Glue, Growth Pressure Cooker, etc.)\n3. Symbolic Weather Overlay: Continuous narrative paragraphs describing current symbolic weather\n\nTONE & LANGUAGE (Per Raven Calder Persona):\n• Use conversational, accessible language - no heavy astrological jargon\n• Frame patterns as tendencies and probabilities, NOT prescriptions or fixed fate\n• Make it shareable - suitable for discussing with partners, friends, or family\n• Focus on "here's how your system tends to move" rather than technical analysis\n• Falsifiable, agency-first, plain language\n\nSOLO MIRRORS FORMAT:\n"[Name]'s system tends to [movement pattern] with a [style] approach. [Current influence]. This creates a [climate] kind of energy that [expression pattern]."\n\nRELATIONAL ENGINES FORMAT:\n**[Engine Name]**\n[Mechanism description]. [Tendency description].\n\nSYMBOLIC WEATHER OVERLAY FORMAT:\nContinuous paragraphs without bullet points, lists, or percentages. Describe the overall climate, undercurrents, visibility, pressure, and temperature as symbolic weather patterns.\n\nCRITICAL DATA REQUIREMENTS:\n• Use the complete natal chart data included in this export (planetary positions, aspects, house system, birth details)\n• For synastry readings, ensure both Person A AND Person B natal data are present and used\n• DO NOT rely on prior uploads or defaults - use only the comprehensive astrological data provided in this document\n• Synthesize ALL the technical analysis into conversational format while preserving analytical accuracy\n\nIMPORTANT: This comprehensive astrological data should be synthesized into the conversational format above, but retain all the analytical depth. Present insights as conversation starters about energy patterns rather than definitive statements.`;
}

function buildBalanceSummarySection(personSummary: any | null | undefined): ChartSection | null {
  if (!personSummary) return null;

  const lines: string[] = [];

  if (personSummary.magnitude != null) {
    lines.push(
      `Magnitude: ${personSummary.magnitude}${
        personSummary.magnitude_label ? ` (${personSummary.magnitude_label})` : ''
      }`,
    );
  }
  if (personSummary.valence != null) {
    lines.push(
      `Valence: ${personSummary.valence}${
        personSummary.valence_label ? ` (${personSummary.valence_label})` : ''
      }`,
    );
  }
  if (personSummary.bias_signed != null && personSummary.bias_signed !== personSummary.valence) {
    lines.push(
      `Directional Bias: ${personSummary.bias_signed}${
        personSummary.directional_bias_label ? ` (${personSummary.directional_bias_label})` : ''
      }`,
    );
  }
  if (personSummary.volatility != null) {
    lines.push(
      `Volatility: ${personSummary.volatility}${
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
    if (wovenMap.data_tables.natal_positions && Array.isArray(wovenMap.data_tables.natal_positions)) {
      const positionsText = formatPlanetaryPositionsTable(wovenMap.data_tables.natal_positions);
      bodySections.push({
        title: 'Planetary Positions (Person A)',
        body: positionsText,
        mode: 'mono',
      });
    }

    if (wovenMap.data_tables.house_cusps && Array.isArray(wovenMap.data_tables.house_cusps)) {
      const cuspsText = formatHouseCuspsTable(wovenMap.data_tables.house_cusps);
      bodySections.push({
        title: 'House Cusps (Person A)',
        body: cuspsText,
        mode: 'mono',
      });
    }

    if (wovenMap.data_tables.natal_aspects && Array.isArray(wovenMap.data_tables.natal_aspects)) {
      const aspectsText = formatAspectsTable(wovenMap.data_tables.natal_aspects);
      bodySections.push({
        title: 'Major Aspects (Person A)',
        body: aspectsText,
        mode: 'mono',
      });
    }

    if (
      wovenMap.data_tables.person_b_positions &&
      Array.isArray(wovenMap.data_tables.person_b_positions)
    ) {
      const positionsBText = formatPlanetaryPositionsTable(
        wovenMap.data_tables.person_b_positions,
      );
      bodySections.push({
        title: 'Planetary Positions (Person B)',
        body: positionsBText,
        mode: 'mono',
      });
    }

    if (
      wovenMap.data_tables.person_b_house_cusps &&
      Array.isArray(wovenMap.data_tables.person_b_house_cusps)
    ) {
      const cuspsBText = formatHouseCuspsTable(wovenMap.data_tables.person_b_house_cusps);
      bodySections.push({
        title: 'House Cusps (Person B)',
        body: cuspsBText,
        mode: 'mono',
      });
    }

    if (wovenMap.data_tables.synastry_aspects) {
      const synAspectsText = formatAspectsTable(wovenMap.data_tables.synastry_aspects);
      bodySections.push({
        title: 'Synastry Aspects',
        body: synAspectsText,
        mode: 'mono',
      });
    }

    if (wovenMap.data_tables.daily_readings && Array.isArray(wovenMap.data_tables.daily_readings)) {
      const readings = wovenMap.data_tables.daily_readings;
      const trendLines: string[] = [];

      if (readings.length > 0) {
        const avgMag =
          readings.reduce((sum: number, r: any) => sum + (r.magnitude || 0), 0) /
          readings.length;
        const avgVal =
          readings.reduce((sum: number, r: any) => sum + (r.valence || 0), 0) /
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

function augmentPayloadWithMirrorContract(payload: any, reportKind: string) {
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
      },
    },
  };
}
