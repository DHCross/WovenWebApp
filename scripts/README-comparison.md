# Math Brain Version Comparison Testing

## Purpose

This script validates that the refactored Math Brain produces **identical outputs** to the original version across all supported modes and edge cases.

## Quick Start

```bash
# Test single scenario (default: natal-solo)
node scripts/compare-mathbrain-versions.js

# Test all scenarios
node scripts/compare-mathbrain-versions.js --all

# Test custom payload
node scripts/compare-mathbrain-versions.js --payload test/payloads/custom.json
```

## Prerequisites

1. **Original file must exist:**
   ```bash
   cp lib/server/astrology-mathbrain.js lib/server/astrology-mathbrain.original.js
   ```

2. **Set environment variables:**
   ```bash
   export RAPIDAPI_KEY="your-key-here"
   ```

## Built-in Test Cases

| Test Name | Mode | Description |
|-----------|------|-------------|
| `natal-solo` | NATAL_CHART | Single person natal chart |
| `natal-with-transits` | TRANSITS | Natal + transits over date range |
| `synastry` | SYNASTRY | Two-person compatibility |
| `composite` | COMPOSITE | Composite chart for couple |

## Output

Results are saved to `test/comparison-results/`:
- `{test-name}-comparison.json` - Full diff report

### Example Output

```
ℹ Testing: natal-solo
ℹ Executing original version...
ℹ Executing refactored version...
✓ natal-solo: PASSED (outputs identical)

Summary
Total:   1
Passed:  1
```

### When Differences Found

```
✗ natal-solo: FAILED (3 differences found)
  ⚠ provenance.generated_at: Value mismatch
    Original:    "2025-11-09T21:00:00.123Z"
    Refactored:  "2025-11-09T21:00:01.456Z"
  ⚠ symbolic_weather[0].magnitude: Value mismatch
    Original:    2.7
    Refactored:  2.699999999999
ℹ Full comparison saved to: test/comparison-results/natal-solo-comparison.json
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All tests passed |
| 1 | Differences found |
| 2 | Execution error |

## Common Differences to Ignore

Some differences are **expected and benign**:

### 1. Timestamps
```json
{
  "path": "provenance.generated_at",
  "message": "Timestamps will differ (execution time)"
}
```
**Action:** Ignore

### 2. Floating Point Precision
```json
{
  "path": "symbolic_weather[0].magnitude",
  "original": 2.7,
  "refactored": 2.699999999999999
}
```
**Action:** Check if difference < 0.0001

### 3. Error IDs
```json
{
  "path": "errorId",
  "original": "ERR-20251109-210000-ABC1",
  "refactored": "ERR-20251109-210001-XYZ2"
}
```
**Action:** Ignore (random generation)

## Integration with CI/CD

Add to your test suite:

```bash
# In package.json
{
  "scripts": {
    "test:comparison": "node scripts/compare-mathbrain-versions.js --all"
  }
}
```

## Workflow

1. **Before refactoring:**
   ```bash
   cp lib/server/astrology-mathbrain.js lib/server/astrology-mathbrain.original.js
   ```

2. **During refactoring:**
   Run comparison after each major change:
   ```bash
   npm run test:comparison
   ```

3. **After validation:**
   Once all tests pass consistently:
   ```bash
   # Archive original (don't delete)
   mv lib/server/astrology-mathbrain.original.js \
      lib/server/archive/astrology-mathbrain-pre-refactor-$(date +%Y%m%d).js
   ```

## Custom Payloads

Create test files in `test/payloads/`:

```json
{
  "mode": "NATAL_CHART",
  "subjects": [{
    "name": "Edge Case Test",
    "birth_date": "2000-02-29",
    "birth_time": "23:59",
    "birth_city": "Null Island",
    "birth_nation": "XX"
  }]
}
```

Then run:
```bash
node scripts/compare-mathbrain-versions.js --payload test/payloads/edge-case.json
```

## Troubleshooting

### "Original file not found"
```bash
# Solution: Copy current version as baseline
cp lib/server/astrology-mathbrain.js lib/server/astrology-mathbrain.original.js
```

### "Both versions failed"
- Check environment variables (`RAPIDAPI_KEY`)
- Verify network connectivity (RapidAPI access)
- Check for syntax errors in both files

### "Massive differences"
- Likely a breaking change in logic
- Review refactoring commits carefully
- Consider rolling back and refactoring incrementally

## Best Practices

1. **Run before major changes** - Establish baseline
2. **Run after each phase** - Catch regressions early
3. **Add custom edge cases** - Cover your specific use cases
4. **Archive originals** - Keep dated copies for reference
5. **Document intentional changes** - If you deliberately change behavior, document why

## Related Scripts

- `scripts/velocity-tracker.js` - Track refactoring progress
- `test/*.test.js` - Unit tests for individual modules
- `playwright.config.ts` - E2E tests for UI flows

---

**Remember:** Identical outputs = successful refactoring. Any differences should be **intentional and documented**.
