# Branch Management Guidelines

This document provides guidelines for managing branches in the WovenWebApp repository.

## Overview

The WovenWebApp repository uses a branch-based workflow for feature development, bug fixes, and code reviews. Over time, branches can accumulate and become outdated. This guide helps identify which branches should be closed or deleted.

## Branch Analysis Tool

We provide an automated tool to analyze all branches and categorize them based on their status.

### Running the Analysis

```bash
npm run branches:analyze
```

This will:
1. Fetch all remote branches from GitHub
2. Analyze each branch's status relative to `main`
3. Generate a report: `BRANCH_ANALYSIS_REPORT.md`

### What the Tool Checks

The tool examines:
- **Merge status**: Whether the branch has been merged into `main`
- **Age**: Days since the last commit
- **Divergence**: How many commits behind `main` the branch is
- **Branch naming patterns**: Identifies temporary fix branches, feature branches, etc.

## Branch Categories

### 1. Merged Branches (Safe to Delete)
**Priority**: High

These branches have been merged into `main` and can be safely deleted without losing any code.

**Action**: Delete immediately
```bash
git push origin --delete <branch-name>
```

### 2. Stale Branches (90+ Days Old)
**Priority**: Medium

Branches that haven't been updated in 90+ days are likely abandoned or no longer relevant.

**Action**: 
1. Review the branch purpose (check PR or commit messages)
2. If no longer needed, delete the branch
3. If still relevant, consider rebasing on `main` and creating a new PR

### 3. Outdated Branches (60+ Days, Behind Main)
**Priority**: Low

Branches that are significantly behind `main` and haven't been updated recently.

**Action**:
1. Review if the work is still relevant
2. Consider closing the associated PR/issue
3. If work should continue, rebase on `main` or create a fresh branch

### 4. Work in Progress (30-90 Days)
**Priority**: Review Required

Active development that may have stalled.

**Action**:
1. Check with the branch author or PR assignee
2. Determine if work will continue
3. Update or close accordingly

### 5. Recent Branches (< 30 Days)
**Priority**: Keep

Active development branches.

**Action**: Monitor but keep

## Branch Naming Conventions

Our repository uses several naming patterns:

- `codex/*` - Codex-generated branches (AI assistant work)
- `copilot/*` - GitHub Copilot-generated branches
- `feature/*` - New features
- `fix/*` - Bug fixes
- `chore/*` - Maintenance tasks
- `docs/*` - Documentation updates
- `refactor/*` - Code refactoring
- `test/*` - Test improvements

## Deletion Guidelines

### Before Deleting a Branch

1. **Verify merge status**: Ensure the branch is merged or no longer needed
2. **Check for open PRs**: Close or update any associated pull requests
3. **Review with team**: For major features, confirm with the team
4. **Document decision**: Update relevant issues or PRs with the reason

### How to Delete Branches

#### Delete a Single Remote Branch
```bash
git push origin --delete <branch-name>
```

#### Delete Multiple Branches (Script)
Create a temporary script for bulk deletion:

```bash
#!/bin/bash
# delete-branches.sh
branches=(
  "branch-name-1"
  "branch-name-2"
  "branch-name-3"
)

for branch in "${branches[@]}"; do
  echo "Deleting $branch..."
  git push origin --delete "$branch"
done
```

#### Delete Local Tracking Branches
After deleting remote branches, clean up local references:

```bash
git fetch --prune
git branch -vv | grep ': gone]' | awk '{print $1}' | xargs git branch -d
```

## Automated Cleanup

### GitHub Branch Protection Rules

Consider enabling automatic branch deletion for merged PRs:
1. Go to repository Settings → Branches
2. Enable "Automatically delete head branches"

This will delete branches automatically after PR merge.

## Best Practices

### For Contributors

1. **Keep branches short-lived**: Aim to merge within 2-4 weeks
2. **Regular updates**: Rebase on `main` regularly to avoid drift
3. **Clean up after merge**: Delete your branch after successful merge
4. **Meaningful names**: Use descriptive branch names that indicate purpose
5. **Close unused branches**: Don't leave experimental branches hanging

### For Maintainers

1. **Regular reviews**: Run the analysis tool monthly
2. **Proactive cleanup**: Delete merged branches promptly
3. **Communication**: Notify contributors before deleting their branches
4. **Documentation**: Keep this guide updated with new patterns

## Monthly Maintenance Checklist

- [ ] Run `npm run branches:analyze`
- [ ] Review the generated report
- [ ] Delete all merged branches (high priority)
- [ ] Contact owners of stale branches (90+ days)
- [ ] Close PRs associated with abandoned branches
- [ ] Update this document if new patterns emerge

## Common Scenarios

### Scenario 1: Codex/Copilot Branches
Many `codex/*` and `copilot/*` branches are temporary AI-assisted fixes.

**Action**: If merged or older than 60 days without activity, delete them.

### Scenario 2: Feature Branch Conflicts
A feature branch is heavily outdated but work should continue.

**Action**: 
1. Create a new branch from `main`
2. Cherry-pick or reapply changes
3. Delete the old branch
4. Update PR to point to new branch

### Scenario 3: Experimental Work
A branch contains experimental code that didn't pan out.

**Action**:
1. If valuable for future reference, tag it before deletion
2. Document findings in an issue
3. Delete the branch

## Questions?

If you're unsure about deleting a branch:
1. Check the associated PR or issue
2. Contact the repository maintainer (Jules/DHCross)
3. When in doubt, keep it for one more review cycle

## Related Documents

- `README.md` - General setup and contribution guidelines
- `CHANGELOG.md` - Project history
- `MAINTENANCE_GUIDE.md` - General maintenance procedures

---

Last updated: 2025-11-05
Tool version: 1.0
