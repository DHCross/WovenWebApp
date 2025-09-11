// lib/chat-pipeline/uploads.ts
// TODO: Move all upload parsing logic here from app/api/chat/route.ts
// (e.g., isJSONReportUpload, extractJSONFromUpload, isJournalUpload, etc.)
export function parseUpload(text: string): { type: 'json' | 'journal' | 'none', content: any } {
  // Placeholder
  if (text.includes('{')) return { type: 'json', content: JSON.parse(text) };
  return { type: 'none', content: text };
}
