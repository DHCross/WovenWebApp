// Woven Map Report Composer (DATA-ONLY)
// Builds a clinical, non-VOI CE report envelope from existing Math Brain outputs.
// Do NOT include narrative fields; avoid keys named 'field', 'map', or 'voice' to pass Clear Mirror scrub.

const { composeHookStack } = require('../feedback/hook-stack-composer');

function safeNum(x, def = null) {
  const n = Number(x);
  return Number.isFinite(n) ? n : def;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function computeIntegrationFactors(summary) {
  if (!summary) return null;
  const mag = safeNum(summary.magnitude, 0) || 0;
  const val = safeNum(summary.valence, 0) || 0;
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
    const row = {
      date,
      magnitude: safeNum(v?.magnitude),
      valence: safeNum(v?.valence),
      volatility: safeNum(v?.volatility),
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
  const placements = chart.planets || birth.planets || null;
  const angles = chart.angles || birth.angles || null;
  const aspects = Array.isArray(person.aspects) ? person.aspects : (chart.aspects || []);
  return {
    placements,
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
  const integration = computeIntegrationFactors(summary);
  const timeSeries = extractTimeSeries(a.chart?.transitsByDate);
  const hookStack = composeHookStack(result, { maxHooks: 4, minIntensity: 8 });

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
    balance_meter: summary ? {
      magnitude: summary.magnitude,
      valence: summary.valence,
      volatility: summary.volatility
    } : null,
    hook_stack: hookStack,
    integration_factors: integration,
    time_series: timeSeries,
    natal_summary: extractNatalSummary(a),
    vector_integrity: {
      latent: [], // TODO: compute heuristic from aspect network
      suppressed: [], // TODO: compute heuristic from counter-aspects
      method: 'stub-0'
    },
    polarity_cards: buildPolarityCardsHooks(a), // DATA hooks only, no VOICE
    mirror_voice: null, // reserved for Raven
    raw_geometry: extractRawGeometry(result),
    provenance: result.provenance || null
  };

  return report;
}

module.exports = { composeWovenMapReport };
