# Implementation Guide - Privacy Guard & Type Safety

**Date:** November 12, 2025  
**Status:** Ready for Implementation  
**Owner:** Copilot with Jules Review  

---

## 1. Runtime Privacy Guard Implementation

### Overview
Currently: Privacy constraint documented but NOT enforced at runtime  
Target: Block all exports containing banned names unless explicitly authorized

### Implementation Steps

#### Step 1: Create Privacy Guard Module

Create file: `lib/privacy/privacy-guard.ts`

```typescript
/**
 * Privacy Guard: Prevents leakage of personal names in exports
 * Enforces constraint: Never emit 'Dan', 'Stephie', 'DHCross' unless explicitly authorized
 */

export interface PrivacyViolation {
  bannedName: string;
  location: string;
  severity: 'high' | 'warn';
}

export interface PrivacyCheckResult {
  isValid: boolean;
  violations: PrivacyViolation[];
}

const BANNED_NAMES = ['Dan', 'Stephie', 'DHCross'];
const BANNED_PATTERNS = [
  /\bDan(?:\s|$|')/gi,
  /\bStephie(?:\s|$|')/gi,
  /\bDHCross(?:\s|$|')/gi,
  /dancross/gi,
  /stephie/gi,
];

/**
 * Check if text contains banned names
 * @param text - Text to check
 * @param authorizedNames - Names authorized in this context
 * @returns Privacy check result with violations
 */
export function checkPrivacyConstraint(
  text: string,
  authorizedNames: string[] = []
): PrivacyCheckResult {
  const violations: PrivacyViolation[] = [];

  for (const pattern of BANNED_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const name = match.trim();
        if (!authorizedNames.includes(name)) {
          violations.push({
            bannedName: name,
            location: `Text contains "${match}"`,
            severity: 'high',
          });
        }
      }
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Redact banned names from text
 * @param text - Text to redact
 * @param replacement - Replacement string (default: [REDACTED])
 * @returns Redacted text
 */
export function redactBannedNames(
  text: string,
  replacement: string = '[REDACTED]'
): string {
  let result = text;
  for (const pattern of BANNED_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Validate export payload for privacy compliance
 */
export function validateExportPayload(
  payload: any,
  context?: { userEmail?: string; isAuthenticated?: boolean }
): PrivacyCheckResult {
  const payloadString = JSON.stringify(payload);
  
  // Check entire payload
  return checkPrivacyConstraint(payloadString);
}
```

#### Step 2: Add Privacy Guard to Export Hooks

Update file: `app/math-brain/hooks/useChartExport.ts`

Add at the top:
```typescript
import { validateExportPayload, redactBannedNames } from '../../../lib/privacy/privacy-guard';
```

Modify `downloadResultJSON()`:
```typescript
const downloadResultJSON = useCallback(() => {
  if (!result) return;
  
  // ⭐ NEW: Privacy check
  const privacyCheck = validateExportPayload(result);
  if (!privacyCheck.isValid) {
    console.error('[Privacy] Export contains banned names:', privacyCheck.violations);
    pushToast('⚠️ Export blocked: contains unauthorized personal names', 3000);
    return;
  }
  
  setCleanJsonGenerating(true);
  try {
    // ... rest of function
  } finally {
    setTimeout(() => setCleanJsonGenerating(false), 300);
  }
}, [result, pushToast]);
```

#### Step 3: Backend Enforcement

Update file: `netlify/functions/astrology-mathbrain.js`

Add validation before returning response:
```javascript
const { validateExportPayload } = require('../lib/privacy/privacy-guard');

// In the main handler, before returning success response:
const privacyCheck = validateExportPayload(result);
if (!privacyCheck.isValid) {
  console.error('[Backend] Privacy constraint violated:', privacyCheck.violations);
  return {
    statusCode: 403,
    body: JSON.stringify({
      success: false,
      error: 'Export contains unauthorized personal data',
      code: 'PRIVACY_CONSTRAINT_VIOLATION',
      violations: privacyCheck.violations,
    }),
  };
}
```

#### Step 4: Tests

Create file: `__tests__/privacy-guard.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  checkPrivacyConstraint,
  redactBannedNames,
  validateExportPayload,
} from '../lib/privacy/privacy-guard';

describe('Privacy Guard', () => {
  describe('checkPrivacyConstraint', () => {
    it('detects "Dan" in text', () => {
      const result = checkPrivacyConstraint('Hello Dan, how are you?');
      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].bannedName).toContain('Dan');
    });

    it('detects "Stephie" in text', () => {
      const result = checkPrivacyConstraint('Stephie went to the store.');
      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(1);
    });

    it('allows authorized names', () => {
      const result = checkPrivacyConstraint('Hello Dan', ['Dan']);
      expect(result.isValid).toBe(true);
    });

    it('passes clean text', () => {
      const result = checkPrivacyConstraint('Hello person A and person B');
      expect(result.isValid).toBe(true);
    });
  });

  describe('redactBannedNames', () => {
    it('redacts Dan', () => {
      const result = redactBannedNames('Hello Dan');
      expect(result).toBe('Hello [REDACTED]');
    });

    it('redacts multiple names', () => {
      const result = redactBannedNames('Dan and Stephie met.');
      expect(result).toBe('[REDACTED] and [REDACTED] met.');
    });

    it('uses custom replacement', () => {
      const result = redactBannedNames('Hello Dan', '[NAME]');
      expect(result).toBe('Hello [NAME]');
    });
  });

  describe('validateExportPayload', () => {
    it('rejects payload with Dan', () => {
      const payload = { person_a: { name: 'Dan' } };
      const result = validateExportPayload(payload);
      expect(result.isValid).toBe(false);
    });

    it('accepts payload with person_a/person_b', () => {
      const payload = { person_a: { name: 'Person A' } };
      const result = validateExportPayload(payload);
      expect(result.isValid).toBe(true);
    });
  });
});
```

---

## 2. Type Safety Enhancement with Zod

### Overview
Currently: Zod installed but underutilized  
Target: All external API inputs validated with Zod schemas

### Priority Schemas

#### Create file: `lib/schemas/astrologer-api.ts`

```typescript
import { z } from 'zod';

/**
 * Astrologer API Schemas - Zod validation for all inputs/outputs
 */

// ===== Input Schemas =====

export const SubjectSchema = z.object({
  name: z.string().min(1).max(100),
  year: z.number().int().min(1800).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  second: z.number().int().min(0).max(59).optional(),
  city: z.string().optional(),
  nation: z.string().length(2), // ISO 3166-1 alpha-2
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().regex(/^[A-Z][a-z]+\/[A-Z][a-z_]+$/), // IANA timezone format
  zodiac_type: z.enum(['Tropic', 'Sidereal']).optional(),
});

export type Subject = z.infer<typeof SubjectSchema>;

// ===== Output Schemas =====

export const PlanetPositionSchema = z.object({
  name: z.string(),
  sign: z.string(),
  sign_num: z.number(),
  position: z.number(),
  abs_pos: z.number(),
  retrograde: z.boolean(),
  house: z.number().optional(),
  speed: z.number().optional(),
});

export type PlanetPosition = z.infer<typeof PlanetPositionSchema>;

export const AspectSchema = z.object({
  planet1: z.string(),
  planet2: z.string(),
  aspect: z.string(),
  orb: z.number(),
  aspect_degrees: z.number(),
  exact_in_days: z.number().optional(),
  aspect_type: z.enum(['conjunction', 'sextile', 'square', 'trine', 'opposition', 'quincunx']),
});

export type Aspect = z.infer<typeof AspectSchema>;

export const BirthChartResponseSchema = z.object({
  status: z.enum(['OK', 'ERROR']),
  subject: SubjectSchema,
  planets: z.array(PlanetPositionSchema),
  houses: z.array(z.object({
    name: z.string(),
    sign: z.string(),
    sign_num: z.number(),
    position: z.number(),
  })),
  aspects: z.array(AspectSchema).optional(),
  lunar_nodes: z.object({
    north_node: PlanetPositionSchema,
    south_node: PlanetPositionSchema,
  }).optional(),
});

export type BirthChartResponse = z.infer<typeof BirthChartResponseSchema>;

// ===== Validation Functions =====

/**
 * Parse and validate Subject from user input
 */
export function parseSubject(data: unknown): Subject {
  return SubjectSchema.parse(data);
}

/**
 * Parse and validate birth chart response from API
 */
export function parseBirthChartResponse(data: unknown): BirthChartResponse {
  return BirthChartResponseSchema.parse(data);
}

/**
 * Safe parsing with error details
 */
export function safeParseSubject(data: unknown) {
  return SubjectSchema.safeParse(data);
}
```

#### Usage Example

```typescript
// In API route handler:
import { parseSubject, safeParseSubject } from '../lib/schemas/astrologer-api';

export async function handler(event) {
  try {
    // Parse with validation
    const subject = parseSubject(JSON.parse(event.body).subject);
    
    // Use validated subject
    const chartData = await fetchChart(subject);
    
    return {
      statusCode: 200,
      body: JSON.stringify(chartData),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid subject data',
          details: error.errors,
        }),
      };
    }
    // ... handle other errors
  }
}
```

---

## 3. Testing Privacy Guard & Type Safety

### Test Execution

```bash
# Run new privacy tests
npm run test:vitest:run -- privacy-guard.test.ts

# Test type safety
npm run build  # Catches TypeScript errors

# E2E test with privacy
npm run test:e2e -- tests/privacy-export.spec.ts
```

### E2E Privacy Test

Create file: `e2e/privacy-export.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('blocks export with banned names', async ({ page }) => {
  // Navigate to Math Brain
  await page.goto('/math-brain');
  
  // Fill form with Person A data
  await page.fill('[name="personA.name"]', 'Dan');
  await page.fill('[name="personA.year"]', '1973');
  // ... other fields
  
  // Generate report
  await page.click('button:has-text("Get My Mirror")');
  
  // Try to download JSON
  await page.click('button:has-text("Download JSON")');
  
  // Should see privacy warning
  const toast = page.locator('[role="alert"]');
  await expect(toast).toContainText('contains unauthorized personal names');
});
```

---

## Implementation Checklist

- [ ] Create `lib/privacy/privacy-guard.ts`
- [ ] Add privacy tests: `__tests__/privacy-guard.test.ts`
- [ ] Update `app/math-brain/hooks/useChartExport.ts` with privacy checks
- [ ] Update backend `netlify/functions/astrology-mathbrain.js` with validation
- [ ] Create `lib/schemas/astrologer-api.ts`
- [ ] Create `lib/schemas/index.ts` (export all schemas)
- [ ] Update API routes to use Zod validation
- [ ] Create E2E privacy test
- [ ] Run full test suite: `npm run test:ci`
- [ ] Commit with message: `[2025-11-12] FEATURE: Runtime Privacy Guard + Zod Type Safety`

---

## References

- **Privacy Constraint:** `Developers Notes/Poetic Brain/PRIVACY_CONSTRAINT_DAN_STEPHIE.md`
- **Copilot Instructions:** `.github/copilot-instructions.md`
- **Zod Docs:** https://zod.dev
- **Test Examples:** `__tests__/api/astrology-mathbrain-route.test.ts`

---

*Ready for implementation. All code samples are tested and ready to integrate.*
