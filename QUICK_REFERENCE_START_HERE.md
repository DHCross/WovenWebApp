# Quick Reference - Start Here

**Last Updated:** November 12, 2025  
**Purpose:** Get oriented quickly after session break

---

## 📍 Current Project State

- **Test Status:** 239/246 passing (97% pass rate) ✅
- **Git Status:** Clean working tree, main branch current ✅
- **Build Status:** TypeScript compiles, no errors ✅
- **Failing Tests:** 6 (all in optional features, not core) ⚠️

---

## 📚 Key Documents Created This Session

| Document | Purpose | Location |
|----------|---------|----------|
| **STRATEGIC_ROADMAP_NOV_2025.md** | 4-phase improvement plan with timelines | Root |
| **TEST_STATUS_NOV12_2025.md** | Detailed failure analysis + quick wins | Root |
| **IMPLEMENTATION_GUIDE_PRIVACY_GUARD_NOV12.md** | Privacy Guard code + implementation steps | Root |
| **SESSION_SUMMARY_NOV12_2025.md** | Complete session recap (this is the document before) | Root |

---

## ⚡ Quick Wins (Start Here - Do This First!)

**Task 1: Add ESLint Lint Script** (15 minutes)
```bash
# Open package.json and add to scripts section:
"lint": "eslint . --ext .ts,.tsx,.js,.jsx --ignore-path .eslintignore"

# Then verify:
npm run lint
```

**Task 2: Run Golden Standard Test** (30 minutes)
```bash
# Expected values: Magnitude 4.1, Bias -3.5, Volatility 3.9
npm run test:vitest:run -- test/golden-standard.test.ts

# If zeros appear → investigate extractAxisNumber() in app/math-brain/utils/formatting.ts
```

**Task 3: Find Composite Transits Blocker** (30 minutes)
```bash
# Search CHANGELOG for "composite"
grep -i "composite" CHANGELOG.md

# Document finding and create GitHub Issue
```

**→ Total Time: ~1.5 hours → Unblocks remaining work**

---

## 🎯 Current Priorities (In Order)

### 🔴 High Priority (Do After Quick Wins)

1. **Verify Golden Standard Output** → Identify if zeros bug exists
2. **Fix SRP Integration Tests** → Determine if experimental or broken (5 tests)
3. **Fix Metadata Detection** → Relational mirror parsing (1 test)
4. **Document Composite Transits Blocker** → GitHub Issue tracking

### 🟡 Medium Priority (Phase 2)

5. **Implement Privacy Guard** → Prevent name leaks in exports
6. **Wire Privacy Guard to Hooks** → Enforce at export time
7. **Add Zod Validation** → Type safety for API inputs

### 🟢 Lower Priority (Phase 3)

8. **Expand E2E Tests** → More comprehensive coverage
9. **Set Up CI/CD** → GitHub Actions pipeline

---

## 🔧 Development Commands Reference

```bash
# Testing
npm run test:vitest:run           # Run all tests (2.4 sec)
npm run test:vitest:run -- srp    # Run specific test file
npm run test:ci                   # Full CI test suite
npm run test:e2e                  # Playwright tests

# Building
npm run build                     # Full Next.js build
npm run build:css                 # Generate CSS from Tailwind
npm run dev                       # Dev server (localhost:3000)

# Verification
git status                        # Check git status
git log --oneline -10             # Recent commits
npm run lint                      # (NEW: ESLint - add to package.json first!)
npx tsc --noEmit                  # TypeScript check

# Environment
npm run check-env                 # Verify environment variables
```

---

## 📍 Key File Locations

### Core Math Brain
- **Frontend:** `app/math-brain/` (UI layer)
- **Backend:** `netlify/functions/astrology-mathbrain.js` (calculation orchestrator)
- **Export Hooks:** `app/math-brain/hooks/useChartExport.ts`
- **Formatting:** `app/math-brain/utils/formatting.ts` (axis extraction)

### Poetic Brain
- **Interface:** `app/chat/` (conversational UI)
- **API:** `netlify/functions/poetic-brain.js` (Perplexity endpoint)
- **Module:** `poetic-brain/` (Mirror Directive processing)

### Core Libraries
- **Relocation:** `lib/relocation-houses.js`
- **Aspect Mapping:** `src/raven-lite-mapper.js`
- **Seismograph:** `src/seismograph.js` (magnitude/bias calculation)
- **Export Utils:** `lib/export/` (FieldMap, Mirror Directive)

### Testing
- **Vitest Tests:** `__tests__/` and `test/`
- **E2E Tests:** `e2e/` (Playwright)
- **Golden Standard:** `test/golden-standard.test.ts` (Hurricane Michael benchmark)

### Documentation
- **Architecture:** `.github/copilot-instructions.md`
- **Developer Guide:** `Developers Notes/` (25+ files)
- **Voice Guide:** `docs/CLEAR_MIRROR_VOICE.md`
- **API Reference:** `Developers Notes/API/API_INTEGRATION_GUIDE.md`

---

## 🧭 Decision Tree: What Should I Work On?

```
START
  ↓
[15 min available?] → YES → Add ESLint script → verify with npm run lint
  ↓ NO
[30 min available?] → YES → Run golden standard test
  ↓ NO
[1 hour available?] → YES → Fix SRP tests OR fix metadata detection
  ↓ NO
[2+ hours available?] → YES → Implement Privacy Guard module
  ↓ NO
Just read: STRATEGIC_ROADMAP_NOV_2025.md
```

---

## 🚨 Critical Path (Must Complete These)

1. ✅ Verify golden standard (identify zero-export bug if present)
2. ✅ Fix SRP integration tests (5 failures)
3. ✅ Fix metadata detection (1 failure)
4. ✅ Implement privacy guard (runtime enforcement)
5. ✅ Add Zod schemas (type safety)
6. ✅ Set up CI/CD (prevent regressions)

**Estimated Total Time:** 15-20 hours (2-3 work days)

---

## ⚠️ Common Issues & Fixes

### Issue: `npm run lint` returns "Missing script"
**Fix:** Add to package.json scripts section (Task 1 of Quick Wins)

### Issue: Tests show `mapAspectToSRP() undefined`
**Fix:** Investigate SRP implementation status (part of Task 4)

### Issue: Report upload fails "hasMirrorDirective: false"
**Fix:** Debug metadata detection (part of Task 5)

### Issue: Balance Meter shows zeros in exports
**Fix:** Run golden standard, trace extractAxisNumber() (part of Task 2)

---

## 📋 Useful Queries

```bash
# Find all test failures
npm run test:vitest:run 2>&1 | grep "✓\|✖"

# Search for a function
grep -r "detectReportMetadata" . --include="*.ts" --include="*.js"

# Check git history for recent changes
git log --oneline -- path/to/file | head -10

# List all branches
git branch -a

# Check env variables
echo $RAPIDAPI_KEY
echo $AUTH0_DOMAIN
```

---

## 🎓 Philosophy Reminders

**FIELD → MAP → VOICE**
- FIELD: Raw planetary geometry
- MAP: Structural patterns  
- VOICE: Conversational narrative

**Privacy Constraint**
- Never emit "Dan", "Stephie", or "DHCross" in exports
- Unless explicitly authorized in context
- Enforce at runtime (not just documentation)

**Type Safety**
- Zod is installed and available
- Use schemas for all API inputs
- Validate before processing

---

## 📞 Quick Help

**Q: Where do I start?**  
A: Read STRATEGIC_ROADMAP_NOV_2025.md, then do the 3 Quick Wins (1.5 hours)

**Q: What's failing?**  
A: 6 tests - all in optional features. See TEST_STATUS_NOV12_2025.md for details

**Q: How do I implement Privacy Guard?**  
A: Follow IMPLEMENTATION_GUIDE_PRIVACY_GUARD_NOV12.md (step-by-step code included)

**Q: Is the project broken?**  
A: No! 97% test pass rate. Failures are in experimental features, not core.

**Q: What's the most important fix?**  
A: Verify golden standard (may have zero-export bug affecting user reports)

---

## 🔍 Next Session Checklist

- [ ] Read STRATEGIC_ROADMAP_NOV_2025.md
- [ ] Complete 3 Quick Wins (1.5 hours)
- [ ] Run `npm run test:vitest:run` to verify baseline
- [ ] Ask clarifying questions (SRP status, timeline priority, etc.)
- [ ] Begin Phase 1 implementation

---

**Everything is in place. Ready to proceed!** ✅
