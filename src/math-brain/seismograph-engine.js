/**
 * Seismograph Engine - Two-Axis Symbolic Seismograph
 *
 * Computes daily seismograph metrics (magnitude, directional bias, volatility) and
 * generates transit tables with aspect filtering and symbolic weighting.
 *
 * Core exports:
 * - calculateSeismograph() - Main aggregation engine
 * - formatTransitTable() - Orb-band formatting with phase and scoring
 */

// Import from proper module locations to avoid circular dependencies
// Use canonical core under math-brain to avoid legacy dependency
const { aggregate, _internals: seismoInternals } = require('./seismograph-core.js');
const {
  classifyMagnitude,
  classifyDirectionalBias,
  classifyVolatility,
} = require('../../lib/reporting/metric-labels');
const { scaleDirectionalBias } = require('../../lib/reporting/canonical-scaling');

// NOTE: Helper functions from monolith are passed via options.helpers to avoid circular dependency
// (seismograph-engine is required by orchestrator, which is required by monolith)
// Instead of trying to lazy-load them, we accept them as parameters.

function getLazyImports() {
  // This function is deprecated - helpers should be passed via options.helpers
  // But we keep it for backward compatibility
  return {
    enrichDailyAspects: undefined,
    selectPoeticAspects: undefined,
    weightAspect: undefined,
    ASPECT_CLASS: undefined,
    BALANCE_CALIBRATION_VERSION: undefined,
    SEISMOGRAPH_VERSION: undefined,
    WEIGHTS_LEGEND: undefined,
  };
}

/**
 * Formats daily aspects into orb-band transit table with phase tracking and scoring.
 * 
 * @param {Array} enrichedAspects - Array of aspect objects with _orb, _aspect, p1_name, p2_name
 * @param {Array|null} prevDayAspects - Previous day's aspects for phase tracking (tightening/separating)
 * @returns {Object} Transit table with exact/tight/moderate/wide bands and markdown
 */
function formatTransitTable(enrichedAspects, prevDayAspects = null) {
  if (!Array.isArray(enrichedAspects) || enrichedAspects.length === 0) {
    return {
      exact: [],
      tight: [],
      moderate: [],
      wide: [],
      markdown: "No aspects for this date.",
      phaseLookup: new Map()
    };
  }

  // Create lookup map for previous day's orbs to determine phase
  const prevOrbMap = new Map();
  if (prevDayAspects && Array.isArray(prevDayAspects)) {
    for (const aspect of prevDayAspects) {
      const key = `${aspect.p1_name}|${aspect._aspect}|${aspect.p2_name}`;
      prevOrbMap.set(key, aspect._orb);
    }
  }

  // Process aspects with orb bands, phase, and score
  const phaseLookup = new Map();
  const processedAspects = enrichedAspects.map(aspect => {
    const orb = aspect._orb || 0;
    const key = `${aspect.p1_name}|${aspect._aspect}|${aspect.p2_name}`;
    const prevOrb = prevOrbMap.get(key);
    
    // Determine phase: ↑ tightening (orb decreasing), ↓ separating (orb increasing)
    let phase = '—'; // neutral/unknown
    if (prevOrb != null && typeof prevOrb === 'number') {
      if (orb < prevOrb) phase = '↑'; // tightening
      else if (orb > prevOrb) phase = '↓'; // separating
      // if equal, keep neutral
    }

    // Calculate score using seismograph internals
    const aspectForScore = {
      transit: { body: aspect.p1_name },
      natal: { body: aspect.p2_name },
      type: aspect._aspect,
      orbDeg: orb
    };
    const scored = seismoInternals.scoreAspect(aspectForScore, {
      isAngleProx: aspect.p2_isAngle,
      critical: false
    });

    phaseLookup.set(key, {
      phase,
      orb: Number(orb.toFixed(2)),
      score: Number(scored.S.toFixed(2))
    });

    return {
      transit: aspect.p1_display || aspect.p1_name,
      aspect: aspect._aspect,
      natal: aspect.p2_display || aspect.p2_name,
      orb: Number(orb.toFixed(1)),
      phase: phase,
      score: Number(scored.S.toFixed(2)),
      _orbValue: orb // for sorting
    };
  });

  // Sort by orb (tightest first)
  processedAspects.sort((a, b) => a._orbValue - b._orbValue);

  // Group by orb bands
  const exact = processedAspects.filter(a => a._orbValue <= 0.5);
  const tight = processedAspects.filter(a => a._orbValue > 0.5 && a._orbValue <= 2.0);
  const moderate = processedAspects.filter(a => a._orbValue > 2.0 && a._orbValue <= 6.0);
  const wide = processedAspects.filter(a => a._orbValue > 6.0);

  // Generate markdown table format
  function createMarkdownTable(aspects, title) {
    if (aspects.length === 0) return '';
    
    let table = `\n**${title}**\n\n`;
    table += '| Transit | Aspect | Natal | Orb (°) | Phase | Score |\n';
    table += '|---------|--------|-------|---------|--------|-------|\n';
    
    for (const a of aspects) {
      table += `| ${a.transit} | ${a.aspect} | ${a.natal} | ${a.orb} | ${a.phase} | ${a.score >= 0 ? '+' : ''}${a.score} |\n`;
    }
    
    return table;
  }

  let markdown = '';
  if (exact.length > 0) markdown += createMarkdownTable(exact, '⭐ Exact Aspects (≤0.5°)');
  if (tight.length > 0) markdown += createMarkdownTable(tight, '🔥 Tight Aspects (0.5° - 2°)');
  if (moderate.length > 0) markdown += createMarkdownTable(moderate, '📊 Moderate Aspects (2° - 6°)');
  if (wide.length > 0) markdown += createMarkdownTable(wide, '🌫️ Wide Aspects (>6°)');

  if (markdown === '') {
    markdown = "No aspects for this date.";
  }

  const phaseDict = Object.fromEntries(phaseLookup);

  return {
    exact,
    tight,
    moderate,
    wide,
    markdown,
    phaseLookup: phaseDict
  };
}

/**
 * Calculates daily and summary seismograph metrics (magnitude, directional bias, volatility)
 * for a range of transit dates. Produces daily detail and summary aggregates.
 *
 * FIELD → MAP → VOICE flow:
 * 1. FIELD: Raw daily aspects with orbs, weights, retrograde flags
 * 2. MAP: Aggregate into magnitude/bias/volatility per day; track 14-day rolling window
 * 3. VOICE: Format as poetic packets + seismograph + drivers for narrative synthesis
 *
 * @param {Object} transitsByDate - { 'YYYY-MM-DD': [aspect, ...], ... }
 * @param {Object} retroFlagsByDate - { 'YYYY-MM-DD': { 'body_name': boolean, ... }, ... }
 * @param {Object} options - Configuration
 *   - modeToken: 'MIRROR' or 'BALANCE'
 *   - isBalance: boolean, triggers balance-specific validation
 *   - readiness: { mirror: { ready, message }, balance: { ready, message } }
 *   - enforceReadiness: boolean, enforce readiness guards
 *   - orbsProfile: 'wm-spec-2025-09' or custom
 * @returns {Object} { daily: { date: entry, ... }, summary: {...}, graph_rows: [...] }
 */
function calculateSeismograph(transitsByDate, retroFlagsByDate = {}, options = {}) {
  // Extract helper functions from options.helpers (passed from monolith to avoid circular dependency)
  const helpers = options.helpers || {};
  const {
    enrichDailyAspects,
    selectPoeticAspects,
    weightAspect,
    ASPECT_CLASS,
    BALANCE_CALIBRATION_VERSION,
    SEISMOGRAPH_VERSION,
    WEIGHTS_LEGEND,
  } = helpers;
  
  // Validate that helpers are provided
  if (!enrichDailyAspects || typeof enrichDailyAspects !== 'function') {
    throw new Error('calculateSeismograph requires options.helpers.enrichDailyAspects function');
  }
  if (!selectPoeticAspects || typeof selectPoeticAspects !== 'function') {
    throw new Error('calculateSeismograph requires options.helpers.selectPoeticAspects function');
  }
  if (!weightAspect || typeof weightAspect !== 'function') {
    throw new Error('calculateSeismograph requires options.helpers.weightAspect function');
  }
  
  if (!transitsByDate || Object.keys(transitsByDate).length === 0) {
    return { daily: {}, summary: {}, graph_rows: [] };
  }

  const {
    modeToken = 'MIRROR',
    isBalance = false,
    readiness = null,
    enforceReadiness = true,
    orbsProfile = 'wm-spec-2025-09'
  } = options;

  const mirrorReady = readiness?.mirror?.ready !== false;
  const balanceReady = readiness?.balance?.ready !== false;
  const applyReadiness = Boolean(enforceReadiness);

  const days = Object.keys(transitsByDate).sort();
  let prev = null;
  let prevDayFiltered = null;
  let previousPoetic = null;
  const daily = {};
  const graphRows = [];
  const rollingMagnitudes = []; // Track for 14-day rolling window
  const valenceHistory = []; // Track for trend analysis
  const rawValenceSeries = [];
  const calibratedValenceSeries = [];
  const boundedValenceSeries = [];

  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const rawDayAspects = transitsByDate[d] || [];
    const enriched = enrichDailyAspects(rawDayAspects, orbsProfile);
    
    // Enhance aspects with retrograde flags
    const retroMap = retroFlagsByDate[d] || {};
    const enrichedWithRetrograde = enriched.filtered.map(aspect => {
      const p1r = retroMap[aspect.p1_name] ?? retroMap[aspect.p1_display] ?? false;
      const p2r = retroMap[aspect.p2_name] ?? retroMap[aspect.p2_display] ?? false;
      return {
        ...aspect,
        p1_retrograde: p1r,
        p2_retrograde: p2r,
        retrograde_involved: p1r || p2r
      };
    });
    
    // Generate orb-band transit table with phase and score
    const transitTable = formatTransitTable(enriched.filtered, prevDayFiltered);
    const phaseLookup = transitTable.phaseLookup || {};
    
    const aspectsForAggregate = enriched.filtered.map(x => ({
      transit: { body: x.p1_name, retrograde: x.p1_retrograde },
      natal: {
        body: x.p2_name,
        retrograde: x.p2_retrograde,
        isAngleProx: ["Ascendant","Medium_Coeli","Descendant","Imum_Coeli"].includes(x.p2_name),
        isLuminary: ["Sun","Moon"].includes(x.p2_name),
        degCrit: false
      },
      type: x._aspect,
      orbDeg: typeof x._orb === 'number' ? x._orb : 6.01
    }));

    // Prepare rolling context for magnitude normalization
    const rollingContext = rollingMagnitudes.length >= 1 ? { magnitudes: [...rollingMagnitudes] } : null;
    
    const agg = aggregate(aspectsForAggregate, prev, { rollingContext });
    const valenceRaw = Number.isFinite(agg.rawValence) ? agg.rawValence : 0;
    rawValenceSeries.push(valenceRaw);

    // Determine scaling strategy and confidence
    let scalingStrategy = 'prior';
    const nContext = rollingMagnitudes.length;
    if (nContext >= 14) scalingStrategy = 'rolling';
    else if (nContext >= 2) scalingStrategy = 'blended';
    const scaleConfidence = Math.min(1, nContext / 14);

    // Track rolling magnitudes using the original magnitude before normalization (keep last 14 days)
    const magnitudeToTrack = Number.isFinite(agg.energyMagnitude)
      ? agg.energyMagnitude
      : (Number.isFinite(agg.rawMagnitude) ? agg.rawMagnitude : agg.magnitude || 0);
    rollingMagnitudes.push(magnitudeToTrack);
    if (rollingMagnitudes.length > 14) rollingMagnitudes.shift();

    // Identify retrograde recursion aspects
    const retrogradeAspects = enrichedWithRetrograde.filter(a => a.retrograde_involved);

    // Dispersion-based volatility override (std deviation of hook weights)
    let dispersionVol = 0;
    if (enriched.hooks.length >= 2) {
      const weights = enriched.hooks.map(h => h._weight || 0);
      const meanW = weights.reduce((s, v) => s + v, 0) / weights.length;
      const variance = weights.reduce((s, v) => s + Math.pow(v - meanW, 2), 0) / weights.length;
      dispersionVol = Math.min(10, Math.sqrt(variance) * 10);
    }

    // Use seismograph's built-in directional_bias (v4: SFD removed)
    const balanceVal = agg.directional_bias || null;

    const magnitudeValue = Number.isFinite(agg.magnitude) ? agg.magnitude : 0;
    const magnitudeInfo = classifyMagnitude(magnitudeValue);
    const magnitudeLabel = magnitudeInfo?.label || null;
    const magnitudeMeta = agg.magnitude_meta || null;
    const magnitudeRange = agg.magnitude_range || [0, 5];
    const magnitudeClamped = Boolean(agg.magnitude_clamped);
    const magnitudeMethod = magnitudeMeta?.method || (rollingMagnitudes.length ? 'adaptive_normalization_v4' : 'raw_direct_v4');

    const fallbackDirection = typeof prev?.Y_effective === 'number' ? prev.Y_effective : null;
    const directionalScaling = scaleDirectionalBias(valenceRaw, {
      calibratedMagnitude: balanceVal,
      fallbackDirection,
      confidence: agg.scaleConfidence ?? scaleConfidence,
      method: balanceVal != null ? 'seismograph_signed_v4' : 'raw_directional_v4'
    });

    const biasSigned = directionalScaling.value;
    const biasInfo = classifyDirectionalBias(biasSigned);
    const biasAbs = +Math.abs(biasSigned).toFixed(2);
    const biasDirection = directionalScaling.direction;
    const biasPolarity = directionalScaling.polarity;
    const biasMethod = directionalScaling.meta?.method || (balanceVal != null ? 'seismograph_signed_v4' : 'raw_directional_v4');

    boundedValenceSeries.push(biasSigned);
    if (balanceVal != null) {
      calibratedValenceSeries.push(biasSigned);
    }

    // Track valence history (keep last 7 days for trend)
    valenceHistory.push(biasSigned);
    if (valenceHistory.length > 7) valenceHistory.shift();

    // Build compact drivers reflecting top hooks (already computed above)
    const driversCompact = (enriched.hooks || []).map(h => {
      const weightFinal = typeof h._weight === 'number' ? h._weight : weightAspect(h);
      return {
        a: h.p1_name,
        b: h.p2_name,
        type: h._aspect || h.aspect || h.type,
        orb: h._orb != null ? h._orb : (typeof h.orb === 'number' ? h.orb : (typeof h.orbit === 'number' ? h.orbit : null)),
        applying: typeof h.applying === 'boolean' ? h.applying : undefined,
        weight: weightFinal,
        weight_final: weightFinal,
        house_target: h.house_target ?? h.p2_house ?? null,
        planet1: h.p1_name,
        planet2: h.p2_name,
        name: h._aspect || h.aspect || h.type,
        first_planet: h.p1_name,
        second_planet: h.p2_name,
        is_transit: true
      };
    });

    const calibrationMode = balanceVal != null ? BALANCE_CALIBRATION_VERSION : 'bounded-only';
    const magnitudeRaw = Number.isFinite(agg.rawMagnitude) ? agg.rawMagnitude : (agg.magnitude || 0);
    const biasRawSigned = Number.isFinite(agg.rawDirectionalBias) ? agg.rawDirectionalBias : (directionalScaling.value || 0);
    const volatilityScaled = Number.isFinite(agg.volatility_scaled) ? agg.volatility_scaled : Math.max(0, Math.min(5, dispersionVol));
    const volatilityCanonical = Number.isFinite(agg.volatility) ? agg.volatility : volatilityScaled;
    const coherenceValue = Number.isFinite(agg.coherence)
      ? agg.coherence
      : Math.max(0, Math.min(5, 5 - volatilityCanonical));
    const volatilityInfo = classifyVolatility(volatilityCanonical);
    const saturation = magnitudeRaw >= 4.95;

    // The `graphRows` array is the direct source for the Balance Meter chart.
    // It MUST contain the raw, unclamped, full-precision values.
    graphRows.push({
      date: d,
      magnitude: magnitudeRaw, // Raw, unclamped magnitude
      bias_signed: biasRawSigned, // Raw, unclamped, signed bias
      volatility: volatilityCanonical, // Canonical scatter (0-5)
      saturation
    });

    const dayEntry = {
      seismograph: {
        magnitude: magnitudeValue,
        magnitude_label: magnitudeLabel,
        magnitude_meta: magnitudeMeta,
        magnitude_range: magnitudeRange,
        magnitude_method: magnitudeMethod,
        magnitude_clamped: magnitudeClamped,
        // ✅ Balance Meter v4: Canonical directional bias (replaces all valence/bias_signed fields)
        directional_bias: {
          value: biasSigned,
          abs: biasAbs,
          label: biasInfo?.label || null,
          code: biasInfo?.code || null,
          direction: biasDirection,
          polarity: biasPolarity,
          motion: biasInfo?.motion || null,
          range: directionalScaling.range,
          clamped: directionalScaling.clamped,
          meta: directionalScaling.meta,
          sign: directionalScaling.sign,
          method: biasMethod
        },
        volatility: volatilityCanonical,
        volatility_label: volatilityInfo?.label || null,
        volatility_scaled: volatilityScaled,
        coherence: coherenceValue,
        coherence_scaled: agg.coherence_scaled ?? coherenceValue,
        coherence_normalized: agg.coherence_normalized ?? Math.max(0, Math.min(1, coherenceValue / 5)),
        // --- RAW DATA FOR PLOTTING & ANALYSIS ---
        // These fields preserve the raw, unclamped values before any presentation-layer scaling.
        rawMagnitude: magnitudeRaw,
        rawDirectionalBias: biasRawSigned,
        raw_axes: {
          magnitude: magnitudeRaw,
          bias_signed: biasRawSigned,
          volatility: volatilityCanonical,
          coherence: coherenceValue
        },
        // === CANONICAL/CALIBRATED AXES BLOCK ===
        // Use axes block directly from aggregator (contains canonical rounded values)
        axes: agg.axes || {
          magnitude: { value: magnitudeValue },
          directional_bias: { value: biasSigned },
          volatility: { value: volatilityScaled },
          coherence: { value: coherenceValue }
        },
        saturation,
        originalMagnitude: agg.originalMagnitude,
        scaling_strategy: scalingStrategy,
        scaling_confidence: +scaleConfidence.toFixed(2),
        magnitude_state: {
          value: magnitudeValue,
          label: magnitudeLabel,
          range: magnitudeRange,
          clamped: magnitudeClamped,
          meta: magnitudeMeta,
          method: magnitudeMethod
        },
        version: SEISMOGRAPH_VERSION
      },
      aspects: rawDayAspects,
      filtered_aspects: enrichedWithRetrograde,
      hooks: enriched.hooks,
      drivers: driversCompact,
      rejections: enriched.rejections,
      counts: enriched.counts,
      transit_table: transitTable,
      retrograde_aspects: retrogradeAspects,
      weights_legend: WEIGHTS_LEGEND
    };

    let poeticSelection;
    const guardActive = applyReadiness && ((isBalance && !balanceReady) || (!isBalance && modeToken === 'MIRROR' && !mirrorReady));
    if (guardActive) {
      const guardMessage = isBalance ? readiness?.balance?.message : readiness?.mirror?.message;
      poeticSelection = {
        aspects: [],
        counts: { total: enriched.filtered.length, category: { A:0, B:0, C:0, D:0 }, selected: 0 },
        limits: isBalance ? { min: 8, max: 12 } : { min: 5, max: 9 },
        note: guardMessage || (isBalance ? 'Balance guard active.' : 'Mirror guard active.')
      };
    } else {
      poeticSelection = selectPoeticAspects(enriched, {
        isBalance,
        previous: previousPoetic,
        phaseLookup
      });
      previousPoetic = poeticSelection.aspects;
    }

    const poeticMeta = {
      magnitude: dayEntry.seismograph?.magnitude ?? null,
      directional_bias: dayEntry.seismograph?.directional_bias?.value ?? null,
      volatility: dayEntry.seismograph?.volatility ?? null,
      coherence: dayEntry.seismograph?.coherence ?? null
    };
    dayEntry.poetic_packet = {
      aspects: poeticSelection.aspects,
      meta: poeticMeta,
      counts: poeticSelection.counts,
      limits: poeticSelection.limits,
      note: poeticSelection.note || null,
      guard: guardActive ? (isBalance ? readiness?.balance : readiness?.mirror) : null
    };

    daily[d] = dayEntry;
    prev = { scored: agg.scored, Y_effective: biasSigned };
    prevDayFiltered = enriched.filtered;
  }

  const numDays = days.length;
  
  // === SINGLE SOURCE OF TRUTH: Average daily seismograph values directly ===
  const X = Object.values(daily).reduce((s, d) => s + d.seismograph.magnitude, 0) / numDays;
  const Y = Object.values(daily).reduce((s, d) => s + (d.seismograph.directional_bias?.value || 0), 0) / numDays;
  const VI = Object.values(daily).reduce((s, d) => s + d.seismograph.volatility, 0) / numDays;
  
  // Classification and rounding
  const magnitudeInfo = classifyMagnitude(X);
  const magnitudeLabel = magnitudeInfo?.label || null;
  const magnitudeAvg = Number(X.toFixed(1));
  
  const biasAvg = Number(Y.toFixed(1));
  const biasSummaryInfo = classifyDirectionalBias(biasAvg);
  const biasAbsRounded = Number(Math.abs(biasAvg).toFixed(1));
  const biasSummaryPolarity = biasAvg > 0 ? 'outward' : (biasAvg < 0 ? 'inward' : 'equilibrium');
  const biasSummaryDirection = biasAvg > 0 ? 'expansive' : (biasAvg < 0 ? 'compressive' : 'neutral');

  const biasSeverityThresholds = {
    steady: 0,
    advisory: 0.5,
    watch: 1.5,
    warning: 2.5,
    critical: 4.0
  };

  const biasSeverityInfo = (() => {
    if (biasAbsRounded >= biasSeverityThresholds.critical) {
      return { label: 'critical', code: 'CRITICAL' };
    }
    if (biasAbsRounded >= biasSeverityThresholds.warning) {
      return { label: 'warning', code: 'WARNING' };
    }
    if (biasAbsRounded >= biasSeverityThresholds.watch) {
      return { label: 'watch', code: 'WATCH' };
    }
    if (biasAbsRounded >= biasSeverityThresholds.advisory) {
      return { label: 'advisory', code: 'ADVISORY' };
    }
    return { label: 'steady', code: 'STEADY' };
  })();

  const biasSeverity = {
    value: biasAbsRounded,
    label: biasSeverityInfo.label,
    code: biasSeverityInfo.code,
    polarity: biasSummaryPolarity,
    thresholds: biasSeverityThresholds
  };

  const volatilityAvg = Number(VI.toFixed(1));
  const coherenceAvg = Number((5 - volatilityAvg).toFixed(1));
  const volatilityInfo = classifyVolatility(VI);

  const magnitudeAxisMeta = {
    sample_size: numDays,
    aggregation: 'mean_daily_magnitude',
    canonical_scalers_used: true,
    transform_pipeline: ['daily_seismograph.magnitude', 'mean']
  };

  const directionalAxisMeta = {
    sample_size: numDays,
    aggregation: 'mean_daily_directional_bias',
    canonical_scalers_used: true,
    transform_pipeline: ['daily_seismograph.directional_bias.value', 'mean']
  };

  const coherenceAxisMeta = {
    sample_size: numDays,
    aggregation: 'mean_daily_coherence',
    canonical_scalers_used: true,
    transform_pipeline: ['daily_seismograph.coherence', 'mean']
  };

  const summaryAxes = {
    magnitude: {
      value: magnitudeAvg,
      label: magnitudeLabel,
      range: [0, 5],
      method: 'mean_daily_magnitude',
      clamped: magnitudeAvg <= 0 || magnitudeAvg >= 5,
      meta: magnitudeAxisMeta
    },
    directional_bias: {
      value: biasAvg,
      label: biasSummaryInfo?.label || null,
      code: biasSummaryInfo?.code || null,
      polarity: biasSummaryPolarity,
      direction: biasSummaryDirection,
      range: [-5, 5],
      method: 'mean_daily_seismograph',
      clamped: biasAvg <= -5 || biasAvg >= 5,
      meta: directionalAxisMeta,
      severity: biasSeverity
    },
    coherence: {
      value: coherenceAvg,
      label: null,
      range: [0, 5],
      method: '5_minus_mean_daily_volatility',
      clamped: coherenceAvg <= 0 || coherenceAvg >= 5,
      meta: coherenceAxisMeta
    }
  };

  const summaryBalance = {
    magnitude: magnitudeAvg,
    directional_bias: biasAvg,
    volatility: volatilityAvg,
    coherence: coherenceAvg,
    magnitude_label: magnitudeLabel,
    directional_bias_label: biasSummaryInfo?.label || null,
    volatility_label: volatilityInfo?.label || null,
    coherence_label: null,
    axes: summaryAxes,
    range: {
      magnitude: [0, 5],
      directional_bias: [-5, 5],
      volatility: [0, 5],
      coherence: [0, 5]
    }
  };

  const summary = {
    magnitude: magnitudeAvg,
    magnitude_label: magnitudeLabel,
    directional_bias_label: biasSummaryInfo?.label || null,
    volatility: volatilityAvg,
    volatility_label: volatilityInfo?.label || null,
    volatility_emoji: volatilityInfo?.emoji || null,
    // Flat fields for compatibility with graphics/report consumers
    direction: biasAvg, // Numeric value, e.g. +3.0
    charge: magnitudeAvg,   // Alias for magnitude
    coherence: coherenceAvg, // Stability = 5 - volatility
    integration: 0, // Placeholder, update if needed
    directional_bias: {
      value: biasAvg,
      abs: biasAbsRounded,
      label: biasSummaryInfo?.label || null,
      code: biasSummaryInfo?.code || null,
      direction: biasSummaryDirection,
      polarity: biasSummaryPolarity,
      motion: biasSummaryInfo?.motion || null,
      range: [-5, 5],
      clamped: biasAvg <= -5 || biasAvg >= 5,
      meta: directionalAxisMeta,
      sign: biasAvg > 0 ? 1 : (biasAvg < 0 ? -1 : 0),
      method: 'mean_daily_seismograph'
    },
    version: {
      seismograph: SEISMOGRAPH_VERSION,
      balance: BALANCE_CALIBRATION_VERSION,
      calibration_mode: BALANCE_CALIBRATION_VERSION
    },
    axes: summaryAxes,
    balance_meter: summaryBalance
  };
  if (calibratedValenceSeries.length) {
    summary.valence_sample_size = calibratedValenceSeries.length;
  }

  const saturationCount = graphRows.filter(row => row.saturation).length;
  summary.saturation_days = saturationCount;
  summary.saturation_ratio = numDays > 0 ? +(saturationCount / numDays).toFixed(3) : 0;

  return { daily, summary, graph_rows: graphRows };
}

module.exports = {
  calculateSeismograph,
  formatTransitTable,
};
