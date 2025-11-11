const PERSONAL_READING_PATTERNS: RegExp[] = [
  /\b(read|mirror|interpret|analyze|look at)\b[^.]{0,120}\b(me|my)\b/i,
  /\b(me|my)\b[^.]{0,120}\b(chart|natal|birth\s+chart|placements|geometry|astrology|transits|report)\b/i,
  /\bpersonal\s+(reading|mirror)\b/i,
  /\bwhat do you see in my\b/i,
  /\btell me what you see\b[^.]{0,120}\b(me|my)\b/i,
  /\bbalance\s+meter\b/i,
  /\bsession\b[^.]{0,40}\bscore\b/i,
];

export function requestsPersonalReading(text: string): boolean {
  if (typeof text !== "string" || !text.trim()) {
    return false;
  }
  return PERSONAL_READING_PATTERNS.some((pattern) => pattern.test(text));
}

export { PERSONAL_READING_PATTERNS };
