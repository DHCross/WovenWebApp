# Phase 1 Execution Plan – Task Breakdown

## Overview
Split 3,042-line ChatClient.tsx into 6 focused submodules + 800-line root.

**Order:** Pure functions first (low risk), React hooks last (medium risk).

---

## Task 1: Extract `lib/raven-narrative.ts`
**Risk:** LOW | **Lines Saved:** ~250 | **Duration:** 2–3 hours

### Extraction Checklist
- [ ] Create `lib/raven-narrative.ts`
- [ ] Copy functions:
  - `buildNarrativeDraft()`
  - `formatShareableDraft()`
  - `renderNarrativeSection()`
  - `FieldSection()`, `MapSection()`, `VoiceSection()`
  - `coalesceSegments()`
  - `ensureParagraph()`
  - `formatAppendixHighlights()`
  - `stripPersonaMetadata()`
  - `removeCitationAnnotations()`
  - `ensureSentence()`
- [ ] Copy types/interfaces:
  - `NarrativeSectionProps`
  - `RavenSessionExport`
- [ ] Export all functions
- [ ] Update ChatClient imports
- [ ] Verify no compilation errors
- [ ] Manual test: message rendering, draft display
- [ ] Create PR

### Verification
```bash
npm run dev  # Should not show errors
# Test in browser: send message, verify narrative displays
```

---

## Task 2: Extract `lib/raven-formatting.ts`
**Risk:** LOW | **Lines Saved:** ~150 | **Duration:** 2–3 hours

### Extraction Checklist
- [ ] Create `lib/raven-formatting.ts`
- [ ] Copy functions:
  - `formatIntentHook()`
  - `formatClimate()`
  - `containsRepairValidation()`
  - `containsInitialProbe()`
  - `getPingCheckpointType()`
  - `formatFriendlyErrorMessage()`
  - `extractBalanceMeterSummary()`
  - `formatBalanceMeterSummaryLine()`
- [ ] Copy types:
  - `BalanceMeterSummary`
- [ ] Copy constants:
  - None (all used locally in functions)
- [ ] Export all
- [ ] Update ChatClient imports
- [ ] Verify no compilation errors
- [ ] Manual test: error messages display, climate shows correctly
- [ ] Create PR

### Verification
```bash
npm run dev  # Should not show errors
# Test in browser: trigger error, verify message; check climate display
```

---

## Task 3: Extract `lib/report-parsing.ts`
**Risk:** LOW | **Lines Saved:** ~200 | **Duration:** 3–4 hours

### Extraction Checklist
- [ ] Create `lib/report-parsing.ts`
- [ ] Copy functions:
  - `parseReportContent()`
  - `detectReportMetadata()`
  - `mapRelocationToPayload()`
  - `coerceNumericValue()`
  - `containsResonanceMarkers()`
- [ ] Copy types/interfaces:
  - `ParseOptions`
  - `ParsedReportContent`
  - `ReportMetadata`
- [ ] Copy constants:
  - `RESONANCE_MARKERS`
  - `MIRROR_SECTION_ORDER`
  - `WEATHER_ONLY_PATTERN`
  - `ASTROSEEK_GUARD_SOURCE`, `ASTROSEEK_GUARD_DRAFT`
  - `NO_CONTEXT_GUARD_SOURCE`, `NO_CONTEXT_GUARD_DRAFT`
- [ ] Export all
- [ ] Update ChatClient imports
- [ ] Verify no compilation errors
- [ ] **Add unit tests:**
  - `parseReportContent()` with various inputs (AstroSeek, Mirror, relocation)
  - `detectReportMetadata()` with various report types
  - `containsResonanceMarkers()` edge cases
- [ ] Manual test: upload report (AstroSeek, Mirror), verify parsing
- [ ] Create PR with tests

### Verification
```bash
npm run dev  # Should not show errors
npm test -- lib/report-parsing.ts  # All tests pass
# Test in browser: upload AstroSeek report, Mirror directive; verify parsed correctly
```

---

## Task 4: Create `hooks/useValidation.ts`
**Risk:** LOW | **Lines Saved:** ~100 | **Duration:** 2 hours

### Extraction Checklist
- [ ] Create `hooks/useValidation.ts`
- [ ] Check `lib/validation/validationUtils.ts` for existing exports
- [ ] If `validationReducer` exists there, import + re-export
- [ ] If missing, copy from ChatClient (ensure it's there)
- [ ] Create hook wrapper:
  ```typescript
  export const useValidation = () => {
    const [validationState, dispatchValidation] = useReducer(validationReducer, initialState);
    return { validationState, dispatchValidation };
  };
  ```
- [ ] Export types: `ValidationState`, `ValidationPoint`
- [ ] Update ChatClient to use this hook instead of direct state + reducer
- [ ] Verify no compilation errors
- [ ] Create PR

### Verification
```bash
npm run dev  # Should not show errors
# Test in browser: send message with validation points, verify display
```

---

## Task 5: Extract `components/ChatClient/useFileUpload.ts`
**Risk:** MEDIUM | **Lines Saved:** ~150 | **Duration:** 4–5 hours

### Extraction Checklist
- [ ] Create `components/ChatClient/useFileUpload.ts`
- [ ] Extract `handleFileChange()` callback
- [ ] Create custom hook:
  ```typescript
  export const useFileUpload = (
    onSuccess: (result: FileUploadResult) => void,
    onError: (message: string) => void,
    onStatus: (message: string) => void,
  ) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const handleFileChange = useCallback(async (event) => { /* ... */ });
    return { handleFileChange, isProcessing };
  };
  ```
- [ ] Move file size constants:
  - `MAX_PDF_SIZE`
  - `MAX_TEXT_SIZE`
- [ ] Move PDF.js extraction logic
- [ ] **Add unit tests:**
  - File size validation (oversized file rejected)
  - PDF extraction (valid PDF processed)
  - Text file parsing
  - Error handling (corrupt file)
- [ ] Update ChatClient to use hook
- [ ] Verify no compilation errors
- [ ] Manual test: upload various files (PDF, JSON, text)
- [ ] Create PR with tests

### Verification
```bash
npm run dev  # Should not show errors
npm test -- useFileUpload.ts  # All tests pass
# Test in browser: upload 55MB file → error; upload 10MB JSON → success
```

---

## Task 6: Extract `hooks/useRavenRequest.ts`
**Risk:** MEDIUM | **Lines Saved:** ~120 | **Duration:** 4–5 hours

### Extraction Checklist
- [ ] Create `hooks/useRavenRequest.ts`
- [ ] Move `fetchWithRetry()` function (or create wrapper)
- [ ] Extract `runRavenRequest()` callback
- [ ] Create custom hook:
  ```typescript
  export const useRavenRequest = (
    onSuccess: (data: RavenDraftResponse) => void,
    onError: (message: string) => void,
  ) => {
    const [isLoading, setIsLoading] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    const request = useCallback(async (payload) => {
      // Move runRavenRequest logic here
    }, [onSuccess, onError]);

    const abort = useCallback(() => { abortRef.current?.abort(); }, []);

    return { request, isLoading, abort };
  };
  ```
- [ ] Move AbortController logic
- [ ] Move error message formatting for network errors
- [ ] **Add unit tests:**
  - Successful request flow
  - Network error → retry → success
  - Abort signal handling
  - Timeout handling
  - JSON parse error
- [ ] Update ChatClient to use hook
- [ ] Verify no compilation errors
- [ ] Manual test: send message, verify response; simulate network error
- [ ] Create PR with tests

### Verification
```bash
npm run dev  # Should not show errors
npm test -- useRavenRequest.ts  # All tests pass (including retry logic)
# Test in browser: normal message, verify response; devtools throttle network → test retry
```

---

## Task 7: Simplify `components/ChatClient.tsx`
**Risk:** LOW (cleanup only) | **Lines Saved:** ~1,500+ | **Duration:** 2–3 hours

### Cleanup Checklist
- [ ] Remove all extracted function definitions
- [ ] Remove all extracted hook implementations
- [ ] Add imports from 6 new modules
- [ ] Update state declarations to use new hooks
- [ ] Simplify callbacks to be pure orchestrators (no business logic)
- [ ] Verify all `useState`, `useCallback`, `useRef` count drops significantly
- [ ] Run linter, fix any unused vars
- [ ] Verify no compilation errors
- [ ] Line count should be ~800–900
- [ ] Manual test: full chat session (upload, send messages, validation, export)
- [ ] Create PR

### Verification
```bash
wc -l components/ChatClient.tsx  # Should be ~800–900
npm run dev  # Should not show errors
# Test in browser: full session (upload report, send messages, export, reset)
```

---

## Final Integration Test
**Risk:** LOW | **Duration:** 1–2 hours

After all 7 PRs land:

- [ ] Build production CSS: `npm run build:css`
- [ ] Full test on `main`:
  - [ ] Math Brain: upload report, generate exports (PDF, JSON, Field Map)
  - [ ] Poetic Brain: upload contexts, send messages, verify responses
  - [ ] Validation: trigger validation points, verify display
  - [ ] Error paths: send invalid input, verify error handling
  - [ ] File upload: test all file types + oversized file
  - [ ] Network: throttle connection, verify retries work
- [ ] Code review with team
- [ ] Document any issues found (for Phase 2/3)
- [ ] Merge to `main` if all pass

---

## Rollback Plan

If any extraction breaks in production:

1. Revert the specific PR that caused the issue
2. Investigate root cause (usually circular import or missing fallback)
3. Fix in new branch, land separately
4. Other extractions can continue independently

---

## Timeline

| Task | Est. Time | Status |
|------|-----------|--------|
| 1. raven-narrative.ts | 2–3h | ⏳ |
| 2. raven-formatting.ts | 2–3h | ⏳ |
| 3. report-parsing.ts | 3–4h | ⏳ |
| 4. useValidation.ts | 2h | ⏳ |
| 5. useFileUpload.ts | 4–5h | ⏳ |
| 6. useRavenRequest.ts | 4–5h | ⏳ |
| 7. ChatClient cleanup | 2–3h | ⏳ |
| **Total** | **19–27h** | **~3–4 days** |

---

## Success Criteria

✅ Phase 1 complete when:
1. All 7 tasks done
2. ChatClient.tsx: ~800–900 lines (down from 3,042)
3. All tests passing (unit + manual)
4. No regressions in existing features
5. Code compiles with no errors (only console.error ESLint warnings acceptable)
6. Team confidence: "I can now work on Poetic Brain without fear of breaking things"
