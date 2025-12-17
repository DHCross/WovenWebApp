# Changelog

All notable changes to The Woven Map project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

#### Poetic Brain Authentication & Build Fixes (2025-12-08)

**Impact**: Restored access to Poetic Brain for all users; fixed production build errors.

**Changes**:
- **Auth Disabled by Default**: Switched from strict Auth0 token validation to an optional feature flag (`POETIC_BRAIN_AUTH_ENABLED`). Auth is now disabled by default to prevent login loops.
- **Build Fixes**: Resolved TypeErrors in `MathBrainPage` (`padStart` on numbers) and React hook ordering issues.
- **Diagnostics**: Added self-diagnostic reporting to Raven. If narrative generation fails (e.g., "Empty Narrative"), Raven now reports exactly which data was missing (e.g., "0 aspects found").

**Technical Details**: See [Developers Notes/poetic_brain_auth_fix_dec2025.md](Developers Notes/poetic_brain_auth_fix_dec2025.md)

### Fixed

#### Person B Relocation in Synastry and Dual Natal Modes (2025-12-01)

**Impact**: Critical bug affecting all relational reports using `BOTH_LOCAL` or `B_LOCAL` relocation modes.

**Problem**: Person B's relocated chart was not being fetched, causing Person B's daily symbolic weather to incorrectly use natal house cusps instead of relocated house cusps. This meant Person B's "Felt Weather" readings were based on their birth location rather than their current location.

**Solution**: 
- Fixed in `SYNASTRY_TRANSITS` mode (lines 3320-3395)
- Fixed in `DUAL_NATAL_TRANSITS` mode (lines 3074-3148)
- Person B's relocated chart is now fetched when `BOTH_LOCAL`, `B_LOCAL`, or `CUSTOM` modes are selected
- Relocated house cusps are passed to transit calculations via `natalHouseCusps` parameter
- Both `chart_natal` and `chart_relocated` are stored separately for transparency

**Verification**:
- All regression tests pass: `test/both-local-relocation.test.js` (3/3 ✅)
- New validation test: `__tests__/synastry-bias-field.test.js` (7/7 ✅)

**Technical Details**: See [LESSONS_LEARNED_PERSON_B_RELOCATION.md](docs/LESSONS_LEARNED_PERSON_B_RELOCATION.md)

**Note**: Composite transits use midpoint calculations and don't require individual person relocation.

### Added

#### Synastry Bias Field Aggregation Test Suite (2025-12-01)

Created comprehensive test suite to validate that bias calculations correctly aggregate inputs from all three sources:

- **Person A transits** - Individual symbolic weather for Person A
- **Person B transits** - Individual symbolic weather for Person B (validates relocation fix works!)
- **Synastry aspects** - Relational dynamics between Person A and Person B

**Test Coverage**:
- `__tests__/synastry-bias-field.test.js` - 7 tests, all passing ✅
- Validates Person B's contribution is calculated independently
- Confirms Person B data is not ignored in relational calculations
- Tests relational tension/flow calculations from synastry aspects
- Verifies meaningful dominant theme generation

**Purpose**: Ensures the Person B relocation fix flows through to final bias calculations, confirming end-to-end correctness.

#### Documentation

- [CHANGELOG.md](CHANGELOG.md) - This file
- [docs/LESSONS_LEARNED_PERSON_B_RELOCATION.md](docs/LESSONS_LEARNED_PERSON_B_RELOCATION.md) - Technical insights and prevention strategies
- [docs/TECHNICAL_REFERENCE_RELOCATION.md](docs/TECHNICAL_REFERENCE_RELOCATION.md) - Complete implementation guide for chart relocation

## Historical

_Previous changes to be documented here as needed_

