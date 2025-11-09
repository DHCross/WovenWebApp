# Lessons Learned for Developer

_Last updated: 2025-10-04_

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
