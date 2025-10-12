# 🐛 Critical Bug: Raven Not Using Full Report JSON Data

**Date:** October 12, 2025  
**Severity:** HIGH - Data loss / Feature incomplete  
**Status:** IDENTIFIED - Requires Fix

---

## 📊 Problem Summary

**Raven Calder receives uploaded JSON reports but only extracts Balance Meter summaries, ignoring natal chart data (Person A/B) and full symbolic weather context.**

---

## 🔍 Bug Details

### What's Being Sent (Client → API)
From `components/ChatClient.tsx` lines 2407-2428:

```typescript
const payload = {
  input: reportContext.content,  // ← FULL JSON (Person A, Person B, weather, aspects, etc.)
  sessionId: ravenSessionId ?? undefined,
  options: {
    reportType: reportContext.type,
    reportId: reportContext.id,
    reportName: reportContext.name,
    reportSummary: reportContext.summary,
    reportContexts: contextsToSend.map((rc) => ({
      id: rc.id,
      type: rc.type,
      name: rc.name,
      summary: rc.summary,
      content: rc.content,  // ← FULL JSON CONTENT for all uploaded reports
      ...
    }))
  }
};
```

**✅ Client sends:**
- Full JSON with `person_a` natal data
- Full JSON with `person_b` natal data (if synastry)
- Complete `symbolic_weather` context
- All `daily_readings` with Balance Meter
- Complete aspect list with orbs, potencies
- House data, transit positions

---

### What's Being Used (API → Raven)
From `app/api/raven/route.ts` lines 63-79:

```typescript
const uploadedSummary = summariseUploadedReportJson(textInput);
if (uploadedSummary) {
  const { draft, prov, climateText, highlight } = uploadedSummary;
  // ... returns only Balance Meter summary
  return NextResponse.json({
    intent: 'report',
    ok: true,
    draft,  // ← Only contains extracted Balance Meter metrics
    prov,
    climate: climateText ?? null,
    sessionId: sid,
    probe,
  });
}
```

**❌ Raven only receives:**
- Magnitude (0-5)
- Directional Bias (−5 to +5)  
- Volatility/Coherence (deprecated)
- Period start/end dates
- Relationship context metadata

---

### What's Missing in `reportSummary.ts`

**The `summariseUploadedReportJson()` function extracts:**
- ✅ Balance Meter axes (magnitude, directional_bias, volatility)
- ✅ Period dates (start/end)
- ✅ Cadence analysis (daily/weekly)
- ✅ Relationship context (scope, intimacy tier, contact state)
- ✅ Field triggers/hooks (top 2-3 aspects)

**NOT extracted:**
- ❌ `person_a.details` (name, birth date, birth time, birth place, timezone)
- ❌ `person_a.natal_chart` (Sun, Moon, Rising, planetary placements)
- ❌ `person_b.details` + `person_b.natal_chart` (for synastry reports)
- ❌ `symbolic_weather_context.daily_readings` (full aspect list per day)
- ❌ `aspects[]` array (orb precision, aspect type, potency weights)
- ❌ `transit_houses[]` (which house each transit lands in)
- ❌ `balance_meter.drivers[]` (which specific aspects drive each day's magnitude)

---

## 🚨 Impact

### Current Behavior
When user uploads a Math Brain report:
1. ✅ Raven acknowledges: *"Magnitude 3.8 · Directional Bias −2.1"*
2. ❌ Raven **cannot** answer: *"What's my Sun-Moon dynamic?"*
3. ❌ Raven **cannot** answer: *"How does my Venus aspect their Mars?"*
4. ❌ Raven **cannot** answer: *"Which day has the Mars-Pluto square?"*
5. ❌ Raven **cannot** provide detailed poetic translations of specific aspects

### Expected Behavior
Raven should have access to:
- **Natal Geometry:** Sun ♌ 15°32', Moon ♋ 23°18', ASC ♐ 8°42', etc.
- **Relational Geometry:** Person A's Venus ♎ 12° opposite Person B's Mars ♈ 10°
- **Transit Details:** Mars ♏ 18° square Pluto ♒ 21° (orb: 0.8°, potency: 8.2)
- **House Contexts:** Transit Saturn entering House 7 (relationships)
- **Aspect Chains:** Moon conjunct Neptune → squares Mercury → trines Jupiter

---

## 📁 JSON Structure Being Ignored

### Example Math Brain Export (Truncated)

```json
{
  "report_kind": "solo_mirror",
  "person_a": {
    "details": {
      "name": "Dan",
      "birth_date": "1982-08-15",
      "birth_time": "14:30:00",
      "birth_place": "New York, NY",
      "timezone": "America/New_York"
    },
    "natal_chart": {
      "sun": { "sign": "Leo", "degree": 15.532, "house": 9 },
      "moon": { "sign": "Cancer", "degree": 23.185, "house": 8 },
      "ascendant": { "sign": "Sagittarius", "degree": 8.421 },
      "mercury": { "sign": "Virgo", "degree": 2.789, "house": 10 },
      // ... all other placements
    }
  },
  "symbolic_weather_context": {
    "daily_readings": [
      {
        "date": "2025-10-12",
        "magnitude": 3.8,
        "directional_bias": -2.1,
        "aspects": [
          {
            "type": "square",
            "planet_1": "Mars",
            "planet_2": "Pluto",
            "orb": 0.82,
            "potency": 8.2,
            "exact_date": "2025-10-12T18:30:00Z",
            "interpretation": "Compressive friction, forced transformation"
          },
          // ... more aspects
        ],
        "drivers": ["Mars □ Pluto", "Saturn △ Ascendant"]
      }
    ],
    "transit_houses": [7, 3, 8, 10, 1, 5, 11, 2, 9, 4]
  },
  "balance_meter": {
    "magnitude_0to5": 3.8,
    "directional_bias": -2.1,
    "period": {
      "start": "2025-10-12",
      "end": "2025-10-18"
    }
  }
}
```

**Currently:** Only `balance_meter` section is extracted  
**Should:** Extract and pass EVERYTHING to Raven's conversational prompt

---

## 🔧 Proposed Fix

### Option 1: Pass Full JSON to LLM Prompt (Recommended)

**File:** `lib/raven/render.ts` (conversational flow around line 513-534)

**Current:**
```typescript
if (conversational) {
  const userMessage = options?.userMessage || '';
  const prompt = `You are Poetic Brain, an empathetic, direct assistant. 
    The user says: "${userMessage}". Reply naturally...`;
  // No mention of reportContexts
}
```

**Proposed:**
```typescript
if (conversational) {
  const userMessage = options?.userMessage || '';
  const reportContexts = options?.reportContexts || [];
  
  // Build context string from all uploaded reports
  let contextSummary = '';
  for (const ctx of reportContexts) {
    if (ctx.content) {
      try {
        const parsed = JSON.parse(ctx.content);
        const personA = parsed.person_a?.details;
        const personB = parsed.person_b?.details;
        const meter = parsed.balance_meter;
        const weather = parsed.symbolic_weather_context;
        
        contextSummary += `\n\n## Report: ${ctx.name}\n`;
        if (personA) {
          contextSummary += `Person A: ${personA.name}, born ${personA.birth_date} at ${personA.birth_time} in ${personA.birth_place}\n`;
        }
        if (personB) {
          contextSummary += `Person B: ${personB.name}, born ${personB.birth_date} at ${personB.birth_time} in ${personB.birth_place}\n`;
        }
        if (meter) {
          contextSummary += `Balance Meter: Magnitude ${meter.magnitude_0to5}, Bias ${meter.directional_bias}\n`;
        }
        if (weather?.daily_readings) {
          contextSummary += `\nDaily Aspect Details:\n`;
          weather.daily_readings.slice(0, 3).forEach((day: any) => {
            contextSummary += `${day.date}: ${day.aspects?.map((a: any) => 
              `${a.planet_1} ${a.type} ${a.planet_2} (orb ${a.orb}°)`
            ).join(', ')}\n`;
          });
        }
      } catch (e) {
        // Not JSON or parsing failed
      }
    }
  }
  
  const prompt = `You are Raven Calder (Poetic Brain), a symbolic pattern reader.

${contextSummary ? 'Available Report Context:' + contextSummary : ''}

The user says: "${userMessage}"

If the user asks about specific placements, aspects, or chart details, reference the report data above. 
Provide poetic symbolic interpretation grounded in the actual geometry.

Reply naturally in plain language, then also provide a short structured mirror in five labeled parts: 
PICTURE, FEELING, CONTAINER, OPTION, NEXT_STEP.`;
}
```

---

### Option 2: Enhance `summariseUploadedReportJson()` (Supplemental)

**File:** `lib/raven/reportSummary.ts`

Add extraction for natal data and aspects:

```typescript
// After line 310 (subject extraction)
const personA = getNested(parsed, ['person_a', 'details']) || {};
const personB = getNested(parsed, ['person_b', 'details']) || {};
const natalChart = getNested(parsed, ['person_a', 'natal_chart']) || {};

// Extract key placements
const sunSign = pickString(parsed, [
  ['person_a', 'natal_chart', 'sun', 'sign'],
  ['natal_chart', 'sun', 'sign']
]);
const moonSign = pickString(parsed, [
  ['person_a', 'natal_chart', 'moon', 'sign'],
  ['natal_chart', 'moon', 'sign']
]);
const ascSign = pickString(parsed, [
  ['person_a', 'natal_chart', 'ascendant', 'sign'],
  ['natal_chart', 'ascendant', 'sign']
]);

// Add to appendix (line 629+)
if (personA?.name) appendix.person_a_name = personA.name;
if (personA?.birth_date) appendix.person_a_birth_date = personA.birth_date;
if (sunSign) appendix.sun_sign = sunSign;
if (moonSign) appendix.moon_sign = moonSign;
if (ascSign) appendix.rising_sign = ascSign;
if (personB?.name) appendix.person_b_name = personB.name;
```

---

## ✅ Testing Checklist

After implementing fix, verify:

- [ ] Upload solo mirror report → Ask "What's my Sun sign?" → Raven answers correctly
- [ ] Upload synastry report → Ask "How does my Venus aspect their Mars?" → Raven answers
- [ ] Upload weekly balance → Ask "Which day has the Mars-Pluto square?" → Raven answers
- [ ] Upload report with transit houses → Ask "What house is Saturn transiting?" → Raven answers
- [ ] Multiple reports loaded → Raven references correct report when asked
- [ ] Poetic translation request → Raven uses actual aspect orbs/potencies from JSON

---

## 📚 Related Files

- ✅ `components/ChatClient.tsx` (lines 2374-2443) - Sends full content
- ❌ `app/api/raven/route.ts` (lines 63-79) - Only uses summary
- ❌ `lib/raven/reportSummary.ts` (lines 267-723) - Only extracts Balance Meter
- ❌ `lib/raven/render.ts` (lines 442-541) - Doesn't use reportContexts
- 📖 `lib/raven/README.md` - Needs update after fix

---

## 🎯 Priority

**CRITICAL** - This blocks Raven's core value proposition:
- Users upload detailed reports expecting deep interpretation
- Raven can only provide surface-level Balance Meter summaries
- Google Login required to generate reports, but Raven can't use the data
- Poetic translations limited to generic patterns, not actual chart geometry

---

## 💬 User Quote

> "Now check just how Raven Calder pulls in the last generated report (which requires Google Login by the way) and make sure he knows the shape of the json, and that he's getting both the mirror (natal payloads for both Person A and B and the symbolic weather) behind it all"

**Status:** ❌ Raven does NOT currently have access to natal payloads or full symbolic weather
