/* Frontstage Renderer with Mode-Specific Content Generation */

import {
  ReportMode,
  shouldGenerateSymbolicWeather,
  hasValidIndices,
  stripBalancePayload,
  enforceNatalOnlyMode
} from './schema-rule-patch';

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
    // Extract natal placements for blueprint narrative
    const placements = doc.person_a?.chart?.planets || doc.natal_summary?.placements?.core || [];

    if (!placements.length) {
      return "Blueprint unavailable: no natal placements found in payload.";
    }

    // Basic blueprint from key placements
    const sun = placements.find((p: any) => p.name === 'Sun');
    const moon = placements.find((p: any) => p.name === 'Moon');
    const ascendant = placements.find((p: any) => p.name === 'Ascendant');

    const parts = [];
    if (sun?.sign) parts.push(`Sun in ${sun.sign}`);
    if (moon?.sign) parts.push(`Moon in ${moon.sign}`);
    if (ascendant?.sign) parts.push(`${ascendant.sign} Rising`);

    const blueprint = parts.length > 0
      ? `Core blueprint: ${parts.join(', ')}.`
      : "Blueprint detected but key placements unclear.";

    return blueprint;
  }

  private async narrateWeatherFromIndices(doc: RenderContext): Promise<string> {
    if (!hasValidIndices(doc)) {
      return "Symbolic weather suppressed: no daily indices for this window.";
    }

    const days = doc.indices?.days || [];
    const recentDays = days.slice(-3); // Last 3 days for weather summary

    if (!recentDays.length) {
      return "Weather data present but no recent daily readings available.";
    }

    // Simple weather narrative from indices
    const avgMagnitude = recentDays.reduce((sum: number, day: any) => sum + (day.magnitude || 0), 0) / recentDays.length;
    const avgVolatility = recentDays.reduce((sum: number, day: any) => sum + (day.volatility || 0), 0) / recentDays.length;

    let weatherTone = "Neutral weather patterns";
    if (avgMagnitude > 3 && avgVolatility > 3) {
      weatherTone = "High-intensity weather with significant volatility";
    } else if (avgMagnitude > 3) {
      weatherTone = "Elevated magnitude with steady undercurrents";
    } else if (avgVolatility > 3) {
      weatherTone = "Scattered weather patterns with variable intensity";
    }

    return `${weatherTone} over the recent ${recentDays.length}-day window.`;
  }

  private async narrateStitch(doc: RenderContext, mode: ReportMode, allowWeather: boolean): Promise<string> {
    const hasBlueprint = !!(doc.person_a?.chart?.planets?.length || doc.natal_summary?.placements);
    const hasWeather = allowWeather && hasValidIndices(doc);

    if (mode === 'natal-only') {
      return hasBlueprint
        ? "Natal reflection stands alone—track how these patterns surface in lived experience."
        : "Natal structure unclear—re-export the chart with full placements.";
    }

    if (hasBlueprint && hasWeather) {
      return "Blueprint and current weather patterns intersect—observe how natal themes respond to daily transits.";
    } else if (hasBlueprint) {
      return "Blueprint present without current weather data—using natal baseline only.";
    } else if (hasWeather) {
      return "Weather patterns available but missing natal context for full integration.";
    }

    return "Integration limited: missing both natal blueprint and current weather data.";
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

    // Generate blueprint
    if (include.includes('blueprint')) {
      try {
        result.blueprint = await this.narrateBlueprint(processedDoc);
      } catch (error) {
        result.blueprint = "Blueprint generation failed—check payload structure.";
      }
    }

    // Generate symbolic weather
    if (include.includes('symbolic_weather')) {
      if (allowWeather && hasValidIndices(processedDoc)) {
        try {
          result.symbolic_weather = await this.narrateWeatherFromIndices(processedDoc);
        } catch (error) {
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

    // Generate stitched reflection
    if (include.includes('stitched_reflection')) {
      try {
        result.stitched_reflection = await this.narrateStitch(processedDoc, mode, allowWeather);
      } catch (error) {
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