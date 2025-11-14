# **Unified Mirror + Balance Report Structure**

## **Current Separation Analysis**

**Mirror Flow Reports** (`report_family === 'mirror_flow'`):
- `natal_summary` - Core natal chart data
- `polarity_cards` - Structural tension hooks (data only)
- `vector_integrity` - Enhanced drift metrics
- `drivers` - Core/supporting/derived planets
- **Excludes**: balance_meter, time_series, integration_factors

**Balance Meter Reports** (`report_family === 'balance_meter'`):
- `balance_meter` - Magnitude/Valence/Volatility/SFD readings
- `time_series` - Daily transit progression
- `integration_factors` - Health correlation data
- **Excludes**: polarity_cards

## **Proposed Unified Structure**

### **Single "Comprehensive" Report Family**

```javascript
// Replace both mirror_flow and balance_meter with unified structure
if (report_family === 'comprehensive' || report_family === 'unified') {
  // BLUEPRINT LAYER (natal/relational foundation)
  report.blueprint = {
    natal_summary: extractNatalSummary(a),
    drivers: extractDriversSummary(a),
    polarity_cards: buildPolarityCardsHooks(a),
    vector_integrity: vectorIntegrity,
    ...(type === 'relational' && {
      synastry_summary: extractSynastrySummary(result),
      relationship_score: extractRelationshipScore(result)
    })
  };

  // SYMBOLIC WEATHER LAYER (only if transits present)
  if (hasTransits) {
    report.symbolic_weather = {
      balance_meter: buildBalanceMeter(summary, meterChannels, result?.provenance?.engine_versions),
      time_series: timeSeries,
      integration_factors: integration,
      transit_context: extractTransitContext(result),
      field_triggers: extractFieldTriggers(result)
    };
  }

  // COMPREHENSIVE DATA TABLES (for PDF export)
  report.data_tables = {
    natal_positions: buildNatalPositionsTable(a),
    natal_aspects: buildNatalAspectsTable(a),
    ...(hasTransits && {
      transit_aspects: buildTransitAspectsTable(result),
      daily_readings: buildDailyReadingsTable(timeSeries)
    }),
    ...(type === 'relational' && {
      synastry_aspects: buildSynastryAspectsTable(result),
      composite_positions: buildCompositePositionsTable(result)
    })
  };
}
```

### **Data Tables for PDF Export**

#### **1. Natal Positions Table**
```javascript
function buildNatalPositionsTable(personA) {
  const positions = [];
  const chart = personA?.chart?.natal;

  // Planets
  ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].forEach(planet => {
    const data = chart?.data?.[planet.toLowerCase()];
    if (data) {
      positions.push({
        body: planet,
        sign: data.sign,
        degree: `${Math.floor(data.abs_pos)}°${String(Math.floor((data.abs_pos % 1) * 60)).padStart(2, '0')}'`,
        house: data.house || 'N/A',
        quality: data.quality,
        element: data.element,
        retrograde: data.retrograde ? 'R' : ''
      });
    }
  });

  // Angles
  ['Ascendant', 'Midheaven', 'Descendant', 'IC'].forEach(angle => {
    const data = chart?.data?.[angle.toLowerCase()];
    if (data) {
      positions.push({
        body: angle,
        sign: data.sign,
        degree: `${Math.floor(data.abs_pos)}°${String(Math.floor((data.abs_pos % 1) * 60)).padStart(2, '0')}'`,
        house: angle === 'Ascendant' ? '1st Cusp' : angle === 'Midheaven' ? '10th Cusp' : 'N/A',
        quality: data.quality || '',
        element: data.element || '',
        retrograde: ''
      });
    }
  });

  return positions;
}
```

#### **2. Natal Aspects Table**
```javascript
function buildNatalAspectsTable(personA) {
  const aspects = personA?.chart?.natal?.aspects || [];
  return aspects.map(asp => ({
    planet1: asp.p1_name,
    aspect: asp.aspect,
    planet2: asp.p2_name,
    orb: `${asp.orbit?.toFixed(2)}°`,
    applying: asp.phase === 'applying' ? 'A' : 'S',
    strength: asp.orbit < 1 ? 'Exact' : asp.orbit < 3 ? 'Close' : 'Wide'
  })).sort((a, b) => parseFloat(a.orb) - parseFloat(b.orb));
}
```

#### **3. Transit Aspects Table** (when symbolic weather present)
```javascript
function buildTransitAspectsTable(result) {
  const transits = [];
  const transitsByDate = result?.person_a?.chart?.transitsByDate || {};

  Object.entries(transitsByDate).forEach(([date, dayData]) => {
    const aspects = resolveDayAspects(dayData);
    aspects.forEach(asp => {
      transits.push({
        date: date,
        transit_planet: asp.p1_name,
        aspect: asp.aspect,
        natal_planet: asp.p2_name,
        orb: `${asp.orbit?.toFixed(2)}°`,
        applying: asp.phase === 'applying' ? 'A' : 'S',
        intensity: asp.intensity || calculateIntensity(asp)
      });
    });
  });

  return transits.sort((a, b) => new Date(a.date) - new Date(b.date));
}
```

#### **4. Daily Balance Readings Table**
```javascript
function buildDailyReadingsTable(timeSeries) {
  if (!timeSeries?.daily) return [];

  return Object.entries(timeSeries.daily).map(([date, reading]) => ({
    date: date,
    magnitude: reading.magnitude?.toFixed(2) || 'N/A',
    magnitude_label: reading.magnitude_label || '',
    valence: reading.valence?.toFixed(2) || 'N/A',
    valence_label: reading.valence_label || '',
    volatility: reading.volatility?.toFixed(2) || 'N/A',
    sfd_disc: reading.sfd_disc || 'N/A',
    sfd_cont: reading.sfd_cont?.toFixed(2) || 'N/A',
    primary_transit: reading.primary_transit || ''
  })).sort((a, b) => new Date(a.date) - new Date(b.date));
}
```

#### **5. Synastry Aspects Table** (relational reports)
```javascript
function buildSynastryAspectsTable(result) {
  const synastryAspects = result?.synastry?.aspects || [];
  return synastryAspects.map(asp => ({
    person_a_planet: asp.p1_name,
    aspect: asp.aspect,
    person_b_planet: asp.p2_name,
    orb: `${asp.orbit?.toFixed(2)}°`,
    type: getSynastryAspectType(asp.aspect),
    strength: asp.orbit < 1 ? 'Exact' : asp.orbit < 3 ? 'Close' : 'Wide',
    dynamic: getSynastryDynamic(asp)
  })).sort((a, b) => parseFloat(a.orb) - parseFloat(b.orb));
}
```

### **PDF Export Schema**

```javascript
const unifiedPDFSchema = {
  report_type: 'unified_comprehensive',
  sections: {
    executive_summary: {
      blueprint_overview: "Natal foundation summary",
      symbolic_weather_overview: "Transit context (if present)",
      key_themes: ["Theme 1", "Theme 2", "Theme 3"]
    },

    blueprint_layer: {
      natal_positions_table: buildNatalPositionsTable(),
      natal_aspects_table: buildNatalAspectsTable(),
      polarity_cards: buildPolarityCardsHooks(),
      vector_integrity: vectorIntegrity
    },

    symbolic_weather_layer: hasTransits ? {
      balance_readings_table: buildDailyReadingsTable(),
      transit_aspects_table: buildTransitAspectsTable(),
      integration_factors: integration,
      time_series_chart: timeSeries
    } : null,

    relational_layer: type === 'relational' ? {
      synastry_aspects_table: buildSynastryAspectsTable(),
      composite_positions_table: buildCompositePositionsTable(),
      relationship_analysis: extractRelationshipAnalysis()
    } : null,

    appendices: {
      provenance: result.provenance,
      technical_notes: extractTechnicalNotes(),
      glossary: buildGlossary()
    }
  }
};
```

## **Implementation Steps**

1. **Merge Report Families**: Replace `mirror_flow`/`balance_meter` distinction with unified structure
2. **Add Data Table Builders**: Implement comprehensive table generation functions
3. **Update PDF Export**: Enhance PDF generation to handle unified structure with all tables
4. **Raven Integration**: Ensure Raven receives Blueprint → Weather hierarchy
5. **UI Updates**: Update Math Brain UI to reflect single comprehensive report type

This unified approach gives you everything in one report: the narrative foundation Raven needs, the quantitative data for analysis, and comprehensive tables for PDF export.