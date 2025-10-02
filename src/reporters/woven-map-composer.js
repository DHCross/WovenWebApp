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
  // Prefer bounded valence; fall back to override; never let raw leak into UI math
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
    // prefer bounded/balance valence; clamp defensively
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
    const valenceVersion = seismo?.valence_version || v?.balance?.version || BALANCE_CALIBRATION_VERSION;
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
      // normalized/calibrated valence mirrors bounded value for UI paths
      valence_calibrated: safeNum(seismo?.valence_calibrated ?? valenceBounded ?? balanceVal),
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

function normalizeDriftEvidenceEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const mappedRaw = entry.mappedTo || entry.mapped_to || entry.alignment || entry.result;
  if (!mappedRaw) return null;
  const mappedToken = String(mappedRaw).trim().toUpperCase();
  if (mappedToken !== 'DRIVER' && mappedToken !== 'ROLE') return null;
  const areaRaw = entry.area || entry.domain || entry.scope;
  const area = typeof areaRaw === 'string' ? areaRaw.trim().toLowerCase() : undefined;
  return { mappedTo: mappedToken, area };
}

function computeDriftFromEvidence(evidence) {
  if (!Array.isArray(evidence) || !evidence.length) return null;
  const filtered = evidence.map(normalizeDriftEvidenceEntry).filter(Boolean);
  const driver = filtered.filter(e => e.mappedTo === 'DRIVER').length;
  const role = filtered.filter(e => e.mappedTo === 'ROLE').length;
  const denom = driver + role;
  const driftIndex = denom > 0 ? +(driver / denom).toFixed(4) : 0;

  const allowedAreas = new Set(['agency','boundaries','communication','energy','relationships','work','home','identity']);
  const areaSet = new Set();
  for (const item of filtered) {
    if (item.area && allowedAreas.has(item.area)) {
      areaSet.add(item.area);
    }
  }
  const areas = Array.from(areaSet);

  let band = 'NONE';
  const n = filtered.length;
  if (n >= 4 && areas.length >= 2 && driftIndex >= 0.7) band = 'STRONG';
  else if (n >= 3 && driftIndex >= 0.5) band = 'POSSIBLE';

  const stateDependent = areas.length < 2 && band !== 'NONE';
  return {
    driftIndex,
    band: stateDependent ? 'NONE' : band,
    evidenceN: n,
    areasSpanned: areas,
    stateDependent
  };
}

function coerceArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [];
}

function gatherDriftInputs(result) {
  const evidence = [];
  const candidateArrays = [
    result?.session_context?.osrProbes,
    result?.session_context?.osr_probes,
    result?.feedback?.session_context?.osrProbes,
    result?.feedback?.session_context?.osr_probes,
    result?.feedback?.session_patterns?.osrProbes,
    result?.feedback?.session_patterns?.osr_probes,
    result?.feedback?.osrProbes,
    result?.feedback?.osr_probes,
    result?.frontstage?.mirror?.session_context?.osrProbes,
    result?.frontstage?.mirror?.session_context?.osr_probes,
    result?.frontstage?.mirror?.diagnostics?.osrProbes,
    result?.frontstage?.mirror?.diagnostics?.osr_probes,
    result?.backstage?.session?.osrProbes,
    result?.backstage?.session?.osr_probes,
    result?.backstage?.diagnostics?.osrProbes,
    result?.backstage?.diagnostics?.osr_probes,
    result?.actor_role?.osrProbes,
    result?.actor_role?.osr_probes
  ];

  for (const arr of candidateArrays) {
    const list = coerceArray(arr);
    for (const item of list) {
      const normalized = normalizeDriftEvidenceEntry(item);
      if (normalized) evidence.push(normalized);
    }
  }

  const driftIndexCandidates = [
    result?.session_context?.driftIndex,
    result?.session_context?.drift_index,
    result?.feedback?.session_context?.driftIndex,
    result?.feedback?.session_context?.drift_index,
    result?.feedback?.driftIndex,
    result?.feedback?.drift_index,
    result?.frontstage?.mirror?.diagnostics?.driftIndex,
    result?.frontstage?.mirror?.diagnostics?.drift_index,
    result?.backstage?.diagnostics?.driftIndex,
    result?.backstage?.diagnostics?.drift_index,
    result?.actor_role?.driftIndex,
    result?.actor_role?.drift_index
  ];

  const driftBandCandidates = [
    result?.session_context?.driftBand,
    result?.session_context?.drift_band,
    result?.feedback?.session_context?.driftBand,
    result?.feedback?.session_context?.drift_band,
    result?.feedback?.driftBand,
    result?.feedback?.drift_band,
    result?.actor_role?.driftBand,
    result?.actor_role?.drift_band
  ];

  const driftEvidenceCountCandidates = [
    result?.session_context?.driftEvidenceN,
    result?.session_context?.drift_evidence_n,
    result?.feedback?.session_context?.driftEvidenceN,
    result?.feedback?.session_context?.drift_evidence_n,
    result?.actor_role?.evidenceN,
    result?.actor_role?.evidence_n
  ];

  const driftAreasCandidates = [
    result?.session_context?.driftAreas,
    result?.session_context?.drift_areas,
    result?.feedback?.session_context?.driftAreas,
    result?.feedback?.session_context?.drift_areas,
    result?.actor_role?.areasSpanned,
    result?.actor_role?.areas_spanned
  ];

  const driftStateCandidates = [
    result?.session_context?.driftStateDependent,
    result?.session_context?.drift_state_dependent,
    result?.feedback?.session_context?.driftStateDependent,
    result?.feedback?.session_context?.drift_state_dependent,
    result?.actor_role?.stateDependent,
    result?.actor_role?.state_dependent
  ];

  const firstFinite = (list) => {
    for (const value of list) {
      const num = safeNum(value);
      if (num != null) return num;
    }
    return null;
  };

  const pickString = (list) => {
    for (const value of list) {
      if (typeof value === 'string' && value.trim()) return value.trim().toUpperCase();
    }
    return null;
  };

  const pickBoolean = (list) => {
    for (const value of list) {
      if (typeof value === 'boolean') return value;
    }
    return null;
  };

  const pickArray = (list) => {
    for (const value of list) {
      if (Array.isArray(value) && value.length) return value;
    }
    return null;
  };

  return {
    driftEvidence: evidence,
    driftIndex: firstFinite(driftIndexCandidates),
    driftBand: pickString(driftBandCandidates),
    driftEvidenceCount: firstFinite(driftEvidenceCountCandidates),
    driftAreas: pickArray(driftAreasCandidates),
    driftStateDependent: pickBoolean(driftStateCandidates)
  };
}

function computeVectorIntegrity(transitsByDate, driftMeta = {}) {
  const base = { active: [], latent: [], suppressed: [], dormant: [], method: 'vector-scan-2', sample_size: 0 };
  if (!transitsByDate || typeof transitsByDate !== 'object') {
    const drift = Array.isArray(driftMeta?.driftEvidence) && driftMeta.driftEvidence.length
      ? computeDriftFromEvidence(driftMeta.driftEvidence)
      : null;
    return {
      ...base,
      drift_index: drift?.driftIndex ?? safeNum(driftMeta?.driftIndex),
      drift_band: drift?.band || (typeof driftMeta?.driftBand === 'string' ? driftMeta.driftBand : null),
      drift_samples: drift?.evidenceN ?? safeNum(driftMeta?.driftEvidenceCount) ?? (Array.isArray(driftMeta?.driftEvidence) ? driftMeta.driftEvidence.length : null),
      drift_areas: drift?.areasSpanned || (Array.isArray(driftMeta?.driftAreas) ? driftMeta.driftAreas : null),
      drift_state_dependent: drift?.stateDependent ?? (typeof driftMeta?.driftStateDependent === 'boolean' ? driftMeta.driftStateDependent : null)
    };
  }

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

  const summarizeMapCounts = (map) => {
    let events = 0;
    map.forEach(item => {
      if (item && typeof item.count === 'number') events += item.count;
    });
    return events;
  };

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

  const activeFinal = finalizeActive();
  const latentFinal = finalizeRejections(latentMap);
  const suppressedFinal = finalizeRejections(suppressedMap);
  const dormantFinal = finalizeRejections(dormantMap);

  const drift = Array.isArray(driftMeta?.driftEvidence) && driftMeta.driftEvidence.length
    ? computeDriftFromEvidence(driftMeta.driftEvidence)
    : null;

  const driftIndex = drift?.driftIndex ?? safeNum(driftMeta?.driftIndex);
  const driftBand = drift?.band || (typeof driftMeta?.driftBand === 'string' ? driftMeta.driftBand : null);
  const driftSamples = drift?.evidenceN ?? safeNum(driftMeta?.driftEvidenceCount) ?? (Array.isArray(driftMeta?.driftEvidence) ? driftMeta.driftEvidence.length : null);
  const driftAreas = drift?.areasSpanned || (Array.isArray(driftMeta?.driftAreas) ? driftMeta.driftAreas : null);
  const driftStateDependent = drift?.stateDependent ?? (typeof driftMeta?.driftStateDependent === 'boolean' ? driftMeta.driftStateDependent : null);

  return {
    active: activeFinal,
    latent: latentFinal,
    suppressed: suppressedFinal,
    dormant: dormantFinal,
    method: 'vector-scan-2',
    sample_size: sampleDays,
    summary: {
      active_vectors: activeMap.size,
      latent_vectors: latentMap.size,
      suppressed_vectors: suppressedMap.size,
      dormant_vectors: dormantMap.size,
      active_events: summarizeMapCounts(activeMap),
      latent_events: summarizeMapCounts(latentMap),
      suppressed_events: summarizeMapCounts(suppressedMap),
      dormant_events: summarizeMapCounts(dormantMap)
    },
    drift_index: driftIndex != null ? +Number(driftIndex).toFixed(3) : null,
    drift_band: driftBand,
    drift_samples: driftSamples != null ? Math.round(driftSamples) : (driftSamples === 0 ? 0 : null),
    drift_areas: driftAreas && driftAreas.length ? driftAreas : null,
    drift_state_dependent: driftStateDependent === true ? true : driftStateDependent === false ? false : null
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
    // avoid literal keys named 'field'|'map'|'voice'
    { id: 'card_1', tone_hint: null, geometry_hooks: sample, text_slot: null },
    { id: 'card_2', tone_hint: null, geometry_hooks: sample, text_slot: null },
    { id: 'card_3', tone_hint: null, geometry_hooks: sample, text_slot: null }
  ];
}

// Helper functions for unified report structure
function extractSynastrySummary(result) {
  // Check multiple locations for synastry aspects
  const synastry = result?.synastry;
  const composite = result?.composite;

  const aspects = synastry?.aspects
    || composite?.synastry_aspects
    || composite?.relational_mirror?.synastry_aspects
    || [];

  if (!aspects.length) return null;

  const supportiveAspects = aspects.filter(asp => ['trine', 'sextile', 'conjunction'].includes(asp.aspect?.toLowerCase()));
  const challengingAspects = aspects.filter(asp => ['square', 'opposition'].includes(asp.aspect?.toLowerCase()));

  return {
    total_aspects: aspects.length,
    supportive_count: supportiveAspects.length,
    challenging_count: challengingAspects.length,
    top_supportive: supportiveAspects.slice(0, 3),
    top_challenging: challengingAspects.slice(0, 3),
    dominant_theme: supportiveAspects.length > challengingAspects.length * 1.5 ? 'harmonious' :
                   challengingAspects.length > supportiveAspects.length * 1.5 ? 'dynamic' : 'balanced'
  };
}

function extractRelationshipScore(result) {
  // Extract relationship score if available from result
  return result?.relationship_score || result?.synastry?.score || null;
}

function extractTransitContext(result) {
  const transitsByDate = result?.person_a?.chart?.transitsByDate || {};
  const dates = Object.keys(transitsByDate).sort();
  if (!dates.length) return null;

  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  const totalDays = dates.length;

  // Find strongest transit across the period
  let strongestTransit = null;
  let minOrb = 999;

  Object.values(transitsByDate).forEach(dayData => {
    const aspects = Array.isArray(dayData) ? dayData :
                   Array.isArray(dayData?.aspects) ? dayData.aspects :
                   Array.isArray(dayData?.filtered_aspects) ? dayData.filtered_aspects : [];

    aspects.forEach(asp => {
      if (asp.orbit < minOrb) {
        minOrb = asp.orbit;
        strongestTransit = `${asp.p1_name} ${asp.aspect} ${asp.p2_name}`;
      }
    });
  });

  return {
    period: { start: firstDate, end: lastDate },
    total_days: totalDays,
    strongest_transit: strongestTransit,
    min_orb: minOrb
  };
}

function extractFieldTriggers(result) {
  const transitsByDate = result?.person_a?.chart?.transitsByDate || {};
  const triggers = new Set();

  Object.values(transitsByDate).forEach(dayData => {
    const aspects = Array.isArray(dayData) ? dayData :
                   Array.isArray(dayData?.aspects) ? dayData.aspects :
                   Array.isArray(dayData?.filtered_aspects) ? dayData.filtered_aspects : [];

    aspects.forEach(asp => {
      if (asp.orbit < 3) { // Only close aspects
        triggers.add(asp.p1_name); // Transit planet
        triggers.add(asp.p2_name); // Natal planet
        triggers.add(asp.aspect);  // Aspect type
      }
    });
  });

  return Array.from(triggers).slice(0, 10); // Limit to top 10 triggers
}

function inferReportType(modeToken, hasB) {
  const m = (modeToken || '').toUpperCase();

  // Check for explicit relational indicators
  if (m.includes('SYNASTRY') ||
      m.includes('COMPOSITE') ||
      m.includes('RELATIONAL') ||
      m.includes('DYADIC') ||
      hasB) {
    return 'relational';
  }

  return 'solo';
}

// New: report-family inference and gating
function inferFamily(modeToken, result) {
  const m = (modeToken || '').toUpperCase();
  const hasTransits = !!(result?.person_a?.chart?.transitsByDate && Object.keys(result.person_a.chart.transitsByDate).length);

  // Legacy mode support
  if (m.includes('BALANCE_METER_ONLY')) return 'balance_meter';
  if (m.includes('MIRROR_FLOW_ONLY')) return 'mirror_flow';

  // Default to unified comprehensive structure
  return 'comprehensive';
}

function buildBalanceMeter(summary, meterChannels, provenanceVersions) {
  if (!summary) return null;
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
  return {
    magnitude: { value: magnitudeVal, label: magnitudeLabel },
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
    volatility: { value: volatilityVal, label: volatilityLabel, emoji: volatilityInfo?.emoji || null },
    volatility_label: volatilityLabel,
    confidence: meterChannels?.seismograph?.confidence ?? null,
    confidence_sample_size: meterChannels?.seismograph?.sample_size ?? 0,
    balance_channel: meterChannels?.balance ? { ...meterChannels.balance } : null,
    support_friction: meterChannels?.sfd ? { ...meterChannels.sfd } : null,
    version: provenanceVersions
      ? { ...provenanceVersions }
      : { seismograph: SEISMOGRAPH_VERSION, balance: BALANCE_CALIBRATION_VERSION, sfd: SFD_VERSION },
    calibration_mode: meterChannels?.balance?.calibration_mode || BALANCE_CALIBRATION_VERSION
  };
}

function composeWovenMapReport({ result, mode, period, options = {} }) {
  const a = result.person_a || {};
  const b = result.person_b || null;
  const type = inferReportType(mode, !!b);
  const report_family = options.report_family || inferFamily(mode, result);

  const transits = a.chart?.transitsByDate;
  const summary = a.derived?.seismograph_summary || null;
  const meterChannels = summarizeMeterChannels(transits);
  const integration = computeIntegrationFactors(summary, meterChannels?.balance?.value ?? null);
  const timeSeries = extractTimeSeries(transits);
  const vectorInputs = gatherDriftInputs(result);
  const vectorIntegrity = computeVectorIntegrity(transits, vectorInputs);
  const hookStack = composeHookStack(result, { maxHooks: 4, minIntensity: 8 });

  const report = {
    schema: 'WM-WovenMap-1.0',
    type, // 'solo' | 'relational'
    report_family,
    context: {
      mode,
      period: period || null,
      translocation: result?.context?.translocation || null,
      person_a: {
        name: a?.details?.name || 'Subject',
        birth_date: a?.details?.birth_date || null,
        birth_time: a?.details?.birth_time || null,
        birth_time_exact: a?.details?.birth_time_exact ?? true, // Flag if birth time is exact or approximate
        birthplace: {
          city: a?.details?.city || null,
          state: a?.details?.state || null,
          country: a?.details?.country || null,
          coordinates: (a?.details?.latitude != null && a?.details?.longitude != null)
            ? { lat: a.details.latitude, lon: a.details.longitude }
            : null
        },
        timezone: a?.details?.timezone || null,
        house_system: 'Placidus', // Explicitly stated per requirements
        zodiac_type: a?.details?.zodiac_type || 'Tropic' // Tropical (not sidereal yet)
      },
      person_b: b ? {
        name: b?.details?.name || 'Subject B',
        birth_date: b?.details?.birth_date || null,
        birth_time: b?.details?.birth_time || null,
        birth_time_exact: b?.details?.birth_time_exact ?? true,
        birthplace: {
          city: b?.details?.city || null,
          state: b?.details?.state || null,
          country: b?.details?.country || null,
          coordinates: (b?.details?.latitude != null && b?.details?.longitude != null)
            ? { lat: b.details.latitude, lon: b.details.longitude }
            : null
        },
        timezone: b?.details?.timezone || null,
        house_system: 'Placidus',
        zodiac_type: b?.details?.zodiac_type || 'Tropic'
      } : null
    },
    raw_geometry: extractRawGeometry(result),
    provenance: result.provenance || null
  };

  // Unified comprehensive report structure (replaces mirror_flow/balance_meter split)
  if (report_family === 'comprehensive' || report_family === 'unified') {
    // BLUEPRINT LAYER (natal/relational foundation - always present)
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

    // Extract blueprint modes (Primary/Secondary/Shadow) for Raven Calder
    const { extractBlueprintModes } = require('../../lib/blueprint-extraction');
    const blueprintModes = extractBlueprintModes(a.chart || a);

    report.blueprint = {
      natal_summary: natalSummary,
      drivers: driversSummary,
      modes: blueprintModes, // NEW: Jungian function extraction
      polarity_cards: buildPolarityCardsHooks(a),
      vector_integrity: vectorIntegrity,
      ...(type === 'relational' && {
        synastry_summary: extractSynastrySummary(result),
        relationship_score: extractRelationshipScore(result),
        // Extract modes for Person B as well
        person_b_modes: b ? extractBlueprintModes(b.chart || b) : null
      })
    };

    // SYMBOLIC WEATHER LAYER (only if transits present)
    const hasTransits = !!(result?.person_a?.chart?.transitsByDate && Object.keys(result.person_a.chart.transitsByDate).length);
    if (hasTransits) {
      const weatherLayer = {
        balance_meter: buildBalanceMeter(summary, meterChannels, result?.provenance?.engine_versions),
        time_series: timeSeries,
        integration_factors: integration,
        transit_context: extractTransitContext(result),
        field_triggers: extractFieldTriggers(result)
      };

      // Add relational data if available
      if (type === 'relational') {
        // CRITICAL: Bidirectional overlays (preserves asymmetry A←B and B←A)
        if (result?.composite?.relational_mirror?.bidirectional_overlays) {
          weatherLayer.bidirectional_overlays = result.composite.relational_mirror.bidirectional_overlays;
        }

        // Legacy: Deprecated averaged metrics (kept for compatibility)
        if (result?.balance_meter?.relational_balance_meter) {
          weatherLayer.relational_balance_meter_legacy = result.balance_meter.relational_balance_meter;
        }

        // Person B transit summary
        if (result?.person_b?.chart?.transitsByDate) {
          const summaryB = result.person_b.derived?.seismograph_summary || null;
          const meterChannelsB = summarizeMeterChannels(result.person_b.chart.transitsByDate);
          weatherLayer.person_b_balance_meter = buildBalanceMeter(summaryB, meterChannelsB, result?.provenance?.engine_versions);
        }
      }

      report.symbolic_weather = weatherLayer;
    }

    // COMPREHENSIVE DATA TABLES (for PDF export)
    const tableBuilders = require('./table-builders');
    report.data_tables = {
      natal_positions: tableBuilders.buildNatalPositionsTable(a),
      natal_aspects: tableBuilders.buildNatalAspectsTable(a),
      summary_stats: tableBuilders.buildSummaryStats(result),
      ...(hasTransits && {
        transit_aspects: tableBuilders.buildTransitAspectsTable(result),
        daily_readings: tableBuilders.buildDailyReadingsTable(timeSeries)
      }),
      ...(type === 'relational' && {
        synastry_aspects: tableBuilders.buildSynastryAspectsTable(result),
        composite_positions: tableBuilders.buildCompositePositionsTable(result)
      })
    };

  } else if (report_family === 'mirror_flow') {
    // Legacy mirror_flow structure (maintained for backward compatibility)
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
    report.natal_summary = natalSummary;
    report.drivers = driversSummary;
    report.vector_integrity = vectorIntegrity;
    report.polarity_cards = buildPolarityCardsHooks(a);

  } else if (report_family === 'balance_meter') {
    // Legacy balance_meter structure (maintained for backward compatibility)
    report.balance_meter = buildBalanceMeter(summary, meterChannels, result?.provenance?.engine_versions);
    report.time_series = timeSeries;
    report.integration_factors = integration;
  }

  report.hook_stack = hookStack;

  return report;
}

module.exports = { composeWovenMapReport, inferReportType, inferFamily };
