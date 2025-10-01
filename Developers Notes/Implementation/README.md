# Implementation Documentation

**Purpose:** Technical specifications and implementation guides for Raven Calder system components.

---

## Overview

This folder contains detailed technical specifications for implementing the Raven Calder system. These documents translate the high-level architecture from `/Core/` into concrete implementation requirements.

---

## Technical Specifications

### Math Brain Components

#### [MATH_BRAIN_COMPLIANCE.md](MATH_BRAIN_COMPLIANCE.md)
**Purpose:** Technical compliance requirements for Math Brain calculations  
**Audience:** Backend developers

**Contents:**
- Aspect calculation requirements
- Orb tolerance specifications
- House system requirements
- Data validation rules
- Error handling protocols

**When to use:** Implementing or modifying astrological calculation logic

---

#### [SEISMOGRAPH_GUIDE.md](SEISMOGRAPH_GUIDE.md)
**Purpose:** Balance Meter technical implementation  
**Audience:** Developers implementing symbolic weather calculations

**Contents:**
- Magnitude, Valence, Volatility formulas
- Support-Friction Differential (SFD) calculation
- Resilience & Depletion Layer specifications
- Weight tables and multipliers
- Output schema and validation

**When to use:** Building or debugging Balance Meter features

---

### Feature Implementation Guides

#### [SAVED_CHARTS_IMPLEMENTATION.md](SAVED_CHARTS_IMPLEMENTATION.md)
**Purpose:** Saved charts feature specification  
**Audience:** Full-stack developers

**Contents:**
- Database schema for saved charts
- API endpoint specifications
- Frontend component requirements
- Security considerations

**When to use:** Implementing user data persistence

---

#### [Relocated Houses Engine Integration.md](Relocated%20Houses%20Engine%20Integration.md)
**Purpose:** Relocation chart calculation integration  
**Audience:** Backend developers

**Contents:**
- Relocation calculation requirements
- API integration patterns
- Angle drift handling
- Location data validation

**When to use:** Adding relocation support to reports

---

#### [Developer Session Export Feature.md](Developer%20Session%20Export%20Feature.md)
**Purpose:** Debug export functionality  
**Audience:** Backend/DevOps developers

**Contents:**
- Session data export format
- Privacy-safe logging
- Diagnostic data capture
- Export API specifications

**When to use:** Building debug/diagnostic tools

---

### Quality Assurance

#### [SMOKE_TESTS_GUIDE.md](SMOKE_TESTS_GUIDE.md)
**Purpose:** Critical path testing specifications  
**Audience:** QA engineers, developers

**Contents:**
- Essential test scenarios
- Expected outputs
- Edge case handling
- Regression test suite

**When to use:** Pre-deployment testing, regression testing

---

#### [LINTER_SPECIFICATIONS.md](LINTER_SPECIFICATIONS.md)
**Purpose:** Automated quality enforcement  
**Audience:** DevOps, developers

**Contents:**
- Frontstage content linting rules
- YAML structure validation
- Placeholder detection
- Balance Meter consistency checks
- CI/CD integration patterns

**When to use:** Setting up automated quality checks, debugging linter failures

---

### Symbolic & Diagnostic Tools

#### [DREAM_PROTOCOL_REFERENCE.md](DREAM_PROTOCOL_REFERENCE.md)
**Purpose:** Dream analysis implementation guide  
**Audience:** Full-stack developers, content designers

**Contents:**
- 50+ Jungian dream motifs compendium
- Dream analysis protocol (5 phases)
- Integration with Poetic Codex
- Symbolic Spectrum Table (SST) usage

**When to use:** Implementing dream logging/analysis features

---

## Integration Points

### Connection to Core Architecture
All implementation docs should align with:
- [`/Core/Four Report Types_Integrated 10.1.25.md`](../Core/Four%20Report%20Types_Integrated%2010.1.25.md) - Primary architecture
- [`/Core/UNIFIED_REPORT_STRUCTURE.md`](../Core/UNIFIED_REPORT_STRUCTURE.md) - Structural requirements

### Connection to Poetic Brain
Implementation must respect voice requirements from:
- [`/Poetic Brain/RAVEN-PERSONA-SPEC.md`](../Poetic%20Brain/RAVEN-PERSONA-SPEC.md)
- [`/Poetic Brain/POETIC_CODEX_CARD_SPEC.md`](../Poetic%20Brain/POETIC_CODEX_CARD_SPEC.md)

### Connection to API Layer
Implementation guides reference:
- [`/API/API_INTEGRATION_GUIDE.md`](../API/API_INTEGRATION_GUIDE.md)
- Netlify function architecture

---

## Development Workflow

### Starting a New Feature

1. **Read Core Docs First**
   - [`Four Report Types_Integrated 10.1.25.md`](../Core/Four%20Report%20Types_Integrated%2010.1.25.md) for architecture
   - Relevant `/Core/` docs for structural requirements

2. **Find Implementation Spec**
   - Check this folder for existing technical specs
   - Review MATH_BRAIN_COMPLIANCE for calculation features
   - Review SEISMOGRAPH_GUIDE for Balance Meter features

3. **Check Linter Requirements**
   - Review LINTER_SPECIFICATIONS for quality rules
   - Run linters during development

4. **Reference Lessons Learned**
   - [`/Lessons Learned/MAINTENANCE_GUIDE.md`](../Lessons%20Learned/MAINTENANCE_GUIDE.md)
   - [`/Lessons Learned/Lessons Learned for Developer.md`](../Lessons%20Learned/Lessons%20Learned%20for%20Developer.md)

5. **Test Against Smoke Tests**
   - Run scenarios from SMOKE_TESTS_GUIDE
   - Add new scenarios if needed

### Modifying Existing Features

1. **Identify affected specs** in this folder
2. **Check for breaking changes** in Core architecture
3. **Update implementation docs** if behavior changes
4. **Update linter rules** if new patterns emerge
5. **Add/update smoke tests** for modified behavior

---

## Testing Strategy

### Unit Tests
- Math Brain calculations → validate against MATH_BRAIN_COMPLIANCE
- Balance Meter formulas → validate against SEISMOGRAPH_GUIDE
- Data validation → check against schema specs

### Integration Tests
- API endpoints → test against API_INTEGRATION_GUIDE patterns
- Saved charts → test CRUD operations per SAVED_CHARTS_IMPLEMENTATION
- Relocation → test edge cases from Relocated Houses Engine Integration

### Smoke Tests
- Follow SMOKE_TESTS_GUIDE scenarios
- Run before deployment
- Include all critical user paths

### Linting
- Run LINTER_SPECIFICATIONS checks in CI/CD
- Validate all content before publication
- Check Frontstage/Backstage separation

---

## Document Status

| Document | Category | Last Updated | Priority |
|----------|----------|--------------|----------|
| MATH_BRAIN_COMPLIANCE.md | Core Tech | - | 🔴 Critical |
| SEISMOGRAPH_GUIDE.md | Core Tech | - | 🔴 Critical |
| LINTER_SPECIFICATIONS.md | Quality | Oct 1, 2025 | 🟡 High |
| DREAM_PROTOCOL_REFERENCE.md | Feature | Oct 1, 2025 | 🟢 Medium |
| SAVED_CHARTS_IMPLEMENTATION.md | Feature | - | 🟡 High |
| Relocated Houses Engine Integration.md | Feature | - | 🟢 Medium |
| Developer Session Export Feature.md | DevTools | - | 🔵 Low |
| SMOKE_TESTS_GUIDE.md | Quality | - | 🟡 High |

**Priority Legend:**
- 🔴 Critical - Core functionality, breaking changes impact entire system
- 🟡 High - Important features, affects user experience
- 🟢 Medium - Useful features, enhances capability
- 🔵 Low - Nice-to-have, developer convenience

---

## Common Tasks

### Need to implement:
- **Astrological calculations?** → MATH_BRAIN_COMPLIANCE.md
- **Balance Meter feature?** → SEISMOGRAPH_GUIDE.md
- **Dream analysis?** → DREAM_PROTOCOL_REFERENCE.md
- **User data storage?** → SAVED_CHARTS_IMPLEMENTATION.md
- **Relocation support?** → Relocated Houses Engine Integration.md

### Need to ensure quality:
- **Content validation?** → LINTER_SPECIFICATIONS.md
- **Pre-deployment checks?** → SMOKE_TESTS_GUIDE.md
- **Code review standards?** → `/Lessons Learned/MAINTENANCE_GUIDE.md`

### Need to debug:
- **Math Brain errors?** → MATH_BRAIN_COMPLIANCE.md
- **Balance Meter unexpected values?** → SEISMOGRAPH_GUIDE.md
- **Linter failures?** → LINTER_SPECIFICATIONS.md
- **Feature not working?** → Relevant implementation guide

---

## Contribution Guidelines

### Adding New Implementation Docs

1. **Naming Convention:** `FEATURE_NAME_IMPLEMENTATION.md` or `SYSTEM_NAME_GUIDE.md`
2. **Required Sections:**
   - Overview/Purpose
   - Audience
   - Technical specifications
   - Integration points
   - Testing requirements
   - See Also (cross-references)
3. **Update this README** with new document reference
4. **Add to Document Status table**

### Updating Existing Docs

1. **Preserve version history** (add "Last Updated" date)
2. **Update cross-references** if behavior changes
3. **Update Core docs** if architecture changes
4. **Run affected tests** to verify changes
5. **Update CHANGELOG.md** with notable changes

---

## See Also

- **Architecture:** [`/Core/`](../Core/) - System architecture and design
- **Voice & Persona:** [`/Poetic Brain/`](../Poetic%20Brain/) - Narrative generation
- **API Integration:** [`/API/`](../API/) - External service patterns
- **Development Process:** [`/Lessons Learned/`](../Lessons%20Learned/) - Best practices
- **Historical Reference:** [`/Archive/`](../Archive/) - Superseded documentation

---

**Maintained by:** Dan Cross (DHCross)  
**Last README Update:** October 1, 2025
