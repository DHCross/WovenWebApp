import type { ClampInfo } from './balance/scale';

export type RawSeismograph = {
  magnitude?: number;
  valence?: number;
  valence_bounded?: number;
  bias_signed?: number;
  volatility?: number;
  sfd?: number;
  raw_magnitude?: number;
  raw_bias_signed?: number;
  raw_volatility?: number;
};

export type AxisDisplay = {
  normalized: number;
  raw: number;
  value: number;
  flags: ClampInfo;
  source?: 'primary' | 'raw_fallback' | 'div_50' | 'div_100' | 'zero_default';
};

export type SfdDisplay = {
  normalized: number | null;
  raw: number | null;
  value: number | null;
  display: string;
  flags: ClampInfo;
};

export type TransformedWeatherData = {
  axes: {
    magnitude: AxisDisplay;
    directional_bias: AxisDisplay;
    coherence: AxisDisplay;
    sfd: SfdDisplay;
  };
  labels: {
    magnitude: string;
    directional_bias: string;
    coherence: string;
    sfd: string;
  };
  scaling: {
    mode: 'absolute';
    factor: 5;
    pipeline: 'normalize→scale→clamp→round';
    coherence_inversion: true;
  };
  _raw: RawSeismograph;
};

const runtime = require('./weatherDataTransforms.js') as {
  transformWeatherData(raw: RawSeismograph): TransformedWeatherData;
  transformDailyWeather(dayData: any): TransformedWeatherData;
  transformTransitsByDate(transitsByDate: Record<string, any>): Record<string, TransformedWeatherData>;
};

export const transformWeatherData: (raw: RawSeismograph) => TransformedWeatherData =
  runtime.transformWeatherData;

export const transformDailyWeather: (dayData: any) => TransformedWeatherData =
  runtime.transformDailyWeather;

export const transformTransitsByDate: (
  transitsByDate: Record<string, any>
) => Record<string, TransformedWeatherData> = runtime.transformTransitsByDate;
