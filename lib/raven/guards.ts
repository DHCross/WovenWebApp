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
const PERSONAL_READING_PATTERN = /\b(my|me|I)\b.*\b(chart|reading|birth|natal|astrology)\b/i;

export function referencesAstroSeekWithoutGeometry(text: string): boolean {
  if (!text) return false;
  if (!ASTROSEEK_REGEX.test(text)) return false;
  return !GEOMETRY_MARKERS.test(text);
}

export const requestsPersonalReading = (input: string): boolean => {
  return PERSONAL_READING_PATTERN.test(input);
};

export const buildNoContextGuardCopy = () => {
  return {
    picture: "I can see you're asking for a personal reading.",
    feeling: "To do that accurately, I need your astrological geometry.",
    container: "Option 1 · Go to Astro-Seek.com, run your natal chart, and download the JSON export.",
    option: "Option 2 · Click 'Upload report' below and drop that file in.",
    next_step: "Once your chart is uploaded, I can give you a full reading.",
  };
};
