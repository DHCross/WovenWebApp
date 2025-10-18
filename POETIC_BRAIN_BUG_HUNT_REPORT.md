# Poetic Brain Bug Hunt Report
## Alignment Check with New Mirror Directive JSON Export

**Date:** October 18, 2025  
**Status:** ⚠️ CRITICAL GAPS IDENTIFIED  
**Severity:** HIGH - Poetic Brain cannot parse new Mirror Directive JSON

---

## 🔍 FINDINGS

### ISSUE #1: Poetic Brain Input Schema Mismatch
**Severity:** 🔴 CRITICAL

**Problem:**
The Poetic Brain `InputPayload` interface (lines 41-75 in `poetic-brain/src/index.ts`) expects:
```typescript
interface InputPayload {
  climateLine?: string;
  constitutionalClimate?: string;
  hooks?: Array<string | HookObject>;
  seismograph?: { magnitude?, valence_bounded?, valence?, volatility?, coherence? };
  angles?: any[];
  transits?: any[];
  // ... etc
}
```

But the new **Mirror Directive JSON** exports:
```json
{
  "_format": "mirror_directive_json",
  "_version": "1.0",
  "person_a": { "name", "birth_data", "chart", "aspects" },
  "person_b": { "name", "birth_data", "chart", "aspects" },
  "mirror_contract": { "report_kind", "intimacy_tier", ... },
  "provenance": { ... },
  "narrative_sections": { "solo_mirror_a": "", "relational_engine": "", "weather_overlay": "" }
}
```

**Result:** ❌ Poetic Brain cannot parse the new structure. It has no handlers for:
- `person_a` / `person_b` chart geometry
- `mirror_contract` (report scope)
- `narrative_sections` (placeholder slots)

---

### ISSUE #2: No JSON Upload Handler in Poetic Brain
**Severity:** 🔴 CRITICAL

**Problem:**
The Poetic Brain module (`poetic-brain/src/index.ts`) only has:
- `generateSection(sectionType, inputPayload)` - generates narrative text
- No JSON parsing logic
- No geometry extraction from chart data
- No mirror_contract interpretation

**Where it should be:**
- A new function to parse Mirror Directive JSON
- Extract natal geometry (person_a.chart, person_b.chart)
- Interpret mirror_contract (solo vs relational, intimacy tier)
- Map to appropriate narrative sections

**Current handler in `poetic-brain/api/handler.ts`:**
```typescript
export default function handler(req: VercelRequest, res: VercelResponse) {
  const { sectionType, inputPayload } = req.body;
  const result = generateSection(sectionType, inputPayload);  // ← Only calls generateSection
  res.status(200).json({ result });
}
```

This assumes `inputPayload` is already in the old format. It doesn't handle Mirror Directive JSON.

---

### ISSUE #3: No Narrative Sections Population Logic
**Severity:** 🔴 CRITICAL

**Problem:**
The Mirror Directive JSON includes empty `narrative_sections` placeholders:
```json
"narrative_sections": {
  "solo_mirror_a": "",
  "relational_engine": "",
  "weather_overlay": ""
}
```

But Poetic Brain has **no logic to populate these fields**. There's no:
- Function to generate `solo_mirror_a` narrative
- Function to generate `relational_engine` narrative
- Function to generate `weather_overlay` narrative
- No way to write back to the JSON

---

### ISSUE #4: Missing Geometry Extraction
**Severity:** 🔴 CRITICAL

**Problem:**
Raven Calder said: "The Poetic Brain confirms that this JSON structure provides the clean, organized input necessary for accurate reflection."

But Poetic Brain has **no code to extract geometry** from:
- `person_a.chart` (planets, houses, angles)
- `person_a.aspects` (natal aspects)
- `person_b.chart` (for relational)
- `person_b.aspects` (for relational)

The current `InputPayload` interface doesn't even have fields for this data.

---

### ISSUE #5: No Intimacy Tier Interpretation
**Severity:** 🟠 HIGH

**Problem:**
Mirror Directive includes:
```json
"mirror_contract": {
  "intimacy_tier": "P5a",  // ← Raven said this is MANDATORY
  "report_kind": "relational_mirror",
  "is_relational": true
}
```

But Poetic Brain has **no code to interpret intimacy tiers** (P1-P5b). There's no:
- Intimacy tier parser
- Boundary-setting logic based on tier
- Tone calibration based on relationship type

---

### ISSUE #6: No Mirror Contract Routing
**Severity:** 🟠 HIGH

**Problem:**
The `mirror_contract` field tells Poetic Brain:
- Whether to generate solo or relational narrative
- What intimacy tier to use
- What report kind to generate

But `generateSection()` only accepts `sectionType` (string), not the full mirror_contract. There's no routing logic.

---

## 📋 IMPACT ANALYSIS

### What Works ✅
- Mirror Directive JSON is correctly exported from Math Brain
- Structure is clean and machine-readable
- Provenance is complete
- Narrative placeholders are reserved

### What's Broken ❌
- Poetic Brain cannot parse Mirror Directive JSON
- No geometry extraction
- No intimacy tier handling
- No narrative population logic
- No way to write results back to JSON

### User Experience
1. User generates Math Brain report ✅
2. User downloads Mirror Directive JSON ✅
3. User uploads to Poetic Brain ❌ **FAILS HERE**
   - Poetic Brain shows: "No geometry data provided"
   - Or: "Invalid input format"
4. Poetic Brain cannot generate narrative ❌
5. Markdown Mirror is never created ❌

---

## 🛠️ REQUIRED FIXES

### FIX #1: Extend Poetic Brain InputPayload Interface
**File:** `poetic-brain/src/index.ts`  
**Lines:** 41-75

Add support for Mirror Directive JSON structure:
```typescript
export interface InputPayload {
  // NEW: Mirror Directive JSON support
  _format?: 'mirror_directive_json' | 'symbolic_weather_json';
  _version?: string;
  _poetic_brain_compatible?: boolean;
  
  // NEW: Natal geometry
  person_a?: {
    name?: string;
    birth_data?: any;
    chart?: any;
    aspects?: any[];
  };
  person_b?: {
    name?: string;
    birth_data?: any;
    chart?: any;
    aspects?: any[];
  } | null;
  
  // NEW: Mirror contract
  mirror_contract?: {
    report_kind?: string;
    intimacy_tier?: string;
    relationship_type?: string;
    is_relational?: boolean;
    is_natal_only?: boolean;
  };
  
  // NEW: Narrative sections (placeholders)
  narrative_sections?: {
    solo_mirror_a?: string;
    relational_engine?: string;
    weather_overlay?: string;
  };
  
  // EXISTING: Keep all old fields for backward compatibility
  climateLine?: string;
  constitutionalClimate?: string;
  hooks?: Array<string | HookObject>;
  seismograph?: { /* ... */ };
  // ... etc
}
```

### FIX #2: Add Mirror Directive Parser
**File:** `poetic-brain/src/index.ts`  
**New Function:** `parseMirrorDirective()`

```typescript
function parseMirrorDirective(payload: InputPayload): {
  reportKind: string;
  intimacyTier: string | null;
  isRelational: boolean;
  personA: any;
  personB: any | null;
  geometry: any;
} {
  const contract = payload.mirror_contract || {};
  return {
    reportKind: contract.report_kind || 'mirror',
    intimacyTier: contract.intimacy_tier || null,
    isRelational: contract.is_relational || false,
    personA: payload.person_a || {},
    personB: payload.person_b || null,
    geometry: {
      chartA: payload.person_a?.chart,
      chartB: payload.person_b?.chart,
      aspectsA: payload.person_a?.aspects,
      aspectsB: payload.person_b?.aspects,
    }
  };
}
```

### FIX #3: Add Intimacy Tier Handler
**File:** `poetic-brain/src/index.ts`  
**New Function:** `calibrateForIntimacyTier()`

```typescript
function calibrateForIntimacyTier(tier: string | null): {
  boundaryMode: string;
  toneDescriptor: string;
  disclosureLevel: 'minimal' | 'moderate' | 'full';
} {
  const tierMap: Record<string, any> = {
    'P1': { boundaryMode: 'formal', toneDescriptor: 'respectful distance', disclosureLevel: 'minimal' },
    'P2': { boundaryMode: 'friendly', toneDescriptor: 'warm but bounded', disclosureLevel: 'moderate' },
    'P3': { boundaryMode: 'exploratory', toneDescriptor: 'curious, undefined', disclosureLevel: 'moderate' },
    'P4': { boundaryMode: 'casual', toneDescriptor: 'relaxed, low stakes', disclosureLevel: 'moderate' },
    'P5a': { boundaryMode: 'intimate', toneDescriptor: 'deep, committed', disclosureLevel: 'full' },
    'P5b': { boundaryMode: 'intimate-nonsexual', toneDescriptor: 'deep, non-romantic', disclosureLevel: 'full' },
  };
  return tierMap[tier || 'P1'] || tierMap['P1'];
}
```

### FIX #4: Add Narrative Section Generators
**File:** `poetic-brain/src/index.ts`  
**New Functions:** `generateSoloMirror()`, `generateRelationalEngine()`, `generateWeatherOverlay()`

These should:
- Extract geometry from person_a/person_b charts
- Apply intimacy tier calibration
- Generate appropriate narrative
- Return text for narrative_sections placeholders

### FIX #5: Update Handler to Support Mirror Directive
**File:** `poetic-brain/api/handler.ts`

```typescript
export default function handler(req: VercelRequest, res: VercelResponse) {
  const { inputPayload } = req.body;
  
  // Detect format
  if (inputPayload._format === 'mirror_directive_json') {
    // Parse Mirror Directive
    const directive = parseMirrorDirective(inputPayload);
    
    // Generate all narrative sections
    const narratives = {
      solo_mirror_a: generateSoloMirror(directive.personA, directive.geometry.chartA),
      relational_engine: directive.isRelational 
        ? generateRelationalEngine(directive.personA, directive.personB, directive.geometry)
        : '',
      weather_overlay: generateWeatherOverlay(inputPayload.seismograph),
    };
    
    // Return populated narrative_sections
    return res.status(200).json({
      success: true,
      narrative_sections: narratives,
      intimacy_tier: directive.intimacyTier,
    });
  }
  
  // Fallback to old format
  const result = generateSection('MirrorVoice', inputPayload);
  res.status(200).json({ result });
}
```

---

## 🚨 PRIORITY ROADMAP

### Phase 1: CRITICAL (Blocks user workflow)
- [ ] Extend InputPayload interface to support Mirror Directive JSON
- [ ] Add Mirror Directive parser
- [ ] Update handler to detect and route Mirror Directive JSON
- [ ] Add basic geometry extraction

### Phase 2: HIGH (Enables narrative generation)
- [ ] Add intimacy tier calibration
- [ ] Implement `generateSoloMirror()`
- [ ] Implement `generateRelationalEngine()`
- [ ] Implement `generateWeatherOverlay()`

### Phase 3: MEDIUM (Polish)
- [ ] Add error handling for malformed geometry
- [ ] Add validation for intimacy tiers
- [ ] Add logging for debugging
- [ ] Write tests for Mirror Directive parsing

---

## 📊 CHECKLIST

- [ ] Poetic Brain can parse Mirror Directive JSON
- [ ] Poetic Brain extracts natal geometry correctly
- [ ] Poetic Brain interprets intimacy tiers
- [ ] Poetic Brain generates all narrative sections
- [ ] Poetic Brain returns populated narrative_sections
- [ ] Handler routes Mirror Directive correctly
- [ ] Error messages are clear and actionable
- [ ] Tests cover all new functionality

---

## 🎯 SUCCESS CRITERIA

When complete:
1. User uploads Mirror Directive JSON to Poetic Brain ✅
2. Poetic Brain parses geometry and contract ✅
3. Poetic Brain generates narrative sections ✅
4. Poetic Brain returns populated JSON ✅
5. User downloads Markdown Mirror with full narrative ✅

---

**Report Generated:** October 18, 2025  
**Severity:** CRITICAL - Poetic Brain integration incomplete  
**Action Required:** Implement Phase 1 fixes before next user test
