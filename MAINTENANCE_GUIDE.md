# Woven Map App: Best Practices & Maintenance Guide

This document outlines the best practices for maintaining, updating, and troubleshooting the Woven Map App. Follow these guidelines to ensure smooth operation, easy collaboration, and reliable diagnostics.

---

## 1. **Changelog & Error History**

- **Keep a CHANGELOG.txt in the root directory.**
  - Log every update, fix, break, or recommendation.
  - Use a standardized format: `[YYYY-MM-DD HH:MM] [TYPE: BREAK/FIX/CHANGE/UPDATE] Description`.
  - Include enough detail for future reference and debugging.

## 2. **Dependency Management**

- **Regularly audit and update dependencies (e.g., npm packages).**
  - Outdated dependencies can introduce security risks and bugs.
  - After updates, test thoroughly to check for breaking changes.

## 3. **Environment Variables & API Keys**

- **Always use environment variables for secrets (e.g., RAPIDAPI_KEY).**
  - Never commit API keys or secrets to source control.
  - Keep an `.env.example` file with placeholder values for onboarding.

## 4. **File Organization & Cleanliness**

- **Keep the file structure simple and decluttered.**
  - Remove unused or obsolete files regularly.
  - Place important files like README.md, CHANGELOG.txt, and LICENSE.txt in the root directory.

## 5. **Configuration & Build Scripts**

- **Ensure configuration files (e.g., tailwind.config.js, tsconfig.json) are up-to-date.**
  - Scripts in `package.json` should allow easy build, development, and testing workflows.
  - Example:
    - `npm run build:css` for production CSS
    - `npm run dev:tailwind` for live preview

## 6. **Error Handling & Validation**

- **Implement robust error handling in serverless functions and front-end code.**
  - Show clear, actionable error messages to users.
  - Validate user inputs (dates, coordinates) before making API requests.

## 7. **Documentation**

- **Keep README.md and best-practices guides up-to-date.**
  - Include setup instructions, troubleshooting tips, and a glossary of key system terms.
  - Make onboarding and collaboration easy for new contributors.

## 8. **Version Control**

- **Commit frequently and with descriptive messages.**
  - Each commit should document the "why" as well as the "what" for traceability.
  - Use branches for major changes; keep `main` stable.

## 9. **Testing & Review**

- **Test locally before deploying.**
  - Use Netlify CLI for local development and API function testing.
  - Review the changelog before making new changes to avoid repeating past mistakes.

## 10. **Resonance-Driven Diagnostics (Woven Map Principle)**

- **Separate geometry computation (Math Brain) from narrative output (Poetic Brain).**
  - Only the user determines if a "ping" (resonance) occurs—never force a claim.
  - Use FIELD → MAP → VOICE framework for all outputs.

---

## 11. **Safe Lexicon System Maintenance**

**The app uses a safe lexicon system to ensure magnitude terms remain neutral while valence terms carry directional meaning.**

### **Key Functions to Maintain:**
- `toMagnitudeTerm(mag)` - Maps numeric values to neutral terms (Whisper, Pulse, Wave, Surge, Peak, Apex)
- `toValenceTerm(val)` - Maps numeric values to directional terms (Collapse...Liberation)
- `getValenceEmoji(val)` - Maps valence to emoji indicators (🌑 negative, 🌞 positive)
- `assertSafeMagnitudePhrase(text)` - Validates magnitude descriptions don't contain negative imagery

### **Validation & Safety:**
- `validateSafeLexicon()` runs on page load to ensure all mappings are complete
- Never use terms like "storm", "quake", "disaster", "tsunami" in magnitude contexts
- All magnitude language must be neutral (field intensity, not emotional charge)
- Directional charge belongs exclusively in valence terminology

### **Schema Version:**
- Current: WM-Chart-1.1 includes both numeric and term values
- When updating terms, consider schema version bump if breaking changes
- Legacy migration: `migrateMagnitudeTerm()` handles old term transitions

---

## 12. **Math Brain ↔ Poetic Brain Export Standards**

**Maintain strict separation between geometric data (Math Brain) and interpretive narrative (Poetic Brain).**

### **JSON Export Requirements:**
- **Pure data only:** Numbers, enums, glyphs, confidence scores
- **No prose:** Remove all narrative strings, titles, annotations  
- **Normalized values:** Valence clamped to -5 to +5 range
- **Enum consistency:** Use safe lexicon terms exclusively
- **Channel versioning:** Explicit v1.0/v1.1/v1.2 labels

### **Dual-Channel Architecture:**
- **Copy Button:** Markdown with full narrative (human-readable)
- **Download Button:** Clean JSON wrapper (machine-readable)
- **Reader Notes:** User annotations flow into JSON but remain separate from calculations

### **Key Functions to Monitor:**
- `buildRavenJsonReport()` - Must output prose-free geometric data only
- `buildTriad()` - Creates measurement triads (magnitude/valence/volatility)
- Export validation ensures Math Brain boundaries aren't violated

---

## 13. **Accessibility & UX Standards**

**Ensure inclusive design through proper ARIA implementation and keyboard support.**

### **Modal Best Practices:**
- Add `role="dialog"`, `aria-modal="true"`, proper labeling
- Focus management: focus content on open, restore focus on close
- Keyboard support: Escape key closes, tab navigation contained
- Click-outside-to-close behavior

### **Loading States:**
- Toggle `aria-busy` during processing operations
- Use `aria-live="polite"` for non-critical status updates
- Use `aria-live="assertive"` for error announcements
- Focus error displays when shown for immediate screen reader attention

### **Form Validation:**
- Real-time validation with `aria-live` feedback
- Clear error descriptions with `aria-describedby`
- Required field indication through proper labeling

---

## Quick Checklist Before Each Update

- [ ] Update CHANGELOG.md with details of the change.
- [ ] Ensure dependencies are up-to-date.
- [ ] Test for errors and validate user flows.
- [ ] Verify safe lexicon validation passes (check browser console for ✅).
- [ ] Check JSON exports contain no prose (only enums/numbers/glyphs).
- [ ] Test accessibility features (keyboard navigation, screen reader announcements).
- [ ] Clean up unused files and double-check .env handling.
- [ ] Commit with a clear, descriptive message.

---

## Troubleshooting Tips

- **App not working?**  
  - Check CHANGELOG.md for recent changes.
  - Verify API keys and environment variables.
  - Review error messages and validation logic.

- **Styling issues?**  
  - Rebuild CSS (`npm run build:css`).
  - Ensure all relevant files are included in `tailwind.config.js`.

- **API errors?**  
  - Check for outdated or missing dependencies.
  - Make sure the API key is present and correct.

---

By following these practices, you'll make the Woven Map App easier to maintain, more resilient to mistakes, and welcoming to collaborators.

---

## Balance Meter (v1.1) + SFD (v1.2) — Developer Notes

- Module: `src/balance-meter.js` (wired into engine, always on).
- Exports:
  - `computeBalanceValence(dayAspects): number` → normalized −5..+5 (rebalanced valence)
  - `computeSFD(dayAspects): { SFD, Splus, Sminus }` → all in −5..+5
- Input shape: array of aspect objects with fields commonly present in our pipeline:
  - `aspect|type|_aspect` (e.g., `trine`, `square`), `p1_name|transit|a`, `p2_name|natal|b`, `orb|orbit|_orb`
- Implementation follows Balance Meter.txt (v1.2 Draft): supportive vs counter sets, linear orb taper, symmetric sensitivity boosts, and tanh normalization.
- Engine emits WM‑Chart‑1.2 unconditionally with per‑day `balance`, `sfd`, `splus`, `sminus` adjacent to Seismograph metrics.
- Provenance fields added:
  - `meta.calibration_boundary: "2025-09-05"`
  - `meta.engine_versions: { seismograph: "v1.0", balance: "v1.1", sfd: "v1.2" }`
  - `meta.reconstructed: boolean` (true when requested date < boundary)
