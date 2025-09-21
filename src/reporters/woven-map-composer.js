// Woven Map Report Composer (DATA-ONLY)
// Builds a clinical, non-VOICE report envelope from existing Math Brain outputs.
// Do NOT include narrative fields; avoid keys named 'field', 'map', or 'voice' to pass Clear Mirror scrub.

const { composeHookStack } = require('../feedback/hook-stack-composer');
const {
  classifyValence,
  classifyMagnitude,
  classifyVolatility,
  classifySfd,
  clamp,
} = require('../../lib/reporting/metric-labels');

const SEISMOGRAPH_VERSION = 'v1.0';
const BALANCE_CALIBRATION_VERSION = 'v1.1';
const SFD_VERSION = 'v1.2';

function safeNum(x, def = null) {
  const n = Number(x);
  return Number.isFinite(n) ? n : def;
}

const CORE_PLANETS = new Set([
  'Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'
]);

const SECONDARY_POINTS = new Set([
  'Chiron','Mean_Node','True_Node','Mean_South_Node','True_South_Node','Mean_Lilith'
]);

const ANGLE_POINTS = new Set(['Ascendant','Medium_Coeli','Descendant','Imum_Coeli']);

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
  const valSource = valenceOverride != null ? valenceOverride : (summary.valence_bounded ?? summary.valence);
  const val = safeNum(valSource, 0) || 0;
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
    const balanceVal = safeNum(v?.balance?.valence ?? v?.balance?.valence_bounded);
    const balanceInfo = balanceVal != null ? classifyValence(balanceVal) : null;
    const magnitudeVal = safeNum(seismo?.magnitude);
    const magnitudeInfo = magnitudeVal != null ? classifyMagnitude(magnitudeVal) : null;
    const volatilityVal = safeNum(seismo?.volatility);
    const volatilityInfo = volatilityVal != null ? classifyVolatility(volatilityVal) : null;
    const valenceBounded = safeNum(seismo?.valence_bounded ?? balanceVal ?? seismo?.valence);
    const valenceInfo = valenceBounded != null ? classifyValence(valenceBounded) : null;
    const valenceRaw = safeNum(seismo?.valence_raw_unbounded ?? seismo?.valence_raw ?? seismo?.valence);
    const valenceLabel = seismo?.valence_label || balanceInfo?.label || valenceInfo?.label || null;
    const valenceCode = seismo?.valence_code || balanceInfo?.code || valenceInfo?.code || null;
    const valenceRange = seismo?.valence_range || v?.balance?.range || [-5, 5];
    const valenceVersion = seismo?.valence_version || v?.balance?.version || null;
    const valencePolarity = seismo?.valence_polarity || balanceInfo?.polarity || valenceInfo?.polarity || (valenceBounded >= 0 ? 'positive' : 'negative');
    const sfdBlock = v?.sfd || {};
    const sfdCont = safeNum(sfdBlock.sfd_cont ?? sfdBlock.value ?? sfdBlock.sfd);
    const sfdInfo = sfdCont != null ? classifySfd(sfdCont) : null;
    const sfdDisc = safeNum(sfdBlock.sfd_disc ?? sfdInfo?.disc);
    const sfdLabel = sfdBlock.sfd_label || sfdInfo?.label || verdictFromSfd(sfdCont ?? sfdInfo?.value ?? 0);
    const sPlus = safeNum(sfdBlock.s_plus ?? sfdBlock.sPlus);
    const sMinus = safeNum(sfdBlock.s_minus ?? sfdBlock.sMinus);

    const row = {
      date,
      magnitude: magnitudeVal,
      magnitude_label: seismo?.magnitude_label || magnitudeInfo?.label || null,
      valence_bounded: valenceBounded,
      valence_label: valenceLabel,
      valence_code: valenceCode,
      valence_raw_unbounded: valenceRaw,
      valence_calibrated: safeNum(seismo?.valence_calibrated ?? balanceVal ?? valenceBounded),
      valence_range: valenceRange,
      valence_version: valenceVersion || BALANCE_CALIBRATION_VERSION,
      valence_polarity: valencePolarity,
      volatility: volatilityVal,
      volatility_label: seismo?.volatility_label || volatilityInfo?.label || null,
      confidence: safeNum(seismo?.scaling_confidence),
      balance_valence: balanceVal,
      balance_label: balanceInfo?.label || null,
      balance_emoji: balanceInfo?.emoji || null,
      balance_polarity: balanceInfo?.polarity || valencePolarity,
      balance_version: v?.balance?.version || seismo?.valence_version || BALANCE_CALIBRATION_VERSION,
      balance_range: v?.balance?.range || valenceRange,
      sfd_cont: sfdCont,
      sfd_disc: sfdDisc,
      sfd_label: sfdLabel,
      s_plus: sPlus,
      s_minus: sMinus,
      sfd_verdict: sfdLabel,
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

    const balVal = safeNum(entry?.balance?.valence ?? entry?.balance?.valence_bounded);
    if (balVal != null) balanceValues.push(balVal);

    const sfd = safeNum(entry?.sfd?.sfd_cont ?? entry?.sfd?.value ?? entry?.sfd?.sfd);
    if (sfd != null) {
      sfdValues.push(sfd);
      const sPlus = safeNum(entry?.sfd?.s_plus ?? entry?.sfd?.sPlus);
      if (sPlus != null) sPlusValues.push(sPlus);
      const sMinus = safeNum(entry?.sfd?.s_minus ?? entry?.sfd?.sMinus);
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
  const sfdMeta = sfdAvg != null ? classifySfd(sfdAvg) : null;
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
      value: balanceMeta?.value ?? balanceAvg,
      valence: balanceMeta?.value ?? balanceAvg,
      label: balanceMeta?.label || null,
      emoji: balanceMeta?.emoji || null,
      polarity: balanceMeta?.polarity || (balanceAvg >= 0 ? 'positive' : 'negative'),
      band: balanceMeta?.band || null,
      code: balanceMeta?.code || null,
      sample_size: balanceValues.length,
      version: BALANCE_CALIBRATION_VERSION,
      calibration_mode: BALANCE_CALIBRATION_VERSION,
      range: [-5, 5]
    } : null,
    sfd: sfdAvg != null ? {
      value: sfdMeta?.value ?? sfdAvg,
      sfd_cont: sfdMeta?.value ?? sfdAvg,
      sfd_disc: sfdMeta?.disc ?? null,
      sfd_label: sfdMeta?.label || verdictFromSfd(sfdAvg),
      s_plus: sPlusAvg,
      s_minus: sMinusAvg,
      verdict: verdictFromSfd(sfdAvg),
      sample_size: sfdValues.length,
      version: SFD_VERSION,
      range: [-5, 5]
    } : null
  };
}

function formatVectorName(a, type, b) {
  const glyphMap = {
    opposition: '☍',
    square: '□',
    trine: '△',
    sextile: '✶',
    conjunction: '☌'
  };
  const baseType = typeof type === 'string' ? type.toLowerCase() : '';
  const glyph = glyphMap[baseType] || type || '';
  return [a, glyph, b].filter(Boolean).join(' ').trim();
}

function computeVectorIntegrity(transitsByDate) {
  const base = { active: [], latent: [], suppressed: [], dormant: [], method: 'vector-scan-2', sample_size: 0 };
  if (!transitsByDate || typeof transitsByDate !== 'object') return base;

  const activeMap = new Map();
  const latentMap = new Map();
  const suppressedMap = new Map();
  const dormantMap = new Map();
  let sampleDays = 0;

  const LATENT_REASONS = new Set(['WEAK_WEIGHT']);
  const SUPPRESSED_REASONS = new Set(['DUPLICATE_PAIR', 'PRIMARY_DUP']);
  const DORMANT_REASONS = new Set(['OUT_OF_CAP']);

  for (const entry of Object.values(transitsByDate)) {
    const drivers = Array.isArray(entry?.drivers) ? entry.drivers : [];
    const rejections = Array.isArray(entry?.rejections) ? entry.rejections : [];
    let dayTouched = false;

    if (drivers.length) {
      dayTouched = true;
      for (const drv of drivers) {
        const a = drv?.a || drv?.transit || drv?.planet1 || 'Transit';
        const b = drv?.b || drv?.natal || drv?.planet2 || 'Natal';
        const type = (drv?.type || drv?.name || '').toString();
        const key = [a, type, b, drv?.house_target || drv?.house || ''].join('|');
        if (!activeMap.has(key)) {
          activeMap.set(key, {
            aspect: formatVectorName(a, type, b),
            count: 0,
            total_orb: 0,
            orb_count: 0,
            total_weight: 0,
            weight_count: 0,
            houses: new Set()
          });
        }
        const rec = activeMap.get(key);
        rec.count += 1;
        const orb = safeNum(drv?.orb);
        if (orb != null) {
          rec.total_orb += Math.abs(orb);
          rec.orb_count += 1;
        }
        const weight = safeNum(drv?.weight ?? drv?.weight_final);
        if (weight != null) {
          rec.total_weight += weight;
          rec.weight_count += 1;
        }
        const house = drv?.house_target || drv?.house || drv?.natal_house || null;
        if (house) rec.houses.add(house);
      }
    }

    if (rejections.length) {
      dayTouched = true;
      for (const rej of rejections) {
        const aspect = rej?.aspect || 'Unknown aspect';
        const reasonRaw = (rej?.reason || '').toString().toUpperCase();
        const orb = safeNum(rej?.orb);
        let targetMap = null;
        if (LATENT_REASONS.has(reasonRaw)) targetMap = latentMap;
        else if (SUPPRESSED_REASONS.has(reasonRaw)) targetMap = suppressedMap;
        else if (DORMANT_REASONS.has(reasonRaw)) targetMap = dormantMap;
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

    if (dayTouched) sampleDays += 1;
  }

  const finalizeRejections = (map) => Array.from(map.values()).map(item => {
    const avgOrb = item.orb_count ? +(item.total_orb / item.orb_count).toFixed(2) : null;
    const reasons = Object.entries(item.reasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
    const reasonText = reasons.map(r => `${r.reason}×${r.count}`).join(', ');
    const descriptorParts = [item.aspect];
    if (avgOrb != null) descriptorParts.push(`avg orb ${avgOrb}°`);
    if (reasonText) descriptorParts.push(`flags: ${reasonText}`);
    return {
      aspect: item.aspect,
      count: item.count,
      average_orb: avgOrb,
      reasons,
      descriptor: descriptorParts.join(' · ')
    };
  }).sort((a, b) => b.count - a.count).slice(0, 5);

  const finalizeActive = () => Array.from(activeMap.values()).map(item => {
    const avgOrb = item.orb_count ? +(item.total_orb / item.orb_count).toFixed(2) : null;
    const avgWeight = item.weight_count ? +(item.total_weight / item.weight_count).toFixed(3) : null;
    const houses = item.houses && item.houses.size ? Array.from(item.houses) : null;
    const descriptorParts = [item.aspect];
    if (houses) descriptorParts.push(`targets ${houses.join('/')}`);
    if (avgOrb != null) descriptorParts.push(`avg orb ${avgOrb}°`);
    if (avgWeight != null) descriptorParts.push(`weight ${avgWeight}`);
    return {
      vector: item.aspect,
      count: item.count,
      average_orb: avgOrb,
      average_weight: avgWeight,
      house_targets: houses,
      descriptor: descriptorParts.join(' · ')
    };
  }).sort((a, b) => b.count - a.count).slice(0, 5);

  return {
    active: finalizeActive(),
    latent: finalizeRejections(latentMap),
    suppressed: finalizeRejections(suppressedMap),
    dormant: finalizeRejections(dormantMap),
    method: 'vector-scan-2',
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
    const magnitudeInfo = classifyMagnitude(summary.magnitude);
    const magnitudeVal = magnitudeInfo?.value ?? safeNum(summary.magnitude);
    const magnitudeLabel = summary.magnitude_label || magnitudeInfo?.label || null;

    const volatilityInfo = classifyVolatility(summary.volatility);
    const volatilityVal = volatilityInfo?.value ?? safeNum(summary.volatility);
    const volatilityLabel = summary.volatility_label || volatilityInfo?.label || null;

    const balanceMeta = meterChannels?.balance || null;
    const valenceSource = summary.valence_bounded ?? balanceMeta?.value ?? summary.valence;
    const valenceInfo = classifyValence(valenceSource);
    const valenceVal = valenceInfo?.value ?? safeNum(valenceSource);
    const valenceRaw = safeNum(summary.valence_raw_unbounded ?? summary.valence_raw);
    const valenceLabel = summary.valence_label || balanceMeta?.label || valenceInfo?.label || null;
    const valenceRange = Array.isArray(summary.valence_range)
      ? summary.valence_range
      : (balanceMeta?.range || [-5, 5]);
    const valenceVersion = summary?.valence_version
      || balanceMeta?.calibration_mode
      || balanceMeta?.version
      || BALANCE_CALIBRATION_VERSION;
    const valenceCode = balanceMeta?.code || valenceInfo?.code || null;
    const valencePolarity = balanceMeta?.polarity || valenceInfo?.polarity || (valenceVal >= 0 ? 'positive' : 'negative');

    balanceMeter = {
      magnitude: {
        value: magnitudeVal,
        label: magnitudeLabel
      },
      magnitude_label: magnitudeLabel,
      valence: {
        value: valenceVal,
        raw_value: valenceRaw,
        normalized: balanceMeta?.value ?? valenceVal,
        label: valenceLabel,
        emoji: balanceMeta?.emoji || valenceInfo?.emoji || null,
        polarity: valencePolarity,
        band: balanceMeta?.band || valenceInfo?.band || null,
        code: valenceCode,
        range: valenceRange,
        version: valenceVersion,
        sample_size: balanceMeta?.sample_size ?? summary.valence_sample_size ?? null
      },
      valence_bounded: valenceVal,
      valence_label: valenceLabel,
      valence_code: valenceCode,
      valence_range: valenceRange,
      valence_version: valenceVersion,
      valence_raw_unbounded: valenceRaw,
      volatility: {
        value: volatilityVal,
        label: volatilityLabel,
        emoji: volatilityInfo?.emoji || null
      },
      volatility_label: volatilityLabel,
      confidence: meterChannels?.seismograph?.confidence ?? null,
      confidence_sample_size: meterChannels?.seismograph?.sample_size ?? 0,
      balance_channel: balanceMeta ? { ...balanceMeta } : null,
      support_friction: meterChannels?.sfd ? { ...meterChannels.sfd } : null,
      version: result?.provenance?.engine_versions
        ? { ...result.provenance.engine_versions }
        : {
            seismograph: SEISMOGRAPH_VERSION,
            balance: BALANCE_CALIBRATION_VERSION,
            sfd: SFD_VERSION
          },
      calibration_mode: balanceMeta?.calibration_mode || summary.valence_version || BALANCE_CALIBRATION_VERSION
    };
  }

  const natalSummary = extractNatalSummary(a);
  const driversSummary = (() => {
    const placements = natalSummary?.placements || {};
    const listNames = (arr) => Array.isArray(arr) ? arr.map(item => item?.name).filter(Boolean) : [];
    return {
      core_planets: listNames(placements.core),
      supporting_points: listNames(placements.supporting),
      derived: listNames(placements.derived)
    };
  })();

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
    natal_summary: natalSummary,
    drivers: driversSummary,
    vector_integrity: vectorIntegrity,
    polarity_cards: buildPolarityCardsHooks(a), // DATA hooks only, no VOICE
    mirror_voice: null, // reserved for Raven
    raw_geometry: extractRawGeometry(result),
    provenance: result.provenance || null
  };

  return report;
}

module.exports = { composeWovenMapReport };
