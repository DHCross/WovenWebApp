# Performance Remediation Plan — Lighthouse Score 49

## Context
- Latest Lighthouse audit (Netlify deploy `68eb58797e0b3c00089c28d4`) reports a performance score of **49**.
- Key metrics: FCP 0.9 s (good), TTI 16.3 s (very poor), Speed Index 11.8 s, LCP 7.6 s, CLS 0.268.
- Diagnosed issues include heavy JavaScript execution on the Math Brain page, oversized PNG artwork (>6 MB total), synchronous API calls before interactivity, and images rendered without intrinsic dimensions or lazy-loading.

## Targets
- Reduce **Time to Interactive** to <5 s on reference hardware.
- Bring **Largest Contentful Paint** under 2.5 s.
- Lower **Cumulative Layout Shift** below 0.1.
- Shrink initial payload (HTML + JS + critical imagery) to <2 MB.
- Maintain functional parity for Math Brain workflows, Auth0 login, and report exports.

## Workstream A — Math Brain Page Decomposition
1. Refactor `app/math-brain/page.tsx` (currently 5,586 lines, `"use client"`) into a server-shell plus scoped client subcomponents.
   - Move pure-render logic and static helpers to server components.
   - Gate client-only helpers (forms, chart exports, diagnostics) behind dynamic imports.
2. Convert heavyweight visualizers (`EnhancedDailyClimateCard`, `BalanceMeterSummary`, `SymbolicSeismograph`, `SnapshotDisplay`, etc.) into lazy-loaded modules triggered by feature toggles.
3. Replace synchronous `Promise` chains that block render with suspense-friendly loaders or progressive disclosure UIs.
4. Instrument bundle analysis (e.g., `ANALYZE=true next build`) to verify bundle size reductions and iterate until the main client chunk drops below targeted thresholds.

## Workstream B — API Request Deferral
1. Rework the dual POST sequence (`foundation` + `weather`) under `prepareReport` so requests fire only after explicit user confirmation.
2. Investigate streaming responses or chunked updates to avoid locking the main thread while large JSON bodies parse.
3. Cache or reuse foundational data when layering transits to eliminate duplicate computation.
4. Add optimistic UI states so above-the-fold content remains interactive while background work completes.

## Workstream C — Media Optimization
1. Convert large PNG assets in `public/art/` to WebP/AVIF with responsive variants (target ≤300 KB hero, ≤150 KB accent).
2. Swap `<img>` usage in `app/page.tsx` and Math Brain background styles for Next `<Image>` or CSS `image-set`, ensuring explicit width/height.
3. Apply `loading="lazy"` and `decoding="async"` for non-critical images (Snapshot previews, decorative art).
4. Confirm optimized assets propagate through Netlify deploy previews; update cache-busting query params if required.

## Workstream D — Layout Stability
1. Add intrinsic sizing (width/height or aspect-ratio) to all remaining `<img>` tags (e.g., Snapshot chart wheel preview).
2. Audit Tailwind utility combinations that rely on dynamic measurements (especially absolute/fixed backgrounds) and adjust to avoid layout jumps.
3. Re-run Lighthouse and Web Vitals to ensure CLS consistently <0.1 across viewports.

## Workstream E — Authentication Bootloader
1. In `components/HomeHero.tsx`, replace manual script injection with Next `<Script strategy="lazyOnload">` or a click-triggered dynamic import.
2. Defer Auth0 discovery/config fetch until the user requests a protected action.
3. Provide a lightweight placeholder UI so the homepage hydrates without waiting for the SDK.

## Validation & Monitoring
- After each workstream milestone, run Lighthouse in CI or Netlify deploy previews; track metrics over time.
- Add automated bundle-size checks (e.g., `next build --analyze` gated in CI) to prevent regressions.
- Optionally integrate Web Vitals reporting in production to catch real-user regressions early.

## Dependencies & Risks
- Refactors touch mission-critical Math Brain flows; coordinate with QA to cover report generation scenarios.
- Media pipeline changes require verifying PDF exports and Poetic Brain references still locate assets.
- Auth0 bootloader adjustments must respect existing environment toggles (`NEXT_PUBLIC_ENABLE_AUTH`).

## Timeline Sketch
1. Week 1: Complete Workstream A scaffolding + initial bundle measurements.
2. Week 2: Tackle Workstreams B & C, execute media optimization, retest exports.
3. Week 3: Address layout stability and Auth bootloader, finalize monitoring automation.
4. Week 4: Buffer for regression fixes, rerun Lighthouse, document final metrics.

---

## Quick Reference Checklist

### 🔴 **Critical (Do First)**
- [ ] Convert `public/art/raven-calder.png` (4.7 MB) to WebP/AVIF
- [ ] Convert `public/art/woven-map-image.png` (1.2 MB) to WebP/AVIF
- [ ] Convert `public/art/math-brain.png` (1.0 MB) to WebP/AVIF
- [ ] Add width/height to all `<img>` tags in `app/page.tsx`
- [ ] Gate dual API calls behind "Generate" button in Math Brain

### 🟡 **High Priority (Week 1-2)**
- [ ] Split `app/math-brain/page.tsx` into server shell + client components
- [ ] Lazy-load `EnhancedDailyClimateCard`
- [ ] Lazy-load `BalanceMeterSummary`
- [ ] Lazy-load `SymbolicSeismograph`
- [ ] Lazy-load PDF export utilities
- [ ] Move Auth0 SDK to `<Script strategy="lazyOnload">`

### 🟢 **Medium Priority (Week 2-3)**
- [ ] Add `loading="lazy"` to non-critical images
- [ ] Cache foundation data for resumed sessions
- [ ] Add bundle size checks to CI
- [ ] Implement streaming responses for large API payloads
- [ ] Add explicit dimensions to `SnapshotDisplay.tsx` chart previews

### 🔵 **Low Priority (Week 3-4)**
- [ ] Add Web Vitals production monitoring
- [ ] Audit Tailwind absolute/fixed positioning for CLS
- [ ] Document performance budgets for future features
- [ ] Create automated Lighthouse CI checks

---

## Success Metrics

### **Current (Baseline)**
- Performance Score: **49**
- Time to Interactive: **16.3s**
- Largest Contentful Paint: **7.6s**
- Cumulative Layout Shift: **0.268**
- Total Payload: **~6 MB**

### **Target (After Remediation)**
- Performance Score: **≥85**
- Time to Interactive: **<5s**
- Largest Contentful Paint: **<2.5s**
- Cumulative Layout Shift: **<0.1**
- Total Payload: **<2 MB**

### **Measurement Points**
1. After media optimization (expect 4-5 MB reduction)
2. After Math Brain refactor (expect TTI improvement to ~8s)
3. After API deferral (expect TTI improvement to ~5s)
4. After layout stability fixes (expect CLS < 0.1)
5. Final validation (all metrics at target)

---

## Related Documentation

- **Implementation:** `V5_IMPLEMENTATION_SUMMARY.md`
- **Deployment:** `DEPLOYMENT_TROUBLESHOOTING.md`
- **Architecture:** `docs/REFACTOR_UNIFIED_NATAL_ARCHITECTURE.md`
- **Changelog:** `CHANGELOG_v5.0_UNIFIED_DASHBOARD.md`

---

**Status:** 📋 Planning Phase  
**Priority:** High (Performance blocking production release)  
**Owner:** TBD  
**Created:** October 12, 2025  
**Target Completion:** November 9, 2025 (4 weeks)

