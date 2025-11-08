# WovenWebApp: Architecture Overview & Component Map

**Date:** November 8, 2025  
**Purpose:** Visual understanding of system structure and dependencies

---

## 🗺️ System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                               │
│  (Browser) → (Form Input) → (Validation) → (Report Display)       │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                                  │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ index.html + Vanilla JavaScript                             │ │
│  │ ├─ Form validation (birth data, transit dates)              │ │
│  │ ├─ Responsive UI (Tailwind CSS, dark theme)                │ │
│  │ ├─ Real-time feedback                                       │ │
│  │ └─ Report rendering & download                             │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ↓ (JSON POST)
┌────────────────────────────────────────────────────────────────────┐
│                   NETLIFY FUNCTIONS (Backend)                      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ 📊 astrology-mathbrain.js (Core Engine)                     │ │
│  │ ├─ Validates input                                           │ │
│  │ ├─ Calls RapidAPI Astrologer                                │ │
│  │ ├─ Calculates chart geometry                                │ │
│  │ ├─ Maps transit-to-natal aspects                            │ │
│  │ ├─ Scores magnitude/valence/volatility                      │ │
│  │ └─ Returns structured response (wm-json-appendix)           │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                              │                                     │
│                              ↓ (Call)                              │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ 🎭 poetic-brain.js (Voice Generation)                       │ │
│  │ ├─ Receives chart + transit data                            │ │
│  │ ├─ Applies polarity card system                             │ │
│  │ ├─ Generates narrative (LLM-powered)                        │ │
│  │ ├─ Enforces E-Prime discipline                              │ │
│  │ ├─ Applies Safe Lexicon filtering                           │ │
│  │ ├─ Maintains falsifiability (SST framework)                 │ │
│  │ └─ Returns Voice: Mirror + Symbolic Weather                 │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                              │                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ 📋 Support Functions                                         │ │
│  │ ├─ auth-config.js (Auth0 integration)                        │ │
│  │ ├─ logger.js (Structured logging)                           │ │
│  │ ├─ astrology-health.js (Health checks)                      │ │
│  │ └─ Error handling + validation                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ↓ (Validation + Signing)
┌────────────────────────────────────────────────────────────────────┐
│                    DATA LAYER (Schemas)                            │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ wmchart-schema.ts (Core Data Contract)                      │ │
│  │ ├─ Chart geometry definition                                │ │
│  │ ├─ Aspects, houses, placements                              │ │
│  │ ├─ Transit mapping structures                               │ │
│  │ └─ Zod validation enforced                                  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ wm-json-appendix.ts (Response Shape)                        │ │
│  │ ├─ Chart data                                               │ │
│  │ ├─ Transit data                                             │ │
│  │ ├─ Voice output (Mirror + Symbolic Weather)                 │ │
│  │ ├─ Appendix (timing, methodology)                           │ │
│  │ └─ Provenance tracking (future)                             │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│                  EXTERNAL INTEGRATIONS                             │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ RapidAPI Astrologer (Kerykeion-powered)                    │ │
│  │ ├─ Provides natal chart calculations                        │ │
│  │ ├─ Calculates transits                                      │ │
│  │ └─ Returns planetary positions + aspects                    │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Auth0 (Authentication)                                      │ │
│  │ └─ User identification & authorization                       │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Component Hierarchy

```
WovenWebApp
│
├── 📄 Frontend
│   └── index.html
│       ├── Form Input Layer
│       ├── Validation Layer  
│       ├── API Communication
│       └── Report Rendering
│
├── 🖥️  Backend (netlify/functions/)
│   ├── astrology-mathbrain.js
│   │   ├── Input validation (Zod)
│   │   ├── API call orchestration
│   │   ├── Geometry calculations
│   │   ├── Aspect mapping
│   │   └── Response formation
│   │
│   ├── poetic-brain.js
│   │   ├── Chart data parsing
│   │   ├── Polarity card extraction
│   │   ├── LLM prompt construction
│   │   ├── Voice generation
│   │   ├── E-Prime enforcement
│   │   ├── Lexicon filtering
│   │   └── SST application
│   │
│   └── Support
│       ├── auth-config.js
│       ├── logger.js
│       ├── astrology-health.js
│       └── error-handlers
│
├── 📊 Data Layer (src/)
│   ├── wmchart-schema.ts
│   │   ├── Chart type definitions
│   │   ├── Aspect structures
│   │   ├── House placements
│   │   └── Zod validators
│   │
│   └── wm-json-appendix.ts
│       ├── Full response shape
│       ├── Appendix sections
│       ├── Provenance fields
│       └── Metadata
│
├── ✅ Quality Assurance (tests/ + scripts/)
│   ├── Linting
│   │   └── raven-lexicon-lint.js
│   │       ├── E-Prime violations
│   │       ├── Forbidden patterns (8 categories)
│   │       └── Safe lexicon checks
│   │
│   ├── Testing
│   │   ├── Compliance Tests (poetic-brain.raven-compliance.spec.ts)
│   │   ├── Temporal Tests (poetic-brain.temporal-integrity.spec.ts)
│   │   ├── Unit Tests (vitest)
│   │   ├── Integration Tests (jest)
│   │   ├── E2E Tests (playwright)
│   │   └── Smoke Tests (health checks)
│   │
│   └── Auditing
│       └── raven-resonance-audit.js
│           ├── 10% sampling
│           ├── 9-criterion evaluation
│           ├── Red flag detection
│           └── Scoring system
│
└── 📚 Documentation (docs/ + root *.md)
    ├── Operational
    │   ├── README.md
    │   ├── MAINTENANCE_GUIDE.md
    │   ├── API_INTEGRATION_GUIDE.md
    │   └── QUICK_START_RAVEN_PROTOCOL.md
    │
    ├── Voice & Principles
    │   ├── RAVEN_CALDER_VOICE.md
    │   ├── BLUEPRINT_VS_WEATHER_FIREWALL.md
    │   ├── SST_POST_VALIDATION_FRAMEWORK.md
    │   └── RAVEN_RESONANCE_AUDIT_GUIDE.md
    │
    ├── Technical
    │   ├── Architecture.md
    │   ├── MATH_BRAIN_COMPLIANCE.md
    │   └── copilot-instructions.md
    │
    └── Reference
        ├── CHANGELOG.md
        ├── Lessons Learned for Developer.md
        └── 30+ specialized guides
```

---

## 🔄 Data Flow: Single Request

```
1. USER INPUT
   ├─ Birth data (date, time, location)
   ├─ Natal chart birth time
   └─ Transit dates (start, end)
                ↓
2. FRONTEND VALIDATION
   ├─ Date range check
   ├─ Coordinate validation
   ├─ Time format check
   └─ Real-time feedback to user
                ↓
3. API REQUEST (POST /.netlify/functions/astrology-mathbrain)
   └─ {
       birthData: { date, time, location },
       transitDates: { start, end },
       ...
     }
                ↓
4. BACKEND: ASTROLOGY-MATHBRAIN
   ├─ Parse & validate input (Zod)
   ├─ Extract coordinates from location
   ├─ Call RapidAPI/Astrologer
   │  ├─ Request natal chart
   │  ├─ Request transit chart
   │  └─ Receive planetary positions + aspects
   │
   ├─ Calculate transit-to-natal aspects
   ├─ Map aspects to polarity cards
   ├─ Score magnitude/valence/volatility
   │
   ├─ Structure response (wm-json-appendix)
   └─ Pass to poetic-brain.js
                ↓
5. BACKEND: POETIC-BRAIN
   ├─ Receive chart data
   ├─ Extract top polarity cards (Hook Stack)
   ├─ Build LLM prompt
   │  ├─ Chart geometry
   │  ├─ Symbolic meaning
   │  ├─ Polarity card descriptions
   │  └─ E-Prime constraint
   │
   ├─ Call LLM (poetic narrative generation)
   ├─ Parse & validate output
   ├─ Apply lexicon filters (Safe Lexicon)
   ├─ Enforce E-Prime discipline
   ├─ Apply SST framework (conditional phrasing for speculative)
   │
   └─ Return Voice output (Mirror + Symbolic Weather)
                ↓
6. RESPONSE FORMATION
   └─ {
       success: true,
       data: {
         chart: {...},
         transits: {...},
         voice: {
           mirror: "...",
           symbolic_weather: "..."
         },
         appendix: {...}
       }
     }
                ↓
7. VALIDATION & SIGNING
   ├─ Validate against wm-json-appendix schema
   ├─ Sign response
   └─ Return to frontend
                ↓
8. FRONTEND RENDERING
   ├─ Parse response
   ├─ Display report
   ├─ Format sections (Mirror, Symbolic Weather)
   ├─ Render timestamps, methodology
   └─ Offer download option
                ↓
9. USER SEES REPORT
   └─ Personalized astrological narrative
```

---

## 🧪 Quality Enforcement Layers

```
┌─────────────────────────────────────────────────────────────┐
│                   DEVELOPMENT PHASE                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Input Code/Docs → Linter Check (npm run raven:lint)      │
│                      │                                      │
│                      ├─ E-Prime violations? FAIL            │
│                      ├─ Forbidden patterns? FAIL            │
│                      ├─ Safe lexicon? CHECK                │
│                      └─ ✅ PASS → Continue                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    TEST PHASE                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Unit Tests (Vitest)                                        │
│  ├─ Component logic validation                              │
│  └─ ✅ Passing                                             │
│                                                              │
│  Integration Tests (Jest)                                   │
│  ├─ Multi-function workflows                                │
│  └─ ✅ Passing                                             │
│                                                              │
│  Compliance Tests (Playwright)                              │
│  ├─ E-Prime maintained?                                     │
│  ├─ Polarity cards extracted?                               │
│  ├─ Safe lexicon applied?                                   │
│  ├─ Terminology correct?                                    │
│  ├─ Agency hygiene preserved?                               │
│  ├─ Forbidden patterns absent?                              │
│  ├─ Relational scaffold present?                            │
│  └─ ✅ 8/8 tests passing                                   │
│                                                              │
│  Temporal Integrity Tests (Playwright)                      │
│  ├─ Temporal metadata consistent?                           │
│  ├─ Context pronouns appropriate?                           │
│  ├─ Rhythm balance maintained?                              │
│  ├─ Symbolic weather only with transits?                    │
│  ├─ Poetic cadence natural?                                 │
│  ├─ Abstractions grounded?                                  │
│  └─ ✅ 6/6 tests passing                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   DEPLOYMENT PHASE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Smoke Tests (Health Checks)                                │
│  ├─ API responding?                                         │
│  ├─ Database connected?                                     │
│  ├─ Auth0 config valid?                                     │
│  ├─ Environment variables set?                              │
│  └─ ✅ Health checks pass                                  │
│                                                              │
│  Deployment Verification                                    │
│  ├─ Secrets not committed?                                  │
│  ├─ Build artifacts clean?                                  │
│  ├─ Dependencies installed?                                 │
│  └─ ✅ Verified                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                  PRODUCTION PHASE                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Human-in-the-Loop Audit (Quarterly or after changes)      │
│  ├─ Sample 10% of recent outputs                            │
│  ├─ Evaluate against 9 criteria:                            │
│  │  1. Voice Identity (pattern witness, not oracle)         │
│  │  2. Poetic Vitality (alive despite E-Prime)              │
│  │  3. Geometric Grounding (metaphors leashed to math)      │
│  │  4. Blueprint vs. Weather (semantic boundary clear)      │
│  │  5. Conditional Naturalness (may/might/could natural)    │
│  │  6. Rhythm & Cadence (varied, not robotic)               │
│  │  7. Somatic Resonance (FIELD lands in body)              │
│  │  8. Falsifiability (reader can test claims, SST correct) │
│  │  9. Agency Safety (opens possibilities, doesn't close)   │
│  │                                                           │
│  ├─ Mark ✅ / ⚠️ / ❌ for each                             │
│  ├─ Flag if 2+ ❌ marks → Investigate                      │
│  └─ Document results in audit log                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Dependency Graph (High Level)

```
Frontend (index.html)
├─ Fetch API
└─ JSON processing

Netlify Functions
├─ astrology-mathbrain.js
│  ├─ Zod (validation)
│  ├─ Node.js (runtime)
│  ├─ Environment vars
│  └─ RapidAPI (http)
│
└─ poetic-brain.js
   ├─ Node.js
   ├─ Environment vars
   ├─ LLM API (OpenAI or similar)
   ├─ Safe Lexicon (local)
   ├─ Polarity Cards (local)
   └─ E-Prime rules (local)

Data Layer
├─ TypeScript
├─ Zod
└─ JSON Schema

Testing Infrastructure
├─ Playwright (e2e)
├─ Vitest (unit)
├─ Jest (integration)
└─ Node.js test runners

CI/CD
├─ GitHub Actions
├─ Netlify deploy hooks
├─ Environment validation
└─ Smoke tests

Monitoring
├─ Netlify function logs
├─ Error tracking
├─ Performance metrics
└─ API usage monitoring
```

---

## 🎯 Key Architectural Decisions

### 1. Serverless Backend (Netlify Functions)
**Why:** Scales automatically, no server management, integrated deployment
**Trade-off:** Cold start latency, functions must be stateless

### 2. Polarity Card System
**Why:** Bridges planetary geometry to human meaning
**Trade-off:** Requires domain expertise to maintain

### 3. E-Prime Enforcement
**Why:** Prevents false certainty in language
**Trade-off:** Requires careful phrasing, sometimes feels constrained

### 4. SST (Symbolic Spectrum Table)
**Why:** Preserves falsifiability while allowing symbolic language
**Trade-off:** Complex framework, requires operator confirmation

### 5. Linter + Audit System
**Why:** Automates quality enforcement, prevents tone drift
**Trade-off:** Setup complexity, but pays off at scale

### 6. TypeScript + Zod
**Why:** Type safety, runtime validation, catching errors early
**Trade-off:** Additional build step, steeper learning curve

---

## 🔮 Future Architecture (Safe Steps)

```
Current State:
├─ Natal charts ✅
├─ Transit analysis ✅
├─ Narrative voice ✅
└─ Quality enforcement ✅

Priority 1: Dual Provenance Tracking
├─ Add appendix.provenance_a (natal reading)
├─ Add appendix.provenance_b (transit reading)
└─ Track dual-source origin

Priority 2: Real Synastry/Composite Math
├─ Implement relational aspect calculations
├─ Replace placeholder in relationalAdapter.ts
└─ Calculate composite midpoints

Priority 3: Dialogue Voice (Dual Perspective)
├─ Extend formatter for relational sections
├─ Generate perspective from second chart
└─ Create dialogue between chart perspectives

Priority 4: Stricter Zod Validation
├─ Enhance relational_context schema
├─ Require specific fields
└─ Fail fast on invalid input
```

---

## Summary

**WovenWebApp is a cohesive, multi-layer system where:**
- Frontend gathers input with validation
- Backend performs complex calculations + generation
- Data layer enforces contracts with Zod
- Quality layer prevents tone drift (linter + tests + audit)
- Documentation layer preserves intent + best practices

**The system is designed for:**
- Falsifiability (reader can test claims)
- Epistemological honesty (no pseudo-certainty)
- Maintainability (clear architecture, comprehensive docs)
- Extensibility (Safe Steps preserve compatibility)
- Resilience (multi-layer validation + error handling)

**Total complexity: Moderate codebase, high sophistication.**
