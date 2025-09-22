import { NextRequest } from 'next/server';
import { shapeVoice, pickClimate } from '../../../lib/persona';
import { generateStream } from '../../../lib/llm';
import { canMakeRequest, trackRequest } from '../../../lib/usage-tracker';
import { followUpGenerator, ChartContext } from '../../../lib/followup-generator';
import { naturalFollowUpFlow, PingResponse, SessionContext } from '../../../lib/natural-followup-flow';
import { buildNoContextGuardCopy } from '@/lib/guard/no-context';

// Simple in-memory token bucket (dev only). Not production safe for multi-instance.
const buckets = new Map<string,{t:number; ts:number}>();
function take(ip:string, max=10, windowMs=60_000){
  const now = Date.now();
  let b = buckets.get(ip);
  if(!b){ b={t:max, ts:now}; buckets.set(ip,b);} else if(now - b.ts > windowMs){ b.t = max; b.ts = now; }
  if(b.t<=0) return false; b.t--; return true;
}

// Check if user message indicates OSR (doesn't feel familiar/resonate)
function checkForOSRIndicators(text: string): boolean {
  const lower = text.toLowerCase();
  const osrPhrases = [
    'doesn\'t feel familiar',
    'doesn\'t resonate',
    'not me',
    'doesn\'t sound like me',
    'not familiar',
    'doesn\'t ring true',
    'not quite right',
    'off the mark',
    'doesn\'t match',
    'not accurate',
    'not really me'
  ];
  
  return osrPhrases.some(phrase => lower.includes(phrase));
}

// Check if user is clearly affirming/confirming resonance
function checkForClearAffirmation(text: string): boolean {
  const lower = text.toLowerCase();
  const clearAffirmPhrases = [
    'that\'s familiar',
    'feels familiar',
    'that resonates',
    'resonates with me',
    'exactly',
    'that\'s me',
    'spot on',
    'that hits',
    'so true',
    'absolutely',
    'definitely me',
    'that\'s accurate',
    'yes, that\'s right',
    'that\'s it exactly',
    'i just said it was', // Critical addition
    'it was',
    'it is',
    'that is',
    'yes it is',
    'yes that is',
    'that\'s right',
    'correct',
    'true'
  ];
  
  // Also check for simple "yes" at start of response
  if (/^yes\b/i.test(text.trim())) return true;
  
  return clearAffirmPhrases.some(phrase => lower.includes(phrase));
}

// Check if user is giving partial/uncertain confirmation
function checkForPartialAffirmation(text: string): boolean {
  const lower = text.toLowerCase();
  const partialPhrases = [
    'sort of',
    'kind of',
    'partly',
    'somewhat',
    'maybe',
    'i think so',
    'possibly',
    'in a way',
    'to some extent'
  ];
  
  return partialPhrases.some(phrase => lower.includes(phrase));
}

// Enhanced response classification
function classifyUserResponse(text: string): 'CLEAR_WB' | 'PARTIAL_ABE' | 'OSR' | 'UNCLEAR' {
  if (checkForClearAffirmation(text)) return 'CLEAR_WB';
  if (checkForPartialAffirmation(text)) return 'PARTIAL_ABE';
  if (checkForOSRIndicators(text)) return 'OSR';
  return 'UNCLEAR';
}

// Detect meta-signal complaints about being asked again / repetition
function isMetaSignalAboutRepetition(text: string): boolean {
  const lower = text.toLowerCase();
  const phrases = [
    'you asked',
    'you are asking again',
    'why are you asking',
    'i already said',
    'i just said',
    'as i said',
    'what i had just explained',
    'repeating myself',
    'asked again',
    'repeat the question',
    'i literally just',
    'already confirmed',
    "i've already answered",
    'well, yeah',
  ];
  return phrases.some(p => lower.includes(p));
}

function isJSONReportUpload(text: string): boolean {
  // Detect presence of embedded JSON in a <pre> block regardless of UI labels.
  const preMatch = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (!preMatch) return false;
  const decoded = preMatch[1]
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
  return decoded.includes('"balance_meter"') && decoded.includes('"context"');
}

function extractJSONFromUpload(text: string): string | null {
  try {
    // Extract JSON from the HTML pre tag
    const preMatch = text.match(/<pre[^>]*>(.*?)<\/pre>/s);
    if (preMatch) {
      // Decode HTML entities and clean up
      const jsonStr = preMatch[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"');
      
      // Try to parse to validate
      JSON.parse(jsonStr);
      return jsonStr;
    }
  } catch (e) {
    console.log('Failed to extract JSON from upload:', e);
  }
  return null;
}

function pickHook(t:string){
  // Check for JSON report uploads with specific conditions
  if (t.includes('"balance_meter"') && t.includes('"magnitude"')) {
    try {
      const jsonMatch = t.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        const magnitude = data.balance_meter?.magnitude?.value;
        const valence = data.balance_meter?.valence?.value ?? data.balance_meter?.valence_bounded;

        if (typeof magnitude === 'number' && typeof valence === 'number') {
          if (magnitude >= 4 && valence <= -4) {
            return 'Crisis & Structural Overload · Maximum Threshold';
          } else if (magnitude >= 3 && valence <= -3) {
            return 'Pressure & Restriction · Storm Systems';
          }
        }
      }
    } catch (e) {
      // Fall through to text-based detection
    }
  }
  
  if(/dream|sleep/i.test(t)) return 'Duty & Dreams · Saturn ↔ Neptune';
  if(/private|depth|shadow/i.test(t)) return 'Private & Piercing · Mercury ↔ Pluto';
  if(/restless|ground/i.test(t)) return 'Restless & Grounded · Pluto ↔ Moon';
  return undefined;
}

function encode(obj:any){ return new TextEncoder().encode(JSON.stringify(obj)+"\n"); }

function isJournalUpload(text: string): boolean {
  // Prefer detecting a non-JSON <pre> text block; fall back to label heuristics.
  const preMatch = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (preMatch) {
    const decoded = preMatch[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .trim();
    // Treat as journal if it's not JSON but reasonably long prose
    const looksJson = decoded.startsWith('{') && decoded.endsWith('}');
    if (!looksJson && decoded.length > 80) return true;
  }
  return text.includes('Uploaded Journal Entry:') || text.includes('Journal Entry:');
}

function extractTextFromUpload(text: string): string {
  try {
    // Extract content from the HTML pre tag
    const preMatch = text.match(/<pre[^>]*>(.*?)<\/pre>/s);
    if (preMatch) {
      // Decode HTML entities and clean up
      return preMatch[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .trim();
    }
  } catch (e) {
    console.log('Failed to extract text from upload:', e);
  }
  return text;
}

// Determine whether input includes a timing layer (transits/periods/comparisons)
function isTimedInput(text: string): boolean {
  // Treat JSON Balance reports as timed
  if (isJSONReportUpload(text)) return true;

  const plain = text.replace(/<[^>]*>/g, ' ').toLowerCase();
  // Obvious transit/timing keywords
  if (/(transit|window|during|between|over the (last|next)|this week|today|tomorrow|yesterday|from\s+\w+\s+\d{1,2}\s*(–|-|to)\s*\w*\s*\d{1,2})/.test(plain)) {
    return true;
  }
  // Date-like patterns (YYYY-MM-DD or MM/DD/YYYY) or month-name ranges
  if (/(\b\d{4}-\d{2}-\d{2}\b)|(\b\d{1,2}\/\d{1,2}\/\d{2,4}\b)/.test(plain)) return true;
  if (/(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s*\d{1,2}\s*(–|-|to)\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)?\s*\d{1,2}/.test(plain)) return true;
  return false;
}

export const runtime = 'nodejs';

export async function POST(req: NextRequest){
  // Top-level variable declarations for chat logic
  const body = await req.json();
  const { persona, messages = [] } = body;
  const reportContexts: any[] = body?.reportContexts || [];
  
  const user = [...messages].reverse().find((m:any)=> m.role==='user');
  const text = user?.content || user?.html || 'Hello';
  
  const isTechnicalQuestion = /\b(are you|what are you|how do you work|gemini|api|technical|test|version|system)\b/i.test(text);
  const isGreeting = /^(hello|hi|hey|good morning|good afternoon|good evening|greetings)\b/i.test(text.trim());
  
  const ravenMsgs = Array.isArray(messages) ? messages.filter((m:any)=> m.role==='raven') : [];
  const ravenCount = ravenMsgs.length;
  const isFirstTurn = ravenCount <= 1; // only the intro greeting so far

  let analysisPrompt = text;

  // TODO[REFactor]: This handler exceeds recommended logical size. Extract logic into separate lib modules.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if(!take(ip)){
    return new Response(JSON.stringify({error:'rate_limited', retry_in:'60s'}), {status:429, headers:{'Content-Type':'application/json'}});
  }

  if (isTechnicalQuestion || isGreeting) {
    const hook = pickHook(text);
    const climate = undefined;
    const shapedIntro = shapeVoice('Staying close to what you said…', {hook, climate, section:'mirror'}).split(/\n+/)[0];
    let response = '';
    if (text.toLowerCase().includes('gemini')) {
      response = 'Yes, I am currently using Google\'s Gemini API. It\'s a pleasure to connect.';
    } else if (isGreeting) {
      response = 'Hello! I\'m Raven Calder, and I\'m here to help you see yourself more clearly. I\'m ready when you are.';
    } else {
      response = 'I\'m Raven Calder, a symbolic mirror that uses Google\'s Gemini API to provide reflective insights. How can I help you today?';
    }
    const responseBody = new ReadableStream<{ }|Uint8Array>({
      async start(controller){
        controller.enqueue(encode({climate, hook, delta: shapedIntro + response}));
        controller.close();
      }
    });
    return new Response(responseBody, { headers: { 'Content-Type': 'text/plain; charset=utf-8' }});
  }

  // Determine whether we have any chart/report context available
  const hasAnyReportContext = Array.isArray(reportContexts) && reportContexts.length > 0;
  
  // Enforce simple usage limits (in-memory)
  const allowance = canMakeRequest();
  if(!allowance.allowed){
    return new Response(JSON.stringify({error: allowance.reason}), {status:429, headers:{'Content-Type':'application/json'}});
  }

  // Weather-only intent detection (non-personal field read)
  const wantsWeatherOnly = /\b(weather|sky today|planetary (weather|currents)|what's happening in the sky)\b/i.test(text);

  // Detect if user is asking for specific personal astrological readings/analysis
  const wantsPersonalReading = /\b(my chart|my birth|personal reading|mirror|balance meter|read me|analyze me|what do you see in me|my aspects|my placements|my transits)\b/i.test(text);

  // MODIFIED GATE: Only block personal astrological readings without chart context, allow general conversation
  if (!hasAnyReportContext && wantsPersonalReading && !wantsWeatherOnly) {
    const hook = pickHook(text);
    const climate = undefined;
    const guardCopy = buildNoContextGuardCopy();
    const shapedIntro = shapeVoice(guardCopy.picture, {hook, climate, section:'mirror'}).split(/\n+/)[0];

    const responseBody = new ReadableStream<{ }|Uint8Array>({
      async start(controller){
        controller.enqueue(encode({climate, hook, delta: shapedIntro+"\n\n"+guardCopy.guidance}));
        controller.close();
      }
    });
    return new Response(responseBody, { headers: { 'Content-Type': 'text/plain; charset=utf-8' }});
  }

  // WEATHER-ONLY BRANCH: Provide a neutral field read without personal claims when explicitly asked
  if (!hasAnyReportContext && wantsWeatherOnly) {
    const hook = pickHook(text);
    const climate = pickClimate(text);
    const greetings = [
      'With you—reading the sky’s weather…',
      'Here with today’s currents—no personal map applied…'
    ];
    const shapedIntro = shapeVoice(greetings[Math.floor(Math.random()*greetings.length)], {hook, climate, section:'mirror'}).split(/\n+/)[0];
    const weatherNote = `
Field-only read (no natal overlay):
• Mood/valence: treat as background conditions, not fate
• Use this like a tide chart—choose times that support your aims

If you want this mapped to you, generate Math Brain first and send the report here.`.trim();

    const v11 = `
Give a short, plain-language summary of the current planetary weather in two parts: (1) what’s emphasized, (2) what that feels like behaviorally—in conditional phrasing. No metaphors about “you,” no personality claims, no advice. Keep to 5–7 sentences total.`;

    const enhancedPrompt = v11 + `\n\nUser words: ${text}`;
    const stream = generateStream(enhancedPrompt, { model: process.env.MODEL_PROVIDER, personaHook: hook });
    const responseBody = new ReadableStream<{ }|Uint8Array>({
      async start(controller){
        controller.enqueue(encode({climate, hook, delta: shapedIntro+"\n\n"+weatherNote+"\n\n"}));
        for await (const chunk of stream){
          controller.enqueue(encode({climate, hook, delta: chunk.delta}));
        }
        controller.close();
      }
    });
    return new Response(responseBody, { headers: { 'Content-Type': 'text/plain; charset=utf-8' }});
  }
  
  // Check for natural follow-up flow based on user response type
  const responseType = classifyUserResponse(text);
  
  // Mock session context (in production, this would be persisted)
  const mockSessionContext: SessionContext = {
    wbHits: [],
    abeHits: [],
    osrMisses: [],
    actorWeighting: 0,
    roleWeighting: 0,
    driftIndex: 0,
    sessionActive: true
  };
  
  // Generate natural follow-up based on response type
  if (responseType === 'CLEAR_WB') {
    const followUp = naturalFollowUpFlow.generateFollowUp({
      type: 'AFFIRM',
      content: text,
      originalMirror: text
    }, mockSessionContext);
    
    analysisPrompt = `The user clearly confirmed resonance: "${text}"

**AUTO-CLASSIFICATION: WB (Within Boundary)**
Log this as confirmed resonance. Do NOT ask for additional validation.

**TRANSITION TO ELABORATION:**
Instead of asking "does this feel true?", acknowledge the confirmation and pivot to depth exploration:

Examples:
- "Logged as WB: that resonance confirmed. Let's stay with how this pressure moves through you."
- "That lands—the coil is tightly wound. Where do you feel that tension most, in the body or more in the mind's looping?"
- "Confirmed as WB. Does the drive bring focus, or does it scatter you?"

Your response should:
1. Acknowledge the confirmed resonance 
2. Mirror back the structural pressure
3. Move into depth probing (how/where it shows up)
4. Skip any additional truth gates

User's clear affirmation: ${text}`;
    
  } else if (responseType === 'PARTIAL_ABE') {
    analysisPrompt = `The user gave partial confirmation: "${text}"

**CLASSIFICATION: ABE (At Boundary Edge)**
This needs clarification, not full repair. Ask for refinement:

"I'm logging this as ABE—partially resonant but needs fine-tuning. What part lands, and what feels off?"

User's partial response: ${text}`;
    
  } else if (responseType === 'OSR') {
    const followUp = naturalFollowUpFlow.generateFollowUp({
      type: 'OSR',
      content: text,
      originalMirror: text
    }, mockSessionContext);
    
    analysisPrompt = `The user indicated that something didn't resonate. Generate a response that includes this natural OSR probe: "${followUp.question}"

User's OSR response: ${text}

Your response should acknowledge their feedback and offer the choice-based clarification probe to convert the miss into diagnostic data. Keep it skippable and non-forcing.`;
    
  } else if (text.toLowerCase().includes('poetic card') || text.toLowerCase().includes('generate card')) {
    analysisPrompt = `The user is requesting a poetic card based on their session. Generate a visual card display showing:
- Resonance Pattern summary
- Score indicators (WB/ABE/OSR)
- Actor/Role composite guess
- Any drift flags
Do NOT generate a new poem. This is a summary card of what has already resonated.`;
    
  } else if (text.toLowerCase().includes('done') || text.toLowerCase().includes('finished') || text.toLowerCase().includes('session complete')) {
    const closure = naturalFollowUpFlow.generateSessionClosure();
    analysisPrompt = `The user is indicating they want to end this reading session. Generate a response that includes: "${closure.resetPrompt}"

This will reset the scorecard but not make you forget who you're talking to. Offer these options: ${closure.continuationOptions.join(', ')}`;
  } else {
    const lastRavenMessage = messages.filter((m: any) => m.role === 'raven').pop();
    const isResponseToProbe = lastRavenMessage && 
      (lastRavenMessage.html.includes('Does any of this feel familiar') ||
       lastRavenMessage.html.includes('Does this fit your experience') ||
       lastRavenMessage.html.includes('feel accurate') ||
       lastRavenMessage.html.includes('resonate'));

    if (isResponseToProbe) {
      if (isMetaSignalAboutRepetition(text)) {
        const reversed = [...messages].filter((m:any)=> m.role==='user').reverse();
        const previousUser = reversed[1];
        const prevText = previousUser?.content || previousUser?.html || '';
        const prevType = prevText ? classifyUserResponse(prevText) : 'UNCLEAR';

        if (prevType === 'CLEAR_WB') {
          analysisPrompt = `The user expressed irritation at being asked again (meta-signal), not new content: "${text}".

Preserve the prior classification: WB (Within Boundary). Do NOT re-open validation.

Respond with: Acknowledge the irritation + keep fidelity + deepen the original mirror. Avoid new symbolic images or psychologizing.

Example shape:
- "Logged as WB: you already confirmed. I hear the frustration in repeating. Let's stay with the coil itself—when you're stretched that thin, does the pressure feel more physical or more mental?"

Rules:
1) No additional "does this feel true?" gates
2) No motive analysis or personality inference
3) Mirror only structural pressure and pivot to somatic/behavioral deepening`;
        } else if (prevType === 'PARTIAL_ABE') {
          analysisPrompt = `The user commented on repetition (meta-signal), not new content: "${text}".

Preserve prior classification: ABE (At Boundary Edge). Do NOT re-open the main validation gate.

Respond with: Acknowledge the irritation + offer one focused refinement question about what part lands vs. what doesn't, using their words where possible.

Rules: no new metaphors, no psychoanalysis, keep it brief and user-led.`;
        } else if (prevType === 'OSR') {
          analysisPrompt = `The user commented on repetition (meta-signal): "${text}".

Preserve prior classification: OSR (Outside Symbolic Range). Do NOT analyze the meta-comment. Offer a minimal repair that uses their prior correction, then validate the repair only if they choose to engage.

Keep it skippable and brief; acknowledge the repetition irritation.`;
        } else {
          analysisPrompt = `Treat this as a meta-signal about repetition: "${text}".

Do not analyze it. Briefly acknowledge the irritation and ask one gentle, concrete deepening question about the previously discussed pressure (without re-validating).`;
        }
      } else {
        const probeResponseType = classifyUserResponse(text);
      
        if (probeResponseType === 'CLEAR_WB') {
          analysisPrompt = `The user clearly confirmed resonance to your probe: "${text}"

**AUTO-CLASSIFICATION: WB (Within Boundary)**
This is confirmed resonance. Log it immediately without additional validation.

**RESPONSE PROTOCOL:**
1. Acknowledge confirmation: "Logged as WB: that resonance confirmed."
2. Mirror back the structural pressure in somatic/behavioral terms
3. Pivot to depth exploration, NOT truth validation
4. Ask elaboration questions like:
   - "Where do you feel that tension most—in the body or mind?"
   - "Does this drive bring focus or scatter you?"
   - "How does this pressure move through your day?"

**DO NOT** ask "Does this feel true?" or any additional validation. The user already confirmed it.

User's clear confirmation: "${text}"`;
        
        } else if (probeResponseType === 'PARTIAL_ABE') {
          analysisPrompt = `The user gave partial confirmation to your probe: "${text}"

**CLASSIFICATION: ABE (At Boundary Edge)**
This needs refinement, not full repair.

**RESPONSE PROTOCOL:**
1. Log as ABE: "I'm logging this as ABE—partially resonant but needs fine-tuning."
2. Ask for clarification: "What part lands, and what feels off?"
3. Refine the image based on their feedback

User's partial response: "${text}"`;
        
        } else if (probeResponseType === 'OSR') {
          analysisPrompt = `The user redirected/contradicted your probe: "${text}"

**CLASSIFICATION: OSR (Outside Symbolic Range)**
This requires a repair branch with validation.

**RESPONSE PROTOCOL:**
1. State classification: "I'm logging that probe as OSR."
2. Acknowledge the miss: "I offered [original theme] but you're describing [their theme] instead."
3. Offer repair using their exact words: "Repair: [rephrase their clarification]"
4. Validate REPAIR only: "Does this repair feel true?" [Yes] [Partly] [No]

User's OSR response: "${text}"`;
        
        } else {
          analysisPrompt = `The user gave an unclear response to your probe: "${text}"

**CLASSIFICATION: UNCLEAR**
This needs gentle clarification to determine WB/ABE/OSR.

**RESPONSE PROTOCOL:**
Ask for clarification: "I want to make sure I'm tracking you—does the image I offered feel familiar, or does it miss the mark?"

User's unclear response: "${text}"`;
        }
      }
    } else {
        analysisPrompt = `This appears to be a request for astrological insight or general conversation that could benefit from symbolic reflection.

**MANDATORY: Deliver COMPLETE Core Flow structure in your response:**

1. **Resonance First:** "I see you as [stance image]: [felt qualities]. [polarity tension]."
2. **Recognition Layer:** "This may show up as [specific daily behavior/experience]"
3. **Typological Profile:** Behavioral lean + impulse patterns + polarity check (plain language only—no MBTI/function labels)
4. **Soft Vector Surfacing:** "Hidden push toward [drive], counterweight through [restraint]"
5. **SST Gate:** Ask ONE specific behavioral/somatic question, not generic "feel true?"

**CRITICAL:** Do NOT deliver just a metaphor + question. You must include ALL five Core Flow layers.

SESSION FLAG: FIRST_TURN = ${isFirstTurn ? 'TRUE' : 'FALSE'}
- If FIRST_TURN is TRUE (very first mirror after the intro), OMIT the SST Gate question entirely. End with a reflective close instead of a question.
- If FIRST_TURN is FALSE, END your response with EXACTLY ONE concrete question and nothing after it. Prefer this canonical line unless the context demands a somatic variant:
  "Does any of this feel familiar?"

User's input: "${text}"`;
    }
  }

  if (isJSONReportUpload(analysisPrompt)) {
    const reportData = extractJSONFromUpload(analysisPrompt);
    if (reportData) {
      analysisPrompt = `I've received a WovenWebApp JSON report. Please provide a complete Solo Mirror analysis based on this data:

${reportData}

Focus on completing any empty template sections with VOICE synthesis.`;
    }
  } else if (isJournalUpload(analysisPrompt)) {
    const journalContent = extractTextFromUpload(analysisPrompt);
    analysisPrompt = `I've received a journal entry for analysis. Please read this with your symbolic weather lens and provide insights into the patterns, emotional climate, and potential astrological correlates:

${journalContent}

Apply Recognition Layer analysis and provide conditional reflections that can be tested (SST protocol).`;
  }
  
  const hook = pickHook(analysisPrompt);
  const climate = isTimedInput(analysisPrompt) ? pickClimate(analysisPrompt) : undefined;
  const greetings = [
    'With you—taking a careful read…',
    'Staying close to what you said…',
    'Here with you. Reading the pattern…',
    'Holding what you said against the pattern…',
    'I’m tracking you—slowly, precisely…'
  ];
  const shapedIntro = shapeVoice(greetings[Math.floor(Math.random()*greetings.length)], {hook, climate, section:'mirror'}).split(/\n+/)[0];
  
  const v11PromptPrefix = `
MANDATORY: Follow the v11 "Warm-Core, Rigor-Backed" protocol EXACTLY:

1. ALWAYS start with "I see you as [stance image]: [felt qualities]. [concrete behavior]."
2. NO technical openings like "I've received..." or data summaries
3. Recognition of felt tension comes AFTER the warm greeting
4. Weather/climate is context, never the headline
5. Use everyday language, not jargon

CRITICAL CORE FLOW STRUCTURE - Always deliver ALL layers in sequence:

**Resonance First:** 
- Warm stance image with felt qualities and polarity tension

**Recognition Layer:**
- "This may show up as [daily behavior/experience]" - anchor the image in lived reality
- Use somatic/behavioral specifics, not abstract concepts

**Typological Profile (light touch):**
- Behavioral lean described in plain language (habits, choices, tells). Do NOT use MBTI or cognitive-function labels. No "Sensation/Intuition" or "Thinking/Feeling" wording.
- Impulse patterns: what triggers action vs. withdrawal
- Polarity check: name the exact tension poles

**Soft Vector Surfacing (when relevant):**
- "Hidden push toward [drive], counterweight through [restraint]"
- Keep planetary references subtle and conditional

**SST Gate:**
- Ask ONE specific behavioral/somatic question, not generic "feel true?"
- Examples: "Does this show up in your body as tension held tight, or more as a mental loop that won't quiet?"

Anti-psychologizing rule: Mirror structural pressure and behavior only. Avoid motive analysis, diagnoses, or personality typing.

First-turn rule: If this is the very first substantive mirror of a session, end with a reflective close (no question). Questions begin on later turns.

CRITICAL INTEGRATION RULE: When users share specific personal details (living situation, family circumstances, financial challenges, etc.), reflect back their ACTUAL words and circumstances rather than generic metaphors. For example:
- If they mention "living with elderly parents and disabled daughter" → acknowledge this specific caregiving reality
- If they mention "they pay rent but caregiving makes it hard to survive" → reflect this exact financial bind
- Avoid generic metaphors like "sturdy oak" when they've given you specific, vulnerable details to work with

Your response MUST begin with the warm recognition greeting AND include ALL Core Flow layers, not just a metaphor + question.
`;

  let contextAppendix = '';
  if (Array.isArray(reportContexts) && reportContexts.length > 0) {
    const compactList = reportContexts.slice(-4)
      .map((rc:any, idx:number) => `- [${rc.type}] ${rc.name}: ${rc.summary || ''}`.trim())
      .join('\n');
    contextAppendix = `\n\nSESSION CONTEXT (Compact Uploads)\n${compactList}\n\nUse these as background only. Prefer the user's live words. Do not restate the uploads; integrate gently where relevant.`;
  }

  const hasMirror = Array.isArray(reportContexts) && reportContexts.some((rc:any)=> rc.type==='mirror');
  const hasBalance = Array.isArray(reportContexts) && reportContexts.some((rc:any)=> rc.type==='balance');
  if (hasMirror && hasBalance) {
    analysisPrompt += `\n\nIntegration hint: The user provided both Mirror and Balance back-to-back. Synthesize structural tension (Mirror) with current climate/valence (Balance).`;
  }

  const enhancedPrompt = v11PromptPrefix + analysisPrompt + contextAppendix + `\n\n[SESSION META] first_turn=${isFirstTurn}`;
  const stream = generateStream(enhancedPrompt, { model: process.env.MODEL_PROVIDER, personaHook: hook });
  const responseBody = new ReadableStream<{ }|Uint8Array>({
    async start(controller){
      trackRequest(analysisPrompt.length);
      controller.enqueue(encode({climate, hook, delta: shapedIntro}));
      for await (const chunk of stream){
        controller.enqueue(encode({climate, hook, delta: chunk.delta}));
      }
      controller.close();
    }
  });
  return new Response(responseBody, { headers: { 'Content-Type': 'text/plain; charset=utf-8' }});
}
