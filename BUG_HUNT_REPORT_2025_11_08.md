# Bug Hunt Report - WovenWebApp
**Date:** November 8, 2025  
**Status:** 2 Critical Build-Blocking Issues Found + 1 Type Safety Issue

---

## Executive Summary

The application has **2 ESLint configuration errors** that prevent compilation and **1 TypeScript type safety issue** that will cause runtime problems. Build is currently broken.

| Severity | Category | Status | Count |
|----------|----------|--------|-------|
| 🔴 CRITICAL | ESLint Config | Blocks build | 2 |
| 🟠 HIGH | TypeScript | Type mismatch | 1 |
| 🟡 MEDIUM | Runtime | Potential null ref | 1 |

---

## Bug #1: ESLint Rule Not Defined (CRITICAL)
**Severity:** 🔴 CRITICAL - Prevents Production Build  
**Status:** Blocks npm run build  
**Files Affected:** 2  
- `lib/pipeline/mirrorRenderer.ts` (line 96)
- `lib/raven/render.ts` (line 15)

### Problem
The codebase uses `@typescript-eslint/consistent-type-imports` ESLint rule via inline disable comments:
```typescript
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const mod: any = await import('@/lib/raven/render')
```

However, **the rule is not defined** in `.eslintrc.json`. When ESLint encounters an undefined rule reference in a disable comment, it throws an error:

```
Error: Definition for rule '@typescript-eslint/consistent-type-imports' was not found.
```

### Root Cause
The `.eslintrc.json` only extends `"next/core-web-vitals"` and doesn't include:
- `@typescript-eslint/eslint-plugin` rules configuration
- `@typescript-eslint/consistent-type-imports` rule definition

### Impact
- ✅ `npm run dev` works (Next.js doesn't enforce this during dev)
- ❌ `npm run build` fails immediately during ESLint phase
- ❌ `npm run lint` reports 2 errors
- ❌ Cannot deploy to production

### Solution
**Option A (Recommended):** Remove the disable comments since the rule isn't active anyway
```typescript
// REMOVE THIS LINE:
// eslint-disable-next-line @typescript-eslint/consistent-type-imports

// Keep the code:
const mod: any = await import('@/lib/raven/render').catch(() => null);
```

**Option B:** Properly configure the rule in `.eslintrc.json`
```json
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    "@typescript-eslint/consistent-type-imports": "off"
  }
}
```

---

## Bug #2: TypeScript Type Mismatch (HIGH)
**Severity:** 🟠 HIGH - Type Safety Violation  
**Status:** Compilation passes but type checker reports error  
**File:** `lib/pipeline/mirrorRenderer.ts` (line 106)

### Problem
```typescript
const header = extractWovenHeader(payload);  // Can return WovenHeader | null
// ... later ...
relational = await analyzeRelationship(payload, geometry, header);
//                                                              ^^^^^^
//                                                              Error here!
```

The function signature expects:
```typescript
export async function analyzeRelationship(
  payload: any,
  geometryA: { aspects?: Array<Record<string, any>> },
  _header?: Record<string, any>  // ← Accepts Record<string, any> | undefined
): Promise<RelationalOutput>
```

But we're passing `header` which has type `WovenHeader | null`, where:
- `null` is NOT compatible with `Record<string, any> | undefined`
- Only `undefined` or `Record<string, any>` are allowed

### Error Message
```
Argument of type 'WovenHeader | null' is not assignable to parameter 
of type 'Record<string, any> | undefined'.
  Type 'null' is not assignable to type 'Record<string, any> | undefined'.
```

### Root Cause
- `extractWovenHeader()` returns `WovenHeader | null`
- `analyzeRelationship()` parameter typed as `Record<string, any>` with optional flag
- Type system doesn't allow explicit `null` to map to `undefined`

### Impact
- ✅ Doesn't prevent build (happens at type-check phase)
- ⚠️ Indicates potential runtime issue if header is null
- ⚠️ Relational analysis will receive null instead of undefined

### Solution
**Fix the type at call site:**
```typescript
// Before
relational = await analyzeRelationship(payload, geometry, header);

// After (Option 1: explicit null check)
relational = await analyzeRelationship(payload, geometry, header ?? undefined);

// After (Option 2: pass undefined if null)
relational = await analyzeRelationship(
  payload, 
  geometry, 
  header || undefined
);
```

**Or fix the function signature:**
```typescript
export async function analyzeRelationship(
  payload: any,
  geometryA: { aspects?: Array<Record<string, any>> },
  _header?: Record<string, any> | null  // ← Allow null explicitly
): Promise<RelationalOutput>
```

---

## Bug #3: Potential Null Reference (MEDIUM)
**Severity:** 🟡 MEDIUM - Potential Runtime Error  
**Status:** Conditional null handling exists but fragile  
**File:** `lib/pipeline/mirrorRenderer.ts` (lines 103-111)

### Problem
```typescript
const header = extractWovenHeader(payload);  // Can be null
// ...
const hasRel = Boolean(header?.relational_context) || Boolean(payload?.person_b);
if (hasRel) {
  relational = await analyzeRelationship(payload, geometry, header);
  //                                                        ^^^^^^
  //                                                        Still might be null!
}
```

The code does:
1. Extract header (can be null)
2. Check if header has relational_context (using optional chaining, safe)
3. If relational context OR person_b exists, call analyzeRelationship with header

**Problem:** If `header` is null but `person_b` exists, we pass null to the function.

### Impact
- ⚠️ May work if analyzeRelationship handles null gracefully
- ⚠️ Type error already reported above
- ❌ Ambiguous intent: should we process relational data when header is missing?

### Solution
Be explicit about null handling:
```typescript
const header = extractWovenHeader(payload);
let relational: Record<string, any> | undefined;
try {
  const hasRel = (header && Boolean(header.relational_context)) || Boolean(payload?.person_b);
  if (hasRel && header) {  // ← Require header to be non-null
    relational = await analyzeRelationship(payload, geometry, header);
  }
} catch {
  relational = undefined;
}
```

---

## Summary of Required Fixes

| Bug | File | Line | Fix Type | Urgency |
|-----|------|------|----------|---------|
| #1a | lib/raven/render.ts | 15 | Remove disable comment | CRITICAL |
| #1b | lib/pipeline/mirrorRenderer.ts | 96 | Remove disable comment | CRITICAL |
| #2 | lib/pipeline/mirrorRenderer.ts | 106 | Add `?? undefined` or fix signature | HIGH |
| #3 | lib/pipeline/mirrorRenderer.ts | 103-111 | Add explicit null check | MEDIUM |

---

## Build Status

**Current:** ❌ BROKEN
```
> npm run build
Failed to compile.

./lib/pipeline/mirrorRenderer.ts
  96:7  Error: Definition for rule '@typescript-eslint/consistent-type-imports' was not found.

./lib/raven/render.ts
  15:5  Error: Definition for rule '@typescript-eslint/consistent-type-imports' was not found.

✖ 2 problems (2 errors, 0 warnings)
```

**After fixes:** ✅ Should build successfully

---

## Test Results

**Smoke Tests:** ✅ All 15 passing
- Environment configured correctly
- API key present
- All files exist
- Auth0 not required (warnings only)

**ESLint:** ❌ 2 errors found
```
npm run lint
✖ 2 problems (2 errors, 0 warnings)
```

**Build:** ❌ Blocked by ESLint errors

---

## Recommendations

### Immediate (Before Deployment)
1. **Remove ESLint disable comments** (2 minutes)
   - These rules aren't needed/configured
   - File locations: raven/render.ts:15, pipeline/mirrorRenderer.ts:96
   
2. **Fix TypeScript type mismatch** (5 minutes)
   - Add `?? undefined` at mirrorRenderer.ts:106
   - Verify analyzeRelationship handles null header correctly

3. **Add explicit null safety** (5 minutes)
   - Update null check at mirrorRenderer.ts:103-111

4. **Run full build to verify** (3 minutes)
   - `npm run build`
   - Should complete without errors

### For Documentation
- Add to MAINTENANCE_GUIDE.md: "Common ESLint issues with dynamic imports"
- Document expected null handling patterns

---

## Files to Review/Modify

Priority order:
1. `lib/raven/render.ts` — Remove line 15 disable comment
2. `lib/pipeline/mirrorRenderer.ts` — Remove line 96, fix line 106, review 103-111
3. `.eslintrc.json` — Optional: configure @typescript-eslint rules properly

---

## Next Steps

1. Apply fixes to the 2 files
2. Run `npm run lint` (should pass)
3. Run `npm run build` (should pass)
4. Run `npm run test:smoke` (should still pass)
5. Commit fixes with message: `[2025-11-08] FIX: Resolve ESLint config and TypeScript type errors`

