/* Frontstage Renderer with Mode-Specific Content Generation */

import {
  ReportMode,
  shouldGenerateSymbolicWeather,
  hasValidIndices,
  stripBalancePayload,
  enforceNatalOnlyMode
} from './schema-rule-patch';
import { generateBlueprintMetaphor, narrateBlueprintClimate } from '../lib/blueprint-narrator';
import { narrateSymbolicWeather, hasValidIndices as hasWeatherIndices } from '../lib/weather-narrator';
import { narrateStitchedReflection, narrateRelationalReflection } from '../lib/reflection-narrator';
import { indicesToScenario } from '../lib/weather-lexicon-adapter';

interface RenderContext {
  mode: ReportMode;
  frontstage_policy?: {
    autogenerate?: boolean;
    allow_symbolic_weather?: boolean;
  };
  frontstage?: {
    directive?: {
      status?: string;
      voice?: string;
      include?: string[];
    };
    mirror?: {
      blueprint?: string | null;
      symbolic_weather?: string | null;
      stitched_reflection?: string | null;
    };
  };
  indices?: {
    days?: Array<{
      date: string;
      magnitude?: number;
      volatility?: number;
      sf_diff?: number;
    }>;
    window?: {
      start?: string;
      end?: string;
      step?: string;
    };
  };
  [key: string]: any;
}

interface RenderedFrontstage {
  blueprint?: string | null;
  symbolic_weather?: string | null;
  stitched_reflection?: string | null;
  preface?: {
    persona_intro: string | null;
    resonance_profile: string[] | null;
    paradoxes: string[] | null;
    relational_focus?: string | null;
  };
  scenario_prompt?: string | null;
  scenario_question?: string | null;
}

export class FrontstageRenderer {
  private buildPreface(
    doc: RenderContext,
    opts: { blueprintNarrative?: string; weatherNarrative?: string }
  ): RenderedFrontstage['preface'] {
    const mode = (doc.mode || 'natal-only') as ReportMode;
    const isRelational = mode === 'relational-balance' || mode === 'relational-mirror';

    const nameA: string | undefined =
      doc?.person_a?.details?.name || doc?.person_a?.name || doc?.name_a || undefined;
    const nameB: string | undefined =
      doc?.person_b?.details?.name || doc?.person_b?.name || doc?.name_b || undefined;

    // Persona intro: conversational Raven-in-the-coffee-shop tone
    const who = nameA ? `${nameA}` : 'friend';
    const persona_intro = `I’m the raven in the corner booth—here to mirror, not to judge. ${who}, let’s sip this pattern and see what rings true.`;

    // Resonance profile: derive from constitutional modes if present
    const modes = (doc as any).constitutional_modes || (doc as any).blueprint_modes || {};
    const p = modes?.primary_mode;
    const s = modes?.secondary_mode;
    const sh = modes?.shadow_mode;

    const resonance_profile: string[] = [];
    if (p?.function || s?.function) {
      const lead = p?.function ? String(p.function).toLowerCase() : 'primary mode';
      const steady = s?.function ? String(s.function).toLowerCase() : 'support mode';
      resonance_profile.push(`You lead with ${lead} and steady with ${steady}.`);
    }
    if (p?.signature || p?.axis) {
      const sig = p?.signature || p?.axis;
      resonance_profile.push(`Baseline current: ${sig}.`);
    }
    if (modes?.confidence) {
      resonance_profile.push(`Blueprint confidence: ${modes.confidence}.`);
    }
    if (resonance_profile.length === 0) {
      resonance_profile.push('Blueprint present—watch what resonates and discard what doesn’t.');
    }

    // Paradoxes: favor explicit tensions if provided; otherwise synthesize from modes
    const tensions: string[] = Array.isArray((doc as any).core_tensions)
      ? (doc as any).core_tensions.filter((x: any) => typeof x === 'string')
      : [];
    const paradoxes: string[] = [];
    if (tensions.length) {
      paradoxes.push(...tensions.slice(0, 3));
    } else if (p?.function && sh?.function) {
      paradoxes.push(
        `Craves ${String(p.function).toLowerCase()} while protecting ${String(sh.function).toLowerCase()}—both true, both useful.`
      );
    } else {
      paradoxes.push('Holds two truths at once—tension is not a flaw, it’s fuel.');
    }

    // Relational focus
    let relational_focus: string | undefined;
    if (isRelational) {
      const a = nameA || 'Person A';
      const b = nameB || 'Person B';
      relational_focus = `Relational weave: from ${a} to ${b} and back again—we’ll name who holds which end and how the bridge is built.`;
    }

    return {
      persona_intro,
      resonance_profile,
      paradoxes,
      relational_focus: relational_focus || null
    };
  }
  private async narrateBlueprint(doc: RenderContext): Promise<string> {
    // Extract constitutional modes (should be in doc.constitutional_modes or similar)
    const modes = doc.constitutional_modes || doc.blueprint_modes;

    if (!modes?.primary_mode || !modes?.secondary_mode || !modes?.shadow_mode) {
      return "Blueprint unavailable: constitutional modes not extracted from chart.";
    }

    // Extract natal context for metaphor generation
    const chartData = doc.person_a?.chart || doc.chart || {};
    const planets = chartData.planets || chartData.data || {};

    const natalContext = {
      sun: planets.sun ? { sign: planets.sun.sign, house: planets.sun.house, element: planets.sun.element } : undefined,
      moon: planets.moon ? { sign: planets.moon.sign, house: planets.moon.house, element: planets.moon.element } : undefined,
      ascendant: planets.ascendant ? { sign: planets.ascendant.sign, element: planets.ascendant.element } : undefined,
      mercury: planets.mercury ? { sign: planets.mercury.sign, element: planets.mercury.element } : undefined,
      aspects: chartData.aspects || []
    };

    // Generate unique metaphor via LLM
    const metaphor = await generateBlueprintMetaphor(modes, natalContext);

    // Generate full narrative via LLM
    const narrative = await narrateBlueprintClimate(modes, metaphor, natalContext);

    return narrative;
  }

  private async narrateWeatherFromIndices(doc: RenderContext): Promise<string> {
    if (!hasValidIndices(doc)) {
      return "Symbolic weather suppressed: no daily indices for this window.";
    }

    const days = doc.indices?.days || [];

    if (!days.length) {
      return "Weather data present but no daily readings available.";
    }

    // Get blueprint metaphor if available for context
    const modes = doc.constitutional_modes || doc.blueprint_modes;
    const blueprintMetaphor = modes?.blueprint_metaphor || undefined;

    // Extract transits if available
    const transits = doc.transits || doc.filtered_aspects || [];

    // Build window context
    const window = doc.window || doc.indices?.window;

    // Generate weather narrative via LLM
    const weatherContext = {
      indices: days,
      transits: transits,
      blueprintMetaphor: blueprintMetaphor,
      window: window
    };

    const narrative = await narrateSymbolicWeather(weatherContext);
    return narrative;
  }

  private async narrateStitch(
    doc: RenderContext,
    mode: ReportMode,
    allowWeather: boolean,
    blueprintNarrative?: string,
    weatherNarrative?: string
  ): Promise<string> {
    const modes = doc.constitutional_modes || doc.blueprint_modes;
    const hasBlueprint = !!(modes?.primary_mode);
    const hasWeather = allowWeather && hasValidIndices(doc);

    // Extract blueprint metaphor
    const blueprintMetaphor = modes?.blueprint_metaphor || 'constitutional architecture';

    // Build reflection context
    const reflectionContext = {
      mode: mode,
      blueprintMetaphor: blueprintMetaphor,
      blueprintNarrative: blueprintNarrative,
      weatherNarrative: weatherNarrative,
      hasWeatherData: hasWeather,
      hasBlueprintData: hasBlueprint,
      coreTensions: doc.core_tensions || [],
      relocationContext: doc.relocation ? {
        enabled: true,
        location: doc.relocation.location,
        timezone: doc.relocation.timezone
      } : undefined
    };

    // Generate stitched reflection via LLM
    const reflection = await narrateStitchedReflection(reflectionContext);
    return reflection;
  }

  public async renderFrontstage(doc: RenderContext): Promise<RenderedFrontstage> {
    // Enforce natal-only rules first
    const processedDoc = enforceNatalOnlyMode(doc);

    const mode = processedDoc.mode as ReportMode;
    const fp = processedDoc.frontstage_policy || {};
    const auto = fp.autogenerate !== false; // Default to true

    // Natal-only enforcement
    let allowWeather = true;
    if (mode === 'natal-only') {
      stripBalancePayload(processedDoc);
      allowWeather = false;
    } else {
      allowWeather = fp.allow_symbolic_weather !== false; // Default to true
    }

    // Get what to generate from directive
    const directive = processedDoc.frontstage?.directive || {};
    const include = directive.include || ['blueprint', 'symbolic_weather', 'stitched_reflection'];
    const shouldSkip = directive.status === 'skip' || !auto;

    if (shouldSkip) {
      return {
        blueprint: null,
        symbolic_weather: null,
        stitched_reflection: null
      };
    }

    const result: RenderedFrontstage = {};
    let blueprintNarrative: string | undefined;
    let weatherNarrative: string | undefined;

    // Generate blueprint
    if (include.includes('blueprint')) {
      try {
        blueprintNarrative = await this.narrateBlueprint(processedDoc);
        result.blueprint = blueprintNarrative;
      } catch (error) {
        console.error('Blueprint generation error:', error);
        result.blueprint = "Blueprint generation failed—check payload structure.";
      }
    }

    // Generate symbolic weather
    if (include.includes('symbolic_weather')) {
      if (allowWeather && hasValidIndices(processedDoc)) {
        try {
          weatherNarrative = await this.narrateWeatherFromIndices(processedDoc);
          result.symbolic_weather = weatherNarrative;
          // Derive a single scenario question from indices
          const days = processedDoc.indices?.days || [];
          if (Array.isArray(days) && days.length) {
            try {
              const scenario = indicesToScenario(days);
              result.scenario_prompt = scenario.translation;
              result.scenario_question = scenario.prompt;
            } catch {}
          }
        } catch (error) {
          console.error('Weather generation error:', error);
          result.symbolic_weather = "Weather generation failed—indices may be corrupted.";
        }
      } else {
        // Suppressed or unavailable
        result.symbolic_weather = null;

        // Add suppression note to backstage only (not shown to user)
        if (!processedDoc.backstage) processedDoc.backstage = {};
        if (!allowWeather) {
          if (!processedDoc.backstage.warnings) processedDoc.backstage.warnings = [];
          processedDoc.backstage.warnings.push("Symbolic weather suppressed: natal-only mode");
        } else if (!hasValidIndices(processedDoc)) {
          if (!processedDoc.backstage.warnings) processedDoc.backstage.warnings = [];
          processedDoc.backstage.warnings.push("Symbolic weather unavailable: no daily indices for this window");
        }
      }
    }

    // Generate stitched reflection (passes blueprint and weather narratives for context)
    if (include.includes('stitched_reflection')) {
      try {
        result.stitched_reflection = await this.narrateStitch(
          processedDoc,
          mode,
          allowWeather,
          blueprintNarrative,
          weatherNarrative
        );
      } catch (error) {
        console.error('Stitched reflection generation error:', error);
        result.stitched_reflection = "Integration reflection unavailable due to processing error.";
      }
    }

    // Always attach preface so reports start conversationally
    try {
      result.preface = this.buildPreface(processedDoc, {
        blueprintNarrative,
        weatherNarrative
      });
    } catch (e) {
      // Non-fatal; omit preface on error
      result.preface = {
        persona_intro: 'I’m the raven in the corner booth—here to mirror, not to judge.',
        resonance_profile: ['Blueprint present—watch what resonates and discard what doesn’t.'],
        paradoxes: ['Holds two truths at once—tension is not a flaw, it’s fuel.'],
        relational_focus: null
      };
    }

    return result;
  }
}

// Convenience function matching Raven Calder's pseudocode structure
export async function renderFrontstage(doc: RenderContext): Promise<RenderedFrontstage> {
  const renderer = new FrontstageRenderer();
  return await renderer.renderFrontstage(doc);
}

// Hard stop validation function
export function validatePayload(doc: any): { valid: boolean; errors: string[]; processed: any } {
  const errors: string[] = [];
  let processed = { ...doc };

  // Natal-only hard stop
  if (processed.mode === 'natal-only') {
    const balanceFields = ['indices', 'uncanny', 'transitsByDate', 'filtered_aspects', 'seismograph'];
    const foundFields = balanceFields.filter(field => processed[field] !== undefined);

    if (foundFields.length > 0) {
      // Strip the fields
      const stripResult = stripBalancePayload(processed);

      // Set backstage flags
      if (!processed.backstage) processed.backstage = {};
      processed.backstage.natal_mode = true;
      processed.backstage.stripped_balance_payload = true;

      console.log(`Reason: user selected natal-only; daily math suppressed by contract`);
    }
  }

  // Balance hard stop
  if (processed.mode === 'balance') {
    if (!processed.window && !processed.indices?.window) {
      errors.push("Balance mode missing window");
    }

    if (!processed.location && !processed.context?.person_a?.coordinates) {
      errors.push("Balance mode missing location or timezone");
    }

    if (errors.length > 0) {
      // Don't generate symbolic weather, just blueprint + stitched reflection
      if (!processed.frontstage_policy) processed.frontstage_policy = {};
      processed.frontstage_policy.allow_symbolic_weather = false;

      if (!processed.backstage) processed.backstage = {};
      if (!processed.backstage.warnings) processed.backstage.warnings = [];
      processed.backstage.warnings.push("Symbolic weather suppressed: window or location not provided");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    processed
  };
}
