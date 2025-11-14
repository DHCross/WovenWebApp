# Composite Transits Blocker — Investigation Log (Nov 12, 2025)

**Summary:** Composite transits remain disabled because the upstream RapidAPI transit endpoint rejects the payload generated from a midpoint composite chart. The composite object lacks natal birth data (year/month/day + location) required by the API. Our fallback currently short-circuits with an empty result, so the UI never receives composite transit geometry.

---

## What We Found

- `lib/server/astrology-mathbrain.js` lines 3446-3512 explicitly short-circuit composite transit generation with the note *"Composite transits temporarily disabled due to API compatibility issues"*. When `modeToken === 'COMPOSITE_TRANSITS'`, we try to compute them anyway, but the upstream call returns no aspects.
- The helper `computeCompositeTransits()` ( `src/math-brain/api-client.js` lines 507-590 ) builds a payload via `subjectToAPI(compositeRaw, pass)`. Midpoint composite charts only contain planetary positions and derived angles—no birth date, time, or city—so the resulting payload is missing the required natal fields.
- The transit endpoint (`API_ENDPOINTS.TRANSIT_ASPECTS`) expects a natal chart subject (birth data + timezone). Without that payload, it returns `{ aspects: [] }` and we silently store an empty `transitsByDate` map.
- Because the guard at the end of the block sets `result.composite.transitsByDate = {}` and a note, all composite reports shipped to the UI are effectively "natal-only" with no symbolic weather overlay.

---

## Why This Blocks Us

1. **API contract mismatch:** Midpoint composites are synthetic charts created from two natal charts; the RapidAPI endpoint does not natively accept them.
2. **No birth coordinates:** `subjectToAPI` requires (year, month, day, hour, minute, city/nation or lat/lon). The composite payload lacks those fields, so even if we pass it through, the request is malformed.
3. **Missing docs:** We have no documentation pointing to an alternative composite-transit endpoint, nor guidance on how to derive synthetic birth data that would satisfy the API.

---

## Recommended Next Actions

1. **Confirm Upstream Capability**
   - Contact the ephemeris provider (RapidAPI Astrologer) to confirm whether midpoint composite transits are supported.
   - If unavailable, determine whether a 3rd-party library (e.g., Swiss Ephemeris) is needed for local computation.

2. **Design Synthetic Payload (if API can support it)**
   - Construct a fake subject using the composite chart’s derived ecliptic longitude for planets and houses.
   - Supply a neutral reference location (e.g., Greenwich) with zero timezone drift.
   - Validate whether the API accepts such payloads without birth metadata.

3. **Fallback Strategy**
   - If the API cannot support composite transits, document the limitation in the product and suppress the UI toggle until a local ephemeris is implemented.
   - Update Poetic Brain and frontend copy to explain why composite symbolic weather is unavailable.

4. **Track as GitHub Issue**
   - Create a ticket labeled `math-brain`, `composite-transits`, `api-blocker` with the above findings.
   - Attach log excerpts from `computeCompositeTransits()` showing empty aspect arrays.

---

**Status:** Blocked — awaiting upstream confirmation or synthetic transit design.
