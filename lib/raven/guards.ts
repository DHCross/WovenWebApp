export const NO_CONTEXT_GUIDANCE = `I can’t responsibly read you without a chart or report context. Two quick options:

• Generate Math Brain on the main page (geometry only), then click “Ask Raven” to send the report here
• Or ask for “planetary weather only” to hear today’s field without personal mapping

If you already have the JSON export file—the download from Math Brain or AstroSeek—paste or upload it and I’ll proceed.`;

export const ASTROSEEK_REFERENCE_GUIDANCE = `I hear you mentioning an AstroSeek export. To bring it in:

• Click “Upload report” and drop the AstroSeek download—the JSON export file with your geometry
• Or open the export and copy/paste the entire table or text here

Once that geometry is included, I can mirror you accurately.`;

const ASTROSEEK_REGEX = /astro\s*-?\s*seek/i;
const GEOMETRY_MARKERS = /\d{1,2}°|\basc\b|\bmc\b|\b\d{1,2}(st|nd|rd|th)\s+house\b|\borb:\s*\d/i;

export function referencesAstroSeekWithoutGeometry(text: string): boolean {
  if (!text) return false;
  if (!ASTROSEEK_REGEX.test(text)) return false;
  return !GEOMETRY_MARKERS.test(text);
}

import { stampProvenance } from './provenance';

/**
 * Pick a contextual hook based on content patterns
 */
export function pickHook(t: string): string | undefined {
  // Check for JSON report uploads with specific conditions
  if (t.includes('"balance_meter"') && t.includes('"magnitude"')) {
    try {
      const jsonMatch = t.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        const magnitude = data.balance_meter?.magnitude?.value;
        const directionalBias = data.balance_meter?.directional_bias?.value ?? data.balance_meter?.directional_bias;

        if (typeof magnitude === 'number' && typeof directionalBias === 'number') {
          if (magnitude >= 4 && directionalBias <= -4) {
            return 'Crisis & Structural Overload · Maximum Threshold';
          } else if (magnitude >= 3 && directionalBias <= -3) {
            return 'Pressure & Restriction · Compression Field';
          }
        }
      }
    } catch (e) {
      // Fall through to text-based detection
    }
  }

  if (/dream|sleep/i.test(t)) return 'Duty & Dreams · Saturn ↔ Neptune';
  if (/private|depth|shadow/i.test(t)) return 'Private & Piercing · Mercury ↔ Pluto';
  if (/restless|ground/i.test(t)) return 'Restless & Grounded · Pluto ↔ Moon';
  return undefined;
}

/**
 * Build a guard response for AstroSeek mentions without geometry
 */
export function buildAstroSeekGuardDraft(): Record<string, string> {
  return {
    picture: 'Got your AstroSeek mention—one more step.',
    feeling: 'I need the actual export contents to mirror accurately.',
    container: 'Option 1 · Click "Upload report" and drop the AstroSeek download (JSON or text).',
    option: 'Option 2 · Open the export and paste the full table or text here.',
    next_step: 'Once the geometry is included, I can read you in detail.'
  };
}

/**
 * Create a standard guard payload with provenance
 */
export function createGuardPayload(
  source: string,
  guidance: string,
  draft: Record<string, any>
): { guard: true; guidance: string; draft: Record<string, any>; prov: Record<string, any> } {
  const prov = stampProvenance({ source });
  return {
    guard: true as const,
    guidance,
    draft,
    prov
  };
}
