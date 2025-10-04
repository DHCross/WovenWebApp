export type ReportContractType =
  | 'solo_mirror'
  | 'solo_balance_meter'
  | 'relational_mirror'
  | 'relational_balance_meter';

export type ReportMode =
  | 'NATAL_ONLY'
  | 'NATAL_TRANSITS'
  | 'SYNASTRY'
  | 'SYNASTRY_TRANSITS'
  | 'COMPOSITE'
  | 'COMPOSITE_TRANSITS';

export type TranslocationOption =
  | 'NONE'
  | 'A_NATAL'
  | 'A_LOCAL'
  | 'B_NATAL'
  | 'B_LOCAL'
  | 'BOTH_LOCAL'
  | 'MIDPOINT';

export type TimePolicyChoice =
  | 'planetary_only'
  | 'whole_sign'
  | 'sensitivity_scan'
  | 'user_provided';

export type Subject = {
  name: string;
  year: number | string;
  month: number | string;
  day: number | string;
  hour: number | string;
  minute: number | string;
  city: string;
  state: string;
  latitude: number | string;
  longitude: number | string;
  timezone: string;
  zodiac_type: 'Tropic' | 'Sidereal' | string;
};

export interface RelocationStatus {
  effectiveMode: TranslocationOption;
  notice: string | null;
}

export interface RelocationOptionConfig {
  value: TranslocationOption;
  disabled?: boolean;
  title?: string;
}

export interface ModeOption {
  value: ReportMode;
  label: string;
}
