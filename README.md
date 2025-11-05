# WovenWebApp - Raven Calder Astrological Analysis System

**Status:** Production-ready  
**Last Updated:** October 12, 2025 (v5.0 Post-Refactor)  
**Deployment:** Netlify (Next.js 14)

---

## 🎯 What is Raven Calder?

Raven Calder is an astrological analysis system that translates mathematical precision into human-readable symbolic weather reports. It follows the **FIELD → MAP → VOICE** protocol to provide:

- **Mirror Reports** - Self-recognition through symbolic reflection
- **Balance Meter** - Quantitative pressure diagnostics (Magnitude + Directional Bias)
- **Poetic Codex** - Archetypal pattern recognition cards
- **Dream Analysis** - Symbolic interpretation framework

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- RapidAPI key for Astrologer API
- (Optional) GeoNames username for city lookups

### Installation

```bash
# Clone repository
git clone <repository-url>
cd WovenWebApp

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your RAPIDAPI_KEY to .env (SRP is enabled by default; set ENABLE_SRP=false to opt-out)

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Useful Scripts

```bash
# Development
npm run dev                  # Start development server
npm run build                # Build for production
npm run start                # Start production server

# Testing
npm run test                 # Run tests
npm run test:e2e            # Run end-to-end tests
npm run smoke:golden        # Run golden standard tests

# Maintenance
npm run branches:analyze    # Analyze and categorize all branches
npm run lexicon:lint        # Check voice compliance
npm run validate:fieldmap   # Validate field mappings

# Environment
npm run check-env           # Verify .env configuration
npm run auth:check          # Validate Auth0 configuration
```

---

## 📚 Documentation Navigation

### 🆕 New Developers - START HERE
1. **[Developers Notes/Core/Four Report Types_Integrated 10.1.25.md](Developers%20Notes/Core/Four%20Report%20Types_Integrated%2010.1.25.md)** ⭐ PRIMARY REFERENCE
2. **[Developers Notes/Lessons Learned/Lessons Learned for Developer.md](Developers%20Notes/Lessons%20Learned/Lessons%20Learned%20for%20Developer.md)** - Essential context
3. **[Developers Notes/README.md](Developers%20Notes/README.md)** - Complete developer index

### 🛠️ Implementation Guides
- **API Integration:** [Developers Notes/API/API_INTEGRATION_GUIDE.md](Developers%20Notes/API/API_INTEGRATION_GUIDE.md)
- **API Reference:** [Developers Notes/API/API_REFERENCE.md](Developers%20Notes/API/API_REFERENCE.md)
- **Math Brain:** [Developers Notes/Implementation/MATH_BRAIN_COMPLIANCE.md](Developers%20Notes/Implementation/MATH_BRAIN_COMPLIANCE.md)
- **Balance Meter v5.0:** [V5_IMPLEMENTATION_SUMMARY.md](V5_IMPLEMENTATION_SUMMARY.md)
- **Seismograph:** [Developers Notes/Implementation/SEISMOGRAPH_GUIDE.md](Developers%20Notes/Implementation/SEISMOGRAPH_GUIDE.md)

### 🎨 Voice & Content
- **Raven Persona:** [Developers Notes/Poetic Brain/RAVEN-PERSONA-SPEC.md](Developers%20Notes/Poetic%20Brain/RAVEN-PERSONA-SPEC.md)
- **Output Protocol:** [Developers Notes/Poetic Brain/RAVEN_OUTPUT_PROTOCOL.md](Developers%20Notes/Poetic%20Brain/RAVEN_OUTPUT_PROTOCOL.md)
- **Voice Guide:** [docs/CLEAR_MIRROR_VOICE.md](docs/CLEAR_MIRROR_VOICE.md)

### 🔧 Maintenance & Troubleshooting
- **Maintenance Guide:** [Developers Notes/Lessons Learned/MAINTENANCE_GUIDE.md](Developers%20Notes/Lessons%20Learned/MAINTENANCE_GUIDE.md)
- **Branch Management:** [BRANCH_MANAGEMENT.md](BRANCH_MANAGEMENT.md) - Tool for identifying outdated branches
- **Emergency Recovery:** [Developers Notes/Lessons Learned/copilot_fix_recovery.md](Developers%20Notes/Lessons%20Learned/copilot_fix_recovery.md)
- **Deployment Troubleshooting:** [DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md)

### 📊 Testing
- **E2E Tests:** [e2e/README.md](e2e/README.md)
- **Playwright Integration:** [PLAYWRIGHT_INTEGRATION.md](PLAYWRIGHT_INTEGRATION.md)
- **Smoke Tests:** [Developers Notes/Implementation/SMOKE_TESTS_GUIDE.md](Developers%20Notes/Implementation/SMOKE_TESTS_GUIDE.md)

---

## 🏗️ Architecture

### System Philosophy: FIELD → MAP → VOICE

All Raven Calder output follows this translation protocol:

1. **FIELD** - Energetic climate (raw symbolic data)
2. **MAP** - Archetypal patterns (geometric interpretation)
3. **VOICE** - Lived mirror (plain language output)

### Frontstage vs. Backstage

**Frontstage (user-facing):**
- ❌ No planet names, signs, houses, aspects, degrees
- ✅ Plain, conversational language
- ✅ Possibility language ("often," "tends to")

**Backstage (operator-only):**
- ✅ All technical terms allowed
- ✅ Geometric calculations visible
- ✅ Diagnostic notes

---

## 📦 Project Structure

```
WovenWebApp/
├── app/                    # Next.js 14 App Router
│   ├── math-brain/        # Main calculation interface
│   └── api/               # API routes
├── components/            # React components
│   ├── mathbrain/         # Balance Meter components
│   └── ...
├── lib/                   # Core business logic
│   ├── server/            # Server-side calculations
│   └── balance/           # Balance Meter v5.0
├── src/                   # Legacy support files
│   ├── seismograph.js     # Balance Meter calculations
│   └── reporters/         # Report generation
├── docs/                  # User-facing documentation
├── Developers Notes/      # Complete developer documentation
├── e2e/                   # Playwright E2E tests
└── __tests__/             # Jest unit tests
```

---

## 🔑 Key Features

### Balance Meter v5.0 (October 2025)
- **Two-axis system**: Magnitude (0-5) + Directional Bias (-5 to +5)
- **Retired metrics**: Coherence and SFD removed
- **Unified natal architecture**: Single `fetchNatalChartComplete()` function
- **Fixed bugs**: Person B aspects now populated, orb filtering corrected

### Recent Fixes (Oct 12, 2025)
- ✅ Person B natal aspects bug (SYNASTRY mode)
- ✅ Orb filtering using `Math.abs(orb)` for applying aspects
- ✅ Unified natal chart fetching (replaced 14 fragmented paths)
- ✅ Balance Meter showing zeros (orb dropout fix)

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm test

# E2E tests (Playwright)
npx playwright test

# Specific test suite
npx jest __tests__/api-natal-aspects-refactor.test.js
```

### Verify Fixes

```bash
# Test API directly
npx jest __tests__/api-natal-aspects-refactor.test.js

# Expected output:
# ✅ Person A has 76 natal aspects
# ✅ Person B has 67 natal aspects
# ✅ Both have 12 house cusps
```

---

## 🚨 Known Issues

| Status | Issue | Reference |
|--------|-------|-----------|
| ⏳ Pending | Balance Meter values may show zeros in some exports | [Issue Tracker](Developers%20Notes/API/API_REFERENCE.md#known-issues-tracker) |
| ⏳ Pending | Composite transits temporarily disabled | Awaiting upstream API stability |
| ✅ Fixed | Person B aspects missing | Oct 12 2025 - Unified natal fetch |
| ✅ Fixed | Orb filtering bug | Oct 12 2025 - `Math.abs(orb)` |

---

## 🤝 Contributing

### Before Making Changes

1. Read [Core/Four Report Types_Integrated 10.1.25.md](Developers%20Notes/Core/Four%20Report%20Types_Integrated%2010.1.25.md) (PRIMARY REFERENCE)
2. Check [Developers Notes/README.md](Developers%20Notes/README.md) for relevant implementation guide
3. Review [MAINTENANCE_GUIDE.md](Developers%20Notes/Lessons%20Learned/MAINTENANCE_GUIDE.md)
4. Run smoke tests before committing

### Documentation Updates

When code changes affect documentation:
1. Update relevant files in `Developers Notes/`
2. Update [CHANGELOG.md](CHANGELOG.md)
3. Update this README if architecture changes
4. Cross-reference related docs

---

## 📞 Support

**Project Owner:** Jules (Dan Cross / DHCross)  
**Repository:** WovenWebApp  
**Deployment:** Netlify

### For Questions About:
- **Architecture:** Review [Developers Notes/Core/](Developers%20Notes/Core/) docs
- **Implementation:** Check [Developers Notes/Implementation/](Developers%20Notes/Implementation/) specs
- **Voice/Persona:** Reference [Developers Notes/Poetic Brain/](Developers%20Notes/Poetic%20Brain/) guidelines
- **API Integration:** See [Developers Notes/API/](Developers%20Notes/API/) documentation

---

## 📜 License

See LICENSE file for details.

---

## 🔗 Quick Links

- **[Full Developer Documentation](Developers%20Notes/README.md)**
- **[User-Facing Docs](docs/README.md)**
- **[API Reference](Developers%20Notes/API/API_REFERENCE.md)**
- **[Changelog](CHANGELOG.md)**
- **[Balance Meter v5.0 Summary](V5_IMPLEMENTATION_SUMMARY.md)**

---

**Last Updated:** October 12, 2025  
**Version:** 5.0 (Post-Refactor)  
**Status:** Production-ready with ongoing QA
