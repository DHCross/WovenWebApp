# Relational Metadata Quick Reference Card

## For Developers

### When You Upload a Report
The system now automatically:

1. **Scans metadata** for `relational_type`, `relationship_type`, or `scope`
2. **Determines scope** → solo | dyadic | group | observer
3. **Maps baseline type** → natal | composite | synastry | radix
4. **Initializes Context Gate** (no extra confirmation needed for deterministic roles)
5. **Builds multi-layer reading** (baseline + current field)

### Using the New System

**In route.ts:**
```typescript
// Extract full geometry + metadata
const extractedGeo = extractGeometryFromUploadedReport(normalizedContexts);

if (extractedGeo) {
  // Initialize context gate from metadata
  sessionLog.contextGate = initializeContextGateFromMetadata(
    extractedGeo.metadata,
    sessionLog.contextGate
  );

  // Use baseline + field layers
  if (!extractedGeo.shouldUsePureField && extractedGeo.baseline) {
    const synergy = buildSynergyOpening(
      extractedGeo.metadata,
      'current Symbolic Weather'
    );
    // Prepend synergy to conversation
  }
}
```

**In tests or scripts:**
```typescript
import { scanForRelationalMetadata, mapScopeToQuerentRole } from '@/lib/raven/relational-metadata';

const metadata = scanForRelationalMetadata(jsonPayload);
console.log(metadata.scope);           // 'dyadic'
console.log(metadata.baselineType);    // 'composite'
console.log(mapScopeToQuerentRole(metadata.scope)); // 'both'
```

---

## Detection Priority

```
EXPLICIT FIELDS (highest priority)
↓
relationship_type, scope, reading_scope
↓
PAYLOAD STRUCTURE
↓
person_a + person_b? → dyadic
↓
CHART TYPE
↓
composite? synastry? natal?
↓
PATTERN MATCHING (lowest priority)
↓
Keywords: partner, family, solo, observer, group
```

---

## Scope → Role Mapping

| Scope | QuerentRole | Meaning |
|-------|-----------|---------|
| solo | self_a | Reading own chart |
| dyadic | both | Both people in chart |
| observer | observer | Third-party reading |
| group | observer | Reading group/collective |
| unknown | unconfirmed | Needs manual confirmation |

---

## Baseline Types

| Type | Description | Use Case |
|------|-------------|----------|
| natal | Single birth chart | Solo readings, diagnostic focus on person |
| composite | Combined chart | Dyadic readings, shows relationship core |
| synastry | Overlay of two charts | Interaction dynamics, aspect focus |
| radix | Secondary/progressed | Cycles, timing, evolution |
| unknown | Not determined | Falls back to pure field |

---

## Synergy Opening Format

```
Baseline: {baselineType} ({personA} [↔ personB])
          [· {relationshipType}]
          → overlaying {fieldContext}
```

**Examples:**
- `Baseline: Natal chart (Dan) → overlaying current Symbolic Weather front`
- `Baseline: Composite chart (Dan ↔ Stephie) · partner → overlaying current Symbolic Weather front`
- `Baseline: Synastry (Alice overlaying Bob) · family → overlaying current Symbolic Weather front`

---

## Pure Field Fallback

**Triggered when:**
- ✓ No baseline type detected
- ✓ Baseline type detected but no geometry found
- ✓ `shouldUsePureFieldMirror` flag is true

**Behavior:**
- Skips synergy opening
- Renders only current field (weather-only reading)
- Graceful fallback, no error

---

## Metadata Object Structure

```typescript
interface RelationalMetadata {
  scope: RelationalScope;              // solo | dyadic | group | observer | unknown
  baselineType: BaselineGeometry;      // natal | composite | synastry | radix | unknown
  relationshipType?: string;           // "partner", "family", "colleague", etc.
  personAName?: string;                // "Dan"
  personBName?: string;                // "Stephie"
  hasComposite?: boolean;              // true if composite chart exists
  hasSynastry?: boolean;               // true if synastry exists
  hasNatal?: boolean;                  // true if natal chart exists
  metadata?: Record<string, any>;      // Additional raw metadata
}
```

---

## ExtractedGeometry Structure

```typescript
interface ExtractedGeometry {
  full: any;                      // Complete payload
  baseline: any | null;           // Baseline chart (to read first)
  field: any | null;              // Current field (to layer on top)
  metadata: RelationalMetadata;   // Relational metadata
  shouldUsePureField: boolean;    // Whether to use field-only fallback
}
```

---

## Common Patterns

### Detect Dyadic Reading
```typescript
if (metadata.scope === 'dyadic') {
  // Use composite if available, else synastry
  const baseline = metadata.baselineType === 'composite' ? 'composite' : 'synastry';
  // Context gate already set to 'both'
}
```

### Detect Observer Mode
```typescript
if (metadata.scope === 'observer') {
  // Context gate already set to 'observer'
  // Skip "who's talking?" question
  // Render read-only, no consent questions
}
```

### Use Pure Field
```typescript
if (extractedGeo.shouldUsePureFieldMirror) {
  // No baseline available, render weather only
  const geo = extractedGeo.field || extractedGeo.full;
  // Skip synergy context
}
```

---

## When to Update Metadata

### New Report Upload
→ Always re-scan metadata, update context gate

### Manual Context Gate Confirmation
→ Override auto-detected role if user specifies

### Session Continuation
→ Use stored metadata from sessionLog

### Report Switching
→ Re-initialize context gate if uploading new report

---

## Backwards Compatibility

**Old code still works:**
```typescript
// Old way (still valid)
const geo = extractGeometryLegacy(contexts);  // Returns just geometry

// New way (recommended)
const extracted = extractGeometryFromUploadedReport(contexts);
if (extracted) {
  const { baseline, field, metadata } = extracted;
}
```

---

## Documentation References

- **Full System:** `RELATIONAL_METADATA_SYSTEM.md`
- **Implementation:** `IMPLEMENTATION_RELATIONAL_METADATA.md`
- **Modules:** `lib/raven/relational-metadata.ts`, `lib/raven/geometry-extract.ts`, `lib/raven/context-gate.ts`
- **Route Integration:** `app/api/raven/route.ts` (lines 661-710)

---

## Debugging

### Check detected metadata
```typescript
const extracted = extractGeometryFromUploadedReport(contexts);
console.log('Detected scope:', extracted?.metadata.scope);
console.log('Baseline type:', extracted?.metadata.baselineType);
console.log('Should use pure field:', extracted?.shouldUsePureField);
```

### Verify context gate initialization
```typescript
const gate = initializeContextGateFromMetadata(metadata);
console.log('Querent role:', gate.querentRole);
console.log('Session subjects:', gate.sessionSubjects);
```

### Check synergy opening
```typescript
const synergy = buildSynergyOpening(metadata, 'current Symbolic Weather');
console.log('Synergy:', synergy);
```

---

## Cheat Sheet

| Task | Function | Returns |
|------|----------|---------|
| Scan report for metadata | `scanForRelationalMetadata(payload)` | RelationalMetadata |
| Map scope to role | `mapScopeToQuerentRole(scope)` | QuerentRole |
| Create synergy text | `buildSynergyOpening(metadata, context)` | string |
| Extract baseline chart | `extractBaselineGeometry(payload, type)` | any \| null |
| Extract field geometry | `extractFieldGeometry(payload)` | any \| null |
| Check if baseline exists | `hasBaselineGeometry(payload, type)` | boolean |
| Determine fallback needed | `shouldUsePureFieldMirror(payload, type)` | boolean |
| Initialize context gate | `initializeContextGateFromMetadata(metadata)` | ContextGateState |
| Full extraction | `extractGeometryFromUploadedReport(contexts)` | ExtractedGeometry \| null |

