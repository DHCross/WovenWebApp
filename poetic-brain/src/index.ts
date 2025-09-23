// Main entry for Poetic Brain module
// Exports generateSection(sectionType, inputPayload)

export type SectionType = 'MirrorVoice' | 'PolarityCardVoice' | string;

// Minimal, geometry-first payload shape expected from upstream validator
// Keep permissive but documented; do not infer hidden data
export interface MetricObject { value: number; confidence?: number }
export type Metric = number | MetricObject;

export interface HookObject {
  label: string;
  angle?: number; // degrees
  orb?: number; // degrees
  retrograde_involved?: boolean;
  exact?: boolean;
}

export interface InputPayload {
  climateLine?: string;
  constitutionalClimate?: string;
  hooks?: Array<string | HookObject>;
  seismograph?: {
    magnitude?: Metric;
    valence_bounded?: Metric;
    valence?: Metric; // expected roughly on a signed scale (negative=restrictive, positive=supportive)
    volatility?: Metric; // 0..1 preferred, but treated generically
    scaling_strategy?: string;
    valence_label?: string;
  };
  angles?: any[];
  transits?: any[];
  focusTheme?: string;
  // passthrough allowed
  [key: string]: any;
}

function num(m?: Metric): number | undefined {
  if (m === undefined || m === null) return undefined;
  if (typeof m === 'number') return Number.isFinite(m) ? m : undefined;
  if (typeof m === 'object' && m && typeof (m as any).value === 'number') {
    return Number.isFinite((m as any).value) ? (m as any).value : undefined;
  }
  return undefined;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function classifyValenceTone(v?: number): { tone: 'supportive' | 'restrictive' | 'mixed'; descriptor: string } {
  if (v === undefined) return { tone: 'mixed', descriptor: 'mixed tilt' };
  // thresholds are conservative to avoid over-claiming
  if (v > 0.25) return { tone: 'supportive', descriptor: 'supportive tilt' };
  if (v < -0.25) return { tone: 'restrictive', descriptor: 'restrictive tilt' };
  return { tone: 'mixed', descriptor: 'mixed tilt' };
}

function classifyVolatility(vol?: number): { label: string } {
  if (vol === undefined) return { label: 'variable distribution' };
  if (vol >= 0.66) return { label: 'high volatility (scattered strikes)' };
  if (vol <= 0.33) return { label: 'low volatility (focused pull)' };
  return { label: 'moderate volatility' };
}

function magnitudeBand(mag?: number): { band: 0 | 1 | 2 | 3 | 4 | 5; label: string } {
  if (mag === undefined || mag < 0.5) return { band: 0, label: 'Dormant / Baseline' };
  if (mag < 1.5) return { band: 1, label: 'Murmur / Whisper' };
  if (mag < 2.5) return { band: 2, label: 'Pulse / Stirring' };
  if (mag < 3.5) return { band: 3, label: 'Surge / Activation' };
  if (mag < 4.5) return { band: 4, label: 'Convergence / Compression' };
  return { band: 5, label: 'Maximum Threshold / Structural Overload' };
}

function normalizeHooks(hooks?: Array<string | HookObject>): HookObject[] {
  if (!hooks || !Array.isArray(hooks)) return [];
  const out: HookObject[] = [];
  for (const h of hooks) {
    if (!h) continue;
    if (typeof h === 'string') {
      out.push({ label: h });
    } else if (typeof h === 'object' && typeof (h as any).label === 'string') {
      out.push(h as HookObject);
    }
  }
  // Basic prioritization: exact first, then smallest orb
  return out
    .sort((a, b) => {
      const ax = a.exact ? 1 : 0;
      const bx = b.exact ? 1 : 0;
      if (ax !== bx) return bx - ax; // true first
      const ao = a.orb ?? Number.POSITIVE_INFINITY;
      const bo = b.orb ?? Number.POSITIVE_INFINITY;
      return ao - bo;
    })
    .slice(0, 3);
}

function seismographSummary(payload: InputPayload): { headline: string; details: string } {
  const mag = num(payload.seismograph?.magnitude);
  const val = num(payload.seismograph?.valence_bounded ?? payload.seismograph?.valence);
  const vol = num(payload.seismograph?.volatility);
  const { band, label } = magnitudeBand(mag);
  const vt = classifyValenceTone(val);
  const vv = classifyVolatility(vol);
  const parts: string[] = [];
  parts.push(`Magnitude ${mag !== undefined ? mag.toFixed(2) : '—'} (⚡ ${label} at ${band})`);
  const valLabel = payload.seismograph?.valence_label || vt.descriptor;
  parts.push(`Valence ${val !== undefined ? val.toFixed(2) : '—'} (${valLabel})`);
  parts.push(`Volatility ${vol !== undefined ? vol.toFixed(2) : '—'} (${vv.label})`);
  return {
    headline: `${label} with ${valLabel}`,
    details: parts.join(' · '),
  };
}

function formatHooksLine(hooks: HookObject[]): string {
  if (!hooks.length) return 'No high-charge hooks supplied.';
  const items = hooks.map(h => {
    const tags: string[] = [];
    if (h.exact) tags.push('exact');
    if (typeof h.orb === 'number') tags.push(`${h.orb.toFixed(1)}° orb`);
    if (h.retrograde_involved) tags.push('retrograde signature');
    return tags.length ? `${h.label} (${tags.join(', ')})` : h.label;
  });
  return items.join(' | ');
}

function hasActivationData(payload: InputPayload): boolean {
  const hasTransits = Array.isArray(payload.transits) && payload.transits.length > 0;
  const seismo = payload.seismograph;
  const hasSeismograph = !!(
    seismo &&
    (num(seismo.magnitude) !== undefined ||
      num(seismo.valence_bounded) !== undefined ||
      num(seismo.valence) !== undefined ||
      num(seismo.volatility) !== undefined ||
      typeof seismo.valence_label === 'string')
  );
  return hasTransits || hasSeismograph;
}

function buildMirrorVoice(payload: InputPayload): string {
  const hooks = normalizeHooks(payload.hooks);
  const baseline = payload.constitutionalClimate?.trim();
  const blueprintLine = baseline
    ? `Blueprint — ${baseline}`
    : 'Blueprint — Baseline reflection unavailable; rely on lived experience.';

  if (!hasActivationData(payload)) {
    const lines: string[] = [
      blueprintLine,
      'Current Mode — No activation data supplied; holding to the natal baseline.',
      `Baseline Hooks — ${formatHooksLine(hooks)}`,
      'Reflection — Map, not mandate: integrate what resonates and release the rest.',
    ];
    return lines.join('\n');
  }

  const s = seismographSummary(payload);
  const weatherDescriptor =
    payload.climateLine && payload.climateLine.trim().length > 0
      ? payload.climateLine.trim()
      : `Current atmosphere leans ${s.headline}.`;
  const hookSummary = formatHooksLine(hooks);
  const tensionParts: string[] = [`Seismograph — ${s.details}.`, `Hooks — ${hookSummary}`];

  const lines: string[] = [
    blueprintLine,
    `Weather — ${weatherDescriptor}`,
    `Tensions — ${tensionParts.join(' · ')}`,
    'Reflection — Map, not mandate: treat this as symbolic weather. If it lands, log it; if not, discard and proceed.',
  ];
  return lines.join('\n');
}

function buildPolarityCard(payload: InputPayload): string {
  const mag = num(payload.seismograph?.magnitude);
  const val = num(payload.seismograph?.valence_bounded ?? payload.seismograph?.valence);
  const vol = num(payload.seismograph?.volatility);
  const { band, label } = magnitudeBand(mag);
  const vt = classifyValenceTone(val);
  const vv = classifyVolatility(vol);
  const hooks = normalizeHooks(payload.hooks);

  // Title pieces
  const toneTitle = vt.tone === 'supportive' ? 'Supportive' : vt.tone === 'restrictive' ? 'Restrictive' : 'Mixed';
  const volTitle = vv.label.includes('high') ? 'Scattered' : vv.label.includes('low') ? 'Focused' : 'Variable';
  const title = `${toneTitle} · ${volTitle}`;

  const captionParts: string[] = [];
  captionParts.push(`⚡ ${label} (${band})`);
  if (val !== undefined) captionParts.push(`Valence ${val.toFixed(2)} (${vt.descriptor})`);
  if (vol !== undefined) captionParts.push(`Volatility ${vol.toFixed(2)}`);
  const topHook = hooks[0]?.label ? ` · Anchor: ${hooks[0].label}` : '';

  return `${title}\n${captionParts.join(' · ')}${topHook}`;
}

export function generateSection(sectionType: SectionType, inputPayload: InputPayload): string {
  // Use only provided data, no global state, no hidden astrology math
  switch (sectionType) {
    case 'MirrorVoice':
      return buildMirrorVoice(inputPayload);
    case 'PolarityCardVoice':
      return buildPolarityCard(inputPayload);
    default:
      // Fallback: name the section and provide minimal seismograph summary
      const s = seismographSummary(inputPayload);
      return `${sectionType}\n${s.details}`;
  }
}
