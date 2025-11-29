# Raven Modules Quick Reference

## Directory Structure
```
lib/raven/
├── route.ts (1051 lines) — HTTP handler, session coordination
├── helpers.ts (95) — Formatting utilities, constants
├── user-response.ts (147) — Response classification (WB/ABE/OSR)
├── validation-probes.ts (157) — SST probe generation
├── auto-execution.ts (475) — Mirror execution planning
├── geometry-extract.ts (64) — Report geometry parsing
├── context-gate.ts (219) — Identity confirmation protocol
├── protocol.ts (216) — System prompts & persona
├── sst-integrity.ts (170) — SST validation rules
├── [other existing modules...]
```

## Module Responsibilities

### `helpers.ts` — Utility Functions
**When to use:** Formatting, truncation, history management  
**Key exports:**
- Constants: `MAX_CONTEXT_CHARS`, `MAX_HISTORY_TURNS`
- Functions: format for LLM, extract JSON, safe parsing

**Example:**
```typescript
const history = formatHistoryForPrompt(sessionLog.history);
const contexts = formatReportContextsForPrompt(normalizedContexts);
```

---

### `user-response.ts` — Response Classification
**When to use:** Categorizing user messages for SST  
**Key exports:**
- `checkForOSRIndicators()` — Is user confirming "signal void"?
- `classifyUserResponse()` — Bucket as CLEAR_WB, PARTIAL_ABE, OSR, or UNCLEAR
- `isMetaSignalAboutRepetition()` — Is user expressing repetition fatigue?

**Example:**
```typescript
const isOSR = checkForOSRIndicators(userMessage);
const classification = classifyUserResponse(userMessage); // 'CLEAR_WB' | 'PARTIAL_ABE' | 'OSR' | 'UNCLEAR'
```

---

### `validation-probes.ts` — SST Probes
**When to use:** Generating validation prompts and detecting conversation mode  
**Key exports:**
- `detectConversationMode()` — Is this clarification, new request, or repetition?
- `generateValidationProbe()` — Create SST probe text for LLM response
- `recordSuggestion()` — Log auto-suggestions in session

**Example:**
```typescript
const mode = detectConversationMode(userInput, sessionLog);
const probe = generateValidationProbe(narrative, reportContext);
```

---

### `auto-execution.ts` — Mirror Planning
**When to use:** Determining if auto-run or manual execution  
**Key exports:**
- Types: `AutoExecutionPlan`, `AutoExecutionStatus`
- Functions: `deriveAutoExecutionPlan()`, resolve subjects, extract contracts

**Example:**
```typescript
const plan = deriveAutoExecutionPlan(normalizedContexts, sessionLog);
// Returns: { status: 'relational_auto' | 'solo_auto' | 'contextual_auto', ... }
```

---

### `geometry-extract.ts` — Report Parsing
**When to use:** Extracting geometry from uploaded JSON reports  
**Key exports:**
- `extractGeometryFromUploadedReport()` — Parse chart data from uploads

**Example:**
```typescript
const geometry = extractGeometryFromUploadedReport(normalizedContexts);
if (geometry) {
  // Use cached geometry instead of regenerating
}
```

---

### `context-gate.ts` — Identity Protocol
**When to use:** Multi-person scenarios (dyadic, observational)  
**Types:** `QuerentRole`, `ContextGateState`  
**Key exports:**
- `needsContextGate()` — Should we ask "who am I speaking with?"
- `generateContextGateQuestion()` — Create identity confirmation prompt
- `getVoiceAdaptationInstructions()` — Voice rules per querent role

**Example:**
```typescript
if (needsContextGate(sessionLog.contextGate)) {
  const question = generateContextGateQuestion(sessionSubjects);
  // Raven: "Who am I speaking with—you as Person A, or as an observer?"
}
```

---

### `protocol.ts` — System Prompts
**When to use:** Building Raven's system instructions  
**Key exports:**
- Constants: `RAVEN_CORE_PERSONA`, `CONTEXT_GATE_PROTOCOL`, `SST_PROTOCOL`, etc.
- Functions: `buildRavenSystemPrompt()`, `generateSessionOpening()`

**Example:**
```typescript
const systemPrompt = buildRavenSystemPrompt(sessionLog.contextGate);
// Assembles persona, protocols, voice rules, etc.
```

---

### `sst-integrity.ts` — Validation Rules
**When to use:** Enforcing SST consistency and provenance  
**Key exports:**
- Constants: `SST_TIERS`, `SST_DESCRIPTIONS`, `SST_TIMING`
- Functions: `canAssignWB()`, `isValidOSR()`, `getLanguageGuidance()`

**Example:**
```typescript
if (canAssignWB(probe)) {
  probe.tag = 'WB';
}
const weight = getProvenanceWeight(probe.source); // 'self' vs 'observer'
```

---

## Import Patterns

### From route.ts
```typescript
// Formatting
import { formatReportContextsForPrompt, formatHistoryForPrompt } from '@/lib/raven/helpers';

// Classification
import { checkForOSRIndicators, classifyUserResponse } from '@/lib/raven/user-response';

// Probes
import { generateValidationProbe, detectConversationMode } from '@/lib/raven/validation-probes';

// Planning
import { deriveAutoExecutionPlan, type AutoExecutionPlan } from '@/lib/raven/auto-execution';

// Geometry
import { extractGeometryFromUploadedReport } from '@/lib/raven/geometry-extract';

// Identity
import { needsContextGate, generateContextGateQuestion } from '@/lib/raven/context-gate';

// Prompts
import { buildRavenSystemPrompt } from '@/lib/raven/protocol';

// Validation
import { canAssignWB, isValidOSR } from '@/lib/raven/sst-integrity';
```

---

## Dependency Graph

```
route.ts (HTTP handler)
  ├─→ helpers.ts
  │   └─→ sst.ts
  ├─→ user-response.ts
  ├─→ validation-probes.ts
  │   └─→ sst.ts
  ├─→ auto-execution.ts
  │   ├─→ helpers.ts
  │   └─→ sst.ts
  ├─→ geometry-extract.ts (standalone)
  ├─→ context-gate.ts (standalone)
  ├─→ protocol.ts
  │   └─→ context-gate.ts
  └─→ sst-integrity.ts
      └─→ sst.ts
```

**No circular dependencies detected.**

---

## When to Add to Which Module

### New response classification logic?
→ Add to `user-response.ts`

### New system prompt or persona rules?
→ Add to `protocol.ts` or `raven-formatting.ts`

### New SST validation rule?
→ Add to `sst-integrity.ts`

### New auto-execution scenario?
→ Add to `auto-execution.ts`

### New formatting helper?
→ Add to `helpers.ts`

### New identity/multi-person scenario?
→ Add to `context-gate.ts`

### New probe type or detection logic?
→ Add to `validation-probes.ts`

---

## Module Line Counts (Target for Refactoring)

Current safe limits (before next split):
- ✅ helpers.ts: 95 lines (under 150)
- ✅ user-response.ts: 147 lines (at comfortable limit)
- ✅ validation-probes.ts: 157 lines (at comfortable limit)
- ⚠️ auto-execution.ts: 475 lines (largest, consider splitting at 600)
- ✅ geometry-extract.ts: 64 lines (lean, OK)
- ✅ context-gate.ts: 219 lines (substantial but focused)
- ✅ protocol.ts: 216 lines (substantial but focused)
- ✅ sst-integrity.ts: 170 lines (focused)

**Route.ts:** 1051 lines ✅ (down from 1868)

---

## Testing Checkpoints

When modifying any module:

1. **Type Check:** `npx tsc --noEmit`
2. **Build:** `npm run build`
3. **Module Imports:** Verify all usages in route.ts
4. **No Circular Deps:** Check import graph

**Pre-commit checklist:**
- [ ] Build passes
- [ ] No TypeScript errors
- [ ] No new circular dependencies
- [ ] Updated tests if logic changed
- [ ] REFACTOR_AUDIT_REPORT.md reflects changes (if significant)

