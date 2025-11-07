# Windsurf AI Internal Testing Module

This workspace provides fast, in-IDE fixtures for exercising the Four Report Types described in `Developers Notes/Core/Four Report Types_Integrated 10.1.25.md`. Each generator creates a Poetic Brain–compatible payload that can be dropped directly into Windsurf chat for conversational validation.

## Goals

1. **Observable Pattern (Solo Mirror)** – Baseline mirror payload with natal geometry only.
2. **Subjective Mirror (Symbolic Weather)** – Solo payload plus transit window and seismograph slot.
3. **Interpersonal Field (Relational Mirror)** – Dual-chart payload with intimacy tier and relocation handling.
4. **Integration Loop (Full Stack)** – Composite bundle that stitches mirror + weather outputs in report order.

All fixtures keep provenance, relocation, and contract metadata explicit so we can mirror production behavior without invoking the full Math Brain pipeline.

## Layout

```
/test/windsurf
├─ README.md               – This guide
├─ fixtures/               – Canonical JSON payloads for quick copy/paste
└─ generators/             – TypeScript scripts that emit structured payloads on demand
```

> The existing `test/generateMirrorDirective.ts` remains for backward compatibility and is referenced from the generators.

## Usage

```bash
cd /Users/dancross/Documents/GitHub/WovenWebApp
npx ts-node test/windsurf/generators/<script>.ts
```

Each generator prints JSON to stdout and writes a copy into `test/windsurf/fixtures/`. The filenames indicate report type and scenario (e.g., `solo-mirror_dan_panama-city.json`).

## Next Steps

- Implement dedicated generators for the four report types.
- Populate the `fixtures/` directory with golden payloads retrieved from Math Brain runs.
- Extend documentation with validation checklists for each report type (Hook Stack, Polarity Cards, Balance Meter, Integration Loop).
