import fs from 'fs';
import path from 'path';
import { extractBalanceMeterSummary, formatBalanceMeterSummaryLine } from '../raven-formatting';

export type WovenAIPacketVariant = 'compact' | 'full' | 'strict';

export interface WovenAIPacketOptions {
  variant?: WovenAIPacketVariant;
  protocolVersion?: string;
  checksumFn?: (unifiedOutput: any) => string;
}

export interface WovenAIPacketResult {
  filename: string;
  content: string;
  meta: {
    variant: WovenAIPacketVariant;
    hasField: boolean;
    hasTransits: boolean;
    reportType: 'mirror' | 'balance' | 'combined';
    protocolVersion: string;
  };
}

const PACKET_VERSION = '1.0';
const CANONICAL_PACKET_PATH = path.join(process.cwd(), 'docs', 'WOVEN_AI_PACKET_v1.0.md');

function loadCanonicalPacketTemplate(): string {
  try {
    return fs.readFileSync(CANONICAL_PACKET_PATH, 'utf8');
  } catch (error: any) {
    throw new Error(
      `Failed to read canonical Woven AI Packet template at ${CANONICAL_PACKET_PATH}: ${error?.message || String(
        error,
      )}`,
    );
  }
}

function assertHasRequiredFields(unifiedOutput: any): void {
  if (!unifiedOutput || typeof unifiedOutput !== 'object') {
    throw new Error('createWovenAIPacket requires a unified Math Brain v2 output object.');
  }

  if (!unifiedOutput.person_a) {
    throw new Error('Missing person_a in unifiedOutput.');
  }

  if (!unifiedOutput.run_metadata) {
    throw new Error('Missing run_metadata in unifiedOutput.');
  }

  if (!unifiedOutput.provenance) {
    throw new Error('Missing provenance in unifiedOutput.');
  }

  const hasDailyEntries = Array.isArray(unifiedOutput.daily_entries) && unifiedOutput.daily_entries.length > 0;
  const hasSymbolicWeatherArray =
    Array.isArray(unifiedOutput?.woven_map?.symbolic_weather) && unifiedOutput.woven_map.symbolic_weather.length > 0;
  const hasBalanceMeter = Boolean(
    unifiedOutput.balance_meter || unifiedOutput.balance_meter_frontstage,
  );

  if (!hasDailyEntries && !hasSymbolicWeatherArray && !hasBalanceMeter) {
    throw new Error(
      'unifiedOutput does not contain FIELD / symbolic weather metrics required for Woven AI Packet generation.',
    );
  }
}

function extractProvenanceSummary(unifiedOutput: any) {
  const p = (unifiedOutput && typeof unifiedOutput.provenance === 'object'
    ? unifiedOutput.provenance
    : {}) as Record<string, any>;

  const dataSource = p.data_source || p.source || 'Math Brain API';
  const ephemerisBackend = p.ephemeris_backend || p.ephemeris_source || p.ephemeris || 'unknown';
  const orbsProfile = p.orbs_profile || p.orb_profile || 'unknown';
  const relocationMode = p.relocation_mode || p.relocation || 'none';
  const mathBrainVersion = p.math_brain_version || unifiedOutput.math_brain_version || 'unknown';

  return {
    data_source: String(dataSource),
    ephemeris_backend: String(ephemerisBackend),
    orbs_profile: String(orbsProfile),
    relocation_mode: String(relocationMode),
    math_brain_version: String(mathBrainVersion),
  };
}

function resolveReportType(unifiedOutput: any): 'mirror' | 'balance' | 'combined' {
  const hasMirror = Boolean(unifiedOutput.person_a?.chart);
  const hasField = Boolean(
    (Array.isArray(unifiedOutput.daily_entries) && unifiedOutput.daily_entries.length > 0) ||
      (Array.isArray(unifiedOutput.woven_map?.symbolic_weather) &&
        unifiedOutput.woven_map.symbolic_weather.length > 0) ||
      unifiedOutput.balance_meter ||
      unifiedOutput.balance_meter_frontstage,
  );

  if (hasMirror && hasField) return 'combined';
  if (hasField) return 'balance';
  return 'mirror';
}

function extractFieldSnapshot(unifiedOutput: any) {
  const bmFrontstage = unifiedOutput.balance_meter_frontstage;
  const bmRaw = unifiedOutput.balance_meter;
  const bmSummary = unifiedOutput.person_a?.summary;

  // Prefer frontstage if present, else derive from balance_meter, else fall back to person_a.summary
  if (bmFrontstage && typeof bmFrontstage === 'object') {
    const magnitude = bmFrontstage.magnitude ?? null;
    const magnitudeLabel = bmFrontstage.magnitude_label ?? null;
    const directionalBias = bmFrontstage.directional_bias ?? null;
    const directionalBiasLabel = bmFrontstage.directional_bias_label ?? null;
    const coherence = bmFrontstage.coherence ?? null;
    return { magnitude, magnitudeLabel, directionalBias, directionalBiasLabel, coherence };
  }

  if (bmRaw && typeof bmRaw === 'object') {
    const summary = extractBalanceMeterSummary(bmRaw);
    const magnitude = summary?.magnitude ?? null;
    const magnitudeLabel = summary?.magnitudeLabel ?? null;
    const directionalBias = summary?.directionalBias ?? null;
    const directionalBiasLabel = summary?.directionalBiasLabel ?? null;
    // Coherence is not part of the canonical summary; use raw coherence if present
    const coherence = typeof bmRaw.coherence === 'number' ? bmRaw.coherence : null;
    return { magnitude, magnitudeLabel, directionalBias, directionalBiasLabel, coherence };
  }

  if (bmSummary && typeof bmSummary === 'object') {
    const magnitude = bmSummary.magnitude ?? null;
    const magnitudeLabel = bmSummary.magnitude_label ?? null;
    const directionalBias = bmSummary.directional_bias ?? bmSummary.valence ?? null;
    const directionalBiasLabel = bmSummary.directional_bias_label ?? bmSummary.valence_label ?? null;
    const coherence = bmSummary.coherence ?? null;
    return { magnitude, magnitudeLabel, directionalBias, directionalBiasLabel, coherence };
  }

  return { magnitude: null, magnitudeLabel: null, directionalBias: null, directionalBiasLabel: null, coherence: null };
}

function extractDailyReadingsTrimmed(unifiedOutput: any, variant: WovenAIPacketVariant) {
  const raw = Array.isArray(unifiedOutput?.woven_map?.symbolic_weather)
    ? unifiedOutput.woven_map.symbolic_weather
    : Array.isArray(unifiedOutput.daily_entries)
        ? unifiedOutput.daily_entries.map((entry: any) => {
            const sw = entry.symbolic_weather || entry;
            return {
              date: entry.date || sw.date,
              magnitude: sw.magnitude,
              directional_bias: sw.directional_bias,
              coherence: sw.coherence,
              label: sw.label,
            };
          })
        : [];

  const readings = raw.filter((r: any) => r && r.date);
  if (readings.length === 0) return [];

  if (variant === 'full' || variant === 'strict') return readings;

  if (readings.length <= 7) return readings;

  // compact: pick first, last, and up to 5 highest magnitude days
  const sortedByMag = [...readings].sort((a, b) => (b.magnitude || 0) - (a.magnitude || 0));
  const picks = new Map<string, any>();

  picks.set(readings[0].date, readings[0]);
  picks.set(readings[readings.length - 1].date, readings[readings.length - 1]);

  for (const r of sortedByMag) {
    if (picks.size >= 7) break;
    picks.set(r.date, r);
  }

  return Array.from(picks.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function extractMapSnapshot(unifiedOutput: any) {
  const summary = unifiedOutput.person_a?.summary || {};

  return {
    sun_sign: summary.sun_sign || null,
    sun_house: summary.sun_house || null,
    sun_blurb: summary.sun_blurb || summary.sun_description || null,
    moon_sign: summary.moon_sign || null,
    moon_house: summary.moon_house || null,
    moon_blurb: summary.moon_blurb || summary.moon_description || null,
    rising_sign: summary.rising_sign || null,
    rising_blurb: summary.rising_blurb || summary.rising_description || null,
    primary_mode: summary.primary_mode || null,
    shadow_mode: summary.shadow_mode || null,
  };
}

function extractClimateLine(unifiedOutput: any): string | null {
  const bm = unifiedOutput.balance_meter || unifiedOutput.balance_meter_frontstage || null;
  if (bm && typeof bm === 'object') {
    if (typeof bm.climate_line === 'string' && bm.climate_line.trim()) {
      return bm.climate_line.trim();
    }
    const canonical = bm.channel_summary_canonical || bm.channel_summary;
    if (canonical && typeof canonical === 'object' && typeof canonical.line === 'string' && canonical.line.trim()) {
      return canonical.line.trim();
    }
    const summary = extractBalanceMeterSummary(bm);
    const line = formatBalanceMeterSummaryLine(summary);
    if (line && line.trim()) return line.trim();
  }
  if (typeof unifiedOutput.climateLine === 'string' && unifiedOutput.climateLine.trim()) {
    return unifiedOutput.climateLine.trim();
  }
  if (typeof unifiedOutput.constitutionalClimate === 'string' && unifiedOutput.constitutionalClimate.trim()) {
    return unifiedOutput.constitutionalClimate.trim();
  }
  return null;
}

function extractHooks(unifiedOutput: any): string[] {
  const candidates: any[] = [];

  if (Array.isArray(unifiedOutput.hooks)) candidates.push(...unifiedOutput.hooks);
  if (Array.isArray(unifiedOutput.symbolic_weather_context?.hooks)) {
    candidates.push(...unifiedOutput.symbolic_weather_context.hooks);
  }
  if (Array.isArray(unifiedOutput.balance_meter?.hooks)) {
    candidates.push(...unifiedOutput.balance_meter.hooks);
  }

  const hooks: string[] = [];
  for (const raw of candidates) {
    if (typeof raw === 'string') {
      hooks.push(raw.trim());
    } else if (raw && typeof raw === 'object') {
      const text = raw.text || raw.label || raw.hook;
      if (typeof text === 'string' && text.trim()) hooks.push(text.trim());
    }
    if (hooks.length >= 3) break;
  }

  return hooks;
}

function fillTemplate(template: string, unifiedOutput: any, options: WovenAIPacketOptions): string {
  const protocolVersion =
    options.protocolVersion || unifiedOutput.run_metadata?.protocol_version || unifiedOutput.math_brain_version || 'unknown';
  const checksum = options.checksumFn ? options.checksumFn(unifiedOutput) : 'n/a';
  const fieldSnapshot = extractFieldSnapshot(unifiedOutput);
  const dailyReadings = extractDailyReadingsTrimmed(unifiedOutput, options.variant || 'compact');
  const mapSnapshot = extractMapSnapshot(unifiedOutput);
  const provenance = extractProvenanceSummary(unifiedOutput);
  const climateLine = extractClimateLine(unifiedOutput);
  const hooks = extractHooks(unifiedOutput);
  const reportType = resolveReportType(unifiedOutput);

  let content = template;

  // Header substitutions
  content = content.replace('{{protocol_version}}', String(protocolVersion));
  content = content.replace('{{checksum_or_id}}', String(checksum));
  const reportTypeLabel =
    reportType === 'mirror' ? 'Mirror Flow' : reportType === 'balance' ? 'Balance Meter' : 'Combined';
  content = content.replace('{{Mirror Flow | Balance Meter | Combined}}', reportTypeLabel);

  // Provenance substitutions
  content = content.replace('{{provenance.data_source}}', provenance.data_source);
  content = content.replace('{{provenance.ephemeris_backend}}', provenance.ephemeris_backend);
  content = content.replace('{{provenance.orbs_profile}}', provenance.orbs_profile);
  content = content.replace('{{provenance.relocation_mode}}', provenance.relocation_mode);
  content = content.replace('{{provenance.math_brain_version}}', provenance.math_brain_version);

  // FIELD snapshot substitutions
  content = content.replace(
    '{{field.magnitude}}',
    fieldSnapshot.magnitude !== null && fieldSnapshot.magnitude !== undefined
      ? String(fieldSnapshot.magnitude)
      : 'null',
  );

  // Climate line
  content = content.replace('{{climate_line}}', climateLine || '');
  content = content.replace(
    '{{field.magnitude_label}}',
    fieldSnapshot.magnitudeLabel !== null && fieldSnapshot.magnitudeLabel !== undefined
      ? String(fieldSnapshot.magnitudeLabel)
      : 'n/a',
  );
  content = content.replace(
    '{{field.directional_bias}}',
    fieldSnapshot.directionalBias !== null && fieldSnapshot.directionalBias !== undefined
      ? String(fieldSnapshot.directionalBias)
      : 'null',
  );
  content = content.replace(
    '{{field.bias_label}}',
    fieldSnapshot.directionalBiasLabel !== null && fieldSnapshot.directionalBiasLabel !== undefined
      ? String(fieldSnapshot.directionalBiasLabel)
      : 'n/a',
  );
  content = content.replace(
    '{{field.coherence}}',
    fieldSnapshot.coherence !== null && fieldSnapshot.coherence !== undefined
      ? String(fieldSnapshot.coherence)
      : 'null',
  );

  // MAP snapshot substitutions
  content = content.replace('{{sun_sign}}', mapSnapshot.sun_sign || 'unknown');
  content = content.replace('{{sun_house}}', mapSnapshot.sun_house || '');
  content = content.replace('{{sun_blurb}}', mapSnapshot.sun_blurb || '');
  content = content.replace('{{moon_sign}}', mapSnapshot.moon_sign || '');
  content = content.replace('{{moon_house}}', mapSnapshot.moon_house || '');
  content = content.replace('{{moon_blurb}}', mapSnapshot.moon_blurb || '');
  content = content.replace('{{rising_sign}}', mapSnapshot.rising_sign || '');
  content = content.replace('{{rising_blurb}}', mapSnapshot.rising_blurb || '');
  content = content.replace('{{primary_mode.function}}', mapSnapshot.primary_mode?.function || '');
  content = content.replace('{{primary_mode.description}}', mapSnapshot.primary_mode?.description || '');
  content = content.replace('{{shadow_mode.function}}', mapSnapshot.shadow_mode?.function || '');
  content = content.replace('{{shadow_mode.description}}', mapSnapshot.shadow_mode?.description || '');

  // Hooks (if present)
  content = content.replace('{{hook_1}}', hooks[0] || '');
  content = content.replace('{{hook_2}}', hooks[1] || '');
  content = content.replace('{{hook_3}}', hooks[2] || '');

  // Daily table expansion: replace the {{#each}} block with concrete rows
  const eachStart = content.indexOf('{{#each daily_readings_trimmed}}');
  const eachEnd = content.indexOf('{{/each}}');

  if (eachStart !== -1 && eachEnd !== -1 && eachEnd > eachStart) {
    const before = content.slice(0, eachStart);
    const loopBlock = content.slice(eachStart, eachEnd);
    const lines = loopBlock.split('\n');
    const rowTemplate = lines.find((line) => line.includes('{{date}}')) || '';

    const rows = dailyReadings
      .map((r: any) => {
        return rowTemplate
          .replace('{{date}}', r.date || '')
          .replace('{{magnitude}}',
            r.magnitude !== null && r.magnitude !== undefined ? String(r.magnitude) : 'null',
          )
          .replace('{{directional_bias}}',
            r.directional_bias !== null && r.directional_bias !== undefined
              ? String(r.directional_bias)
              : 'null',
          )
          .replace('{{coherence}}',
            r.coherence !== null && r.coherence !== undefined ? String(r.coherence) : 'null',
          )
          .replace('{{label}}', r.label || '');
      })
      .join('\n');

    const after = content.slice(eachEnd + '{{/each}}'.length);
    content = `${before}${rows}${after}`;
  }

  return content;
}

export function createWovenAIPacket(
  unifiedOutput: any,
  options: WovenAIPacketOptions = {},
): WovenAIPacketResult {
  assertHasRequiredFields(unifiedOutput);

  const variant: WovenAIPacketVariant = options.variant || 'compact';
  const template = loadCanonicalPacketTemplate();
  const filled = fillTemplate(template, { ...unifiedOutput }, { ...options, variant });

  const hasField = Boolean(
    (Array.isArray(unifiedOutput.daily_entries) && unifiedOutput.daily_entries.length > 0) ||
      (Array.isArray(unifiedOutput.woven_map?.symbolic_weather) &&
        unifiedOutput.woven_map.symbolic_weather.length > 0),
  );

  const hasTransits = Boolean(unifiedOutput.person_a?.chart?.transitsByDate);
  const reportType = resolveReportType(unifiedOutput);
  const protocolVersion =
    options.protocolVersion || unifiedOutput.run_metadata?.protocol_version || 'unknown';
  const subjectName =
    unifiedOutput.person_a?.details?.name || unifiedOutput.person_a?.name || 'subjectA';
  const window = unifiedOutput.transit_window || {};

  const filename = `woven_packet_v${PACKET_VERSION}_${subjectName}_${
    window.start_date || 'start'
  }_${window.end_date || 'end'}.md`;

  return {
    filename,
    content: filled,
    meta: {
      variant,
      hasField,
      hasTransits,
      reportType,
      protocolVersion,
    },
  };
}
