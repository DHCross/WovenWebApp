// Stub enhanced markdown formatter.
// Replace this with your real narrative generator.

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
  const relHeader = relCtx
    ? `\n\n## Relationship Context\n- type: ${relCtx.relationship_type ?? relCtx.type ?? '—'}\n- intimacy_tier: ${relCtx.intimacy_tier ?? '—'}\n- contact_state: ${relCtx.contact_state ?? '—'}\n`
    : '';

  // Dialogue Voice (placeholder)
  const dialogue = relCtx
    ? `\n\n## Dialogue Voice\nThe shared field speaks in integration tones: directness meeting receptivity. (placeholder)\n`
    : '';

  // Dual Polarity Cards (placeholder)
  const polarity = relCtx
    ? `\n\n## Dual Polarity Cards\n- Axis A vs Axis B (placeholder)\n`
    : '';

  // Symbolic climates (placeholders)
  const shared = relational.shared_symbolic_climate
    ? `\n\n### Shared Symbolic Climate\n- magnitude: ${relational.shared_symbolic_climate.magnitude ?? '—'}\n- valence: ${relational.shared_symbolic_climate.valence ?? '—'}\n- volatility: ${relational.shared_symbolic_climate.volatility ?? '—'}\n`
    : '';
  const cross = relational.cross_symbolic_climate
    ? `\n\n### Cross Symbolic Climate\n- magnitude: ${relational.cross_symbolic_climate.magnitude ?? '—'}\n- valence: ${relational.cross_symbolic_climate.valence ?? '—'}\n- volatility: ${relational.cross_symbolic_climate.volatility ?? '—'}\n`
    : '';

  return (
    `${header}${preface}${summary}` +
    relHeader +
    dialogue +
    polarity +
    shared +
    cross +
    `\n\n*This is a placeholder narrative. Replace the formatter at src/formatter/create_markdown_reading_enhanced.js with your full interpretive generator.*\n`
  );
}
