/**
 * SRP Runtime Guards
 * Utility functions to safely access SRP fields with fallbacks
 * Prevents undefined text from leaking into narrative
 */

import type { HookObject } from '../../poetic-brain/src/index';

/**
 * Safely get hinge phrase with fallback
 */
export function getSafeHingePhrase(hook: HookObject): string | null {
  return hook.srp?.hingePhrase || null;
}

/**
 * Safely get restoration cue with fallback
 */
export function getSafeRestorationCue(hook: HookObject): string | null {
  return hook.srp?.restorationCue || null;
}

/**
 * Safely get collapse mode with fallback
 */
export function getSafeCollapseMode(hook: HookObject): string | null {
  return hook.srp?.collapseMode || null;
}

/**
 * Safely get element weave with fallback
 */
export function getSafeElementWeave(hook: HookObject): string | null {
  return hook.srp?.elementWeave || null;
}

/**
 * Check if hook has valid SRP enrichment
 */
export function hasSRPEnrichment(hook: HookObject): boolean {
  return !!(hook.srp && hook.srp.blendId && hook.srp.hingePhrase);
}

/**
 * Check if hook has shadow reference
 */
export function hasShadowReference(hook: HookObject): boolean {
  return !!(hook.srp?.shadowId && hook.srp.restorationCue);
}

/**
 * Extract all restoration cues from hooks (filters out undefined)
 */
export function extractRestorationCues(hooks: HookObject[]): string[] {
  return hooks
    .map(h => getSafeRestorationCue(h))
    .filter((cue): cue is string => cue !== null && cue.length > 0);
}

/**
 * Extract all hinge phrases from hooks (filters out undefined)
 */
export function extractHingePhrases(hooks: HookObject[]): string[] {
  return hooks
    .map(h => getSafeHingePhrase(h))
    .filter((phrase): phrase is string => phrase !== null && phrase.length > 0);
}

/**
 * Safe formatter for hook with SRP data
 * Returns label only if SRP data is missing
 */
export function formatHookWithSRP(hook: HookObject): string {
  const label = hook.label || 'Unknown aspect';
  const hingePhrase = getSafeHingePhrase(hook);

  if (hingePhrase) {
    return `${label} – ${hingePhrase}`;
  }

  return label;
}
