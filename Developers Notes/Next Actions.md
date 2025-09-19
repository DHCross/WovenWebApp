2025-09-19T21_43_36_681Z-debug-0.log

Bug Findings

src/feedback/hook-stack-composer.js:128 sorts the planet names before composing the template key, so a Sun/Mars aspect becomes mars_sun. Every template in HOOK_TEMPLATES is defined in the original order (e.g. sun_mars), so natal aspects never match and no dual-polarity hooks are emitted. This is a high-severity regression because downstream features rely on those hooks to exist.
src/feedback/daily-integration-layer.js:64 and src/feedback/advice-ladder-tree.js:36 expect the hook stack object to expose titles arrays and a volatilityIndex, but composeHookStack returns hooks, total_intensity, tier_1_orbs, etc. As a result the generated packages think there are zero hooks, fall back to generic copy, and crisis gating never sees real volatility. The bug spans every hookStack.titles access in those files (e.g. lines 64, 223, 362, 386, 406, 427 in daily-integration-layer.js and lines 36, 55, 183, 199, 230, 248 in advice-ladder-tree.js) and effectively disables the therapeutic layers.
src/utils/logger.js:14 compares levels[level] to levels[LOG_LEVEL] without guarding for invalid or differently-cased environment values. If LOG_LEVEL is set to INFO (common in env tooling) the right-hand side becomes undefined, the comparison yields false, and even error logs are suppressed.
src/normalizers/astrology-normalizer.js:22 uses a.phase || a.applying ? 'applying' : …, so any truthy a.phase (including 'separating') makes the ternary return 'applying'. The phase flag is wrong whenever the upstream payload already provides a phase string.
Notes

npm run test:ci (which runs test/run-all-smoke-tests.js --skip-network) timed out after the deployment-verification phase. The portion that completed reported the usual static-site “missing index.html/config.js” warnings; no functional tests failed before the timeout.
Next Steps

Align the hook-stack consumers with the hooks schema (or expose the expected shape) so the integration layers can surface real data.
Fix the template-key logic in hook-stack-composer and add a unit-style check to prevent future regressions.
Harden the logger and normalizer edge cases, then rerun the smoke suite to confirm no new warnings are introduced.