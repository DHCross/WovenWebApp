'use strict';

function needsLocation(reportType, includeTransitTag, s) {
  const needsLoc = reportType === 'balance' || (reportType === 'mirror' && includeTransitTag);
  const maybeLat = s?.latitude;
  const maybeLon = s?.longitude;
  const hasLat = typeof maybeLat === 'number' || (typeof maybeLat === 'string' && maybeLat.trim() !== '' && Number.isFinite(Number(maybeLat)));
  const hasLon = typeof maybeLon === 'number' || (typeof maybeLon === 'string' && maybeLon.trim() !== '' && Number.isFinite(Number(maybeLon)));
  const hasTz = !!s?.timezone;
  const hasLoc = !!s && hasLat && hasLon && hasTz;
  const hasHour = typeof s?.hour === 'number' || (typeof s?.hour === 'string' && s.hour !== '');
  const hasMinute = typeof s?.minute === 'number' || (typeof s?.minute === 'string' && s.minute !== '');
  const hasBirthTime = hasHour && hasMinute;
  return { needsLoc, hasLoc, hasBirthTime, canSubmit: !needsLoc || (needsLoc && hasLoc) };
}

const parseNumber = value => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  return null;
};

const normalizeRelocationMode = (raw, fallback) => {
  if (!raw && raw !== 0) return fallback;
  const token = String(raw)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
  switch (token) {
    case 'a_local':
    case 'a_local_lens':
    case 'person_a_local':
    case 'alocal':
    case 'a_local_mode':
      return 'A_local';
    case 'b_local':
    case 'person_b_local':
    case 'blocal':
    case 'b_local_mode':
      return 'B_local';
    case 'both_local':
    case 'both':
    case 'shared':
    case 'shared_local':
    case 'dual_local':
    case 'same_city':
      return 'both_local';
    case 'event':
    case 'custom':
    case 'event_city':
    case 'custom_event':
      return 'event';
    case 'midpoint':
    case 'midpoint_advanced':
    case 'midpoint_advanced_hidden':
    case 'composite_midpoint':
      return 'midpoint_advanced_hidden';
    case 'birthplace':
    case 'none':
    case 'natal':
    case 'a_natal':
    case 'b_natal':
    case 'off':
      return 'birthplace';
    default:
      if (token.includes('midpoint')) return 'midpoint_advanced_hidden';
      if (token.includes('both') || token.includes('shared')) return 'both_local';
      if (token.includes('b_local')) return 'B_local';
      if (token.includes('a_local')) return 'A_local';
      if (token.includes('event')) return 'event';
      return fallback;
  }
};

const relocationActive = mode => mode !== 'birthplace';

const scopeFromMode = mode => {
  switch (mode) {
    case 'A_local':
      return 'person_a';
    case 'B_local':
      return 'person_b';
    case 'both_local':
    case 'midpoint_advanced_hidden':
      return 'shared';
    case 'event':
      return 'event';
    default:
      return 'off';
  }
};

const relocationDisclosure = (mode, label) => {
  const place = label?.trim();
  const safe = place && place.length > 0 ? place : undefined;
  switch (mode) {
    case 'birthplace':
      return 'Relocation: None (birthplace houses/angles).';
    case 'A_local':
      return `Relocation on: ${safe ?? "Person A’s city"}. Houses/angles move; planets stay fixed.`;
    case 'B_local':
      return `Relocation on: ${safe ?? "Person B’s city"}. Houses/angles move; planets stay fixed.`;
    case 'both_local':
      return `Relocation on: ${safe ?? "Shared city for A & B"}. Houses/angles move; planets stay fixed.`;
    case 'event':
      return `Relocation on: ${safe ?? 'Event city'}. Houses/angles move; planets stay fixed.`;
    case 'midpoint_advanced_hidden':
      return 'Relocation: Midpoint (symbolic; lower confidence).';
    default:
      return `Relocation on: ${safe ?? 'Selected city'}. Houses/angles move; planets stay fixed.`;
  }
};

const relocationStatusLine = mode => {
  switch (mode) {
    case 'birthplace':
      return 'Relocation is off. Houses/angles stay at birth locations.';
    case 'A_local':
      return 'Relocation on: Person A’s city. Houses/angles move; planets stay fixed.';
    case 'B_local':
      return 'Relocation on: Person B’s city. Houses/angles move; planets stay fixed.';
    case 'both_local':
      return 'Relocation on: Shared city for A & B. Houses/angles move; planets stay fixed.';
    case 'event':
      return 'Relocation on: Event city. Houses/angles move; planets stay fixed.';
    case 'midpoint_advanced_hidden':
      return 'Symbolic midpoint lens (not a real city). Lower diagnostic confidence.';
    default:
      return 'Relocation lens active.';
  }
};

const relocationInvariants = mode => {
  if (mode === 'midpoint_advanced_hidden') {
    return 'Symbolic midpoint frame. Planets stay fixed; treat as low confidence.';
  }
  if (mode === 'birthplace') {
    return 'Planets and houses remain at birth coordinates.';
  }
  return 'Planets stay fixed; houses/angles remap to the selected location.';
};

const firstDefined = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return null;
};

function summarizeRelocation(ctx) {
  const provenance = ctx?.provenance || ctx?.meta || {};
  const t = ctx?.translocation || {};
  const applies = Boolean(t?.applies ?? provenance?.relocation_mode);
  const fallbackMode = applies ? 'event' : 'birthplace';
  const rawMode = ctx?.relocation_mode ?? t?.mode ?? t?.method ?? provenance?.relocation_mode ?? (applies ? 'event' : 'birthplace');
  const mode = normalizeRelocationMode(rawMode, fallbackMode);

  const natalTimezone = firstDefined(
    ctx?.natal?.timezone,
    provenance?.natal_timezone,
    provenance?.birth_timezone,
  );

  const active = relocationActive(mode);
  const label = firstDefined(
    t?.current_location?.label,
    t?.label,
    ctx?.relocation_label,
    provenance?.relocation_label,
  );

  const coordsRaw = t?.coords ?? t?.coordinates ?? provenance?.relocation_coords ?? provenance?.coords ?? null;

  const latitude = parseNumber(coordsRaw?.latitude ?? coordsRaw?.lat);
  const longitude = parseNumber(coordsRaw?.longitude ?? coordsRaw?.lon);
  const timezone = firstDefined(
    t?.tz,
    t?.timezone,
    coordsRaw?.timezone,
    coordsRaw?.tz,
    provenance?.relocation_timezone,
    provenance?.tz,
  );

  const coordinates = active
    ? {
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        timezone: timezone ?? null,
      }
    : null;

  const houseSystem = firstDefined(
    t?.house_system,
    provenance?.house_system,
    provenance?.house_system_name,
  );
  const zodiacType = firstDefined(t?.zodiac_type, provenance?.zodiac_type);

  const engineVersions =
    provenance?.engine_versions && typeof provenance.engine_versions === 'object'
      ? provenance.engine_versions
      : null;

  const confidence = (() => {
    const rawConfidence = provenance?.confidence;
    if (typeof rawConfidence === 'string') {
      return rawConfidence.toLowerCase().includes('low') ? 'low' : 'normal';
    }
    return mode === 'midpoint_advanced_hidden' ? 'low' : 'normal';
  })();

  const disclosure = relocationDisclosure(mode, label);
  const status = relocationStatusLine(mode);
  const invariants = relocationInvariants(mode);

  return {
    active,
    mode,
    scope: scopeFromMode(mode),
    label: active ? (label ?? null) : null,
    status,
    disclosure,
    invariants,
    confidence,
    coordinates,
    natalTimezone: natalTimezone ?? null,
    houseSystem: houseSystem ?? null,
    zodiacType: zodiacType ?? null,
    engineVersions,
    provenance: {
      relocation_mode: mode,
      relocation_label: active ? (label ?? null) : null,
      coords: coordinates,
      tz: coordinates?.timezone ?? null,
      natal_tz: natalTimezone ?? null,
      house_system: houseSystem ?? null,
      zodiac_type: zodiacType ?? null,
      engine_versions: engineVersions,
      confidence,
    },
  };
}

function formatHouseContrast(symbol, natalHouse, relocatedHouse) {
  if (natalHouse === relocatedHouse) return `${symbol}: Same arena (House ${natalHouse}) under relocation.`;
  return `${symbol}: Natal House ${natalHouse} → Relocated House ${relocatedHouse} (channel shift)`;
}

function detectRelocation(raw) {
  try { return !!raw?.context?.translocation?.applies; } catch { return false; }
}

function isTimeUnknown(s) {
  if (!s) return true;
  const hasHour = typeof s.hour === 'number' || (typeof s.hour === 'string' && s.hour !== '');
  const hasMinute = typeof s.minute === 'number' || (typeof s.minute === 'string' && s.minute !== '');
  return !(hasHour && hasMinute);
}

function deriveTimePolicy(s, choice) {
  const unknown = isTimeUnknown(s);
  if (!unknown) {
    return { birth_time_known: true, time_precision: 'exact', houses_suppressed: false };
  }
  if (!choice || choice === 'planetary_only') {
    return {
      birth_time_known: false,
      time_precision: 'unknown',
      effective_time_used: undefined,
      houses_suppressed: true,
    };
  }
  if (choice === 'whole_sign') {
    return {
      birth_time_known: false,
      time_precision: 'noon_fallback',
      effective_time_used: '12:00 (local noon fallback)',
      houses_suppressed: false,
    };
  }
  return {
    birth_time_known: false,
    time_precision: 'range_scan',
    effective_time_used: '00:00-23:59 (scan)',
    houses_suppressed: true,
  };
}

if (process.env.NODE_ENV !== 'production') {
  const assertions = [
    [relocationActive('birthplace') === false, 'relocationActive should be false for birthplace'],
    [relocationActive('both_local') === true, 'relocationActive should be true for both_local'],
    [
      (() => {
        const probe = summarizeRelocation({
          type: 'probe',
          natal: { name: 'Test', birth_date: '', birth_time: '', birth_place: '' },
          translocation: {
            applies: true,
            method: 'Both_local',
            current_location: 'Shared City',
            tz: 'UTC',
          },
        });
        return /Shared city/i.test(probe.disclosure);
      })(),
      'both_local disclosure should mention Shared city',
    ],
  ];
  const failed = assertions.filter(([passed]) => !passed);
  if (failed.length > 0) {
  // eslint-disable-next-line no-console
  console.warn(
      '[relocation] self-check failed:',
      failed.map(([, message]) => message).join('; '),
    );
  }
}

module.exports = {
  needsLocation,
  relocationActive,
  relocationDisclosure,
  summarizeRelocation,
  formatHouseContrast,
  detectRelocation,
  isTimeUnknown,
  deriveTimePolicy,
};
