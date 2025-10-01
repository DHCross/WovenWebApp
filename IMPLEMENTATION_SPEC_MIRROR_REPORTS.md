# Implementation Spec: Proper Mirror Reports with Translocation

## Executive Summary

This spec defines the complete implementation for Mirror reports (Solo and Relational) that:
1. Compute translocation/house realignment correctly
2. Open with true Mirror flow (4-paragraph frontstage)
3. Preserve bidirectionality in relational reports
4. Provide full audit trail in backstage

**Status**: In Progress
**Priority**: Critical - Current reports are incomplete/incorrect
**Complexity**: High - Requires Math Brain + Raven Calder integration

---

## 1. Math Layer Requirements

### 1.1 Relocation (Translocation) Modes

**Modes to Support**:
- `None`: Natal houses, no relocation
- `A_local`: Person A's current location (houses recalculated)
- `B_local`: Person B's current location (houses recalculated)
- `Midpoint`: Geographic midpoint between A and B
- `Custom`: User-specified coordinates

**What Changes**:
- ✅ Houses and angles (ASC/MC/DSC/IC) recalculated
- ✅ Local timing emphases shift
- ❌ Planet longitudes unchanged
- ❌ Aspects unchanged
- ❌ Synastry/composite math unchanged

**Implementation**:
```javascript
function computeRelocation(natalChart, targetLocation, mode) {
  // 1. Calculate local sidereal time at target location
  const LST = calculateLocalSiderealTime(
    targetLocation.latitude,
    targetLocation.longitude,
    natalChart.birthDate,
    natalChart.birthTime
  );

  // 2. Compute ASC/MC at new location
  const { ascendant, midheaven } = computeAngles(
    LST,
    targetLocation.latitude,
    natalChart.obliquity
  );

  // 3. Recompute house cusps using chosen system
  const houseCusps = computeHouseCusps(
    ascendant,
    midheaven,
    targetLocation.latitude,
    houseSystem // 'Placidus' | 'Whole Sign' | 'Equal' | etc.
  );

  // 4. Re-bucket natal planets into new houses
  const relocatedChart = {
    ...natalChart,
    ascendant,
    midheaven,
    descendant: (ascendant + 180) % 360,
    imum_coeli: (midheaven + 180) % 360,
    houses: houseCusps,
    planets: natalChart.planets.map(p => ({
      ...p,
      house: determineHouse(p.longitude, houseCusps)
    })),
    relocation: {
      mode,
      location: targetLocation,
      original_location: natalChart.birthLocation
    }
  };

  return relocatedChart;
}
```

### 1.2 Bidirectional Overlay Computation (Relational Reports)

**Required**:
- **A←B**: Person B's chart overlays onto Person A (A as receiver)
- **B←A**: Person A's chart overlays onto Person B (B as receiver)
- **No averaging** - preserve asymmetry

**Data Structure**:
```javascript
const bidirectionalOverlay = {
  a_from_b: {
    // B's planets aspecting A's natal points
    aspects: [
      {
        b_planet: "Saturn",
        b_position: 125.3,
        a_point: "Moon",
        a_position: 123.1,
        aspect: "conjunction",
        orb: 2.2,
        experience_for_a: "restriction", // How A feels this
        weight: 0.85
      }
    ],
    balance_meter: {
      magnitude: 3.2,
      valence: -1.5,
      volatility: 2.1,
      sfd: -1.2,
      splus: 1.3,
      sminus: 2.5
    }
  },
  b_from_a: {
    // A's planets aspecting B's natal points
    aspects: [ /* symmetric structure */ ],
    balance_meter: { /* may differ from a_from_b */ }
  },
  shared_field: {
    method: "composite", // or "dyadic"
    composite_chart: { /* midpoint chart */ },
    daily_metrics: { /* combined field */ }
  }
};
```

**Implementation**:
```javascript
function computeBidirectionalOverlay(chartA, chartB, synastryAspects) {
  // Partition synastry aspects by direction
  const aFromB = synastryAspects.filter(asp =>
    chartB.planets.some(p => p.name === asp.p1_name) &&
    chartA.planets.some(p => p.name === asp.p2_name)
  );

  const bFromA = synastryAspects.filter(asp =>
    chartA.planets.some(p => p.name === asp.p1_name) &&
    chartB.planets.some(p => p.name === asp.p2_name)
  );

  // Compute separate Balance Meters
  const balanceA = computeSFD(aFromB.map(toBalanceAspect));
  const balanceB = computeSFD(bFromA.map(toBalanceAspect));

  return {
    a_from_b: {
      aspects: aFromB.map(asp => ({
        ...asp,
        experience_for_a: classifyExperience(asp, chartA),
        weight: computeAspectWeight(asp)
      })),
      balance_meter: balanceA
    },
    b_from_a: {
      aspects: bFromA,
      balance_meter: balanceB
    }
  };
}
```

### 1.3 Orb Scheme Configuration

**Schemes**:
- `balance_default`: Standard Balance Meter orbs
  - Luminaries/Angles: 6° cap
  - Planets: 4° cap
  - Minor aspects: 1° cap
- `astro_seek_strict`: Tighter orbs (reduce false positives)
  - Luminaries/Angles: 4° cap
  - Planets: 3° cap
  - Minor aspects: 0.5° cap

**Implementation**: Already exists in [balance-meter.js:61-78](src/balance-meter.js#L61-L78), need to expose configuration.

### 1.4 Balance Indices Computation

**Per-Day Outputs**:
```javascript
{
  solo_a: {
    magnitude: 3.5,    // 0-5 scale
    valence: 1.2,      // -5 to +5
    volatility: 2.8,   // 0-5
    splus: 2.3,        // Support score
    sminus: 1.1,       // Friction score
    sfd: 1.2          // S+ - S-
  },
  solo_b: { /* same structure */ },
  shared: {
    method: "composite",  // or "dyadic"
    magnitude: 3.1,
    valence: 0.5,
    volatility: 3.2,
    sfd: 0.3,
    a_from_b_sfd: -1.2,  // Directional metrics
    b_from_a_sfd: 0.8
  }
}
```

**Keep backstage only** - never show raw numbers in frontstage prose.

---

## 2. Mirror Flow Structure (Frontstage)

### 2.1 Solo Mirror (4 Paragraphs)

**Paragraph 1: Your Blueprint & Baseline Climate**
```
Structure:
- Primary Mode: [Thinking|Feeling|Sensation|Intuition] (from Sun/Asc/Saturn)
- Secondary Mode: Supporting current (from Moon/Venus/rhythm houses)
- Shadow Mode: Friction zone (from Saturn/Pluto/Neptune/hard aspects)
- Blueprint Metaphor: "A kiln of patience alongside a lightning strip of invention"

Tone: Direct, plain, grounding. This is the "you" that persists.
```

**Paragraph 2: Today's Symbolic Weather & Daily Snapshot**
```
Structure:
- FIELD: Neutral atmosphere (from Balance Meter magnitude + volatility)
  Example: "The air feels compressed, like multiple fronts stacking up"
- MAP: Conditional meaning (only after user names where it shows up)
  Hidden until user input
- VOICE: Reflective invitation (never prescriptive)
  Example: "Where are you noticing this pressure most?"
- Daily Snapshot: Concise summary of energy shifts

Tone: Conversational, conditional, testable
```

**Paragraph 3: Core Tensions & Growth Edges**
```
Structure:
- 2-3 natal paradoxes as growth engines
- For each:
  - FIELD: Somatic/sensory texture
  - MAP: Symbolic geometry (backstage only)
  - VOICE: Plain conditional description

Example:
"You might notice a pull between needing deep, uninterrupted focus (Saturn in
3rd) and an impulse to scatter attention across multiple projects (Mercury
square Jupiter). When the focus side wins, you build something solid. When the
scatter side wins, you discover unexpected connections. Both are engines, not
flaws."
```

**Paragraph 4: Stitched Reflection & Invitation**
```
Structure:
- Weave Blueprint + Weather + Polarity Cards
- Frame tension as dynamic fuel
- End with open invitation (no prescriptions)

Example:
"Your constitutional baseline—structured, methodical, with bursts of intuitive
leaps—meets today's compressed atmosphere differently than it would on a
scattered day. The Saturn-Mercury paradox keeps you oscillating between depth
and breadth. Where do you feel called to lean today?"
```

### 2.2 Relational Mirror (4 Paragraphs)

**Paragraph 1: Shared Blueprint & Bond Climate**
```
Structure:
- Person A Anchors: Primary/Secondary/Shadow summary
- Person B Anchors: Primary/Secondary/Shadow summary
- Core Dynamic: How their energies interact
- Contrast: Key differences in processing
- Bond Climate Metaphor: "A steady fire meeting occasional rainfall"

Tone: Neutral about difference, frame complementarity
```

**Paragraph 2: Today's Relational Weather & Daily Snapshot**
```
Structure:
- Shared Field: Current relationship atmosphere
- A→B Activation: How B's presence activates A
- B→A Activation: How A's presence activates B
- Conditional Meaning: Requires both parties' input
- Daily Relational Snapshot: Energy balance for both

CRITICAL: Show bidirectional asymmetry!
Example:
"Dan, you may be experiencing Saturn's pressure from Stephanie's chart as a
grounding force today, while Stephanie, you might feel Dan's Mercury energy as
mental stimulation. Same connection, different lived experiences."
```

**Paragraph 3: Friction Points & Support Zones**
```
Structure:
- Supports: From trine/sextile synastry aspects
- Frictions: From square/opposition aspects
- Bidirectional Vectors (A→B and B→A separately)
- Shared Paradox: Common oscillation pattern

Example:
"Support shows up where Dan's Moon trines Stephanie's Venus—emotional attunement
flows easily. Friction concentrates where Dan's Saturn squares Stephanie's
Moon. For Stephanie, this can feel restrictive. For Dan, it can feel
stabilizing. Both are true simultaneously."
```

**Paragraph 4: Clear Mirror for Two & Invitation**
```
Structure:
- Integrate shared blueprint + relational weather
- Frame friction as generative
- Open-ended relational invitation

Example:
"Your bond carries a steady-meets-volatile climate. Today's shared field adds
[current weather]. The Saturn-Moon square means one of you feels held while the
other feels contained—and that asymmetry is data, not dysfunction. Where is
this showing up right now?"
```

---

## 3. Backstage Structure (Audit Trail)

### 3.1 Relocation & Provenance Pane
```json
{
  "relocation": {
    "mode": "A_local",
    "coordinates": { "lat": 30.4, "lon": -84.3 },
    "timezone": "America/New_York",
    "house_system": "Placidus",
    "orb_scheme": "balance_default",
    "birth_time_status": "exact",
    "angle_drift_alert": false
  },
  "provenance": {
    "build_id": "2025-10-01T14:23:00Z",
    "math_brain_version": "0.2.1",
    "channel_versions": {
      "seismograph": "v1.0",
      "balance": "v1.1",
      "sfd": "v1.2"
    },
    "solar_mode": false
  }
}
```

### 3.2 Indices Blocks
```json
{
  "daily_indices": {
    "2025-10-01": {
      "solo_a": { "splus": 2.3, "sminus": 1.1, "sfd": 1.2, "magnitude": 3.5, "volatility": 2.8 },
      "solo_b": { "splus": 1.8, "sminus": 2.1, "sfd": -0.3, "magnitude": 2.9, "volatility": 3.1 },
      "shared": {
        "method": "composite",
        "sfd": 0.5,
        "a_from_b_sfd": -1.2,
        "b_from_a_sfd": 0.8,
        "magnitude": 3.1,
        "volatility": 3.2
      }
    }
  }
}
```

### 3.3 Overlay Tables
```json
{
  "a_from_b_overlays": [
    {
      "b_planet": "Saturn",
      "aspect": "square",
      "a_point": "Moon",
      "orb": 2.3,
      "role": "compression",
      "weight": 0.82,
      "experience": "For A: restriction, containment"
    }
  ],
  "b_from_a_overlays": [
    {
      "a_planet": "Moon",
      "aspect": "square",
      "b_point": "Saturn",
      "orb": 2.3,
      "role": "support",
      "weight": 0.82,
      "experience": "For B: stability, grounding"
    }
  ]
}
```

### 3.4 Shared Field Method Tag
```json
{
  "shared_field": {
    "method": "composite",
    "note": "Composite chart: relationship as entity. Daily transits to composite points.",
    "alternative": "dyadic method available: hit-test synastry nodes S+/S- → SFD"
  }
}
```

---

## 4. Engineering Checklist

### Phase 1: Math Brain Fixes
- [ ] Implement relocation computation with mode selection
- [ ] Add house/angle recomputation at target location
- [ ] Build bidirectional overlay computation (A←B, B←A)
- [ ] Add orb scheme configuration
- [ ] Compute shared field via composite OR dyadic method
- [ ] Generate per-day indices (solo A, solo B, shared)
- [ ] Extract blueprint modes (Primary/Secondary/Shadow)
- [ ] Identify polarity cards (top 2-3 natal paradoxes)

### Phase 2: Raven Calder Integration
- [ ] Create Solo Mirror generator (4 paragraphs)
- [ ] Create Relational Mirror generator (4 paragraphs)
- [ ] Build FIELD → MAP → VOICE translator
- [ ] Implement metaphor/climate line generator
- [ ] Map Math Brain output to Raven templates

### Phase 3: Report Structure
- [ ] Restructure PDF: Frontstage first, Backstage after
- [ ] Never show raw numbers in frontstage
- [ ] Add relocation chooser UI
- [ ] Add Solar Mode badge when birth time missing
- [ ] Add Method/Orb/House pills in header

### Phase 4: Testing
- [ ] Test with Dan+Stephanie real data
- [ ] Validate bidirectional asymmetry preserved
- [ ] Confirm relocation math correct
- [ ] Verify hook stack populates correctly
- [ ] Check PDF structure matches spec

---

## 5. Dev-UX Guardrails

### Relocation Chooser
```typescript
interface RelocationChooser {
  mode: 'None' | 'A_local' | 'B_local' | 'Midpoint' | 'Custom';
  helperText: "Decide the setting of the story";
  compareToggle: boolean; // Show None vs A_local side-by-side
  customCoords?: { lat: number; lon: number; tz: string };
}
```

### Solar Mode Badge
- Display when birth time missing/uncertain
- Hide angle/house claims
- Warn: "Accuracy degraded without birth time"

### Header Pills
```
[Method: Composite] [Orbs: Balance Default] [Houses: Placidus] [Relocation: A_local]
```

---

## 6. Why Previous PDF Failed

**Problems**:
1. ❌ Led with raw indices instead of Mirror flow
2. ❌ Didn't declare relocation mode
3. ❌ Didn't preserve bidirectional overlays
4. ❌ No provenance/audit trail
5. ❌ Averaged metrics (collapsed blob)
6. ❌ Empty hook stack (no cross-activation computed)

**Requirements**:
1. ✅ Mirror first (4 paragraphs)
2. ✅ Relocation explicit in header
3. ✅ Bidirectional overlays preserved
4. ✅ Full provenance logged backstage
5. ✅ No averaging—preserve asymmetry
6. ✅ Symbolism testable, not retrofitted

---

## 7. API Endpoints Used

**Solo Reports**:
- `/api/v4/birth-chart` - Natal chart
- `/api/v4/transit-aspects-data` - Daily transits

**Relational Reports**:
- `/api/v4/birth-chart` (x2) - Both natal charts
- `/api/v4/synastry-aspects-data` - A ↔ B aspects
- `/api/v4/composite-aspects-data` - Composite chart
- `/api/v4/transit-aspects-data` (x2) - Transits for A and B

**Cross-Transit Computation** (not from API):
- Compute internally by overlaying synastry aspects
- Classify by direction (A←B vs B←A)
- Apply Balance Meter to each direction separately

---

## 8. Implementation Priority

**Critical Path** (must complete first):
1. Bidirectional overlay computation
2. Blueprint mode extraction
3. Relocation computation
4. Mirror Voice generator

**Second Priority**:
1. Orb scheme configuration
2. Shared field method selection
3. Backstage structure
4. PDF reordering

**Polish**:
1. UI improvements
2. Solar Mode badge
3. Compare toggle
4. Header pills

---

## 9. Success Criteria

A proper Mirror report:
1. ✅ Opens with 4-paragraph Mirror flow (frontstage)
2. ✅ Shows bidirectional asymmetry in relational reports
3. ✅ Declares relocation mode explicitly
4. ✅ Provides full audit trail (backstage)
5. ✅ Populates hook stack with cross-activation
6. ✅ Never shows raw numbers in prose
7. ✅ All claims are testable/falsifiable

When user receives report:
- Recognizes themselves in Blueprint
- Sees today's weather clearly separated
- Understands paradoxes as engines
- Can verify all claims against lived experience
- Has full technical details for audit

---

## 10. ENGINE INSTRUCTIONS (Embed in Every PDF)

**Location in PDF**: Immediately after frontstage Mirror flow, before data tables.

**Purpose**: Self-contained playbook for reproducing exact computation. Any engine can verify/reproduce results from this spec alone.

```
═══════════════════════════════════════════════════════════════════════
ENGINE INSTRUCTIONS — DO NOT DELETE
═══════════════════════════════════════════════════════════════════════

Scope: The upstream API returns planetary/bodies' longitudes, aspects, and
(optionally) composite/synastry skeletons. The following steps must be
performed locally by the engine to produce a valid Woven Map report.

0) Provenance & Determinism (run first)
   • Fix random seeds. Record math_brain_version, orb_scheme, house_system,
     relocation_mode, and timezone DB in the header.
   • Hash inputs (birth data, coords, API payloads) → provenance_hash.
   • If any birth time is missing → set solar_mode=true, suppress angles/houses,
     and add a red badge in the PDF.

1) Relocation / House Realignment (Translocation)

Relocation modes: None | A_local | B_local | Midpoint (declare chosen mode
in the header).
   1. Compute Local Sidereal Time at the relocation site/time.
   2. Derive ASC/MC; compute house cusps (Placidus by default).
   3. Re-bucket all natal and transit points into houses at the relocated site.
   4. Do not alter ecliptic longitudes or aspect angles; only houses/angles change.
   5. If location/time uncertainty > configured tolerance, emit Angle Drift Alert
      and widen any angle-dependent interpretations accordingly.

2) Bidirectional Synastry (Relational reports only)

Compute both arrows, never average:
   • A←B (A as receiver): overlay B's natal points onto A's natal. Determine
     aspects and tag each as support or compression using your role map
     (e.g., Venus→Moon = support; Saturn□Moon = compression; Pluto hard contacts
     = compression; Jupiter/Venus soft = support).
   • B←A (B as receiver): repeat with roles reversed.
   • Store each contact with: {aspect, orb, role, p_sender, p_receiver, weight}.

3) Shared Field (pick one method; declare in header)

Composite route: Build the midpoint composite chart (A+B) and compute its
                transit aspects for each day.
Dyadic route: From the bidirectional overlays, build S⁺ nodes (supportive
             contacts) and S⁻ nodes (counter/support-under-attack) that are
             actually hit by the transiting sky that day; then tally to S⁺/S⁻.

4) Balance Indices (for Solo A, Solo B, and Shared—every day)
   • Compute:
     • S_plus = weighted sum of supportive hits,
     • S_minus = weighted sum of counter hits,
     • SFD = S_plus − S_minus.
   • Derive Magnitude (overall signal strength, e.g., normalized |S_plus| + |S_minus|),
     Valence (scaled sign of SFD),
     Volatility (intra-window variance/instability; e.g., rolling MAD or
                slope-of-slope on indices).
   • Keep all numbers backstage only.

Weights & orbs:
   • Use declared orb_scheme ("default" or "strict").
   • +1° tolerance for Moon, −1° for outer→personal (if configured).
   • Drop aspects outside orbs before weighting.

5) Mirror Flow (Frontstage prose)

Render exactly four paragraphs:
   • Solo Mirror:
     1. Blueprint & Baseline Climate (Primary/Secondary/Shadow + metaphor)
     2. Today's Symbolic Weather (FIELD neutral from Mag/Vol → MAP conditional
        → VOICE invitation) + a one-line Daily Snapshot
     3. Core Tensions & Growth Edges (2–3 paradoxes, each FIELD/MAP/VOICE)
     4. Stitched Reflection & Invitation (weave + open prompt)
   • Relational Mirror:
     1. Shared Blueprint & Bond Climate (contrast + metaphor)
     2. Today's Relational Weather (shared FIELD/MAP/VOICE) + Daily Relational
        Snapshot
     3. Friction Points & Support Zones (show A→B and B→A separately)
     4. Clear Mirror for Two & Invitation

Frontstage rule: no numbers in prose. All math lives backstage.

6) Backstage Tables (for audit)
   • Provenance pane: relocation mode, coords, tz, house system, orb scheme,
     method_shared, versions, provenance_hash, and any Solar Mode / Angle
     Drift flags.
   • Indices tables: per-day rows for Solo A, Solo B, Shared → mag, val, vol,
     S_plus, S_minus, sfd.
   • Overlays tables: A←B and B←A (aspect, orb, role, weight).
   • Shared method note: "composite" or "dyadic" with one-line implications.

7) Failure Modes (hard stops)
   • Missing coords for relocation mode ≠ None → fallback to None + warning badge.
   • API returned zero aspects → render Mirror using blueprint-only language;
     insert "no aspects received" placeholder and simulated examples flagged
     as simulated.
   • House system not recognized → fallback to Placidus with warning.

═══════════════════════════════════════════════════════════════════════
END ENGINE INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════
```

**What This Provides**:
1. Self-contained playbook in every PDF
2. Reproducible computation from report alone
3. Clear scope: what API provides vs what engine must compute
4. Audit trail for verification

---

**Next Step**: Begin Phase 1 implementation with bidirectional overlay computation.
