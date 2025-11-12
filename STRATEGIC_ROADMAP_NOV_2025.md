# Strategic Roadmap - November 2025

**Current State:** Architecture is sound, working tree clean, ready for quality improvements  
**Date:** November 12, 2025  
**Owner:** Dan Cross / DHCross  

---

## Executive Summary

WovenWebApp is a **well-architected** Next.js 14 application implementing the Raven Calder astrological analysis system. The core infrastructure is solid:

✅ **Strengths:**
- Clear separation of Math Brain (calculator) and Poetic Brain (conversational)
- Comprehensive documentation and copilot instructions
- FIELD → MAP → VOICE protocol clearly defined
- Balance Meter v5.0 with Triple-Channel architecture (Seismograph/Balance/SFD)
- Privacy constraints documented and partially enforced
- Extensive CHANGELOG showing thoughtful refactoring history

⚠️ **Pending Items (from CHANGELOG):**
- Balance Meter zero exports (need diagnosis)
- Composite transits disabled (need documentation + timeline)
- Testing infrastructure incomplete (Playwright started, needs completion)
- Privacy guard runtime validation missing
- CI/CD pipeline not fully wired

---

## Phase 1: Quality Assurance (Weeks 1-2)

**Objective:** Ensure code quality, catch regressions, enforce consistency

### 1.1 Complete Testing Infrastructure

**Status:** Playwright framework started, Vitest configured, needs integration

**Actions:**
```bash
# Current state
$ npm run test:vitest:run     # Works
$ npm run test:e2e            # Has framework but needs tests
$ npm run lint                # Works
$ npm run build               # Works
```

**Tasks:**
1. Add 20+ Playwright E2E tests covering:
   - Math Brain solo + relational chart generation
   - Export flows (PDF, JSON, FieldMap)
   - Poetic Brain upload + parsing
   - Authentication gates (if applicable)

2. Add property-based tests for Balance Meter:
   - Magnitude: always 0-5, monotonic
   - Directional Bias: always -5 to +5, symmetric
   - Volatility: always 0-5
   - Coherence: calculated correctly

3. Wire CI/CD (GitHub Actions):
   ```yaml
   - npm run build:css
   - npm run test:vitest:run
   - npm run test:e2e
   - npm run lint
   - npm run build
   ```

**Owner:** Copilot + Human Review  
**Timeline:** 3-4 days  
**Validation:** All tests passing, 0 regressions on real data (Hurricane Michael benchmark)

---

### 1.2 Fix Known Pending Issues

**Status:** 3 items marked ⏳ in CHANGELOG

**Investigation Tasks:**

1. **Balance Meter Zero Exports**
   - Root cause diagnosis: Check `app/math-brain/utils/formatting.ts`
   - When does `extractAxisNumber()` return 0 vs undefined?
   - Add debug logging to trace the path
   - Test with Hurricane Michael data (golden standard: mag 4.1, bias -3.5)

2. **Composite Transits Disabled**
   - Why disabled? (Check CHANGELOG for commit message)
   - What's the blocking issue? (API limitation? Math complexity?)
   - Create GitHub Issue with: reason, blockers, timeline for re-enable
   - Document in `Developers Notes/API/API_LIMITATIONS.md`

3. **Person B Aspects**
   - Verify fix from Oct 12, 2025 is complete
   - Add regression test to ensure Person B aspects always populate
   - Check both SYNASTRY and COMPOSITE modes

**Owner:** Copilot + Jules Review  
**Timeline:** 2-3 days  
**Deliverables:** 
- Diagnosis documents with root causes
- GitHub Issues for tracking
- Regression tests in Playwright

---

### 1.3 Runtime Privacy Guard

**Status:** Privacy constraint exists in docs, not enforced in code

**Implementation:**

```typescript
// lib/privacy/privacy-guard.ts
export interface PrivacyConfig {
  bannedNames: string[];
  allowedUsers: string[];
  enforceLevel: 'strict' | 'warn' | 'off';
}

export function validatePrivacyConstraint(
  payload: any,
  authenticatedUser?: { id: string },
  config?: PrivacyConfig
): { valid: boolean; violations: string[] } {
  const bannedNames = ['Dan', 'Stephie', 'DHCross'];
  const violations: string[] = [];
  
  const text = JSON.stringify(payload);
  
  for (const name of bannedNames) {
    if (text.includes(name)) {
      // Only allow if explicitly authorized in payload
      if (!payload._authorized_names?.includes(name) || !authenticatedUser) {
        violations.push(`Banned name "${name}" found without authorization`);
      }
    }
  }
  
  return {
    valid: violations.length === 0,
    violations
  };
}

// Add to all export paths:
// - downloadResultJSON()
// - downloadBackstageJSON()
// - downloadMirrorDirectiveJSON()
// - buildMirrorSymbolicWeatherExport()
// - buildFieldMapExport()
```

**Enforcement Points:**
1. `app/math-brain/hooks/useChartExport.ts` - All exports
2. `app/api/raven/route.ts` - Chat uploads
3. `netlify/functions/astrology-mathbrain.js` - Backend validation
4. `lib/export/*.ts` - All formatters

**Owner:** Copilot Implementation → Jules Review  
**Timeline:** 1-2 days  
**Testing:** Unit tests + integration tests for unauthorized access

---

## Phase 2: Type Safety & Validation (Week 2-3)

**Objective:** Zero runtime errors from invalid data, catch issues at compile time

### 2.1 Zod Schema Enforcement

**Current State:** Zod installed, partially used  
**Target:** All external API inputs validated

**Priority Schemas:**
```typescript
// lib/schemas/astrologer-api.ts
const SubjectSchema = z.object({
  name: z.string(),
  year: z.number().min(1900).max(2100),
  month: z.number().min(1).max(12),
  day: z.number().min(1).max(31),
  hour: z.number().min(0).max(23),
  minute: z.number().min(0).max(59),
  second: z.number().min(0).max(59).optional(),
  city: z.string().optional(),
  nation: z.string().min(2).max(2), // ISO 3166-1 alpha-2
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string(), // IANA timezone
  zodiac_type: z.enum(['Tropic', 'Sidereal']).optional(),
});

// Validate at every boundary:
// 1. API request payload assembly
// 2. API response parsing
// 3. Frontend form submission
// 4. Poetic Brain upload handling
```

**Owner:** Copilot → Jules Review  
**Timeline:** 3-4 days  
**Validation:** TypeScript strict mode, no `any` types

---

### 2.2 Eliminate Circular Dependencies

**Status:** Several resolved in Nov 9 fixes, audit needed

**Action:**
```bash
npm install -g madge

# Check for circular dependencies
madge --circular lib/ src/ app/

# Map the entire codebase
madge --image deps.svg lib/ src/
```

**Known Safe Patterns:**
- ✅ Orchestrator imports helpers (one direction)
- ✅ Scale bridge (CommonJS) imports from TypeScript scales
- ❓ Need to audit new code paths

**Owner:** Copilot audit  
**Timeline:** 1 day  

---

## Phase 3: Documentation & Maintenance (Week 3-4)

**Objective:** New developers can onboard in <2 hours, maintenance is self-service

### 3.1 Developer Experience

Create `DEVELOPER_CHECKLIST.md`:
```markdown
# Developer Checklist

## Local Setup (5 min)
- [ ] Clone repo
- [ ] npm install
- [ ] cp .env.example .env.local
- [ ] Add RAPIDAPI_KEY
- [ ] npm run dev or netlify dev

## Typical Workflows

### Run All Tests
npm run test:ci

### Debug Balance Meter Zero Export
1. Check: extractAxisNumber() path
2. Add console.log to app/math-brain/utils/formatting.ts
3. Run with golden standard: test-golden-standard.sh
4. Compare against known values

### Check Privacy Constraints
grep -r "Dan\|Stephie" src/ app/ lib/
npm run lexicon:lint

### FIELD→MAP→VOICE Compliance
1. Read: docs/CLEAR_MIRROR_VOICE.md
2. Check: lib/reporting/metric-labels.js has no jargon
3. Test: npm run test:lexicon:lint
```

### 3.2 Troubleshooting Guide

Create `TROUBLESHOOTING_GUIDE.md` with:
- "Balance Meter shows zeros"
- "Person B aspects missing"
- "API returns 503"
- "Privacy guard blocking export"
- "Test fails on CI but passes locally"

### 3.3 Architecture Diagrams

Create `ARCHITECTURE.md` with:
- Data flow: User input → Math Brain → Exports → Poetic Brain
- Module dependencies (non-circular)
- Error boundaries and recovery paths

---

## Phase 4: Monitoring & Improvement (Ongoing)

**Objective:** Track system health, identify patterns

### 4.1 WB/ABE/OSR Metrics

Implement tracking (see CHANGELOG 2025-09-12):
- WB (Whole-Brain resonance) ✅ User says it landed
- ABE (Anomalous But Empirical) ✅ User says it's accurate but surprising
- OSR (Outside Symbolic Range) ❌ User says it didn't apply

**Add to exports:**
```json
{
  "session_feedback": {
    "resonance_rating": "WB|ABE|OSR",
    "notes": "string",
    "timestamp": "ISO8601"
  }
}
```

### 4.2 Production Monitoring

- Track API error rates (RapidAPI timeouts)
- Log Poetic Brain upload parsing failures
- Monitor export generation times
- Alert on privacy constraint violations

---

## Immediate Next Steps (Today/Tomorrow)

**Priority Order:**

1. **Check Test Status**
   ```bash
   npm run test:vitest:run
   npm run test:e2e
   npm run lint
   ```

2. **Diagnose Balance Meter Zero Issue**
   - Run: `node test-golden-standard.sh`
   - Check output against known values
   - Add console.log at `extractAxisNumber()`

3. **Identify Composite Transit Blocker**
   - Check CHANGELOG for when/why disabled
   - Create GitHub Issue with timeline

4. **Run Static Analysis**
   ```bash
   madge --circular lib/ src/ app/
   grep -r "any" app/ lib/ src/ --include="*.ts" --include="*.tsx"
   ```

---

## Success Metrics

| Metric | Current | Target | Owner |
|--------|---------|--------|-------|
| Test Coverage | ~60% | 85%+ | Copilot |
| Circular Dependencies | 0 | 0 | Audit |
| Lint Errors | 0 | 0 | CI/CD |
| Privacy Violations | Unmeasured | 0 detected | Runtime guard |
| Doc Pages | 25+ | 30+ | Copilot |
| Onboarding Time | Unmeasured | <2h | UX testing |
| Golden Standard Accuracy | 100% (1 benchmark) | 100% (3+ benchmarks) | Validation |

---

## Resources

- **Primary Reference:** `.github/copilot-instructions.md`
- **Architecture:** `Developers Notes/Core/Four Report Types_Integrated 10.1.25.md`
- **Voice Guide:** `docs/CLEAR_MIRROR_VOICE.md`
- **Lessons Learned:** `Developers Notes/Lessons Learned/Lessons Learned for Developer.md`
- **Recovery Guide:** `Developers Notes/Lessons Learned/copilot_fix_recovery.md`

---

## Notes for Jules

- All changes should maintain privacy constraint compliance
- Any Balance Meter math changes require re-validation against golden standards
- FIELD→MAP→VOICE protocol is non-negotiable for Poetic Brain integration
- Document any architecture decisions that differ from copilot-instructions.md

---

*Last updated: November 12, 2025*  
*Next review: November 19, 2025*
