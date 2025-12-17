# Code Map: Poetic Brain

> Last updated: December 2025

## 1. High-Level Architecture

The Poetic Brain is a **"Two-Brain" system** designed to bridge deterministic astrology (Math Brain) with generative narrative (Raven Calder). It operates on a **FIELD → MAP → VOICE** protocol.

```
User Input → Raven Orchestrator → Intent Detection
                    ↓
            [Geometry/Report Intent]
                    ↓
               Math Brain → Geometry JSON
                    ↓
              Poetic Brain → Mandates → Narrative Sections
                    ↓
               LLM (Perplexity/Sonar) → Streamed Voice Response
```

### Protocol: FIELD → MAP → VOICE

| Stage | Description |
|-------|-------------|
| **FIELD** | Raw energetic climate (planetary geometry, orbs, houses) |
| **MAP** | Structural patterns (aspect scoring, mandates, symbolic seismograph) |
| **VOICE** | Human-readable mirror (no astrological jargon, conversational) |

---

## 2. Component Breakdown

### A. Orchestrator (Raven)

| Property | Value |
|----------|-------|
| **Location** | `app/api/raven/route.ts` |
| **Role** | Central Nervous System — handles requests, session state, intent detection |
| **Lines** | ~1,267 |

**Key Functions:**
- `POST` — Main route handler
- `deriveAutoExecutionPlan` — Determines if a report needs to be generated
- `processMirrorDirective` — Calls Poetic Brain to generate narrative sections
- Auth verification before LLM calls

### B. Poetic Brain (Narrative Engine)

| Property | Value |
|----------|-------|
| **Location** | `poetic-brain/src/index.ts` |
| **Role** | High-level narrative structurer |

**Key Functions:**
- `processMirrorDirective` — Main entry point
- `generateSoloMirror` — Narrative for a single person
- `generateRelationalEngine` — Narrative for relationships (synastry)
- `generateWeatherOverlay` — Transit/weather context

### C. Poetics Lib (Core Logic)

| Property | Value |
|----------|-------|
| **Location** | `lib/poetics/` |
| **Role** | Low-level engine translating astrological symbols into Mandates |

**Key Files:**

| File | Purpose |
|------|---------|
| `index.ts` | Module exports |
| `mandate.ts` | Converts aspects → Mandate objects |
| `narrative-builder.ts` | Assembles mandates into full text |
| `types.ts` | Core interfaces (`MandateAspect`, `ChartMandates`) |
| `parser.ts` | Parses geometry data |
| `prompt-builder.ts` | Builds LLM prompts |
| `card-generator.ts` | Generates summary cards |

### D. Math Brain (Geometry Provider)

| Property | Value |
|----------|-------|
| **Location** | `lib/mathbrain/adapter.ts` |
| **Role** | Calculates raw astrological data (positions, aspects, transits) |

**Key Interaction:** Raven calls Math Brain to get geometry JSON, which is passed to Poetic Brain.

### E. Auth Layer

| Property | Value |
|----------|-------|
| **Token Refresh** | `hooks/useAuth.ts` |
| **JWT Verification** | `lib/auth/jwt.ts` |
| **Login Provider** | `app/math-brain/AuthProvider.tsx` |
| **Route Protection** | `components/RequireAuth.tsx` |

---

## 3. Key Data Structures

### InputPayload (from `poetic-brain/src/index.ts`)

```typescript
{
  person_a: NatalChartData,
  person_b?: NatalChartData,
  mirror_contract: { scope, intimacy },
  geometry: CalculatedAspects
}
```

### MandateAspect (from `lib/poetics/types.ts`)

```typescript
{
  geometry: string,       // e.g., "Sun Square Mars"
  fieldPressure: string,  // FIELD: energetic feeling
  mapTranslation: string, // MAP: astrological source
  voiceHook: string       // VOICE: poetic articulation
}
```

---

## 4. Directory Structure

```
/
├── app/
│   ├── api/
│   │   ├── raven/route.ts           # Orchestrator (1267 lines)
│   │   ├── auth-config/route.ts     # Auth0 config endpoint
│   │   └── poetic-brain/route.ts    # Legacy endpoint
│   ├── math-brain/
│   │   ├── page.tsx                 # Main Math Brain UI
│   │   └── AuthProvider.tsx         # Auth0 login provider
│   └── chat/page.tsx                # Poetic Brain chat UI
│
├── poetic-brain/
│   ├── src/
│   │   └── index.ts                 # Poetic Brain Main Entry
│   ├── api/                         # API helpers
│   ├── test/                        # Test files
│   └── ravencalder-persona-excerpt.txt  # Persona reference
│
├── lib/
│   ├── poetics/                     # Core Translation Logic
│   │   ├── index.ts
│   │   ├── mandate.ts
│   │   ├── narrative-builder.ts
│   │   ├── types.ts
│   │   ├── parser.ts
│   │   ├── prompt-builder.ts
│   │   └── card-generator.ts
│   ├── mathbrain/
│   │   └── adapter.ts               # Math Brain Adapter
│   ├── auth/
│   │   └── jwt.ts                   # JWT verification (RS256)
│   └── raven-formatting.ts          # Error message formatting
│
├── hooks/
│   ├── useRavenRequest.ts           # Client-side Raven requests
│   └── useAuth.ts                   # Token refresh hook
│
├── components/
│   ├── RequireAuth.tsx              # Route protection wrapper
│   └── HomeHero.tsx                 # Landing page with auth
│
└── scripts/
    └── debug-poetic-handoff.js      # Debug script for testing
```

---

## 5. Request Flow

```
1. User sends message in /chat
        ↓
2. useRavenRequest.ts
   - Calls getAccessTokenAsync() for fresh token
   - POSTs to /api/raven with Bearer token
        ↓
3. app/api/raven/route.ts
   - Detects intent (geometry, report, conversation)
   - If geometry/report: calls Math Brain
   - Verifies JWT token
   - Calls processMirrorDirective()
        ↓
4. poetic-brain/src/index.ts
   - Generates narrative sections
   - Returns structured content
        ↓
5. Raven streams response via LLM (Perplexity)
        ↓
6. User sees Raven's voice response
```

---

## 6. Auth Flow

```
Login:
  HomeHero/AuthProvider → Auth0 loginWithRedirect()
        ↓
  Auth0 callback → handleRedirectCallback()
        ↓
  Token stored in localStorage ('auth.token')

API Request:
  useRavenRequest → getAccessTokenAsync()
        ↓
  getTokenSilently() → Refreshes if expired
        ↓
  Bearer token in Authorization header
        ↓
  jwt.ts verifyToken() → Validates signature, audience, issuer
```

---

## 7. Critical Configuration

### Auth0 Client Settings (ALL components must use these)

```javascript
{
  domain: normalizeAuth0Domain(config.domain),
  clientId: normalizeAuth0ClientId(config.clientId),
  cacheLocation: 'localstorage',
  useRefreshTokens: true,
  useRefreshTokensFallback: true,
  authorizationParams: {
    redirect_uri: getRedirectUri(),
    audience: normalizeAuth0Audience(config.audience),
  }
}
```

### Environment Variables

```env
AUTH0_DOMAIN=tenant.us.auth0.com    # No https://
AUTH0_CLIENT_ID=xxxxx
AUTH0_AUDIENCE=https://ravencalder-api
```

---

## 8. Related Documentation

- **Architecture:** `README.md`, `WOVEN_MAP_V6_COMPLETE_ARCHITECTURE.md`
- **API Reference:** `Developers Notes/API/API_REFERENCE.md`
- **Voice Guidelines:** `docs/CLEAR_MIRROR_VOICE.md`
- **Auth Fix History:** `Developers Notes/Lessons Learned/poetic_brain_auth_fix_dec2025.md`
