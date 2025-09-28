
# WovenWebApp API Reference

## Key Lessons Learned (2025-09)

- **Provenance:** Every API response and report must include provenance (house system, orbs profile, relocation mode, timezone DB, engine versions, math_brain_version) for auditability and reproducibility.
- **Relocation:** Relocation (A_local/B_local) is essential for Balance Meter accuracy but brittle—depends on precise location and upstream resolver behavior. Robust fallbacks and “Angle Drift Cone” are implemented for ambiguous cases.
- **API payload quirks:** Upstream transit endpoints are finicky. City-only vs coords-only vs city+state behave differently. Adapter logic and explicit geocoding modes (GeoNames, city+state) are supported. Developer UX is clear about these requirements.
- **Orbs and filters:** Strict orb caps and documented Moon/outer rules (+Moon +1°, outer→personal −1°) are enforced before weighting. Orbs profile is always explicit in provenance.
- **Graceful fallback:** If the provider returns no aspects, the report template renders fully with explicit “no aspects received” placeholders and simulated examples flagged as such. Partial days are handled, and Angle Drift Alerts are shown for house ambiguity.
- **User simplicity + developer detail:** UI remains minimal for non-programmers (date + birth city). The backend/adapter handles complexity and documents all required options for power users. Clear UX copy guides users on location accuracy and fallback options.
- **Falsifiability and feedback:** SST, Drift Index, Session Scores, and micro-probes are enforced. Misses are calibration data, not user error. Every report includes a provenance block and raw geometry appendix for transparency.

---

## Overview

This document provides focused API reference information for the **Astrologer API** endpoints that WovenWebApp actually uses. For complete OpenAPI specification, refer to the official [Astrologer API documentation](https://rapidapi.com/kerykeion/api/astrologer/).

---

## 🔗 **API Base Information**

- **Base URL**: `https://astrologer.p.rapidapi.com`
- **API Version**: 4.0.0
- **Provider**: Kerykeion Astrology
- **License**: AGPL-3.0

### Authentication

All requests require these headers:
```http
x-rapidapi-key: <YOUR_RAPIDAPI_KEY>
x-rapidapi-host: astrologer.p.rapidapi.com
Content-Type: application/json
```

---

## 📍 **Endpoints Used by WovenWebApp**

### 1. Birth Chart Calculation
```http
POST /api/v4/birth-chart
```
**Purpose**: Get natal chart data including planetary positions, angles, houses, and aspects.

**Used by**: `computeNatal()` function

**Request Model**: `BirthChartRequestModel`

**Response**: Complete birth chart with aspects

---

### 2. Natal Aspects Data
```http
POST /api/v4/natal-aspects-data
```
**Purpose**: Get only natal aspects data without the full chart.

**Used by**: `computeNatal()` function (alternative endpoint)

**Request Model**: `NatalAspectsRequestModel`

**Response**: Natal aspects only

---

### 3. Synastry Chart
```http
POST /api/v4/synastry-chart
```
**Purpose**: Calculate relationship aspects between two subjects.

**Used by**: Synastry calculations

**Request Model**: `SynastryChartRequestModel`

**Response**: Synastry data with aspects between subjects

---

### 4. Transit Chart
```http
POST /api/v4/transit-chart
```
**Purpose**: Calculate transits to a natal chart.

**Used by**: `getTransits()` function

**Request Model**: `TransitChartRequestModel`

**Response**: Transit data with aspects

---

### 5. Transit Aspects Data
```http
POST /api/v4/transit-aspects-data
```
**Purpose**: Get transit aspects without the full chart visualization.

**Used by**: `getTransits()` function (primary endpoint)

**Request Model**: `TransitChartRequestModel`

**Response**: Transit aspects only

---


### 6. Composite Chart
```http
POST /api/v4/composite-chart
```
**Purpose**: Calculate the full composite chart (not just aspects) between two subjects.

**Used by**: `computeComposite()` function

**Request Model**: CompositeChartRequestModel

**Parameter Naming (Standardized):**
- Both synastry and composite endpoints use `first_subject` and `second_subject` for input payloads.

**Response**: Composite chart data (full chart, including aspects)

---

## 🗂️ **Key Data Models**

### Subject Model
Standard structure for birth data in requests:

```javascript
{
  "name": "string",
  "year": 1990,
  "month": 6,
  "day": 15,
  "hour": 14,
  "minute": 30,
  "city": "New York",
  "nation": "US",
  "lng": -74.0060,
  "lat": 40.7128,
  "tz_str": "America/New_York",
  "zodiac_type": "Tropic",
  "houses_system_identifier": "P"  // Placidus
}
```

### Active Points (Planets/Bodies)
Default active points used by WovenWebApp:
```javascript
[
  "Sun", "Moon", "Mercury", "Venus", "Mars", 
  "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", 
  "Mean_Node", "Chiron", "Ascendant", "Medium_Coeli", 
  "Mean_Lilith", "Mean_South_Node"
]
```

### Active Aspects
Supported aspect types with default orbs:
```javascript
[
  { "name": "conjunction", "orb": 8 },
  { "name": "opposition", "orb": 8 },
  { "name": "square", "orb": 7 },
  { "name": "trine", "orb": 7 },
  { "name": "sextile", "orb": 5 }
]
```

### Aspect Response Model
Structure of returned aspect data:
```javascript
{
  "p1_name": "Sun",
  "p1_abs_pos": 45.12,
  "p2_name": "Moon", 
  "p2_abs_pos": 135.67,
  "aspect": "square",
  "orbit": 3.12,
  "aspect_degrees": 90,
  "diff": 90.55
}
```

---

## ⚡ **WovenWebApp Implementation Patterns**

### API Call Pattern
```javascript
async function callAstrologerAPI(endpoint, payload, description) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'x-rapidapi-key': process.env.RAPIDAPI_KEY,
      'x-rapidapi-host': 'astrologer.p.rapidapi.com',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`${description} failed: ${response.status}`);
  }
  
  return await response.json();
}
```

### Error Handling
```javascript
// Rate limiting
if (response.status === 429) {
  throw new Error('Rate limit exceeded. Please try again later.');
}

// API errors
if (response.status >= 500) {
  throw new Error('Server error. Please try again later.');
}

// Validation errors
if (response.status === 422) {
  const errorData = await response.json();
  throw new Error(`Validation error: ${errorData.detail}`);
}
```

### Transit Request Example
```javascript
const transitPayload = {
  first_subject: natalSubject,  // Birth data
  transit_subject: {
    year: 2025,
    month: 9,
    day: 7,
    hour: 12,
    minute: 0,
    city: "Greenwich",
    nation: "GB"
  },
  active_points: [...defaultPlanets],
  active_aspects: [...defaultAspects]
};
```

---

## 🔧 **Configuration in WovenWebApp**

### API Endpoints Mapping
From `netlify/functions/astrology-mathbrain.js`:
```javascript
const API_ENDPOINTS = {
  BIRTH_CHART:        `${API_BASE_URL}/api/v4/birth-chart`,
  NATAL_ASPECTS_DATA: `${API_BASE_URL}/api/v4/natal-aspects-data`,
  SYNASTRY_CHART:     `${API_BASE_URL}/api/v4/synastry-chart`,
  TRANSIT_CHART:      `${API_BASE_URL}/api/v4/transit-chart`,
  TRANSIT_ASPECTS:    `${API_BASE_URL}/api/v4/transit-aspects-data`,
  COMPOSITE_ASPECTS:  `${API_BASE_URL}/api/v4/composite-aspects-data`
};
```

### Default Configuration
```javascript
const defaultActivePoints = [
  "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn",
  "Uranus", "Neptune", "Pluto", "Mean_Node", "Chiron", 
  "Ascendant", "Medium_Coeli", "Mean_Lilith", "Mean_South_Node"
];

const defaultActiveAspects = [
  { name: "conjunction", orb: 8 },
  { name: "opposition", orb: 8 },
  { name: "square", orb: 7 },
  { name: "trine", orb: 7 },
  { name: "sextile", orb: 5 }
];
```

---

## 📊 **Usage Statistics & Limits**

### Rate Limiting
- **Default**: 60 calls/minute (configurable via `API_RATE_LIMIT`)
- **Burst protection**: Prevents quota exhaustion
- **Automatic retries**: With exponential backoff for rate limits

### Performance Optimization
- **Batched processing**: 5 concurrent API calls (configurable)
- **Parallel requests**: For multi-date transit calculations
- **Response caching**: In-memory for session duration

### Error Response Codes
| Code | Meaning | WovenWebApp Handling |
|------|---------|---------------------|
| 200 | Success | Process data normally |
| 422 | Validation Error | Show field-specific errors |
| 429 | Rate Limited | Retry with backoff |
| 500+ | Server Error | Show generic error, retry |

---

## 🚀 **Production Considerations**

### API Key Management
- Store in environment variables
- Rotate keys every ~90 days
- Monitor usage via RapidAPI dashboard
- Use separate dev/prod keys

### Monitoring
- Track API response times
- Monitor rate limit status
- Log failed requests for debugging
- Use health check endpoint

### Debugging
- Enable debug logging: `LOG_LEVEL=debug`
- Full payload logging for troubleshooting
- Response validation and error details
- Performance metrics tracking

---

## 📚 **Related Documentation**

- **Backend Development Guide**: Complete implementation details
- **API Integration Guide**: Integration patterns and examples
- **MATH_BRAIN_COMPLIANCE**: Technical requirements
- **Official API Docs**: [RapidAPI Astrologer](https://rapidapi.com/kerykeion/api/astrologer/)

---

*This reference covers only the endpoints actively used by WovenWebApp. For complete API documentation including unused endpoints like relationship scoring, solar returns, etc., refer to the official API documentation.*
