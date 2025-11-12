#!/bin/bash

# Script to delete all branches older than 1 day
# Excludes: main and the current working branch (copilot/delete-old-branches)

set -euo pipefail

# Configuration
CURRENT_BRANCH="copilot/delete-old-branches"
PROTECTED_BRANCHES=("main" "$CURRENT_BRANCH")
ONE_DAY_SECONDS=86400

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Statistics
DELETED_COUNT=0
KEPT_COUNT=0
PROTECTED_COUNT=0
ERROR_COUNT=0

# Get current timestamp
CURRENT_TIME=$(date +%s)
CUTOFF_TIME=$((CURRENT_TIME - ONE_DAY_SECONDS))

echo "========================================================================"
echo "Branch Cleanup Script"
echo "========================================================================"
echo "Current time: $(date -u '+%Y-%m-%d %H:%M:%S %Z')"
echo "Cutoff time (1 day ago): $(date -u -d @$CUTOFF_TIME '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# Function to check if branch is protected
is_protected() {
    local branch=$1
    for protected in "${PROTECTED_BRANCHES[@]}"; do
        if [ "$branch" == "$protected" ]; then
            return 0
        fi
    done
    return 1
}

# Function to get commit timestamp from GitHub
get_commit_date() {
    local sha=$1
    # Fetch the commit if we don't have it
    git fetch --depth=1 origin "$sha" 2>/dev/null || true
    # Get the commit timestamp
    git log -1 --format=%ct "$sha" 2>/dev/null || echo "0"
}

# Function to delete a branch
delete_branch() {
    local branch=$1
    if git push origin --delete "$branch" 2>&1; then
        return 0
    else
        return 1
    fi
}

# Get all remote branches (excluding HEAD)
echo "Fetching list of branches..."
mapfile -t ALL_BRANCHES < <(git ls-remote --heads origin | awk '{print $2}' | sed 's|refs/heads/||' | sort)

echo "Found ${#ALL_BRANCHES[@]} branches to check"
echo ""
echo "========================================================================"
echo "Checking branches..."
echo "========================================================================"
echo ""

# Process each branch
for BRANCH in "${ALL_BRANCHES[@]}"; do
    # Skip if protected
    if is_protected "$BRANCH"; then
        echo -e "${YELLOW}SKIP (protected):${NC} $BRANCH"
        ((PROTECTED_COUNT++))
        continue
    fi
    
    # Get the SHA for this branch
    SHA=$(git ls-remote origin "refs/heads/$BRANCH" | awk '{print $1}')
    
    if [ -z "$SHA" ]; then
        echo -e "${RED}ERROR:${NC} Could not get SHA for $BRANCH"
        ((ERROR_COUNT++))
        continue
    fi
    
    # Get commit timestamp
    COMMIT_TIME=$(get_commit_date "$SHA")
    
    if [ "$COMMIT_TIME" == "0" ]; then
        echo -e "${RED}ERROR:${NC} Could not get commit time for $BRANCH (SHA: $SHA)"
        ((ERROR_COUNT++))
        continue
    fi
    
    # Calculate age
    AGE_SECONDS=$((CURRENT_TIME - COMMIT_TIME))
    AGE_DAYS=$((AGE_SECONDS / 86400))
    COMMIT_DATE=$(date -u -d @$COMMIT_TIME '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "unknown")
    
    # Check if older than cutoff
    if [ "$COMMIT_TIME" -lt "$CUTOFF_TIME" ]; then
        echo -e "${RED}OLD (deleting):${NC} $BRANCH"
        echo "  Last commit: $COMMIT_DATE ($AGE_DAYS days old)"
        
        if delete_branch "$BRANCH"; then
            echo -e "  ${GREEN}✓ Deleted successfully${NC}"
            ((DELETED_COUNT++))
        else
            echo -e "  ${RED}✗ Failed to delete${NC}"
            ((ERROR_COUNT++))
        fi
    else
        echo -e "${GREEN}RECENT (keeping):${NC} $BRANCH (Last commit: $COMMIT_DATE)"
        ((KEPT_COUNT++))
    fi
    
    echo ""
done

echo "========================================================================"
echo "Summary"
echo "========================================================================"
echo "Branches deleted: $DELETED_COUNT"
echo "Branches kept (recent): $KEPT_COUNT"
echo "Branches skipped (protected): $PROTECTED_COUNT"
echo "Errors: $ERROR_COUNT"
echo "========================================================================"

exit 0
