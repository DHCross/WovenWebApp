# Relational Metadata & Multi-Layer Reading System

## Overview

The Poetic Brain now scans JSON metadata for **relational_type**, **relationship_type**, or related scope fields to:

1. **Detect relationship context** (solo, dyadic, group, observer)
2. **Determine baseline geometry** (natal, composite, synastry, radix)
3. **Set Identity Gate querent role** automatically
4. **Build multi-layer readings** (baseline first, then layer current field)
5. **Provide synergy framing** to contextualize how charts combine

---

## Architecture

### New Modules

#### `lib/raven/relational-metadata.ts`
**Purpose:** Scan and extract relationship metadata from report JSON

**Key Exports:**

```typescript
// Types
type RelationalScope = 'solo' | 'dyadic' | 'group' | 'observer' | 'unknown';
type BaselineGeometry = 'natal' | 'composite' | 'synastry' | 'radix' | 'unknown';

interface RelationalMetadata {
  scope: RelationalScope;
  baselineType: BaselineGeometry;
  relationshipType?: string;        // e.g., 'partner', 'family'
  personAName?: string;
  personBName?: string;
  hasComposite?: boolean;
  hasSynastry?: boolean;
  hasNatal?: boolean;
  metadata?: Record<string, any>;
}

// Functions
scanForRelationalMetadata(payload: any): RelationalMetadata
mapScopeToQuerentRole(scope: RelationalScope): QuerentRole
buildSynergyOpening(metadata: RelationalMetadata, currentFieldContext?: string): string
extractBaselineGeometry(payload: any, baselineType: BaselineGeometry): any | null
extractFieldGeometry(payload: any): any | null
hasBaselineGeometry(payload: any, baselineType: BaselineGeometry): boolean
shouldUsePureFieldMirror(payload: any, baselineType: BaselineGeometry): boolean
```

**Detection Strategy:**
1. Scans for explicit `relationship_type`, `relationshipType`, `scope`, or `reading_scope` fields
2. Infers from payload structure (presence of `person_a`, `person_b`)
3. Detects chart types (composite, synastry, natal)
4. Maps patterns like "partner", "family", "group" to scope

#### `lib/raven/geometry-extract.ts` (Updated)
**Changes:**
- Now returns `ExtractedGeometry` interface instead of plain object
- Separates baseline geometry from current field geometry
- Includes relational metadata
- Provides fallback flag for pure field reading

```typescript
export interface ExtractedGeometry {
  full: any;                      // Complete payload
  baseline: any | null;           // Chart to read first (natal/composite/synastry)
  field: any | null;              // Current field to layer on top
  metadata: any;                  // Relational metadata
  shouldUsePureField: boolean;    // Fallback to field-only if no baseline
}
```

#### `lib/raven/context-gate.ts` (Enhanced)
**New Function:**
```typescript
initializeContextGateFromMetadata(
  metadata: RelationalMetadata,
  currentGate?: ContextGateState
): ContextGateState
```

Maps relational scope to initial querent role:
- `solo` → `self_a` (reading own chart)
- `dyadic` → `both` (both people present)
- `observer` → `observer` (third party)
- `group` → `observer`

---

## Metadata Detection Examples

### Solo Reading
```json
{
  "relationship_type": "solo",
  "person_a": { "name": "Dan", "chart": {...} },
  "chart": {...}
}
```
→ **Scope:** solo | **Baseline:** natal | **Role:** self_a

### Dyadic Composite
```json
{
  "scope": "dyadic",
  "relationship_type": "partner",
  "person_a": { "name": "Dan", "chart": {...} },
  "person_b": { "name": "Stephie", "chart": {...} },
  "composite": {...},
  "current_field": {...}
}
```
→ **Scope:** dyadic | **Baseline:** composite | **Role:** both | **Field:** current_field

### Observer Mode
```json
{
  "relationship_type": "family",
  "scope": "observer",
  "person_a": { "name": "Child", "chart": {...} },
  "synastry": {...}
}
```
→ **Scope:** observer | **Baseline:** synastry | **Role:** observer

### Implicit Dyadic
```json
{
  "person_a": { "name": "Alice", "chart": {...} },
  "person_b": { "name": "Bob", "chart": {...} },
  "synastry": {...}
}
```
→ **Scope:** dyadic (inferred from two persons) | **Baseline:** synastry

---

## Multi-Layer Reading Flow

### Before (Single Layer)
1. Extract geometry from upload
2. Pass to renderShareableMirror
3. Return reading

### After (Multi-Layer)
1. Extract geometry + metadata
2. **Initialize Context Gate** from metadata
3. **Determine baseline type** (natal, composite, synastry)
4. If baseline exists:
   - Load baseline geometry first
   - Create synergy opening: "Baseline: natal/composite → overlaying current field"
   - Render baseline reading
   - Prepend synergy context
5. If no baseline:
   - Revert to pure field mirror (current weather only)

### Code Example (route.ts)
```typescript
const extractedGeo = extractGeometryFromUploadedReport(normalizedContexts);

if (extractedGeo) {
  // 1. Initialize Context Gate from metadata
  const metadata = extractedGeo.metadata;
  if (metadata && !sessionLog.contextGate?.querentRole) {
    sessionLog.contextGate = initializeContextGateFromMetadata(metadata, sessionLog.contextGate);
  }

  // 2. Decide on baseline vs pure field
  let renderGeo = extractedGeo.full;
  let synergyContext = '';

  if (!extractedGeo.shouldUsePureField && extractedGeo.baseline) {
    renderGeo = extractedGeo.baseline;
    synergyContext = buildSynergyOpening(metadata, extractedGeo.field ? 'current Symbolic Weather' : undefined);
  }

  // 3. Render with baseline geometry
  const draft = await renderShareableMirror({
    geo: renderGeo,
    prov: soloProv,
    options: soloOptions,
    mode: 'natal-only',
  });

  // 4. Prepend synergy context
  if (synergyContext && draft?.conversation) {
    draft.conversation = `${synergyContext}\n\n${draft.conversation}`;
  }

  return NextResponse.json({ intent, ok: true, draft, ... });
}
```

---

## Synergy Opening Examples

### Natal Solo
```
Baseline: Natal chart (Dan) → overlaying current Symbolic Weather front
```

### Composite Dyadic
```
Baseline: Composite chart (Dan ↔ Stephie) · partner → overlaying current Symbolic Weather front
```

### Synastry with Family
```
Baseline: Synastry (Alice overlaying Bob) · family → overlaying current Symbolic Weather front
```

---

## Dual-Layer Voice

### Conversation Layer (Frontstage)
- Synergy opening contextualizes the baseline
- Conversational narrative using poetic language
- "Baseline reads X → now overlaying current weather shows Y"

### Technical Notes (Backstage)
- Provenance includes `baseline_type` and `relational_scope`
- Full chart data preserved for debugging
- Field geometry available for secondary reads

**Both layers preserved**, conversation opens with synergy context.

---

## Fallback Logic

### Pure Field Mirror (When No Baseline)
If `shouldUsePureFieldMirror` is true:
1. No baseline geometry found (or unknown type)
2. Fall back to rendering only current field
3. Skip synergy context opening
4. Treat as weather-only reading

```typescript
if (extractedGeo.shouldUsePureField && extractedGeo.field) {
  const draft = await renderShareableMirror({
    geo: extractedGeo.field,
    mode: 'weather-only',
  });
  // No synergy context needed
}
```

---

## Integration Points

### When Auto-Executing Solo Reading
→ Uses new multi-layer system to render baseline + field if available

### When Manual Report Upload
→ Scans metadata, initializes Context Gate, determines baseline type

### When Conversation References Chart
→ Can use stored baseline/field geometry for follow-up questions

### When Session Loads New Report
→ Re-initializes Context Gate based on new metadata

---

## Future Enhancements

1. **Validate Metadata** — Add schema validation for relational_type fields
2. **Baseline-First Rendering** — Update renderShareableMirror to accept (baseline, field) tuple
3. **Layer Visualization** — Show "Reading natals first, then layering transits" in UI
4. **Consent Tracking** — Map `consentStatus` from metadata to session rules
5. **Relationship Context Probes** — Generate SST probes based on relationship type

---

## Testing Checklist

- [ ] Solo report with relationship_type="solo" → reads as self_a
- [ ] Composite report with both persons → reads baseline first
- [ ] Report without metadata → defaults gracefully
- [ ] Observer mode → never asks for confirmation (querent role = observer)
- [ ] Synergy context prepends to conversation
- [ ] Pure field fallback works when no baseline
- [ ] Context Gate initializes from metadata scope
- [ ] Build passes with zero errors

---

## Backwards Compatibility

**✅ Fully backwards compatible:**
- Old reports without metadata still work (defaults to unknown scope)
- Legacy `extractGeometryLegacy()` wrapper maintained
- `shouldUsePureField` allows graceful fallback
- Route.ts can still render without synergy context

