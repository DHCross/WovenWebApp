// TypeScript types for Woven Map JSON Appendix v1.2 (nested channels)
// Schema: https://raven-calder/wm-chart-1.2.schema.json

export type WmSchema = "WM-Chart-1.2";

export interface ChannelV1_0 { magnitude: number; valence: number; version: "v1.0"; }
export interface BalanceV1_1 { magnitude: number; valence: number; version: "v1.1"; }
export interface SfdV1_2 { sfd: number; sPlus: number; sMinus: number; version: "v1.2"; }

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
  balance?: BalanceV1_1;
  sfd?: SfdV1_2;
  meta: AppendixMeta;
}

export type WmJsonAppendix = WmAppendixEntry[];
