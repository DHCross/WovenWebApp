# Old Branches Identified for Deletion

**Date:** 2025-11-11  
**Threshold:** Branches older than 1 day  
**Total Repository Branches:** 283

## Summary

This report identifies branches in the WovenWebApp repository that are older than 1 day and should be considered for deletion.

## Why These Branches Can't Be Automatically Deleted

The Copilot agent has **read-only access** and cannot delete branches directly. Branch deletion requires either:
1. Manual deletion by a repository administrator
2. Running the GitHub Actions workflow (`.github/workflows/delete-old-branches.yml`) which has proper permissions

## How to Delete These Branches

### Option 1: Use the GitHub Actions Workflow (Recommended)

1. Go to: `https://github.com/DHCross/WovenWebApp/actions/workflows/delete-old-branches.yml`
2. Click "Run workflow"
3. Choose "Dry run: true" for the first run to see what would be deleted
4. Review the output
5. Run again with "Dry run: false" to actually delete branches

### Option 2: Manual Deletion via GitHub Web Interface

1. Go to: `https://github.com/DHCross/WovenWebApp/branches/all`
2. Search for each branch name below
3. Click the trash icon to delete

### Option 3: Command Line (if you have permissions)

```bash
# Clone repository
git clone https://github.com/DHCross/WovenWebApp.git
cd WovenWebApp

# Delete branches (one at a time)
git push origin --delete <branch-name>

# Or run the generated deletion script
./delete-branches-batch.sh
```

## Sample of Branches to Delete

Based on the GitHub API data, here are examples of old branches (all are from October 2025, >15 days old):

### Feature Branches
- `agent-deployment-8f47` (19+ days old)
- `chore-restore-env-example`
- `chore/chat-client-refactor-review`
- `chore/remove-legacy-balance-meter-code`
- `code-review-1700000000`
- `code-review-balance-meter-v5`
- `code-review-balance-meter-v5-1`
- `code-review-epistemic-alignment`
- `code-review/volatility-metric-removal`

### Codex Branches (Automated Agent Branches)
- `codex/add-api-key-presence-check`
- `codex/add-button-to-switch-to-math-brain`
- `codex/add-direct-json-export-alongside-pdf`
- `codex/add-error-handling-to-astrology-functions`
- `codex/add-glossary-terms-to-readme.md`
- `codex/fix-500-internal-server-error-on-synastry`
- `codex/fix-504-gateway-timeout-error`
- `codex/fix-api-error-when-generating-report`
- ... (150+ more codex/* branches)

### Copilot Fix Branches
- `copilot/fix-0b19b383-3435-4766-be78-14a77006a258`
- `copilot/fix-0c9d168b-35ae-44cd-a257-ce862ced51c0`
- `copilot/fix-1d91bbb6-6bd1-409d-9749-16848b93bf1f`
- ... (50+ more copilot/fix-* branches)

### Feature Branches
- `feat/performance-optimizations`
- `feat/perplexity-persona-hook`
- `feat/raw-export`
- `feat/srp-translocation`
- `feature/add-doc-organizer-agent`
- `feature/code-review`
- `feature/consolidate-poetic-brain-output`

### Fix Branches
- `fix-balance-meter-schema`
- `fix-garbled-download-filename`
- `fix-initial-reading-trigger`
- `fix-missing-transits`
- `fix-mobile-download`
- `fix-netlify-build-error`
- `fix-raven-chat-auth`
- `fix/balance-meter-export-zeros`
- `fix/balance-meter-overflow-boundary`
- ... (20+ more fix/* branches)

### Other Branches
- `docs-project-overview`
- `docs/update-v5-balance-meter-docs`
- `imgbot`
- `jules-math-brain-refactor`
- `jules-review-20251102-2`
- `perf-improvements`
- `refactor/math-brain-service`
- `refactor/remove-legacy-metrics`
- `telemetry`
- `test-coverage-improvements`

## Branches to KEEP (Protected)

These branches should **NEVER** be deleted:
- `main` - primary branch
- `copilot/delete-old-branches` - current working branch for this task

## Estimated Count

Based on the branch list (283 total branches) and the sample check showing branches from October 2025:
- **Branches to delete:** ~280 (all except main and copilot/delete-old-branches)
- **Branches to keep:** 2-3 (main and current branch)

## Recommendations

1. **Review before deletion:** Some branches may have valuable work
2. **Check for open PRs:** Branches with active PRs should be kept
3. **Consider selective deletion:** You may want to keep certain branch patterns like:
   - `release/*`
   - `hotfix/*`
   - Recent `feature/*` branches
4. **Adjust the threshold:** 1 day is very aggressive; consider 30-90 days for a production repository
5. **Backup:** Consider creating a backup or archive of branch references before mass deletion

## Next Steps

1. Review this list
2. Run the GitHub Actions workflow in dry-run mode
3. Review the detailed output
4. Run the workflow with dry-run=false to delete branches
5. Verify deletion was successful

## Files Created

- `.github/workflows/delete-old-branches.yml` - Automated workflow for branch deletion
- `BRANCH_CLEANUP_README.md` - Comprehensive documentation
- `delete-old-branches.sh` - Shell script for deletion (requires permissions)
- `analyze-branches.sh` - Analysis script
- `fast-branch-analysis.py` - Python analysis script
- This file: `OLD_BRANCHES_REPORT.md`

## Important Notes

- Branch ages are calculated from the last commit date, not creation date
- The repository appears to have accumulated many automated agent branches (codex/*, copilot/fix-*)
- Most branches seem to be from completed work items
- Consider implementing an automated cleanup schedule (monthly/quarterly)
