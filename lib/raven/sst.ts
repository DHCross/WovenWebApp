import type { QuerentRole, ContextGateState } from './context-gate';

export type SSTTag = 'WB' | 'ABE' | 'OSR';

/** Source of resonance confirmation for data provenance */
export type SSTSource = 'self' | 'observer';

export interface SSTProbe {
  id: string;           // unique id for the probe (e.g., uuid or hash)
  text: string;         // the mirror line / hypothesis
  tag?: SSTTag;         // user feedback classification
  committed?: boolean;  // true when confirmed by user
  createdAt: string;    // ISO timestamp
  committedAt?: string; // ISO timestamp when committed
  source?: SSTSource;   // who confirmed: self (subject) or observer (third party)
}

export interface SessionTurn {
  role: 'user' | 'raven';
  content: string;
  createdAt: string;
}

export interface SessionSuggestion {
  text: string;
  acknowledged?: boolean;
  createdAt: string;
}

export type ConversationMode = 'explanation' | 'clarification' | 'suggestion' | 'meta_feedback';

export interface SessionSSTLog {
  probes: SSTProbe[];
  turnCount?: number;
  history?: SessionTurn[];
  suggestions?: SessionSuggestion[];
  relationalModes?: Record<string, 'relational' | 'parallel'>;
  pendingRelationalChoice?: { contextId: string;[key: string]: any };
  failedContexts?: Set<string>;
  metaConversationMode?: ConversationMode;
  validationActive?: boolean;
  /** Context Gate state - tracks querent identity and role */
  contextGate?: ContextGateState;
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

export function commitProbe(probe: SSTProbe, tag: SSTTag, source?: SSTSource): SSTProbe {
  return { ...probe, tag, committed: true, committedAt: new Date().toISOString(), source };
}

/** Determine SST source based on querent role */
export function getSSTSource(querentRole?: QuerentRole): SSTSource {
  if (!querentRole || querentRole === 'unconfirmed') return 'self'; // default assumption
  if (querentRole === 'observer') return 'observer';
  return 'self'; // self_a, self_b, both are all primary sources
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
