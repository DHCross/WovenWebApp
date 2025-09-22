export const NO_CONTEXT_GUIDANCE = `I can’t responsibly read you without a chart or report context. Two quick options:

• Generate Math Brain on the main page (geometry only), then click “Ask Raven” to send the report here
• Or ask for “planetary weather only” to hear today’s field without personal mapping

If you already have a JSON report, paste or upload it and I’ll proceed.`;

export const ASTROSEEK_REFERENCE_GUIDANCE = `I hear you mentioning an AstroSeek export. To bring it in:

• Click “Upload report” and drop the AstroSeek download (JSON or text)
• Or open the export and copy/paste the entire table or text here

Once that geometry is included, I can mirror you accurately.`;

const ASTROSEEK_REGEX = /astro\s*-?\s*seek/i;
const GEOMETRY_MARKERS = /\d{1,2}°|\basc\b|\bmc\b|\b\d{1,2}(st|nd|rd|th)\s+house\b|\borb:\s*\d/i;

export function referencesAstroSeekWithoutGeometry(text: string): boolean {
  if (!text) return false;
  if (!ASTROSEEK_REGEX.test(text)) return false;
  return !GEOMETRY_MARKERS.test(text);
}
