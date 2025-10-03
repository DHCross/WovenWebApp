// Actor/Role Diagnostic System
// Maps ping feedback patterns to Enhanced Diagnostic Matrix composites
// Detects sidereal drift from OSR patterns without recasting charts

export interface ActorRoleComposite {
  actor: string; // Driver (sidereal motivation) 
  role: string;  // Style (tropical presentation)
  composite: string; // Combined pattern name
  confidence: number; // 0-1 based on data strength
  confidenceBand?: 'LOW' | 'MODERATE' | 'HIGH';
  sampleSize?: number;
  siderealDrift: boolean; // True if OSR patterns suggest sidereal orientation
  driftIndex?: number; // 0-1 ratio when computed
  driftBand?: 'NONE' | 'POSSIBLE' | 'STRONG';
  evidenceN?: number; // number of probed OSR items
  actorSigns?: string[]; // for glyph traces
  roleSigns?: string[];  // for glyph traces
  stateDependent?: boolean; // drift evidence concentrated in one area
  tieBreak?: 'WB' | 'ABE' | 'OSR'; // which source resolved a near-tie (if any)
  aspectNotes?: string[]; // stub for future UI rendering and tiny bonus application
  actorBreakdown?: Array<{ key: string; score: number; sources: { wb: number; abe: number; osr: number } }>;
  roleBreakdown?: Array<{ key: string; score: number; sources: { wb: number; abe: number; osr: number } }>;
}

export interface DiagnosticPattern {
  signs: string[];
  keywords: string[];
  tonality: string[];
  behaviors: string[];
}

// Enhanced Diagnostic Matrix mapping based on communication drivers (sidereal motivation)
export const ACTOR_PATTERNS: Record<string, DiagnosticPattern> = {
  'Initiator': {
    signs: ['Aries'],
    keywords: ['ignite', 'spark', 'drive', 'action', 'catalyst', 'start', 'begin', 'act', 'go', 'move', 'push', 'launch'],
    tonality: ['bold', 'urgent', 'direct', 'fast', 'immediate', 'decisive', 'energetic'],
    behaviors: ['fears stagnation', 'needs action', 'initiates', 'leads', 'sparks action but risks burnout', 'commands pace', 'avoids hesitation']
  },
  'Stabilizer': {
    signs: ['Taurus'],
    keywords: ['anchor', 'endure', 'stable', 'steady', 'persist', 'build', 'solid', 'reliable', 'secure', 'consistent', 'maintain', 'preserve'],
    tonality: ['calm', 'grounded', 'solid', 'reliable', 'steady', 'measured', 'deliberate', 'patient'],
    behaviors: ['fears chaos', 'needs security', 'preserves', 'maintains', 'anchors firmly but stifles growth', 'emphasizes reliability', 'avoids change', 'builds slowly but resists pivot']
  },
  'Connector': {
    signs: ['Gemini'],
    keywords: ['connect', 'share', 'communicate', 'link', 'exchange', 'network', 'bridge', 'translate', 'relate', 'converse', 'discuss'],
    tonality: ['quick', 'witty', 'verbal', 'fluid', 'lively', 'rapid', 'conversational', 'engaging'],
    behaviors: ['fears isolation', 'needs interaction', 'bridges', 'translates', 'links endlessly but loses depth', 'scatters focus', 'engages with questions', 'avoids silence']
  },
  'Nurturer': {
    signs: ['Cancer'],
    keywords: ['care', 'protect', 'nurture', 'shield', 'support', 'tend'],
    tonality: ['warm', 'caring', 'emotional', 'gentle'],
    behaviors: ['fears neglect', 'needs connection', 'protects', 'provides']
  },
  'Validator': {
    signs: ['Leo'],
    keywords: ['shine', 'validate', 'recognize', 'celebrate', 'honor', 'appreciate', 'acknowledge', 'praise', 'affirm', 'spotlight', 'radiate'],
    tonality: ['vibrant', 'confident', 'expressive', 'warm', 'charismatic', 'bold', 'magnetic', 'generous'],
    behaviors: ['fears obscurity', 'needs recognition', 'affirms', 'celebrates', 'commands presence but craves applause', 'shines boldly', 'seeks validation', 'performs emotions']
  },
  'Optimizer': {
    signs: ['Virgo'],
    keywords: ['perfect', 'refine', 'fix', 'improve', 'analyze', 'correct'],
    tonality: ['precise', 'analytical', 'detailed', 'careful'],
    behaviors: ['fears error', 'needs accuracy', 'refines', 'perfects']
  },
  'Harmonizer': {
    signs: ['Libra'],
    keywords: ['balance', 'harmonize', 'mediate', 'fair', 'equalize', 'diplomatic', 'negotiate', 'compromise', 'reconcile', 'smooth', 'peaceful'],
    tonality: ['polished', 'fair', 'balanced', 'gracious', 'diplomatic', 'refined', 'courteous', 'measured'],
    behaviors: ['fears conflict', 'needs harmony', 'mediates', 'balances', 'mediates gracefully but avoids conflict', 'seeks compromise', 'harmonizes but avoids depth', 'risks indecision']
  },
  'Investigator': {
    signs: ['Scorpio'],
    keywords: ['probe', 'uncover', 'investigate', 'penetrate', 'reveal', 'transform', 'discover', 'expose', 'dig', 'search', 'analyze', 'scrutinize'],
    tonality: ['intense', 'probing', 'deep', 'private', 'penetrating', 'sharp', 'focused', 'thorough'],
    behaviors: ['fears deception', 'needs truth', 'investigates', 'transforms', 'uncovers deeply but withdraws', 'guards secrets', 'penetrates covertly', 'respects privacy']
  },
  'Visionary': {
    signs: ['Sagittarius'],
    keywords: ['inspire', 'expand', 'explore', 'teach', 'guide', 'envision'],
    tonality: ['expansive', 'candid', 'bold', 'open'],
    behaviors: ['fears ignorance', 'needs meaning', 'explores', 'teaches']
  },
  'Architect': {
    signs: ['Capricorn'],
    keywords: ['build', 'structure', 'organize', 'plan', 'achieve', 'master', 'construct', 'establish', 'command', 'lead', 'control', 'discipline'],
    tonality: ['authoritative', 'structured', 'formal', 'disciplined', 'commanding', 'steady', 'methodical', 'serious'],
    behaviors: ['fears failure', 'needs control', 'builds', 'achieves', 'constructs masterfully but controls', 'commands respect but isolates', 'plans meticulously', 'respects authority']
  },
  'Reformer': {
    signs: ['Aquarius'],
    keywords: ['reform', 'innovate', 'revolutionize', 'liberate', 'progress', 'change'],
    tonality: ['innovative', 'detached', 'radical', 'abstract'],
    behaviors: ['fears conformity', 'needs freedom', 'reforms', 'innovates']
  },
  'Empath': {
    signs: ['Pisces'],
    keywords: ['feel', 'empathize', 'flow', 'merge', 'dissolve', 'transcend', 'absorb', 'sense', 'intuit', 'connect', 'understand', 'compassion'],
    tonality: ['fluid', 'evasive', 'gentle', 'impressionistic', 'soft', 'dreamy', 'intuitive', 'sensitive'],
    behaviors: ['fears disconnection', 'needs unity', 'flows', 'transcends', 'feels profoundly but dissolves', 'empathizes deeply', 'absorbs emotions', 'withdraws to process']
  }
};

export const ROLE_PATTERNS: Record<string, DiagnosticPattern> = {
  'Direct & Fast': {
    signs: ['Aries'],
    keywords: ['direct', 'immediate', 'urgent', 'quick', 'decisive', 'fast', 'rapid', 'instant', 'swift', 'abrupt', 'blunt'],
    tonality: ['bold', 'urgent', 'fast', 'sharp', 'crisp', 'energetic', 'impatient'],
    behaviors: ['acts quickly', 'speaks directly', 'moves fast', 'cuts to the chase', 'avoids delays', 'shows impatience', 'demands immediate response']
  },
  'Deliberate & Grounded': {
    signs: ['Taurus'],
    keywords: ['deliberate', 'slow', 'steady', 'methodical', 'patient'],
    tonality: ['calm', 'grounded', 'steady'],
    behaviors: ['moves slowly', 'thinks carefully', 'stays stable']
  },
  'Verbal & Multi-threaded': {
    signs: ['Gemini'],
    keywords: ['talkative', 'quick', 'multiple', 'varied', 'changeable', 'conversational', 'articulate', 'expressive', 'chatty', 'communicative'],
    tonality: ['witty', 'rapid', 'verbal', 'lively', 'animated', 'clever', 'engaging'],
    behaviors: ['talks much', 'changes topics', 'multitasks', 'juggles ideas', 'thinks aloud', 'connects concepts', 'avoids single focus']
  },
  'Emotionally Coded': {
    signs: ['Cancer'],
    keywords: ['emotional', 'feeling', 'sensitive', 'moody', 'caring'],
    tonality: ['emotional', 'warm', 'caring'],
    behaviors: ['shows emotion', 'cares deeply', 'protective']
  },
  'Expressive & Central': {
    signs: ['Leo'],
    keywords: ['expressive', 'dramatic', 'central', 'performative', 'vibrant'],
    tonality: ['confident', 'vibrant', 'expressive'],
    behaviors: ['performs', 'takes center', 'expresses boldly']
  },
  'Precise & Critical': {
    signs: ['Virgo'],
    keywords: ['precise', 'critical', 'analytical', 'detailed', 'exact'],
    tonality: ['precise', 'analytical', 'detailed'],
    behaviors: ['analyzes', 'criticizes', 'perfects']
  },
  'Diplomatic & Relational': {
    signs: ['Libra'],
    keywords: ['diplomatic', 'relational', 'social', 'balanced', 'harmonious'],
    tonality: ['polished', 'fair', 'diplomatic'],
    behaviors: ['mediates', 'socializes', 'seeks balance']
  },
  'Penetrating & Private': {
    signs: ['Scorpio'],
    keywords: ['penetrating', 'private', 'intense', 'secretive', 'probing', 'deep', 'mysterious', 'guarded', 'reserved', 'hidden'],
    tonality: ['intense', 'private', 'probing', 'quiet', 'focused', 'magnetic', 'controlled'],
    behaviors: ['penetrates', 'keeps secrets', 'investigates', 'guards information', 'speaks selectively', 'maintains mystery', 'reveals gradually']
  },
  'Candid & Expansive': {
    signs: ['Sagittarius'],
    keywords: ['candid', 'expansive', 'open', 'honest', 'broad', 'frank', 'straightforward', 'unfiltered', 'blunt', 'wide-ranging'],
    tonality: ['candid', 'expansive', 'open', 'enthusiastic', 'philosophical', 'adventurous', 'optimistic'],
    behaviors: ['speaks truth', 'expands', 'explores', 'shares openly', 'thinks big picture', 'avoids small details', 'embraces possibilities']
  },
  'Formal & Structured': {
    signs: ['Capricorn'],
    keywords: ['formal', 'structured', 'organized', 'disciplined', 'authoritative', 'methodical', 'systematic', 'professional', 'proper', 'hierarchical'],
    tonality: ['formal', 'structured', 'authoritative', 'measured', 'serious', 'respectful', 'controlled'],
    behaviors: ['organizes', 'disciplines', 'structures', 'follows protocol', 'maintains order', 'respects hierarchy', 'plans systematically']
  },
  'Detached & Conceptual': {
    signs: ['Aquarius'],
    keywords: ['detached', 'conceptual', 'abstract', 'innovative', 'unique'],
    tonality: ['detached', 'innovative', 'abstract'],
    behaviors: ['detaches', 'conceptualizes', 'innovates']
  },
  'Impressionistic & Evasive': {
    signs: ['Pisces'],
    keywords: ['impressionistic', 'evasive', 'fluid', 'vague', 'dreamy', 'subtle', 'indirect', 'elusive', 'ambiguous', 'metaphorical'],
    tonality: ['fluid', 'evasive', 'impressionistic', 'soft', 'gentle', 'poetic', 'mystical'],
    behaviors: ['evades', 'flows', 'dreams', 'speaks in metaphors', 'avoids direct answers', 'changes subject gracefully', 'uses imagery']
  }
};

// Enhanced Diagnostic Matrix composites from the protocol
export const COMPOSITE_MATRIX: Record<string, Record<string, string>> = {
  'Initiator': {
    'Direct & Fast': 'Pure Catalyst',
    'Deliberate & Grounded': 'Slow Burn',
    'Verbal & Multi-threaded': 'Brainstormer',
    'Emotionally Coded': 'Impulsive Heart',
    'Expressive & Central': 'Star Player',
    'Precise & Critical': 'Pointed Spear',
    'Diplomatic & Relational': 'Charming Leader',
    'Penetrating & Private': 'Covert Operator',
    'Candid & Expansive': 'Adventurous Leader',
    'Formal & Structured': 'Disciplined Leader',
    'Detached & Conceptual': 'Rebel Leader',
    'Impressionistic & Evasive': 'Elusive Spark'
  },
  'Stabilizer': {
    'Direct & Fast': 'Unmovable Force',
    'Deliberate & Grounded': 'Bedrock',
    'Verbal & Multi-threaded': 'Resourceful Voice',
    'Emotionally Coded': 'Quiet Feeler',
    'Expressive & Central': 'Generous Host',
    'Precise & Critical': 'Practical Critic',
    'Diplomatic & Relational': 'Gracious Host',
    'Penetrating & Private': 'Silent Power',
    'Candid & Expansive': 'Honest Broker',
    'Formal & Structured': 'Master Builder',
    'Detached & Conceptual': 'Principled Investor',
    'Impressionistic & Evasive': 'Gentle Giant'
  },
  'Connector': {
    'Direct & Fast': 'Fast Talker',
    'Deliberate & Grounded': 'Patient Storyteller',
    'Verbal & Multi-threaded': 'Idea Machine',
    'Emotionally Coded': 'Sensitive Wit',
    'Expressive & Central': 'Magnetic Speaker',
    'Precise & Critical': 'Fact-Checker',
    'Diplomatic & Relational': 'Smooth Talker',
    'Penetrating & Private': 'Secret Keeper',
    'Candid & Expansive': 'Enthusiastic Debater',
    'Formal & Structured': 'Clear Communicator',
    'Detached & Conceptual': 'Genius Thinker',
    'Impressionistic & Evasive': 'Poetic Storyteller'
  },
  'Investigator': {
    'Direct & Fast': 'Cutting Truth',
    'Deliberate & Grounded': 'Deep Root',
    'Verbal & Multi-threaded': 'Information Broker',
    'Emotionally Coded': 'Hidden Current',
    'Expressive & Central': 'Charismatic Leader',
    'Precise & Critical': 'Forensic Analyst',
    'Diplomatic & Relational': 'Strategic Advisor',
    'Penetrating & Private': 'Silent Oracle',
    'Candid & Expansive': 'Truth-Teller',
    'Formal & Structured': 'Strategic Planner',
    'Detached & Conceptual': 'Strategic Futurist',
    'Impressionistic & Evasive': 'Psychic Investigator'
  },
  'Visionary': {
    'Direct & Fast': 'Blunt Prophet',
    'Deliberate & Grounded': 'Enduring Wisdom',
    'Verbal & Multi-threaded': 'Enthusiastic Teacher',
    'Emotionally Coded': 'Protective Guide',
    'Expressive & Central': 'Inspiring Preacher',
    'Precise & Critical': 'Moral Compass',
    'Diplomatic & Relational': 'Fair-Minded Guru',
    'Penetrating & Private': 'Truth Seeker',
    'Candid & Expansive': 'Pure Visionary',
    'Formal & Structured': 'Ambitious Teacher',
    'Detached & Conceptual': 'Radical Philosopher',
    'Impressionistic & Evasive': 'Spiritual Wanderer'
  },
  'Nurturer': {
    'Direct & Fast': 'Protective First Responder',
    'Deliberate & Grounded': 'Hearth Keeper',
    'Verbal & Multi-threaded': 'Story Weaver',
    'Emotionally Coded': 'Tidal Heart',
    'Expressive & Central': 'Radiant Caregiver',
    'Precise & Critical': 'Attentive Steward',
    'Diplomatic & Relational': 'Gentle Mediator',
    'Penetrating & Private': 'Hidden Well',
    'Candid & Expansive': 'Encouraging Guide',
    'Formal & Structured': 'Guardian of Boundaries',
    'Detached & Conceptual': 'Archetypal Care',
    'Impressionistic & Evasive': 'Moonlit Shelter'
  },
  'Validator': {
    'Direct & Fast': 'Spotlight Sprinter',
    'Deliberate & Grounded': 'Steady Beacon',
    'Verbal & Multi-threaded': 'Golden Voice',
    'Emotionally Coded': 'Warm Center',
    'Expressive & Central': 'Solar Heart',
    'Precise & Critical': 'Exacting Muse',
    'Diplomatic & Relational': 'Gracious Host',
    'Penetrating & Private': 'Hidden Flame',
    'Candid & Expansive': 'Generous Leader',
    'Formal & Structured': 'Regal Architect',
    'Detached & Conceptual': 'Iconoclast Star',
    'Impressionistic & Evasive': 'Dramatic Mirage'
  },
  'Optimizer': {
    'Direct & Fast': 'Surgical Fixer',
    'Deliberate & Grounded': 'Patient Refiner',
    'Verbal & Multi-threaded': 'Systems Analyst',
    'Emotionally Coded': 'Careful Helper',
    'Expressive & Central': 'Pointed Critic',
    'Precise & Critical': 'Pure Analyst',
    'Diplomatic & Relational': 'Tactful Editor',
    'Penetrating & Private': 'Forensic Healer',
    'Candid & Expansive': 'Ethical Improver',
    'Formal & Structured': 'Method Architect',
    'Detached & Conceptual': 'Abstract Optimizer',
    'Impressionistic & Evasive': 'Whispered Correction'
  },
  'Harmonizer': {
    'Direct & Fast': 'Grace Under Pressure',
    'Deliberate & Grounded': 'Elegant Anchor',
    'Verbal & Multi-threaded': 'Silver Mediator',
    'Emotionally Coded': 'Soft Balancer',
    'Expressive & Central': 'Charming Diplomat',
    'Precise & Critical': 'Fair Arbiter',
    'Diplomatic & Relational': 'Pure Harmonist',
    'Penetrating & Private': 'Subtle Broker',
    'Candid & Expansive': 'Open Negotiator',
    'Formal & Structured': 'Equity Architect',
    'Detached & Conceptual': 'Idealist Reconciler',
    'Impressionistic & Evasive': 'Velvet Balance'
  },
  'Architect': {
    'Direct & Fast': 'Command Builder',
    'Deliberate & Grounded': 'Stone Mason',
    'Verbal & Multi-threaded': 'Executive Communicator',
    'Emotionally Coded': 'Steeled Guardian',
    'Expressive & Central': 'Dignified Leader',
    'Precise & Critical': 'Master Planner',
    'Diplomatic & Relational': 'Statesman',
    'Penetrating & Private': 'Silent Strategist',
    'Candid & Expansive': 'Ambitious Captain',
    'Formal & Structured': 'Pure Architect',
    'Detached & Conceptual': 'Systemic Builder',
    'Impressionistic & Evasive': 'Sober Dreamer'
  },
  'Reformer': {
    'Direct & Fast': 'Shock Innovator',
    'Deliberate & Grounded': 'Principled Reformer',
    'Verbal & Multi-threaded': 'Signal Splitter',
    'Emotionally Coded': 'Detached Advocate',
    'Expressive & Central': 'Iconoclast Performer',
    'Precise & Critical': 'Analytical Maverick',
    'Diplomatic & Relational': 'Civic Futurist',
    'Penetrating & Private': 'Underground Radical',
    'Candid & Expansive': 'Visionary Reformer',
    'Formal & Structured': 'Policy Architect',
    'Detached & Conceptual': 'Pure Innovator',
    'Impressionistic & Evasive': 'Electric Phantom'
  },
  'Empath': {
    'Direct & Fast': 'Soft Surge',
    'Deliberate & Grounded': 'Kind Anchor',
    'Verbal & Multi-threaded': 'Dream Messenger',
    'Emotionally Coded': 'Oceanic Heart',
    'Expressive & Central': 'Mystic Performer',
    'Precise & Critical': 'Discerning Mystic',
    'Diplomatic & Relational': 'Porous Bridge',
    'Penetrating & Private': 'Psychic Diver',
    'Candid & Expansive': 'Pilgrim Poet',
    'Formal & Structured': 'Vessel Maker',
    'Detached & Conceptual': 'Neptunian Thinker',
    'Impressionistic & Evasive': 'Pure Dreamer'
  }
  // Additional composites can be added as needed
};

class ActorRoleDetector {
  private static instance: ActorRoleDetector;

  static getInstance(): ActorRoleDetector {
    if (!ActorRoleDetector.instance) {
      ActorRoleDetector.instance = new ActorRoleDetector();
    }
    return ActorRoleDetector.instance;
  }

  // Analyze text content for Actor/Role patterns with token-aware matching and per-pattern normalization
  analyzeContent(content: string): { actor: string; role: string; actorScore: number; roleScore: number } {
    // Enhanced normalization: handle contractions, compound words, and preserve meaningful punctuation
    const normalized = content
      .normalize('NFKD')
      // Expand common contractions for better negation detection
      .replace(/\b(can't|cannot)\b/gi, 'can not')
      .replace(/\b(won't)\b/gi, 'will not')
      .replace(/\b(don't)\b/gi, 'do not')
      .replace(/\b(isn't)\b/gi, 'is not')
      .replace(/\b(aren't)\b/gi, 'are not')
      .replace(/\b(wasn't)\b/gi, 'was not')
      .replace(/\b(weren't)\b/gi, 'were not')
      .replace(/\b(didn't)\b/gi, 'did not')
      .replace(/\b(doesn't)\b/gi, 'does not')
      .replace(/\b(haven't)\b/gi, 'have not')
      .replace(/\b(hasn't)\b/gi, 'has not')
      .replace(/\b(hadn't)\b/gi, 'had not')
      .replace(/\b(shouldn't)\b/gi, 'should not')
      .replace(/\b(wouldn't)\b/gi, 'would not')
      .replace(/\b(couldn't)\b/gi, 'could not')
      // Handle compound words more intelligently
      .replace(/([a-z])-([a-z])/g, '$1 $2') // split hyphenated words
      .replace(/[\u2010-\u2015]/g, ' ') // other dashes to spaces
      .replace(/[""'']/g, ' ') // smart quotes to spaces
      .toLowerCase()
      .replace(/\p{M}+/gu, '') // remove combining marks (diacritics)
      .replace(/[^a-z\s]/g, ' ');

    const tokens = normalized
      .split(/\s+/)
      .filter(Boolean);

    // Enhanced negation detection with more patterns and intensifiers
    const negations = new Set(['no', 'not', 'never', 'rarely', 'hardly', 'seldom', 'without', 'barely', 'scarcely']);
    const intensifiers = new Set(['very', 'extremely', 'really', 'quite', 'rather', 'fairly', 'somewhat', 'pretty']);
    const modalizers = new Set(['maybe', 'perhaps', 'possibly', 'probably', 'likely', 'seems', 'appears']);

    const hasNegationBefore = (index: number, window: number = 3) => {
      for (let i = 1; i <= window; i++) {
        const t = tokens[index - i];
        if (!t) break;
        if (negations.has(t)) return true;
        // Skip over intensifiers and modalizers when checking negation
        if (intensifiers.has(t) || modalizers.has(t)) continue;
      }
      return false;
    };

    const hasIntensifierBefore = (index: number, window: number = 2) => {
      for (let i = 1; i <= window; i++) {
        const t = tokens[index - i];
        if (!t) break;
        if (intensifiers.has(t)) return 1.5; // boost score
        if (modalizers.has(t)) return 0.8; // reduce certainty
      }
      return 1.0;
    };

    const tokenSet = new Set(tokens);

    // Expanded strong tonality signals with contextual weighting
    const TONALITY_STRONG = new Set(['bold','urgent','direct','fast','expansive','precise','intense','warm','fluid','structured']);
    const TONALITY_CONTEXTUAL = new Set(['deep', 'high', 'strong', 'clear', 'bright', 'soft', 'hard', 'smooth', 'rough']);

    // Enhanced phrase detection with flexible matching and semantic proximity
    const phraseHit = (phrase: string) => {
      const parts = phrase.toLowerCase().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return 0;

      if (parts.length === 1) {
        const pw = parts[0];
        let bestScore = 0;

        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i] === pw) {
            const negationPenalty = hasNegationBefore(i) ? 0.6 : 1.0; // less harsh penalty
            const intensifierBoost = hasIntensifierBefore(i);
            bestScore = Math.max(bestScore, negationPenalty * intensifierBoost);
          }
          // Also check for partial/stem matches for robustness
          else if (tokens[i].startsWith(pw) || pw.startsWith(tokens[i])) {
            if (Math.abs(tokens[i].length - pw.length) <= 2) { // close length match
              const partialScore = 0.7;
              const negationPenalty = hasNegationBefore(i) ? 0.6 : 1.0;
              const intensifierBoost = hasIntensifierBefore(i);
              bestScore = Math.max(bestScore, partialScore * negationPenalty * intensifierBoost);
            }
          }
        }
        return bestScore;
      }

      // Multi-word phrases: flexible window with order preference
      const windowSpan = Math.max(6, parts.length + 2); // adaptive window
      let bestScore = 0;

      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] !== parts[0]) continue;

        // Try exact order first (highest score)
        let j = i;
        let exactMatch = true;
        const foundPositions = [i];

        for (let p = 1; p < parts.length; p++) {
          let found = false;
          for (let k = j + 1; k <= j + windowSpan && k < tokens.length; k++) {
            if (tokens[k] === parts[p]) {
              found = true;
              j = k;
              foundPositions.push(k);
              break;
            }
          }
          if (!found) { exactMatch = false; break; }
        }

        if (exactMatch) {
          const negationPenalty = hasNegationBefore(i) ? 0.6 : 1.0;
          const intensifierBoost = hasIntensifierBefore(i);
          const proximityBonus = foundPositions.length > 1 ?
            1.0 + (0.1 * Math.max(0, 4 - (foundPositions[foundPositions.length-1] - foundPositions[0]))) : 1.0;
          bestScore = Math.max(bestScore, negationPenalty * intensifierBoost * proximityBonus);
        }

        // Try flexible order (lower score but still valuable)
        else {
          const wordsFound = parts.filter(part => {
            for (let k = i; k < Math.min(i + windowSpan, tokens.length); k++) {
              if (tokens[k] === part) return true;
            }
            return false;
          });

          if (wordsFound.length >= Math.ceil(parts.length * 0.7)) { // 70% threshold
            const coverage = wordsFound.length / parts.length;
            const flexibleScore = coverage * 0.8; // penalty for non-exact order
            const negationPenalty = hasNegationBefore(i) ? 0.6 : 1.0;
            const intensifierBoost = hasIntensifierBefore(i);
            bestScore = Math.max(bestScore, flexibleScore * negationPenalty * intensifierBoost);
          }
        }
      }

      return bestScore;
    };

    // Helper to score a pattern: 2 points for exact token keyword hits, 1 point for tonal includes
    const scorePattern = (pattern: DiagnosticPattern) => {
      // Keywords: whole-token with negation penalty within window
      let keywordHits = 0;
      const keywordSeen = new Set<string>();
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        for (const kw of pattern.keywords) {
          const k = kw.toLowerCase();
          if (t === k && !keywordSeen.has(k)) {
            keywordSeen.add(k);
            keywordHits += hasNegationBefore(i) ? 0.5 : 1; // penalize if negated
          }
        }
      }

      // Tonality: whole-token with whitelist weighting and negation penalty
      let toneWeighted = 0;
      const toneSeen = new Set<string>();
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        for (const tv of pattern.tonality) {
          const tone = tv.toLowerCase();
          if (t === tone && !toneSeen.has(tone)) {
            toneSeen.add(tone);
            const base = (keywordHits > 0 || TONALITY_STRONG.has(tone)) ? 1 : 0.25;
            const weight = hasNegationBefore(i) ? base * 0.5 : base;
            toneWeighted += weight;
          }
        }
      }

      // Behaviors: use proximity phrase detection with negation window
      let behaviorHits = 0;
      if (pattern.behaviors && pattern.behaviors.length) {
        const seen = new Set<string>();
        pattern.behaviors.forEach(b => {
          const score = phraseHit(b);
          if (score > 0 && !seen.has(b)) { seen.add(b); behaviorHits += score; }
        });
      }

      const raw = keywordHits * 2 + toneWeighted * 1 + behaviorHits * 0.5;
      const denom = (pattern.keywords.length * 2) + (pattern.tonality.length * 1) + (pattern.behaviors.length * 0.5) || 1;
      return raw / denom; // 0..1
    };

    let bestActor = 'Unknown';
    let bestActorScore = 0;
    Object.entries(ACTOR_PATTERNS).forEach(([actor, pattern]) => {
      const s = scorePattern(pattern);
      if (s > bestActorScore) { bestActorScore = s; bestActor = actor; }
    });

    let bestRole = 'Unknown';
    let bestRoleScore = 0;
    Object.entries(ROLE_PATTERNS).forEach(([role, pattern]) => {
      const s = scorePattern(pattern);
      if (s > bestRoleScore) { bestRoleScore = s; bestRole = role; }
    });

    return { actor: bestActor, role: bestRole, actorScore: bestActorScore, roleScore: bestRoleScore };
  }

  // Semantic similarity checker for enhanced pattern matching
  private checkSemanticSimilarity(word1: string, word2: string): boolean {
    // Define semantic clusters for common astrological concepts
    const semanticClusters = {
      'action': ['act', 'do', 'move', 'start', 'begin', 'initiate', 'drive', 'push', 'go'],
      'stability': ['stable', 'steady', 'solid', 'firm', 'strong', 'reliable', 'consistent', 'enduring'],
      'communication': ['talk', 'speak', 'share', 'tell', 'express', 'communicate', 'connect', 'link'],
      'emotion': ['feel', 'emotion', 'heart', 'sensitive', 'caring', 'warm', 'tender', 'gentle'],
      'expression': ['show', 'display', 'express', 'perform', 'shine', 'radiate', 'vibrant'],
      'analysis': ['analyze', 'study', 'examine', 'detail', 'precise', 'careful', 'exact'],
      'harmony': ['balance', 'fair', 'equal', 'diplomatic', 'peaceful', 'gracious'],
      'intensity': ['intense', 'deep', 'penetrating', 'powerful', 'strong', 'probing'],
      'expansion': ['expand', 'grow', 'broad', 'wide', 'explore', 'open', 'free'],
      'structure': ['organize', 'build', 'plan', 'formal', 'disciplined', 'methodical'],
      'innovation': ['new', 'different', 'unique', 'change', 'reform', 'innovate', 'radical'],
      'fluidity': ['flow', 'fluid', 'soft', 'gentle', 'adaptable', 'flexible', 'evasive']
    };

    for (const cluster of Object.values(semanticClusters)) {
      if (cluster.includes(word1) && cluster.includes(word2)) {
        return true;
      }
    }

    return false;
  }

  // Contextual bonus calculator for pattern coherence
  private getContextualBonus(tokens: string[], index: number, pattern: DiagnosticPattern): number {
    const windowSize = 5;
    const start = Math.max(0, index - windowSize);
    const end = Math.min(tokens.length, index + windowSize + 1);
    const contextTokens = tokens.slice(start, end);

    // Count related words in context
    let contextMatches = 0;
    const allPatternWords = [...pattern.keywords, ...pattern.tonality, ...pattern.behaviors.join(' ').split(' ')]
      .map(w => w.toLowerCase());

    for (const token of contextTokens) {
      if (allPatternWords.includes(token)) {
        contextMatches++;
      } else {
        // Check semantic similarity
        for (const patternWord of allPatternWords) {
          if (this.checkSemanticSimilarity(token, patternWord)) {
            contextMatches += 0.5;
            break;
          }
        }
      }
    }

    // Return bonus between 1.0 and 1.3 based on context density
    const density = contextMatches / contextTokens.length;
    return 1.0 + Math.min(density * 0.6, 0.3);
  }

  // Compute Drift Index from probed OSR clarifications
  computeDriftIndex(evidence: Array<{ mappedTo: 'DRIVER' | 'ROLE' | 'INCONCLUSIVE'; area?: string }>): {
    driftIndex: number; band: 'NONE' | 'POSSIBLE' | 'STRONG'; evidenceN: number; areasSpanned: string[]; stateDependent: boolean;
  } {
    const filtered = evidence.filter(e => e.mappedTo === 'DRIVER' || e.mappedTo === 'ROLE');
    const n = filtered.length;
    const driver = filtered.filter(e => e.mappedTo === 'DRIVER').length;
    const role = filtered.filter(e => e.mappedTo === 'ROLE').length;
    const denom = driver + role;
    const driftIndex = denom > 0 ? driver / denom : 0;
    // Normalize areas to a controlled taxonomy
    const allowedAreas = new Set(['agency','boundaries','communication','energy','relationships','work','home','identity']);
    const areasSet = new Set<string>();
    evidence.forEach(e => {
      if (!e.area) return;
      const a = (e.area || '').toLowerCase();
      if (allowedAreas.has(a)) areasSet.add(a);
    });
    const areas = Array.from(areasSet);

  let band: 'NONE' | 'POSSIBLE' | 'STRONG' = 'NONE';
  if (n >= 4 && areas.length >= 2 && driftIndex >= 0.7) band = 'STRONG';
  else if (n >= 3 && driftIndex >= 0.5) band = 'POSSIBLE';

  // State dependence: if evidence is confined to a single area, don't surface band
  const stateDependent = areas.length < 2 && band !== 'NONE';
  const surfacedBand = stateDependent ? 'NONE' : band;

  return { driftIndex, band: surfacedBand, evidenceN: n, areasSpanned: areas, stateDependent };
  }

  // Generate Actor/Role composite from session data
  generateComposite(sessionData: {
    wbPatterns: string[];
    abePatterns: string[];
    osrPatterns: Array<{ content: string; response: string; note?: string }>;
    osrProbes?: Array<{ mirrorId: string; probe: 'INVERSION' | 'TONE' | 'DIRECTION'; mappedTo: 'DRIVER' | 'ROLE' | 'INCONCLUSIVE'; area?: string; text?: string }>;
  }, opts?: { actorBonus?: number; roleBonus?: number; aspectNotes?: string[] }): ActorRoleComposite {
    // Aggregate analysis with weights: WB 1.0, ABE 0.5
    const actorScores: Record<string, number> = {};
    const roleScores: Record<string, number> = {};
    const actorSource: Record<string, { wb: number; abe: number; osr: number }> = {};
    const roleSource: Record<string, { wb: number; abe: number; osr: number }> = {};

    const bump = (map: Record<string, number>, key: string, by: number) => { map[key] = (map[key] || 0) + by; };
    const bumpSrc = (src: Record<string, { wb: number; abe: number; osr: number }>, key: string, field: 'wb'|'abe'|'osr', by: number) => {
      src[key] = src[key] || { wb: 0, abe: 0, osr: 0 };
      src[key][field] += by;
    };

    const addScores = (content: string, weight: number, source: 'wb' | 'abe') => {
      const a = this.analyzeContent(content);
      if (a.actor !== 'Unknown') { bump(actorScores, a.actor, a.actorScore * weight); bumpSrc(actorSource, a.actor, source, a.actorScore * weight); }
      if (a.role !== 'Unknown')  { bump(roleScores,  a.role,  a.roleScore  * weight); bumpSrc(roleSource,  a.role,  source,  a.roleScore  * weight); }
    };

  sessionData.wbPatterns.forEach(c => addScores(c, 1.0, 'wb'));
  sessionData.abePatterns.forEach(c => addScores(c, 0.5, 'abe'));

    // OSR probed clarifications contribute Actor-side only at 0.75× if provided
    if (sessionData.osrProbes && sessionData.osrProbes.length) {
      sessionData.osrProbes.forEach(p => {
        if (p.text) {
          const a = this.analyzeContent(p.text);
          if (a.actor !== 'Unknown') { bump(actorScores, a.actor, a.actorScore * 0.75); bumpSrc(actorSource, a.actor, 'osr', a.actorScore * 0.75); }
        }
      });
    }

    // Optional aspect-aware tiny bonuses
    if (opts?.actorBonus) { Object.keys(actorScores).forEach(k => { actorScores[k] += opts.actorBonus!; }); }
    if (opts?.roleBonus)  { Object.keys(roleScores).forEach(k => { roleScores[k]  += opts.roleBonus!;  }); }
    if (opts?.aspectNotes && opts.aspectNotes.length) {
      // apply a gentle, uniform +0.05 across existing candidates
      Object.keys(actorScores).forEach(k => { actorScores[k] += 0.05; });
      Object.keys(roleScores).forEach(k => { roleScores[k]  += 0.05; });
    }

    // Choose best Actor/Role with tie-break preference on WB contributions
    const sortedActors = Object.entries(actorScores).sort((a,b)=>b[1]-a[1]);
    const sortedRoles  = Object.entries(roleScores).sort((a,b)=>b[1]-a[1]);
    const actorBreakdown = sortedActors.map(([key, score]) => ({
      key,
      score,
      sources: actorSource[key] || { wb: 0, abe: 0, osr: 0 },
    }));
    const roleBreakdown = sortedRoles.map(([key, score]) => ({
      key,
      score,
      sources: roleSource[key] || { wb: 0, abe: 0, osr: 0 },
    }));
    const bestActorEntry = sortedActors[0] ? { k: sortedActors[0][0], v: sortedActors[0][1] } : { k: 'Unknown', v: 0 };
    const bestRoleEntry  = sortedRoles[0]  ? { k: sortedRoles[0][0],  v: sortedRoles[0][1]  } : { k: 'Unknown', v: 0 };
    let tieBreak: 'WB' | 'ABE' | 'OSR' | undefined;
    const epsilon = 0.02;
    if (sortedActors.length > 1 && Math.abs(sortedActors[0][1] - sortedActors[1][1]) <= epsilon) {
      const a0 = sortedActors[0][0]; const a1 = sortedActors[1][0];
      const wb0 = actorSource[a0]?.wb || 0; const wb1 = actorSource[a1]?.wb || 0;
      const abe0 = actorSource[a0]?.abe || 0; const abe1 = actorSource[a1]?.abe || 0;
      const osr0 = actorSource[a0]?.osr || 0; const osr1 = actorSource[a1]?.osr || 0;
      if (wb0 !== wb1) { bestActorEntry.k = wb0 > wb1 ? a0 : a1; tieBreak = 'WB'; }
      else if (abe0 !== abe1) { bestActorEntry.k = abe0 > abe1 ? a0 : a1; tieBreak = tieBreak || 'ABE'; }
      else if (osr0 !== osr1) { bestActorEntry.k = osr0 > osr1 ? a0 : a1; tieBreak = tieBreak || 'OSR'; }
    }
    if (sortedRoles.length > 1 && Math.abs(sortedRoles[0][1] - sortedRoles[1][1]) <= epsilon) {
      const r0 = sortedRoles[0][0]; const r1 = sortedRoles[1][0];
      const wb0 = roleSource[r0]?.wb || 0; const wb1 = roleSource[r1]?.wb || 0;
      const abe0 = roleSource[r0]?.abe || 0; const abe1 = roleSource[r1]?.abe || 0;
      if (wb0 !== wb1) { bestRoleEntry.k = wb0 > wb1 ? r0 : r1; tieBreak = tieBreak || 'WB'; }
      else if (abe0 !== abe1) { bestRoleEntry.k = abe0 > abe1 ? r0 : r1; tieBreak = tieBreak || 'ABE'; }
    }

    const bestActor = bestActorEntry.k;
    const bestRole = bestRoleEntry.k;

    // Confidence bands: use sample size and normalized score sum
    const sampleSize = sessionData.wbPatterns.length + sessionData.abePatterns.length + (sessionData.osrProbes?.length || 0);
    let confidence = 0;
    if (sampleSize > 0) {
      const totalScore = bestActorEntry.v + bestRoleEntry.v;
      confidence = Math.min(totalScore / Math.max(sampleSize, 1), 1);
      // Cap confidence by sample size bands
      if (sampleSize < 3) confidence = Math.min(confidence, 0.4);
      else if (sampleSize < 6) confidence = Math.min(confidence, 0.7);
    }
    const confidenceBand: 'LOW' | 'MODERATE' | 'HIGH' = confidence > 0.65 ? 'HIGH' : confidence >= 0.35 ? 'MODERATE' : 'LOW';

    // Compute drift index from probes
    let driftIndex: number | undefined;
    let driftBand: 'NONE' | 'POSSIBLE' | 'STRONG' | undefined;
    let evidenceN: number | undefined;
    let stateDependent: boolean | undefined;
    let siderealDrift = false;
    if (sessionData.osrProbes && sessionData.osrProbes.length) {
      const di = this.computeDriftIndex(sessionData.osrProbes.map(p => ({ mappedTo: p.mappedTo, area: p.area })));
      driftIndex = di.driftIndex;
      driftBand = di.band;
      evidenceN = di.evidenceN;
      stateDependent = di.stateDependent;
      siderealDrift = di.band === 'POSSIBLE' || di.band === 'STRONG';
    }

    // Compose name, graceful fallback
    // Unknown floor to avoid noisy composites
    const minWinner = 0.15;
    const actorFinal = bestActorEntry.v >= minWinner ? bestActor : 'Unknown';
    const roleFinal = bestRoleEntry.v >= minWinner ? bestRole : 'Unknown';
    const compositeName = (COMPOSITE_MATRIX[actorFinal]?.[roleFinal]) || `${actorFinal} / ${roleFinal}`;
    const actorSigns = ACTOR_PATTERNS[actorFinal]?.signs;
    const roleSigns = ROLE_PATTERNS[roleFinal]?.signs;

    return {
      actor: actorFinal,
      role: roleFinal,
      composite: compositeName,
      confidence,
  confidenceBand,
  sampleSize,
      siderealDrift,
      driftIndex,
      driftBand,
      evidenceN,
      actorSigns,
      roleSigns,
  stateDependent,
  tieBreak,
  aspectNotes: opts?.aspectNotes || [],
  actorBreakdown,
  roleBreakdown,
    };
  }
}

export default ActorRoleDetector;
