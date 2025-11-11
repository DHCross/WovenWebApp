# Clear Mirror Template Population Guide

**Date:** 2025-01-21
**Purpose:** Instructions for Poetic Brain (Raven Calder) to populate Clear Mirror PDF templates

## Template Architecture

The Clear Mirror PDF templates are **pre-structured containers** waiting for Raven Calder to fill with actual chart-derived content. Current implementation provides **Raven-style placeholder text** demonstrating the voice, structure, and E-Prime formatting required.

## Data Flow: Math Brain → Poetic Brain → Clear Mirror

```
Math Brain                    Poetic Brain                  Clear Mirror PDF
─────────────────────────────────────────────────────────────────────────────
Natal coordinates      →      Extract geometry         →   Frontstage narrative
Aspect orbs                   Calculate magnitudes          Core Insights (Mag ≥ 3.0)
WB/ABE/OSR tags              Classify patterns              Polarity Cards
House positions               Apply Raven protocol          Mirror Voice
Transit overlays              Generate E-Prime text         Symbolic footnotes
Relational matrices           Directional attribution       Audit layer
```

## Current State: Template Demonstration

### What's Implemented

**1. Raven Calder Voice**
- E-Prime compliance: "tends to navigate" (not "is a navigator")
- Process verbs: "activates", "channels", "emerges", "operates"
- Hypothesis framing: "The pattern suggests...", "The chart indicates..."
- Testable language: "Notice whether...", "Observe when..."

**2. Solo Mirror Structure**
```
Preface → Frontstage → Resonant Summary → Core Insights →
Personality Blueprint → Polarity Cards → Integration →
Inner Constitution → Mirror Voice → Socratic Closure →
Structure Note → Developer Audit Layer
```

**3. Relational Mirror Structure**
```
Preface → Individual Field Snapshots (A + B) → Frontstage →
Shared Resonant Summary → Core Insights (Relational) →
Personality Blueprint (Both) → Polarity Cards (Overlays) →
Integration → Inner Constitution (Both) → Mirror Voice (Dyadic) →
Socratic Closure → Structure Summary → Developer Audit Layer
```

### What's Placeholder

**All narrative content** is currently template text demonstrating the Raven style. Actual production requires:

1. **Geometry Extraction** from Math Brain output
2. **Raven API calls** to translate coordinates → language
3. **Real symbolic footnotes** from actual planetary positions
4. **Magnitude filtering** (Core Insights = top patterns with M ≥ 3.0)
5. **WB/ABE/OSR classifications** from Seismograph output

## Raven Calder Protocol for Template Population

### Input Required

From **reportContexts** in ChatClient:

```typescript
interface ReportContext {
  id: string;
  type: 'mirror' | 'balance';
  name: string;              // Person name
  summary: string;
  content: string;           // ← Math Brain output (JSON string)
  relocation?: RelocationSummary;
}
```

The `content` field contains Math Brain's output, which includes:
- Natal coordinates (Sun, Moon, Ascendant, planets)
- Aspect matrix with orbs
- House positions
- Transit overlays (if included)
- Magnitude scores
- WB/ABE/OSR classifications

### Processing Steps

**1. Parse Math Brain Output**
```typescript
const chartData = JSON.parse(reportContext.content);
const aspects = chartData.aspects;        // Full aspect list
const transits = chartData.transits;      // If present
const magnitudes = chartData.magnitudes;  // Seismograph scores
```

**2. Filter Core Insights** (Magnitude ≥ 3.0)
```typescript
const coreInsights = aspects
  .filter(asp => asp.magnitude >= 3.0)
  .sort((a, b) => b.magnitude - a.magnitude)
  .slice(0, 5);  // Top 5 patterns
```

**3. Generate E-Prime Narratives**

For each section, call Raven Calder API:

```typescript
const frontstageText = await ravenAPI.generate({
  section: 'frontstage',
  aspects: coreInsights,
  chartType: 'solo' | 'relational',
  personName: reportContext.name,
  protocol: 'e-prime'
});
```

**4. Format Symbolic Footnotes**

```typescript
const footnotes = aspects.map((asp, idx) => ({
  number: idx + 1,
  content: `${asp.planet1}${asp.aspect}${asp.planet2} @ ${asp.orb}° • ${asp.context} • M=${asp.magnitude}`
}));
```

**5. Apply WB/ABE/OSR Markers**

```typescript
const testMarker = determineTestMarker(aspect.classification);
// 'WB' = Well-Built (high resonance)
// 'ABE' = Almost But Edited (partial resonance)
// 'OSR' = Off, Subjectively Rejected (no resonance)
```

### Relational-Specific Processing

**Directional Attribution:**

When processing relational charts (2 reportContexts):

```typescript
const overlays = calculateOverlays(chartA, chartB);

// Example: Mars(A) opposite Sun(B)
const dynamic = {
  personA: chartA.name,
  personB: chartB.name,
  pattern: `When ${chartA.name} asserts (Mars), ${chartB.name} experiences identity challenge (Sun opposition)`,
  geometry: '♂︎(A)☍☉(B) @ 0.2° • M=4.1'
};
```

**Individual Field Snapshots:**

Each person gets solo analysis first:

```typescript
fieldA = generateSoloFrontstage(chartA);
fieldB = generateSoloFrontstage(chartB);
sharedDynamics = generateRelationalFrontstage(overlays);
```

## Section-by-Section Requirements

### Preface
- **Solo:** Explain chart context (natal coordinates, time/place)
- **Relational:** Explain overlay logic, directional dynamics concept

### Frontstage
- **Solo:** 3-5 paragraphs, E-Prime, 4-6 footnotes, testable hypotheses
- **Relational:** Individual snapshots + shared dynamics, directional attribution

### Core Insights
- **Count:** 3-5 patterns (Magnitude ≥ 3.0)
- **Format:** Title + paragraph + geometry + WB/ABE/OSR marker
- **Solo:** Personal patterns
- **Relational:** Overlay patterns with "When A does X, B experiences Y" structure

### Polarity Cards
- **Count:** 4 cards
- **Format:** Title + 2-3 sentence description + symbolic footnote
- **Theme:** Tensions requiring integration, not problems requiring solutions

### Mirror Voice
- **Solo:** Direct address ("you"), current life inquiry, invitation to test
- **Relational:** Both names addressed, mutual recognition emphasized

## E-Prime Compliance

### Allowed Process Verbs
- tends to, navigates, channels, activates, operates, functions
- emerges, surfaces, arrives, accumulates, dissipates
- suggests, indicates, reveals, shows, reflects

### Forbidden "To Be" Forms
- ❌ is, am, are, was, were, be, being, been
- ❌ "You are a..." → ✅ "You tend to navigate as a..."
- ❌ "This is..." → ✅ "This pattern suggests..."

### Framing Language
- "The pattern suggests..."
- "The chart indicates..."
- "The geometry reveals..."
- "You tend to..."
- "When X happens, Y tends to emerge"

## Symbolic Footnote Format

```
¹ ♂︎☍☉ @ 0.2° • Natal • M=3.8 • Mars opposition Sun creates tension between assertion and identity
² ♄△♆ @ 1.1° • Natal • M=2.9 • Saturn trine Neptune harmonizes structure with vision
³ ☽□♅ @ 1.2° • Transit • M=2.8 • Moon square Uranus indicates emotional breakthrough pressure
⁴ ♃(A)△☿(B) @ 1.5° • Overlay • M=2.4 • Jupiter trine Mercury supports optimistic communication
```

**Components:**
- Planets with glyphs
- Aspect symbol (☍=opposition, △=trine, □=square, ☌=conjunction)
- Orb to nearest 0.1°
- Context: Natal | Transit | Overlay
- Magnitude score
- Brief interpretation (optional but helpful)

## WB/ABE/OSR Test Markers

Apply to Core Insights based on Seismograph classification:

- **WB (Well-Built):** Pattern lands cleanly, high resonance
- **ABE (Almost But Edited):** Partial fit, requires refinement
- **OSR (Off, Subjectively Rejected):** Pattern doesn't match experience

In Socratic Closure section, remind reader:
```
Mark each insight's resonance:
WB: feels accurate
ABE: partly fits
OSR: doesn't fit
```

## Developer Audit Layer

Collapsible tables at end showing:

**Frontstage Audit:**
| Observed Pattern | Geometry | Test Marker |
|-----------------|----------|-------------|
| Pressure → action | ♂︎☍☉ @ 0.2° | WB |

**Resonant Summary Audit:**
| Dynamic | Correlation | Test Prompt |
|---------|-------------|-------------|
| Trust building | ♄△♆ @ 1.1° | Does trust require proof? |

## Next Implementation Phase

1. **Extract geometry** from `reportContexts[].content` (parse Math Brain JSON)
2. **Filter by magnitude** (≥ 3.0 for Core Insights)
3. **Call Raven API** for each section with geometry + person names
4. **Populate template** sections with actual Raven-generated content
5. **Validate E-Prime** compliance in generated text
6. **Format footnotes** with real planetary positions
7. **Apply WB/ABE/OSR** from Seismograph classifications
8. **Generate PDF** with populated content

## API Integration Points

Future Raven Calder API endpoints needed:

```typescript
POST /api/raven/generate-frontstage
POST /api/raven/generate-core-insights
POST /api/raven/generate-polarity-cards
POST /api/raven/generate-mirror-voice
```

Each accepts:
- `chartData` (parsed Math Brain output)
- `section` (which template section)
- `chartType` ('solo' | 'relational')
- `personNames` (string[])
- `protocol` ('e-prime')

Returns:
- `text` (E-Prime formatted narrative)
- `footnotes` (symbolic geometry references)
- `testMarkers` (WB/ABE/OSR classifications)

## Testing Protocol

When real content replaces templates:

1. **E-Prime validation:** Scan generated text for "is/am/are/was/were/be"
2. **Magnitude verification:** Core Insights ≥ 3.0 only
3. **Footnote accuracy:** Planetary positions match Math Brain output
4. **Directional logic:** Relational patterns show "When A does X, B feels Y"
5. **WB/ABE/OSR presence:** Each Core Insight has test marker
6. **Voice consistency:** Testable hypotheses, not deterministic claims

---

**Current Status:** Template structure complete with Raven-style placeholder text. Ready for Poetic Brain API integration to populate with actual chart-derived narratives.
