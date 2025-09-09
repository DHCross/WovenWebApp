# RavenCalder Readout Rules (Non-Coder Edition)

## 1) What every page should show (in order)

1. **Three-Channel Snapshot** (top line)
2. **Week/Range at a Glance** (mini list or sparkline)
3. **Daily Readouts** (one line per day)
4. **Hook Spotlight** (the 1–3 most relevant hooks)
5. **Glossary & Safety** (agency + definitions)

> Note: current PDFs already open with an executive “Triple Channel” line—keep the idea, update the wording & glyphs to the new spec.

---

## 2) Three-Channel Snapshot (top line)

**Format:**
`⚡ {Magnitude} {MagLabel} · Val {Anchor} {SignedNumber} · 🔀 {VolLabel} {VolNumber} · SFD {net sign} (S+ {x}/S− {y})`

**Rules (non‑negotiable):**

- **Magnitude (0–5)** uses the poetic neutral ladder: **Latent, Murmur, Pulse, Stirring, Convergence, Threshold**.
- **Valence (–5…+5)** shows **number + anchor word** (e.g., *Friction, Flow, Liberation*). If ≈0, use **⚖️ Equilibrium**.
- **Volatility (0–5)** is **neutral** and **ascending‑only**; header uses **🔀**, not a storm icon.
- **SFD** prints the verdict plainly: `stabilizers prevail` if net > 0, `friction dominates` if net < 0, `mixed` if near 0.

> If the engine still outputs a raw valence outside ±5, display the **normalized ±5** value on the site and tuck the raw in a debug/tool‑tip only.

### 🌑🌞 Valence Mapping (−5 … +5)

| Level | Anchor | Flavor Patterns |
| :---- | :----- | :-------------- |
| −5 | **Collapse** | 🌋🧩⬇️ — maximum restrictive tilt; compression / failure points |
| −4 | **Grind** | 🕰⚔🌪 — sustained resistance; heavy duty load |
| −3 | **Friction** | ⚔🌊🌫 — conflicts or cross‑purposes slow motion |
| −2 | **Contraction** | 🌫🧩⬇️ — narrowing options; ambiguity or energy drain |
| −1 | **Drag** | 🌪🌫 — subtle headwind; minor loops or haze |
| 0 | **⚖️ Equilibrium** | net‑neutral tilt; forces cancel or are too diffuse to resolve |
| +1 | **Lift** | 🌱✨ — gentle tailwind; beginnings sprout |
| +2 | **Flow** | 🌊🧘 — smooth adaptability; things click |
| +3 | **Harmony** | 🧘✨🌊 — coherent progress; both/and solutions |
| +4 | **Expansion** | 💎🔥🦋 — widening opportunities; clear insight fuels growth |
| +5 | **Liberation** | 🦋🌈🔥 — peak openness; breakthroughs / big‑sky view |

*Emoji selection: 1–2 glyphs if Magnitude ≤ 2, up to 3 if ≥ 3. Never mix negative and positive emojis in one line; 🌀 is reserved for Volatility alone.*

---

## 3) Daily Readout line (one‑liner per date)

**Format:**
`{YYYY-MM-DD} — ⚡ {Mag} {MagLabel} · Val {Anchor} {±N} {ValenceEmoji(s)} · 🔀 {VolLabel} {N} · SFD {+,0,−} · Hooks: {hook}, {hook}, {hook}`

**Selection rules:**

- **Valence emoji(s)** are presentation seasoning, not the rating.
  - Negative pool (< 0): 🌪, ⚔, 🌊, 🌫, 🌋, 🕰, 🧩, ⬇️
  - Positive pool (> 0): 🌱, ✨, 💎, 🔥, 🦋, 🧘, 🌊, 🌈
  - **0 → ⚖️ Equilibrium** (or no emoji).
- Never mix negative and positive emojis in one line.
- **How many emojis?** If **Magnitude ≤ 2** pick **1–2**; if **≥ 3** pick **2–3** (max 3).
- **Volatility** uses the ladder glyph set only:
  - 0 ➿ Aligned Flow
  - 1–2 🔄 Cycled Pull
  - 2–3 🔀 Mixed Paths
  - 3–4 🧩 Fragment Scatter
  - 5 🌀 Vortex Dispersion
  - **🌀 appears only at Volatility = 5.**
- **Hooks:** list 1–3, keep the orb arrow semantics (↑ applying, ↓ separating) and degrees, trimmed to what’s actually felt.

---

## 4) Hook Spotlight (keep it human)

Show **why** today feels like its band:

- One sentence per hook, max two clauses.
- Name the driver plainly (“Saturn weight,” “Neptune fog,” “Uranus pivot”).
- Tie to lived cues: “time walls,” “leaks/blur,” “sudden options.”

---

## 5) Voice & Safety (mirror, not mandate)

- **No predictions.** Use recognition (“you may notice…”, “watch for…”).
- **Testability.** Every line should be falsifiable by lived experience.
- **Agency.** Remind: “Map, not mandate.”

Existing “Agency Reinforcement” blocks are good—keep them, just update glyphs.

---

## 6) What changes on the website (concrete edits)

- Replace any **“Volatility 🌪”** headers with **“🔀 Volatility.”**
- Ensure **🌀** never appears except at **Volatility = 5.**
- Use **⚖️ Equilibrium** label at **Valence = 0.**
- Update valence emoji sets to the non‑overlapping palette (no 🌀 in Valence; use 🌫 for Fog).
- Rename Magnitude levels to **Latent → Threshold** ladder.
- Keep SFD phrasing aligned to plain English verdicts.

---

## 7) Two sample lines (site‑ready)

**Three‑Channel Snapshot (top):**
`⚡ 5.0 Threshold · Val Friction −3.7 · 🔀 Fragment Scatter 4.6 · SFD − (S+ 3.2 / S− 4.9)`
*(reads: strong load, restrictive tilt, scattered pattern; friction outweighs support)*

**Daily (with hooks):**
`2025-09-19 — ⚡ 5.0 Threshold · Val Drag −1.2 🌫 · 🔀 Mixed Paths 3.0 · SFD 0 · Hooks: Sun▵Moon 0.4° ↑, Mercury□Saturn 1.8° ↓`
*(near-baseline negative tone with fog; mixed distribution; stabilizers and friction roughly tie)*

---

## 8) Quick checklist (editor flow)

- [ ] Number first (Mag, Val, Vol).
- [ ] Valence has anchor word and polarity‑correct emojis (or ⚖️ at zero).
- [ ] Volatility uses 🔀 header; 🌀 only at 5.
- [ ] SFD verdict in plain English.
- [ ] Hooks trimmed to what actually lands today.
- [ ] Safety language present; no mandates.

