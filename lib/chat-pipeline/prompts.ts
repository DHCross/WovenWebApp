// lib/chat-pipeline/prompts.ts
// TODO: Move all complex prompt assembly logic here from app/api/chat/route.ts
// (e.g., v11 protocol prefix, Core Flow structure, branch-specific prompts)
export function buildPrompt(analysisPrompt: string, isFirstTurn: boolean): string {
  const v11Prefix = `MANDATORY: Follow v11 "Warm-Core, Rigor-Backed" protocol...`; // (full text)
  return `${v11Prefix}\n\n${analysisPrompt}\n\n[SESSION META] first_turn=${isFirstTurn}`;
}
