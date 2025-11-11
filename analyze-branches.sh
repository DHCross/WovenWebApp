#!/bin/bash

# Script to identify branches older than 1 day
# This generates a report and a list of branches to delete
# Excludes: main and the current working branch

set -euo pipefail

# Configuration
CURRENT_BRANCH="copilot/delete-old-branches"
PROTECTED_BRANCHES=("main" "$CURRENT_BRANCH")
ONE_DAY_SECONDS=86400

# Get current timestamp
CURRENT_TIME=$(date +%s)
CUTOFF_TIME=$((CURRENT_TIME - ONE_DAY_SECONDS))

echo "========================================================================"
echo "Branch Age Report"
echo "========================================================================"
echo "Generated: $(date -u '+%Y-%m-%d %H:%M:%S %Z')"
echo "Cutoff time (1 day ago): $(date -u -d @$CUTOFF_TIME '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# Output file for deletion commands
DELETE_SCRIPT="delete-branches-commands.sh"
echo "#!/bin/bash" > "$DELETE_SCRIPT"
echo "# Generated: $(date -u)" >> "$DELETE_SCRIPT"
echo "# Branches to delete (older than 1 day)" >> "$DELETE_SCRIPT"
echo "" >> "$DELETE_SCRIPT"

# Statistics
OLD_COUNT=0
RECENT_COUNT=0
PROTECTED_COUNT=0
ERROR_COUNT=0

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

# Function to get commit timestamp
get_commit_date() {
    local sha=$1
    git fetch --depth=1 origin "$sha" 2>/dev/null || true
    git log -1 --format=%ct "$sha" 2>/dev/null || echo "0"
}

# Get all remote branches
echo "Fetching list of branches..."
mapfile -t ALL_BRANCHES < <(git ls-remote --heads origin | awk '{print $2}' | sed 's|refs/heads/||' | sort)

echo "Found ${#ALL_BRANCHES[@]} branches to analyze"
echo ""
echo "========================================================================"
echo "Analysis Results"
echo "========================================================================"
echo ""

# Lists for summary
declare -a OLD_BRANCHES
declare -a RECENT_BRANCHES

# Process each branch
for BRANCH in "${ALL_BRANCHES[@]}"; do
    # Skip if protected
    if is_protected "$BRANCH"; then
        echo "[PROTECTED] $BRANCH"
        ((PROTECTED_COUNT++))
        continue
    fi
    
    # Get the SHA for this branch
    SHA=$(git ls-remote origin "refs/heads/$BRANCH" | awk '{print $1}')
    
    if [ -z "$SHA" ]; then
        echo "[ERROR] Could not get SHA for $BRANCH"
        ((ERROR_COUNT++))
        continue
    fi
    
    # Get commit timestamp
    COMMIT_TIME=$(get_commit_date "$SHA")
    
    if [ "$COMMIT_TIME" == "0" ]; then
        echo "[ERROR] Could not get commit time for $BRANCH"
        ((ERROR_COUNT++))
        continue
    fi
    
    # Calculate age
    AGE_SECONDS=$((CURRENT_TIME - COMMIT_TIME))
    AGE_DAYS=$((AGE_SECONDS / 86400))
    COMMIT_DATE=$(date -u -d @$COMMIT_TIME '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "unknown")
    
    # Check if older than cutoff
    if [ "$COMMIT_TIME" -lt "$CUTOFF_TIME" ]; then
        echo "[OLD - ${AGE_DAYS}d] $BRANCH (Last commit: $COMMIT_DATE)"
        OLD_BRANCHES+=("$BRANCH")
        echo "git push origin --delete \"$BRANCH\"  # $AGE_DAYS days old" >> "$DELETE_SCRIPT"
        ((OLD_COUNT++))
    else
        echo "[RECENT] $BRANCH (Last commit: $COMMIT_DATE)"
        RECENT_BRANCHES+=("$BRANCH")
        ((RECENT_COUNT++))
    fi
done

echo ""
echo "========================================================================"
echo "Summary"
echo "========================================================================"
echo "Total branches checked: ${#ALL_BRANCHES[@]}"
echo "Branches older than 1 day: $OLD_COUNT"
echo "Recent branches (< 1 day): $RECENT_COUNT"
echo "Protected branches: $PROTECTED_COUNT"
echo "Errors: $ERROR_COUNT"
echo ""

if [ $OLD_COUNT -gt 0 ]; then
    echo "Old branches to delete:"
    for branch in "${OLD_BRANCHES[@]}"; do
        echo "  - $branch"
    done
    echo ""
    echo "Deletion commands written to: $DELETE_SCRIPT"
    chmod +x "$DELETE_SCRIPT"
    echo "To delete these branches, run: ./$DELETE_SCRIPT"
else
    echo "No branches older than 1 day found!"
    rm -f "$DELETE_SCRIPT"
fi

echo "========================================================================"

exit 0
