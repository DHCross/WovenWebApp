// Mirror Narrative Engine
// Transforms raw core insights data into story-first mirror summaries

export interface BigVector {
  tension: string;
  polarity: string; // e.g., "Restless / Contained"
  charge: number; // 1-5 intensity
  source: 'angles' | 'anaretic' | 'personal-outer' | 'hook-stack';
}

export interface ResonanceFidelity {
  percentage: number;
  band: 'HIGH' | 'MIXED' | 'LOW';
  label: string;
  wb: number;
  abe: number;
  osr: number;
}

export interface ActorRoleComposite {
  actor: string; // Sidereal driver
  role: string; // Tropical style
  composite: string; // Combined expression
  confidence: 'tentative' | 'emerging' | 'clear';
}

export interface MirrorPattern {
  name: string;
  icon: string;
  description: string;
  resonanceSignature: string;
  guidance: string;
}

export interface KeyPattern {
  title: string;
  description: string;
  whenWorking: string;
  whenChallenged: string;
  recognitionPrompt: string;
}

export interface ResonanceBreakdown {
  wb: {
    count: number;
    meaning: string;
    interpretation: string;
  };
  abe: {
    count: number;
    meaning: string;
    interpretation: string;
  };
  osr: {
    count: number;
    meaning: string;
    interpretation: string;
  };
}

export interface MirrorNarrative {
  headline: string;
  pattern: MirrorPattern;
  coreSignature: string;
  keyPatterns: KeyPattern[];
  resonanceStory: string;
  resonanceBreakdown: ResonanceBreakdown;
  actorRoleStory: string;
  nextSteps: string;
  recognitionLevel: 'immediate' | 'emerging' | 'exploratory';
}

// Mirror pattern archetypes based on resonance fidelity and pattern intensity
const MIRROR_PATTERNS: Record<string, MirrorPattern> = {
  'clear_recognition': {
    name: 'Clear Recognition',
    icon: '🎯✨',
    description: 'High resonance with strong pattern clarity',
    resonanceSignature: 'Multiple immediate "that\'s me" moments with clear thematic coherence',
    guidance: 'These patterns are highly active. Use this clarity to deepen your understanding and make aligned choices.'
  },
  'emerging_themes': {
    name: 'Emerging Themes',
    icon: '🌱🔍',
    description: 'Moderate resonance with developing pattern awareness',
    resonanceSignature: 'Some clear hits mixed with areas needing exploration',
    guidance: 'You\'re in a recognition phase. Pay attention to which themes feel most alive and explore their edges.'
  },
  'exploration_phase': {
    name: 'Exploration Phase',
    icon: '🗺️🧭',
    description: 'Lower resonance requiring deeper investigation',
    resonanceSignature: 'Patterns are present but not immediately obvious in daily experience',
    guidance: 'These are emerging themes. Watch how they show up over time rather than forcing immediate recognition.'
  },
  'mixed_signals': {
    name: 'Mixed Signals',
    icon: '🌊🔀',
    description: 'Complex pattern mix with variable resonance',
    resonanceSignature: 'Strong agreement in some areas, little recognition in others',
    guidance: 'Focus on what resonates most clearly first, then gradually explore the edges of your comfort zone.'
  }
};

function parsePolarity(polarity: string): { positive: string; challenge: string } {
  const parts = polarity.split(' / ');
  return {
    positive: parts[0]?.trim() || 'Dynamic expression',
    challenge: parts[1]?.trim() || 'Potential shadow'
  };
}

function generateKeyPattern(bigVector: BigVector): KeyPattern {
  const { positive, challenge } = parsePolarity(bigVector.polarity);
  const intensity = bigVector.charge;

  // Generate recognition prompt based on the pattern
  const recognitionPrompt = intensity >= 4
    ? `This should feel immediately familiar - a core part of how you operate in the world.`
    : intensity >= 3
    ? `This likely resonates as a significant theme in your life experiences.`
    : `This may show up more subtly, worth paying attention to over time.`;

  return {
    title: bigVector.tension || 'Core Dynamic',
    description: `Tests the balance between ${positive.toLowerCase()} and managing ${challenge.toLowerCase()}.`,
    whenWorking: `When this pattern is flowing well, you embody ${positive.toLowerCase()} with natural ease and authenticity.`,
    whenChallenged: `When this pattern is stressed, you might experience ${challenge.toLowerCase()} or feel pulled between these energies.`,
    recognitionPrompt
  };
}

function generateResonanceBreakdown(fidelity: ResonanceFidelity): ResonanceBreakdown {
  const total = fidelity.wb + fidelity.abe + fidelity.osr;

  return {
    wb: {
      count: fidelity.wb,
      meaning: 'Works Beautifully',
      interpretation: total > 0
        ? `${Math.round((fidelity.wb / total) * 100)}% of patterns felt immediately familiar and accurate to your lived experience.`
        : 'No clear resonance data available.'
    },
    abe: {
      count: fidelity.abe,
      meaning: 'At Boundary\'s Edge',
      interpretation: total > 0
        ? `${Math.round((fidelity.abe / total) * 100)}% of patterns felt partially true but with complexity or nuance you wanted to explore.`
        : 'No partial resonance data available.'
    },
    osr: {
      count: fidelity.osr,
      meaning: 'Outside Signature Range',
      interpretation: total > 0
        ? `${Math.round((fidelity.osr / total) * 100)}% of patterns didn't resonate with your current self-understanding or life experience.`
        : 'No non-resonant data available.'
    }
  };
}

function determineMirrorPattern(fidelity: ResonanceFidelity, keyPatternCount: number): MirrorPattern {
  const percentage = fidelity.percentage;
  const total = fidelity.wb + fidelity.abe + fidelity.osr;

  if (percentage >= 80 && fidelity.wb >= Math.floor(total * 0.6)) {
    return MIRROR_PATTERNS.clear_recognition;
  }

  if (percentage >= 60 && fidelity.abe > fidelity.osr) {
    return MIRROR_PATTERNS.emerging_themes;
  }

  if (fidelity.abe > 0 && fidelity.osr > fidelity.wb) {
    return MIRROR_PATTERNS.mixed_signals;
  }

  return MIRROR_PATTERNS.exploration_phase;
}

function generateActorRoleStory(composite: ActorRoleComposite): string {
  const confidence = composite.confidence;

  if (confidence === 'clear') {
    return `Your core energetic signature shows a clear pattern: ${composite.composite}. This represents the integration of your authentic driver (${composite.actor}) with your practiced style (${composite.role}).`;
  }

  if (confidence === 'emerging') {
    return `Your energetic signature is crystallizing around: ${composite.composite}. There's a developing integration between your authentic driver (${composite.actor}) and your practiced style (${composite.role}).`;
  }

  return `Your energetic signature is tentatively emerging as: ${composite.composite}. The relationship between your authentic driver (${composite.actor}) and practiced style (${composite.role}) is still developing.`;
}

function generateResonanceStory(fidelity: ResonanceFidelity, pattern: MirrorPattern): string {
  const percentage = fidelity.percentage;
  const band = fidelity.band;

  if (band === 'HIGH') {
    return `With ${percentage}% resonance fidelity, your mirror shows strong pattern recognition. ${pattern.resonanceSignature} This suggests the geometric precision is successfully capturing active themes in your lived experience.`;
  }

  if (band === 'MIXED') {
    return `Your ${percentage}% resonance fidelity indicates a mixed but valuable pattern landscape. ${pattern.resonanceSignature} Some themes are immediately clear while others need more exploration.`;
  }

  return `At ${percentage}% resonance fidelity, your mirror is in an exploratory phase. ${pattern.resonanceSignature} These patterns represent emerging or developing themes rather than immediately obvious characteristics.`;
}

export function generateMirrorNarrative(
  bigVectors: BigVector[],
  fidelity: ResonanceFidelity,
  composite: ActorRoleComposite,
  explanation?: string
): MirrorNarrative {
  const keyPatterns = bigVectors.slice(0, 3).map(generateKeyPattern);
  const pattern = determineMirrorPattern(fidelity, keyPatterns.length);
  const resonanceBreakdown = generateResonanceBreakdown(fidelity);
  const resonanceStory = generateResonanceStory(fidelity, pattern);
  const actorRoleStory = generateActorRoleStory(composite);

  const recognitionLevel: 'immediate' | 'emerging' | 'exploratory' =
    fidelity.percentage >= 80 ? 'immediate' :
    fidelity.percentage >= 60 ? 'emerging' : 'exploratory';

  const headline = `${pattern.name}: ${composite.composite}`;

  const coreSignature = keyPatterns.length > 0
    ? `Your core energetic signature is built on ${keyPatterns.length} key pattern${keyPatterns.length === 1 ? '' : 's'} that shape how you navigate challenges, relationships, and growth.`
    : 'Your core energetic signature is emerging through the geometric analysis.';

  const nextSteps = fidelity.percentage >= 70
    ? 'These patterns are ready for deeper exploration in the Poetic Brain, where they can be woven into a personalized narrative that connects to your specific life context.'
    : 'Consider exploring these patterns over time and in conversation with the Poetic Brain to see how they develop and manifest in your experience.';

  return {
    headline,
    pattern,
    coreSignature,
    keyPatterns,
    resonanceStory,
    resonanceBreakdown,
    actorRoleStory,
    nextSteps,
    recognitionLevel
  };
}