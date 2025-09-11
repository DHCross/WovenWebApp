/**
 * Utilities for parsing poetic card data from Raven's responses
 */

import { PoeticIndexCard } from './card-generator';

export function parseCardFromResponse(response: string): PoeticIndexCard | null {
  try {
    // Look for structured card data in response
    // This would typically parse a specific format that Raven outputs
    // For now, we'll create a sample structure
    
    const lines = response.split('\n');
    const poemLines: string[] = [];
    let title = 'Untitled';
    let poeticPhrase = '';
    let mirrorPrompt = '';
    let dominantPlanet = 'moon';
    
    // Basic parsing logic - this would be more sophisticated in practice
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for title patterns
      if (line.includes('Title:') || line.startsWith('# ')) {
        title = line.replace(/^(Title:|#)\s*/, '').trim();
      }
      
      // Look for poem sections (between certain markers)
      if (line.includes('**1. Poem') || line.includes('### Poem')) {
        // Extract poem lines from next section
        for (let j = i + 1; j < lines.length; j++) {
          const poemLine = lines[j].trim();
          if (poemLine === '' || poemLine.includes('**2.') || poemLine.includes('###')) break;
          if (poemLine.length > 0 && !poemLine.includes('*') && !poemLine.includes('#')) {
            poemLines.push(poemLine);
          }
        }
      }
      
      // Look for question/prompt patterns
      if (line.includes('?') && line.length > 20 && line.length < 150) {
        mirrorPrompt = line;
      }
      
      // Look for planetary references
      const planetMatch = line.match(/(mars|venus|mercury|moon|neptune|saturn|chiron|jupiter|uranus|pluto|sun)/i);
      if (planetMatch) {
        dominantPlanet = planetMatch[1].toLowerCase();
      }
    }
    
    // If we couldn't parse enough data, return null
    if (poemLines.length === 0) {
      return null;
    }
    
    return {
      title,
      poeticPhrase: poeticPhrase || 'A reflection in symbolic weather',
      poem: poemLines.slice(0, 6), // Max 6 lines
      mirrorPrompt: mirrorPrompt || 'What does this reveal about your current path?',
      blockTimeNote: 'echoes may land past, present, or future',
      dominantPlanet,
      colorTheme: dominantPlanet,
      talismancGlyph: getDominantGlyph(dominantPlanet),
  date: new Date().toISOString().slice(0, 10),
  astroGlyphs: [getDominantGlyph(dominantPlanet)],
  talismancSketch: '*',
  symbolDrivers: ['🟢']
    };
    
  } catch (error) {
    console.error('Error parsing card data:', error);
    return null;
  }
}

function getDominantGlyph(planet: string): string {
  const glyphs: Record<string, string> = {
    mars: '♂',
    sun: '☉',
    moon: '☽',
    neptune: '♆',
    saturn: '♄',
    chiron: '⚷',
    jupiter: '♃',
    venus: '♀',
    mercury: '☿',
    uranus: '♅',
    pluto: '♇'
  };
  return glyphs[planet] || '✦';
}

export function createSampleCard(): PoeticIndexCard {
  return {
    title: 'The Current Beneath Still Waters',
    poeticPhrase: 'where depth moves unseen',
    poem: [
      'You carry the ocean in small gestures,',
      'a tide that others feel but cannot name.',
      'What looks like stillness',
      'is actually patience,',
      'the kind that reshapes shores',
      'one grain at a time.'
    ],
    mirrorPrompt: 'Where does your quiet power move most freely?',
    blockTimeNote: 'echoes may land past, present, or future',
    dominantPlanet: 'moon',
    colorTheme: 'moon',
    talismancGlyph: '☽',
    astroGlyphs: ['☽', '♆', '♀'], // Moon, Neptune, Venus - emotion, intuition, harmony
    transitKey: 'MOON-NEPTUNE CONJUNCTION: Intuitive flow through emotional depths',
    talismancSketch: '~', // Flowing water symbol
    symbolDrivers: ['🔵', '⚪', '🟢'], // Blue (Neptune), White (Moon), Green (Venus)
    date: new Date().toISOString().slice(0, 10)
  };
}
