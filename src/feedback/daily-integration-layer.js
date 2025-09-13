/**
 * Daily Integration Layer
 * Recognition Layer prompts and Weight Belt shareable summaries
 * 
 * Purpose: Bridge session insights into daily life with presence-first approach
 * Features:
 * - Recognition Layer: WB/ABE/OSR pattern cues for daily awareness
 * - Weight Belt: Portable summary cards for ongoing integration
 * - Presence-first approach: Notice before action
 */

const logger = require('../utils/logger');

class DailyIntegrationLayer {
    constructor() {
        this.recognitionPatterns = new RecognitionLayer();
        this.weightBelt = new WeightBelt();
    }

    /**
     * Generate daily integration package from session data
     * @param {Object} sessionData - Complete session with Hook Stack, SST logs, scores
     * @param {Object} ladderResults - Advice Ladder Tree outcomes
     * @param {String} integrationPreference - 'gentle', 'active', 'minimal'
     * @returns {Object} Daily integration package
     */
    async generateDailyIntegration(sessionData, ladderResults, integrationPreference = 'gentle') {
        try {
            logger.info('Generating daily integration layer', { 
                sessionId: sessionData.sessionId,
                preference: integrationPreference 
            });

            // Generate recognition prompts based on session patterns
            const recognitionPrompts = await this.recognitionPatterns.generatePrompts(
                sessionData, 
                integrationPreference
            );

            // Create Weight Belt summary for portable integration
            const weightBeltSummary = await this.weightBelt.createSummary(
                sessionData, 
                ladderResults, 
                integrationPreference
            );

            // Build integration rhythm suggestions
            const rhythmSuggestions = this.buildIntegrationRhythm(
                sessionData, 
                integrationPreference
            );

            return {
                success: true,
                dailyIntegration: {
                    recognitionLayer: recognitionPrompts,
                    weightBelt: weightBeltSummary,
                    rhythm: rhythmSuggestions,
                    preference: integrationPreference
                },
                metadata: {
                    sessionId: sessionData.sessionId,
                    generatedAt: new Date().toISOString(),
                    hookStackCount: sessionData.hookStack?.titles?.length || 0,
                    therapeuticMode: ladderResults?.entryPoint || 'general'
                }
            };

        } catch (error) {
            logger.error('Error generating daily integration layer', { 
                error: error.message, 
                sessionId: sessionData.sessionId 
            });
            
            return {
                success: false,
                error: 'Unable to generate daily integration',
                fallback: this.generateFallbackIntegration(sessionData)
            };
        }
    }

    /**
     * Build integration rhythm based on user preference and session intensity
     */
    buildIntegrationRhythm(sessionData, preference) {
        const volatility = sessionData.hookStack?.volatilityIndex || 0;
        const accuracy = sessionData.sessionScores?.accuracy || 0.7;
        
        const baseRhythms = {
            minimal: {
                frequency: 'Once per day',
                duration: '30 seconds',
                approach: 'Quick check-in'
            },
            gentle: {
                frequency: '2-3 times per day',
                duration: '1-2 minutes',
                approach: 'Mindful noticing'
            },
            active: {
                frequency: '3-4 times per day',
                duration: '2-5 minutes',
                approach: 'Conscious integration'
            }
        };

        const rhythm = baseRhythms[preference] || baseRhythms.gentle;

        // Adjust based on session data
        if (volatility > 7) {
            rhythm.note = 'High-energy patterns suggest more frequent but shorter check-ins';
            rhythm.adjustment = 'Consider more frequent, gentler touches';
        } else if (accuracy < 0.6) {
            rhythm.note = 'Lower accuracy suggests slower, deeper integration';
            rhythm.adjustment = 'Take more time with each recognition moment';
        }

        return rhythm;
    }

    /**
     * Generate fallback integration when main processing fails
     */
    generateFallbackIntegration(sessionData) {
        return {
            type: 'fallback',
            recognitionLayer: {
                morningPrompt: 'What energy am I noticing as I start this day?',
                middayPrompt: 'How are the patterns from my session showing up?',
                eveningPrompt: 'What did I learn about myself today?'
            },
            weightBelt: {
                coreReminder: 'I have astrological patterns that support my awareness.',
                carryForward: 'I can notice without needing to fix or change anything.'
            }
        };
    }
}

/**
 * Recognition Layer - Daily awareness prompts based on session patterns
 */
class RecognitionLayer {
    constructor() {
        this.promptTemplates = {
            WB: {
                morning: 'Notice what feels aligned and familiar today',
                midday: 'Check in: What\'s resonating as expected?',
                evening: 'Acknowledge what felt true to your patterns today'
            },
            ABE: {
                morning: 'Pay attention to edge spaces and transitions',
                midday: 'Notice: What\'s at the boundary of comfortable?',
                evening: 'Reflect on moments that stretched you gently'
            },
            OSR: {
                morning: 'Be curious about what feels different or surprising',
                midday: 'Check: What doesn\'t fit the usual pattern?',
                evening: 'Honor the parts that don\'t match expectations'
            }
        };
    }

    /**
     * Generate personalized recognition prompts
     */
    async generatePrompts(sessionData, preference) {
        const sstPattern = this.analyzeSSTPatter(sessionData.sstLogs || []);
        const hookStackThemes = this.extractThemes(sessionData.hookStack);
        
        return {
            morning: this.buildMorningPrompt(sstPattern, hookStackThemes, preference),
            midday: this.buildMiddayPrompt(sstPattern, hookStackThemes, preference),
            evening: this.buildEveningPrompt(sstPattern, hookStackThemes, preference),
            sstFocus: sstPattern.dominant,
            customPrompts: this.generateCustomPrompts(hookStackThemes, preference)
        };
    }

    /**
     * Analyze SST logs to find dominant pattern
     */
    analyzeSSTPatter(sstLogs) {
        const counts = { WB: 0, ABE: 0, OSR: 0 };
        
        sstLogs.forEach(log => {
            if (counts.hasOwnProperty(log.category)) {
                counts[log.category]++;
            }
        });

        const dominant = Object.keys(counts).reduce((a, b) => 
            counts[a] > counts[b] ? a : b
        );

        return {
            dominant,
            counts,
            pattern: this.interpretPattern(counts)
        };
    }

    interpretPattern(counts) {
        const total = counts.WB + counts.ABE + counts.OSR;
        if (total === 0) return 'exploratory';
        
        const wbRatio = counts.WB / total;
        const abeRatio = counts.ABE / total;
        const osrRatio = counts.OSR / total;

        if (wbRatio > 0.6) return 'aligned';
        if (abeRatio > 0.4) return 'edge-aware';
        if (osrRatio > 0.3) return 'expansive';
        
        return 'balanced';
    }

    /**
     * Extract themes from Hook Stack titles
     */
    extractThemes(hookStack) {
        if (!hookStack?.titles?.length) return ['awareness', 'presence'];
        
        const themes = hookStack.titles.map(hook => {
            const title = hook.title.toLowerCase();
            
            if (title.includes('relationship') || title.includes('connection')) return 'relational';
            if (title.includes('creative') || title.includes('expression')) return 'creative';
            if (title.includes('change') || title.includes('transformation')) return 'transitional';
            if (title.includes('power') || title.includes('authority')) return 'personal-power';
            if (title.includes('healing') || title.includes('growth')) return 'developmental';
            
            return 'integrative';
        });

        return [...new Set(themes)]; // Remove duplicates
    }

    /**
     * Build morning recognition prompt
     */
    buildMorningPrompt(sstPattern, themes, preference) {
        const basePrompt = this.promptTemplates[sstPattern.dominant]?.morning || 
                          'Notice what energy you\'re bringing to this day';
        
        if (preference === 'minimal') return basePrompt;
        
        const themeAddition = this.getThemeAddition(themes[0], 'morning');
        return `${basePrompt}. ${themeAddition}`;
    }

    /**
     * Build midday recognition prompt
     */
    buildMiddayPrompt(sstPattern, themes, preference) {
        const basePrompt = this.promptTemplates[sstPattern.dominant]?.midday || 
                          'Pause and check in with your current experience';
        
        if (preference === 'minimal') return basePrompt;
        
        const themeAddition = this.getThemeAddition(themes[0], 'midday');
        return `${basePrompt} ${themeAddition}`;
    }

    /**
     * Build evening recognition prompt
     */
    buildEveningPrompt(sstPattern, themes, preference) {
        const basePrompt = this.promptTemplates[sstPattern.dominant]?.evening || 
                          'Reflect on what you noticed about yourself today';
        
        if (preference === 'minimal') return basePrompt;
        
        const themeAddition = this.getThemeAddition(themes[0], 'evening');
        return `${basePrompt}. ${themeAddition}`;
    }

    /**
     * Get theme-specific additions to prompts
     */
    getThemeAddition(theme, timeOfDay) {
        const additions = {
            relational: {
                morning: 'Especially notice your connections with others.',
                midday: 'How are your relationships feeling?',
                evening: 'What did you learn about connection today?'
            },
            creative: {
                morning: 'Pay attention to creative impulses.',
                midday: 'What wants to be expressed?',
                evening: 'Honor any creative stirrings from today.'
            },
            transitional: {
                morning: 'Notice what\'s shifting or changing.',
                midday: 'What transitions are you in?',
                evening: 'Acknowledge the changes you\'re navigating.'
            },
            // Add more themes as needed
            default: {
                morning: 'Stay curious about what emerges.',
                midday: 'What patterns are you noticing?',
                evening: 'What insights surfaced today?'
            }
        };

        return additions[theme]?.[timeOfDay] || additions.default[timeOfDay];
    }

    /**
     * Generate custom prompts based on specific session insights
     */
    generateCustomPrompts(themes, preference) {
        if (preference === 'minimal') return [];
        
        return themes.map(theme => ({
            theme,
            prompt: `When you notice ${theme} energy, pause and ask: What is this trying to show me?`,
            frequency: 'As needed'
        }));
    }
}

/**
 * Weight Belt - Portable summary cards for ongoing integration
 */
class WeightBelt {
    constructor() {
        this.summaryTypes = {
            essence: 'Core theme distillation',
            reminder: 'Daily integration anchor',
            compass: 'Decision-making guide',
            touchstone: 'Grounding reference'
        };
    }

    /**
     * Create Weight Belt summary package
     */
    async createSummary(sessionData, ladderResults, preference) {
        const coreEssence = this.distillEssence(sessionData, ladderResults);
        const dailyReminder = this.createDailyReminder(sessionData, preference);
        const decisionCompass = this.buildDecisionCompass(sessionData, ladderResults);
        const groundingTouchstone = this.createTouchstone(sessionData);

        return {
            cards: {
                essence: coreEssence,
                reminder: dailyReminder,
                compass: decisionCompass,
                touchstone: groundingTouchstone
            },
            carryForward: this.selectCarryForward(coreEssence, dailyReminder, preference),
            shareableFormat: this.createShareableFormat(coreEssence, dailyReminder, sessionData)
        };
    }

    /**
     * Distill session essence into core theme
     */
    distillEssence(sessionData, ladderResults) {
        const primaryHook = sessionData.hookStack?.titles?.[0];
        const ladderTheme = ladderResults?.entryPoint || 'integration';
        
        if (!primaryHook) {
            return {
                title: 'Astrological Awareness',
                essence: 'Your chart reflects patterns worth noticing',
                energy: 'Present and aware'
            };
        }

        return {
            title: primaryHook.title,
            essence: `Your ${primaryHook.title} energy is actively supporting your growth`,
            energy: primaryHook.polarity || 'Balanced',
            intensity: Math.round(primaryHook.intensity * 100) + '%'
        };
    }

    /**
     * Create daily reminder card
     */
    createDailyReminder(sessionData, preference) {
        const accuracy = sessionData.sessionScores?.accuracy || 0.7;
        const primaryTheme = sessionData.hookStack?.titles?.[0]?.title || 'your patterns';
        
        const reminderTemplates = {
            minimal: `Notice ${primaryTheme} energy when it arises.`,
            gentle: `You have ${primaryTheme} support available - trust what you notice.`,
            active: `Your ${primaryTheme} patterns are working with you. Pay attention to the signals.`
        };

        return {
            text: reminderTemplates[preference] || reminderTemplates.gentle,
            confidence: `${Math.round(accuracy * 100)}% session accuracy`,
            approach: 'Notice before action'
        };
    }

    /**
     * Build decision compass
     */
    buildDecisionCompass(sessionData, ladderResults) {
        const choiceRung = ladderResults?.ladderTree?.find(step => step.rung === 'choicePair');
        const primaryHook = sessionData.hookStack?.titles?.[0];
        
        if (choiceRung) {
            return {
                question: 'When facing decisions, ask:',
                compass: 'Which choice honors both my boundaries and my growth?',
                reference: choiceRung.content.agencyReminder || 'You have agency in your responses'
            };
        }

        return {
            question: 'When facing decisions, ask:',
            compass: 'What would support both my stability and my authenticity?',
            reference: primaryHook ? `Consider your ${primaryHook.title} needs` : 'Trust your inner wisdom'
        };
    }

    /**
     * Create grounding touchstone
     */
    createTouchstone(sessionData) {
        const volatility = sessionData.hookStack?.volatilityIndex || 0;
        const driftIndex = sessionData.driftIndex || 0;
        
        if (volatility > 6 || driftIndex > 0.6) {
            return {
                touchstone: 'I am stable even when energies are active',
                grounding: 'Breathe and feel your feet on the ground',
                reminder: 'Intensity is temporary; your core self is steady'
            };
        }

        return {
            touchstone: 'I can trust what I notice about myself',
            grounding: 'Pause and check in with your body',
            reminder: 'Your patterns are supporting your awareness'
        };
    }

    /**
     * Select primary carry-forward card based on preference
     */
    selectCarryForward(essence, reminder, preference) {
        if (preference === 'minimal') {
            return {
                type: 'reminder',
                content: reminder.text,
                usage: 'Reference when needed'
            };
        }

        return {
            type: 'essence',
            content: `${essence.title}: ${essence.essence}`,
            usage: 'Daily awareness anchor'
        };
    }

    /**
     * Create shareable format
     */
    createShareableFormat(essence, reminder, sessionData) {
        const sessionDate = new Date().toLocaleDateString();
        
        return {
            format: 'text',
            content: `
Daily Integration • ${sessionDate}

Core Theme: ${essence.title}
${essence.essence}

Daily Reminder: ${reminder.text}

Generated from your astrological session with ${sessionData.hookStack?.titles?.length || 'multiple'} Hook Stack patterns.
            `.trim(),
            metadata: {
                sessionId: sessionData.sessionId,
                generatedAt: new Date().toISOString(),
                version: 'Weight Belt v1.0'
            }
        };
    }
}

module.exports = { DailyIntegrationLayer };