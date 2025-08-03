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

## Quick Checklist Before Each Update

- [ ] Update CHANGELOG.txt with details of the change.
- [ ] Ensure dependencies are up-to-date.
- [ ] Test for errors and validate user flows.
- [ ] Clean up unused files and double-check .env handling.
- [ ] Commit with a clear, descriptive message.

---

## Troubleshooting Tips

- **App not working?**  
  - Check CHANGELOG.txt for recent changes.
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
