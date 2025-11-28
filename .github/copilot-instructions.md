# Copilot Instructions for WovenWebApp

## Project Overview

**Raven Calder / Woven Map** — An astrological analysis system that translates mathematical geometry into human-readable symbolic weather reports. Uses **FIELD → MAP → VOICE** translation protocol.

**Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Netlify Functions  
**Key APIs:** RapidAPI Astrologer (Kerykeion-powered), Auth0 SPA, Perplexity (Poetic Brain)

## Architecture: Two Brains, Loosely Coupled

### Math Brain (`/math-brain`)
- Geometry-first calculator producing quantitative reports (Balance Meter: Magnitude 0-5, Directional Bias -5 to +5)
- Entry point: `app/api/astrology-mathbrain/route.ts` → delegates to `src/math_brain/main.js`
- Seismograph calculations: `src/seismograph.js` (aspect scoring, volatility, weighted aggregation)
- No authentication required

### Poetic Brain (`/chat`)
- Narrative interpreter translating geometry into conversational language
- **Auth0-gated** — requires Google sign-in via `RequireAuth` component
- Handoff from Math Brain via `localStorage.mb.lastSession` or JSON export/import

### The Handoff Pattern
Math Brain → JSON export → Poetic Brain upload (or localStorage snapshot). This loose coupling is intentional — avoid tight integration between brains.

## Critical Patterns

### FIELD → MAP → VOICE Protocol
1. **FIELD** — Raw energetic climate (planetary geometry, orbs, houses)
2. **MAP** — Structural patterns (aspect scoring, echo loops, symbolic seismograph)
3. **VOICE** — Human-readable mirror (plain language, no astrological jargon)

### Frontstage vs Backstage Voice Rules
**Frontstage (user-facing):**
- ❌ Never expose planet names, signs, houses, aspects, degrees
- ✅ Conversational, agency-preserving language ("tends to," "often")
- ✅ Falsifiable, testable observations

**Backstage (operator/debug):**
- ✅ Full technical terms allowed
- ✅ Geometric calculations visible

### Balance Meter v5.0 (Two-Axis System)
```javascript
// Only two public axes - coherence/SFD retired in v5.0
magnitude: 0-5      // Energy intensity (scaleUnipolar)
directional_bias: -5 to +5  // Supportive vs Challenging (scaleBipolar)
```
See `lib/balance/scale-bridge.js` for canonical scalers.

## Key Files & Patterns

### API Route Pattern (`app/api/**/route.ts`)
```typescript
// Standard error response shape
{ success: false, error: string, code: string, hint?: string, detail?: string }
```

### Seismograph Aspect Scoring (`src/seismograph.js`)
- Aspects normalized via `normalizeAspect()` before scoring
- Hard aspects (square/opposition): negative valence, outer-planet amplification
- Soft aspects (trine/sextile): positive valence, retrograde moderation
- Rolling window normalization prevents saturation in multi-aspect scenarios

### Provenance (Required on All Reports)
Every report must include: `house_system`, `orbs_profile`, `relocation_mode`, `timezone_db_version`, `math_brain_version`, `engine_versions`

## Development Workflow

### Quick Start
```bash
npm install
cp .env.example .env  # Add RAPIDAPI_KEY (required), GEONAMES_USERNAME (optional)
npm run dev           # Next.js on :3000
# OR
netlify dev           # Full Netlify runtime on :8888 (needed for Auth0 callbacks)
```

### Testing
```bash
npm run test:vitest      # Unit tests (Vitest)
npm run test:e2e         # Playwright E2E
npm run test:smoke       # Critical path smoke tests
npm run lexicon:lint     # Voice/terminology compliance
npm run validate:fieldmap # Schema validation
```

### Environment Variables
```env
RAPIDAPI_KEY=required      # Astrologer API
MB_MOCK=true               # Use mock data in dev (set false for real API)
GEONAMES_USERNAME=optional # Stabilizes city resolution
AUTH0_DOMAIN=no-protocol   # e.g., tenant.us.auth0.com (no https://)
AUTH0_CLIENT_ID=required   # For Auth0 SPA flow
```

## Common Pitfalls & Fixes

### "drivers[] empty" in Balance Meter
1. Check `provenanceByDate.formation` — coords-only vs city-mode mismatch
2. Ensure GEONAMES_USERNAME is valid if using city-mode
3. Try toggling formation (coords ↔ city) as fallback

### Auth0 Callback Failures
- AUTH0_DOMAIN must NOT include `https://`
- Callback URLs must include `/math-brain` path
- Google connection must be enabled for the specific Auth0 application

### Balance Meter Showing Zeros
- Usually orb dropout — aspects filtered before scoring
- Check that `Math.abs(orb)` is used for applying aspect detection
- Verify rolling context is passed for dynamic normalization

## Documentation Hierarchy

When conflicts arise between docs:
1. `Developers Notes/Core/Four Report Types_Integrated 10.1.25.md` — **PRIMARY** (always wins)
2. Implementation specs in `Developers Notes/Implementation/`
3. Other docs — context only

## Privacy Constraint

Never hardcode personal names ("Dan", "Stephie") in runtime code. Use request payload values or anonymized placeholders. See `Developers Notes/Poetic Brain/PRIVACY_CONSTRAINT_DAN_STEPHIE.md`.

## Related Documentation

- **Architecture:** `README.md`, `WOVEN_MAP_V6_COMPLETE_ARCHITECTURE.md`
- **API Reference:** `Developers Notes/API/API_REFERENCE.md`
- **Voice Guidelines:** `docs/CLEAR_MIRROR_VOICE.md`, `Developers Notes/Poetic Brain/RAVEN-PERSONA-SPEC.md`
- **Emergency Recovery:** `Developers Notes/Lessons Learned/copilot_fix_recovery.md`
