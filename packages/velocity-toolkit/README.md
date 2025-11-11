# Human–AI Velocity Toolkit (Skeleton)

This is a package skeleton to extract the velocity tracker + forecast generator
into a reusable toolkit. It wraps the existing analyzer and artifact generator
so you can run them via a single binary (`velocli`) now, and later replace the
internal calls with packaged modules.

## Commands (proxied to repo scripts for now)

- `velocli analyze` → runs `scripts/velocity-tracker.js --analyze`
- `velocli estimate "<task>"` → runs estimator mode
- `velocli report` → generates `docs/velocity-forecast.md`
- `velocli all` → analyze + report

The CLI reads standard env (e.g., `GITHUB_TOKEN`) and uses the current repo
paths. When extracted to a standalone repository, the internal implementation
can move into `src/` and the CLI can import it directly instead of proxying.

## Usage (from monorepo root)

```
node packages/velocity-toolkit/bin/velocli.js analyze
node packages/velocity-toolkit/bin/velocli.js estimate "Refactor subsystem X"
node packages/velocity-toolkit/bin/velocli.js report
node packages/velocity-toolkit/bin/velocli.js all
```

## Extraction plan

1. Copy the working logic from `scripts/velocity-tracker.js` (exported funcs)
   and `scripts/velocity-artifacts.js` into `packages/velocity-toolkit/src/`.
2. Replace child-process proxy calls with direct imports.
3. Publish as a standalone package or keep as an internal workspace.

## Notes

- This skeleton is neutral (no product-specific language).
- Secrets remain in `.env.local` or CI secrets; do not commit tokens.
- `.logs/` stays repo-local; the toolkit should allow configurable paths.

