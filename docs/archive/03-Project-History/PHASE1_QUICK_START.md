# Phase 1: Quick Reference – Start Here

## Pre-Flight Checklist (Before Task 1)

- [ ] Read `PHASE1_REFACTORING_ARCHITECTURE.md` (module boundaries)
- [ ] Read `PHASE1_EXECUTION_TASKS.md` (task breakdown)
- [ ] Verify current `main` branch compiles: `npm run dev`
- [ ] Create feature branch: `git checkout -b phase1/split-narrative`

---

## Task 1: Extract `lib/raven-narrative.ts`

### 1. Create the file
```bash
touch lib/raven-narrative.ts
```

### 2. Copy this from ChatClient.tsx
```typescript
// Types
interface NarrativeSectionProps {
  text: string;
}

// Functions
const renderNarrativeSection = (...)
const FieldSection = (...)
const MapSection = (...)
const VoiceSection = (...)
const coalesceSegments = (...)
const ensureParagraph = (...)
const formatAppendixHighlights = (...)
const buildNarrativeDraft = (...)
const formatShareableDraft = (...)
const stripPersonaMetadata = (...)
const removeCitationAnnotations = (...)
const ensureSentence = (...)
```

### 3. Export everything
```typescript
export interface NarrativeSectionProps { /* ... */ }
export const buildNarrativeDraft = ...
export const formatShareableDraft = ...
// ... etc
```

### 4. Update ChatClient imports
```typescript
// Add at top:
import {
  buildNarrativeDraft,
  formatShareableDraft,
  stripPersonaMetadata,
  // ... all exports from raven-narrative
} from '@/lib/raven-narrative';

// Remove function definitions from ChatClient (they're now imported)
```

### 5. Test
```bash
npm run dev
# Browser: send message → verify narrative displays correctly
# Check console: no import errors, no undefined functions
```

### 6. Create PR
```bash
git add lib/raven-narrative.ts
git add components/ChatClient.tsx
git commit -m "[PHASE1] Extract raven-narrative.ts – move narrative building & formatting to lib"
git push origin phase1/split-narrative
# Create PR on GitHub
```

---

## Why This Order?

**Tasks 1–4 are pure functions** (no React, no side effects) → LOW RISK
- Easy to test independently
- No async boundaries
- Can land fast

**Tasks 5–6 are React hooks** (state, effects, callbacks) → MEDIUM RISK
- More complex error handling
- Async logic (file I/O, network)
- Needs more testing

**Task 7 is cleanup** (just imports) → LOW RISK
- No new logic
- Verification only

---

## Key Principles

✅ **Land incrementally**
- One task = one PR = one review cycle
- Don't wait for all 7; land as you go
- Main stays green

✅ **Test thoroughly**
- Unit tests for pure functions (Tasks 1–4)
- Mockable hooks for React logic (Tasks 5–6)
- Manual browser testing after each PR

✅ **Avoid circular imports**
- Pure libs (Task 1–4) never import React components
- React hooks (Tasks 5–6) can import pure libs
- Component imports at top of ChatClient

✅ **Measure progress**
- After Task 1: ChatClient -250 lines
- After Task 2: ChatClient -250-150 = -400 total
- After Task 7: ChatClient 3042 - 1670 = 1372 → 800 after cleanup

---

## Common Issues & Fixes

**"Cannot find module raven-narrative"**
- Check: file created at `lib/raven-narrative.ts` (not `src/lib/`)
- Check: export statement uses `export const`
- Check: import uses `@/lib/raven-narrative`

**"Circular dependency detected"**
- Never import React components into `lib/raven-*`
- Never import hooks into pure lib files
- Check import chain with `npm ls` or IDE

**"Function used in multiple places, only extracted one"**
- grep for function name: `grep -n "functionName" components/ChatClient.tsx`
- If still appears in ChatClient, didn't remove the definition
- Solution: remove original definition after export is working

**"Tests failing after extraction"**
- Verify function behavior didn't change
- Check types match original (esp. optional vs required)
- If logic changed, check diff carefully

---

## Useful Commands

```bash
# Check line count progress
wc -l components/ChatClient.tsx

# Verify imports are working
npm run dev

# Run type check
npx tsc --noEmit

# Search for remaining instances
grep -n "buildNarrativeDraft" components/ChatClient.tsx

# Create new feature branch for Task N
git checkout -b phase1/split-formatting
```

---

## When to Call For Help

🚩 **Circular import detected** → Stop, don't push
🚩 **Syntax errors after extraction** → Check parentheses, semicolons
🚩 **Function behavior changed** → Review diff carefully
🚩 **Tests failing** → Verify mocks, compare original vs extracted

Otherwise: land the PR and move to next task.

---

## Phase 1 Progress Template

```markdown
## Phase 1 Progress
- [x] Task 1: raven-narrative.ts – PR #NNN
- [ ] Task 2: raven-formatting.ts
- [ ] Task 3: report-parsing.ts
- [ ] Task 4: useValidation.ts
- [ ] Task 5: useFileUpload.ts
- [ ] Task 6: useRavenRequest.ts
- [ ] Task 7: ChatClient cleanup
- [ ] Integration test

**Lines saved so far:** 250 / 1,670
**ChatClient size:** 2,792 / 800 target
```

---

## Ready? Start Task 1

```bash
cd /Users/dancross/Documents/GitHub/WovenWebApp
git checkout -b phase1/split-narrative
touch lib/raven-narrative.ts
# ... copy functions from ChatClient.tsx
```

Good luck! 🚀

