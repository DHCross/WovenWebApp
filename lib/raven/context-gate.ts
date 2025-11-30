/**
 * Context Gate Protocol for Raven/Poetic Brain
 * 
 * Separates Session Subjects (Person A/B in the chart) from the Querent (human talking).
 * The system must never assume they are the same until confirmed.
 */

export type QuerentRole = 
  | 'self_a'      // "I'm Person A" - first-person reflective mode
  | 'self_b'      // "I'm Person B" - first-person reflective mode  
  | 'both'        // "We're both here" - relational/dyadic mode
  | 'observer'    // "I'm asking about them" - third-party observer mode
  | 'unconfirmed'; // Not yet identified

export interface ContextGateState {
  querentRole: QuerentRole;
  confirmedAt?: string;          // ISO timestamp when identity was confirmed
  sessionSubjects: string[];     // Names from the chart (Person A, Person B)
  querentName?: string;          // Self-reported name from querent
  consentStatus?: 'mutual' | 'single_sided' | 'anonymized';
  relationshipTier?: string;     // Partner, Friend, Colleague, Family, etc.
}

/**
 * Patterns that indicate the querent is identifying themselves
 */
const IDENTITY_PATTERNS: Array<{ pattern: RegExp; role: QuerentRole }> = [
  // Direct identity statements
  { pattern: /^i'?m\s+(person\s+)?a\b/i, role: 'self_a' },
  { pattern: /^i\s+am\s+(person\s+)?a\b/i, role: 'self_a' },
  { pattern: /^i'?m\s+(person\s+)?b\b/i, role: 'self_b' },
  { pattern: /^i\s+am\s+(person\s+)?b\b/i, role: 'self_b' },
  { pattern: /^we('re| are)\s+(both\s+)?here/i, role: 'both' },
  { pattern: /^both\s+of\s+us/i, role: 'both' },
  { pattern: /^i'?m\s+(an?\s+)?observer/i, role: 'observer' },
  { pattern: /^i'?m\s+asking\s+about\s+them/i, role: 'observer' },
  { pattern: /^(this|the\s+chart)\s+is\s+(for|about)\s+(someone\s+else|them|another)/i, role: 'observer' },
  { pattern: /^third\s+party/i, role: 'observer' },
];

/**
 * Check if user input contains identity confirmation
 */
export function detectQuerentIdentity(
  input: string, 
  sessionSubjects: string[]
): { role: QuerentRole; confidence: 'high' | 'medium' | 'low' } | null {
  const trimmed = input.trim();
  const lowerInput = trimmed.toLowerCase();
  
  // Check direct patterns first (Person A, Person B, both, observer)
  for (const { pattern, role } of IDENTITY_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { role, confidence: 'high' };
    }
  }
  
  // Build name variants for each subject (full name + first name)
  const subjectVariants: Array<{ names: string[]; index: number }> = sessionSubjects.map((fullName, index) => {
    const names: string[] = [];
    if (fullName) {
      names.push(fullName.toLowerCase());
      // Extract first name (before first space)
      const firstName = fullName.split(/\s+/)[0];
      if (firstName && firstName.toLowerCase() !== fullName.toLowerCase()) {
        names.push(firstName.toLowerCase());
      }
    }
    return { names, index };
  });
  
  // Check if user says their name matches a subject (full name or first name)
  for (const { names, index } of subjectVariants) {
    for (const name of names) {
      if (!name) continue;
      const escapedName = escapeRegex(name);
      
      // Various patterns people use to identify themselves
      const namePatterns = [
        // "I'm [name]" or "I am [name]"
        new RegExp(`^i'?m\\s+${escapedName}\\b`, 'i'),
        new RegExp(`^i\\s+am\\s+${escapedName}\\b`, 'i'),
        // "This is [name]"
        new RegExp(`^this\\s+is\\s+${escapedName}\\b`, 'i'),
        // Just "[name]" as a response
        new RegExp(`^${escapedName}$`, 'i'),
        // "[name] here"
        new RegExp(`^${escapedName}\\s+here`, 'i'),
        // "It's [name]" or "It is [name]"
        new RegExp(`^it'?s\\s+${escapedName}\\b`, 'i'),
        new RegExp(`^it\\s+is\\s+${escapedName}\\b`, 'i'),
        // "[name] speaking" or "Speaking as [name]"
        new RegExp(`^${escapedName}\\s+speaking\\b`, 'i'),
        new RegExp(`^speaking\\s+(as\\s+)?${escapedName}\\b`, 'i'),
        // "Yes, [name]" or "Yes I'm [name]"
        new RegExp(`^yes,?\\s+${escapedName}\\b`, 'i'),
        new RegExp(`^yes,?\\s+i'?m\\s+${escapedName}\\b`, 'i'),
        // "Hello, I'm [name]" or "Hi, I'm [name]"  
        new RegExp(`^(hi|hello|hey),?\\s+i'?m\\s+${escapedName}\\b`, 'i'),
      ];
      
      for (const p of namePatterns) {
        if (p.test(trimmed)) {
          return { role: index === 0 ? 'self_a' : 'self_b', confidence: 'high' };
        }
      }
      
      // Check if name appears anywhere in short response (high confidence for short responses)
      if (trimmed.length < 50 && lowerInput.includes(name)) {
        // If the response contains the name and is short, likely identifying
        return { role: index === 0 ? 'self_a' : 'self_b', confidence: 'medium' };
      }
    }
  }
  
  // Fuzzy detection for "it's me" type responses when there's only one subject
  if (sessionSubjects.length === 1) {
    if (/^(it'?s\s+me|that'?s\s+me|yes,?\s+(it'?s|that'?s)\s+me|me|yes|yep|yeah)$/i.test(trimmed)) {
      return { role: 'self_a', confidence: 'medium' };
    }
  }
  
  // Check for "both" indicators in relational context
  if (sessionSubjects.length === 2) {
    if (/^(both|we|us|together|both of us|we'?re (both )?here)$/i.test(trimmed)) {
      return { role: 'both', confidence: 'high' };
    }
  }
  
  return null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate the Context Gate opening question
 */
export function generateContextGateQuestion(sessionSubjects: string[]): string {
  if (sessionSubjects.length === 0) {
    return "Before we begin—who am I speaking with right now?";
  }
  
  if (sessionSubjects.length === 1) {
    const name = sessionSubjects[0];
    return `Before we begin—am I speaking with ${name}, or are you someone asking about their chart?`;
  }
  
  const [a, b] = sessionSubjects;
  return `Before we begin—who am I speaking with right now? Are you ${a}, ${b}, both of you together, or someone else asking about them?`;
}

/**
 * Generate voice adaptation instructions based on querent role
 */
export function getVoiceAdaptationInstructions(role: QuerentRole, sessionSubjects: string[]): string {
  switch (role) {
    case 'self_a':
    case 'self_b': {
      const subjectIndex = role === 'self_a' ? 0 : 1;
      const name = sessionSubjects[subjectIndex] || (role === 'self_a' ? 'Person A' : 'Person B');
      return `VOICE ADAPTATION: First-Person Reflective Mode for ${name}.
- Use "you" statements and Socratic questions ("What part of you might be asking to breathe here?")
- Treat resonance as potential first-person data
- Mirror patterns back as invitations for recognition
- Keep language conditional: "this chart suggests you may experience..." not "you will..."`;
    }
    
    case 'both':
      return `VOICE ADAPTATION: Relational Mirror Mode (Both Subjects Present).
- Speak in terms of "between you," "when the two of you...," and mutual dynamics
- Do NOT take sides or frame one person as the problem
- Focus on pattern interaction rather than individual pathology
- Maintain bidirectional attribution: "where your patterns intersect..."
- Keep both subjects equally visible`;
    
    case 'observer':
      return `VOICE ADAPTATION: Observer Mode (Third-Party Querent).
- Use conditional third-person phrasing ONLY: "This chart suggests this person may tend to..."
- Do NOT claim inner experience ("you feel X inside") about someone not present
- Avoid prescriptive advice about subjects who are not in the room
- Treat this as behavioral pattern analysis, not mind-reading
- Log any resonance confirmations as sst_source: "observer" (observer-rated, not primary felt experience)`;
    
    case 'unconfirmed':
    default:
      return `VOICE ADAPTATION: Identity Not Yet Confirmed.
- Before proceeding with any chart interpretation, ask: "Who am I speaking with right now?"
- Do not assume the querent is the subject until explicitly confirmed
- Keep responses general until identity is established`;
  }
}

/**
 * Check if a session needs the Context Gate question
 */
export function needsContextGate(state: ContextGateState | undefined): boolean {
  if (!state) return true;
  return state.querentRole === 'unconfirmed';
}

/**
 * Create initial Context Gate state for a new session
 */
export function createContextGateState(sessionSubjects: string[]): ContextGateState {
  return {
    querentRole: 'unconfirmed',
    sessionSubjects,
  };
}

/**
 * Update Context Gate state when querent identifies themselves
 */
export function confirmQuerentIdentity(
  state: ContextGateState,
  role: QuerentRole,
  querentName?: string
): ContextGateState {
  return {
    ...state,
    querentRole: role,
    confirmedAt: new Date().toISOString(),
    querentName,
  };
}

/**
 * Detect if there's a potential conflict between uploaded report subjects 
 * and the current session subjects
 */
export function detectSubjectConflict(
  currentSubjects: string[],
  uploadedSubjects: string[]
): { hasConflict: boolean; message?: string } {
  if (currentSubjects.length === 0 || uploadedSubjects.length === 0) {
    return { hasConflict: false };
  }
  
  const currentSet = new Set(currentSubjects.map(s => s.toLowerCase().trim()));
  const uploadedSet = new Set(uploadedSubjects.map(s => s.toLowerCase().trim()));
  
  // Check if sets are completely disjoint
  const overlap = [...currentSet].filter(s => uploadedSet.has(s));
  
  if (overlap.length === 0) {
    return {
      hasConflict: true,
      message: `The uploaded report is for ${uploadedSubjects.join(' and ')}, but the current session is for ${currentSubjects.join(' and ')}. Which context should I use for our conversation?`
    };
  }
  
  // Partial overlap - might need clarification
  if (overlap.length < Math.max(currentSet.size, uploadedSet.size)) {
    return {
      hasConflict: true,
      message: `I notice the uploaded report has different subjects than your current session. Should I switch to the uploaded chart, or continue with the current one?`
    };
  }
  
  return { hasConflict: false };
}

/**
 * Initialize Context Gate from relational metadata
 * Used when uploading a new report with relational_type information
 */
export function initializeContextGateFromMetadata(
  metadata: any,  // RelationalMetadata from relational-metadata.ts
  currentGate?: ContextGateState
): ContextGateState {
  // Extract subject names from metadata
  const subjects = [];
  if (metadata.personAName) subjects.push(metadata.personAName);
  if (metadata.personBName && metadata.personBName !== metadata.personAName) {
    subjects.push(metadata.personBName);
  }

  // Take on faith: default to likely querent role without requiring confirmation
  let initialRole: QuerentRole = currentGate?.querentRole || 'unconfirmed';
  
  if (!currentGate || currentGate.querentRole === 'unconfirmed') {
    // Map from scope to likely querent role and assume it
    if (metadata.scope === 'solo') {
      initialRole = 'self_a';  // Reading your own chart
    } else if (metadata.scope === 'dyadic') {
      initialRole = 'both';    // Both present
    } else if (metadata.scope === 'observer') {
      initialRole = 'observer'; // Third party
    }
  }

  return {
    querentRole: initialRole,
    sessionSubjects: subjects.length > 0 ? subjects : currentGate?.sessionSubjects || [],
    relationshipTier: metadata.relationshipType,
    consentStatus: metadata.scope === 'observer' ? 'anonymized' : undefined,
  };
}
