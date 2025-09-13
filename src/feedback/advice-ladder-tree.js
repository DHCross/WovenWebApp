/**
 * Advice Ladder Tree Integration
 * DBT/ACT-aligned therapeutic integration layer for Hook Stack processing
 * 
 * Four Rungs + Crisis Container:
 * 1. Mirror (Recognition & Validation)
 * 2. Container (Boundaries & Safety)
 * 3. Choice Pair (Agency & Decision Support)
 * 4. If/Then/Track (Implementation & Monitoring)
 * + Crisis Container (Emergency Support with Balance Meter dial pacing)
 */

const logger = require('../utils/logger');

class AdviceLadderTree {
    constructor() {
        this.rungs = {
            mirror: new MirrorRung(),
            container: new ContainerRung(),
            choicePair: new ChoicePairRung(),
            ifThenTrack: new IfThenTrackRung(),
            crisisContainer: new CrisisContainer()
        };
    }

    /**
     * Process Hook Stack through therapeutic ladder
     * @param {Object} hookStack - Generated Hook Stack from composer
     * @param {Object} sessionContext - User session data and SST logs
     * @param {String} userNeed - Specified therapeutic need or crisis flag
     * @returns {Object} Therapeutic integration response
     */
    async processHookStack(hookStack, sessionContext, userNeed = 'general') {
        try {
            logger.info('Processing Hook Stack through Advice Ladder Tree', { 
                hookStackCount: hookStack.titles?.length || 0,
                userNeed,
                sessionId: sessionContext.sessionId 
            });

            // Crisis pathway check
            if (this.isCrisisSignal(userNeed, hookStack, sessionContext)) {
                return await this.rungs.crisisContainer.engage(hookStack, sessionContext);
            }

            // Standard 4-rung progression
            const progression = await this.buildProgression(hookStack, sessionContext, userNeed);
            
            return {
                success: true,
                ladderTree: progression,
                entryPoint: this.determineEntryPoint(userNeed, sessionContext),
                pacing: this.calculatePacing(sessionContext),
                metadata: {
                    hookStackIntegrated: hookStack.titles?.length || 0,
                    therapeuticMode: userNeed,
                    progressionDepth: progression.length,
                    sessionContext: sessionContext.sessionId
                }
            };

        } catch (error) {
            logger.error('Error in Advice Ladder Tree processing', { error: error.message, hookStack, sessionContext });
            return {
                success: false,
                error: 'Unable to process therapeutic integration',
                fallback: await this.generateFallbackSupport(hookStack)
            };
        }
    }

    /**
     * Build therapeutic progression through ladder rungs
     */
    async buildProgression(hookStack, sessionContext, userNeed) {
        const progression = [];

        // Rung 1: Mirror (Always start here for recognition)
        const mirrorResponse = await this.rungs.mirror.reflect(hookStack, sessionContext);
        progression.push({
            rung: 'mirror',
            content: mirrorResponse,
            purpose: 'Recognition & Validation'
        });

        // Determine next rungs based on need and context
        const rungSequence = this.determineRungSequence(userNeed, sessionContext, mirrorResponse);

        for (const rungName of rungSequence) {
            const rungResponse = await this.rungs[rungName].process(hookStack, sessionContext, progression);
            progression.push({
                rung: rungName,
                content: rungResponse,
                purpose: this.getRungPurpose(rungName)
            });
        }

        return progression;
    }

    /**
     * Check for crisis signals requiring immediate Crisis Container
     */
    isCrisisSignal(userNeed, hookStack, sessionContext) {
        const crisisKeywords = ['crisis', 'emergency', 'urgent', 'overwhelmed', 'can\'t cope'];
        const highVolatilityThreshold = 8; // From seismograph
        
        return (
            crisisKeywords.some(keyword => userNeed.includes(keyword)) ||
            hookStack.volatilityIndex > highVolatilityThreshold ||
            sessionContext.driftIndex > 0.7 ||
            sessionContext.sstLogs?.some(log => log.category === 'OSR' && log.clarification?.includes('overwhelming'))
        );
    }

    /**
     * Determine optimal entry point based on user need
     */
    determineEntryPoint(userNeed, sessionContext) {
        if (userNeed.includes('decision') || userNeed.includes('choice')) return 'choicePair';
        if (userNeed.includes('boundary') || userNeed.includes('safety')) return 'container';
        if (userNeed.includes('action') || userNeed.includes('plan')) return 'ifThenTrack';
        return 'mirror'; // Default entry point
    }

    /**
     * Calculate pacing using Balance Meter dial approach
     */
    calculatePacing(sessionContext) {
        const accuracy = sessionContext.sessionScores?.accuracy || 0.7;
        const edgeCapture = sessionContext.sessionScores?.edgeCapture || 0.5;
        const clarity = sessionContext.sessionScores?.clarity || 0.8;
        
        // Lower scores = slower pacing needed
        const averageConfidence = (accuracy + edgeCapture + clarity) / 3;
        
        if (averageConfidence > 0.8) return 'normal';
        if (averageConfidence > 0.6) return 'gentle';
        return 'extra-gentle';
    }

    /**
     * Determine sequence of rungs based on therapeutic need
     */
    determineRungSequence(userNeed, sessionContext, mirrorResponse) {
        // Default sequence
        let sequence = ['container', 'choicePair', 'ifThenTrack'];

        // Adjust based on mirror response and context
        if (mirrorResponse.confidenceLevel < 0.6) {
            // Stay longer in mirror/container space
            sequence = ['container'];
        } else if (userNeed.includes('action') || userNeed.includes('decision')) {
            // Move quickly to choice and implementation
            sequence = ['choicePair', 'ifThenTrack'];
        } else if (sessionContext.driftIndex > 0.5) {
            // Focus on boundaries when drift is high
            sequence = ['container', 'choicePair'];
        }

        return sequence;
    }

    getRungPurpose(rungName) {
        const purposes = {
            mirror: 'Recognition & Validation',
            container: 'Boundaries & Safety',
            choicePair: 'Agency & Decision Support',
            ifThenTrack: 'Implementation & Monitoring',
            crisisContainer: 'Emergency Support & Stabilization'
        };
        return purposes[rungName] || 'Integration Support';
    }

    /**
     * Generate fallback support when main processing fails
     */
    async generateFallbackSupport(hookStack) {
        return {
            type: 'fallback',
            message: 'Your astrological climate shows active energy patterns.',
            suggestion: 'Consider taking time to notice what resonates most strongly.',
            hookReference: hookStack.titles?.[0] || 'Current planetary configuration',
            resources: [
                'Take three deep breaths',
                'Notice what feels most present right now',
                'Consider what support you might need'
            ]
        };
    }
}

/**
 * Rung 1: Mirror - Recognition & Validation
 * Purpose: Help user see themselves in the Hook Stack
 */
class MirrorRung {
    async reflect(hookStack, sessionContext) {
        const strongestHook = hookStack.titles?.[0];
        const secondaryHook = hookStack.titles?.[1];
        
        const validationTemplates = [
            `The ${strongestHook?.title} pattern suggests you're navigating some complex energy right now.`,
            `Your chart shows ${strongestHook?.title} as a primary theme - this makes sense of what you might be experiencing.`,
            `The astrological climate reveals ${strongestHook?.title} energy, which often feels exactly like what you're describing.`
        ];

        return {
            recognition: this.selectTemplate(validationTemplates),
            validation: this.buildValidation(strongestHook, secondaryHook),
            confidenceLevel: this.calculateMirrorConfidence(hookStack, sessionContext),
            resonanceCheck: 'Does this feel like it captures something true about your current experience?'
        };
    }

    buildValidation(primary, secondary) {
        if (!primary) return 'Your current astrological climate shows active patterns worth exploring.';

        let validation = `The ${primary.title} theme reflects real patterns in your current environment.`;
        
        if (secondary) {
            validation += ` The interplay with ${secondary.title} adds another layer that might explain the complexity you're feeling.`;
        }

        return validation;
    }

    calculateMirrorConfidence(hookStack, sessionContext) {
        // Base confidence on Hook Stack intensity and session accuracy
        const baseIntensity = hookStack.titles?.[0]?.intensity || 0.5;
        const sessionAccuracy = sessionContext.sessionScores?.accuracy || 0.7;
        
        return (baseIntensity + sessionAccuracy) / 2;
    }

    selectTemplate(templates) {
        return templates[Math.floor(Math.random() * templates.length)];
    }
}

/**
 * Rung 2: Container - Boundaries & Safety
 * Purpose: Establish safe space and healthy boundaries
 */
class ContainerRung {
    async process(hookStack, sessionContext, progression) {
        const mirrorContent = progression.find(p => p.rung === 'mirror')?.content;
        const primaryHook = hookStack.titles?.[0];

        return {
            boundaries: this.suggestBoundaries(primaryHook, sessionContext),
            safetyCheck: this.createSafetyCheck(hookStack),
            resources: this.gatherResources(primaryHook),
            pacing: 'You can move through this at whatever pace feels right for you.'
        };
    }

    suggestBoundaries(primaryHook, sessionContext) {
        if (!primaryHook) return 'Consider what boundaries might support you right now.';

        const boundaryTemplates = {
            high_intensity: 'With this much energy active, it might help to create some buffer space in your schedule.',
            interpersonal: 'Notice if you need more space in relationships or more connection - both are valid.',
            internal: 'Consider what internal boundaries might help you feel more centered.',
            default: 'What boundaries would help you feel more supported right now?'
        };

        const hookType = this.classifyHookType(primaryHook);
        return boundaryTemplates[hookType] || boundaryTemplates.default;
    }

    createSafetyCheck(hookStack) {
        const volatility = hookStack.volatilityIndex || 0;
        
        if (volatility > 7) {
            return 'Given the high-energy patterns, check in: Do you feel grounded and safe right now?';
        } else if (volatility > 4) {
            return 'With moderate energy patterns active, notice what helps you feel most stable.';
        }
        
        return 'Check in with yourself: What do you need to feel safe and supported?';
    }

    gatherResources(primaryHook) {
        return [
            'Take breaks when you need them',
            'Notice what environments feel most supportive',
            'Trust your instincts about what you need',
            'Remember that boundaries are self-care, not selfishness'
        ];
    }

    classifyHookType(hook) {
        if (!hook || !hook.title) return 'default';
        
        const title = hook.title.toLowerCase();
        if (title.includes('relationship') || title.includes('other') || title.includes('partnership')) return 'interpersonal';
        if (hook.intensity > 0.8) return 'high_intensity';
        if (title.includes('inner') || title.includes('self') || title.includes('identity')) return 'internal';
        
        return 'default';
    }
}

/**
 * Rung 3: Choice Pair - Agency & Decision Support
 * Purpose: Present clear choices that honor user agency
 */
class ChoicePairRung {
    async process(hookStack, sessionContext, progression) {
        const primaryHook = hookStack.titles?.[0];
        
        return {
            choicePair: this.generateChoicePair(primaryHook, sessionContext),
            agencyReminder: 'You have agency in how you respond to these patterns.',
            decisionSupport: this.offerDecisionSupport(primaryHook),
            noWrongChoice: 'There\'s no wrong choice here - trust what feels most aligned for you.'
        };
    }

    generateChoicePair(primaryHook, sessionContext) {
        if (!primaryHook) {
            return {
                optionA: 'Focus on grounding and stability',
                optionB: 'Focus on gentle forward movement',
                context: 'Both approaches can be valuable depending on what you need most.'
            };
        }

        const intensity = primaryHook.intensity || 0.5;
        
        if (intensity > 0.7) {
            return {
                optionA: 'Channel this energy into creative or productive outlets',
                optionB: 'Create space to process and integrate this energy slowly',
                context: `The ${primaryHook.title} pattern offers strong energy that can be worked with in different ways.`
            };
        } else {
            return {
                optionA: 'Explore what this pattern is inviting you to notice',
                optionB: 'Take time to simply be present with what\'s emerging',
                context: `The ${primaryHook.title} theme suggests subtle shifts that can be approached gently.`
            };
        }
    }

    offerDecisionSupport(primaryHook) {
        return [
            'Notice which option feels more energizing or calming',
            'Consider what you have capacity for right now',
            'Trust your body\'s wisdom about what feels right',
            'Remember you can adjust your approach as you go'
        ];
    }
}

/**
 * Rung 4: If/Then/Track - Implementation & Monitoring
 * Purpose: Support concrete action with gentle accountability
 */
class IfThenTrackRung {
    async process(hookStack, sessionContext, progression) {
        const choiceContent = progression.find(p => p.rung === 'choicePair')?.content;
        const primaryHook = hookStack.titles?.[0];

        return {
            implementation: this.createImplementationPlan(primaryHook, choiceContent),
            tracking: this.suggestTracking(primaryHook),
            adjustment: this.buildAdjustmentFramework(),
            gentleAccountability: 'Check in with yourself in a few days to see how this feels.'
        };
    }

    createImplementationPlan(primaryHook, choiceContent) {
        return {
            ifCondition: this.buildIfCondition(primaryHook),
            thenAction: this.buildThenAction(primaryHook),
            elseOption: this.buildElseOption(primaryHook)
        };
    }

    buildIfCondition(primaryHook) {
        if (!primaryHook) return 'If you notice you need support';
        
        const intensity = primaryHook.intensity || 0.5;
        if (intensity > 0.7) {
            return `If you feel the ${primaryHook.title} energy building`;
        } else {
            return `If you notice the ${primaryHook.title} pattern emerging`;
        }
    }

    buildThenAction(primaryHook) {
        if (!primaryHook) return 'then pause and choose your response consciously';
        
        const actionTemplates = [
            'then take three conscious breaths and choose your response',
            'then pause to ask what you need in this moment',
            'then remember you have choices in how to engage'
        ];
        
        return actionTemplates[Math.floor(Math.random() * actionTemplates.length)];
    }

    buildElseOption(primaryHook) {
        return 'Otherwise, trust that you\'re navigating this well and adjust as needed.';
    }

    suggestTracking(primaryHook) {
        return {
            question: 'What would be helpful to notice?',
            suggestions: [
                'How does your energy feel?',
                'What patterns are you noticing?',
                'What\'s working well?',
                'What might need adjustment?'
            ],
            frequency: 'Check in with yourself when it feels natural to do so.'
        };
    }

    buildAdjustmentFramework() {
        return {
            permission: 'You can adjust this approach at any time.',
            signals: 'If something doesn\'t feel right, trust that and modify.',
            flexibility: 'What works today might be different tomorrow, and that\'s completely normal.'
        };
    }
}

/**
 * Crisis Container - Emergency Support & Stabilization
 * Purpose: Immediate support for overwhelming situations with Balance Meter pacing
 */
class CrisisContainer {
    async engage(hookStack, sessionContext) {
        logger.info('Crisis Container engaged', { sessionId: sessionContext.sessionId });

        const pacing = this.assessCrisisPacing(sessionContext);
        
        return {
            type: 'crisis-support',
            immediate: this.immediateStabilization(pacing),
            grounding: this.groundingProtocol(pacing),
            boundaries: this.crisisBoundaries(),
            followUp: this.crisisFollowUp(),
            balanceMeter: this.balanceMeterGuidance(pacing),
            resources: this.crisisResources()
        };
    }

    assessCrisisPacing(sessionContext) {
        const volatility = sessionContext.volatilityIndex || 0;
        const drift = sessionContext.driftIndex || 0;
        
        if (volatility > 8 || drift > 0.8) return 'extra-slow';
        if (volatility > 6 || drift > 0.6) return 'slow';
        return 'gentle';
    }

    immediateStabilization(pacing) {
        const protocols = {
            'extra-slow': {
                step1: 'Right now, just focus on breathing.',
                step2: 'Feel your feet on the ground.',
                step3: 'You are safe in this moment.'
            },
            'slow': {
                step1: 'Take a deep breath and feel your body.',
                step2: 'Notice that you are physically safe right now.',
                step3: 'You don\'t have to solve everything at once.'
            },
            'gentle': {
                step1: 'Pause and breathe consciously.',
                step2: 'Ground yourself in the present moment.',
                step3: 'Remember that this intensity will shift.'
            }
        };

        return protocols[pacing] || protocols.gentle;
    }

    groundingProtocol(pacing) {
        return {
            breathing: 'Breathe in for 4, hold for 4, out for 6',
            sensing: 'Notice 5 things you can see, 4 you can touch, 3 you can hear',
            affirmation: 'I am safe right now. I can handle this one moment at a time.',
            pacing: `Taking this at ${pacing} pace is exactly right.`
        };
    }

    crisisBoundaries() {
        return {
            permission: 'It\'s okay to not be okay right now.',
            limits: 'You don\'t owe anyone explanations about what you need.',
            protection: 'Your primary job is to take care of yourself.',
            timeline: 'You don\'t have to figure everything out today.'
        };
    }

    crisisFollowUp() {
        return {
            checkIn: 'Check in with yourself in 2-4 hours.',
            professional: 'If this continues to feel overwhelming, consider reaching out to a counselor or therapist.',
            support: 'Consider who in your life you could reach out to for support.',
            selfCompassion: 'Be as kind to yourself as you would be to a good friend going through this.'
        };
    }

    balanceMeterGuidance(pacing) {
        return {
            currentSetting: pacing,
            adjustment: 'You can slow down even more if you need to.',
            calibration: 'Trust your body about what pace feels sustainable.',
            permission: 'There\'s no rush. Healing happens at its own pace.'
        };
    }

    crisisResources() {
        return [
            'Crisis Text Line: Text HOME to 741741',
            'National Suicide Prevention Lifeline: 988',
            'Remember: This is temporary, even when it doesn\'t feel like it',
            'Your feelings are valid and you deserve support'
        ];
    }
}

module.exports = { AdviceLadderTree };