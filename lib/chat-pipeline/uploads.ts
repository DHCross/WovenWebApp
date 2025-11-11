// Shared helpers for detecting and parsing report/journal uploads in Poetic Brain.

type UploadParseResult =
  | { type: 'json'; content: string }
  | { type: 'journal'; content: string }
  | { type: 'none'; content: string };

const HTML_ENTITY_MAP: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
};

function decodeHtmlEntities(input: string): string {
  return input.replace(/(&lt;|&gt;|&amp;|&quot;|&#39;)/g, (entity) => HTML_ENTITY_MAP[entity] ?? entity);
}

function extractPreBlock(text: string): string | null {
  const preMatch = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (!preMatch) return null;
  return decodeHtmlEntities(preMatch[1]).trim();
}

export function extractJSONFromUpload(text: string): string | null {
  const decoded = extractPreBlock(text);
  if (!decoded) return null;

  try {
    JSON.parse(decoded);
    return decoded;
  } catch {
    return null;
  }
}

export function extractTextFromUpload(text: string): string {
  const decoded = extractPreBlock(text);
  return decoded ?? text;
}

export function isJSONReportUpload(text: string): boolean {
  const decoded = extractPreBlock(text);
  if (!decoded) return false;

  if (decoded.includes('"_format"') && decoded.includes('"mirror_directive_json"')) return true;
  if (decoded.includes('"_format"') && decoded.includes('"mirror-symbolic-weather-v1"')) return true;
  if (decoded.includes('"schema"') && decoded.includes('"wm-fieldmap-v1"')) return true;
  if (decoded.includes('"schema"') && decoded.includes('"wm-map-v1"')) return true;
  if (decoded.includes('"schema"') && decoded.includes('"wm-field-v1"')) return true;

  return decoded.includes('"balance_meter"') && decoded.includes('"context"');
}

export function isJournalUpload(text: string): boolean {
  const decoded = extractPreBlock(text);
  if (decoded) {
    const looksJson = decoded.startsWith('{') && decoded.endsWith('}');
    if (!looksJson && decoded.length > 80) return true;
  }
  return text.includes('Uploaded Journal Entry:') || text.includes('Journal Entry:');
}

export function isTimedInput(text: string): boolean {
  if (isJSONReportUpload(text)) return true;

  const plain = text.replace(/<[^>]*>/g, ' ').toLowerCase();
  if (
    /(transit|window|during|between|over the (last|next)|this week|today|tomorrow|yesterday|from\s+\w+\s+\d{1,2}\s*(–|-|to)\s*\w*\s*\d{1,2})/.test(
      plain,
    )
  ) {
    return true;
  }
  if (/(\b\d{4}-\d{2}-\d{2}\b)|(\b\d{1,2}\/\d{1,2}\/\d{2,4}\b)/.test(plain)) return true;
  if (
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s*\d{1,2}\s*(–|-|to)\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)?\s*\d{1,2}/.test(
      plain,
    )
  ) {
    return true;
  }
  return false;
}

export function parseUpload(text: string): UploadParseResult {
  const json = extractJSONFromUpload(text);
  if (json) return { type: 'json', content: json };

  if (isJournalUpload(text)) {
    return { type: 'journal', content: extractTextFromUpload(text) };
  }

  return { type: 'none', content: text };
}
