// TypeScript types for Woven Map JSON Appendix v1.2 (nested channels) + v2.0 Balance Meter
// Schema: https://raven-calder/wm-chart-1.2.schema.json

export type WmSchema = "WM-Chart-1.2" | "WM-Chart-2.0";

// Legacy v1.x interfaces (maintained for backward compatibility)
export interface ChannelV1_0 { magnitude: number; valence: number; version: "v1.0"; }
export interface BalanceV1_1 { magnitude: number; valence: number; version: "v1.1"; }
export interface SfdV1_2 { sfd: number; sPlus: number; sMinus: number; version: "v1.2"; }

// v2.0 Balance Meter: Neutral terminology replacing moral language
export interface BalanceMeterV2_0 {
  numinosity: number; // 1-5 ⚡ (archetypal charge, replaces magnitude)
  directionalBias: 'inward' | 'neutral' | 'outward'; // Energy lean (replaces valence)
  narrativeCoherence: 'fragmented' | 'mixed' | 'unified'; // Story stability (replaces volatility)
  integrationBias: number; // Forces cooperation assessment (enhanced SFD)
  version: "v2.0";
}

// Hybrid interface supporting both legacy and v2 formats
export interface BalanceMeterHybrid {
  // Legacy fields (deprecated but maintained for compatibility)
  magnitude?: number;
  valence?: number | string;
  volatility?: number | string;
  sfd?: number;
  
  // v2 fields (preferred)
  numinosity?: number;
  directionalBias?: string;
  narrativeCoherence?: string;
  integrationBias?: number;
  
  version: "v1.1" | "v1.2" | "v2.0";
}

export interface AppendixMeta {
  calibration_boundary: string; // YYYY-MM-DD
  engine_versions: { seismograph: "v1.0"; balance: "v1.1"; sfd: "v1.2" };
  reconstructed: boolean;
  notes?: string;
}

export interface WmAppendixEntry {
  schema: WmSchema;
  date: string; // YYYY-MM-DD
  seismograph: ChannelV1_0;
  balance?: BalanceV1_1 | BalanceMeterV2_0 | BalanceMeterHybrid; // v2 compatibility
  sfd?: SfdV1_2;
  meta: AppendixMeta;
}

export type WmJsonAppendix = WmAppendixEntry[];
