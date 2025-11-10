# WovenWebApp Math Brain: Architecture & Refactoring Status

**Last Updated:** November 9, 2025  
**Status:** Phase 2 (API Client Extraction) — In Progress, Architecture Corrected  
**Goal:** Decompose the legacy 6000-line monolith into modular, testable, and reusable components.

---

## Executive Summary

The WovenWebApp backend is transitioning from a single 6000-line serverless function (`lib/server/astrology-mathbrain.js`) to a modular Next.js API route architecture. The new entry point is `app/api/astrology-mathbrain/route.ts`, which delegates to a growing suite of focused modules in `src/math-brain/`.

**Current Progress:**
- ✅ **Phase 1 Complete:** Utility and compression functions extracted.
- ✅ **Phase 1.5 Complete:** Core API client module created (`src/math-brain/api-client.js`).
- 🔄 **Phase 2 In Progress:** Moving remaining API functions into the API client.
- ⏳ **Phases 3–6 Pending:** Seismograph, validation, relational logic, and main handlers.

---

## Architecture: New vs. Legacy

### New Next.js API Route (`app/api/astrology-mathbrain/route.ts`)

**Location:** `app/api/astrology-mathbrain/route.ts`  
**Purpose:** Modern TypeScript API wrapper. Acts as:
1. **Request validator** — Ensures incoming data is valid.
2. **Safety layer** — Catches and formats errors from the legacy backend.
3. **Entry point** — All requests from the frontend hit this route first.

**Current Responsibilities:**
```
Frontend Request
    ↓
app/api/astrology-mathbrain/route.ts (validation, error formatting)
    ↓
lib/server/astrology-mathbrain.js (legacy handler → being decomposed)
    ↓
src/math-brain/ (new modular components)
    ↓
External APIs (RapidAPI Astrologer, GeoNames)
```

**Future State (Target):**
```
Frontend Request
    ↓
app/api/astrology-mathbrain/route.ts (validation)
    ↓
src/math-brain/orchestrator.js (new main handler)
    ├→ src/math-brain/api-client.js
    ├→ src/math-brain/validation.js
    ├→ src/math-brain/seismograph-engine.js
    ├→ src/math-brain/relational.js
    └→ src/math-brain/utils/
    ↓
External APIs
```

---

## Modular Components (v2 Engine)

### ✅ Phase 1: Utilities & Compression

**Extracted into `src/math-brain/utils/`:**

#### `time-and-coords.js`
- `normalizeTimezone()` — Map US abbreviations (EST, CST, etc.) to IANA zones.
- `parseCoordinates()` — Parse DMS and decimal coordinate strings.
- `formatBirthDate()`, `formatBirthTime()`, `formatBirthPlace()` — Format subject metadata.
- `normalizeRelocationMode()` — Canonicalize relocation mode tokens.
- `normalizeTranslocationBlock()` — Normalize relocation configuration objects.
- `deriveTransitTimeSpecFromBody()` — Extract time spec from transit request body.
- **Logger:** Shared logging utility.

#### `compression.js`
- `buildCodebook()` — Create a compression codebook from transit data.
- `resolveDayAspects()` — Extract aspects from various response shapes.
- `calculateNatalHouse()` — Map transit longitude to natal house.
- `extractHouseCusps()` — Extract 12 house cusps from birth chart data.
- `compressAspects()` — Compress aspects using a codebook (fixed-point integer format).
- `computeDayDeltas()` — Calculate daily aspect deltas (add/update/remove).

#### `city-resolver.js` (Legacy—being refactored)
- `resolveCity()` — GeoNames city lookup endpoint helper.
- `health()` — Health check endpoint.
- ⚠️ **Currently imports from `api-client.js`** (correct after architectural fix).

---

### ✅ Phase 1.5: API Client Core

**Location:** `src/math-brain/api-client.js`  
**Status:** Created; contains core utilities and partially contains Phase 2 functions.

**Current Exports:**
- `API_BASE_URL`, `API_ENDPOINTS` — RapidAPI constants.
- `buildHeaders()` — Build authenticated request headers.
- `apiCallWithRetry()` — Generic retry-logic wrapper for fetch.
- `fetchNatalChartComplete()` — Fetch and validate complete natal chart.

**Pending Additions (Phase 2):**
- `callNatal()` — Helper for natal endpoints with formation fallback.
- `getTransits()` — Fetch transits for a date range with chunking and fallback.
- `geoResolve()` — GeoNames latitude/longitude/timezone lookup.
- `computeComposite()` — Calculate composite chart (midpoint).
- `computeCompositeTransits()` — Composite + transits.
- `rapidApiPing()` — Health check for RapidAPI connectivity.

---

### 🔄 Phase 2: API Client Extraction (In Progress)

**Target Location:** `src/math-brain/api-client.js` (already created)

**Functions to Move:**
1. `callNatal(endpoint, subject, headers, pass, description)` — Call natal endpoints with city/coords fallback.
2. `fetchNatalChartComplete(subject, headers, pass, subjectLabel, contextLabel)` — Complete natal data fetcher (currently in api-client.js).
3. `getTransits(subject, transitParams, headers, pass)` — Fetch transits with chunking, fallback endpoints, and retry logic.
4. `geoResolve({ city, state, nation })` — GeoNames resolver.
5. `computeComposite(personA, personB, headers, pass)` — Composite chart calculation.
6. `computeCompositeTransits(composite, transitParams, headers, pass)` — Composite + transits.
7. `rapidApiPing()` — RapidAPI health check.

**Architectural Fix (This Week):**
- ✅ Create `src/math-brain/api-client.js` with core utilities (`buildHeaders`, `apiCallWithRetry`, API constants).
- ✅ `city-resolver.js` imports from `api-client.js` (avoid circular dependencies).
- 🔄 Move remaining API functions into `api-client.js`.

**Remaining in Monolith After Phase 2:**
```javascript
// Monolith will still contain:
- Seismograph functions (calculateSeismograph, formatTransitTable, etc.)
- Validation functions (validateSubject, normalizeSubjectData, etc.)
- Relational logic (polarity cards, echo loops, etc.)
- Main handlers (processMathbrain, applyCompressionAndReadiness)
- Export functions (handler, resolveCity, health)
```

---

### ⏳ Phase 3: Seismograph Engine (Pending)

**Target Location:** `src/math-brain/seismograph-engine.js`

**Functions to Extract:**
- `calculateSeismograph()` — Compute magnitude, directional bias, volatility.
- `formatTransitTable()` — Format transit aspects into orb bands with phase data.
- `calculateTrend()` — Compute trend for time-series data.
- `extractSeismographData()` — Extract seismograph metrics from comprehensive result.

**Why Last:** Depends on validated aspect data; should only run after Phase 2 complete.

---

### ⏳ Phase 4: Validation & Normalization (Pending)

**Target Location:** `src/math-brain/validation.js`

**Functions to Extract:**
- `validateSubjectLean()` — Lightweight subject validation (coords only).
- `validateSubject()` — Full subject validation (coords or city+nation).
- `normalizeSubjectData()` — Convert various input formats to canonical subject shape.
- `subjectToAPI()` — Convert internal subject to RapidAPI Subject Model.
- `validateSubjectStrictWithMap()` — Strict field-by-field validation.

**Why Here:** Input cleaning should run early; enables reuse in React/frontend contexts.

---

### ⏳ Phase 5: Relational Logic (Pending)

**Target Location:** `src/math-brain/relational.js`

**Functions to Extract:**
- `generatePolarityCards()` — Identify and describe polarity tensions.
- `detectEchoLoops()` — Find reciprocal aspect patterns.
- `generateSharedSSTTags()` — Identify shared synastry strength tags.
- `computeBidirectionalOverlays()` — Calculate overlays in both directions.
- `classifyAspectRole()` — Categorize synastry aspect as tension, harmony, or catalyst.
- `describeExperienceForA()`, `describeExperienceForB()` — Generate experience narratives.
- `computeCombinedRelationalMetrics()` — Aggregate relational statistics.
- `computeRelationalBalanceMeter()` — Balance Meter for relational charts.
- `generateVectorIntegrityTags()` — Tag vector integrity (coherence, suppression, etc.).
- `generateRelationalMirror()` — Build complete relational Mirror output.

**Why Late:** Complex; depends on validated natal + transit data from earlier phases.

---

### ⏳ Phase 6: Main Handler Refactoring (Pending)

**Target Location:** `src/math-brain/orchestrator.js` (new)

**Functions to Refactor:**
- `processMathbrain()` — Main orchestrator (currently ~2000+ lines).
- `applyCompressionAndReadiness()` — Apply compression and readiness gates.
- `exports.handler` — Lambda/Netlify handler wrapper.
- `exports.resolveCity` — City resolution endpoint (move to separate export).
- `exports.health` — Health check endpoint.

**Strategy:**
1. Create `orchestrator.js` that calls extracted modules in sequence.
2. Replace legacy `processMathbrain` with modular calls.
3. Keep exports lean; they should just validate and delegate.

---

## What Remains in the Monolith

### `lib/server/astrology-mathbrain.js` (Current State)

**Size:** ~5579 lines (after Phase 1 extractions)  
**Current Problems:** Syntax errors from failed refactoring; being repaired.

**Still Inside (Not Yet Extracted):**

#### API Layer (Moving to Phase 2)
- `API_BASE_URL`, `API_ENDPOINTS`
- `buildHeaders()` ⚠️ Partially in api-client.js; being moved.
- `apiCallWithRetry()` ⚠️ Partially in api-client.js; being moved.
- `callNatal()`
- `fetchNatalChartComplete()` ⚠️ Already in api-client.js
- `getTransits()` ← **Critical function; handles 30+ concurrent requests, retry logic, formation switching**
- `geoResolve()`
- `computeComposite()`, `computeCompositeTransits()`
- `rapidApiPing()` ⚠️ Incorrectly in city-resolver; should be in api-client.

#### Seismograph Engine (Phase 3)
- `calculateSeismograph()` ← **The "secret sauce"; computes magnitude, directional bias, volatility, coherence**
- `formatTransitTable()` ← **Creates phase lookup, orb bands, markdown output**
- `calculateTrend()`, `extractSeismographData()`

#### Validation (Phase 4)
- `validateSubjectLean()`, `validateSubject()`, `normalizeSubjectData()`
- `subjectToAPI()`, `validateSubjectStrictWithMap()`

#### Relational Logic (Phase 5) — ~1000+ lines
- `generatePolarityCards()`, `detectEchoLoops()`, `generateSharedSSTTags()`
- `computeBidirectionalOverlays()`, `classifyAspectRole()`
- `describeExperienceForA()`, `describeExperienceForB()`
- `computeCombinedRelationalMetrics()`, `computeRelationalBalanceMeter()`
- `generateVectorIntegrityTags()`, `generateRelationalMirror()`

#### Main Handlers (Phase 6) — ~2000+ lines
- `processMathbrain()` ← **Main orchestrator; everything flows through here**
- `applyCompressionAndReadiness()`, `exports.handler`

#### Miscellaneous Utilities (Unategorized; need homes)
- `RELOCATION_FOOTNOTE_LABELS` (constant)
- `deriveRelocationDetail()`, `relocationFrameFromMode()`
- `normalizeStep()`, `canonicalizeMode()`
- `generateErrorId()` ← Error ID generation
- `loggedMissingRapidApiKey` (global flag)
- `parseCoordinate()` ⚠️ Different from `parseCoordinates` (already extracted)
- Aspect classification helpers: `isPrimaryFramePoint()`, `isAngle()`, `matchCategoryA/B/C/D()`
- Aspect filtering: `filterPriorityAspects()`, `selectPoeticAspects()`, `enrichDailyAspects()`
- Readiness logic: `checkMirrorReadiness()`, `checkBalanceReadiness()`, `computeReadinessState()`
- Various constants: `PRIMARY_FRAME_POINTS`, `LUMINARIES_SET`, `HARD_ASPECT_TYPES`, etc.

---

## Dependency Graph (Critical for Phasing)

```
Phase 1 (✅ DONE)
└─ Utilities (time-and-coords, compression)

Phase 1.5 (✅ DONE)
└─ API Client Core (buildHeaders, apiCallWithRetry)
   └─ Utils (time-and-coords for logger)

Phase 2 (🔄 IN PROGRESS)
├─ callNatal, getTransits, geoResolve, computeComposite, rapidApiPing
└─ Depends on: Phase 1.5 (API core)

Phase 3 (⏳ PENDING)
├─ calculateSeismograph, formatTransitTable, calculateTrend
└─ Depends on: Phase 1 (compression for data access), Phase 2 (API for data sources)

Phase 4 (⏳ PENDING)
├─ Validation functions
└─ Depends on: Phase 1 (utils for normalization)

Phase 5 (⏳ PENDING)
├─ Relational logic (polarity, echo loops, overlay, etc.)
└─ Depends on: Phase 2 (API to fetch data), Phase 3 (seismograph for aggregation)

Phase 6 (⏳ PENDING)
├─ Main handler (processMathbrain)
└─ Depends on: All prior phases
```

---

## Quick Reference: What Calls What

### `app/api/astrology-mathbrain/route.ts` (Entry Point)
1. Validates request with schema.
2. Calls `processMathbrain` from legacy monolith.
3. Formats response or error.

### `processMathbrain()` (Currently Main Orchestrator)
1. Parse and normalize input (Phase 4 functions).
2. Fetch natal charts (Phase 2: `callNatal`, `fetchNatalChartComplete`).
3. Fetch transits (Phase 2: `getTransits`).
4. Calculate seismograph (Phase 3: `calculateSeismograph`).
5. Apply relational logic if dyadic (Phase 5: `generateRelationalMirror`, etc.).
6. Format output with readiness checks.
7. Return structured result.

### `getTransits()` (Critical Phase 2 Function)
1. Parse transit time range; determine sampling grid.
2. Chunk requests (5 concurrent max) to respect API rate limits.
3. For each day:
   - Try primary endpoint (`transit-aspects-data`).
   - Fallback to `transit-chart` if no aspects.
   - Fallback to formation switching (city ↔ coords) if still empty.
4. Store results with provenance (endpoint, formation, attempts).
5. Return `transitsByDate`, `retroFlagsByDate`, `provenanceByDate`, `chartAssets`.

---

## For React Integration: What You Need to Know

### Current State
- **Backend Entry:** `app/api/astrology-mathbrain` (TypeScript + validation)
- **Processing:** Delegates to legacy monolith + growing v2 modules
- **Response Shape:** See `API_INTEGRATION_GUIDE.md` for response schema

### During Phase 2–6
- **No changes to request/response contract** — Frontend continues unchanged
- **Internal reshuffling only** — Functions move, but behavior stays the same
- **Performance:** Modular design *should* enable better caching and reuse

### After Phase 6 (Final)
- **New orchestrator** replaces `processMathbrain`
- **Cleaner separation** enables frontend to call specific modules directly if needed
- **Testability** — Each module can be unit-tested in isolation

---

## Files to Reference

| File | Purpose |
|------|---------|
| `app/api/astrology-mathbrain/route.ts` | Next.js API route (entry point) |
| `src/math-brain/api-client.js` | Core API utilities (Phase 1.5) |
| `src/math-brain/utils/time-and-coords.js` | Time/timezone/coordinate parsing (Phase 1) |
| `src/math-brain/utils/compression.js` | Aspect compression utilities (Phase 1) |
| `src/math-brain/utils/city-resolver.js` | City resolution endpoints (Phase 1) |
| `lib/server/astrology-mathbrain.js` | Legacy monolith (being decomposed) |
| `lib/reporting/metric-labels.js` | Aspect metric classification helpers |
| `lib/config/orb-profiles.js` | Orb cap configuration |
| `lib/relocation/index.js` | Relocation calculations |
| `src/seismograph.js` | Seismograph aggregation (external; used by Phase 3) |
| `src/reporters/woven-map-composer.js` | Woven Map report generation |

---

## Deployment & CI/CD

- **Build:** `npm run build:css` (Tailwind)
- **Dev:** `netlify dev` (tests Next.js + Netlify functions)
- **Deploy:** Auto-deploy from `main` to Netlify
- **Env Vars:** `RAPIDAPI_KEY`, `GEONAMES_USERNAME` (must be set in Netlify dashboard)

---

## Next Steps (Prioritized)

1. **Immediate:** Fix syntax error in `lib/server/astrology-mathbrain.js` (stray brace).
2. **Phase 2:** Complete API client extraction (move `callNatal`, `getTransits`, etc.).
3. **Phase 3:** Extract seismograph engine.
4. **Phase 4:** Extract validation layer.
5. **Phase 5:** Extract relational logic.
6. **Phase 6:** Refactor main handler; delete legacy monolith.

const { aggregate } = require('../../src/seismograph.js');
const { _internals: seismoInternals } = require('../../src/seismograph.js');
const {
  classifyDirectionalBias,
  classifyMagnitude,
  classifyVolatility,
  clamp,
} = require('../reporting/metric-labels');
const { scaleDirectionalBias } = require('../reporting/canonical-scaling');
const { scaleUnipolar, scaleBipolar } = require('../balance/scale');
const API_BASE_URL = 'https://astrologer.p.rapidapi.com';

const API_ENDPOINTS = {
  BIRTH_CHART:        `${API_BASE_URL}/api/v4/birth-chart`,         // natal chart + aspects
  NATAL_ASPECTS_DATA: `${API_BASE_URL}/api/v4/natal-aspects-data`,  // natal aspects only
  SYNASTRY_CHART:     `${API_BASE_URL}/api/v4/synastry-chart`,       // A↔B + aspects
  TRANSIT_CHART:      `${API_BASE_URL}/api/v4/transit-chart`,       // subject + aspects
  TRANSIT_ASPECTS:    `${API_BASE_URL}/api/v4/transit-aspects-data`,// data-only
  SYNASTRY_ASPECTS:   `${API_BASE_URL}/api/v4/synastry-aspects-data`,
  BIRTH_DATA:         `${API_BASE_URL}/api/v4/birth-data`,
  NOW:                `${API_BASE_URL}/api/v4/now`,
  COMPOSITE_ASPECTS:  `${API_BASE_URL}/api/v4/composite-aspects-data`, // composite aspects only
  COMPOSITE_CHART:    `${API_BASE_URL}/api/v4/composite-chart`,
};

// Simplified logging utility to avoid external dependencies
const { mapT2NAspects } = require('../../src/raven-lite-mapper');
const { composeWovenMapReport } = require('../../src/reporters/woven-map-composer');
const { summarizeRelocation } = require('../relocation');
const {
  transformTransitsByDate,
  transformWeatherData,
} = require('../weatherDataTransforms');
const { DateTime } = require('luxon');
const { BalanceMeterInvariantViolation } = require('../balance/assertions');
const logger = {
  log: (...args) => console.log(`[LOG]`, ...args),
  info: (...args) => console.info(`[INFO]`, ...args),
  warn: (...args) => console.warn(`[WARN]`, ...args),
  error: (...args) => console.error(`[ERROR]`, ...args),
  debug: (...args) => process.env.LOG_LEVEL === 'debug' && console.debug(`[DEBUG]`, ...args),
};
let loggedMissingRapidApiKey = false;

// --- DATA-ONLY HELPERS (drop-in) ---
const { storeChartAsset, pruneExpired: pruneCachedCharts, DEFAULT_TTL_MS } = require('./chart-cache');

const GRAPHIC_KEYS = new Set([
  'wheel','svg','chart','image','images','chart_image','graphical','png','jpg','jpeg','pdf',
  'wheel_url','image_url','chartUrl','rendered_svg','rendered_png'
]);

function stripGraphicsDeep(obj, options = {}) {
  const { collector = null } = options;
  
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => stripGraphicsDeep(item, options));
  }
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (GRAPHIC_KEYS.has(key)) {
      // This is a graphic key - collect it and skip
      if (collector) {
        collector.push({ key, value, path: [key] });
      }
      continue;
    }
    
    if (value && typeof value === 'object') {
      result[key] = stripGraphicsDeep(value, options);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

function resolveChartPreferences(options = {}) {
  // Extract chart-specific preferences from options to pass to the API
  const prefs = {};
  
  // Chart visualization and calculation preferences
  const chartKeys = [
    'houses_system_identifier',
    'sidereal_mode',
    'perspective_type',
    'wheel_only',
    'wheel_format',
    'theme',
    'language',
    'active_points',
    'active_aspects'
  ];
  
  chartKeys.forEach(key => {
    if (options[key] !== undefined) {
      prefs[key] = options[key];
    }
  });
  
  return prefs;
}

function sanitizeChartPayload(payload, context = {}) {
  if (!payload || typeof payload !== 'object') {
    return { sanitized: payload, assets: [] };
  }

  const removed = [];
  const sanitized = stripGraphicsDeep(payload, { collector: removed });
  try {
    pruneCachedCharts();
  } catch (error) {
    if (logger && typeof logger.debug === 'function') {
      logger.debug('Chart cache prune failed', error.message);
    }
  }
  const assets = [];

  for (const entry of removed) {
    const extracted = extractGraphicAssets(entry, context);
    if (extracted.length) {
      assets.push(...extracted);
    }
  }

  return { sanitized, assets };
}

function appendChartAssets(target, assets) {
  if (!target || !Array.isArray(assets) || assets.length === 0) return;
  if (!Array.isArray(target.chart_assets)) {
    target.chart_assets = [];
  }
  target.chart_assets.push(...assets);
}

function extractGraphicAssets(entry, context) {
  const { key, path, value } = entry || {};
  if (!path) return [];
  const leafPath = Array.isArray(path) ? path : [String(path || key || 'image')];
  const packets = extractGraphicPackets(value, leafPath);
  if (!packets.length) return [];

  const assets = [];
  for (const packet of packets) {
    try {
      if (packet.buffer) {
        const { buffer, contentType, format } = packet;
        const { id, expiresAt } = storeChartAsset(buffer, {
          contentType,
          ttl: context.ttlMs || DEFAULT_TTL_MS,
          metadata: {
            contentType,
            format,
            fieldPath: packet.path,
            pathSegments: packet.pathSegments,
            subject: context.subject || null,
            chartType: context.chartType || null,
            scope: context.scope || 'chart',
            sourceKey: key,
          },
        });

        assets.push({
          id,
          url: `/api/chart/${id}`,
          contentType,
          format,
          fieldPath: packet.path,
          pathSegments: packet.pathSegments,
          key,
          subject: context.subject || null,
          chartType: context.chartType || null,
          scope: context.scope || 'chart',
          size: buffer.length,
          expiresAt,
          external: false,
        });
      } else if (packet.url) {
        const guessedFormat = packet.format || guessFormatFromUrl(packet.url);
        assets.push({
          id: packet.url,
          url: packet.url,
          contentType: packet.contentType || guessContentTypeFromFormat(guessedFormat) || 'image/png',
          format: guessedFormat,
          fieldPath: packet.path,
          pathSegments: packet.pathSegments,
          key,
          subject: context.subject || null,
          chartType: context.chartType || null,
          scope: context.scope || 'chart',
          size: null,
          expiresAt: null,
          external: true,
        });
      }
    } catch (error) {
      logger.warn('Failed to cache chart asset', { error: error.message, path: packet?.path });
    }
  }

  return assets;
}

function extractGraphicPackets(value, path) {
  const packets = [];

  if (!value && value !== '') return packets;

  if (typeof value === 'string') {
    const parsed = parseGraphicString(value);
    if (parsed) {
      const pathSegments = Array.isArray(path) ? path.slice() : [String(path)];
      packets.push({ ...parsed, path: pathSegments.join('.'), pathSegments });
    }
    return packets;
  }

  if (Buffer.isBuffer(value)) {
    const pathSegments = Array.isArray(path) ? path.slice() : [String(path)];
    packets.push({ buffer: value, contentType: 'application/octet-stream', format: 'binary', path: pathSegments.join('.'), pathSegments });
    return packets;
  }

  if (typeof value === 'object') {
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      const nextPath = Array.isArray(path) ? path.concat(nestedKey) : [path, nestedKey];
      packets.push(...extractGraphicPackets(nestedValue, nextPath));
    }
  }

  return packets;
}

function parseGraphicString(raw) {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;

  if (value.startsWith('data:')) {
    const commaIndex = value.indexOf(',');
    if (commaIndex === -1) return null;
    const meta = value.slice(5, commaIndex);
    const data = value.slice(commaIndex + 1);
    const [contentTypePart, encodingPart] = meta.split(';');
    const contentType = contentTypePart || 'application/octet-stream';
    const encoding = (encodingPart || '').toLowerCase();
    const buffer = Buffer.from(data, encoding.includes('base64') ? 'base64' : 'utf8');
    return { buffer, contentType, format: guessFormatFromContentType(contentType) };
  }

  if (/^https?:\/\//i.test(value)) {
    const format = guessFormatFromUrl(value);
    return {
      url: value,
      contentType: guessContentTypeFromFormat(format),
      format,
    };
  }

  if (value.startsWith('<svg')) {
    return { buffer: Buffer.from(value, 'utf8'), contentType: 'image/svg+xml', format: 'svg' };
  }

  const looksBase64 = /^[A-Za-z0-9+/=\s]+$/.test(value) && value.length % 4 === 0;
  if (looksBase64) {
    try {
      const buffer = Buffer.from(value, 'base64');
      return { buffer, contentType: 'image/png', format: 'png' };
    } catch (error) {
      logger.warn('Failed to decode base64 graphic string', error.message);
    }
  }

  return null;
}

function guessFormatFromContentType(contentType) {
  if (!contentType) return null;
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('svg')) return 'svg';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('pdf')) return 'pdf';
  return null;
}

function guessFormatFromUrl(url) {
  if (!url) return null;
  const match = url.toLowerCase().match(/\.(png|svg|jpe?g|pdf)(\?|#|$)/);
  if (match) {
    switch (match[1]) {
      case 'png':
        return 'png';
      case 'svg':
        return 'svg';
      case 'jpg':
      case 'jpeg':
        return 'jpg';
      case 'pdf':
        return 'pdf';
      default:
        return null;
    }
  }
  return null;
}

function guessContentTypeFromFormat(format) {
  if (!format) return null;
  switch (format) {
    case 'png':
      return 'image/png';
    case 'svg':
      return 'image/svg+xml';
    case 'jpg':
      return 'image/jpeg';
    case 'pdf':
      return 'application/pdf';
    default:
      return null;
  }
}

// Provenance constants
const MATH_BRAIN_VERSION = '0.2.1'; // Single source of truth for version
const EPHEMERIS_SOURCE = 'AstrologerAPI-v4';
const CALIBRATION_BOUNDARY = '2025-09-05';
const SEISMOGRAPH_VERSION = 'v5.0'; // Balance Meter v5 (wm-tight-2025-11-v5 profile, cap-aware)
const BALANCE_CALIBRATION_VERSION = 'v5.0'; // V5: tight orbs (hard 4°, trine 3°), luminary exception, point discipline
const SCHEMA_VERSION = 'WM-Chart-1.3-lite';

const LUMINARIES = new Set(['Sun','Moon']);
const ANGLES = new Set(['Ascendant','Descendant','Medium_Coeli','Midheaven','Imum_Coeli','IC']);
const HARD_ASPECTS = new Set(['conjunction','square','opposition']);
const SUPPORTIVE_ASPECTS = new Set(['trine','sextile']);
const RELOCATION_FOOTNOTE_LABELS = {
  birthplace: 'Relocation mode: Birthplace (natal houses retained).',
  A_local: 'Relocation mode: A_local (houses recalculated).',
  B_local: 'Relocation mode: B_local (houses recalculated).',
  both_local: 'Relocation mode: Both_local (houses recalculated).',
  event: 'Relocation mode: Event (houses recalculated).',
  midpoint_advanced_hidden: 'Relocation mode: Midpoint (symbolic shared frame, houses recalculated).',
};
// --- COMPRESSION UTILITIES ---

// Standard bodies and aspects for codebook
const STANDARD_BODIES = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','Asc','Dsc','MC','IC'];
const STANDARD_ASPECTS = ['conjunction','sextile','square','trine','opposition','quincunx','quintile','biquintile','semi-square','sesquiquadrate'];

function resolveDayAspects(dayEntry) {
  if (!dayEntry) return [];
  if (Array.isArray(dayEntry)) return dayEntry;
  if (typeof dayEntry === 'object') {
    if (Array.isArray(dayEntry.filtered_aspects)) return dayEntry.filtered_aspects;
    if (Array.isArray(dayEntry.aspects)) return dayEntry.aspects;
    if (Array.isArray(dayEntry.hooks)) return dayEntry.hooks;
  }
  return [];
}

/**
 * Calculate which natal house a transit position occupies
 * @param {number} transitLongitude - Transit planet's ecliptic longitude (0-360)
 * @param {number[]} houseCusps - Array of 12 house cusp longitudes
 * @returns {number|null} House number (1-12) or null if invalid
 */
function calculateNatalHouse(transitLongitude, houseCusps) {
  if (!houseCusps || houseCusps.length !== 12 || typeof transitLongitude !== 'number') {
    return null;
  }
  
  // Normalize longitude to 0-360
  const normalizeLon = (lon) => ((lon % 360) + 360) % 360;
  const tLon = normalizeLon(transitLongitude);
  
  // Check each house
  for (let i = 0; i < 12; i++) {
    const currentCusp = normalizeLon(houseCusps[i]);
    const nextCusp = normalizeLon(houseCusps[(i + 1) % 12]);
    
    // Handle zodiac wrap-around (e.g., house 12 ending at 0° Aries)
    if (currentCusp < nextCusp) {
      // Normal case: both cusps in same zodiac cycle
      if (tLon >= currentCusp && tLon < nextCusp) {
        return i + 1; // Houses are 1-indexed
      }
    } else {
      // Wrap case: cusp crosses 0° Aries
      if (tLon >= currentCusp || tLon < nextCusp) {
        return i + 1;
      }
    }
  }
  
  // Fallback: return house 1 if no match found
  return 1;
}

/**
 * Extract house cusp longitudes from birth chart API response
 * @param {object} chartData - Birth chart data from API
 * @returns {number[]|null} Array of 12 house cusp longitudes (degrees) or null
 */
function extractHouseCusps(chartData) {
  if (!chartData || typeof chartData !== 'object') return null;
  
  const cusps = [];
  
  // API returns houses as: first_house, second_house, ..., twelfth_house
  const houseNames = [
    'first_house', 'second_house', 'third_house', 'fourth_house',
    'fifth_house', 'sixth_house', 'seventh_house', 'eighth_house',
    'ninth_house', 'tenth_house', 'eleventh_house', 'twelfth_house'
  ];
  
  for (const houseName of houseNames) {
    const houseData = chartData[houseName];
    if (houseData && typeof houseData.abs_pos === 'number') {
      cusps.push(houseData.abs_pos);
    } else if (houseData && typeof houseData.position === 'number') {
      // Fallback: some APIs use 'position' instead of 'abs_pos'
      cusps.push(houseData.position);
    } else {
      // Missing house data - abort
      logger.debug(`Missing house cusp data for ${houseName}`);
      return null;
    }
  }
  
  return cusps.length === 12 ? cusps : null;
}

function buildCodebook(transitsByDate, options = {}) {
  const { includeMinors = false, includeAngles = true, maxAspectsPerDay = 40 } = options;

  const bodySet = new Set();
  const aspectSet = new Set();
  const pairSet = new Set();

  // Collect all unique bodies, aspects, and pairs
  Object.values(transitsByDate).forEach(dayEntry => {
    const aspects = resolveDayAspects(dayEntry);
    aspects.forEach(aspect => {
      if (aspect.planet1) bodySet.add(aspect.planet1);
      if (aspect.planet2) bodySet.add(aspect.planet2);
      if (aspect.aspect) aspectSet.add(aspect.aspect);

      // Create standardized pair key (alphabetical order for consistency)
      if (aspect.planet1 && aspect.planet2) {
        const pair = [aspect.planet1, aspect.planet2].sort().join('|');
        pairSet.add(pair);
      }
    });
  });

  const bodies = Array.from(bodySet).sort();
  const aspects = Array.from(aspectSet).sort();
  const pairs = Array.from(pairSet).map(pair => {
    const [p1, p2] = pair.split('|');
    return [bodies.indexOf(p1), bodies.indexOf(p2)];
  });

  // Build pattern index
  const patterns = [];
  const patternMap = new Map();

  Object.values(transitsByDate).forEach(dayEntry => {
    const aspectList = resolveDayAspects(dayEntry);
    aspectList.forEach(aspect => {
      if (!aspect.planet1 || !aspect.planet2 || !aspect.aspect) return;

      const pairKey = [aspect.planet1, aspect.planet2].sort().join('|');
      const pairIndex = Array.from(pairSet).indexOf(pairKey);
      const aspectIndex = aspects.indexOf(aspect.aspect);

      if (pairIndex >= 0 && aspectIndex >= 0) {
        const patternKey = `${pairIndex}:${aspectIndex}`;
        if (!patternMap.has(patternKey)) {
          const patternIndex = patterns.length;
          patterns.push({ pair: pairIndex, aspect: aspectIndex });
          patternMap.set(patternKey, patternIndex);
        }
      }
    });
  });

  return {
    bodies,
    aspects,
    pairs,
    patterns,
    patternMap
  };
}

function compressAspects(aspects, codebook, options = {}) {
  const { maxAspectsPerDay = 40 } = options;

  // Sort by orb tightness and take top aspects
  const sortedAspects = aspects
    .filter(a => a.planet1 && a.planet2 && a.aspect && typeof a.orbit === 'number')
    .sort((a, b) => Math.abs(a.orbit) - Math.abs(b.orbit))
    .slice(0, maxAspectsPerDay);

  const compressedAspects = [];

  sortedAspects.forEach(aspect => {
    const pairKey = [aspect.planet1, aspect.planet2].sort().join('|');
    const pairIndex = codebook.pairs.findIndex(pair => {
      const [p1, p2] = pair;
      return codebook.bodies[p1] + '|' + codebook.bodies[p2] === pairKey;
    });
    const aspectIndex = codebook.aspects.indexOf(aspect.aspect);

    if (pairIndex >= 0 && aspectIndex >= 0) {
      const patternKey = `${pairIndex}:${aspectIndex}`;
      const patternIndex = codebook.patternMap.get(patternKey);

      if (patternIndex !== undefined) {
        // Store orb as fixed-point integer (*100)
        const orb = Math.round(aspect.orbit * 100);
        compressedAspects.push([patternIndex, orb]);
      }
    }
  });

  return compressedAspects;
}

function computeDayDeltas(prevCompressed, currentCompressed) {
  const add = [];
  const upd = [];
  const rem = [];

  const prevMap = new Map(prevCompressed);
  const currentMap = new Map(currentCompressed);

  // Find additions and updates
  currentMap.forEach((orb, patternIndex) => {
    if (!prevMap.has(patternIndex)) {
      add.push([patternIndex, orb]);
    } else if (prevMap.get(patternIndex) !== orb) {
      const delta = orb - prevMap.get(patternIndex);
      upd.push([patternIndex, delta]);
    }
  });

  // Find removals
  prevMap.forEach((_, patternIndex) => {
    if (!currentMap.has(patternIndex)) {
      rem.push([patternIndex]);
    }
  });

  return { add, upd, rem };
}

// --- READINESS LOGIC ---

function checkMirrorReadiness(result) {
  const missing = [];

  // Check for blueprint
  if (!result.frontstage?.mirror?.blueprint) {
    missing.push('blueprint');
  }

  // Check for symbolic weather if transits are present
  if (result.person_a?.chart?.transitsByDate && Object.keys(result.person_a.chart.transitsByDate).length > 0) {
    if (!result.frontstage?.mirror?.symbolic_weather) {
      missing.push('symbolic_weather');
    }
  }

  // Check for polarity cards
  if (!result.frontstage?.mirror?.tensions?.polarity_cards || !result.frontstage.mirror.tensions.polarity_cards.length) {
    missing.push('polarity_cards');
  }

  // Check for stitched reflection
  if (!result.frontstage?.mirror?.stitched_reflection) {
    missing.push('stitched_reflection');
  }

  return {
    mirror_ready: missing.length === 0,
    mirror_missing: missing
  };
}

function checkBalanceReadiness(result) {
  const missing = [];

  // Check for transit data
  const transitsByDate = result.person_a?.chart?.transitsByDate;
  if (!transitsByDate || Object.keys(transitsByDate).length === 0) {
    missing.push('transits');
  }

  // v4: Validate seismograph presence (Magnitude/Directional Bias/Coherence)
  // SFD-era s_plus/s_minus/sf_diff indices removed
  const hasSeismograph = result.person_a?.derived?.seismograph_summary;
  if (!hasSeismograph) {
    missing.push('seismograph');
  }

  return {
    balance_ready: missing.length === 0,
    balance_missing: missing
  };
}

function extractOrb(aspect) {
  if (!aspect || typeof aspect !== 'object') return null;
  if (typeof aspect.orbit === 'number') return aspect.orbit;
  if (typeof aspect.orb === 'number') return aspect.orb;
  if (typeof aspect._orb === 'number') return aspect._orb;
  if (aspect.orbit && typeof aspect.orbit.value === 'number') return aspect.orbit.value;
  return null;
}

function scoreAspectPriority(aspect) {
  if (!aspect || typeof aspect !== 'object') return -Infinity;
  const aspectType = (aspect.aspect || aspect.type || aspect.name || '').toString().toLowerCase();
  let score = 0;
  if (HARD_ASPECTS.has(aspectType)) score += 8;
  if (SUPPORTIVE_ASPECTS.has(aspectType)) score += 5;
  if (!HARD_ASPECTS.has(aspectType) && !SUPPORTIVE_ASPECTS.has(aspectType)) score += 1;

  const p1 = aspect.p1_name || aspect.first_planet || aspect.point || aspect.from;
  const p2 = aspect.p2_name || aspect.second_planet || aspect.other_point || aspect.to;
  if (p1 && LUMINARIES.has(p1)) score += 4;
  if (p2 && LUMINARIES.has(p2)) score += 4;
  if (p1 && ANGLES.has(p1)) score += 3;
  if (p2 && ANGLES.has(p2)) score += 3;

  const orb = extractOrb(aspect);
  if (typeof orb === 'number' && Number.isFinite(orb)) {
    if (orb <= 1) score += 4;
    else if (orb <= 2) score += 3;
    else if (orb <= 3) score += 2;
    else if (orb <= 4) score += 1;
  }

  if (aspect.applying === true || aspect.is_applying === true) score += 1.5;
  if (aspect.separating === true) score += 0.25;

  return score;
}

function filterPriorityAspects(aspects, { min = 8, max = 12 } = {}) {
  if (!Array.isArray(aspects)) return [];
  if (aspects.length <= min) return aspects.slice();
  const scored = aspects.map((item, index) => ({ item, index, score: scoreAspectPriority(item) }));
  scored.sort((a, b) => {
    if (b.score === a.score) {
      const orbA = extractOrb(a.item);
      const orbB = extractOrb(b.item);
      if (typeof orbA === 'number' && typeof orbB === 'number') {
        if (orbA !== orbB) return orbA - orbB;
      }
      return a.index - b.index;
    }
    return b.score - a.score;
  });
  const limit = Math.min(max, Math.max(min, scored.length));
  return scored.slice(0, limit).map(entry => entry.item);
}

function buildAspectLabelEntry(aspect, frame = 'natal', direction = 'A_to_B') {
  if (!aspect || typeof aspect !== 'object') return null;
  const orb = extractOrb(aspect);
  const applying = aspect.applying === true || aspect.is_applying === true;
  const separating = aspect.separating === true;
  return {
    direction,
    aspect: aspect.aspect || aspect.type || aspect.name || null,
    from: aspect.p1_name || aspect.first_planet || aspect.from || null,
    to: aspect.p2_name || aspect.second_planet || aspect.to || null,
    orb: orb != null ? +Number(orb).toFixed(2) : null,
    applying: applying ? true : undefined,
    separating: separating ? true : undefined,
    frame,
    p1_house: aspect.p1_house ?? aspect.first_house ?? null,
    p2_house: aspect.p2_house ?? aspect.second_house ?? null,
  };
}

function deriveRelocationDetail(relocationMode, relocationAppliedA, relocationAppliedB, hasPersonB) {
  const mode = relocationMode || 'A_natal';
  const detail = {
    person_a: { relocation_mode: 'A_natal', relocation_applied: relocationAppliedA && mode === 'A_natal' },
    ...(hasPersonB ? { person_b: { relocation_mode: 'B_natal', relocation_applied: relocationAppliedB && mode === 'B_natal' } } : {})
  };

  const setMode = (key, modeValue, applied) => {
    if (!detail[key]) detail[key] = {};
    detail[key].relocation_mode = modeValue;
    detail[key].relocation_applied = applied;
  };

  switch (mode) {
    case 'A_local':
      setMode('person_a', 'A_local', relocationAppliedA);
      if (hasPersonB) setMode('person_b', 'B_natal', relocationAppliedB && mode === 'A_local' ? relocationAppliedB : false);
      break;
    case 'B_local':
      setMode('person_a', 'A_natal', relocationAppliedA && mode === 'B_local' ? relocationAppliedA : false);
      if (hasPersonB) setMode('person_b', 'B_local', relocationAppliedB);
      break;
    case 'Both_local':
      setMode('person_a', 'A_local', relocationAppliedA);
      if (hasPersonB) setMode('person_b', 'B_local', relocationAppliedB);
      break;
    case 'B_natal':
      if (hasPersonB) setMode('person_b', 'B_natal', relocationAppliedB);
      setMode('person_a', 'A_natal', relocationAppliedA);
      break;
    case 'Midpoint':
      setMode('person_a', 'Midpoint', relocationAppliedA);
      if (hasPersonB) setMode('person_b', 'Midpoint', relocationAppliedB);
      break;
    case 'Custom':
      setMode('person_a', relocationAppliedA ? 'Custom' : 'A_natal', relocationAppliedA);
      if (hasPersonB) setMode('person_b', relocationAppliedB ? 'Custom' : 'B_natal', relocationAppliedB);
      break;
    case 'A_natal':
    default:
      setMode('person_a', 'A_natal', relocationAppliedA);
      if (hasPersonB) setMode('person_b', detail.person_b?.relocation_mode || 'B_natal', relocationAppliedB);
      break;
  }

  return detail;
}

function relocationFrameFromMode(mode) {
  if (!mode) return 'natal';
  const token = String(mode);
  if (/local$/i.test(token) || token === 'Midpoint' || token === 'Custom') return 'relocated';
  return 'natal';
}

function normalizeStep(step) {
  const s = String(step || '').toLowerCase();
  if (['daily','weekly','monthly'].includes(s)) return s;
  if (s === '1d') return 'daily';
  if (s === '7d') return 'weekly';
  if (s === '1m' || s === '1mo' || s === 'monthly') return 'monthly';
  return 'daily';
}

// Timezone normalization for common aliases and US/* forms
function normalizeTimezone(tz) {
  // Return early if timezone isn't a string.
  if (!tz || typeof tz !== 'string') return tz;

  const t = tz.trim().toUpperCase();

  // Map common US timezone names and abbreviations to the correct IANA format.
  const timezoneMap = {
    'EASTERN': 'America/New_York',
    'EST': 'America/New_York',
    'EDT': 'America/New_York',
    'CENTRAL': 'America/Chicago',
    'CST': 'America/Chicago',
    'CDT': 'America/Chicago',
    'MOUNTAIN': 'America/Denver',
    'MST': 'America/Denver',
    'MDT': 'America/Denver',
    'PACIFIC': 'America/Los_Angeles',
    'PST': 'America/Los_Angeles',
    'PDT': 'America/Los_Angeles',
  };

  // If the input matches a key in the map, return the corresponding IANA timezone.
  if (timezoneMap[t]) {
    return timezoneMap[t];
  }

  // Fallback for any other timezone, defaulting to UTC if invalid.
  try {
    // Check if the timezone is a valid IANA format.
    return new Intl.DateTimeFormat('en-US', { timeZone: tz }).resolvedOptions().timeZone;
  } catch {
    // If it's not a valid format, return UTC as a default.
    return 'UTC';
  }
}

function formatBirthDate(details) {
  if (!details) return '';
  if (typeof details.birth_date === 'string' && details.birth_date.trim()) return details.birth_date;
  const { year, month, day } = details;
  if (year && month && day) {
    const mm = `${month}`.padStart(2, '0');
    const dd = `${day}`.padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }
  return '';
}

function formatBirthTime(details) {
  if (!details) return '';
  if (typeof details.birth_time === 'string' && details.birth_time.trim()) return details.birth_time;
  const { hour, minute } = details;
  if ((hour || hour === 0) && (minute || minute === 0)) {
    const hh = `${hour}`.padStart(2, '0');
    const mm = `${minute}`.padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return '';
}

function formatBirthPlace(details) {
  if (!details) return '';
  if (typeof details.birth_place === 'string' && details.birth_place.trim()) return details.birth_place;
  const city = details.city || details.birthCity;
  const nation = details.nation || details.country;
  if (city && nation) return `${city}, ${nation}`;
  return city || nation || '';
}

function normalizeRelocationMode(mode) {
  if (!mode && mode !== 0) return null;
  const token = String(mode).trim();
  if (!token) return null;
  const lower = token.toLowerCase();
  if (['none', 'off', 'natal', 'default'].includes(lower)) return 'none';
  if (['a_local', 'a-local', 'alocal', 'person_a', 'person-a'].includes(lower)) return 'A_local';
  if (['b_local', 'b-local', 'blocal', 'person_b', 'person-b'].includes(lower)) return 'B_local';

  if (['both_local', 'both-local', 'both', 'dual_local', 'dual-local', 'shared_local', 'shared'].includes(lower)) return 'Both_local';

  if (['a_natal', 'a-natal', 'anatal', 'person_a_natal'].includes(lower)) return 'A_natal';
  if (['b_natal', 'b-natal', 'bnatal', 'person_b_natal'].includes(lower)) return 'B_natal';

  if (['custom', 'manual', 'user'].includes(lower)) return 'Custom';
  if (['midpoint', 'mid-point'].includes(lower)) return 'Midpoint';
  return token;
}

function normalizeTranslocationBlock(raw) {
  if (raw === null || raw === undefined) return null;

  const coerceBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return undefined;
      return value !== 0;
    }
    if (typeof value === 'string') {
      const token = value.trim().toLowerCase();
      if (!token) return undefined;
      if (['false', '0', 'no', 'off', 'none', 'natal'].includes(token)) return false;
      if (['true', '1', 'yes', 'on', 'apply', 'applies'].includes(token)) return true;
    }
    return undefined;
  };

  if (typeof raw === 'string') {
    const method = normalizeRelocationMode(raw);
    if (!method) return null;
    const applies = !['none', 'A_natal', 'B_natal'].includes(method);
    return { applies, method };
  }

  if (typeof raw === 'object') {
    const block = { ...raw };
    const methodCandidate = block.method || block.mode || block.selection || block.type || block.lens;
    const method = normalizeRelocationMode(methodCandidate);
    if (method) block.method = method;
    const coercedApplies = coerceBoolean(block.applies);
    if (coercedApplies !== undefined) {
      block.applies = coercedApplies;
    } else if (method) {
      block.applies = !['none', 'A_natal', 'B_natal'].includes(method);
    } else {
      block.applies = false;
    }
    return block;
  }

  return null;
}

/**
 * v5 Relational Verdict (Label-Only, No Numeric SFD)
 * Derives cooperation/opposition hint from Directional Bias only (coherence removed in v5.0).
 *
 * @param {number} biasSigned5 - Directional bias on [−5, +5] scale
 * @returns {string|null} - Label describing relational alignment
 */
function relationalVerdictLabel(biasSigned5) {
  if (!Number.isFinite(biasSigned5)) return null;
  // v5.0: Only bias used for verdict
  if (biasSigned5 <= -2.5) return 'contractive alignment';
  if (biasSigned5 < 2.5) return 'mixed vectors';
  return 'expansive alignment';
}

function evaluateMirrorReadiness(result) {
  const diagnostics = [];
  if (!result || typeof result !== 'object') {
    diagnostics.push('Result payload missing');
    return { ready: false, reasons: diagnostics };
  }

  const wm = result.woven_map;
  if (!wm || typeof wm !== 'object') {
    diagnostics.push('Woven map missing');
  }

  const voice = wm?.mirror_voice;
  const hasVoice = typeof voice === 'string'
    ? voice.trim().length > 0
    : (voice && typeof voice === 'object' && Object.keys(voice).length > 0);
  if (!hasVoice) diagnostics.push('Mirror voice unavailable');

  const vector = wm?.vector_integrity || {};
  const vectorReady = Boolean(
    vector &&
    vector.method &&
    vector.method !== 'stub-0' &&
    ((Array.isArray(vector.latent) && vector.latent.length > 0) ||
     (Array.isArray(vector.suppressed) && vector.suppressed.length > 0))
  );
  if (!vectorReady) diagnostics.push('Vector integrity incomplete');

  const anchorsReady = Boolean(
    wm?.natal_summary &&
    wm.natal_summary.anchors &&
    Object.values(wm.natal_summary.anchors).some(Boolean)
  );
  if (!anchorsReady) diagnostics.push('Anchor summary incomplete');

  // v4: SFD removed from mirror readiness check
  const isRelational = Boolean(result?.person_b || result?.synastry_aspects || result?.context?.participants?.person_b);

  if (result?.person_b && !result.person_b?.details?.timezone) {
    diagnostics.push('Person B timezone missing');
  }

  const ready = diagnostics.length === 0;
  return { ready, reasons: ready ? ['Ready'] : diagnostics };
}

function hasKnownTime(meta) {
  if (!meta || typeof meta !== 'object') return false;
  if (meta.birth_time_known) return true;
  const precision = typeof meta.time_precision === 'string' ? meta.time_precision.toLowerCase() : '';
  return precision && precision !== 'unknown';
}

const READINESS_MESSAGES = {
  MIRROR: {
    PRIMARY_TIME_UNKNOWN: 'Birth time for Person A is required or choose a time policy fallback before generating a Mirror.',
    SECONDARY_TIME_UNKNOWN: 'Birth time for Person B is required or choose a time policy fallback before generating a Mirror.',
    MIDPOINT_NOT_ALLOWED: 'Midpoint is for Relational Balance. Choose A_local or B_local, or switch to Balance.',
    RELATIONSHIP_DATA_MISSING: 'Relationship partner data is incomplete; load both charts to generate a relational Mirror.',
    DEFAULT: 'Relocation prerequisites missing; cannot generate MAP/VOICE.'
  },
  BALANCE: {
    PRIMARY_TIME_UNKNOWN: 'Balance Meter needs a known birth time or explicit time policy for Person A.',
    SECONDARY_TIME_UNKNOWN: 'Balance Meter needs a known birth time or explicit time policy for Person B.',
    BALANCE_RELOCATION_REQUIRED: 'Balance Meter requires relocation. Choose A_local or B_local to recalc houses.',
    BALANCE_MIDPOINT_NEEDS_DYAD: 'Midpoint relocation is available only when both charts are loaded for Relational Balance.',
    BALANCE_B_LOCAL_NEEDS_PERSON_B: 'B_local relocation needs Person B\'s chart to be present.',
    DEFAULT: 'Balance Meter prerequisites not met; gauges are on hold.'
  }
};

function buildGuard(mode, issues) {
  if (!Array.isArray(issues) || issues.length === 0) {
    return { ready: true, issues: [] };
  }
  const catalog = READINESS_MESSAGES[mode] || {};
  const primary = issues[0];
  const message = catalog[primary] || catalog.DEFAULT || 'Requirements not met.';
  return {
    ready: false,
    code: primary,
    issues,
    message
  };
}

function computeRelocationFrames(relocationMode, relocationApplied, hasPersonB) {
  const mode = (relocationMode || '').trim();
  const frames = { a: 'A_natal', b: hasPersonB ? 'B_natal' : null };
  if (!relocationApplied) {
    return frames;
  }
  if (mode === 'A_local') {
    frames.a = 'A_local';
    return frames;
  }
  if (mode === 'B_local') {
    frames.a = 'A_natal';
    frames.b = hasPersonB ? 'B_local' : frames.b;
    return frames;
  }
  if (mode === 'Midpoint') {
    frames.a = 'Midpoint';
    frames.b = hasPersonB ? 'Midpoint' : frames.b;
    return frames;
  }
  if (mode) {
    frames.a = mode;
    if (hasPersonB) frames.b = mode;
  }
  return frames;
}

function computeReadinessState({
  modeToken,
  wantBalance,
  relationshipMode,
  personBLoaded,
  relocationMode,
  relocationApplied,
  timeMetaA,
  timeMetaB
}) {
  const mirrorIssues = [];
  const balanceIssues = [];
  const timeOkA = hasKnownTime(timeMetaA);
  const timeOkB = hasKnownTime(timeMetaB);

  const mirrorRelevant = modeToken === 'MIRROR';
  if (mirrorRelevant) {
    if (!timeOkA) mirrorIssues.push('PRIMARY_TIME_UNKNOWN');
    if (personBLoaded && !timeOkB) mirrorIssues.push('SECONDARY_TIME_UNKNOWN');
    if ((relocationMode || '').toLowerCase() === 'midpoint') {
      mirrorIssues.push('MIDPOINT_NOT_ALLOWED');
    }
    if (relationshipMode && !personBLoaded) {
      mirrorIssues.push('RELATIONSHIP_DATA_MISSING');
    }
  }

  if (wantBalance) {
    if (!timeOkA) balanceIssues.push('PRIMARY_TIME_UNKNOWN');
    if (!relocationApplied || (relocationMode || '').toLowerCase() === 'none') {
      balanceIssues.push('BALANCE_RELOCATION_REQUIRED');
    }
    const relLower = (relocationMode || '').toLowerCase();
    if (relLower === 'midpoint' && !personBLoaded) {
      balanceIssues.push('BALANCE_MIDPOINT_NEEDS_DYAD');
    }
    if (relLower === 'b_local' && !personBLoaded) {
      balanceIssues.push('BALANCE_B_LOCAL_NEEDS_PERSON_B');
    }
    if (personBLoaded && !timeOkB) {
      balanceIssues.push('SECONDARY_TIME_UNKNOWN');
    }
  }

  const readiness = {
    mirror: buildGuard('MIRROR', mirrorIssues),
    balance: wantBalance ? buildGuard('BALANCE', balanceIssues) : { ready: true, issues: [] },
    frames: computeRelocationFrames(relocationMode, relocationApplied, personBLoaded)
  };

  return readiness;
}

function aspectKey(aspect) {
  return `${aspect.p1_name}|${aspect._aspect}|${aspect.p2_name}`;
}

function getOrb(aspect) {
  const value = aspect?._orb ?? aspect?.orb ?? aspect?.orbit;
  const num = Number(value);
  return Number.isFinite(num) ? num : 999;
}

function isPrimaryFramePoint(name) {
  return PRIMARY_FRAME_POINTS.has(name);
}

function isAngle(name) {
  return EXTENDED_ANGLE_POINTS.has(name);
}

function matchCategoryA(aspect) {
  const natal = aspect?.p2_name;
  if (!isPrimaryFramePoint(natal)) return false;
  const type = aspect?._aspect;
  if (!type) return false;
  if (!['conjunction','opposition','square','trine','sextile'].includes(type)) return false;
  const baseLimit = HARD_ASPECT_TYPES.has(type) ? 3 : 2;
  const limit = baseLimit - 0.5;
  return getOrb(aspect) <= limit;
}

function matchCategoryB(aspect) {
  const p1 = aspect?.p1_name;
  const p2 = aspect?.p2_name;
  if (!p1 || !p2) return false;
  if (!HARD_ASPECT_TYPES.has(aspect?._aspect)) return false;
  const p1Personal = PERSONAL_SET.has(p1);
  const p2Personal = PERSONAL_SET.has(p2);
  const p1Tectonic = TECTONIC_SET.has(p1);
  const p2Tectonic = TECTONIC_SET.has(p2);
  if (!((p1Personal && p2Tectonic) || (p2Personal && p1Tectonic))) return false;
  const slowInPair = (p1 === 'Saturn' || p1 === 'Pluto' || p2 === 'Saturn' || p2 === 'Pluto');
  const limit = slowInPair ? 2 : 2.5;
  return getOrb(aspect) <= limit;
}

function matchCategoryC(aspect, hardTargets) {
  const p1 = aspect?.p1_name;
  const p2 = aspect?.p2_name;
  if (!p1 || !p2) return false;
  if (!BENEFIC_PLANETS.has(p1) && !BENEFIC_PLANETS.has(p2)) return false;
  const type = aspect?._aspect;
  if (!SOFT_ASPECT_TYPES.has(type)) return false;
  const orb = getOrb(aspect);
  if (orb > 2) return false;
  const targetAngleOrLum = isPrimaryFramePoint(p2);
  const hasHardCompanion = hardTargets.has(p2);
  const touchesSaturnPluto = (p1 === 'Saturn' || p1 === 'Pluto' || p2 === 'Saturn' || p2 === 'Pluto');
  if (!targetAngleOrLum && !(touchesSaturnPluto && hasHardCompanion)) {
    return false;
  }
  if (!targetAngleOrLum && hasHardCompanion && orb > 1.5) return false;
  return true;
}

function matchCategoryD(aspect, hardTargets) {
  const type = aspect?._aspect;
  if (!SPECIAL_ASPECT_TYPES.has(type)) return false;
  if (getOrb(aspect) > 1) return false;
  const p2 = aspect?.p2_name;
  const isAnchored = isPrimaryFramePoint(p2) || isAngle(p2) || hardTargets.has(p2);
  return Boolean(isAnchored);
}

function buildPoeticPacketEntry(aspect, category, phaseLookup) {
  const key = aspectKey(aspect);
  let phaseInfo = null;
  if (phaseLookup) {
    if (typeof phaseLookup.get === 'function') {
      phaseInfo = phaseLookup.get(key) || null;
    } else if (typeof phaseLookup === 'object') {
      phaseInfo = phaseLookup[key] || null;
    }
  }
  let phase = null;
  if (phaseInfo && phaseInfo.phase) {
    if (phaseInfo.phase === '↑') phase = 'applying';
    else if (phaseInfo.phase === '↓') phase = 'separating';
    else phase = 'steady';
  }
  return {
    transit_point: aspect.p1_name,
    natal_point: aspect.p2_name,
    aspect_type: aspect._aspect,
    orb: Number(getOrb(aspect).toFixed(2)),
    phase,
    natal_house: aspect.p2_house ?? null,
    relocated_house: aspect.house_target ?? null,
    angle_flag: isAngle(aspect.p2_name) || isAngle(aspect.p1_name),
    category,
    intensity: typeof aspect.weight_final === 'number' ? +aspect.weight_final.toFixed(3) : null,
    retrograde: Boolean(aspect.p1_retrograde || aspect.p2_retrograde)
  };
}

function selectPoeticAspects(enriched, options = {}) {
  const {
    isBalance = false,
    previous = null,
    phaseLookup = new Map()
  } = options;

  const pool = Array.isArray(enriched?.filtered) ? enriched.filtered : [];
  const limits = isBalance ? { min: 8, max: 12 } : { min: 5, max: 9 };
  if (!pool.length) {
    return {
      aspects: [],
      counts: { total: 0, category: { A:0, B:0, C:0, D:0 } },
      limits,
      note: 'Plain weather; signal diffuse'
    };
  }

  const used = new Set();
  const candidates = [];
  const hardTargets = new Map();
  const categoryCounts = { A:0, B:0, C:0, D:0 };

  function register(aspect, category) {
    const key = aspectKey(aspect);
    if (used.has(key)) return;
    const orb = getOrb(aspect);
    used.add(key);
    candidates.push({ aspect, category, key, orb });
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    if (HARD_ASPECT_TYPES.has(aspect._aspect)) {
      hardTargets.set(aspect.p2_name, (hardTargets.get(aspect.p2_name) || 0) + 1);
    }
  }

  for (const aspect of pool) {
    if (matchCategoryA(aspect)) register(aspect, 'A');
  }
  for (const aspect of pool) {
    if (matchCategoryB(aspect)) register(aspect, 'B');
  }
  for (const aspect of pool) {
    if (matchCategoryC(aspect, hardTargets)) register(aspect, 'C');
  }
  for (const aspect of pool) {
    if (matchCategoryD(aspect, hardTargets)) register(aspect, 'D');
  }

  if (!candidates.length) {
    return {
      aspects: [],
      counts: { total: 0, category: categoryCounts },
      limits,
      note: 'Plain weather; signal diffuse'
    };
  }

  const categoryPriority = { A:0, B:1, C:2, D:3 };
  const stackCounts = new Map();
  candidates.forEach(c => {
    const target = c.aspect.p2_name;
    stackCounts.set(target, (stackCounts.get(target) || 0) + 1);
  });
  const previousTargets = new Set((previous || []).map(p => p.natal_point));

  candidates.forEach(c => {
    const target = c.aspect.p2_name;
    let score = Math.max(0, 6 - Math.min(c.orb, 6)) * 12;
    if (isPrimaryFramePoint(target)) score += 80;
    else if (LUMINARIES_SET.has(target)) score += 70;
    else if (isAngle(target)) score += 60;
    if (HARD_ASPECT_TYPES.has(c.aspect._aspect)) score += 30;
    const stack = stackCounts.get(target) || 0;
    if (stack > 1) score += stack * 5;
    if (previousTargets.has(target)) score += 4;
    if (c.category === 'C' && hardTargets.has(target)) score += 15;
    if (c.category === 'D') score -= 10;
    score -= (categoryPriority[c.category] || 0) * 5;
    c.score = score;
    c.priority = categoryPriority[c.category] || 0;
  });

  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (b.score !== a.score) return b.score - a.score;
    return a.orb - b.orb;
  });

  const final = [];
  const hardSelected = new Set();
  const seenKeys = new Set();
  for (const cand of candidates) {
    if (final.length >= limits.max) break;
    if (seenKeys.has(cand.key)) continue;
    const target = cand.aspect.p2_name;
    if (cand.category === 'C') {
      const targetAngle = isPrimaryFramePoint(target);
      const hasHard = hardSelected.has(target);
      if (!targetAngle && !hasHard) continue;
    }
    if (cand.category === 'D') {
      const targetAngle = isPrimaryFramePoint(target) || isAngle(target);
      const hasHard = hardSelected.has(target);
      if (!targetAngle && !hasHard) continue;
    }
    final.push(cand);
    seenKeys.add(cand.key);
    if (HARD_ASPECT_TYPES.has(cand.aspect._aspect)) {
      hardSelected.add(target);
    }
  }

  if (final.length < Math.min(limits.min, candidates.length)) {
    for (const cand of candidates) {
      if (final.length >= Math.min(limits.min, limits.max)) break;
      if (seenKeys.has(cand.key)) continue;
      final.push(cand);
      seenKeys.add(cand.key);
    }
  }

  const packets = final.map(c => buildPoeticPacketEntry(c.aspect, c.category, phaseLookup));
  const note = packets.length === 0
    ? 'Plain weather; signal diffuse'
    : (packets.length < limits.min ? 'Signal is light and scattered; showing only high-confidence contacts.' : null);

  return {
    aspects: packets,
    counts: {
      total: pool.length,
      category: categoryCounts,
      selected: packets.length
    },
    limits,
    note
  };
}

// Derive time provenance for a subject based on presence of hour/minute
function deriveTimeMeta(subject) {
  const h = subject?.hour;
  const m = subject?.minute;
  const known = (h !== undefined && h !== null) && (m !== undefined && m !== null);
  const pad2 = (n)=> String(n).padStart(2, '0');
  return {
    birth_time_known: !!known,
    time_precision: known ? 'exact' : 'unknown',
    effective_time_used: known ? `${pad2(h)}:${pad2(m)}` : undefined
  };
}

// Canonicalize an incoming time policy token
function canonicalizeTimePolicy(raw) {
  if (!raw) return 'user_provided';
  const t = String(raw).trim().toLowerCase();
  if (t === 'planetary_only' || t === 'planetary-only' || t === 'planetary') return 'planetary_only';
  if (t === 'whole_sign' || t === 'whole-sign' || t === 'wholesign' || t === 'whole') return 'whole_sign';
  if (t === 'sensitivity_scan' || t === 'sensitivity-scan' || t === 'scan') return 'sensitivity_scan';
  return 'user_provided';
}

// Derive time provenance but honor explicit time_policy when birth time is unknown
function deriveTimeMetaWithPolicy(subject, timePolicy) {
  const base = deriveTimeMeta(subject);
  const unknown = !base.birth_time_known;
  if (!unknown) return base;
  const policy = canonicalizeTimePolicy(timePolicy);
  if (policy === 'planetary_only') {
    return { birth_time_known: false, time_precision: 'unknown', effective_time_used: undefined };
  }
  if (policy === 'whole_sign') {
    return { birth_time_known: false, time_precision: 'noon_fallback', effective_time_used: '12:00' };
  }
  if (policy === 'sensitivity_scan') {
    return { birth_time_known: false, time_precision: 'range_scan', effective_time_used: undefined };
  }
  return base;
}

function deriveTransitTimeSpecFromBody(body, fallbackTimezone, options = {}) {
  const raw = body?.transit_time;
  const defaultZone = normalizeTimezone(fallbackTimezone || 'UTC') || 'UTC';

  const coerceZone = (candidate) => {
    if (!candidate || typeof candidate !== 'string') return defaultZone;
    const normalized = normalizeTimezone(candidate);
    return normalized || defaultZone;
  };

  const makeSpec = (hour, minute, zone) => ({
    hour: Math.max(0, Math.min(23, Math.trunc(hour))),
    minute: Math.max(0, Math.min(59, Math.trunc(minute))),
    timezone: coerceZone(zone)
  });

  const requestPolicyRaw = raw?.time_policy || raw?.policy || raw?.mode;
  const canonicalRequestPolicy = requestPolicyRaw ? String(requestPolicyRaw).toLowerCase() : null;

  const tryNowSpec = (zone, sourceTag) => {
    const now = DateTime.now().setZone(coerceZone(zone));
    if (!now.isValid) return null;
    return {
      spec: { hour: now.hour, minute: now.minute, timezone: now.zoneName },
      policy: 'now',
      source: sourceTag
    };
  };

  if (raw && typeof raw === 'object') {
    const zone = raw.timezone || defaultZone;
    const hour = Number(raw.hour);
    const minute = Number(raw.minute);
    const hasExplicitTime = Number.isFinite(hour) && Number.isFinite(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;

    if (canonicalRequestPolicy === 'now') {
      const nowSpec = tryNowSpec(zone, 'request_now');
      if (nowSpec) return nowSpec;
    }

    if (hasExplicitTime) {
      return {
        spec: makeSpec(hour, minute, zone),
        policy: canonicalRequestPolicy && canonicalRequestPolicy !== 'explicit' ? canonicalRequestPolicy : 'explicit',
        source: 'request_explicit'
      };
    }
  }

  if (options.isNowMode) {
    const autoNow = tryNowSpec(defaultZone, 'auto_now');
    if (autoNow) return autoNow;
  }

  return {
    spec: makeSpec(12, 0, defaultZone),
    policy: 'noon_default',
    source: 'default_noon'
  };
}

function validateSubjectLean(s = {}) {
  const req = ['year','month','day','hour','minute','latitude','longitude'];
  const missing = req.filter(k => s[k] === undefined || s[k] === null || s[k] === '');
  return { isValid: missing.length === 0, message: missing.length ? `Missing: ${missing.join(', ')}` : 'ok' };
}

// --- Helper Functions ---

/**
 * Parses coordinate strings in various formats (DMS, decimal)
 * Accepts: "40°1'N, 75°18'W", "40° 1' N, 75° 18' W", optional seconds and unicode primes.
 * @param {string} coordString - Coordinate string.
 * @returns {{lat: number, lon: number}|null} Parsed coordinates or null
 */
function parseCoordinates(coordString) {
  if (!coordString || typeof coordString !== 'string') return null;

  // Normalize common unicode variants
  let s = coordString.trim()
    .replace(/º/g, '°')    // alt degree symbol
    .replace(/[’′]/g, "'") // prime to apostrophe
    .replace(/[”″]/g, '"'); // double prime to quote

  // Flexible DMS pattern with optional minutes/seconds and spaces
  // Groups: 1=latDeg,2=latMin?,3=latSec?,4=latHem,5=lonDeg,6=lonMin?,7=lonSec?,8=lonHem
  const DMS = /^\s*(\d{1,3})(?:\s*°\s*(\d{1,2})(?:['"]?\s*([\d.]+))?)?\s*([NS])\s*,\s*(\d{1,3})(?:\s*°\s*(\d{1,2})(?:['"]?\s*([\d.]+))?)?\s*([EW])\s*$/i;
  const m = DMS.exec(s);
  if (m) {
    const dmsToDec = (d, m, sec, hem) => {
      const deg = parseInt(d, 10) || 0;
      const min = parseInt(m || '0', 10) || 0;
      const secF = parseFloat(sec || '0') || 0;
      let val = deg + min / 60 + secF / 3600;
      if (/S|W/i.test(hem)) val *= -1;
      return val;
    };
    const lat = dmsToDec(m[1], m[2], m[3], m[4]);
    const lon = dmsToDec(m[5], m[6], m[7], m[8]);
    if (isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      logger.info('Parsed DMS coordinates', { input: coordString, output: { lat, lon } });
      return { lat, lon };
    }
  }

  // Decimal fallback: "40.0167, -75.3000"
  const DEC = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;
  const d = DEC.exec(s);
  if (d) {
    const lat = parseFloat(d[1]);
    const lon = parseFloat(d[2]);
    if (isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat, lon };
    }
  }

  return null;
}

/**
 * Builds standard headers for API requests.
 * @returns {Object} Headers object.
 * @throws {Error} if the RapidAPI key is not configured.
 */
function buildHeaders() {
  const rawKey = process.env.RAPIDAPI_KEY;
  const key = rawKey && String(rawKey).trim();
  if (!key) {
    if (!loggedMissingRapidApiKey) {
      logger.error('RAPIDAPI_KEY environment variable is not configured.');
      loggedMissingRapidApiKey = true;
    }
    throw new Error('RAPIDAPI_KEY environment variable is not configured.');
  }
  // Log masked key for debugging (show only first/last 4 chars)
  const maskedKey = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : '****';
  logger.debug(`Building headers with RAPIDAPI_KEY: ${maskedKey}`);
  return {
    "content-type": "application/json",
    "x-rapidapi-key": key,
    "x-rapidapi-host": "astrologer.p.rapidapi.com",
  };
}

/**
 * Validates a subject object for all required fields.
 * @param {Object} subject - The subject data to validate.
 * @returns {{isValid: boolean, message: string}}
 */
function validateSubject(subject) {
  const baseReq = ['year','month','day','hour','minute','name','zodiac_type'];
  const baseMissing = baseReq.filter(f => subject[f] === undefined || subject[f] === null || subject[f] === '');
  // Accept either coords-mode OR city-mode
  const hasCoords = (typeof subject.latitude === 'number') && (typeof subject.longitude === 'number') && !!subject.timezone;
  const hasCity = !!(subject.city && subject.nation);
  const okMode = hasCoords || hasCity;
  const modeMsg = okMode ? '' : 'coords(lat,lon,timezone) OR city,nation required';
  const missingMsg = baseMissing.length ? `Missing: ${baseMissing.join(', ')}` : '';
  return { isValid: baseMissing.length === 0 && okMode, message: [missingMsg, modeMsg].filter(Boolean).join('; ') || 'ok' };
}

/**
 * Normalizes subject data from various input formats to the API's `SubjectModel`.
 * @param {Object} data - Raw subject data.
 * @returns {Object} Normalized subject model.
 */
function normalizeSubjectData(data) {
  if (!data || typeof data !== 'object') return {};

  const normalized = {
    name: data.name || 'Subject',
    year: data.year, month: data.month, day: data.day,
    hour: data.hour, minute: data.minute,
    city: data.city, nation: data.nation,
    latitude: data.latitude ?? data.lat,
    longitude: data.longitude ?? data.lon ?? data.lng,
    timezone: normalizeTimezone(data.timezone || data.tz_str),
    zodiac_type: data.zodiac_type || data.zodiac || 'Tropic',
  };

  // Convert legacy fields
  if (data.date) {
    const [m, d, y] = data.date.split('-').map(Number);
    normalized.year = normalized.year || y;
    normalized.month = normalized.month || m;
    normalized.day = normalized.day || d;
  }
  if (data.time) {
    const [h, min] = data.time.split(':').map(Number);
    normalized.hour = normalized.hour || h;
    normalized.minute = normalized.minute || min;
  }
  // Support birth_date / birth_time aliases
  if (data.birth_date && (!normalized.year || !normalized.month || !normalized.day)) {
    try {
      const [y, m, d] = String(data.birth_date).split('-').map(Number);
      if (y && m && d) { normalized.year = y; normalized.month = m; normalized.day = d; }
    } catch(_) {}
  }
  if (data.birth_time && (!normalized.hour || !normalized.minute)) {
    try {
      const [h, min] = String(data.birth_time).split(':').map(Number);
      if (h !== undefined && min !== undefined) { normalized.hour = h; normalized.minute = min; }
    } catch(_) {}
  }
  // City / Country aliases
  if (!normalized.city) {
    normalized.city = data.birth_city || data.city_name || data.town || normalized.city;
  }
  if (!normalized.nation) {
    normalized.nation = data.birth_country || data.country || data.country_code || normalized.nation;
  }
  // Timezone aliases
  if (!normalized.timezone) {
    normalized.timezone = normalizeTimezone(data.offset || data.tz || data.tzid || data.time_zone || normalized.timezone);
  }
  if (data.coordinates) {
    const [lat, lng] = data.coordinates.split(',').map(s => parseFloat(s.trim()));
    normalized.latitude = normalized.latitude || lat;
    normalized.longitude = normalized.longitude || lng;
  }

  // Handle coordinate parsing using the enhanced parseCoordinates function
  if (!normalized.latitude || !normalized.longitude) {
    // Check various field names for coordinate data
    const coordFields = ['astro', 'coords', 'coordinate', 'coord', 'location'];
    let coordString = null;
    
    for (const field of coordFields) {
      if (data[field] && typeof data[field] === 'string') {
        coordString = data[field];
        break;
      }
    }
    
    // If we found a coordinate string, parse it
    if (coordString) {
      try {
        const parsed = parseCoordinates(coordString);
        if (parsed && parsed.lat !== undefined && parsed.lon !== undefined) {
          normalized.latitude = normalized.latitude ?? parsed.lat;
          normalized.longitude = normalized.longitude ?? parsed.lon;
          logger.info('Coordinate parsing successful', { 
            input: coordString, 
            output: { lat: parsed.lat, lon: parsed.lon } 
          });
        } else {
          logger.warn('Coordinate parsing failed', { input: coordString });
        }
      } catch (error) {
        logger.error('Coordinate parsing error', { error: error.message, input: coordString });
      }
    }
  }

  // If lat/lon are still strings, try to parse them individually
  if (typeof normalized.latitude === 'string' || typeof normalized.longitude === 'string') {
    try {
      const coordString = `${normalized.latitude},${normalized.longitude}`;
      const parsed = parseCoordinates(coordString);
      if (parsed && parsed.lat !== undefined && parsed.lon !== undefined) {
        normalized.latitude = parsed.lat;
        normalized.longitude = parsed.lon;
        logger.info('Individual coordinate parsing successful', { 
          input: coordString, 
          output: { lat: parsed.lat, lon: parsed.lon } 
        });
      }
    } catch (error) {
      logger.error('Individual coordinate parsing error', { 
        error: error.message, 
        lat: normalized.latitude, 
        lon: normalized.longitude 
      });
    }
  }

  return normalized;
}

/**
 * Convert internal normalized subject shape to Astrologer API Subject Model.
 * Internal uses latitude, longitude, timezone; API expects lat, lng, tz_str.
 * Keeps core birth fields and optional houses_system_identifier.
 * @param {Object} s - Internal subject
 * @param {Object} pass - Optional pass-through config (may include houses_system_identifier)
 * @returns {Object} API SubjectModel
 */
function subjectToAPI(s = {}, pass = {}) {
  if (!s) return {};
  const hasCoords = (typeof s.latitude === 'number' || typeof s.lat === 'number')
    && (typeof s.longitude === 'number' || typeof s.lon === 'number' || typeof s.lng === 'number')
    && (s.timezone || s.tz_str);
  const hasCity = !!(s.city && s.nation);
  const tzNorm = normalizeTimezone(s.timezone || s.tz_str);
  const apiSubject = {
    name: s.name,
    year: s.year, month: s.month, day: s.day,
    hour: s.hour, minute: s.minute,
    zodiac_type: s.zodiac_type || 'Tropic'
  };
  // Send coordinates if available (API expects latitude/longitude/timezone field names)
  const includeCoords = hasCoords && !pass.force_city_mode && !pass.suppress_coords;
  if (includeCoords) {
    apiSubject.latitude = s.latitude ?? s.lat;
    apiSubject.longitude = s.longitude ?? s.lon ?? s.lng;
    apiSubject.timezone = tzNorm;
  }
  
  // Send city/nation when requested or when coords are absent
  // Notes: Some natal endpoints validate presence of city field even if lat/lng/tz provided.
  // pass.require_city forces inclusion alongside coords; we avoid adding geonames_username
  // when coords are present to reduce resolver ambiguity.
  const wantCity = hasCity && (pass.require_city || !includeCoords);
  if (wantCity) {
    apiSubject.city = s.state ? `${s.city}, ${s.state}` : s.city;
    apiSubject.nation = s.nation;
    // Only include geonames_username when operating in pure city mode (no coords) unless explicitly forced
    if ((!includeCoords || pass.force_city_mode) && process.env.GEONAMES_USERNAME && !pass?.suppress_geonames) {
      (apiSubject).geonames_username = process.env.GEONAMES_USERNAME;
    }
  }
  const hsys = s.houses_system_identifier || pass.houses_system_identifier;
  if (hsys) apiSubject.houses_system_identifier = hsys;
  return apiSubject;
}

// Helper: call natal endpoints with formation fallback
async function callNatal(endpoint, subject, headers, pass = {}, description = 'Natal call'){
  const hasCoords = !!(subject.latitude && subject.longitude && subject.timezone);
  const geonamesUser = process.env.GEONAMES_USERNAME || subject.geonames_username;
  const hasGeonames = !!geonamesUser;
  const canTryCity = !!(subject.city && subject.nation);
  const chartPrefs = endpoint === API_ENDPOINTS.BIRTH_CHART ? resolveChartPreferences(pass) : null;

  let lastError = null;

  // Preferred: city + GeoNames so RapidAPI can resolve the locality deterministically
  if (canTryCity) {
    const payloadCity = { subject: subjectToAPI(subject, { ...pass, require_city: true, force_city_mode: true, suppress_coords: true, suppress_geonames: !hasGeonames }) };
    if (hasGeonames && payloadCity.subject && !payloadCity.subject.geonames_username && !pass?.suppress_geonames) {
      payloadCity.subject.geonames_username = geonamesUser;
    }
    if (chartPrefs) Object.assign(payloadCity, chartPrefs);
    try {
      return await apiCallWithRetry(endpoint, { method: 'POST', headers, body: JSON.stringify(payloadCity) }, `${description} (city-first)`);
    } catch (eCity) {
      lastError = eCity;
      logger.warn(`City/geonames mode failed for ${description}, falling back to coordinates`, { error: eCity.message });
    }
  }

  // Fallback: coordinates (include city when available to satisfy validators)
  if (hasCoords) {
    const payloadCoords = { subject: subjectToAPI(subject, { ...pass, require_city: canTryCity, force_city_mode: false, suppress_coords: false, suppress_geonames: true }) };
    if (chartPrefs) Object.assign(payloadCoords, chartPrefs);
    try {
      return await apiCallWithRetry(endpoint, { method: 'POST', headers, body: JSON.stringify(payloadCoords) }, description);
    } catch (eCoords) {
      lastError = eCoords;
      logger.warn(`Coords mode failed for ${description}`, { error: eCoords.message });
    }
  }

  if (lastError) {
    const geoNote = !hasGeonames && canTryCity ? ' (Note: GEONAMES_USERNAME not configured for fallback city resolution)' : '';
    throw new Error(`${description} failed: ${lastError.message}${geoNote}`);
  }

  throw new Error(`No valid location data provided for ${description}. Need either city+geonames_username or coordinates+timezone.`);
}

// ---- Aspect Filtering & Hook Extraction (refined) ----
// Aspect classes
const ASPECT_CLASS = {
  major: new Set(['conjunction','opposition','square','trine','sextile']),
  minor: new Set(['quincunx','sesquiquadrate','semi-square','semi-sextile']),
  harmonic: new Set(['quintile','biquintile'])
};

// DEPRECATED: Legacy orb caps - replaced by lib/config/orb-profiles.js
// These constants are no longer used in the filtering/weighting pipeline
// Kept for reference only - DO NOT USE
const ASPECT_ORB_CAPS_LEGACY = {
  conjunction: 8,
  opposition: 8,
  square: 7,
  trine: 7,
  sextile: 5,
  quincunx: 3,
  sesquiquadrate: 3,
  'semi-square': 2,
  'semi-sextile': 2,
  quintile: 2,
  biquintile: 2
};

// DEPRECATED: Legacy body class caps - replaced by orb-profiles.js modifiers
// These constants are no longer used in the filtering/weighting pipeline
// Kept for reference only - DO NOT USE
const BODY_CLASS_CAPS_LEGACY = {
  luminary: 12,
  personal: 8,
  social: 7,      // Jupiter / Saturn
  outer: 6,
  angle: 8,
  point: 5,       // Chiron, Nodes, Lilith
  other: 6
};

const RETURN_BODIES = new Set(['Saturn','Jupiter','Chiron','Mean_Node','Mean_South_Node','True_Node','True_South_Node']);
const POINT_BODIES = new Set([
  'Ascendant','Medium_Coeli','Descendant','Imum_Coeli',
  'Mean_Node','True_Node','Mean_South_Node','True_South_Node',
  'Chiron','Mean_Lilith'
]); // Ensure True nodes & all angles included
const TECTONIC_SET = new Set(['Saturn','Uranus','Neptune','Pluto','Chiron','Mean_Node','True_Node','Mean_South_Node','True_South_Node']);

const PRIMARY_FRAME_POINTS = new Set(['Sun','Moon','Ascendant','Medium_Coeli']);
const LUMINARIES_SET = new Set(['Sun','Moon']);
const EXTENDED_ANGLE_POINTS = new Set(['Ascendant','Descendant','Medium_Coeli','Imum_Coeli']);
const BENEFIC_PLANETS = new Set(['Jupiter','Venus']);
const HARD_ASPECT_TYPES = new Set(['conjunction','opposition','square']);
const SOFT_ASPECT_TYPES = new Set(['conjunction','trine','sextile']);
const SPECIAL_ASPECT_TYPES = new Set(['quintile','biquintile','semi-square','sesquiquadrate','quincunx']);

function classifyAspectName(name){
  if (ASPECT_CLASS.major.has(name)) return 'major';
  if (ASPECT_CLASS.minor.has(name)) return 'minor';
  if (ASPECT_CLASS.harmonic.has(name)) return 'harmonic';
  return 'other';
}

// DEPRECATED: adjustOrbCapForSpecials - replaced by orb-profiles.js getEffectiveOrb()
// This function is no longer used in the filtering/weighting pipeline
// Modifiers (Moon +1°, outer-to-personal -1°) now applied via orb profiles
// Kept for reference only - DO NOT USE
const PERSONAL_SET = new Set(['Sun','Moon','Mercury','Venus','Mars']);
const OUTER_SET = new Set(['Jupiter','Saturn','Uranus','Neptune','Pluto']);
function adjustOrbCapForSpecials_DEPRECATED(baseCap, p1, p2){
  let cap = baseCap;
  if (p1 === 'Moon' || p2 === 'Moon') cap += 1; // Moon +1°
  const outerPersonal = (OUTER_SET.has(p1) && PERSONAL_SET.has(p2)) || (OUTER_SET.has(p2) && PERSONAL_SET.has(p1));
  if (outerPersonal) cap -= 1; // Outer → personal −1°
  if (cap < 1) cap = 1;
  return cap;
}

function bodyClass(name){
  switch(name){
    case 'Sun':
    case 'Moon': return 'luminary';
    case 'Mercury':
    case 'Venus':
    case 'Mars': return 'personal';
    case 'Jupiter':
    case 'Saturn': return 'social';
    case 'Uranus':
    case 'Neptune':
    case 'Pluto': return 'outer';
    case 'Ascendant':
    case 'Medium_Coeli':
    case 'Descendant':
    case 'Imum_Coeli': return 'angle';
    case 'Chiron':
    case 'Mean_Node':
  case 'True_Node':
    case 'Mean_South_Node':
  case 'True_South_Node':
    case 'Mean_Lilith': return 'point';
    default: return 'other';
  }
}

function displayBodyName(raw){
  const map = {
    'Medium_Coeli': 'MC',
  'Imum_Coeli': 'IC',
    'Mean_Node': 'North Node',
    'Mean_South_Node': 'South Node',
  'True_Node': 'North Node (True)',
  'True_South_Node': 'South Node (True)',
    'Mean_Lilith': 'Lilith'
  };
  return map[raw] || raw;
}

function weightAspect(a, orbsProfile = 'wm-spec-2025-09'){
  const { getEffectiveOrb } = require('../config/orb-profiles');
  const base = a._class === 'major' ? 1.0 : a._class === 'minor' ? 0.55 : a._class === 'harmonic' ? 0.45 : 0.4;
  const effectiveCap = getEffectiveOrb(a._aspect, a.p1_name, a.p2_name, orbsProfile);
  const tightness = a._orb != null ? Math.max(0, 1 - (a._orb / effectiveCap)) : 0;
  const lumOrAngle = (a.p1_isLuminary || a.p2_isLuminary || a.p1_isAngle || a.p2_isAngle) ? 1.15 : 1.0;
  return +(base * tightness * lumOrAngle).toFixed(4);
}

const WEIGHTS_LEGEND = Object.freeze({ major: 1.0, minor: 0.55, harmonic: 0.45, fallback: 0.4 });

function enrichDailyAspects(rawList, orbsProfile = 'wm-spec-2025-09'){
  const { getEffectiveOrb } = require('../config/orb-profiles');
  if (!Array.isArray(rawList)) return { raw: [], filtered: [], hooks: [], rejections: [], counts: { raw:0, filtered:0, hooks:0 } };
  const enriched = [];
  const rejections = [];
  for (const a of rawList){
    const aspectName = (a.aspect || '').toLowerCase();
    const orb = typeof a.orbit === 'number' ? a.orbit : (typeof a.orb === 'number' ? a.orb : null);
    const p1 = a.p1_name; const p2 = a.p2_name;
    const sameBody = p1 === p2;
    const cls = classifyAspectName(aspectName);
    const p1Class = bodyClass(p1);
    const p2Class = bodyClass(p2);

    // Use orb profile instead of legacy caps
    const effectiveCap = getEffectiveOrb(aspectName, p1, p2, orbsProfile);
    let dropReason = '';

    if (sameBody) {
      if (!['conjunction','opposition'].includes(aspectName)) dropReason = 'OUT_OF_CAP'; // treat non-return self aspect as out-of-scope
      else if (!(RETURN_BODIES.has(p1) || ['Sun','Moon'].includes(p1))) dropReason = 'OUT_OF_CAP';
    }
    // FIX: Use absolute value of orb for comparison (orb can be negative)
    if (!dropReason && orb != null && Math.abs(orb) > effectiveCap) dropReason = 'OUT_OF_CAP';

    const rec = {
      ...a,
      _aspect: aspectName,
      _orb: orb,
      _class: cls,
      _sameBody: sameBody,
      p1_display: displayBodyName(p1),
      p2_display: displayBodyName(p2),
      p1_isLuminary: ['Sun','Moon'].includes(p1),
      p2_isLuminary: ['Sun','Moon'].includes(p2),
      p1_isAngle: ['Ascendant','Medium_Coeli','Descendant','Imum_Coeli'].includes(p1),
      p2_isAngle: ['Ascendant','Medium_Coeli','Descendant','Imum_Coeli'].includes(p2),
      p1_class: p1Class,
      p2_class: p2Class,
      effective_cap: effectiveCap,
      p1_house: a.p1_house ?? a.p1_house_num ?? null,
      p2_house: a.p2_house ?? a.p2_house_num ?? a.house ?? null,
      house_target: a.p2_house ?? a.house_target ?? null
    };
    if (dropReason){
      rejections.push({ aspect: `${p1} ${aspectName} ${p2}`, reason: dropReason, orb });
    } else {
      rec._weight = weightAspect(rec, orbsProfile);
      rec.weight_final = rec._weight;
      enriched.push(rec);
    }
  }

  // Post-weight filtering for weak weight
  const strong = []; 
  for (const r of enriched){
    if ((r._weight || 0) < 0.15){
      rejections.push({ aspect: `${r.p1_name} ${r._aspect} ${r.p2_name}`, reason: 'WEAK_WEIGHT', orb: r._orb });
    } else strong.push(r);
  }

  // Diversity & duplicate pair filtering
  const pairSeen = new Set();
  const primaryCounts = new Map(); // luminary + angle dominance guard
  const filtered = [];
  for (const r of strong){
    const pairKey = [r.p1_name, r.p2_name].sort().join('|') + '|' + r._aspect;
    if (pairSeen.has(pairKey)) { rejections.push({ aspect: `${r.p1_name} ${r._aspect} ${r.p2_name}`, reason: 'DUPLICATE_PAIR', orb: r._orb }); continue; }
    pairSeen.add(pairKey);
    const primaries = [];
    if (r.p1_isLuminary || r.p1_isAngle) primaries.push(r.p1_name);
    if (r.p2_isLuminary || r.p2_isAngle) primaries.push(r.p2_name);
    let primaryDup = false;
    for (const p of primaries){
      const c = (primaryCounts.get(p) || 0) + 1;
      primaryCounts.set(p, c);
      if (c > 3){ primaryDup = true; }
    }
    if (primaryDup){
      rejections.push({ aspect: `${r.p1_name} ${r._aspect} ${r.p2_name}`, reason: 'PRIMARY_DUP', orb: r._orb });
      continue;
    }
    filtered.push(r);
  }

  // Hook selection prioritisation
  const hookCandidates = filtered.filter(a => {
    const orb = a._orb != null ? a._orb : 6.01;
    const isExact = orb <= 0.5;
    const isTight = orb <= 1.5;
    const isLum = a.p1_isLuminary || a.p2_isLuminary;
    const isAngle = a.p1_isAngle || a.p2_isAngle;
    const isNodeChiron = ['Mean_Node','Mean_South_Node','Chiron'].includes(a.p1_name) || ['Mean_Node','Mean_South_Node','Chiron'].includes(a.p2_name);
    if (isExact) return true;
    if (isLum && orb <= 3) return true;
    if (isAngle && orb <= 2.5) return true;
    if (isNodeChiron && orb <= 2) return true;
    if (a._class === 'major' && isTight) return true;
    return false;
  });

  const hooks = (hookCandidates.length ? hookCandidates : filtered.slice(0, 8))
    .slice()
    .sort((a,b)=>{
      const oa = a._orb ?? 6.01; const ob = b._orb ?? 6.01;
      const ea = oa <= 0.5; const eb = ob <= 0.5;
      if (ea !== eb) return ea ? -1 : 1;
      const la = a.p1_isLuminary || a.p2_isLuminary; const lb = b.p1_isLuminary || b.p2_isLuminary;
      if (la !== lb) return la ? -1 : 1;
      if (oa !== ob) return oa - ob;
      return (b._weight||0) - (a._weight||0);
    })
    .slice(0,12);

  return {
    raw: rawList,
    filtered,
    hooks,
    rejections,
    counts: { raw: rawList.length, filtered: filtered.length, hooks: hooks.length, rejected: rejections.length }
  };
}


// Canonicalize incoming mode tokens: trim, uppercase, replace spaces/dashes with single underscore, collapse repeats
function canonicalizeMode(raw) {
  if (!raw) return '';
  return raw.toString()
    .trim()
    .replace(/[-\s]+/g, '_')
    .replace(/__+/g, '_')
    .toUpperCase();
}

// Build field-by-field validation map for strict subject requirements
const STRICT_REQUIRED_FIELDS = ['year','month','day','hour','minute','name','zodiac_type'];
function validateSubjectStrictWithMap(subject) {
  const errors = {};
  STRICT_REQUIRED_FIELDS.forEach(f => {
    if (subject[f] === undefined || subject[f] === null || subject[f] === '') {
      errors[f] = 'Missing or empty';
    }
  });
  return { isValid: Object.keys(errors).length === 0, errors };
}

/**
 * Robustly calls an API endpoint with retry logic and error handling.
 * @param {string} url - The API endpoint URL.
 * @param {Object} options - Fetch options.
 * @param {string} operation - A description for logging.
 * @param {number} maxRetries - Max retry attempts.
 * @returns {Promise<Object>} The parsed JSON response.
 */
async function apiCallWithRetry(url, options, operation, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`API call attempt ${attempt}/${maxRetries} for ${operation}`);
      const response = await fetch(url, options);

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          // Capture status + body once
          const status = response.status;
          let rawText = '';
          try { rawText = await response.text(); } catch { rawText = 'Unable to read response body'; }
          let parsedMessage = rawText;
          try {
            const j = JSON.parse(rawText);
            if (j.message) parsedMessage = j.message;
          } catch(_) {/* keep rawText */}
          // Special handling for auth/subscription issues
            if (status === 401 || status === 403) {
              const hint = parsedMessage && /not subscribed|unauthorized|invalid api key|api key is invalid/i.test(parsedMessage)
                ? 'Verify RAPIDAPI_KEY, subscription plan, and that the key matches this API.'
                : 'Authentication / subscription issue likely.';
              logger.error('RapidAPI auth/subscription error', { status, operation, parsedMessage, hint });
              const err = new Error(`RapidAPI access denied (${status}): ${parsedMessage}. ${hint}`);
              err.code = 'RAPIDAPI_SUBSCRIPTION';
              err.status = status;
              err.raw = rawText.slice(0,1200);
              throw err;
            }
          logger.error('Client error (non-retryable)', { status, operation, url, body: rawText.slice(0,1200) });
          const err = new Error(`Client error ${status} for ${operation}`);
          err.code = 'CLIENT_ERROR';
          err.status = status;
          err.raw = rawText.slice(0,1200);
          throw err;
        }
        logger.warn(`API call failed with status ${response.status}. Retrying...`);
        throw new Error(`Server error: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      if (attempt === maxRetries || error.message.includes('Non-retryable')) {
        logger.error(`Failed after ${attempt} attempts: ${error.message}`, { url, operation, code: error.code, status: error.status });
        if (error.code === 'RAPIDAPI_SUBSCRIPTION') throw error; // surface directly
        if (error.code === 'CLIENT_ERROR') throw error;
        const err = new Error(`Service temporarily unavailable. Please try again later.`);
        err.code = 'UPSTREAM_TEMPORARY';
        throw err;
      }
      const delay = Math.pow(2, attempt) * 100 + Math.random() * 100; // Exponential backoff
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

// --- Transit helpers ---
// Coordinate parsing (supports DMS "30°10'N" and decimal)
function parseCoordinate(val){
  if (typeof val === 'number') return val;
  if (typeof val !== 'string') return null;
  const dec = val.trim();
  if (/^-?\d+(?:\.\d+)?$/.test(dec)) return parseFloat(dec);
  // DMS pattern e.g., 30°10'15"N or 30°10'N
  const dms = /^\s*(\d{1,3})[^0-9]+(\d{1,2})?(?:[^0-9]+(\d{1,2}(?:\.\d+)?))?\s*([NnSsEeWw])\s*$/.exec(dec);
  if (dms){
    const d=+dms[1]; const m=dms[2]?+dms[2]:0; const s=dms[3]?+dms[3]:0; const hemi=dms[4];
    const sign=/[SsWw]/.test(hemi)?-1:1; return sign*(d + m/60 + s/3600);
  }
  return null;
}

/**
 * Unified natal chart fetcher - ensures consistent data extraction across all report types
 * Always extracts: chart data, aspects, house cusps, and chart wheels
 * @param {Object} subject - Person data (personA or personB)
 * @param {Object} headers - Request headers
 * @param {Object} pass - Pass-through parameters
 * @param {string} subjectLabel - Label for logging (e.g., 'person_a', 'person_b')
 * @param {string} contextLabel - Context description for logging
 * @returns {Object} Complete natal data with chart, aspects, and metadata
 */
async function fetchNatalChartComplete(subject, headers, pass, subjectLabel, contextLabel) {
  logger.debug(`Fetching complete natal chart for ${subjectLabel} (${contextLabel})`);
  
  // Always use BIRTH_CHART endpoint for complete data
  const natalResponse = await callNatal(
    API_ENDPOINTS.BIRTH_CHART,
    subject,
    headers,
    pass,
    `Birth chart (${subjectLabel}) - ${contextLabel}`
  );
  
  // Sanitize and extract chart data
  const { sanitized: chartData, assets: chartAssets } = sanitizeChartPayload(natalResponse.data || {}, {
    subject: subjectLabel,
    chartType: 'natal',
    scope: 'natal_chart',
  });
  
  // Build complete natal object
  const natalData = {
    details: subject,
    chart: chartData,
    aspects: Array.isArray(natalResponse.aspects) ? natalResponse.aspects : (chartData.aspects || []),
  };
  
  // Extract house cusps for transit-to-natal-house calculations
  if (natalResponse.data) {
    const houseCusps = extractHouseCusps(natalResponse.data);
    if (houseCusps) {
      natalData.chart.house_cusps = houseCusps;
      logger.debug(`Extracted ${houseCusps.length} natal house cusps for ${subjectLabel}:`, houseCusps.map(c => c.toFixed(2)));
    } else {
      logger.warn(`Failed to extract house cusps from natal chart for ${subjectLabel}`);
    }
  }
  
  // Attach chart assets
  const allAssets = [...chartAssets];
  
  // Extract chart wheel SVG from top-level chart field
  if (natalResponse.chart) {
    const { assets: wheelAssets } = sanitizeChartPayload({ chart: natalResponse.chart }, {
      subject: subjectLabel,
      chartType: 'natal',
      scope: 'natal_chart_wheel',
    });
    allAssets.push(...wheelAssets);
  }
  
  // Add all assets to natal data
  if (allAssets.length > 0) {
    natalData.assets = allAssets;
  }
  
  logger.debug(`Natal chart complete for ${subjectLabel}: ${natalData.aspects.length} aspects, ${natalData.chart.house_cusps?.length || 0} house cusps`);
  
  return natalData;
}

async function getTransits(subject, transitParams, headers, pass = {}) {
  if (!transitParams || !transitParams.startDate || !transitParams.endDate) return {};

  const { buildWindowSamples } = require('../../lib/time-sampling');
  const transitsByDate = {};
  const retroFlagsByDate = {}; // body -> retro boolean per date
  const provenanceByDate = {}; // per-day endpoint + formation provenance
  const chartAssets = []; // Collect chart graphics from transit responses

  // Determine sampling timezone: prefer subject.timezone, else UTC
  const ianaTz = subject?.timezone || 'UTC';
  const step = normalizeStep(transitParams.step || 'daily');
  const samplingWindow = buildWindowSamples(
    { start: transitParams.startDate, end: transitParams.endDate, step },
    ianaTz,
    transitParams?.timeSpec || null
  );
  const samples = Array.isArray(samplingWindow?.samples) ? samplingWindow.samples : [];
  const samplingZone = samplingWindow?.zone || ianaTz || 'UTC';
  const timePolicy = transitParams?.timePolicy || 'noon_default';
  const timePrecision = transitParams?.timePrecision || 'minute';
  const relocationMode = transitParams?.relocationMode || null;
  const locationLabelOverride = transitParams?.locationLabel || null;

  const promises = [];
  // Helper: ensure coords/tz from city using GeoNames when needed
  async function ensureCoords(s){
    if (!s) return s;
    const hasCoords = typeof s.latitude === 'number' && typeof s.longitude === 'number' && !!s.timezone;
    if (hasCoords) return s;
    if (s.city && s.nation){
      try {
        const r = await geoResolve({ city: s.city, state: s.state, nation: s.nation });
        if (r && typeof r.lat === 'number' && typeof r.lon === 'number'){
          return { ...s, latitude: r.lat, longitude: r.lon, timezone: normalizeTimezone(r.tz || s.timezone || 'UTC') };
        }
      } catch(e){ logger.warn('ensureCoords geoResolve failed', e.message); }
    }
    return { ...s, latitude: s.latitude ?? 51.48, longitude: s.longitude ?? 0, timezone: normalizeTimezone(s.timezone || 'UTC') };
  }

  // Determine a consistent formation approach up-front for the entire window
  // Rule: if coords+tz present, use coords-only for all days; else use city-mode (with optional geonames_username)
  const preferCoords = (typeof subject.latitude === 'number' || typeof subject.lat === 'number')
    && (typeof subject.longitude === 'number' || typeof subject.lon === 'number' || typeof subject.lng === 'number')
    && !!(subject.timezone || subject.tz_str);

  // CHUNKING: Process transit requests in batches to respect API rate limits
  // This prevents overwhelming the API with 30+ concurrent requests
  const CHUNK_SIZE = 5; // Max 5 concurrent API calls (prevents rate limit errors)

  for (let chunkStart = 0; chunkStart < samples.length; chunkStart += CHUNK_SIZE) {
    const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, samples.length);
    const chunkSamples = samples.slice(chunkStart, chunkEnd);
    const chunkPromises = [];

    logger.debug(`Processing transit chunk ${Math.floor(chunkStart / CHUNK_SIZE) + 1}/${Math.ceil(samples.length / CHUNK_SIZE)}: ${chunkSamples.length} dates`);

    for (const sampleIso of chunkSamples) {
      const utcIso = sampleIso;
      const utcDate = DateTime.fromISO(utcIso, { zone: 'utc' });
      let localDate = utcDate.setZone(samplingZone);
      if (!localDate.isValid) {
        localDate = utcDate;
      }
      const dateString = localDate.isValid ? localDate.toISODate() : utcIso.slice(0, 10);
      const tzForSample = localDate.isValid ? (localDate.zoneName || samplingZone) : samplingZone;
      const resolvedCoords = preferCoords ? await ensureCoords(subject) : null;
      const cityField = subject.state ? `${subject.city}, ${subject.state}` : subject.city;
      const locationLabel = locationLabelOverride || cityField || null;

      const transitBase = {
        year: localDate.year,
        month: localDate.month,
        day: localDate.day,
        hour: localDate.hour,
        minute: localDate.minute,
        zodiac_type: 'Tropic',
        timezone: tzForSample
      };

      const resolvedTimezone = resolvedCoords?.timezone || tzForSample;
      let transit_subject;
      if (preferCoords && resolvedCoords) {
        transit_subject = {
          ...transitBase,
          latitude: resolvedCoords.latitude,
          longitude: resolvedCoords.longitude,
          timezone: resolvedTimezone || tzForSample,
          city: cityField,
          nation: subject.nation
        };
      } else {
        transit_subject = { ...transitBase };
        if (cityField) transit_subject.city = cityField;
        if (subject.nation) transit_subject.nation = subject.nation;
      }

      const coordsForProvenance = resolvedCoords && typeof resolvedCoords.latitude === 'number' && typeof resolvedCoords.longitude === 'number'
        ? { lat: resolvedCoords.latitude, lon: resolvedCoords.longitude, label: locationLabel || undefined }
        : (typeof subject.latitude === 'number' && typeof subject.longitude === 'number'
          ? { lat: Number(subject.latitude), lon: Number(subject.longitude), label: locationLabel || undefined }
          : null);

      const hasCoords = !!(subject.latitude && subject.longitude && subject.timezone);
      const transitPass = hasCoords
        ? { ...pass, require_city: true, suppress_geonames: true, suppress_coords: false }
        : { ...pass, require_city: true, suppress_geonames: false, suppress_coords: true };

      const payload = {
        first_subject: subjectToAPI(subject, transitPass),
        transit_subject: subjectToAPI(transit_subject, transitPass),
        ...pass // Include active_points, active_aspects, etc.
      };

      const baseProvenance = {
        timestamp_utc: utcDate.toISO(),
        timezone: resolvedTimezone || tzForSample || 'UTC',
        time_policy: timePolicy,
        time_precision: timePrecision
      };
      if (localDate.isValid) {
        baseProvenance.timestamp_local = localDate.toISO();
      }
      if (coordsForProvenance) baseProvenance.coordinates = coordsForProvenance;
      if (locationLabel) baseProvenance.location_label = locationLabel;
      if (relocationMode) baseProvenance.relocation_mode = relocationMode;

      logger.debug(`Transit API call for ${dateString}:`, {
        active_points: payload.active_points || 'default',
        pass_keys: Object.keys(pass),
        timestamp_local: baseProvenance.timestamp_local,
        timezone: baseProvenance.timezone
      });

      // Enhanced debug logging: Log full payload when debugging empty results
      logger.debug(`Full transit API payload for ${dateString}:`, JSON.stringify(payload, null, 2));

      chunkPromises.push(
        (async () => {
          let resp = null;
          let endpoint = 'transit-aspects-data';
          let formation = transit_subject.city ? 'city' : 'coords';
          let attempts = 0;
          const maxAttempts = 3;

          // Attempt 1: Primary endpoint - /transit-aspects-data
          try {
            resp = await apiCallWithRetry(
              API_ENDPOINTS.TRANSIT_ASPECTS,
              {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
              },
              `Transits for ${subject.name} on ${dateString}`
            );
            attempts++;

            logger.debug(`Transit API response for ${dateString} (${endpoint}):`, {
              hasAspects: !!(resp && resp.aspects),
              aspectCount: (resp && resp.aspects) ? resp.aspects.length : 0,
              responseKeys: resp ? Object.keys(resp) : 'null response',
              sample: resp && resp.aspects && resp.aspects.length > 0 ? resp.aspects[0] : 'no aspects'
            });
          } catch (e) {
            logger.warn(`Primary transit endpoint failed for ${dateString}:`, e.message);
          }

          // Attempt 2: Fallback to /transit-chart if no aspects found
          if ((!resp || !resp.aspects || resp.aspects.length === 0) && attempts < maxAttempts) {
            try {
              endpoint = 'transit-chart';
              logger.info(`Fallback: Trying transit-chart endpoint for ${dateString}`);

              const payloadWithPrefs = {
                ...payload,
                ...resolveChartPreferences(pass),
              };
              resp = await apiCallWithRetry(
                API_ENDPOINTS.TRANSIT_CHART,
                {
                  method: 'POST',
                  headers,
                  body: JSON.stringify(payloadWithPrefs),
                },
                `Transit chart fallback for ${subject.name} on ${dateString}`
              );
              attempts++;

              // Extract aspects from chart response structure
              if (resp && !resp.aspects && resp.data) {
                // Sometimes aspects are nested in data
                resp.aspects = resp.data.aspects || resp.aspects;
              }

              logger.debug(`Transit chart fallback response for ${dateString}:`, {
                hasAspects: !!(resp && resp.aspects),
                aspectCount: (resp && resp.aspects) ? resp.aspects.length : 0,
                responseKeys: resp ? Object.keys(resp) : 'null response'
              });
            } catch (e) {
              logger.warn(`Transit chart fallback failed for ${dateString}:`, e.message);
            }
          }

          // Attempt 3: Try switching transit subject formation if still empty
          if ((!resp || !resp.aspects || resp.aspects.length === 0) && attempts < maxAttempts) {
            try {
              endpoint = 'formation-switch';
              logger.info(`Formation switch: Trying alternate transit subject for ${dateString}`);

              // Switch between city mode and coords mode
              const alternateTransitSubject = await (async function(){
                const base = {
                  year: localDate.year,
                  month: localDate.month,
                  day: localDate.day,
                  hour: localDate.hour,
                  minute: localDate.minute,
                  zodiac_type: 'Tropic',
                  timezone: resolvedTimezone || tzForSample || 'UTC'
                };

                // If original was city mode, try coords mode
                if (!preferCoords && subject.city && subject.nation) {
                  const s = await ensureCoords(subject);
                  return { ...base, latitude: s.latitude, longitude: s.longitude, timezone: s.timezone || base.timezone };
                }
                // If original was coords mode, try city mode with geonames
                const fallbackCity = subject.state ? `${subject.city}, ${subject.state}` : (subject.city || 'London');
                const t = { ...base, city: fallbackCity, nation: subject.nation || 'UK' };
                if (process.env.GEONAMES_USERNAME) t.geonames_username = process.env.GEONAMES_USERNAME;
                return t;
              })();

              const alternatePayload = {
                first_subject: subjectToAPI(subject, pass),
                transit_subject: subjectToAPI(alternateTransitSubject, pass),
                ...pass
              };

              resp = await apiCallWithRetry(
                API_ENDPOINTS.TRANSIT_ASPECTS,
                {
                  method: 'POST',
                  headers,
                  body: JSON.stringify(alternatePayload),
                },
                `Formation switch for ${subject.name} on ${dateString}`
              );
              attempts++;

              logger.debug(`Formation switch response for ${dateString}:`, {
                hasAspects: !!(resp && resp.aspects),
                aspectCount: (resp && resp.aspects) ? resp.aspects.length : 0,
                alternateFormation: alternateTransitSubject.city ? 'city-mode' : 'coords-mode'
              });
            } catch (e) {
              logger.warn(`Formation switch failed for ${dateString}:`, e.message);
            }
          }

          // Process successful response
          if (resp && resp.aspects && resp.aspects.length > 0) {
            // Calculate transit house positions if natal house cusps are available
            let transitPositions = [];
            let transitHouses = [];
            
            if (pass.natalHouseCusps && resp.data && resp.data.transit_subject) {
              const ts = resp.data.transit_subject;
              const planetNames = ['sun', 'moon', 'mercury', 'venus', 'mars', 
                                   'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
                                   'mean_node', 'chiron'];
              
              for (const planetName of planetNames) {
                const planetData = ts[planetName];
                if (planetData && typeof planetData.abs_pos === 'number') {
                  transitPositions.push(planetData.abs_pos);
                  
                  const house = calculateNatalHouse(planetData.abs_pos, pass.natalHouseCusps);
                  transitHouses.push(house);
                }
              }
              
              if (transitHouses.length > 0) {
                logger.debug(`Calculated transit houses for ${dateString}:`, {
                  planetCount: transitHouses.length,
                  houses: transitHouses
                });
              }
            }
            
            // Store transit aspects directly (calculateSeismograph expects an array)
            // FIX: transitsByDate must be an array of aspects, not an object
            transitsByDate[dateString] = resp.aspects;
            
            provenanceByDate[dateString] = {
              ...baseProvenance,
              endpoint,
              formation,
              attempts,
              aspect_count: resp.aspects.length,
              has_transit_houses: transitHouses.length > 0
            };

          // Extract chart graphics if using transit-chart endpoint
          if (endpoint === 'transit-chart' && resp.data) {
            const { sanitized, assets } = sanitizeChartPayload(resp.data, {
              subject: 'transit',
              chartType: 'transit',
              scope: `transit_${dateString}`,
            });
            if (assets && assets.length > 0) {
              chartAssets.push(...assets);
              logger.debug(`Extracted ${assets.length} chart asset(s) from transit on ${dateString}`);
            }
          }
          // Extract transit chart wheel SVG from top-level chart field
          if (endpoint === 'transit-chart' && resp.chart) {
            const { assets: wheelAssets } = sanitizeChartPayload({ chart: resp.chart }, {
              subject: 'transit',
              chartType: 'transit',
              scope: `transit_wheel_${dateString}`,
            });
            if (wheelAssets && wheelAssets.length > 0) {
              chartAssets.push(...wheelAssets);
              logger.debug(`Extracted ${wheelAssets.length} transit wheel asset(s) from ${dateString}`);
            }
          }

          // Extract retro flags if available
          const retroMap = {};
          const fs = resp.data?.first_subject || resp.data?.firstSubject;
          const tr = resp.data?.transit || resp.data?.transit_subject;
          const collect = (block) => {
            if (!block || typeof block !== 'object') return;
            for (const [k,v] of Object.entries(block)) {
              if (v && typeof v === 'object' && 'retrograde' in v) {
                retroMap[(v.name||v.body||k)] = !!v.retrograde;
              }
            }
          };
          collect(fs); collect(tr);
          if (Object.keys(retroMap).length) retroFlagsByDate[dateString] = retroMap;

          logger.info(`✓ Success for ${dateString}: ${resp.aspects.length} aspects via ${endpoint} (attempts: ${attempts})`);
        } else {
          logger.warn(`✗ No aspects found for ${dateString} after ${attempts} attempts (endpoints: ${endpoint})`);
          // Enhanced debug logging: Log full response when no aspects found
          if (resp) {
            logger.debug(`Full raw API response for ${dateString} (no aspects):`, JSON.stringify(resp, null, 2));
          }
          provenanceByDate[dateString] = {
            ...baseProvenance,
            endpoint,
            formation,
            attempts,
            aspect_count: 0
          };
        }
      })().catch(e => logger.error(`Failed to get transits for ${dateString}`, e))
    );
  } // End of loop through chunkSamples

  // Wait for this chunk to complete before moving to next chunk
  await Promise.all(chunkPromises);
  logger.debug(`Chunk ${Math.floor(chunkStart / CHUNK_SIZE) + 1} complete`);
} // End of chunk loop
  
  logger.debug(`getTransits completed for ${subject.name}:`, {
    requestedDates: samples.length,
    datesWithData: Object.keys(transitsByDate).length,
    totalAspects: Object.values(transitsByDate).reduce((sum, aspects) => sum + aspects.length, 0),
    availableDates: Object.keys(transitsByDate),
    chartAssets: chartAssets.length
  });

  return { transitsByDate, retroFlagsByDate, provenanceByDate, chartAssets };
}

// Geo resolve via GeoNames
async function geoResolve({ city, state, nation }){
  const u = process.env.GEONAMES_USERNAME || '';
  const q = encodeURIComponent(state ? `${city}, ${state}` : city);
  const c = encodeURIComponent(nation || '');
  const searchUrl = `http://api.geonames.org/searchJSON?q=${q}&country=${c}&maxRows=1&username=${encodeURIComponent(u)}`;
  const res1 = await fetch(searchUrl);
  const j1 = await res1.json();
  const g = j1 && Array.isArray(j1.geonames) && j1.geonames[0];
  if (!g) return null;
  const lat = parseFloat(g.lat), lon = parseFloat(g.lng);
  let tz = null;
  try {
    const tzUrl = `http://api.geonames.org/timezoneJSON?lat=${lat}&lng=${lon}&username=${encodeURIComponent(u)}`;
    const res2 = await fetch(tzUrl);
    const j2 = await res2.json();
    tz = j2 && (j2.timezoneId || j2.timezone || null);
  } catch {}
  return { lat, lon, tz };
}

// Expose resolve-city endpoint helper
exports.resolveCity = async function(event){
  const qs = event.queryStringParameters || {};
  const city = qs.city || '';
  const state = qs.state || '';
  const nation = qs.nation || '';
  try {
    const r = await geoResolve({ city, state, nation });
    return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify({ input:{city,state,nation}, resolved:r }) };
  } catch(e){
    return { statusCode: 500, headers: { 'content-type':'application/json' }, body: JSON.stringify({ error: e.message }) };
  }
}

// --- Transit Table Formatting: Orb-Band + Phase + Score ---
function formatTransitTable(enrichedAspects, prevDayAspects = null) {
  if (!Array.isArray(enrichedAspects) || enrichedAspects.length === 0) {
    return {
      exact: [],
      tight: [],
      moderate: [],
      wide: [],
      markdown: "No aspects for this date.",
      phaseLookup: new Map()
    };
  }

  // Create lookup map for previous day's orbs to determine phase
  const prevOrbMap = new Map();
  if (prevDayAspects && Array.isArray(prevDayAspects)) {
    for (const aspect of prevDayAspects) {
      const key = `${aspect.p1_name}|${aspect._aspect}|${aspect.p2_name}`;
      prevOrbMap.set(key, aspect._orb);
    }
  }

  // Process aspects with orb bands, phase, and score
  const phaseLookup = new Map();
  const processedAspects = enrichedAspects.map(aspect => {
    const orb = aspect._orb || 0;
    const key = `${aspect.p1_name}|${aspect._aspect}|${aspect.p2_name}`;
    const prevOrb = prevOrbMap.get(key);
    
    // Determine phase: ↑ tightening (orb decreasing), ↓ separating (orb increasing)
    let phase = '—'; // neutral/unknown
    if (prevOrb != null && typeof prevOrb === 'number') {
      if (orb < prevOrb) phase = '↑'; // tightening
      else if (orb > prevOrb) phase = '↓'; // separating
      // if equal, keep neutral
    }

    // Calculate score using seismograph internals
    const aspectForScore = {
      transit: { body: aspect.p1_name },
      natal: { body: aspect.p2_name },
      type: aspect._aspect,
      orbDeg: orb
    };
    const scored = seismoInternals.scoreAspect(aspectForScore, {
      isAngleProx: aspect.p2_isAngle,
      critical: false
    });

    phaseLookup.set(key, {
      phase,
      orb: Number(orb.toFixed(2)),
      score: Number(scored.S.toFixed(2))
    });

    return {
      transit: aspect.p1_display || aspect.p1_name,
      aspect: aspect._aspect,
      natal: aspect.p2_display || aspect.p2_name,
      orb: Number(orb.toFixed(1)),
      phase: phase,
      score: Number(scored.S.toFixed(2)),
      _orbValue: orb // for sorting
    };
  });

  // Sort by orb (tightest first)
  processedAspects.sort((a, b) => a._orbValue - b._orbValue);

  // Group by orb bands
  const exact = processedAspects.filter(a => a._orbValue <= 0.5);
  const tight = processedAspects.filter(a => a._orbValue > 0.5 && a._orbValue <= 2.0);
  const moderate = processedAspects.filter(a => a._orbValue > 2.0 && a._orbValue <= 6.0);
  const wide = processedAspects.filter(a => a._orbValue > 6.0);

  // Generate markdown table format
  function createMarkdownTable(aspects, title) {
    if (aspects.length === 0) return '';
    
    let table = `\n**${title}**\n\n`;
    table += '| Transit | Aspect | Natal | Orb (°) | Phase | Score |\n';
    table += '|---------|--------|-------|---------|--------|-------|\n';
    
    for (const a of aspects) {
      table += `| ${a.transit} | ${a.aspect} | ${a.natal} | ${a.orb} | ${a.phase} | ${a.score >= 0 ? '+' : ''}${a.score} |\n`;
    }
    
    return table;
  }

  let markdown = '';
  if (exact.length > 0) markdown += createMarkdownTable(exact, '⭐ Exact Aspects (≤0.5°)');
  if (tight.length > 0) markdown += createMarkdownTable(tight, '🔥 Tight Aspects (0.5° - 2°)');
  if (moderate.length > 0) markdown += createMarkdownTable(moderate, '📊 Moderate Aspects (2° - 6°)');
  if (wide.length > 0) markdown += createMarkdownTable(wide, '🌫️ Wide Aspects (>6°)');

  if (markdown === '') {
    markdown = "No aspects for this date.";
  }

  const phaseDict = Object.fromEntries(phaseLookup);

  return {
    exact,
    tight,
    moderate,
    wide,
    markdown,
    phaseLookup: phaseDict
  };
}

function calculateSeismograph(transitsByDate, retroFlagsByDate = {}, options = {}) {
  if (!transitsByDate || Object.keys(transitsByDate).length === 0) {
    return { daily: {}, summary: {}, graph_rows: [] };
  }

  const {
    modeToken = 'MIRROR',
    isBalance = false,
    readiness = null,
    enforceReadiness = true,
    orbsProfile = 'wm-spec-2025-09'
  } = options;

  const mirrorReady = readiness?.mirror?.ready !== false;
  const balanceReady = readiness?.balance?.ready !== false;
  const applyReadiness = Boolean(enforceReadiness);

  const days = Object.keys(transitsByDate).sort();
  let prev = null;
  let prevDayFiltered = null;
  let previousPoetic = null;
  const daily = {};
  const graphRows = [];
  const rollingMagnitudes = []; // Track for 14-day rolling window
  const valenceHistory = []; // Track for trend analysis
  const rawValenceSeries = [];
  const calibratedValenceSeries = [];
  const boundedValenceSeries = [];

  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const rawDayAspects = transitsByDate[d] || [];
  const enriched = enrichDailyAspects(rawDayAspects, orbsProfile);
    
    // Enhance aspects with retrograde flags
    const retroMap = retroFlagsByDate[d] || {};
    const enrichedWithRetrograde = enriched.filtered.map(aspect => {
      const p1r = retroMap[aspect.p1_name] ?? retroMap[aspect.p1_display] ?? false;
      const p2r = retroMap[aspect.p2_name] ?? retroMap[aspect.p2_display] ?? false;
      return {
        ...aspect,
        p1_retrograde: p1r,
        p2_retrograde: p2r,
        retrograde_involved: p1r || p2r
      };
    });
    
    // Generate orb-band transit table with phase and score
    const transitTable = formatTransitTable(enriched.filtered, prevDayFiltered);
    const phaseLookup = transitTable.phaseLookup || {};
    
    const aspectsForAggregate = enriched.filtered.map(x => ({
      transit: { body: x.p1_name, retrograde: x.p1_retrograde },
      natal: {
        body: x.p2_name,
        retrograde: x.p2_retrograde,
        isAngleProx: ["Ascendant","Medium_Coeli","Descendant","Imum_Coeli"].includes(x.p2_name),
        isLuminary: ["Sun","Moon"].includes(x.p2_name),
        degCrit: false
      },
      type: x._aspect,
      orbDeg: typeof x._orb === 'number' ? x._orb : 6.01
    }));

    // Prepare rolling context for magnitude normalization
    const rollingContext = rollingMagnitudes.length >= 1 ? { magnitudes: [...rollingMagnitudes] } : null;
    
  const agg = aggregate(aspectsForAggregate, prev, { rollingContext });
  const valenceRaw = Number.isFinite(agg.rawValence) ? agg.rawValence : 0;
  rawValenceSeries.push(valenceRaw);

    // Determine scaling strategy and confidence
    let scalingStrategy = 'prior';
    const nContext = rollingMagnitudes.length;
    if (nContext >= 14) scalingStrategy = 'rolling';
    else if (nContext >= 2) scalingStrategy = 'blended';
    const scaleConfidence = Math.min(1, nContext / 14);

    // Track rolling magnitudes using the original magnitude before normalization (keep last 14 days)
    const magnitudeToTrack = Number.isFinite(agg.energyMagnitude)
      ? agg.energyMagnitude
      : (Number.isFinite(agg.rawMagnitude) ? agg.rawMagnitude : agg.magnitude || 0);
    rollingMagnitudes.push(magnitudeToTrack);
    if (rollingMagnitudes.length > 14) rollingMagnitudes.shift();

    // Identify retrograde recursion aspects
    const retrogradeAspects = enrichedWithRetrograde.filter(a => a.retrograde_involved);

    // Dispersion-based volatility override (std deviation of hook weights)
    let dispersionVol = 0;
    if (enriched.hooks.length >= 2) {
      const weights = enriched.hooks.map(h => h._weight || 0);
      const meanW = weights.reduce((s, v) => s + v, 0) / weights.length;
      const variance = weights.reduce((s, v) => s + Math.pow(v - meanW, 2), 0) / weights.length;
      dispersionVol = Math.min(10, Math.sqrt(variance) * 10);
    }

    // Use seismograph's built-in directional_bias (v4: SFD removed)
    const balanceVal = agg.directional_bias || null;

    const magnitudeValue = Number.isFinite(agg.magnitude) ? agg.magnitude : 0;
    const magnitudeInfo = classifyMagnitude(magnitudeValue);
    const magnitudeLabel = magnitudeInfo?.label || null;
    const magnitudeMeta = agg.magnitude_meta || null;
    const magnitudeRange = agg.magnitude_range || [0, 5];
    const magnitudeClamped = Boolean(agg.magnitude_clamped);
    const magnitudeMethod = magnitudeMeta?.method || (rollingMagnitudes.length ? 'adaptive_normalization_v4' : 'raw_direct_v4');

    const fallbackDirection = typeof prev?.Y_effective === 'number' ? prev.Y_effective : null;
    const directionalScaling = scaleDirectionalBias(valenceRaw, {
      calibratedMagnitude: balanceVal,
      fallbackDirection,
      confidence: agg.scaleConfidence ?? scaleConfidence,
      method: balanceVal != null ? 'seismograph_signed_v4' : 'raw_directional_v4'
    });

    const biasSigned = directionalScaling.value;
    const biasInfo = classifyDirectionalBias(biasSigned);
    const biasAbs = +Math.abs(biasSigned).toFixed(2);
    const biasDirection = directionalScaling.direction;
    const biasPolarity = directionalScaling.polarity;
    const biasMethod = directionalScaling.meta?.method || (balanceVal != null ? 'seismograph_signed_v4' : 'raw_directional_v4');

    boundedValenceSeries.push(biasSigned);
    if (balanceVal != null) {
      calibratedValenceSeries.push(biasSigned);
    }

    // Track valence history (keep last 7 days for trend)
    valenceHistory.push(biasSigned);
    if (valenceHistory.length > 7) valenceHistory.shift();

    const volatilityInfo = classifyVolatility(dispersionVol);

    // Build compact drivers reflecting top hooks (already computed above)
    const driversCompact = (enriched.hooks || []).map(h => {
      const weightFinal = typeof h._weight === 'number' ? h._weight : weightAspect(h);
      return {
        a: h.p1_name,
        b: h.p2_name,
        type: h._aspect || h.aspect || h.type,
        orb: h._orb != null ? h._orb : (typeof h.orb === 'number' ? h.orb : (typeof h.orbit === 'number' ? h.orbit : null)),
        applying: typeof h.applying === 'boolean' ? h.applying : undefined,
        weight: weightFinal,
        weight_final: weightFinal,
        house_target: h.house_target ?? h.p2_house ?? null,
        planet1: h.p1_name,
        planet2: h.p2_name,
        name: h._aspect || h.aspect || h.type,
        first_planet: h.p1_name,
        second_planet: h.p2_name,
        is_transit: true
      };
    });

    const calibrationMode = balanceVal != null ? BALANCE_CALIBRATION_VERSION : 'bounded-only';
    const magnitudeRaw = Number.isFinite(agg.rawMagnitude) ? agg.rawMagnitude : (agg.magnitude || 0);
    const biasRawSigned = Number.isFinite(agg.rawDirectionalBias) ? agg.rawDirectionalBias : (directionalScaling.value || 0);
    const volatilityScaled = Number.isFinite(agg.volatility_scaled) ? agg.volatility_scaled : Math.max(0, Math.min(5, dispersionVol));
    const saturation = magnitudeRaw >= 4.95;

    // The `graphRows` array is the direct source for the Balance Meter chart.
    // It MUST contain the raw, unclamped, full-precision values.
    graphRows.push({
      date: d,
      magnitude: magnitudeRaw, // Raw, unclamped magnitude
      bias_signed: biasRawSigned, // Raw, unclamped, signed bias
      volatility: volatilityScaled, // Scaled volatility
      saturation
    });

    const dayEntry = {
      seismograph: {
        magnitude: magnitudeValue,
        magnitude_label: magnitudeLabel,
        magnitude_meta: magnitudeMeta,
        magnitude_range: magnitudeRange,
        magnitude_method: magnitudeMethod,
        magnitude_clamped: magnitudeClamped,
        // ✅ Balance Meter v4: Canonical directional bias (replaces all valence/bias_signed fields)
        directional_bias: {
          value: biasSigned,
          abs: biasAbs,
          label: biasInfo?.label || null,
          code: biasInfo?.code || null,
          direction: biasDirection,
          polarity: biasPolarity,
          motion: biasInfo?.motion || null,
          range: directionalScaling.range,
          clamped: directionalScaling.clamped,
          meta: directionalScaling.meta,
          sign: directionalScaling.sign,
          method: biasMethod
        },
        volatility: dispersionVol,
        volatility_label: volatilityInfo?.label || null,
        volatility_scaled: volatilityScaled,
        // --- RAW DATA FOR PLOTTING & ANALYSIS ---
        // These fields preserve the raw, unclamped values before any presentation-layer scaling.
        rawMagnitude: magnitudeRaw,
        rawDirectionalBias: biasRawSigned,
        raw_axes: {
          magnitude: magnitudeRaw,
          bias_signed: biasRawSigned,
          volatility: volatilityScaled
        },
        // === CANONICAL/CALIBRATED AXES BLOCK ===
        // Use axes block directly from aggregator (contains canonical rounded values)
        axes: agg.axes || {
          magnitude: { value: magnitudeValue },
          directional_bias: { value: biasSigned },
          volatility: { value: volatilityScaled }
        },
        saturation,
        originalMagnitude: agg.originalMagnitude,
        scaling_strategy: scalingStrategy,
        scaling_confidence: +scaleConfidence.toFixed(2),
        magnitude_state: {
          value: magnitudeValue,
          label: magnitudeLabel,
          range: magnitudeRange,
          clamped: magnitudeClamped,
          meta: magnitudeMeta,
          method: magnitudeMethod
        },
        version: SEISMOGRAPH_VERSION
      },
      aspects: rawDayAspects,
      filtered_aspects: enrichedWithRetrograde,
      hooks: enriched.hooks,
      drivers: driversCompact,
      rejections: enriched.rejections,
      counts: enriched.counts,
      transit_table: transitTable,
      retrograde_aspects: retrogradeAspects,
      weights_legend: WEIGHTS_LEGEND
    };

    let poeticSelection;
    const guardActive = applyReadiness && ((isBalance && !balanceReady) || (!isBalance && modeToken === 'MIRROR' && !mirrorReady));
    if (guardActive) {
      const guardMessage = isBalance ? readiness?.balance?.message : readiness?.mirror?.message;
      poeticSelection = {
        aspects: [],
        counts: { total: enriched.filtered.length, category: { A:0, B:0, C:0, D:0 }, selected: 0 },
        limits: isBalance ? { min: 8, max: 12 } : { min: 5, max: 9 },
        note: guardMessage || (isBalance ? 'Balance guard active.' : 'Mirror guard active.')
      };
    } else {
      poeticSelection = selectPoeticAspects(enriched, {
        isBalance,
        previous: previousPoetic,
        phaseLookup
      });
      previousPoetic = poeticSelection.aspects;
    }

    const poeticMeta = {
      magnitude: dayEntry.seismograph?.magnitude ?? null,
      directional_bias: dayEntry.seismograph?.directional_bias?.value ?? null,
      volatility: dayEntry.seismograph?.volatility ?? null,
      coherence: dayEntry.seismograph?.coherence ?? null
    };
    dayEntry.poetic_packet = {
      aspects: poeticSelection.aspects,
      meta: poeticMeta,
      counts: poeticSelection.counts,
      limits: poeticSelection.limits,
      note: poeticSelection.note || null,
      guard: guardActive ? (isBalance ? readiness?.balance : readiness?.mirror) : null
    };

    daily[d] = dayEntry;
    prev = { scored: agg.scored, Y_effective: biasSigned };
    prevDayFiltered = enriched.filtered;
  }

  const numDays = days.length;
  
  // === SINGLE SOURCE OF TRUTH: Average daily seismograph values directly ===
  const X = Object.values(daily).reduce((s, d) => s + d.seismograph.magnitude, 0) / numDays;
  const Y = Object.values(daily).reduce((s, d) => s + (d.seismograph.directional_bias?.value || 0), 0) / numDays;
  const VI = Object.values(daily).reduce((s, d) => s + d.seismograph.volatility, 0) / numDays;
  
  // Classification and rounding
  const magnitudeInfo = classifyMagnitude(X);
  const magnitudeLabel = magnitudeInfo?.label || null;
  const magnitudeAvg = Number(X.toFixed(1));
  
  const biasAvg = Number(Y.toFixed(1));
  const biasSummaryInfo = classifyDirectionalBias(biasAvg);
  const biasAbsRounded = Number(Math.abs(biasAvg).toFixed(1));
  const biasSummaryPolarity = biasAvg > 0 ? 'outward' : (biasAvg < 0 ? 'inward' : 'equilibrium');
  const biasSummaryDirection = biasAvg > 0 ? 'expansive' : (biasAvg < 0 ? 'compressive' : 'neutral');

  const biasSeverityThresholds = {
    steady: 0,
    advisory: 0.5,
    watch: 1.5,
    warning: 2.5,
    critical: 4.0
  };

  const biasSeverityInfo = (() => {
    if (biasAbsRounded >= biasSeverityThresholds.critical) {
      return { label: 'critical', code: 'CRITICAL' };
    }
    if (biasAbsRounded >= biasSeverityThresholds.warning) {
      return { label: 'warning', code: 'WARNING' };
    }
    if (biasAbsRounded >= biasSeverityThresholds.watch) {
      return { label: 'watch', code: 'WATCH' };
    }
    if (biasAbsRounded >= biasSeverityThresholds.advisory) {
      return { label: 'advisory', code: 'ADVISORY' };
    }
    return { label: 'steady', code: 'STEADY' };
  })();

  const biasSeverity = {
    value: biasAbsRounded,
    label: biasSeverityInfo.label,
    code: biasSeverityInfo.code,
    polarity: biasSummaryPolarity,
    thresholds: biasSeverityThresholds
  };
  
  const volatilityAvg = Number(VI.toFixed(1));
  const volatilityInfo = classifyVolatility(VI);

  const magnitudeAxisMeta = {
    sample_size: numDays,
    aggregation: 'mean_daily_magnitude',
    canonical_scalers_used: true,
    transform_pipeline: ['daily_seismograph.magnitude', 'mean']
  };

  const directionalAxisMeta = {
    sample_size: numDays,
    aggregation: 'mean_daily_directional_bias',
    canonical_scalers_used: true,
    transform_pipeline: ['daily_seismograph.directional_bias.value', 'mean']
  };

  const coherenceAxisMeta = {
    sample_size: numDays,
    aggregation: 'mean_daily_volatility',
    canonical_scalers_used: true,
    transform_pipeline: ['daily_seismograph.volatility', 'mean']
  };

  const summaryAxes = {
    magnitude: {
      value: magnitudeAvg,
      label: magnitudeLabel,
      range: [0, 5],
      method: 'mean_daily_magnitude',
      clamped: magnitudeAvg <= 0 || magnitudeAvg >= 5,
      meta: magnitudeAxisMeta
    },
    directional_bias: {
      value: biasAvg,
      label: biasSummaryInfo?.label || null,
      code: biasSummaryInfo?.code || null,
      polarity: biasSummaryPolarity,
      direction: biasSummaryDirection,
      range: [-5, 5],
      method: 'mean_daily_seismograph',
      clamped: biasAvg <= -5 || biasAvg >= 5,
      meta: directionalAxisMeta,
      severity: biasSeverity
    },
    coherence: {
      value: volatilityAvg,
      label: volatilityInfo?.label || null,
      range: [0, 5],
      method: 'mean_daily_volatility',
      clamped: volatilityAvg <= 0 || volatilityAvg >= 5,
      meta: coherenceAxisMeta
    }
  };

  const summaryBalance = {
    magnitude: magnitudeAvg,
    directional_bias: biasAvg,
    volatility: volatilityAvg,
    magnitude_label: magnitudeLabel,
    directional_bias_label: biasSummaryInfo?.label || null,
    volatility_label: volatilityInfo?.label || null,
    axes: summaryAxes,
    range: {
      magnitude: [0, 5],
      directional_bias: [-5, 5],
      volatility: [0, 5]
    }
  };

  const summary = {
    magnitude: magnitudeAvg,
    magnitude_label: magnitudeLabel,
    directional_bias_label: biasSummaryInfo?.label || null,
    volatility: volatilityAvg,
    volatility_label: volatilityInfo?.label || null,
    volatility_emoji: volatilityInfo?.emoji || null,
    // Flat fields for compatibility with graphics/report consumers
    direction: biasAvg, // Numeric value, e.g. +3.0
    charge: magnitudeAvg,   // Alias for magnitude
    coherence: volatilityAvg, // Alias for volatility
    integration: 0, // Placeholder, update if needed
    directional_bias: {
      value: biasAvg,
      abs: biasAbsRounded,
      label: biasSummaryInfo?.label || null,
      code: biasSummaryInfo?.code || null,
      direction: biasSummaryDirection,
      polarity: biasSummaryPolarity,
      motion: biasSummaryInfo?.motion || null,
      range: [-5, 5],
      clamped: biasAvg <= -5 || biasAvg >= 5,
      meta: directionalAxisMeta,
      sign: biasAvg > 0 ? 1 : (biasAvg < 0 ? -1 : 0),
      method: 'mean_daily_seismograph'
    },
    version: {
      seismograph: SEISMOGRAPH_VERSION,
      balance: BALANCE_CALIBRATION_VERSION,
      calibration_mode: BALANCE_CALIBRATION_VERSION
    },
    axes: summaryAxes,
    balance_meter: summaryBalance
  };
  if (calibratedValenceSeries.length) {
    summary.valence_sample_size = calibratedValenceSeries.length;
  }

  const saturationCount = graphRows.filter(row => row.saturation).length;
  summary.saturation_days = saturationCount;
  summary.saturation_ratio = numDays > 0 ? +(saturationCount / numDays).toFixed(3) : 0;

  return { daily, summary, graph_rows: graphRows };
}

// Helper function to calculate valence trend
function calculateTrend(values) {
  if (values.length < 2) return 0;
  const recent = values.slice(-3); // Last 3 values for trend
  if (recent.length < 2) return 0;
  
  let trend = 0;
  for (let i = 1; i < recent.length; i++) {
    trend += recent[i] - recent[i-1];
  }
  return +(trend / (recent.length - 1)).toFixed(2);
}

// --- Composite helpers ---
async function computeComposite(A, B, pass = {}, H) {
  try {
    logger.debug('Computing composite for subjects:', { 
      personA: A?.name || 'Unknown A', 
      personB: B?.name || 'Unknown B' 
    });
    
    const payload = {
      first_subject: subjectToAPI(A, pass),
      second_subject: subjectToAPI(B, pass),
      ...pass,
    };
    
  const r = await apiCallWithRetry(
      API_ENDPOINTS.COMPOSITE_ASPECTS,
      { method: 'POST', headers: H, body: JSON.stringify(payload) },
      'Composite aspects'
    );
  // Prefer top-level aspects if present, fallback to data.aspects
  const data = stripGraphicsDeep(r.data || {});
  const topAspects = Array.isArray(r.aspects) ? r.aspects : (data.aspects || []);
  logger.debug('Composite calculation successful, aspects found:', topAspects.length);
  return { aspects: topAspects, raw: data };
  } catch (error) {
    logger.error('Composite calculation failed:', error);
    throw new Error(`Composite calculation failed: ${error.message}`);
  }
}

// --- Relational Processing Helpers ---
/**
 * Generate polarity cards from synastry aspects for relational tension analysis
 * @param {Array} synastryAspects - Cross-chart aspects between Person A and Person B
 * @param {Object} personA - Person A details
 * @param {Object} personB - Person B details
 * @returns {Array} Array of polarity card objects
 */
function generatePolarityCards(synastryAspects, personA, personB) {
  if (!Array.isArray(synastryAspects) || synastryAspects.length === 0) {
    return [];
  }

  const polarityCards = [];
  const processedPairs = new Set();

  // Focus on major tension aspects that create polarity
  const tensionAspects = synastryAspects.filter(aspect => {
    const type = (aspect.aspect || aspect.type || '').toLowerCase();
    return ['opposition', 'square', 'conjunction'].includes(type);
  });

  for (const aspect of tensionAspects) {
    const p1 = aspect.p1_name || aspect.a || aspect.first_point || '';
    const p2 = aspect.p2_name || aspect.b || aspect.second_point || '';
    const aspectType = aspect.aspect || aspect.type || '';
    const orb = aspect.orb || aspect.orbit || 0;

    // Create unique pair identifier to avoid duplicates
    const pairId = [p1, p2].sort().join('-');
    if (processedPairs.has(pairId)) continue;
    processedPairs.add(pairId);

    // Generate polarity card for significant aspects (tight orbs)
    if (parseFloat(orb) <= 6.0) {
      polarityCards.push({
        polarity_a: `${personA.name || 'Person A'}'s ${p1}`,
        polarity_b: `${personB.name || 'Person B'}'s ${p2}`,
        aspect_type: aspectType,
        orb_degrees: parseFloat(orb),
        field_description: `${p1} ${aspectType} ${p2}`,
        map_pattern: `Cross-chart ${aspectType} creating relational tension`,
        voice_summary: `Polarity between ${p1} and ${p2} energies in the relationship`
      });
    }
  }

  return polarityCards.slice(0, 3); // Limit to top 3 polarity cards
}

/**
 * Detect echo loops and REF cycles from recurring cross-chart patterns
 * @param {Array} synastryAspects - Cross-chart aspects
 * @param {Array} natalAspectsA - Person A's natal aspects
 * @param {Array} natalAspectsB - Person B's natal aspects
 * @returns {Array} Array of echo loop objects
 */
function detectEchoLoops(synastryAspects, natalAspectsA, natalAspectsB) {
  const echoLoops = [];
  
  if (!Array.isArray(synastryAspects)) return echoLoops;

  // Find recurring planetary patterns across charts
  const planetPairs = {};
  
  for (const aspect of synastryAspects) {
    const p1 = aspect.p1_name || aspect.a || '';
    const p2 = aspect.p2_name || aspect.b || '';
    const type = aspect.aspect || aspect.type || '';
    
    const key = [p1, p2].sort().join('-');
    if (!planetPairs[key]) {
      planetPairs[key] = [];
    }
    planetPairs[key].push({ type, orb: aspect.orb || 0 });
  }

  // Identify echo loops where the same planetary pair appears multiple times
  for (const [pair, aspects] of Object.entries(planetPairs)) {
    if (aspects.length > 1) {
      const [planet1, planet2] = pair.split('-');
      echoLoops.push({
        pattern_type: 'REF_CYCLE',
        planets_involved: [planet1, planet2],
        occurrences: aspects.length,
        aspects: aspects,
        description: `Recurring ${planet1}-${planet2} feedback loop`,
        intensity: aspects.reduce((sum, a) => sum + (6 - parseFloat(a.orb || 6)), 0)
      });
    }
  }

  return echoLoops.slice(0, 5); // Limit to top 5 echo loops
}

/**
 * Generate shared SST tags for both participants in relational context
 * @param {Object} personA - Person A details and chart data
 * @param {Object} personB - Person B details and chart data  
 * @param {Array} synastryAspects - Cross-chart aspects
 * @returns {Object} SST tags for both persons
 */
function generateSharedSSTTags(personA, personB, synastryAspects) {
  // This is a simplified SST implementation - in practice this would involve
  // more sophisticated analysis of lived resonance patterns
  
  const sstTags = {
    person_a_tags: [],
    person_b_tags: [],
    shared_resonance: []
  };

  // Generate SST tags for Person A
  if (personA.aspects && Array.isArray(personA.aspects)) {
    const significantAspects = personA.aspects.filter(a => 
      parseFloat(a.orb || 6) <= 3.0
    ).slice(0, 3);
    
    sstTags.person_a_tags = significantAspects.map(aspect => ({
      vector: `${aspect.p1_name || aspect.a}-${aspect.p2_name || aspect.b}`,
      tag: 'WB', // Default to Within Boundary - would need user feedback in practice
      aspect_type: aspect.aspect || aspect.type,
      orb: aspect.orb
    }));
  }

  // Generate SST tags for Person B  
  if (personB.aspects && Array.isArray(personB.aspects)) {
    const significantAspects = personB.aspects.filter(a => 
      parseFloat(a.orb || 6) <= 3.0
    ).slice(0, 3);
    
    sstTags.person_b_tags = significantAspects.map(aspect => ({
      vector: `${aspect.p1_name || aspect.a}-${aspect.p2_name || aspect.b}`,
      tag: 'WB', // Default to Within Boundary
      aspect_type: aspect.aspect || aspect.type,
      orb: aspect.orb
    }));
  }

  // Generate shared resonance from synastry
  if (Array.isArray(synastryAspects)) {
    const sharedAspects = synastryAspects.filter(a => 
      parseFloat(a.orb || 6) <= 4.0
    ).slice(0, 3);
    
    sstTags.shared_resonance = sharedAspects.map(aspect => ({
      vector: `${aspect.p1_name || aspect.a}↔${aspect.p2_name || aspect.b}`,
      tag: 'WB', // Default to Within Boundary
      aspect_type: aspect.aspect || aspect.type,
      orb: aspect.orb,
      description: 'Cross-chart resonance'
    }));
  }

  return sstTags;
}

/**
 * Compute bidirectional overlays for relational reports
 * Partitions synastry aspects by direction and computes separate Balance Meters
 * @param {Array} synastryAspects - Cross-chart aspects from API
 * @param {Object} chartA - Person A's natal chart data
 * @param {Object} chartB - Person B's natal chart data
 * @param {String} orbsProfile - Orb profile ID (default: 'wm-spec-2025-09')
 * @returns {Object} Bidirectional overlay data with separate A←B and B←A metrics
 */
function computeBidirectionalOverlays(synastryAspects, chartA, chartB, orbsProfile = 'wm-spec-2025-09') {
  const { filterByOrbProfile } = require('../config/orb-profiles');

  if (!Array.isArray(synastryAspects)) {
    return {
      a_from_b: { aspects: [], balance_meter: null },
      b_from_a: { aspects: [], balance_meter: null }
    };
  }

  // Filter synastry aspects by orb profile before partitioning
  const filteredSynastryAspects = filterByOrbProfile(synastryAspects, orbsProfile);
  logger.debug(`Filtered synastry aspects by orb profile ${orbsProfile}:`, {
    before: synastryAspects.length,
    after: filteredSynastryAspects.length
  });

  // Helper: Get planet names from charts
  const aPlanetNames = new Set((chartA?.aspects || []).flatMap(a => [a.p1_name, a.p2_name]));
  const bPlanetNames = new Set((chartB?.aspects || []).flatMap(a => [a.p1_name, a.p2_name]));

  // Partition: A←B means B's planet (p1) aspecting A's planet (p2)
  const aFromB = [];
  const bFromA = [];

  for (const aspect of filteredSynastryAspects) {
    const p1 = aspect.p1_name || aspect.first_planet;
    const p2 = aspect.p2_name || aspect.second_planet;

    // Determine direction based on which chart owns which planet
    // In synastry API, p1 is usually from first_subject (A), p2 from second_subject (B)
    // But we need to check based on actual ownership

    // A←B: B's planet affecting A's planet (B is sender, A is receiver)
    if (bPlanetNames.has(p1) && aPlanetNames.has(p2)) {
      aFromB.push({
        ...aspect,
        sender: 'B',
        sender_planet: p1,
        receiver: 'A',
        receiver_planet: p2,
        role: classifyAspectRole(aspect),
        experience_for_receiver: describeExperienceForA(aspect)
      });
    }
    // B←A: A's planet affecting B's planet (A is sender, B is receiver)
    else if (aPlanetNames.has(p1) && bPlanetNames.has(p2)) {
      bFromA.push({
        ...aspect,
        sender: 'A',
        sender_planet: p1,
        receiver: 'B',
        receiver_planet: p2,
        role: classifyAspectRole(aspect),
        experience_for_receiver: describeExperienceForB(aspect)
      });
    }
    // Ambiguous - include in both for now
    else {
      const role = classifyAspectRole(aspect);
      aFromB.push({ ...aspect, sender: 'B', receiver: 'A', role });
      bFromA.push({ ...aspect, sender: 'A', receiver: 'B', role });
    }
  }

  // v4: SFD removed, aspect counts only
  return {
    a_from_b: {
      aspects: aFromB,
      description: `Person A experiences ${aFromB.length} contacts from Person B`
    },
    b_from_a: {
      aspects: bFromA,
      description: `Person B experiences ${bFromA.length} contacts from Person A`
    }
  };
}

/**
 * Classify aspect as support or compression/friction
 */
function classifyAspectRole(aspect) {
  const type = (aspect.aspect || aspect.type || '').toLowerCase();
  const p1 = aspect.p1_name || aspect.first_planet;
  const p2 = aspect.p2_name || aspect.second_planet;

  // Supportive aspects
  if (['trine', 'sextile'].includes(type)) return 'support';

  // Conjunction depends on planets involved
  if (type === 'conjunction') {
    const benefics = ['Jupiter', 'Venus'];
    if (benefics.includes(p1) || benefics.includes(p2)) return 'support';
    const malefics = ['Saturn', 'Mars', 'Pluto'];
    if (malefics.includes(p1) || malefics.includes(p2)) return 'compression';
    return 'neutral';
  }

  // Hard aspects - usually compression
  if (['square', 'opposition'].includes(type)) {
    // But context matters
    const heavy = ['Saturn', 'Pluto', 'Chiron'];
    if (heavy.includes(p1) || heavy.includes(p2)) return 'compression';
    return 'friction';
  }

  return 'neutral';
}

/**
 * Describe how aspect feels to Person A (receiver)
 */
function describeExperienceForA(aspect) {
  const role = classifyAspectRole(aspect);
  const type = aspect.aspect || aspect.type;
  const sender = aspect.sender_planet;
  const receiver = aspect.receiver_planet;

  if (role === 'support') {
    return `${sender}'s energy supports ${receiver} - structural harmonization, stabilizing geometry`;
  }
  if (role === 'compression') {
    return `${sender}'s energy compresses ${receiver} - contractive geometry, containing structure`;
  }
  if (role === 'friction') {
    return `${sender}'s energy creates friction with ${receiver} - dynamic geometry, tension structure`;
  }
  return `${sender} ${type} ${receiver} - neutral activation`;
}

/**
 * Describe how aspect feels to Person B (receiver)
 */
function describeExperienceForB(aspect) {
  // Same logic but from B's perspective
  return describeExperienceForA(aspect).replace('Person A', 'Person B');
}

/**
 * Compute combined relational Balance Meter v4 by merging both people's daily transits
 *
 * NOTE: This is complementary to computeBidirectionalOverlays (directional flow analysis).
 * This function calculates COMBINED daily metrics (magnitude, bias, volatility, coherence)
 * for the relationship as a whole, plus baseline synastry support/friction.
 *
 * @param {Array} synastryAspects - Cross-chart aspects for baseline calculation
 * @param {Array} compositeAspects - Composite chart aspects (currently unused)
 * @param {Object} personATransits - Person A's daily transit data (keyed by date)
 * @param {Object} personBTransits - Person B's daily transit data (keyed by date)
 * @returns {Object} Combined relational balance meter with daily_metrics and baseline scores
 */
function computeCombinedRelationalMetrics(synastryAspects, compositeAspects, personATransits, personBTransits) {
  // Combine both people's daily seismograph metrics into unified relational dimensions

  const dailyMetrics = {};
  let totalSupport = 0;
  let totalFriction = 0;
  let aspectCount = 0;

  // PART 1: Analyze synastry aspects for baseline relational support/friction
  if (Array.isArray(synastryAspects)) {
    for (const aspect of synastryAspects) {
      const type = (aspect.aspect || aspect.type || '').toLowerCase();
      const orb = parseFloat(aspect.orb || 6);

      aspectCount++;

      // Supportive aspects
      if (['trine', 'sextile', 'conjunction'].includes(type)) {
        totalSupport += Math.max(0, 6 - orb) / 6; // Weight by tightness
      }

      // Friction aspects
      if (['square', 'opposition'].includes(type)) {
        totalFriction += Math.max(0, 6 - orb) / 6;
      }
    }
  }

  // PART 2: Compute daily relational metrics by combining both people's transits
  const allDates = new Set([
    ...Object.keys(personATransits || {}),
    ...Object.keys(personBTransits || {})
  ]);

  for (const date of allDates) {
    const dayA = personATransits?.[date] || {};
    const dayB = personBTransits?.[date] || {};

    // Extract daily metrics for each person
    const magA = dayA.magnitude ?? 0;
    const magB = dayB.magnitude ?? 0;
    const valA = dayA.valence ?? 0;
    const valB = dayB.valence ?? 0;
    const volA = dayA.volatility ?? 0;
    const volB = dayB.volatility ?? 0;
    const cohA = dayA.coherence ?? 0;
    const cohB = dayB.coherence ?? 0;

    // Compute combined relational metrics
    // Magnitude: Average of both (shared pressure load)
    const relationalMagnitude = (magA + magB) / 2;

    // Valence: Weighted average (if one person is heavily challenged, it affects the dyad)
    const relationalValence = (valA + valB) / 2;

    // Volatility: Max of both (if either is volatile, the relationship feels it)
    const relationalVolatility = Math.max(volA, volB);

    // Coherence: Min of both (if either is unstable, the relationship feels it)
    const relationalCoherence = Math.min(cohA, cohB);

    dailyMetrics[date] = {
      magnitude: Math.round(relationalMagnitude * 100) / 100,
      valence: Math.round(relationalValence * 100) / 100,
      volatility: Math.round(relationalVolatility * 100) / 100,
      coherence: Math.round(relationalCoherence * 100) / 100,
      person_a: { magnitude: magA, valence: valA, volatility: volA, coherence: cohA },
      person_b: { magnitude: magB, valence: valB, volatility: volB, coherence: cohB }
    };
  }

  // Calculate baseline relational bias from synastry aspect counts
  // Note: This is a synastry-level static calculation, not daily seismograph data
  const baselineBias = aspectCount > 0 ?
    Math.round((totalSupport - totalFriction) * 100) / 100 : 0;

  // Determine relational valence symbol
  let relationalValence = '🌗'; // Default to mixed
  if (baselineBias > 1.0) relationalValence = '🌞';
  else if (baselineBias < -1.0) relationalValence = '🌑';

  // Calculate baseline magnitude from synastry aspect intensity
  const baselineMagnitude = Math.min(5, Math.max(0, (totalSupport + totalFriction) * 2));

  return {
    baseline_bias: baselineBias,
    baseline_magnitude: Math.round(baselineMagnitude * 100) / 100,
    relational_valence: relationalValence,
    support_score: Math.round(totalSupport * 100) / 100,
    friction_score: Math.round(totalFriction * 100) / 100,
    synastry_aspect_count: aspectCount,
    daily_metrics: dailyMetrics,
    climate_description: `Relational field showing ${relationalValence} dynamic with ${baselineMagnitude.toFixed(1)} baseline intensity`,
    computation_note: 'Relational Balance Meter v4.0: Combines Person A + Person B daily transits (magnitude, directional_bias, volatility, coherence) with synastry baseline'
  };
}

/**
 * Public API: Compute relational Balance Meter from synastry + daily transits
 *
 * This is the primary entry point for relational balance calculations.
 * Delegates to computeCombinedRelationalMetrics (the v4 implementation).
 */
function computeRelationalBalanceMeter(
  synastryAspects,
  compositeAspects,
  personATransits,
  personBTransits,
  options = {}
) {
  return computeCombinedRelationalMetrics(
    synastryAspects,
    compositeAspects,
    personATransits,
    personBTransits
  );
}

/**
 * Generate vector-integrity tags for latent/suppressed/dormant relational vectors
 * @param {Array} synastryAspects - Cross-chart aspects
 * @param {Array} compositeAspects - Composite chart aspects
 * @returns {Array} Vector integrity tags
 */
function generateVectorIntegrityTags(synastryAspects, compositeAspects) {
  const vectorTags = [];
  
  // Look for wide orb aspects that are structurally present but behaviorally quiet
  const wideAspects = [];
  
  if (Array.isArray(synastryAspects)) {
    wideAspects.push(...synastryAspects.filter(a => {
      const orb = parseFloat(a.orb || 0);
      return orb > 4.0 && orb <= 8.0; // Wide but still within range
    }));
  }
  
  if (Array.isArray(compositeAspects)) {
    wideAspects.push(...compositeAspects.filter(a => {
      const orb = parseFloat(a.orb || 0);
      return orb > 4.0 && orb <= 8.0;
    }));
  }

  for (const aspect of wideAspects.slice(0, 3)) {
    const p1 = aspect.p1_name || aspect.a || '';
    const p2 = aspect.p2_name || aspect.b || '';
    const type = aspect.aspect || aspect.type || '';
    const orb = parseFloat(aspect.orb || 0);
    
    let status = 'LATENT';
    let description = 'structural presence but contained/waiting';
    
    // Determine vector status based on planets and aspect type
    if (['Saturn', 'Pluto', 'Neptune'].includes(p1) || ['Saturn', 'Pluto', 'Neptune'].includes(p2)) {
      status = 'DORMANT';
      description = 'waiting for specific activation timing';
    } else if (orb > 6.0) {
      status = 'SUPPRESSED';  
      description = 'boundaries fortified/compensated by other placements';
    }

    vectorTags.push({
      status: status,
      vector_name: `${p1}-${p2} ${type}`,
      orb_degrees: orb,
      structural_presence: true,
      behavioral_activity: 'contained',
      description: description
    });
  }

  return vectorTags;
}

/**
 * Generate comprehensive relational mirror structure with all missing elements
 * @param {Object} personA - Person A data
 * @param {Object} personB - Person B data  
 * @param {Array} synastryAspects - Cross-chart aspects
 * @param {Object} composite - Composite chart data
 * @param {Object} compositTransits - Composite transit data
 * @returns {Object} Complete relational mirror structure
 */
function generateRelationalMirror(personA, personB, synastryAspects, composite, compositeTransits, orbsProfile = 'wm-spec-2025-09') {
  logger.debug('Generating comprehensive relational mirror structure');

  // Generate all missing relational elements
  const polarityCards = generatePolarityCards(synastryAspects, personA, personB);
  const echoLoops = detectEchoLoops(synastryAspects, personA.aspects, personB.aspects);
  const sstTags = generateSharedSSTTags(personA, personB, synastryAspects);

  // CRITICAL: Compute bidirectional overlays (A←B and B←A separately)
  const bidirectionalOverlays = computeBidirectionalOverlays(
    synastryAspects,
    personA.chart || personA,
    personB.chart || personB,
    orbsProfile
  );
  logger.debug('Bidirectional overlays computed:', {
    a_from_b_count: bidirectionalOverlays.a_from_b.aspects.length,
    b_from_a_count: bidirectionalOverlays.b_from_a.aspects.length
  });

  // Compute combined relational metrics (static baseline only, no daily transits in this mode)
  const relationalBalanceMeter = computeCombinedRelationalMetrics(
    synastryAspects,
    composite.aspects,
    {}, // Person A transits (empty until Balance Meter mode)
    {}  // Person B transits (empty until Balance Meter mode)
  );

  const vectorIntegrityTags = generateVectorIntegrityTags(synastryAspects, composite.aspects);

  // Generate Mirror Voice for the relationship
  const mirrorVoice = {
    relationship_climate: `${relationalBalanceMeter.climate_description}`,
    polarity_summary: polarityCards.length > 0 ? 
      `${polarityCards.length} primary polarity tensions identified` : 
      'No major polarity tensions detected',
    echo_pattern_summary: echoLoops.length > 0 ? 
      `${echoLoops.length} recurring feedback loops active` : 
      'No significant echo patterns detected',
    shared_field_description: `Relational field with ${synastryAspects?.length || 0} cross-chart connections`
  };

  // Relocation notes (basic implementation - would need actual relocation logic)
  const relocationNotes = {
    relocation_applied: false,
    house_system: 'Placidus', // Default
    angles_relocated: false,
    baseline_remains_natal: true,
    disclosure: 'No relocation applied; all angles and houses remain natal'
  };

  return {
    relational_mirror: {
      polarity_cards: polarityCards,
      echo_loops: echoLoops,
      sst_tags: sstTags,
      // New: Bidirectional overlays (preserves asymmetry)
      bidirectional_overlays: bidirectionalOverlays,
      // Legacy: Deprecated averaged metrics (for compatibility)
      relational_balance_meter: relationalBalanceMeter,
      mirror_voice: mirrorVoice,
      vector_integrity_tags: vectorIntegrityTags,
      relocation_notes: relocationNotes,
      scaffolding_complete: true,
      mirror_type: 'bidirectional_relational_mirror',
      synastry_aspects: synastryAspects // Include raw for reference
    }
  };
}

/**
 * Compute composite chart transits using the transit-aspects-data endpoint
 * @param {Object} compositeRaw - Raw composite chart data (first_subject from composite calculation)
 * @param {string} start - Start date (YYYY-MM-DD)
 * @param {string} end - End date (YYYY-MM-DD) 
 * @param {string} step - Step size (daily, weekly, etc)
 * @param {Object} pass - Additional parameters to pass through
 * @param {Object} H - Headers for API request
 * @returns {Object} Object with transitsByDate and optional note
 */
async function computeCompositeTransits(compositeRaw, start, end, step, pass = {}, H) {
  if (!compositeRaw) return { transitsByDate: {} };
  
  const transitsByDate = {};
  const startDate = new Date(start);
  const endDate = new Date(end);
  endDate.setDate(endDate.getDate() + 1); // Make end date inclusive

  const promises = [];
  
  // Process each date in the range
  for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
    const dateString = d.toISOString().split('T')[0];
    
    // Create transit subject for current date (transiting planets at noon UTC)
    const transit_subject = {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: 12,
      minute: 0,
      city: "Greenwich",
      nation: "GB",
      latitude: 51.48,
      longitude: 0,
      timezone: "UTC",
      zodiac_type: "Tropic" // Fix: Add missing zodiac_type for composite transits
    };

    // Create payload with composite chart as first_subject and current date as transit_subject
    const payload = {
      first_subject: subjectToAPI(compositeRaw, pass), // Use composite chart as the base chart
      transit_subject: subjectToAPI(transit_subject, pass), // Current transiting planets
      ...pass                         // Include any additional parameters
    };

    // Enhanced debug logging for composite transits
    logger.debug(`Composite transit API call for ${dateString}:`, {
      pass_keys: Object.keys(pass),
      composite_subject: compositeRaw?.name || 'Unknown composite'
    });
    logger.debug(`Full composite transit API payload for ${dateString}:`, JSON.stringify(payload, null, 2));

    promises.push(
      apiCallWithRetry(
        API_ENDPOINTS.TRANSIT_ASPECTS,
        {
          method: 'POST',
          headers: H,
          body: JSON.stringify(payload),
        },
        `Composite transits for ${dateString}`
      ).then(resp => {
        logger.debug(`Composite transit API response for ${dateString}:`, {
          hasAspects: !!(resp && resp.aspects),
          aspectCount: (resp && resp.aspects) ? resp.aspects.length : 0,
          responseKeys: resp ? Object.keys(resp) : 'null response'
        });

        // Store aspects for this date if any exist
        if (resp.aspects && resp.aspects.length > 0) {
          transitsByDate[dateString] = resp.aspects;
          logger.debug(`Stored ${resp.aspects.length} composite aspects for ${dateString}`);
        } else {
          logger.debug(`No composite aspects found for ${dateString} - response structure:`, resp);
          logger.debug(`Full raw composite API response for ${dateString} (no aspects):`, JSON.stringify(resp, null, 2));
        }
      }).catch(e => {
        logger.warn(`Failed to get composite transits for ${dateString}:`, e.message);
        // Continue processing other dates even if one fails
      })
    );
  }

  try {
    // Execute all API calls in parallel
    await Promise.all(promises);
    
    // Return results with proper structure expected by frontend
    return { transitsByDate };
    
  } catch (e) {
    logger.error('Composite transits calculation failed:', e);
    return { 
      transitsByDate: {}, 
      _note: 'Composite transits not available in current plan' 
    };
  }
}


// --- Error ID generator ---
function generateErrorId() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `ERR-${date}-${time}-${random}`;
}


async function processMathbrain(event) {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({
          error: 'Only POST requests are allowed.',
          code: 'METHOD_NOT_ALLOWED',
          errorId: generateErrorId()
        })
      };
    }

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid JSON in request body.',
          code: 'INVALID_JSON',
          errorId: generateErrorId()
        })
      };
    }

    // --- DEV MOCK: allow UI verification without RapidAPI key ---
    const wantMock = (!process.env.RAPIDAPI_KEY || process.env.MB_MOCK === 'true') && process.env.NODE_ENV !== 'production';
    if (wantMock) {
      const today = new Date();
      const iso = today.toISOString().slice(0,10);
      const rangeStart = String(body.startDate || body.transitStartDate || iso);
      const mock = {
        success: true,
        provenance: { source: 'mock', engine: 'MathBrain', version: '0.0-dev' },
        context: { mode: body?.context?.mode || 'mirror', translocation: body?.translocation || { applies: false, method: 'Natal' } },
        person_a: {
          meta: { birth_time_known: true, time_precision: 'exact', houses_suppressed: false, effective_time_used: '12:00' },
          details: body.personA || {},
          chart: { transitsByDate: { [rangeStart]: [{ p1_name: 'Sun', p2_name: 'Mars', aspect: 'square', orb: 1.2, _class: 'major' }] } },
          derived: { seismograph_summary: { magnitude: 2.3, directional_bias: 3.0, volatility: 1.1 } }
        },
        person_b: body.personB ? { details: body.personB, chart: { } } : undefined,
        woven_map: { type: body.personB ? 'dyad' : 'solo', schema: 'WM-Chart-1.2', hook_stack: { tier_1_orbs: 2 } }
      };
      return { statusCode: 200, body: JSON.stringify(mock) };
    }

    // --- PRODUCTION CHECK: Require RAPIDAPI_KEY in production ---
    const rapidKey = process.env.RAPIDAPI_KEY && String(process.env.RAPIDAPI_KEY).trim();
    if (!rapidKey) {
      if (!loggedMissingRapidApiKey) {
        logger.error('RAPIDAPI_KEY environment variable is not configured');
        loggedMissingRapidApiKey = true;
      }
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Service configuration error: RAPIDAPI_KEY is not configured',
          code: 'RAPIDAPI_KEY_MISSING',
          errorId: generateErrorId(),
          hint: 'Please configure RAPIDAPI_KEY in your deployment environment variables. Get your key from https://rapidapi.com/hub'
        })
      };
    }

  // Check if this is a weather layering request with foundation data
  const foundationData = body.foundationData;
  const isWeatherLayering = foundationData && Object.keys(foundationData).length > 0;

  // Inputs
  const rawPersonAInput = body.personA || body.person_a || body.first_subject || body.subject || {};
  const rawPersonBInput = body.personB || body.person_b || body.second_subject || {};
  const hasPersonBInput = rawPersonBInput && Object.keys(rawPersonBInput).length > 0;
  const personA = normalizeSubjectData(rawPersonAInput);
  const personB = hasPersonBInput ? normalizeSubjectData(rawPersonBInput) : {};

  const placeholderNotices = [];
  const identitySources = {
    person_a: { name: null, source: 'user_provided', confidence: 'high' },
    person_b: null,
  };

  const nameA = typeof rawPersonAInput.name === 'string' ? rawPersonAInput.name.trim() : '';
  if (nameA) {
    personA.name = nameA;
    identitySources.person_a = { name: personA.name, source: 'user_provided', provenance: 'user_provided', confidence: 'high' };
  } else {
    const fallbackA = personA.name && personA.name !== 'Subject' ? personA.name : 'Person A';
    personA.name = fallbackA;
    identitySources.person_a = { name: personA.name, source: 'default placeholder', provenance: 'default placeholder', confidence: 'low' };
    placeholderNotices.push('Person A name supplied by default placeholder.');
  }

  if (hasPersonBInput) {
    const nameB = typeof rawPersonBInput.name === 'string' ? rawPersonBInput.name.trim() : '';
    if (nameB) {
      personB.name = nameB;
      identitySources.person_b = { name: personB.name, source: 'user_provided', provenance: 'user_provided', confidence: 'high' };
    } else {
      const fallbackB = personB.name && personB.name !== 'Subject' ? personB.name : 'Person B';
      personB.name = fallbackB;
      identitySources.person_b = { name: personB.name, source: 'default placeholder', provenance: 'default placeholder', confidence: 'low' };
      placeholderNotices.push('Person B name supplied by default placeholder.');
    }
  }

  // Use strict validator for full chart endpoints, lean for aspects-only
  // Accept multiple ways of specifying mode, including saved JSON shapes
  const modeHint = body.context?.mode || body.mode || body.contextMode?.relational || body.contextMode?.solo || '';
  const modeToken = canonicalizeMode(modeHint);
  // Time policy: read early so we can apply fallback time before validation when birth time is unknown
  const timePolicy = canonicalizeTimePolicy(body.time_policy || body.timePolicy || body.birth_time_policy);
    const wantNatalAspectsOnly = modeToken === 'NATAL_ASPECTS' || event.path?.includes('natal-aspects-data');
    const wantBirthData = modeToken === 'BIRTH_DATA' || event.path?.includes('birth-data');
    const wantSynastry = modeToken === 'SYNASTRY' || modeToken === 'SYNASTRY_TRANSITS';
    const wantSynastryAspectsOnly = modeToken === 'SYNASTRY_ASPECTS' || event.path?.includes('synastry-aspects-data');
    const wantComposite = modeToken === 'COMPOSITE' || modeToken === 'COMPOSITE_ASPECTS' || modeToken === 'COMPOSITE_TRANSITS' || body.wantComposite === true;
    const wantSkyTransits = modeToken === 'SKY_TRANSITS' || modeToken === 'WEATHER' || body.context?.type === 'weather';
  const wantBalanceMeter = modeToken === 'BALANCE_METER' || body.context?.mode === 'balance_meter';
  const includeTransitTag = !!body.includeTransitTag;

    // --- Relationship Context Validation (Partner / Friend / Family) ---
    // Canonical enumerations supplied by product spec
    const REL_PRIMARY = ['PARTNER','FRIEND','FAMILY']; // FRIEND covers Friend / Colleague
    const PARTNER_TIERS = ['P1','P2','P3','P4','P5a','P5b'];
    const FRIEND_ROLES = ['Acquaintance','Mentor','Other','Custom'];
    const FAMILY_ROLES = ['Parent','Offspring','Sibling','Cousin','Extended','Guardian','Mentor','Other','Custom'];

    function normalizeRelType(t){
      if(!t) return '';
      const up = t.toString().trim().toUpperCase();
      if (up.startsWith('FRIEND')) return 'FRIEND';
      if (up === 'COLLEAGUE' || up.includes('COLLEAGUE')) return 'FRIEND';
      if (up.startsWith('FAMILY')) return 'FAMILY';
      if (up.startsWith('PARTNER')) return 'PARTNER';
      return up; // fallback; will validate later
    }

    function validateRelationshipContext(raw, isRelationshipMode){
      if(!isRelationshipMode) return { valid: true, value: null, reason: 'Not in relationship mode' };
      // Accept multiple aliases including saved config shape `relationalContext`
      const ctx = raw || body.relationship || body.relationship_context || body.relationshipContext || body.relationalContext || {};
      const errors = [];
      const cleaned = {};
      cleaned.contact_state = 'ACTIVE';

      cleaned.type = normalizeRelType(ctx.type || ctx.relationship_type || ctx.category);
      if(!REL_PRIMARY.includes(cleaned.type)) {
        errors.push('relationship.type required (PARTNER|FRIEND|FAMILY)');
      }

      // Intimacy tier requirement for PARTNER
      if (cleaned.type === 'PARTNER') {
        cleaned.intimacy_tier = (ctx.intimacy_tier || ctx.tier || '').toString();
        if(!PARTNER_TIERS.includes(cleaned.intimacy_tier)) {
          errors.push(`intimacy_tier required for PARTNER (one of ${PARTNER_TIERS.join(',')})`);
        }
      }

      // Role requirement for FAMILY; optional for FRIEND
      if (cleaned.type === 'FAMILY') {
        // Accept relationship_role alias; normalize case (e.g., "parent" -> "Parent")
        const roleRaw = (ctx.role || ctx.family_role || ctx.relationship_role || '').toString();
        const roleCanon = roleRaw ? roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1).toLowerCase() : '';
        cleaned.role = roleCanon;
        if(!FAMILY_ROLES.includes(cleaned.role)) {
          errors.push(`role required for FAMILY (one of ${FAMILY_ROLES.join(',')})`);
        }
      } else if (cleaned.type === 'FRIEND') {
        const roleRaw = (ctx.role || ctx.friend_role || ctx.relationship_role || '').toString();
        const roleCanon = roleRaw ? roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1).toLowerCase() : '';
        cleaned.role = roleCanon;
        if (cleaned.role && !FRIEND_ROLES.includes(cleaned.role)) {
          errors.push(`friend role invalid (optional, one of ${FRIEND_ROLES.join(',')})`);
        }
      }

      // Ex / Estranged flag only for PARTNER or FAMILY
      if (ctx.ex_estranged !== undefined || ctx.ex || ctx.estranged || ctx.is_ex_relationship !== undefined) {
        const flag = Boolean(ctx.ex_estranged || ctx.ex || ctx.estranged || ctx.is_ex_relationship);
        if (cleaned.type === 'FRIEND') {
          errors.push('ex_estranged flag not allowed for FRIEND');
        } else {
          cleaned.ex_estranged = flag;
        }
      }

      if (ctx.notes) cleaned.notes = (ctx.notes || '').toString().slice(0, 500);

      const contactRaw = ctx.contact_state ?? ctx.contactState ?? ctx.contact_status ?? ctx.contactStateRaw ?? ctx.contact_mode ?? ctx.activation ?? ctx.contact;
      if (contactRaw !== undefined && contactRaw !== null && String(contactRaw).trim()) {
        const contactCanon = String(contactRaw).trim().toUpperCase();
        if (contactCanon === 'ACTIVE' || contactCanon === 'LATENT') {
          cleaned.contact_state = contactCanon;
        } else {
          errors.push('contact_state invalid (ACTIVE|LATENT)');
        }
      }

      if(errors.length) return { valid:false, errors, value: cleaned };
      return { valid:true, value: cleaned };
    }


  // Keep originals for provenance/meta before applying fallback hour/minute
  const personAOriginal = { ...personA };
  const personBOriginal = hasPersonBInput ? { ...personB } : null;

  // Apply time_policy fallback for unknown birth time to satisfy API validators while preserving provenance
    const applyFallbackTime = (s) => {
      if (!s) return s;
      const missing = s.hour == null || s.minute == null;
      if (!missing) return s;
      if (timePolicy === 'planetary_only' || timePolicy === 'whole_sign' || timePolicy === 'sensitivity_scan') {
        return { ...s, hour: 12, minute: 0 };
      }
      return s;
    };
    Object.assign(personA, applyFallbackTime(personA));
    Object.assign(personB, applyFallbackTime(personB));

    const vA = (wantNatalAspectsOnly || wantBirthData) ? validateSubjectLean(personA) : validateSubject(personA);
    if (!vA.isValid) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: `Primary subject validation failed: ${vA.message}`,
          code: 'VALIDATION_ERROR_A',
          errorId: generateErrorId()
        })
      };
    }

    // Relationship mode strict validation for Person B (fail loud, no silent fallback)
    const relationshipMode = wantSynastry || wantSynastryAspectsOnly || wantComposite;
    
    // Debug logging for Balance Meter logic - Part 1
    logger.debug('Balance Meter decision variables (Part 1):', {
      wantBalanceMeter,
      modeToken,
      contextMode: body.context?.mode,
      relationshipMode,
      wantSynastry,
      wantSynastryAspectsOnly,
      wantComposite
    });
    
    let personBStrictValidation = { isValid: false, errors: { reason: 'Not requested' } };
    // Relationship context validation (must precede Person B requirements messaging to give precise feedback)
    const relContextValidation = validateRelationshipContext(body.relationship_context || body.relationshipContext, relationshipMode);
    if (relationshipMode && !relContextValidation.valid) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Relationship context invalid',
          code: 'REL_CONTEXT_INVALID',
          errorId: generateErrorId(),
          issues: relContextValidation.errors || []
        })
      };
    }
    if (relationshipMode) {
      // Auto-fill default zodiac_type if missing BEFORE validation to reduce false negatives
      if (!personB.zodiac_type) personB.zodiac_type = 'Tropic';
      personBStrictValidation = validateSubjectStrictWithMap(personB);
      if (!personBStrictValidation.isValid) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Secondary subject validation failed',
            code: 'VALIDATION_ERROR_B',
            mode: modeToken,
            errorId: generateErrorId(),
            fieldErrors: personBStrictValidation.errors
          })
        };
      }
    }

  // Accept both legacy transit* fields and a consolidated body.window = { start, end, step }
    const win = body.window || body.transit_window || null;
    const start = (win && (win.start || win.startDate)) || body.start || body.startDate || body.transitStartDate || body.transit_start_date || body.transitParams?.startDate || body.transit?.startDate;
    const end   = (win && (win.end || win.endDate))     || body.end   || body.endDate   || body.transitEndDate   || body.transit_end_date   || body.transitParams?.endDate || body.transit?.endDate;
    const step  = normalizeStep((win && (win.step || win.interval)) || body.step || body.interval || body.transitStep || body.transit_step || body.transitParams?.step || body.transit?.step);
    const haveRange = Boolean(start && end);
    
    // Debug logging for Balance Meter logic - Part 2
    logger.debug('Balance Meter decision variables (Part 2):', {
      haveRange,
      start,
      end
    });

  let headers;
    try {
      headers = buildHeaders();
    } catch (e) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: e.message,
          code: 'CONFIG_ERROR',
          errorId: generateErrorId()
        })
      };
    }

    // Early safety: LOCATION_REQUIRED when Balance Meter (or Mirror+climate) lacks transit location
    const hasLoc = (s)=> s && typeof s.latitude === 'number' && typeof s.longitude === 'number' && !!s.timezone;
    // Transit subjects: allow explicit transit_subject, else default to personA
    const transitA_raw = body.transit_subject || personA;
    const transitB_raw = body.transit_subject_B || body.second_transit_subject || personB;

    const translocationRaw = body.translocation || body.context?.translocation || null;
    const translocationBlock = normalizeTranslocationBlock(translocationRaw);
    const aLocal = body.personA?.A_local || body.subjectA?.A_local || body.A_local || null;
    const bLocal = body.personB?.B_local || body.B_local || null;
    const fallbackModeToken = normalizeRelocationMode(
      body.relocation_mode || body.context?.relocation_mode || translocationBlock?.method
    );
    const relocationRequested = !!(translocationBlock && translocationBlock.applies);
    let relocationMode = 'none';
    if (relocationRequested) {
      relocationMode = normalizeRelocationMode(translocationBlock.method) || (fallbackModeToken && fallbackModeToken !== 'none' ? fallbackModeToken : 'Custom');
    } else if (fallbackModeToken && fallbackModeToken !== 'none') {
      relocationMode = fallbackModeToken;
    }

    if (relocationMode === 'Midpoint') {
      return { statusCode: 400, body: JSON.stringify({ code:'RELOCATION_UNSUPPORTED', error:'Midpoint relocation is not supported for this protocol. Use A_local, B_local, or Both_local.', errorId: generateErrorId() }) };
    }

    const reportContextMode = (body.context?.mode || '').toString().toLowerCase();
    const isMirrorReport = reportContextMode === 'mirror';
    const isBalanceReport = wantBalanceMeter || reportContextMode === 'balance_meter';
    const hasPersonB = hasPersonBInput;
    const guardMode = (() => {
      if (relocationMode === 'none') return 'A_natal';
      if (relocationMode === 'Custom') return 'A_local';
      return relocationMode;
    })();
    const relocationGuardReason = (() => {
      if (!isMirrorReport && !isBalanceReport) return null;
      if (isMirrorReport) {
        if (guardMode === 'Midpoint') {
          return 'Midpoint relocation is only supported in Relational Balance reports.';
        }
        if ((guardMode === 'B_local' || guardMode === 'B_natal') && !hasPersonB) {
          return `Relocation mode ${guardMode} requires Person B in a relational report.`;
        }
        const allowedMirror = new Set(['A_local', 'A_natal']);
        if (hasPersonB) {
          allowedMirror.add('B_local');
          allowedMirror.add('B_natal');
          allowedMirror.add('Both_local');
        }
        return allowedMirror.has(guardMode) ? null : `Relocation mode ${relocationMode} is not valid for Mirror reports.`;
      }
      // Balance guardrails
      if ((guardMode === 'B_local' || guardMode === 'B_natal' || guardMode === 'Midpoint') && !hasPersonB) {
        return guardMode === 'Midpoint'
          ? 'Midpoint relocation requires both Person A and Person B.'
          : `Relocation mode ${guardMode} requires Person B in this Balance report.`;
      }
      const allowedBalance = new Set(['A_local', 'A_natal']);
      if (hasPersonB) {
        allowedBalance.add('B_local');
        allowedBalance.add('B_natal');
        allowedBalance.add('Midpoint');
        allowedBalance.add('Both_local');
      }
      return allowedBalance.has(guardMode) ? null : `Relocation mode ${relocationMode} is not valid for Balance reports.`;
    })();
    if (relocationGuardReason) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          code: 'invalid_relocation_mode_for_report',
          error: relocationGuardReason,
          errorId: generateErrorId()
        })
      };

    }

    if (wantBalanceMeter) {
      if (!haveRange) {
        return { statusCode: 400, body: JSON.stringify({ code:'WINDOW_REQUIRED', error:'Balance Meter requires a time window (start, end, step)', errorId: generateErrorId() }) };
      }
      const cityModeA = !!(aLocal?.city && aLocal?.nation) || !!(personA?.city && personA?.nation);
      const cityModeB = hasPersonB && !!((body.personB?.B_local?.city && body.personB?.B_local?.nation) || (personB.city && personB.nation));
      if (!hasLoc(transitA_raw) && !cityModeA) {
        return { statusCode: 400, body: JSON.stringify({ code:'LOCATION_REQUIRED', error:'Balance Meter requires location (coords or city/nation) for A', errorId: generateErrorId() }) };
      }
      if (hasPersonB && !hasLoc(transitB_raw || {}) && !cityModeB) {
        return { statusCode: 400, body: JSON.stringify({ code:'LOCATION_REQUIRED', error:'Balance Meter dyad requires location (coords or city/nation) for Person B', errorId: generateErrorId() }) };
      }
    } else if ((modeToken === 'MIRROR' || body.context?.mode === 'mirror') && includeTransitTag) {
      if (!hasLoc(transitA_raw)) {
        return { statusCode: 400, body: JSON.stringify({ code:'LOCATION_REQUIRED', error:'Mirror with Climate Tag requires location', errorId: generateErrorId() }) };
      }
    }

    // Build API-shaped subjects now so timezone checks apply to effective transit subjects
    const natalA = personA; // already normalized
    const natalB = hasPersonB ? personB : null;
    let transitA = { ...transitA_raw };
    let transitB = transitB_raw ? { ...transitB_raw } : (natalB ? { ...natalB } : null);

    // Apply relocation modes
    let relocationCoords = null;
    let relocationApplied = false;
    let relocationAppliedA = false;
    let relocationAppliedB = false;
    let relocationLabel = translocationBlock?.current_location || (aLocal?.label ?? null);

    if (relocationMode === 'Midpoint' && transitB) {
      if (typeof transitA.latitude !== 'number' || typeof transitA.longitude !== 'number' || typeof transitB.latitude !== 'number' || typeof transitB.longitude !== 'number') {
        return { statusCode: 400, body: JSON.stringify({ code:'LOCATION_REQUIRED', error:'Midpoint relocation requires coords for both persons', errorId: generateErrorId() }) };
      }
      const mid = (function midpointCoords(lat1, lon1, lat2, lon2){
        const toRad = d => d * Math.PI / 180; const toDeg = r => r * 180 / Math.PI;
        const φ1 = toRad(lat1), λ1 = toRad(lon1); const φ2 = toRad(lat2), λ2 = toRad(lon2);
        const x1 = Math.cos(φ1) * Math.cos(λ1), y1 = Math.cos(φ1) * Math.sin(λ1), z1 = Math.sin(φ1);
        const x2 = Math.cos(φ2) * Math.cos(λ2), y2 = Math.cos(φ2) * Math.sin(λ2), z2 = Math.sin(φ2);
        const xm = (x1+x2)/2, ym=(y1+y2)/2, zm=(z1+z2)/2; const φm = Math.atan2(zm, Math.sqrt(xm*xm+ym*ym)); const λm = Math.atan2(ym, xm);
        return { latitude: toDeg(φm), longitude: toDeg(λm) };
      })(transitA.latitude, transitA.longitude, transitB.latitude, transitB.longitude);
      try {
        const tz = require('tz-lookup')(mid.latitude, mid.longitude);
        transitA = { ...transitA, latitude: mid.latitude, longitude: mid.longitude, timezone: tz };
        transitB = transitB ? { ...transitB, latitude: mid.latitude, longitude: mid.longitude, timezone: tz } : transitB;
        relocationCoords = { lat: mid.latitude, lon: mid.longitude, tz };
        relocationApplied = true;
        relocationAppliedA = true;
        if (transitB) relocationAppliedB = true;
      } catch {
        return { statusCode: 422, body: JSON.stringify({ code:'HOUSES_UNSTABLE', error:'Midpoint timezone lookup failed; try custom location', errorId: generateErrorId() }) };
      }
    } else if (relocationMode === 'A_local') {
      const loc = (() => {
        // Check translocationBlock.current_location first (most common structure)
        if (translocationBlock?.current_location && typeof translocationBlock.current_location.latitude === 'number' && typeof translocationBlock.current_location.longitude === 'number') {
          return { lat: Number(translocationBlock.current_location.latitude), lon: Number(translocationBlock.current_location.longitude), tz: translocationBlock.current_location.timezone };
        }
        if (translocationBlock?.coords && typeof translocationBlock.coords.latitude === 'number' && typeof translocationBlock.coords.longitude === 'number') {
          return { lat: Number(translocationBlock.coords.latitude), lon: Number(translocationBlock.coords.longitude), tz: translocationBlock.tz };
        }
        if (typeof translocationBlock?.latitude === 'number' && typeof translocationBlock?.longitude === 'number') {
          return { lat: Number(translocationBlock.latitude), lon: Number(translocationBlock.longitude), tz: translocationBlock.tz };
        }
        if (aLocal) {
          if (typeof aLocal.lat === 'number' && typeof aLocal.lon === 'number') {
            return { lat: Number(aLocal.lat), lon: Number(aLocal.lon), tz: aLocal.tz || aLocal.timezone };
          }
          if (typeof aLocal.latitude === 'number' && typeof aLocal.longitude === 'number') {
            return { lat: Number(aLocal.latitude), lon: Number(aLocal.longitude), tz: aLocal.timezone || aLocal.tz };
          }
        }
        if (body.custom_location && typeof body.custom_location.latitude === 'number' && typeof body.custom_location.longitude === 'number') {
          return { lat: Number(body.custom_location.latitude), lon: Number(body.custom_location.longitude), tz: body.custom_location.timezone };
        }
        return null;
      })();
      if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lon)) {
        try {
          const tzRaw = loc.tz || translocationBlock?.tz;
          const tz = tzRaw ? normalizeTimezone(tzRaw) : require('tz-lookup')(loc.lat, loc.lon);
          transitA = { ...transitA, latitude: loc.lat, longitude: loc.lon, timezone: tz };
          if (transitB) transitB = { ...transitB, latitude: loc.lat, longitude: loc.lon, timezone: tz };
          relocationCoords = { lat: loc.lat, lon: loc.lon, tz };
          relocationApplied = true;
          relocationAppliedA = true;
          if (!relocationLabel) {
            if (translocationBlock?.current_location) relocationLabel = translocationBlock.current_location;
            else if (aLocal?.city && aLocal?.nation) relocationLabel = `${aLocal.city}, ${aLocal.nation}`;
          }
        } catch {
          return { statusCode: 400, body: JSON.stringify({ code:'TZ_LOOKUP_FAIL', error:'Could not resolve A_local timezone', errorId: generateErrorId() }) };
        }
      } else if (aLocal?.city && aLocal?.nation) {
        transitA = { ...transitA, city: aLocal.city, nation: aLocal.nation };
        if (transitB) transitB = { ...transitB, city: aLocal.city, nation: aLocal.nation };
        if (!relocationLabel) relocationLabel = `${aLocal.city}, ${aLocal.nation}`;
      }
    } else if (relocationMode === 'Both_local') {
      const loc = (() => {
        // Check translocationBlock.current_location first (most common structure)
        if (translocationBlock?.current_location && typeof translocationBlock.current_location.latitude === 'number' && typeof translocationBlock.current_location.longitude === 'number') {
          return { lat: Number(translocationBlock.current_location.latitude), lon: Number(translocationBlock.current_location.longitude), tz: translocationBlock.current_location.timezone, label: translocationBlock.current_location.label };
        }
        if (translocationBlock?.coords && typeof translocationBlock.coords.latitude === 'number' && typeof translocationBlock.coords.longitude === 'number') {
          return { lat: Number(translocationBlock.coords.latitude), lon: Number(translocationBlock.coords.longitude), tz: translocationBlock.tz, label: translocationBlock.current_location };
        }
        if (typeof translocationBlock?.latitude === 'number' && typeof translocationBlock?.longitude === 'number') {
          return { lat: Number(translocationBlock.latitude), lon: Number(translocationBlock.longitude), tz: translocationBlock.tz, label: translocationBlock.current_location };
        }
        if (body.custom_location && typeof body.custom_location.latitude === 'number' && typeof body.custom_location.longitude === 'number') {
          return { lat: Number(body.custom_location.latitude), lon: Number(body.custom_location.longitude), tz: body.custom_location.timezone, label: body.custom_location.label };
        }
        if (aLocal && typeof aLocal.lat === 'number' && typeof aLocal.lon === 'number') {
          return { lat: Number(aLocal.lat), lon: Number(aLocal.lon), tz: aLocal.tz || aLocal.timezone, label: aLocal.label || (aLocal.city && aLocal.nation ? `${aLocal.city}, ${aLocal.nation}` : undefined) };
        }
        if (aLocal && typeof aLocal.latitude === 'number' && typeof aLocal.longitude === 'number') {
          return { lat: Number(aLocal.latitude), lon: Number(aLocal.longitude), tz: aLocal.timezone || aLocal.tz, label: aLocal.label || (aLocal.city && aLocal.nation ? `${aLocal.city}, ${aLocal.nation}` : undefined) };
        }
        if (bLocal && typeof bLocal.lat === 'number' && typeof bLocal.lon === 'number') {
          return { lat: Number(bLocal.lat), lon: Number(bLocal.lon), tz: bLocal.tz || bLocal.timezone, label: bLocal.label || (bLocal.city && bLocal.nation ? `${bLocal.city}, ${bLocal.nation}` : undefined) };
        }
        if (bLocal && typeof bLocal.latitude === 'number' && typeof bLocal.longitude === 'number') {
          return { lat: Number(bLocal.latitude), lon: Number(bLocal.longitude), tz: bLocal.timezone || bLocal.tz, label: bLocal.label || (bLocal.city && bLocal.nation ? `${bLocal.city}, ${bLocal.nation}` : undefined) };
        }
        return null;
      })();
      if (!loc) {
        return { statusCode: 400, body: JSON.stringify({ code:'LOCATION_REQUIRED', error:'Both_local relocation requires shared coordinates', errorId: generateErrorId() }) };
      }
      try {
        const tzRaw = loc.tz || translocationBlock?.tz;
        const tz = tzRaw ? normalizeTimezone(tzRaw) : require('tz-lookup')(loc.lat, loc.lon);
        transitA = { ...transitA, latitude: loc.lat, longitude: loc.lon, timezone: tz };
        if (transitB) transitB = { ...transitB, latitude: loc.lat, longitude: loc.lon, timezone: tz };
        relocationCoords = { lat: loc.lat, lon: loc.lon, tz };
        relocationApplied = true;
        relocationAppliedA = true;
        if (transitB) relocationAppliedB = true;
        if (!relocationLabel) relocationLabel = translocationBlock?.current_location || loc.label || null;
      } catch {
        return { statusCode: 400, body: JSON.stringify({ code:'TZ_LOOKUP_FAIL', error:'Could not resolve Both_local timezone', errorId: generateErrorId() }) };
      }
    } else if (relocationMode === 'B_local') {
      if (natalB && transitB && hasLoc(transitB)) {
        // leave as provided
        relocationApplied = true;
        relocationAppliedB = true;
      } else if (natalB) {
        return { statusCode: 400, body: JSON.stringify({ code:'LOCATION_REQUIRED', error:'B_local requires coords for Person B', errorId: generateErrorId() }) };
      }
    } else if (relocationMode === 'Custom' && body.custom_location) {
      const c = body.custom_location;
      if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number') {
        return { statusCode: 400, body: JSON.stringify({ code:'LOCATION_REQUIRED', error:'Custom relocation requires coords', errorId: generateErrorId() }) };
      }
      try {
        const tzRaw = c.timezone || translocationBlock?.tz;
        const tz = tzRaw ? normalizeTimezone(tzRaw) : require('tz-lookup')(c.latitude, c.longitude);
        transitA = { ...transitA, latitude: c.latitude, longitude: c.longitude, timezone: tz };
        if (transitB) transitB = { ...transitB, latitude: c.latitude, longitude: c.longitude, timezone: tz };
        relocationCoords = { lat: c.latitude, lon: c.longitude, tz };
        relocationApplied = true;
        relocationAppliedA = true;
        if (hasPersonBInput) relocationAppliedB = true;
        if (!relocationLabel) relocationLabel = c.label || null;
      } catch {
        return { statusCode: 400, body: JSON.stringify({ code:'TZ_LOOKUP_FAIL', error:'Could not resolve custom timezone', errorId: generateErrorId() }) };
      }
    }

    relocationApplied = relocationApplied || relocationAppliedA || relocationAppliedB;

    // TZ mismatch detection for A (+B if present)
    try {
      if (hasLoc(transitA)) {
        const tz = require('tz-lookup')(transitA.latitude, transitA.longitude);
        if (transitA.timezone && transitA.timezone !== tz) {
          return { statusCode: 400, body: JSON.stringify({ code:'TZ_MISMATCH', error:'Provided timezone does not match coordinates', suggested_timezone: tz, errorId: generateErrorId() }) };
        }
        if (!transitA.timezone) transitA.timezone = tz;
      }
      if (transitB && hasLoc(transitB)) {
        const tzB = require('tz-lookup')(transitB.latitude, transitB.longitude);
        if (transitB.timezone && transitB.timezone !== tzB) {
          return { statusCode: 400, body: JSON.stringify({ code:'TZ_MISMATCH', error:'Provided timezone for Person B does not match coordinates', suggested_timezone: tzB, errorId: generateErrorId() }) };
        }
        if (!transitB.timezone) transitB.timezone = tzB;
      }
    } catch {
      // fall through; if tz-lookup failed we return a generic
    }

    const contextModeCanonical = canonicalizeMode(body.context?.mode || '');
    const isNowMode = (
      modeToken === 'NOW' ||
      modeToken === 'TRANSIT_NOW' ||
      contextModeCanonical === 'NOW' ||
      contextModeCanonical === 'TRANSIT_NOW' ||
      wantSkyTransits
    );

    // Timezone precedence: relocation > user-provided transit > natal
    const effectiveTimezone = normalizeTimezone(
      relocationCoords?.tz || transitA?.timezone || personA.timezone || 'UTC'
    );
    let tzAuthority = 'natal_record';
    if (isNowMode) tzAuthority = 'transit_now';
    if (relocationApplied || relocationCoords?.tz) tzAuthority = 'relocation_block';
    if (transitA?.timezone && !relocationCoords?.tz) tzAuthority = 'user_provided';

  const transitTimeContext = deriveTransitTimeSpecFromBody(body, transitA?.timezone || effectiveTimezone, { isNowMode });
  const transitTimeSpec = transitTimeContext.spec;
  const transitTimePolicy = transitTimeContext.policy;
  const transitTimeSource = transitTimeContext.source;

    // High-latitude guard
    const unstable = (lat)=> Math.abs(Number(lat)) >= 66.0;
    if (hasLoc(transitA) && unstable(transitA.latitude)) {
      return { statusCode: 422, body: JSON.stringify({ code:'HOUSES_UNSTABLE', error:'House math may be unstable at this latitude; consider whole-sign or different location', errorId: generateErrorId() }) };
    }
    if (transitB && hasLoc(transitB) && unstable(transitB.latitude)) {
      return { statusCode: 422, body: JSON.stringify({ code:'HOUSES_UNSTABLE', error:'House math may be unstable for Person B at this latitude; consider whole-sign or different location', errorId: generateErrorId() }) };
    }

  // timePolicy is already determined earlier to allow fallback time before validation

  const footnotes = [];
  const backstageLabels = {
    A_to_B_synastry: [],
    B_to_A_synastry: [],
    Transit_to_A: [],
    Transit_to_B: []
  };

  const result = {
      schema: SCHEMA_VERSION,
      provenance: {
        math_brain_version: MATH_BRAIN_VERSION,
        ephemeris_source: EPHEMERIS_SOURCE,
        build_ts: new Date().toISOString(),
        timezone: effectiveTimezone,
        tz_authority: tzAuthority,
        relocation_applied: relocationApplied,
        tz_conflict: false,
        geometry_ready: true,
        calibration_boundary: CALIBRATION_BOUNDARY,
        engine_versions: {
          seismograph: SEISMOGRAPH_VERSION,
          balance: BALANCE_CALIBRATION_VERSION
        },
        time_meta_a: deriveTimeMetaWithPolicy(personAOriginal, timePolicy),
        // New provenance fields (stamped after pass/body are finalized below)
        house_system: undefined,
        orbs_profile: undefined,
        timezone_db_version: undefined,
        relocation_mode: relocationApplied ? (relocationMode || 'Custom') : (relocationMode || 'none')
      },
      engine: {
        version_notes: ['TZ Authority v1.0 (single-source guarantee)']
      },
      readiness: {
        mirror_ready: false,
        mirror_missing: [],
        balance_ready: false,
        balance_missing: []
      },
      context: {
        mode: modeToken || 'UNKNOWN',
        participants: {
          person_a: identitySources.person_a,
          ...(identitySources.person_b ? { person_b: identitySources.person_b } : {})
        }
      },
      frontstage: {
        mirror: {}
      },
      backstage: {
        data_policy: {
          aspect_payload: "filtered",
          max_aspects_per_day: 40,
          include_minor_aspects: false,
          include_angles: true
        }
      },
      contract: 'clear-mirror/1.3',
  person_a: { details: { ...personAOriginal, name: personAOriginal.name || 'Subject' }, meta: deriveTimeMetaWithPolicy(personAOriginal, timePolicy) }
    };

    const relocationDetail = deriveRelocationDetail(relocationMode, relocationAppliedA, relocationAppliedB, hasPersonBInput);

    const summaryRelocationLabel = translocationBlock?.current_location
      || translocationBlock?.label
      || translocationRaw?.current_location
      || translocationRaw?.label
      || relocationLabel
      || null;

    const relocationProvenanceSeed = {
      ...(result.provenance || {}),
      relocation_mode: relocationMode,
      relocation_label: summaryRelocationLabel,
      relocation_coords: relocationCoords
        ? {
            latitude: Number(relocationCoords.lat),
            longitude: Number(relocationCoords.lon),
            timezone: relocationCoords.tz || null,
          }
        : result.provenance?.relocation_coords ?? null,
      tz: relocationCoords?.tz || result.provenance?.tz || null,
    };

    const relocationSummary = summarizeRelocation({
      type: wantBalanceMeter ? 'balance' : (isMirrorReport ? 'mirror' : (modeToken || 'report')),
      natal: {
        name: personAOriginal?.name || personA?.name || 'Person A',
        birth_date: formatBirthDate(personAOriginal || personA),
        birth_time: formatBirthTime(personAOriginal || personA),
        birth_place: formatBirthPlace(personAOriginal || personA),
        timezone: personAOriginal?.timezone || personA?.timezone,
      },
      translocation: translocationRaw || {},
      provenance: relocationProvenanceSeed,
      relocation_mode: relocationMode,
      relocation_label: summaryRelocationLabel,
    });

    result.relocation_summary = {
      active: relocationSummary.active,
      mode: relocationSummary.mode,
      scope: relocationSummary.scope,
      label: relocationSummary.label,
      status: relocationSummary.status,
      disclosure: relocationSummary.disclosure,
      invariants: relocationSummary.invariants,
      confidence: relocationSummary.confidence,
      coordinates: relocationSummary.coordinates,
    };

    const canonicalTransitLocationLabel =
      summaryRelocationLabel
      || translocationBlock?.current_location?.label
      || relocationLabel
      || (transitA?.city ? (transitA?.state ? `${transitA.city}, ${transitA.state}` : transitA.city) : null)
      || (personA?.city ? (personA?.state ? `${personA.city}, ${personA.state}` : personA.city) : null);

    const canonicalTransitLocationLabelB =
      summaryRelocationLabel
      || translocationBlock?.current_location?.label
      || relocationLabel
      || (personB?.city ? (personB?.state ? `${personB.city}, ${personB.state}` : personB.city) : null)
      || canonicalTransitLocationLabel;

    result.provenance.identity = {
      person_a: identitySources.person_a,
      ...(identitySources.person_b ? { person_b: identitySources.person_b } : {})
    };
    result.provenance.relocation_detail = relocationDetail;
    result.provenance.relocation_summary = relocationSummary.provenance;
    result.context.relocation_detail = relocationDetail;
    result.context.relocation_summary = relocationSummary;
    if (
      identitySources.person_a?.provenance !== 'user_provided' ||
      (identitySources.person_b && identitySources.person_b.provenance !== 'user_provided')
    ) {
      result.provenance.confidence = 'low';
    }

    placeholderNotices.forEach(note => footnotes.push(note));
    footnotes.push(`Person A reference: ${personA.name} (${identitySources.person_a.provenance}).`);
    if (identitySources.person_b) {
      footnotes.push(`Person B reference: ${identitySources.person_b.name} (${identitySources.person_b.provenance}).`);
    }

    const relocationNotes = new Set([
      relocationSummary.disclosure,
      relocationSummary.invariants,
    ]);
    const legacyFootnote = RELOCATION_FOOTNOTE_LABELS[relocationSummary.mode] || RELOCATION_FOOTNOTE_LABELS[String(relocationSummary.mode).toLowerCase()];
    if (legacyFootnote) relocationNotes.add(legacyFootnote);
    if (!relocationSummary.active || !relocationApplied) {
      relocationNotes.add('Relocation not applied; natal houses used.');
    }
    if (relocationSummary.confidence === 'low') {
      relocationNotes.add('Relocation confidence: low (symbolic frame).');
    }
    relocationNotes.forEach(note => {
      if (note && !footnotes.includes(note)) footnotes.push(note);
    });
    // Eagerly initialize Person B details in any relationship mode so UI never loses the panel
    if (relationshipMode && hasPersonB) {
      const detailsB = { ...(personBOriginal || personB) };
      if (!detailsB.name) detailsB.name = 'Subject B';
      result.person_b = { details: detailsB, meta: deriveTimeMetaWithPolicy(detailsB, timePolicy) };
      result.provenance.time_meta_b = deriveTimeMetaWithPolicy(detailsB, timePolicy);
    }
    if (relationshipMode && relContextValidation.valid && relContextValidation.value) {
      result.relationship = relContextValidation.value;
    }

    // Attach translocation (relocation) context from request if provided (data-only)
    try {
      const tl = normalizeTranslocationBlock(translocationRaw);
      if (tl || relocationMode !== 'none') {
        const explicitMode = relocationMode !== 'none' ? relocationMode : null;
        const normalizedMethod = explicitMode || normalizeRelocationMode(tl?.method) || null;
        const fallbackMethod = (() => {
          if (normalizedMethod && normalizedMethod !== 'none') return normalizedMethod;
          if (normalizedMethod === 'none') return 'Natal';
          return tl?.applies ? 'Custom' : 'Natal';
        })();
        const ctxApplies = normalizedMethod
          ? !['A_natal', 'B_natal', 'none'].includes(normalizedMethod)
          : !!tl?.applies;
        const ctxMethod = fallbackMethod;
        const tzSource = tl?.tz || relocationCoords?.tz || transitA?.timezone || personA.timezone || 'UTC';
        const coordsBlock = (() => {
          if (tl?.coords && typeof tl.coords.latitude === 'number' && typeof tl.coords.longitude === 'number') {
            return { latitude: Number(tl.coords.latitude), longitude: Number(tl.coords.longitude) };
          }
          if (typeof tl?.latitude === 'number' && typeof tl?.longitude === 'number') {
            return { latitude: Number(tl.latitude), longitude: Number(tl.longitude) };
          }
          if (relocationCoords) {
            return { latitude: Number(relocationCoords.lat), longitude: Number(relocationCoords.lon) };
          }
          return undefined;
        })();
        const currentLocation = tl?.current_location || relocationLabel || (aLocal?.city && aLocal?.nation ? `${aLocal.city}, ${aLocal.nation}` : undefined);
        const houseSystem = tl?.house_system || 'Placidus';
        const normalizedTz = normalizeTimezone(tzSource);
        const ctx = {
          applies: ctxApplies,
          method: ctxMethod,
          house_system: houseSystem,
          tz: normalizedTz,
          requested_tz: normalizedTz,
          houses_basis: ctxApplies ? 'relocation' : 'natal'
        };
        if (currentLocation) ctx.current_location = currentLocation;
        if (coordsBlock) ctx.coords = coordsBlock;
        result.context.translocation = ctx;
      }
    } catch { /* ignore */ }

    try {
      const transCtx = result.context?.translocation || null;
      let tzConflict = false;
      let conflictReason = null;
      if (transCtx) {
        const ctxTz = transCtx.tz;
        if (ctxTz && ctxTz !== result.provenance.timezone) {
          if (relocationApplied) {
            tzConflict = true;
            conflictReason = 'translocation tz mismatch';
          } else {
            transCtx.tz = null;
            tzConflict = false;
            conflictReason = null;
          }
        }
      }
      result.provenance.tz_conflict = tzConflict;
      result.provenance.geometry_ready = !tzConflict;
      result.provenance.tz_conflict_reason = conflictReason;
    } catch { /* ignore */ }

    // Extract additional parameters for API calculations (including transits)
    const pass = {};
    [
      'active_points',
      'active_aspects',
      'houses_system_identifier',
      'sidereal_mode',
      'perspective_type',
      'wheel_only',
      'wheel_format',
      'theme',
      'language'
    ].forEach((key) => {
      if (body[key] !== undefined) pass[key] = body[key];
    });
    // Quarantine UI/VOICE flags so they never touch math layer
    const quarantineKeys = ['voice','voice_mode','exclude_person_b','excludePersonB','reflect_mode','ui','display'];
    quarantineKeys.forEach(k => { if (k in pass) delete pass[k]; });

    // Ensure active_points includes all planets (especially outer planets) if not explicitly set
    if (!pass.active_points) {
      pass.active_points = [
        'Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn',
        'Uranus','Neptune','Pluto',
        'Mean_Node','True_Node','Mean_South_Node','True_South_Node',
        'Chiron','Mean_Lilith',
        'Ascendant','Medium_Coeli','Descendant','Imum_Coeli'
      ];
      logger.debug('Setting default active_points (includes True nodes & full angle set)');
    }
    // Time policy can suppress house/angle semantics: remove angles when policy forbids houses
    if (timePolicy === 'planetary_only' || timePolicy === 'sensitivity_scan') {
      pass.active_points = pass.active_points.filter(p => !['Ascendant','Medium_Coeli','Descendant','Imum_Coeli'].includes(p));
      logger.debug('Time policy excludes angular points for transits');
    }
    // Whole-sign preference: user allows houses with noon fallback; prefer whole-sign house system
    if (timePolicy === 'whole_sign' && !pass.houses_system_identifier) {
      pass.houses_system_identifier = 'Whole_Sign';
      logger.debug('Time policy set houses_system_identifier=Whole_Sign');
    }

    // Stamp provenance fields now that pass/body are known
    try {
      result.provenance.house_system = pass.houses_system_identifier || result.provenance.house_system || 'Placidus';
      // Use v5 for balance meter, spec-2025-09 for climate/weather views
      const defaultProfile = wantBalanceMeter ? 'wm-tight-2025-11-v5' : 'wm-spec-2025-09';
      result.provenance.orbs_profile = body.orbs_profile || result.provenance.orbs_profile || defaultProfile;
      result.provenance.timezone_db_version = result.provenance.timezone_db_version || 'IANA (system)';
      result.provenance.relocation_mode = relocationApplied
        ? (relocationMode || result.provenance.relocation_mode || 'Custom')
        : (relocationMode || 'none');
    } catch { /* ignore */ }

    // Ensure active_aspects includes all major aspects if not explicitly set
    if (!pass.active_aspects) {
      const { getOrbProfile } = require('../config/orb-profiles');
      const profileId = body.orbs_profile || 'wm-spec-2025-09';
      const profile = getOrbProfile(profileId);
      pass.active_aspects = Object.entries(profile.orbs).map(([name, orb]) => ({ name, orb }));
      logger.debug(`Setting default active_aspects from profile ${profileId}:`, pass.active_aspects);
    }

    // --- Aspect name normalization (handles user supplied list & legacy synonyms) ---
    const ASPECT_SYNONYMS = {
      'semisquare': 'semi-square',
      'semi_square': 'semi-square',
      'semi square': 'semi-square',
      'semisextile': 'semi-sextile',
      'semi_sextile': 'semi-sextile',
      'semi sextile': 'semi-sextile',
      'inconjunct': 'quincunx',
      'sesqui-square': 'sesquiquadrate',
      'sesquisquare': 'sesquiquadrate'
    };

    if (Array.isArray(pass.active_aspects)) {
      pass.active_aspects = pass.active_aspects
        .map(a => {
          if (!a) return null;
          if (typeof a === 'string') return { name: a, orb: 3 };
          if (typeof a === 'object') {
            const raw = (a.name || a.type || '').toString().toLowerCase();
            const canonical = ASPECT_SYNONYMS[raw] || raw;
            return { name: canonical, orb: a.orb != null ? a.orb : 3 };
          }
          return null;
        })
        .filter(Boolean)
        // Deduplicate by name keeping largest orb (we'll cap later)
        .reduce((acc, cur) => {
          const existing = acc.find(x => x.name === cur.name);
          if (!existing) acc.push(cur); else if (cur.orb > existing.orb) existing.orb = cur.orb;
          return acc;
        }, []);

      // Clamp to profile caps before calling upstream
      const { getOrbProfile } = require('../config/orb-profiles');
      const profileId = body.orbs_profile || 'wm-spec-2025-09';
      const profile = getOrbProfile(profileId);
      pass.active_aspects = pass.active_aspects.map(a => {
        const cap = profile.orbs[a.name] || a.orb;
        const clamped = Math.min(a.orb, cap);
        if (a.orb > clamped) logger.debug(`Clamping orb for ${a.name} from ${a.orb} -> ${clamped} (profile: ${profileId})`);
        return { name: a.name, orb: clamped };
      });
    }
    logger.debug('Normalized + clamped active_aspects list:', pass.active_aspects);

    // 1) Natal Chart - Person A (UNIFIED: always fetches complete data)
    // Fetch complete natal chart with aspects, house cusps, and chart wheels
    const personANatal = await fetchNatalChartComplete(
      personA,
      headers,
      pass,
      'person_a',
      modeToken || 'standard'
    );
    
    result.person_a = result.person_a || {};
    result.person_a.details = personANatal.details;
    result.person_a.chart = personANatal.chart;
    result.person_a.aspects = personANatal.aspects;
    
    // Append chart assets
    if (personANatal.assets && personANatal.assets.length > 0) {
      appendChartAssets(result.person_a, personANatal.assets);
    }
    
    // Handle legacy birth data mode (rare edge case)
    if (wantBirthData) {
      result.person_a.birth_data = stripGraphicsDeep(personANatal.chart || {});
    }

    // TRANSLOCATION: Fetch relocated chart if translocation is requested
    // This is the "Felt Weather" chart vs "Blueprint" natal chart
    let personAChartForSeismograph = personANatal.chart; // Default to natal (Blueprint)
    const translocationContext = body.translocation;
    const translocationApplies = translocationContext?.applies === true;
    
    if (translocationApplies && wantBalanceMeter) {
      logger.info('[TRANSLOCATION] Fetching relocated chart for Felt Weather seismograph');
      
      const relocatedCoords = translocationContext.coords || translocationContext.coordinates;
      if (relocatedCoords && typeof relocatedCoords.latitude === 'number' && typeof relocatedCoords.longitude === 'number') {
        // Build a relocated subject using birth time but relocated coordinates
        const relocatedSubject = {
          ...personA,
          latitude: relocatedCoords.latitude,
          longitude: relocatedCoords.longitude,
          timezone: relocatedCoords.timezone || relocatedCoords.tz || personA.timezone,
          city: relocatedCoords.city || 'Relocated Location',
          nation: relocatedCoords.nation || personA.nation
        };
        
        try {
          const personARelocated = await fetchNatalChartComplete(
            relocatedSubject,
            headers,
            pass,
            'person_a_relocated',
            'translocation_felt_weather'
          );
          
          // Use relocated chart for seismograph calculation (Felt Weather)
          personAChartForSeismograph = personARelocated.chart;
          
          // Store both charts in result for transparency
          result.person_a.chart_natal = personANatal.chart; // Blueprint
          result.person_a.chart_relocated = personARelocated.chart; // Felt Weather
          result.person_a.chart = personARelocated.chart; // Active chart = Felt Weather
          
          logger.info('[TRANSLOCATION] Successfully fetched Felt Weather chart', {
            natal_asc: personANatal.chart?.angles?.Ascendant?.abs_pos,
            relocated_asc: personARelocated.chart?.angles?.Ascendant?.abs_pos,
            coordinates: relocatedCoords
          });
          
        } catch (error) {
          logger.error('[TRANSLOCATION] Failed to fetch relocated chart, falling back to natal:', error.message);
          // Fall back to natal chart (Blueprint)
          personAChartForSeismograph = personANatal.chart;
        }
      } else {
        logger.warn('[TRANSLOCATION] Missing or invalid coordinates, using natal chart');
      }
    }

    // Birth-time suppression marker
    try {
  const birthTimeMissing = (s) => s?.hour == null || s?.minute == null;
  // Policy drives suppression: for unknown birth time, planetary_only and sensitivity_scan suppress houses; whole_sign allows
  const shouldSuppress = (s) => birthTimeMissing(s) && (timePolicy === 'planetary_only' || timePolicy === 'sensitivity_scan');
  if (shouldSuppress(personAOriginal)) result.person_a.houses_suppressed = true;
  if (result.person_b && shouldSuppress(personBOriginal || personB)) result.person_b.houses_suppressed = true;
      // Keep meta aligned with suppression and policy
  result.person_a.meta = Object.assign({}, result.person_a.meta, deriveTimeMetaWithPolicy(personAOriginal, timePolicy));
  if (result.person_b) result.person_b.meta = Object.assign({}, result.person_b.meta || {}, deriveTimeMetaWithPolicy(personBOriginal || personB, timePolicy));
    } catch {/* ignore */}

    const personBLoaded = Boolean(result.person_b && result.person_b.details && Object.keys(result.person_b.details || {}).length);
    const readinessState = computeReadinessState({
      modeToken,
      wantBalance: wantBalanceMeter,
      relationshipMode,
      personBLoaded,
      relocationMode,
      relocationApplied,
      timeMetaA: result.person_a?.meta,
      timeMetaB: result.person_b?.meta
    });
    result.readiness = readinessState;
    result.mirror_ready = readinessState.mirror.ready;
    if (!readinessState.mirror.ready) {
      result.mirror_guard = readinessState.mirror;
    }
    if (wantBalanceMeter) {
      result.balance_ready = readinessState.balance.ready;
      if (!readinessState.balance.ready) {
        result.balance_guard = readinessState.balance;
      }
    }
    result.provenance.relocation_frames = readinessState.frames;
    const frameLabels = [];
    if (readinessState.frames?.a) frameLabels.push(readinessState.frames.a);
    if (readinessState.frames?.b && readinessState.frames.b !== readinessState.frames.a) frameLabels.push(readinessState.frames.b);
    const joinedFrames = frameLabels.join(' / ') || (relocationApplied ? relocationMode || 'Custom' : 'A_natal');
    result.provenance.houses_disclosure = relocationApplied
      ? `Houses recalculated: ${joinedFrames}`
      : `Houses not recalculated: ${joinedFrames}`;

    // 2) Transits (optional; raw aspects by date, with advanced options)
    // Skip transit processing for natal_only mode even if date range is provided
    const skipTransits = modeToken === 'NATAL_ONLY';
    
    // Sky transits mode - planetary transits without personal natal chart
    if (wantSkyTransits && haveRange) {
      logger.debug('Processing sky transits mode:', { start, end, step });
      
      // Create a dummy subject for sky-only transits (no personal data)
      const skySubject = {
        name: 'Sky Patterns',
        birth_date: start, // Use start date as reference
        birth_time: '12:00',
        birth_location: 'Greenwich, UK', // Neutral location for sky patterns
        timezone: 'GMT'
      };
      
      try {
        const { transitsByDate, retroFlagsByDate, provenanceByDate } = await getTransits(
          skySubject,
          {
            startDate: start,
            endDate: end,
            step,
            timeSpec: transitTimeSpec,
            timePolicy: transitTimePolicy,
            timePrecision: 'minute',
            locationLabel: canonicalTransitLocationLabel || 'Sky Patterns',
            relocationMode
          },
          headers,
          pass
        );

        // Apply seismograph analysis to sky transits
      const seismographData = calculateSeismograph(transitsByDate, retroFlagsByDate, {
        modeToken,
        isBalance: wantBalanceMeter,
        readiness: result.readiness,
        enforceReadiness: true,
        orbsProfile: body.orbs_profile || 'wm-spec-2025-09'
      });
        
        // Store sky transit data
        result.sky_transits = {
          transitsByDate: seismographData.daily,
          provenanceByDate,
          derived: {
            seismograph_summary: seismographData.summary,
            mode: 'sky_patterns_only'
          }
        };
        
        logger.debug('Sky transits completed with seismograph analysis');
      } catch (e) {
        logger.warn('Sky transits computation failed:', e.message);
        result.sky_transits = { error: 'Failed to compute sky patterns' };
      }
    } else if (haveRange && !skipTransits) {
      // Use new getTransits and seismograph logic with configuration parameters
      // Pass house cusps from active chart (relocated if translocation applies, natal otherwise)
      const activeHouseCusps = personAChartForSeismograph?.house_cusps || null;
      if (activeHouseCusps) {
        logger.debug('Passing house cusps to getTransits for Person A', {
          chart_type: translocationApplies ? 'Felt Weather (relocated)' : 'Blueprint (natal)',
          asc: personAChartForSeismograph?.angles?.Ascendant?.abs_pos
        });
      } else {
        logger.warn('No house cusps available for transit-to-house calculation');
      }
      
      // Build subject for getTransits: use relocated coordinates if translocation applies
      let subjectForTransits = personA;
      if (translocationApplies) {
        const relocatedCoords = translocationContext.coords || translocationContext.coordinates;
        if (relocatedCoords && typeof relocatedCoords.latitude === 'number' && typeof relocatedCoords.longitude === 'number') {
          subjectForTransits = {
            ...personA,
            latitude: relocatedCoords.latitude,
            longitude: relocatedCoords.longitude,
            timezone: relocatedCoords.timezone || relocatedCoords.tz || personA.timezone,
            city: relocatedCoords.city || 'Relocated Location',
            nation: relocatedCoords.nation || personA.nation
          };
          logger.info('[TRANSLOCATION] Using relocated coordinates for transit calculation', {
            natal_coords: { lat: personA.latitude, lon: personA.longitude },
            relocated_coords: { lat: subjectForTransits.latitude, lon: subjectForTransits.longitude }
          });
        }
      }
      
      const { transitsByDate, retroFlagsByDate, provenanceByDate, chartAssets: transitChartAssets } = await getTransits(
        subjectForTransits,
        {
          startDate: start,
          endDate: end,
          step: step,
          relocationMode: relocationMode,
          locationLabel: relocationLabel,
        },
        headers,
        { ...pass, natalHouseCusps: activeHouseCusps }
      );
      result.person_a.chart = { ...result.person_a.chart, transitsByDate };
      // Add transit chart wheels
      if (transitChartAssets && transitChartAssets.length > 0) {
        appendChartAssets(result.person_a, transitChartAssets);
      }
      // Raven-lite integration: flatten all aspects for derived.t2n_aspects
      const allAspects = Object.values(transitsByDate).flatMap(day => {
        // Handle new format: day can be an object with {aspects, transit_positions, transit_houses}
        if (day && typeof day === 'object' && Array.isArray(day.aspects)) {
          return day.aspects;
        }
        // Fallback: day is already an array
        return Array.isArray(day) ? day : [];
      });
      
      logger.debug(`Transit aspects found: ${allAspects.length} total including outer planets`);
      
      const filteredA = filterPriorityAspects(allAspects);
      result.person_a.derived = result.person_a.derived || {};
      result.person_a.derived.t2n_aspects_raw = allAspects;
      // Use active chart (relocated if translocation, natal otherwise) for aspect mapping
      result.person_a.derived.t2n_aspects = mapT2NAspects(filteredA, personAChartForSeismograph);
      const frameTransitA = relocationFrameFromMode(relocationDetail.person_a?.relocation_mode);
      filteredA.forEach(aspect => {
        const entry = buildAspectLabelEntry(aspect, frameTransitA, 'Transit_to_A');
        if (entry) backstageLabels.Transit_to_A.push(entry);
      });
      // Add transit_data array for test compatibility
      result.person_a.transit_data = Object.values(transitsByDate);

      // Seismograph summary (using v5 tight profile: hard 4°, trines 3°, luminary +0.5°)
      // Balance Meter requires selective filtering to capture crisis signatures while excluding wide harmonics
  const seismographData = calculateSeismograph(transitsByDate, retroFlagsByDate, {
        orbsProfile: body.orbs_profile || 'wm-tight-2025-11-v5'
      });
      result.person_a.derived.seismograph_summary = seismographData.summary;
  // NOTE: transitsByDate now includes per-day: aspects (raw), filtered_aspects, hooks, counts, seismograph metrics
  // Frontend can progressively disclose hooks first, then filtered_aspects, then full list.
      result.person_a.chart.transitsByDate = seismographData.daily;
      result.person_a.chart.provenanceByDate = provenanceByDate;
    }

    // 2b) Dual natal modes (explicit): provide both natal charts (and optional transits) WITHOUT synastry math
    const dualNatalMode = modeToken === 'DUAL_NATAL' || modeToken === 'DUAL_NATAL_TRANSITS';
    if ((dualNatalMode || (!relationshipMode && modeToken && modeToken.startsWith('NATAL') && hasPersonB)) && hasPersonB) {
      const vBLeanPassive = validateSubjectLean(personB);
      if (vBLeanPassive.isValid) {
        if (!result.person_b || !result.person_b.chart) {
          try {
            const personBNatal = await fetchNatalChartComplete(personB, headers, pass, 'person_b', 'DUAL_NATAL_TRANSITS');
            result.person_b = {
              details: personBNatal.details,
              chart: personBNatal.chart,
              aspects: personBNatal.aspects
            };
            if (personBNatal.assets && personBNatal.assets.length > 0) {
              appendChartAssets(result.person_b, personBNatal.assets);
            }
          } catch (e) {
            logger.warn('Dual Person B natal fetch failed', e.message);
            result.person_b = { details: personB, error: 'Failed to compute Person B chart' };
          }
        }
        // Optional Person B transits in dual transits mode
        if (haveRange && !skipTransits && modeToken === 'DUAL_NATAL_TRANSITS') {
          try {
            const { transitsByDate: transitsByDateB, retroFlagsByDate: retroFlagsByDateB, provenanceByDate: provenanceByDateB } = await getTransits(
              personB,
              {
                startDate: start,
                endDate: end,
                step,
                timeSpec: transitTimeSpec,
                timePolicy: transitTimePolicy,
                timePrecision: 'minute',
                locationLabel: canonicalTransitLocationLabelB,
                relocationMode
              },
              headers,
              pass
            );
            const allB = Object.values(transitsByDateB).flatMap(day => day);
            const seismoB = calculateSeismograph(transitsByDateB, retroFlagsByDateB, {
              modeToken,
              isBalance: false,
              readiness: result.readiness,
              enforceReadiness: false,
              orbsProfile: body.orbs_profile || 'wm-spec-2025-09'
            });
            // Enriched Person B transits (dual mode) with hooks & filtered_aspects
            result.person_b.chart = { ...(result.person_b.chart || {}), transitsByDate: seismoB.daily, provenanceByDate: provenanceByDateB };
            result.person_b.derived = result.person_b.derived || {};
            result.person_b.derived.seismograph_summary = seismoB.summary;
            const filteredBExplicit = filterPriorityAspects(allB);
            result.person_b.derived.t2n_aspects_raw = allB;
            result.person_b.derived.t2n_aspects = mapT2NAspects(filteredBExplicit, result.person_b.chart); // Person B self transits (transit-to-natal B)
            const frameTransitBExplicit = relocationFrameFromMode(relocationDetail.person_b?.relocation_mode);
            filteredBExplicit.forEach(aspect => {
              const entry = buildAspectLabelEntry(aspect, frameTransitBExplicit, 'Transit_to_B');
              if (entry) backstageLabels.Transit_to_B.push(entry);
            });
            result.person_b.transit_data = Object.values(transitsByDateB);
          } catch (e) {
            logger.warn('Dual Person B transits fetch failed', e.message);
            result.person_b.transits_error = 'Failed to compute Person B transits';
          }
        }
      } else {
        result.person_b = { details: personB, validation_error: vBLeanPassive.message };
      }
    }

    // 2c) Implicit dual transit support: if mode is a single-person NATAL* variant that requests transits (e.g., NATAL_TRANSITS)
    // and Person B was supplied, compute Person B transits as well (without requiring explicit DUAL_NATAL_TRANSITS token).
    // Skip if relationshipMode (synastry/composite) to avoid duplication, and skip if already handled by explicit dual mode above.
    if (
      haveRange &&
      !skipTransits &&
      !relationshipMode &&
      hasPersonB &&
      modeToken && modeToken.startsWith('NATAL') && modeToken.includes('TRANSITS') &&
      modeToken !== 'DUAL_NATAL_TRANSITS'
    ) {
      const vBLeanPassive2 = validateSubjectLean(personB);
      if (vBLeanPassive2.isValid) {
        // Ensure we have Person B natal baseline (light fetch if missing)
        if (!result.person_b || !result.person_b.chart) {
          try {
            const personBNatal = await fetchNatalChartComplete(personB, headers, pass, 'person_b', 'implicit_dual');
            result.person_b = {
              details: personBNatal.details,
              chart: personBNatal.chart,
              aspects: personBNatal.aspects
            };
            if (personBNatal.assets && personBNatal.assets.length > 0) {
              appendChartAssets(result.person_b, personBNatal.assets);
            }
          } catch (e) {
            logger.warn('Implicit dual Person B natal fetch failed', e.message);
            result.person_b = { ...(result.person_b || {}), details: personB, error: 'Failed to compute Person B chart' };
          }
        }
        // Only compute B transits if not already present
        const hasBTransits = !!(result.person_b && result.person_b.chart && result.person_b.chart.transitsByDate);
        if (!hasBTransits) {
          try {
            const { transitsByDate: transitsByDateB, retroFlagsByDate: retroFlagsByDateB, provenanceByDate: provenanceByDateB } = await getTransits(
              personB,
              {
                startDate: start,
                endDate: end,
                step,
                timeSpec: transitTimeSpec,
                timePolicy: transitTimePolicy,
                timePrecision: 'minute',
                locationLabel: canonicalTransitLocationLabelB,
                relocationMode
              },
              headers,
              pass
            );
            const allB = Object.values(transitsByDateB).flatMap(day => day);
            const seismoB = calculateSeismograph(transitsByDateB, retroFlagsByDateB, {
              modeToken,
              isBalance: false,
              readiness: result.readiness,
              enforceReadiness: false,
              orbsProfile: body.orbs_profile || 'wm-spec-2025-09'
            });
            // Enriched Person B implicit dual transits with hooks & filtered_aspects
            result.person_b.chart = { ...(result.person_b.chart || {}), transitsByDate: seismoB.daily, provenanceByDate: provenanceByDateB };
            result.person_b.derived = result.person_b.derived || {};
            result.person_b.derived.seismograph_summary = seismoB.summary;
            const filteredBImplicit = filterPriorityAspects(allB);
            result.person_b.derived.t2n_aspects_raw = allB;
            result.person_b.derived.t2n_aspects = mapT2NAspects(filteredBImplicit, result.person_b.chart);
            const frameTransitBImplicit = relocationFrameFromMode(relocationDetail.person_b?.relocation_mode);
            filteredBImplicit.forEach(aspect => {
              const entry = buildAspectLabelEntry(aspect, frameTransitBImplicit, 'Transit_to_B');
              if (entry) backstageLabels.Transit_to_B.push(entry);
            });
            result.person_b.transit_data = Object.values(transitsByDateB);
            result.person_b.implicit_dual_transits = true; // provenance flag
          } catch (e) {
            logger.warn('Implicit dual Person B transits fetch failed', e.message);
            result.person_b.transits_error = 'Failed to compute Person B transits';
          }
        }
      } else {
        result.person_b = { ...(result.person_b || {}), details: personB, validation_error: vBLeanPassive2.message };
      }
    }

    // 3) Synastry (chart + aspects, or synastry aspects-only)
  const validBLean = validateSubjectLean(personB);
  const validBStrict = validateSubject(personB);
  if (wantSynastryAspectsOnly && validBLean.isValid) {
      // Synastry aspects-only endpoint
      const syn = await apiCallWithRetry(
        API_ENDPOINTS.SYNASTRY_ASPECTS,
        { method: 'POST', headers, body: JSON.stringify({ first_subject: subjectToAPI(personA, { ...pass, require_city: true }), second_subject: subjectToAPI(personB, { ...pass, require_city: true }) }) },
        'Synastry aspects data'
      );
  const synData = stripGraphicsDeep(syn.data || {});
  result.person_b = { ...(result.person_b || {}), details: personB };
  const synAspectsRaw = Array.isArray(syn.aspects) ? syn.aspects : (synData.aspects || []);
  const synAspectsFiltered = filterPriorityAspects(synAspectsRaw);
  result.backstage = result.backstage || {};
  result.backstage.synastry_aspects_raw = synAspectsRaw;
  result.synastry_aspects = synAspectsFiltered;
  result.synastry_data = synData;

  const frameA = relocationFrameFromMode(relocationDetail.person_a?.relocation_mode);
  const frameB = relocationFrameFromMode(relocationDetail.person_b?.relocation_mode);
  synAspectsFiltered.forEach(aspect => {
    const entryAB = buildAspectLabelEntry(aspect, frameA, 'A_to_B');
    if (entryAB) backstageLabels.A_to_B_synastry.push(entryAB);
    if (identitySources.person_b) {
      const inverted = {
        ...aspect,
        p1_name: aspect.p2_name,
        p2_name: aspect.p1_name,
        p1_house: aspect.p2_house,
        p2_house: aspect.p1_house
      };
      const entryBA = buildAspectLabelEntry(inverted, frameB, 'B_to_A');
      if (entryBA) backstageLabels.B_to_A_synastry.push(entryBA);
    }
  });

      // Generate relational mirror for synastry-aspects-only mode
      const relationalMirror = generateRelationalMirror(
        result.person_a || { details: personA, aspects: [] },
        { details: personB, aspects: [] },
        result.synastry_aspects,
        { aspects: [], raw: {} }, // No composite in aspects-only mode
        {},
        body.orbs_profile || 'wm-spec-2025-09'
      );
      
      // Add relational processing to synastry results
      result.synastry_relational_mirror = relationalMirror.relational_mirror;
      logger.debug('Added relational mirror to synastry-aspects-only mode');
      // Optional: augment with Person B natal chart so UI has both charts in aspects-only mode
      try {
        const personBNatal = await fetchNatalChartComplete(personB, headers, pass, 'person_b', 'synastry-aspects');
        result.person_b.chart = personBNatal.chart;
        result.person_b.aspects = personBNatal.aspects;
        if (personBNatal.assets && personBNatal.assets.length > 0) {
          appendChartAssets(result.person_b, personBNatal.assets);
        }
      } catch (e) {
        logger.warn('Could not augment synastry-aspects with Person B natal chart', e.message);
      }
    } else if (wantSynastry && validBStrict.isValid) {
      // Full synastry chart endpoint
      const synPrefs = resolveChartPreferences(pass);
      const synPayload = {
        first_subject: subjectToAPI(personA, { ...pass, require_city: true }),
        second_subject: subjectToAPI(personB, { ...pass, require_city: true }),
        ...synPrefs,
      };
      const syn = await apiCallWithRetry(
        API_ENDPOINTS.SYNASTRY_CHART,
        { method: 'POST', headers, body: JSON.stringify(synPayload) },
        'Synastry chart'
      );
  const { sanitized: synSanitized, assets: synChartAssets } = sanitizeChartPayload(syn.data || {}, {
    subject: 'synastry',
    chartType: 'synastry',
    scope: 'synastry_chart',
  });
  
  // FIX: Fetch complete natal chart for Person B (including aspects and house cusps) if not already present
  if (!result.person_b || !result.person_b.chart || !result.person_b.aspects) {
    try {
      const personBNatal = await fetchNatalChartComplete(personB, headers, pass, 'person_b', 'synastry');
      // Merge synastry chart data with natal chart (natal has house_cusps, synastry has relationship context)
      const mergedChart = {
        ...personBNatal.chart,
        ...(synSanitized.second_subject || {}),
        house_cusps: personBNatal.chart.house_cusps  // Ensure house cusps from natal chart
      };
      result.person_b = {
        details: personBNatal.details,
        chart: mergedChart,
        aspects: personBNatal.aspects
      };
      if (personBNatal.assets && personBNatal.assets.length > 0) {
        appendChartAssets(result.person_b, personBNatal.assets);
      }
    } catch (e) {
      logger.warn('Could not fetch Person B natal chart for synastry:', e.message);
      result.person_b = { details: personB, chart: synSanitized.second_subject || {} };
    }
  } else {
    // Person B already fetched, merge with synastry chart data but keep natal house cusps
    result.person_b.chart = {
      ...(synSanitized.second_subject || {}),
      ...result.person_b.chart,
      house_cusps: result.person_b.chart.house_cusps  // Preserve house cusps
    };
  }
  
  const synAssetsPersonB = synChartAssets.filter(asset => Array.isArray(asset.pathSegments) && asset.pathSegments.includes('second_subject'));
  const synAssetsPersonA = synChartAssets.filter(asset => Array.isArray(asset.pathSegments) && asset.pathSegments.includes('first_subject'));
  const synAssetsShared = synChartAssets.filter(asset => {
    const segments = asset.pathSegments || [];
    return !(segments.includes('first_subject') || segments.includes('second_subject'));
  });
  appendChartAssets(result.person_b, synAssetsPersonB);
  if (!result.person_a) {
    result.person_a = { details: personA };
  }
  appendChartAssets(result.person_a, synAssetsPersonA);
  // Extract synastry chart wheel SVG from top-level chart field
  if (syn.chart) {
    const { assets: synWheelAssets } = sanitizeChartPayload({ chart: syn.chart }, {
      subject: 'synastry',
      chartType: 'synastry',
      scope: 'synastry_chart_wheel',
    });
    // Synastry wheel is shared between both persons
    if (Array.isArray(synWheelAssets) && synWheelAssets.length) {
      const synWheelShared = synWheelAssets.map(asset => ({ ...asset, pathSegments: ['synastry_wheel'] }));
      result.synastry_chart_assets = (result.synastry_chart_assets || []).concat(synWheelShared);
    }
  }
  if (synAssetsShared.length) {
    result.synastry_chart_assets = (result.synastry_chart_assets || []).concat(synAssetsShared);
  }
  const synAspectsRaw = Array.isArray(syn.aspects) ? syn.aspects : (synSanitized.aspects || []);
  const synAspectsFiltered = filterPriorityAspects(synAspectsRaw);
  result.backstage = result.backstage || {};
  result.backstage.synastry_aspects_raw = synAspectsRaw;
  result.synastry_aspects = synAspectsFiltered;

  const frameAFull = relocationFrameFromMode(relocationDetail.person_a?.relocation_mode);
  const frameBFull = relocationFrameFromMode(relocationDetail.person_b?.relocation_mode);
  synAspectsFiltered.forEach(aspect => {
    const entryAB = buildAspectLabelEntry(aspect, frameAFull, 'A_to_B');
    if (entryAB) backstageLabels.A_to_B_synastry.push(entryAB);
    if (identitySources.person_b) {
      const inverted = {
        ...aspect,
        p1_name: aspect.p2_name,
        p2_name: aspect.p1_name,
        p1_house: aspect.p2_house,
        p2_house: aspect.p1_house
      };
      const entryBA = buildAspectLabelEntry(inverted, frameBFull, 'B_to_A');
      if (entryBA) backstageLabels.B_to_A_synastry.push(entryBA);
    }
  });

      // Generate relational mirror for full synastry mode
      const relationalMirror = generateRelationalMirror(
        result.person_a || { details: personA, aspects: [] },
        result.person_b,
        result.synastry_aspects,
        { aspects: [], raw: {} }, // No composite in synastry mode
        {},
        body.orbs_profile || 'wm-spec-2025-09'
      );
      
      // Add relational processing to synastry results
      result.synastry_relational_mirror = relationalMirror.relational_mirror;
      logger.debug('Added relational mirror to full synastry mode');
      
      // Add Person B transits for synastry modes (especially SYNASTRY_TRANSITS)
      if (modeToken === 'SYNASTRY_TRANSITS' && haveRange && !skipTransits) {
        logger.debug('Computing Person B transits for synastry mode:', { start, end, step });
      const { transitsByDate: transitsByDateB, retroFlagsByDate: retroFlagsByDateB, provenanceByDate: provenanceByDateB } = await getTransits(
        personB,
        {
          startDate: start,
          endDate: end,
          step,
          timeSpec: transitTimeSpec,
          timePolicy: transitTimePolicy,
          timePrecision: 'minute',
          locationLabel: canonicalTransitLocationLabelB,
          relocationMode
        },
        headers,
        pass
      );
        result.person_b.chart = { ...result.person_b.chart, transitsByDate: transitsByDateB };
        
        // Apply seismograph analysis to Person B transits
        const seismographDataB = calculateSeismograph(transitsByDateB, retroFlagsByDateB, {
          modeToken,
          isBalance: wantBalanceMeter,
          readiness: result.readiness,
          enforceReadiness: false,
          orbsProfile: body.orbs_profile || 'wm-spec-2025-09'
        });
  // Enriched Person B synastry transits
        result.person_b.chart.transitsByDate = seismographDataB.daily;
        result.person_b.chart.provenanceByDate = provenanceByDateB;
        result.person_b.derived = { 
          seismograph_summary: seismographDataB.summary,
          t2n_aspects: mapT2NAspects(Object.values(transitsByDateB).flatMap(day => day), result.person_b.chart)
        };
        
        logger.debug('Person B transits completed for synastry mode');
      }
    }

    // === COMPOSITE CHARTS AND TRANSITS ===
  const vB = personB ? validateSubjectLean(personB) : { isValid:false };
  if (wantComposite && vB.isValid) {
      // Step 1: Always compute composite aspects first (data-only endpoint)
      // This creates the midpoint composite chart data that serves as the base for transits
      const composite = await computeComposite(personA, personB, pass, headers);
      
      // Step 1.5: Add natal scaffolding for both persons (required for full relational mirror)
      // CRITICAL FIX: Composite reports need both natal charts to generate polarity cards, 
      // Echo Loops, and SST logs. Without this scaffolding, the Poetic Brain only gets
      // Balance Meter data and metadata, missing the foundational chart geometries.
      // Ensure Person B natal chart is included if not already fetched
      if (!result.person_b || !result.person_b.chart) {
        try {
          logger.debug('Fetching Person B natal chart for composite scaffolding');
          const personBNatal = await fetchNatalChartComplete(personB, headers, pass, 'person_b', 'composite_scaffolding');
          result.person_b = {
            ...(result.person_b || {}),
            details: personBNatal.details,
            chart: personBNatal.chart,
            aspects: personBNatal.aspects
          };
          if (personBNatal.assets && personBNatal.assets.length > 0) {
            appendChartAssets(result.person_b, personBNatal.assets);
          }
          logger.debug('Person B natal chart added to composite scaffolding');
        } catch (e) {
          logger.warn('Could not fetch Person B natal chart for composite scaffolding', e.message);
          result.person_b = { ...(result.person_b || {}), details: personB };
        }
      } else {
        // Person B chart already exists, just ensure details are included
        result.person_b = { ...(result.person_b || {}), details: personB };
      }
      
      // Add synastry aspects for cross-field hooks and polarity cards
      try {
        logger.debug('Computing synastry aspects for composite scaffolding');
        const syn = await apiCallWithRetry(
          API_ENDPOINTS.SYNASTRY_ASPECTS,
          { method: 'POST', headers, body: JSON.stringify({ first_subject: subjectToAPI(personA, pass), second_subject: subjectToAPI(personB, pass) }) },
          'Synastry aspects for composite scaffolding'
        );
        const { sanitized: synSanitized } = sanitizeChartPayload(syn.data || {}, {
          subject: 'synastry',
          chartType: 'synastry',
          scope: 'synastry_aspects'
        });
        const synastryAspects = Array.isArray(syn.aspects) ? syn.aspects : (synSanitized.aspects || []);
        
        // Generate comprehensive relational mirror with all missing elements
        const relationalMirror = generateRelationalMirror(
          result.person_a || { details: personA, aspects: [] },
          result.person_b || { details: personB, aspects: [] },
          synastryAspects,
          composite,
          {}, // composite transits will be added later if date range provided
          body.orbs_profile || 'wm-spec-2025-09'
        );

        result.composite = { 
          aspects: composite.aspects,    // Composite chart internal aspects
          data: composite.raw,           // Raw composite chart data for further calculations
          synastry_aspects: synastryAspects, // Cross-chart aspects for relational mapping
          synastry_data: synSanitized,           // Additional synastry data
          ...relationalMirror               // Include comprehensive relational processing
        };
        logger.debug(`Added ${synastryAspects.length} synastry aspects and complete relational mirror to composite scaffolding`);
      } catch (e) {
        logger.warn('Could not compute synastry aspects for composite scaffolding', e.message);
        // Generate relational mirror even without synastry aspects (limited but still relational)
        const relationalMirror = generateRelationalMirror(
          result.person_a || { details: personA, aspects: [] },
          result.person_b || { details: personB, aspects: [] },
          [], // No synastry aspects available
          composite,
          {},
          body.orbs_profile || 'wm-spec-2025-09'
        );

        result.composite = { 
          aspects: composite.aspects,    // Composite chart internal aspects
          data: composite.raw,           // Raw composite chart data for further calculations
          ...relationalMirror               // Include relational processing even without synastry
        };
      }

      try {
        const compositePayload = {
          first_subject: subjectToAPI(personA, { ...pass, require_city: true }),
          second_subject: subjectToAPI(personB, { ...pass, require_city: true }),
          ...resolveChartPreferences(pass),
        };
        const compositeChartResponse = await apiCallWithRetry(
          API_ENDPOINTS.COMPOSITE_CHART,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(compositePayload),
          },
          'Composite chart'
        );
        const { sanitized: compositeChartData, assets: compositeChartAssets } = sanitizeChartPayload(compositeChartResponse.data || {}, {
          subject: 'composite',
          chartType: 'composite',
          scope: 'composite_chart',
        });
        if (!result.composite) result.composite = {};
        result.composite.chart = compositeChartData;
        if (Array.isArray(compositeChartAssets) && compositeChartAssets.length) {
          result.composite.chart_assets = (result.composite.chart_assets || []).concat(compositeChartAssets);
        }
        // Extract chart wheel SVG from top-level chart field
        if (compositeChartResponse.chart) {
          const { assets: wheelAssets } = sanitizeChartPayload({ chart: compositeChartResponse.chart }, {
            subject: 'composite',
            chartType: 'composite',
            scope: 'composite_chart_wheel',
          });
          if (Array.isArray(wheelAssets) && wheelAssets.length) {
            result.composite.chart_assets = (result.composite.chart_assets || []).concat(wheelAssets);
          }
        }
      } catch (error) {
        logger.warn('Composite chart fetch failed', error.message || error);
      }

  // Step 2: Composite transits: TEMPORARILY DISABLED due to API compatibility issues
  // The transit API expects natal chart birth data but composite charts only have planetary positions
  // TODO: Investigate if there's a specific composite transit endpoint or if we need synthetic birth data
  if (haveRange && !skipTransits && (modeToken === 'COMPOSITE_TRANSITS')) {
        logger.debug('Computing composite transits for date range:', { start, end, step });
        
        // Calculate transits to the composite chart using the composite chart as base
  const t = await computeCompositeTransits(composite.raw, start, end, step, pass, headers);
        
        // Store raw transit aspects by date
        result.composite.transitsByDate = t.transitsByDate;
        if (t._note) result.composite.note = t._note;
        
        // Step 3: Apply seismograph analysis to composite transits
        // This converts raw aspects into magnitude, valence, and volatility metrics
        // Balance Meter uses v5 tight profile: hard 4°, trines 3°, luminary +0.5°
  const seismographData = calculateSeismograph(t.transitsByDate, {}, {
        modeToken,
        isBalance: wantBalanceMeter,
        readiness: result.readiness,
        enforceReadiness: false,
        orbsProfile: wantBalanceMeter ? (body.orbs_profile || 'wm-tight-2025-11-v5') : (body.orbs_profile || 'wm-spec-2025-09')
      });
        
        // Replace raw aspects with seismograph-processed daily data
  // Enriched composite transits with hooks & filtered_aspects
  result.composite.transitsByDate = seismographData.daily;
        
        // Add derived metrics for frontend consumption
        result.composite.derived = { 
          seismograph_summary: seismographData.summary 
        };
        
        // Update relational Balance Meter with transit data if relational mirror exists
        if (result.composite.relational_mirror) {
          const updatedRelationalBalanceMeter = computeRelationalBalanceMeter(
            result.composite.synastry_aspects || [],
            result.composite.aspects || [],
            seismographData.daily, // Composite transits as person A
            {} // Person B transits not applicable for composite-only mode
          );
          result.composite.relational_mirror.relational_balance_meter = updatedRelationalBalanceMeter;
          logger.debug('Updated relational Balance Meter with composite transit data');
        }
        
        // Annotate if transits were auto-added (mode not explicitly COMPOSITE_TRANSITS)
        if (modeToken !== 'COMPOSITE_TRANSITS') {
          result.composite.auto_transits_included = true;
          result.composite.request_mode = modeToken;
        }
        logger.debug('Composite transits completed with seismograph analysis');
      }
      
      // Add note about disabled composite transits only when not explicitly requested
      if (haveRange && !skipTransits && modeToken !== 'COMPOSITE_TRANSITS') {
        result.composite.transitsByDate = {};
        result.composite.note = 'Composite transits temporarily disabled due to API compatibility issues';
        logger.debug('Composite transits disabled - returning empty transit data');
      }
    }

    // === BALANCE METER MODE ===
    // Generate Balance Meter for solo OR relational reports with transit windows
    logger.debug('Checking Balance Meter conditions:', {
      wantBalanceMeter,
      haveRange,
      relationshipMode,
      shouldRunBalanceMeter: wantBalanceMeter && haveRange
    });

    if (wantBalanceMeter && haveRange) {
      const reportType = relationshipMode ? 'relational' : 'standalone';
      logger.debug(`Processing Balance Meter mode for ${reportType} report`);

      // Ensure Person A transit seismograph exists; compute if missing
      if (!result.person_a?.chart?.transitsByDate) {
        try {
          const { transitsByDate, retroFlagsByDate, provenanceByDate } = await getTransits(
            personA,
            {
              startDate: start,
              endDate: end,
              step,
              timeSpec: transitTimeSpec,
              timePolicy: transitTimePolicy,
              timePrecision: 'minute',
              locationLabel: canonicalTransitLocationLabel,
              relocationMode
            },
            headers,
            pass
          );
          const seismographData = calculateSeismograph(transitsByDate, retroFlagsByDate, {
            modeToken,
            isBalance: true,
            readiness: result.readiness,
            enforceReadiness: true,
            orbsProfile: body.orbs_profile || 'wm-tight-2025-11-v5'
          });
          result.person_a = result.person_a || {};
          result.person_a.derived = result.person_a.derived || {};
          result.person_a.derived.seismograph_summary = seismographData.summary;
          result.person_a.chart = { ...(result.person_a.chart || {}), transitsByDate: seismographData.daily, provenanceByDate };
        } catch (e) {
          logger.warn('Balance Meter fallback transit compute failed:', e.message);
        }
      }

      // For relational reports, also compute Person B transits
      if (relationshipMode && personB && !result.person_b?.chart?.transitsByDate) {
        // First ensure we have Person B natal chart for wheel graphics
        if (!result.person_b || !result.person_b.chart) {
          try {
            logger.debug('Fetching Person B natal chart for relational Balance Meter');
            const personBNatal = await fetchNatalChartComplete(personB, headers, pass, 'person_b', 'relational_balance_meter');
            result.person_b = result.person_b || {};
            result.person_b.details = personBNatal.details;
            result.person_b.chart = personBNatal.chart;
            result.person_b.aspects = personBNatal.aspects;
            if (personBNatal.assets && personBNatal.assets.length > 0) {
              appendChartAssets(result.person_b, personBNatal.assets);
            }
          } catch (e) {
            logger.warn('Person B natal chart fetch failed for relational Balance Meter:', e.message);
          }
        }

        try {
          logger.debug('Computing Person B transits for relational Balance Meter');
          const { transitsByDate, retroFlagsByDate, provenanceByDate } = await getTransits(
            personB,
            {
              startDate: start,
              endDate: end,
              step,
              timeSpec: transitTimeSpec,
              timePolicy: transitTimePolicy,
              timePrecision: 'minute',
              locationLabel: canonicalTransitLocationLabelB,
              relocationMode
            },
            headers,
            pass
          );
          const seismographData = calculateSeismograph(transitsByDate, retroFlagsByDate, {
            modeToken,
            isBalance: true,
            readiness: result.readiness,
            enforceReadiness: false,
            orbsProfile: body.orbs_profile || 'wm-tight-2025-11-v5'
          });
          result.person_b = result.person_b || {};
          result.person_b.derived = result.person_b.derived || {};
          result.person_b.derived.seismograph_summary = seismographData.summary;
          result.person_b.chart = { ...(result.person_b.chart || {}), transitsByDate: seismographData.daily, provenanceByDate };
          logger.debug('Person B transits computed successfully for relational Balance Meter');
        } catch (e) {
          logger.warn('Person B transit compute failed:', e.message);
        }
      }

      if (result.person_a?.chart?.transitsByDate) {
        const rawDailyEntriesA = result.person_a.chart.transitsByDate || {};
        let canonicalDailyEntriesA = rawDailyEntriesA;
        try {
          canonicalDailyEntriesA = transformTransitsByDate(rawDailyEntriesA);
        } catch (error) {
          if (error instanceof BalanceMeterInvariantViolation) {
            logger.error('Balance Meter invariant violation (Person A daily)', {
              error: error.message,
              context: error.context || null,
            });
          } else {
            throw error;
          }
        }

        const summaryA = result.person_a.derived?.seismograph_summary || null;
        let canonicalSummaryA = null;
        if (summaryA) {
          try {
            canonicalSummaryA = transformWeatherData(summaryA);
          } catch (error) {
            if (error instanceof BalanceMeterInvariantViolation) {
              logger.error('Balance Meter invariant violation (Person A summary)', {
                error: error.message,
                context: error.context || null,
              });
            } else {
              throw error;
            }
          }
        }

        // Balance Meter report focuses on triple-channel seismograph outputs
        const balanceMeterReport = {
          period: {
            start: start,
            end: end,
            step: step
          },
          schema_version: '1.2',
          report_type: relationshipMode ? 'relational' : 'solo',
          channel_summary: summaryA,
          channel_summary_canonical: canonicalSummaryA,
          daily_entries: canonicalDailyEntriesA,
          daily_entries_raw: rawDailyEntriesA,
          person: {
            name: personA.name || 'Subject',
            birth_date: personA.birth_date,
            birth_time: personA.birth_time,
            birth_location: personA.birth_location
          }
        };

        // Add Person B data for relational reports
        if (relationshipMode && result.person_b?.chart?.transitsByDate) {
          const rawDailyEntriesB = result.person_b.chart.transitsByDate || {};
          let canonicalDailyEntriesB = rawDailyEntriesB;
          try {
            canonicalDailyEntriesB = transformTransitsByDate(rawDailyEntriesB);
          } catch (error) {
            if (error instanceof BalanceMeterInvariantViolation) {
              logger.error('Balance Meter invariant violation (Person B daily)', {
                error: error.message,
                context: error.context || null,
              });
            } else {
              throw error;
            }
          }

          const summaryB = result.person_b.derived?.seismograph_summary || null;
          let canonicalSummaryB = null;
          if (summaryB) {
            try {
              canonicalSummaryB = transformWeatherData(summaryB);
            } catch (error) {
              if (error instanceof BalanceMeterInvariantViolation) {
                logger.error('Balance Meter invariant violation (Person B summary)', {
                  error: error.message,
                  context: error.context || null,
                });
              } else {
                throw error;
              }
            }
          }

          balanceMeterReport.person_b = {
            name: personB.name || 'Person B',
            birth_date: personB.birth_date,
            birth_time: personB.birth_time,
            birth_location: personB.birth_location
          };
          balanceMeterReport.person_b_channel_summary = summaryB;
          balanceMeterReport.person_b_channel_summary_canonical = canonicalSummaryB;
          balanceMeterReport.person_b_daily_entries = canonicalDailyEntriesB;
          balanceMeterReport.person_b_daily_entries_raw = rawDailyEntriesB;

          // Compute relational Balance Meter metrics
          if (result.composite?.synastry_aspects) {
            logger.debug('Computing relational Balance Meter from synastry aspects and transits');
            const relationalMetrics = computeRelationalBalanceMeter(
              result.composite.synastry_aspects || [],
              result.composite.aspects || [],
              result.person_a.chart.transitsByDate,
              result.person_b.chart.transitsByDate
            );
            balanceMeterReport.relational_balance_meter = relationalMetrics;
          }
        }

        // Attach Balance Meter to result (not replacing the full report)
        result.balance_meter = balanceMeterReport;
        result.mode = relationshipMode ? 'relational_balance_meter' : 'balance_meter';
        logger.debug(`Balance Meter ${reportType} report generated successfully`);
      } else {
        logger.warn('Balance Meter requested but no transits available to compute report');
      }
    }

    // Post-compute contract assertions: if relationship mode requested ensure presence of person_b/composite
    if (relationshipMode) {
      const missing = [];
      if ((wantSynastry || wantSynastryAspectsOnly) && !result.person_b) missing.push('person_b');
      if (wantComposite && !result.composite) missing.push('composite');
      if (missing.length) {
        throw Object.assign(new Error('PIPELINE_DROPPED_B'), { code: 'PIPELINE_DROPPED_B', missing });
      }
    }

    const personATransitsPresent = !!(result.person_a?.chart?.transitsByDate && Object.keys(result.person_a.chart.transitsByDate || {}).length);
    const personBTransitsPresent = !!(result.person_b?.chart?.transitsByDate && Object.keys(result.person_b.chart.transitsByDate || {}).length);
    if (personATransitsPresent || personBTransitsPresent) {
      const note = personATransitsPresent && personBTransitsPresent
        ? 'Transits applied to Person A and Person B.'
        : personATransitsPresent
          ? 'Transits applied to Person A.'
          : 'Transits applied to Person B.';
      if (!footnotes.includes(note)) footnotes.push(note);
    }

    // Final narrative key scrub (defense-in-depth for Clear Mirror contract)
    function scrubNarrativeKeys(obj){
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(scrubNarrativeKeys);
      const out = {};
      for (const [k,v] of Object.entries(obj)) {
        if (k === 'field' || k === 'voice' || k === 'map') continue;
        out[k] = scrubNarrativeKeys(v);
      }
      return out;
    }
    // Attach relocation coordinates when applied
    try {
      if (relocationApplied && relocationCoords) {
        const tz = relocationCoords.tz ? normalizeTimezone(relocationCoords.tz) : null;
        result.provenance.relocation_coords = {
          lat: Number(relocationCoords.lat),
          lon: Number(relocationCoords.lon),
          tz
        };
      } else if (!relocationApplied) {
        delete result.provenance.relocation_coords;
      } else if (relocationMode === 'A_local' && aLocal?.city && aLocal?.nation) {
        result.provenance.relocation_coords = {
          city: aLocal.city,
          nation: aLocal.nation,
          tz: transitA?.timezone ? normalizeTimezone(transitA.timezone) : null
        };
      }
    } catch { /* ignore */ }

    // Human-readable house system
    try {
      const hs = result.provenance.house_system;
      const names = { P:'Placidus', W:'Whole Sign', R:'Regiomontanus', K:'Koch', C:'Campanus', E:'Equal' };
      if (typeof hs === 'string' && hs.length === 1 && names[hs]) {
        result.provenance.house_system_name = names[hs];
      }
    } catch { /* ignore */ }

    // Attach a data-only Woven Map report (does not add VOICE content)
    try {
      const period = (start && end) ? { start, end, step } : null;
      result.woven_map = composeWovenMapReport({ result, mode: modeToken, period });
      if (result.woven_map) {
        result.person_a = result.person_a || {};
        result.person_a.derived = result.person_a.derived || {};
        if (!result.person_a.derived.woven_map) {
          result.person_a.derived.woven_map = result.woven_map;
        }
      }
    } catch (e) {
      logger.warn('Woven Map composer failed:', e.message);
    }


    result.backstage = result.backstage || {};
    result.backstage.labels = backstageLabels;

    const mirrorReadiness = evaluateMirrorReadiness(result);
    result.mirror_ready = mirrorReadiness.ready;
    result.mirror_ready_reason = mirrorReadiness.reasons.join('; ');


    if (result.mirror_ready) {
      if (!evaluateMirrorReadiness(result)) {
        result.mirror_ready = false;
        if (!result.mirror_guard) {
          result.mirror_guard = {
            ready: false,
            code: 'MIRROR_GEOMETRY_INCOMPLETE',
            issues: ['MIRROR_GEOMETRY_INCOMPLETE'],
            message: 'Mirror geometry incomplete; anchors still loading.'
          };
        }
      }
    }

    const uniqueFootnotes = Array.from(new Set(footnotes));
    if (uniqueFootnotes.length) result.footnotes = uniqueFootnotes;

    // Apply compression and readiness logic
    const compressedResult = applyCompressionAndReadiness(result);

    let safeResult = scrubNarrativeKeys(compressedResult);
    if (uniqueFootnotes.length) safeResult.footnotes = uniqueFootnotes;

    if (safeResult.woven_map) {
      safeResult.person_a = safeResult.person_a || {};
      safeResult.person_a.derived = safeResult.person_a.derived || {};
      safeResult.person_a.derived.woven_map = safeResult.woven_map;
    }

    // FOUNDATION DATA MERGING - Preserve foundation when layering weather
    if (isWeatherLayering && foundationData) {
      // Preserve constitutional modes from foundation
      safeResult.constitutional_modes = foundationData.constitutional_modes || foundationData.woven_map?.blueprint?.modes;
      safeResult.behavioral_anchors = foundationData.behavioral_anchors;
      safeResult.core_tensions = foundationData.core_tensions;
      safeResult.opening_signals = foundationData.opening_signals || foundationData.hooks;
      safeResult.foundational_reading = foundationData.narrative || foundationData.mirror_text;
      safeResult.foundation_blueprint = foundationData.woven_map?.blueprint;
      
      // Mark as layered report
      safeResult.report_structure = 'layered'; // foundation + weather
      safeResult.layers = {
        foundation: {
          source: 'foundation_request',
          timestamp: foundationData.provenance?.timestamp || new Date().toISOString()
        },
        weather: {
          source: 'current_request',
          timestamp: new Date().toISOString()
        }
      };
    } else if (!isWeatherLayering) {
      // For foundation-only requests, ensure constitutional_modes is extracted
      if (!safeResult.constitutional_modes && safeResult.woven_map?.blueprint?.modes) {
        safeResult.constitutional_modes = safeResult.woven_map.blueprint.modes;
      }
      safeResult.report_structure = 'foundation'; // foundation only
    }

    // Add translocation provenance: Blueprint (natal) vs Felt Weather (relocated)
    if (translocationApplies && wantBalanceMeter) {
      safeResult.provenance.chart_basis = 'felt_weather_relocated';
      safeResult.provenance.seismograph_chart = 'relocated';
      safeResult.provenance.translocation_applied = true;
      logger.info('[TRANSLOCATION] Provenance marked as Felt Weather (relocated chart basis)');
    } else {
      safeResult.provenance.chart_basis = 'blueprint_natal';
      safeResult.provenance.seismograph_chart = 'natal';
      safeResult.provenance.translocation_applied = false;
    }

    return { statusCode: 200, body: JSON.stringify(safeResult) };
  }

function applyCompressionAndReadiness(result) {
  // Apply readiness checks
  const mirrorReadiness = checkMirrorReadiness(result);
  const balanceReadiness = checkBalanceReadiness(result);

  result.readiness.mirror_ready = mirrorReadiness.mirror_ready;
  result.readiness.mirror_missing = mirrorReadiness.mirror_missing;
  result.readiness.balance_ready = balanceReadiness.balance_ready;
  result.readiness.balance_missing = balanceReadiness.balance_missing;

  // Apply transit compression if transit data exists
  const transitsByDate = result.person_a?.chart?.transitsByDate;
  if (transitsByDate && Object.keys(transitsByDate).length > 0) {
    try {
      // Build codebook for aspect compression
      const codebook = buildCodebook(transitsByDate, result.backstage.data_policy);

      // Add compressed indices window
      const sortedDates = Object.keys(transitsByDate).sort();
      const compressedDays = [];
      let prevCompressed = [];

      sortedDates.forEach((date, index) => {
        const daySource = transitsByDate[date];
        const dayAspects = resolveDayAspects(daySource);
        const compressedAspects = compressAspects(dayAspects, codebook, result.backstage.data_policy);

        const dayData = {
          date,
          seismograph: extractSeismographData(daySource), // Extract magnitude, valence, volatility
        };

        if (index === 0) {
          // First day: full aspect list
          dayData.aspects_idx = compressedAspects;
          prevCompressed = compressedAspects;
        } else {
          // Subsequent days: delta encoding
          const deltas = computeDayDeltas(prevCompressed, compressedAspects);
          if (deltas.add.length > 0) dayData.add = deltas.add;
          if (deltas.upd.length > 0) dayData.upd = deltas.upd;
          if (deltas.rem.length > 0) dayData.rem = deltas.rem;
          prevCompressed = compressedAspects;
        }

        compressedDays.push(dayData);
      });

      result.indices_window = {
        start: sortedDates[0],
        end: sortedDates[sortedDates.length - 1],
        days: compressedDays
      };

      result.codebook = {
        bodies: codebook.bodies,
        aspects: codebook.aspects,
        pairs: codebook.pairs,
        patterns: codebook.patterns
      };

      logger.info(`Compressed ${Object.keys(transitsByDate).length} days with ${codebook.patterns.length} unique patterns`);
    } catch (error) {
      logger.warn('Compression failed, keeping original format:', error.message);
    }
  }

  return result;
}

function extractSeismographData(daySource) {
  // Extract magnitude, valence, volatility from compact day objects or raw aspects
  const seismograph = { magnitude: 0, valence: 0, volatility: 0 };
  if (!daySource) return seismograph;

  const applyScaled = (value, key) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      seismograph[key] = Math.round(value * 100);
    }
  };

  if (typeof daySource === 'object' && !Array.isArray(daySource)) {
    if (daySource.seismograph && typeof daySource.seismograph === 'object') {
      applyScaled(daySource.seismograph.magnitude, 'magnitude');
      applyScaled(daySource.seismograph.directional_bias?.value, 'valence');
      applyScaled(daySource.seismograph.volatility, 'volatility');
    }
  }

  const aspects = resolveDayAspects(daySource);
  aspects.forEach(aspect => {
    applyScaled(aspect?.magnitude, 'magnitude');
    applyScaled(aspect?.valence, 'valence');
    applyScaled(aspect?.volatility, 'volatility');
  });

  return seismograph;
}


exports.handler = async function(event) {
  try {
    return await processMathbrain(event);
  } catch (error) {
    logger.error('Handler error:', error);
    const errorBody = {
      error: error?.message || 'Internal server error',
      code: error?.code || 'INTERNAL_ERROR',
      errorId: generateErrorId(),
      stack: error?.stack || null,
      details: error
    };
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error?.message || 'Internal server error',
        code: error?.code || 'INTERNAL_ERROR',
        errorId: generateErrorId(),
        stack: error?.stack || null,
        details: error
      }),
    };
  }
};

// ---------------------------------------------------------------------------
// City Resolution Endpoint - Helper for debugging city->coords resolution
// GET /api/resolve-city?city=Bryn+Mawr&state=PA&nation=US
// Returns resolved coordinates and timezone to verify what the API sees
// ---------------------------------------------------------------------------
exports.resolveCity = async function(event) {
  try {
    const qs = event.queryStringParameters || {};
    const city = qs.city;
    const state = qs.state;
    const nation = qs.nation || 'US';
    
    if (!city) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'city parameter required' })
      };
    }

    // Use same formation logic as transit subjects
    const cityField = state ? `${city}, ${state}` : city;
    const testSubject = {
      name: 'Test Resolution',
      year: 2025, month: 1, day: 1, hour: 12, minute: 0,
      city: cityField,
      nation: nation,
      zodiac_type: 'Tropic'
    };
    
    if (process.env.GEONAMES_USERNAME) {
      testSubject.geonames_username = process.env.GEONAMES_USERNAME;
    }

    const headers = buildHeaders();
    const payload = {
      name: testSubject.name,
      year: testSubject.year,
      month: testSubject.month,
      day: testSubject.day,
      hour: testSubject.hour,
      minute: testSubject.minute,
      city: testSubject.city,
      nation: testSubject.nation,
      zodiac_type: testSubject.zodiac_type,
      ...(testSubject.geonames_username && { geonames_username: testSubject.geonames_username })
    };

    // Use birth-data endpoint for quick resolution test
    const response = await apiCallWithRetry(
      API_ENDPOINTS.BIRTH_DATA,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      },
      `City resolution test for ${cityField}, ${nation}`
    );

    const resolved = {
      success: true,
      query: { city, state, nation, formatted: cityField },
      resolved: {
        latitude: response.lat || response.latitude,
        longitude: response.lng || response.longitude, 
        timezone: response.tz_str || response.timezone,
        city_resolved: response.city,
        nation_resolved: response.nation
      },
      geonames_used: !!testSubject.geonames_username,
      raw_response: response
    };

    logger.info(`City resolution: ${cityField}, ${nation} -> ${resolved.resolved.latitude}, ${resolved.resolved.longitude}`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resolved)
    };

  } catch (error) {
    logger.error('City resolution error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || 'City resolution failed',
        details: error
      })
    };
  }
};

// ---------------------------------------------------------------------------
// Lightweight health endpoint logic (consumed by astrology-health.js wrapper)
// Provides: version, environment, cold start info, basic config validation,
// optional external API latency probe (opt-in via ?ping=now)
// ---------------------------------------------------------------------------
let __RC_COLD_START_TS = global.__RC_COLD_START_TS || Date.now();
global.__RC_COLD_START_TS = __RC_COLD_START_TS;
let __RC_HEALTH_INVOCATIONS = global.__RC_HEALTH_INVOCATIONS || 0;
global.__RC_HEALTH_INVOCATIONS = __RC_HEALTH_INVOCATIONS;

async function rapidApiPing(headers){
  const controller = new AbortController();
  const to = setTimeout(()=>controller.abort(), 3500);
  try {
    const res = await fetch(`${API_ENDPOINTS.NOW}`, { method:'GET', headers, signal: controller.signal });
    const ok = res.ok;
    const status = res.status;
    clearTimeout(to);
    return { ok, status };
  } catch (e) {
    clearTimeout(to);
    return { ok:false, error: e.name === 'AbortError' ? 'timeout' : e.message };
  }
}

exports.health = async function(event){
  __RC_HEALTH_INVOCATIONS++;
  const qs = (event && event.queryStringParameters) || {};
  const wantPing = 'ping' in qs || 'now' in qs; // enable API probe with ?ping or ?ping=1
  const rapKeyPresent = !!process.env.RAPIDAPI_KEY;
  let ping = null;
  if (wantPing && rapKeyPresent) {
    try {
      ping = await rapidApiPing(buildHeaders());
    } catch(e){
      ping = { ok:false, error: e.message };
    }
  }
  const body = {
    success: true,
    service: 'astrology-mathbrain',
    version: MATH_BRAIN_VERSION,
    ephemeris_source: EPHEMERIS_SOURCE,
    calibration_boundary: CALIBRATION_BOUNDARY,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    rapidapi: {
      configured: rapKeyPresent,
      ping: ping
    },
    cold_start_ms: Date.now() - __RC_COLD_START_TS,
    invocations: __RC_HEALTH_INVOCATIONS,
    uptime_s: process.uptime(),
    memory: (()=>{try{const m=process.memoryUsage();return { rss:m.rss, heapUsed:m.heapUsed, heapTotal:m.heapTotal }; }catch{ return null; }})()
  };
  return { statusCode: 200, headers: { 'content-type':'application/json' }, body: JSON.stringify(body) };
};

