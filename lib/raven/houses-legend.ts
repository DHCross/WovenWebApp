/**
 * Astrological Houses Legend & Symbolic Meanings
 * 
 * Shorthand descriptions for each house in the natal/relational wheel.
 * Used in visualizations and textual mirrors to provide symbolic context.
 */

/**
 * Symbolic meaning of each house
 */
export const HOUSES_LEGEND: Record<number, {
  name: string;
  shorthand: string;
  theme: string;
  keywords: string[];
}> = {
  1: {
    name: '1st House',
    shorthand: 'Self',
    theme: 'Identity, appearance, first impressions',
    keywords: ['ego', 'personality', 'beginning', 'initiative', 'how you present'],
  },
  2: {
    name: '2nd House',
    shorthand: 'Resources',
    theme: 'Values, possessions, self-worth',
    keywords: ['money', 'resources', 'worth', 'stability', 'what you value'],
  },
  3: {
    name: '3rd House',
    shorthand: 'Communication',
    theme: 'Thinking, speaking, learning',
    keywords: ['mind', 'siblings', 'short journeys', 'words', 'curiosity'],
  },
  4: {
    name: '4th House',
    shorthand: 'Home & Family',
    theme: 'Roots, family, foundation',
    keywords: ['family', 'home', 'past', 'foundation', 'private self'],
  },
  5: {
    name: '5th House',
    shorthand: 'Creativity & Romance',
    theme: 'Self-expression, play, love',
    keywords: ['creativity', 'romance', 'children', 'pleasure', 'joy'],
  },
  6: {
    name: '6th House',
    shorthand: 'Work & Health',
    theme: 'Service, routine, wellness',
    keywords: ['work', 'health', 'daily life', 'service', 'habits'],
  },
  7: {
    name: '7th House',
    shorthand: 'Partnership',
    theme: 'Relationships, contracts, mirror',
    keywords: ['marriage', 'contracts', 'others', 'reflected self', 'balance'],
  },
  8: {
    name: '8th House',
    shorthand: 'Transformation',
    theme: 'Depth, shared resources, rebirth',
    keywords: ['death & rebirth', 'intimacy', 'shared funds', 'psychology', 'power'],
  },
  9: {
    name: '9th House',
    shorthand: 'Exploration',
    theme: 'Meaning, travel, higher learning',
    keywords: ['philosophy', 'travel', 'beliefs', 'higher learning', 'purpose'],
  },
  10: {
    name: '10th House',
    shorthand: 'Career & Legacy',
    theme: 'Public image, vocation, authority',
    keywords: ['career', 'reputation', 'status', 'calling', 'public role'],
  },
  11: {
    name: '11th House',
    shorthand: 'Community & Vision',
    theme: 'Friendships, groups, ideals',
    keywords: ['friends', 'groups', 'hopes', 'ideals', 'future'],
  },
  12: {
    name: '12th House',
    shorthand: 'Dissolution & Spirit',
    theme: 'Unconscious, hidden, transcendence',
    keywords: ['hidden', 'spiritual', 'shadow', 'unconscious', 'letting go'],
  },
};

/**
 * Get concise house description
 */
export function getHouseDescription(houseNumber: number): string | null {
  const house = HOUSES_LEGEND[houseNumber];
  return house ? `${house.shorthand} — ${house.theme}` : null;
}

/**
 * Get full house entry
 */
export function getHouseLegend(houseNumber: number) {
  return HOUSES_LEGEND[houseNumber] || null;
}

/**
 * Generate markdown legend table for embedding in reports
 */
export function generateHousesMarkdownTable(): string {
  let table = '| House | Theme | Keywords |\n';
  table += '|-------|-------|----------|\n';

  for (let i = 1; i <= 12; i++) {
    const house = HOUSES_LEGEND[i];
    if (house) {
      const keywords = house.keywords.join(', ');
      table += `| **${house.shorthand}** (${i}) | ${house.theme} | ${keywords} |\n`;
    }
  }

  return table;
}

/**
 * Generate text-only legend for displays without markdown
 */
export function generateHousesTextLegend(): string {
  let text = 'ASTROLOGICAL HOUSES LEGEND\n';
  text += '═══════════════════════════════════════\n\n';

  for (let i = 1; i <= 12; i++) {
    const house = HOUSES_LEGEND[i];
    if (house) {
      text += `${house.shorthand.toUpperCase()} (House ${i})\n`;
      text += `  Theme: ${house.theme}\n`;
      text += `  Keywords: ${house.keywords.join(', ')}\n\n`;
    }
  }

  return text;
}

/**
 * Symbolic shorthand for quick reference (used in tooltips, etc.)
 */
export function getHouseShorthand(houseNumber: number): string | null {
  const house = HOUSES_LEGEND[houseNumber];
  return house ? house.shorthand : null;
}

/**
 * Check if planet/point is in a particular house's symbolic domain
 * Useful for narrative interpretation
 */
export function getHouseContext(houseNumber: number, planetName: string): string {
  const house = HOUSES_LEGEND[houseNumber];
  if (!house) return '';

  const planetLower = planetName.toLowerCase();
  
  // Example: Sun in 10th = public role, career, legacy
  if (house.shorthand === 'Career & Legacy' && /sun/i.test(planetLower)) {
    return 'Your sense of purpose and identity in the public/career sphere';
  }

  // Moon in 4th = emotional roots, family, home
  if (house.shorthand === 'Home & Family' && /moon/i.test(planetLower)) {
    return 'Your emotional foundation and connection to family/roots';
  }

  // Venus in 7th = relationship dynamics, values in partnership
  if (house.shorthand === 'Partnership' && /venus/i.test(planetLower)) {
    return 'How you show up in relationships and what you attract';
  }

  // Mars in 8th = intensity, power dynamics, transformation
  if (house.shorthand === 'Transformation' && /mars/i.test(planetLower)) {
    return 'Your drive for deep transformation and handling power';
  }

  // Default: just theme
  return house.theme;
}

/**
 * Get all house numbers and their shorthand for dropdown/menu
 */
export function getHousesQuickList(): Array<{ number: number; shorthand: string }> {
  return Array.from({ length: 12 }, (_, i) => {
    const num = i + 1;
    return {
      number: num,
      shorthand: getHouseShorthand(num) || `House ${num}`,
    };
  });
}
