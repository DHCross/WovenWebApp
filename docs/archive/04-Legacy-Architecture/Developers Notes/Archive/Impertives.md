Here’s a stripped-down list of the imperatives from the directions, pulled into one place so you can see the marching orders without the long rationale:

⸻

Imperatives for Balance Meter & Person B
	1.	Decide who owns / in dev
	•	Either keep static HTML at root and run Next at /chat, or delete/proxy the static file so Next fully owns /.
	2.	Unify interactivity under React state
	•	Person A/B selection is a single React state (activeSubject), not DOM hacks.
	•	Balance Meter vs Mirror is a single React state (appMode), not legacy tab scripts.
	3.	Remove or neutralize legacy scripts
	•	Eliminate any old switchTab()/document.getElementById(...).innerText = ... code.
	•	Don’t let old JS fight React for control of tabs or Person B.
	4.	Retain only safe legacy assets
	•	Import HTML/CSS chunks for visuals.
	•	Exclude inline scripts and window.onload blocks.
	5.	Check for UI blockers
	•	Ensure Person B’s toggle is not hidden behind overlays (z-index/pointer-events).
	•	Ensure labels and inputs have unique IDs.
	6.	Accessibility and control
	•	Tab buttons must map to appMode via React.
	•	Person B toggle must use aria-controls/aria-expanded and enable/disable its panel via React.
	7.	Clean routing
	•	No duplicate index.html if Next owns /.
	•	Ensure form submits target your Netlify functions, not legacy endpoints.
	8.	Git hygiene
	•	Work on a feature branch (feat/ui-next-balance-and-b-toggle).
	•	Commit in small, atomic steps, staging hunks carefully.
	9.	Testing protocol
	•	Tab: switch to Balance Meter → title/description/button update; reload → state behaves predictably.
	•	Person B: toggle opens/closes, inputs enable/disable, keyboard works.
	•	Submission: payload includes B only when enabled.

⸻

These imperatives boil down to: pick your root strategy, kill legacy scripts, centralize control in React state, import only safe legacy visuals, and validate with explicit tests.