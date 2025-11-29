/**
 * Raven Route Helpers
 * 
 * Utility functions for formatting, truncating, and parsing content
 * in the Raven/Poetic Brain system.
 */

import type { SessionTurn } from './sst';

export const MAX_CONTEXT_CHARS = 1800;
export const MAX_HISTORY_TURNS = 6;

/**
 * Truncate content to a maximum length, adding ellipsis if needed
 */
export function truncateContextContent(content: string, limit: number = MAX_CONTEXT_CHARS): string {
  if (content.length <= limit) return content;
  return content.slice(0, limit).trimEnd() + ' …';
}

/**
 * Format report contexts for inclusion in LLM prompts
 */
export function formatReportContextsForPrompt(contexts: Record<string, any>[]): string {
  if (!Array.isArray(contexts) || contexts.length === 0) return '';
  return contexts
    .slice(-3)
    .map((ctx, idx) => {
      const name = typeof ctx.name === 'string' && ctx.name.trim() ? ctx.name.trim() : `Report ${idx + 1}`;
      const typeLabel = typeof ctx.type === 'string' && ctx.type.trim() ? ctx.type.trim().toUpperCase() : 'UNKNOWN';
      const summary = typeof ctx.summary === 'string' ? ctx.summary.trim() : '';
      const relocationText = ctx.relocation?.label ? `Relocation: ${ctx.relocation.label}` : '';
      const rawContent = typeof ctx.content === 'string' ? ctx.content.trim() : '';
      let snippet = rawContent ? truncateContextContent(rawContent) : '';
      if (snippet) {
        const looksJson = /^[\s\r\n]*[{[]/.test(snippet);
        snippet = looksJson ? `\`\`\`json\n${snippet}\n\`\`\`` : snippet;
      }
      return [
        `Report ${idx + 1} · ${typeLabel} · ${name}`,
        summary ? `Summary: ${summary}` : '',
        relocationText,
        snippet,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

/**
 * Format conversation history for inclusion in LLM prompts
 */
export function formatHistoryForPrompt(history?: SessionTurn[]): string {
  if (!history || history.length === 0) return '';
  const recent = history.slice(-MAX_HISTORY_TURNS);
  return recent
    .map((turn) => {
      const speaker = turn.role === 'raven' ? 'Raven' : 'User';
      return `${speaker}: ${turn.content}`;
    })
    .join('\n');
}

/**
 * Extract a probe question from Raven's response text
 * Looks for the last question mark in the response
 */
export function extractProbeFromResponse(responseText: string): string | null {
  const lines = responseText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (line.endsWith('?') && line.length <= 200) {
      return line;
    }
  }
  const match = responseText.match(/([^.?!\n]{3,200}\?)(?!.*\?)/s);
  return match ? match[1].trim() : null;
}

/**
 * Safely parse JSON with error handling
 */
export function safeParseJSON(value: string): { ok: boolean; data: any | null } {
  if (typeof value !== 'string') return { ok: false, data: null };
  try {
    return { ok: true, data: JSON.parse(value) };
  } catch {
    return { ok: false, data: null };
  }
}
