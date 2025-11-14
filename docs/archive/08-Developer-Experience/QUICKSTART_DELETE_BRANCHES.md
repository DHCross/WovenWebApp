# Quick Start: Delete Old Branches

## TL;DR - Fastest Way to Delete Old Branches

### Step 1: Review What Will Be Deleted (DRY RUN)

1. Go to: https://github.com/DHCross/WovenWebApp/actions/workflows/delete-old-branches.yml
2. Click **"Run workflow"** button (top right)
3. Select settings:
   - Branch: `main`
   - Dry run: **`true`** ✅
   - Days old: `1`
4. Click **"Run workflow"**
5. Wait for it to complete (~5 minutes)
6. Review the output in the workflow run
7. Download the "branch-deletion-report" artifact

### Step 2: Actually Delete the Branches

1. Go back to the workflow page
2. Click **"Run workflow"** again
3. Select settings:
   - Branch: `main`
   - Dry run: **`false`** ❌
   - Days old: `1`
4. Click **"Run workflow"**
5. Wait for completion
6. All old branches will be deleted!

## Current Situation

- **Total branches:** 283
- **Branches older than 1 day:** ~280
- **Most are:** completed feature/fix branches from automated agents

## Important Notes

⚠️ **The 1-day threshold is VERY aggressive.** Consider using 30-90 days instead!

✅ **Protected branches will NOT be deleted:**
- `main`
- `develop`
- `staging`
- `production`

## Adjust the Threshold

When running the workflow, change "Days old" to a higher number:
- `7` = 1 week old
- `30` = 1 month old
- `90` = 3 months old

## Manual Deletion (if preferred)

You can also delete branches manually via GitHub:
1. Go to: https://github.com/DHCross/WovenWebApp/branches/all
2. Search for a branch name
3. Click the 🗑️ trash icon

## Questions?

See the full documentation in:
- `BRANCH_CLEANUP_README.md` - Complete guide
- `OLD_BRANCHES_REPORT.md` - Detailed analysis
