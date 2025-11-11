# Frontend Instructions

These rules govern React UI code under the Next.js App Router (`app/`, `components/`, `hooks/`). Copilot must follow them when editing or generating frontend files.

## File & Naming Conventions
- Components belong in `components/` or the closest feature directory under `app/`.
- Use **PascalCase** filenames (e.g. `MirrorSummaryCard.tsx`).
- Export React **function components** only. Prefer explicit prop interfaces.
- Co-locate custom hooks in `hooks/` with `useSomething.ts` filenames when they are shared across components.

## Styling & Layout
- Tailwind CSS is the source of truth. Use utility classes instead of inline `style` objects.
- Shared design tokens live in `tailwind.config.js`; extend that file instead of hardcoding colors.
- Respect the dark theme. Reuse palette families already in use (`slate`, `indigo`, `emerald`).

## Data Flow & State Management
- Fetch data via helpers in `lib/` or Next.js route handlers; never call Netlify endpoints directly from components.
- Keep React hook dependency arrays accurate. Derive memoized values with `useMemo`/`useCallback` where needed.
- Every async action must surface loading and error UI states. Follow the toast pattern used in `components/ChatClient.tsx`.

## Accessibility & UX
- Ensure interactive elements have accessible labels and keyboard focus states.
- Copy must reflect Raven Calder tone: conversational, agency-first, zero determinism.
- Keep animations subtle (100–200 ms transitions). Avoid motion-heavy effects.

## Testing & Verification
- Update or add Jest tests in `__tests__/` for logical changes; use Playwright specs under `e2e/` for UI flows.
- Run `npm run lint` and `npm run test` before submitting changes.
- When touching shared layout/theme files, validate via `netlify dev` to confirm no regressions.
