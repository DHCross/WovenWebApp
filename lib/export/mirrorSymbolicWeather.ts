import type { ReportContractType } from '../../app/math-brain/types';
import {
  extractAxisNumber,
  formatReportKind,
} from '../../app/math-brain/utils/formatting';
import {
  computeOverflowDetail,
  OVERFLOW_LIMIT,
  OVERFLOW_TOLERANCE,
} from '../math-brain/overflow-detail';
import { validateForExport } from '../validation/report-integrity-validator';
import { inferMbtiFromChart, formatForPoeticBrain, inferContactResonance } from '../mbti/inferMbtiFromChart';

type AxisKey = 'magnitude' | 'directional_bias' | 'volatility';

const roundHalfUp = (value: number, digits: 0 | 1 | 2 = 1): number => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toNumber = (value: any, axis?: AxisKey, context?: any): number | undefined => {
  if (axis && context) {
    return extractAxisNumber(context, axis);
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (value && typeof value === 'object') {
    if (typeof value.value === 'number' && Number.isFinite(value.value)) return value.value;
    if (typeof value.display === 'number' && Number.isFinite(value.display)) return value.display;
    if (typeof value.mean === 'number' && Number.isFinite(value.mean)) return value.mean;
    if (typeof value.score === 'number' && Number.isFinite(value.score)) return value.score;
  }
  return undefined;
};

const normalizeToFrontStage = (
  calibratedValue: number,
  metric: 'magnitude' | 'directional_bias' | 'volatility'
): number => {
  if (metric === 'directional_bias') return roundHalfUp(clamp(calibratedValue, -5, 5), 1);
  if (metric === 'volatility') return roundHalfUp(clamp(calibratedValue, 0, 5), 1);
  return roundHalfUp(clamp(calibratedValue, 0, 5), 2);
};

export interface MirrorSymbolicWeatherResult {
  payload: any;
  hasChartGeometry: boolean;
}

export interface AdditionalContext {
  relationship?: {
    type?: string;
    intimacy_tier?: string;
    role?: string;
    contact_state?: string;
    ex_estranged?: boolean;
    notes?: string;
  };
  translocation?: {
    mode?: string;
    label?: string;
    coordinates?: { lat?: number; lon?: number };
    timezone?: string;
  };
}

export function createMirrorSymbolicWeatherPayload(
  rawResult: any,
  reportContractType: ReportContractType,
  additionalContext?: AdditionalContext
): MirrorSymbolicWeatherResult | null {
  if (!rawResult) return null;

  const unifiedOutput = rawResult?.unified_output || rawResult;

  // V5.0 Strict Relational Check: If person_b structure exists, it is relational.
  // We trust the upstream route to have populated this correctly.
  const isRelational = Boolean(unifiedOutput?.person_b);

  const hasPersonAChart =
    unifiedOutput?.person_a?.chart && Object.keys(unifiedOutput.person_a.chart).length > 0;
  const hasPersonBChart =
    !unifiedOutput?.person_b ||
    (unifiedOutput.person_b?.chart && Object.keys(unifiedOutput.person_b.chart || {}).length > 0);
  const hasChartGeometry = Boolean(hasPersonAChart && hasPersonBChart);

  const relationshipContext =
    rawResult?.relationship_context ||
    rawResult?.relationship ||
    unifiedOutput?.relationship_context ||
    null;

  // Pre-compute window/date hints
  const transitsObj: Record<string, any> | null =
    (unifiedOutput?.person_a?.chart?.transitsByDate && typeof unifiedOutput.person_a.chart.transitsByDate === 'object')
      ? unifiedOutput.person_a.chart.transitsByDate
      : (unifiedOutput?.transits && typeof unifiedOutput.transits === 'object')
        ? unifiedOutput.transits
        : null;
  const dateKeys = transitsObj ? Object.keys(transitsObj).sort() : [];
  const transitDays = dateKeys.length;
  const rangeDates = (() => {
    const transitWindow = unifiedOutput?.transit_window;
    if (transitWindow?.start_date && transitWindow?.end_date) {
      return [transitWindow.start_date, transitWindow.end_date];
    }
    const runRange = unifiedOutput?.run_metadata?.date_range;
    if (Array.isArray(runRange) && runRange.length === 2) return runRange;
    if (transitDays > 0) return [dateKeys[0], dateKeys[transitDays - 1]];
    return undefined;
  })();

  const containsTransits = transitDays > 0;
  const containsWeatherData = Boolean(
    (Array.isArray(unifiedOutput?.daily_entries) && unifiedOutput.daily_entries.length > 0) ||
    containsTransits ||
    (Array.isArray(unifiedOutput?.woven_map?.symbolic_weather) && unifiedOutput.woven_map.symbolic_weather.length > 0)
  );

  const payload: any = {
    _format: 'mirror-symbolic-weather-v1',
    _version: '1.0', // V5.0 Compliance: No Coherence, No SFD
    _poetic_brain_compatible: hasChartGeometry,
    _template_hint: isRelational ? 'relational_pair' : 'solo_mirror',
    _required_sections: isRelational ? ['person_a', 'person_b'] : ['person_a'],
    _contains_transits: containsTransits,
    _contains_weather_data: containsWeatherData,
    _natal_sections: isRelational ? 2 : 1,
    ...(rangeDates ? { _range_dates: rangeDates } : {}),
    ...(transitDays ? { _transit_days: transitDays } : {}),
    generated_at: new Date().toISOString(),
    _natal_section: {
      mirror_source: 'integrated',
      note: 'Natal geometry integrated with symbolic weather in single file',
      relationship_context: relationshipContext || null,
    },
    person_a: {
      name: unifiedOutput?.person_a?.details?.name || unifiedOutput?.person_a?.name || null,
      birth_data: unifiedOutput?.person_a?.details || unifiedOutput?.person_a?.birth_data || null,
      chart: unifiedOutput?.person_a?.chart || null,
      aspects: unifiedOutput?.person_a?.aspects || [],
      summary: unifiedOutput?.person_a?.summary || null,
    },
    person_b: isRelational
      ? {
        name: unifiedOutput?.person_b?.details?.name || unifiedOutput?.person_b?.name || null,
        birth_data: unifiedOutput?.person_b?.details || unifiedOutput?.person_b?.birth_data || null,
        chart: unifiedOutput?.person_b?.chart || null,
        aspects: unifiedOutput?.person_b?.aspects || [],
        summary: unifiedOutput?.person_b?.summary || null,
      }
      : null,

    // V5.0: Honest Relationship Contract
    mirror_contract: {
      report_kind: formatReportKind(reportContractType),
      is_relational: isRelational,
      intimacy_tier: relationshipContext?.intimacy_tier || null,
      relationship_type: relationshipContext?.type || null,
      contact_state: relationshipContext?.contact_state || 'ACTIVE',
    },
    report_kind: formatReportKind(reportContractType),
    relationship_context: relationshipContext || null,

    relationship_details: additionalContext?.relationship ? {
      type: additionalContext.relationship.type || null,
      intimacy_tier: additionalContext.relationship.intimacy_tier || null,
      role: additionalContext.relationship.role || null,
      contact_state: additionalContext.relationship.contact_state || null,
      ex_estranged: additionalContext.relationship.ex_estranged ?? null,
      notes: additionalContext.relationship.notes || null,
    } : null,

    translocation_context: additionalContext?.translocation ? {
      mode: additionalContext.translocation.mode || null,
      label: additionalContext.translocation.label || null,
      coordinates: additionalContext.translocation.coordinates || null,
      timezone: additionalContext.translocation.timezone || null,
    } : null,

    // MBTI Correspondence (Poetic Brain context - symbolic, not typology)
    // v1.2: Interior Compass with per-axis reasoning and falsifiability
    mbti_correspondence: (() => {
      const chart = unifiedOutput?.person_a?.chart;
      if (!chart) return null;
      const inference = inferMbtiFromChart(chart);
      if (!inference) return null;
      const poeticContext = formatForPoeticBrain(inference);
      return {
        // Symbolic phrases for Poetic Brain - no raw MBTI codes in frontstage
        poetic_brain_context: poeticContext,
        // v1.2: Per-axis reasoning for Poetic Brain context
        axis_reasoning: inference.axisReasoning ? {
          motion: {
            call: inference.axisReasoning.EI.value === 'E' ? 'outward-first' : 'inward-first',
            confidence: inference.axisReasoning.EI.confidence,
            reasoning: inference.axisReasoning.EI.reasoning,
            falsifiability: inference.axisReasoning.EI.falsifiability,
          },
          perception: {
            call: inference.axisReasoning.NS.value === 'N' ? 'pattern-first' : 'concrete-first',
            confidence: inference.axisReasoning.NS.confidence,
            reasoning: inference.axisReasoning.NS.reasoning,
            falsifiability: inference.axisReasoning.NS.falsifiability,
          },
          decision: {
            call: inference.axisReasoning.TF.value === 'F' ? 'resonance-led' : 'structure-led',
            confidence: inference.axisReasoning.TF.confidence,
            reasoning: inference.axisReasoning.TF.reasoning,
            falsifiability: inference.axisReasoning.TF.falsifiability,
          },
          rhythm: {
            call: inference.axisReasoning.JP.value === 'J' ? 'closure-seeking' : 'open-form',
            confidence: inference.axisReasoning.JP.confidence,
            reasoning: inference.axisReasoning.JP.reasoning,
            falsifiability: inference.axisReasoning.JP.falsifiability,
          },
        } : null,
        // v1.2: Global summary
        global_summary: inference.globalSummary || null,
        // Layer separation note
        layer_note: 'Interior Compass only — describes internal processing, not contact style',
        // Backstage only - not for frontstage output
        _backstage_code: inference.code,
        _backstage_axes: inference._axes,
      };
    })(),

    // Contact Resonance (Interface behavior - separate from MBTI)
    // v1.2: Describes how others experience the person, with appearance mismatch notes
    contact_resonance: (() => {
      const chart = unifiedOutput?.person_a?.chart;
      if (!chart) return null;
      const resonance = inferContactResonance(chart);
      if (!resonance) return null;
      return {
        ignition_style: resonance.ignition_style,
        interface_tone: resonance.interface_tone,
        presentation_tempo: resonance.presentation_tempo,
        // v1.2: Appearance mismatch detection
        appearance_notes: {
          ei_mismatch: resonance.ei_appearance_note || null,
          tf_mismatch: resonance.tf_appearance_note || null,
        },
        layer_note: 'Contact Resonance — describes interface behavior, not MBTI preference',
      };
    })(),

    balance_meter_frontstage: null,
    daily_readings: [],
  };

  if (unifiedOutput?.provenance) {
    payload.provenance = unifiedOutput.provenance;
    const smpId = unifiedOutput.provenance.normalized_input_hash || unifiedOutput.provenance.hash;
    if (smpId) {
      payload.signed_map_package = smpId;
    }
  }

  // V5.0 Balance Meter: Magnitude + Bias + (Volatility as backstage)
  // REMOVED: Coherence calculation
  const balanceSummary = unifiedOutput?.person_a?.summary;
  if (balanceSummary) {
    const rawMag = toNumber(balanceSummary.magnitude, 'magnitude', balanceSummary);
    const rawBias = toNumber(
      balanceSummary.directional_bias?.value || balanceSummary.directional_bias,
      'directional_bias',
      balanceSummary
    );
    const rawVol = toNumber(balanceSummary.volatility, 'volatility', balanceSummary);

    payload.balance_meter_frontstage = {
      magnitude: typeof rawMag === 'number' ? normalizeToFrontStage(rawMag, 'magnitude') : null,
      directional_bias: typeof rawBias === 'number' ? normalizeToFrontStage(rawBias, 'directional_bias') : null,
      volatility: typeof rawVol === 'number' ? normalizeToFrontStage(rawVol, 'volatility') : null,
      // coherence: REMOVED per v5.0 spec
      magnitude_label: balanceSummary.magnitude_label || null,
      directional_bias_label: balanceSummary.directional_bias_label || balanceSummary.valence_label || null,
      volatility_label: balanceSummary.volatility_label || null,
    };
  }

  const transits = unifiedOutput?.person_a?.chart?.transitsByDate;
  if (transits && typeof transits === 'object') {
    const dailyReadings: any[] = [];
    Object.keys(transits)
      .sort()
      .forEach((date) => {
        const dayData = (transits as any)[date];
        if (!dayData) return;

        const seismo = (dayData as any).seismograph || dayData;
        const rawMag = toNumber(seismo.magnitude, 'magnitude', seismo);
        const rawBias = toNumber(
          seismo.directional_bias?.value || seismo.directional_bias,
          'directional_bias',
          seismo
        );
        const rawVol = toNumber(seismo.volatility, 'volatility', seismo);

        const safeRawMag = typeof rawMag === 'number' && Number.isFinite(rawMag) ? rawMag : null;
        const safeRawBias = typeof rawBias === 'number' && Number.isFinite(rawBias) ? rawBias : null;
        const safeRawVol = typeof rawVol === 'number' && Number.isFinite(rawVol) ? rawVol : null;

        // REMOVED: Coherence calculation in daily loop

        const magnitudeClampedFlag = typeof safeRawMag === 'number' && safeRawMag > OVERFLOW_LIMIT;
        const directionalClampedFlag = typeof safeRawBias === 'number' && Math.abs(safeRawBias) > OVERFLOW_LIMIT;
        const saturationFlag = typeof safeRawMag === 'number' && safeRawMag >= OVERFLOW_LIMIT - OVERFLOW_TOLERANCE;

        const overflowDetail = computeOverflowDetail({
          rawMagnitude: safeRawMag,
          clampedMagnitude: typeof safeRawMag === 'number' ? clamp(safeRawMag, 0, 5) : null,
          rawDirectionalBias: safeRawBias,
          clampedDirectionalBias: typeof safeRawBias === 'number' ? clamp(safeRawBias, -5, 5) : null,
          magnitudeClamped: magnitudeClampedFlag,
          directionalBiasClamped: directionalClampedFlag,
          saturation: saturationFlag,
          aspects: (dayData as any).aspects,
        });

        dailyReadings.push({
          date,
          magnitude: typeof safeRawMag === 'number' ? normalizeToFrontStage(safeRawMag, 'magnitude') : null,
          directional_bias: typeof safeRawBias === 'number' ? normalizeToFrontStage(safeRawBias, 'directional_bias') : null,
          volatility: typeof safeRawVol === 'number' ? normalizeToFrontStage(safeRawVol, 'volatility') : null,
          // coherence: REMOVED per v5.0 spec

          raw_magnitude: safeRawMag ?? null,
          raw_bias_signed: safeRawBias ?? null,
          raw_volatility: safeRawVol ?? null,
          label: (dayData as any).label || null,
          notes: (dayData as any).notes || null,
          aspects: (dayData as any).aspects || [],
          aspect_count: (dayData as any).aspects?.length || 0,
          overflow_detail: overflowDetail,
        });
      });

    payload.daily_readings = dailyReadings;
    payload.reading_count = dailyReadings.length;
  }

  if (unifiedOutput?.woven_map?.symbolic_weather) {
    payload.symbolic_weather_context = unifiedOutput.woven_map.symbolic_weather;
  }

  const validationResult = validateForExport(payload, 'json', {
    requestsSymbolicRead: true,
  });

  if (validationResult.warnings.length > 0 || validationResult.errors.length > 0) {
    payload._validation = {
      valid: validationResult.valid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      forceGenericSymbolicRead: validationResult.forceGenericSymbolicRead,
    };
  }

  return {
    payload,
    hasChartGeometry,
  };
}
