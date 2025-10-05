# Archived Scripts - January 21, 2025

This directory contains legacy test and debug scripts that have been replaced by the formal test suite in `test/` and `__tests__/`.

## Why Archived

These scripts were created during early development for ad-hoc testing. With the Balance Meter v3.1 refactor, all testing is now consolidated into:
- `test/` (Vitest test suites)
- `__tests__/` (Jest test suites)
- Property-based tests in `test/balance-properties.test.ts`
- Golden standard tests in `test/golden-standard-2018.test.ts`

## Archived Files

### Balance Meter Debug Scripts
- `test-balance-meter-debug.js` - Ad-hoc balance meter testing
  - **Replaced by:** `test/balance-properties.test.ts` (19 property tests)

### API Testing Scripts
- `test-api-fixed.js` - API integration testing
- `test-api-live.js` - Live API testing
- `test-api-real.js` - Real API data testing
  - **Replaced by:** Netlify function tests + integration tests

### Diagnostic Scripts
- `debug-postMathBrain.js` - Math Brain debugging
- `diagnostic.js` - General diagnostics
- `quick-test.js` - Quick validation
  - **Replaced by:** `npm run test:vitest:run` (formal test suite)

### Structure Validation
- `test-consolidation.js` - Report consolidation testing
- `test-coords.js` - Coordinate validation
- `test-health.js` - Health data integration
- `test-improvements.js` - Improvement validation
- `test-relational-structure.js` - Relational structure testing
- `test-relationship-validation.js` - Relationship validation
- `test-report-structure.js` - Report structure testing
- `test-transit-fallback.js` - Transit fallback testing
- `wm-chart-schema-test.js` - Schema validation
  - **Replaced by:** Formal test suites with 69 tests covering all functionality

## Restoration

If you need to reference these scripts for historical context, they are preserved here. However, **do not use them for testing**. Use the formal test suite instead:

```bash
# Run all tests
npm run test:vitest:run

# Run specific balance meter tests
npm run test:vitest:run test/balance-properties.test.ts
npm run test:vitest:run test/golden-standard-2018.test.ts

# Run lexicon compliance
npm run lexicon:lint
```

## Migration Notes

All functionality from these ad-hoc scripts has been incorporated into the formal test suite:
- Property-based testing for mathematical invariants
- Golden standard tests for real-world validation
- Schema validation tests for contract enforcement
- API integration tests for backend verification

**Last Updated:** January 21, 2025  
**Archived During:** Balance Meter v3.1 dual-pipeline refactor  
**See:** `BALANCE_METER_REFACTOR_COMPLETE.md` for details
