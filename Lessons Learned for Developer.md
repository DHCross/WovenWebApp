# Lessons Learned for Developer

_Last updated: 2025-11-09_

---

## Circular Dependencies: The Silent Killer in Refactoring

**Date:** 2025-11-09

### The Problem

During modular refactoring, introduced a circular dependency that broke all local development but worked fine in production:

```
astrology-mathbrain.js → orchestrator.js → validation.js → astrology-mathbrain.js
```

**Symptoms:**
- Error: `Cannot read properties of undefined (reading 'info')`
- All API requests returned 503 "temporarily unavailable"
- Production worked fine (compiled modules cached the dependency graph)
- Dev environment crashed immediately

### Root Cause

`validation.js` was importing `logger` from the monolith file that itself imported validation:

```javascript
// BAD - Creates circular dependency
const { parseCoordinates, logger } = require('../../lib/server/astrology-mathbrain');
const { normalizeTimezone } = require('./utils/time-and-coords');
```

During module initialization in dev mode, Node.js couldn't resolve the cycle, leaving `logger` as `undefined`.

### The Fix

Consolidated all imports to use the utility module directly:

```javascript
// GOOD - Clean dependency flow
const { normalizeTimezone, logger, parseCoordinates } = require('./utils/time-and-coords');
```

### Prevention Checklist

When refactoring large files into modules:

1. **Map dependency flow FIRST** - Draw arrows showing which modules import which
2. **Enforce one-way imports** - If A imports B, B should never import A (directly or indirectly)
3. **Use orchestrator correctly** - Modules import FROM orchestrator, never create loops THROUGH it
4. **Test in dev mode** - Production caching can hide circular dependencies
5. **Audit all require() statements** - Look for `require('../../')` patterns that might loop back
6. **Use static analysis** - Tools like `madge` can detect circular dependencies:
   ```bash
   npx madge --circular --extensions js ./src
   ```

### Key Insight

**Production worked because:** Webpack/Next.js build process resolves and caches the dependency graph at compile time, masking the circular reference.

**Dev broke because:** Node.js module loader resolves dependencies dynamically during `require()` calls, exposing the cycle immediately.

### When Refactoring Modules

- ✅ Extract shared utilities to dedicated files (like `time-and-coords.js`)
- ✅ Have modules import from utilities, not from each other
- ✅ Use orchestrator as a central export hub, not a dependency bridge
- ❌ Never import from a file that transitively imports you back
- ❌ Don't import from the monolith when extracting from it

### Quick Test

After any refactoring that changes imports:

```bash
# Test module loads cleanly
node -e "require('./src/math-brain/validation.js')"

# Check for circular dependencies
npx madge --circular src/
```

---

## BrowserStack Bug Capture Extension — Best Practices

I installed the extension called **"BrowserStack Bug Capture: Report & resolve bugs faster"** and it is excellent. Here are key takeaways for developers, especially when your functions primarily use Fetch:

### Export Options

- **Copy as Fetch:**
  - Gives you a ready-to-paste JavaScript `fetch()` call (including headers, method, and body).
  - Perfect for testing, debugging, or duplicating requests in browser console, Node.js, or frameworks like React/Next.js.
  - Most readable and directly usable in code since your app logic likely calls `fetch()`.

- **Copy as HAR (HTTP Archive):**
  - Exports a JSON object that describes all network requests, responses, timings, and metadata.
  - Best for broader diagnostics, sharing with QA, or importing into web debugging tools (like Chrome DevTools, Postman, or external bug trackers).
  - Useful if you want to analyze entire sessions or share with someone who needs comprehensive details, not just a single request.

### Quick Reference Table

| Use Case                   | Recommended Export |
|----------------------------|-------------------|
| Debug/fix single request   | Fetch             |
| Share snippet with devs    | Fetch             |
| Analyze entire session     | HAR               |
| Submit to bug tracker      | HAR               |
| Import to test tools       | HAR               |

### Summary
- For everyday function testing, code tweaks, and developer collaboration: **Copy as Fetch**.
- For complete network analysis or formal bug reports: **Copy as HAR**.

---

_Reference: [BrowserStack Bug Capture Workspace](chrome-extension://mdplmiioglkpgkdblijgilgebpppgblm/localSession.html#/workspaces/24875dd8-1aff-43ea-a3ed-a87a71773b9b/collections/6bdb3660-4adb-49e0-87df-19377fe7967c?sessionId=-a3ePe1So7KPEAapUZaNU7l8Us01MN9Wm0PnwkaIz4tO&mediaType=Screenshot&consolePaneHiddenGroups=Network+Error&requestId=1214457097)_


---

## How to Use “Copy to Fetch” in Local Recording – Bug Capture Extension

Step-by-step instructions for finding and using the “Copy to Fetch” option:

1. **Open the Extension Session**  
  - Click on the bug capture extension icon in your browser and navigate to your relevant session or recording.

2. **Access Session Details**  
  - In the session workspace interface, browse to the collection or recording you are working with.

3. **Select a Screenshot or Request**  
  - Click on a specific screenshot, request, or console entry in your recording timeline or session list.

4. **Find the “Copy to Fetch” Option**  
  - Locate the toolbar or row of icons at the top or side of the detail view.  
  - Look for a menu item, button, or icon labeled “Copy to Fetch.” This may be visible directly, or found within a “More actions” (⋮ or …) dropdown menu.

5. **Copy the Request**  
  - Click on “Copy to Fetch.”  
  - The relevant network request, properly formatted as a Fetch API snippet, will be copied to your clipboard for easy pasting into your code editor or notes.

**Tips:**
- Hover over icons for tooltips.
- Right-click for context menus.
- Check overflow (“...”) menus if not immediately visible.
- Make sure you have a network request selected.

These steps should help you reliably find and use the “Copy to Fetch” function. If you want screenshots or further customization, note what you’d like to explain or highlight.

---

## Testing the Snapshot Feature (Math Brain)

As Codex continues to refactor and split apart Math Brain, here is the workflow (developed with Claude) for testing the new Snapshot feature:

### Test the Snapshot Feature Now!

Go to: http://localhost:3000/math-brain

#### Test Steps:
1. Toggle **"Include Transits"** ON (required for snapshot)
2. Fill in Person A details (or use defaults)
3. (Optional) Toggle **"Include Person B"** for relational snapshot
4. Click ⭐ **"Snapshot this Symbolic Moment"**
5. Allow location access when browser prompts

#### Watch the magic:
- Date changes to TODAY automatically
- Location captured
- Relocated chart appears with Woven Map domains!

#### What You Should See:
**Before Click:**
  - ✨ Solo Mirror Snapshot (or Relational if Person B enabled)
  - ⭐ Snapshot this Symbolic Moment
  - ℹ️ Clicking snapshot will set date to TODAY and capture the current moment

**After Click:**
  - ⭐ Solo Mirror Snapshot
  - 🕐 Symbolic Moment: Oct 4, 4:30 PM
  - 📍 [Your coordinates]
  - Person A - Woven Map Domains
    - Self (H1): [planets]
    - Connection (H2): [planets]
    - Growth (H3): [planets]
    - Responsibility (H4): [planets]

### 🔐 Local Auth Toggle (Quick Fix)
- If the Math Brain landing page keeps showing "Continue with Google" on localhost, add `NEXT_PUBLIC_ENABLE_AUTH=false` to your `.env` (or `.env.local`) and restart `netlify dev`. This bypasses Auth0 for local-only testing.
- When you need to exercise the full Auth0 + auto-exec flow, flip the flag back to `true`, ensure real `AUTH0_*` values are set, and restart the dev server so `/api/auth-config` is reachable.

### 🔒 Re-enabling Auth Later
When you want to enable Auth0 again, either:
- Delete `.env.local`, or
- Change `NEXT_PUBLIC_ENABLE_AUTH=true` and add your Auth0 credentials

The snapshot feature is fully functional and ready to test without authentication!

---

## Netlify Dev + Workflow Pillars

Recent conversations reinforced the four pillars that keep Poetic Brain development stable under the Netlify/Next.js stack.

1. **Strategic AI Workflows**
   - Treat AI assistants (Copilot, Claude, GPT-5) as partners that still need verification via logs, network payloads, or docs.
   - Choose models by task: GPT-5/o3 or Claude Opus 4/4.1 for deep debugging/architecture, mini variants for quick triage, and Gemini 2.5 Pro when you need to reason over screenshots or diagrams.
   - Feed rich context: break complex requests into pieces, use custom instructions (e.g., `.github/copilot-instructions.md`), enforce conventions, and extend context via MCP resources when possible.

2. **Git Hygiene**
   - Work in feature branches, stage thoughtfully with `git add --patch`, and keep commits atomic with clear “what and why” messaging.
   - Clean up local history via `git rebase -i` before sharing (without rebasing already-pushed commits) and prefer squash-and-merge to avoid noisy master history.

3. **Debugging Environment**
   - Keep a tight feedback loop inside VS Code (or similar) to use built-in Git, browser debugging, and integrated AI tooling.
   - Use real ground truth (logs, HARs, devtools) for config issues, and understand port conflicts like `EADDRINUSE` instead of replacing the shared environment.

4. **API & Deployment Best Practices**
   - Follow external API contract details (headers, keys, hostnames) rather than guessing.
   - Always run `netlify dev` on `http://localhost:8888` during development: it proxies Netlify functions under `/.netlify/functions/*`, keeps Auth0 callbacks aligned with the saved origin, and ensures Poetic Brain and other serverless routes remain reachable.
   - Keep documentation (Changelog, lessons, error histories) updated so repeated problems become easier to diagnose.

Together these practices protect the Auth0 flows, Netlify Functions, and Poetic Brain experiences while keeping work aligned with the deployed stack.
