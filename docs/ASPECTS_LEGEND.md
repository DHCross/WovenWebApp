# Aspects Legend Documentation

**Version:** 1.0  
**Created:** October 2025  
**Mandate:** Translate geometric symbols into falsifiable directional bias weights  
**Core Principle:** Aspects map to the Woven Map's two-axis seismograph (Magnitude + Directional Bias)

---

## Overview

The **Aspects Legend** provides a programmatic and human-readable reference for all astrological aspects used in Woven Map analysis. Rather than using traditional jargon like "challenging" or "flowing," we map each aspect to a **directional bias weight** on the -5 to +5 scale:

- **Restrictive Force** (negative bias) = friction, challenge, pressure requiring conscious integration
- **Harmonic Force** (positive bias) = ease, support, natural flow
- **Neutral** (zero bias) = depends on planetary pairing and context

## Seven Core Aspects

### Restrictive Force (Challenging Geometry)

#### 1. **Opposition (☍)** | 180°
- **Orb:** ±8°
- **Directional Bias:** −3 (strong restrictive)
- **Weight:** 0.9 (maximum tension)
- **Theme:** Polarity, awareness through reflection
- **Keywords:** tension, awareness, mirror, polarity
- **Poetic Translation:** "Two parts of you that need to negotiate; awareness comes through seeing each other"
- **Seismograph Impact:** Strong negative valence; high magnitude presence

#### 2. **Square (□)** | 90°
- **Orb:** ±8°
- **Directional Bias:** −2.5 (restrictive force)
- **Weight:** 0.8 (strong tension)
- **Theme:** Friction, productive tension, friction
- **Keywords:** challenge, friction, pressure, growth
- **Poetic Translation:** "Where you meet resistance that calls you to adapt and grow"
- **Seismograph Impact:** Moderate-to-strong negative valence; active tension

#### 3. **Quincunx (⚻)** | 150°
- **Orb:** ±6°
- **Directional Bias:** −1 (slight restrictive)
- **Weight:** 0.5 (moderate awkwardness)
- **Theme:** Adjustment required, recalibration
- **Keywords:** awkwardness, adjustment, refinement, correction
- **Poetic Translation:** "Where you need fine-tuning; small adjustments yield big results"
- **Seismograph Impact:** Mild negative valence; correction needed

#### 4. **Semi-Square (∠)** | 45°
- **Orb:** ±4°
- **Directional Bias:** −1.5 (mild irritation)
- **Weight:** 0.3 (minor friction)
- **Theme:** Minor friction, subtle irritation
- **Keywords:** irritation, minor tension, nudge
- **Poetic Translation:** "A small persistent nudge; notice and address before it builds"
- **Seismograph Impact:** Light negative valence; background tension

---

### Harmonic Force (Supportive Geometry)

#### 5. **Trine (△)** | 120°
- **Orb:** ±8°
- **Directional Bias:** +3 (strong supportive)
- **Weight:** 0.6 (significant presence)
- **Theme:** Flow, harmony, natural grace
- **Keywords:** harmony, talent, gift, ease
- **Poetic Translation:** "Where things come naturally; what you barely have to think about"
- **Seismograph Impact:** Strong positive valence; ease and flow

#### 6. **Sextile (⌛)** | 60°
- **Orb:** ±6°
- **Directional Bias:** +2 (supportive touch)
- **Weight:** 0.4 (lighter support)
- **Theme:** Ease, opportunity, natural flow
- **Keywords:** support, opportunity, ease, integration
- **Poetic Translation:** "Gentle support; a door that opens if you push"
- **Seismograph Impact:** Moderate positive valence; available opportunities

---

### Neutral Force (Context-Dependent)

#### 7. **Conjunction (☌)** | 0°
- **Orb:** ±8°
- **Directional Bias:** 0 (neutral; depends on planets)
- **Weight:** 0.7 (moderate presence)
- **Theme:** Merging, blending, unified intent
- **Keywords:** union, intensification, overlap, presence
- **Poetic Translation:** "One lens focused through both planets; intensity and singular focus"
- **Seismograph Impact:** Neutral valence initially; must be interpreted through planetary pairing

---

## Balance Meter Integration: Magnitude + Directional Bias

Each aspect contributes to two Balance Meter dimensions:

### Magnitude (Intensity)
The **weight** of the aspect—how present it is in the chart geometry:

| Aspect | Weight | Interpretation |
|--------|--------|-----------------|
| Opposition | 0.9 | Maximum presence; cannot be ignored |
| Square | 0.8 | Strong presence; active in decision-making |
| Conjunction | 0.7 | Moderate concentration |
| Trine | 0.6 | Significant but "invisible" support |
| Quincunx | 0.5 | Moderate background pressure |
| Semi-Square | 0.3 | Light irritation; easy to overlook |
| Sextile | 0.4 | Lighter support; requires noticing |

### Directional Bias (Valence)
The **push** of the aspect toward challenge or ease on the -5 to +5 scale:

**Restrictive (Negative):** Friction that requires conscious integration
- Opposition: −3 (polarity awareness)
- Square: −2.5 (pressure)
- Quincunx: −1 (fine-tuning)
- Semi-Square: −1.5 (nudge)

**Harmonic (Positive):** Support available through natural flow
- Trine: +3 (grace)
- Sextile: +2 (opportunity)

**Neutral (Zero):**
- Conjunction: 0 (depends on planetary nature)

---

## Seismograph Calculation Example

A chart with three aspects affecting Venus (values, relating):

```
Venus Square Mars (restrictive)
  - Magnitude contribution: 0.8
  - Directional bias: −2.5
  - Interpretation: "Relational assertiveness creates friction; needs integration"

Venus Trine Saturn (harmonic)
  - Magnitude contribution: 0.6
  - Directional bias: +3
  - Interpretation: "Commitment stability flows naturally"

Venus Conjunction Jupiter (neutral, expanded)
  - Magnitude contribution: 0.7
  - Directional bias: 0 (then +2 via Jupiter's benevolent nature)
  - Interpretation: "Generous expression; abundance-seeking in relationships"
```

**Combined Venus Signal:**
- **Magnitude:** (0.8 + 0.6 + 0.7) / 3 ≈ 0.7 (moderate intensity)
- **Directional Bias:** (−2.5 + 3 + 2) / 3 ≈ 0.83 → scales to +2 on -5 to +5 range
- **Poetic Reading:** "You navigate relating with both assertive friction and generous optimism; the challenge is integrating both without overextending"

---

## Aspect Weight Rationale (Orb-Based Dampening)

Tighter orbs (aspects closer to exact) carry stronger weight:

```
Orb Weight = 1 - (actual_orb / allowed_orb)

Example:
  - Venus Square Mars at 2° orb (allowed ±8°)
  - Orb weight: 1 - (2/8) = 0.75
  - Final directional bias: −2.5 × 0.75 = −1.875 (dampened)
  
  - Venus Square Mars at 7° orb (allowed ±8°)
  - Orb weight: 1 - (7/8) = 0.125
  - Final directional bias: −2.5 × 0.125 = −0.3125 (barely present)
```

This prevents aspects at the edge of the orb from dominating the seismograph signal.

---

## Programmatic Usage

### Get Aspect Definition
```typescript
import { getAspectDefinition } from '@/lib/raven/aspects-legend';

const square = getAspectDefinition('square');
console.log(square.directionalBias); // −2.5
console.log(square.theme); // "Friction, productive tension"
```

### Check Aspect Force Type
```typescript
import { isRestrictiveAspect, isHarmonicAspect } from '@/lib/raven/aspects-legend';

isRestrictiveAspect('opposition');  // true
isHarmonicAspect('trine');          // true
isHarmonicAspect('square');         // false
```

### Calculate Combined Bias (Seismograph Integration)
```typescript
import { calculateAspectBias } from '@/lib/raven/aspects-legend';

const aspects = [
  { name: 'square', orb: 2 },
  { name: 'trine', orb: 1 },
];

const valence = calculateAspectBias(aspects);
// Calculates weighted average considering orb tightness
```

### Generate UI Tables and Legends
```typescript
import { 
  generateAspectsMarkdownTable, 
  generateAspectsTextLegend 
} from '@/lib/raven/aspects-legend';

const table = generateAspectsMarkdownTable();
// Ready for markdown rendering in tooltips/UI

const legend = generateAspectsTextLegend();
// Plain text reference for documentation/export
```

### Get Context for Specific Planetary Aspects
```typescript
import { getAspectContext } from '@/lib/raven/aspects-legend';

const context = getAspectContext('opposition', 'sun', 'pluto');
// Returns: "Opposition: Polarity, awareness through reflection between Sun and Pluto"
```

---

## Falsifiability: Why This Design Matters

### The Problem with Traditional Jargon
Astrology traditionally calls aspects "challenging" or "easy," which is:
- **Vague:** Challenge to whom? In what context?
- **Immune to testing:** Unfalsifiable claims
- **Black box:** Users can't see how geometry becomes meaning

### The Woven Map Solution
By using **explicit directional bias weights**, we make aspects:

1. **Traceable:** Every directional bias value (−3 to +3) maps back to geometric angle
2. **Falsifiable:** "Opposition creates strong restrictive valence (−3)" can be tested against user experience
3. **Auditable:** Users can see the exact calculation: weight × orb-dampening × directional-bias = seismograph signal
4. **Transparent:** The legend itself becomes a teaching instrument

### Example: Testing Falsifiability
**Claim:** "You have Sun-Saturn Opposition, directional bias −3"
**Test:** Does this experience show up as strong restrictive pressure in your life?
**User Feedback:** "Yes, I constantly negotiate between self-expression and responsibility"
- ✅ Falsifiable claim confirmed
- ✅ User agency preserved (they judge the mapping)
- ✅ Not astrology-jargon but structural observation

---

## Integration Roadmap

### Completed
- ✅ Aspects Legend module (`lib/raven/aspects-legend.ts`)
- ✅ Seven core aspects with explicit bias weights
- ✅ Orb-based dampening logic for seismograph
- ✅ Markdown + text legend generation

### Next (Mandate 2)
- Balance Meter tooltips showing aspect force + directional bias
- Example tooltip: "2nd House Pressure: Square aspects (−2.5 bias) from outer planets"

### Future (Mandate 3+)
- Planet-aspect combinations (Mars Square Saturn = relational friction)
- PDF export embedding full aspects legend with examples
- Interactive aspect wheel showing force vectors

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/raven/aspects-legend.ts` | Core module with aspect definitions and functions |
| `docs/ASPECTS_LEGEND.md` | This documentation |
| `lib/raven/houses-legend.ts` | Companion module (houses) |
| `app/api/raven/route.ts` | Integration point for aspect context in reports |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Oct 2025 | Initial release with seven core aspects, directional bias weights, seismograph integration |

---

## Questions & Contact

For clarifications on aspect interpretations or integration into Balance Meter:
- Review the seismograph calculation logic in `src/seismograph.js`
- Check aspect context examples in `getAspectContext()` function
- Cross-reference with `HOUSES_LEGEND.md` for house-planet-aspect combinations
