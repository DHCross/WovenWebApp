# Developers Notes - Master Index

**Last Updated:** October 1, 2025  
**Status:** Reorganized and current

---

## 📋 Overview

This directory contains all developer documentation for the **WovenWebApp** (Raven Calder astrological analysis system). Documentation is organized by purpose into focused subdirectories.

**Project:** WovenWebApp  
**System:** Raven Calder (FIELD → MAP → VOICE)  
**Deployment:** Netlify (Next.js App Router)

---

## 🗂️ Directory Structure

```
Developers Notes/
├── Core/                   # Architecture & design (PRIMARY REFERENCES)
├── Implementation/         # Technical specs & how-to guides
├── Poetic Brain/           # Voice, persona & narrative generation
├── API/                    # External service integration
├── Lessons Learned/        # Best practices & developer guidance
├── Archive/                # Historical docs (reference only)
└── README.md              # This file
```

---

## 🎯 Quick Navigation

### New to the Project?
Start here:
1. [`Core/Four Report Types_Integrated 10.1.25.md`](Core/Four%20Report%20Types_Integrated%2010.1.25.md) ⭐ **PRIMARY REFERENCE**
2. [`Lessons Learned/Lessons Learned for Developer.md`](Lessons%20Learned/Lessons%20Learned%20for%20Developer.md)
3. [`Core/README.md`](Core/README.md) - Core documentation index

### Working on a Feature?
Find your implementation guide:
- **Math Brain calculations:** [`Implementation/MATH_BRAIN_COMPLIANCE.md`](Implementation/MATH_BRAIN_COMPLIANCE.md)
- **Balance Meter:** [`Implementation/SEISMOGRAPH_GUIDE.md`](Implementation/SEISMOGRAPH_GUIDE.md)
- **Poetic Codex cards:** [`Poetic Brain/POETIC_CODEX_CARD_SPEC.md`](Poetic%20Brain/POETIC_CODEX_CARD_SPEC.md)
- **Saved charts:** [`Implementation/SAVED_CHARTS_IMPLEMENTATION.md`](Implementation/SAVED_CHARTS_IMPLEMENTATION.md)
- **Dream analysis:** [`Implementation/DREAM_PROTOCOL_REFERENCE.md`](Implementation/DREAM_PROTOCOL_REFERENCE.md)

### Need API Information?
- [`API/API_INTEGRATION_GUIDE.md`](API/API_INTEGRATION_GUIDE.md) - Integration patterns
- [`API/API_REFERENCE.md`](API/API_REFERENCE.md) - Endpoint documentation

### Debugging or Troubleshooting?
- [`Lessons Learned/MAINTENANCE_GUIDE.md`](Lessons%20Learned/MAINTENANCE_GUIDE.md)
- [`Lessons Learned/copilot_fix_recovery.md`](Lessons%20Learned/copilot_fix_recovery.md) - Emergency recovery
- [`Implementation/SMOKE_TESTS_GUIDE.md`](Implementation/SMOKE_TESTS_GUIDE.md)

### Voice & Content Generation?
- [`Poetic Brain/RAVEN-PERSONA-SPEC.md`](Poetic%20Brain/RAVEN-PERSONA-SPEC.md)
- [`Poetic Brain/How Raven Speaks v2.md`](Poetic%20Brain/How%20Raven%20Speaks%20v2.md)
- [`Implementation/LINTER_SPECIFICATIONS.md`](Implementation/LINTER_SPECIFICATIONS.md) - Quality checks

---

## 📁 Folder Details

### [`Core/`](Core/) - Architecture & Design ⭐

**Purpose:** System architecture, report structure, and design principles.

**Priority Files:**
- **[`Four Report Types_Integrated 10.1.25.md`](Core/Four%20Report%20Types_Integrated%2010.1.25.md)** - PRIMARY REFERENCE (single source of truth)
- [`UNIFIED_REPORT_STRUCTURE.md`](Core/UNIFIED_REPORT_STRUCTURE.md) - Technical supplement
- [`REPORT_STRUCTURE_VERIFICATION.md`](Core/REPORT_STRUCTURE_VERIFICATION.md) - QA checklist

**Read this folder when:**
- Starting any new work
- Resolving conflicts between docs
- Understanding system philosophy
- Designing new features

---

### [`Implementation/`](Implementation/) - Technical Specifications

**Purpose:** Detailed implementation guides and technical specifications.

**Key Files:**
- [`MATH_BRAIN_COMPLIANCE.md`](Implementation/MATH_BRAIN_COMPLIANCE.md) - Calculation requirements
- [`SEISMOGRAPH_GUIDE.md`](Implementation/SEISMOGRAPH_GUIDE.md) - Balance Meter formulas
- [`LINTER_SPECIFICATIONS.md`](Implementation/LINTER_SPECIFICATIONS.md) - Automated quality checks
- [`DREAM_PROTOCOL_REFERENCE.md`](Implementation/DREAM_PROTOCOL_REFERENCE.md) - Dream analysis
- [`SAVED_CHARTS_IMPLEMENTATION.md`](Implementation/SAVED_CHARTS_IMPLEMENTATION.md) - User data storage
- [`Relocated Houses Engine Integration.md`](Implementation/Relocated%20Houses%20Engine%20Integration.md) - Relocation support
- [`SMOKE_TESTS_GUIDE.md`](Implementation/SMOKE_TESTS_GUIDE.md) - Critical path testing

**Read this folder when:**
- Implementing new features
- Debugging calculations
- Setting up quality checks
- Understanding technical requirements

---

### [`Poetic Brain/`](Poetic%20Brain/) - Voice & Narrative

**Purpose:** Voice specifications, persona guidelines, and narrative generation.

**Key Files:**
- [`RAVEN-PERSONA-SPEC.md`](Poetic%20Brain/RAVEN-PERSONA-SPEC.md) - Persona definition
- [`How Raven Speaks v2.md`](Poetic%20Brain/How%20Raven%20Speaks%20v2.md) - Voice style guide
- [`POETIC_CODEX_CARD_SPEC.md`](Poetic%20Brain/POETIC_CODEX_CARD_SPEC.md) - Card generation spec (v2.1)
- [`IMPLEMENTATION_SPEC_MIRROR_REPORTS.md`](Poetic%20Brain/IMPLEMENTATION_SPEC_MIRROR_REPORTS.md) - Translation protocol
- [`QUEUE_ANALYSIS_FILTERS_GUIDE.md`](Poetic%20Brain/QUEUE_ANALYSIS_FILTERS_GUIDE.md) - Chat filtering

**Read this folder when:**
- Writing or reviewing content
- Implementing narrative generation
- Debugging voice consistency
- Building chat features

---

### [`API/`](API/) - External Integration

**Purpose:** API integration patterns and external service documentation.

**Key Files:**
- [`API_INTEGRATION_GUIDE.md`](API/API_INTEGRATION_GUIDE.md) - Integration patterns
- [`API_REFERENCE.md`](API/API_REFERENCE.md) - Endpoint specifications
- [`Astrologer API and other issues.md`](API/Astrologer%20API%20and%20other%20issues.md) - Known issues

**Read this folder when:**
- Integrating with RapidAPI Astrologer
- Building Netlify functions
- Troubleshooting API calls
- Understanding data flow

---

### [`Lessons Learned/`](Lessons%20Learned/) - Best Practices

**Purpose:** Developer guidance, troubleshooting, and best practices.

**Key Files:**
- [`Lessons Learned for Developer.md`](Lessons%20Learned/Lessons%20Learned%20for%20Developer.md) - Essential context
- [`MAINTENANCE_GUIDE.md`](Lessons%20Learned/MAINTENANCE_GUIDE.md) - Maintenance best practices
- [`copilot_fix_recovery.md`](Lessons%20Learned/copilot_fix_recovery.md) - Emergency procedures
- [`GIT_MERGE_CONFLICT_BEST_PRACTICES.md`](Lessons%20Learned/GIT_MERGE_CONFLICT_BEST_PRACTICES.md)
- [`AI_ASSISTANT_LIMITATIONS.md`](Lessons%20Learned/AI_ASSISTANT_LIMITATIONS.md)
- [`BACKEND_DEVELOPMENT_GUIDE.md`](Lessons%20Learned/BACKEND_DEVELOPMENT_GUIDE.md)

**Read this folder when:**
- New to the project
- Troubleshooting issues
- Making architectural decisions
- Working with AI assistants

---

### [`Archive/`](Archive/) - Historical Reference

**Purpose:** Superseded documentation preserved for historical context.

**⚠️ WARNING:** Files in Archive are NOT current. Use only for historical reference.

**Status:** All active content has been extracted to appropriate folders.

**Read this folder when:**
- Understanding system evolution
- Researching past decisions
- Compliance/audit needs

---

## 🔑 Key Principles

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
- ✅ Falsifiable, testable mirrors

**Backstage (operator-only):**
- ✅ All technical terms allowed
- ✅ Geometric calculations visible
- ✅ Diagnostic notes
- ❌ Never shown to users

### Document Precedence

When conflicts arise between docs:

1. **[`Core/Four Report Types_Integrated 10.1.25.md`](Core/Four%20Report%20Types_Integrated%2010.1.25.md)** - PRIMARY (always wins)
2. Implementation/Poetic Brain specs - Technical details
3. Other docs - Context only

---

## 🛠️ Development Workflow

### Starting a New Feature

1. ✅ Read [`Core/Four Report Types_Integrated 10.1.25.md`](Core/Four%20Report%20Types_Integrated%2010.1.25.md)
2. ✅ Find relevant implementation guide in [`Implementation/`](Implementation/)
3. ✅ Check voice requirements in [`Poetic Brain/`](Poetic%20Brain/) if generating content
4. ✅ Review [`Lessons Learned/MAINTENANCE_GUIDE.md`](Lessons%20Learned/MAINTENANCE_GUIDE.md)
5. ✅ Test against [`Implementation/SMOKE_TESTS_GUIDE.md`](Implementation/SMOKE_TESTS_GUIDE.md)

### Modifying Existing Features

1. ✅ Identify affected implementation spec
2. ✅ Check for breaking changes in Core architecture
3. ✅ Update docs if behavior changes
4. ✅ Update linter rules if new patterns emerge
5. ✅ Add/update smoke tests

### Content Generation

1. ✅ Verify voice alignment with [`Poetic Brain/RAVEN-PERSONA-SPEC.md`](Poetic%20Brain/RAVEN-PERSONA-SPEC.md)
2. ✅ Follow FIELD → MAP → VOICE protocol
3. ✅ Run [`Implementation/LINTER_SPECIFICATIONS.md`](Implementation/LINTER_SPECIFICATIONS.md) checks
4. ✅ Validate Frontstage/Backstage separation

---

## 📊 Documentation Status

### Current (October 1, 2025)

| Folder | Files | Status | Priority |
|--------|-------|--------|----------|
| Core/ | 3 | ✅ Current | 🔴 Critical |
| Implementation/ | 8 | ✅ Current | 🔴 Critical |
| Poetic Brain/ | 5 | ✅ Current | 🔴 Critical |
| API/ | 3 | 🔄 Active | 🟡 High |
| Lessons Learned/ | 8+ | 🔄 Active | 🟡 High |
| Archive/ | 15+ | 📦 Historical | 🔵 Reference |

**Status Legend:**
- ✅ Current - Recently updated, authoritative
- 🔄 Active - Maintained, in use
- 📦 Historical - Archived for reference only

**Priority Legend:**
- 🔴 Critical - Core functionality
- 🟡 High - Important features
- 🟢 Medium - Useful enhancements
- 🔵 Reference - Historical context

---

## 🚨 Emergency References

### System is Broken
→ [`Lessons Learned/copilot_fix_recovery.md`](Lessons%20Learned/copilot_fix_recovery.md)

### API Failures
→ [`API/API_INTEGRATION_GUIDE.md`](API/API_INTEGRATION_GUIDE.md) troubleshooting section

### Voice Violations
→ [`Implementation/LINTER_SPECIFICATIONS.md`](Implementation/LINTER_SPECIFICATIONS.md)

### Merge Conflicts
→ [`Lessons Learned/GIT_MERGE_CONFLICT_BEST_PRACTICES.md`](Lessons%20Learned/GIT_MERGE_CONFLICT_BEST_PRACTICES.md)

### Unknown Errors
→ [`Lessons Learned/MAINTENANCE_GUIDE.md`](Lessons%20Learned/MAINTENANCE_GUIDE.md) troubleshooting

---

## 🤝 Contributing

### Adding New Documentation

1. **Choose correct folder:**
   - Architecture/design → Core/
   - Technical specs → Implementation/
   - Voice/persona → Poetic Brain/
   - Best practices → Lessons Learned/
   - API integration → API/

2. **Follow naming conventions:**
   - Use `SCREAMING_SNAKE_CASE.md` for specs
   - Use descriptive names
   - End with `_SPEC.md`, `_GUIDE.md`, or `_REFERENCE.md`

3. **Required sections:**
   - Overview/Purpose
   - Audience
   - Content (spec-specific)
   - See Also (cross-references)

4. **Update indexes:**
   - Add entry to folder README
   - Update this master README if significant
   - Add cross-references in related docs

### Updating Existing Documentation

1. **Preserve version history** (add "Last Updated" date)
2. **Update cross-references** if structure changes
3. **Run affected tests** to verify changes
4. **Update [`CHANGELOG.md`](../../CHANGELOG.md)** with notable changes
5. **Check for breaking changes** in dependent docs

---

## 📞 Contact & Ownership

**Project Owner:** Jules (Dan Cross / DHCross)  
**Repository:** WovenWebApp  
**Deployment:** Netlify  

**For questions about:**
- Architecture: Review Core/ docs, then consult owner
- Implementation: Check Implementation/ specs first
- Voice/Persona: Reference Poetic Brain/ guidelines

---

## 🔍 Search Tips

### Finding Information

**Use grep/search for:**
- Specific technical terms: `grep -r "Balance Meter" .`
- Feature implementations: `grep -r "IMPLEMENTATION" .`
- API patterns: `grep -r "RapidAPI" .`

**Use file browser for:**
- Browsing by topic (folders organized by purpose)
- Finding related docs (README files index each folder)

**Use cross-references for:**
- Following connections between docs
- Understanding integration points
- Tracing dependencies

---

## 📅 Maintenance

### Regular Tasks

**Weekly:**
- Review open issues affecting documentation
- Update status of in-progress implementations

**Monthly:**
- Audit cross-references for broken links
- Check for outdated version numbers
- Review Archive for files to delete

**Quarterly:**
- Comprehensive documentation audit
- Update master index
- Review folder organization
- Update precedence rules if needed

**Last Comprehensive Audit:** October 1, 2025  
**Next Scheduled Audit:** January 1, 2026

---

**Master Index Maintained by:** Dan Cross (DHCross)  
**Last Updated:** October 1, 2025
