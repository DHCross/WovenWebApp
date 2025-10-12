import { stampProvenance } from '@/lib/raven/provenance';

type RelationshipScopeDetail = {
  label: string;
  description?: string;
};

const RELATIONSHIP_SCOPE_MAP: Record<string, RelationshipScopeDetail> = {
  PARTNER: {
    label: 'Partner',
    description: 'Full map access, including intimacy arcs & legacy patterns.',
  },
  FRIEND: {
    label: 'Friend / Acquaintance',
    description: 'Emotional, behavioral, and social dynamics; intimacy overlays de-emphasized.',
  },
  FAMILY: {
    label: 'Family Member',
    description: 'Legacy patterns and behavioral overlays anchored to family systems.',
  },
  COLLEAGUE: {
    label: 'Colleague',
    description: 'Professional overlays with emphasis on logistics and shared projects.',
  },
  CLIENT: {
    label: 'Client',
    description: 'Service-based overlays; focus on deliverables and agreed scope.',
  },
};

const INTIMACY_TIER_LABELS: Record<string, string> = {
  P1: 'P1 — Platonic partners',
  P2: 'P2 — Friends-with-benefits',
  P3: 'P3 — Situationship (unclear/unstable)',
  P4: 'P4 — Low-commitment romantic or sexual',
  P5A: 'P5a — Committed romantic + sexual',
  P5B: 'P5b — Committed romantic, non-sexual',
};

function resolveRelationshipScope(raw?: string): (RelationshipScopeDetail & { key: string }) | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const key = trimmed.toUpperCase();
  const match = RELATIONSHIP_SCOPE_MAP[key];
  if (match) {
    return { key, ...match };
  }
  return { key, label: trimmed };
}

function resolveIntimacyTier(raw?: string): { key: string; label: string } | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const key = trimmed.toUpperCase();
  const label = INTIMACY_TIER_LABELS[key];
  if (label) {
    return { key, label };
  }
  return { key, label: trimmed };
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}

function getNested(source: any, path: (string | number)[]): any {
  let current: any = source;
  for (const segment of path) {
    if (!isObject(current) && typeof current !== 'object') return undefined;
    current = current?.[segment as any];
    if (current === undefined || current === null) return current;
  }
  return current;
}

function toDayKey(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : undefined;
}

function toDayNumber(dayKey: string): number | undefined {
  const ms = Date.parse(`${dayKey}T00:00:00Z`);
  if (Number.isNaN(ms)) return undefined;
  return Math.floor(ms / 86_400_000);
}

function collectDayKeys(candidate: any): string[] {
  if (!Array.isArray(candidate)) return [];
  const keys = candidate
    .map((entry) => {
      if (isObject(entry) && typeof entry.date !== 'undefined') {
        return toDayKey(entry.date);
      }
      if (typeof entry === 'string') {
        return toDayKey(entry);
      }
      return undefined;
    })
    .filter(Boolean) as string[];
  return keys;
}

function uniqueSortedDayKeys(values: string[]): string[] {
  const unique = Array.from(new Set(values));
  return unique.sort((a, b) => {
    const aNum = toDayNumber(a) ?? 0;
    const bNum = toDayNumber(b) ?? 0;
    return aNum - bNum;
  });
}

function analyseCadence(parsed: Record<string, any>, periodStart?: string, periodEnd?: string) {
  const stepRaw =
    pickString(parsed, [
      ['window', 'step'],
      ['indices', 'window', 'step'],
      ['context', 'window', 'step'],
      ['context', 'period', 'step'],
      ['balance_meter', 'period', 'step'],
      ['reports', 'balance_meter', 'period', 'step'],
      ['symbolic_weather_context', 'transit_context', 'period', 'step'],
      ['export_info', 'date_range', 'step'],
    ]) || undefined;

  const arraysToInspect: any[] = [];
  const arrayPaths: (string | number)[][] = [
    ['daily_readings'],
    ['reports', 'balance_meter', 'daily_readings'],
    ['reports', 'balance_meter', 'daily', 'readings'],
    ['symbolic_weather_context', 'daily_readings'],
    ['symbolic_weather_context', 'balance_meter', 'daily_readings'],
    ['balance_meter_summary', 'daily_readings'],
    ['indices', 'days'],
  ];
  for (const path of arrayPaths) {
    const candidate = getNested(parsed, path);
    if (Array.isArray(candidate)) arraysToInspect.push(candidate);
  }

  const dayKeys = uniqueSortedDayKeys(arraysToInspect.flatMap((arr) => collectDayKeys(arr)));
  const dayNumbers = dayKeys
    .map((key) => toDayNumber(key))
    .filter((value): value is number => typeof value === 'number');

  const deltas = dayNumbers
    .map((value, index) => (index === 0 ? undefined : value - dayNumbers[index - 1]))
    .filter((value): value is number => typeof value === 'number');

  const avgDelta = deltas.length
    ? deltas.reduce((acc, value) => acc + value, 0) / deltas.length
    : undefined;

  const stepHint = (() => {
    if (!stepRaw) return undefined;
    if (/day/i.test(stepRaw)) return 1;
    if (/week/i.test(stepRaw)) return 7;
    if (/hour/i.test(stepRaw)) return 1 / 24;
    return undefined;
  })();

  const cadenceLabel = (() => {
    if (stepRaw) {
      if (/day/i.test(stepRaw)) return 'Daily';
      if (/week/i.test(stepRaw)) return 'Weekly';
      if (/hour/i.test(stepRaw)) return 'Hourly';
    }
    if (typeof avgDelta === 'number') {
      if (avgDelta <= 1.2) return 'Daily';
      if (avgDelta >= 5.5 && avgDelta <= 8.5) return 'Weekly';
      if (avgDelta < 1) return 'Sub-daily';
    }
    return undefined;
  })();

  const expectedDelta = (() => {
    if (typeof stepHint === 'number' && stepHint > 0) return stepHint;
    if (cadenceLabel === 'Daily') return 1;
    if (cadenceLabel === 'Weekly') return 7;
    if (cadenceLabel === 'Hourly') return 1 / 24;
    return undefined;
  })();

  const tolerance = expectedDelta && expectedDelta < 1 ? 0.1 : 0.34;

  const isContinuous = expectedDelta === undefined
    ? dayNumbers.length <= 1
    : deltas.every((delta) => Math.abs(delta - expectedDelta) <= tolerance);

  const coverageStart = dayKeys[0] ?? periodStart;
  const coverageEnd = dayKeys[dayKeys.length - 1] ?? periodEnd;

  const cadenceSummary = (() => {
    if (cadenceLabel) {
      if (coverageStart && coverageEnd && coverageStart !== coverageEnd) {
        if (isContinuous) {
          return `${cadenceLabel} coverage is continuous from ${coverageStart} to ${coverageEnd}.`;
        }
        return `${cadenceLabel} data from ${coverageStart} to ${coverageEnd} has gaps—double-check any missing days.`;
      }
      if (coverageStart) {
        return `${cadenceLabel} snapshot logged for ${coverageStart}.`;
      }
    }
    if (!isContinuous && coverageStart && coverageEnd && coverageStart !== coverageEnd) {
      return `Data from ${coverageStart} to ${coverageEnd} has gaps—double-check any missing days.`;
    }
    return undefined;
  })();

  return {
    cadenceLabel,
    cadenceSummary,
    isContinuous,
    sampleCount: dayKeys.length,
    coverageStart,
    coverageEnd,
  };
}

function asString(value: any): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  return undefined;
}

function asNumber(value: any): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (isObject(value)) {
    if (typeof value.value === 'number' && Number.isFinite(value.value)) {
      return value.value;
    }
    if (typeof value.score === 'number' && Number.isFinite(value.score)) {
      return value.score;
    }
    if (typeof value.mean === 'number' && Number.isFinite(value.mean)) {
      return value.mean;
    }
  }
  return undefined;
}

function pickString(data: any, paths: (string | number)[][]): string | undefined {
  for (const path of paths) {
    const candidate = getNested(data, path);
    const str = asString(candidate);
    if (str) return str;
  }
  return undefined;
}

function pickNumber(data: any, paths: (string | number)[][]): number | undefined {
  for (const path of paths) {
    const candidate = getNested(data, path);
    const num = asNumber(candidate);
    if (num !== undefined) return num;
  }
  return undefined;
}

export function summariseUploadedReportJson(raw: string): {
  draft: Record<string, any>;
  prov: Record<string, any>;
  climateText?: string;
  highlight?: string;
} | null {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed.startsWith('{') || trimmed.length < 20) {
    return null;
  }
  if (!/"balance_meter"|"solo_mirror"|"mirror_voice"|"symbolic_weather"|"balance_meter_summary"/i.test(trimmed)) {
    return null;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!isObject(parsed)) {
    return null;
  }

  const reportType =
    pickString(parsed, [
      ['report_kind'],
      ['report_type'],
      ['mode'],
      ['context', 'mode'],
      ['metadata', 'report_type'],
      ['reports', 'report_type'],
      ['reports', 'type'],
      ['contract'],
      ['symbolic_weather_context', 'report_kind'],
    ]) ||
    pickString(parsed, [['_format']]) ||
    'report';

  const subject = pickString(parsed, [
    ['balance_meter', 'person', 'name'],
    ['person', 'name'],
    ['person_a', 'details', 'name'],
    ['person_a', 'name'],
    ['context', 'person', 'name'],
    ['context', 'person_a', 'name'],
    ['provenance', 'person_name'],
    ['export_info', 'person_a'],
  ]);

  const climateLine = pickString(parsed, [
    ['balance_meter', 'climate_line'],
    ['balance_meter', 'climate', 'line'],
    ['summary', 'climate_line'],
    ['context', 'climate_line'],
    ['reports', 'balance_meter', 'climate', 'line'],
    ['symbolic_weather_context', 'balance_meter', 'bias_motion'],
    ['symbolic_weather_context', 'balance_meter', 'volatility_label'],
  ]);

  const magnitude = pickNumber(parsed, [
    ['balance_meter', 'channel_summary_canonical', 'axes', 'magnitude', 'value'],
    ['balance_meter', 'magnitude_0to5'],
    ['balance_meter', 'magnitude'],
    ['balance_meter', 'magnitude', 'value'],
    ['balance_meter', 'summary', 'magnitude'],
    ['balance_meter', 'summary', 'magnitude', 'value'],
    ['balance_meter', 'seismograph', 'magnitude_0to5'],
    ['balance_meter', 'seismograph', 'magnitude'],
    ['balance_meter', 'climate', 'magnitude'],
    ['seismograph', 'magnitude_0to5'],
    ['seismograph', 'magnitude'],
    ['summary', 'balance_meter', 'magnitude'],
    ['summary', 'balance_meter', 'magnitude', 'value'],
    ['reports', 'balance_meter', 'magnitude'],
    ['reports', 'balance_meter', 'magnitude', 'value'],
    ['balance_meter_summary', 'magnitude'],
    ['symbolic_weather_context', 'balance_meter', 'magnitude'],
    ['symbolic_weather_context', 'balance_meter', 'magnitude', 'value'],
    ['symbolic_weather_context', 'balance_meter', 'magnitude_bounded'],
    ['dailyRanges', 'magnitudeMin'],
    ['daily_readings', 0, 'magnitude'],
  ]);
  const magnitudeLabel = pickString(parsed, [
    ['balance_meter', 'channel_summary_canonical', 'labels', 'magnitude'],
    ['balance_meter', 'magnitude', 'label'],
    ['balance_meter', 'magnitude', 'term'],
    ['balance_meter', 'magnitude_label'],
    ['balance_meter', 'climate', 'magnitude_label'],
    ['summary', 'balance_meter', 'magnitude_label'],
    ['symbolic_weather_context', 'balance_meter', 'magnitude_label'],
  ]);

  const valence = pickNumber(parsed, [
    ['balance_meter', 'channel_summary_canonical', 'axes', 'directional_bias', 'value'],
    ['balance_meter', 'bias_signed'],
    ['balance_meter', 'directional_bias'],
    ['balance_meter', 'valence'],
    ['balance_meter', 'valence', 'value'],
    ['balance_meter', 'valence_bounded'],
    ['balance_meter', 'climate', 'bias_signed'],
    ['balance_meter', 'climate', 'valence'],
    ['balance_meter', 'climate', 'valence_bounded'],
    ['balance_meter', 'seismograph', 'bias_signed'],
    ['seismograph', 'bias_signed'],
    ['seismograph', 'valence'],
    ['summary', 'balance_meter', 'bias_signed'],
    ['summary', 'balance_meter', 'valence'],
    ['summary', 'balance_meter', 'valence', 'value'],
    ['reports', 'balance_meter', 'bias_signed'],
    ['reports', 'balance_meter', 'valence'],
    ['reports', 'balance_meter', 'valence', 'value'],
    ['balance_meter_summary', 'bias_signed'],
    ['balance_meter_summary', 'valence'],
    ['symbolic_weather_context', 'balance_meter', 'bias_signed'],
    ['symbolic_weather_context', 'balance_meter', 'valence_bounded'],
    ['symbolic_weather_context', 'balance_meter', 'valence'],
    ['daily_readings', 0, 'directional_bias'],
    ['dailyRanges', 'biasMin'],
  ]);
  const valenceLabel = pickString(parsed, [
    ['balance_meter', 'channel_summary_canonical', 'labels', 'directional_bias'],
    ['balance_meter', 'bias_signed', 'label'],
    ['balance_meter', 'directional_bias', 'label'],
    ['balance_meter', 'valence', 'label'],
    ['balance_meter', 'valence', 'term'],
    ['balance_meter', 'valence_label'],
    ['balance_meter', 'climate', 'bias_label'],
    ['balance_meter', 'climate', 'valence_label'],
    ['summary', 'balance_meter', 'bias_label'],
    ['summary', 'balance_meter', 'valence_label'],
    ['symbolic_weather_context', 'balance_meter', 'valence_label'],
  ]);

  const volatility = pickNumber(parsed, [
    ['balance_meter', 'channel_summary_canonical', 'axes', 'volatility', 'value'],
    ['balance_meter', 'coherence_0to5'],
    ['balance_meter', 'coherence'],
    ['balance_meter', 'narrative_coherence'],
    ['balance_meter', 'volatility'],
    ['balance_meter', 'volatility', 'value'],
    ['balance_meter', 'climate', 'coherence'],
    ['balance_meter', 'climate', 'volatility'],
    ['balance_meter', 'seismograph', 'coherence_0to5'],
    ['balance_meter', 'seismograph', 'volatility'],
    ['seismograph', 'coherence_0to5'],
    ['seismograph', 'volatility'],
    ['summary', 'balance_meter', 'coherence'],
    ['summary', 'balance_meter', 'volatility'],
    ['reports', 'balance_meter', 'coherence'],
    ['reports', 'balance_meter', 'volatility'],
    ['reports', 'balance_meter', 'volatility', 'value'],
    ['balance_meter_summary', 'coherence'],
    ['balance_meter_summary', 'volatility'],
    ['symbolic_weather_context', 'balance_meter', 'coherence'],
    ['symbolic_weather_context', 'balance_meter', 'coherence', 'value'],
    ['symbolic_weather_context', 'balance_meter', 'volatility'],
    ['daily_readings', 0, 'coherence'],
  ]);
  const volatilityLabel = pickString(parsed, [
    ['balance_meter', 'channel_summary_canonical', 'labels', 'volatility'],
    ['balance_meter', 'coherence', 'label'],
    ['balance_meter', 'coherence_label'],
    ['balance_meter', 'volatility', 'label'],
    ['balance_meter', 'volatility', 'term'],
    ['balance_meter', 'volatility_label'],
    ['symbolic_weather_context', 'balance_meter', 'coherence_label'],
    ['symbolic_weather_context', 'balance_meter', 'volatility_label'],
  ]);

  const sfd = pickNumber(parsed, [
    ['balance_meter', 'sfd_cont_minus1to1'],
    ['balance_meter', 'sfd_cont'],
    ['balance_meter', 'sfd'],
    ['balance_meter', 'integration_bias'],
    ['balance_meter', 'seismograph', 'sfd_cont_minus1to1'],
    ['balance_meter', 'seismograph', 'sfd_cont'],
    ['seismograph', 'sfd_cont_minus1to1'],
    ['seismograph', 'sfd_cont'],
    ['summary', 'balance_meter', 'sfd'],
    ['reports', 'balance_meter', 'sfd'],
    ['symbolic_weather_context', 'balance_meter', 'sfd'],
    ['symbolic_weather_context', 'balance_meter', 'sfd', 'value'],
    ['symbolic_weather_context', 'balance_meter', 'sfd_cont_minus1to1'],
  ]);
  const sfdLabel = pickString(parsed, [
    ['balance_meter', 'sfd', 'label'],
    ['balance_meter', 'sfd_label'],
    ['balance_meter', 'integration_bias_label'],
    ['symbolic_weather_context', 'balance_meter', 'sfd_label'],
  ]);

  const periodStart =
    pickString(parsed, [
      ['balance_meter', 'period', 'start'],
      ['context', 'period', 'start'],
      ['context', 'window', 'start'],
      ['window', 'start'],
      ['reports', 'balance_meter', 'period', 'start'],
      ['export_info', 'date_range', 'start'],
      ['symbolic_weather_context', 'transit_context', 'period', 'start'],
    ]) ||
    (Array.isArray(parsed?.daily_readings) && parsed.daily_readings.length
      ? asString(parsed.daily_readings[0]?.date)
      : undefined);

  const periodEnd =
    pickString(parsed, [
      ['balance_meter', 'period', 'end'],
      ['context', 'period', 'end'],
      ['context', 'window', 'end'],
      ['window', 'end'],
      ['reports', 'balance_meter', 'period', 'end'],
      ['export_info', 'date_range', 'end'],
      ['symbolic_weather_context', 'transit_context', 'period', 'end'],
    ]) ||
    (Array.isArray(parsed?.daily_readings) && parsed.daily_readings.length
      ? asString(parsed.daily_readings[parsed.daily_readings.length - 1]?.date)
      : undefined);

  const hooksRoot =
    getNested(parsed, ['balance_meter', 'hook_stack', 'hooks']) ??
    getNested(parsed, ['reports', 'balance_meter', 'hook_stack', 'hooks']) ??
    getNested(parsed, ['symbolic_weather_context', 'balance_meter', 'hook_stack', 'hooks']) ??
    getNested(parsed, ['symbolic_weather_context', 'field_triggers']);
  const hooks = Array.isArray(hooksRoot)
    ? hooksRoot
        .map((entry: any) => {
          if (typeof entry === 'string') {
            return entry.trim();
          }
          if (isObject(entry)) {
            const label = asString(entry.label);
            if (!label) return undefined;
            const orb = asNumber(entry.orb);
            const tags: string[] = [];
            if (entry.exact === true) tags.push('exact');
            if (typeof orb === 'number') tags.push(`${orb.toFixed(1)}°`);
            return tags.length ? `${label} (${tags.join(', ')})` : label;
          }
          return undefined;
        })
        .filter(Boolean)
    : [];

  const cadence = analyseCadence(parsed, periodStart, periodEnd);

  const relationshipScopeRaw =
    pickString(parsed, [
      ['relationship_context', 'scope'],
      ['context', 'relationship_context', 'scope'],
      ['relationship_scope'],
      ['context', 'relationship_scope'],
    ]) || undefined;

  const relationshipTypeRaw =
    pickString(parsed, [
      ['relationship_context', 'type'],
      ['context', 'relationship_context', 'type'],
      ['context', 'relationship', 'type'],
      ['relationship_type'],
      ['context', 'relationship_type'],
    ]) || undefined;

  const resolvedScope = resolveRelationshipScope(relationshipScopeRaw ?? relationshipTypeRaw);

  const relationshipContact =
    pickString(parsed, [
      ['relationship_context', 'contact_state'],
      ['context', 'relationship_context', 'contact_state'],
      ['relationship_contact_state'],
    ]) || undefined;

  const relationshipRole =
    pickString(parsed, [
      ['relationship_context', 'role'],
      ['context', 'relationship_context', 'role'],
    ]) || undefined;

  const intimacyTierRaw =
    pickString(parsed, [
      ['relationship_context', 'intimacy_tier'],
      ['context', 'relationship_context', 'intimacy_tier'],
    ]) || undefined;

  const resolvedIntimacy = resolveIntimacyTier(intimacyTierRaw);

  const relationshipNotes =
    pickString(parsed, [
      ['relationship_context', 'notes'],
      ['context', 'relationship_context', 'notes'],
    ]) || undefined;

  const summaryPieces: string[] = [];
  if (typeof magnitude === 'number') {
    summaryPieces.push(
      `Magnitude ${magnitude.toFixed(2)}${magnitudeLabel ? ` (${magnitudeLabel})` : ''}`
    );
  }
  if (typeof valence === 'number') {
    summaryPieces.push(
      `Directional Bias ${valence.toFixed(2)}${valenceLabel ? ` (${valenceLabel})` : ''}`
    );
  }
  if (typeof volatility === 'number') {
    summaryPieces.push(
      `Coherence ${volatility.toFixed(2)}${volatilityLabel ? ` (${volatilityLabel})` : ''}`
    );
  }
  if (typeof sfd === 'number') {
    summaryPieces.push(
      `Integration ${sfd.toFixed(2)}${sfdLabel ? ` (${sfdLabel})` : ''}`
    );
  }

  const containerParts: string[] = [];
  if (periodStart && periodEnd) {
    containerParts.push(`Window ${periodStart} → ${periodEnd}`);
  } else if (periodStart) {
    containerParts.push(`Window begins ${periodStart}`);
  }
  if (cadence.cadenceSummary) {
    containerParts.push(cadence.cadenceSummary);
  }
  if (hooks.length) {
    containerParts.push(`Hooks ${hooks.slice(0, 2).join(' · ')}`);
  }

  const relationshipLines: string[] = [];
  if (resolvedScope) {
    const base = resolvedScope.description
      ? `${resolvedScope.label} — ${resolvedScope.description}`
      : resolvedScope.label;
    relationshipLines.push(base);
  }
  if (relationshipContact) {
    relationshipLines.push(`Contact · ${relationshipContact}`);
  }
  if (relationshipRole) {
    relationshipLines.push(`Role · ${relationshipRole}`);
  }
  if (resolvedIntimacy) {
    relationshipLines.push(`Intimacy · ${resolvedIntimacy.label}`);
  }
  if (relationshipNotes) {
    relationshipLines.push(`Notes · ${relationshipNotes}`);
  }

  if (relationshipLines.length) {
    containerParts.push(`Relational scope — ${relationshipLines.join(' · ')}`);
  }

  const picture = climateLine || `Report logged for ${subject || 'this chart'}.`;
  const feeling = summaryPieces.length
    ? summaryPieces.join(' · ')
    : 'Stored for interpretation when you are ready.';
  const container = containerParts.length
    ? containerParts.join(' · ')
    : 'Context added to the session library.';
  const option = 'Ask for a Poetic translation of any section or upload another layer.';
  const next_step = 'When you are ready, tell me which pattern you want mirrored.';

  const appendix: Record<string, any> = {};
  if (reportType) appendix.report_type = reportType;
  if (subject) appendix.subject = subject;
  if (periodStart) appendix.period_start = periodStart;
  if (periodEnd) appendix.period_end = periodEnd;
  if (typeof magnitude === 'number') appendix.magnitude = magnitude;
  if (magnitudeLabel) appendix.magnitude_label = magnitudeLabel;
  if (typeof valence === 'number') appendix.directional_bias = valence;
  if (valenceLabel) appendix.directional_bias_label = valenceLabel;
  if (typeof volatility === 'number') appendix.coherence = volatility;
  if (volatilityLabel) appendix.coherence_label = volatilityLabel;
  if (typeof sfd === 'number') appendix.integration_bias = sfd;
  if (sfdLabel) appendix.integration_bias_label = sfdLabel;
  if (hooks.length) appendix.hooks = hooks.slice(0, 3);
  if (cadence.cadenceLabel) appendix.cadence = cadence.cadenceLabel.toLowerCase();
  if (typeof cadence.sampleCount === 'number' && cadence.sampleCount > 0) {
    appendix.sample_count = cadence.sampleCount;
  }
  if (typeof cadence.isContinuous === 'boolean') {
    appendix.is_continuous = cadence.isContinuous;
  }
  if (cadence.coverageStart && !appendix.period_start) {
    appendix.period_start = cadence.coverageStart;
  }
  if (cadence.coverageEnd && !appendix.period_end) {
    appendix.period_end = cadence.coverageEnd;
  }
  if (relationshipTypeRaw) {
    appendix.relationship_type = relationshipTypeRaw;
  }
  if (relationshipScopeRaw) {
    appendix.relationship_scope = relationshipScopeRaw;
  }
  if (resolvedScope) {
    appendix.relationship_scope_label = resolvedScope.label;
    if (resolvedScope.description) {
      appendix.relationship_scope_description = resolvedScope.description;
    }
  }
  if (relationshipContact) {
    appendix.contact_state = relationshipContact;
  }
  if (relationshipRole) {
    appendix.relationship_role = relationshipRole;
  }
  if (intimacyTierRaw) {
    appendix.intimacy_tier = intimacyTierRaw;
  }
  if (resolvedIntimacy && resolvedIntimacy.label !== intimacyTierRaw) {
    appendix.intimacy_tier_label = resolvedIntimacy.label;
  }
  if (relationshipNotes) {
    appendix.relationship_notes = relationshipNotes;
  }

  const draft: Record<string, any> = { picture, feeling, container, option, next_step };
  if (Object.keys(appendix).length > 0) {
    draft.appendix = appendix;
  }

  const prov = stampProvenance({
    source: 'Uploaded JSON Report',
    report_type: reportType,
    ...(subject ? { subject } : {}),
  });

  const climateText = summaryPieces.length ? summaryPieces.join(' · ') : undefined;
  const windowSummary = periodStart
    ? `Report stored for ${periodStart}${periodEnd ? ` → ${periodEnd}` : ''}`
    : undefined;
  const cadenceHighlight = cadence.cadenceSummary?.replace(/\.$/, '');

  const relationshipHighlightParts: string[] = [];
  if (resolvedScope) {
    relationshipHighlightParts.push(resolvedScope.label);
  }
  if (relationshipContact) {
    relationshipHighlightParts.push(`Contact ${relationshipContact}`);
  }
  if (relationshipRole) {
    relationshipHighlightParts.push(`Role ${relationshipRole}`);
  }
  if (resolvedIntimacy) {
    relationshipHighlightParts.push(resolvedIntimacy.label);
  }

  const highlightParts = [climateText, windowSummary, cadenceHighlight]
    .concat(relationshipHighlightParts.length ? relationshipHighlightParts.join(' · ') : [])
    .filter(Boolean) as string[];
  const highlight = highlightParts.length
    ? Array.from(new Set(highlightParts)).join(' · ')
    : undefined;

  return { draft, prov, climateText, highlight };
}

export default summariseUploadedReportJson;
