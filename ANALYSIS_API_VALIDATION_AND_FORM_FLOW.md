# API Validation & Form Submission Flow Analysis

**Date:** 2025-11-29  
**Context:** E2E test failures investigation

---

## Executive Summary

The API validation system enforces a **structural invariant** (Jules Constitution) requiring `relationship_context` when `personB` is present. Tests were failing because they sent relational payloads without this required field, triggering validation warnings instead of processing the request normally.

---

## API Validation Logic

### Entry Point
**File:** `app/api/astrology-mathbrain/route.ts` (line ~210)
```typescript
const apiValidation = validateApiRequest(rawPayload);
if (!apiValidation.valid) {
  return NextResponse.json({
    success: false,
    error: firstError?.message || 'Request validation failed',
    code: firstError?.code || 'VALIDATION_ERROR',
    validation_errors: apiValidation.errors,
    // ...
  }, { status: 422 });
}
```

### Validation Function
**File:** `lib/validation/report-integrity-validator.ts` (line 604)

#### Key Validation Rules

1. **Relational Detection** (lines 625-635)
```typescript
const isRelational = 
  reportType === 'relational' ||
  reportType === 'synastry' ||
  reportStructure === 'relational' ||
  reportStructure === 'synastry' ||
  Boolean(p.personB);  // ← ANY presence of personB triggers relational mode
```

2. **Structural Invariant** (lines 695-745)
```typescript
if (isRelational && !hasRelationshipContext) {
  // VIOLATION: personB present but relationship_context missing
  
  if (mathOnlyRequested) {
    explicitDowngradeMode = 'math_only';
  } else if (symbolicReadRequested) {
    // EXPLICIT DOWNGRADE to generic symbolic read
    explicitDowngradeMode = 'generic_symbolic';
  } else {
    explicitDowngradeMode = 'math_only';
  }
}
```

**Important:** The validation doesn't reject the request (no errors), but it sets `explicitDowngradeMode` and adds **info** messages. The request proceeds with degraded functionality.

3. **Required Fields**
   - `personA` (always required)
   - `personB` (if isRelational is true)
   - `relationship_context` (if personB present) - **NEW REQUIREMENT**

4. **Relationship Context Structure**
```typescript
const hasRelationshipContext = Boolean(
  relationshipContext &&
  typeof relationshipContext === 'object' &&
  ((relationshipContext as Record<string, unknown>).scope ||
   (relationshipContext as Record<string, unknown>).type)
);
```

Must have either `scope` OR `type` field.

---

## Form Submission Flow

### UI Form Location
**File:** `app/math-brain/page.tsx`

### Submit Handler
**Function:** `onSubmit()` (line 4441)

#### Step-by-Step Flow

1. **Form Validation** (lines 4443-4465)
   - Check if location needed for transits
   - Check provider health status
   - Validate date ranges
   - Debounce rapid submissions

2. **Payload Construction** (lines 4481-4540)
```typescript
const payload: Record<string, any> = {
  mode,
  personA: { /* normalized data */ },
  time_policy,
  report_type: reportContractType,
  context: { mode: determineContextMode() },
  // ... other fields
};
```

3. **Relational Data Addition** (lines 4541-4560)
```typescript
if (RELATIONAL_MODES.includes(mode) && includePersonB) {
  payload.personB = { /* Person B data */ };
  
  // ✅ CRITICAL: relationship_context is added here
  payload.relationship_context = {
    type: relationshipType,              // e.g., 'PARTNER'
    intimacy_tier: /* if partner */,
    role: /* if not partner */,
    contact_state: contactState,          // 'ACTIVE' or 'LATENT'
    ex_estranged: exEstranged,
    notes: relationshipNotes || undefined,
  };
}
```

**Key Finding:** The UI **always** includes `relationship_context` when `includePersonB` is true.

4. **API Request** (lines 4581-4590)
```typescript
const response = await fetch("/api/astrology-mathbrain", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
```

---

## Why E2E Tests Were Failing

### Root Cause Analysis

**Test File:** `e2e/math-brain-v2.spec.ts` (line 111)

**Original Payload:**
```typescript
{
  personA: { /* ... */ },
  personB: { /* ... */ },  // ← Triggers isRelational
  window: { start, end, step },
  context: { mode: 'SYNASTRY_TRANSITS' }
  // ❌ MISSING: relationship_context
}
```

**Validation Result:**
- `isRelational = true` (because `personB` exists)
- `hasRelationshipContext = false`
- Validation sets `explicitDowngradeMode = 'generic_symbolic'`
- **Request succeeds with 200** but with degraded functionality
- However, downstream code may expect full relational features

**Fix Applied:**
```typescript
{
  personA: { /* ... */ },
  personB: { /* ... */ },
  relationship_context: {    // ✅ Added
    scope: 'partner',
    type: 'romantic'
  },
  window: { start, end, step },
  context: { mode: 'SYNASTRY_TRANSITS' }
}
```

---

## Test Timeout Issues (verify-refactor.spec.ts)

### Issue
Tests fill form correctly (visible in snapshots) but timeout waiting for results after clicking "Generate Report".

### Possible Causes

1. **API Takes >30s to Process**
   - Test timeout: 30000ms (30s)
   - Real reports can take longer, especially relational with transits
   - **Solution:** Increase timeout to 60s or 90s

2. **Form Submission Not Triggering**
   - Button click works (visible in logs)
   - But form `onSubmit` might not fire if button is disabled
   - **Check:** `canSubmit` state and button enabled status

3. **API Error Not Surfaced**
   - API might be returning error but UI not showing it
   - Test waiting for success selector that never appears
   - **Solution:** Check for error states in tests

4. **Missing Relationship Context in Form Submit**
   - Similar to test issue - if form doesn't build `relationship_context` correctly
   - API downgrades to generic mode
   - UI might not handle downgraded response correctly

---

## Validation Downgrade Modes

When `relationship_context` is missing on relational reports:

### 1. `math_only` Mode
- Returns numeric climate data only
- No symbolic/narrative interpretation
- Set when: `include_symbolic_read: false` OR `math_only: true`

### 2. `generic_symbolic` Mode
- Returns symbolic weather but generic voice
- No role/obligation assumptions
- No personalized relational insights
- Set when: symbolic read requested but no context

### 3. Full Mode (No Downgrade)
- All features available
- Requires `relationship_context` with scope/type

---

## Recommendations

### For E2E Tests

1. **Always include `relationship_context` for relational tests:**
```typescript
if (personB) {
  payload.relationship_context = {
    scope: 'partner',  // or 'friend', 'family'
    type: 'romantic'   // or 'platonic', 'professional'
  };
}
```

2. **Increase timeouts for report generation:**
```typescript
await page.waitForSelector('text=/results/i', { 
  timeout: 90000  // 90 seconds
});
```

3. **Add error state assertions:**
```typescript
// Check if error appeared instead of results
const errorText = await page.locator('[data-testid="error"]').textContent()
  .catch(() => null);
if (errorText) {
  console.log('API Error:', errorText);
}
```

### For API Tests

1. **Test validation warnings explicitly:**
```typescript
test('should warn when relationship_context missing', async ({ request }) => {
  const response = await request.post('/api/astrology-mathbrain', {
    data: {
      personA: { /* ... */ },
      personB: { /* ... */ }
      // Intentionally omit relationship_context
    }
  });
  
  const data = await response.json();
  expect(data._validation.explicitDowngradeMode).toBe('generic_symbolic');
  expect(data._validation.infos).toContainEqual(
    expect.objectContaining({ code: 'RELATIONAL_GENERIC_SYMBOLIC_DOWNGRADE' })
  );
});
```

### For Form Development

The form already handles this correctly - no changes needed. The pattern is:
```typescript
if (RELATIONAL_MODES.includes(mode) && includePersonB) {
  payload.relationship_context = {
    type: relationshipType,
    // ... other fields
  };
}
```

---

## Quick Reference: relationship_context Schema

```typescript
interface RelationshipContext {
  scope?: 'partner' | 'friend' | 'family' | 'colleague';
  type?: 'romantic' | 'platonic' | 'professional';
  intimacy_tier?: 'P1' | 'P2' | 'P3' | 'P4' | 'P5a' | 'P5b';
  role?: string;
  contact_state?: 'ACTIVE' | 'LATENT';
  ex_estranged?: boolean;
  notes?: string;
}
```

**Minimum required:** Either `scope` OR `type` must be present.

**Recommended:** Include `scope` for better categorization:
- `partner` → Full relational features
- `friend` → Behavioral/social dynamics
- `family` → Legacy patterns
- `colleague` → Professional dynamics

---

## Validation Flow Diagram

```
User submits form with personB
         ↓
   API receives payload
         ↓
   validateApiRequest()
         ↓
   Check: personB present?
         ↓ YES
   isRelational = true
         ↓
   Check: relationship_context exists?
         ↓ NO
   Set explicitDowngradeMode
         ↓
   Add INFO (not ERROR)
         ↓
   Validation passes ✓
         ↓
   API processes with downgrade
         ↓
   Response includes _validation field
```

---

## Related Documentation

- **Validation:** `lib/validation/report-integrity-validator.ts`
- **API Route:** `app/api/astrology-mathbrain/route.ts`
- **Form UI:** `app/math-brain/page.tsx`
- **Jules Constitution:** Referenced in validation comments
- **Relational Metadata:** `RELATIONAL_METADATA_QUICK_REF.md`
