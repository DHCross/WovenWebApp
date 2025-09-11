// Follow-up Question Generator for OSR (doesn't feel familiar) responses
// Generates chart-based questions to gather more SST data without showing jargon

export interface ChartContext {
  sun?: { sign: string; house?: number };
  moon?: { sign: string; house?: number };
  rising?: { sign: string; house?: number };
  venus?: { sign: string; house?: number };
  mars?: { sign: string; house?: number };
  mercury?: { sign: string; house?: number };
  dominantPlanets?: string[];
  stressedAspects?: string[];
  houses?: Record<number, string[]>; // house -> planets in that house
}

export interface FollowUpQuestion {
  question: string;
  category: 'energy' | 'relationships' | 'communication' | 'work' | 'home' | 'identity' | 'emotional';
  astroBasis: string; // hidden - what chart element this probes
  expectedResonance: 'high' | 'medium' | 'low';
  sstTarget: 'WB' | 'ABE'; // what kind of response we're fishing for
}

export class FollowUpGenerator {
  // Generate follow-up questions when user says something doesn't feel familiar
  generateChartBasedQuestions(
    originalMirror: string,
    chartContext: ChartContext,
    maxQuestions: number = 3
  ): FollowUpQuestion[] {
    const questions: FollowUpQuestion[] = [];
    
    // Analyze the original mirror to understand what didn't resonate
    const mirrorAnalysis = this.analyzeMirrorContent(originalMirror);
    
    // Generate questions based on chart context, avoiding the failed area
    if (chartContext.sun && mirrorAnalysis.failedArea !== 'identity') {
      questions.push(...this.generateSunQuestions(chartContext.sun));
    }
    
    if (chartContext.moon && mirrorAnalysis.failedArea !== 'emotional') {
      questions.push(...this.generateMoonQuestions(chartContext.moon));
    }
    
    if (chartContext.mars && mirrorAnalysis.failedArea !== 'energy') {
      questions.push(...this.generateMarsQuestions(chartContext.mars));
    }
    
    if (chartContext.venus && mirrorAnalysis.failedArea !== 'relationships') {
      questions.push(...this.generateVenusQuestions(chartContext.venus));
    }
    
    if (chartContext.mercury && mirrorAnalysis.failedArea !== 'communication') {
      questions.push(...this.generateMercuryQuestions(chartContext.mercury));
    }
    
    // Add house-based questions for daily life areas
    if (chartContext.houses) {
      questions.push(...this.generateHouseQuestions(chartContext.houses, mirrorAnalysis.failedArea));
    }
    
    // Sort by expected resonance and return top results
    const sorted = questions
      .sort((a, b) => {
        const scoreA = a.expectedResonance === 'high' ? 3 : a.expectedResonance === 'medium' ? 2 : 1;
        const scoreB = b.expectedResonance === 'high' ? 3 : b.expectedResonance === 'medium' ? 2 : 1;
        return scoreB - scoreA;
      })
      .slice(0, maxQuestions);
    
    return sorted;
  }

  private analyzeMirrorContent(mirror: string): { failedArea: string; themes: string[] } {
    const lower = mirror.toLowerCase();
    
    let failedArea = 'unknown';
    if (lower.includes('energy') || lower.includes('drive') || lower.includes('action')) {
      failedArea = 'energy';
    } else if (lower.includes('relationship') || lower.includes('connect') || lower.includes('social')) {
      failedArea = 'relationships';
    } else if (lower.includes('communicate') || lower.includes('express') || lower.includes('voice')) {
      failedArea = 'communication';
    } else if (lower.includes('identity') || lower.includes('self') || lower.includes('core')) {
      failedArea = 'identity';
    } else if (lower.includes('emotion') || lower.includes('feel') || lower.includes('mood')) {
      failedArea = 'emotional';
    }
    
    return { failedArea, themes: [] };
  }

  private generateSunQuestions(sun: { sign: string; house?: number }): FollowUpQuestion[] {
    const questions: FollowUpQuestion[] = [];
    
    // Sun sign-based identity questions (hidden astro logic)
    const sunSignQuestions = {
      'Aries': [
        {
          question: "When you're really energized, do you tend to jump into things quickly or take your time?",
          category: 'energy' as const,
          astroBasis: 'Sun in Aries - cardinal fire initiative',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        },
        {
          question: "Do you feel most like yourself when leading or when following others' lead?",
          category: 'identity' as const,
          astroBasis: 'Sun in Aries - leadership drive',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        }
      ],
      'Taurus': [
        {
          question: "When stressed, do you crave stability and routine, or do you seek change and novelty?",
          category: 'identity' as const,
          astroBasis: 'Sun in Taurus - fixed earth stability',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        },
        {
          question: "Do you find yourself naturally slowing down conversations or speeding them up?",
          category: 'communication' as const,
          astroBasis: 'Sun in Taurus - deliberate pace',
          expectedResonance: 'medium' as const,
          sstTarget: 'WB' as const
        }
      ],
      'Gemini': [
        {
          question: "When you're excited about something, do you immediately want to talk about it with others?",
          category: 'communication' as const,
          astroBasis: 'Sun in Gemini - mutable air expression',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        },
        {
          question: "Do you often have multiple projects or interests going at the same time?",
          category: 'energy' as const,
          astroBasis: 'Sun in Gemini - scattered focus',
          expectedResonance: 'medium' as const,
          sstTarget: 'WB' as const
        }
      ],
      'Cancer': [
        {
          question: "When someone you care about is upset, do you immediately want to help or protect them?",
          category: 'relationships' as const,
          astroBasis: 'Sun in Cancer - cardinal water nurturing',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        },
        {
          question: "Do you feel more energized at home than when you're out and about?",
          category: 'home' as const,
          astroBasis: 'Sun in Cancer - domestic comfort',
          expectedResonance: 'medium' as const,
          sstTarget: 'WB' as const
        }
      ],
      'Leo': [
        {
          question: "When you accomplish something, do you naturally want to share it or keep it private?",
          category: 'identity' as const,
          astroBasis: 'Sun in Leo - fixed fire expression',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        },
        {
          question: "Do you tend to be the one who brings warmth and enthusiasm to group situations?",
          category: 'relationships' as const,
          astroBasis: 'Sun in Leo - radiant presence',
          expectedResonance: 'medium' as const,
          sstTarget: 'WB' as const
        }
      ],
      'Virgo': [
        {
          question: "When you see something that could be improved, do you feel compelled to fix it?",
          category: 'work' as const,
          astroBasis: 'Sun in Virgo - mutable earth perfecting',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        },
        {
          question: "Do you notice details that others tend to miss?",
          category: 'identity' as const,
          astroBasis: 'Sun in Virgo - analytical precision',
          expectedResonance: 'medium' as const,
          sstTarget: 'WB' as const
        }
      ],
      'Libra': [
        {
          question: "When there's conflict around you, do you feel an urge to smooth things over?",
          category: 'relationships' as const,
          astroBasis: 'Sun in Libra - cardinal air harmony',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        },
        {
          question: "Do you find yourself weighing pros and cons before making decisions?",
          category: 'identity' as const,
          astroBasis: 'Sun in Libra - balance seeking',
          expectedResonance: 'medium' as const,
          sstTarget: 'WB' as const
        }
      ],
      'Scorpio': [
        {
          question: "When someone shares something personal, do you tend to share something equally deep in return?",
          category: 'relationships' as const,
          astroBasis: 'Sun in Scorpio - fixed water intensity',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        },
        {
          question: "Do you prefer to understand the 'why' behind things rather than just accepting them at face value?",
          category: 'identity' as const,
          astroBasis: 'Sun in Scorpio - investigative nature',
          expectedResonance: 'medium' as const,
          sstTarget: 'WB' as const
        }
      ],
      'Sagittarius': [
        {
          question: "When you're passionate about something, do you want to share that enthusiasm with everyone?",
          category: 'communication' as const,
          astroBasis: 'Sun in Sagittarius - mutable fire expansion',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        },
        {
          question: "Do you feel restless when your routine becomes too predictable?",
          category: 'energy' as const,
          astroBasis: 'Sun in Sagittarius - freedom seeking',
          expectedResonance: 'medium' as const,
          sstTarget: 'WB' as const
        }
      ],
      'Capricorn': [
        {
          question: "When you set a goal, do you automatically start thinking about the practical steps to get there?",
          category: 'work' as const,
          astroBasis: 'Sun in Capricorn - cardinal earth structure',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        },
        {
          question: "Do you feel more comfortable when you have a clear sense of your responsibilities?",
          category: 'identity' as const,
          astroBasis: 'Sun in Capricorn - duty orientation',
          expectedResonance: 'medium' as const,
          sstTarget: 'WB' as const
        }
      ],
      'Aquarius': [
        {
          question: "When you see an unfair situation, do you feel motivated to challenge or change it?",
          category: 'identity' as const,
          astroBasis: 'Sun in Aquarius - fixed air reform',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        },
        {
          question: "Do you sometimes feel like you see things differently than most people around you?",
          category: 'communication' as const,
          astroBasis: 'Sun in Aquarius - unique perspective',
          expectedResonance: 'medium' as const,
          sstTarget: 'WB' as const
        }
      ],
      'Pisces': [
        {
          question: "When you're around someone who's feeling intense emotions, do you tend to absorb those feelings?",
          category: 'relationships' as const,
          astroBasis: 'Sun in Pisces - mutable water empathy',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        },
        {
          question: "Do you sometimes know things intuitively without being able to explain how?",
          category: 'identity' as const,
          astroBasis: 'Sun in Pisces - intuitive knowing',
          expectedResonance: 'medium' as const,
          sstTarget: 'WB' as const
        }
      ]
    };
    
    const signQuestions = sunSignQuestions[sun.sign as keyof typeof sunSignQuestions];
    if (signQuestions) {
      questions.push(...signQuestions);
    }
    
    return questions;
  }

  private generateMoonQuestions(moon: { sign: string; house?: number }): FollowUpQuestion[] {
    const questions: FollowUpQuestion[] = [];
    
    // Moon sign-based emotional questions
    const moonSignQuestions = {
      'Aries': [
        {
          question: "When you're upset, do you tend to get angry quickly or does it build up slowly?",
          category: 'emotional' as const,
          astroBasis: 'Moon in Aries - quick emotional reactions',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        }
      ],
      'Taurus': [
        {
          question: "When you're stressed, do you crave comfort foods or physical comforts?",
          category: 'emotional' as const,
          astroBasis: 'Moon in Taurus - sensory comfort seeking',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        }
      ],
      'Cancer': [
        {
          question: "Do your moods tend to change like tides - flowing in and out throughout the day?",
          category: 'emotional' as const,
          astroBasis: 'Moon in Cancer - emotional fluctuation',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        }
      ],
      'Scorpio': [
        {
          question: "When you feel something deeply, is it hard for you to let it go?",
          category: 'emotional' as const,
          astroBasis: 'Moon in Scorpio - emotional intensity and retention',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        }
      ]
      // Add more moon signs as needed
    };
    
    const signQuestions = moonSignQuestions[moon.sign as keyof typeof moonSignQuestions];
    if (signQuestions) {
      questions.push(...signQuestions);
    }
    
    return questions;
  }

  private generateMarsQuestions(mars: { sign: string; house?: number }): FollowUpQuestion[] {
    const questions: FollowUpQuestion[] = [];
    
    // Mars sign-based energy/action questions
    const marsSignQuestions = {
      'Aries': [
        {
          question: "When you want something, do you go after it immediately or plan your approach?",
          category: 'energy' as const,
          astroBasis: 'Mars in Aries - direct action',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        }
      ],
      'Taurus': [
        {
          question: "Once you start working on something, do you prefer to stick with it until it's completely finished?",
          category: 'work' as const,
          astroBasis: 'Mars in Taurus - persistent effort',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        }
      ],
      'Cancer': [
        {
          question: "Do you work hardest when you're protecting or caring for someone you love?",
          category: 'energy' as const,
          astroBasis: 'Mars in Cancer - protective motivation',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        }
      ]
      // Add more mars signs as needed
    };
    
    const signQuestions = marsSignQuestions[mars.sign as keyof typeof marsSignQuestions];
    if (signQuestions) {
      questions.push(...signQuestions);
    }
    
    return questions;
  }

  private generateVenusQuestions(venus: { sign: string; house?: number }): FollowUpQuestion[] {
    const questions: FollowUpQuestion[] = [];
    
    // Venus sign-based relationship/value questions
    const venusSignQuestions = {
      'Aries': [
        {
          question: "In relationships, do you prefer excitement and challenge over comfort and stability?",
          category: 'relationships' as const,
          astroBasis: 'Venus in Aries - dynamic attraction',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        }
      ],
      'Taurus': [
        {
          question: "Do you show love through physical gestures, gifts, or creating comfortable spaces?",
          category: 'relationships' as const,
          astroBasis: 'Venus in Taurus - sensory love expression',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        }
      ]
      // Add more venus signs as needed
    };
    
    const signQuestions = venusSignQuestions[venus.sign as keyof typeof venusSignQuestions];
    if (signQuestions) {
      questions.push(...signQuestions);
    }
    
    return questions;
  }

  private generateMercuryQuestions(mercury: { sign: string; house?: number }): FollowUpQuestion[] {
    const questions: FollowUpQuestion[] = [];
    
    // Mercury sign-based communication questions
    const mercurySignQuestions = {
      'Gemini': [
        {
          question: "When you're thinking through a problem, do you need to talk it out with someone?",
          category: 'communication' as const,
          astroBasis: 'Mercury in Gemini - verbal processing',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        }
      ],
      'Virgo': [
        {
          question: "When explaining something, do you automatically include all the practical details?",
          category: 'communication' as const,
          astroBasis: 'Mercury in Virgo - detailed communication',
          expectedResonance: 'high' as const,
          sstTarget: 'WB' as const
        }
      ]
      // Add more mercury signs as needed
    };
    
    const signQuestions = mercurySignQuestions[mercury.sign as keyof typeof mercurySignQuestions];
    if (signQuestions) {
      questions.push(...signQuestions);
    }
    
    return questions;
  }

  private generateHouseQuestions(houses: Record<number, string[]>, failedArea: string): FollowUpQuestion[] {
    const questions: FollowUpQuestion[] = [];
    
    // House-based life area questions
    const houseQuestions = {
      1: [
        {
          question: "When you meet new people, do they usually get a strong first impression of you?",
          category: 'identity' as const,
          astroBasis: 'Planets in 1st house - strong personal presence',
          expectedResonance: 'medium' as const,
          sstTarget: 'WB' as const
        }
      ],
      4: [
        {
          question: "Do you feel like your energy level changes dramatically when you're at home vs. out in the world?",
          category: 'home' as const,
          astroBasis: 'Planets in 4th house - home as energy source',
          expectedResonance: 'medium' as const,
          sstTarget: 'WB' as const
        }
      ],
      7: [
        {
          question: "Do you find that you learn the most about yourself through your close relationships?",
          category: 'relationships' as const,
          astroBasis: 'Planets in 7th house - self-discovery through others',
          expectedResonance: 'medium' as const,
          sstTarget: 'WB' as const
        }
      ],
      10: [
        {
          question: "Do you feel like your work or career is central to how you see yourself?",
          category: 'work' as const,
          astroBasis: 'Planets in 10th house - career identity',
          expectedResonance: 'medium' as const,
          sstTarget: 'WB' as const
        }
      ]
      // Add more houses as needed
    };
    
    // Only add house questions if we have planets in those houses
    Object.entries(houses).forEach(([houseNum, planets]) => {
      if (planets.length > 0) {
        const houseQuestions_forHouse = houseQuestions[parseInt(houseNum) as keyof typeof houseQuestions];
        if (houseQuestions_forHouse) {
          questions.push(...houseQuestions_forHouse);
        }
      }
    });
    
    return questions;
  }

  // Format questions for natural conversation flow
  formatAsNaturalFollowUp(questions: FollowUpQuestion[]): string {
    if (questions.length === 0) {
      return "Hmm, let me try a different angle. How do you typically respond when you're under pressure?";
    }
    
    const intros = [
      "Let me try a different approach.",
      "That's helpful feedback. Let me ask about this instead:",
      "Interesting - let me probe a different area.",
      "Got it. How about this:",
      "That tells me something important. Let me ask:"
    ];
    
    const intro = intros[Math.floor(Math.random() * intros.length)];
    const mainQuestion = questions[0].question;
    
    // Add a casual follow-up option
    const followUps = [
      "Does that feel more accurate to your experience?",
      "How does that land with you?",
      "Does that ring true for you?",
      "Is that closer to how you actually experience things?"
    ];
    
    const followUp = followUps[Math.floor(Math.random() * followUps.length)];
    
    return `${intro} ${mainQuestion} ${followUp}`;
  }
}

export const followUpGenerator = new FollowUpGenerator();
