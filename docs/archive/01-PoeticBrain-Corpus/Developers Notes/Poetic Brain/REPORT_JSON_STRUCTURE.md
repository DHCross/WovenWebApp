# Math Brain Report JSON Structure Reference

> [!CAUTION]
> **DEPRECATED — Pre-Shipyard / File-Upload Era**
> This document uses "Math Brain" terminology and old code paths.
> The current Shipyard architecture uses "Chart Engine" and conversational intake.
> See: `/Shipyard/vessel/docs/CHART_ENGINE_API.md` for current documentation.

**Purpose:** Guide for developers implementing Raven's report parsing  
**Last Updated:** October 12, 2025  
**Status:** ⚠️ DEPRECATED — See Shipyard docs for current API structure

## 📁 Complete JSON Structure

Math Brain exports contain rich geometric and symbolic data. This document maps the complete structure so Raven can access ALL information, not just Balance Meter summaries.

---

## 🔑 Top-Level Fields

```json
{
  "report_kind": "solo_mirror" | "relational_mirror" | "balance_meter",
  "contract": "clear-mirror/1.3",
  "mode": "natal-only" | "balance" | "relational-balance" | "relational-mirror",
  "person_a": { /* Person A details + natal chart */ },
  "person_b": { /* Person B details + natal chart (synastry only) */ },
  "symbolic_weather_context": { /* Daily readings + aspects */ },
  "balance_meter": { /* Magnitude, Directional Bias, period */ },
  "provenance": { /* Generation metadata */ },
  "export_info": { /* Timestamp, version */ }
}
```

---

## 👤 Person A/B Structure (Natal Data)

**Critical for:** "What's my Sun sign?", "Where's my Moon?", "What's my Rising?"

```json
"person_a": {
  "details": {
    "name": "Dan Cross",
    "birth_date": "1982-08-15",
    "birth_time": "14:30:00",
    "birth_place": "New York, NY, USA",
    "timezone": "America/New_York",
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "natal_chart": {
    "sun": {
      "sign": "Leo",
      "degree": 22.532,
      "house": 9,
      "retrograde": false
    },
    "moon": {
      "sign": "Cancer",
      "degree": 18.185,
      "house": 8,
      "retrograde": false
    },
    "ascendant": {
      "sign": "Sagittarius",
      "degree": 8.421
    },
    "mercury": { "sign": "Virgo", "degree": 2.789, "house": 10, "retrograde": false },
    "venus": { "sign": "Leo", "degree": 28.342, "house": 9, "retrograde": false },
    "mars": { "sign": "Scorpio", "degree": 14.925, "house": 12, "retrograde": false },
    "jupiter": { "sign": "Scorpio", "degree": 5.123, "house": 11, "retrograde": false },
    "saturn": { "sign": "Libra", "degree": 19.678, "house": 10, "retrograde": false },
    "uranus": { "sign": "Sagittarius", "degree": 3.456, "house": 12, "retrograde": true },
    "neptune": { "sign": "Sagittarius", "degree": 25.789, "house": 1, "retrograde": true },
    "pluto": { "sign": "Libra", "degree": 25.012, "house": 10, "retrograde": false },
    "north_node": { "sign": "Cancer", "degree": 15.234, "house": 8 },
    "south_node": { "sign": "Capricorn", "degree": 15.234, "house": 2 },
    "chiron": { "sign": "Taurus", "degree": 27.654, "house": 5, "retrograde": false },
    "midheaven": { "sign": "Virgo", "degree": 28.912 }
  }
}
```

**Key Paths for Extraction:**
- `person_a.details.name` → Subject name
- `person_a.natal_chart.sun.sign` → Sun sign
- `person_a.natal_chart.moon.sign` → Moon sign
- `person_a.natal_chart.ascendant.sign` → Rising sign
- `person_a.natal_chart.{planet}.house` → House placement
- `person_a.natal_chart.{planet}.retrograde` → Retrograde status

---

## 🌤️ Symbolic Weather Context (Daily Readings)

**Critical for:** "Which day has Mars square Pluto?", "What aspects are exact today?"

```json
"symbolic_weather_context": {
  "transit_context": {
    "period": {
      "start": "2025-10-12",
      "end": "2025-10-18",
      "step": "1 day"
    }
  },
  "daily_readings": [
    {
      "date": "2025-10-12",
      "magnitude": 3.8,
      "directional_bias": -2.1,
      "coherence": 2.3,
      "magnitude_label": "Surge",
      "drivers": ["Mars □ Pluto", "Saturn △ ASC"],
      "overflow_detail": {
        "magnitude_delta": 1.2,
        "directional_delta": -0.4,
        "drivers": [
          "Mars(Person A) ▻ Pluto(Person B) Square",
          "Sun ▻ Moon Trine"
        ],
        "note": "Raw readings exceeded the ±5 normalized scale; values above are clamped for display."
      },
      "aspects": [
        {
          "type": "square",
          "symbol": "□",
          "planet_1": "Mars",
          "planet_2": "Pluto",
          "planet_1_position": 254.82,
          "planet_2_position": 345.21,
          "orb": 0.82,
          "orb_max": 8.0,
          "potency": 8.2,
          "polarity": "contractive",
          "exact_date": "2025-10-12T18:30:00Z",
          "house_1": 3,
          "house_2": 8,
          "interpretation": "Compressive friction, forced transformation, power struggles"
        },
        {
          "type": "trine",
          "symbol": "△",
          "planet_1": "Saturn",
          "planet_2": "Ascendant",
          "orb": 1.2,
          "potency": 6.5,
          "polarity": "supportive",
          "interpretation": "Grounding structure, embodied discipline"
        }
      ]
    },
    {
      "date": "2025-10-13",
      "magnitude": 2.1,
      "directional_bias": 0.8,
      // ... more daily data
    }
  ],
  "transit_houses": [7, 3, 8, 10, 1, 5, 11, 2, 9, 4, 12, 6],
  "house_cusps": [8.421, 38.234, 68.912, 98.456, 128.789, 158.123, 188.421, 218.234, 248.912, 278.456, 308.789, 338.123]
}
```

**Key Paths for Extraction:**
- `symbolic_weather_context.daily_readings[].date` → Date key
- `symbolic_weather_context.daily_readings[].aspects[]` → All aspects for that day
- `symbolic_weather_context.daily_readings[].aspects[].type` → square, trine, opposition, etc.
- `symbolic_weather_context.daily_readings[].aspects[].orb` → Orb precision (0.82° = very tight)
- `symbolic_weather_context.daily_readings[].aspects[].potency` → Weight/strength (0-10)
- `symbolic_weather_context.daily_readings[].aspects[].exact_date` → When aspect becomes exact
- `symbolic_weather_context.transit_houses[]` → Which house each planet transits
- `symbolic_weather_context.house_cusps[]` → House cusp degrees (0°–360°)
- `symbolic_weather_context.daily_readings[].overflow_detail.magnitude_delta` → Amount trimmed from raw magnitude to fit the export scale
- `symbolic_weather_context.daily_readings[].overflow_detail.directional_delta` → Signed trim applied to directional bias
- `symbolic_weather_context.daily_readings[].overflow_detail.drivers[]` → Ranked aspect strings that explain the overflow spike

### Overflow Detail Reference

- Only present when raw magnitude or directional bias exceeds the ±5 normalized range
- Deltas are rounded to four decimals and omit zero values
- Drivers are capped at four strings and duplicates are collapsed
- Placeholder aspects with missing names/labels are ignored so exports stay human-readable
- Invalid numeric inputs (`NaN`, `Infinity`) are discarded before the overflow block is emitted

---

## ⚖️ Balance Meter (Already Extracted)

**Critical for:** "What's the magnitude this week?", "Am I in expansion or contraction?"

```json
"balance_meter": {
  "magnitude_0to5": 3.8,
  "directional_bias": -2.1,
  "coherence_0to5": 2.3,
  "magnitude_label": "Surge",
  "valence_label": "Contractive",
  "period": {
    "start": "2025-10-12",
    "end": "2025-10-18"
  },
  "channel_summary_canonical": {
    "axes": {
      "magnitude": { "value": 3.8, "bounded": true },
      "directional_bias": { "value": -2.1, "bounded": false },
      "volatility": { "value": 2.3, "bounded": false }
    },
    "labels": {
      "magnitude": "Surge",
      "directional_bias": "Contractive",
      "volatility": "Mixed Paths"
    }
  },
  "hook_stack": {
    "hooks": [
      {
        "label": "Mars □ Pluto",
        "orb": 0.82,
        "exact": false,
        "potency": 8.2
      },
      {
        "label": "Saturn △ ASC",
        "orb": 1.2,
        "exact": false,
        "potency": 6.5
      }
    ]
  }
}
```

**Note:** This section is ALREADY extracted by `reportSummary.ts`

---

## 🔗 Synastry / Relational Reports

**Critical for:** "How does my Venus aspect their Mars?", "What's our composite energy?"

```json
"person_b": {
  "details": {
    "name": "Stephie",
    "birth_date": "1985-03-22",
    "birth_time": "09:15:00",
    "birth_place": "San Francisco, CA, USA",
    "timezone": "America/Los_Angeles"
  },
  "natal_chart": {
    "sun": { "sign": "Aries", "degree": 1.234 },
    "moon": { "sign": "Pisces", "degree": 28.456 },
    // ... full natal chart for Person B
  }
},
"relationship_context": {
  "scope": "PARTNER",
  "contact_state": "ACTIVE_DAILY",
  "role": "Primary romantic partner",
  "intimacy_tier": "P5A",
  "notes": "Long-term committed relationship, shared home"
},
"synastry_aspects": [
  {
    "person_a_planet": "Venus",
    "person_b_planet": "Mars",
    "type": "opposition",
    "orb": 2.3,
    "interpretation": "Magnetic attraction with creative tension"
  }
]
```

**Key Paths for Extraction:**
- `person_b.details.name` → Partner name
- `person_b.natal_chart.{planet}` → Partner's placements
- `synastry_aspects[]` → Cross-chart aspects
- `relationship_context.scope` → PARTNER, FRIEND, FAMILY, etc.
- `relationship_context.intimacy_tier` → P1-P5 classification

---

## 📊 Provenance & Metadata

**Critical for:** Debugging, audit trails, version tracking

```json
"provenance": {
  "source": "Math Brain v3.1",
  "generated_at": "2025-10-12T18:45:32Z",
  "user_id": "user_abc123",
  "report_id": "report_xyz789",
  "api_version": "v3",
  "house_system": "Placidus",
  "zodiac_type": "Tropical",
  "relocation_mode": false
},
"export_info": {
  "format_version": "1.3",
  "exported_at": "2025-10-12T18:46:15Z",
  "file_name": "Mirror_Directive_dan-stephie_2025-10-12.json"
}
```

---

## 🎯 Usage Guide for Raven

### Current State (❌ BROKEN)
```typescript
// app/api/raven/route.ts
const uploadedSummary = summariseUploadedReportJson(textInput);
// Returns only: { magnitude, directional_bias, period, hooks }
```

### Required Fix (✅ SOLUTION)
```typescript
// lib/raven/render.ts (conversational flow)
const reportContexts = options?.reportContexts || [];

for (const ctx of reportContexts) {
  const parsed = JSON.parse(ctx.content);
  
  // Extract natal data
  const personA = parsed.person_a?.natal_chart;
  if (personA) {
    contextSummary += `Sun: ${personA.sun.sign} ${personA.sun.degree.toFixed(1)}°\n`;
    contextSummary += `Moon: ${personA.moon.sign} ${personA.moon.degree.toFixed(1)}°\n`;
    contextSummary += `Rising: ${personA.ascendant.sign} ${personA.ascendant.degree.toFixed(1)}°\n`;
  }
  
  // Extract daily aspects
  const dailyReadings = parsed.symbolic_weather_context?.daily_readings;
  if (dailyReadings) {
    dailyReadings.forEach(day => {
      contextSummary += `\n${day.date}:\n`;
      day.aspects.forEach(aspect => {
        contextSummary += `  ${aspect.planet_1} ${aspect.symbol} ${aspect.planet_2} (orb ${aspect.orb}°, potency ${aspect.potency})\n`;
      });
    });
  }
}

const prompt = `You are Raven Calder.
Available Report Context:
${contextSummary}

User says: "${userMessage}"

Answer using the actual chart data above. Reference specific placements, aspects, and orbs.`;
```

---

## 🧪 Test Cases

After implementing fix, Raven should answer:

### ✅ Natal Questions
- "What's my Sun sign?" → "Leo at 22°32'"
- "Where's my Moon?" → "Cancer in the 8th house"
- "What's my Rising?" → "Sagittarius at 8°25'"

### ✅ Aspect Questions
- "Which day has Mars square Pluto?" → "October 12, 2025, orb 0.82°"
- "What's the exact time of that aspect?" → "October 12, 2025 at 6:30 PM UTC"
- "What's the potency of Saturn trine Ascendant?" → "6.5 on a scale of 0-10"

### ✅ Synastry Questions (Relational Reports)
- "How does my Venus aspect their Mars?" → "Opposition with 2.3° orb - magnetic attraction"
- "What's Stephie's Moon sign?" → "Pisces at 28°27'"

### ✅ Transit Questions
- "What house is Saturn transiting?" → "House 10 (Midheaven, career, public life)"
- "Which planets are retrograde?" → "Uranus, Neptune"

---

## 📋 Implementation Checklist

- [ ] Update `lib/raven/render.ts` conversational prompt to include full `reportContexts`
- [ ] Parse `person_a.natal_chart` and include in LLM context
- [ ] Parse `person_b.natal_chart` for synastry reports
- [ ] Parse `symbolic_weather_context.daily_readings.aspects[]` for aspect details
- [ ] Include transit houses and exact times
- [ ] Test with solo mirror report upload
- [ ] Test with synastry report upload
- [ ] Test with weekly balance report
- [ ] Verify orb precision is preserved (0.82° not rounded to 1°)
- [ ] Verify potency weights are available
- [ ] Update API documentation with expected JSON structure
- [ ] Add integration tests for report parsing

---

## 🔗 Related Documentation

- `BUG_REPORT_RAVEN_JSON_CONTEXT.md` - Detailed bug analysis
- `RAVEN-PERSONA-SPEC.md` - Raven's behavior guidelines
- `RAVEN_OUTPUT_PROTOCOL.md` - Output format specifications
- `API_REFERENCE.md` - Math Brain API structure
- `CHANGELOG.md` - Current bug status

---

**Status:** 🚨 This structure is NOT currently accessible to Raven  
**Required:** Implement fix in `lib/raven/render.ts` conversational flow
