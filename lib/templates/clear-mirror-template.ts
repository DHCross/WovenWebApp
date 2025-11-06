/**
 * CLEAR MIRROR TEMPLATE
 * 
 * E-Prime Translation Layer with Symbolic Footnotes
 * Implements the Woven Map Reader + Audit Format
 * 
 * ARCHITECTURE NOTE:
 * - Math Brain: Calculates geometry, aspects, magnitudes, WB/ABE/OSR classification
 * - Poetic Brain (Raven Calder): Translates geometry into testable language
 * 
 * This template structures what Poetic Brain receives from Math Brain:
 * - Coordinates, vectors, orbs, magnitudes
 * - Seismograph classifications
 * - Aspect matrices (for relational: A→B overlays)
 * 
 * Raven Calder then:
 * - Compresses high-magnitude patterns into Core Insights
 * - Translates symbolic dynamics into lived-language hypotheses
 * - Renders Polarity Cards from tension patterns
 * - Generates Mirror Voice reflection
 * 
 * Protocol:
 * - E-Prime: All process/perception verbs (no "is/am/are/was/were/be/being/been")
 * - Inline footnotes: Superscript numbers in main text
 * - Symbolic geometry: Consolidated after each section
 * - Audit layer: Collapsible developer tables
 * - Socratic closure: WB/ABE/OSR marking system
 */

export interface ClearMirrorData {
  personName: string;
  date: string;
  chartType: 'solo' | 'relational';
  // Relational-specific fields
  personBName?: string;
  intimacyTier?: string;  // e.g., "Partner: P5a"
  contactState?: 'Active' | 'Latent';
  individualFieldA?: {
    text: string;
    footnotes?: Array<{ number: number; content: string }>;
  };
  individualFieldB?: {
    text: string;
    footnotes?: Array<{ number: number; content: string }>;
  };
  preface?: string;
  frontstage: {
    text: string;
    footnotes: Array<{ number: number; content: string }>;
  };
  resonantSummary?: {
    text: string;
    footnotes?: Array<{ number: number; content: string }>;
  };
  coreInsights?: {
    insights: Array<{ pattern: string; geometry: string; testMarker: string }>;
  };
  personalityBlueprint?: {
    text: string;
    footnotes?: Array<{ number: number; content: string }>;
  };
  polarityCards?: Array<{
    title: string;
    text: string;
    footnote?: string;
  }>;
  integration?: {
    text: string;
    footnotes?: Array<{ number: number; content: string }>;
  };
  innerConstitution?: {
    text: string;
    footnotes?: Array<{ number: number; content: string }>;
  };
  mirrorVoice?: {
    text: string;
    footnotes?: Array<{ number: number; content: string }>;
  };
  auditLayer?: {
    frontstage?: Array<{ observed: string; geometry: string; testMarker: string }>;
    resonantSummary?: Array<{ dynamic: string; correlation: string; testPrompt: string }>;
    coreInsights?: Array<{ pattern: string; geometry: string; testMarker: string }>;
    personalityBlueprint?: Array<{ habit: string; geometry: string; testMarker: string }>;
    polarityCards?: Array<{ polarity: string; geometry: string; testMarker: string }>;
    integration?: Array<{ dynamic: string; geometry: string; testMarker: string }>;
    innerConstitution?: Array<{ archetypal: string; geometry: string; expression: string; testMarker: string }>;
    mirrorVoice?: Array<{ insight: string; geometry: string; testPrompt: string }>;
  };
}

/**
 * Generate Clear Mirror markdown with E-Prime formatting and footnotes
 */
export function generateClearMirrorMarkdown(data: ClearMirrorData): string {
  const lines: string[] = [];

  // Header
  if (data.chartType === 'relational') {
    lines.push(`**${data.personName} + ${data.personBName} — Relational Mirror Reading**`);
  } else {
    lines.push(`**${data.personName} — Solo Mirror Reading**`);
  }
  lines.push(`**Woven Map | Reader + Audit Format**`);
  lines.push(`*(E-Prime Translation Layer with Footnotes)*`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Preface
  if (data.chartType === 'relational') {
    lines.push('### Frontstage Preface');
    lines.push('This reflection draws from the symbolic geometry between both charts. It explores how the patterns might interact rather than predict how the relationship will unfold. Each description functions as a testable hypothesis.');
    lines.push('');
    if (data.intimacyTier) {
      lines.push(`**Tier:** ${data.intimacyTier}`);
    }
    if (data.contactState) {
      lines.push(`**Contact State:** ${data.contactState}`);
    }
    lines.push('');
    lines.push('**Context Note:** Angles and houses relocate per individual; baseline patterns remain natal. Each polarity described holds two ends—neither "good" nor "bad." The reflection names contact zones, not verdicts.');
    lines.push('');
    lines.push('---');
    lines.push('');
  } else if (data.preface) {
    lines.push('### Preface');
    lines.push(data.preface);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Individual Field Snapshots (relational only)
  if (data.chartType === 'relational') {
    lines.push('### Individual Field Snapshots');
    lines.push('');
    
    if (data.individualFieldA) {
      lines.push(`**Person A (${data.personName})**`);
      lines.push(data.individualFieldA.text);
      lines.push('');
      
      if (data.individualFieldA.footnotes && data.individualFieldA.footnotes.length > 0) {
        lines.push('**Symbolic Footnotes**');
        data.individualFieldA.footnotes.forEach(fn => {
          lines.push(`${fn.number} ${fn.content}`);
        });
        lines.push('');
      }
    }
    
    if (data.individualFieldB) {
      lines.push(`**Person B (${data.personBName})**`);
      lines.push(data.individualFieldB.text);
      lines.push('');
      
      if (data.individualFieldB.footnotes && data.individualFieldB.footnotes.length > 0) {
        lines.push('**Symbolic Footnotes**');
        data.individualFieldB.footnotes.forEach(fn => {
          lines.push(`${fn.number} ${fn.content}`);
        });
        lines.push('');
      }
    }
    
    lines.push('---');
    lines.push('');
  }

  // Frontstage (solo only - relational uses Individual Field Snapshots instead)
  if (data.chartType === 'solo') {
    lines.push('### Frontstage');
    lines.push('This reflection avoids prediction or judgment. It draws from symbolic geometry and outlines tendencies the pattern could imply—hypotheses to test in lived experience.');
    lines.push('');
    lines.push(data.frontstage.text);
    lines.push('');
  }

  // Frontstage footnotes
  if (data.frontstage.footnotes && data.frontstage.footnotes.length > 0) {
    lines.push('**Symbolic Footnotes**');
    data.frontstage.footnotes.forEach(fn => {
      lines.push(`${fn.number} ${fn.content}`);
    });
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Resonant Summary
  if (data.resonantSummary) {
    if (data.chartType === 'relational') {
      lines.push('### Shared Resonant Summary');
      lines.push('Outlines what the overlay feels like when coherent: how the two energy systems interact under stability. Describes overall temperature—supportive, catalytic, reflective—without value judgment.');
    } else {
      lines.push('### Resonant Summary');
    }
    lines.push('');
    lines.push(data.resonantSummary.text);
    lines.push('');
    
    if (data.resonantSummary.footnotes && data.resonantSummary.footnotes.length > 0) {
      lines.push('**Symbolic Footnotes**');
      data.resonantSummary.footnotes.forEach(fn => {
        lines.push(`${fn.number} ${fn.content}`);
      });
      lines.push('');
    }
    
    lines.push('---');
    lines.push('');
  }

  // Core Insights
  if (data.coreInsights) {
    if (data.chartType === 'relational') {
      lines.push('### Core Insights (Relational)');
      lines.push('*Each insight identifies one area of recognition, attraction, or friction. Use parallel phrasing for balance.*');
    } else {
      lines.push('### Core Insights');
    }
    lines.push('');
    data.coreInsights.insights.forEach((insight, idx) => {
      lines.push(`**Insight ${idx + 1} — ${insight.pattern}**`);
      lines.push(`*Geometry:* ${insight.geometry}`);
      lines.push(`*Test:* ${insight.testMarker}`);
      lines.push('');
    });
    lines.push('---');
    lines.push('');
  }

  // Personality Blueprint
  if (data.personalityBlueprint) {
    lines.push('### Personality Blueprint');
    lines.push(data.personalityBlueprint.text);
    lines.push('');
    
    if (data.personalityBlueprint.footnotes && data.personalityBlueprint.footnotes.length > 0) {
      lines.push('**Symbolic Footnotes**');
      data.personalityBlueprint.footnotes.forEach(fn => {
        lines.push(`${fn.number} ${fn.content}`);
      });
      lines.push('');
    }
    
    lines.push('---');
    lines.push('');
  }

  // Polarity Cards
  if (data.polarityCards && data.polarityCards.length > 0) {
    lines.push('### Polarity Cards');
    lines.push('*Every strength you display carries an opposite that keeps it balanced. These forces share a single current. You notice which side leads at a given moment.*');
    lines.push('');
    
    data.polarityCards.forEach((card, idx) => {
      lines.push(`**Card ${idx + 1} — ${card.title}**`);
      lines.push(card.text);
      if (card.footnote) {
        lines.push(`*${card.footnote}*`);
      }
      lines.push('');
    });
    
    lines.push('---');
    lines.push('');
  }

  // Integration
  if (data.integration) {
    lines.push('### Integration');
    lines.push(data.integration.text);
    lines.push('');
    
    if (data.integration.footnotes && data.integration.footnotes.length > 0) {
      lines.push('**Symbolic Footnotes**');
      data.integration.footnotes.forEach(fn => {
        lines.push(`${fn.number} ${fn.content}`);
      });
      lines.push('');
    }
    
    lines.push('---');
    lines.push('');
  }

  // Inner Constitution
  if (data.innerConstitution) {
    lines.push('### Inner Constitution');
    lines.push(data.innerConstitution.text);
    lines.push('');
    
    if (data.innerConstitution.footnotes && data.innerConstitution.footnotes.length > 0) {
      lines.push('**Symbolic Footnotes**');
      data.innerConstitution.footnotes.forEach(fn => {
        lines.push(`${fn.number} ${fn.content}`);
      });
      lines.push('');
    }
    
    lines.push('---');
    lines.push('');
  }

  // Mirror Voice
  if (data.mirrorVoice) {
    if (data.chartType === 'relational') {
      lines.push('### Mirror Voice (Dyadic)');
      lines.push('*Language shifts from dual subject to single current.*');
    } else {
      lines.push('### Mirror Voice');
    }
    lines.push('');
    lines.push(data.mirrorVoice.text);
    lines.push('');
    
    if (data.mirrorVoice.footnotes && data.mirrorVoice.footnotes.length > 0) {
      lines.push('**Symbolic Footnotes**');
      data.mirrorVoice.footnotes.forEach(fn => {
        lines.push(`${fn.number} ${fn.content}`);
      });
      lines.push('');
    }
    
    lines.push('---');
    lines.push('');
  }

  // Socratic Closure
  lines.push('### Socratic Closure');
  if (data.chartType === 'relational') {
    lines.push('Invite both readers to mark resonance separately:');
    lines.push('');
    lines.push('| Symbol | Meaning |');
    lines.push('|--------|---------|');
    lines.push('| **WB** | Felt accurate for me |');
    lines.push('| **ABE** | Partial or situational |');
    lines.push('| **OSR** | Did not fit my experience |');
    lines.push('');
    lines.push('Reflection becomes research; agreement is optional.');
  } else {
    lines.push('As you read, mark each idea:');
    lines.push('- **WB** (Within Boundary): experience supports this');
    lines.push('- **ABE** (At Boundary Edge): experience partly supports, partly contradicts');
    lines.push('- **OSR** (Outside Symbolic Range): experience contradicts this');
    lines.push('');
    lines.push('These marks calibrate. The act of marking participates in the mirror—proof through lived testing, not belief.');
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Structure Note
  if (data.chartType === 'relational') {
    lines.push('### Structure Summary (Plain)');
    lines.push('This relational reading translates verified geometric relationships into testable language. It predicts nothing. It invites recognition of patterns that feel lived. Both perspectives supply the data.');
  } else {
    lines.push('### Structure Note');
    lines.push('This reflection derives from symbolic pattern data using time, place, and geometric relationships. It predicts nothing. It translates structure into language you can test against actual experience.');
    lines.push('Every statement invites proof or disproof by how your days unfold. That testing performs the real work of the Woven Map.');
  }
  lines.push('');

  // Audit Layer (collapsible in HTML/PDF)
  if (data.auditLayer) {
    lines.push('---');
    lines.push('');
    lines.push('### Developer Audit Layer');
    lines.push('*(Symbolic geometry reference tables)*');
    lines.push('');

    // Frontstage Audit
    if (data.auditLayer.frontstage && data.auditLayer.frontstage.length > 0) {
      lines.push('#### Frontstage — Audit');
      lines.push('| Observed Function | Symbolic Geometry | Test Marker |');
      lines.push('|-------------------|-------------------|-------------|');
      data.auditLayer.frontstage.forEach(row => {
        lines.push(`| ${row.observed} | ${row.geometry} | ${row.testMarker} |`);
      });
      lines.push('');
    }

    // Resonant Summary Audit
    if (data.auditLayer.resonantSummary && data.auditLayer.resonantSummary.length > 0) {
      lines.push('#### Resonant Summary — Audit');
      lines.push('| Core Dynamic | Symbolic Correlation | Reader Testing Prompt |');
      lines.push('|--------------|----------------------|------------------------|');
      data.auditLayer.resonantSummary.forEach(row => {
        lines.push(`| ${row.dynamic} | ${row.correlation} | ${row.testPrompt} |`);
      });
      lines.push('');
    }

    // Core Insights Audit
    if (data.auditLayer.coreInsights && data.auditLayer.coreInsights.length > 0) {
      lines.push('#### Core Insights — Audit');
      lines.push('| Observable Pattern | Symbolic Geometry | Test Marker |');
      lines.push('|--------------------|-------------------|-------------|');
      data.auditLayer.coreInsights.forEach(row => {
        lines.push(`| ${row.pattern} | ${row.geometry} | ${row.testMarker} |`);
      });
      lines.push('');
    }

    // Personality Blueprint Audit
    if (data.auditLayer.personalityBlueprint && data.auditLayer.personalityBlueprint.length > 0) {
      lines.push('#### Personality Blueprint — Audit');
      lines.push('| Core Habit or Tension | Symbolic Geometry | Test Marker |');
      lines.push('|-----------------------|-------------------|-------------|');
      data.auditLayer.personalityBlueprint.forEach(row => {
        lines.push(`| ${row.habit} | ${row.geometry} | ${row.testMarker} |`);
      });
      lines.push('');
    }

    // Polarity Cards Audit
    if (data.auditLayer.polarityCards && data.auditLayer.polarityCards.length > 0) {
      lines.push('#### Polarity Cards — Audit');
      lines.push('| Polarity | Symbolic Geometry | Test Marker |');
      lines.push('|----------|-------------------|-------------|');
      data.auditLayer.polarityCards.forEach(row => {
        lines.push(`| ${row.polarity} | ${row.geometry} | ${row.testMarker} |`);
      });
      lines.push('');
    }

    // Integration Audit
    if (data.auditLayer.integration && data.auditLayer.integration.length > 0) {
      lines.push('#### Integration — Audit');
      lines.push('| Dynamic | Symbolic Geometry | Test Marker |');
      lines.push('|---------|-------------------|-------------|');
      data.auditLayer.integration.forEach(row => {
        lines.push(`| ${row.dynamic} | ${row.geometry} | ${row.testMarker} |`);
      });
      lines.push('');
    }

    // Inner Constitution Audit
    if (data.auditLayer.innerConstitution && data.auditLayer.innerConstitution.length > 0) {
      lines.push('#### Inner Constitution — Audit');
      lines.push('| Archetypal Function | Symbolic Geometry | Expression in Life | Testing Marker |');
      lines.push('|---------------------|-------------------|--------------------|----------------|');
      data.auditLayer.innerConstitution.forEach(row => {
        lines.push(`| ${row.archetypal} | ${row.geometry} | ${row.expression} | ${row.testMarker} |`);
      });
      lines.push('');
    }

    // Mirror Voice Audit
    if (data.auditLayer.mirrorVoice && data.auditLayer.mirrorVoice.length > 0) {
      lines.push('#### Mirror Voice — Audit');
      lines.push('| Reflective Insight | Symbolic Geometry | Reader Testing Prompt |');
      lines.push('|--------------------|-------------------|------------------------|');
      data.auditLayer.mirrorVoice.forEach(row => {
        lines.push(`| ${row.insight} | ${row.geometry} | ${row.testPrompt} |`);
      });
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Helper: Format symbolic footnote reference
 * @example formatFootnoteRef("Sun in Aries") → "[e.g., Sun in Aries]"
 */
export function formatFootnoteRef(geometry: string): string {
  return `[e.g., ${geometry}]`;
}

/**
 * Helper: Convert "is/are/was" statements to E-Prime alternatives
 * Basic transformation utilities for E-Prime compliance
 */
export const ePrimeTransforms = {
  // Convert "X is Y" → "X appears as Y" / "X functions as Y" / "X tends toward Y"
  convertIsStatement(text: string): string {
    return text
      .replace(/\bis\b/gi, 'appears as')
      .replace(/\bare\b/gi, 'appear as')
      .replace(/\bwas\b/gi, 'appeared as')
      .replace(/\bwere\b/gi, 'appeared as')
      .replace(/\bbeing\b/gi, 'functioning as')
      .replace(/\bbeen\b/gi, 'functioned as');
  },

  // Suggest E-Prime alternatives for common phrases
  suggestions: {
    'you are': ['you tend to', 'you appear', 'you function as', 'you move toward'],
    'this is': ['this appears as', 'this functions as', 'this tends to', 'this corresponds to'],
    'it is': ['it appears', 'it functions', 'it tends', 'it corresponds'],
    'you seem': ['you tend to', 'the pattern suggests', 'you appear to'],
    'the pattern is': ['the pattern shows', 'the pattern suggests', 'the pattern indicates'],
  }
};

export default generateClearMirrorMarkdown;
