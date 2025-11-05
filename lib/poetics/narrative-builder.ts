/**
 * Narrative Builder for Solo Mirror Generation
 * Phase 1, Task 1.2: Convert structured MandateAspect data into cohesive narratives
 * 
 * Follows FIELD → MAP → VOICE protocol from Raven Calder system
 * Geometry-first, falsifiable phrasing; no deterministic claims
 */

import type { MandateAspect, ChartMandates } from './types';

export interface PolarityCard {
  name: string;
  activeSide: string;
  reflectiveSide: string;
  bothSides: string;
  sourceMandate?: MandateAspect;
}

export interface SoloMirrorNarrative {
  hookStack: {
    polarity1: { title: string; description: string };
    polarity2: { title: string; description: string };
  };
  polarityCards: PolarityCard[];
  mandateHighlights: string;
  mirrorVoice: string;
  fullNarrative: string;
}

/**
 * Generate hook stack from top mandates
 * Identifies the two dominant polarities driving the chart
 */
export function generateHookStack(mandates: MandateAspect[]): SoloMirrorNarrative['hookStack'] {
  if (mandates.length === 0) {
    return {
      polarity1: { 
        title: 'The Seeker', 
        description: 'The part that wants to grow and explore' 
      },
      polarity2: { 
        title: 'The Builder', 
        description: 'The part that wants to stabilize and deepen' 
      }
    };
  }

  // Use the top mandate to determine primary polarity
  const topMandate = mandates[0];
  const archA = topMandate.archetypes.a.name;
  const archB = topMandate.archetypes.b.name;
  
  return {
    polarity1: {
      title: archA,
      description: topMandate.archetypes.a.essence
    },
    polarity2: {
      title: archB,
      description: topMandate.archetypes.b.essence
    }
  };
}

/**
 * Generate polarity cards from mandates
 * Creates 3-4 tension cards showing both sides of each dynamic
 */
export function generatePolarityCards(mandates: MandateAspect[]): PolarityCard[] {
  const cards: PolarityCard[] = [];

  for (const mandate of mandates.slice(0, 4)) {
    const { archetypes, geometry, diagnostic, mapTranslation } = mandate;
    const aspectType = geometry.aspectType;
    
    // Build polarity name from archetypes
    const cardName = `${archetypes.a.name} vs. ${archetypes.b.name}`;
    
    // Build active and reflective sides based on aspect type
    let activeSide: string;
    let reflectiveSide: string;
    let bothSides: string;
    
    if (aspectType === 'conjunction') {
      activeSide = `Your ${archetypes.a.planet.toLowerCase()} and ${archetypes.b.planet.toLowerCase()} merge and intensify each other.`;
      reflectiveSide = `These energies blur together, making it hard to separate one from the other.`;
      bothSides = `This fusion creates a unified force. You don't get one without the other—they're a single instrument.`;
    } else if (aspectType === 'opposition') {
      activeSide = `Your ${archetypes.a.planet.toLowerCase()} pulls you one direction—${archetypes.a.essence}.`;
      reflectiveSide = `Your ${archetypes.b.planet.toLowerCase()} pulls the opposite way—${archetypes.b.essence}.`;
      bothSides = `This isn't conflict—it's dynamic tension. You're learning to hold both, to let them negotiate in real time.`;
    } else if (aspectType === 'square') {
      activeSide = `Your ${archetypes.a.planet.toLowerCase()} wants to express freely: ${archetypes.a.essence}.`;
      reflectiveSide = `Your ${archetypes.b.planet.toLowerCase()} creates friction: ${archetypes.b.essence}.`;
      bothSides = `This friction is productive. It forces you to find creative solutions that honor both energies.`;
    } else if (aspectType === 'trine') {
      activeSide = `Your ${archetypes.a.planet.toLowerCase()} flows naturally with your ${archetypes.b.planet.toLowerCase()}.`;
      reflectiveSide = `This ease can make you take this gift for granted or avoid growth edges.`;
      bothSides = `This harmony is real, but don't coast. Use this natural flow to build something that matters.`;
    } else if (aspectType === 'sextile') {
      activeSide = `Your ${archetypes.a.planet.toLowerCase()} supports your ${archetypes.b.planet.toLowerCase()} when you reach for them.`;
      reflectiveSide = `This support is available but not automatic—you have to engage it intentionally.`;
      bothSides = `This is productive potential. The ease is there, but you need to activate it through conscious choice.`;
    } else {
      // Generic for other aspects
      activeSide = `Your ${archetypes.a.planet.toLowerCase()} expresses as: ${archetypes.a.essence}.`;
      reflectiveSide = `Your ${archetypes.b.planet.toLowerCase()} responds with: ${archetypes.b.essence}.`;
      bothSides = mapTranslation;
    }
    
    // Add diagnostic context if Hook or Paradox Lock
    if (diagnostic === 'Paradox Lock') {
      bothSides += ' This is a paradox lock—live it, don\'t try to solve it.';
    } else if (diagnostic === 'Hook') {
      bothSides += ' This is a hook point—pay attention to where this tension catches in your life.';
    } else if (diagnostic === 'Compression') {
      bothSides += ' Multiple pressures converge here—this is a high-density zone in your chart.';
    }
    
    cards.push({
      name: cardName,
      activeSide,
      reflectiveSide,
      bothSides,
      sourceMandate: mandate
    });
  }

  return cards;
}

/**
 * Format mandate section for narrative inclusion
 * Presents geometry in FIELD → MAP → VOICE structure
 */
export function formatMandateHighlights(mandates: MandateAspect[], personName: string): string {
  if (mandates.length === 0) {
    return `No high-charge aspects passed the mandate filter for ${personName}. Treat lived experience as the deciding authority.`;
  }

  const lines: string[] = [];
  lines.push('**Mandate Highlights — Top Geometries Driving Lived Tension**\n');
  
  mandates.forEach((mandate, index) => {
    const { archetypes, geometry, diagnostic, fieldPressure, mapTranslation, voiceHook } = mandate;
    const aspectType = geometry.aspectType;
    const orb = geometry.orbDegrees.toFixed(1);
    
    lines.push(`### ${index + 1}. ${archetypes.a.name} ↔ ${archetypes.b.name} (${aspectType}, ${orb}° orb)\n`);
    lines.push(`**Diagnostic**: ${diagnostic}\n`);
    lines.push(`**Field**: ${fieldPressure}\n`);
    lines.push(`**Map**: ${mapTranslation}\n`);
    lines.push(`**Voice**: ${voiceHook}\n`);
  });

  return lines.join('\n');
}

/**
 * Synthesize mirror voice from polarity cards
 * Creates cohesive narrative stitching together all tensions
 */
export function synthesizeMirrorVoice(
  personName: string,
  polarityCards: PolarityCard[],
  mandates: MandateAspect[]
): string {
  const lines: string[] = [];
  
  lines.push(`Here's what I see in your chart: You're not one thing. You're a system of tensions, and that's where your power lives.\n`);
  
  // Synthesize the primary tensions
  if (polarityCards.length > 0) {
    const tensions = polarityCards.map(card => 
      `The tension between ${card.name.toLowerCase()} is real and productive. ${card.bothSides}`
    ).join('\n\n');
    
    lines.push(tensions);
    lines.push('\n');
  }
  
  // Add diagnostic-specific guidance
  const hasParadoxLock = mandates.some(m => m.diagnostic === 'Paradox Lock');
  const hasHooks = mandates.some(m => m.diagnostic === 'Hook');
  const hasCompression = mandates.some(m => m.diagnostic === 'Compression');
  
  if (hasParadoxLock) {
    lines.push(`Some of these tensions are paradox locks—built-in contradictions that can't be resolved. Your work isn't to fix them but to inhabit them with more skill.\n`);
  }
  
  if (hasHooks) {
    lines.push(`You have hook points in your chart—places where energy catches and demands attention. These are recognition moments. When they surface, they're showing you something real.\n`);
  }
  
  if (hasCompression) {
    lines.push(`Multiple pressures converge in certain zones of your chart. These compression fields create intensity but also transformation. They're high-density learning grounds.\n`);
  }
  
  // Closing synthesis
  lines.push(`These aren't contradictions to resolve. They're the actual shape of how you're built. The work isn't to pick a side—it's to let both sides speak to each other.`);
  lines.push(`\nWhen you can hold both, you become fluid. You can move when you need to move and stay when you need to stay. You can open and close. You can grow and consolidate. You can be yourself and be with others.`);
  lines.push(`\nThat's not a flaw in your chart. That's the whole point.`);
  
  return lines.join('\n');
}

/**
 * Generate complete solo mirror narrative
 * Main entry point for Phase 1, Task 1.2
 */
export function generateSoloMirrorNarrative(
  chartMandates: ChartMandates,
  options: {
    includeHookStack?: boolean;
    includePolarityCards?: boolean;
    includeMandateHighlights?: boolean;
    includeMirrorVoice?: boolean;
  } = {}
): SoloMirrorNarrative {
  const {
    includeHookStack = true,
    includePolarityCards = true,
    includeMandateHighlights = true,
    includeMirrorVoice = true,
  } = options;

  const hookStack = includeHookStack 
    ? generateHookStack(chartMandates.mandates) 
    : { polarity1: { title: '', description: '' }, polarity2: { title: '', description: '' } };
  
  const polarityCards = includePolarityCards 
    ? generatePolarityCards(chartMandates.mandates) 
    : [];
  
  const mandateHighlights = includeMandateHighlights 
    ? formatMandateHighlights(chartMandates.mandates, chartMandates.personName) 
    : '';
  
  const mirrorVoice = includeMirrorVoice 
    ? synthesizeMirrorVoice(chartMandates.personName, polarityCards, chartMandates.mandates) 
    : '';

  // Build full narrative
  const narrativeParts: string[] = [];
  
  narrativeParts.push(`## Solo Mirror: ${chartMandates.personName}\n`);
  
  if (includeHookStack) {
    narrativeParts.push(`### ${hookStack.polarity1.title} / ${hookStack.polarity2.title}\n`);
    narrativeParts.push(`**${hookStack.polarity1.title}**: ${hookStack.polarity1.description}\n`);
    narrativeParts.push(`**${hookStack.polarity2.title}**: ${hookStack.polarity2.description}\n`);
  }
  
  if (includePolarityCards && polarityCards.length > 0) {
    narrativeParts.push(`### The Defining Tensions\n`);
    polarityCards.forEach(card => {
      narrativeParts.push(`#### ${card.name}\n`);
      narrativeParts.push(`**Active**: ${card.activeSide}\n`);
      narrativeParts.push(`**Reflective**: ${card.reflectiveSide}\n`);
      narrativeParts.push(`**Both**: ${card.bothSides}\n`);
    });
  }
  
  if (includeMandateHighlights) {
    narrativeParts.push(mandateHighlights);
  }
  
  if (includeMirrorVoice) {
    narrativeParts.push(`### Your Mirror\n`);
    narrativeParts.push(mirrorVoice);
  }
  
  const fullNarrative = narrativeParts.join('\n');

  return {
    hookStack,
    polarityCards,
    mandateHighlights,
    mirrorVoice,
    fullNarrative
  };
}
