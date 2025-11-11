# API Timezone Format Fix - November 10, 2025

## Issue Summary

**Problem:** API requests failing with 503 error "Astrologer API is temporarily unavailable" when using deprecated US/* timezone format.

**Date:** November 10, 2025
**Status:** ✅ Fixed
**Severity:** High (Production API calls failing)

---

## Root Cause Analysis

### Request Payload (from HAR log)

The failing API request contained:

```json
{
  "personA": {
    "name": "Dan",
    "timezone": "US/Eastern",  // ❌ Deprecated format
    ...
  },
  "translocation": {
    "timezone": "US/Central",  // ❌ Deprecated format
    ...
  }
}
```

### Why It Failed

1. **Frontend sends deprecated timezone formats** like `"US/Eastern"` and `"US/Central"`
2. **Backend timezone normalizer** (`src/math-brain/utils/time-and-coords.js`) only handled:
   - Abbreviations: `EST`, `CST`, `PST`, `MST`
   - Full names: `EASTERN`, `CENTRAL`, `PACIFIC`, `MOUNTAIN`
   - **But NOT** the deprecated `US/*` format
3. **Upstream API** (RapidAPI Astrologer) requires strict IANA timezone format
4. **Unmapped timezone** passed through as-is → upstream API rejected → 503 error

### Error Flow

```
Frontend (US/Eastern)
  ↓
API Handler (timezone unchanged)
  ↓
normalizeTimezone() [no mapping found]
  ↓
Intl.DateTimeFormat validation [throws]
  ↓
Falls back to 'UTC' (incorrect timezone)
  ↓
Upstream API receives wrong timezone
  ↓
API call fails or returns incorrect data
  ↓
503 Error to user
```

---

## Solution Implemented

### Code Change

**File:** `src/math-brain/utils/time-and-coords.js`

**Before:**
```javascript
const timezoneMap = {
  'EASTERN': 'America/New_York',
  'EST': 'America/New_York',
  'EDT': 'America/New_York',
  'CENTRAL': 'America/Chicago',
  // ... other mappings
};
```

**After:**
```javascript
const timezoneMap = {
  // Deprecated US/* format (common in legacy systems)
  'US/EASTERN': 'America/New_York',
  'US/CENTRAL': 'America/Chicago',
  'US/MOUNTAIN': 'America/Denver',
  'US/PACIFIC': 'America/Los_Angeles',
  // Common timezone names
  'EASTERN': 'America/New_York',
  'EST': 'America/New_York',
  'EDT': 'America/New_York',
  'CENTRAL': 'America/Chicago',
  // ... other mappings
};
```

### How It Works

1. **Frontend sends** `"timezone": "US/Eastern"`
2. **normalizeTimezone()** receives the string
3. **Converts to uppercase:** `"US/EASTERN"`
4. **Looks up in map:** Finds `'US/EASTERN': 'America/New_York'`
5. **Returns IANA format:** `"America/New_York"`
6. **Upstream API** receives correct timezone → success! ✅

---

## Testing

### Manual Verification

```bash
node -e "
const { normalizeTimezone } = require('./src/math-brain/utils/time-and-coords.js');
console.log('US/Eastern ->', normalizeTimezone('US/Eastern'));
console.log('US/Central ->', normalizeTimezone('US/Central'));
console.log('US/Pacific ->', normalizeTimezone('US/Pacific'));
console.log('US/Mountain ->', normalizeTimezone('US/Mountain'));
"
```

**Output:**
```
US/Eastern -> America/New_York
US/Central -> America/Chicago
US/Pacific -> America/Los_Angeles
US/Mountain -> America/Denver
```

### Automated Tests

All existing tests pass:
```bash
npm test
# ✅ PASS: Should return 405 for non-POST requests
# ✅ PASS: Should return 400 if Person A is invalid
# ✅ PASS: Should handle natal chart mode
# ... (all tests passing)
```

---

## Impact Assessment

### Before Fix
- ❌ API requests with US/* timezone format fail with 503 error
- ❌ Users cannot generate reports for certain locations
- ❌ Deploy previews showing errors
- ❌ Potential data loss (incorrect timezone = wrong chart calculations)

### After Fix
- ✅ API requests with US/* timezone format succeed
- ✅ Backward compatible with all existing timezone formats
- ✅ No breaking changes
- ✅ Improved robustness and user experience

### Supported Timezone Formats (After Fix)

| Format | Example Input | Normalized Output | Notes |
|--------|---------------|-------------------|-------|
| IANA | `America/New_York` | `America/New_York` | Preferred format |
| US/* (deprecated) | `US/Eastern` | `America/New_York` | **NOW SUPPORTED** ✅ |
| Full name | `EASTERN` | `America/New_York` | Already supported |
| Abbreviation | `EST` / `EDT` | `America/New_York` | Already supported |
| Invalid | `XYZ/Invalid` | `UTC` | Fallback behavior |

---

## Related Documentation

This fix is documented in:
- **[API_MASTER_REFERENCE.md](./API_MASTER_REFERENCE.md)** - Section: "Timezone Handling"
- **[API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md)** - Section: "Timezone Handling"

---

## Recommendations

### Short Term (Immediate)
1. ✅ **DONE:** Update timezone normalizer to handle US/* format
2. ✅ **DONE:** Test and verify fix works
3. **TODO:** Monitor production logs for any remaining timezone-related errors

### Medium Term (Next Sprint)
1. **Frontend Update:** Modify `useGeolocation.ts` to always return IANA format
   - Already uses `Intl.DateTimeFormat().resolvedOptions().timeZone` which returns IANA
   - Verify no hardcoded US/* strings in frontend forms
2. **Add Validation:** Add explicit timezone validation at API boundary
   - Return clear error message if timezone is invalid
   - Suggest correct format to user
3. **Update Tests:** Add explicit test cases for US/* timezone format

### Long Term (Future)
1. **Deprecation Notice:** Add warning log when US/* format is detected
   - Example: `logger.warn('Deprecated timezone format detected: US/Eastern. Please use America/New_York instead.')`
2. **Migration Plan:** Gradually phase out US/* format support
   - Add user-facing message encouraging IANA format
   - Update documentation and examples
3. **Timezone Picker:** Implement timezone dropdown with IANA format only

---

## Code Review Checklist

- [x] Fix addresses root cause
- [x] Backward compatible (no breaking changes)
- [x] All existing tests pass
- [x] No new dependencies added
- [x] Minimal code changes (surgical fix)
- [x] Documentation updated
- [x] Error messages remain clear

---

## Deployment Notes

### For Netlify Deploy Previews
- Fix is in branch: `copilot/create-master-reference-document`
- Merge to main will auto-deploy to production
- No environment variable changes needed
- No migration scripts required

### For Local Development
```bash
git pull origin copilot/create-master-reference-document
npm install  # (if needed)
npm run dev
```

---

## Additional Context

### Why US/* Format Exists

The `US/*` timezone format is a legacy convention from older systems and some libraries that predates the modern IANA timezone database. Examples:
- Older PHP applications
- Legacy Java applications
- Some timezone picker libraries
- User-entered strings

### Why We Can't Just Remove It

- **User Experience:** Users may manually type or paste `US/Eastern` from other sources
- **Legacy Data:** Existing saved reports may contain US/* format
- **Third-party Integrations:** External systems may send US/* format
- **Browser Compatibility:** Some older browsers may use this format

### Best Practice Going Forward

Always use IANA timezone format in new code:
```javascript
// ❌ Don't use
const timezone = 'US/Eastern';

// ✅ Do use
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// Returns: 'America/New_York'
```

---

## Contact

**Issue Reported By:** User via Bird Eats Bug HAR log
**Fixed By:** GitHub Copilot
**Reviewed By:** (Pending)
**Date:** November 10, 2025

---

## Related Issues

- [ ] Check if any other deprecated timezone formats need support
- [ ] Audit frontend for hardcoded timezone strings
- [ ] Add E2E test for timezone edge cases
- [ ] Update user-facing documentation about timezone requirements

---

**Status:** ✅ Fix Complete - Ready for Review & Merge
