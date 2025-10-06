# Single-Source Scaling Enforcement

**Created:** 2025-01-21  
**Status:** ACTIVE — Enforced by CI Gate Tests

## Overview

All scaling logic **MUST** import from the canonical source:  
`lib/balance/scale-bridge.js`

This prevents "ghost" `/100` divisions and ensures amplitude restoration remains intact.

---

## Canonical Source Hierarchy

```
lib/balance/constants.js
  ↓ (defines SCALE_FACTOR=50, BIAS_DIVISOR=10, ranges)
  
lib/balance/scale.ts (TypeScript definitions)
  ↓ (TypeScript type definitions and documentation)
  
lib/balance/scale-bridge.js (SINGLE SOURCE OF TRUTH)
  ↓ (CommonJS exports: scaleUnipolar, scaleBipolar, scaleCoherenceFromVol, scaleSFD, etc.)
  
CONSUMERS:
  • src/seismograph.js
  • netlify/functions/astrology-mathbrain.js
  • Any other modules needing scaling
```

---

## Enforcement Mechanisms

### 1. **CI Gate Test** (`__tests__/ci-gate-golden-case.test.ts`)

```typescript
test('Constants are imported from single source', () => {
  const seismoPath = path.join(__dirname, '../src/seismograph.js');
  const content = fs.readFileSync(seismoPath, 'utf8');
  
  // Verify SCALE_FACTOR comes from scale-bridge
  expect(content).toMatch(/SCALE_FACTOR[^}]*}\s*=\s*require\(['"]\.\.\/lib\/balance\/scale-bridge['"]\)/s);
});
```

**Status:** ✅ Active in CI pipeline (`npm run test:ci`)

---

### 2. **Code Review Checklist**

Before merging any PR that touches scaling logic:

- [ ] Does it import from `scale-bridge.js`?
- [ ] Does it avoid inline `/100` or `/10` divisions?
- [ ] Does the transform trace show `×50` (not `×5`)?
- [ ] Does Golden Standard still pass (Mag 5.0, Bias -5.0 for 2018-10-10)?

---

### 3. **Smoke Test** (`scripts/smoke-golden-case.js`)

**Quick developer check:**
```bash
npm run smoke:golden
```

Verifies:
- 2018-10-10 produces Mag ≥4.5, Bias ≤-4.0
- Current date produces reasonable values
- Completes in under 1 minute

**Status:** ✅ Active (`package.json` script)

---

## Golden Standard (Non-Negotiable)

**Date:** 2018-10-10 (Hurricane Michael)  
**Minimum Thresholds:**
- **Magnitude:** ≥4.5
- **Directional Bias:** ∈[-5.0, -4.0] (clamped at -5.0)

**CI Enforcement:**
```typescript
test('Golden Standard: 2018-10-10 Hurricane Michael', async () => {
  const { GOLDEN_CASES } = await import('../lib/balance/constants.js');
  
  expect(GOLDEN_CASES['2018-10-10']).toBeDefined();
  expect(GOLDEN_CASES['2018-10-10'].minMag).toBeGreaterThanOrEqual(4.5);
  expect(GOLDEN_CASES['2018-10-10'].biasBand).toEqual([-5.0, -4.0]);
});
```

---

## Historical Context

**Problem (Pre-2025-01-21):**
- Multiple locations had `/100` divisions (seismograph, amplifiers)
- Amplitude was artificially dampened by factor of 10
- 2018-10-10 returned Mag 0.5 instead of 5.0

**Solution (2025-01-21):**
- Centralized all scaling in `scale-bridge.js`
- Changed `BIAS_DIVISOR` from 100 to 10
- Enforced single-source imports via CI gate
- Established Golden Standard regression test

**Result:**
- 2018-10-10 now correctly produces Mag 5.0, Bias -5.0
- Full amplitude restored (×50 scaling active)
- Future regressions blocked by automated tests

---

## Debugging Tips

**If amplitude seems wrong:**

1. **Check transform trace:**
   ```javascript
   result.transform_trace.pipeline
   // Should be: 'amplify-geometry → sum → amplify-magnitude → normalize → ×50 → clamp → round'
   ```

2. **Verify Golden Standard:**
   ```bash
   npm run smoke:golden
   # 2018-10-10 must show Mag=5.0, Bias=-5.0
   ```

3. **Inspect scaling imports:**
   ```bash
   grep -r "SCALE_FACTOR" src/ lib/
   # Should only import from scale-bridge.js
   ```

4. **Check for ghost divisions:**
   ```bash
   grep -r "/100" src/ lib/ | grep -v "// comment"
   # Should NOT find any /100 before ×50 scaling
   ```

---

## Related Documentation

- **`AMPLITUDE_RESTORATION_2025.md`** — Full restoration story
- **`MATH_BRAIN_COMPLIANCE.md`** — Technical requirements
- **`lib/balance/README.md`** — Balance Meter architecture
- **`reports/compare-2018-10-10_vs_2025-10-06.md`** — Golden case validation

---

## Maintenance Pledge

**Commitment:**  
This single-source architecture is **non-negotiable**. Any change that bypasses `scale-bridge.js` must be rejected in code review and will fail CI.

**Contact:**  
Questions about scaling logic → See `MAINTENANCE_GUIDE.md` or escalate to Jules (repo owner).

---

**Last Updated:** 2025-01-21  
**Next Review:** On any amplitude-related issue or scaling refactor
