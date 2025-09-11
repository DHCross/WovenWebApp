// lib/chat-pipeline/classification.ts
// TODO: Move all response classification logic here from app/api/chat/route.ts
// (e.g., checkForOSRIndicators, checkForClearAffirmation, classifyUserResponse, etc.)
export function classifyUserResponse(text: string): 'CLEAR_WB' | 'PARTIAL_ABE' | 'OSR' | 'UNCLEAR' {
  // Placeholder
  if (text.includes('yes')) return 'CLEAR_WB';
  if (text.includes('no')) return 'OSR';
  return 'UNCLEAR';
}
