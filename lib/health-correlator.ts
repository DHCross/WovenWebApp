// lib/health-correlator.ts
// Modern TypeScript implementation of Apple Health × Symbolic Weather correlation analysis
// Implements Uncanny Scoring with statistical validation via shuffle testing

import type {
  AppleHealthExport,
  NormalizedHealthMetrics,
  HealthByDate,
  SeismographMap,
  SeismographDay,
  CorrelationResults,
  ShuffleTestResults,
  BandSummary,
  ComparativeReportData,
  UncannyScoreConfig,
  HealthDataPoint,
  StateOfMind,
} from './health-data-types';

import { DEFAULT_UNCANNY_CONFIG } from './health-data-types';

/**
 * Normalize Apple Health Auto Export JSON to standard metrics format
 */
export function normalizeAppleHealthData(raw: AppleHealthExport): NormalizedHealthMetrics {
  const metrics: NormalizedHealthMetrics = {};

  // Helper to extract date (YYYY-MM-DD) from ISO timestamp
  const toDate = (iso: string): string => iso.slice(0, 10);

  // Helper to aggregate daily values (mean)
  const dailyAggregate = (items: Array<{ start: string; value: number }>): HealthDataPoint[] => {
    const byDate: Record<string, number[]> = {};
    items.forEach((item: { start: string; value: number }) => {
      const date = toDate(item.start);
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(item.value);
    });
    return Object.entries(byDate).map(([date, values]: [string, number[]]) => ({
      date,
      value: values.reduce((a, b) => a + b, 0) / values.length,
    }));
  };

  // State of Mind → Mood Valence & Label Count
  if (raw.data.stateOfMind) {
    const moodByDate: Record<string, { valence: number[]; labels: Set<string> }> = {};
    raw.data.stateOfMind.forEach((entry: StateOfMind) => {
      const date = toDate(entry.start);
      if (!moodByDate[date]) moodByDate[date] = { valence: [], labels: new Set() };
      moodByDate[date].valence.push(entry.valence);
      (entry.labels || []).forEach(label => moodByDate[date].labels.add(label));
    });

    metrics.mood_valence = Object.entries(moodByDate).map(([date, data]) => ({
      date,
      value: data.valence.reduce((a, b) => a + b, 0) / data.valence.length,
    }));

    metrics.mood_label_count = Object.entries(moodByDate).map(([date, data]) => ({
      date,
      value: data.labels.size,
    }));
  }

  // HRV (Heart Rate Variability)
  if (raw.data.heartRateVariability) {
    metrics.hrv = dailyAggregate(raw.data.heartRateVariability);
  }

  // Resting Heart Rate
  if (raw.data.restingHeartRate) {
    metrics.resting_hr = dailyAggregate(raw.data.restingHeartRate);
  }

  // General Heart Rate
  if (raw.data.heartRate) {
    metrics.heart_rate = dailyAggregate(raw.data.heartRate);
  }

  // Sleep Analysis → Sleep Hours
  if (raw.data.sleepAnalysis) {
    const sleepByDate: Record<string, number> = {};
    raw.data.sleepAnalysis.forEach(entry => {
      if (entry.value === 'InBed' || entry.value === 'Asleep') {
        const date = toDate(entry.start);
        const hours = (new Date(entry.end).getTime() - new Date(entry.start).getTime()) / (1000 * 60 * 60);
        sleepByDate[date] = (sleepByDate[date] || 0) + hours;
      }
    });
    metrics.sleep_hours = Object.entries(sleepByDate).map(([date, value]) => ({ date, value }));
  }

  // Active Energy Burned
  if (raw.data.activeEnergyBurned) {
    const energyByDate: Record<string, number> = {};
    raw.data.activeEnergyBurned.forEach(entry => {
      const date = toDate(entry.start);
      energyByDate[date] = (energyByDate[date] || 0) + entry.value;
    });
    metrics.active_energy = Object.entries(energyByDate).map(([date, value]) => ({ date, value }));
  }

  // Apple Stand Time → Stand Minutes
  if (raw.data.appleStandTime) {
    const standByDate: Record<string, number> = {};
    raw.data.appleStandTime.forEach(entry => {
      const date = toDate(entry.start);
      const minutes = entry.unit === 'min' ? entry.value : entry.value / 60;
      standByDate[date] = (standByDate[date] || 0) + minutes;
    });
    metrics.stand_minutes = Object.entries(standByDate).map(([date, value]) => ({ date, value }));
  }

  // Apple Exercise Time → Exercise Minutes
  if (raw.data.appleExerciseTime) {
    const exerciseByDate: Record<string, number> = {};
    raw.data.appleExerciseTime.forEach(entry => {
      const date = toDate(entry.start);
      const minutes = entry.unit === 'min' ? entry.value : entry.value / 60;
      exerciseByDate[date] = (exerciseByDate[date] || 0) + minutes;
    });
    metrics.exercise_minutes = Object.entries(exerciseByDate).map(([date, value]) => ({ date, value }));
  }

  // Mindful Sessions → Mindful Minutes
  if (raw.data.mindfulSession) {
    const mindfulByDate: Record<string, number> = {};
    raw.data.mindfulSession.forEach(entry => {
      const date = toDate(entry.start);
      const minutes = (new Date(entry.end).getTime() - new Date(entry.start).getTime()) / (1000 * 60);
      mindfulByDate[date] = (mindfulByDate[date] || 0) + minutes;
    });
    metrics.mindful_minutes = Object.entries(mindfulByDate).map(([date, value]) => ({ date, value }));
  }

  // Walking metrics
  if (raw.data.walkingHeartRateAverage) {
    metrics.walking_hr_avg = dailyAggregate(raw.data.walkingHeartRateAverage);
  }

  if (raw.data.walkingDistance) {
    const distByDate: Record<string, number> = {};
    raw.data.walkingDistance.forEach(entry => {
      const date = toDate(entry.start);
      const miles = entry.unit === 'mi' ? entry.value : entry.value * 0.000621371; // meters to miles
      distByDate[date] = (distByDate[date] || 0) + miles;
    });
    metrics.walking_distance = Object.entries(distByDate).map(([date, value]) => ({ date, value }));
  }

  if (raw.data.walkingAsymmetryPercentage) {
    metrics.walk_asym_pct = dailyAggregate(raw.data.walkingAsymmetryPercentage);
  }

  if (raw.data.walkingDoubleSupportPercentage) {
    metrics.walk_double_support_pct = dailyAggregate(raw.data.walkingDoubleSupportPercentage);
  }

  return metrics;
}

/**
 * Build health data indexed by date for fast lookup
 */
export function buildHealthByDate(health: NormalizedHealthMetrics): HealthByDate {
  const byDate: HealthByDate = {};

  Object.entries(health).forEach(([metric, dataPoints]) => {
    if (!dataPoints) return;
    dataPoints.forEach((pt: HealthDataPoint) => {
      const date = pt.date;
      if (!byDate[date]) byDate[date] = {};
      (byDate[date] as any)[metric] = pt.value;
    });
  });

  return byDate;
}

/**
 * Get seismograph valence (handles both valence and valence_bounded)
 */
function getSeismographValence(seismo: SeismographDay): number | null {
  if (typeof seismo.valence_bounded === 'number') return seismo.valence_bounded;
  if (typeof seismo.valence === 'number') return seismo.valence;
  return null;
}

/**
 * Clamp value to range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Min-max normalize an array
 */
function minMaxNormalize(series: (number | null)[]): (number | null)[] | null {
  const validValues = series.filter((v): v is number => v !== null && !isNaN(v));
  if (validValues.length === 0) return null;

  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  if (min === max) return null;

  return series.map(v => (v === null || isNaN(v) ? null : (v - min) / (max - min)));
}

/**
 * Calculate similarity score (1 - mean absolute difference)
 */
function similarity(a: (number | null)[], b: (number | null)[]): number | null {
  if (a.length === 0 || a.length !== b.length) return null;

  let sum = 0;
  let count = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== null && b[i] !== null) {
      sum += Math.abs((a[i] as number) - (b[i] as number));
      count++;
    }
  }

  if (count === 0) return null;
  const mean = sum / count;
  return parseFloat((1 - mean).toFixed(2));
}

/**
 * Calculate three-axis correlation (Valence, Magnitude, Volatility)
 */
export function calculateCorrelation(
  seismoMap: SeismographMap,
  healthByDate: HealthByDate
): CorrelationResults {
  const dates = Object.keys(seismoMap)
    .filter(d => !!healthByDate[d])
    .sort();

  const arrays = {
    s_val: [] as (number | null)[],
    h_val: [] as (number | null)[],
    s_mag: [] as (number | null)[],
    h_mag: [] as (number | null)[],
    s_vol: [] as (number | null)[],
    h_vol: [] as (number | null)[],
    raw_s_mag_rhr: [] as (number | null)[],
    raw_h_rhr: [] as (number | null)[],
    raw_s_mag_act: [] as (number | null)[],
    raw_h_act: [] as (number | null)[],
  };

  let lastMood: number | null = null;

  dates.forEach(date => {
    const s = seismoMap[date] || {};
    const h = healthByDate[date] || {};

    // Valence normalization (-1 to +1)
    const seismoValRaw = getSeismographValence(s);
    const sv = seismoValRaw !== null ? clamp(seismoValRaw / 5, -1, 1) : null;
    const hv = typeof h.mood_valence === 'number' ? clamp(h.mood_valence, -1, 1) : null;
    if (sv !== null && hv !== null) {
      arrays.s_val.push(sv);
      arrays.h_val.push(hv);
    }

    // Magnitude vs intensity proxy
    const sm = typeof s.magnitude === 'number' ? clamp(s.magnitude / 5, 0, 1) : null;
    const labelCount = h.mood_label_count;
    const labelNorm = typeof labelCount === 'number' ? clamp(labelCount / 10, 0, 1) : null;
    const sleepH = typeof h.sleep_hours === 'number' ? clamp(h.sleep_hours / 12, 0, 1) : null;
    const intensityProxy = labelNorm !== null ? labelNorm :
                          (sleepH !== null && sm !== null ? 1 - Math.abs((sleepH + sm) - 1) : null);
    if (sm !== null && intensityProxy !== null) {
      arrays.s_mag.push(sm);
      arrays.h_mag.push(intensityProxy);
    }

    // Volatility vs swings/HRV
    const svv = typeof s.volatility === 'number' ? clamp(s.volatility / 5, 0, 1) : null;
    let swing: number | null = null;
    if (typeof h.mood_valence === 'number' && lastMood !== null) {
      swing = Math.min(1, Math.abs(h.mood_valence - lastMood));
    }
    lastMood = typeof h.mood_valence === 'number' ? h.mood_valence : lastMood;
    const hrvNorm = typeof h.hrv === 'number' ? clamp(h.hrv / 150, 0, 1) : null;
    const volProxy = swing !== null ? swing : hrvNorm;
    if (svv !== null && volProxy !== null) {
      arrays.s_vol.push(svv);
      arrays.h_vol.push(volProxy);
    }

    // Supplemental: Magnitude ↔ Resting HR
    if (typeof h.resting_hr === 'number' && sm !== null) {
      arrays.raw_s_mag_rhr.push(sm * 5);
      arrays.raw_h_rhr.push(h.resting_hr);
    }

    // Supplemental: Magnitude ↔ Active Energy
    if (typeof h.active_energy === 'number' && sm !== null) {
      arrays.raw_s_mag_act.push(sm * 5);
      arrays.raw_h_act.push(h.active_energy);
    }
  });

  const results: CorrelationResults = {};

  results.valence_mood = similarity(arrays.s_val, arrays.h_val) ?? undefined;
  results.magnitude_intensity = similarity(arrays.s_mag, arrays.h_mag) ?? undefined;
  results.volatility_swings = similarity(arrays.s_vol, arrays.h_vol) ?? undefined;

  const validScores = [
    results.valence_mood,
    results.magnitude_intensity,
    results.volatility_swings
  ].filter((s): s is number => s !== undefined);

  if (validScores.length > 0) {
    results.composite = parseFloat((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2));
  }

  // Supplemental correlations
  results.supplemental = {};

  const ns_rhr = minMaxNormalize(arrays.raw_s_mag_rhr);
  const nh_rhr = minMaxNormalize(arrays.raw_h_rhr);
  if (ns_rhr && nh_rhr) {
    results.supplemental.magnitude_rhr = similarity(ns_rhr, nh_rhr) ?? undefined;
  }

  const ns_act = minMaxNormalize(arrays.raw_s_mag_act);
  const nh_act = minMaxNormalize(arrays.raw_h_act);
  if (ns_act && nh_act) {
    results.supplemental.magnitude_active_energy = similarity(ns_act, nh_act) ?? undefined;
  }

  return results;
}

/**
 * Run shuffle test for statistical significance
 */
export function runShuffleTest(
  seismoMap: SeismographMap,
  healthByDate: HealthByDate,
  iterations: number = 1000
): ShuffleTestResults | null {
  const dates = Object.keys(seismoMap)
    .filter(d => !!healthByDate[d])
    .sort();

  if (dates.length <= 3) return null; // Too small for meaningful test

  // Build normalized rows
  interface Row {
    s_val: number | null;
    h_val: number | null;
    s_mag: number | null;
    h_mag: number | null;
    s_vol: number | null;
    h_vol: number | null;
  }

  const rows: Row[] = [];
  let prevMood: number | null = null;

  dates.forEach(date => {
    const s = seismoMap[date] || {};
    const h = healthByDate[date] || {};

    const seismoValRaw = getSeismographValence(s);
    const s_val = seismoValRaw !== null ? clamp(seismoValRaw / 5, -1, 1) : null;
    const h_val = typeof h.mood_valence === 'number' ? clamp(h.mood_valence, -1, 1) : null;

    const s_mag = typeof s.magnitude === 'number' ? clamp(s.magnitude / 5, 0, 1) : null;
    const labelCount = h.mood_label_count;
    const labelNorm = typeof labelCount === 'number' ? clamp(labelCount / 10, 0, 1) : null;
    const sleepH = typeof h.sleep_hours === 'number' ? clamp(h.sleep_hours / 12, 0, 1) : null;
    const h_mag = labelNorm !== null ? labelNorm :
                 (sleepH !== null && s_mag !== null ? 1 - Math.abs((sleepH + s_mag) - 1) : null);

    const s_vol = typeof s.volatility === 'number' ? clamp(s.volatility / 5, 0, 1) : null;
    let swing: number | null = null;
    if (typeof h.mood_valence === 'number' && prevMood !== null) {
      swing = Math.min(1, Math.abs(h.mood_valence - prevMood));
    }
    prevMood = typeof h.mood_valence === 'number' ? h.mood_valence : prevMood;
    const h_vol = swing !== null ? swing : (typeof h.hrv === 'number' ? clamp(h.hrv / 150, 0, 1) : null);

    rows.push({ s_val, h_val, s_mag, h_mag, s_vol, h_vol });
  });

  function compositeFromRows(rows: Row[]): number {
    const S = { val: [] as number[], mag: [] as number[], vol: [] as number[] };
    const H = { val: [] as number[], mag: [] as number[], vol: [] as number[] };

    rows.forEach(r => {
      if (r.s_val !== null && r.h_val !== null) { S.val.push(r.s_val); H.val.push(r.h_val); }
      if (r.s_mag !== null && r.h_mag !== null) { S.mag.push(r.s_mag); H.mag.push(r.h_mag); }
      if (r.s_vol !== null && r.h_vol !== null) { S.vol.push(r.s_vol); H.vol.push(r.h_vol); }
    });

    const scores = [
      similarity(S.val, H.val),
      similarity(S.mag, H.mag),
      similarity(S.vol, H.vol)
    ].filter((s): s is number => s !== null);

    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  const observed = compositeFromRows(rows);

  // Run shuffle permutations
  const shuffledScores: number[] = [];
  const H = rows.map(r => ({ h_val: r.h_val, h_mag: r.h_mag, h_vol: r.h_vol }));
  const n = rows.length;

  for (let k = 0; k < iterations; k++) {
    // Fisher-Yates shuffle of indices
    const indices = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const permRows = rows.map((r, i) => ({
      s_val: r.s_val,
      s_mag: r.s_mag,
      s_vol: r.s_vol,
      h_val: H[indices[i]].h_val,
      h_mag: H[indices[i]].h_mag,
      h_vol: H[indices[i]].h_vol,
    }));

    shuffledScores.push(compositeFromRows(permRows));
  }

  const mean = shuffledScores.reduce((a, b) => a + b, 0) / iterations;
  const variance = shuffledScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (iterations - 1);
  const sd = Math.sqrt(variance);
  const max = Math.max(...shuffledScores);
  const ge = shuffledScores.filter(score => score >= observed).length;
  const p_value = ge / iterations;

  return {
    observed: parseFloat(observed.toFixed(2)),
    null_mean: parseFloat(mean.toFixed(2)),
    null_sd: parseFloat(sd.toFixed(2)),
    null_max: parseFloat(max.toFixed(2)),
    p_value: parseFloat(p_value.toFixed(3)),
    iterations,
  };
}

/**
 * Calculate band summary (WB/ABE/OSR classification)
 */
export function calculateBandSummary(
  seismoMap: SeismographMap,
  healthByDate: HealthByDate,
  withinThreshold: number = 0.20,
  edgeThreshold: number = 0.35
): BandSummary {
  const dates = Object.keys(seismoMap)
    .filter(d => !!healthByDate[d])
    .sort();

  let within = 0, edge = 0, outside = 0;
  let prevMood: number | null = null;

  dates.forEach(date => {
    const s = seismoMap[date] || {};
    const h = healthByDate[date] || {};

    const seismoValRaw = getSeismographValence(s);
    const s_val = seismoValRaw !== null ? clamp(seismoValRaw / 5, -1, 1) : null;
    const h_val = typeof h.mood_valence === 'number' ? clamp(h.mood_valence, -1, 1) : null;

    const s_mag = typeof s.magnitude === 'number' ? clamp(s.magnitude / 5, 0, 1) : null;
    const labelCount = h.mood_label_count;
    const labelNorm = typeof labelCount === 'number' ? clamp(labelCount / 10, 0, 1) : null;
    const sleepH = typeof h.sleep_hours === 'number' ? clamp(h.sleep_hours / 12, 0, 1) : null;
    const h_mag = labelNorm !== null ? labelNorm :
                 (sleepH !== null && s_mag !== null ? 1 - Math.abs((sleepH + s_mag) - 1) : null);

    const s_vol = typeof s.volatility === 'number' ? clamp(s.volatility / 5, 0, 1) : null;
    let swing: number | null = null;
    if (typeof h.mood_valence === 'number' && prevMood !== null) {
      swing = Math.min(1, Math.abs(h.mood_valence - prevMood));
    }
    prevMood = typeof h.mood_valence === 'number' ? h.mood_valence : prevMood;
    const h_vol = swing !== null ? swing : (typeof h.hrv === 'number' ? clamp(h.hrv / 150, 0, 1) : null);

    const diffs: number[] = [];
    if (s_val !== null && h_val !== null) diffs.push(Math.abs(s_val - h_val));
    if (s_mag !== null && h_mag !== null) diffs.push(Math.abs(s_mag - h_mag));
    if (s_vol !== null && h_vol !== null) diffs.push(Math.abs(s_vol - h_vol));

    if (diffs.length === 0) return;

    const meanDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;

    if (meanDiff <= withinThreshold) within++;
    else if (meanDiff <= edgeThreshold) edge++;
    else outside++;
  });

  return { within, edge, outside };
}

/**
 * Generate complete comparative report
 */
export function generateComparativeReport(
  seismoMap: SeismographMap,
  health: NormalizedHealthMetrics,
  config: Partial<UncannyScoreConfig> = {}
): ComparativeReportData {
  const fullConfig = { ...DEFAULT_UNCANNY_CONFIG, ...config };
  const healthByDate = buildHealthByDate(health);

  const dates = Object.keys(seismoMap)
    .filter(d => !!healthByDate[d])
    .sort();

  if (dates.length === 0) {
    throw new Error('No overlapping dates between symbolic weather and health data');
  }

  const correlation = calculateCorrelation(seismoMap, healthByDate);
  const bandSummary = calculateBandSummary(seismoMap, healthByDate, fullConfig.withinThreshold, fullConfig.edgeThreshold);

  const shuffleTest = fullConfig.includeShuffleTest
    ? runShuffleTest(seismoMap, healthByDate, fullConfig.shuffleIterations) ?? undefined
    : undefined;

  const dailyScores = dates.map(date => ({
    date,
    seismo: seismoMap[date],
    health: healthByDate[date],
    score: 0, // TODO: Implement simple heuristic score
  }));

  const availableMetrics = Object.keys(health).filter(key => health[key as keyof NormalizedHealthMetrics]?.length);

  return {
    dateRange: {
      start: dates[0],
      end: dates[dates.length - 1],
    },
    correlation,
    shuffleTest,
    bandSummary,
    dailyScores,
    availableMetrics,
  };
}
