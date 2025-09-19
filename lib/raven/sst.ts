export type SSTTag = 'WB' | 'ABE' | 'OSR';

export interface SSTProbe {
  id: string;           // unique id for the probe (e.g., uuid or hash)
  text: string;         // the mirror line / hypothesis
  tag?: SSTTag;         // user feedback classification
  committed?: boolean;  // true when confirmed by user
  createdAt: string;    // ISO timestamp
  committedAt?: string; // ISO timestamp when committed
}

export interface SessionSSTLog {
  probes: SSTProbe[];
}

export interface SessionScores {
  accuracy: number;      // WB / (WB+ABE+OSR)
  edgeCapture: number;   // ABE / (WB+ABE)
  clarity: number;       // 1 - (unclear / total) — placeholder, set to 1 for now
  counts: { WB: number; ABE: number; OSR: number; total: number };
}

export function createProbe(text: string, id: string): SSTProbe {
  return { id, text, createdAt: new Date().toISOString() };
}

export function commitProbe(probe: SSTProbe, tag: SSTTag): SSTProbe {
  return { ...probe, tag, committed: true, committedAt: new Date().toISOString() };
}

export function scoreSession(log: SessionSSTLog): SessionScores {
  const counts = { WB: 0, ABE: 0, OSR: 0, total: 0 };
  for (const p of log.probes) {
    if (!p.tag) continue;
    counts.total += 1;
    if (p.tag === 'WB') counts.WB += 1;
    if (p.tag === 'ABE') counts.ABE += 1;
    if (p.tag === 'OSR') counts.OSR += 1;
  }
  const denom = Math.max(1, counts.WB + counts.ABE + counts.OSR);
  const denomEdge = Math.max(1, counts.WB + counts.ABE);
  const accuracy = counts.WB / denom;
  const edgeCapture = counts.ABE / denomEdge;
  const clarity = 1; // placeholder until we track unclear prompts
  return { accuracy, edgeCapture, clarity, counts };
}
