# Actor/Role in Poetic Brain

*Context note on origins, sidereal implications, and the behavior-first implementation*

---

## How Actor/Role Originated

Actor/Role was introduced with the **Enhanced Diagnostic Matrix** as a way to map
communication behaviours into archetypes without pinning anyone to fixed labels.
It was always meant to be a **dual-axis composite**:

- **Actor (Driver)** uses **sidereal zodiac motivations** to describe the engine
  underneath—a planet’s inner drive and reason for expression.
- **Role (Style)** uses **tropical expression categories** to show the outer form—a
  planet’s social presentation and how the behaviour lands.

Actor + Role form a composite cipher: the tension between inner drive and outer
style that repeatedly shows up in live conversations.

---

## Why Sidereal Is “Implied”

Even though the current reducer does not calculate sidereal positions, the Actor
layer was designed with a sidereal motivation band in mind. In the original spec:

- **Actor = Planet signal + sidereal motivational archetype**
- **Role = Surface behaviour rendered through tropical-coded language**

That heritage is why Actor/Role feels sidereal-implied. The implementation is
already aligned: when sidereal support is added later, it simply enriches the
Actor weighting without rewriting the system.

---

## Behaviour-First Adaptation (What Ships Today)

The live reducer honours the “Behaviour First, Symbol Second” principle. Every
pattern comes from **pingTracker evidence** (orb, magnitude, aspect family,
bias, repetition) rather than chart symbols. Planetary signals map directly into
Role seeds drawn from cross-tradition behaviour sets:

- Mercury → Messenger (communication, signal)
- Venus → Integrator (bonding, harmony)
- Mars → Challenger / Initiator (friction, ignition)
- Jupiter → Amplifier (growth, endorsement)
- Saturn → Stabilizer / Challenger (structure, testing)
- Uranus → Initiator / Challenger (rupture, innovation)
- Neptune → Dissolver / Integrator (blur, empathy)
- Pluto → Renewer / Challenger (purge, metamorphosis)

Aspect families drive the tilt:

- **Hard aspects** (square, opposition) bias **Challenger** roles.
- **Soft aspects** (trine, sextile) bias **Amplifier/Stabilizer** roles.
- **Conjunctions** amplify whichever seed is already dominant.

Stage (the life domain where the behaviour shows up) comes from **houses**, not
signs:

- Houses I–III → **Personal**
- Houses IV–VI → **Inner**
- Houses VII–IX → **Relational**
- Houses X–XII → **World**

Because Stage uses house bands, the logic stays agnostic to tropical vs. sidereal
sign frames. When sidereal charts later feed the Actor weighting, this same logic
continues to hold.

---

## Practical Takeaways

- Actor/Role began as a **sidereal+tropical composite**, but now runs on
  behaviour-first evidence.
- The current reducer already embodies the Enhanced Diagnostic Matrix’s intent:
  *behaviour first, symbol second*.
- Adding sidereal data in future becomes an additive modifier to Actor weighting,
  not a structural rewrite.

---

## Suggested Copy Tweaks (Optional)

- Note the behavioural anchors in Role seeds, e.g.:
  - Neptune — Dissolver / Integrator *(blur, mystify, empathize; “great dissolver”)*
  - Pluto — Renewer / Challenger *(purge, metamorphosis, power tests)*
  - Saturn — Stabilizer / Challenger *(structure, constraint; tests that mature)*
- Include aspect guidance: *“Hard aspects bias Challenger; soft aspects bias
  Amplifier/Stabilizer; conjunctions amplify the dominant seed.”*
- Clarify Stage copy: *“Houses anchor domains; sign frames (tropical or sidereal)
  are optional overlays. Actor/Role logic remains stable either way.”*

These tweaks make the lineage transparent for collaborators without reintroducing
sign morality or forcing a zodiac selection.

---

**Bottom line:** The Actor/Role engine you’re running today is ready for live
sessions, sidereal-agnostic, and completely behaviour-driven. When sidereal
support is introduced, it slots into the Actor side as a weighting enhancer—no
pipeline rewrite required.

