import { vi } from 'vitest';

export const callPerplexity = vi.fn(async (prompt: string, context?: any) => {
  if (prompt.includes('narrateSymbolicWeather')) {
    return '3-day window of symbolic weather';
  }
  if (prompt.includes('generateBlueprintMetaphor')) {
    return 'A sturdy lighthouse on a rocky coast.';
  }
  if (prompt.includes('narrateBlueprintClimate')) {
    return 'The climate is one of resilience and watchfulness.';
  }
  if (prompt.includes('narrateStitchedReflection')) {
    return 'The lighthouse stands alone, a beacon in the weather.';
  }
  return 'Default mock response';
});
