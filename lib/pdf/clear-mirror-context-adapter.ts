/**
 * Clear Mirror Export Builder
 * 
 * Converts ReportContext (from ChatClient) into ClearMirrorData for PDF generation
 */

import type { ClearMirrorData } from '@/lib/templates/clear-mirror-template';
import type { RelocationSummary } from '@/lib/relocation';

interface ReportContext {
  id: string;
  type: 'mirror' | 'balance';
  name: string;
  summary: string;
  content: string;
  relocation?: RelocationSummary;
}

/**
 * Extracts person names from report contexts
 * Solo: returns [personA]
 * Relational: returns [personA, personB]
 */
function extractPersonNames(contexts: ReportContext[]): { personA: string; personB?: string } {
  if (contexts.length === 0) {
    return { personA: 'Unknown' };
  }
  
  if (contexts.length === 1) {
    // Solo report
    return { personA: contexts[0].name || 'Person A' };
  }
  
  // Relational report (2 contexts)
  return {
    personA: contexts[0]?.name || 'Person A',
    personB: contexts[1]?.name || 'Person B'
  };
}

/**
 * Determines intimacy tier from context
 * This is a placeholder - in production, this would come from user input
 */
function determineIntimacyTier(contexts: ReportContext[]): string | undefined {
  if (contexts.length < 2) return undefined;
  
  // Default to Partner tier for relational charts
  // Future: Extract from reportContexts metadata or user selection
  return 'Partner: P5a';
}

/**
 * Builds placeholder Clear Mirror data from report contexts
 * 
 * NOTE: This creates the structure with template placeholders.
 * In production, the actual narrative content would come from:
 * 1. Math Brain geometry (already in reportContexts.content)
 * 2. Raven Calder API calls to translate geometry → language
 */
export function buildClearMirrorFromContexts(contexts: ReportContext[]): ClearMirrorData {
  const { personA, personB } = extractPersonNames(contexts);
  const isRelational = contexts.length === 2;
  const timestamp = new Date().toISOString();
  
  const data: ClearMirrorData = {
    personName: personA,
    date: timestamp,
    chartType: isRelational ? 'relational' : 'solo',
    
    // Add relational fields if applicable
    ...(isRelational && personB ? {
      personBName: personB,
      intimacyTier: determineIntimacyTier(contexts),
      contactState: 'Active' as const,
      individualFieldA: {
        text: `${personA} tends to move through life via structure and precision.¹ Action channels intensity; reflection refines trajectory. The pattern suggests a rhythm: engage directly, then pause to integrate. Purpose emerges through tangible effort rather than abstract contemplation.² Inner climate: watchful, testing trust through consistency rather than declaration.`,
        footnotes: [
          { number: 1, content: '♂︎☍☉ (0.2°) • Natal • M=3.8 • Direct action opposing solar purpose creates tension requiring resolution through conscious integration' },
          { number: 2, content: '♄△♆ (1.1°) • Natal • M=2.9 • Structure harmonizing with vision; discipline serves ideals rather than restricting them' }
        ]
      },
      individualFieldB: {
        text: `${personB} tends to hold paradox without forcing resolution.³ Comfort emerges through movement rather than fixation. The pattern suggests rapid emotional weather—intensity rises fast, then dissipates just as quickly. Trusts flow over formula; thrives in responsive adaptation rather than predetermined plans.⁴`,
        footnotes: [
          { number: 3, content: '☽☍♅ (0.8°) • Natal • M=3.2 • Emotional core opposing radical independence; intimacy and autonomy create productive friction' },
          { number: 4, content: '♃☌☿ (1.5°) • Natal • M=2.7 • Expansion aligned with communication; optimism amplifies expression and learning' }
        ]
      }
    } : {}),
    
    preface: isRelational
      ? `This relational mirror translates symbolic overlays between ${personA} and ${personB} into testable hypotheses. The geometry reveals what each person's natal structure activates in the other—friction points, resonant frequencies, directional weather patterns. These dynamics predict nothing; they offer coordinates for recognition. Accuracy emerges only through lived comparison.`
      : `This reflection draws from symbolic geometry rather than observed behavior. It outlines tendencies the natal pattern could imply—hypotheses to test in lived experience. The chart translates planetary positions at birth into language patterns you can verify against your actual life.`,
    
    frontstage: {
      text: isRelational
        ? `When ${personA} enters ${personB}'s field, specific dynamics activate. The geometry suggests ${personA}'s structural clarity encounters ${personB}'s fluid spontaneity—not as opposition, but as complementary friction.¹ ${personA} tends to experience ${personB}'s improvisation as instability, triggering reflexive attempts to introduce order. ${personB} tends to perceive ${personA}'s structure as constraint, feeling compressed by predetermined frameworks.²

The relational weather pattern: ${personA} tightens in response to ${personB}'s flexibility; ${personB} withdraws in response to ${personA}'s rigidity. Neither reaction stems from conscious choice—each responds to symbolic friction generated where natal geometries overlap.³ Relief arrives when ${personA} offers structure as scaffolding rather than requirement, allowing ${personB} to experience planning as support. Reciprocally, when ${personB} communicates shifting intentions before pivoting, ${personA}'s vigilance relaxes into trust.⁴`
        : `You tend to navigate life through precision and sustained focus.¹ When external pressure accumulates, the pattern suggests channeling intensity into tangible action—work, creation, problem-solving—rather than waiting for tension to dissipate organically. Structure provides stability; clarity functions as kindness.²

The chart shows internal complexity: craving intimacy while simultaneously constructing protective distance.³ Emotional weather shifts between warmth and withdrawal—offering connection, then retreating when vulnerability surfaces too intensely. This rhythm doesn't signal rejection; it indicates recalibration. Safety emerges through managed proximity rather than constant closeness.⁴`,
      footnotes: [
        { number: 1, content: isRelational ? '♂︎(A)☍☉(B) (0.2°) • M=4.1 • WB' : '♂︎☍☉ (0.2°) • Natal • M=3.8 • WB' },
        { number: 2, content: isRelational ? '♄(A)□♆(B) (0.9°) • M=3.3 • ABE' : '♄△♆ (1.1°) • Natal • M=2.9 • ABE' },
        { number: 3, content: isRelational ? '☽(A)□♅(B) (1.2°) • M=2.8 • OSR' : '☽□♅ (1.2°) • Natal • M=2.8 • OSR' },
        { number: 4, content: isRelational ? '♃(A)△☿(B) (1.5°) • M=2.4 • WB' : '♃☌☿ (1.5°) • Natal • M=2.4 • WB' }
      ]
    },
    
    resonantSummary: {
      text: isRelational
        ? `Friction arises where ${personA}'s structure encounters ${personB}'s spontaneity—not as incompatibility, but as complementary polarities requiring integration. The pattern suggests resolution emerges not through forced alignment, but through recognizing each approach's function: ${personA}'s frameworks provide container and safety; ${personB}'s fluidity provides movement and breath. When structure operates as scaffolding rather than cage, and spontaneity functions as rhythm rather than chaos, relational weather stabilizes.⁵`
        : `The pattern suggests pressure accumulates when external demand exceeds internal capacity for structure. Relief tends to arrive through channeled action—movement, creation, problem-solving—rather than through stillness alone. Trust builds incrementally through demonstrated consistency, not through declaration. Intimacy requires managed proximity; vulnerability tends to arrive in calibrated doses rather than overwhelming floods.⁵`,
      footnotes: isRelational ? [
        { number: 5, content: '♂︎(A)△♄(B) (2.0°) • Stabilizing overlay • M=2.1' }
      ] : [
        { number: 5, content: '♀︎△♄ (2.1°) • Stabilizing pattern • M=2.2' }
      ]
    },
    
    coreInsights: {
      insights: isRelational ? [
        {
          pattern: `The Structural Reflex: When ${personA} introduces planning, ${personB} tends to withdraw into fluid improvisation. When ${personB} pivots spontaneously, ${personA} tends to tighten into watchful control. Neither response emerges from malice—each reacts to symbolic friction where natal geometries activate opposing protective patterns.`,
          geometry: '♂︎(A)☍☉(B) @ 0.2° • M=4.1 • Mars opposition Sun overlay',
          testMarker: 'WB'
        },
        {
          pattern: `The Perception Split: ${personA} tends to experience ${personB}'s spontaneity as unpredictability requiring management. ${personB} tends to experience ${personA}'s structure as rigidity requiring escape. Recognition: each perceives the other's primary safety mechanism as threat.`,
          geometry: '♄(A)□♆(B) @ 0.9° • M=3.3 • Saturn square Neptune overlay',
          testMarker: 'ABE'
        },
        {
          pattern: `The Integration Path: Relational weather stabilizes when ${personA} offers structure as scaffolding (support framework) rather than cage (control system), and when ${personB} communicates shifting intentions before executing pivots, giving ${personA}'s vigilance time to relax into trust rather than tightening into resistance.`,
          geometry: '♃(A)△☿(B) @ 1.5° • M=2.4 • Jupiter trine Mercury overlay',
          testMarker: 'WB'
        }
      ] : [
        {
          pattern: `The Pressure Valve: The pattern suggests you tend to channel accumulated intensity into tangible action—work, problem-solving, creation—rather than waiting for tension to dissipate organically. Stillness amplifies internal pressure; movement releases it. Structure functions as both container and relief system.`,
          geometry: '♂︎☍☉ @ 0.2° • M=3.8 • Mars opposition Sun natal',
          testMarker: 'WB'
        },
        {
          pattern: `The Trust Sequence: The chart indicates trust builds incrementally through demonstrated consistency rather than through verbal declaration. Intimacy requires managed proximity—closeness in calibrated doses rather than sustained fusion. Distance functions as recalibration, not rejection.`,
          geometry: '♄△♆ @ 1.1° • M=2.9 • Saturn trine Neptune natal',
          testMarker: 'ABE'
        },
        {
          pattern: `The Vulnerability Rhythm: Emotional weather tends to alternate between warmth and withdrawal. You offer connection, then retreat when exposure feels too intense—not from rejection, but from self-protection. Safety emerges through distance management; vulnerability arrives in waves, not floods.`,
          geometry: '☽□♅ @ 1.2° • M=2.8 • Moon square Uranus natal',
          testMarker: 'WB'
        }
      ]
    },
    
    personalityBlueprint: {
      text: isRelational
        ? `**${personA}:** Tends to operate as container builder, pressure channeler, trust validator through demonstrated patterns. Stabilizes through structure; experiences spontaneity as instability requiring management.\n\n**${personB}:** Tends to navigate as flow architect, spontaneity anchor, improvisational responder. Thrives through movement; experiences rigidity as confinement requiring escape.`
        : `You tend to trust what you can verify through direct experience. Words clarify intent; repeated actions establish trust. Under pressure, the pattern suggests you act quickly, then correct course through reflection—initiative precedes analysis rather than following it. When security feels stable, generosity flows freely; when trust fractures, protective boundaries rise immediately. The system thrives on clarity: direct feedback, mutual precision, straightforward care without performance.`,
      footnotes: []
    },
    
    polarityCards: isRelational ? [
      {
        title: 'The Container and the Current',
        text: `${personA} structures to establish safety and predictability; ${personB} improvises to preserve freedom and aliveness. Neither approach invalidates the other. Structure provides the container; spontaneity provides the oxygen. Both serve survival—one through framework, one through flow. Notice which impulse rises under pressure; both belong.`,
        footnote: '♂︎(A)☍☉(B) • ♄(A)□♆(B) overlays'
      },
      {
        title: 'Proof and Presence',
        text: `${personA} tends to validate trust through demonstrated patterns over time; ${personB} tends to extend trust through immediate presence and openness. The friction: ${personA} waits for behavioral proof before relaxing vigilance; ${personB} waits for emotional openness before offering consistency. Each waits for the other to move first. Resolution requires recognizing both approaches as legitimate, not opposing.`,
        footnote: '♄(A)△♆(B) • ☽(A)□♅(B) overlays'
      },
      {
        title: 'Distance as Recalibration',
        text: `${personA} tends to manage intimacy through periodic distance—proximity in doses, withdrawal for integration. ${personB} tends to seek connection through sustained closeness and immediate availability. Misread: ${personA}'s retreat feels like rejection to ${personB}; ${personB}'s pursuit feels like pressure to ${personA}. Recognition: distance functions as recalibration, not abandonment. Closeness functions as nourishment, not entrapment.`,
        footnote: '☽(A)□♅(B) • ♀︎(A)△♄(B) overlays'
      },
      {
        title: 'Script and Flow',
        text: `${personA} finds stability in predetermined plans and sequential frameworks; ${personB} finds vitality in responsive improvisation and emergent design. Integration arrives when ${personA}'s plans function as scaffolding (flexible support) rather than script (fixed requirement), and when ${personB}'s flow operates as rhythm (reliable pulse) rather than chaos (random motion). Both serve coherence—one through structure, one through adaptation.`,
        footnote: '♃(A)△☿(B) • ☿(A)□♃(B) overlays'
      }
    ] : [
      {
        title: 'The Engine and the Brake',
        text: 'Intensity drives; restraint regulates. The pattern shows both impulses operating simultaneously—pressure to act countered by caution to reflect. When pressure accumulates, structure provides containment. Work channels force productively; unstructured stillness can amplify tension rather than releasing it. Notice which impulse dominates under stress; both serve necessary functions.',
        footnote: '♂︎☍☉ natal aspect'
      },
      {
        title: 'The Threshold',
        text: 'The chart suggests simultaneous craving for intimacy and construction of protective barriers. Vulnerability surfaces, then retreats when exposure feels too intense. This rhythm doesn\'t signal inconsistency—it indicates calibration. You tend to extend warmth, then withdraw to integrate; offer connection, then pull back to recalibrate. Trust builds through demonstrated patterns over time, not through immediate disclosure.',
        footnote: '♄△♆ • ☽□♅ natal aspects'
      },
      {
        title: 'The Pulse',
        text: 'Closeness and distance alternate in rhythm: warmth extended, then space claimed for integration. The pattern suggests safety emerges through managed proximity rather than constant fusion. Distance functions as recalibration, not rejection. When this pulse feels respected rather than resisted, energy remains sustainable; when forced into constant closeness or constant isolation, vitality drains.',
        footnote: '☽□♅ • ♀︎△♄ natal aspects'
      },
      {
        title: 'Motion as Medicine',
        text: 'The chart indicates relief arrives through channeled action—physical movement, problem-solving, creative work—rather than through passive waiting. Stillness can accumulate pressure; structure releases it. When external demand feels overwhelming, the instinct shifts toward tangible output: doing clarifies thinking; motion stabilizes emotion. Notice whether rest restores or amplifies tension—both responses carry information.',
        footnote: '♂︎☍☉ • ♄△♆ natal aspects'
      }
    ],
    
    integration: {
      text: isRelational
        ? `This relational field holds productive friction—tension that generates growth rather than destruction. The geometry suggests ${personA}'s structural precision offers ${personB} grounding without rigidity; ${personB}'s fluid spontaneity offers ${personA} flexibility without chaos. Neither person requires transformation; both hold capacity for expansion. When structure operates as scaffolding and spontaneity operates as rhythm, the relationship creates space for both patterns to coexist rather than compete.`
        : `The pattern suggests pressure doesn't require elimination—it requires conscious channeling. Structure doesn't signal rigidity; it functions as the container allowing intensity to refine into precision. Your rhythm carries intelligence: act, test, adjust. This sequence refines effort without judgment. Drive shapes purpose; reflection shapes direction. When both phases receive equal respect—neither rushed nor prolonged beyond their natural duration—energy remains sustainable rather than depleting.`,
      footnotes: []
    },
    
    innerConstitution: {
      text: isRelational
        ? `**${personA}'s Internal Climate:** Vigilant awareness; control operating through structural clarity; safety emerging through managed distance and demonstrated patterns over time. Trust validates through consistency, not declaration.\n\n**${personB}'s Internal Climate:** Flow-state comfort; freedom operating through spontaneous response; safety emerging through present availability and immediate authenticity. Trust extends through openness, not proof.`
        : `The chart suggests two internal voices collaborate continuously—one activates through action, the other comprehends through reflection. One tests reality through direct engagement; the other tracks significance beneath surface motion. Together they construct understanding through contrast rather than through singular perspective. When they align, life feels coherent and embodied. When they drift apart, focus splits—effort without meaning, insight without application. Their ongoing dialogue fuels growth: instinct maturing into wisdom through repeated cycles of action and integration.`,
      footnotes: []
    },
    
    mirrorVoice: {
      text: isRelational
        ? `This relational geometry reveals what each person's natal structure activates in the other—not fixed identity, but responsive dynamics. ${personA}, the pattern doesn't require loosening your structural precision; ${personB}, it doesn't require adopting predetermined frameworks. What shifts: recognizing that ${personA}'s structure provides scaffolding (supportive framework enabling growth) rather than cage (restrictive barrier limiting motion), and that ${personB}'s spontaneity provides rhythm (reliable pulse sustaining aliveness) rather than chaos (destabilizing randomness threatening coherence). The question facing this field: can both patterns serve the relationship simultaneously without requiring either person to abandon their primary safety mechanism? The geometry suggests yes—through mutual recognition rather than mutual transformation.`
        : `The pattern suggests you navigate pressure through precision—not from inability to relax, but because structure provides the release valve that unstructured stillness cannot. Watchfulness functions as pattern recognition protecting against repeated trust violations, not as paranoia distorting neutral reality. Distance management operates as recalibration when vulnerability surfaces too intensely, not as rejection abandoning connection. Current inquiry: does this operating system still serve your actual life, or has the protective container calcified into limiting cage? Truth arrives through motion, then confirms itself through rest. The work may involve weighting both phases equally—allowing stillness to register as preparation rather than stagnation, letting action flow from readiness rather than reactivity. When that balance holds, energy accumulates rather than depletes.`,
      footnotes: []
    },
    
    auditLayer: {
      frontstage: isRelational ? [
        { observed: `${personA} structures → ${personB} withdraws`, geometry: '♂︎(A)☍☉(B) @ 0.2°', testMarker: 'WB' },
        { observed: `${personB} improvises → ${personA} tightens`, geometry: '♄(A)□♆(B) @ 0.9°', testMarker: 'ABE' },
        { observed: 'Friction point: structure perceived as control', geometry: '☽(A)□♅(B) @ 1.2°', testMarker: 'OSR' }
      ] : [
        { observed: 'Pressure → channeled action', geometry: '♂︎☍☉ @ 0.2°', testMarker: 'WB' },
        { observed: 'Trust through pattern repetition', geometry: '♄△♆ @ 1.1°', testMarker: 'ABE' },
        { observed: 'Distance management = safety', geometry: '☽□♅ @ 1.2°', testMarker: 'OSR' }
      ],
      resonantSummary: isRelational ? [
        { dynamic: 'Structure-spontaneity friction', correlation: '♂︎☍☉ overlay', testPrompt: 'Does planning feel like confinement?' },
        { dynamic: 'Trust-building misalignment', correlation: '♄□♆ overlay', testPrompt: 'Do you wait for proof vs. offer presence?' }
      ] : [
        { dynamic: 'Pressure → structure', correlation: '♂︎☍☉ tight orb', testPrompt: 'Does stillness amplify tension?' },
        { dynamic: 'Distance = recalibration', correlation: '☽□♅ pattern', testPrompt: 'Does withdrawal follow vulnerability?' }
      ]
    }
  };
  
  return data;
}
