# **Raven Calder Data Template (Revised for Real API)**

## **Math Brain → Raven Calder Blueprint/Weather Structure**

This template maps your original scaffold to the **actual AstrologerAPI v4 endpoints** and restructures data flow as: **Blueprint First, Weather Second**.

---

## **Personal Report (Blueprint → Weather)**

### **Blueprint (Natal Foundation - Always Present)**
```json
{
  "blueprint": {
    "mode": "personal",
    "provenance": {
      "house_system": "Placidus",
      "orbs_profile": "wm-spec-2025-09",
      "birth_time_confidence": "exact|approximate|unknown"
    },
    "anchors": {
      "primary_mode": "[POST /api/v4/birth-chart → data.sun.quality] [data.sun.element] (Sun in [data.sun.sign])",
      "secondary_mode": "[data.moon.quality] [data.moon.element] (Moon in [data.moon.sign])",
      "shadow_mode": "[data.mercury.quality] [data.mercury.element] (Mercury in [data.mercury.sign])",
      "asc": "[data.ascendant.sign]",
      "mc": "[data.medium_coeli.sign]"
    },
    "core_tensions": [
      {
        "aspect": "[POST /api/v4/birth-chart → aspects[0].p1_name] [aspects[0].aspect] [aspects[0].p2_name]",
        "orb": "[aspects[0].orbit]",
        "keywords": "[Terse tension keywords]"
      },
      {
        "aspect": "[aspects[1].p1_name] [aspects[1].aspect] [aspects[1].p2_name]",
        "orb": "[aspects[1].orbit]",
        "keywords": "[Terse tension keywords]"
      }
    ],
    "dominant_synthesis": "[Combined qualities/elements from Sun/Moon/Mercury]",
    "energetic_balance": "[Terse keywords: fire-air weighted, mutable skew, etc.]"
  }
}
```

### **Symbolic Weather (Only if Transits Present)**
```json
{
  "symbolic_weather": {
    "date": "[Date]",
    "field_triggers": "[Keywords from POST /api/v4/transit-aspects-data → aspects[] hitting natal points]",
    "transit_context": "[Specific transit: aspects[0].p1_name aspects[0].aspect aspects[0].p2_name]",
    "balance": {
      "magnitude": "[1-5 scale - computed from transit intensity]",
      "valence": "[+/- - computed from aspect types/dignities]",
      "volatility": "[1-5 scale - computed from orb tightness/planet speeds]"
    }
  }
}
```

---

## **Relational Report - Synastry (Blueprint → Weather)**

### **Blueprint (Relational Foundation)**
```json
{
  "blueprint": {
    "mode": "relational_synastry",
    "provenance": {
      "house_system": "Placidus",
      "orbs_profile": "wm-spec-2025-09"
    },
    "core_dynamic": "[Combined dominant qualities/elements for Subject A + B]",
    "contrast": "[Terse keywords describing energetic differences]",
    "relational_summary": {
      "supports": [
        {
          "aspect": "[POST /api/v4/synastry-chart → aspects[supportive_index].p1_name] [aspects[supportive_index].aspect] [aspects[supportive_index].p2_name]",
          "orb": "[aspects[supportive_index].orbit]",
          "keywords": "[Terse dynamic keywords]"
        }
      ],
      "frictions": [
        {
          "aspect": "[aspects[challenging_index].p1_name] [aspects[challenging_index].aspect] [aspects[challenging_index].p2_name]",
          "orb": "[aspects[challenging_index].orbit]",
          "keywords": "[Terse dynamic keywords]"
        }
      ],
      "relationship_score": "[POST /api/v4/relationship-score → score]",
      "score_descriptor": "[Terse descriptor based on score range]"
    }
  }
}
```

### **Symbolic Weather (Shared Transits)**
```json
{
  "symbolic_weather": {
    "date": "[Date]",
    "shared_field_triggers": "[Keywords from transit aspects to both charts + synastry points]",
    "transit_context": "[Transiting planet + aspect to synastry point]",
    "balance": {
      "magnitude": "[1-5]",
      "valence": "[+/-]",
      "volatility": "[1-5]"
    }
  }
}
```

---

## **Composite Report (Fused Chart Blueprint → Weather)**

### **Blueprint (Composite Foundation)**
```json
{
  "blueprint": {
    "mode": "relational_composite",
    "provenance": {
      "house_system": "Placidus",
      "orbs_profile": "wm-spec-2025-09"
    },
    "composite_tags": {
      "sun": {
        "sign": "[POST /api/v4/composite-aspects-data → data.composite_subject.sun.sign]",
        "quality": "[data.composite_subject.sun.quality]",
        "element": "[data.composite_subject.sun.element]"
      },
      "moon": {
        "sign": "[data.composite_subject.moon.sign]",
        "quality": "[data.composite_subject.moon.quality]",
        "element": "[data.composite_subject.moon.element]"
      },
      "asc": {"sign": "[data.composite_subject.ascendant.sign]"},
      "mc": {"sign": "[data.composite_subject.medium_coeli.sign]"}
    },
    "composite_aspects": {
      "supports": [
        {
          "aspect": "[aspects[supportive_index].p1_name] [aspects[supportive_index].aspect] [aspects[supportive_index].p2_name]",
          "orb": "[aspects[supportive_index].orbit]",
          "keywords": "[Terse support keywords]"
        }
      ],
      "tensions": [
        {
          "aspect": "[aspects[tension_index].p1_name] [aspects[tension_index].aspect] [aspects[tension_index].p2_name]",
          "orb": "[aspects[tension_index].orbit]",
          "keywords": "[Terse tension keywords]"
        }
      ]
    },
    "climate_baseline": "[Neutral keywords: steady core, mixed pace, mutable emphasis]"
  }
}
```

### **Symbolic Weather (Composite Transits)**
```json
{
  "symbolic_weather": {
    "date": "[Date]",
    "composite_field_triggers": "[Keywords from transits to composite chart]",
    "transit_context": "[Example: Saturn conjunct Composite Moon]",
    "balance": {
      "magnitude": "[1-5]",
      "valence": "[+/-]",
      "volatility": "[1-5]"
    }
  }
}
```

---

## **API Endpoint Mapping Reference**

| **Template Field** | **Real API Call** | **Response Path** |
|-------------------|------------------|------------------|
| **Natal Placements** | `POST /api/v4/birth-chart` | `data.sun.quality/element/sign`, `data.moon.*`, `data.mercury.*` |
| **Natal Aspects** | `POST /api/v4/birth-chart` or `/natal-aspects-data` | `aspects[]` with `p1_name`, `p2_name`, `aspect`, `orbit` |
| **Synastry** | `POST /api/v4/synastry-chart` | `aspects[]` + `data.first_subject`/`second_subject` |
| **Composite** | `POST /api/v4/composite-aspects-data` | `data.composite_subject.*` + `aspects[]` |
| **Transits** | `POST /api/v4/transit-aspects-data` | `aspects[]` → compute balance indices |
| **Relationship Score** | `POST /api/v4/relationship-score` | `score` field |

---

## **Balance Indices Computation**

**Not native to API** - computed by Math Brain from transit data:

```javascript
// From transit aspects data → Balance indices
const magnitude = computeMagnitude(transitAspects); // 1-5 scale
const valence = computeValence(transitAspects);     // +/- based on aspect types
const volatility = computeVolatility(transitAspects); // 1-5 based on orbs/speeds
```

---

## **Data Hierarchy for Raven**

1. **Blueprint** (natal/relational foundation) → Always present
2. **Symbolic Weather** (transits) → Only when date range specified
3. **Vector Integrity** (drift metrics) → Separate operator section
4. **Provenance** → Always include house system, orbs profile, engine versions

This ensures Raven always receives the core natal/relational reading **first**, with transits properly contextualized as supporting "weather" information.