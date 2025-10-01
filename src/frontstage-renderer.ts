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
  };
  [key: string]: any;
}

interface RenderedFrontstage {
  blueprint?: string | null;
  symbolic_weather?: string | null;
  stitched_reflection?: string | null;
}

export class FrontstageRenderer {
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