# Branch Cleanup - Delete Old Branches

This directory contains tools and workflows for cleaning up old branches in the WovenWebApp repository.

## Problem

The repository had accumulated ~280 branches, many of which are old feature branches, fix branches, and experimental branches that are no longer needed.

## Solution

A GitHub Actions workflow has been created to automatically identify and delete branches older than a specified threshold (default: 1 day).

## Files

### `.github/workflows/delete-old-branches.yml`
GitHub Actions workflow that can be manually triggered to delete old branches. Features:
- **Dry run mode** (default): Lists branches that would be deleted without actually deleting them
- **Configurable age threshold**: Delete branches older than N days (default: 1 day)
- **Protected branches**: Never deletes `main`, `develop`, `staging`, or `production`
- **Detailed reporting**: Generates a report artifact with full details

### `delete-old-branches.sh`
Standalone shell script for branch deletion. **Note**: Requires write permissions to delete branches.

### `analyze-branches.sh`
Analysis script that generates a report of old branches without deleting them. Produces:
- Console output with branch ages
- `delete-branches-commands.sh`: Shell script with individual delete commands

## Usage

### Using GitHub Actions (Recommended)

1. Go to the repository's Actions tab
2. Select "Delete Old Branches" workflow
3. Click "Run workflow"
4. Configure options:
   - **Dry run**: `true` (recommended first run) or `false` (actually delete)
   - **Days old**: Number of days threshold (default: `1`)
5. Review the workflow output and download the report artifact

### Using Shell Scripts

#### Analysis Only
```bash
./analyze-branches.sh
# Review the output and delete-branches-commands.sh

# To delete the branches (if you have permissions):
./delete-branches-commands.sh
```

#### Direct Deletion (requires git write permissions)
```bash
./delete-old-branches.sh
```

## Protected Branches

The following branches are protected and will NEVER be deleted:
- `main`
- `develop`
- `staging`
- `production`
- The current working branch

## Authentication Note

The Copilot agent that created these scripts has **read-only** access and cannot delete branches directly. Branch deletion requires:
- A GitHub personal access token with `repo` scope, OR
- Running the GitHub Actions workflow (which has the necessary permissions)

## Recommendations

1. **First run in dry-run mode** to see what would be deleted
2. **Review the list** carefully before actual deletion
3. **Set an appropriate age threshold** (1 day is aggressive; consider 30-90 days for production repos)
4. **Consider PR status**: You may want to manually check if old branches have open PRs before deletion

## Statistics (as of 2025-11-11)

- Total branches: 283
- Many branches date back to October 2025
- Majority are feature/fix branches from automated agents (codex/*, copilot/*)
- Main branch and copilot/delete-old-branches are protected

## Future Enhancements

Consider these improvements:
1. **Scheduled execution**: Run weekly/monthly to keep branches clean
2. **PR-aware deletion**: Check if branch has open PR before deleting
3. **Branch naming patterns**: Allow keeping certain branch patterns (e.g., `release/*`)
4. **Slack/email notifications**: Alert when branches are deleted
5. **Merged branch cleanup**: Delete only branches that have been merged to main

## Troubleshooting

### "Authentication failed" error
- Ensure you have proper Git credentials configured
- Use the GitHub Actions workflow instead of local scripts
- Check that your token has `repo` scope if using PAT

### "Could not get commit time" error
- The branch may have been deleted by another process
- Network issues during git fetch
- Try running the script again

### Branch not deleted despite being old
- Check if the branch is in the protected list
- Verify the branch actually exists: `git ls-remote origin refs/heads/BRANCH_NAME`
- Check workflow logs for specific error messages
