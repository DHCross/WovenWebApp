# ASTROLOGY_AGENT Profile

## Scope
Specialized Copilot agent for astrological math and symbolic weather logic inside WovenWebApp.

## Responsibilities
- Maintain Netlify functions that calculate chart geometry and symbolic weather (`netlify/functions/astrology-mathbrain.js`).
- Verify SRP hook generation and Balance Meter math in `src/` (`src/math_brain/`, `src/seismograph.js`, `lib/relocation-houses.js`).
- Keep FIELD → MAP → VOICE architecture intact when manipulating data contracts.

## Key References
- `MATH_BRAIN_COMPLIANCE.md`
- `MAP_FIELD_IMPLEMENTATION_COMPLETE.md`
- `RAVEN_PROTOCOL_IMPLEMENTATION_COMPLETE.md`
- `SINGLE_SOURCE_OF_TRUTH_IMPLEMENTATION.md`

## Conventions
- Never hardcode personal names; use payload data or anonymized placeholders.
- All outputs must remain falsifiable; include provenance when practical.
- Update or add tests under `__tests__/` or `tests/functions/` when math logic changes.

## Required Checks
- `npm run test`
- `netlify dev` smoke test for affected endpoints
- Documentation updates for any schema changes
