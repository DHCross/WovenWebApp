// Main entry for Poetic Brain module
// Exports generateSection(sectionType, inputPayload)
// Phase 1, Task 1.2: Integrated with narrative-builder for solo mirror generation

import { buildMandatesForChart, buildSynastryMandates } from '../../lib/poetics/mandate';
import { enhancePromptWithMandates } from '../../lib/poetics/prompt-builder';
import { generateSoloMirrorNarrative } from '../../lib/poetics/narrative-builder';
import { calculateSynastryAspects, canCalculateSynastry } from '../../lib/poetics/synastry-calculator';
import { inferBigFiveFromChart, type BigFiveProfile } from '../../lib/bigfive/inferBigFiveFromChart';
import { getVocabularyShaping, getDominantPhrase, type VocabularyShaping } from '../../lib/bigfive/vocabularyShaper';
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

/**
 * Geometry Validation Result
 * 
 * Per Raven Calder Protocol: FIELD → MAP → VOICE
 * If geometry is invalid, MAP layer must halt and VOICE layer must not fire.
 * 
 * This type enables explicit gating at the API layer.
 */
export type GeometryValidation =
  | { valid: true }
  | {
    valid: false;
    reason: 'missing_person_a' | 'missing_person_a_name' | 'missing_aspects_a' | 'missing_synastry_for_relational' | 'missing_both_aspects';
    details?: string;
  };

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
    // Optional persona excerpt metadata (external corpus-derived)
    persona_excerpt?: string;
    persona_excerpt_source?: {
      source?: string;
      file?: string;
      generated_at?: string;
      version?: string;
    };
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

  // Persona excerpt provenance (from external corpus)
  if (provenance.persona_excerpt_source && typeof provenance.persona_excerpt_source === 'object') {
    const src = provenance.persona_excerpt_source;
    const pieces: string[] = [];
    if (src.source) pieces.push(src.source);
    if (src.file) pieces.push(src.file);
    if (pieces.length) parts.push(`Persona Excerpt: ${pieces.join(' / ')}`);
  } else if (provenance.persona_excerpt) {
    parts.push('Persona Excerpt: included');
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
    synastryComputed: boolean; // True if aspects were calculated internally
  };
}

/**
 * Extract pre-computed synastry aspects from various possible locations in the payload
 */
function extractPrecomputedSynastryAspects(payload: InputPayload): any[] {
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

  return [];
}

/**
 * Extract synastry aspects - either from pre-computed data OR by calculating internally
 * 
 * Per Raven's Law: The system must never claim missing data when it has
 * the raw geometry to compute what it needs.
 */
function extractSynastryAspects(
  payload: InputPayload,
  chartA: any,
  chartB: any | null,
  personAName: string,
  personBName: string
): { aspects: any[]; computed: boolean } {
  // First, try to find pre-computed synastry aspects
  const precomputed = extractPrecomputedSynastryAspects(payload);
  if (precomputed.length > 0) {
    console.log('[PoeticBrain] Using pre-computed synastry aspects:', precomputed.length);
    return { aspects: precomputed, computed: false };
  }

  // If no pre-computed aspects, attempt to calculate from chart positions
  if (!chartB) {
    console.log('[PoeticBrain] No Person B chart - skipping synastry calculation');
    return { aspects: [], computed: false };
  }

  const positionsA = chartA?.positions || {};
  const positionsB = chartB?.positions || {};

  if (!canCalculateSynastry(positionsA, positionsB)) {
    console.log('[PoeticBrain] Insufficient position data for synastry calculation');
    return { aspects: [], computed: false };
  }

  // Calculate synastry aspects internally
  console.log('[PoeticBrain] Computing synastry aspects from chart positions...');
  const result = calculateSynastryAspects(
    positionsA,
    positionsB,
    personAName,
    personBName,
    { includeMinorAspects: false, maxAspects: 15, minWeight: 3 }
  );

  console.log('[PoeticBrain] Computed synastry aspects:', {
    aspectCount: result.aspect_count,
    planetCountA: result.planet_count_a,
    planetCountB: result.planet_count_b,
    source: result.source,
  });

  return { aspects: result.aspects, computed: true };
}

/**
 * Parse Mirror Directive JSON structure
 * Extracts natal geometry, mirror contract, and report configuration
 * 
 * If synastry_aspects are not provided but both charts have positions,
 * aspects will be calculated internally.
 */
function parseMirrorDirective(payload: InputPayload): MirrorDirectiveParsed {
  const contract = payload.mirror_contract || {};

  // Get base chart objects
  const baseChartA = payload.person_a?.chart || {};
  const baseChartB = payload.person_b?.chart || null;

  // Aspects can be at person.aspects OR person.chart.aspects - normalize to chart.aspects
  // buildMandatesForChart expects chart.aspects to exist
  const aspectsA = payload.person_a?.aspects || baseChartA.aspects || [];
  const aspectsB = payload.person_b?.aspects || baseChartB?.aspects || [];

  // Attach aspects to chart objects so buildMandatesForChart can find them
  const chartA = { ...baseChartA, aspects: aspectsA };
  const chartB = baseChartB ? { ...baseChartB, aspects: aspectsB } : null;

  // Extract or compute synastry aspects
  const personAName = payload.person_a?.name || 'Person A';
  const personBName = payload.person_b?.name || 'Person B';
  const synastryResult = extractSynastryAspects(payload, chartA, chartB, personAName, personBName);

  return {
    reportKind: contract.report_kind || 'mirror',
    intimacyTier: contract.intimacy_tier || null,
    isRelational: contract.is_relational || false,
    personA: payload.person_a || {},
    personB: payload.person_b || null,
    geometry: {
      chartA,
      chartB,
      aspectsA,
      aspectsB,
      synastryAspects: synastryResult.aspects,
      synastryComputed: synastryResult.computed,
    }
  };
}

// ============================================================================
// Constitutional Texture — Backstage Vocabulary Shaping
// ============================================================================

interface ConstitutionalTextures {
  textureA: BigFiveProfile | null;
  textureB: BigFiveProfile | null;
  shapingA: VocabularyShaping | null;
  shapingB: VocabularyShaping | null;
}

/**
 * Extract constitutional texture from payload provenance or compute on the fly
 * 
 * The texture shapes HOW Raven speaks (vocabulary selection) without ever
 * naming the Big Five framework frontstage.
 */
function extractConstitutionalTexture(payload: InputPayload, chartA: any, chartB: any | null): ConstitutionalTextures {
  // First, try to extract from provenance (if Math Brain already computed it)
  // Use type assertion since provenance allows any additional properties
  const provenanceTexture = (payload.provenance as any)?._constitutional_texture;

  let textureA: BigFiveProfile | null = null;
  let textureB: BigFiveProfile | null = null;

  if (provenanceTexture?.person_a) {
    textureA = provenanceTexture.person_a as BigFiveProfile;
    console.log('[PoeticBrain] Using pre-computed constitutional texture for Person A');
  } else if (chartA?.positions) {
    // Compute on the fly if not in provenance
    textureA = inferBigFiveFromChart({ positions: chartA.positions, angle_signs: chartA.angle_signs });
    if (textureA) {
      console.log('[PoeticBrain] Computed constitutional texture for Person A');
    }
  }

  if (provenanceTexture?.person_b) {
    textureB = provenanceTexture.person_b as BigFiveProfile;
    console.log('[PoeticBrain] Using pre-computed constitutional texture for Person B');
  } else if (chartB?.positions) {
    textureB = inferBigFiveFromChart({ positions: chartB.positions, angle_signs: chartB.angle_signs });
    if (textureB) {
      console.log('[PoeticBrain] Computed constitutional texture for Person B');
    }
  }

  // Generate vocabulary shaping from textures
  const shapingA = textureA ? getVocabularyShaping(textureA) : null;
  const shapingB = textureB ? getVocabularyShaping(textureB) : null;

  if (shapingA) {
    console.log('[PoeticBrain] Vocabulary shaping A:', shapingA._technicalSummary);
  }
  if (shapingB) {
    console.log('[PoeticBrain] Vocabulary shaping B:', shapingB._technicalSummary);
  }

  return { textureA, textureB, shapingA, shapingB };
}

/**
 * Generate an architectural opening using vocabulary shaping
 * This replaces generic descriptions with texture-informed language
 */
function generateTexturedOpening(name: string, shaping: VocabularyShaping | null): string {
  if (!shaping) {
    return `${name}'s baseline architecture...`;
  }

  // Pick phrases from each category to build a rich opening
  const aperture = shaping.aperture[0] || 'balanced aperture';
  const energy = shaping.energy[0] || 'context-dependent energy';
  const structure = shaping.structure[0] || 'adaptive structure';

  return `Your architecture shows a **${aperture}**—${energy}. There's a **${structure}** quality here.`;
}

/**
 * Generate relational field description using both textures
 */
function generateRelationalTextureDescription(
  nameA: string,
  nameB: string,
  shapingA: VocabularyShaping | null,
  shapingB: VocabularyShaping | null
): string[] {
  const lines: string[] = [];

  if (!shapingA && !shapingB) {
    return lines;
  }

  lines.push(`### Constitutional Texture — How Each System Moves`);
  lines.push('');

  if (shapingA) {
    const aperture = shapingA.aperture[0] || 'balanced aperture';
    const relational = shapingA.relational[0] || 'selective harmonizing';
    const sensitivity = shapingA.sensitivity[0] || 'calibrated sensitivity';
    lines.push(`**${nameA}** tends to operate with a ${aperture}, ${relational}, and a ${sensitivity}.`);
    lines.push('');
  }

  if (shapingB) {
    const aperture = shapingB.aperture[0] || 'balanced aperture';
    const relational = shapingB.relational[0] || 'selective harmonizing';
    const sensitivity = shapingB.sensitivity[0] || 'calibrated sensitivity';
    lines.push(`**${nameB}** tends to operate with a ${aperture}, ${relational}, and a ${sensitivity}.`);
    lines.push('');
  }

  // If both are present, describe the interplay
  if (shapingA && shapingB) {
    const aEnergy = shapingA.energy[0] || 'context-dependent energy';
    const bEnergy = shapingB.energy[0] || 'context-dependent energy';

    if (aEnergy !== bEnergy) {
      lines.push(`In the shared field, ${nameA}'s ${aEnergy} meets ${nameB}'s ${bEnergy}. This difference in energy direction often creates a particular rhythm—sometimes complementary, sometimes requiring conscious calibration.`);
      lines.push('');
    }
  }

  return lines;
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

  // Try to extract planets - check multiple possible keys
  const planets = chart.positions || chart.planets || chart.planetary_positions || {};
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
 * Extract chart signature (Sun, Moon, Rising) for narrative use
 */
function extractChartSignature(chart: any): { sun?: string; moon?: string; rising?: string; summary: string } {
  if (!chart || typeof chart !== 'object') {
    return { summary: 'chart signature unavailable' };
  }

  const planets = chart.positions || chart.planets || chart.planetary_positions || {};
  const getSign = (planetName: string): string | undefined => {
    const planet = planets[planetName] || planets[planetName.toLowerCase()];
    if (!planet) return undefined;
    return planet.sign || planet.signName || planet.zodiac_sign;
  };

  const sun = getSign('Sun');
  const moon = getSign('Moon');
  // Rising can be at ASC, Ascendant, or in a separate angles object
  const rising = getSign('ASC') || getSign('Ascendant') || chart.angles?.ascendant?.sign;

  const parts: string[] = [];
  if (sun) parts.push(`${sun} Sun`);
  if (rising) parts.push(`${rising} rising`);
  if (moon) parts.push(`${moon} Moon`);

  return {
    sun,
    moon,
    rising,
    summary: parts.length > 0 ? parts.join(', ') : 'chart signature present but unparsed'
  };
}

/**
 * Generate element summary from chart
 */
function summarizeElementBalance(chart: any): string {
  const sig = extractChartSignature(chart);
  const elements: Record<string, string[]> = {
    fire: ['Aries', 'Leo', 'Sagittarius'],
    earth: ['Taurus', 'Virgo', 'Capricorn'],
    air: ['Gemini', 'Libra', 'Aquarius'],
    water: ['Cancer', 'Scorpio', 'Pisces']
  };

  const getElement = (sign?: string): string | undefined => {
    if (!sign) return undefined;
    for (const [element, signs] of Object.entries(elements)) {
      if (signs.some(s => sign.toLowerCase().includes(s.toLowerCase()))) {
        return element;
      }
    }
    return undefined;
  };

  const sunEl = getElement(sig.sun);
  const moonEl = getElement(sig.moon);
  const risingEl = getElement(sig.rising);

  const counts: Record<string, number> = { fire: 0, earth: 0, air: 0, water: 0 };
  if (sunEl) counts[sunEl]++;
  if (moonEl) counts[moonEl]++;
  if (risingEl) counts[risingEl]++;

  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1]).filter(([, c]) => c > 0);
  if (dominant.length === 0) return '';

  return dominant.map(([el]) => el).join(' and ');
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

  // Use narrative builder for structured mirror generation
  const chartMandates = {
    personName: name,
    mandates: mandates
  };

  // Generate the narrative content (includes polarity cards and mirror voice)
  const narrative = generateSoloMirrorNarrative(chartMandates, {
    includeHeading: true,
    includeHookStack: true,
    includePolarityCards: true,
    includeMandateHighlights: mandates.length > 0,
    includeMirrorVoice: true,
  });

  // Build output with conversational framing (no scaffolding metadata)
  const lines: string[] = [];

  // If we have valid mandates, use the full narrative
  if (mandates.length > 0) {
    lines.push(narrative.fullNarrative);
  } else {
    // Fallback when no aspect data available
    lines.push(`## Solo Mirror: ${name}`);
    lines.push('');
    lines.push(`I have your chart geometry loaded, but the aspect data couldn't be parsed into the mandate format. This might mean the chart export used a different structure than expected.`);
    lines.push('');
    lines.push(`What I can say: your natal pattern is present. The specific tensions and polarities that drive your experience are there in the geometry—I just need the aspect data in a format I can translate.`);
    lines.push('');
    lines.push(`If you're seeing this, try re-exporting your Math Brain report, or ask me directly about specific planetary placements you'd like to explore.`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('*Map, not mandate: integrate what resonates with your lived experience and set aside the rest.*');

  return lines.join('\n');
}

/**
 * Generate relational engine narrative
 * Uses Four Report Types architecture with bidirectional attribution
 * Language follows E-Prime (conditional, testable phrasing)
 */
function generateRelationalEngine(
  personA: any,
  personB: any,
  geometry: any,
  calibration: IntimacyCalibration,
  shapingA: VocabularyShaping | null = null,
  shapingB: VocabularyShaping | null = null
): string {
  const nameA = personA.name || 'Person A';
  const nameB = personB?.name || 'Person B';
  const synastrySource = geometry?.synastryAspects || [];
  const synastryMandates = buildSynastryMandates(nameA, nameB, synastrySource, { limit: 5 });

  // Extract chart signatures for both people
  const sigA = extractChartSignature(geometry.chartA);
  const sigB = extractChartSignature(geometry.chartB);
  const elementsA = summarizeElementBalance(geometry.chartA);
  const elementsB = summarizeElementBalance(geometry.chartB);

  const lines: string[] = [];
  lines.push(`## Relational Mirror: ${nameA} ↔ ${nameB}`);
  lines.push('');

  // ============================================
  // SECTION 1: FIELD OVERVIEW
  // ============================================
  lines.push(`### 1. Field Overview`);
  lines.push('');

  if (sigA.summary !== 'chart signature unavailable' || sigB.summary !== 'chart signature unavailable') {
    // Describe the joint field using both charts
    const aDesc = sigA.summary !== 'chart signature unavailable'
      ? `${nameA} arrives as ${sigA.summary}`
      : `${nameA}'s chart signature`;
    const bDesc = sigB.summary !== 'chart signature unavailable'
      ? `${nameB} arrives as ${sigB.summary}`
      : `${nameB}'s chart signature`;

    lines.push(`${aDesc}. ${bDesc}.`);
    lines.push('');

    // Element interplay
    if (elementsA && elementsB) {
      lines.push(`The joint field may carry ${elementsA} tones from ${nameA} meeting ${elementsB} tones from ${nameB}. This combination often creates a particular rhythm—neither person's pattern dominates; instead, they tend to weave together.`);
    } else if (elementsA || elementsB) {
      const who = elementsA ? nameA : nameB;
      const elem = elementsA || elementsB;
      lines.push(`${who}'s ${elem} emphasis may set a particular tone in the shared space.`);
    }
    lines.push('');
  } else {
    lines.push(`Both charts are present, though the core signatures (Sun, Moon, Rising) could not be parsed directly. The relational field exists in the geometry—the pattern recognition below still applies.`);
    lines.push('');
  }

  // ============================================
  // NEW: CONSTITUTIONAL TEXTURE (Vocabulary-Shaped)
  // ============================================
  if (shapingA || shapingB) {
    const textureLines = generateRelationalTextureDescription(nameA, nameB, shapingA, shapingB);
    if (textureLines.length > 0) {
      lines.push(...textureLines);
    }
  }

  // ============================================
  // SECTION 2: POLARITY MAPPING (Bidirectional)
  // ============================================
  lines.push(`### 2. Polarity Mapping`);
  lines.push('');

  // A → B perspective
  lines.push(`**${nameA} → ${nameB}**`);
  lines.push('');
  if (sigA.summary !== 'chart signature unavailable') {
    lines.push(`From ${nameB}'s perspective, ${nameA} may present as ${sigA.summary.toLowerCase()}. This often reads as a particular quality—${sigA.sun ? `the ${sigA.sun} core` : 'the core pattern'} filtered through ${sigA.rising ? `${sigA.rising} presentation` : 'the rising sign'}. ${nameB} might experience ${nameA} as someone who ${sigA.sun === 'Leo' || sigA.sun === 'Aries' || sigA.sun === 'Sagittarius' ? 'carries noticeable presence when engaged' : sigA.sun === 'Cancer' || sigA.sun === 'Scorpio' || sigA.sun === 'Pisces' ? 'holds depth beneath the surface' : sigA.sun === 'Taurus' || sigA.sun === 'Virgo' || sigA.sun === 'Capricorn' ? 'moves with deliberate intention' : 'navigates through responsive awareness'}.`);
  } else {
    lines.push(`${nameA}'s pattern, as ${nameB} may encounter it, carries its own rhythm and timing. The specific quality depends on how the natal geometry expresses in practice.`);
  }
  lines.push('');

  // B → A perspective
  lines.push(`**${nameB} → ${nameA}**`);
  lines.push('');
  if (sigB.summary !== 'chart signature unavailable') {
    lines.push(`From ${nameA}'s perspective, ${nameB} may present as ${sigB.summary.toLowerCase()}. ${nameA} might experience ${nameB} as someone who ${sigB.sun === 'Leo' || sigB.sun === 'Aries' || sigB.sun === 'Sagittarius' ? 'brings initiating energy when activated' : sigB.sun === 'Cancer' || sigB.sun === 'Scorpio' || sigB.sun === 'Pisces' ? 'tracks emotional undercurrents' : sigB.sun === 'Taurus' || sigB.sun === 'Virgo' || sigB.sun === 'Capricorn' ? 'grounds through practical presence' : 'reads the relational space before moving'}. ${sigB.moon ? `The ${sigB.moon} Moon may add ${sigB.moon === 'Sagittarius' || sigB.moon === 'Gemini' || sigB.moon === 'Aquarius' ? 'a restless, exploratory quality to emotional expression' : sigB.moon === 'Cancer' || sigB.moon === 'Taurus' || sigB.moon === 'Pisces' ? 'a need for emotional security and continuity' : 'its own emotional coloring'}.` : ''}`);
  } else {
    lines.push(`${nameB}'s pattern, as ${nameA} may encounter it, carries its own distinct signature. The specific quality emerges through repeated interaction.`);
  }
  lines.push('');

  // ============================================
  // SECTION 3: TENSION ARCHITECTURE
  // ============================================
  lines.push(`### 3. Tension Architecture`);
  lines.push('');

  if (synastryMandates.mandates.length > 0) {
    lines.push(`The following high-charge aspects describe where the two patterns tend to activate each other. These represent pressure lines—not problems, but areas where energy concentrates.`);
    lines.push('');

    synastryMandates.mandates.forEach((mandate, index) => {
      const ownerA = mandate.archetypes.a.owner || nameA;
      const ownerB = mandate.archetypes.b.owner || nameB;
      const orb = mandate.geometry.orbDegrees.toFixed(1);
      const aspectType = mandate.geometry.aspectType;

      lines.push(`**${String.fromCharCode(97 + index)}) ${ownerA}'s ${mandate.archetypes.a.planet} ${aspectType} ${ownerB}'s ${mandate.archetypes.b.planet}** *(${orb}° orb)*`);
      lines.push('');
      // Use conditional language
      const pressureDesc = mandate.fieldPressure.replace(/\. This is/g, '. This often reads as').replace(/This creates/g, 'This may create');
      lines.push(pressureDesc);
      lines.push('');
      // Use conditional language for map translation
      const mapDesc = mandate.mapTranslation.replace(/You /g, 'The pattern suggests ').replace(/they /g, 'they may ');
      lines.push(mapDesc);
      lines.push('');
    });
  } else {
    lines.push(`Synastry aspects could not be parsed from the provided geometry. The tension architecture between ${nameA} and ${nameB} exists in the cross-chart data, but I cannot translate it into specific pressure lines without aspect information.`);
    lines.push('');
    lines.push(`The individual patterns above still apply. For the relational dynamics, you might explore how ${nameA}'s ${sigA.sun || 'Sun'} energy meets ${nameB}'s ${sigB.sun || 'Sun'} energy in practice—where does activation occur? Where does friction surface?`);
    lines.push('');
  }

  // ============================================
  // SECTION 4: INTEGRATION BLUEPRINT
  // ============================================
  lines.push(`### 4. Integration Blueprint`);
  lines.push('');

  lines.push(`**${nameA}'s position in this field:**`);
  if (sigA.summary !== 'chart signature unavailable') {
    lines.push(`${nameA}'s pattern (${sigA.summary}) may function as ${sigA.rising === 'Scorpio' || sigA.rising === 'Capricorn' || sigA.rising === 'Virgo' ? 'a container—someone who holds and processes before revealing' : sigA.rising === 'Aries' || sigA.rising === 'Leo' || sigA.rising === 'Sagittarius' ? 'an initiator—someone who often moves first and adjusts later' : sigA.rising === 'Libra' || sigA.rising === 'Gemini' || sigA.rising === 'Aquarius' ? 'a reader—someone who scans the field before committing' : 'a stabilizer—someone who seeks consistent ground'}. Growth edges in this relational field may involve ${sigA.sun === 'Leo' || sigA.sun === 'Aries' ? 'allowing vulnerability to surface earlier rather than waiting for perfect conditions' : sigA.sun === 'Scorpio' || sigA.sun === 'Cancer' ? 'experimenting with transparency when the protective instinct wants to close' : 'noticing where habitual patterns might be updated through this connection'}.`);
  } else {
    lines.push(`${nameA}'s growth edges in this field may involve noticing which habitual patterns serve the connection and which might be ready for updating.`);
  }
  lines.push('');

  lines.push(`**${nameB}'s position in this field:**`);
  if (sigB.summary !== 'chart signature unavailable') {
    lines.push(`${nameB}'s pattern (${sigB.summary}) may function as ${sigB.rising === 'Libra' || sigB.rising === 'Gemini' || sigB.rising === 'Aquarius' ? 'a mirror—someone who reflects the relational space clearly' : sigB.rising === 'Aries' || sigB.rising === 'Leo' || sigB.rising === 'Sagittarius' ? 'a catalyst—someone who tends to accelerate movement' : sigB.rising === 'Cancer' || sigB.rising === 'Pisces' || sigB.rising === 'Scorpio' ? 'a depth-seeker—someone who tracks what lies beneath the surface' : 'a grounding presence—someone who values consistency'}. Growth edges may involve ${sigB.sun === 'Aries' || sigB.sun === 'Sagittarius' ? 'honoring how much the other person values depth and continuity—slowing pace when needed' : sigB.sun === 'Cancer' || sigB.sun === 'Pisces' ? "allowing the other person's timing without interpreting distance as rejection" : 'finding the rhythm that serves both patterns rather than defaulting to familiar habits'}.`);
  } else {
    lines.push(`${nameB}'s growth edges in this field may involve discovering which aspects of their pattern meet ${nameA}'s pattern productively and where adjustment serves.`);
  }
  lines.push('');

  // Closing
  lines.push('---');
  lines.push('');
  lines.push(`*This mirror reflects pattern, not prediction. The geometry describes tendencies that may or may not express in your actual experience. Track how these dynamics actually play out—your lived evidence calibrates the map.*`);

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
 * Optimized: lazy mandate generation, cached lookups, early exits
 */
export function processMirrorDirective(payload: InputPayload): {
  success: boolean;
  geometry_validation: GeometryValidation;
  narrative_sections: {
    solo_mirror_a?: string;
    solo_mirror_b?: string;
    relational_engine?: string;
    weather_overlay?: string;
  };
  intimacy_tier?: string | null;
  report_kind?: string;
  error?: string;
  diagnostics?: string[];
} {

  // Fast path: validate format first
  // Accept both 'mirror_directive_json' and 'mirror-symbolic-weather-v1' formats
  const validFormats = ['mirror_directive_json', 'mirror-symbolic-weather-v1'];
  const payloadFormat = typeof payload._format === 'string' ? payload._format : 'mirror_directive_json';
  if (!validFormats.includes(payloadFormat)) {
    return {
      success: false,
      geometry_validation: { valid: false, reason: 'missing_person_a', details: 'Invalid payload format' },
      narrative_sections: {},
      error: `Invalid format: expected one of ${validFormats.join(', ')}, got ${payload._format}`
    };
  }

  console.log('[PoeticBrain] Processing Mirror Directive', { format: payloadFormat });


  // Stamp persona excerpt (best-effort, non-blocking)
  try {
    const globalAny = global as any;
    const excerpt = globalAny.__RAVEN_CALDER_PERSONA_EXCERPT__;
    if (excerpt && typeof excerpt === 'string') {
      payload.provenance ??= {};
      payload.provenance.persona_excerpt ??= excerpt;
      payload.provenance.persona_excerpt_source ??= {
        source: 'RavenCalder_Corpus',
        file: 'ravencalder-persona-excerpt.txt',
        generated_at: new Date().toISOString(),
      };
    }
  } catch {
    // noop
  }

  // Parse directive once - cache results
  const directive = parseMirrorDirective(payload);
  const { isRelational, personA, personB, geometry, intimacyTier, reportKind } = directive;
  const calibration = calibrateForIntimacyTier(intimacyTier);

  // Pre-compute names (used multiple times)
  const nameA = personA?.name || 'Person A';
  const nameB = personB?.name || 'Person B';
  const chartA = geometry.chartA || {};
  const chartB = geometry.chartB;

  // Extract constitutional texture for vocabulary shaping
  // This shapes HOW Raven speaks without naming the Big Five framework
  const { textureA, textureB, shapingA, shapingB } = extractConstitutionalTexture(payload, chartA, chartB);

  // Build narratives object
  const narratives: {
    solo_mirror_a?: string;
    solo_mirror_b?: string;
    relational_engine?: string;
    weather_overlay?: string;
  } = {};


  console.log('[PoeticBrain] Geometry Stats', {
    personA: !!personA,
    chartA_aspects: chartA.aspects?.length || 0,
    hasPersonB: !!personB,
    chartB_aspects: chartB?.aspects?.length || 0,
    isRelational,
    synastryAspects: geometry.synastryAspects?.length || 0,
    synastryComputed: geometry.synastryComputed || false,
  });

  // ============================================================================
  // GEOMETRY GATE: Per FIELD → MAP → VOICE protocol, halt if geometry is invalid
  // If synastry is required but missing, MAP layer cannot proceed
  // ============================================================================
  const aspectsACount = chartA.aspects?.length ?? 0;
  const aspectsBCount = chartB?.aspects?.length ?? 0;
  const synastryCount = geometry.synastryAspects?.length ?? 0;

  // Perform geometry validation
  let geometryValidation: GeometryValidation = { valid: true };

  if (!personA) {
    geometryValidation = { valid: false, reason: 'missing_person_a', details: 'person_a is null or undefined' };
  } else if (!personA.name) {
    geometryValidation = { valid: false, reason: 'missing_person_a_name', details: 'person_a.name is missing' };
  } else if (isRelational && synastryCount === 0 && !geometry.synastryComputed) {
    // Relational mode requires synastry aspects - this is the CRITICAL gate
    geometryValidation = {
      valid: false,
      reason: 'missing_synastry_for_relational',
      details: `Relational reading requested but synastry aspects could not be parsed (0 cross-chart aspects found)`
    };
  } else if (aspectsACount === 0 && (!isRelational || aspectsBCount === 0)) {
    geometryValidation = { valid: false, reason: 'missing_both_aspects', details: 'No natal aspects could be parsed for either chart' };
  }

  // If validation failed, return early with halt message - DO NOT PROCEED TO VOICE
  if (!geometryValidation.valid) {
    console.warn('[PoeticBrain] GEOMETRY GATE HALT:', geometryValidation);

    const haltMessage = `## Mirror Halted: Data Unavailable

I tried to open this reading, but the geometry couldn't be parsed completely.

**What's missing:** ${(geometryValidation as any).details || 'Required chart data'}

**Recovery options:**
- Return to Math Brain and regenerate the chart with "Export to Poetic Brain"
- Verify all birth data fields (date, time, location) are complete
- If this is a relational reading, ensure both charts are fully exported

I'm here when the coordinates arrive. You can still ask me general questions about patterns and navigation while we troubleshoot.

---

*This is a data availability issue, not an error in your chart. The MAP layer cannot proceed without valid geometry.*`;

    return {
      success: false,
      geometry_validation: geometryValidation,
      narrative_sections: { solo_mirror_a: haltMessage },
      intimacy_tier: intimacyTier,
      report_kind: reportKind,
      error: `Geometry validation failed: ${(geometryValidation as any).reason}`,
      diagnostics: [(geometryValidation as any).details || 'Geometry validation failed'],
    };
  }


  // Generate mandates only when needed (lazy evaluation)
  let mandatesA: ReturnType<typeof buildMandatesForChart> | null = null;
  let mandatesB: ReturnType<typeof buildMandatesForChart> | null = null;

  const getMandatesA = () => {
    if (!mandatesA) {
      mandatesA = buildMandatesForChart(nameA, chartA, { limit: 5 });
      console.log('[PoeticBrain] Mandates generated for A', { count: mandatesA.mandates.length });
    }
    return mandatesA;
  };


  const getMandatesB = () => {
    if (!mandatesB && chartB) {
      mandatesB = buildMandatesForChart(nameB, chartB, { limit: 5 });
      console.log('[PoeticBrain] Mandates generated for B', { count: mandatesB.mandates.length });
    }
    return mandatesB;
  };


  // Generate solo mirror for Person A (most common path)
  // DEFENSIVE LAYER 2: Graceful degradation when personA is missing or incomplete
  if (!personA || !personA.name) {
    // Generate informative fallback when person_a is missing entirely
    // This catches the case where the payload has person_a: null or person_a: {}
    narratives.solo_mirror_a = `## Solo Mirror: Chart Data Missing

I'm ready to generate your reading, but the chart geometry didn't arrive completely. This usually means:

- The Math Brain report wasn't fully generated
- There's a connection issue between systems  
- The birth data wasn't fully captured

**What you can do:**
- Return to Math Brain and regenerate your chart
- Check that all required fields (name, date, time, location) were filled
- If the issue persists, try refreshing the page

I'm here when you're ready. Feel free to ask questions in the meantime—I can still discuss patterns, archetypes, and general navigation.

If this keeps happening, you can describe the issue by typing "report issue" and I'll help you document it.

---

*This is a data availability issue, not an error in your chart.*`;
  } else {
    narratives.solo_mirror_a = generateSoloMirror(
      personA,
      chartA,
      calibration,
      getMandatesA().mandates
    );
  }

  // Generate Person B content only if relational
  if (isRelational && personB) {
    const mandatesBResult = getMandatesB();
    narratives.solo_mirror_b = generateSoloMirror(
      personB,
      chartB,
      calibration,
      mandatesBResult?.mandates || []
    );

    narratives.relational_engine = generateRelationalEngine(
      personA,
      personB,
      geometry,
      calibration,
      shapingA,
      shapingB
    );
  }

  // Weather overlay - only if data present
  const weatherSource = payload.symbolic_weather_context ?? payload.seismograph;
  if (weatherSource) {
    narratives.weather_overlay = generateWeatherOverlay(weatherSource);
  }

  // ==========================================================================
  // SELF-DIAGNOSTIC: Report what went wrong if narratives are sparse
  // ==========================================================================
  const diagnosticIssues: string[] = [];

  // Check Person A narrative quality
  if (!narratives.solo_mirror_a || narratives.solo_mirror_a.includes('Chart Data Missing')) {
    diagnosticIssues.push('❌ Person A chart data incomplete or missing');
  } else if (narratives.solo_mirror_a.length < 200) {
    diagnosticIssues.push('⚠️ Person A narrative is unusually short');
  }

  // Check mandate generation
  const mandatesACount = mandatesA !== null ? (mandatesA as { mandates: any[] }).mandates.length : 0;


  if (mandatesACount === 0 && personA?.name) {

    diagnosticIssues.push(`❌ No mandates generated for ${personA.name} - aspect data may be missing or in wrong format`);
  }

  // Check relational content if expected
  if (isRelational) {
    if (!personB?.name) {
      diagnosticIssues.push('❌ Relational mode requested but Person B name is missing');
    }
    if (!narratives.solo_mirror_b) {
      diagnosticIssues.push('❌ Person B solo mirror failed to generate');
    }
    if (!narratives.relational_engine) {
      diagnosticIssues.push('❌ Relational engine narrative failed to generate');
    }
    const synastryCount = geometry.synastryAspects?.length ?? 0;
    if (synastryCount === 0) {
      diagnosticIssues.push('⚠️ No synastry aspects found - cross-chart analysis will be limited');
    } else if (geometry.synastryComputed) {
      // Positive note: synastry was computed internally
      console.log(`[PoeticBrain] ✓ Synastry computed internally: ${synastryCount} cross-chart aspects`);
    }
  }

  // Check chart geometry (reusing aspectsACount/aspectsBCount from earlier validation)
  if (aspectsACount === 0) {
    diagnosticIssues.push(`❌ Person A chart has 0 aspects - this is the likely cause of empty readings`);
  }
  if (isRelational && aspectsBCount === 0) {
    diagnosticIssues.push(`❌ Person B chart has 0 aspects`);
  }

  // Log diagnostics (always, for server-side visibility)
  if (diagnosticIssues.length > 0) {
    console.warn('[PoeticBrain] Self-Diagnostic Report:', diagnosticIssues);
  } else {
    console.log('[PoeticBrain] ✓ All checks passed', {
      soloA: narratives.solo_mirror_a?.length ?? 0,
      soloB: narratives.solo_mirror_b?.length ?? 0,
      relational: narratives.relational_engine?.length ?? 0,
      weather: narratives.weather_overlay?.length ?? 0,
      synastrySource: geometry.synastryComputed ? 'computed_internally' : 'pre_provided',
    });
  }

  // If there are critical issues, append a diagnostic summary to the narrative
  const criticalIssues = diagnosticIssues.filter(i => i.startsWith('❌'));
  if (criticalIssues.length > 0 && narratives.solo_mirror_a) {
    const diagnosticNote = `

---

**🔧 Diagnostic Report** (What I couldn't process)

${criticalIssues.join('\n')}

This isn't a problem with your chart—it's a data-flow issue between Math Brain and Poetic Brain. The fix is usually one of:
1. Re-export the report from Math Brain (use "Export to Poetic Brain")
2. Ensure all birth data fields are complete
3. If using a saved report, try generating a fresh one

Type "help" if you'd like me to walk you through recovery options.`;

    narratives.solo_mirror_a += diagnosticNote;
  }

  return {
    success: true,
    geometry_validation: { valid: true },
    narrative_sections: narratives,
    intimacy_tier: intimacyTier,
    report_kind: reportKind,
    diagnostics: diagnosticIssues.length > 0 ? diagnosticIssues : undefined,
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
