// Main entry for Poetic Brain module
// Exports generateSection(sectionType, inputPayload)
// Phase 1, Task 1.2: Integrated with narrative-builder for solo mirror generation

import { buildMandatesForChart, buildSynastryMandates } from '../../lib/poetics/mandate';
import { enhancePromptWithMandates } from '../../lib/poetics/prompt-builder';
import { generateSoloMirrorNarrative } from '../../lib/poetics/narrative-builder';
import type { MandateAspect } from '../../lib/poetics/types';

export type SectionType = 'MirrorVoice' | 'PolarityCardVoice' | string;

// Minimal, geometry-first payload shape expected from upstream validator
// Keep permissive but documented; do not infer hidden data
export interface MetricObject { value: number; confidence?: number }
export type Metric = number | MetricObject;

export interface HookObject {
  label: string;
  angle?: number;
  orb?: number;
  retrograde_involved?: boolean;
  exact?: boolean;
  resonanceState?: 'WB' | 'ABE' | 'OSR';
  shadowMode?: 'translatable' | 'inverted' | 'integrated' | 'unknown';
  // SRP enrichment (namespaced)
  srp?: {
    blendId?: number;
    hingePhrase?: string;
    elementWeave?: string;
    shadowId?: string;
    restorationCue?: string;
    collapseMode?: string;
  };
}

export interface ShadowTension {
  aspect: string;
  orb?: number;
  mode?: 'Saturn' | 'Pluto' | 'Neptune' | 'Chiron' | 'Other';
  hypothesis?: string;
}

export interface ShadowLayer {
  structuralTensions?: ShadowTension[];
  shadowHypothesis?: string;
  integrationStatus?: 'active' | 'O-Integration' | 'partial';
}

export interface EnhancedMatrix {
  tropicalSun?: string;
  siderealSun?: string;
  complexArchetype?: string;
  lensRotationTriggered?: boolean;
}

export interface InputPayload {
  // Consolidated schemas (Oct 20, 2025) - Per Raven Calder directive
  _format?: 'mirror_directive_json' | 'symbolic_weather_json' | 'mirror-symbolic-weather-v1' | 'wm-fieldmap-v1' | string;
  _version?: string;
  _poetic_brain_compatible?: boolean;
  generated_at?: string;
  
  // Consolidated Mirror + Symbolic Weather specific fields
  _natal_section?: {
    mirror_source?: string;
    note?: string;
  };
  
  // NEW: Natal geometry (person_a/person_b charts)
  person_a?: {
    name?: string;
    birth_data?: any;
    chart?: any;
    aspects?: any[];
    natal_chart?: any;
    details?: any;
    summary?: any;
  };
  person_b?: {
    name?: string;
    birth_data?: any;
    chart?: any;
    aspects?: any[];
    natal_chart?: any;
    details?: any;
    summary?: any;
  } | null;
  
  // NEW: Mirror contract (report scope + intimacy tier)
  mirror_contract?: {
    report_kind?: string;
    intimacy_tier?: string;
    relationship_type?: string;
    is_relational?: boolean;
    is_natal_only?: boolean;
  };
  relationship_context?: {
    scope?: string;
    intimacy_tier?: string;
    synastry_aspects?: any[];
    synastry?: {
      aspects?: any[];
      [key: string]: any;
    };
    [key: string]: any;
  };
  synastry_aspects?: any[];
  synastry?: {
    aspects?: any[];
    [key: string]: any;
  };
  composite?: {
    synastry_aspects?: any[];
    relational_mirror?: {
      synastry_aspects?: any[];
      [key: string]: any;
    };
    [key: string]: any;
  };
  relational_engine?: {
    synastry_aspects?: any[];
    [key: string]: any;
  };
  backstage?: {
    synastry_aspects_raw?: any[];
    [key: string]: any;
  };
  
  // NEW: Narrative sections (empty placeholders for Poetic Brain output)
  narrative_sections?: {
    solo_mirror_a?: string;
    solo_mirror_b?: string;
    relational_engine?: string;
    weather_overlay?: string;
  };

  symbolic_weather_context?: {
    daily_readings?: Array<{
      date?: string;
      magnitude?: number;
      magnitude_x10?: number;
      directional_bias?: number;
      directional_bias_x10?: number;
      coherence?: number;
      coherence_x10?: number;
      drivers?: Array<string | Record<string, any>>;
      aspects?: Array<Record<string, any>>;
    }>;
    transit_context?: {
      period?: {
        start?: string;
        end?: string;
        step?: string;
      };
    };
  };

  balance_meter?: {
    magnitude?: number;
    magnitude_0to5?: number;
    directional_bias?: number;
    directional_bias_x10?: number;
    coherence?: number;
    coherence_0to5?: number;
    period?: {
      start?: string;
      end?: string;
    };
    channel_summary_canonical?: Record<string, any>;
  };

  symbolic_weather?: {
    balance_meter_frontstage?: {
      summary?: Array<{
        span?: string;
        magnitude_x10?: number;
        directional_bias_x10?: number;
        coherence_x10?: number;
        notes?: string;
      }>;
    };
    daily_readings?: Array<Record<string, any>>;
    transit_context?: {
      period?: {
        start?: string;
        end?: string;
        step_days?: number;
      };
    };
  };
  
  // EXISTING: Legacy format support (backward compatibility)
  climateLine?: string;
  constitutionalClimate?: string;
  hooks?: Array<string | HookObject>;
  seismograph?: {
    magnitude?: Metric;
    valence_bounded?: Metric;
    valence?: Metric; // expected roughly on a signed scale (negative=restrictive, positive=supportive)
    volatility?: Metric; // 0..1 preferred, but treated generically
    coherence?: Metric; // Added: Narrative Coherence (0-5, higher = stable)
    scaling_strategy?: string;
    valence_label?: string;
  };
  angles?: any[];
  transits?: any[];
  focusTheme?: string;
  // Diagnostic Integrity Protocol
  shadowLayer?: ShadowLayer;
  enhancedMatrix?: EnhancedMatrix;
  toolDescription?: string;
  expressionContext?: string;
  // Provenance for output
  provenance?: {
    data_source?: string;
    ephemeris_backend?: string;
    orbs_profile?: string;
    relocation_mode?: string;
    map_id?: string;
    math_brain_version?: string;
    renderer_version?: string;
    semantic_profile?: string;
  };
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

function classifyDirectionalBias(v?: number): { bias: 'inward' | 'outward' | 'neutral'; descriptor: string } {
  if (v === undefined) return { bias: 'neutral', descriptor: 'neutral flow' };
  // thresholds are conservative to avoid over-claiming
  if (v > 0.25) return { bias: 'outward', descriptor: 'outward energy lean' };
  if (v < -0.25) return { bias: 'inward', descriptor: 'inward energy lean' };
  return { bias: 'neutral', descriptor: 'balanced flow' };
}

function classifyNarrativeCoherence(vol?: number): { label: string } {
  if (vol === undefined) return { label: 'variable coherence' };
  if (vol >= 0.66) return { label: 'fragmented narrative (scattered themes)' };
  if (vol <= 0.33) return { label: 'unified narrative (focused thread)' };
  return { label: 'mixed coherence' };
}

function classifyMagnitude(mag?: number): { band: 0 | 1 | 2 | 3 | 4 | 5; label: string } {
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
  const coh = num(payload.seismograph?.coherence);
  const { band, label } = classifyMagnitude(mag);
  const vt = classifyDirectionalBias(val);
  const vv = classifyNarrativeCoherence(vol);
  const parts: string[] = [];
  parts.push(`Magnitude ${mag !== undefined ? mag.toFixed(2) : '—'} (⚡ ${label} at ${band})`);
  const valLabel = payload.seismograph?.valence_label || vt.descriptor;
  parts.push(`Directional Bias ${val !== undefined ? val.toFixed(2) : '—'} (${valLabel})`);
  if (coh !== undefined) {
    parts.push(`Narrative Coherence ${coh.toFixed(2)} (${coh >= 2.5 ? 'stable' : 'unstable'})`);
  } else if (vol !== undefined) {
    parts.push(`Narrative Coherence ${vol !== undefined ? vol.toFixed(2) : '—'} (${vv.label})`);
  }
  return {
    headline: `${label} with ${valLabel}`,
    details: parts.join(' · '),
  };
}

function formatHooksLine(hooks: HookObject[]): string {
  if (!hooks.length) return 'No high-charge hooks supplied.';
  const items = hooks.map(h => {
    const parts: string[] = [h.label];
    const tags: string[] = [];
    
    // Add SRP hinge phrase if present (Phase 1 enhancement)
    if (h.srp?.hingePhrase) {
      parts.push(h.srp.hingePhrase);
    }
    
    if (h.exact) tags.push('exact');
    if (typeof h.orb === 'number') tags.push(`${h.orb.toFixed(1)}° orb`);
    if (h.retrograde_involved) tags.push('retrograde signature');

    // Add shadow mode indicator if present
    if (h.shadowMode === 'inverted') tags.push('⚠ inverted');
    else if (h.shadowMode === 'integrated') tags.push('✓ integrated');

    // Add resonance state indicator
    if (h.resonanceState === 'ABE') tags.push('boundary edge');
    else if (h.resonanceState === 'OSR') tags.push('non-ping');
    
    // Add SRP shadow collapse mode if present
    if (h.srp?.collapseMode) {
      tags.push(`⚠ ${h.srp.collapseMode}`);
    }

    if (tags.length) parts.push(`(${tags.join(', ')})`);
    return parts.join(' | ');
  });
  return items.join(' · ');
}

function buildShadowLayerSummary(shadowLayer?: ShadowLayer, hooks?: HookObject[]): string | null {
  if (!shadowLayer) return null;

  const parts: string[] = [];

  if (shadowLayer.integrationStatus === 'O-Integration') {
    return 'Shadow Pattern: Previously active patterns now integrated (O-Integration logged).';
  }

  if (shadowLayer.shadowHypothesis) {
    parts.push(`Shadow Hypothesis: ${shadowLayer.shadowHypothesis}`);
  }

  if (shadowLayer.structuralTensions && shadowLayer.structuralTensions.length > 0) {
    const tensionList = shadowLayer.structuralTensions
      .map(t => {
        const mode = t.mode ? ` [${t.mode} mode]` : '';
        return `${t.aspect}${mode}`;
      })
      .join(', ');
    parts.push(`Structural Tensions: ${tensionList}`);
  }
  
  // NEW: SRP restoration cues (Phase 1)
  // Extract restoration cues from hooks with shadow references
  if (hooks) {
    const shadowHooks = hooks.filter(h => h.srp?.restorationCue && (h.resonanceState === 'ABE' || h.resonanceState === 'OSR'));
    if (shadowHooks.length > 0) {
      const restorationCues = shadowHooks.map(h => h.srp?.restorationCue).filter(Boolean);
      if (restorationCues.length > 0) {
        parts.push(`Restoration Cues: ${restorationCues.join(' · ')}`);
      }
    }
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

function buildToolFirstFraming(toolDescription?: string, expressionContext?: string): string | null {
  if (!toolDescription) return null;

  const parts: string[] = [];
  parts.push(`Archetypal Tool: ${toolDescription}`);

  if (expressionContext) {
    parts.push(`Expression Context: ${expressionContext}`);
  }

  parts.push('Remember: This describes the instrument, not guaranteed outcomes. You are the musician.');

  return parts.join(' · ');
}

function buildEnhancedMatrixSummary(matrix?: EnhancedMatrix): string | null {
  if (!matrix) return null;

  const parts: string[] = [];

  if (matrix.complexArchetype) {
    parts.push(`Enhanced Matrix: ${matrix.complexArchetype}`);
  } else if (matrix.tropicalSun && matrix.siderealSun) {
    parts.push(`Enhanced Matrix: Tropical ${matrix.tropicalSun} / Sidereal ${matrix.siderealSun}`);
  }

  if (matrix.tropicalSun) {
    parts.push(`Ego Grammar: ${matrix.tropicalSun}`);
  }

  if (matrix.siderealSun) {
    parts.push(`Structural Mirror: ${matrix.siderealSun}`);
  }

  if (matrix.lensRotationTriggered) {
    parts.push('Lens Rotation Doctrine (LRD-1) triggered: checking Sidereal for O-Integration');
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

function buildProvenanceLine(provenance?: InputPayload['provenance']): string | null {
  if (!provenance) return null;

  const parts: string[] = [];

  if (provenance.data_source) {
    parts.push(`Data: ${provenance.data_source}`);
  }

  if (provenance.ephemeris_backend) {
    parts.push(`Ephemeris: ${provenance.ephemeris_backend}`);
  }

  if (provenance.orbs_profile) {
    parts.push(`Orbs: ${provenance.orbs_profile}`);
  }

  if (provenance.relocation_mode) {
    parts.push(`Relocation: ${provenance.relocation_mode}`);
  }

  if (provenance.map_id) {
    parts.push(`Map ID: ${provenance.map_id}`);
  }

  if (provenance.math_brain_version) {
    parts.push(`Math Brain: ${provenance.math_brain_version}`);
  }

  if (provenance.renderer_version) {
    parts.push(`Renderer: ${provenance.renderer_version}`);
  }

  if (provenance.semantic_profile) {
    parts.push(`Semantic Profile: ${provenance.semantic_profile}`);
  }

  return parts.length > 0 ? `Provenance — ${parts.join(' · ')}` : null;
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

  // Build optional diagnostic sections
  const matrixSummary = buildEnhancedMatrixSummary(payload.enhancedMatrix);
  const toolFraming = buildToolFirstFraming(payload.toolDescription, payload.expressionContext);
  const provenanceLine = buildProvenanceLine(payload.provenance);

  if (!hasActivationData(payload)) {
  const lines: string[] = [blueprintLine];

  if (matrixSummary) lines.push(matrixSummary);
  if (toolFraming) lines.push(toolFraming);

  lines.push('Current Mode — No activation data supplied; holding to the natal baseline.');
  lines.push(`Baseline Hooks — ${formatHooksLine(hooks)}`);

  // Build shadow summary with hook restoration cues
  const shadowSummary = buildShadowLayerSummary(payload.shadowLayer, hooks);
  if (shadowSummary) lines.push(shadowSummary);

  lines.push('Reflection — Map, not mandate: integrate what resonates and release the rest.');

  if (provenanceLine) lines.push(provenanceLine);

  return lines.join('\n');
  }

  const s = seismographSummary(payload);
  const weatherDescriptor =
    payload.climateLine && payload.climateLine.trim().length > 0
      ? payload.climateLine.trim()
      : `Current atmosphere leans ${s.headline}.`;
  const hookSummary = formatHooksLine(hooks);
  const tensionParts: string[] = [`Seismograph — ${s.details}.`, `Hooks — ${hookSummary}`];

  const lines: string[] = [blueprintLine];

  if (matrixSummary) lines.push(matrixSummary);
  if (toolFraming) lines.push(toolFraming);

  lines.push(`Weather — ${weatherDescriptor}`);
  lines.push(`Tensions — ${tensionParts.join(' · ')}`);

  // Build shadow summary with hook restoration cues
  const shadowSummary = buildShadowLayerSummary(payload.shadowLayer, hooks);
  if (shadowSummary) lines.push(shadowSummary);

  lines.push('Reflection — Map, not mandate: treat this as symbolic weather. If it lands, log it; if not, discard and proceed.');

  if (provenanceLine) lines.push(provenanceLine);

  return lines.join('\n');
}

function buildPolarityCard(payload: InputPayload): string {
  const mag = num(payload.seismograph?.magnitude);
  const val = num(payload.seismograph?.valence_bounded ?? payload.seismograph?.valence);
  const vol = num(payload.seismograph?.volatility);
  const { band, label } = classifyMagnitude(mag);
  const vt = classifyDirectionalBias(val);
  const vv = classifyNarrativeCoherence(vol);
  const hooks = normalizeHooks(payload.hooks);

  // Title pieces
  const biasTitle = vt.bias === 'outward' ? 'Outward Flow' : vt.bias === 'inward' ? 'Inward Flow' : 'Neutral Flow';
  const coherenceTitle = vv.label.includes('fragmented') ? 'Fragmented' : vv.label.includes('unified') ? 'Unified' : 'Mixed';
  const title = `${biasTitle} · ${coherenceTitle}`;

  const captionParts: string[] = [];
  captionParts.push(`⚡ ${label} (${band})`);
  if (val !== undefined) captionParts.push(`Directional Bias ${val.toFixed(2)} (${vt.descriptor})`);
  if (vol !== undefined) captionParts.push(`Narrative Coherence ${vol.toFixed(2)}`);
  const topHook = hooks[0]?.label ? ` · Anchor: ${hooks[0].label}` : '';

  return `${title}\n${captionParts.join(' · ')}${topHook}`;
}

// ============================================================================
// NEW: Mirror Directive JSON Support (Oct 18, 2025)
// ============================================================================

interface MirrorDirectiveParsed {
  reportKind: string;
  intimacyTier: string | null;
  isRelational: boolean;
  personA: any;
  personB: any | null;
  geometry: {
    chartA: any;
    chartB: any | null;
    aspectsA: any[];
    aspectsB: any[];
    synastryAspects: any[];
  };
}

function extractSynastryAspects(payload: InputPayload): any[] {
  const candidates = [
    payload.synastry_aspects,
    payload.relationship_context?.synastry_aspects,
    payload.relationship_context?.synastry?.aspects,
    payload.synastry?.aspects,
    payload.relational_engine?.synastry_aspects,
    payload.composite?.synastry_aspects,
    payload.composite?.relational_mirror?.synastry_aspects,
    payload.backstage?.synastry_aspects_raw,
  ];

  for (const source of candidates) {
    if (Array.isArray(source) && source.length > 0) {
      return source;
    }
  }

  return Array.isArray(payload.synastry_aspects) ? payload.synastry_aspects : [];
}

/**
 * Parse Mirror Directive JSON structure
 * Extracts natal geometry, mirror contract, and report configuration
 */
function parseMirrorDirective(payload: InputPayload): MirrorDirectiveParsed {
  const contract = payload.mirror_contract || {};
  return {
    reportKind: contract.report_kind || 'mirror',
    intimacyTier: contract.intimacy_tier || null,
    isRelational: contract.is_relational || false,
    personA: payload.person_a || {},
    personB: payload.person_b || null,
    geometry: {
      chartA: payload.person_a?.chart || {},
      chartB: payload.person_b?.chart || null,
      aspectsA: payload.person_a?.aspects || [],
      aspectsB: payload.person_b?.aspects || [],
      synastryAspects: extractSynastryAspects(payload),
    }
  };
}

interface IntimacyCalibration {
  boundaryMode: string;
  toneDescriptor: string;
  disclosureLevel: 'minimal' | 'moderate' | 'full';
}

/**
 * Calibrate narrative tone based on intimacy tier
 * P1-P5b as defined in Woven Map Protocol
 */
function calibrateForIntimacyTier(tier: string | null): IntimacyCalibration {
  const tierMap: Record<string, IntimacyCalibration> = {
    'P1': { 
      boundaryMode: 'formal', 
      toneDescriptor: 'respectful distance', 
      disclosureLevel: 'minimal' 
    },
    'P2': { 
      boundaryMode: 'friendly', 
      toneDescriptor: 'warm but bounded', 
      disclosureLevel: 'moderate' 
    },
    'P3': { 
      boundaryMode: 'exploratory', 
      toneDescriptor: 'curious, undefined', 
      disclosureLevel: 'moderate' 
    },
    'P4': { 
      boundaryMode: 'casual', 
      toneDescriptor: 'relaxed, low stakes', 
      disclosureLevel: 'moderate' 
    },
    'P5a': { 
      boundaryMode: 'intimate', 
      toneDescriptor: 'deep, committed', 
      disclosureLevel: 'full' 
    },
    'P5b': { 
      boundaryMode: 'intimate-nonsexual', 
      toneDescriptor: 'deep, non-romantic', 
      disclosureLevel: 'full' 
    },
  };
  return tierMap[tier || 'P1'] || tierMap['P1'];
}

/**
 * Extract basic geometry summary from chart data
 * Simple extraction for narrative generation
 */
function extractGeometrySummary(chart: any): string {
  if (!chart || typeof chart !== 'object') {
    return 'Chart geometry unavailable.';
  }
  
  // Try to extract planets
  const planets = chart.planets || chart.planetary_positions || {};
  const planetCount = Object.keys(planets).length;
  
  // Try to extract aspects
  const aspects = chart.aspects || [];
  const aspectCount = Array.isArray(aspects) ? aspects.length : 0;
  
  if (planetCount === 0 && aspectCount === 0) {
    return 'Chart geometry present but unparsed.';
  }
  
  const parts: string[] = [];
  if (planetCount > 0) parts.push(`${planetCount} planetary positions`);
  if (aspectCount > 0) parts.push(`${aspectCount} aspects`);
  
  return parts.join(', ');
}

/**
 * Generate solo mirror narrative
 * Uses natal chart geometry for single person
 */
function formatMandateHeading(mandate: MandateAspect, index: number): string {
  const archetypeA = mandate.archetypes.a.name;
  const archetypeB = mandate.archetypes.b.name;
  const aspect = mandate.geometry.aspectType;
  const orb = mandate.geometry.orbDegrees.toFixed(1);
  return `${index + 1}. ${archetypeA} ↔ ${archetypeB} (${aspect}, orb ${orb}°)`;
}

function formatMandateBody(mandate: MandateAspect): string[] {
  const lines: string[] = [];
  lines.push(`Diagnostic — ${mandate.diagnostic}`);
  lines.push(`Field Pressure — ${mandate.fieldPressure}`);
  lines.push(`Map Translation — ${mandate.mapTranslation}`);
  lines.push(`Voice Mirror — ${mandate.voiceHook}`);
  return lines;
}

function renderMandatesSection(personName: string, mandates: MandateAspect[]): string[] {
  const lines: string[] = [];
  if (!mandates.length) {
    lines.push(`No high-charge aspects passed the mandate filter for ${personName}. Treat lived experience as the deciding authority.`);
    return lines;
  }

  lines.push('Mandate Highlights — Top Geometries Driving Lived Tension');
  mandates.forEach((mandate, index) => {
    lines.push('');
    lines.push(`### ${formatMandateHeading(mandate, index)}`);
    lines.push(...formatMandateBody(mandate));
  });
  return lines;
}

function formatPossessiveName(name?: string): string {
  const base = (name || 'Person').trim();
  if (!base) return 'Person';
  return base.endsWith('s') ? `${base}'` : `${base}'s`;
}

function renderSynastryMandatesSection(nameA: string, nameB: string, mandates: MandateAspect[]): string[] {
  const lines: string[] = [];
  if (!mandates.length) {
    lines.push('Synastry Field — Cross-chart aspect data not provided. Relational narrative is running on baseline geometry only.');
    return lines;
  }

  lines.push('Synastry Field — Cross-chart geometries animating the shared climate.');
  mandates.forEach((mandate, index) => {
    const ownerA = mandate.archetypes.a.owner || nameA;
    const ownerB = mandate.archetypes.b.owner || nameB;
    const heading = `${index + 1}. ${formatPossessiveName(ownerA)} ${mandate.archetypes.a.planet} ↔ ${formatPossessiveName(ownerB)} ${mandate.archetypes.b.planet} (${mandate.geometry.aspectType}, ${mandate.geometry.orbDegrees.toFixed(1)}° orb)`;
    lines.push('');
    lines.push(`### ${heading}`);
    lines.push(`Field — ${mandate.fieldPressure}`);
    lines.push(`Map — ${mandate.mapTranslation}`);
    lines.push(`Voice — ${mandate.voiceHook}`);
  });
  return lines;
}

function generateSoloMirror(person: any, chart: any, calibration: IntimacyCalibration, mandates: MandateAspect[]): string {
  const name = person.name || 'Person';
  const geometrySummary = extractGeometrySummary(chart);

  // Use narrative builder for structured mirror generation
  const chartMandates = {
    personName: name,
    mandates: mandates
  };
  
  const narrative = generateSoloMirrorNarrative(chartMandates, { includeHeading: false });

  // Prepend calibration and geometry context
  const lines: string[] = [];
  lines.push(`# Solo Mirror: ${name}`);
  lines.push('');
  lines.push(`Boundary Mode — ${calibration.boundaryMode}`);
  lines.push(`Narrative Tone — ${calibration.toneDescriptor}`);
  lines.push(`Disclosure Level — ${calibration.disclosureLevel}`);
  lines.push('');
  lines.push(`Geometry — ${geometrySummary}`);
  lines.push('');
  lines.push('Blueprint — Natal pattern reflects constitutional climate. This is the baseline geometry before any transits or activations.');
  lines.push('');
  
  // Append the generated narrative
  lines.push(narrative.fullNarrative);
  lines.push('');
  lines.push('Reflection — Map, not mandate: Integrate what resonates with current reality and log evidence for or against each pattern.');

  return lines.join('\n');
}

/**
 * Generate relational engine narrative
 * Uses both natal charts for relationship dynamics
 */
function generateRelationalEngine(personA: any, personB: any, geometry: any, calibration: IntimacyCalibration): string {
  const nameA = personA.name || 'Person A';
  const nameB = personB?.name || 'Person B';
  const geoA = extractGeometrySummary(geometry.chartA);
  const geoB = extractGeometrySummary(geometry.chartB);
  const synastrySource = geometry?.synastryAspects || [];
  const synastryMandates = buildSynastryMandates(nameA, nameB, synastrySource, { limit: 4 });
  
  const lines: string[] = [];
  lines.push(`# Relational Engine: ${nameA} & ${nameB}`);
  lines.push('');
  lines.push(`${nameA} Geometry — ${geoA}`);
  lines.push(`${nameB} Geometry — ${geoB}`);
  lines.push('');
  lines.push(`Intimacy Tier — ${calibration.toneDescriptor}`);
  lines.push(`Disclosure Level — ${calibration.disclosureLevel}`);
  lines.push('');
  if (synastryMandates.mandates.length) {
    lines.push(`Relational Field — ${synastryMandates.mandates.length} high-charge synastry aspects describe how your baselines meet in real time.`);
  } else {
    lines.push('Relational Field — Synastry aspects not supplied; referencing baseline geometries for directional guidance.');
  }
  const synastrySection = renderSynastryMandatesSection(nameA, nameB, synastryMandates.mandates);
  if (synastrySection.length) {
    lines.push('');
    lines.push(...synastrySection);
  }
  lines.push('');
  lines.push('Reflection — Relational mirrors show how individual geometries meet, blend, or clash. This is not prediction—it\'s pattern recognition.');
  
  return lines.join('\n');
}

/**
 * Generate weather overlay narrative
 * Adds transit/activation layer if present
 */
function summarizeSymbolicWeatherContext(ctx: any): { headline: string; details: string } {
  const readings = Array.isArray(ctx?.daily_readings) ? ctx.daily_readings : [];
  if (!readings.length) {
    return { headline: 'No readings', details: 'No daily readings supplied.' };
  }

  // Use the first reading as "current" snapshot; fall back to simple averages
  const first = readings[0] || {};
  const mag = typeof first.magnitude === 'number'
    ? first.magnitude
    : (readings.map((r: any) => r?.magnitude).filter((n: any) => Number.isFinite(n)).reduce((a: number, b: number) => a + b, 0) / Math.max(1, readings.length));
  const bias = typeof first.directional_bias === 'number'
    ? first.directional_bias
    : (readings.map((r: any) => r?.directional_bias).filter((n: any) => Number.isFinite(n)).reduce((a: number, b: number) => a + b, 0) / Math.max(1, readings.length));
  const coh = typeof first.coherence === 'number'
    ? first.coherence
    : (readings.map((r: any) => r?.coherence).filter((n: any) => Number.isFinite(n)).reduce((a: number, b: number) => a + b, 0) / Math.max(1, readings.length));

  const { band, label } = classifyMagnitude(mag);
  const vt = classifyDirectionalBias(bias);
  const vv = classifyNarrativeCoherence(coh);

  const parts: string[] = [];
  parts.push(`Magnitude ${Number.isFinite(mag) ? mag.toFixed(2) : '—'} (⚡ ${label} at ${band})`);
  parts.push(`Directional Bias ${Number.isFinite(bias) ? bias.toFixed(2) : '—'} (${vt.descriptor})`);
  if (Number.isFinite(coh)) {
    parts.push(`Narrative Coherence ${coh.toFixed(2)} (${vv.label})`);
  }

  return {
    headline: `${label} with ${vt.descriptor}`,
    details: parts.join(' · '),
  };
}

function generateWeatherOverlay(source: any): string {
  if (!source) {
    return 'Symbolic Weather — No activation data provided. Holding to natal baseline.';
  }

  const isSymbolicContext = !!(source?.daily_readings || source?.transit_context);
  const summary = isSymbolicContext
    ? summarizeSymbolicWeatherContext(source)
    : seismographSummary({ seismograph: source });

  const lines: string[] = [];
  lines.push('# Symbolic Weather');
  lines.push('');
  lines.push(`Current Atmosphere — ${summary.headline}`);
  lines.push(`${isSymbolicContext ? 'Summary' : 'Seismograph'} — ${summary.details}`);
  lines.push('');
  lines.push('Reflection — This is symbolic weather over the natal baseline. Transits activate existing patterns; they don\'t create new ones.');

  return lines.join('\n');
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

/**
 * Process Mirror Directive JSON
 * Returns populated narrative_sections for all report types
 * 
 * This is the main entry point for Mirror Directive JSON uploads
 */
export function processMirrorDirective(payload: InputPayload): {
  success: boolean;
  narrative_sections: {
    solo_mirror_a?: string;
    solo_mirror_b?: string;
    relational_engine?: string;
    weather_overlay?: string;
  };
  intimacy_tier?: string | null;
  report_kind?: string;
  error?: string;
} {
  // Validate format
  if (payload._format !== 'mirror_directive_json') {
    return {
      success: false,
      narrative_sections: {},
      error: 'Invalid format: expected mirror_directive_json'
    };
  }

  // Parse Mirror Directive
  const directive = parseMirrorDirective(payload);
  const calibration = calibrateForIntimacyTier(directive.intimacyTier);

  // Generate mandates for Person A
  const mandatesA = buildMandatesForChart(
    directive.personA?.name || 'Person A',
    directive.geometry.chartA || {},
    { limit: 5 }
  );

  // Enhance base prompt with mandate data
  let enhancedPrompt = enhancePromptWithMandates(
    process.env.DEFAULT_PROMPT || '',
    { name: directive.personA?.name || 'Person A', mandates: mandatesA.mandates }
  );

  // Generate mandates for Person B if relational
  const mandatesB = directive.isRelational && directive.geometry.chartB
    ? buildMandatesForChart(
        directive.personB?.name || 'Person B',
        directive.geometry.chartB,
        { limit: 5 }
      )
    : null;

  // Enhance prompt with Person B's mandates if relational
  if (directive.isRelational && mandatesB) {
    enhancedPrompt = enhancePromptWithMandates(
      enhancedPrompt,
      { name: directive.personA?.name || 'Person A', mandates: mandatesA.mandates },
      { name: directive.personB?.name || 'Person B', mandates: mandatesB.mandates }
    );
  }

  // Generate narrative sections
  const narratives: any = {};

  // Always generate solo mirror for Person A
  if (directive.personA) {
    narratives.solo_mirror_a = generateSoloMirror(
      directive.personA,
      directive.geometry.chartA,
      calibration,
      mandatesA.mandates
    );
  }

  // Generate solo mirror for Person B if relational
  if (directive.isRelational && directive.personB) {
    narratives.solo_mirror_b = generateSoloMirror(
      directive.personB,
      directive.geometry.chartB,
      calibration,
      mandatesB?.mandates || []
    );
  }

  // Generate relational engine if relational
  if (directive.isRelational && directive.personB) {
    narratives.relational_engine = generateRelationalEngine(
      directive.personA,
      directive.personB,
      directive.geometry,
      calibration
    );
  }

  // Generate weather overlay if seismograph data present
  const weatherSource = payload.symbolic_weather_context || payload.seismograph;
  if (weatherSource) {
    narratives.weather_overlay = generateWeatherOverlay(weatherSource);
  }

  return {
    success: true,
    narrative_sections: narratives,
    intimacy_tier: directive.intimacyTier,
    report_kind: directive.reportKind,
  };
}

// Export helper functions for external use
export { 
  parseMirrorDirective, 
  calibrateForIntimacyTier,
  extractGeometrySummary,
  generateSoloMirror,
  generateRelationalEngine,
  generateWeatherOverlay,
};
