# Woven Map Sample Report Template

## Contract Header (Drop-in Snippet)
Use this JSON block at the top of every generated report. It explicitly affirms when natal data and a transit window are present so Raven always renders Mirrors unless you override it manually.

```json
{
  "contract": "clear-mirror/1.3",
  "contract_header": {
    "contract_valid": true,
    "mirror_ready": true,
    "mode": "relational",
    "inputs_confirmed": {
      "natal_payload": "present",
      "transit_window": {
        "start": "2025-09-01",
        "end": "2025-09-30",
        "confidence": "exact"
      },
      "locations": {
        "person_a": "Philadelphia, PA, USA",
        "person_b": "New York, NY, USA"
      }
    },
    "warnings": [],
    "errors": []
  },
  "status_copy": "Natal + transit inputs confirmed. Mirrors unlocked."
}
```

**Rules for the generator**
- Populate `mode` with `"single"`, `"relational"`, or other supported values to match the active layout.
- Only flip `contract_valid` or `mirror_ready` to `false` when inputs are genuinely missing; keep `errors` empty when all data is confirmed.
- Surface soft issues (like approximate birth time) inside `warnings` without blocking Mirrors.

## Natal Math (Raw)
Placeholder table for planetary positions.

## Houses & Angles
Placeholder table for house cusps and angles.

## Natal Aspects
Placeholder table for natal aspects.

## Transit Aspects
Placeholder table for transit aspects when transits are requested.

## Seismograph Daily
Placeholder table for seismograph daily rollup.

## Data & Provenance
Placeholder block for provenance and configuration details.

<details><summary>Raw JSON</summary>

```
{}
```

</details>
