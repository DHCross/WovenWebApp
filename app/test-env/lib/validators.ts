export type ValidationStatus = 'valid' | 'warning' | 'invalid';

export const REPORT_ARCHETYPES = [
  'Report I — Observable Pattern',
  'Report II — Subjective Mirror',
  'Report III — Interpersonal Field',
  'Report IV — Integration Loop Bundle',
] as const;

export type ReportArchetype = (typeof REPORT_ARCHETYPES)[number];

export interface ValidationOutcome {
  schemaTitle: string;
  format: string | null;
  detectedReport: string;
  summary: string;
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  requiredCompanions: string[];
  metadata: Record<string, string | number | boolean | null>;
}

export interface AnalyzedPayload {
  outcome: ValidationOutcome;
  payload: Record<string, unknown>;
}

type AnyRecord = Record<string, unknown>;

type MirrorDirectivePayload = {
  _format?: string;
  person_a?: AnyRecord;
  person_b?: AnyRecord | null;
  mirror_contract?: AnyRecord;
  narrative_sections?: AnyRecord;
  symbolic_weather_request?: AnyRecord;
  seismograph_preview?: AnyRecord;
  provenance?: AnyRecord;
};

const REQUIRED_BIRTH_FIELDS = ['date', 'time', 'timezone', 'city', 'country'];

const toBoolean = (value: unknown) => Boolean(value === true);

const isRecord = (value: unknown): value is AnyRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasNonEmptyObject = (value: unknown | null | undefined): boolean =>
  isRecord(value) && Object.keys(value).length > 0;

const ensureSuggestion = (items: string[], message: string) => {
  if (!items.includes(message)) {
    items.push(message);
  }
};

function analyzeMirrorDirective(data: MirrorDirectivePayload): ValidationOutcome {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const requiredCompanions: string[] = [];
  const metadata: Record<string, string | number | boolean | null> = {};

  const format = typeof data._format === 'string' ? data._format : 'mirror_directive_json';

  const personA = isRecord(data.person_a) ? data.person_a : null;
  if (!personA) {
    errors.push('person_a block missing.');
    ensureSuggestion(suggestions, 'Export a fresh Mirror Directive JSON from Math Brain.');
  } else {
    metadata['Person A'] = typeof personA.name === 'string' ? personA.name : null;

    if (!hasNonEmptyObject(personA.chart)) {
      warnings.push('person_a.chart is empty.');
      ensureSuggestion(
        suggestions,
        'Paste Math Brain chart geometry into person_a.chart before uploading to Poetic Brain.',
      );
    }

    if (!Array.isArray(personA.aspects) || personA.aspects.length === 0) {
      warnings.push('person_a.aspects array is empty.');
      ensureSuggestion(
        suggestions,
        'Include the aspects array exported by Math Brain for Person A.',
      );
    }

    const birthData = isRecord(personA.birth_data) ? personA.birth_data : null;
    if (!birthData) {
      warnings.push('person_a.birth_data is missing.');
      ensureSuggestion(
        suggestions,
        'Ensure birth_data contains date, time, timezone, city, and country.',
      );
    } else {
      for (const field of REQUIRED_BIRTH_FIELDS) {
        if (!birthData[field]) {
          warnings.push(`person_a.birth_data.${field} is missing.`);
        }
      }
    }
  }

  const personB = isRecord(data.person_b) ? data.person_b : null;
  const hasPersonB = Boolean(personB);
  if (personB) {
    metadata['Person B'] = typeof personB.name === 'string' ? personB.name : null;

    if (!hasNonEmptyObject(personB.chart)) {
      warnings.push('person_b.chart is empty.');
      ensureSuggestion(
        suggestions,
        'Paste Math Brain chart geometry into person_b.chart for relational reports.',
      );
    }

    if (!Array.isArray(personB.aspects) || personB.aspects.length === 0) {
      warnings.push('person_b.aspects array is empty.');
    }

    const birthDataB = isRecord(personB.birth_data) ? personB.birth_data : null;
    if (!birthDataB) {
      warnings.push('person_b.birth_data is missing.');
    }
  }

  const contract = isRecord(data.mirror_contract) ? data.mirror_contract : {};
  const isRelational = toBoolean(contract.is_relational);
  const isNatalOnly = toBoolean(contract.is_natal_only);
  metadata['Intimacy tier'] = typeof contract.intimacy_tier === 'string' ? contract.intimacy_tier : null;
  metadata['Relationship type'] =
    typeof contract.relationship_type === 'string' ? contract.relationship_type : null;

  if (isRelational && !hasPersonB) {
    errors.push('mirror_contract.is_relational is true, but person_b is missing.');
    ensureSuggestion(
      suggestions,
      'Verify both parties were included before exporting the Mirror Directive.',
    );
  }

  if (!isRelational && hasPersonB) {
    warnings.push('person_b provided but mirror_contract.is_relational is false.');
  }

  const hasWeatherRequest = isRecord(data.symbolic_weather_request);
  const narrativeSections = isRecord(data.narrative_sections) ? data.narrative_sections : null;
  if (!narrativeSections) {
    warnings.push('narrative_sections block missing.');
    ensureSuggestion(
      suggestions,
      'Keep narrative_sections placeholders so Poetic Brain can fill the mirror segments.',
    );
  } else {
    if (!('solo_mirror_a' in narrativeSections)) {
      warnings.push('narrative_sections.solo_mirror_a missing.');
    }
    if (hasPersonB && !('solo_mirror_b' in narrativeSections)) {
      warnings.push('narrative_sections.solo_mirror_b missing for relational payload.');
    }
  }

  const provenance = isRecord(data.provenance) ? data.provenance : null;
  if (!provenance) {
    warnings.push('provenance block missing.');
    ensureSuggestion(
      suggestions,
      'Include provenance data (math_brain_version, house_system, orbs_profile) for falsifiability.',
    );
  }

  let detectedReport: ReportArchetype;
  if (isRelational || hasPersonB) {
    detectedReport = 'Report III — Interpersonal Field';
    if (hasWeatherRequest) {
      requiredCompanions.push('Symbolic Weather JSON (FIELD data for both people).');
    } else {
      warnings.push('No symbolic_weather_request found for relational payload.');
    }
  } else if (hasWeatherRequest || !isNatalOnly) {
    detectedReport = 'Report II — Subjective Mirror';
    requiredCompanions.push('Symbolic Weather JSON (FIELD data).');
  } else {
    detectedReport = 'Report I — Observable Pattern';
  }

  metadata['Derived report'] = detectedReport;

  const summary = `Mirror Directive JSON detected. Derived archetype: ${detectedReport}.`;
  const status: ValidationStatus = errors.length > 0 ? 'invalid' : warnings.length > 0 ? 'warning' : 'valid';

  return {
    schemaTitle: 'Mirror Directive JSON',
    format,
    detectedReport,
    summary,
    status,
    errors,
    warnings,
    suggestions,
    requiredCompanions: Array.from(new Set(requiredCompanions)),
    metadata,
  };
}

function analyzeSymbolicWeather(data: AnyRecord): ValidationOutcome {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const metadata: Record<string, string | number | boolean | null> = {};

  const format = typeof data._format === 'string' ? data._format : 'symbolic_weather_json';

  const personA = isRecord(data.person_a) ? data.person_a : null;
  if (!personA) {
    errors.push('person_a block missing.');
  } else {
    metadata['Person A'] = typeof personA.name === 'string' ? personA.name : null;
    if (!hasNonEmptyObject(personA.chart)) {
      warnings.push('person_a.chart missing or empty.');
    }
  }

  const personB = isRecord(data.person_b) ? data.person_b : null;
  if (personB && !hasNonEmptyObject(personB.chart)) {
    warnings.push('person_b.chart missing or empty.');
  }

  const window = isRecord(data.window) ? data.window : null;
  if (!window) {
    errors.push('window block missing; cannot confirm transit range.');
  } else {
    if (!window.start) warnings.push('window.start missing.');
    if (!window.end) warnings.push('window.end missing.');
    metadata['Window'] = typeof window.start === 'string' && typeof window.end === 'string'
      ? `${window.start} → ${window.end}`
      : null;
  }

  const dailyReadings = Array.isArray(data.daily_readings) ? data.daily_readings : [];
  if (dailyReadings.length === 0) {
    errors.push('daily_readings array is empty.');
    ensureSuggestion(suggestions, 'Export Symbolic Weather after generating transits in Math Brain.');
  } else {
    metadata['Reading count'] = dailyReadings.length;
    dailyReadings.forEach((reading, index) => {
      if (!isRecord(reading)) {
        errors.push(`daily_readings[${index}] is not an object.`);
        return;
      }
      if (reading.magnitude_x10 === undefined && reading.magnitude === undefined) {
        warnings.push(`daily_readings[${index}] missing magnitude value.`);
      }
      if (reading.directional_bias_x10 === undefined && reading.directional_bias === undefined) {
        warnings.push(`daily_readings[${index}] missing directional bias value.`);
      }
      if (!Array.isArray(reading.drivers) || reading.drivers.length === 0) {
        warnings.push(`daily_readings[${index}] drivers array empty.`);
      }
    });
  }

  const summary = 'Symbolic Weather payload detected (FIELD data).';
  const status: ValidationStatus = errors.length > 0 ? 'invalid' : warnings.length > 0 ? 'warning' : 'valid';

  return {
    schemaTitle: 'Symbolic Weather JSON',
    format,
    detectedReport: 'Symbolic Weather (FIELD)',
    summary,
    status,
    errors,
    warnings,
    suggestions,
    requiredCompanions: ['Mirror Directive JSON (Report I/II/III)'],
    metadata,
  };
}

function analyzeFieldMap(data: AnyRecord): ValidationOutcome {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const metadata: Record<string, string | number | boolean | null> = {};

  const meta = isRecord(data._meta) ? data._meta : null;
  if (!meta) {
    errors.push('Field map payload missing _meta descriptor.');
  } else {
    metadata['Schema'] = typeof meta.schema === 'string' ? meta.schema : 'wm-fieldmap-v1';
    metadata['Kind'] = Array.isArray(meta.kind) ? meta.kind.join(', ') : null;
    metadata['Created at'] = typeof meta.created_utc === 'string' ? meta.created_utc : null;
  }

  if (!hasNonEmptyObject(data.map)) {
    warnings.push('map block missing or empty.');
  }
  if (!hasNonEmptyObject(data.field)) {
    warnings.push('field block missing or empty.');
  }

  const summary = 'Woven Map Field/Map payload detected.';
  const status: ValidationStatus = errors.length > 0 ? 'invalid' : warnings.length > 0 ? 'warning' : 'valid';

  return {
    schemaTitle: 'Field Map JSON',
    format: meta && typeof meta.schema === 'string' ? meta.schema : 'wm-fieldmap-v1',
    detectedReport: 'Field Map (wm-fieldmap-v1)',
    summary,
    status,
    errors,
    warnings,
    suggestions,
    requiredCompanions: ['Mirror Directive JSON', 'Symbolic Weather JSON'],
    metadata,
  };
}

function prefixMessages(prefix: string, values: string[]): string[] {
  return values.map((value) => `${prefix}${value}`);
}

function analyzeIntegrationBundle(data: AnyRecord): ValidationOutcome {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const metadata: Record<string, string | number | boolean | null> = {};

  if (data.bundle_kind !== 'integration_loop') {
    errors.push('bundle_kind is not "integration_loop".');
  }

  const mirrorDirective = isRecord(data.mirror_directive) ? data.mirror_directive : null;
  const symbolicWeather = isRecord(data.symbolic_weather) ? data.symbolic_weather : null;

  if (!mirrorDirective) {
    errors.push('integration loop bundle missing mirror_directive payload.');
    ensureSuggestion(
      suggestions,
      'Ensure the bundle contains a full mirror_directive exported from Math Brain.',
    );
  }
  if (!symbolicWeather) {
    errors.push('integration loop bundle missing symbolic_weather payload.');
    ensureSuggestion(
      suggestions,
      'Ensure the bundle contains symbolic weather data for the requested window.',
    );
  }

  if (mirrorDirective) {
    const mdAnalysis = analyzeMirrorDirective(mirrorDirective as MirrorDirectivePayload);
    metadata['Mirror status'] = mdAnalysis.status;
    metadata['Mirror archetype'] = mdAnalysis.detectedReport;
    if (mdAnalysis.errors.length > 0) {
      errors.push(...prefixMessages('Mirror: ', mdAnalysis.errors));
    }
    if (mdAnalysis.warnings.length > 0) {
      warnings.push(...prefixMessages('Mirror: ', mdAnalysis.warnings));
    }
    suggestions.push(...prefixMessages('Mirror: ', mdAnalysis.suggestions));
  }

  if (symbolicWeather) {
    const swAnalysis = analyzeSymbolicWeather(symbolicWeather);
    metadata['Symbolic weather status'] = swAnalysis.status;
    metadata['Symbolic readings'] = swAnalysis.metadata['Reading count'] ?? null;
    if (swAnalysis.errors.length > 0) {
      errors.push(...prefixMessages('Symbolic weather: ', swAnalysis.errors));
    }
    if (swAnalysis.warnings.length > 0) {
      warnings.push(...prefixMessages('Symbolic weather: ', swAnalysis.warnings));
    }
    suggestions.push(...prefixMessages('Symbolic weather: ', swAnalysis.suggestions));
  }

  metadata['Bundle generated'] = typeof data.generated_at === 'string' ? data.generated_at : null;

  const summary = 'Integration Loop bundle detected (Mirror + Symbolic Weather).';
  const status: ValidationStatus = errors.length > 0 ? 'invalid' : warnings.length > 0 ? 'warning' : 'valid';

  return {
    schemaTitle: 'Integration Loop Bundle',
    format: 'integration_loop',
    detectedReport: 'Report IV — Integration Loop Bundle',
    summary,
    status,
    errors,
    warnings,
    suggestions,
    requiredCompanions: [],
    metadata,
  };
}

export function analyzePayload(payload: unknown): ValidationOutcome {
  if (!isRecord(payload)) {
    return {
      schemaTitle: 'Unknown JSON payload',
      format: null,
      detectedReport: 'Unknown',
      summary: 'Payload is not a JSON object.',
      status: 'invalid',
      errors: ['Top-level structure must be a JSON object.'],
      warnings: [],
      suggestions: ['Upload a JSON export directly from Math Brain.'],
      requiredCompanions: [],
      metadata: {},
    };
  }

  const format = typeof payload._format === 'string' ? payload._format : null;

  if (payload.bundle_kind === 'integration_loop') {
    return analyzeIntegrationBundle(payload);
  }

  if (format === 'mirror_directive_json') {
    return analyzeMirrorDirective(payload as MirrorDirectivePayload);
  }

  if (format === 'symbolic_weather_json' || format === 'mirror-symbolic-weather-v1') {
    return analyzeSymbolicWeather(payload);
  }

  if (payload._meta && isRecord(payload._meta) && payload._meta.schema === 'wm-fieldmap-v1') {
    return analyzeFieldMap(payload);
  }

  if (format) {
    return {
      schemaTitle: 'Unrecognized Windsurf payload',
      format,
      detectedReport: 'Unknown',
      summary: `Unknown _format "${format}".`,
      status: 'warning',
      errors: [],
      warnings: [`Format ${format} is not recognized by the validator.`],
      suggestions: ['Double-check that you uploaded the Poetic Brain payload exports.'],
      requiredCompanions: [],
      metadata: {},
    };
  }

  return {
    schemaTitle: 'Unknown JSON payload',
    format: null,
    detectedReport: 'Unknown',
    summary: 'Could not identify payload format.',
    status: 'warning',
    errors: [],
    warnings: ['_format field missing; validator cannot determine schema.'],
    suggestions: ['Upload one of the Poetic Brain-compatible JSON exports.'],
    requiredCompanions: [],
    metadata: {},
  };
}
