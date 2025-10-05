export interface Axes {
  magnitude: number;
  bias: number;
  coherence: number;
  sfd: number | null;
}

type Label = { title: string; subtitle: string };

const magBand = (m: number) =>
  m >= 4.5 ? 'Peak' :
  m >= 3.5 ? 'Strong' :
  m >= 2.0 ? 'Noticeable' :
  m >= 1.0 ? 'Low' :
  'Quiet';

const biasBand = (b: number) =>
  b <= -4.0 ? 'Maximum inward' :
  b <= -2.5 ? 'Inward' :
  b < -0.5 ? 'Slight inward' :
  b <= 0.5 ? 'Neutral' :
  b <= 2.5 ? 'Slight outward' :
  b <= 4.0 ? 'Outward' :
  'Maximum outward';

const cohBand = (c: number) =>
  c >= 4.0 ? 'Chaotic' :
  c >= 3.0 ? 'Splintered' :
  c >= 2.0 ? 'Mixed' :
  c >= 1.0 ? 'Mostly coherent' :
  'Single-thread';

const sfdBand = (s: number | null) =>
  s === null ? 'n/a' :
  s <= -0.50 ? 'Frictional' :
  s < -0.10 ? 'Mild friction' :
  s <= 0.10 ? 'Balanced' :
  s <= 0.50 ? 'Mild supportive' :
  'Supportive';

export function buildPeriodLabel(a: Axes): Label {
  const title = `${magBand(a.magnitude)} field · ${biasBand(a.bias)} tilt`;
  const subtitle = `${cohBand(a.coherence)} storyline · Forces ${sfdBand(a.sfd)}`;
  return { title, subtitle };
}
