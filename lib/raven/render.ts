import type { NormalizedGeometry, NormalizedPlacement, NormalizedAspect } from './normalize';
import type { ReportMode } from '../../src/schema-rule-patch';
import type { ResonanceTier } from '../poetic-brain/runtime';
import {
  classifyResonance,
  isGeometryValidated,
  OPERATIONAL_FLOW,
  replaceWithConditional,
  resolveRelocationDisclosure,
} from '../poetic-brain/runtime';
import { scheduleAudit, DAY } from '../governance/schedule';
import { runUncannyAudit } from '@/audit/uncanny';
import type { UncannyAuditResult } from '@/audit/uncanny';

interface RenderOptions {
  geo: NormalizedGeometry | null;
  prov: Record<string, any>;
  options?: Record<string, any>;
  conversational?: boolean;
  mode?: ReportMode;
}

type ShareableContextModeKey = 'narrative-led' | 'data-led' | 'combined' | 'forward-looking';

interface ShareableTemplate {
  title?: {
    date?: string | null;
    subject?: string | null;
  };
  context_mode: string;
  context_mode_key: ShareableContextModeKey;
  sections: {
    map?: string | null;
    field?: string | null;
    posture?: string | null;
    forward_orientation?: string | null;
  };
  provenance: {
    basis?: string | null;
    location?: string | null;
    timezone?: string | null;
    engine?: string | null;
    window?: string | null;
  };
  guardrails: string[];
  final_line?: string | null;
}

type ContractLinterModule = typeof import('../../src/contract-linter');
type FrontstageRendererModule = typeof import('../../src/frontstage-renderer');

let contractLinterMod: ContractLinterModule | null = null;
let frontstageRendererMod: FrontstageRendererModule | null = null;

async function ensureFrontstageModules() {
  if (!contractLinterMod) {
    try {
      contractLinterMod = await import('../../src/contract-linter');
    } catch (error) {
      console.warn('Contract linter module unavailable; falling back to legacy rendering.', error);
      contractLinterMod = null;
    }
  }
  if (!frontstageRendererMod) {
    try {
      frontstageRendererMod = await import('../../src/frontstage-renderer');
    } catch (error) {
      console.warn('Frontstage renderer module unavailable; falling back to legacy rendering.', error);
      frontstageRendererMod = null;
    }
  }
}

const ELEMENT_TONES: Record<'Fire' | 'Earth' | 'Air' | 'Water', { feeling: string; option: string; next: string }> = {
  Fire: {
    feeling: 'pressurised heat that wants motion',
    option: 'Move the energy through your body or initiate the conversation instead of letting it simmer.',
    next: 'Log one moment you chose action over rumination today.',
  },
  Earth: {
    feeling: 'dense, deliberate weight',
    option: 'Choose one tangible task and treat it as your anchor point.',
    next: 'Name one structure that keeps this steady for you right now.',
  },
  Air: {
    feeling: 'fast mental current and social static',
    option: 'Write or talk it out so the wind has a channel.',
    next: 'Capture the conversation loop that keeps returning.',
  },
  Water: {
    feeling: 'slow tidal pull with deep saturation',
    option: 'Give the feeling a container—music, water, or quiet reflection.',
    next: 'Note one emotional swell and what set it in motion.',
  },
};

const MODALITY_TONES: Record<'Cardinal' | 'Fixed' | 'Mutable', string> = {
  Cardinal: 'Ready to launch—test a move quickly and adjust from the feedback.',
  Fixed: 'Holding pattern—notice where you clamp down or refuse to pivot.',
  Mutable: 'Shifting lanes—watch for diffusion or agile pivots.',
};

const ASPECT_PRIORITY: Record<string, number> = {
  Opposition: 4,
  Square: 4,
  Conjunction: 3,
  Quincunx: 2,
  Sextile: 1,
  Trine: 1,
};

const ASPECT_METADATA: Record<string, { connector: string; feeling: string; option: string }> = {
  Opposition: {
    connector: 'opposing',
    feeling: 'Primary polarity asking for a bridge',
    option: 'Name both poles and choose which one you will stand inside today.',
  },
  Square: {
    connector: 'squaring',
    feeling: 'Cross-current demanding movement',
    option: 'Channel the friction into one decisive action or physical release.',
  },
  Conjunction: {
    connector: 'conjunct with',
    feeling: 'Merged impulses that can blur boundaries',
    option: 'Decide how the merged energy shows up before someone else chooses for you.',
  },
  Trine: {
    connector: 'trine to',
    feeling: 'Open lane flowing easily',
    option: 'Use the ease intentionally so it does not slide into autopilot.',
  },
  Sextile: {
    connector: 'sextile to',
    feeling: 'Low-friction opening that responds when you engage it',
    option: 'Invite collaboration or take the small opening that appears.',
  },
  Quincunx: {
    connector: 'tilting toward',
    feeling: 'Uneasy angle asking for adjustment',
    option: 'Experiment with small adjustments until the fit makes sense.',
  },
};

const PRIORITY_BODIES = new Set(['Sun', 'Moon', 'Ascendant', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']);

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function formatHouse(house?: number): string | undefined {
  if (!house || !Number.isFinite(house)) return undefined;
  return `${ordinal(house)} house`;
}

function ensureSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function formatPlacementDetail(placement?: NormalizedPlacement): string | undefined {
  if (!placement) return undefined;
  const parts: string[] = [];
  if (placement.sign) parts.push(placement.sign);
  if (typeof placement.degree === 'number' && Number.isFinite(placement.degree)) {
    parts.push(`${Math.round(placement.degree)}°`);
  }
  const extras: string[] = [];
  const houseLabel = formatHouse(placement.house);
  if (houseLabel) extras.push(houseLabel);
  if (placement.retrograde) extras.push('R');
  const suffix = extras.length ? ` (${extras.join(' · ')})` : '';
  const core = parts.length ? parts.join(' ') : '—';
  return `${placement.body} ${core}${suffix}`.trim();
}

function aspectConnector(type: string): string {
  return ASPECT_METADATA[type]?.connector ?? 'linking with';
}

function aspectFeelingLine(aspect: NormalizedAspect): string {
  const descriptor = ASPECT_METADATA[aspect.type]?.feeling ?? `Aspect emphasis: ${aspect.type}`;
  const orb = typeof aspect.orb === 'number' && Number.isFinite(aspect.orb) ? ` (${aspect.orb.toFixed(1)}°)` : '';
  return `${descriptor}: ${aspect.from} ${aspectConnector(aspect.type)} ${aspect.to}${orb}`;
}

function aspectOptionLine(aspect: NormalizedAspect): string {
  const descriptor = ASPECT_METADATA[aspect.type]?.option ?? `Track how ${aspect.from} ${aspectConnector(aspect.type)} ${aspect.to}`;
  return descriptor;
}

function findAspectBetween(aspects: NormalizedAspect[], a: string, b: string): NormalizedAspect | undefined {
  return aspects.find(
    (asp) =>
      (asp.from === a && asp.to === b) ||
      (asp.from === b && asp.to === a),
  );
}

function scoreAspect(aspect: NormalizedAspect): number {
  let score = ASPECT_PRIORITY[aspect.type] ?? 0;
  if (aspect.from === 'Sun' || aspect.to === 'Sun') score += 1.2;
  if (aspect.from === 'Moon' || aspect.to === 'Moon') score += 1.2;
  if (aspect.from === 'Ascendant' || aspect.to === 'Ascendant') score += 0.7;
  if (PRIORITY_BODIES.has(aspect.from)) score += 0.4;
  if (PRIORITY_BODIES.has(aspect.to)) score += 0.4;
  if (typeof aspect.orb === 'number' && Number.isFinite(aspect.orb)) {
    score -= Math.min(aspect.orb, 10) / 5;
  }
  return score;
}

function pickPrimaryAspect(aspects: NormalizedAspect[]): NormalizedAspect | undefined {
  if (!Array.isArray(aspects) || aspects.length === 0) return undefined;
  const sorted = [...aspects].sort((a, b) => scoreAspect(b) - scoreAspect(a));
  return sorted[0];
}

function extractPrimaryElement(summary?: NormalizedGeometry['summary']): keyof typeof ELEMENT_TONES | undefined {
  const raw = summary?.dominantElement;
  if (!raw) return undefined;
  const candidate = raw.split('+')[0].trim() as keyof typeof ELEMENT_TONES;
  return candidate in ELEMENT_TONES ? candidate : undefined;
}

function extractPrimaryModality(summary?: NormalizedGeometry['summary']): keyof typeof MODALITY_TONES | undefined {
  const raw = summary?.dominantModality;
  if (!raw) return undefined;
  const candidate = raw.split('+')[0].trim() as keyof typeof MODALITY_TONES;
  return candidate in MODALITY_TONES ? candidate : undefined;
}

function buildPicture(geo: NormalizedGeometry, primaryAspect?: NormalizedAspect): string {
  const placements = geo.placements ?? [];
  if (!placements.length) {
    return 'Geometry detected but no recognizable placements were parsed.';
  }
  const placementMap = new Map<string, NormalizedPlacement>();
  for (const placement of placements) {
    placementMap.set(placement.body, placement);
  }

  const aspects = geo.aspects ?? [];
  let highlight = primaryAspect;
  if (!highlight) {
    highlight = findAspectBetween(aspects, 'Sun', 'Moon') ?? undefined;
  }

  const pictureSegments: string[] = [];
  if (highlight) {
    const fromPlacement = placementMap.get(highlight.from);
    const toPlacement = placementMap.get(highlight.to);
    const fromDetail = formatPlacementDetail(fromPlacement);
    const toDetail = formatPlacementDetail(toPlacement);
    if (fromDetail && toDetail) {
      pictureSegments.push(`${fromDetail} ${aspectConnector(highlight.type)} ${toDetail}`);
    }
  }

  if (!pictureSegments.length) {
    const sunDetail = formatPlacementDetail(placementMap.get('Sun'));
    const moonDetail = formatPlacementDetail(placementMap.get('Moon'));
    if (sunDetail && moonDetail) {
      pictureSegments.push(`${sunDetail} alongside ${moonDetail}`);
    } else if (sunDetail) {
      pictureSegments.push(sunDetail);
    } else if (moonDetail) {
      pictureSegments.push(moonDetail);
    }
  }

  const asc = placementMap.get('Ascendant');
  if (asc && asc.sign) {
    const ascHouse = formatHouse(asc.house);
    pictureSegments.push(`Rising on a ${asc.sign} horizon${ascHouse ? ` (${ascHouse})` : ''}`);
  }

  const mc = placementMap.get('Midheaven');
  if (mc && mc.sign) {
    const mcHouse = formatHouse(mc.house);
    pictureSegments.push(`Aiming toward a ${mc.sign} Midheaven${mcHouse ? ` (${mcHouse})` : ''}`);
  }

  if (!pictureSegments.length) {
    const fallback = placements.slice(0, 2).map((p) => formatPlacementDetail(p)).filter(Boolean) as string[];
    if (fallback.length) {
      pictureSegments.push(fallback.join(' · '));
    }
  }

  const picture = pictureSegments.join('. ');
  return ensureSentence(picture || 'Geometry present, but no clear placements were recognized.');
}

function buildContainer(summary: NormalizedGeometry['summary']): string {
  const primaryElement = extractPrimaryElement(summary);
  if (primaryElement) {
    return `Use this as a natal baseline—track ${primaryElement.toLowerCase()} themes over the next few days and see what holds.`;
  }
  return 'Treat this as a natal mirror—check it whenever the pattern surfaces and test it against lived experience.';
}

function isSimpleGreeting(message: string): boolean {
  if (!message) return false;
  const trimmed = message.trim();
  if (!trimmed) return false;

  const sanitized = trimmed
    .replace(/^[\s.,!?;:-]+/g, "")
    .replace(/[\s.,!?;:-]+$/g, "")
    .toLowerCase();

  if (!sanitized) return false;

  const rawTokens = sanitized.split(/\s+/).filter(Boolean);
  const tokens = rawTokens
    .map((token) => token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter(Boolean);

  if (tokens.length === 0 || tokens.length > 3) {
    return false;
  }

  const base = tokens[0];
  const greetingRoots = new Set([
    "hi",
    "hello",
    "hey",
    "hiya",
    "yo",
    "sup",
    "ahoy",
  ]);
  const allowedSuffixes = new Set([
    "there",
    "ya",
    "yall",
    "y'all",
    "everyone",
    "folks",
    "friend",
    "friends",
    "team",
    "raven",
  ]);

  if (greetingRoots.has(base)) {
    if (tokens.length === 1) return true;
    return tokens.slice(1).every((token) => allowedSuffixes.has(token));
  }

  if (base === "greetings") {
    if (tokens.length === 1) return true;
    return tokens.slice(1).every((token) => allowedSuffixes.has(token));
  }

  if (base === "good" && tokens.length >= 2) {
    const dayParts = new Set(["morning", "afternoon", "evening", "day", "night"]);
    if (!dayParts.has(tokens[1])) return false;
    if (tokens.length === 2) return true;
    return tokens.length === 3 && allowedSuffixes.has(tokens[2]);
  }

  return false;
}

/**
 * Renders a "Shareable Mirror" draft in the standard Raven Calder format.
 * (picture → feeling → container → option → next step)
 * Now supports the new schema rule-patch system for mode-specific rendering.
 * @param {RenderOptions} params - The rendering parameters.
 * @returns A structured draft object.
 */
function ensureWindowFraming(payload: Record<string, any>) {
  const windowSource =
    payload.window ||
    payload.indices?.window ||
    payload.indices_window ||
    payload.balance_meter?.period ||
    payload.context?.period ||
    payload.context?.window;

  if (!windowSource) return;

  const start = windowSource.start || windowSource.from || windowSource.begin;
  const end = windowSource.end || windowSource.to || windowSource.finish;
  if (!start || !end) return;

  if (!payload.window) {
    payload.window = { start, end };
    if (windowSource.step) payload.window.step = windowSource.step;
  }

  if (!payload.indices) payload.indices = {};

  if (!payload.indices.window) {
    payload.indices.window = {
      start,
      end,
      ...(windowSource.step ? { step: windowSource.step } : {}),
    };
  }

  const existingDays = Array.isArray(payload.indices?.days) ? payload.indices.days : undefined;
  const sourceDays =
    existingDays && existingDays.length > 0
      ? existingDays
      : Array.isArray(windowSource.days)
        ? windowSource.days
        : Array.isArray(payload.indices_window?.days)
          ? payload.indices_window.days
          : undefined;

  if (sourceDays && (!existingDays || existingDays.length === 0)) {
    payload.indices.days = sourceDays.map((day: any) => {
      const indices = day?.indices || day;
      const seismograph = day?.seismograph || day;
      const base: Record<string, any> = {};
      if (day?.date) base.date = day.date;
      if (typeof indices?.sf_diff === 'number') base.sf_diff = indices.sf_diff;
      if (typeof indices?.s_plus === 'number') base.s_plus = indices.s_plus;
      if (typeof indices?.s_minus === 'number') base.s_minus = indices.s_minus;
      if (typeof seismograph?.magnitude === 'number') base.magnitude = seismograph.magnitude;
      if (typeof seismograph?.volatility === 'number') base.volatility = seismograph.volatility;
      if (typeof seismograph?.valence === 'number') base.valence = seismograph.valence;
      if (Object.keys(base).length === 0) return day;
      return base;
    });
  }
}

function ensureLocationFraming(payload: Record<string, any>) {
  const timezone =
    payload?.location?.timezone ||
    payload?.person_a?.meta?.timezone ||
    payload?.person_a?.details?.timezone ||
    payload?.provenance?.timezone ||
    payload?.provenance?.time_meta_a?.timezone ||
    payload?.provenance?.time_meta_a?.tz ||
    payload?.context?.person_a?.timezone ||
    payload?.context?.participants?.person_a?.timezone;

  const coordinates =
    payload?.location?.coordinates ||
    payload?.person_a?.details?.coordinates ||
    payload?.person_a?.coordinates ||
    payload?.context?.person_a?.coordinates ||
    payload?.context?.participants?.person_a?.coordinates ||
    payload?.provenance?.identity?.person_a?.coordinates ||
    payload?.provenance?.coordinates;

  if (!payload.location) payload.location = {};
  if (timezone && !payload.location.timezone) payload.location.timezone = timezone;
  if (coordinates && !payload.location.coordinates) payload.location.coordinates = coordinates;

  if (!payload.context) payload.context = {};
  if (!payload.context.person_a) payload.context.person_a = {};
  if (timezone && !payload.context.person_a.timezone) payload.context.person_a.timezone = timezone;
  if (coordinates && !payload.context.person_a.coordinates) payload.context.person_a.coordinates = coordinates;
}

function enrichContractPayload(payload: Record<string, any>) {
  ensureWindowFraming(payload);
  ensureLocationFraming(payload);
}

export async function renderShareableMirror({ geo, prov, options, conversational = false, mode }: RenderOptions): Promise<Record<string, any>> {
  scheduleAudit('system-lexicon.json', 45 * DAY);
  const timestampIso = new Date().toISOString();
  const computedGeometryValid = isGeometryValidated(geo);
  const geometryFlag = options?.geometryValidated;
  const geometryValidatedInitial = geometryFlag === true && computedGeometryValid;
  const resonanceInput =
    options?.resonancePing ??
    options?.session_posture ??
    options?.sessionScores?.latest?.posture ??
    prov?.resonancePing ??
    null;
  const relocationFrame = extractRelocationFrame(options, prov);
  const deviations: string[] = [];
  if (geometryFlag !== true) {
    deviations.push('geometryValidated flag missing or false.');
  }
  if (!computedGeometryValid && geo) {
    deviations.push('Geometry payload present but failed internal validation.');
  }
  if (!geometryValidatedInitial) {
    deviations.push('Geometry validation incomplete – frontstage limited to guardrail copy.');
  }
  const uncannyAudit = await runUncannyAudit(Boolean(options?.uncannyAudit || options?.enableUncannyAudit), {
    context: {
      mode: options?.mode ?? null,
      reportType: options?.reportType ?? null,
    },
  });
  const buildBackstage = (overrides: Partial<BackstageBuildOptions> = {}) =>
    buildBackstageMetadata({
      options,
      prov,
      geometryValidated: geometryValidatedInitial,
      resonanceInput,
      relocationFrame,
      deviations,
      timestampIso,
      uncannyAudit,
      ...overrides,
    });

  // NEW: Schema rule-patch integration for mode-specific rendering
  if (
    geometryValidatedInitial &&
    mode &&
    ['natal-only', 'balance', 'relational-balance', 'relational-mirror'].includes(mode)
  ) {
    try {
      // Construct payload with all available data
      const payload = {
        mode,
        person_a: options?.person_a || null,
        indices: options?.indices || null,
        geo: geo,
        provenance: prov,
        natal_summary: options?.natal_summary || null,
        // Add any other fields from options
        ...options
      };

      enrichContractPayload(payload);

      await ensureFrontstageModules();
      if (!contractLinterMod || !frontstageRendererMod) {
        throw new Error('Frontstage modules unavailable');
      }

      const { lintAndFixPayload, ContractLinter } = contractLinterMod;
      const { renderFrontstage: renderFrontstageNew } = frontstageRendererMod;

      // Lint and validate the payload
      const { payload: cleanedPayload, result: lintResult } = lintAndFixPayload(payload);

      // Log lint results if there are warnings or errors
      if (lintResult.warnings.length > 0 || lintResult.errors.length > 0) {
        console.log('Contract Lint Report:', ContractLinter.generateReport(lintResult));
      }

      // If validation fails completely, fall back to legacy rendering
      if (!lintResult.valid) {
        console.warn('Schema validation failed, falling back to legacy rendering');
      } else {
        // Use new frontstage renderer
        const frontstage = await renderFrontstageNew(cleanedPayload);

        // Return new format with contract compliance
        return {
          contract: cleanedPayload.contract || 'clear-mirror/1.3',
          mode: cleanedPayload.mode,
          frontstage_policy: cleanedPayload.frontstage_policy,
          preface: frontstage.preface,
          scenario_prompt: frontstage.scenario_prompt,
          scenario_question: frontstage.scenario_question,
          picture: frontstage.blueprint,
          feeling: 'Schema-compliant rendering active',
          container: frontstage.stitched_reflection,
          option: 'Use this as a natal baseline—track themes over the next few days',
          next_step: 'Log one lived moment where this pattern shows up today',
          symbolic_weather: frontstage.symbolic_weather,
          appendix: {
            geometry_summary: geo ? `Placements parsed: ${geo.placements?.length || 0} · Aspects parsed: ${geo.aspects?.length || 0}` : 'No geometry data',
            provenance_source: prov?.source,
            contract_validation: lintResult,
            mode_enforcement: mode
          },
          backstage: {
            ...(typeof cleanedPayload.backstage === 'object' && cleanedPayload.backstage
              ? cleanedPayload.backstage
              : {}),
            ...buildBackstage(),
          },
        };
      }
    } catch (error) {
      console.warn('New rendering system failed, falling back to legacy:', error);
    }
  }

  // Non-conversational (geometry-driven) rendering
  if (!geo) {
    return {
      picture: 'No geometry data provided—upload the chart or report so I can mirror it.',
      feeling: 'Without placements, there is no symbolic map to reflect.',
      container: 'Bring in the Math Brain report or the AstroSeek export when you have it.',
      option: 'Export or copy the full placement table, then paste it here so I can work cleanly.',
      next_step: 'Next step: resend the geometry once it is ready.',
      appendix: {
        geometry_summary: 'No geometry data provided.',
        provenance_source: prov?.source,
        geometry_validated: false,
      },
      backstage: buildBackstage({ geometryValidated: false }),
    };
  }

  const placements = Array.isArray(geo.placements) ? geo.placements : [];
  if (!placements.length) {
    return {
      picture: 'Geometry detected, but the placement table was empty.',
      feeling: 'I need the planetary lines to reflect accurately—right now the mirror would be guesswork.',
      container: 'Grab the AstroSeek export or Math Brain report again and include the full planet table.',
      option: 'Option: re-export the chart with placements + aspects and drop it back in.',
      next_step: 'Next step: paste the complete geometry so I can translate it.',
      appendix: {
        geometry_summary: 'Geometry payload present but no placements were parsed.',
        provenance_source: prov?.source,
        geometry_validated: false,
      },
      backstage: buildBackstage({ geometryValidated: false }),
    };
  }

  const aspects = Array.isArray(geo.aspects) ? geo.aspects : [];

  if (!geometryValidatedInitial) {
    return {
      picture: 'Validation pending—geometry captured but not confirmed.',
      feeling: 'Before translating, confirm the Math Brain validation handshake so the geometryValidated flag reads true.',
      container: 'Run the upstream validator or re-upload via Math Brain so the canonical flow (MathBrain → Seismograph → BalanceMeter → PoeticBrain → Mirror/WovenMap) completes.',
      option: 'Once validation succeeds, invite me again and I will translate the mirror.',
      next_step: 'Next step: confirm geometryValidated === true, then re-run this request.',
      appendix: {
        geometry_summary: `Placements parsed: ${placements.length} · Aspects parsed: ${aspects.length}.`,
        provenance_source: prov?.source,
        geometry_validated: false,
        validation_required: true,
      },
      backstage: buildBackstage({ geometryValidated: false }),
    };
  }

  const summary = geo.summary;

  const primaryAspect = pickPrimaryAspect(aspects);
  const picture = buildPicture(geo, primaryAspect);

  const primaryElement = extractPrimaryElement(summary);
  const primaryModality = extractPrimaryModality(summary);

  const feelingSegments: string[] = [];
  if (primaryElement) {
    feelingSegments.push(`Feels like ${ELEMENT_TONES[primaryElement].feeling}`);
  } else if (summary?.dominantElement) {
    feelingSegments.push(`Element spread: ${summary.dominantElement}`);
  }
  if (primaryModality) {
    feelingSegments.push(MODALITY_TONES[primaryModality]);
  } else if (summary?.dominantModality) {
    feelingSegments.push(`Modality mix: ${summary.dominantModality}`);
  }
  if (primaryAspect) {
    feelingSegments.push(aspectFeelingLine(primaryAspect));
  }
  const feeling = feelingSegments.length
    ? feelingSegments.map(ensureSentence).join(' ')
    : 'Staying observational—test what lands against lived experience and discard the rest.';

  const container = ensureSentence(buildContainer(summary));

  const optionSegments: string[] = [];
  if (primaryElement) {
    optionSegments.push(ELEMENT_TONES[primaryElement].option);
  }
  if (primaryAspect) {
    optionSegments.push(aspectOptionLine(primaryAspect));
  }
  const option = optionSegments.length
    ? optionSegments.map(ensureSentence).join(' ')
    : 'You can either act on the pieces that resonate or simply log them as null data for now.';

  let nextStep = '';
  if (primaryAspect) {
    nextStep = `Log one lived moment where ${primaryAspect.from} and ${primaryAspect.to} ${aspectConnector(primaryAspect.type)} each other today.`;
  } else if (primaryElement) {
    nextStep = ELEMENT_TONES[primaryElement].next;
  } else {
    nextStep = 'Write down the first situation where this mirror shows up in real life.';
  }
  nextStep = ensureSentence(nextStep);

  const appendix: Record<string, any> = {
    geometry_summary: `Placements parsed: ${placements.length} · Aspects parsed: ${aspects.length}.`,
    provenance_source: prov?.source,
  };
  appendix.geometry_validated = geometryValidatedInitial;

  if (summary?.dominantElement) {
    appendix.dominant_element = summary.dominantElement;
  }
  if (summary?.dominantModality) {
    appendix.dominant_modality = summary.dominantModality;
  }
  const luminaryParts: string[] = [];
  if (summary?.luminaries?.sun) luminaryParts.push(`Sun ${summary.luminaries.sun}`);
  if (summary?.luminaries?.moon) luminaryParts.push(`Moon ${summary.luminaries.moon}`);
  if (summary?.luminaries?.ascendant) luminaryParts.push(`Asc ${summary.luminaries.ascendant}`);
  if (luminaryParts.length) {
    appendix.luminary_axis = luminaryParts.join(' · ');
  }
  if (summary?.retrogradeBodies?.length) {
    appendix.retrogrades = summary.retrogradeBodies.join(', ');
  }
  if (primaryAspect) {
    const orbText = typeof primaryAspect.orb === 'number' && Number.isFinite(primaryAspect.orb)
      ? ` (${primaryAspect.orb.toFixed(1)}°)`
      : '';
    appendix.primary_aspect = `${primaryAspect.from} ${primaryAspect.type} ${primaryAspect.to}${orbText}`;
  }
  appendix.resonance_tier = classifyResonance(resonanceInput);

  Object.keys(appendix).forEach((key) => {
    const value = appendix[key];
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      delete appendix[key];
    }
  });

  // Add symbolic weather if available
  const weatherData = options?.unified_output?.daily_entries?.[0]?.symbolic_weather;
  let weatherSegment = '';
  if (weatherData) {
    weatherSegment = `Today's symbolic weather has a magnitude of ${weatherData.magnitude} and a directional bias of ${weatherData.directional_bias}. This suggests a climate of ${weatherData.labels.magnitude} intensity with a ${weatherData.labels.directional_bias} flow.`;
  }

  const finalFeeling = [feeling, weatherSegment].filter(Boolean).join(' ');
  const sanitizedPicture = guardDeterministicLanguage(picture) ?? picture;
  const sanitizedFeeling = guardDeterministicLanguage(finalFeeling) ?? finalFeeling;
  const sanitizedContainer = guardDeterministicLanguage(container) ?? container;
  const sanitizedOption = guardDeterministicLanguage(option) ?? option;
  const sanitizedNextStep = guardDeterministicLanguage(nextStep) ?? nextStep;

  const shareableTemplate = buildShareableTemplate({
    geo,
    prov,
    options,
    mapText: sanitizedPicture,
    fieldText: sanitizedFeeling,
    containerText: sanitizedContainer,
    invitationText: sanitizedOption,
    nextStepText: sanitizedNextStep,
    weatherSegment,
  });

  return {
    picture: sanitizedPicture,
    feeling: sanitizedFeeling,
    container: sanitizedContainer,
    option: sanitizedOption,
    next_step: sanitizedNextStep,
    appendix,
    shareable_template: shareableTemplate,
    backstage: buildBackstage(),
  };
}

interface ShareableBuildOptions {
  geo: NormalizedGeometry | null;
  prov: Record<string, any>;
  options?: Record<string, any>;
  mapText: string;
  fieldText: string;
  containerText: string;
  invitationText: string;
  nextStepText: string;
  weatherSegment?: string;
}

function detectNarrativePresence(options?: Record<string, any>): boolean {
  if (!options) return false;
  if (typeof options.userNarrative === 'string' && options.userNarrative.trim().length > 0) {
    return true;
  }
  const contexts: any[] = Array.isArray(options.reportContexts) ? options.reportContexts : [];
  return contexts.some((ctx) => {
    const summary = typeof ctx?.summary === 'string' ? ctx.summary : '';
    const content = typeof ctx?.content === 'string' ? ctx.content : '';
    const blob = `${summary} ${content}`.toLowerCase();
    return /\b(i|me|my|we|us|felt|today|yesterday|last night)\b/.test(blob);
  });
}

function detectForwardOrientation(options?: Record<string, any>): boolean {
  if (!options) return false;
  const windowObj = options.window || options.indices?.window || options.period;
  const end = windowObj?.end || windowObj?.to;
  if (end) {
    const endDate = new Date(end);
    if (!Number.isNaN(endDate.getTime())) {
      const now = new Date();
      return endDate.getTime() > now.getTime();
    }
  }
  return Boolean(options.forecast || options.forwardLooking || options.futureWindow);
}

function detectContextMode(geo: NormalizedGeometry | null, options?: Record<string, any>): { key: ShareableContextModeKey; label: string } {
  const hasNarrative = detectNarrativePresence(options);
  const hasGeometry = Boolean(geo);
  const isForward = detectForwardOrientation(options);

  if (isForward) {
    return { key: 'forward-looking', label: 'Forward-Looking (Probability Corridor)' };
  }

  if (hasNarrative && hasGeometry) {
    return { key: 'combined', label: 'Combined (Past/Present)' };
  }

  if (hasNarrative) {
    return { key: 'narrative-led', label: 'Narrative-Led (Past/Present)' };
  }

  return { key: 'data-led', label: 'Data-Led (Past/Present)' };
}

function resolveBasis(geo: NormalizedGeometry | null, options?: Record<string, any>): string {
  const hasGeometry = Boolean(geo);
  const hasWeather = Boolean(options?.unified_output?.daily_entries?.length);
  if (hasGeometry && hasWeather) return 'Both (Blueprint + Felt Weather)';
  if (hasWeather && !hasGeometry) return 'Felt Weather (Relocated)';
  if (hasGeometry) return 'Blueprint (Natal)';
  return 'Unspecified';
}

function resolveLocation(options?: Record<string, any>, prov?: Record<string, any>): { label: string | null; timezone: string | null } {
  const relocation = options?.relocation || options?.context?.relocation;
  const provRelocation = prov?.relocation_mode;
  const label = relocation?.label || provRelocation?.label || relocation?.city || provRelocation?.city || null;
  const timezone = relocation?.timezone || provRelocation?.timezone || options?.location?.timezone || prov?.timezone || null;
  return { label, timezone };
}

function formatWindow(options?: Record<string, any>, prov?: Record<string, any>): string | null {
  const windowObj = options?.window || options?.indices?.window || prov?.window || null;
  const start = windowObj?.start || windowObj?.from;
  const end = windowObj?.end || windowObj?.to;
  if (!start && !end) return null;
  if (start && end) return `${start} → ${end}`;
  return start || end || null;
}

const SHAREABLE_GUARDRAILS = [
  'Orientation without coercion — no tasks or prescriptions.',
  'Agency intact — prefer “tends to” and “reads as” over imperatives.',
  'Minimal jargon — translate geometry into felt language.',
  'Place matters — anchor weather to locale when present.',
  'Falsifiability — posture labels clarify resonance vs miss.',
  'Future talk stays probabilistic — tilt and corridor, never guarantee.',
];

function buildPostureLine(options?: Record<string, any>): string {
  const posture = options?.session_posture || options?.posture || options?.sessionScores?.latest?.posture;
  if (!posture) {
    return 'Not logged — treat this mirror as calibration data until WB/ABE/OSR is recorded.';
  }
  const postureUpper = String(posture).toUpperCase();
  let descriptor = '— logged as calibration data.';
  if (postureUpper.includes('WB')) descriptor = '— weather and assessment aligned.';
  else if (postureUpper.includes('ABE')) descriptor = '— landed partially; refine the mirror on the edge.';
  else if (postureUpper.includes('OSR')) descriptor = '— miss logged; use the null as information.';
  return `${postureUpper.replace(/[^A-Z]/g, '')} ${descriptor}`;
}

function resolveSubject(geo: NormalizedGeometry | null, options?: Record<string, any>): string | null {
  const optionName = options?.person_a?.name || options?.person_a?.details?.name;
  if (typeof optionName === 'string' && optionName.trim()) return optionName.trim();
  const geoName = (geo as any)?.person_a?.name;
  if (typeof geoName === 'string' && geoName.trim()) return geoName.trim();
  return null;
}

function buildForwardOrientationText(isForward: boolean, weatherSegment?: string, fieldText?: string): string | null {
  if (!isForward) return null;
  const weatherLine = weatherSegment && weatherSegment.trim().length > 0 ? weatherSegment : null;
  const base = 'Read this as a probability corridor. The tilt invites preparation, not prediction.';
  if (weatherLine) {
    return `${weatherLine} ${base}`.trim();
  }
  if (fieldText && fieldText.trim().length > 0) {
    return `${fieldText.trim()} ${base}`.trim();
  }
  return base;
}

function formatDateTitle(prov?: Record<string, any>, options?: Record<string, any>): string | null {
  const generated = prov?.generated_at || prov?.timestamp;
  if (generated) {
    const date = new Date(generated);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }
  const windowObj = options?.window || options?.indices?.window;
  if (windowObj?.start && windowObj?.end) {
    return `${windowObj.start} → ${windowObj.end}`;
  }
  return null;
}

function buildShareableTemplate(payload: ShareableBuildOptions): ShareableTemplate {
  const { geo, prov, options } = payload;
  const contextMode = detectContextMode(geo, options);
  const basis = resolveBasis(geo, options);
  const location = resolveLocation(options, prov);
  const windowLabel = formatWindow(options, prov);
  const isForward = contextMode.key === 'forward-looking';
  const forwardOrientation = buildForwardOrientationText(isForward, payload.weatherSegment, payload.fieldText);
  const subject = resolveSubject(geo, options);
  const dateTitle = formatDateTitle(prov, options);
  const postureLine = buildPostureLine(options);

  return {
    title: {
      date: dateTitle,
      subject,
    },
    context_mode: contextMode.label,
    context_mode_key: contextMode.key,
    sections: {
      map: payload.mapText || null,
      field: payload.fieldText || null,
      posture: postureLine,
      forward_orientation: forwardOrientation,
    },
    provenance: {
      basis,
      location: location.label,
      timezone: location.timezone,
      engine: prov?.math_brain_version || prov?.engine_versions?.math_brain || null,
      window: windowLabel,
    },
    guardrails: SHAREABLE_GUARDRAILS,
    final_line: 'Compassion through precision; tilt named, agency intact.',
  };
}

function guardDeterministicLanguage<T extends string | null | undefined>(text: T): string | undefined {
  if (typeof text !== 'string') return text ?? undefined;
  if (/\b(cause|causes|causing|caused|fate|fated|destiny|destined)\b/i.test(text)) {
    return replaceWithConditional(text);
  }
  return text;
}

function collectOperationalFlow(flowCandidate: any): string[] | null {
  if (!Array.isArray(flowCandidate)) return null;
  return flowCandidate.every((stage) => typeof stage === 'string') ? flowCandidate : null;
}

function flowsMatch(expected: readonly string[], provided: string[]): boolean {
  if (expected.length !== provided.length) return false;
  return expected.every((stage, index) => stage.toLowerCase() === provided[index].toLowerCase());
}

function extractRelocationFrame(options?: Record<string, any>, prov?: Record<string, any>): string | null {
  if (!options && !prov) return null;
  const direct = typeof options?.relocationFrame === 'string'
    ? options.relocationFrame
    : typeof options?.relocation_frame === 'string'
      ? options.relocation_frame
      : null;
  if (direct) return direct;

  const relocation =
    options?.relocation ||
    options?.context?.relocation ||
    options?.relocationDetail ||
    options?.context?.relocation_detail ||
    {};

  if (typeof relocation?.frame === 'string') return relocation.frame;
  if (typeof relocation?.mode === 'string') return relocation.mode;

  const provMode =
    typeof prov?.relocation_mode === 'string'
      ? prov.relocation_mode
      : typeof prov?.relocation?.mode === 'string'
        ? prov.relocation.mode
        : null;
  return provMode;
}

interface BackstageBuildOptions {
  options?: Record<string, any>;
  prov?: Record<string, any>;
  geometryValidated: boolean;
  resonanceInput?: unknown;
  relocationFrame?: string | null;
  deviations?: string[];
  timestampIso: string;
  uncannyAudit?: UncannyAuditResult;
}

function buildBackstageMetadata({
  options,
  prov,
  geometryValidated,
  resonanceInput,
  relocationFrame,
  deviations = [],
  timestampIso,
  uncannyAudit,
}: BackstageBuildOptions): Record<string, any> {
  const resonanceTier: ResonanceTier = classifyResonance(resonanceInput);
  const relocationDisclosure = resolveRelocationDisclosure(relocationFrame);
  const providedFlow =
    collectOperationalFlow(options?.operationalFlow) ??
    collectOperationalFlow(options?.operational_flow) ??
    null;

  const flowDeviations: string[] = [];
  if (providedFlow && !flowsMatch(OPERATIONAL_FLOW, providedFlow)) {
    flowDeviations.push(
      `Operational flow mismatch (expected ${OPERATIONAL_FLOW.join(' -> ')}, received ${providedFlow.join(
        ' -> ',
      )}).`,
    );
  }

  const dataSource =
    typeof prov?.data_source === 'string' && prov.data_source.trim().length > 0
      ? prov.data_source
      : 'AstrologerAPI v4';
  const mathBrainVersion =
    prov?.math_brain_version ||
    prov?.versions?.math_brain ||
    prov?.engine?.math_brain_version ||
    process.env.MATH_BRAIN_VERSION ||
    'unknown';
  const rendererVersion = process.env.RENDERER_VERSION || 'poetic-brain-runtime';

  const metadata: Record<string, any> = {
    resonanceTier,
    relocationDisclosure,
    geometryValidated,
    operationalFlow: OPERATIONAL_FLOW,
    deviations: [...deviations, ...flowDeviations],
    provenance: {
      data_source: dataSource,
      math_brain_version: mathBrainVersion,
      renderer_version: rendererVersion,
      timestamp: timestampIso,
    },
  };

  if (prov?.relocation_mode) {
    metadata.relocationMode = prov.relocation_mode;
  }

  if (providedFlow) {
    metadata.providedOperationalFlow = providedFlow;
  }

  if (uncannyAudit && uncannyAudit.status !== 'skipped') {
    metadata.uncannyAudit = uncannyAudit;
  }

  return metadata;
}
