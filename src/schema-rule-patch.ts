/* Schema Rule-Patch: Natal-Only vs. Balance */

import { z } from 'zod';

// Mode and frontstage policy definitions
export const ReportModeEnum = z.enum(['natal-only', 'balance', 'relational-balance', 'relational-mirror']);

export const FrontstagePolicySchema = z.object({
  autogenerate: z.boolean().default(true),
  allow_symbolic_weather: z.boolean().default(true)
});

export const FrontStageDirectiveSchema = z.object({
  status: z.enum(['generate', 'skip']).default('generate'),
  voice: z.string().default('FIELD→MAP→VOICE'),
  include: z.array(z.enum(['blueprint', 'symbolic_weather', 'stitched_reflection'])).default(['blueprint', 'symbolic_weather', 'stitched_reflection'])
});

export const FrontStageMirrorSchema = z.object({
  blueprint: z.string().nullable().default(null),
  symbolic_weather: z.string().nullable().default(null),
  stitched_reflection: z.string().nullable().default(null)
});

// Optional preface section to guide conversational entry in reports
export const FrontStagePrefaceSchema = z.object({
  persona_intro: z.string().nullable().default(null),
  resonance_profile: z.array(z.string()).nullable().default(null),
  paradoxes: z.array(z.string()).nullable().default(null),
  relational_focus: z.string().nullable().default(null)
});

export const FrontStageSchema = z.object({
  directive: FrontStageDirectiveSchema,
  mirror: FrontStageMirrorSchema,
  preface: FrontStagePrefaceSchema.optional()
});

export const BackstageSchema = z.object({
  natal_mode: z.boolean().optional(),
  stripped_balance_payload: z.boolean().optional(),
  warnings: z.array(z.string()).optional()
});

// Enhanced contract schema
export const ContractSchema = z.object({
  contract: z.string().default('clear-mirror/1.3'),
  mode: ReportModeEnum,
  frontstage_policy: FrontstagePolicySchema,
  frontstage: FrontStageSchema.optional(),
  backstage: BackstageSchema.optional()
});

// Balance fields that should be stripped in natal-only mode
const BALANCE_FIELDS = [
  'indices',
  'days',
  'uncanny',
  'transitsByDate',
  'filtered_aspects',
  'seismograph',
  'balance_meter',
  'time_series',
  'integration_factors',
  'vector_integrity'
];

// Validation functions
export function validateContract(payload: any): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!payload.mode) {
    errors.push('Missing required mode field');
    return { valid: false, errors, warnings };
  }

  const mode = payload.mode as string;

  // Natal-only validation
  if (mode === 'natal-only') {
    // Check for balance field presence
    const balanceFieldsPresent = BALANCE_FIELDS.filter(field =>
      payload[field] !== undefined && payload[field] !== null
    );

    if (balanceFieldsPresent.length > 0) {
      warnings.push(`Natal-only mode contains balance fields: ${balanceFieldsPresent.join(', ')} - will be stripped`);
    }

    // Force frontstage policy settings
    if (!payload.frontstage_policy) {
      payload.frontstage_policy = {};
    }
    payload.frontstage_policy.allow_symbolic_weather = false;
    payload.frontstage_policy.autogenerate = true;
  }

  // Balance mode validation
  if (['balance', 'relational-balance'].includes(mode)) {
    if (!payload.window && !payload.indices?.window) {
      errors.push('Balance mode requires a valid date window');
    }

    if (!payload.location && !payload.context?.person_a?.coordinates) {
      errors.push('Balance mode requires location (timezone & coordinates)');
    }

    if (!payload.indices?.days || !Array.isArray(payload.indices.days) || payload.indices.days.length === 0) {
      warnings.push('Balance mode missing daily indices - symbolic weather will be suppressed');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function stripBalancePayload(payload: any): { stripped: boolean; fields_removed: string[] } {
  const fieldsRemoved: string[] = [];
  let stripped = false;

  for (const field of BALANCE_FIELDS) {
    if (payload[field] !== undefined && payload[field] !== null) {
      delete payload[field];
      fieldsRemoved.push(field);
      stripped = true;
    }
  }

  if (stripped) {
    if (!payload.backstage) payload.backstage = {};
    payload.backstage.natal_mode = true;
    payload.backstage.stripped_balance_payload = true;

    console.log(`Reason: user selected natal-only; daily math suppressed by contract. Removed: ${fieldsRemoved.join(', ')}`);
  }

  return { stripped, fields_removed: fieldsRemoved };
}

export function enforceNatalOnlyMode(payload: any): any {
  const validation = validateContract(payload);

  if (payload.mode === 'natal-only') {
    const stripResult = stripBalancePayload(payload);

    // Set mandatory frontstage policy
    payload.frontstage_policy = {
      autogenerate: true,
      allow_symbolic_weather: false
    };

    // Add warnings to backstage
    if (validation.warnings.length > 0 || stripResult.stripped) {
      if (!payload.backstage) payload.backstage = {};
      payload.backstage.warnings = [
        ...validation.warnings,
        ...(stripResult.stripped ? [`Stripped balance payload: ${stripResult.fields_removed.join(', ')}`] : [])
      ];
    }
  }

  return payload;
}

export function hasValidIndices(payload: any): boolean {
  return !!(
    payload.indices?.days &&
    Array.isArray(payload.indices.days) &&
    payload.indices.days.length > 0 &&
    payload.indices.days.some((day: any) =>
      day.magnitude !== undefined || day.volatility !== undefined || day.sf_diff !== undefined
    )
  );
}

export function shouldGenerateSymbolicWeather(payload: any): boolean {
  if (payload.mode === 'natal-only') return false;
  if (!payload.frontstage_policy?.allow_symbolic_weather) return false;
  return hasValidIndices(payload);
}

// Type definitions
export type ReportMode = z.infer<typeof ReportModeEnum>;
export type FrontstagePolicy = z.infer<typeof FrontstagePolicySchema>;
export type FrontStageDirective = z.infer<typeof FrontStageDirectiveSchema>;
export type FrontStage = z.infer<typeof FrontStageSchema>;
export type Contract = z.infer<typeof ContractSchema>;
