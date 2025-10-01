# Report Structure & Hierarchy Verification

## Current Implementation Status

### ✅ Top-Level Structure (CORRECT)

```javascript
{
  schema: 'WM-WovenMap-1.0',
  type: 'solo' | 'relational',
  report_family: 'comprehensive',
  context: { mode, period, translocation, person_a, person_b },
  raw_geometry: { /* API responses */ },
  provenance: { /* engine versions, timestamps, configs */ },

  // THREE MAIN LAYERS:
  blueprint: { /* natal/relational foundation */ },
  symbolic_weather: { /* transit activation - only if transits present */ },
  data_tables: { /* comprehensive backstage for PDF */ }
}
```

### ✅ Blueprint Layer (CORRECT - Always Present)

**Location**: `report.blueprint`

**Solo Reports**:
```javascript
{
  natal_summary: {
    anchors: { sun, moon, ascendant, midheaven },
    placements: { core, supporting, derived }
  },
  drivers: {
    core_planets: ['Sun', 'Moon', ...],
    supporting_points: ['Venus', 'Mars', ...],
    derived: ['Chiron', 'North_Node', ...]
  },
  polarity_cards: [ /* structural tensions */ ],
  vector_integrity: { /* drift metrics */ }
}
```

**Relational Reports** (adds):
```javascript
{
  ...solo_blueprint,
  synastry_summary: {
    total_aspects: 25,
    supportive_count: 12,
    challenging_count: 8,
    top_supportive: [...],
    top_challenging: [...],
    dominant_theme: 'harmonious' | 'dynamic' | 'balanced'
  },
  relationship_score: 72.5
}
```

### ✅ Symbolic Weather Layer (CORRECT - Only When Transits Present)

**Location**: `report.symbolic_weather`

**Condition**: Only included when `hasTransits === true`

**Solo Reports**:
```javascript
{
  balance_meter: {
    magnitude: { value: 3.5, label: 'High', version: 'v1.0' },
    valence: { value: 1.2, label: 'Supportive', version: 'v1.1' },
    volatility: { value: 2.8, label: 'Moderate', version: 'v1.2' },
    sfd: { value: 1.5, splus: 3.2, sminus: 1.7 }
  },
  time_series: { /* daily progression */ },
  integration_factors: { /* health correlations */ },
  transit_context: { /* specific transits */ },
  field_triggers: { /* keywords */ }
}
```

**Relational Reports** (adds):
```javascript
{
  ...solo_weather,

  // ✅ NEW: Bidirectional overlays (preserves asymmetry)
  bidirectional_overlays: {
    a_from_b: {
      aspects: [ /* B's planets affecting A */ ],
      balance_meter: { sfd: -1.2, splus: 1.3, sminus: 2.5 },
      description: "Person A experiences 12 contacts from Person B"
    },
    b_from_a: {
      aspects: [ /* A's planets affecting B */ ],
      balance_meter: { sfd: 0.8, splus: 2.1, sminus: 1.3 },
      description: "Person B experiences 15 contacts from Person A"
    }
  },

  // Person B's transit summary
  person_b_balance_meter: {
    magnitude: { value: 2.9, ... },
    valence: { value: -0.5, ... },
    ...
  },

  // Legacy (deprecated but kept for compatibility)
  relational_balance_meter_legacy: { ... }
}
```

### ✅ Data Tables Layer (CORRECT - Comprehensive Backstage)

**Location**: `report.data_tables`

**All Reports**:
```javascript
{
  natal_positions: [ /* planet/angle positions table */ ],
  natal_aspects: [ /* natal aspect list */ ],
  summary_stats: { /* aggregated stats */ }
}
```

**When Transits Present** (adds):
```javascript
{
  transit_aspects: [ /* transit-to-natal aspect list by date */ ],
  daily_readings: [ /* magnitude/valence/volatility by date */ ]
}
```

**Relational Reports** (adds):
```javascript
{
  synastry_aspects: [ /* A ↔ B aspect list */ ],
  composite_positions: [ /* composite chart positions */ ]
}
```

---

## ✅ Hierarchy Verification

### According to [Four Report Types.md](Developers Notes/Four Report Types.md):

**Two Categories**:
1. **Mirror Flow** - qualitative, recognition-first, low location sensitivity
2. **Balance Meter** - quantitative, transit-dependent, high location sensitivity

**Our Implementation**:
- ✅ Blueprint = Mirror Flow (qualitative foundation)
- ✅ Symbolic Weather = Balance Meter (quantitative transits)
- ✅ Unified in single report family: `'comprehensive'`

### According to [UNIFIED_REPORT_STRUCTURE.md](UNIFIED_REPORT_STRUCTURE.md):

**Expected Layers**:
1. Blueprint Layer (natal/relational foundation)
2. Symbolic Weather Layer (only if transits present)
3. Comprehensive Data Tables (for PDF export)

**Our Implementation**:
- ✅ Matches exactly

### According to [How Raven Speaks v2.md](Developers Notes/How Raven Speaks v2.md):

**Required for Raven Calder**:
1. Blueprint (Primary/Secondary/Shadow modes)
2. Today's Symbolic Weather (FIELD → MAP → VOICE)
3. Core Tensions (Polarity Cards)
4. Stitched Reflection

**Our Implementation**:
- ✅ Blueprint layer provides foundation
- ✅ Symbolic Weather provides daily activation
- ✅ Polarity Cards in blueprint
- ❌ **MISSING**: Raven Calder narrative generation (4 paragraphs)

---

## ❌ What's Still Missing

### 1. Raven Calder Integration (CRITICAL)

**Current State**: We have the data structure, but no narrative generation.

**Required**:
```javascript
report.mirror_voice = {
  // Paragraph 1: Blueprint & Baseline Climate
  paragraph_1: {
    primary_mode: "Thinking (structured, analytical)",
    secondary_mode: "Intuition (pattern-seeking)",
    shadow_mode: "Feeling (compressed by Saturn)",
    blueprint_metaphor: "A kiln of patience alongside lightning strips of invention"
  },

  // Paragraph 2: Today's Symbolic Weather
  paragraph_2: {
    field: "The air feels compressed, like multiple fronts stacking up",
    map: null, // Hidden until user provides context
    voice: "Where are you noticing this pressure most?",
    daily_snapshot: "Magnitude high, valence supportive, volatility moderate"
  },

  // Paragraph 3: Core Tensions & Growth Edges
  paragraph_3: {
    polarity_cards: [
      {
        field: "Pull between deep focus and scattered exploration",
        map: "Saturn in 3rd square Jupiter in 6th",
        voice: "Both are engines, not flaws"
      }
    ]
  },

  // Paragraph 4: Stitched Reflection
  paragraph_4: {
    weave: "Your baseline meets today's compressed atmosphere...",
    invitation: "Where do you feel called to lean today?"
  }
}
```

### 2. Blueprint Mode Extraction (NEEDED FOR RAVEN)

**Function to Create**:
```javascript
function extractBlueprintModes(natalChart) {
  return {
    primary_mode: determinePrimaryMode(natalChart), // Sun/Asc/Saturn
    secondary_mode: determineSecondaryMode(natalChart), // Moon/Venus
    shadow_mode: determineShadowMode(natalChart), // Hard aspects/outer planets
    blueprint_metaphor: generateBlueprintMetaphor(primary, secondary, shadow)
  };
}
```

### 3. Relocation Mode Selection (PER SPEC)

**Current State**: Basic relocation notes stub exists

**Required** ([Four Report Types.md](Developers Notes/Four Report Types.md)):
```javascript
relocation: {
  mode: 'None' | 'A_local' | 'B_local' | 'Midpoint',
  coordinates: { lat, lon },
  timezone: 'America/New_York',
  house_system: 'Placidus',
  angles_relocated: true/false,
  baseline_remains_natal: true,
  disclosure: "Houses/angles relocated to Panama City, FL; planetary longitudes unchanged"
}
```

### 4. Provenance & ENGINE INSTRUCTIONS

**Current State**: Partial provenance exists

**Required** (per [IMPLEMENTATION_SPEC_MIRROR_REPORTS.md](IMPLEMENTATION_SPEC_MIRROR_REPORTS.md)):
```javascript
provenance: {
  // ✅ Already have
  math_brain_version: "0.2.1",
  build_ts: "2025-10-01T14:23:00Z",
  engine_versions: { seismograph: 'v1.0', balance: 'v1.1', sfd: 'v1.2' },

  // ❌ Missing
  provenance_hash: "SHA256 of inputs",
  relocation_mode: "A_local",
  orbs_profile: "wm-spec-2025-09",
  house_system: "Placidus",
  house_system_name: "Placidus",
  solar_mode: false,
  angle_drift_alert: false
}
```

---

## Summary: Hierarchy is CORRECT ✅

### Data Structure: 100% Aligned
- Blueprint → Weather → Tables hierarchy matches spec
- Bidirectional overlays preserve asymmetry
- Solo vs Relational properly differentiated

### What's Missing:
1. **Raven Calder narrative generation** (4 paragraphs)
2. **Blueprint mode extraction** (Primary/Secondary/Shadow)
3. **Relocation computation** (house/angle recalculation)
4. **Enhanced provenance** (orbs, modes, hashes)

### Next Priority:
**Option A**: Build Raven Calder integration (transform data → prose)
**Option B**: Build relocation computation (foundation for accuracy)
**Option C**: Extract blueprint modes (needed for Raven input)

All three are needed, but **Option C** (blueprint modes) is the smallest and enables Option A (Raven), so recommend: **C → A → B**
