// Woven Map Report Composer (DATA-ONLY)
// Builds a clinical, non-VOI CE report envelope from existing Math Brain outputs.
// Do NOT include narrative fields; avoid keys named 'field', 'map', or 'voice' to pass Clear Mirror scrub.

const { composeHookStack } = require('../feedback/hook-stack-composer');

function safeNum(x, def = null) {
  const n = Number(x);
  return Number.isFinite(n) ? n : def;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

const CORE_PLANETS = new Set([
  'Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'
]);

const SECONDARY_POINTS = new Set([
  'Chiron','Mean_Node','True_Node','Mean_South_Node','True_South_Node','Mean_Lilith'
]);

const ANGLE_POINTS = new Set(['Ascendant','Medium_Coeli','Descendant','Imum_Coeli']);

const VALENCE_BANDS = [
  { min: -5, max: -4.5, emoji: '🌋', label: 'Pressure / Eruption', polarity: 'negative' },
  { min: -4.5, max: -3.5, emoji: '⚔', label: 'Friction Clash', polarity: 'negative' },
  { min: -3.5, max: -2.5, emoji: '🌊', label: 'Cross Current', polarity: 'negative' },
  { min: -2.5, max: -1.5, emoji: '🌀', label: 'Fog / Dissolution', polarity: 'negative' },
  { min: -1.5, max: -0.8, emoji: '🌫', label: 'Entropy Drift', polarity: 'negative' },
  { min: -0.8, max: -0.2, emoji: '🕰', label: 'Saturn Weight', polarity: 'negative' },
  { min: -0.2, max: 0.2, emoji: '⚖', label: 'Neutral Balance', polarity: 'neutral' },
  { min: 0.2, max: 0.8, emoji: '🌱', label: 'Fertile Field', polarity: 'positive' },
  { min: 0.8, max: 1.5, emoji: '🌊', label: 'Flow Tide', polarity: 'positive' },
  { min: 1.5, max: 2.5, emoji: '✨', label: 'Harmonic Resonance', polarity: 'positive' },
  { min: 2.5, max: 3.5, emoji: '🔥', label: 'Combustion Clarity', polarity: 'positive' },
  { min: 3.5, max: 4.5, emoji: '🦋', label: 'Liberation / Release', polarity: 'positive' },
  { min: 4.5, max: 5.01, emoji: '💎', label: 'Expansion Lift', polarity: 'positive' }
];

const MAGNITUDE_TERMS = [
  { max: 0.5, label: 'Whisper' },
  { max: 1.5, label: 'Pulse' },
  { max: 2.5, label: 'Wave' },
  { max: 3.5, label: 'Surge' },
  { max: 4.5, label: 'Peak' },
  { max: Infinity, label: 'Apex' }
];

const VOLATILITY_TERMS = [
  { max: 0.5, label: 'Aligned Flow', emoji: '➿' },
  { max: 2, label: 'Cycled Pull', emoji: '🔄' },
  { max: 3, label: 'Mixed Paths', emoji: '🔀' },
  { max: 5, label: 'Fragment Scatter', emoji: '🧩' },
  { max: Infinity, label: 'Vortex Dispersion', emoji: '🌀' }
];

function classifyMagnitude(value) {
  const mag = safeNum(value, null);
  if (mag == null) return null;
  const entry = MAGNITUDE_TERMS.find(b => mag <= b.max);
  return entry ? { value: +mag.toFixed(2), term: entry.label } : { value: +mag.toFixed(2), term: null };
}

function classifyVolatility(value) {
  const vol = safeNum(value, null);
  if (vol == null) return null;
  const entry = VOLATILITY_TERMS.find(b => vol <= b.max);
  return entry ? { value: +vol.toFixed(2), term: entry.label, emoji: entry.emoji } : { value: +vol.toFixed(2), term: null };
}

function classifyValence(value) {
  const val = safeNum(value, null);
  if (val == null) return null;
  const clamped = clamp(val, -5, 5);
  const entry = VALENCE_BANDS.find(b => clamped >= b.min && clamped < b.max);
  if (!entry) {
    return { value: +clamped.toFixed(2), term: null, emoji: null, polarity: clamped >= 0 ? 'positive' : 'negative', range: null };
  }
  return {
    value: +clamped.toFixed(2),
    term: entry.label,
    emoji: entry.emoji,
    polarity: entry.polarity,
    range: [entry.min, entry.max]
  };
}

function verdictFromSfd(value) {
  const sfd = safeNum(value, null);
  if (sfd == null) return null;
  if (sfd >= 1) return 'stabilizers prevail';
  if (sfd <= -1) return 'stabilizers cut';
  return 'stabilizers mixed';
}

function normalizeHouseNumber(house) {
  if (house == null) return null;
  if (typeof house === 'number' && Number.isFinite(house)) return house;
  if (typeof house === 'string') {
    const match = house.match(/(\d{1,2})/);
    if (match) return Number(match[1]);
  }
  return null;
}

function toAnchorRecord(source) {
  if (!source || typeof source !== 'object') return null;
  const degree = source.position ?? source.abs_pos ?? source.degree;
  const houseRaw = source.house ?? source.house_number ?? source.house_num ?? source.houseLabel;
  const house = normalizeHouseNumber(houseRaw);
  const base = {
    name: source.name || source.axis || null,
    sign: source.sign || null,
    element: source.element || null,
    quality: source.quality || null,
    degree: degree != null ? +Number(degree).toFixed(2) : null,
    house,
    house_label: typeof houseRaw === 'string' ? houseRaw : null
  };
  if (source.retrograde !== undefined) base.retrograde = !!source.retrograde;
  return base;
}

function findPlacement(placements, name) {
  if (!Array.isArray(placements)) return null;
  return placements.find(p => p && p.name === name) || null;
}

function findAngleEntry(angles, name) {
  if (!angles) return null;
  if (Array.isArray(angles)) {
    return angles.find(a => (a?.name === name) || (a?.axis && a.axis.toLowerCase() === name.toLowerCase())) || null;
  }
  if (typeof angles === 'object') {
    const direct = angles[name];
    if (direct) return direct;
    const key = Object.keys(angles).find(k => k.toLowerCase() === name.toLowerCase());
    return key ? angles[key] : null;
  }
  return null;
}

function buildAnchors(placements, angles) {
  const sun = toAnchorRecord(findPlacement(placements, 'Sun'));
  const moon = toAnchorRecord(findPlacement(placements, 'Moon'));
  const asc = toAnchorRecord(findPlacement(placements, 'Ascendant') || findAngleEntry(angles, 'Ascendant'));
  const mc = toAnchorRecord(findPlacement(placements, 'Medium_Coeli') || findAngleEntry(angles, 'Medium_Coeli'));
  return { sun, moon, ascendant: asc, midheaven: mc };
}

function splitPlacements(list) {
  if (!Array.isArray(list)) return { core: [], supporting: [], derived: [], raw: null };
  const core = [];
  const supporting = [];
  const derived = [];
  for (const item of list) {
    const name = item?.name;
    if (!name) continue;
    if (CORE_PLANETS.has(name)) core.push(item);
    else if (SECONDARY_POINTS.has(name)) derived.push(item);
    else if (ANGLE_POINTS.has(name)) supporting.push(item);
    else supporting.push(item);
  }
  return { core, supporting, derived, raw: list };
}

function computeIntegrationFactors(summary, valenceOverride = null) {
  if (!summary) return null;
  const mag = safeNum(summary.magnitude, 0) || 0;
  const val = safeNum(valenceOverride != null ? valenceOverride : summary.valence, 0) || 0;
  const vol = safeNum(summary.volatility, 0) || 0;

  // Normalize per UI logic
  const magN = clamp(mag / 5, 0, 1);
  const volN = clamp(vol / 5, 0, 1);
  const valN = (clamp(val, -2, 2) + 2) / 4; // map -2..2 -> 0..1

  const pct = (x) => Math.round(clamp(x, 0, 1) * 100);
  return {
    fertile_field: pct(valN * 0.7 + (1 - volN) * 0.3),
    harmonic_resonance: pct(valN * 0.6 + (1 - volN) * 0.4),
    expansion_lift: pct(magN * 0.6 + valN * 0.4),
    combustion_clarity: pct(magN * 0.5 + volN * 0.5),
    liberation_release: pct(volN * 0.7 + (1 - valN) * 0.3),
    integration: pct((1 - volN) * 0.6 + valN * 0.4)
  };
}

function extractTimeSeries(transitsByDate) {
  if (!transitsByDate || typeof transitsByDate !== 'object') return [];
  const entries = [];
  for (const [date, v] of Object.entries(transitsByDate)) {
    const seismo = v?.seismograph || v;
    const balanceVal = safeNum(v?.balance?.valence);
    const balanceInfo = balanceVal != null ? classifyValence(balanceVal) : null;
    const sfdVal = safeNum(v?.sfd?.sfd);
    const row = {
      date,
      magnitude: safeNum(seismo?.magnitude),
      valence: safeNum(seismo?.valence),
      valence_calibrated: safeNum(seismo?.valence_calibrated ?? balanceVal),
      volatility: safeNum(seismo?.volatility),
      confidence: safeNum(seismo?.scaling_confidence),
      balance_valence: balanceVal,
      balance_label: balanceInfo?.term || null,
      balance_emoji: balanceInfo?.emoji || null,
      balance_polarity: balanceInfo?.polarity || null,
      balance_version: v?.balance?.version || seismo?.valence_version || null,
      balance_range: v?.balance?.range || seismo?.valence_range || null,
      sfd: sfdVal,
      s_plus: safeNum(v?.sfd?.sPlus),
      s_minus: safeNum(v?.sfd?.sMinus),
      sfd_verdict: verdictFromSfd(sfdVal),
      drivers: Array.isArray(v?.drivers) ? v.drivers : undefined
    };
    entries.push(row);
  }
  // Sort by date ascending if ISO-like
  entries.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return entries;
}

function extractNatalSummary(person) {
  if (!person) return null;
  const chart = person.chart || {};
  const birth = person.birth_data || {};
  // Prefer chart payload for placements/aspects if present
  const placementsList = Array.isArray(chart.planets)
    ? chart.planets
    : (Array.isArray(birth.planets) ? birth.planets : []);
  const placements = splitPlacements(placementsList);
  const angles = chart.angles || birth.angles || null;
  const aspects = Array.isArray(person.aspects) ? person.aspects : (chart.aspects || []);
  return {
    placements,
    anchors: buildAnchors(placementsList, angles),
    angles,
    major_aspects: aspects
  };
}

function extractRawGeometry(result) {
  const a = result.person_a || {};
  const b = result.person_b || null;
  const out = {
    solo: {
      natal_placements: a.chart?.planets || a.birth_data?.planets || null,
      angles: a.chart?.angles || a.birth_data?.angles || null,
      natal_aspects: Array.isArray(a.aspects) ? a.aspects : (a.chart?.aspects || []),
      transit_logs: a.chart?.transitsByDate || null
    }
  };
  if (b) {
    out.relational = {
      person_b_natal_placements: b.chart?.planets || b.birth_data?.planets || null,
      person_b_angles: b.chart?.angles || b.birth_data?.angles || null,
      person_b_natal_aspects: Array.isArray(b.aspects) ? b.aspects : (b.chart?.aspects || []),
      b_transit_logs: b.chart?.transitsByDate || null
    };
  }
  return out;
}

function summarizeMeterChannels(transitsByDate) {
  if (!transitsByDate || typeof transitsByDate !== 'object') {
    return {
      seismograph: { confidence: null, sample_size: 0 },
      balance: null,
      sfd: null
    };
  }

  const entries = Object.values(transitsByDate);
  if (!entries.length) {
    return {
      seismograph: { confidence: null, sample_size: 0 },
      balance: null,
      sfd: null
    };
  }

  let confidenceSum = 0;
  let confidenceCount = 0;
  const balanceValues = [];
  const sfdValues = [];
  const sPlusValues = [];
  const sMinusValues = [];

  for (const entry of entries) {
    const seismo = entry?.seismograph || entry;
    if (seismo && typeof seismo.scaling_confidence === 'number' && Number.isFinite(seismo.scaling_confidence)) {
      confidenceSum += seismo.scaling_confidence;
      confidenceCount += 1;
    }

    const balVal = safeNum(entry?.balance?.valence);
    if (balVal != null) balanceValues.push(balVal);

    const sfd = safeNum(entry?.sfd?.sfd);
    if (sfd != null) {
      sfdValues.push(sfd);
      const sPlus = safeNum(entry?.sfd?.sPlus);
      if (sPlus != null) sPlusValues.push(sPlus);
      const sMinus = safeNum(entry?.sfd?.sMinus);
      if (sMinus != null) sMinusValues.push(sMinus);
    }
  }

  const avg = (arr) => arr.length ? arr.reduce((sum, val) => sum + val, 0) / arr.length : null;

  const confidence = confidenceCount ? + (confidenceSum / confidenceCount).toFixed(2) : null;
  const balanceAvgRaw = avg(balanceValues);
  const balanceAvg = balanceAvgRaw != null ? +balanceAvgRaw.toFixed(2) : null;
  const balanceMeta = balanceAvg != null ? classifyValence(balanceAvg) : null;
  const sfdAvgRaw = avg(sfdValues);
  const sfdAvg = sfdAvgRaw != null ? +sfdAvgRaw.toFixed(2) : null;
  const sPlusAvgRaw = avg(sPlusValues);
  const sMinusAvgRaw = avg(sMinusValues);
  const sPlusAvg = sPlusAvgRaw != null ? +sPlusAvgRaw.toFixed(2) : null;
  const sMinusAvg = sMinusAvgRaw != null ? +sMinusAvgRaw.toFixed(2) : null;

  return {
    seismograph: {
      confidence,
      sample_size: confidenceCount
    },
    balance: balanceAvg != null ? {
      value: balanceAvg,
      label: balanceMeta?.term || null,
      emoji: balanceMeta?.emoji || null,
      polarity: balanceMeta?.polarity || (balanceAvg >= 0 ? 'positive' : 'negative'),
      band: balanceMeta?.range || null,
      sample_size: balanceValues.length,
      version: 'v1.1',
      range: [-5, 5]
    } : null,
    sfd: sfdAvg != null ? {
      value: sfdAvg,
      s_plus: sPlusAvg,
      s_minus: sMinusAvg,
      verdict: verdictFromSfd(sfdAvg),
      sample_size: sfdValues.length,
      version: 'v1.2',
      range: [-5, 5]
    } : null
  };
}

function computeVectorIntegrity(transitsByDate) {
  const base = { latent: [], suppressed: [], method: 'vector-scan-1', sample_size: 0 };
  if (!transitsByDate || typeof transitsByDate !== 'object') return base;

  const latentMap = new Map();
  const suppressedMap = new Map();
  let sampleDays = 0;

  const LATENT_REASONS = new Set(['WEAK_WEIGHT']);
  const SUPPRESSED_REASONS = new Set(['OUT_OF_CAP', 'DUPLICATE_PAIR', 'PRIMARY_DUP']);

  for (const entry of Object.values(transitsByDate)) {
    const rejections = Array.isArray(entry?.rejections) ? entry.rejections : [];
    if (!rejections.length) continue;
    sampleDays += 1;
    for (const rej of rejections) {
      const aspect = rej?.aspect || 'Unknown aspect';
      const reasonRaw = (rej?.reason || '').toString().toUpperCase();
      const orb = safeNum(rej?.orb);
      let targetMap = null;
      if (LATENT_REASONS.has(reasonRaw)) targetMap = latentMap;
      else if (SUPPRESSED_REASONS.has(reasonRaw)) targetMap = suppressedMap;
      if (!targetMap) continue;
      if (!targetMap.has(aspect)) {
        targetMap.set(aspect, { aspect, count: 0, total_orb: 0, orb_count: 0, reasons: {} });
      }
      const rec = targetMap.get(aspect);
      rec.count += 1;
      rec.reasons[reasonRaw] = (rec.reasons[reasonRaw] || 0) + 1;
      if (orb != null) {
        rec.total_orb += Math.abs(orb);
        rec.orb_count += 1;
      }
    }
  }

  const finalize = (map) => Array.from(map.values()).map(item => {
    const avgOrb = item.orb_count ? +(item.total_orb / item.orb_count).toFixed(2) : null;
    const reasons = Object.entries(item.reasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
    return {
      aspect: item.aspect,
      count: item.count,
      average_orb: avgOrb,
      reasons
    };
  }).sort((a, b) => b.count - a.count).slice(0, 5);

  return {
    latent: finalize(latentMap),
    suppressed: finalize(suppressedMap),
    method: 'vector-scan-1',
    sample_size: sampleDays
  };
}

// DATA-ONLY Polarity Cards structure: leave human-facing content null; include geometry hooks only
function buildPolarityCardsHooks(a /* person_a */) {
  // Select a few strongest daily drivers as skeleton; no language
  const series = a?.chart?.transitsByDate || {};
  const items = [];
  for (const [date, v] of Object.entries(series)) {
    if (Array.isArray(v?.drivers) && v.drivers.length) {
      items.push({ date, drivers: v.drivers.slice(0, 3) });
    }
  }
  // Reduce to a small sample window
  const sample = items.slice(0, 7);
  return [
    { id: 'card_1', field_tone: null, map_geometry: sample, voice_slot: null },
    { id: 'card_2', field_tone: null, map_geometry: sample, voice_slot: null },
    { id: 'card_3', field_tone: null, map_geometry: sample, voice_slot: null }
  ];
}

function inferReportType(modeToken, hasB) {
  const m = (modeToken || '').toUpperCase();
  if (m.includes('SYNASTRY') || m.includes('COMPOSITE') || hasB) return 'relational';
  return 'solo';
}

function composeWovenMapReport({ result, mode, period }) {
  const a = result.person_a || {};
  const b = result.person_b || null;
  const type = inferReportType(mode, !!b);

  const summary = a.derived?.seismograph_summary || null;
  const meterChannels = summarizeMeterChannels(a.chart?.transitsByDate);
  const integration = computeIntegrationFactors(summary, meterChannels?.balance?.value ?? null);
  const timeSeries = extractTimeSeries(a.chart?.transitsByDate);
  const vectorIntegrity = computeVectorIntegrity(a.chart?.transitsByDate);
  const hookStack = composeHookStack(result, { maxHooks: 4, minIntensity: 8 });

  let balanceMeter = null;
  if (summary) {
    const magnitudeVal = safeNum(summary.magnitude);
    const magnitudeInfo = classifyMagnitude(summary.magnitude);
    const volatilityVal = safeNum(summary.volatility);
    const volatilityInfo = classifyVolatility(summary.volatility);
    const valenceVal = safeNum(summary.valence);
    const valenceRaw = safeNum(summary.valence_raw);
    const valenceRange = Array.isArray(summary.valence_range) ? summary.valence_range : [-5, 5];
    const valenceVersion = summary.valence_version || null;
    const balanceMeta = meterChannels?.balance || null;
    balanceMeter = {
      magnitude: {
        value: magnitudeVal,
        term: magnitudeInfo?.term || null
      },
      valence: {
        value: valenceVal,
        raw_value: valenceRaw,
        normalized: balanceMeta?.value ?? valenceVal,
        term: balanceMeta?.label || null,
        emoji: balanceMeta?.emoji || null,
        polarity: balanceMeta?.polarity || (valenceVal >= 0 ? 'positive' : 'negative'),
        band: balanceMeta?.band || null,
        range: balanceMeta?.range || valenceRange,
        version: balanceMeta?.version || valenceVersion,
        sample_size: balanceMeta?.sample_size ?? summary.valence_sample_size ?? null
      },
      volatility: {
        value: volatilityVal,
        term: volatilityInfo?.term || null,
        emoji: volatilityInfo?.emoji || null
      },
      confidence: meterChannels?.seismograph?.confidence ?? null,
      confidence_sample_size: meterChannels?.seismograph?.sample_size ?? 0,
      balance_channel: balanceMeta ? { ...balanceMeta } : null,
      support_friction: meterChannels?.sfd ? { ...meterChannels.sfd } : null
    };
  }

  const report = {
    schema: 'WM-WovenMap-1.0',
    type, // 'solo' | 'relational'
    context: {
      mode,
      period: period || null,
      translocation: result?.context?.translocation || null,
      person_a: {
        name: a?.details?.name || 'Subject',
        birth_date: a?.details?.birth_date || null,
        birth_time: a?.details?.birth_time || null,
        coordinates: (a?.details?.latitude != null && a?.details?.longitude != null)
          ? { lat: a.details.latitude, lon: a.details.longitude }
          : null,
        timezone: a?.details?.timezone || null
      },
      person_b: b ? {
        name: b?.details?.name || 'Subject B',
        birth_date: b?.details?.birth_date || null,
        birth_time: b?.details?.birth_time || null,
        coordinates: (b?.details?.latitude != null && b?.details?.longitude != null)
          ? { lat: b.details.latitude, lon: b.details.longitude }
          : null,
        timezone: b?.details?.timezone || null
      } : null
    },
    balance_meter: balanceMeter,
    hook_stack: hookStack,
    integration_factors: integration,
    time_series: timeSeries,
    natal_summary: extractNatalSummary(a),
    vector_integrity: vectorIntegrity,
    polarity_cards: buildPolarityCardsHooks(a), // DATA hooks only, no VOICE
    mirror_voice: null, // reserved for Raven
    raw_geometry: extractRawGeometry(result),
    provenance: result.provenance || null
  };

  return report;
}

module.exports = { composeWovenMapReport };
