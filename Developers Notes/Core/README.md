# Core Documentation

**Purpose:** Central architecture and design documents that define the Raven Calder system's core structure.

---

## Primary Reference

### ⭐ [Four Report Types_Integrated 10.1.25.md](Four%20Report%20Types_Integrated%2010.1.25.md)
**Status:** PRIMARY REFERENCE - Single source of truth  
**Last Updated:** October 1, 2025

This is the **authoritative document** for the entire Raven Calder system. All other documentation should defer to this file when conflicts arise.

**Contents:**
- Raven Calder Narrative Protocol
- Four report types (Solo/Relational × Mirror/Balance)
- Symbolic Weather Constraint (weather/climate metaphor rules)
- Frontstage vs. Backstage voice separation
- Raven Calder persona specifications
- Operational protocols for integrity

**When to reference:**
- Understanding system architecture
- Designing new features
- Resolving conflicting information
- Training new developers

---

## Supporting Documents

### [UNIFIED_REPORT_STRUCTURE.md](UNIFIED_REPORT_STRUCTURE.md)
**Purpose:** Technical supplement to Four Report Types  
**Audience:** Developers implementing report generation

Provides detailed structural requirements for each report type, including:
- YAML frontmatter schemas
- Section ordering requirements
- Content block specifications
- Validation criteria

### [REPORT_STRUCTURE_VERIFICATION.md](REPORT_STRUCTURE_VERIFICATION.md)
**Purpose:** QA checklist for report validation  
**Audience:** QA engineers, developers

Contains:
- Verification steps for each report type
- Common structural errors to check
- Manual review guidelines
- Automated test specifications

---

## Usage Guidelines

### When Starting New Work

1. **Always read** [`Four Report Types_Integrated 10.1.25.md`](Four%20Report%20Types_Integrated%2010.1.25.md) first
2. Check supporting docs for implementation details
3. Cross-reference with `/Implementation/` for technical specs
4. Verify with `/Poetic Brain/` for voice/persona requirements

### When Conflicts Arise

**Precedence Order:**
1. Four Report Types_Integrated 10.1.25.md (PRIMARY)
2. UNIFIED_REPORT_STRUCTURE.md (structural details)
3. Other documentation (context only)

If you find conflicting information, the Four Report Types document takes precedence.

### Updating Core Documents

**Critical:** Core documents should be updated with extreme care.

**Process:**
1. Discuss proposed changes with project owner (Jules/DHCross)
2. Document reason for change in CHANGELOG.md
3. Update all cross-references in other docs
4. Run full test suite
5. Update "Last Updated" date in this README

---

## Related Documentation

### Implementation Details
- `/Implementation/MATH_BRAIN_COMPLIANCE.md` - Technical compliance requirements
- `/Implementation/SEISMOGRAPH_GUIDE.md` - Balance Meter formulas
- `/Implementation/LINTER_SPECIFICATIONS.md` - Quality enforcement

### Voice & Persona
- `/Poetic Brain/RAVEN-PERSONA-SPEC.md` - Raven Calder voice guidelines
- `/Poetic Brain/How Raven Speaks v2.md` - Narrative style guide
- `/Poetic Brain/POETIC_CODEX_CARD_SPEC.md` - Card generation specs

### Development Process
- `/Lessons Learned/MAINTENANCE_GUIDE.md` - Best practices
- `/Lessons Learned/Lessons Learned for Developer.md` - Context for developers
- `/API/API_INTEGRATION_GUIDE.md` - External service integration

---

## Document Status

| Document | Version | Last Updated | Status |
|----------|---------|--------------|--------|
| Four Report Types_Integrated 10.1.25.md | 10.1.25 | Oct 1, 2025 | ✅ Current |
| UNIFIED_REPORT_STRUCTURE.md | - | - | 🔄 Active |
| REPORT_STRUCTURE_VERIFICATION.md | - | - | 🔄 Active |

**Legend:**
- ✅ Current - Most recent, authoritative version
- 🔄 Active - Maintained alongside primary reference
- ⚠️ Review - Needs update/verification
- 📦 Archived - Historical reference only

---

## Quick Reference

**Need to understand:**
- System philosophy? → Four Report Types, Section 1
- Report types? → Four Report Types, Sections 2-5
- Voice rules? → Four Report Types + `/Poetic Brain/`
- Technical specs? → `/Implementation/`

**Working on:**
- New report template? → UNIFIED_REPORT_STRUCTURE
- QA/testing? → REPORT_STRUCTURE_VERIFICATION
- Math Brain changes? → `/Implementation/MATH_BRAIN_COMPLIANCE`
- Poetic Brain changes? → `/Poetic Brain/` + Four Report Types

---

**Maintained by:** Dan Cross (DHCross)  
**Last README Update:** October 1, 2025
