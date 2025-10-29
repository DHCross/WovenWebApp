export const APPROVED = [
  'Diagnostic Surge',
  'Compression Phase',
  'Structural Reset',
  'Expansion Phase',
  'Stabilization Window',
  'Systemic Shutdown',
] as const;

export type Label = (typeof APPROVED)[number];

export function synthesizeLabel(mag: number, bias: number, coh: number): Label {
  if (mag >= 4.5 && bias <= -4.5) return 'Systemic Shutdown';
  if (mag >= 3.5 && bias <= -4.0) return 'Diagnostic Surge';
  if (mag >= 3.0 && bias < -2.5) return 'Compression Phase';
  if (mag <= 1.0 && Math.abs(bias) <= 1.0) return 'Stabilization Window';
  if (mag >= 3.5 && bias >= 2.5) return 'Expansion Phase';
  return 'Structural Reset';
}
