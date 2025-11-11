/*
 * Windsurf AI internal testing payload builders.
 * These helpers generate Poetic Brain-compatible fixtures for the
 * Four Reports framework. They intentionally keep chart geometry
 * and aspects optional so that developers can paste in real Math Brain
 * data before uploading to Poetic Brain.
 */

export type BirthData = {
  date: string;
  time: string;
  timezone: string;
  city: string;
  state?: string;
  country: string;
  lat: number;
  lon: number;
};

export type PersonInput = {
  name?: string;
  birthData?: Partial<BirthData>;
  chart?: Record<string, unknown> | null;
  aspects?: unknown[];
};

export type WeatherWindow = {
  startDate?: string;
  endDate?: string;
  stepDays?: number;
};

export type BuildOptions = {
  personA?: PersonInput;
  personB?: PersonInput;
  intimacyTier?: string;
  relationshipType?: string | null;
  weather?: WeatherWindow;
};

export interface MirrorDirectivePayload {
  _format: 'mirror_directive_json';
  _version: string;
  _poetic_brain_compatible: boolean;
  generated_at: string;
  person_a: PersonSummary;
  person_b: PersonSummary | null;
  mirror_contract: MirrorContract;
  provenance: Provenance;
  narrative_sections: Record<string, string>;
  symbolic_weather_request?: SymbolicWeatherRequest;
  seismograph_preview?: SeismographPreview;
}

export interface IntegrationLoopBundle {
  bundle_kind: 'integration_loop';
  generated_at: string;
  mirror_directive: MirrorDirectivePayload;
  symbolic_weather: SymbolicWeatherPayload;
  notes: string[];
}

type MirrorContract = {
  report_kind: 'mirror';
  intimacy_tier: string | null;
  relationship_type: string | null;
  is_relational: boolean;
  is_natal_only: boolean;
};

type Provenance = {
  generated_at: string;
  math_brain_version: string;
  house_system: string;
  orbs_profile: string;
  ephemeris_source: string;
  relocation_mode: string;
  timezone_db_version: string;
};

type PersonSummary = {
  name: string;
  birth_data: BirthData;
  chart: Record<string, unknown> | null;
  aspects: unknown[];
};

type SymbolicWeatherRequest = {
  schema: string;
  window: {
    start: string;
    end: string;
    step_days: number;
  };
  relocation_mode: 'none' | 'A_local' | 'B_local' | 'both_local';
  include_balance_meter: boolean;
};

type SeismographPreview = {
  status: 'pending' | 'ready';
  notes: string[];
};

type SymbolicWeatherPayload = {
  _format: 'symbolic_weather_json';
  _version: string;
  _poetic_brain_compatible: boolean;
  generated_at: string;
  person_a: SymbolicPerson;
  person_b: SymbolicPerson | null;
  window: {
    start: string;
    end: string;
    step_days: number;
  };
  balance_meter_frontstage: {
    summary: Array<{
      span: string;
      magnitude_x10: number;
      directional_bias_x10: number;
      notes: string;
    }>;
  };
  daily_readings: Array<{
    date: string;
    magnitude_x10: number;
    directional_bias_x10: number;
    coherence_x10: number;
    drivers: Array<{
      transit_signature: string;
      orb_deg: number;
      description: string;
    }>;
    status: {
      pending: boolean;
      notes: string[];
    };
  }>;
  provenance: Provenance & {
    dataset_ref: string;
  };
};

type SymbolicPerson = {
  name: string;
  birth_data: BirthData;
  chart: Record<string, unknown> | null;
  aspects: unknown[];
};

const DEFAULT_BIRTH: BirthData = {
  date: '1990-01-01',
  time: '12:00',
  timezone: 'America/Chicago',
  city: 'Unknown',
  country: 'US',
  lat: 30.0,
  lon: -90.0,
};

const ISO_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: 'UTC',
  hour12: false,
};

const formatter = new Intl.DateTimeFormat('en-GB', {
  ...ISO_OPTIONS,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeBirth(person?: PersonInput, fallbackName = 'Person A'): { summary: PersonSummary; birth: BirthData } {
  const name = (person?.name || fallbackName).trim() || fallbackName;
  const birth: BirthData = {
    ...DEFAULT_BIRTH,
    ...(person?.birthData || {}),
  };
  return {
    summary: {
      name,
      birth_data: birth,
      chart: person?.chart ?? null,
      aspects: person?.aspects ?? [],
    },
    birth,
  };
}

function buildProvenance(overrides?: Partial<Provenance>): Provenance {
  return {
    generated_at: nowIso(),
    math_brain_version: 'mb-2025.11.03',
    house_system: 'Placidus',
    orbs_profile: 'wm-spec-2025-09',
    ephemeris_source: 'internal-ephemeris',
    relocation_mode: 'none',
    timezone_db_version: 'IANA-2025a',
    ...overrides,
  };
}

function defaultWeatherWindow(window?: WeatherWindow): { start: string; end: string; step_days: number } {
  const today = new Date();
  const start = window?.startDate ? new Date(window.startDate) : today;
  const end = window?.endDate ? new Date(window.endDate) : new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000);
  const step = window?.stepDays ?? 1;
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    step_days: step,
  };
}

function sampleDrivers(nameA: string, nameB?: string): SymbolicWeatherPayload['daily_readings'][number]['drivers'] {
  const other = nameB ? `${nameB}'s` : 'their';
  return [
    {
      transit_signature: 'Mars square Sun',
      orb_deg: 1.2,
      description: `A surge of symbolic weather pressure inviting ${nameA} to pace their reactions while honoring ${other} current bandwidth.`,
    },
    {
      transit_signature: 'Venus trine Moon',
      orb_deg: -0.8,
      description: `An easeful atmosphere encouraging restorative rituals and attentive listening.`,
    },
  ];
}

function createDailyReadings(nameA: string, nameB?: string, window?: WeatherWindow): SymbolicWeatherPayload['daily_readings'] {
  const { start, step_days } = defaultWeatherWindow(window);
  const startDate = new Date(start);
  const days = Math.max(1, Math.min(5, step_days ? Math.ceil(step_days) : 3));
  return Array.from({ length: days }, (_, idx) => {
    const date = new Date(startDate.getTime() + idx * 24 * 60 * 60 * 1000);
    return {
      date: date.toISOString().slice(0, 10),
      magnitude_x10: 24 + idx * 3,
      directional_bias_x10: idx % 2 === 0 ? -15 + idx * 2 : 10 - idx * 2,
      coherence_x10: 32,
      drivers: sampleDrivers(nameA, nameB),
      status: {
        pending: false,
        notes: [],
      },
    };
  });
}

export function buildObservablePatternPayload(options?: BuildOptions): MirrorDirectivePayload {
  const { summary: personA } = normalizeBirth(options?.personA, 'Person A');

  return {
    _format: 'mirror_directive_json',
    _version: '1.0',
    _poetic_brain_compatible: true,
    generated_at: nowIso(),
    person_a: personA,
    person_b: null,
    mirror_contract: {
      report_kind: 'mirror',
      intimacy_tier: options?.intimacyTier || 'P1',
      relationship_type: options?.relationshipType ?? null,
      is_relational: false,
      is_natal_only: true,
    },
    provenance: buildProvenance({ relocation_mode: 'A_local' }),
    narrative_sections: {
      solo_mirror_a: '',
    },
  };
}

export function buildSubjectiveMirrorPayload(options?: BuildOptions): MirrorDirectivePayload {
  const base = buildObservablePatternPayload(options);
  const window = defaultWeatherWindow(options?.weather);

  return {
    ...base,
    mirror_contract: {
      ...base.mirror_contract,
      is_natal_only: false,
    },
    symbolic_weather_request: {
      schema: 'symbolic_weather_request_v1',
      window,
      relocation_mode: 'A_local',
      include_balance_meter: true,
    },
    seismograph_preview: {
      status: 'pending',
      notes: ['Symbolic weather request staged. Populate with Math Brain data before upload.'],
    },
  };
}

export function buildInterpersonalFieldPayload(options?: BuildOptions): MirrorDirectivePayload {
  const { summary: personA } = normalizeBirth(options?.personA, 'Person A');
  const { summary: personB } = normalizeBirth(options?.personB, 'Person B');

  return {
    _format: 'mirror_directive_json',
    _version: '1.0',
    _poetic_brain_compatible: true,
    generated_at: nowIso(),
    person_a: personA,
    person_b: personB,
    mirror_contract: {
      report_kind: 'mirror',
      intimacy_tier: options?.intimacyTier || 'P3',
      relationship_type: options?.relationshipType ?? 'romantic',
      is_relational: true,
      is_natal_only: false,
    },
    provenance: buildProvenance({ relocation_mode: 'both_local' }),
    narrative_sections: {
      solo_mirror_a: '',
      solo_mirror_b: '',
      relational_engine: '',
    },
    symbolic_weather_request: options?.weather
      ? {
          schema: 'symbolic_weather_request_v1',
          window: defaultWeatherWindow(options.weather),
          relocation_mode: 'both_local',
          include_balance_meter: true,
        }
      : undefined,
    seismograph_preview: options?.weather
      ? {
          status: 'pending',
          notes: ['Symbolic weather overlay requested for the relational field.'],
        }
      : undefined,
  };
}

export function buildSymbolicWeatherPayload(options?: BuildOptions): SymbolicWeatherPayload {
  const { summary: personA } = normalizeBirth(options?.personA, 'Person A');
  const personBSummary = options?.personB ? normalizeBirth(options.personB, 'Person B').summary : null;
  const window = defaultWeatherWindow(options?.weather);

  return {
    _format: 'symbolic_weather_json',
    _version: '1.0',
    _poetic_brain_compatible: true,
    generated_at: nowIso(),
    person_a: personA,
    person_b: personBSummary,
    window,
    balance_meter_frontstage: {
      summary: [
        {
          span: `${window.start} → ${window.end}`,
          magnitude_x10: 28,
          directional_bias_x10: -12,
          notes: 'Symbolic weather trending inward; prioritize recovery protocols before output.',
        },
      ],
    },
    daily_readings: createDailyReadings(personA.name, personBSummary?.name, options?.weather),
    provenance: {
      ...buildProvenance({
        relocation_mode: options?.personB ? 'both_local' : 'A_local',
      }),
      dataset_ref: 'windsurf-fixture',
    },
  };
}

export function buildIntegrationLoopBundle(options?: BuildOptions): IntegrationLoopBundle {
  const relationalPayload = buildInterpersonalFieldPayload({
    ...options,
    weather: options?.weather ?? {
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 10),
      stepDays: 1,
    },
  });

  const symbolicWeather = buildSymbolicWeatherPayload(options);

  return {
    bundle_kind: 'integration_loop',
    generated_at: nowIso(),
    mirror_directive: relationalPayload,
    symbolic_weather: symbolicWeather,
    notes: [
      'Bundle contains both MAP (mirror) and FIELD (symbolic weather) prototypes.',
      'Replace chart/aspect placeholders with Math Brain output prior to Poetic Brain upload.',
    ],
  };
}

export function formatPayload(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}
