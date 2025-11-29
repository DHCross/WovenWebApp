/**
 * Validation Probes and Conversation Mode Detection
 * 
 * Functions for generating SST validation probes and detecting
 * the current conversation mode in Raven sessions.
 */

import type { SessionSSTLog, SessionSuggestion, ConversationMode } from './sst';

// Pattern arrays for conversation mode detection
const CLARIFICATION_PATTERNS: RegExp[] = [
  /\bcan you clarify\b/i,
  /\bcan you explain\b/i,
  /\bwhat do you mean\b/i,
  /\bi don't (quite\s+)?understand\b/i,
  /\bthat (doesn't|does not) (fit|land|make sense)\b/i,
  /\bhelp me understand\b/i,
  /\bso you're saying\b/i,
  /\bdoes that mean\b/i,
];

const SUGGESTION_PATTERNS: RegExp[] = [
  /\b(feature|product|app) suggestion\b/i,
  /\bhere'?s an idea\b/i,
  /\bmaybe you could\b/i,
  /\bi (recommend|suggest)\b/i,
  /\bit would help if\b/i,
  /\bcan you (add|change|update|adjust|stop)\b/i,
  /\bshould (we|you)\b.*\b(instead|maybe)\b/i,
  /\bwould it be possible to\b/i,
];

const META_FEEDBACK_PATTERNS: RegExp[] = [
  /\b(this|your)\s+(system|app|build|code|program|programming)\b.*\b(broken|bug|issue|problem|stuck|loop|failing)\b/i,
  /\bpoetic brain\b.*\b(stuck|loop|broken)\b/i,
  /\bperplexity\b.*\b(issue|problem|bug)\b/i,
  /\bnetlify\b.*\b(error|fail|deploy)\b/i,
  /\bresonance check\b.*\b(stop|turn off|stuck)\b/i,
  /\b(stop|quit)\b.*\b(poetry|metaphor|lyric)\b/i,
  /\brespond\b.*\bplain(ly)?\b/i,
  /\bno more\b.*\b(poetry|metaphor)\b/i,
  /\bfrustrated\b.*\bwith\b.*\byou\b/i,
  /\bwhy are you\b.*\bdoing\b.*(this|that)\b/i,
  /\byour programming\b/i,
  /\bthis feels like a loop\b/i,
  /\bmeta feedback\b/i,
  /\bdebug\b/i,
];

/**
 * Fallback probes by conversation mode
 */
export const FALLBACK_PROBE_BY_MODE: Record<ConversationMode, string> = {
  explanation: 'Where do you feel this pattern pressing most in your day right now?',
  clarification: 'What would help me restate this so it feels truer to your lived experience?',
  suggestion: 'How should we carry this suggestion forward so it genuinely supports you?',
  meta_feedback: 'What specific adjustment would make this feel more useful right now?',
};

/**
 * Detect the current conversation mode based on user input
 */
export function detectConversationMode(text: string, session: SessionSSTLog): ConversationMode {
  const input = text.trim();
  if (!input) return 'explanation';

  if (META_FEEDBACK_PATTERNS.some((pattern) => pattern.test(input))) {
    return 'meta_feedback';
  }

  if (SUGGESTION_PATTERNS.some((pattern) => pattern.test(input))) {
    return 'suggestion';
  }

  const looksLikeClarification =
    CLARIFICATION_PATTERNS.some((pattern) => pattern.test(input)) ||
    /\b(resonate|land|fit|accurate|familiar)\b/i.test(input);

  if (looksLikeClarification) {
    const lastProbe = [...(session.probes || [])].reverse().find((probe) => !probe.committed);
    if (lastProbe) {
      return 'clarification';
    }
  }

  return 'explanation';
}

/**
 * Record a suggestion in the session log
 */
export function recordSuggestion(session: SessionSSTLog, text: string): void {
  const normalized = text.trim();
  if (!normalized) return;
  if (!Array.isArray(session.suggestions)) {
    session.suggestions = [] as SessionSuggestion[];
  }
  const alreadyStored = session.suggestions.some(
    (entry) => entry.text === normalized,
  );
  if (!alreadyStored) {
    session.suggestions.push({
      text: normalized,
      acknowledged: true,
      createdAt: new Date().toISOString(),
    });
  }
}

/**
 * Generate validation probes for Mirror Directive responses
 */
export function generateValidationProbe(
  narrative: string,
  mirrorContent: any
): { question: string; type: string; options: string[] } | null {
  // Extract key themes from the narrative to create targeted probes
  const isRelational = mirrorContent.person_b || mirrorContent._required_sections?.includes('person_b');

  const soloProbes = [
    {
      question: "Does what I've described about your core patterns resonate with your lived experience—does this feel Within Boundary (WB), or does it miss the mark entirely (OSR)?",
      type: "sst_resonance",
      options: ["Within Boundary (WB)", "At Boundary Edge (ABE)", "Outside Symbolic Range (OSR)"]
    },
    {
      question: "When I describe these primary tensions, do you recognize them in your actual daily life, or does this feel like symbolic interpretation without lived grounding?",
      type: "behavioral_check",
      options: ["Recognizable in lived experience", "Partially recognizable", "Not recognizable in life"]
    },
    {
      question: "Does this mapping of your blueprint to lived experience feel accurate, or are we drifting into metaphor without behavioral anchoring?",
      type: "integrity_check",
      options: ["Grounded in both geometry and behavior", "Straddling the line", "Drifting into metaphor"]
    }
  ];

  const relationalProbes = [
    {
      question: "Does this description of your relational dynamics match what actually happens between you, or is this symbolic speculation without behavioral evidence?",
      type: "relational_sst",
      options: ["Matches lived relational patterns", "Partially matches", "Outside lived experience"]
    },
    {
      question: "When I describe [specific dynamic], does that reflect observable behavior in your relationship, or is this ungrounded interpretation?",
      type: "relational_behavioral",
      options: ["Grounded in actual behavior", "Mixed", "Ungrounded interpretation"]
    }
  ];

  const probes = isRelational ? [...soloProbes, ...relationalProbes] : soloProbes;

  // Select a probe based on narrative content (simple rotation for now)
  const probeIndex = narrative.length % probes.length;
  return probes[probeIndex] || probes[0];
}
