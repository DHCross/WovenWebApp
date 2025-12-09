/**
 * Clear Mirror Export Builder
 * 
 * Converts ReportContext (from ChatClient) into ClearMirrorData for PDF generation.
 * Supports both:
 * 1. Structured LLM responses (from auto-execution with Clear Mirror sections)
 * 2. Legacy format (direct content without structure)
 */

import type { ClearMirrorData } from '@/lib/templates/clear-mirror-template';
import type { RelocationSummary } from '@/lib/relocation';
import { parseClearMirrorResponse, hasValidClearMirrorStructure } from '@/lib/raven/clear-mirror-parser';

interface ReportContext {
  id: string;
  type: 'mirror' | 'balance';
  name: string;
  summary: string;
  content: string;
  relocation?: RelocationSummary;
}

export interface SessionDiagnostics {
  actorRoleComposite?: {
    actor: string;
    role: string;
    composite: string;
    confidence: number;
    confidenceBand: 'LOW' | 'MODERATE' | 'HIGH';
    siderealDrift?: boolean;
    driftBand?: 'NONE' | 'POSSIBLE' | 'STRONG';
    driftIndex?: number;
    evidenceN?: number;
    sampleSize?: number;
  };
  sessionStats?: {
    totalMirrors: number;
    accuracyRate: number;
    clarityRate: number;
    breakdown: {
      wb: number;
      abe: number;
      osr: number;
      pending: number;
    };
  };
  rubricScores?: {
    pressure: number;
    outlet: number;
    conflict: number;
    tone: number;
    surprise: number;
    totalScore: number;
    scoreBand: string;
    nullCount?: number;
  };
}

/**
 * Extracts person names from report contexts by parsing the JSON content
 * Solo: returns [personA]
 * Relational: returns [personA, personB]
 */
function extractPersonNames(contexts: ReportContext[]): { personA: string; personB?: string } {
  if (contexts.length === 0) {
    return { personA: 'Unknown' };
  }

  // Try to parse JSON content to get actual person names from the chart data
  const primaryContent = contexts[0]?.content || '';
  try {
    const parsed = JSON.parse(primaryContent);

    // Extract person A name from various possible locations in the JSON
    const personAName =
      parsed?.person_a?.name ||
      parsed?.person_a?.details?.name ||
      parsed?.personA?.name ||
      parsed?.personA?.details?.name ||
      parsed?.context?.natal?.name ||
      parsed?.natal?.name ||
      null;

    // Extract person B name for relational charts
    const personBName =
      parsed?.person_b?.name ||
      parsed?.person_b?.details?.name ||
      parsed?.personB?.name ||
      parsed?.personB?.details?.name ||
      null;

    if (personAName) {
      return {
        personA: personAName,
        personB: personBName || undefined
      };
    }
  } catch {
    // JSON parse failed, fall back to context name
  }

  // Fall back to extracting from context name
  if (contexts.length === 1) {
    // Try to extract name from "Mirror Directive for [Name]" format
    const match = contexts[0].name?.match(/(?:Mirror Directive for|Relational Mirror:)\s*(.+?)(?:\s*↔|$)/i);
    return { personA: match?.[1]?.trim() || contexts[0].name || 'Person A' };
  }

  // Relational report (2 contexts)
  return {
    personA: contexts[0]?.name || 'Person A',
    personB: contexts[1]?.name || 'Person B'
  };
}

/**
 * Determines intimacy tier from context
 * This is a placeholder - in production, this would come from user input
 */
function determineIntimacyTier(contexts: ReportContext[]): string | undefined {
  if (contexts.length < 2) return undefined;

  // Default to Partner tier for relational charts
  // Future: Extract from reportContexts metadata or user selection
  return 'Partner: P5a';
}

/**
 * Extract chart geometry from JSON content
 * Returns a structured summary of the actual chart data
 */
interface ChartGeometry {
  personName: string;
  ascendant?: string;
  mc?: string;
  sunSign?: string;
  sunHouse?: number;
  moonSign?: string;
  moonHouse?: number;
  mercurySign?: string;
  venusSign?: string;
  marsSign?: string;
  marsHouse?: number;
  jupiterSign?: string;
  saturnSign?: string;
  uranusSign?: string;
  neptuneSign?: string;
  plutoSign?: string;
  birthData?: {
    year?: number;
    month?: number;
    day?: number;
    city?: string;
  };
}

function extractChartGeometry(content: string): ChartGeometry | null {
  try {
    const data = JSON.parse(content);
    const personA = data?.person_a || data?.personA;
    if (!personA?.chart?.positions) return null;

    const positions = personA.chart.positions;
    const anglesSigns = personA.chart.angle_signs || {};

    return {
      personName: personA.name || 'Unknown',
      ascendant: anglesSigns.ascendant || positions.First_House?.sign,
      mc: anglesSigns.mc || positions.Tenth_House?.sign,
      sunSign: positions.Sun?.sign,
      sunHouse: positions.Sun?.house,
      moonSign: positions.Moon?.sign,
      moonHouse: positions.Moon?.house,
      mercurySign: positions.Mercury?.sign,
      venusSign: positions.Venus?.sign,
      marsSign: positions.Mars?.sign,
      marsHouse: positions.Mars?.house,
      jupiterSign: positions.Jupiter?.sign,
      saturnSign: positions.Saturn?.sign,
      uranusSign: positions.Uranus?.sign,
      neptuneSign: positions.Neptune?.sign,
      plutoSign: positions.Pluto?.sign,
      birthData: personA.birth_data ? {
        year: personA.birth_data.year,
        month: personA.birth_data.month,
        day: personA.birth_data.day,
        city: personA.birth_data.city,
      } : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Format sign abbreviation to full name
 */
function expandSign(abbrev: string | undefined): string {
  if (!abbrev) return 'Unknown';
  const signs: Record<string, string> = {
    'Ari': 'Aries', 'Tau': 'Taurus', 'Gem': 'Gemini', 'Can': 'Cancer',
    'Leo': 'Leo', 'Vir': 'Virgo', 'Lib': 'Libra', 'Sco': 'Scorpio',
    'Sag': 'Sagittarius', 'Cap': 'Capricorn', 'Aqu': 'Aquarius', 'Pis': 'Pisces'
  };
  return signs[abbrev] || abbrev;
}

/**
 * Generate chart summary text from geometry
 */
function generateChartSummary(geo: ChartGeometry): string {
  const parts: string[] = [];

  if (geo.ascendant) {
    parts.push(`${expandSign(geo.ascendant)} Rising`);
  }
  if (geo.sunSign && geo.sunHouse) {
    parts.push(`Sun in ${expandSign(geo.sunSign)} (House ${geo.sunHouse})`);
  }
  if (geo.moonSign && geo.moonHouse) {
    parts.push(`Moon in ${expandSign(geo.moonSign)} (House ${geo.moonHouse})`);
  }

  return parts.join(' • ');
}

/**
 * Builds Clear Mirror data from report contexts.
 * 
 * Attempts to parse structured LLM response first (auto-execution format).
 * Falls back to template-based construction if structure not found.
 * 
 * @param contexts - Report contexts from Math Brain or Poetic Brain
 * @param sessionDiagnostics - Optional session validation data
 */
export function buildClearMirrorFromContexts(
  contexts: ReportContext[],
  sessionDiagnostics?: SessionDiagnostics
): ClearMirrorData {
  const { personA, personB } = extractPersonNames(contexts);
  // FIX: Check for personB inside JSON content, not just number of contexts
  // A single relational JSON file contains both person_a and person_b
  const isRelational = contexts.length === 2 || !!personB;
  const timestamp = new Date().toISOString();

  // Try to parse structured LLM response from first context content
  const primaryContent = contexts[0]?.content || '';
  const parsed = parseClearMirrorResponse(primaryContent);

  // If LLM response has valid Clear Mirror structure, use it
  if (hasValidClearMirrorStructure(parsed)) {
    return buildFromStructuredResponse(parsed, personA, personB, isRelational, timestamp, sessionDiagnostics);
  }

  // Otherwise, use template-based construction (legacy/fallback)
  return buildFromTemplate(contexts, personA, personB, isRelational, timestamp, sessionDiagnostics);
}

/**
 * Build Clear Mirror from structured LLM sections
 */
function buildFromStructuredResponse(
  parsed: ReturnType<typeof parseClearMirrorResponse>,
  personA: string,
  personB: string | undefined,
  isRelational: boolean,
  timestamp: string,
  sessionDiagnostics?: SessionDiagnostics
): ClearMirrorData {
  const data: ClearMirrorData = {
    personName: personA,
    date: timestamp,
    chartType: isRelational ? 'relational' : 'solo',

    // Add relational fields if applicable
    ...(isRelational && personB ? {
      personBName: personB,
    } : {}),

    // Map parsed Hook Stack to ClearMirrorData structure
    hookStack: parsed.hookStack?.map(hook => ({
      headline: hook.headline,
      livedExample: hook.body, // Parser's 'body' maps to template's 'livedExample'
      geometry: undefined // Geometry embedded in body text with footnotes
    })),

    preface: isRelational
      ? `This relational mirror translates symbolic overlays between ${personA} and ${personB} into testable hypotheses. The geometry reveals what each person's natal structure activates in the other—friction points, resonant frequencies, directional weather patterns. These dynamics predict nothing; they offer coordinates for recognition. Accuracy emerges only through lived comparison.`
      : `This reflection draws from symbolic geometry rather than observed behavior. It outlines tendencies the natal pattern could imply—hypotheses to test in lived experience. The chart translates planetary positions at birth into language patterns you can verify against your actual life.`,

    // Use parsed frontstage or fall back to empty
    frontstage: parsed.frontstage ? {
      text: parsed.frontstage,
      footnotes: []
    } : {
      text: '',
      footnotes: []
    },

    // Map polarity cards if present
    polarityCards: parsed.polarityCards?.map(card => ({
      title: card.title,
      text: card.body,
      footnote: '' // Footnotes embedded in body text already
    })),

    // Use Mirror Voice as mirror voice (not resonant summary)
    mirrorVoice: parsed.mirrorVoice ? {
      text: parsed.mirrorVoice,
      footnotes: []
    } : undefined,

    // Socratic Closure with proper structure
    socraticClosure: parsed.socraticClosure ? {
      text: parsed.socraticClosure,
      includeMarkingGuide: true
    } : {
      includeMarkingGuide: true // Always include marking guide even if no custom text
    },

    // Add session diagnostics if provided
    sessionDiagnostics: sessionDiagnostics
  };

  return data;
}

/**
 * Build Clear Mirror from template using ACTUAL chart data from JSON
 * CRITICAL: This must extract real geometry from the uploaded file, not use hardcoded placeholders
 */
function buildFromTemplate(
  contexts: ReportContext[],
  personA: string,
  personB: string | undefined,
  isRelational: boolean,
  timestamp: string,
  sessionDiagnostics?: SessionDiagnostics
): ClearMirrorData {

  // Extract actual chart geometry from the context content
  const primaryContent = contexts[0]?.content || '';
  const chartGeo = extractChartGeometry(primaryContent);
  const chartSummary = chartGeo ? generateChartSummary(chartGeo) : 'Chart geometry not available';

  // Build a geometry-based frontstage that uses REAL data
  const buildFrontstageFromGeometry = (geo: ChartGeometry | null): string => {
    if (!geo) {
      return `This mirror report is for ${personA}. The chart data could not be parsed for detailed interpretation. Please ensure the uploaded JSON contains valid chart geometry.`;
    }

    const parts: string[] = [];
    parts.push(`**Natal Blueprint for ${geo.personName}**\n`);

    if (geo.birthData?.city) {
      parts.push(`Birth location: ${geo.birthData.city}`);
    }
    if (geo.birthData?.year && geo.birthData?.month && geo.birthData?.day) {
      parts.push(`Born: ${geo.birthData.month}/${geo.birthData.day}/${geo.birthData.year}`);
    }
    parts.push('');

    // Core identity markers
    parts.push('**Core Identity Markers:**');
    if (geo.ascendant) {
      parts.push(`• Ascendant: ${expandSign(geo.ascendant)} — the lens through which the world first encounters you`);
    }
    if (geo.sunSign && geo.sunHouse) {
      parts.push(`• Sun: ${expandSign(geo.sunSign)} in House ${geo.sunHouse} — core identity and vital expression`);
    }
    if (geo.moonSign && geo.moonHouse) {
      parts.push(`• Moon: ${expandSign(geo.moonSign)} in House ${geo.moonHouse} — emotional nature and inner security needs`);
    }
    parts.push('');

    // Personal planets
    parts.push('**Personal Planets:**');
    if (geo.mercurySign) {
      parts.push(`• Mercury in ${expandSign(geo.mercurySign)} — thought patterns and communication style`);
    }
    if (geo.venusSign) {
      parts.push(`• Venus in ${expandSign(geo.venusSign)} — values, aesthetics, and relational approach`);
    }
    if (geo.marsSign && geo.marsHouse) {
      parts.push(`• Mars in ${expandSign(geo.marsSign)} (House ${geo.marsHouse}) — drive, assertion, and action style`);
    }
    parts.push('');

    // Outer planets (generational but personalized by house)
    parts.push('**Generational Signatures:**');
    if (geo.jupiterSign) {
      parts.push(`• Jupiter in ${expandSign(geo.jupiterSign)} — expansion, faith, and growth patterns`);
    }
    if (geo.saturnSign) {
      parts.push(`• Saturn in ${expandSign(geo.saturnSign)} — structure, discipline, and maturation themes`);
    }
    if (geo.uranusSign) {
      parts.push(`• Uranus in ${expandSign(geo.uranusSign)} — innovation, rebellion, and breakthrough areas`);
    }
    if (geo.neptuneSign) {
      parts.push(`• Neptune in ${expandSign(geo.neptuneSign)} — dreams, spirituality, and dissolution themes`);
    }
    if (geo.plutoSign) {
      parts.push(`• Pluto in ${expandSign(geo.plutoSign)} — transformation, power, and regeneration`);
    }

    return parts.join('\n');
  };

  const frontstageText = buildFrontstageFromGeometry(chartGeo);

  const data: ClearMirrorData = {
    personName: personA,
    date: timestamp,
    chartType: isRelational ? 'relational' : 'solo',

    // Add relational fields if applicable
    ...(isRelational && personB ? {
      personBName: personB,
      intimacyTier: determineIntimacyTier(contexts),
      contactState: 'Active' as const,
    } : {}),

    preface: isRelational
      ? `This relational mirror translates symbolic overlays between ${personA} and ${personB} into testable hypotheses. The geometry reveals what each person's natal structure activates in the other—friction points, resonant frequencies, directional weather patterns. These dynamics predict nothing; they offer coordinates for recognition. Accuracy emerges only through lived comparison.`
      : `This reflection draws from symbolic geometry rather than observed behavior. It outlines tendencies the natal pattern could imply—hypotheses to test in lived experience. The chart translates planetary positions at birth into language patterns you can verify against your actual life.`,

    frontstage: {
      text: frontstageText,
      footnotes: []
    },

    resonantSummary: {
      text: chartGeo
        ? `**Chart Summary:** ${chartSummary}\n\nThis report presents the natal geometry for ${chartGeo.personName}. The planetary positions above form the foundation for mirror interpretation. For full narrative interpretation, please request a reading through the Poetic Brain chat interface.`
        : `Chart geometry could not be extracted. Please ensure the uploaded file contains valid natal chart data.`,
      footnotes: []
    },

    // Include actual geometry in core insights when available
    coreInsights: chartGeo ? {
      insights: [
        {
          pattern: `${expandSign(chartGeo.ascendant)} Rising with ${expandSign(chartGeo.sunSign)} Sun suggests a particular interface between presentation and core identity.`,
          geometry: `ASC ${chartGeo.ascendant} • ☉ ${chartGeo.sunSign} H${chartGeo.sunHouse}`,
          testMarker: 'WB'
        },
        {
          pattern: `Moon in ${expandSign(chartGeo.moonSign)} (House ${chartGeo.moonHouse}) indicates emotional needs and security patterns rooted in ${expandSign(chartGeo.moonSign)} qualities.`,
          geometry: `☽ ${chartGeo.moonSign} H${chartGeo.moonHouse}`,
          testMarker: 'WB'
        },
        {
          pattern: chartGeo.marsSign
            ? `Mars in ${expandSign(chartGeo.marsSign)} colors action style and assertion. This placement influences how energy is directed and conflict is engaged.`
            : 'Mars placement defines action style and assertion patterns.',
          geometry: chartGeo.marsSign ? `♂ ${chartGeo.marsSign} H${chartGeo.marsHouse}` : 'Mars position',
          testMarker: 'ABE'
        }
      ]
    } : undefined,

    polarityCards: chartGeo ? [
      {
        title: `The ${expandSign(chartGeo.ascendant)} Interface`,
        text: `With ${expandSign(chartGeo.ascendant)} rising, the world first encounters you through this particular lens. The ascendant shapes initial impressions and the style of engagement with new situations.`,
        footnote: `ASC ${chartGeo.ascendant}`
      },
      {
        title: `${expandSign(chartGeo.sunSign)} Core Identity`,
        text: `Sun in ${expandSign(chartGeo.sunSign)} in House ${chartGeo.sunHouse} indicates where vital energy seeks expression. This is the central organizing principle of the chart.`,
        footnote: `☉ ${chartGeo.sunSign} H${chartGeo.sunHouse}`
      },
      {
        title: `${expandSign(chartGeo.moonSign)} Emotional Ground`,
        text: `Moon in ${expandSign(chartGeo.moonSign)} (House ${chartGeo.moonHouse}) reveals emotional nature and what creates a sense of safety and belonging.`,
        footnote: `☽ ${chartGeo.moonSign} H${chartGeo.moonHouse}`
      }
    ] : undefined,

    mirrorVoice: {
      text: chartGeo
        ? `This natal geometry for ${chartGeo.personName} presents the raw coordinates of their symbolic blueprint. The interpretation above identifies core placements—Ascendant, Sun, Moon, and key planets—that form the foundation of their chart signature. For deeper exploration of aspects, houses, and dynamic patterns, engage with the Poetic Brain for a full mirror reading.`
        : `Unable to extract chart geometry from the uploaded file. Please verify the JSON structure contains valid natal chart data with planetary positions.`,
      footnotes: []
    },

    socraticClosure: {
      text: chartGeo
        ? `Looking at this geometry for ${chartGeo.personName}: Does the ${expandSign(chartGeo.ascendant)} Rising resonance match how you're perceived? Does the ${expandSign(chartGeo.sunSign)} Sun in House ${chartGeo.sunHouse} reflect your core expression? Where does the ${expandSign(chartGeo.moonSign)} Moon's need for security show up in daily life?`
        : undefined,
      includeMarkingGuide: true
    },

    // Add session diagnostics if provided
    sessionDiagnostics: sessionDiagnostics
  };

  return data;
}
