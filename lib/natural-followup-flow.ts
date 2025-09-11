// Natural Follow-up Flow System
// Implements the SST validation ladder for both positive and negative resonance

export interface PingResponse {
  type: 'AFFIRM' | 'OSR' | 'UNCLEAR';
  content: string;
  originalMirror: string;
  lineReference?: string; // which specific line they're referring to
}

export interface FollowUpFlow {
  stage: 'ZOOM_IN' | 'CLASSIFICATION' | 'OSR_PROBE' | 'DRIFT_TRACKING' | 'WRAP_UP';
  question: string;
  purpose: string; // what we're trying to learn
  expectedResponse: 'WB' | 'ABE' | 'OSR' | 'CLARIFICATION';
}

export interface SessionContext {
  wbHits: Array<{ content: string; line?: string; context?: string }>;
  abeHits: Array<{ content: string; tone: 'inverted' | 'off-tone' | 'flipped'; context?: string }>;
  osrMisses: Array<{ content: string; probeType?: 'opposite' | 'wrong-flavor' | 'not-in-field' }>;
  actorWeighting: number; // accumulates from OSR clarifications
  roleWeighting: number; // accumulates from WB/ABE
  driftIndex: number;
  currentComposite?: string;
  sessionActive: boolean;
}

export class NaturalFollowUpFlow {
  
  // Main entry point - determines follow-up based on response type
  generateFollowUp(response: PingResponse, context: SessionContext): FollowUpFlow {
    
    switch (response.type) {
      case 'AFFIRM':
        return this.generateZoomIn(response, context);
      
      case 'OSR':
        return this.generateOSRProbe(response, context);
        
      case 'UNCLEAR':
        return this.generateClarification(response, context);
        
      default:
        return this.generateGenericFollowUp();
    }
  }

  // Stage 1: Immediate zoom-in after affirmation
  private generateZoomIn(response: PingResponse, context: SessionContext): FollowUpFlow {
    const zoomInQuestions = [
      "Which line carried the weight for you — and how does it show up in your day?",
      "What part of that landed — and how do you feel it when it's live in your field?",
      "Which piece resonated — and how do you act when that pattern is active?",
      "What line hit — and where do you notice that pressure in your daily life?",
      "Which part felt true — and how does it move through you when it's present?"
    ];
    
    const question = zoomInQuestions[Math.floor(Math.random() * zoomInQuestions.length)];
    
    return {
      stage: 'ZOOM_IN',
      question,
      purpose: 'Isolate specific pressure and gather behavioral context',
      expectedResponse: 'WB' // We expect a clean match if they affirmed
    };
  }

  // Stage 3: Natural OSR probes with choice framework
  private generateOSRProbe(response: PingResponse, context: SessionContext): FollowUpFlow {
    const probeQuestions = [
      "That one missed. Was it more the opposite, the wrong flavor, or just not in your field at all?",
      "Didn't land. Was it backwards, off-tone, or simply not you?",
      "That felt off. More like the inverse, wrong style, or completely outside your range?",
      "Missed the mark. Was it flipped around, wrong energy, or not in your territory?",
      "That didn't fit. Was it contrary, mismatched tone, or just not your pattern?"
    ];
    
    const question = probeQuestions[Math.floor(Math.random() * probeQuestions.length)];
    
    return {
      stage: 'OSR_PROBE',
      question,
      purpose: 'Convert OSR miss into diagnostic data for Actor/Role weighting',
      expectedResponse: 'CLARIFICATION'
    };
  }

  // Generate clarifying questions for unclear responses
  private generateClarification(response: PingResponse, context: SessionContext): FollowUpFlow {
    const clarificationQuestions = [
      "Help me understand — what felt unclear about that reflection?",
      "What part felt muddy or hard to pin down?",
      "Where did that lose you — the description or how it applies?",
      "What made that feel uncertain for you?"
    ];
    
    const question = clarificationQuestions[Math.floor(Math.random() * clarificationQuestions.length)];
    
    return {
      stage: 'CLASSIFICATION',
      question,
      purpose: 'Gather more context to properly classify the response',
      expectedResponse: 'WB' // Hoping clarification leads to clean classification
    };
  }

  // Fallback for unexpected cases
  private generateGenericFollowUp(): FollowUpFlow {
    return {
      stage: 'CLASSIFICATION',
      question: "How does that land with you?",
      purpose: 'General resonance check',
      expectedResponse: 'WB'
    };
  }

  // Score response according to SST protocol
  classifyResponse(response: string, followUpType: FollowUpFlow['stage']): {
    classification: 'WB' | 'ABE' | 'OSR';
    weight: number;
    targetWeighting: 'actor' | 'role' | 'both';
    probeType?: 'opposite' | 'wrong-flavor' | 'not-in-field';
  } {
    const lower = response.toLowerCase();
    
    // For OSR probes, classify the type of miss
    if (followUpType === 'OSR_PROBE') {
      let probeType: 'opposite' | 'wrong-flavor' | 'not-in-field' = 'not-in-field';
      
      if (lower.includes('opposite') || lower.includes('backwards') || lower.includes('flipped') || lower.includes('inverse')) {
        probeType = 'opposite';
      } else if (lower.includes('flavor') || lower.includes('tone') || lower.includes('style') || lower.includes('energy')) {
        probeType = 'wrong-flavor';
      }
      
      return {
        classification: 'OSR',
        weight: 0,
        targetWeighting: 'actor', // OSR clarifications only feed Actor weighting
        probeType
      };
    }

    // For zoom-in responses, look for clear behavioral descriptions
    if (followUpType === 'ZOOM_IN') {
      // Check for clear, specific behavioral examples
      const behaviorIndicators = [
        'when i', 'i tend to', 'i usually', 'i feel', 'i notice',
        'shows up as', 'happens when', 'looks like', 'feels like'
      ];
      
      const hasSpecificBehavior = behaviorIndicators.some(indicator => lower.includes(indicator));
      
      if (hasSpecificBehavior && response.length > 50) {
        return {
          classification: 'WB',
          weight: 1.0,
          targetWeighting: 'both' // Strong behavioral match feeds both Actor and Role
        };
      } else if (hasSpecificBehavior) {
        return {
          classification: 'ABE',
          weight: 0.5,
          targetWeighting: 'role' // Partial match primarily Role-based
        };
      } else {
        return {
          classification: 'OSR',
          weight: 0,
          targetWeighting: 'actor'
        };
      }
    }

    // Default classification for other response types
    if (lower.includes('yes') || lower.includes('exactly') || lower.includes('that\'s me')) {
      return {
        classification: 'WB',
        weight: 1.0,
        targetWeighting: 'both'
      };
    } else if (lower.includes('somewhat') || lower.includes('partially') || lower.includes('kind of')) {
      return {
        classification: 'ABE',
        weight: 0.5,
        targetWeighting: 'role'
      };
    } else {
      return {
        classification: 'OSR',
        weight: 0,
        targetWeighting: 'actor'
      };
    }
  }

  // Update session context with new response data
  updateSessionContext(
    context: SessionContext, 
    response: string, 
    classification: ReturnType<typeof this.classifyResponse>
  ): SessionContext {
    const updated = { ...context };

    // Add to appropriate collection
    switch (classification.classification) {
      case 'WB':
        updated.wbHits.push({ content: response });
        break;
      case 'ABE':
        updated.abeHits.push({ 
          content: response, 
          tone: 'off-tone' // Could be refined based on analysis
        });
        break;
      case 'OSR':
        updated.osrMisses.push({ 
          content: response,
          probeType: classification.probeType
        });
        break;
    }

    // Update weightings based on target
    switch (classification.targetWeighting) {
      case 'actor':
        updated.actorWeighting += classification.weight;
        break;
      case 'role':
        updated.roleWeighting += classification.weight;
        break;
      case 'both':
        updated.actorWeighting += classification.weight * 0.6; // Actor gets more from behavioral descriptions
        updated.roleWeighting += classification.weight * 0.4;
        break;
    }

    // Update drift index
    const totalWeight = updated.actorWeighting + updated.roleWeighting;
    updated.driftIndex = totalWeight > 0 ? updated.actorWeighting / totalWeight : 0;

    return updated;
  }

  // Generate wrap-up consolidation card
  generateWrapUpCard(context: SessionContext): {
    hookStack: string[];
    resonantLines: string[];
    scoreStrip: { wb: number; abe: number; osr: number };
    resonanceFidelity: { percentage: number; band: 'HIGH' | 'MIXED' | 'LOW'; label: string };
    actorRoleComposite?: string;
    driftFlag: boolean;
    climateRibbon?: string;
  } {
    const fidelity = this.calculateResonanceFidelity(context);
    
    return {
      hookStack: [], // Would be populated from session's hook patterns
      resonantLines: context.wbHits.map(hit => hit.content),
      scoreStrip: {
        wb: context.wbHits.length,
        abe: context.abeHits.length,
        osr: context.osrMisses.length
      },
      resonanceFidelity: fidelity,
      actorRoleComposite: context.currentComposite,
      driftFlag: context.driftIndex > 0.6, // Strong actor weighting suggests sidereal drift
      climateRibbon: undefined // Would be populated if timed session
    };
  }

  // Calculate Resonance Fidelity percentage
  calculateResonanceFidelity(context: SessionContext): {
    percentage: number;
    band: 'HIGH' | 'MIXED' | 'LOW';
    label: string;
  } {
    const wb = context.wbHits.length;
    const abe = context.abeHits.length;
    const osr = context.osrMisses.length;
    
    // Handle edge case of no responses
    const totalResponses = wb + abe + osr;
    if (totalResponses === 0) {
      return { percentage: 0, band: 'LOW', label: 'No Responses Yet' };
    }
    
    // Formula: (WB + 0.5 × ABE) / (WB + ABE + OSR) × 100
    const weightedHits = wb + (0.5 * abe);
    const percentage = Math.round((weightedHits / totalResponses) * 100);
    
    // Determine band and label
    let band: 'HIGH' | 'MIXED' | 'LOW';
    let label: string;
    
    if (percentage > 70) {
      band = 'HIGH';
      label = 'High Alignment';
    } else if (percentage >= 40) {
      band = 'MIXED';
      label = 'Mixed Resonance';
    } else {
      band = 'LOW';
      label = 'Low Alignment';
    }
    
    return { percentage, band, label };
  }

  // Session closure prompts
  generateSessionClosure(): {
    resetPrompt: string;
    continuationOptions: string[];
  } {
    return {
      resetPrompt: "Are you going to upload a new report or are we to speak of something else in your pattern?",
      continuationOptions: [
        "Upload new report",
        "Explore another area",
        "Generate poetic card",
        "Review session patterns"
      ]
    };
  }

  // Separate poetic card generation (not mixed with poems)
  generatePoeticCard(context: SessionContext): {
    title: string;
    resonantLine: string;
    scoreIndicator: string;
    resonanceFidelity: { percentage: number; band: 'HIGH' | 'MIXED' | 'LOW'; label: string };
    compositeGuess: string;
    driftFlag?: string;
  } {
    const bestLine = context.wbHits[0]?.content || "No clear resonance yet";
    const scoreIndicator = `✅ ${context.wbHits.length} WB / 🟡 ${context.abeHits.length} ABE / ❌ ${context.osrMisses.length} OSR`;
    const fidelity = this.calculateResonanceFidelity(context);
    
    return {
      title: "Resonance Pattern Card",
      resonantLine: bestLine,
      scoreIndicator,
      resonanceFidelity: fidelity,
      compositeGuess: context.currentComposite || "Pattern emerging...",
      driftFlag: context.driftIndex > 0.6 ? "🌀 Sidereal drift detected" : undefined
    };
  }

  // Generate narrative journal summary (3rd person retrospective)
  generateJournalSummary(context: SessionContext, userName: string = "the user"): {
    title: string;
    narrative: string;
    metadata: {
      sessionDate: string;
      totalInteractions: number;
      resonanceFidelity: number;
      primaryPatterns: string[];
    };
  } {
    const fidelity = this.calculateResonanceFidelity(context);
    const sessionDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Extract key patterns from WB hits
    const primaryPatterns = context.wbHits
      .slice(0, 3) // Top 3 resonant patterns
      .map(hit => this.extractKeyPhrase(hit.content))
      .filter(phrase => phrase.length > 0);
    
    // Generate narrative based on session content
    const narrative = this.generateNarrativeSummary(context, userName, fidelity);
    
    return {
      title: `Raven Reading Session - ${userName}`,
      narrative,
      metadata: {
        sessionDate,
        totalInteractions: context.wbHits.length + context.abeHits.length + context.osrMisses.length,
        resonanceFidelity: fidelity.percentage,
        primaryPatterns
      }
    };
  }

  // Extract key phrase from longer content
  private extractKeyPhrase(content: string): string {
    // Look for key behavioral indicators
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const keyWords = ['when i', 'i tend to', 'i usually', 'i feel', 'shows up as'];
    
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase().trim();
      if (keyWords.some(kw => lower.includes(kw)) && sentence.length < 100) {
        return sentence.trim();
      }
    }
    
    // Fallback to first meaningful sentence
    return sentences[0]?.trim() || content.substring(0, 50) + '...';
  }

  // Generate 3rd person narrative summary
  private generateNarrativeSummary(context: SessionContext, userName: string, fidelity: ReturnType<typeof this.calculateResonanceFidelity>): string {
    const totalResponses = context.wbHits.length + context.abeHits.length + context.osrMisses.length;
    
    if (totalResponses === 0) {
      return `${userName} began a session with Raven but had not yet explored any patterns deeply enough for resonance tracking.`;
    }
    
    let narrative = `On this session, ${userName} sat with Raven to explore the patterns written in their chart. `;
    
    // Opening based on resonance level
    if (fidelity.band === 'HIGH') {
      narrative += `The conversation flowed with remarkable alignment—Raven's mirrors consistently landed true, with ${userName} recognizing themselves clearly in ${fidelity.percentage}% of the reflections offered. `;
    } else if (fidelity.band === 'MIXED') {
      narrative += `The dialogue wove between recognition and clarification, with ${userName} finding ${fidelity.percentage}% resonance as they and Raven navigated the more complex territories of their pattern. `;
    } else {
      narrative += `This session required careful excavation, with only ${fidelity.percentage}% initial resonance as ${userName} and Raven worked together to find the precise language for their inner architecture. `;
    }
    
    // Add WB patterns if they exist
    if (context.wbHits.length > 0) {
      narrative += `What rang most true were insights around `;
      const patterns = context.wbHits.slice(0, 2).map(hit => this.extractKeyPhrase(hit.content));
      if (patterns.length === 1) {
        narrative += `${patterns[0].toLowerCase()}. `;
      } else {
        narrative += `${patterns.slice(0, -1).join(', ').toLowerCase()}, and ${patterns[patterns.length - 1].toLowerCase()}. `;
      }
    }
    
    // Add drift detection if present
    if (context.driftIndex > 0.6) {
      narrative += `Throughout the exchange, Raven detected signs that ${userName}'s core drives might operate from a different seasonal rhythm than their outward presentation suggests—a pattern sometimes called sidereal drift. `;
    }
    
    // Add OSR handling if significant
    if (context.osrMisses.length > 0) {
      const osrRatio = context.osrMisses.length / totalResponses;
      if (osrRatio > 0.3) {
        narrative += `Several of Raven's initial offerings missed the mark entirely, requiring gentle probing to understand whether the patterns were inverted, off-tone, or simply outside ${userName}'s field altogether. `;
      }
    }
    
    // Closing based on session completeness
    if (context.currentComposite) {
      narrative += `By session's end, the tentative pattern emerging was "${context.currentComposite}"—though ${userName}, as always, remained the final validator of what felt true.`;
    } else {
      narrative += `The session concluded with patterns still crystallizing, leaving space for ${userName} to continue the exploration when ready.`;
    }
    
    return narrative;
  }
}

export const naturalFollowUpFlow = new NaturalFollowUpFlow();
