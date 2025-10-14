# Math Brain v2 - Usage Guide

## For End Users

### How to Get the New Report Format

When generating a report in the Woven Map app, you can now choose to use the new Math Brain v2 format.

**Option 1: Add a checkbox in the UI** (Coming Soon)
```
☐ Use Math Brain v2 (hallucination-proof format)
```

**Option 2: Use the API directly**

Add `"use_v2": true` to your JSON request:

```json
{
  "use_v2": true,
  "personA": {
    "name": "Dan",
    "year": 1973,
    "month": 7,
    "day": 24,
    ...
  },
  "personB": {
    "name": "Stephie",
    ...
  },
  "window": {
    "start": "2025-10-11",
    "end": "2025-10-17",
    "step": "daily"
  }
}
```

### What You'll Get

When v2 is enabled, you'll receive:

1. **Woven Reading (Markdown)** - A clean, structured file ready for the Poetic Brain
   - Filename: `Woven_Reading_Dan_Stephie_2025-10-11_to_2025-10-17.md`
   - Contains: Symbolic Weather, Mirror Data, and Poetic Hooks for each day
   - Format: Ready to copy-paste into ChatGPT or Claude

2. **Unified Output (JSON)** - The complete data file
   - Filename: `unified_output_Dan_Stephie_2025-10-14.json`
   - Contains: All computed metrics in structured format
   - Format: Machine-readable for advanced analysis

---

## For Developers

### API Endpoint

```
POST https://your-domain.com/api/astrology-mathbrain
```

### Request Headers

```http
Content-Type: application/json
X-Math-Brain-Version: v2
```

**OR** include `"use_v2": true` in the JSON body (header not required if using JSON flag).

### Request Body Example

```json
{
  "use_v2": true,
  "personA": {
    "name": "Dan",
    "year": 1973,
    "month": 7,
    "day": 24,
    "hour": 14,
    "minute": 30,
    "city": "Bryn Mawr",
    "state": "PA",
    "nation": "US",
    "latitude": 40.0167,
    "longitude": -75.3,
    "timezone": "America/New_York"
  },
  "personB": {
    "name": "Stephie",
    "year": 1968,
    "month": 4,
    "day": 16,
    "hour": 18,
    "minute": 37,
    "city": "Albany",
    "state": "GA",
    "nation": "US",
    "latitude": 31.583333,
    "longitude": -84.15,
    "timezone": "America/New_York"
  },
  "window": {
    "start": "2025-10-11",
    "end": "2025-10-17",
    "step": "daily"
  },
  "context": {
    "mode": "synastry_transits"
  }
}
```

### Response Format

```json
{
  "success": true,
  "version": "v2",
  "unified_output": {
    "run_metadata": {
      "generated_at": "2025-10-14T02:00:00Z",
      "math_brain_version": "1.0.0",
      "mode": "SYNASTRY_TRANSITS",
      "person_a": "Dan",
      "person_b": "Stephie",
      "date_range": ["2025-10-11", "2025-10-17"]
    },
    "daily_entries": [
      {
        "date": "2025-10-11",
        "symbolic_weather": {
          "magnitude": 4.2,
          "directional_bias": -3.5,
          "labels": {
            "magnitude": "Peak",
            "directional_bias": "Contractive"
          }
        },
        "mirror_data": {
          "relational_tension": 4.8,
          "relational_flow": 1.2,
          "dominant_theme": "Tension (Saturn)",
          "person_a_contribution": { "magnitude": 2.8, "bias": -3.0 },
          "person_b_contribution": { "magnitude": 2.2, "bias": -2.0 }
        },
        "poetic_hooks": {
          "peak_aspect_of_the_day": "Transit Saturn square Natal Sun (Person A)",
          "key_themes": ["Structure", "Limitation", "Reality Check"],
          "significant_events": [],
          "top_contributing_aspects": [
            {
              "aspect": "Transit Saturn square Natal Sun (Person A)",
              "type": "Tension",
              "strength": 0.95
            }
          ]
        }
      }
    ]
  },
  "markdown_reading": "## Woven Reading: Dan & Stephie\n**Date:** 2025-10-11\n...",
  "download_formats": {
    "mirror_report": {
      "format": "markdown",
      "content": "...",
      "filename": "Woven_Reading_Dan_Stephie_2025-10-11_to_2025-10-17.md"
    },
    "symbolic_weather": {
      "format": "json",
      "content": { ... },
      "filename": "unified_output_Dan_Stephie_2025-10-14.json"
    }
  }
}
```

### Integration Example (JavaScript)

```javascript
const response = await fetch('/api/astrology-mathbrain', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Math-Brain-Version': 'v2'
  },
  body: JSON.stringify({
    personA: { ... },
    personB: { ... },
    window: { start: '2025-10-11', end: '2025-10-17', step: 'daily' }
  })
});

const data = await response.json();

if (data.success && data.version === 'v2') {
  // Download the Markdown reading
  const blob = new Blob([data.markdown_reading], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = data.download_formats.mirror_report.filename;
  a.click();
  
  // Or send to Poetic Brain for interpretation
  sendToPoeticBrain(data.markdown_reading);
}
```

---

## Differences Between v1 (Legacy) and v2

| Feature | v1 (Legacy) | v2 (New) |
|---------|-------------|----------|
| **File Size** | 3MB+ (Weather Log) | < 100KB (Unified Output) |
| **Format** | Complex nested JSON | Clean structured JSON + Markdown |
| **Hallucination Risk** | High (GPT gets confused) | Zero (explicit data structure) |
| **Poetic Brain Ready** | No (requires parsing) | Yes (includes instructions) |
| **Download Options** | 3 separate files | 2 formats (JSON + Markdown) |
| **FIELD → MAP → VOICE** | Mixed | Strict separation |
| **Provenance** | Partial | Complete metadata block |

---

## Troubleshooting

### "Math Brain v2 error" Response

**Cause**: The v2 system encountered an error during processing.

**Check**:
1. Ensure all required fields are present in the request
2. Verify date range is valid (start < end)
3. Check that person data includes all required fields

**Fallback**: The system will automatically use the legacy Math Brain if v2 fails.

### Missing Data in Response

**Cause**: Currently, v2 uses mock data for aspect calculations.

**Solution**: This is expected until the real data integration is complete (see MATH_BRAIN_V2_CHANGELOG.md, Priority 1).

---

## Support

For issues, questions, or feature requests related to Math Brain v2, please refer to:
- `MATH_BRAIN_V2_CHANGELOG.md` - Complete change log and status
- GitHub Issues - Report bugs or request features
