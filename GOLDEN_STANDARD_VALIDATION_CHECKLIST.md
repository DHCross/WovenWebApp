# Golden Standard Validation Checklist

**Purpose:** Ensure the single-source-of-truth architecture correctly produces crisis-level vs integration-level energy readings

**Status:** Ready for CI integration when RAPIDAPI_KEY is available

---

## Test Cases

### ✅ Test Case 1: Oct 10, 2018 (Golden Standard - MUST PASS)

**Configuration:**
```json
{
  "person_a": {
    "name": "Dan",
    "birth_date": "1973-07-24",
    "birth_time": "14:30",
    "timezone": "US/Eastern",
    "latitude": 40.0196,
    "longitude": -75.3167
  },
  "transit_start_date": "2018-10-10",
  "transit_end_date": "2018-10-10",
  "relocation": {
    "latitude": 30.1667,
    "longitude": -85.6667,
    "timezone": "US/Central"
  }
}
```

**Expected Results (From Golden Standard):**
```json
{
  "seismograph_summary": {
    "magnitude": 5.0,
    "directional_bias": -5.0,
    "volatility": 2.4
  }
}
```

**Validation Checks:**
- [ ] `magnitude >= 4.5` (minimum threshold)
- [ ] `magnitude <= 5.0` (maximum possible)
- [ ] `directional_bias >= -5.0` (minimum threshold)
- [ ] `directional_bias <= -4.0` (maximum inward)
- [ ] Clamp flags: `magnitude.hitMax = true`, `directional_bias.hitMin = true`
- [ ] Labels: `magnitude_label = "Peak"`, `directional_bias_label = "Strong Inward"`

**Assertion (For CI):**
```javascript
const result = await getSeismographFor('2018-10-10');
assert(result.magnitude >= 4.5, 'Crisis magnitude too low');
assert(result.directional_bias <= -4.0, 'Crisis inward bias insufficient');
assert(result.magnitude <= 5.0, 'Magnitude exceeds clamp');
assert(result.directional_bias >= -5.0, 'Directional bias exceeds clamp');
```

**Why This Matters:**
- Hurricane Michael made landfall on this date
- Real-world event = falsifiable test
- If math can't reach 4.5 magnitude, geometry amplification is broken
- If math can't reach -5.0 bias, hard aspect scoring is broken

---

### ✅ Test Case 2: Oct 31, 2025 (Today - Proportional Check)

**Configuration:**
```json
{
  "person_a": {
    "name": "Dan",
    "birth_date": "1973-07-24",
    "birth_time": "14:30",
    "timezone": "US/Eastern",
    "latitude": 40.0196,
    "longitude": -75.3167
  },
  "transit_start_date": "2025-10-31",
  "transit_end_date": "2025-10-31",
  "relocation": {
    "latitude": 30.1667,
    "longitude": -85.6667,
    "timezone": "US/Central"
  }
}
```

**Expected Results (Integration Phase - Provisional):**
```json
{
  "seismograph_summary": {
    "magnitude": 2.0,
    "directional_bias": 3.0,
    "volatility": 1.1
  }
}
```

**Validation Checks:**
- [ ] `magnitude < 4.5` (well below crisis threshold)
- [ ] `magnitude > 1.0` (above quiet background)
- [ ] `directional_bias > 0` (outward lean, not inward)
- [ ] `abs(directional_bias - magnitude) > 1.0` (proportional difference)
- [ ] No clamp flags (values within natural bounds)
- [ ] Labels: `magnitude_label = "Active"`, `directional_bias_label = "Mild Outward"`

**Assertion (For CI):**
```javascript
const result = await getSeismographFor('2025-10-31');
assert(result.magnitude < 4.5, 'Should be below crisis threshold');
assert(result.directional_bias > 0, 'Should show outward energy');
assert(result.magnitude > 1.0, 'Should show activity');
const ratio = Math.abs(result.magnitude) / 4.5; // vs crisis
assert(ratio < 0.7, 'Magnitude ratio inconsistent with integration');
```

**Why This Matters:**
- Tests system can distinguish crisis from routine
- Validates proportional scaling
- Confirms outward/inward polarity detection
- Ensures no regression in crisis detection

---

## Ratio Validation

**Golden Standard Ratio (2018 : 2025):**
```
Magnitude Ratio: 5.0 / 2.3 ≈ 2.2
Expected Range: 1.8 to 2.5 (crisis is 1.8-2.5× more intense)

Directional Delta: -5.0 → +3.0 = 8 units swing
Expected Range: 6 to 9 units (opposite polarities)

Volatility Ratio: 2.4 / 1.1 ≈ 2.2
Expected Range: 1.8 to 2.5 (crisis has 1.8-2.5× more variability)
```

**Validation:**
```javascript
const crisis = await getSeismographFor('2018-10-10');
const today = await getSeismographFor('2025-10-31');

const magRatio = crisis.magnitude / today.magnitude;
assert(magRatio > 1.8 && magRatio < 2.5,
  `Magnitude ratio ${magRatio} outside expected 1.8-2.5`);

const biasDelta = Math.abs(crisis.directional_bias - today.directional_bias);
assert(biasDelta > 6 && biasDelta < 9,
  `Directional delta ${biasDelta} outside expected 6-9`);

const volRatio = crisis.volatility / today.volatility;
assert(volRatio > 1.8 && volRatio < 2.5,
  `Volatility ratio ${volRatio} outside expected 1.8-2.5`);
```

---

## Regression Protection

**Constant Definition** (in `/lib/balance/constants.js`):
```javascript
const GOLDEN_CASES = {
  '2018-10-10': {
    minMag: 4.5,           // Must reach at least 4.5
    biasBand: [-5.0, -4.0] // Must be between -5.0 and -4.0
  },
};
```

**CI Hook** (to be implemented):
```javascript
// In CI test runner or pre-commit hook:
if (DATE === '2018-10-10') {
  const result = calculateSeismograph(...);
  const { minMag, biasBand } = GOLDEN_CASES['2018-10-10'];

  if (result.magnitude < minMag) {
    throw new Error(
      `REGRESSION: 2018-10-10 magnitude ${result.magnitude} ` +
      `falls below golden standard minimum ${minMag}`
    );
  }

  if (result.directional_bias > biasBand[1]) {
    throw new Error(
      `REGRESSION: 2018-10-10 directional_bias ${result.directional_bias} ` +
      `exceeds golden standard maximum inward ${biasBand[1]}`
    );
  }
}
```

---

## Falsifiability Gates

| Condition | Result | Means |
|-----------|--------|-------|
| Oct 10 Mag < 4.5 | ❌ FAIL | Geometry amplification broken |
| Oct 10 Bias > -4.0 | ❌ FAIL | Hard aspect scoring broken |
| Oct 31 Mag > 4.0 | ❌ FAIL | System can't distinguish crisis |
| Oct 31 Bias < 0 | ⚠️ WARN | Polarity detection reversed |
| Ratio 2018:2025 < 1.5 | ❌ FAIL | Scale collapse (amplification broken) |
| Ratio 2018:2025 > 3.0 | ⚠️ WARN | Over-amplification (may flag routine as crisis) |

---

## Test Data Preparation

**To run these tests locally:**

1. **Set RAPIDAPI_KEY** in environment:
   ```bash
   export RAPIDAPI_KEY="your-key-here"
   ```

2. **Start dev server:**
   ```bash
   npm run dev
   ```

3. **Run Oct 10, 2018 test:**
   ```bash
   curl -X POST http://localhost:3001/api/astrology-mathbrain \
     -H "Content-Type: application/json" \
     -d '{ ... [date: 2018-10-10] ... }' | jq '.person_a.derived.seismograph_summary'
   ```

4. **Expected output:**
   ```json
   {
     "magnitude": 5.0,
     "directional_bias": -5.0,
     "volatility": 2.4
   }
   ```

5. **If results differ:**
   - Check geometry amplification factors (constants.js)
   - Verify orb clamping (8/7/5 rule applied)
   - Confirm aspect scoring (weight calculations)
   - Check normalization divisors (currently /10 for bias)

---

## Implementation Status

- ✅ Architecture: Single-source-of-truth (seismograph canonical)
- ✅ Pipeline: Geometry → Sum → Normalize → Scale → Clamp
- ✅ Constants: Golden standard anchors defined
- ✅ Falsifiability: Clamp flags tracked
- ⏳ Integration: CI assertion hook (ready to implement)
- ⏳ Documentation: Test results (awaiting real API data)

---

## Success Criteria (For Final Validation)

**When RAPIDAPI_KEY is configured:**

1. Run both test dates through real API
2. Oct 10, 2018 returns: Magnitude 5.0, Directional Bias -5.0
3. Oct 31, 2025 returns: Magnitude 2-3, Directional Bias +2 to +4
4. Ratio validation passes (2.0-2.5× difference)
5. Clamp flags correct (Oct 10 both clamped, Oct 31 none)
6. CI golden standard assertion enabled
7. All tests pass ✅

**The math is then proven honest:** Crisis events hit peak magnitude, routine events land proportionally, and the system can be falsified by real-world data.

---

**Created:** October 31, 2025
**Status:** Ready for integration
**Next:** Configure RAPIDAPI_KEY and run CI validation
