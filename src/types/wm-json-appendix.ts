// TypeScript types for Woven Map JSON Appendix v1.0
// Schema: https://wovenmap.dev/schemas/wm_json_appendix-1.0.json

export type WmSchema = "WM-Chart-1.0";

export interface WmJsonAppendix {
  meta: {
    wm_schema: WmSchema;
    math_brain_version: string;
    generated_utc: string; // ISO 8601 date-time
    timezone: string;
    context?: "NATAL" | "NATAL_TRANSITS" | "SYNASTRY" | "COMPOSITE" | "SKY_TRANSITS";
    ephemeris: { source: string; hash: string };
    provenance?: {
      node_preference?: "True" | "Mean";
      orb_caps?: { 
        luminaries_deg?: number; 
        planets_deg?: number; 
        points_deg?: number; 
      };
      deterministic_seed?: string;
      max_ephemeris_delta_deg?: number;
    };
    run_stats: { 
      api_calls: number; 
      calc_ms: number; 
      hooks_accepted: number; 
      hooks_rejected: number; 
    };
  };
  subject: {
    name: string;
    dob: string; // YYYY-MM-DD
    tob: string; // HH:MM
    loc: string;
    coords?: { lat: number; lon: number };
  };
  seismograph: Array<{
    date: string; // YYYY-MM-DD
    mag: number;
    val: number;
    vol: number;
    top_hooks?: Array<{ 
      a: string; 
      asp: string; 
      b: string; 
      orb: number; 
      phase?: "applying" | "separating" 
    }>;
    retrograde_count?: number;
    osr_flags?: string[];
  }>;
  health_link?: {
    present: boolean;
    metrics?: string[];
    corr?: Record<string, number>;
    fidelity_index?: number;
  };
}

export interface ExecSummaryOptions {
  includeHealthLine?: boolean;
  includeProvenance?: boolean;
  width?: number; // wrap hint
}

export interface ReportOptions {
  includeExecutiveSummary?: boolean;
  includeJsonAppendix?: boolean;
  includeProvenance?: boolean;
}

// Helper function signatures
export declare function generateExecutiveSummary(
  data: WmJsonAppendix,
  opts?: ExecSummaryOptions
): string;

export declare function generateJsonAppendix(
  reportData: any,
  context: string,
  runStats: any
): WmJsonAppendix;

export declare function validateAppendix(
  payload: unknown
): { ok: true } | { ok: false; errors: string[] };
