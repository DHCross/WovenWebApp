Here’s a comprehensive list of the logic and code paths involved in a **Raven Calder Poetic Brain Reading** in WovenWebApp, based on your project structure, documentation, and conventions:

---

## 1. **User Flow & Entry Points**

- **/chat Route**
  - User must be authenticated (gated by `RequireAuth`).
  - Entry via App Router: page.tsx (or similar).

---

## 2. **Frontend Logic**

- **Chat UI Component**
  - Located in chat (e.g., page.tsx, `app/chat/components/ChatPanel.tsx`).
  - Handles user input, displays conversation, manages session state.
  - On message send:
    - Calls internal API route (`/api/raven` or `/api/poetic-brain`).

- **Report Upload/Selection**
  - User can upload or select a Math Brain report.
  - Report context is stored in session or local state.

---

## 3. **API Integration**

- **API Route**
  - Next.js API route: route.ts or route.ts (may also be a Netlify function in functions).
  - Receives POST requests with:
    - User message
    - (Optional) Math Brain report context

- **API Handler Logic**
  - Validates authentication (checks session/JWT).
  - Validates input (message, report context).
  - Handles error cases (missing keys, malformed input).

---

## 4. **Report Context Handling**

- **Report Context Extraction**
  - If a Math Brain report is present, extracts:
    - Symbolic weather (FIELD)
    - Structural patterns (MAP)
    - Any user-uploaded context
  - May use helpers from raven-lite-mapper.js or seismograph.js to format or summarize.

---

## 5. **Prompt Construction**

- **Prompt Builder**
  - Constructs a prompt for the LLM (Perplexity API) using:
    - User message
    - Math Brain report summary/context
    - Raven Calder “VOICE” system (narrative synthesis)
    - System instructions (e.g., “Respond as Raven Calder, poetic, non-deterministic, geometry-first”)
  - Ensures FIELD → MAP → VOICE flow is preserved.

---

## 6. **External API Call**

- **Perplexity API Integration**
  - Uses `PERPLEXITY_API_KEY` from environment (.env.local or Netlify dashboard).
  - Sends constructed prompt to Perplexity API endpoint.
  - Handles API errors (401, 500, timeouts, etc.) gracefully.

---

## 7. **LLM Response Handling**

- **Response Parsing**
  - Receives LLM output (poetic/narrative text).
  - May post-process for formatting, markdown, or UI safety.
  - Handles fallback if LLM fails (shows in-character error message).

---

## 8. **Frontend Rendering**

- **Display in Chat UI**
  - Renders Raven’s response in the chat window.
  - Applies narrative formatting (paragraphs, markdown, etc.).
  - May update session state with new context or follow-up options.

---

## 9. **Feedback & Interaction**

- **User Feedback Buttons**
  - UI allows user to rate or respond to the reading (e.g., “Yes, resonates”, “No, doesn’t fit”).
  - Feedback may be logged or used to refine future prompts.

---

## 10. **Error Handling & Logging**

- **Frontend**
  - Shows friendly, in-character error messages if API or LLM fails.
- **Backend**
  - Logs errors with context (never exposes secrets).
  - Returns standard error JSON if needed.

---

## 11. **Testing & Compliance**

- **Unit/E2E Tests**
  - Test chat API routes, prompt construction, and error paths.
- **Compliance**
  - Ensures no deterministic claims, preserves FIELD → MAP → VOICE, and follows privacy/security rules.

---

### **Summary Table**

| Step                | Path/Module(s)                                      | Description                                  |
|---------------------|-----------------------------------------------------|----------------------------------------------|
| Entry               | `/chat` (App Router)                                | User lands on chat page                      |
| UI                  | page.tsx, components                     | Handles input, displays conversation         |
| API Route           | route.ts or Netlify function        | Receives chat requests                       |
| Context Extraction  | raven-lite-mapper.js, seismograph.js    | Extracts/structures Math Brain report        |
| Prompt Build        | API handler, helpers                                | Builds LLM prompt with FIELD→MAP→VOICE       |
| LLM Call            | Perplexity API via `PERPLEXITY_API_KEY`             | Sends prompt, receives poetic response       |
| Response Handling   | API handler, UI                                     | Parses, formats, and displays response       |
| Feedback            | Chat UI feedback buttons                            | User rates or responds to reading            |
| Error Handling      | API + UI                                            | Friendly errors, logs, standard JSON         |
| Testing             | E2E/unit tests, compliance docs                     | Ensures flow and output integrity            |
