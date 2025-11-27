# Poetic Brain Review - Nov 2025

## 1. Executive Summary
The Poetic Brain is a "Two-Brain" system designed to bridge deterministic astrology (Math Brain) with generative narrative (Raven Calder). The architecture is sound in principle, leveraging a "Field -> Map -> Voice" protocol. However, it faces critical scalability and robustness issues in its current serverless implementation, primarily due to in-memory session state management.

## 2. Architecture Overview
*   **Protocol:** `FIELD` (Math Brain Data) -> `MAP` (Geometric Pattern) -> `VOICE` (Narrative Interpretation).
*   **Orchestrator:** `app/api/raven/route.ts`. This is the central nervous system, handling intent detection, auto-execution logic, and LLM dispatch.
*   **LLM Provider:** Perplexity AI (`sonar-pro`) via `lib/llm.ts`.
*   **Frontend:** `components/ChatClient.tsx` (and associated hooks like `useRavenRequest`).

## 3. Key Findings

### A. Session State Fragility (Critical)
The system uses an in-memory `Map` for session storage in the API route:
```typescript
// app/api/raven/route.ts
const sessions = new Map<string, SessionSSTLog>();
```
**Impact:** In a serverless environment (Netlify/Next.js), this memory is ephemeral. Sessions will be lost whenever the serverless function container recycles or scales. This breaks long-running conversations, context retention, and the "Resonance" (SST) tracking features.
**Recommendation:** Move session state to a persistent store (Redis, Postgres, or even a robust cookie/JWT payload if size permits) or adopt a fully stateless strategy where the client manages the full context.

### B. Dual Route Redundancy & Confusion
Two API routes exist with overlapping logic:
1.  **`app/api/raven/route.ts`:** The active, authoritative handler used by `ChatClient`. It supports the "Auto-Execution" plans and structured outputs.
2.  **`app/api/chat/route.ts`:** An alternative route that supports streaming but appears unused by the main `ChatClient`. It contains sophisticated "Natural Follow-Up" logic and "Mirror Directive" processing that is not present in the main `raven` route.
**Impact:** Code duplication and potential confusion. Valuable logic in `chat/route.ts` (streaming, follow-up flow) is stranded.
**Recommendation:** Consolidate logic. Deprecate `chat/route.ts` but migrate its streaming capabilities and "Natural Follow-Up" logic into `raven/route.ts`.

### C. Latency & Streaming
The current `raven` route waits for the full LLM completion before responding:
```typescript
// app/api/raven/route.ts
const reply = await callPerplexity(prompt, ...); // Blocking
```
**Impact:** This creates a "hanging" UI state where the user waits 5-10+ seconds for a response without feedback.
**Recommendation:** Refactor `raven/route.ts` and `ChatClient` to support `TextEncoder`/`ReadableStream` (NDJSON) for immediate token streaming, improving perceived performance.

### D. Auto-Execution Excellence
The `deriveAutoExecutionPlan` logic in `raven/route.ts` is a standout feature. It seamlessly identifies report types (Solo, Relational, Parallel) from uploaded JSONs and configures the session without user intervention. This effectively implements the "Drop & Go" seamlessness goal.

## 4. User Experience
*   **Flow:** The transition from `Idle` -> `Upload` -> `Report Mode` is smooth and well-indicated by the UI.
*   **Agency:** The "Symbolic Resonance Protocol" (SST) validation system (WB/ABE/OSR buttons) is well-integrated, giving users agency to correct the model.
*   **Visuals:** Clear mode badges and status updates keep the user oriented.

## 5. Next Steps
To harden the system for production:
1.  **Persistence:** Replace the in-memory `sessions` Map.
2.  **Streaming:** Refactor `raven/route.ts` to stream responses.
3.  **Consolidation:** Merge the useful parts of `chat/route.ts` into `raven/route.ts` and delete the dead route.
