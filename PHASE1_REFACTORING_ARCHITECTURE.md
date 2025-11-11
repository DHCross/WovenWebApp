# ChatClient Refactoring Architecture – Phase 1 (File Splitting)

## Current State
- **File:** `components/ChatClient.tsx`
- **Lines:** 3,042
- **Concerns:** 90+ functions/types, 30+ React hooks, rendering, validation, transport, file upload, state management
- **Problem:** Cognitive overload; hard to test; risky to modify; blocks Phase 2 & 3 work

---

## Target State
- **ChatClient.tsx:** ~800 lines (composition + state orchestration only)
- **Submodules:** Rendering, transport, uploads, validation (each 500–700 lines, independently testable)
- **Benefit:** Clearer ownership; parallel work; easier review and testing

---

## Phase 1 Split Plan

### 1. Extract: `lib/raven-narrative.ts` (Rendering & Draft Building)
**What:** All narrative/draft formatting logic
**Lines saved:** ~250

**From ChatClient:**
```typescript
// Move these functions:
- buildNarrativeDraft()
- formatShareableDraft()
- renderNarrativeSection()
- FieldSection(), MapSection(), VoiceSection()
- coalesceSegments()
- ensureParagraph()
- formatAppendixHighlights()
- stripPersonaMetadata()
- removeCitationAnnotations()
- ensureSentence()
```

**New exports:**
```typescript
export interface NarrativeDraftOutput {
  html: string;
  rawText: string;
}

export const buildNarrativeDraft = (
  draft?: Record<string, any> | null,
  prov?: Record<string, any> | null,
): NarrativeDraftOutput => { /* ... */ }

export const formatShareableDraft = (
  draft?: Record<string, any> | null,
): RavenSessionExport => { /* ... */ }

export const stripPersonaMetadata = (text: string): string => { /* ... */ }
```

**Dependencies:** None on React; no side effects
**Risk:** LOW (pure functions)

---

### 2. Extract: `lib/raven-formatting.ts` (Response Formatting & Metadata)
**What:** Climate, intent, hook, validation metadata formatting
**Lines saved:** ~150

**From ChatClient:**
```typescript
// Move these functions:
- formatIntentHook()
- formatClimate()
- containsRepairValidation()
- containsInitialProbe()
- getPingCheckpointType()
- formatFriendlyErrorMessage()
- detectReportMetadata()
- extractBalanceMeterSummary()
- formatBalanceMeterSummaryLine()
```

**New exports:**
```typescript
export const formatIntentHook = (intent?: Intent): string => { /* ... */ }
export const formatClimate = (climate?: ClimateData | string | null): string => { /* ... */ }
export const detectReportMetadata = (content: string): ReportMetadata => { /* ... */ }
```

**Dependencies:** None on React; imports from `lib/raven/` and climate utilities
**Risk:** LOW (pure functions)

---

### 3. Extract: `lib/report-parsing.ts` (File Parsing & Ingestion)
**What:** All file content parsing, metadata detection, payload extraction
**Lines saved:** ~200

**From ChatClient:**
```typescript
// Move these functions:
- parseReportContent()
- detectReportMetadata() [already noted above]
- mapRelocationToPayload()
- coerceNumericValue()
- extractBalanceMeterSummary() [already noted above]
- containsResonanceMarkers()

// Move these constants/patterns:
- RESONANCE_MARKERS
- MIRROR_SECTION_ORDER
- WEATHER_ONLY_PATTERN
- ASTROSEEK_GUARD_*
- NO_CONTEXT_GUARD_*
```

**New exports:**
```typescript
export interface ParsedReportContent {
  context: ReportContext;
  isMirror: boolean;
  relocation?: RelocationSummary | null;
}

export const parseReportContent = (
  rawContent: string,
  opts?: ParseOptions,
): ParsedReportContent => { /* ... */ }

export const detectReportMetadata = (content: string): ReportMetadata => { /* ... */ }
```

**Dependencies:** None on React; imports `RelocationSummary`, basic types
**Risk:** LOW (pure functions)

---

### 4. Extract: `components/ChatClient/useFileUpload.ts` (File Handling)
**What:** File upload, validation, PDF extraction
**Lines saved:** ~150 (plus simplification of error/status messaging)

**From ChatClient:**
```typescript
// Move this hook:
- handleFileChange() [refactored as useFileUpload hook]

// Keep close:
- File size validation (MAX_PDF_SIZE, MAX_TEXT_SIZE)
- PDF.js integration
- Error/status message updates
```

**New hook interface:**
```typescript
interface FileUploadResult {
  content: string;
  fileName: string;
  isPdf: boolean;
}

export const useFileUpload = (
  onSuccess: (result: FileUploadResult) => void,
  onError: (message: string) => void,
  onStatus: (message: string) => void,
) => {
  return {
    handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>,
    isProcessing: boolean,
  };
}
```

**Dependencies:** React only (useState, useCallback); PDF.js
**Risk:** MEDIUM (file I/O; worker thread management)

---

### 5. Extract: `hooks/useRavenRequest.ts` (Transport Logic)
**What:** Request/retry/error handling for `/api/raven`
**Lines saved:** ~120; will be Phase 3 source material

**From ChatClient:**
```typescript
// Move/refactor this hook:
- runRavenRequest() → becomes useRavenRequest hook
- fetchWithRetry() → moved here (or to RavenClient later)
- AbortController management
```

**New hook interface:**
```typescript
export const useRavenRequest = (
  onSuccess: (data: RavenDraftResponse) => void,
  onError: (message: string) => void,
) => {
  return {
    request: (payload: Record<string, any>) => Promise<RavenDraftResponse | null>,
    isLoading: boolean,
    abort: () => void,
  };
}
```

**Dependencies:** React hooks; `fetchWithRetry`; error handling logic
**Risk:** MEDIUM (network logic; abort signal management)

---

### 6. Extract: `components/ChatClient/hooks/useValidation.ts` (Validation State)
**What:** ValidationState reducer and validation logic (already exists elsewhere; consolidate here)
**Lines saved:** ~100

**From ChatClient (and from existing validation lib):**
```typescript
// Ensure here:
- validationReducer()
- useValidationState hook if missing
- Validation point parsing
- Repair validation detection
```

**Dependencies:** React; `lib/validation/`
**Risk:** LOW (consolidation, not new logic)

---

### 7. Remaining in `components/ChatClient.tsx` (~800 lines)
**What:** Root component + state orchestration only

**Stays:**
```typescript
// Root component
export default function ChatClient() {
  // State declarations (messages, contexts, session, etc.)
  const [messages, setMessages] = useState<Message[]>();
  const [reportContexts, setReportContexts] = useState<ReportContext[]>();
  // ... other state

  // Callbacks that orchestrate submodules
  const analyzeReportContext = useCallback(...) // coordinates validation + parsing
  const commitError = useCallback(...) // single source of truth for errors
  const applyRavenResponse = useCallback(...) // coordinates response + UI update

  // Imports from submodules
  import { buildNarrativeDraft } from '@/lib/raven-narrative'
  import { formatIntentHook } from '@/lib/raven-formatting'
  import { useFileUpload } from './ChatClient/useFileUpload'
  import { useRavenRequest } from '@/hooks/useRavenRequest'
  import { useValidationState } from '@/hooks/useValidation'

  // JSX: Render messages, input, file upload, etc.
  return (
    <div className="...">
      <MessageList messages={messages} />
      <FileUpload onChange={handleFileChange} />
      <MessageInput onSend={handleSend} />
    </div>
  )
}
```

---

## Phase 1 Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Main file lines** | 3,042 | ~800 |
| **Module clarity** | 9 concerns in 1 file | 1 concern per module |
| **Testing** | Hard (too many dependencies) | Easy (each module independent) |
| **Merge conflicts** | High (everyone touches ChatClient) | Low (changes isolated) |
| **Onboarding** | "Read 3K lines" | "Read 800 lines + specific module" |
| **Risk of change** | HIGH (touches everything) | LOW (isolated changes) |

---

## Phase 1 Implementation Strategy

### Step 1: Create new files (non-blocking)
```bash
mkdir -p components/ChatClient/hooks
mkdir -p lib/raven

touch lib/raven-narrative.ts
touch lib/raven-formatting.ts
touch lib/report-parsing.ts
touch components/ChatClient/useFileUpload.ts
touch hooks/useRavenRequest.ts
touch hooks/useValidation.ts
```

### Step 2: Extract in order (lowest → highest risk)
1. **raven-narrative.ts** (pure functions, no React)
2. **raven-formatting.ts** (pure functions, no React)
3. **report-parsing.ts** (pure functions, no React)
4. **useValidation.ts** (consolidation)
5. **useFileUpload.ts** (file I/O + React)
6. **useRavenRequest.ts** (network + React; test carefully)

### Step 3: Update ChatClient imports
- Remove extracted functions
- Add imports from new modules
- Simplify state management (delegate to hooks)

### Step 4: Test each extraction
```bash
# After each extraction:
npm run dev  # Check for compile errors
npm run build:css  # Verify styling still works
```

### Step 5: Land incrementally
- PR per extraction (keep review scope small)
- Enable CI checks (build, type check, lint)
- Test manually (chat, file upload, message rendering)

---

## Phase 1 Completion Checklist

- [ ] All pure functions extracted to `lib/`
- [ ] All React hooks extracted to `hooks/` and `components/ChatClient/hooks/`
- [ ] ChatClient.tsx reduced to ~800 lines
- [ ] All imports updated (no circular dependencies)
- [ ] Tests added for new modules (especially report-parsing.ts, useFileUpload.ts)
- [ ] Manual testing: chat, file upload, message display, validation
- [ ] No regression in existing features
- [ ] Documentation updated (README if needed)

---

## Phase 1 → Phase 2 Bridge

Once Phase 1 lands:

**Phase 2 Hardening (File Ingestion):**
```typescript
// In report-parsing.ts, add:

export const ALLOWED_EXTENSIONS = ['.json', '.pdf', '.txt', '.csv'];
export const ALLOWED_MIME_TYPES = [
  'application/json',
  'application/pdf',
  'text/plain',
  'text/csv',
];

export const validateFileSignature = (buffer: ArrayBuffer): boolean => {
  // Check magic bytes: PDF (25 50 44), JSON (7B), CSV/TXT (ASCII)
}

export const parseReportContent = async (
  rawContent: string,
  fileName: string,
  opts?: ParseOptions,
): Promise<ParsedReportContent> => {
  // Validate extension, MIME, signature
  // Then parse (existing logic)
}
```

**Phase 2 Worker Offload (in useFileUpload.ts):**
```typescript
const extractPdfWorker = new Worker('/pdf-worker.js');
extractPdfWorker.postMessage({ file: arrayBuffer });
extractPdfWorker.onmessage = (e) => setContent(e.data.text);
```

---

## Phase 1 → Phase 3 Bridge

Once Phase 1 lands and file upload is solid:

**Phase 3 Transport Service:**
```typescript
// Create: lib/services/RavenClient.ts

export class RavenClient {
  private static instance: RavenClient;

  static getInstance() {
    if (!this.instance) this.instance = new RavenClient();
    return this.instance;
  }

  async request(
    payload: Record<string, any>,
    opts?: { timeoutMs?: number; maxRetries?: number },
  ): Promise<RavenDraftResponse> {
    // Move runRavenRequest logic here
    // Add telemetry hooks
    // Add circuit breaker
  }

  addTelemetryListener(cb: (event: TelemetryEvent) => void) { /* ... */ }
}

// In ChatClient:
const ravenClient = RavenClient.getInstance();
const result = await ravenClient.request(payload);
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Circular deps | Use dependency graph analysis; land pure libs first |
| Missed refactoring | Use grep/AST scan to find all usages before extraction |
| Test gaps | Add unit tests for each extracted module before landing |
| Breaking change | Keep old ChatClient export as re-export wrapper initially |
| Performance | Profile before/after; no async boundary changes in Phase 1 |

---

## Timeline Estimate

- **Phase 1 (File Splitting):** 2–3 days (5–6 PRs, 1 per extraction)
- **Phase 2 (File Hardening):** 1–2 days (once Phase 1 is solid)
- **Phase 3 (Transport Service):** 1–2 days (once Phase 1 & 2 land)

---

## Success Metrics

✅ **Phase 1 complete when:**
- ChatClient.tsx: ~800 lines
- 6 new modules created and tested
- All functionality preserved
- No performance regression
- Code review cycle: 2–3 days per PR
- Team confidence: "I can now work on Poetic Brain without fear"
