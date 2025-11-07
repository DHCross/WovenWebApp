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

export function createMirrorSymbolicWeatherPayload(
  rawResult: any,
  reportContractType: ReportContractType
): MirrorSymbolicWeatherResult | null {
  if (!rawResult) return null;

  const unifiedOutput = rawResult?.unified_output || rawResult;
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
      : (unifiedOutput?._field_file?.daily && typeof unifiedOutput._field_file.daily === 'object')
        ? unifiedOutput._field_file.daily
        : null;
  const dateKeys = transitsObj ? Object.keys(transitsObj).sort() : [];
  const transitDays = dateKeys.length;
  const rangeDates = (() => {
    const fieldPeriod = unifiedOutput?._field_file?.period;
    if (fieldPeriod?.s && fieldPeriod?.e) return [fieldPeriod.s, fieldPeriod.e];
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
    _version: '1.0',
    _poetic_brain_compatible: hasChartGeometry,
    // Lightweight ingestion hints to help early classification in partial reads
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
    person_b: unifiedOutput?.person_b
      ? {
          name: unifiedOutput?.person_b?.details?.name || unifiedOutput?.person_b?.name || null,
          birth_data: unifiedOutput?.person_b?.details || unifiedOutput?.person_b?.birth_data || null,
          chart: unifiedOutput?.person_b?.chart || null,
          aspects: unifiedOutput?.person_b?.aspects || [],
          summary: unifiedOutput?.person_b?.summary || null,
        }
      : null,
    report_kind: formatReportKind(reportContractType),
    relationship_context: relationshipContext || null,
    balance_meter_frontstage: null,
    daily_readings: [],
  };

  if (unifiedOutput?.provenance) {
    payload.provenance = unifiedOutput.provenance;
    const smpId =
      unifiedOutput.provenance.normalized_input_hash || unifiedOutput.provenance.hash;
    if (smpId) {
      payload.signed_map_package = smpId;
    }
  }

  const balanceSummary = unifiedOutput?.person_a?.summary;
  if (balanceSummary) {
    const rawMag = toNumber(balanceSummary.magnitude, 'magnitude', balanceSummary);
    const rawBias = toNumber(
      balanceSummary.directional_bias?.value,
      'directional_bias',
      balanceSummary
    );
    const rawVol = toNumber(balanceSummary.volatility, 'volatility', balanceSummary);

    let summaryCoherence: number | null = null;
    if (typeof rawVol === 'number') {
      const volNorm = rawVol > 1.01 ? rawVol / 5 : rawVol;
      summaryCoherence = 5 - volNorm * 5;
      summaryCoherence = Math.max(0, Math.min(5, Math.round(summaryCoherence * 10) / 10));
    }

    payload.balance_meter_frontstage = {
      magnitude:
        typeof rawMag === 'number' ? normalizeToFrontStage(rawMag, 'magnitude') : null,
      directional_bias:
        typeof rawBias === 'number'
          ? normalizeToFrontStage(rawBias, 'directional_bias')
          : null,
      volatility:
        typeof rawVol === 'number' ? normalizeToFrontStage(rawVol, 'volatility') : null,
      coherence: summaryCoherence,
      magnitude_label: balanceSummary.magnitude_label || null,
      directional_bias_label:
        balanceSummary.directional_bias_label || balanceSummary.valence_label || null,
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
          seismo.directional_bias?.value,
          'directional_bias',
          seismo
        );
        const rawVol = toNumber(seismo.volatility, 'volatility', seismo);

        const safeRawMag =
          typeof rawMag === 'number' && Number.isFinite(rawMag) ? rawMag : null;
        const safeRawBias =
          typeof rawBias === 'number' && Number.isFinite(rawBias) ? rawBias : null;
        const safeRawVol =
          typeof rawVol === 'number' && Number.isFinite(rawVol) ? rawVol : null;

        let volNorm: number | null = null;
        if (typeof safeRawVol === 'number') {
          volNorm = safeRawVol > 1.01 ? safeRawVol / 5 : safeRawVol;
        }

        let coherence: number | null = null;
        if (typeof volNorm === 'number') {
          coherence = 5 - volNorm * 5;
          coherence = Math.max(0, Math.min(5, Math.round(coherence * 10) / 10));
        }

        const magnitudeClampedFlag =
          typeof safeRawMag === 'number' && safeRawMag > OVERFLOW_LIMIT;
        const directionalClampedFlag =
          typeof safeRawBias === 'number' && Math.abs(safeRawBias) > OVERFLOW_LIMIT;
        const saturationFlag =
          typeof safeRawMag === 'number' &&
          safeRawMag >= OVERFLOW_LIMIT - OVERFLOW_TOLERANCE;

        const overflowDetail = computeOverflowDetail({
          rawMagnitude: safeRawMag,
          clampedMagnitude: typeof safeRawMag === 'number' ? clamp(safeRawMag, 0, 5) : null,
          rawDirectionalBias: safeRawBias,
          clampedDirectionalBias:
            typeof safeRawBias === 'number' ? clamp(safeRawBias, -5, 5) : null,
          magnitudeClamped: magnitudeClampedFlag,
          directionalBiasClamped: directionalClampedFlag,
          saturation: saturationFlag,
          aspects: (dayData as any).aspects,
        });

        dailyReadings.push({
          date,
          magnitude:
            typeof safeRawMag === 'number'
              ? normalizeToFrontStage(safeRawMag, 'magnitude')
              : null,
          directional_bias:
            typeof safeRawBias === 'number'
              ? normalizeToFrontStage(safeRawBias, 'directional_bias')
              : null,
          volatility:
            typeof safeRawVol === 'number'
              ? normalizeToFrontStage(safeRawVol, 'volatility')
              : null,
          coherence,
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

  return {
    payload,
    hasChartGeometry,
  };
}
