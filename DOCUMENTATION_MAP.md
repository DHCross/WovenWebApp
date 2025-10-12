# WovenWebApp Documentation Map

**Created:** October 12, 2025  
**Purpose:** Navigation guide after README consolidation

---

## 📋 What Changed

### ✅ **Consolidation Complete**

1. **Created** `/README.md` - Master entry point for all users
2. **Deleted** `/web/README 2.md` - Exact duplicate
3. **Streamlined** `/docs/README.md` - User-facing documentation only
4. **Preserved** `/Developers Notes/README.md` - Complete developer index

### ❌ **Eliminated Duplication**

- Two competing navigation indexes merged into clear hierarchy
- Duplicate Next.js README removed
- Developer vs. user docs clearly separated

---

## 🗺️ New Documentation Structure

```
WovenWebApp/
│
├── README.md                           ⭐ START HERE - Master entry point
│                                          Quick start, architecture overview, links
│
├── docs/                               📘 User-Facing Documentation
│   ├── README.md                          User documentation index
│   ├── PROJECT_OVERVIEW.md                System vision & architecture
│   ├── CLEAR_MIRROR_VOICE.md              Raven Calder voice guide
│   ├── PRIVACY_POLICY.md                  Data handling policy
│   ├── UNIFIED_DASHBOARD_GUIDE.md         Balance Meter v5.0 guide
│   └── PERFORMANCE_REMEDIATION_PLAN.md    Optimization plan
│
├── Developers Notes/                   🛠️ Complete Developer Documentation
│   ├── README.md                          Developer master index
│   ├── Core/                              Architecture & design
│   │   └── Four Report Types_Integrated 10.1.25.md  ⭐ PRIMARY REFERENCE
│   ├── Implementation/                    Technical specs
│   │   ├── MATH_BRAIN_COMPLIANCE.md
│   │   ├── SEISMOGRAPH_GUIDE.md
│   │   └── ...
│   ├── Poetic Brain/                      Voice & narrative
│   │   ├── RAVEN_OUTPUT_PROTOCOL.md       ⭐ Output generation
│   │   ├── RAVEN-PERSONA-SPEC.md
│   │   └── ...
│   ├── API/                               External integration
│   │   ├── API_INTEGRATION_GUIDE.md       ⭐ Updated Oct 12
│   │   ├── API_REFERENCE.md               ⭐ Updated Oct 12
│   │   └── ...
│   ├── Lessons Learned/                   Best practices
│   │   ├── MAINTENANCE_GUIDE.md
│   │   ├── copilot_fix_recovery.md
│   │   └── ...
│   └── Archive/                           Historical reference
│
├── Root Documentation Files            📄 Specific Topics
│   ├── CHANGELOG.md                       Project history
│   ├── V5_IMPLEMENTATION_SUMMARY.md       Balance Meter v5.0
│   ├── DEPLOYMENT_TROUBLESHOOTING.md      Cache & deployment
│   ├── PLAYWRIGHT_INTEGRATION.md          E2E testing
│   └── ...                                (20+ specialized docs)
│
├── e2e/                                🧪 Testing Documentation
│   └── README.md                          E2E test guide
│
└── web/                                ⚛️ Next.js Scaffolding
    └── README.md                          Next.js default README
```

---

## 🎯 Navigation by Role

### I'm New to the Project
1. Read `/README.md` (Quick start & overview)
2. Read `/Developers Notes/Core/Four Report Types_Integrated 10.1.25.md` (PRIMARY REFERENCE)
3. Read `/Developers Notes/README.md` (Developer index)

### I'm a Content Writer
1. Read `/docs/CLEAR_MIRROR_VOICE.md` (Voice guide)
2. Read `/docs/PROJECT_OVERVIEW.md` (System philosophy)
3. Check `/Developers Notes/Poetic Brain/` for generation specs

### I'm Implementing a Feature
1. Check `/Developers Notes/README.md#quick-navigation`
2. Find relevant spec in `/Developers Notes/Implementation/`
3. Follow `/Developers Notes/Lessons Learned/MAINTENANCE_GUIDE.md`

### I'm Debugging an Issue
1. Check `/CHANGELOG.md` for recent changes
2. See `/Developers Notes/Lessons Learned/copilot_fix_recovery.md`
3. Review `/DEPLOYMENT_TROUBLESHOOTING.md` for cache issues

### I Need API Information
1. Read `/Developers Notes/API/API_REFERENCE.md` ⭐ UPDATED Oct 12
2. Read `/Developers Notes/API/API_INTEGRATION_GUIDE.md` ⭐ UPDATED Oct 12
3. Check API tests in `/__tests__/api-natal-aspects-refactor.test.js`

### I'm Working on Balance Meter v5.0
1. Read `/V5_IMPLEMENTATION_SUMMARY.md` (Executive summary)
2. Read `/docs/UNIFIED_DASHBOARD_GUIDE.md` (Feature guide)
3. Check `/CHANGELOG_v5.0_UNIFIED_DASHBOARD.md` (Complete changelog)
4. See `/docs/REFACTOR_UNIFIED_NATAL_ARCHITECTURE.md` (Architecture)

---

## 📚 Document Precedence

When conflicts arise between documentation:

### 1. PRIMARY REFERENCE (Highest Authority)
**`/Developers Notes/Core/Four Report Types_Integrated 10.1.25.md`**

This document ALWAYS wins in conflicts. It defines:
- Report types and structure
- FIELD → MAP → VOICE protocol
- Frontstage vs. Backstage rules

### 2. Implementation Specifications
- `/Developers Notes/Implementation/*.md` - Technical details
- `/Developers Notes/Poetic Brain/*.md` - Voice specifications
- `/Developers Notes/API/*.md` - API integration

### 3. Supporting Documentation
- Root-level topic files - Specific technical topics
- `/docs/*.md` - User-facing explanations
- `/Developers Notes/Lessons Learned/*.md` - Best practices

### 4. Reference Only
- `/Developers Notes/Archive/*.md` - Historical context only
- `/web/README.md` - Default Next.js scaffold

---

## 🔑 Key Documentation Updated (Oct 12, 2025)

### Recently Updated (v5.0 Refactor)
- ✅ `/README.md` - **NEW** Master entry point
- ✅ `/docs/README.md` - Streamlined to user-facing only
- ✅ `/Developers Notes/API/API_REFERENCE.md` - Added unified natal architecture
- ✅ `/Developers Notes/API/API_INTEGRATION_GUIDE.md` - Added orb fix + Person B fix
- ✅ `/DOCUMENTATION_MAP.md` - **NEW** This file

### Core References (Always Current)
- `/Developers Notes/Core/Four Report Types_Integrated 10.1.25.md`
- `/Developers Notes/Implementation/MATH_BRAIN_COMPLIANCE.md`
- `/Developers Notes/Poetic Brain/RAVEN_OUTPUT_PROTOCOL.md`

---

## 🚨 Emergency Quick Links

| Need | Go To |
|------|-------|
| **System broken** | `/Developers Notes/Lessons Learned/copilot_fix_recovery.md` |
| **API failures** | `/Developers Notes/API/API_INTEGRATION_GUIDE.md` |
| **Cache issues** | `/DEPLOYMENT_TROUBLESHOOTING.md` |
| **Test failures** | `/e2e/README.md` or `/__tests__/` |
| **Voice errors** | `/Developers Notes/Poetic Brain/RAVEN_OUTPUT_PROTOCOL.md` |
| **Recent changes** | `/CHANGELOG.md` |

---

## 📝 Maintenance

### When Adding New Documentation

1. **Choose correct location:**
   - User-facing → `/docs/`
   - Developer architecture → `/Developers Notes/Core/`
   - Implementation specs → `/Developers Notes/Implementation/`
   - Voice/content → `/Developers Notes/Poetic Brain/`
   - API/integration → `/Developers Notes/API/`
   - Best practices → `/Developers Notes/Lessons Learned/`
   - Specialized topics → `/` (root)

2. **Update indexes:**
   - Add to `/Developers Notes/README.md` if developer-focused
   - Add to `/docs/README.md` if user-facing
   - Update `/README.md` if major architectural change
   - Cross-reference in related docs

3. **Follow naming conventions:**
   - Use `SCREAMING_SNAKE_CASE.md` for specifications
   - End with `_SPEC.md`, `_GUIDE.md`, or `_REFERENCE.md`
   - Use descriptive names

### When Updating Documentation

1. Add "Last Updated" timestamp
2. Update `/CHANGELOG.md` if significant
3. Check for broken cross-references
4. Notify if changes affect PRIMARY REFERENCE

---

## 🎓 Documentation Philosophy

### Single Source of Truth
- ONE primary reference: `Four Report Types_Integrated 10.1.25.md`
- Supporting docs EXTEND, never CONTRADICT
- Clear precedence hierarchy

### Clear Separation
- **User-facing** (`/docs/`) - System concepts, voice guidelines
- **Developer** (`/Developers Notes/`) - Implementation details
- **Root** - Specialized topics, project history

### Minimal Duplication
- Links instead of copies
- Clear "see also" references
- Updated indexes as navigation

---

**Maintained by:** Dan Cross (DHCross)  
**Last Updated:** October 12, 2025  
**Status:** Active, current
