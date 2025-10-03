import type { NormalizedGeometry, NormalizedPlacement, NormalizedAspect } from './normalize';
import type { ReportMode } from '../../src/schema-rule-patch';

interface RenderOptions {
  geo: NormalizedGeometry | null;
  prov: Record<string, any>;
  options?: Record<string, any>;
  conversational?: boolean;
  mode?: ReportMode;
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
  // NEW: Schema rule-patch integration for mode-specific rendering
  if (mode && ['natal-only', 'balance', 'relational-balance', 'relational-mirror'].includes(mode)) {
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
          backstage: cleanedPayload.backstage,
          appendix: {
            geometry_summary: geo ? `Placements parsed: ${geo.placements?.length || 0} · Aspects parsed: ${geo.aspects?.length || 0}` : 'No geometry data',
            provenance_source: prov?.source,
            contract_validation: lintResult,
            mode_enforcement: mode
          }
        };
      }
    } catch (error) {
      console.warn('New rendering system failed, falling back to legacy:', error);
    }
  }

  // LEGACY: Original rendering logic (conversational mode and geometry-based)
  // If conversational mode is requested, call the LLM to produce an uncanned, natural-language response
  if (conversational) {
    const userMessage = options?.userMessage || '';
    if (isSimpleGreeting(userMessage)) {
      const simpleReply = "Hey. Good to see you here. Whenever you're ready, let me know what's on your mind.";
      return {
        raw: simpleReply,
        mirror_suppressed: true,
        appendix: { provenance_source: prov?.source },
      };
    }
    const prompt = `You are Poetic Brain, an empathetic, direct assistant. The user says: "${userMessage}". Reply naturally in plain language, then also provide a short structured mirror in five labeled parts: PICTURE, FEELING, CONTAINER, OPTION, NEXT_STEP. Keep the structure clear but use natural, non-form-like language for the primary reply.`;
    // Dynamic import to avoid loading heavy LLM provider at module evaluation time
    let full = '';
    try {
      const mod = await import('@/lib/llm');
      const generateText = mod.generateText as (p: string, o?: any) => Promise<string>;
      full = await generateText(prompt, { personaHook: 'poetic' });
    } catch (err) {
      // Fallback: if LLM is unavailable, produce a short human-friendly canned reply
      console.error('[RAVEN] Gemini API call failed, using fallback response:', err);
      full = `I'm here and listening. ${userMessage ? `You said: "${userMessage}".` : ''} I notice a quiet moment — take one breath.\nPICTURE: A quiet room at dusk.\nFEELING: Contemplative.\nCONTAINER: Just this moment, right here.\nOPTION: You can either explore this feeling further or shift your focus to something practical.\nNEXT_STEP: Take one deep breath.`;
    }
    // Attempt to extract structured five parts from the model output if present; otherwise create fallback stubs
    const parts = { picture: '', feeling: '', container: '', option: '', next_step: '' } as Record<string,string>;
    // simple extraction: look for labels in the generated text
    const labelRegex = /PICTURE[:\-\s]*([^\n]+)|FEELING[:\-\s]*([^\n]+)|CONTAINER[:\-\s]*([^\n]+)|OPTION[:\-\s]*([^\n]+)|NEXT[_ ]?STEP[:\-\s]*([^\n]+)/gi;
    let m: RegExpExecArray | null;
    while ((m = labelRegex.exec(full)) !== null) {
      if (m[1]) parts.picture = parts.picture || m[1].trim();
      if (m[2]) parts.feeling = parts.feeling || m[2].trim();
      if (m[3]) parts.container = parts.container || m[3].trim();
      if (m[4]) parts.option = parts.option || m[4].trim();
      if (m[5]) parts.next_step = parts.next_step || m[5].trim();
    }

    // If extraction failed, populate friendly fallbacks using first sentence heuristics
    if (!parts.picture) parts.picture = full.split('\n')[0].slice(0,120);
    if (!parts.feeling) parts.feeling = full.split('\n')[1] ? full.split('\n')[1].slice(0,80) : 'Reflective.';
    if (!parts.container) parts.container = 'This moment.';
    if (!parts.option) parts.option = 'You can either explore this further or take a practical step.';
    if (!parts.next_step) parts.next_step = 'Take one deep breath.';

    return {
      raw: full,
      picture: parts.picture,
      feeling: parts.feeling,
      container: parts.container,
      option: parts.option,
      next_step: parts.next_step,
      appendix: { provenance_source: prov?.source }
    };
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
      },
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
      },
    };
  }

  const aspects = Array.isArray(geo.aspects) ? geo.aspects : [];
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

  Object.keys(appendix).forEach((key) => {
    const value = appendix[key];
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      delete appendix[key];
    }
  });

  return {
    picture,
    feeling,
    container,
    option,
    next_step: nextStep,
    appendix,
  };
}
