import { APPROVED, type Label } from './labels';

type Violation = {
  term: string;
  message: string;
};

type GuardResult = {
  allowed: boolean;
  sanitized: string;
  violations: Violation[];
};

const UNC0DIFIED_PATTERNS: Array<{ regex: RegExp; replacement: string; message: string }> = [
  {
    regex: /storm\s+system/gi,
    replacement: 'Compression Field',
    message: 'Uncodified climate noun "Storm System" replaced with approved terminology.',
  },
  {
    regex: /surge\s+collapse/gi,
    replacement: 'Diagnostic Surge',
    message: 'Composite label "Surge Collapse" is forbidden in v3.1 lexicon.',
  },
];

export function guardLexicon(text: string | null | undefined): GuardResult {
  const source = (text ?? '').trim();
  let sanitized = source;
  const violations: Violation[] = [];

  for (const pattern of UNC0DIFIED_PATTERNS) {
    if (pattern.regex.test(sanitized)) {
      violations.push({ term: pattern.regex.source, message: pattern.message });
      sanitized = sanitized.replace(pattern.regex, pattern.replacement);
    }
  }

  return {
    allowed: violations.length === 0,
    sanitized,
    violations,
  };
}

export function assertApprovedLabel(raw: string): Label {
  const check = guardLexicon(raw);
  const candidate = check.allowed ? raw : check.sanitized;
  if ((APPROVED as readonly string[]).includes(candidate as Label)) {
    return candidate as Label;
  }
  return 'Diagnostic Surge';
}
