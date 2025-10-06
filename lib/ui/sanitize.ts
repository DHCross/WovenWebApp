// Final-stage sanitization to keep internal directives out of user artifacts

const BANNED_TOKENS = [
  'YOU ARE RAVEN CALDER',
  'MANDATORY STRUCTURE',
  'EXECUTE NOW',
  'This is your work order',
  'DO NOT DEVIATE'
];

const BANNED_HEADINGS = [
  'ANALYSIS DIRECTIVE',
  'RAVEN CALDER SYNTHESIS INSTRUCTIONS',
  'AI SYNTHESIS INSTRUCTIONS'
];

export function scrubInternalDirectives(text: string): string {
  if (!text) return text;

  let out = text;

  // Remove blocks starting at banned headings (H1/H2) through next H2 or end
  for (const heading of BANNED_HEADINGS) {
    const re = new RegExp(
      String.raw`(^|\n)#{1,2}\s*${heading}[^\n]*[\s\S]*?(?=(\n##\s)|$)`,
      'gi'
    );
    out = out.replace(re, '\n');
  }

  // Remove direct banned tokens anywhere they appear
  for (const token of BANNED_TOKENS) {
    const re = new RegExp(token.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
    out = out.replace(re, '');
  }

  // Clean up excess blank lines created by removals
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

export function containsBannedTokens(text: string): boolean {
  return (
    !!text &&
    (BANNED_TOKENS.some((t) => text.includes(t)) ||
      BANNED_HEADINGS.some((h) => new RegExp(String.raw`(^|\n)#{1,2}\s*${h}`, 'i').test(text)))
  );
}

export const bannedTokens = { BANNED_TOKENS, BANNED_HEADINGS };
