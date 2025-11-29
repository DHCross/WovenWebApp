/**
 * Utility to sanitize a Mirror Directive JSON content based on resolvedOptions.
 * Ensures that when an explicit 'solo' mode is requested, person_b is removed
 * from the content sent to the Poetic Brain while preserving it in a backstage key
 * for provenance/auditing.
 */
export interface SanitizedResult {
  content: any;
  removed: boolean;
}

export function sanitizeDirectiveForMode(content: any, resolvedOptions: Record<string, any>): SanitizedResult {
  const out = JSON.parse(JSON.stringify(content || {}));
  const mode = resolvedOptions?.mode || resolvedOptions?.reportType || null;
  const forceMode = resolvedOptions?.forceMode || null;
  const explicitSolo = mode === 'solo' || forceMode === 'solo' || (resolvedOptions?.solo === true);

  if (!explicitSolo) {
    return { content: out, removed: false };
  }

  if (out.person_b) {
    // Preserve backstage copy
    out._backstage_person_b = out.person_b;
    delete out.person_b;
  }

  // Ensure mirror contract signals solo
  out.mirror_contract = out.mirror_contract || {};
  out.mirror_contract.is_relational = false;
  // Hint template to solo
  out._template_hint = 'solo_mirror';

  return { content: out, removed: true };
}

export default sanitizeDirectiveForMode;
