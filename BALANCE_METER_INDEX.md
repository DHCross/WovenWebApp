# 📚 Balance Meter v5.0 Documentation Index

**Quick Links:**
- [📘 v5.0 Proposal](BALANCE_METER_V5_PROPOSAL.md) - Two-axis simplification rationale
- [📘 Complete Refactor Details](BALANCE_METER_REFACTOR_COMPLETE.md) - Full implementation documentation
- [📖 Developer Quick Reference](docs/BALANCE_METER_README.md) - Daily development guide
- [📝 Changelog Entry](CHANGELOG.md#2025-01-21-critical-fix-balance-meter-dual-pipeline-elimination-v31) - Executive summary
- [📊 Refactor Summary](REFACTOR_SUMMARY_2025-01-21.md) - Documentation & archive organization

**Archived Materials:**
- [📦 Historical Audit](docs/archive/BALANCE_METER_AUDIT_2025-10-05.md) - Original problem diagnosis (now resolved)
- [🗄️ Legacy Scripts](scripts/archive/README.md) - 16 ad-hoc test scripts (replaced by formal suite)
- [🗄️ SFD System](docs/archive/) - Support/Friction/Drift experimental system (deprecated in v4.0)
- [🗄️ Coherence](docs/archive/) - Statistical volatility inverse (deprecated in v5.0 - moved to _diagnostics)

---

## Quick Start

### Run Tests
```bash
npm run test:vitest:run      # All tests (69 tests)
npm run lexicon:lint          # Lexicon compliance
```

### Modify Balance Meter Math
1. Update `lib/balance/scale.ts` ONLY
2. Run tests: `npm run test:vitest:run`
3. See [Developer Guide](docs/BALANCE_METER_README.md) for full protocol

### Understand the Refactor
Read in this order:
1. [CHANGELOG.md](CHANGELOG.md) - What changed (5 min read)
2. [docs/BALANCE_METER_README.md](docs/BALANCE_METER_README.md) - How to use (10 min read)
3. [BALANCE_METER_REFACTOR_COMPLETE.md](BALANCE_METER_REFACTOR_COMPLETE.md) - Full details (30 min read)

---

## Status: ✅ v5.0 Complete

- **Tests:** Pending update for v5.0
- **Lexicon:** Clean
- **Architecture:** Single source of truth enforced
- **Documentation:** Updated to v5.0
- **Legacy Files:** Archived
- **Core Axes:** 2 (Magnitude, Directional Bias)
- **Internal Diagnostics:** Volatility (in _diagnostics object)

**Date:** January 2026  
**Spec Version:** 5.0 (2-axis geometric purity model)
