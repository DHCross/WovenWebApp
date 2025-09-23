interface RenderOptions {
  geo: Record<string, any> | null;
  prov: Record<string, any>;
  options?: Record<string, any>;
  conversational?: boolean;
}

function isSimpleGreeting(message: string): boolean {
  if (!message) return false;
  const trimmed = message.trim();
  if (!trimmed) return false;

  const sanitized = trimmed
    .replace(/^[\s.,!?;:-]+/g, "")
    .replace(/[\s.,!?;:-]+$/g, "")
    .toLowerCase();

  if (!sanitized) return false;

  const rawTokens = sanitized.split(/\s+/).filter(Boolean);
  const tokens = rawTokens
    .map((token) => token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter(Boolean);

  if (tokens.length === 0 || tokens.length > 3) {
    return false;
  }

  const base = tokens[0];
  const greetingRoots = new Set([
    "hi",
    "hello",
    "hey",
    "hiya",
    "yo",
    "sup",
    "ahoy",
  ]);
  const allowedSuffixes = new Set([
    "there",
    "ya",
    "yall",
    "y'all",
    "everyone",
    "folks",
    "friend",
    "friends",
    "team",
    "raven",
  ]);

  if (greetingRoots.has(base)) {
    if (tokens.length === 1) return true;
    return tokens.slice(1).every((token) => allowedSuffixes.has(token));
  }

  if (base === "greetings") {
    if (tokens.length === 1) return true;
    return tokens.slice(1).every((token) => allowedSuffixes.has(token));
  }

  if (base === "good" && tokens.length >= 2) {
    const dayParts = new Set(["morning", "afternoon", "evening", "day", "night"]);
    if (!dayParts.has(tokens[1])) return false;
    if (tokens.length === 2) return true;
    return tokens.length === 3 && allowedSuffixes.has(tokens[2]);
  }

  return false;
}

/**
 * Renders a "Shareable Mirror" draft in the standard Raven Calder format.
 * (picture → feeling → container → option → next step)
 * @param {RenderOptions} params - The rendering parameters.
 * @returns A structured draft object.
 */
export async function renderShareableMirror({ geo, prov, options, conversational = false }: RenderOptions): Promise<Record<string, any>> {
  // If conversational mode is requested, call the LLM to produce an uncanned, natural-language response
  if (conversational) {
    const userMessage = options?.userMessage || '';
    if (isSimpleGreeting(userMessage)) {
      const simpleReply = "Hey. Good to see you here. Whenever you're ready, let me know what's on your mind.";
      return {
        raw: simpleReply,
        mirror_suppressed: true,
        appendix: { provenance_source: prov?.source },
      };
    }
    const prompt = `You are Poetic Brain, an empathetic, direct assistant. The user says: "${userMessage}". Reply naturally in plain language, then also provide a short structured mirror in five labeled parts: PICTURE, FEELING, CONTAINER, OPTION, NEXT_STEP. Keep the structure clear but use natural, non-form-like language for the primary reply.`;
    // Dynamic import to avoid loading heavy LLM provider at module evaluation time
    let full = '';
    try {
      const mod = await import('@/lib/llm');
      const generateText = mod.generateText as (p: string, o?: any) => Promise<string>;
      full = await generateText(prompt, { personaHook: 'poetic' });
    } catch (err) {
      // Fallback: if LLM is unavailable, produce a short human-friendly canned reply
      full = `I'm here and listening. ${userMessage ? `You said: "${userMessage}".` : ''} I notice a quiet moment — take one breath.\nPICTURE: A quiet room at dusk.\nFEELING: Contemplative.\nCONTAINER: Just this moment, right here.\nOPTION: You can either explore this feeling further or shift your focus to something practical.\nNEXT_STEP: Take one deep breath.`;
    }
    // Attempt to extract structured five parts from the model output if present; otherwise create fallback stubs
    const parts = { picture: '', feeling: '', container: '', option: '', next_step: '' } as Record<string,string>;
    // simple extraction: look for labels in the generated text
    const labelRegex = /PICTURE[:\-\s]*([^\n]+)|FEELING[:\-\s]*([^\n]+)|CONTAINER[:\-\s]*([^\n]+)|OPTION[:\-\s]*([^\n]+)|NEXT[_ ]?STEP[:\-\s]*([^\n]+)/gi;
    let m: RegExpExecArray | null;
    while ((m = labelRegex.exec(full)) !== null) {
      if (m[1]) parts.picture = parts.picture || m[1].trim();
      if (m[2]) parts.feeling = parts.feeling || m[2].trim();
      if (m[3]) parts.container = parts.container || m[3].trim();
      if (m[4]) parts.option = parts.option || m[4].trim();
      if (m[5]) parts.next_step = parts.next_step || m[5].trim();
    }

    // If extraction failed, populate friendly fallbacks using first sentence heuristics
    if (!parts.picture) parts.picture = full.split('\n')[0].slice(0,120);
    if (!parts.feeling) parts.feeling = full.split('\n')[1] ? full.split('\n')[1].slice(0,80) : 'Reflective.';
    if (!parts.container) parts.container = 'This moment.';
    if (!parts.option) parts.option = 'You can either explore this further or take a practical step.';
    if (!parts.next_step) parts.next_step = 'Take one deep breath.';

    return {
      raw: full,
      picture: parts.picture,
      feeling: parts.feeling,
      container: parts.container,
      option: parts.option,
      next_step: parts.next_step,
      appendix: { provenance_source: prov?.source }
    };
  }

  // Non-conversational (geometry-driven) rendering
  return {
    picture: "A compass needle spinning, then finding north.",
    feeling: "Clarity.",
    container: "The next 24 hours.",
    option: "You can act on this new direction, or you can wait and gather more information.",
    next_step: "Write down the first action that comes to mind.",
    appendix: {
      geometry_summary: geo ? "Geometry data processed." : "No geometry data provided.",
      provenance_source: prov.source,
    }
  };
}
