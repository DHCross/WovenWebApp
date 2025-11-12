#!/usr/bin/env python3
"""
Fast branch age analyzer using GitHub API data.
Generates a list of branches older than specified threshold.
"""

import subprocess
import sys
from datetime import datetime, timezone, timedelta
from typing import List, Tuple, Optional
import json

# Protected branches that should never be deleted
PROTECTED_BRANCHES = {"main", "copilot/delete-old-branches", "develop", "staging", "production"}

def get_all_branches() -> List[Tuple[str, str]]:
    """Get all remote branches with their SHAs."""
    try:
        result = subprocess.run(
            ["git", "ls-remote", "--heads", "origin"],
            capture_output=True,
            text=True,
            check=True
        )
        branches = []
        for line in result.stdout.strip().split('\n'):
            if line:
                sha, ref = line.split('\t')
                branch_name = ref.replace('refs/heads/', '')
                branches.append((branch_name, sha))
        return branches
    except subprocess.CalledProcessError as e:
        print(f"Error fetching branches: {e}", file=sys.stderr)
        return []

def get_commit_date(sha: str) -> Optional[datetime]:
    """Get commit date for a SHA."""
    try:
        # Try to fetch the commit
        subprocess.run(
            ["git", "fetch", "--depth=1", "origin", sha],
            capture_output=True,
            check=False,
            timeout=10
        )
        
        # Get the commit date
        result = subprocess.run(
            ["git", "log", "-1", "--format=%cI", sha],
            capture_output=True,
            text=True,
            check=True,
            timeout=5
        )
        date_str = result.stdout.strip()
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, ValueError) as e:
        return None

def main():
    # Configuration
    days_threshold = 1
    
    print("=" * 80)
    print("Branch Age Analysis")
    print("=" * 80)
    print()
    
    # Calculate cutoff
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days_threshold)
    
    print(f"Current time: {now.strftime('%Y-%m-%d %H:%M:%S %Z')}")
    print(f"Cutoff time ({days_threshold} day{'s' if days_threshold != 1 else ''} ago): {cutoff.strftime('%Y-%m-%d %H:%M:%S %Z')}")
    print()
    
    # Get all branches
    print("Fetching branches...")
    branches = get_all_branches()
    print(f"Found {len(branches)} branches")
    print()
    
    # Analyze branches
    old_branches = []
    recent_branches = []
    protected_branches = []
    errors = []
    
    print("Analyzing branches...")
    print()
    
    # Process in batches for progress indication
    batch_size = 10
    for i in range(0, len(branches), batch_size):
        batch = branches[i:i+batch_size]
        print(f"Processing branches {i+1}-{min(i+batch_size, len(branches))} of {len(branches)}...")
        
        for branch_name, sha in batch:
            # Check if protected
            if branch_name in PROTECTED_BRANCHES:
                protected_branches.append(branch_name)
                print(f"  [PROTECTED] {branch_name}")
                continue
            
            # Get commit date
            commit_date = get_commit_date(sha)
            
            if commit_date is None:
                errors.append(branch_name)
                print(f"  [ERROR] {branch_name} - could not get commit date")
                continue
            
            # Calculate age
            age = now - commit_date
            age_days = age.days
            
            # Categorize
            if commit_date < cutoff:
                old_branches.append((branch_name, commit_date, age_days))
                print(f"  [OLD - {age_days}d] {branch_name}")
            else:
                recent_branches.append((branch_name, commit_date, age_days))
                print(f"  [RECENT] {branch_name}")
    
    # Generate report
    print()
    print("=" * 80)
    print("Summary")
    print("=" * 80)
    print(f"Total branches: {len(branches)}")
    print(f"Old branches (>{days_threshold} day): {len(old_branches)}")
    print(f"Recent branches: {len(recent_branches)}")
    print(f"Protected branches: {len(protected_branches)}")
    print(f"Errors: {len(errors)}")
    print()
    
    # Write deletion script
    if old_branches:
        script_path = "delete-branches-batch.sh"
        with open(script_path, 'w') as f:
            f.write("#!/bin/bash\n")
            f.write(f"# Generated: {now.strftime('%Y-%m-%d %H:%M:%S %Z')}\n")
            f.write(f"# Branches older than {days_threshold} day(s)\n")
            f.write("# WARNING: This will delete branches from the remote repository!\n")
            f.write("\n")
            f.write("set -e\n")
            f.write("\n")
            f.write("echo 'Deleting old branches...'\n")
            f.write("echo ''\n")
            f.write("\n")
            
            for branch_name, commit_date, age_days in sorted(old_branches, key=lambda x: x[2], reverse=True):
                f.write(f"# {branch_name} - {age_days} days old (last commit: {commit_date.strftime('%Y-%m-%d')})\n")
                f.write(f"echo 'Deleting {branch_name}...'\n")
                f.write(f"git push origin --delete \"{branch_name}\" || echo 'Failed to delete {branch_name}'\n")
                f.write("\n")
            
            f.write("echo ''\n")
            f.write("echo 'Done!'\n")
        
        subprocess.run(["chmod", "+x", script_path])
        print(f"Deletion script written to: {script_path}")
        print()
        
        # Write summary report
        report_path = "old-branches-report.txt"
        with open(report_path, 'w') as f:
            f.write("=" * 80 + "\n")
            f.write("Old Branches Report\n")
            f.write("=" * 80 + "\n")
            f.write(f"Generated: {now.strftime('%Y-%m-%d %H:%M:%S %Z')}\n")
            f.write(f"Threshold: {days_threshold} day(s)\n")
            f.write("\n")
            f.write(f"Total old branches: {len(old_branches)}\n")
            f.write("\n")
            f.write("Branches to delete:\n")
            f.write("\n")
            
            for branch_name, commit_date, age_days in sorted(old_branches, key=lambda x: x[2], reverse=True):
                f.write(f"  {branch_name:70} {age_days:3}d old (last: {commit_date.strftime('%Y-%m-%d')})\n")
        
        print(f"Report written to: {report_path}")
        print()
    else:
        print("No old branches found!")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
