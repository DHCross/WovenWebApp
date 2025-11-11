# 🔴 CRITICAL PRIVACY CONSTRAINT: Dan & Stephie Names

**Status:** Production Requirement
**Priority:** Critical
**Date:** October 20, 2025

---

## The Absolute Rule

**"Stephie" and "Dan" names must NEVER surface in Poetic Brain conversations unless the logged-in user IS Dan or Stephie.**

This is not a guideline. This is a **hard privacy requirement**.

---

## Why This Matters

### They Are Real People

- **Dan Cross** (Person A in examples) - Real person, real data
- **Stephie** (Person B in examples) - Real person, real data

### Privacy Violation Scenarios

**❌ WRONG - Privacy Violation:**
```
User: Sarah logs into Poetic Brain
System: "Here's your relational reading for Dan & Stephie..."
```
This is a critical privacy breach. Sarah should NEVER see Dan or Stephie's names.

**✅ CORRECT - Privacy Protected:**
```
User: Sarah logs into Poetic Brain, uploads her report with John
System: "Here's your relational reading for Sarah & John..."
```

---

## Implementation Requirements

### 1. Authentication Check (MANDATORY)

```typescript
// ✅ CORRECT Implementation
function generateNarrative(payload: InputPayload, authenticatedUser: User) {
  // Names MUST come from authenticated data or uploaded JSON
  const personAName = payload.person_a?.name || authenticatedUser.name || 'Person A';
  const personBName = payload.person_b?.name || 'Person B';

  // NEVER hardcode Dan or Stephie
  return `Relational reading for ${personAName} & ${personBName}...`;
}

// ❌ WRONG Implementation
function generateNarrative() {
  const personAName = 'Dan';  // PRIVACY VIOLATION
  const personBName = 'Stephie';  // PRIVACY VIOLATION
  return `Relational reading for ${personAName} & ${personBName}...`;
}
```

### 2. Name Source Priority (ENFORCED)

**Priority order for determining names:**

1. **Authenticated user identity** (if available)
2. **Names from uploaded JSON** (`person_a.name`, `person_b.name`)
3. **Generic placeholders** (`Person A`, `Person B`)
4. **NEVER** use "Dan" or "Stephie" as defaults

### 3. Example Data Separation (MANDATORY)

**Example files are for DOCUMENTATION ONLY:**

```
/examples/
  Mirror_Directive_dan-stephie_*.md       ← DOCUMENTATION ONLY
  Weather_Log_dan-stephie_*.json          ← DOCUMENTATION ONLY
  math_brain_setup_Dan_Stephie_*.json     ← DOCUMENTATION ONLY
```

**These files must NEVER be:**
- Loaded into production Poetic Brain
- Used as default data
- Mixed with user data
- Accessible through production UI

---

## Code Audit Checklist

### Poetic Brain Module

**File: `poetic-brain/src/index.ts`**
- [ ] No hardcoded "Dan" references in narrative functions
- [ ] No hardcoded "Stephie" references in narrative functions
- [ ] All names sourced from `payload.person_a.name` / `payload.person_b.name`
- [ ] Generic fallbacks if names missing

**File: `poetic-brain/api/handler.ts`**
- [ ] No hardcoded names in request handlers
- [ ] Authentication validated before processing
- [ ] Names extracted from authenticated session or payload

**File: `poetic-brain/README.md`**
- [x] Privacy warning added to examples
- [x] Clear labeling of example data

### Export Functions

**File: `app/math-brain/hooks/useChartExport.ts`**
- [ ] Filename generation uses actual names from report data
- [ ] No default to "Dan" or "Stephie" in filenames
- [ ] Fallback to generic names if data missing

### Documentation

**Files with "Dan" or "Stephie" as examples:**
- [x] RAVEN_PROTOCOL_V10.2_UNIFIED.md - Warning added
- [x] poetic-brain/README.md - Warnings added
- [ ] All other docs - Audit and add warnings

---

## Testing Protocol

### Development Testing

**✅ Required Tests:**

1. **Test with different names:**
   - Create test account with name "Alice"
   - Generate report for "Alice & Bob"
   - Verify NO "Dan" or "Stephie" appears anywhere

2. **Test with missing names:**
   - Upload JSON with null names
   - Verify system uses "Person A" / "Person B"
   - Verify NO "Dan" or "Stephie" used as fallback

3. **Test authentication:**
   - Verify system checks logged-in user
   - Verify names match authenticated identity
   - Verify no cross-contamination of data

### Production Monitoring

**Set up alerts for:**
- Any "Dan" or "Stephie" appearing in non-Dan/Stephie user sessions
- Example file paths accessed in production
- Hardcoded name references in logs

---

## Correct Usage Examples

### ✅ Documentation (ALLOWED)

```markdown
# Example: Relational Reading

**Person A:** Dan (example)
**Person B:** Stephie (example)

⚠️ These are example names for documentation purposes only.
```

### ✅ Generic Placeholders (ALLOWED)

```typescript
const personAName = payload.person_a?.name || 'Person A';
const personBName = payload.person_b?.name || 'Person B';
```

### ❌ Hardcoded Defaults (FORBIDDEN)

```typescript
// NEVER DO THIS
const personAName = 'Dan';
const personBName = 'Stephie';
```

### ❌ Example Data in Production (FORBIDDEN)

```typescript
// NEVER DO THIS
import exampleData from '../examples/dan-stephie.json';
```

---

## Privacy Guardrails Summary

### ❌ NEVER

1. Generate reports about Dan/Stephie for other users
2. Use "Dan" or "Stephie" as placeholder names
3. Load example files as production data
4. Hardcode these names in production code
5. Use these names as fallback defaults
6. Mix example data with user data
7. Expose example files through production UI

### ✅ ALWAYS

1. Validate user authentication before processing
2. Use names from uploaded data or authenticated session
3. Keep example data in `/examples/` directory only
4. Use generic placeholders if names are missing
5. Tie each report to authenticated user session
6. Audit code for hardcoded name references
7. Test with diverse names to catch leaks

---

## User Experience

### What Every User Should See

**Their own names:**
- From birth data they provided
- From authenticated user profile
- Generic placeholders if names not provided

**Never see:**
- "Dan" or "Stephie" (unless that's their actual name)
- Other users' names
- Example data from documentation

---

## Developer Responsibilities

### Before Committing Code

1. Search codebase for "Dan" and "Stephie"
2. Verify all references are in documentation only
3. Check no hardcoded names in production code
4. Verify fallbacks use generic placeholders

### Before Deploying

1. Run full test suite with non-Dan/Stephie names
2. Verify example files not accessible in production
3. Check authentication enforcement
4. Monitor logs for name leaks

### When Writing Documentation

1. Clearly label Dan/Stephie as examples
2. Add privacy warnings near examples
3. Show generic placeholder alternatives
4. Emphasize authentication requirements

---

## Incident Response

### If Dan/Stephie Names Appear for Wrong User

**Severity:** Critical Privacy Breach

**Immediate Actions:**
1. Take affected feature offline
2. Audit code for hardcoded references
3. Verify no data cross-contamination
4. Fix and test thoroughly
5. Deploy fix immediately
6. Notify affected users if necessary

---

## Summary

Dan and Stephie are real people. Their names in the codebase are for **examples and testing only**.

The system must be **identity-agnostic** and work with ANY names. It must NEVER assume user identity or use example names as defaults.

**This is not negotiable. This is production security.**

---

**Last Updated:** October 20, 2025
**Status:** Active Constraint
**Review:** Required before any Poetic Brain deployment
