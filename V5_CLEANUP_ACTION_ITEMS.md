# V5.0 Cleanup Action Items
## Legacy Code & Documentation Removal Plan

**Date:** October 18, 2025  
**Status:** In Progress  
**Priority:** Medium (does not block production)

---

## 🎯 OVERVIEW

Balance Meter v5.0 is production-ready, but the codebase still contains:
- Legacy v3.1/v4.0 code paths (not used by v5.0)
- Deprecated documentation files
- Type definitions for removed metrics
- Test fixtures using old format

**Impact:** Low (v5.0 works correctly). These are unused code paths that create confusion.

---

## 📋 CLEANUP CHECKLIST

### TIER 1: Documentation (No Code Impact)

- [ ] **Rewrite** `lib/uncanny-scoring-spec.md`
  - Currently: References v3.1 4-axis system
  - Action: Update to v5.0 (Magnitude + Directional Bias only)
  - Effort: 1-2 hours
  - Impact: Documentation only

- [ ] **Update** `docs/POETIC_BRAIN_V1_SNAPSHOT.md`
  - Currently: Historical snapshot with v4.0 lexicon
  - Action: Add v5.0 lexicon conversion table
  - Effort: 30 minutes
  - Impact: Documentation only

- [ ] **Archive** `Developers Notes/Core/A Strange Cosmic Symbolism v4.md`
  - Currently: Partially outdated (mentions 4 axes)
  - Action: Mark as historical, create v5.0 version
  - Effort: 1 hour
  - Impact: Documentation only

### TIER 2: Unused Code Paths (Safe to Remove)

- [ ] **Remove** `src/symbolic-weather/renderer.ts`
  - Currently: v3.1 spec renderer (Coherence, SFD, etc.)
  - Status: Not used by v5.0 system
  - Action: Delete file, verify no imports
  - Effort: 30 minutes
  - Impact: Removes 765 lines of unused code

- [ ] **Remove** `src/balance-meter.js`
  - Currently: Legacy balance meter implementation
  - Status: Replaced by `src/seismograph.js`
  - Action: Verify no imports, delete
  - Effort: 30 minutes
  - Impact: Removes ~200 lines of unused code

- [ ] **Remove** SFD computation functions
  - Files: `lib/balance/scale.js`, `lib/balance/assertions.js`
  - Currently: Compute SFD (removed in v5.0)
  - Action: Remove `computeSfd()`, `scaleSfd()` functions
  - Effort: 1 hour
  - Impact: Removes ~100 lines, cleans up scale.js

### TIER 3: Type Definitions (Safe to Update)

- [ ] **Update** `src/types/wm-json-appendix.ts`
  - Currently: Includes SFD and Coherence types
  - Action: Remove deprecated types, keep v5.0 only
  - Effort: 30 minutes
  - Impact: Cleaner type definitions

- [ ] **Update** `lib/schemas/day.ts`
  - Currently: Includes optional `coherence`, `sfd` fields
  - Action: Remove deprecated fields (keep for backward compat in comments)
  - Effort: 30 minutes
  - Impact: Cleaner schema

### TIER 4: Test Fixtures (Verify Compatibility)

- [ ] **Audit** test fixtures in `/__tests__/`
  - Currently: May use old format with SFD/Coherence
  - Action: Update to v5.0 format (Magnitude + Directional Bias)
  - Effort: 2-3 hours
  - Impact: Ensures tests validate v5.0 behavior

- [ ] **Audit** sample outputs in `/Sample Output/`
  - Currently: May reference old metrics
  - Action: Update or mark as historical
  - Effort: 1 hour
  - Impact: Documentation clarity

---

## 🔍 VERIFICATION COMMANDS

### Find Remaining References
```bash
# SFD references (excluding comments)
grep -r "sfd\|SFD" --include="*.js" --include="*.ts" src/ lib/ app/ | \
  grep -v "//\|/\*\|deprecated\|legacy\|v4\|v3" | \
  head -20

# Coherence references (excluding comments)
grep -r "coherence\|Coherence" --include="*.js" --include="*.ts" src/ lib/ app/ | \
  grep -v "//\|/\*\|deprecated\|legacy\|v4\|v3" | \
  head -20

# Find imports of removed files
grep -r "symbolic-weather/renderer\|balance-meter.js" --include="*.ts" --include="*.js" src/ lib/ app/

# Find uses of removed functions
grep -r "computeSfd\|scaleSfd\|getCoherenceLabel" --include="*.ts" --include="*.js" src/ lib/ app/
```

### Verify v5.0 Compliance
```bash
# Check that main.js uses aggregate() with rolling context
grep -A 5 "aggregate(" src/math_brain/main.js | head -20

# Verify seismograph.js is the canonical implementation
grep "function aggregate" src/seismograph.js

# Check that scale.js only handles Magnitude and Directional Bias
grep "export.*function" lib/balance/scale.js | grep -v "sfd\|coherence"
```

---

## 📊 IMPACT ANALYSIS

### What Breaks If We Don't Clean Up
- ❌ Confusion about which system is active
- ❌ New developers might use deprecated code
- ❌ Larger bundle size (unused code)
- ❌ More maintenance burden

### What Breaks If We Clean Up Incorrectly
- ✅ Nothing (v5.0 is isolated from these files)
- ✅ Tests will fail (easy to fix)
- ✅ Imports will break (easy to find)

**Risk Level:** LOW — These are unused code paths

---

## 🚀 RECOMMENDED EXECUTION ORDER

### Phase 1: Documentation (Safe, No Risk)
1. Rewrite `lib/uncanny-scoring-spec.md`
2. Update `docs/POETIC_BRAIN_V1_SNAPSHOT.md`
3. Archive `A Strange Cosmic Symbolism v4.md`

**Time:** 2-3 hours  
**Risk:** None

### Phase 2: Type Definitions (Safe, Easy to Revert)
1. Update `src/types/wm-json-appendix.ts`
2. Update `lib/schemas/day.ts`
3. Run tests to verify

**Time:** 1 hour  
**Risk:** Low (tests will catch issues)

### Phase 3: Unused Code (Safe, Verify First)
1. Run verification commands
2. Remove `src/symbolic-weather/renderer.ts`
3. Remove `src/balance-meter.js`
4. Remove SFD functions from `lib/balance/scale.js`
5. Run tests to verify

**Time:** 2-3 hours  
**Risk:** Low (unused code)

### Phase 4: Test Fixtures (Verify Compatibility)
1. Audit test fixtures
2. Update to v5.0 format
3. Run full test suite

**Time:** 2-3 hours  
**Risk:** Medium (may reveal integration issues)

---

## 📝 DOCUMENTATION UPDATES

After cleanup, update these files:

- [ ] `CONSOLIDATED_V5_DOCUMENTATION.md` - Update cleanup status
- [ ] `DOCUMENTATION_MAP.md` - Remove references to deleted files
- [ ] `README.md` - Clarify v5.0 is only active system
- [ ] `/Developers Notes/README.md` - Update file index

---

## 🎯 SUCCESS CRITERIA

After cleanup:
- ✅ No unused SFD/Coherence code paths
- ✅ All documentation references v5.0 only
- ✅ Type definitions match v5.0 schema
- ✅ All tests pass
- ✅ Bundle size reduced by ~50KB

---

## 💡 NOTES

### Why Not Delete Immediately?
1. **Safety:** Verify nothing depends on removed code first
2. **History:** Keep in git history for reference
3. **Gradual:** Easier to debug if issues arise

### Why Keep Some Deprecated Files?
1. **Historical Reference:** Helps understand evolution
2. **Fallback:** If v5.0 has issues, can reference old implementation
3. **Learning:** New developers can see what was tried

---

## 📞 QUESTIONS?

Refer to:
- `CONSOLIDATED_V5_DOCUMENTATION.md` - Complete v5.0 reference
- `/Developers Notes/Core/Four Report Types_Integrated 10.1.25.md` - PRIMARY REFERENCE
- `BALANCE_METER_V5_COMPLETE.md` - Philosophy & architecture

---

**Maintained by:** Dan Cross (DHCross)  
**Last Updated:** October 18, 2025  
**Status:** Action items identified, ready for execution
