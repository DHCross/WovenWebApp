# WovenWebApp API Master Reference

**Version:** 5.0  
**Last Updated:** November 10, 2025  
**Status:** Comprehensive Reference

---

## 📋 Table of Contents

### Quick Navigation
- [Overview](#overview)
- [Quick Start](#quick-start)
- [API Endpoints](#api-endpoints)
- [Integration Patterns](#integration-patterns)
- [Data Models](#data-models)
- [Provenance & Compliance](#provenance--compliance)
- [Error Handling](#error-handling)
- [Implementation Examples](#implementation-examples)
- [Testing & Validation](#testing--validation)
- [Troubleshooting](#troubleshooting)

### Deep Dive
- [Report Types](#report-types)
- [Relocation & Transit Modes](#relocation--transit-modes)
- [Orb Policy & Aspect Weighting](#orb-policy--aspect-weighting)
- [Math Brain Architecture](#math-brain-architecture)
- [Configuration & Best Practices](#configuration--best-practices)

---

## Overview

### Purpose

This master reference consolidates all API integration knowledge for the WovenWebApp astrological analysis system. It combines:

- **Technical API specifications** (endpoints, models, responses)
- **Integration patterns** (best practices, proven solutions)
- **Operational lessons** (known issues, fixes, workarounds)
- **Implementation examples** (TypeScript/JavaScript patterns)

### Key Principles

**Raven Calder Philosophy:**
- **FIELD → MAP → VOICE:** Raw geometry → structural patterns → narrative synthesis
- **Geometry-First & Falsifiable:** Exact planetary angle math precedes language
- **Map, not mandate:** Symbolic weather supports agency; no deterministic claims

**API Integration Standards:**
- Provenance is mandatory for all reports (auditability, reproducibility)
- Relocation is valuable but fragile (requires robust fallbacks)
- Graceful degradation when data is missing
- Clear separation between Transit Overlay (visual) and FIELD (computational)

### API Provider

- **Base URL:** `https://astrologer.p.rapidapi.com`
- **Provider:** Kerykeion Astrology (powered by Kerykeion/Swiss Ephemeris)
- **API Version:** 4.0.0
- **License:** AGPL-3.0
- **Documentation:** [RapidAPI Astrologer](https://rapidapi.com/kerykeion/api/astrologer/)

---

## Quick Start

### Authentication

All requests require these headers:

```http
x-rapidapi-key: <YOUR_RAPIDAPI_KEY>
x-rapidapi-host: astrologer.p.rapidapi.com
Content-Type: application/json
```

### Environment Setup

```bash
# Required environment variables
RAPIDAPI_KEY=your_rapidapi_key_here

# Optional
GEONAMES_USERNAME=your_geonames_username  # For stable city lookups
CORS_ALLOW_ORIGIN=http://localhost:8888   # For local development
```

### Basic API Call Pattern

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

### Rate Limiting

- **Default:** 60 calls/minute (configurable via `API_RATE_LIMIT`)
- **Burst protection:** Prevents quota exhaustion
- **Automatic retries:** With exponential backoff for rate limits
- **Parallel requests:** 5 concurrent API calls (configurable)

---

## API Endpoints

### Endpoints Used by WovenWebApp

```javascript
const API_BASE_URL = 'https://astrologer.p.rapidapi.com';

const API_ENDPOINTS = {
  BIRTH_CHART:        `${API_BASE_URL}/api/v4/birth-chart`,
  NATAL_ASPECTS_DATA: `${API_BASE_URL}/api/v4/natal-aspects-data`,
  SYNASTRY_CHART:     `${API_BASE_URL}/api/v4/synastry-chart`,
  TRANSIT_CHART:      `${API_BASE_URL}/api/v4/transit-chart`,
  TRANSIT_ASPECTS:    `${API_BASE_URL}/api/v4/transit-aspects-data`,
  COMPOSITE_CHART:    `${API_BASE_URL}/api/v4/composite-chart`
};
```

---

### 1. Birth Chart Calculation

```http
POST /api/v4/birth-chart
```

**Purpose:** Get natal chart data including planetary positions, angles, houses, and aspects.

**Used by:** `computeNatal()` function, `fetchNatalChartComplete()` helper

**Request Model:** `BirthChartRequestModel`

**Response:** Complete birth chart with aspects

**Key Features:**
- Returns full natal geometry
- Includes house cusps
- Contains natal aspects
- Provides chart wheel assets

---

### 2. Natal Aspects Data

```http
POST /api/v4/natal-aspects-data
```

**Purpose:** Get only natal aspects data without the full chart.

**Used by:** Alternative endpoint for aspect-only requests

**Request Model:** `NatalAspectsRequestModel`

**Response:** Natal aspects only (lighter payload)

---

### 3. Synastry Chart

```http
POST /api/v4/synastry-chart
```

**Purpose:** Calculate relationship aspects between two subjects.

**Used by:** Synastry calculations in relational reports

**Request Model:** `SynastryChartRequestModel`

**Parameter Naming:** Uses `first_subject` and `second_subject` for input payloads

**Response:** Synastry data with inter-chart aspects

**Important:** Both Person A and Person B now receive full natal aspects and house cusps (fixed Oct 2025)

---

### 4. Transit Chart

```http
POST /api/v4/transit-chart
```

**Purpose:** Calculate transits to a natal chart with full chart context.

**Used by:** `getTransits()` function when full chart data needed

**Request Model:** `TransitChartRequestModel`

**Response:** Transit data with aspects and chart geometry

---

### 5. Transit Aspects Data

```http
POST /api/v4/transit-aspects-data
```

**Purpose:** Get transit aspects without the full chart visualization (lighter payload).

**Used by:** `getTransits()` function (primary endpoint for transit windows)

**Request Model:** `TransitChartRequestModel`

**Response:** Transit aspects only

**Best Practice:** Use this endpoint for multi-day transit windows to reduce payload size

---

### 6. Composite Chart

```http
POST /api/v4/composite-chart
```

**Purpose:** Calculate the full composite chart (not just aspects) between two subjects.

**Used by:** `computeComposite()` function

**Request Model:** `CompositeChartRequestModel`

**Parameter Naming:** Uses `first_subject` and `second_subject` for input payloads

**Response:** Composite chart data (full chart, including aspects)

**Note:** Midpoint composite between two birth charts

---

### Unified Natal Chart Architecture (v5.0 – Oct 2025)

**Internal Helper:** [`fetchNatalChartComplete()`](../../lib/server/astrology-mathbrain.js#L1996)

**Key Improvements:**
- Centralized natal fetch used for every mode (Mirror, Balance, Synastry, Composite)
- Always returns **chart geometry**, **natal aspects**, **house cusps**, and **chart wheel assets**
- Replaces 14 legacy fetch paths that diverged between Person A and Person B
- Fixes Person B aspects missing in relational reports
- Ensures provenance consistency (same schema for all subjects)

**Usage:** Use this helper instead of calling `BIRTH_CHART` / `NATAL_ASPECTS_DATA` manually in new code.

---

### Math Brain v2.0 (Oct 2025)

**Endpoint:** `POST /api/astrology-mathbrain` (Next.js App Router)

**Purpose:** Generate reports using the new unified Math Brain v2 architecture.

**Request Headers:**
```http
Content-Type: application/json
X-Math-Brain-Version: v2  # Optional: Enable v2 format
```

**Request Body (v2 mode):**
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
    "nation": "US"
  },
  "window": {
    "start": "2025-10-11",
    "end": "2025-10-17",
    "step": "daily"
  }
}
```

**Response Structure (v2 mode):**
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
          "key_themes": ["Structure", "Limitation"],
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
      "content": {},
      "filename": "unified_output_Dan_Stephie_2025-10-14.json"
    }
  }
}
```

**V2 Benefits:**
- **Smaller payloads:** 100KB vs 3MB+ for legacy reports
- **AI-optimized structure:** No nested complexity
- **Self-contained:** Includes provenance and instructions
- **Backward compatible:** Default behavior unchanged

**Symbolic Weather Overflow Detail:**
- `daily_entries[].symbolic_weather.overflow_detail` is populated when raw magnitude or directional bias exceed the ±5 normalized scale
- `magnitude_delta` / `directional_delta` report how far the raw value extended beyond clamped bounds
- `drivers` surfaces up to four tightest aspect strings responsible for the spike
- Sanitization rejects `NaN`/`Infinity` inputs before computing deltas

---

## Data Models

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
  "lng": -74.0060,        // or "longitude"
  "lat": 40.7128,         // or "latitude"
  "tz_str": "America/New_York",
  "zodiac_type": "Tropic",  // or "Sidereal"
  "houses_system_identifier": "P"  // Placidus
}
```

**Field Notes:**
- Both `lng`/`lat` and `longitude`/`latitude` are accepted (normalize per provider)
- `tz_str` must be IANA timezone string (e.g., "America/New_York")
- Use `tz-lookup` to resolve timezone from coordinates
- Use `luxon` to compute DST-aware UTC offset

---

### Active Points (Planets/Bodies)

Default active points used by WovenWebApp:

```javascript
const defaultActivePoints = [
  "Sun", "Moon", "Mercury", "Venus", "Mars",
  "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
  "Mean_Node", "Chiron", "Ascendant", "Medium_Coeli",
  "Mean_Lilith", "Mean_South_Node"
];
```

---

### Active Aspects

Supported aspect types with default orbs:

```javascript
const defaultActiveAspects = [
  { "name": "conjunction", "orb": 8 },
  { "name": "opposition", "orb": 8 },
  { "name": "square", "orb": 7 },
  { "name": "trine", "orb": 7 },
  { "name": "sextile", "orb": 5 }
];
```

**Orb Adjustments:**
- **Moon rule:** +1° when Moon is involved
- **Outer→personal:** -1° when Jupiter/Saturn/Uranus/Neptune/Pluto aspects Sun/Moon/Mercury/Venus/Mars

---

### Aspect Response Model

Structure of returned aspect data:

```javascript
{
  "p1_name": "Sun",
  "p1_abs_pos": 45.12,
  "p2_name": "Moon",
  "p2_abs_pos": 135.67,
  "aspect": "square",
  "orbit": 3.12,           // Can be negative for applying aspects
  "aspect_degrees": 90,
  "diff": 90.55
}
```

**Critical Note:** Upstream returns **negative orbs** for applying aspects. Always use `Math.abs(orb)` when comparing against orb caps.

---

### Normalized Driver Shape

Each returned driver (per-day top aspects) should include compatibility fields:

```javascript
{
  "a": "Venus",
  "b": "Saturn",
  "type": "square",
  "orb": 2.1,
  "applying": true,
  "weight": 1.32,
  "is_transit": true,
  "planet1": "Venus",      // Compatibility alias
  "planet2": "Saturn",     // Compatibility alias
  "name": "Venus square Saturn"  // Human-readable
}
```

**Notes:**
- Drivers are sorted by weight (descending)
- `drivers[]` must always be present (empty array when no aspects)
- Ensures stable UI rendering

---

## Integration Patterns

### Report Types — Core Distinction

#### Mirror Flow (Qualitative)
- **Purpose:** Recognition & self-reflection
- **Inputs:** Natal geometry (transits optional)
- **Location sensitivity:** Low — works without relocation
- **Output:** Poetic FIELD → MAP → VOICE translations, polarity cards, actor/role composites

#### Balance Meter (Quantitative)
- **Purpose:** Pressure diagnostics (symbolic seismograph)
- **Inputs:** Natal + precise transit window + relocation option (recommended when event is place-specific)
- **Location sensitivity:** High — houses/angles relocate and change how transits land
- **Output:** Time-series of Magnitude (0–5), Valence (−5..+5), Volatility (0–5); drivers[] per day; SFD/Balance Channel

**Key Difference:** All reports must include a provenance header and status block describing whether live transits were received or which fallback was used.

---

### Timezone Handling

**Requirement (2025-09-19):**
- All Math Brain API requests must include a valid IANA timezone string (e.g., "America/New_York") for each subject
- Use `tz-lookup` to resolve timezone from latitude/longitude
- Use `luxon` to compute DST-aware UTC offset
- Do NOT rely on city/nation fields for timezone
- GeoNames is optional and only used if explicitly provided by the user

**Implementation:**
- Frontend collects coordinates and (optionally) explicit timezone or GeoNames username
- Backend resolves timezone string from coordinates before sending to API
- SubjectModel schema enforces timezone as a required field

---

### Relocation Rules & Practical Guidance

**What Relocation Does:**
- Reanchors ASC/MC and house cusps to a new geographic point
- Planets keep natal longitudes; houses change where energies manifest

**When to Use:**
- Localized events (storms, disasters, local gatherings)
- When the reading must represent "where life is happening now"
- Long-distance relationship analysis (prefer A_local/B_local rather than midpoint)

**Best Practices & Guards:**
- **Default dyad behavior:** Relational Balance Meter defaults to A_local
- **Midpoint:** Only valid for Relational Balance with both persons present. Other combinations return `invalid_relocation_mode_for_report`
- **Angle Drift Cone:** If time/place are ambiguous, compute multiple plausible house placements; if houses disagree, degrade to planet/sign language and flag angle ambiguity to user
- **UI copy:** Prompt users for city + state (US) or coords; note that GeoNames stabilizes lookups

---

### Geocoding & Formation Rules (Adapter Contract)

**Fundamental Rule:** Pick one formation per run and never mix modes across the same window.

**Formations:**
- **coords-only:** Send `lat`, `lng` (or `lat`/`lon` depending on provider), `tz_str`. Do NOT include city/nation.
- **city-mode:** Send `city`, `state` (optional), `nation` and, when available, `geonames_username`. Do NOT send lat/lon/tz.

**Adapter Behavior (Recommended):**
- Prefer coords-only for transit subjects when coordinates exist
- For natal endpoints:
  - If `GEONAMES_USERNAME` is configured and city/nation present → use city+GeoNames first
  - Else fallback to coords-only
  - Final fallback: city-only without GeoNames (some providers accept it)
- Lock formation for the entire window; record formation in `provenanceByDate`

**Fallback Sequence (Per Day):**
1. `transit-aspects-data` with chosen formation
2. If empty → `transit-chart` with same formation
3. If still empty → flip formation once (coords ↔ city-mode) and try again
4. If still empty → mark day as "no aspects received" and include simulated examples only when explicitly flagged

---

### Transit Overlay vs FIELD Relocation

**Purpose:** Make the difference between "Transit Overlay" (visual-only hybrid) and "FIELD Relocate" (canonical, computational) explicit and discoverable.

#### UI Copy (Paste-Ready)

**Control Label:**
```
Transit Mode
```

**FIELD Option (Primary):**
- **Title:** "FIELD (Relocate natal + transits)"
- **Short summary:** "Anchor both natal and transit geometry to the same observer location/time. Use this for canonical symbolic-weather and Balance Meter outputs — the system will request houses from the upstream API and treat them as canonical."
- **Long tooltip:** "FIELD relocates the entire chart frame to the selected observer location and time, recomputing ASC/MC and house cusps for that location. This unified geometry is the canonical input used for all Woven Map calculations (Seismograph, Balance Meter, symbolic weather). Recommended."

**Overlay Option (Secondary):**
- **Title:** "Transit Overlay (visual only)"
- **Short summary:** "Show transits calculated for the current location overlaid on the natal houses anchored to birth coordinates. Exploratory only — not used for Balance Meter or symbolic-weather math."
- **Long tooltip:** "Transit Overlay superimposes the current sky over the natal chart. Natal houses remain anchored to the birth coordinates while transit angles reflect the new location. This creates a hybrid view useful for exploration, but it is not the canonical geometry for automated field calculations."

**Confirmation Message:**
```
Heads up: Transit Overlay is visual-only. If you want canonical symbolic-weather results, choose FIELD (Relocate natal + transits).
```

**Inline Help:**
```
Exports labeled 'FIELD Chart' use relocated geometry (recommended for calculations). Exports labeled 'Overlay' are hybrid views and are intended for visual exploration only.
```

#### Adapter Contract: include_houses for FIELD

When the UI choice is FIELD (the default for Balance Meter / symbolic-weather), the adapter MUST request houses from the upstream provider.

**Use endpoints:**
- `POST /api/v4/birth-chart` (for natal + relocated natal houses)
- `POST /api/v4/transit-chart` (for transit windows) OR `POST /api/v4/transit-aspects-data` followed by a houses request when needed

**Required request flags:**
- `include_houses: true`
- `include_aspects: true` (for drivers)

**If upstream response omits houses:**
1. Re-attempt a call to an endpoint that returns houses (e.g., birth-chart / transit-chart)
2. If upstream cannot provide houses, compute houses locally (Swiss Ephemeris or equivalent) and stamp `provenance.house_engine` accordingly

---

### Sidereal Variants

**Support:**
- Set `includeSidereal: true` on the request body to fetch both Tropic and Sidereal variants in a single round-trip
- Provide either `default_sidereal_mode` (global ayanamsa) or `sidereal_mode` on each person block
- Values are normalized to RapidAPI's uppercase identifiers: `LAHIRI`, `FAGAN_BRADLEY`, etc.
- The service automatically normalizes lowercase `zodiac_type` strings (`"tropical"` → `"Tropic"`, `"sidereal"` → `"Sidereal"`) before proxying to upstream API

---

## Provenance & Compliance

### Mandatory Provenance Fields

Every report must include at minimum:

```json
{
  "schema": "BM-v5",
  "house_system": "Placidus",
  "house_system_name": "P",
  "orbs_profile": "wm-tight-2025-11-v5",
  "relocation_mode": "None|A_local|B_local|Both_local",
  "relocation_coords": { "lat": 40.0, "lng": -75.0 },
  "house_engine": "astrologer.p.rapidapi.com@v4.0|local-swiss-ephemeris@vX.Y|missing_upstream",
  "has_transits": true,
  "drivers_count": 4,
  "house_shift_summary": [{ "num": 1, "delta_deg": -2.12 }] || "not_provided",
  "tz": "America/New_York",
  "timezone_db_version": "IANA/system",
  "math_brain_version": "vX.Y",
  "ephemeris_source": "swiss_ephemeris",
  "engine_versions": {
    "seismograph": "v5.0",
    "balance": "v5.0",
    "sfd": "v1.1"
  },
  "notes": ["upstream houses used", "include_houses flag set"]
}
```

**Field Definitions:**
- `relocation_mode`: Set by comparing supplied coords with natal coords and/or by computing house deltas (any non-trivial deltas => A_local)
- `house_engine`: 
  - `'astrologer.p.rapidapi.com@v4.0'` when upstream houses used
  - `'local-swiss-ephemeris@x.y'` when computed locally
  - `'missing_upstream'` when neither was available (caller must retry)
- `house_shift_summary`: Optional but recommended. If present, must include all houses 1..12 and deltas

**Why Provenance Matters:**
- Auditability and reproducibility
- UI diagnostics and debugging
- Per-day tracking (see `provenanceByDate`)

---

### Per-Day Provenance (provenanceByDate)

For transit windows, include per-day metadata:

```json
{
  "provenanceByDate": {
    "2025-09-15": {
      "formation": "coords_only|city_state_geonames",
      "endpoint": "transit-aspects-data",
      "attempts": 1,
      "aspect_count": 12,
      "fallback_used": false
    }
  }
}
```

---

### FieldMap QA + Volatility Modernization Checklist (v5)

Use this checklist to regenerate or validate FieldMap JSON files under Balance Meter v5:

1. **Header and Meta — update legacy markers**
   - Replace legacy `orbs_profile: "wm-spec-2025-09"` with `"wm-tight-2025-11-v5"`
   - Replace legacy `math_brain_version` with current version
   - Use IANA timezones (e.g., `"America/Chicago"` not `"US/Central"`)

2. **Remove relational artifacts for solo runs**
   - Eliminate `relational_summary`
   - Empty `people[].planets` arrays or ordinal-encoded `houses` payloads

3. **Provenance (MANDATORY)**
   ```jsonc
   "provenance": {
     "chart_basis": "felt_weather_relocated",
     "seismograph_chart": "relocated",
     "translocation_applied": true
   }
   ```

4. **Coordinates and houses — human-readable**
   - Use decimal degrees for lat/lon
   - Proper house cusp arrays (not large integers)

5. **Aspect weights — v5 fixed curve**
   | Aspect      | Weight |
   |-------------|--------|
   | Trine       | +0.40  |
   | Sextile     | +0.25  |
   | Square      | −0.50  |
   | Opposition  | −0.45  |
   | Conjunction | ±0.00  |

6. **Magnitude/Bias — normalized values**
   - If raw fields appear as `mag_x10` / `bias_x10` at theoretical limits (e.g., 50, −50), ensure interpreter normalizes to human-scale:
     - Magnitude ≈ 0.0–5.0
     - Directional Bias ≈ −5.0..+5.0

7. **Volatility — computed downstream (v5 change)**
   - Remove or ignore raw `volatility` in FieldMap
   - Ensure aspects include `orb_deg` and total aspect count
   - Interpreter emits:
     ```jsonc
     "interpreted_volatility": <0–5>,
     "volatility_source": "computed_interpreter_v5"
     ```

8. **Provenance ↔ Mirror handshake**
   | FieldMap key             | MirrorDirective key      | Relation  |
   |--------------------------|--------------------------|-----------|
   | `mag_x10`                | `magnitude`              | ÷10       |
   | `bias_x10`               | `directional_bias`       | ÷10       |
   | `provenance.chart_basis` | `mirror_meta.chart_basis`| identical |
   | (no `volatility`)        | `interpreted_volatility` | computed  |

9. **Schema/version tag**
   ```jsonc
   "_meta": {
     "schema_version": "wm-fieldmap-v5",
     "exporter": "RavenCalder-5.0.1"
   }
   ```

10. **Validation run — expected hurricane benchmark**
    ```
    Magnitude: 4.0 ± 0.1
    Directional Bias: −4.8 ± 0.2
    interpreted_volatility: ≈ 0.0–0.5
    provenance.translocation_applied: true
    ```

---

### Balance Meter v5.0 Axes

| Axis | Range | Definition |
|------|-------|------------|
| **Magnitude** | 0 – 5 | Symbolic pressure / field intensity |
| **Directional Bias** | −5 … +5 | Expansion (+) vs contraction (−) tilt |

**Legacy Metrics:**
- **Coherence** and **SFD** were retired in v5.0
- Downstream consumers should treat them as deprecated

**Response Format:**
```jsonc
{
  "seismograph": {
    "magnitude": 3.4,
    "magnitude_label": "Surge",
    "directional_bias": {
      "value": -1.8,
      "label": "Contractive",
      "polarity": "inward"
    }
  }
}
```

---

## Orb Policy & Aspect Weighting

### Orb Policy (Pre-Weight Filter)

Apply before weighting/scoring:

- **Conjunction/Opposition:** max 8°
- **Square/Trine:** max 7°
- **Sextile:** max 5°
- **Moon rule:** +1° when Moon is the pair member
- **Outer→personal:** −1° when Jupiter/Saturn/Uranus/Neptune/Pluto aspects Sun/Moon/Mercury/Venus/Mars

### ⚠️ Critical Fix · Oct 2025

**Bug:** Upstream returns negative orbs for applying aspects. Always compare against the cap using the absolute value:

```javascript
// ❌ Buggy (filtered out every applying aspect)
if (orb > effectiveCap) dropReason = 'OUT_OF_CAP';

// ✅ Fixed
if (Math.abs(orb) > effectiveCap) dropReason = 'OUT_OF_CAP';
```

**Impact:** Without the absolute check, applying aspects (e.g., `orb === -3.2`) were rejected even though the magnitude was well within the cap, causing empty driver lists and Balance Meter zeros.

**Logging:** Always log `orbs_profile` and drop reasons in provenance for auditing.

---

### The Math Backbone (Weight Belt, SFD, Balance Channel)

**Aspect Base Weights (Defaults):**
- Trine: +0.40
- Sextile: +0.25
- Conjunction: ±0 (contextual)
- Square: −0.50
- Opposition: −0.45

**Modifiers:**
- Angularity (ASC/MC): ±0.10–0.20
- Applying: +0.10
- Separating: −0.05
- 3+ stack volatility kicker: −0.10

**SFD (Support-Flow Differential):**
- `SFD = SupportSum − CounterSum`
- Scaled to −5..+5

**Balance Channel v1.1:**
- Rebalances valence
- Boosts stabilizers (Jupiter/Venus)
- Softens hard aspects to reveal support under load

**SST Guardrail:**
- Lived pings (WB/ABE/OSR) can flip theoretical signs
- System learns from user feedback and pings

**Best Practice:** Always include a short numeric audit in the report appendix showing component contributions to SFD and magnitude.

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "errorId": "unique-id",
  "details": {}
}
```

### Error Response Codes

| Code | Meaning | WovenWebApp Handling |
|------|---------|----------------------|
| 200  | Success | Process data normally |
| 400  | Bad Request | Show field-specific errors |
| 401  | Unauthorized | Check API key configuration |
| 422  | Validation Error | Show field-specific errors |
| 429  | Rate Limited | Retry with exponential backoff |
| 500+ | Server Error | Show generic error, retry |

### Common Error Patterns

#### Rate Limiting (429)
```javascript
if (response.status === 429) {
  throw new Error('Rate limit exceeded. Please try again later.');
}
```

**Handling:** Treat as retryable with exponential backoff; log attempts and final error body.

#### API Errors (500+)
```javascript
if (response.status >= 500) {
  throw new Error('Server error. Please try again later.');
}
```

#### Validation Errors (422)
```javascript
if (response.status === 422) {
  const errorData = await response.json();
  throw new Error(`Validation error: ${errorData.detail}`);
}
```

### Error Translation Function

```javascript
async function translateUpstreamError(res) {
  const text = await res.text().catch(() => "");
  
  if (res.status === 401 || /api key/i.test(text)) {
    return json(502, { 
      error: "Upstream auth error", 
      detail: "Invalid or missing provider key." 
    });
  }
  
  if (res.status === 400 && /date/i.test(text)) {
    return json(422, { 
      error: "Invalid date/time for subject", 
      detail: text 
    });
  }
  
  if (res.status === 400 && /coordinates|latitude|longitude/i.test(text)) {
    return json(422, { 
      error: "Invalid coordinates", 
      detail: text 
    });
  }
  
  return json(502, { 
    error: "Upstream API error", 
    status: res.status, 
    detail: text.slice(0, 1000) 
  });
}
```

---

### Missing-Data Policy (Graceful Degradation)

**If no aspects for a day:**
- Include full UI/report structure and explicit placeholders
- Set `drivers: []` (empty array)
- Set `seismograph: { magnitude: null, valence: null, volatility: null, status: "no aspects received" }`

**Label simulated drivers clearly** when shown (for layout QA only)

**For partial days:**
- Populate available days
- Mark others as pending

**UI Guidance:**
```
No aspects received for these dates — try city+state, enable GeoNames, or use coords for the transit subject.
```

---

## Implementation Examples

### TypeScript Function Implementation

#### Shared Utilities (`netlify/functions/_shared.ts`)

```typescript
// netlify/functions/_shared.ts
export const ALLOW_ORIGIN =
  process.env.CORS_ALLOW_ORIGIN ?? "http://localhost:8888";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const json = (status: number, data: unknown, extra: Record<string, string> = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...extra },
  body: JSON.stringify(data),
});

export const noContent = () => ({ statusCode: 204, headers: CORS_HEADERS, body: "" });

// Safe JSON parse (no throws)
export function safeParseJson<T = unknown>(raw: string | null | undefined): { ok: true; data: T } | { ok: false } {
  try {
    if (!raw) return { ok: false };
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    return { ok: false };
  }
}
```

#### Main API Handler with Zod Validation

```typescript
// netlify/functions/astrology-mathbrain.ts
import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { CORS_HEADERS, json, noContent, safeParseJson } from "./_shared";

// Validation schemas
const Coords = z.object({
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
});

const DateTime = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  timezone: z.string().min(1), // IANA
});

const Subject = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  nation: z.string().min(1),
}).and(Coords).and(DateTime);

const Options = z.object({
  zodiac_type: z.enum(["tropical", "sidereal"]),
  include_aspects: z.boolean().default(true),
  include_houses: z.boolean().default(true),
  orbs_profile: z.enum(["strict","standard","loose"]).default("standard"),
}).partial().default({});

const BodySchema = z.object({
  subject: Subject,
  options: Options,
});

type Body = z.infer<typeof BodySchema>;

// Map request to upstream format
function toUpstream(input: Body) {
  const { subject, options } = input;
  return {
    subject: {
      name: subject.name,
      year: subject.year,
      month: subject.month,
      day: subject.day,
      hour: subject.hour,
      minute: subject.minute,
      city: subject.city,
      nation: subject.nation,
      latitude: subject.latitude,
      longitude: subject.longitude,
      timezone: subject.timezone,
    },
    theme: "default",
    system: options.zodiac_type ?? "tropical",
    include_aspects: options.include_aspects ?? true,
    include_houses: options.include_houses ?? true,
    orbs_profile: options.orbs_profile ?? "standard",
  };
}

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") return noContent();

  // Method gating
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed. Use POST." });
  }

  // Env check
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  if (!RAPIDAPI_KEY) {
    return json(500, { error: "Server misconfiguration: RAPIDAPI_KEY is not set" });
  }

  // Parse + validate
  const parsed = safeParseJson<unknown>(event.body);
  if (!parsed.ok) {
    return json(400, { error: "Invalid JSON in request body" });
  }

  const result = BodySchema.safeParse(parsed.data);
  if (!result.success) {
    const issues = result.error.issues.map(i => ({ 
      path: i.path.join("."), 
      message: i.message 
    }));
    return json(400, { error: "Missing or invalid fields", issues });
  }

  const body = result.data;
  const upstreamBody = toUpstream(body);

  try {
    const resp = await fetch("https://astrologer.p.rapidapi.com/api/v4/birth-chart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "astrologer.p.rapidapi.com",
      },
      body: JSON.stringify(upstreamBody),
    });

    if (!resp.ok) {
      const translated = await translateUpstreamError(resp);
      return translated;
    }

    const data = await resp.json();
    return json(200, { ok: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return json(500, { error: "Internal error", detail: msg });
  }
};
```

---

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

const transitData = await callAstrologerAPI(
  API_ENDPOINTS.TRANSIT_ASPECTS,
  transitPayload,
  "Transit aspects"
);
```

---

### Relational Balance Meter Payload (A_local)

```json
{
  "report_type": "relational_balance_meter",
  "subjectA": {
    "name": "DH Cross",
    "birth": {
      "date": "1973-07-24",
      "time": "14:30",
      "city": "Bryn Mawr",
      "state": "PA",
      "nation": "US"
    },
    "A_local": {
      "city": "Panama City",
      "state": "FL",
      "nation": "US"
    }
  },
  "subjectB": {
    "name": "Stephie",
    "birth": {
      "date": "1965-04-18",
      "time": "18:37",
      "city": "Albany",
      "state": "GA",
      "nation": "US"
    }
  },
  "transits": {
    "from": "2025-09-01",
    "to": "2025-09-30",
    "step": "1d"
  },
  "houses": "Placidus",
  "relocation_mode": "A_local",
  "orbs_profile": "wm-spec-2025-09"
}
```

**Coords-only note:** Remove city/state/nation and include `lat`, `lon` (or `lng` per upstream), `tz_str`.

---

## Testing & Validation

### Automated Testing (Oct 2025)

#### API Regression Suite

**Location:** [`__tests__/api-natal-aspects-refactor.test.js`](../../__tests__/api-natal-aspects-refactor.test.js)

**Coverage:**
1. Person A natal aspects populated (≈ 76)
2. Person B natal aspects populated (≈ 67)
3. Both persons yield 12 house cusps via `fetchNatalChartComplete()`
4. Synastry payload includes complete relational geometry

**Run:**
```bash
npx jest __tests__/api-natal-aspects-refactor.test.js
```

**Sample Output:**
```
✅ Person A has 76 natal aspects
✅ Person B has 67 natal aspects
✅ Person A has 12 house cusps
✅ Person B has 12 house cusps
PASS __tests__/api-natal-aspects-refactor.test.js
```

---

### Probe Script & Verification Checklist

**Setup:**
- Add `RAPIDAPI_KEY` and optional `GEONAMES_USERNAME` to `.env`
- Run dev server: `npm run dev` or `netlify dev`
- Run probe: `node scripts/probe-provenance.js`

**Check Output:**
- `provenance` top-level present
- `provenanceByDate` entries per day with formation, endpoint, attempts, aspect_count
- For days with aspects: `transitsByDate[date].drivers` is non-empty
- If `drivers[]` empty but provenance shows `formation=city_state_geonames` and `aspect_count=0`, try toggling to coords for transit instant as fallback

---

### Testing Rules

- **14-day pilot** for new users to seed SST/personalization (3 short pings/day)
- **Automated schema checks** in CI to assert `drivers[]` shape and required provenance fields
- **Logging:** Log raw upstream request/response (trimmed) for 422/429/500 with per-day provenance to speed debugging
- **Backoff:** Treat 429 as retryable with exponential backoff; log attempts and final error body

---

### Known Issues Tracker

| Status | Issue | Notes |
|--------|-------|-------|
| ✅ Fixed Oct 12 2025 | Person B aspects missing in relational modes | Unified natal fetch |
| ✅ Fixed Oct 12 2025 | Orb filtering ignored applying aspects | `Math.abs(orb)` enforcement |
| ✅ Fixed Oct 12 2025 | Balance Meter zeroes (orb dropout) | Orb fix + unified fetch |
| ⏳ Pending | Legacy Balance Meter exports may still show zeros | Additional QA underway |
| ⏳ Pending | Composite transits temporarily disabled | Awaiting upstream API stability |

---

## Troubleshooting

### Quick Troubleshooting Checklist

#### 1. drivers[] empty

**Check:**
- `provenanceByDate.formation` (coords vs city)
- If `formation=city_state_geonames` but `aspect_count=0`, ensure `GEONAMES_USERNAME` is valid
- If `formation=coords` but upstream returns 422 requiring city, try city+state formation

#### 2. House differences vs old reports

**Verify:**
- `relocation_mode` used (A_local vs None)
- House system (Placidus vs Whole Sign)
- Exact event timestamp (small time shifts can move cusps)

#### 3. Strange orbs/weights

**Check:**
- Ensure orb clamping applied pre-weight (8/7/5 + Moon/outer adjustments)
- Check `orbs_profile` in provenance
- Verify `Math.abs(orb)` is used for orb cap comparison

#### 4. "Error computing geometry"

**Likely cause:** Missing/invalid API key

**Fix:**
- Verify `RAPIDAPI_KEY` in environment
- Check RapidAPI dashboard for key status
- Ensure key has not expired or exceeded quota

#### 5. Empty reports

**Check:**
- Response shape vs expected schema
- Browser console + network tab
- Verify env & keys
- Test with known-good payloads
- Review Netlify function logs

---

### UI Guidance for Users

**Minimum fields (UI):**
- Name
- Birth date
- Birth time (exact preferred; warn if approximate)
- Birth city (UI asks for state for US)
- Mode: Natal vs Natal+Transits
- If Transits: start / end / step and whether to anchor to current city

**GeoNames UI Copy (Drop-In):**
- **Tooltip:** "Optional: Add a GeoNames username to stabilize city lookups for natal charts. It's free and server-only."
- **Inline helper:** "GeoNames (optional): a free username lets the server resolve birth cities reliably. If present and you enter city + nation, natal prefers city-mode; otherwise we fall back to coordinates."
- **Settings description (admin):** "GEONAMES_USERNAME: one server account stabilizes city resolution for all users."

**If aspects are missing:**
- Show clear fix suggestions and an action button for "Retry with coords" or "Provide state / enable GeoNames"

---

### Debug Steps

1. Set `LOG_LEVEL=debug` in environment
2. Inspect browser console + network tab
3. Verify env & keys
4. Test with known-good payloads
5. Review Netlify function logs

---

## Configuration & Best Practices

### API Key Management

- **Store in environment variables** (never commit)
- **Rotate keys every ~90 days**
- **Monitor usage** via RapidAPI dashboard
- **Use separate dev/prod keys**

### Performance Optimization

- **Batched processing:** 5 concurrent API calls (configurable)
- **Parallel requests:** For multi-date transit calculations
- **Response caching:** In-memory for session duration
- **Payload size:** Use `transit-aspects-data` instead of `transit-chart` for lighter payloads

### Monitoring

- **Track API response times**
- **Monitor rate limit status**
- **Log failed requests** for debugging
- **Use health check endpoint**

### Debugging

- **Enable debug logging:** `LOG_LEVEL=debug`
- **Full payload logging** for troubleshooting
- **Response validation** and error details
- **Performance metrics** tracking

---

## Product Philosophy (Restate)

- **Falsifiability first:** Every poetic line must trace to a math anchor or be explicitly labeled as non-transit/simulated
- **Recognition before diagnosis:** Start with FIELD (felt sense), then MAP (geometry), then VOICE (actionable prompts)
- **Graceful honesty:** If inputs are ambiguous or aspects are missing, call it out and provide practical fixes
- **Human in the loop:** Calibrations use lived pings; the system learns

---

## Related Documentation

- **Backend Development Guide:** Complete implementation details
- **MAINTENANCE_GUIDE:** Best practices and operational guidance
- **MATH_BRAIN_COMPLIANCE:** Technical requirements
- **Official API Docs:** [RapidAPI Astrologer](https://rapidapi.com/kerykeion/api/astrologer/)
- **Lessons Learned for Developer:** Context & IDE integration
- **copilot_fix_recovery:** Emergency recovery procedures

---

## Appendix: Quick Reference

### Environment Variables

```bash
# Required
RAPIDAPI_KEY=your_rapidapi_key

# Optional
GEONAMES_USERNAME=your_geonames_username
CORS_ALLOW_ORIGIN=http://localhost:8888
LOG_LEVEL=debug
API_RATE_LIMIT=60
```

### Quick Commands

```bash
# Environment check
npm run check-env

# Local development
npm run dev

# CSS production build
npm run build:css

# Test env var (unix)
echo $RAPIDAPI_KEY

# Kill stuck Netlify dev (unix)
pkill -f netlify
```

### API Endpoint Quick Reference

| Endpoint | Purpose | Primary Use |
|----------|---------|-------------|
| `/api/v4/birth-chart` | Full natal chart | Natal calculations with houses |
| `/api/v4/natal-aspects-data` | Natal aspects only | Lighter natal payload |
| `/api/v4/synastry-chart` | Relationship aspects | Synastry reports |
| `/api/v4/transit-chart` | Full transit chart | Transit with full context |
| `/api/v4/transit-aspects-data` | Transit aspects only | Multi-day transit windows |
| `/api/v4/composite-chart` | Composite chart | Composite reports |

---

**End of Master Reference**

*This document consolidates lessons learned from API_INTEGRATION_GUIDE.md, API_REFERENCE.md, and Astrologer API and other issues.md. For updates or corrections, edit this master document and sync dependent documentation.*

*Last synced: November 10, 2025*
