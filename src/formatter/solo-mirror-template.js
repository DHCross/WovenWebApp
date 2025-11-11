/**
 * Solo Mirror Template Generator
 * Implements Hook Stack + Polarity Cards + Mirror Voice
 * 
 * Converts raw chart geometry into conversational narrative
 * using the Raven Calder voice protocol
 */

/**
 * Generate Hook Stack
 * Two polarity titles with expanded descriptions
 */
function generateHookStack(personName, natalChart) {
  if (!natalChart || !natalChart.planets) {
    return {
      polarity_1: { title: 'The Seeker', description: 'The part that wants to grow and explore' },
      polarity_2: { title: 'The Builder', description: 'The part that wants to stabilize and deepen' }
    };
  }

  // Extract key planets for polarity identification
  const sun = natalChart.planets.find(p => p.name === 'Sun');
  const saturn = natalChart.planets.find(p => p.name === 'Saturn');
  const mars = natalChart.planets.find(p => p.name === 'Mars');

  // Determine primary polarity based on chart geometry
  let polarity1 = { title: 'The Mover', description: 'The part that acts, initiates, and pushes forward' };
  let polarity2 = { title: 'The Watcher', description: 'The part that observes, considers, and holds back' };

  if (mars && saturn) {
    const marsSign = mars.sign || 0;
    const saturnSign = saturn.sign || 0;
    
    // If Mars is in fire/air, emphasize action
    if ([0, 2, 4, 6, 8, 10].includes(marsSign)) {
      polarity1 = { 
        title: 'The Spark', 
        description: 'The part that ignites, that wants to move fast and see what happens' 
      };
    }
    
    // If Saturn is prominent, emphasize caution
    if ([1, 3, 5, 7, 9, 11].includes(saturnSign)) {
      polarity2 = { 
        title: 'The Anchor', 
        description: 'The part that questions, that wants to make sure the ground is solid' 
      };
    }
  }

  return {
    polarity_1: polarity1,
    polarity_2: polarity2
  };
}

/**
 * Generate Polarity Cards
 * 3-4 defining polarities with both sides shown
 */
function generatePolarityCards(personName, natalChart) {
  const cards = [];

  // Card 1: Action vs. Reflection
  cards.push({
    name: 'Action vs. Reflection',
    active_side: 'When you move, you move decisively. There\'s an impulse to act, to test, to see what happens.',
    reflective_side: 'But there\'s also a part that pauses, that wants to think it through, that worries about consequences.',
    both_sides: 'This isn\'t indecision—it\'s the tension between two valid ways of knowing. Sometimes you need to move first; sometimes you need to think first. The trick is knowing which moment calls for which.'
  });

  // Card 2: Openness vs. Boundaries
  cards.push({
    name: 'Openness vs. Boundaries',
    active_side: 'Part of you is open, generous, wants to connect and share.',
    reflective_side: 'Part of you is protective, cautious, needs to know who you\'re letting in.',
    both_sides: 'This isn\'t coldness or neediness—it\'s the healthy rhythm of opening and closing. You\'re learning to trust both impulses.'
  });

  // Card 3: Growth vs. Stability
  cards.push({
    name: 'Growth vs. Stability',
    active_side: 'You\'re drawn to new territory, new skills, new ways of being. There\'s a restlessness that keeps you moving.',
    reflective_side: 'But you also need roots, consistency, things that last. You build slowly because you want it to hold.',
    both_sides: 'This is the creative tension of your life. You\'re not meant to choose one. You\'re meant to spiral—grow, then consolidate, then grow again.'
  });

  // Card 4: Self vs. Other
  cards.push({
    name: 'Self vs. Other',
    active_side: 'You have a strong sense of your own needs, your own path. You can be fiercely independent.',
    reflective_side: 'You also feel others deeply, adapt to them, sometimes lose yourself in the relationship.',
    both_sides: 'This isn\'t selfishness or codependency—it\'s the dance of being both an individual and relational. The work is learning when to prioritize which.'
  });

  return cards.slice(0, 4);
}

/**
 * Generate Mirror Voice
 * Stitched reflection gathering all polarities
 */
function generateMirrorVoice(personName, polarityCards) {
  const intro = `Here's what I see in your chart: You're not one thing. You're a system of tensions, and that's where your power lives.`;

  const tensions = polarityCards.map(card => 
    `The tension between ${card.name.toLowerCase()} is real and productive. ${card.both_sides}`
  ).join(' ');

  const closing = `These aren't contradictions to resolve. They're the actual shape of how you're built. The work isn't to pick a side—it's to let both sides speak to each other. When you can hold both, you become fluid. You can move when you need to move and stay when you need to stay. You can open and close. You can grow and consolidate. You can be yourself and be with others.

That's not a flaw in your chart. That's the whole point.`;

  return `${intro}\n\n${tensions}\n\n${closing}`;
}

/**
 * Generate complete Solo Mirror
 */
function generateSoloMirror(personName, natalChart, intimacyTier = 'P1') {
  const hookStack = generateHookStack(personName, natalChart);
  const polarityCards = generatePolarityCards(personName, natalChart);
  const mirrorVoice = generateMirrorVoice(personName, polarityCards);

  let output = `## Solo Mirror: ${personName}\n\n`;

  // Hook Stack section
  output += `### ${hookStack.polarity_1.title} / ${hookStack.polarity_2.title}\n\n`;
  output += `**${hookStack.polarity_1.title}**: ${hookStack.polarity_1.description}\n\n`;
  output += `**${hookStack.polarity_2.title}**: ${hookStack.polarity_2.description}\n\n`;

  // Polarity Cards section
  output += `### The Defining Tensions\n\n`;
  polarityCards.forEach(card => {
    output += `#### ${card.name}\n\n`;
    output += `**Active**: ${card.active_side}\n\n`;
    output += `**Reflective**: ${card.reflective_side}\n\n`;
    output += `**Both**: ${card.both_sides}\n\n`;
  });

  // Mirror Voice section
  output += `### Your Mirror\n\n`;
  output += `${mirrorVoice}\n\n`;

  return output;
}

module.exports = {
  generateHookStack,
  generatePolarityCards,
  generateMirrorVoice,
  generateSoloMirror
};
