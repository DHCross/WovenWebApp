# Raven Calder Narrative Structure Requirements

## Problem Statement

Current Poetic Brain responses lack **structural scaffolding** for cognition. The text moves like "weather"—beautiful but floating, with nothing for the reader to grab onto. Responses are trapped in **VOICE** without enough **FIELD → MAP** grounding.

## What's Missing

### 1. **No Declared Axis**
- ❌ Current: Describes sensation ("thick air, heavy hips") without naming the field type
- ✅ Required: Explicitly state whether the field is expansive, restrictive, supportive, or unsanctioned
- **Fix:** Every response must include axis language for orientation

### 2. **Lack of Diagnostic Coordinates**
- ❌ Current: Just "heavy" with no comparative context
- ✅ Required: Include directionality and magnitude with comparative cues
- **Examples:**
  - "pressure trending inward"
  - "low-volatility field"
  - "compression present but harmonic"
- **Fix:** Tie poetry back to falsifiable geometry with specific measurements

### 3. **No Transition from Perception to Inference**
- ❌ Current: Describes what it *feels* like, not what it *indicates*
- ✅ Required: Step from sensory data to symbolic hypothesis
- **Example:** "This pattern aligns with a low-agency, high-coherence climate"
- **Fix:** Keep it testable by connecting sensation to diagnostic hypothesis

### 4. **Missing Contrast (Polarity)**
- ❌ Current: Only one pole ("dense") with no breathing room
- ✅ Required: Name polarity—openness vs. restriction, support vs. friction, stability vs. volatility
- **Fix:** Symbolic weather depends on tension between two states

### 5. **No Closure Tag**
- ❌ Current: Ends with lyrical question ("What does the field say to the skin?") but not diagnostic
- ✅ Required: Include resonance classification (WB / ABE / OSR) and Socratic check
- **Fix:** Invite clear yes/no resonance that's falsifiable

## Required Triangulation

Every field description must carry this spine:

```
FIELD (sensory observation)
  ↓
MAP (symbolic direction)
  ↓
VOICE (conditional inference or question)
```

Once this structure is present, the language can be quiet or flat—and it will still hold weight.

## Implementation Checklist for Backend Prompts

### For Solo Balance Meter Reports

- [ ] Include explicit axis coordinates:
  - Magnitude (0-5 scale with label: "Surge", "Active", "Murmur", "Latent")
  - Directional Bias (-5 to +5 with label: "Expansive", "Restrictive", "Mixed")
  - Coherence/Volatility (0-5 with trend indicator)

- [ ] Structure response with clear layers:
  ```
  FIELD LAYER: [Sensory observation + axis coordinates]
  MAP LAYER: [Symbolic direction + structural patterns]
  VOICE LAYER: [Conditional inference + resonance question]
  ```

- [ ] Include contrast/polarity:
  - "This field shows [X] pulling against [Y]"
  - "Notice where expansion meets restriction"

- [ ] End with resonance classification:
  - WB (Works Beautifully): Full resonance, 1.0 weight
  - ABE (At Boundary Edge): Partial/inverted, 0.5 weight
  - OSR (Outside Symbolic Range): No resonance, 0 weight
  - Plus Socratic question: "Does this pattern land in your body?"

### For Solo Mirror Reports

- [ ] Begin with constitutional baseline:
  - Primary mode (core drive pattern)
  - Secondary mode (adaptive pattern)
  - Shadow pattern (suppressed/latent)

- [ ] Include behavioral anchors (not abstract symbolism):
  - "Here's how your system tends to move"
  - Testable against lived experience

- [ ] Map hook stack activations:
  - Named patterns with orb tightness
  - WB/ABE/OSR classification for each
  - Confidence scores where available

- [ ] Close with integration:
  - "Where does this mirror catch light for you?"
  - Invite falsifiable response

### For Relational Reports

- [ ] Provide **both** solo mirrors first:
  - Person A constitutional pattern
  - Person B constitutional pattern
  - Each with their own FIELD → MAP → VOICE structure

- [ ] Then synthesize relational engines:
  - Named patterns (e.g., "Spark Engine", "Sweet Glue", "Growth Pressure Cooker")
  - Mechanism + tendency in plain language
  - Use actual names, never generic pronouns

- [ ] Layer symbolic weather (if transit window exists):
  - How current transits activate the relational blueprint
  - Continuous narrative (paragraphs, not bullets)
  - Grounded in specific transit aspects

## Validation Tests

To verify proper structure, check that responses include:

1. **Numeric axis values** (not just qualitative descriptions)
2. **Directional language** (inward/outward, expanding/contracting)
3. **Comparative context** ("more than yesterday", "below threshold")
4. **Named polarities** (at least one opposing pair)
5. **Resonance classification** (WB/ABE/OSR or equivalent)
6. **Falsifiable question** (invites yes/no or testable response)

## Example: Before and After

### ❌ Before (Unstructured)
```
Right now the field gathers itself in the chest—weight like river stones 
pressing against the ribs, but not enough to pin you. The air is thick, 
slow to move, as if the weather itself hesitates. There's a low hum beneath 
thought, a sense of ground that doesn't quite anchor, just hovers close to 
the surface.
```

**Problems:**
- No axis declaration
- No diagnostic coordinates
- No inference from sensation
- No polarity contrast
- No closure tag

### ✅ After (Structured)
```
FIELD LAYER
Magnitude: 2.3 (Active but manageable)
Directional Bias: -1.2 (Mild inward pull)
Coherence: 3.8 (Stable, low volatility)

Right now the field registers as a mild inward pull (restrictive tilt) with 
stable coherence. Weight gathers in the chest—river stones pressing against 
ribs but not pinning. Air moves thick and slow; the ground hovers close but 
doesn't anchor.

MAP LAYER
This pattern suggests a low-agency, high-coherence climate—compression present 
but harmonic. The inward tilt opposes recent expansive trends (previous week: 
+0.8 bias), creating tension between contraction and the body's memory of openness.

VOICE LAYER
This configuration tends to slow decision velocity while maintaining emotional 
stability. The coherence score indicates internal alignment despite the restrictive 
field.

RESONANCE CHECK (ABE - At Boundary Edge)
Partial resonance detected: The inward pull may feel like productive pause rather 
than collapse, depending on recent context.

Does this compression feel productive (gathering) or reactive (shrinking)?
```

**Improvements:**
- Explicit axis coordinates with labels
- Comparative context (vs. previous week)
- Named polarity (inward pull vs. expansive memory)
- Inference connecting sensation to behavior
- Resonance classification (ABE)
- Falsifiable closing question

## Technical Implementation

### Backend API Response Format

The `/api/raven` route should return:

```typescript
{
  ok: true,
  draft: {
    // Structured FIELD → MAP → VOICE
    picture: "Sensory observation + axis coordinates",
    feeling: "Emotional/somatic data",
    container: "Symbolic direction + patterns",
    option: "Conditional inference",
    next_step: "Resonance question",
    
    // OR for conversational responses, ensure structure in text:
    conversation: "FIELD LAYER...\nMAP LAYER...\nVOICE LAYER...\n[Classification]..."
  },
  climate: {
    magnitude: 2.3,
    magnitude_label: "Active",
    directional_bias: -1.2,
    directional_bias_label: "Mild Inward",
    coherence: 3.8,
    coherence_label: "Stable"
  },
  prov: {
    source: "Poetic Brain (Perplexity)",
    confidence: 0.85,
    resonance_class: "ABE"
  }
}
```

### Frontend Handling

The frontend (`lib/raven-narrative.ts`) will:

1. Check if response has `draft.conversation` (freeform text)
2. Validate structure using `hasStructuralScaffolding()` detector
3. If structure exists, render as-is
4. If structure missing, prefer `draft.picture/feeling/container/option/next_step` format
5. Fall back to adding structure reminder only as last resort

## Action Items

### For Backend Team
- [ ] Update all Poetic Brain prompts to enforce FIELD → MAP → VOICE structure
- [ ] Add axis coordinate requirements to prompt templates
- [ ] Include resonance classification in all responses
- [ ] Test with symbolic weather, solo mirrors, and relational reports

### For Frontend Team
- [x] Add `hasStructuralScaffolding()` detector (completed)
- [x] Implement structure validation in `formatShareableDraft()` (completed)
- [ ] Add visual distinction for structured vs. unstructured responses (future)
- [ ] Create user-facing prompt helper ("Request structured analysis") (future)

## References

- Raven Calder corpus: FIELD → MAP → VOICE progression
- Balance Meter specification v4.0
- Mirror Flow operational guidelines
- Resonance validation framework (WB/ABE/OSR)
