# Readout Top-Line Templates

## Three-Channel Snapshot
```
⚡ {Magnitude} {MagLabel} · Val {Anchor} {SignedNumber} · 🔀 {VolLabel} {VolNumber} · SFD {net sign} (S+ {x}/S− {y})
```

## Daily Readout Line
```
{YYYY-MM-DD} — ⚡ {Mag} {MagLabel} · Val {Anchor} {±N} {ValenceEmoji(s)} · 🔀 {VolLabel} {N} · SFD {+,0,−} · Hooks: {hook}, {hook}, {hook}
```

Use these structures when composing snapshot headers and daily lines so the site and PDFs stay aligned with the latest lexicon.
