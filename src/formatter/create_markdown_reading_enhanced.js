// Enhanced markdown formatter with FIELD → MAP → VOICE implementation
// Uses extracted legacy functions for Polarity Cards and Safe Lexicon

import { generatePolarityCards } from '../../lib/legacy/polarityHelpers.js';
import { getMagnitudeDescriptor, getVolatilityDescriptor } from '../../lib/legacy/safeLexicon.js';

/**
 * @param {Object} ctx
 * @param {Object} ctx.geo - normalized geometry (placements/aspects/summary)
 * @param {Object} ctx.prov - provenance: reader_id, subject_name, reference_date, integration_mode, relational_context
 * @param {Object} ctx.options - options: mode, include_persona_context, map_source
 * @returns {string} markdown
 */
export default function createMarkdownReadingEnhanced(ctx = {}) {
  const prov = ctx.prov || {};
  const geo = ctx.geo || {};
  const opts = ctx.options || {};
  const relational = opts.relational || {};

  const subject = prov.subject_name || 'Subject';
  const mode = opts.mode || 'Reader+Reflection';
  const date = prov.reference_date || '';
  const aspectsCount = Array.isArray(geo.aspects) ? geo.aspects.length : 0;
  const map = opts.map_source || '';

  const header = `# ${subject} — ${mode}\n\n`;
  const preface = `**Reference**: ${date}${map ? ` • Map: ${map}` : ''}`;
  const summary = `\n\n_Aspects detected_: ${aspectsCount}.`;

  // Relationship Context block (if available)
  const relCtx = prov.relational_context || null;
  const isRelational = !!relCtx;
  
  const relHeader = relCtx
    ? `\n\n## Relationship Context\n- type: ${relCtx.relationship_type ?? relCtx.type ?? '—'}\n- intimacy_tier: ${relCtx.intimacy_tier ?? '—'}\n- contact_state: ${relCtx.contact_state ?? '—'}\n`
    : '';

  // Dialogue Voice (placeholder for now - Priority 3 Safe Step)
  const dialogue = relCtx
    ? `\n\n## Dialogue Voice\nThe shared field speaks in integration tones: directness meeting receptivity. (Awaiting Priority 3 implementation)\n`
    : '';

  // Polarity Cards - NOW USING EXTRACTED LEGACY FUNCTIONS
  // This generates FIELD (somatic) + VOICE (behavioral) with MAP backstage-only
  const polarityData = { person_a: { aspects: geo.aspects || [] } };
  const polarityCards = generatePolarityCards(polarityData, isRelational);

  // Symbolic climates with Safe Lexicon descriptors
  const shared = relational.shared_symbolic_climate
    ? `\n\n### Shared Symbolic Climate\n${formatSymbolicClimate(relational.shared_symbolic_climate)}`
    : '';
  const cross = relational.cross_symbolic_climate
    ? `\n\n### Cross Symbolic Climate\n${formatSymbolicClimate(relational.cross_symbolic_climate)}`
    : '';

  return (
    `${header}${preface}${summary}` +
    relHeader +
    dialogue +
    '\n\n' + polarityCards +
    shared +
    cross +
    `\n\n## Agency Hygiene\n\nIf this doesn't land, it doesn't count (OSR valid).\nAll phrasing remains conditional (may/might/could).\nThe SST classification depends entirely on your lived experience confirmation.\n`
  );
}

/**
 * Format symbolic climate with Safe Lexicon descriptors
 * @param {Object} climate - Climate data with magnitude, valence, volatility
 * @returns {string} Formatted climate description
 */
function formatSymbolicClimate(climate) {
  const mag = climate.magnitude ?? 0;
  const val = climate.valence ?? 0;
  const vol = climate.volatility ?? 0;
  
  const magDesc = getMagnitudeDescriptor(mag);
  const volDesc = getVolatilityDescriptor(vol);
  
  const valenceDir = val > 0 ? '🌞 supportive' : val < 0 ? '🌑 restrictive' : '🌗 neutral';
  
  return `- **Magnitude**: ${magDesc.emoji} ${magDesc.label} (${mag.toFixed(1)}) — ${magDesc.description}\n` +
         `- **Valence**: ${valenceDir} (${val.toFixed(1)})\n` +
         `- **Volatility**: ${volDesc.emoji} ${volDesc.label} (${vol.toFixed(1)}) — ${volDesc.description}\n`;
}
